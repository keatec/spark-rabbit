/*

  Rabbit Interface Libary for Spark-Rabbit

*/
import amqp = require ('amqplib');
import {default as Logger} from './logger';
import uuid = require('uuid');

export type SparkActions =  "GET_DEVICE_ATTRIBUTES" |
                            "FLASH_DEVICE" |
                            "GET_DEVICE_VARIABLE_VALUE" |
                            "PING_DEVICE" |
                            "RAISE_YOUR_HAND" |
                            "UPDATE_DEVICE_ATTRIBUTES" |
                            "CALL_DEVICE_FUNCTION";

export interface IReceivers {
  [queueName: string]: (data: string, ack?: () => void) => boolean;
}
export interface IData {
  // tslint:disable-next-line:no-any
  [name: string]: any;
}
interface IQueueElement {
  queue: string;
  data: IData;
}
interface IActionData {
  action: string;
  answerID: string;
  answerTo: string;
  context: IData;
}
interface IAnswer {
  [answerID: string]: {
    reject: (err: string) => void;
    resolve: (answer: IData) => void;
    timeout: number;
  };
}

const rabbitIncoming = `INCOMING_${process.env.HOSTNAME !== undefined
  ? process.env.HOSTNAME
  : process.env.COMPUTERNAME}`;
const logger = Logger.createModuleLogger(module);
const rabbitHost = process.env.RABBIT_PORT_5672_TCP_ADDR || '172.22.17.61';
const rabbitPort = process.env.RABBIT_PORT_5672_TCP_PORT || 9998;
const publishQueue: IQueueElement[] = []; // Publish Queue, to be processed
const awaitingAnswer: IAnswer = {};

logger.info({rabbitHost, rabbitPort}, 'Initializing Rabbit');

let rabbitConnection: amqp.Connection;
let mainchannel: amqp.Channel;
let newReceivers: IReceivers;
let receivers: IReceivers = {};
let queuesInitialized: {
  [queueName: string]: number,
} = {};
let mqRunning = true;

async function sendToQueue(queueName: string, data: IData) {
  try {
    if (queuesInitialized[queueName] === undefined) {
      await mainchannel.assertQueue(queueName, {
        arguments: {
          'x-message-ttl': 3 * 60 * 1000,
        },
        durable: false,
      });
      logger.info({queueName}, 'Queue Asserted');
      queuesInitialized[queueName] = 1;
    }
    await mainchannel.sendToQueue(queueName, new Buffer(JSON.stringify(data)));
    logger.info({queueName}, 'Queue Send');
  } catch (err) {
    logger.error({err}, 'Error on sending');
  }
}

async function registerReceiver(
  queueName: string,
  callback: (data: string, ack?: () => void) => boolean,
) {
  logger.info({ queueName }, `Register Receiver ${queueName}`);
  const info = await mainchannel.assertQueue(queueName, {
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

function restart(err?: Error) {
  mainchannel = undefined;
  rabbitConnection = undefined;
  queuesInitialized = {};
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

function sendAsAction(queue: string, data: IActionData) {
    publishQueue.push({queue, data});
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

setInterval(() => {
  if (mainchannel === undefined) {
    return;
  }
  let b: IQueueElement;
  let cc = 0;
  while (publishQueue.length > 0 && cc < 10) {
    b = publishQueue.shift();
    sendToQueue(b.queue, b.data);
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
        if (answer.error) {
          res.reject(answer.error);
        } else {
          res.resolve(answer.answer);
        }
      } else {
        logger.warn({ answerID }, 'Received Answer, but answer cant be found');
      }
      ack();
      return false;
    });
    newReceivers = undefined;
  }
}, 200).unref();

start();
logger.info('Started');

export default class RabbitInterface {
  public static registerReceiver(obj: IReceivers) {
    newReceivers = obj;
  }
  public static send(queue: string, data: IData) {
    publishQueue.push({queue, data});
  }
  public static sendAction(action: SparkActions, data: IData): Promise<IData> {
    return new Promise((resolve, reject) => {
      const answerID = uuid.v4();
      awaitingAnswer[answerID] = {
        reject,
        resolve,
        timeout: Date.now() + 5000,
      };
      sendAsAction('DEVICE_ACTION', {
        action,
        answerID,
        answerTo: rabbitIncoming,
        context: data,
      });
    });
  }
}
