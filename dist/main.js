"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constitute_1 = require("constitute");
const spark_server_1 = require("spark-server");
const headlessmanager_1 = require("./headlessmanager");
const logger_1 = require("./lib/logger");
const pmanager_1 = require("./lib/pmanager");
const settings_1 = require("./settings");
const logger = logger_1.default.createModuleLogger(module);
const container = new constitute_1.Container();
// Change Settings if you want here
spark_server_1.defaultBindings(container, settings_1.default);
container.bindClass('HeadLessManagers', headlessmanager_1.default, [
    'EventPublisher',
    'EVENT_PROVIDER',
]);
const deviceServer = container.constitute('DeviceServer');
deviceServer.start();
container.constitute('HeadLessManagers');
logger.info('Started');
pmanager_1.default.on('exit', () => logger.info('Should stop deviceServer.'));
//# sourceMappingURL=main.js.map