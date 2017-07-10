"use strict";
/**
 * Central File to start application, referenced from npm run start
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
/** */
const constitute_1 = require("constitute");
const spark_server_1 = require("spark-server");
const headlessmanager_1 = require("./headlessmanager");
const logger_1 = require("./lib/logger");
const pmanager_1 = require("./lib/pmanager");
const settings_1 = require("./settings");
const logger = logger_1.default.createModuleLogger(module);
const container = new constitute_1.Container();
spark_server_1.defaultBindings(container, settings_1.default);
container.bindClass('HeadLessManagers', headlessmanager_1.default, [
    'DeviceAttributeRepository',
    'EVENT_PROVIDER',
    'EventPublisher',
]);
const deviceServer = container.constitute('DeviceServer');
deviceServer.start();
const users = container.constitute('UserRepository');
const manager = container.constitute('HeadLessManagers');
(() => __awaiter(this, void 0, void 0, function* () {
    try {
        let user = yield users.getByUsername('admin');
        if (!user) {
            user = yield users.createWithCredentials({ username: 'admin', password: 'admin' }, 'administrator');
            logger.info({ user }, ' Admin was created');
        }
        logger.info({ id: user.id }, ' Readed Admin');
        manager.claimDevice('3d004b001051353338363333', user.id);
    }
    catch (err) {
        logger.error({ err }, 'Error');
    }
}))();
logger.info('Started');
pmanager_1.default.on('exit', () => logger.info('Should stop deviceServer.'));
//# sourceMappingURL=main.js.map