import EventEmitter = require('events');
import Logger from './logger';
import memwatch = require('memwatch-next');
import path = require('path');
import { RabbitConnector } from './rabbit';
const logger = Logger.createModuleLogger(module);

export class PManager extends EventEmitter {
    private halted: boolean = false;
    private rabbit: RabbitConnector;
    private iAm: string = `${
        process.env.HOSTNAME !== undefined ? process.env.HOSTNAME : process.env.COMPUTERNAME
    }-${process.pid}-${path.basename(process.mainModule.filename)}`;
    constructor() {
        super();
        this.rabbit = new RabbitConnector({}, 'PManager', true);
        process.on('SIGTERM', () => this.halt());
        process.on('SIGINT', () => this.halt());
        process.on('uncaughtException', (err: Error) => {
            logger.error({err}, 'Uncaught Exception');
            logger.error('System is going to halt!');
            this.halt();
        });
        process.on('unhandledRejection', (reason, p) => {
            this.rabbit.send('LOG_ERROR', { text: 'Unhandled Rejection', at: p, reason, iAm : this.iAm });
            logger.error({at: p, reason}, 'Unhandled Rejection');
        });
        memwatch.on('leak', (info) => {
            logger.warn({ info }, 'possible Heap-LEAK detected');
            this.rabbit.send('LOG_WARN', { text: 'possible Heap-LEAK detected', data: info, iAm : this.iAm });
        });
        memwatch.on('stats', (stats) => {
            logger.info({ stats }, 'HEAP Info');
            this.rabbit.send('LOG_INFO', { text: 'HEAP Info', data: stats, iAm : this.iAm });
        });
    }
    private halt() {
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

const single = new PManager();
logger.info('pManager created');

export default single;
