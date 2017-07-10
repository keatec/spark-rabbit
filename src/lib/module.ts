
import bunyan = require('bunyan');
import Logger from './logger';

/**
 * Module to be managed by pManager
 * 
 * @export
 * @abstract
 * @class Module
 */
export abstract class Module {
    protected instanceID: string;
    protected logger: bunyan;
    constructor(instanceID: string) {
        this.instanceID = instanceID;
        this.logger = Logger.createNamedLogger(this.instanceID);
    }
    public abstract start(): void;
}
