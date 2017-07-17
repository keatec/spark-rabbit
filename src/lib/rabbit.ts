/**
 * Interface Libray to interact with rabbit (amqp compatible) messagequeue
 */

import amqp = require ('amqplib');
import {default as Logger} from './logger';
import uuid = require('uuid');
import { QParameters } from './queueparameters';

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

const logger = Logger.createModuleLogger(module);
const rabbitHost = process.env.RABBIT_PORT_5672_TCP_ADDR || '172.22.17.61';
const rabbitPort = process.env.RABBIT_PORT_5672_TCP_PORT || 9998;

/**
 * Central Class to interface with an Rabbit
 */
export class RabbitConnector {
  /**
   * Send an exit to all Running Rabbit connectors
   * Should be called from a surrounding system in case of process Exit
   * @static
   * @memberof RabbitConnector
   */
  public static onProcessExit() {
    logger.info('Closing instances...');
    RabbitConnector.runningInstances.map((instance) => instance.onExit());
  }
  private static nameCounter: {
    [name: string]: number,
  } = {};
  private static runningInstances: RabbitConnector[] = [];
  private rabbitIncoming: string = 'uninitialized';
  private publishQueue: IQueueElement[] = [];
  private awaitingAnswer: IAnswer = {};
  private rabbitConnection: amqp.Connection;
  private mainchannel: amqp.Channel;
  private newReceivers: IReceivers;
  private receivers: IReceivers = {};
  private queuesInitialized: {
    [queueName: string]: number,
  } = {};
  private mqRunning = true;

  constructor(receivers: IReceivers, name: string = 'default', noIncoming: boolean = false) {
    let iNumber = RabbitConnector.nameCounter[name];
    if (iNumber === undefined) {
      RabbitConnector.nameCounter[name] = 0;
      iNumber = 0;
    }
    RabbitConnector.nameCounter[name] += 1;
    if (noIncoming) {
      this.rabbitIncoming = 'NONE';
    } else {
      this.rabbitIncoming = `INCOMING_${process.env.HOSTNAME !== undefined
        ? process.env.HOSTNAME
        : process.env.COMPUTERNAME}_${name}_${iNumber}`;
    }
    this.newReceivers = receivers;
    setInterval(() => this.maintenance(), 5000).unref();
    setInterval(() => this.processQueues(), 200).unref();
    setTimeout(() => this.start(), 10);
    logger.info({rabbitHost, rabbitPort, incoming: this.rabbitIncoming}, 'Rabbit-Interface Instance initialized');
    RabbitConnector.runningInstances.push(this);
  }

  public sendAction(action: SparkActions, data: IData): Promise<IData> {
    return new Promise((resolve, reject) => {
      const answerID = uuid.v4();
      this.awaitingAnswer[answerID] = {
        reject,
        resolve,
        timeout: Date.now() + 5000,
      };
      this.sendInternalAsAction('DEVICE_ACTION', {
        action,
        answerID,
        answerTo: this.rabbitIncoming,
        context: data,
      });
    });
  }
  public sendSysAction(action: string, data: IData): Promise<IData> {
    return new Promise((resolve, reject) => {
      const answerID = uuid.v4();
      this.awaitingAnswer[answerID] = {
        reject,
        resolve,
        timeout: Date.now() + 5000,
      };
      this.sendInternalAsAction('SYS_ACTION', {
        action,
        answerID,
        answerTo: this.rabbitIncoming,
        context: data,
      });
    });
  }
  public send(queue: string, data: IData) {
    this.publishQueue.push({ queue, data });
  }

  protected onExit() {
    logger.info({wasRunning: this.mqRunning, connection: this.rabbitConnection !== undefined }, 'Going down...');
    this.mqRunning = false;
    if (this.mainchannel !== undefined) {
      logger.info('Closing with channel');
      (async () => {
        await this.mainchannel.close();
        logger.info('Channel Closed.');
        await this.rabbitConnection.close();
        logger.info('Connection Closed.');
      })();
    } else {
      logger.info('Closing without channel');
      (async () => {
        if (this.rabbitConnection !== undefined) {
          await this.rabbitConnection.close();
          logger.info('Connection Closed.');
        }
      })();
    }
  }

  private sendInternalAsAction(queue: string, data: IActionData ) {
    this.publishQueue.push({ queue, data });
  }

