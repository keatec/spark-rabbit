import EventEmitter = require('events');
import Logger from './logger';
const logger = Logger.createModuleLogger(module);

export class PManager extends EventEmitter {
    private halted: boolean = false;
    constructor() {
        super();
        process.on('SIGTERM', () => this.halt());
        process.on('SIGINT', () => this.halt());
        process.on('uncaughtException', (err: Error) => {
            logger.error({err}, 'Uncaught Exception');
            logger.error('System is going to halt!');
            this.halt();
        });
        process.on('unhandledRejection', (reason, p) => {
            logger.error({at: p, reason}, 'Unhandled Rejection');
            logger.error('System is going to halt!');
            this.halt();
        });
    }
    private halt() {
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

const single = new PManager();
logger.info('pManager created');

export default single;
