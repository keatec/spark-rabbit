import cp = require ('child_process');
import Logger from './lib/logger';
const logger = Logger.createModuleLogger(module);

const run = cp.fork('./dist/client.js', [], {stdio : [0, 1, 2, 'ipc'] });
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
    run.kill('SIGINT');
});
process.on('SIGTERM', () => {
    logger.info('SigTerm Called');
});

setInterval(() => { logger.info('Ping'); }, 1000);
