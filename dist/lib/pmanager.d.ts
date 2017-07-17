/// <reference types="node" />
import EventEmitter = require('events');
export declare class PManager extends EventEmitter {
    private halted;
    private rabbit;
    private iAm;
    constructor();
    halt(): void;
}
declare const single: PManager;
export default single;
