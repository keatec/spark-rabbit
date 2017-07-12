/// <reference types="bunyan" />
import bunyan = require('bunyan');
/**
 * Module to be managed by pManager
 *
 * @export
 * @abstract
 * @class Module
 */
export declare abstract class Module {
    protected instanceID: string;
    protected logger: bunyan;
    constructor(instanceID: string);
    abstract start(): void;
}
