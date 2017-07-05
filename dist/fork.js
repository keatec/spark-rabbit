"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cp = require("child_process");
const logger_1 = require("./lib/logger");
const logger = logger_1.default.createModuleLogger(module);
const run = cp.fork('./dist/client.js', [], {});
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
});
process.on('SIGTERM', () => {
    logger.info('SigTerm Called');
});
//# sourceMappingURL=fork.js.map