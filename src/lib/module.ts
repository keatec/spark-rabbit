
import bunyan = require('bunyan');
import Logger from './logger';

export abstract class Module {
    protected instanceID: string;
    protected logger: bunyan;
    constructor(instanceID: string) {
        this.instanceID = instanceID;
        this.logger = Logger.createNamedLogger(this.instanceID);
    }
    public abstract start(): void;
}
