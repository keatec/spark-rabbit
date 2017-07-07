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
const logger_1 = require("../lib/logger");
const logger = logger_1.default.createModuleLogger(module);
const modulemanager_1 = require("../lib/modulemanager");
const pmanager_1 = require("../lib/pmanager");
const rabbitmodule_1 = require("../lib/rabbitmodule");
pmanager_1.default.on('exit', () => logger.info('Stopping Democlient'));
/*
(async () => {
    try {
        const answer = await rabbit.sendAction('FLASH_DEVICE', {
            deviceID: '3d004b001051353338363333',
            firmwareName: 'firmware.bin.0.9.2.aquatast_exta.bin',
        });
        logger.info({answer}, 'Got Answer');
    } catch (err) {
        logger.error({err}, 'Error during EV_BEAT');
    }
})();
*/
class Rabs extends rabbitmodule_1.RabbitModule {
    constructor(instanceID) {
        super(instanceID);
        this.configRabbit({
            DEVICE_STATE: this.on_DEVICE_STATE.bind(this),
            JEV_BEAT: this.on_JEV_BEAT.bind(this),
        });
    }
    on_DEVICE_STATE(data) {
        this.logger.info({ data }, 'State');
        return true;
    }
    on_JEV_BEAT(data) {
        const ev = JSON.parse(data);
        this.logger.info({ deviceID: ev.deviceID }, 'Beat');
        (() => __awaiter(this, void 0, void 0, function* () {
            try {
                const answer = yield this.rabbit.sendAction('GET_DEVICE_ATTRIBUTES', { deviceID: ev.deviceID });
                this.logger.info({ answer }, 'Got Answer');
            }
            catch (err) {
                this.logger.error({ err }, 'Error during JEV_BEAT');
            }
        }))();
        return true;
    }
    start() {
        this.logger.info('Started');
    }
}
exports.default = modulemanager_1.ModuleManager.registerClass(Rabs, module);
//# sourceMappingURL=module_rabbitdemo.js.map