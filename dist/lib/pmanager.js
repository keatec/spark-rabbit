"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EventEmitter = require("events");
const logger_1 = require("./logger");
const memwatch = require("memwatch-next");
const path = require("path");
const rabbit_1 = require("./rabbit");
const logger = logger_1.default.createModuleLogger(module);
class PManager extends EventEmitter {
    constructor() {
        super();
        this.halted = false;
        this.iAm = `${process.env.HOSTNAME !== undefined ? process.env.HOSTNAME : process.env.COMPUTERNAME}-${process.pid}-${path.basename(process.mainModule.filename)}`;
        this.rabbit = new rabbit_1.RabbitConnector({}, 'PManager', true);
        process.on('SIGTERM', () => this.halt());
        process.on('SIGINT', () => this.halt());
        process.on('uncaughtException', (err) => {
            logger.error({ err }, 'Uncaught Exception');
            logger.error('System is going to halt!');
            this.halt();
        });
        process.on('unhandledRejection', (reason, p) => {
            this.rabbit.send('LOG_ERROR', { text: 'Unhandled Rejection', at: p, reason, iAm: this.iAm });
            logger.error({ at: p, reason }, 'Unhandled Rejection');
            logger.error('System is going to halt!');
            this.halt();
        });
        memwatch.on('leak', (info) => {
            logger.warn({ info }, 'possible Heap-LEAK detected');
            this.rabbit.send('LOG_WARN', { text: 'possible Heap-LEAK detected', data: info, iAm: this.iAm });
        });
        memwatch.on('stats', (stats) => {
            logger.info({ stats }, 'HEAP Info');
            this.rabbit.send('LOG_INFO', { text: 'HEAP Info', data: stats, iAm: this.iAm });
        });
    }
    halt() {
        if (this.halted) {
            logger.info('Halt already called');
            return;
        }
        logger.info('Stopping system (force process EXIT after 8s) TermCode 8 -- Forced');
        this.halted = true;
        setTimeout(() => this.emit('exit'), 100);
        setTimeout(() => {
            logger.warn('Terminating after 8 sec waiting Time...');
            process.exit(8);
        }, 8 * 1500).unref();
    }
}
exports.PManager = PManager;
const single = new PManager();
logger.info('pManager created');
exports.default = single;
//# sourceMappingURL=pmanager.js.map