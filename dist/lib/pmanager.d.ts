/// <reference types="node" />
import EventEmitter = require('events');
export declare class PManager extends EventEmitter {
    private halted;
    constructor();
    private halt();
}
declare const single: PManager;
export default single;
