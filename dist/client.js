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
const logger_1 = require("./lib/logger");
const rabbit_1 = require("./lib/rabbit");
const logger = logger_1.default.createModuleLogger(module);
const pmanager_1 = require("./lib/pmanager");
const rabbit = new rabbit_1.RabbitConnector({
    DEVICE_STATE: (data) => {
        logger.info({ data }, 'State');
        return true;
    },
    EV_BEAT: (data) => {
        const ev = JSON.parse(data);
        logger.info({ deviceID: ev.deviceID }, 'Beat');
        (() => __awaiter(this, void 0, void 0, function* () {
            try {
                const answer = yield rabbit.sendAction('GET_DEVICE_ATTRIBUTES', { deviceID: ev.deviceID });
                logger.info({ answer }, 'Got Answer');
            }
            catch (err) {
                logger.error({ err }, 'Error during EV_BEAT');
            }
        }))();
        return true;
    },
}, 'DemoClient');
pmanager_1.default.on('exit', () => logger.info('Stopping Democlient'));
(() => __awaiter(this, void 0, void 0, function* () {
    try {
        const answer = yield rabbit.sendAction('FLASH_DEVICE', {
            deviceID: '3d004b001051353338363333',
            firmwareName: 'firmware.bin.0.9.2.aquatast_exta.bin',
        });
        logger.info({ answer }, 'Got Answer');
    }
    catch (err) {
        logger.error({ err }, 'Error during EV_BEAT');
    }
}))();
//# sourceMappingURL=client.js.map