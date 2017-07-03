import amqp = require ('amqplib');
import {
    defaultBindings,
    Settings,
} from 'spark-server';
import {default as Logger} from './logger';
import uuid = require('uuid');

interface IReceivers {
  [name: string]: (data: string, ack: () => void) => boolean;
}

interface IData {
  // tslint:disable-next-line:no-any
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

let rabbitConnection: amqp.Connection;
let mainchannel: amqp.Channel;
let queues: {
  [name: string]: number,
} = {};

let newReceivers: IReceivers;
let receivers: IReceivers = {};

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

const pubQ: IQueueElement[] = []; // Publish Queue, to be processed

interface IAnswer {
  [name: string]: {
    reject: (err: string) => void;
    resolve: (answer: IData) => void;
    timeout: number;
  };
}

const awaitingAnswer: IAnswer = {};

async function sendToQueue(qname: string, data: IData) {
  try {
    if (queues[qname] === undefined) {
      await mainchannel.assertQueue(qname, {
        arguments: {
          'x-message-ttl': 3 * 60 * 1000,
        },
        durable: false,
      });
      logger.info({qname}, 'Queue Asserted');
      queues[qname] = 1;
    }
    await mainchannel.sendToQueue(qname, new Buffer(JSON.stringify(data)));
    logger.info({qname}, 'Queue Send');
  } catch (err) {
    logger.error({err}, 'Error on sending');
  }
}

async function registerReceiver(
  name: string,
  callback: (data: string, ack: () => void) => boolean,
) {
  logger.info({ name }, `Register Receiver ${name}`);
  const info = await mainchannel.assertQueue(name, {
      arguments: {
        'x-message-ttl': 3 * 60 * 1000,
      },
      durable: false,
    });
  logger.info({info}, 'Registered');
  await mainchannel.consume(info.queue, (msg: amqp.Message) => {
    try {
      logger.info({msg}, 'Got Message');
      const ack = callback(msg.content.toString(), () => {
          mainchannel.ack(msg);
      });
      if (ack !== false) {
        mainchannel.ack(msg);
      }
    } catch (err) {
      logger.error({err}, 'Error on executing message receiver');
    }
  }, {
    noAck: false,
  });
}

setInterval(() => {
  if (mainchannel === undefined) {
    return;
  }
  let b: IQueueElement;
  let cc = 0;
  while (pubQ.length > 0 && cc < 10) {
    b = pubQ.shift();
    sendToQueue(b.name, b.data);
    cc = cc + 1;
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

async function afterConnect() {
  try {
    logger.info('Was Connected');
    mainchannel = await rabbitConnection.createChannel();
    mainchannel.on('error', (err: Error) => logger.error({err}, 'RMQ Channel Error'));
    mainchannel.on('close', (err: Error) => {
      logger.error({err}, 'RMQ Channel Error');
      mainchannel = undefined;
    });
  } catch (err) {
    mainchannel = undefined;
    logger.error({err}, 'Error on AfterConnect');
  }
}

let mqRunning = true;

function restart(err?: Error) {
  mainchannel = undefined;
  rabbitConnection = undefined;
  queues = {};
  if (receivers !== undefined) {
    newReceivers = receivers;
    receivers = undefined;
  }
  if (mqRunning) {
    logger.error({err}, 'RMQ Closed');
    if (mqRunning) {
      setTimeout(start, 1000);
    }
  }

}

async function start() {
  try {
    rabbitConnection = await amqp.connect(`amqp://${rabbitHost}:${rabbitPort}/?heartbeat=60`, {
      clientProperties: {
        platform: require.main.filename.split(/[/\\]/).splice(-1, 1),
        product: 'RabbitConnector',
      },
    });
    logger.info('Rabbit Connected');
    rabbitConnection.on('error', (err: Error) => {
      logger.error({err}, 'RMQ Error');
    });
    rabbitConnection.on('close', (err: Error) => {
      logger.error({err}, 'RMQ Connection closed, reconnect in 2.5s');
      restart();
    });
    afterConnect();
  } catch (err) {
    logger.error({err}, 'Rabbit Not Connected, reconnect in 2.5s');
    restart(err);
  }
}

process.on('beforeExit', () => {
  mqRunning = false;
  mainchannel = undefined;
  if (rabbitConnection !== undefined) {
    rabbitConnection.close();
  }
});

start();

setInterval(() => {
  const n = Date.now();
  Object.keys(awaitingAnswer).forEach((key: string) => {
    logger.debug({ key }, 'check');
    if (awaitingAnswer[key].timeout < n) {
      awaitingAnswer[key].reject('Timeout');
      delete awaitingAnswer[key];
      logger.warn({ key }, 'action timeout');
    }
  });
}, 5000).unref();

logger.info('Started');

const userabbit = {
  registerReceiver(obj: IReceivers) {
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
