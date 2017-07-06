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
const firmwareinfo_1 = require("./firmwareinfo");
const logger_1 = require("./lib/logger");
const rabbit_1 = require("./lib/rabbit");
const logger = logger_1.default.createModuleLogger(module);
const devices = {};
class HeadLessManagers {
    constructor(eventPublisher, eventProvider) {
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
        this.eventPublisher = eventPublisher;
        this.eventProvider = eventProvider;
        this.eventProvider.onNewEvent((event) => {
            logger.info({ event }, 'New Event');
            this.rabbit.send(`EV_${event.name}`, event);
            if (event.name === 'spark/status') {
                if (event.data === 'online') {
                    devices[event.deviceID] = true;
                    (() => __awaiter(this, void 0, void 0, function* () {
                        const attr = yield this.run('GET_DEVICE_ATTRIBUTES', {
                            deviceID: event.deviceID,
                        });
                        attr.firmware = firmwareinfo_1.FirmwareInfo.identify(attr.appHash);
                        logger.info({ attr }, 'Attributes found');
                        this.rabbit.send(`DEVICE_STATE`, { online: attr });
                    }))();
                }
                if (event.data === 'offline') {
                    devices[event.deviceID] = false;
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
                        logger.info({ err }, 'Error found for action');
                        ack();
                        if (event.answerTo !== undefined) {
                            this.rabbit.send(event.answerTo, { error: err.message, answerID: event.answerID });
                        }
                    });
                }))();
                return false;
            },
        }, 'HLM');
    }
}
exports.default = HeadLessManagers;
//# sourceMappingURL=headlessmanager.js.map