  private async sendInternal(queueName: string, data: IData) {
    try {
      if (this.queuesInitialized[queueName] === undefined) {
        await this.mainchannel.assertQueue(queueName, {
          arguments: {
            'x-message-ttl': QParameters.getTTL(queueName),
          },
          durable: false,
        });
        logger.info({queueName}, 'Queue Asserted');
        this.queuesInitialized[queueName] = 1;
      }
      await this.mainchannel.sendToQueue(queueName, new Buffer(JSON.stringify(data)));
      logger.info({queueName}, 'Queue Send');
    } catch (err) {
      logger.error({err}, 'Error on sending');
    }
  }
  private processQueues() {
    if (this.mainchannel === undefined) {
      return;
    }
    let b: IQueueElement;
    let cc = 0;
    while (this.publishQueue.length > 0 && cc < 10) {
      b = this.publishQueue.shift();
      this.sendInternal(b.queue, b.data);
      cc = cc + 1;
    }
    if (this.newReceivers !== undefined) {
      logger.info('Registering Receivers');
      this.receivers = this.newReceivers;
      Object.keys(this.receivers).forEach((key: string) => {
        this.registerReceiver(key, this.receivers[key]);
      });
      if (this.rabbitIncoming !== 'NONE') {
        // Dont register an incomming queue, if this Connector is marked as noIncoming
        this.registerReceiver(this.rabbitIncoming, (data: string, ack: () => void) => {
          logger.debug({ data }, 'Got Incoming');
          const answer: IData = JSON.parse(data);
          const answerID = answer.answerID;
          if (this.awaitingAnswer[answerID] !== undefined) {
            const res = this.awaitingAnswer[answerID];
            delete this.awaitingAnswer[answerID];
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
      }
      this.newReceivers = undefined;
    }
  }
  private maintenance() {
      const n = Date.now();
      Object.keys(this.awaitingAnswer).forEach((key: string) => {
        logger.debug({ key }, 'check');
        if (this.awaitingAnswer[key].timeout < n) {
          this.awaitingAnswer[key].reject('Timeout');
          delete this.awaitingAnswer[key];
          logger.warn({ key }, 'action timeout');
        }
      });
  }
  private async start() {
    try {
      this.rabbitConnection = await amqp.connect(`amqp://${rabbitHost}:${rabbitPort}/?heartbeat=60`, {
        clientProperties: {
          platform: require.main.filename.split(/[/\\]/).splice(-1, 1),
          product: 'RabbitConnector',
        },
      });
      logger.info('Rabbit Connected');
      this.rabbitConnection.on('error', (error) => {
        if (error !== undefined) {
          logger.error({error}, 'Rabbit connection Error');
        }
      });
      this.rabbitConnection.on('close', (error) => {
        if (this.mqRunning) {
          logger.error({error, running: this.mqRunning}, 'RMQ Connection closed, reconnect in 2.5s');
          this.restart();
        } else {
          logger.info({error, running: this.mqRunning}, 'RMQ Connection closed');
        }
      });
      this.afterConnect();
    } catch (err) {
      logger.error({err}, 'Rabbit Not Connected, reconnect in 2.5s');
      this.restart(err);
    }
  }
  private async registerReceiver(
    queueName: string,
    callback: (data: string, ack?: () => void) => boolean,
  ) {
    logger.info({ queueName }, `Register Receiver ${queueName}`);
    const info = await this.mainchannel.assertQueue(queueName, {
        arguments: {
          'x-message-ttl': QParameters.getTTL( queueName ),
        },
        durable: false,
      });
    logger.info({info}, 'Registered');
    await this.mainchannel.consume(info.queue, (msg: amqp.Message) => {
      try {
        logger.info({msg}, 'Got Message');
        const ack = callback(msg.content.toString(), () => {
            this.mainchannel.ack(msg);
        });
        if (ack !== false) {
          this.mainchannel.ack(msg);
        }
      } catch (err) {
        logger.error({err}, 'Error on executing message receiver');
      }
    }, {
      noAck: false,
    });
  }
  private async afterConnect() {
    try {
      logger.info('Was Connected');
      this.mainchannel = await this.rabbitConnection.createChannel();
      this.mainchannel.on('error', (error) => logger.error({ error }, 'RMQ Channel Error'));
      this.mainchannel.on('close', () => {
        logger.info({}, 'RMQ Channel Closed');
        this.mainchannel = undefined;
      });
    } catch (err) {
      this.mainchannel = undefined;
      logger.error({err}, 'Error on AfterConnect');
    }
  }
  private restart(err?: Error) {
    this.mainchannel = undefined;
    this.rabbitConnection = undefined;
    this.queuesInitialized = {};
    if (this.receivers !== undefined) {
      this.newReceivers = this.receivers;
      this.receivers = undefined;
    }
    if (this.mqRunning) {
      logger.info({err}, 'Restarting');
      setTimeout(() => this.start(), 1000);
    }
  }
}
