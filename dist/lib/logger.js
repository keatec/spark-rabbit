"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bunyan = require("bunyan");
const path = require("path");
class Logger {
    static createModuleLogger(applicationModule) {
        return bunyan.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            name: path.basename(applicationModule.filename),
            serializers: bunyan.stdSerializers,
        });
    }
    static createNamedLogger(name) {
        return bunyan.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            name,
            serializers: bunyan.stdSerializers,
        });
    }
}
exports.default = Logger;
//# sourceMappingURL=logger.js.map