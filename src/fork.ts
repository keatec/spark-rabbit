import cp = require ('child_process');
import Logger from './lib/logger';
const logger = Logger.createModuleLogger(module);

const run = cp.fork('./dist/client.js', [], {});
run.on('exit', (code: number, signal: string) => {
    logger.info({code, signal}, 'Exit');
});
run.on('close', (code: number, signal: string) => {
    logger.info({code, signal}, 'Close');
});
run.on('error', (err: Error) => {
    logger.info({err}, 'Error');
});
run.on('disconnect', () => {
    logger.info({}, 'Disconnected');
});
process.on('SIGINT', () => {
    logger.info('SigInt Called');
});
process.on('SIGTERM', () => {
    logger.info('SigTerm Called');
});
