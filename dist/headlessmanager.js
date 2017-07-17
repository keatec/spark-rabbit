"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const spark_protocol_1 = require("spark-protocol");
const firmwareinfo_1 = require("./lib/firmwareinfo");
const logger_1 = require("./lib/logger");
const rabbit_1 = require("./lib/rabbit");
const logger = logger_1.default.createModuleLogger(module);
const devices = {};
/**
 * Provides an Interface to Spark, based von Rabbit
 *
 * @class HeadLessManagers
 */
class HeadLessManagers {
    constructor(deviceAttributeRepository, eventProvider, eventPublisher) {
        this.sysActionDevices = (context) => __awaiter(this, void 0, void 0, function* () {
            logger.info({ context }, 'Running Devices');
            const answer = {};
            let adev;
            let dev;
            const now = Date.now();
            Object.keys(devices).map((deviceID) => {
                adev = {};
                dev = devices[deviceID];
                if (dev === undefined) {
                    logger.error({ dev, devices }, ' Dev is undefined ');
                }
                if (context.online !== undefined) {
                    if (dev.online !== context.online) {
                        dev = undefined;
                    }
                    if (context.online && dev !== undefined) {
                        adev.seconds = Math.round((dev.lastSeen - now) / 100) / 10;
                    }
                }
                if (dev !== undefined) {
                    adev.online = dev.online;
                    if (context.attributes !== undefined && dev.attributes !== undefined) {
                        context.attributes.map((name) => {
                            adev[name] = dev.attributes[name];
                        });
                    }
                    adev.attributes = dev.attributes;
                    answer[deviceID] = adev;
                }
            });
            return Promise.resolve(answer);
        });
        /**
         * Start a SPARKSERVER Event using the Data provided
         *
         * @memberof HeadLessManagers
         */
        this.run = (method, context) => __awaiter(this, void 0, void 0, function* () {
            if (spark_protocol_1.SPARK_SERVER_EVENTS[method] === undefined) {
                return Promise.reject(`Not a SparkServer Method ${method}`);
            }
            const answer = yield this.eventPublisher.publishAndListenForResponse({
                context: context === undefined ? {} : context,
                name: spark_protocol_1.SPARK_SERVER_EVENTS[method],
            });
            return answer;
        });
        /**
         * get current Attributes based on DeviceID (directly from Storage Interface)
         *
         * @memberof HeadLessManagers
         */
        this.getDevice = (deviceID) => __awaiter(this, void 0, void 0, function* () {
            return this.deviceAttributeRepository.getByID(deviceID);
        });
        /**
         * Assign a user to a device, if the device is not found, a plain device will be created
         *
         * @memberof HeadLessManagers
         */
        this.initDevice = (deviceID, userID) => __awaiter(this, void 0, void 0, function* () {
            const attributes = yield this.deviceAttributeRepository.getByID(deviceID);
            if (attributes) {
                logger.warn({ deviceID }, 'InitiDevice, Device already exists');
                if (attributes.ownerID !== userID) {
                    logger.info({ deviceID, existingOwner: attributes.ownerID }, 'Claiming device during init');
                    yield this.eventPublisher.publishAndListenForResponse({
                        context: { attributes: { ownerID: userID }, deviceID },
                        name: spark_protocol_1.SPARK_SERVER_EVENTS.UPDATE_DEVICE_ATTRIBUTES,
                    });
                    yield this.deviceAttributeRepository.updateByID(deviceID, {
                        ownerID: userID,
                    });
                }
            }
            else {
                yield this.deviceAttributeRepository.updateByID(deviceID, {
                    ownerID: userID,
                });
            }
        });
        /**
         * Claim an existing device to the user provided
         * (original code from Spark-Server)
         * @memberof HeadLessManagers
         */
        this.claimDevice = (deviceID, userID) => __awaiter(this, void 0, void 0, function* () {
            // todo check: we may not need to get attributes from db here.
            let attributes = yield this.deviceAttributeRepository.getByID(deviceID);
            let claim = true;
            if (!attributes) {
                logger.warn('No device found');
                claim = false;
            }
            if (attributes.ownerID && attributes.ownerID !== userID) {
                logger.warn('The device belongs to someone else, reassign to me');
            }
            if (attributes.ownerID && attributes.ownerID === userID) {
                logger.warn('The device is already claimed.');
                claim = false;
            }
            if (claim) {
                logger.info({ deviceID, attributes }, 'Claiming device');
                // update connected device attributes
                /*await this.eventPublisher.publishAndListenForResponse({
                  context: { attributes: { ownerID: userID }, deviceID },
                  name: SPARK_SERVER_EVENTS.UPDATE_DEVICE_ATTRIBUTES,
                });
                */
                // todo check: we may not need to update attributes in db here.
                yield this.deviceAttributeRepository.updateByID(deviceID, {
                    ownerID: userID,
                });
                attributes = yield this.deviceAttributeRepository.getByID(deviceID);
            }
            return attributes;
        });
        this.eventPublisher = eventPublisher;
        this.eventProvider = eventProvider;
        this.deviceAttributeRepository = deviceAttributeRepository;
        this.eventProvider.onNewEvent((event) => {
            let device = devices[event.deviceID];
            if (device === undefined) {
                device = {
                    lastSeen: Date.now(),
                    online: true,
                };
                devices[event.deviceID] = device;
            }
            else {
                device.lastSeen = Date.now();
            }
            logger.info({
                data: (event.name.substr(0, 6) === 'spark/') ? event.data : 'JSON?',
                deviceID: event.deviceID,
                event: event.name,
                evx: event,
            }, 'Event');
            if (event.data !== undefined && event.data[0] === '{') {
                this.rabbit.send(`JEV_${event.name}`, event);
            }
            else {
                this.rabbit.send(`EV_${event.name}`, event);
            }
            if (event.name === 'spark/status') {
                if (event.data === 'online') {
                    (() => __awaiter(this, void 0, void 0, function* () {
                        try {
                            const attr = yield this.run('GET_DEVICE_ATTRIBUTES', {
                                deviceID: event.deviceID,
                            });
                            attr.firmware = firmwareinfo_1.FirmwareInfo.identify(attr.appHash);
                            logger.info({ attr }, 'Attributes found');
                            device.attributes = attr;
                            device.lastAttributes = Date.now();
                            this.rabbit.send(`DEVICE_STATE`, { online: attr });
                        }
                        catch (err) {
                            logger.error({ err }, 'Error on processing online Message');
                        }
                    }))();
                }
                if (event.data === 'offline') {
                    device.online = false;
                    this.rabbit.send(`DEVICE_STATE`, {
                        offline: { deviceID: event.deviceID },
                    });
                }
            }
        });
        this.rabbit = new rabbit_1.RabbitConnector({
            DEVICE_ACTION: (eventString, ack) => {
                const event = JSON.parse(eventString);
                (() => __awaiter(this, void 0, void 0, function* () {
                    if (event.context.firmwareName !== undefined) {
                        logger.info({ name: event.context.firmwareName }, 'Reading Firmware)');
                        event.context.fileBuffer = yield firmwareinfo_1.FirmwareInfo.getFileBuffer(event.context.firmwareName);
                        delete event.context.firmwareName;
                        logger.info(`Readed`);
                    }
                    if (event.context.deviceID !== undefined) {
                        if (devices[event.context.deviceID] === undefined) {
                            logger.warn({ deviceID: event.context.deviceID }, 'Cant found device for action');
                            ack();
                            if (event.answerTo !== undefined) {
                                this.rabbit.send(event.answerTo, { error: 'Cant found device for action', answerID: event.answerID });
                            }
                            return;
                        }
                        else {
                            if (!devices[event.context.deviceID].online) {
                                logger.warn({ deviceID: event.context.deviceID }, 'Device is currently offline');
                                ack();
                                if (event.answerTo !== undefined) {
                                    this.rabbit.send(event.answerTo, { error: 'Device is currently offline', answerID: event.answerID });
                                }
                                return;
                            }
                        }
                    }
                    this.run(event.action, event.context)
                        .then((answer) => {
                        logger.info({ ans: answer }, 'Answer found for action');
                        if (answer.error !== undefined) {
                            throw new Error('Error from Spark-Server' + answer.error);
                        }
                        ack();
                        if (event.answerTo !== undefined) {
                            this.rabbit.send(event.answerTo, { answer, answerID: event.answerID });
                        }
                    })
                        .catch((err) => {
                        logger.warn({ err }, 'Error found for action');
                        ack();
                        if (event.answerTo !== undefined) {
                            this.rabbit.send(event.answerTo, { error: err.message, answerID: event.answerID });
                        }
                    });
                }))();
                return false;
            },
            SYS_ACTION: (eventString, ack) => {
                (() => __awaiter(this, void 0, void 0, function* () {
                    ack();
                    let event = {};
                    try {
                        event = JSON.parse(eventString);
                        let used = false;
                        if (event.action === 'devices') {
                            used = true;
                            const answer = yield this.sysActionDevices(event.context);
                            if (event.answerTo !== undefined) {
                                this.rabbit.send(event.answerTo, { answer, answerID: event.answerID });
                            }
                        }
                        if (!used) {
                            if (event.answerTo !== undefined) {
                                this.rabbit.send(event.answerTo, { answerID: event.answerID, error: { action: event.action,
                                        text: 'Action was not found for SYS_ACTION ', event, th: this,
                                    } });
                            }
                        }
                    }
                    catch (e) {
                        logger.error({ err: e, event, eventString }, ' Error Executing SysAction');
                        if (event.answerTo !== undefined) {
                            this.rabbit.send(event.answerTo, { answerID: event.answerID,
                                error: 'Error on executing SYS_ACTION ' + event.action + ('' + JSON.stringify(e)) });
                        }
                    }
                }))();
                return false;
            },
        }, 'HLM');
    }
}
exports.default = HeadLessManagers;
//# sourceMappingURL=headlessmanager.js.map