import {
    defaultBindings,
    Settings,
} from 'spark-server';
import Logger from './logger';
import amqp = require('amqplib');
import uuid = require('uuid');

let rabbitConnection;
let mainchannel;
let queues: {
  [name: string]: number,
} = {};

let receivers: {
  [name: string]: (data: string, ack: () => void) => boolean;
} = {};

let newReceivers: {
  [name: string]: (data: string, ack: () => void) => boolean;
};

const rabbitIncoming = `INCOMING_${process.env.HOSTNAME !== undefined
  ? process.env.HOSTNAME
  : process.env.COMPUTERNAME}`;

const logger = Logger.createModuleLogger(module);

const rabbitHost = process.env.RABBIT_PORT_5672_TCP_ADDR || '172.22.17.61';
const rabbitPort = process.env.RABBIT_PORT_5672_TCP_PORT || 9998;

logger.info(
  {
    rabbitHost,
    rabbitPort,
  },
  'Creating Rabbit connection',
);

interface IData {
  [name: string]: any;
}

interface IQueueElement {
  name: string;
  data: IData;
}

interface IActionData {
  action: string;
  answerID: string;
  answerTo: string;
  context: IData;
}

const pubQ: IQueueElement[] = []; // Publish Queue, to be processed

interface IAnswer {
  [name: string]: {
    reject: (err: string) => void;
    resolve: (answer: IData) => void;
    timeout: number;
  };
}

const awaitingAnswer: IAnswer = {};

function processElement(qname: string, data: IData) {
  if (queues[qname] === undefined) {
    mainchannel
      .assertQueue(qname, {
        arguments: {
          'x-message-ttl': 3 * 60 * 1000,
        },
        durable: false,
      })
      .then(() => {
        queues[qname] = 1;
        logger.info(
          {
            qname,
          },
          'Asserted and Send',
        );
        mainchannel.sendToQueue(qname, new Buffer(JSON.stringify(data)));
      });
  } else {
    logger.info(
      {
        qname,
      },
      'Send',
    );
    mainchannel.sendToQueue(qname, new Buffer(JSON.stringify(data)));
  }
}

function registerReceiver(
  name: string,
  callback: (data: string, ack: () => void) => boolean,
) {
  logger.info({ name }, `Register Recevier ${name}`);
  mainchannel
    .assertQueue(name, {
      arguments: {
        'x-message-ttl': 3 * 60 * 1000,
      },
      durable: false,
    })
    .then((info: any) => {
      logger.info(
        {
          info,
          name,
        },
        'Registered ',
      );
      mainchannel.consume(
        info.queue,
        (msg: any) => {
          try {
            logger.info(
              {
                q: info.queue,
              },
              'Got Message',
            );
            if (
              callback(msg.content.toString(), () => {
                mainchannel.ack(msg);
              }) !== false
            ) {
              mainchannel.ack(msg);
            }
          } catch (e) {
            logger.error(
              {
                err: e.message,
                msg,
                name,
              },
              'Error on Executing message receiver',
            );
          }
        },
        {
          noAck: false,
        },
      );
    });
}

/**
 *  MainQueue
 */
setInterval(() => {
  if (mainchannel === undefined) {
    return;
  }
  if (pubQ.length > 0) {
    let b: IQueueElement;
    let cc = 0;
    while (pubQ.length > 0 && cc < 10) {
      b = pubQ.shift();
      processElement(b.name, b.data);
      cc = cc + 1;
    }
  }
  if (newReceivers !== undefined) {
    logger.info('Registering Receivers');
    receivers = newReceivers;
    Object.keys(receivers).forEach((key: string) => {
      registerReceiver(key, receivers[key]);
    });
    registerReceiver(rabbitIncoming, (data: string, ack: () => void) => {
      logger.debug({ data }, 'Got Incoming');
      const answer: IData = JSON.parse(data);
      const answerID = answer.answerID;
      if (awaitingAnswer[answerID] !== undefined) {
        const res = awaitingAnswer[answerID];
        delete awaitingAnswer[answerID];
        res.resolve(answer.answer);
      } else {
        logger.warn({ answerID }, 'Received Answer, but answer cant be found');
      }
      return true; // Auto Acknowledge
    });
    newReceivers = undefined;
  }
}, 200).unref();

const afterConnect = () => {
  logger.info('Was Connected');
  // Start Publisher
  rabbitConnection
    .createChannel()
    .then((ch: any) => {
      mainchannel = ch;
      mainchannel.on('error', (err: Error) => {
        logger.error(
          {
            err,
          },
          'RMQChannel Error',
        );
      });
      mainchannel.on('close', (err: Error) => {
        logger.info(
          {
            err,
          },
          'RMQChannel Channel was closed',
        );
        mainchannel = undefined;
      });
    })
    .catch((err: Error) => {
      mainchannel = undefined;
      logger.error(
        {
          err,
        },
        'Channel Create Error',
      );
    });
};

let mqRunning = true;

const start = () => {
  amqp
    .connect(`amqp://${rabbitHost}:${rabbitPort}/?heartbeat=60`, {
      clientProperties: {
        platform: require.main.filename.split(/[/\\]/).splice(-1, 1),
        product: 'RabbitConnector',
      },
    })
    .then((conn: any) => {
      logger.info('Rabbit Connected');
      rabbitConnection = conn;
      rabbitConnection.on('error', (err: Error) => {
        logger.error(
          {
            err,
          },
          'RMQ Error',
        );
      });
      rabbitConnection.on('close', (err: Error) => {
        mainchannel = undefined;
        rabbitConnection = undefined;
        queues = {};
        if (receivers !== undefined) {
          newReceivers = receivers;
          receivers = undefined;
        }
        if (mqRunning) {
          logger.error(
            {
              err,
            },
            'RMQ Closed',
          );
          if (mqRunning) {
            setTimeout(start, 1000);
          }
        }
      });
      afterConnect();
    })
    .catch((err: Error) => {
      logger.error(
        {
          err,
        },
        'Rabbit Not Connected',
      );
      setTimeout(start, 1000);
    });

  process.on('beforeExit', () => {
    mqRunning = false;
    mainchannel = undefined;
    if (rabbitConnection !== undefined) {
      rabbitConnection.close();
    }
  });
};
start();

logger.info('Started');

function maintenance() {
  const n = Date.now();
  Object.keys(awaitingAnswer).forEach((key: string) => {
    logger.debug({ key }, 'check');
    if (awaitingAnswer[key].timeout < n) {
      awaitingAnswer[key].reject('Timeout');
      delete awaitingAnswer[key];
      logger.warn({ key }, 'action timeout');
    }
  });
}
setInterval(maintenance, 5000).unref();

const userabbit = {
  registerReceiver(obj: any) {
    newReceivers = obj;
  },
  send(name: string, data: IData) {
    pubQ.push({name, data});
  },
  sendSpecial(name: string, data: IActionData) {
    pubQ.push({name, data});
  },
  sendAction(action: string, data: IData): Promise<IData> {
    return new Promise((resolve, reject) => {
      const answerID = uuid.v4();
      awaitingAnswer[answerID] = {
        reject,
        resolve,
        timeout: Date.now() + 5000,
      };
      userabbit.sendSpecial('DEVICE_ACTION', {
        action,
        answerID,
        answerTo: rabbitIncoming,
        context: data,
      });
    });
  },
};

export default userabbit;
