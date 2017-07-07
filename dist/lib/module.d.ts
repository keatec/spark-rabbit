/// <reference types="bunyan" />
import bunyan = require('bunyan');
export declare abstract class Module {
    protected instanceID: string;
    protected logger: bunyan;
    constructor(instanceID: string);
    abstract start(): void;
}
