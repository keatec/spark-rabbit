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
const fs = require("fs");
const spark_server_1 = require("spark-server");
const headlessmanager_1 = require("./headlessmanager");
const logger_1 = require("./lib/logger");
const settings_1 = require("./settings");
const logger = logger_1.default.createModuleLogger(module);
/**
 * Create Global Container
 */
const container = new constitute_1.Container();
spark_server_1.defaultBindings(container, settings_1.default);
/**
 * Propagate HeadLessManager
 */
container.bindClass('HeadLessManagers', headlessmanager_1.default, [
    'DeviceAttributeRepository',
    'EVENT_PROVIDER',
    'EventPublisher',
]);
/**
 * Parse Directory for KeyFiles and answer a List of DeviceID's
 *
 * @param {string} directory
 * @returns {Promise<string[]>}
 */
function parseDir(directory) {
    return new Promise((resolve, reject) => {
        fs.readdir(`${directory}`, (err, files) => {
            if (err) {
                return reject(err + '' + directory);
            }
            resolve(Promise.all(files
                .filter((filename) => ('' + filename).match(/.pub.pem$/) !== null)
                .map((filename) => {
                return Promise.resolve(filename.substr(0, 24));
            })));
        });
    });
}
/**
 * Prepare current Storage
 * - create admin user, if not found
 * - read all keyfiles from Directory and prepare / claim the devices to admin user
 * @returns {Promise<boolean>}
 */
function prepareManager() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let user = yield users.getByUsername('admin');
            if (!user) {
                user = yield users.createWithCredentials({ username: 'admin', password: 'admin' }, 'administrator');
                logger.info({ user }, 'Admin was created');
            }
            logger.info({ id: user.id }, 'Readed Admin, looking up deviceKeys');
            const devices = yield parseDir('./data/deviceKeys/');
            logger.info({ count: devices.length }, 'Keyfiles found');
            for (const deviceID of devices) {
                const dev = yield manager.getDevice(deviceID);
                if (dev) {
                    logger.info({ deviceID }, 'Found device');
                    if (dev.ownerID !== user.id) {
                        logger.info({ existingOwnerID: dev.ownerID }, 'Claiming for admin');
                        yield manager.claimDevice(deviceID, user.id);
                    }
                }
                else {
                    logger.warn({ deviceID }, 'Device not found, prepare for admin');
                    yield manager.initDevice(deviceID, user.id);
                }
            }
            return Promise.resolve(true);
        }
        catch (err) {
            logger.error({ err }, 'Error');
        }
        return Promise.resolve(true);
    });
}
const users = container.constitute('UserRepository');
const manager = container.constitute('HeadLessManagers');
/**
 * Startup Squenz.
 * Start Server, after Storage is prepared with existing KeyFiles
 */
(() => __awaiter(this, void 0, void 0, function* () {
    yield prepareManager();
    const deviceServer = container.constitute('DeviceServer');
    deviceServer.start();
}))();
//# sourceMappingURL=main.js.map