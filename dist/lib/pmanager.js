"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EventEmitter = require("events");
const logger_1 = require("./logger");
const logger = logger_1.default.createModuleLogger(module);
class PManager extends EventEmitter {
    constructor() {
        super();
        this.halted = false;
        process.on('SIGTERM', () => this.halt());
        process.on('SIGINT', () => this.halt());
        process.on('uncaughtException', (err) => {
            logger.error({ err }, 'Uncaught Exception');
            logger.error('System is going to halt!');
            this.halt();
        });
        process.on('unhandledRejection', (reason, p) => {
            logger.error({ at: p, reason }, 'Unhandled Rejection');
            logger.error('System is going to halt!');
            this.halt();
        });
    }
    halt() {
        if (this.halted) {
            logger.info('Halt already called');
            return;
        }
        logger.info('Stopping system (force process EXIT after 10s) TermCode 8 -- Forced');
        this.halted = true;
        setTimeout(() => this.emit('exit'), 100);
        setTimeout(() => process.exit(8), 10 * 1000).unref();
    }
}
exports.PManager = PManager;
const single = new PManager();
logger.info('pManager created');
exports.default = single;
//# sourceMappingURL=pmanager.js.map