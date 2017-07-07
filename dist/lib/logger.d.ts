/// <reference types="node" />
/// <reference types="bunyan" />
import bunyan = require('bunyan');
export default class Logger {
    static createModuleLogger(applicationModule: NodeModule): bunyan;
    static createNamedLogger(name: string): bunyan;
}
