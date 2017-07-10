/**
 * Sample Starting Point for a PManager base start file
 * all settings are configured in setting.ts
 */

/** */
import Logger from './lib/logger';
import { Module } from './lib/module';
import { ModuleManager } from './lib/modulemanager';
const logger = Logger.createModuleLogger(module);
logger.info('Starting Modules');

const runnings: Module[] = [];

process.argv.slice(2).map((name) => {
    logger.info({modulename: name}, 'Loading');
    runnings.push(ModuleManager.createClass(require('./modules/' + name + '.js').default));
});
