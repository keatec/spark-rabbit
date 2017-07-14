"use strict";
/**
 * Interface Libray to interact with rabbit (amqp compatible) messagequeue
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const amqp = require("amqplib");
const logger_1 = require("./logger");
const uuid = require("uuid");
const queueparameters_1 = require("./queueparameters");
const logger = logger_1.default.createModuleLogger(module);
const rabbitHost = process.env.RABBIT_PORT_5672_TCP_ADDR || '172.22.17.61';
const rabbitPort = process.env.RABBIT_PORT_5672_TCP_PORT || 9998;
/**
 * Central Class to interface with an Rabbit
 */
class RabbitConnector {
    constructor(receivers, name = 'default', noIncoming = false) {
        this.rabbitIncoming = 'uninitialized';
        this.publishQueue = [];
        this.awaitingAnswer = {};
        this.receivers = {};
        this.queuesInitialized = {};
        this.mqRunning = true;
        let iNumber = RabbitConnector.nameCounter[name];
        if (iNumber === undefined) {
            RabbitConnector.nameCounter[name] = 0;
            iNumber = 0;
        }
        RabbitConnector.nameCounter[name] += 1;
        if (noIncoming) {
            this.rabbitIncoming = 'NONE';
        }
        else {
            this.rabbitIncoming = `INCOMING_${process.env.HOSTNAME !== undefined
                ? process.env.HOSTNAME
                : process.env.COMPUTERNAME}_${name}_${iNumber}`;
        }
        this.newReceivers = receivers;
        setInterval(() => this.maintenance(), 5000).unref();
        setInterval(() => this.processQueues(), 200).unref();
        setTimeout(() => this.start(), 10);
        logger.info({ rabbitHost, rabbitPort, incoming: this.rabbitIncoming }, 'Rabbit-Interface Instance initialized');
        RabbitConnector.runningInstances.push(this);
    }
    /**
     * Send an exit to all Running Rabbit connectors
     * Should be called from a surrounding system in case of process Exit
     * @static
     * @memberof RabbitConnector
     */
    static onProcessExit() {
        logger.info('Closing instances...');
        RabbitConnector.runningInstances.map((instance) => instance.onExit());
    }
    sendAction(action, data) {
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
    send(queue, data) {
        this.publishQueue.push({ queue, data });
    }
    onExit() {
        logger.info({ wasRunning: this.mqRunning, connection: this.rabbitConnection !== undefined }, 'Going down...');
        this.mqRunning = false;
        if (this.mainchannel !== undefined) {
            logger.info('Closing with channel');
            (() => __awaiter(this, void 0, void 0, function* () {
                yield this.mainchannel.close();
                logger.info('Channel Closed.');
                yield this.rabbitConnection.close();
                logger.info('Connection Closed.');
            }))();
        }
        else {
            logger.info('Closing without channel');
            (() => __awaiter(this, void 0, void 0, function* () {
                if (this.rabbitConnection !== undefined) {
                    yield this.rabbitConnection.close();
                    logger.info('Connection Closed.');
                }
            }))();
        }
    }
    sendInternalAsAction(queue, data) {
        this.publishQueue.push({ queue, data });
    }
    sendInternal(queueName, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this.queuesInitialized[queueName] === undefined) {
                    yield this.mainchannel.assertQueue(queueName, {
                        arguments: {
                            'x-message-ttl': queueparameters_1.QParameters.getTTL(queueName),
                        },
                        durable: false,
                    });
                    logger.info({ queueName }, 'Queue Asserted');
                    this.queuesInitialized[queueName] = 1;
                }
                yield this.mainchannel.sendToQueue(queueName, new Buffer(JSON.stringify(data)));
                logger.info({ queueName }, 'Queue Send');
            }
            catch (err) {
                logger.error({ err }, 'Error on sending');
            }
        });
    }
    processQueues() {
        if (this.mainchannel === undefined) {
            return;
        }
        let b;
        let cc = 0;
        while (this.publishQueue.length > 0 && cc < 10) {
            b = this.publishQueue.shift();
            this.sendInternal(b.queue, b.data);
            cc = cc + 1;
        }
        if (this.newReceivers !== undefined) {
            logger.info('Registering Receivers');
            this.receivers = this.newReceivers;
            Object.keys(this.receivers).forEach((key) => {
                this.registerReceiver(key, this.receivers[key]);
            });
            if (this.rabbitIncoming !== 'NONE') {
                // Dont register an incomming queue, if this Connector is marked as noIncoming
                this.registerReceiver(this.rabbitIncoming, (data, ack) => {
                    logger.debug({ data }, 'Got Incoming');
                    const answer = JSON.parse(data);
                    const answerID = answer.answerID;
                    if (this.awaitingAnswer[answerID] !== undefined) {
                        const res = this.awaitingAnswer[answerID];
                        delete this.awaitingAnswer[answerID];
                        if (answer.error) {
                            res.reject(answer.error);
                        }
                        else {
                            res.resolve(answer.answer);
                        }
                    }
                    else {
                        logger.warn({ answerID }, 'Received Answer, but answer cant be found');
                    }
                    ack();
                    return false;
                });
            }
            this.newReceivers = undefined;
        }
    }
    maintenance() {
        const n = Date.now();
        Object.keys(this.awaitingAnswer).forEach((key) => {
            logger.debug({ key }, 'check');
            if (this.awaitingAnswer[key].timeout < n) {
                this.awaitingAnswer[key].reject('Timeout');
                delete this.awaitingAnswer[key];
                logger.warn({ key }, 'action timeout');
            }
        });
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.rabbitConnection = yield amqp.connect(`amqp://${rabbitHost}:${rabbitPort}/?heartbeat=60`, {
                    clientProperties: {
                        platform: require.main.filename.split(/[/\\]/).splice(-1, 1),
                        product: 'RabbitConnector',
                    },
                });
                logger.info('Rabbit Connected');
                this.rabbitConnection.on('error', (error) => {
                    if (error !== undefined) {
                        logger.error({ error }, 'Rabbit connection Error');
                    }
                });
                this.rabbitConnection.on('close', (error) => {
                    if (this.mqRunning) {
                        logger.error({ error, running: this.mqRunning }, 'RMQ Connection closed, reconnect in 2.5s');
                        this.restart();
                    }
                    else {
                        logger.info({ error, running: this.mqRunning }, 'RMQ Connection closed');
                    }
                });
                this.afterConnect();
            }
            catch (err) {
                logger.error({ err }, 'Rabbit Not Connected, reconnect in 2.5s');
                this.restart(err);
            }
        });
    }
    registerReceiver(queueName, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            logger.info({ queueName }, `Register Receiver ${queueName}`);
            const info = yield this.mainchannel.assertQueue(queueName, {
                arguments: {
                    'x-message-ttl': queueparameters_1.QParameters.getTTL(queueName),
                },
                durable: false,
            });
            logger.info({ info }, 'Registered');
            yield this.mainchannel.consume(info.queue, (msg) => {
                try {
                    logger.info({ msg }, 'Got Message');
                    const ack = callback(msg.content.toString(), () => {
                        this.mainchannel.ack(msg);
                    });
                    if (ack !== false) {
                        this.mainchannel.ack(msg);
                    }
                }
                catch (err) {
                    logger.error({ err }, 'Error on executing message receiver');
                }
            }, {
                noAck: false,
            });
        });
    }
    afterConnect() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                logger.info('Was Connected');
                this.mainchannel = yield this.rabbitConnection.createChannel();
                this.mainchannel.on('error', (error) => logger.error({ error }, 'RMQ Channel Error'));
                this.mainchannel.on('close', () => {
                    logger.info({}, 'RMQ Channel Closed');
                    this.mainchannel = undefined;
                });
            }
            catch (err) {
                this.mainchannel = undefined;
                logger.error({ err }, 'Error on AfterConnect');
            }
        });
    }
    restart(err) {
        this.mainchannel = undefined;
        this.rabbitConnection = undefined;
        this.queuesInitialized = {};
        if (this.receivers !== undefined) {
            this.newReceivers = this.receivers;
            this.receivers = undefined;
        }
        if (this.mqRunning) {
            logger.info({ err }, 'Restarting');
            setTimeout(() => this.start(), 1000);
        }
    }
}
RabbitConnector.nameCounter = {};
RabbitConnector.runningInstances = [];
exports.RabbitConnector = RabbitConnector;
//# sourceMappingURL=rabbit.js.map