"use strict";
/**
 * Sample Starting Point for a PManager base start file
 * all settings are configured in setting.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
/** */
const logger_1 = require("./lib/logger");
const modulemanager_1 = require("./lib/modulemanager");
const logger = logger_1.default.createModuleLogger(module);
logger.info('Starting Modules');
const runnings = [];
process.argv.slice(2).map((name) => {
    logger.info({ modulename: name }, 'Loading');
    runnings.push(modulemanager_1.ModuleManager.createClass(require('./modules/' + name + '.js').default));
});
//# sourceMappingURL=starter.js.map