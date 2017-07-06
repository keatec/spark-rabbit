"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cp = require("child_process");
const logger_1 = require("./lib/logger");
const logger = logger_1.default.createModuleLogger(module);
const run = cp.fork('./dist/client.js', [], { stdio: [0, 1, 2, 'ipc'] });
run.on('exit', (code, signal) => {
    logger.info({ code, signal }, 'Exit');
});
run.on('close', (code, signal) => {
    logger.info({ code, signal }, 'Close');
});
run.on('error', (err) => {
    logger.info({ err }, 'Error');
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
//# sourceMappingURL=fork.js.map