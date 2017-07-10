"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("./logger");
/**
 * Module to be managed by pManager
 *
 * @export
 * @abstract
 * @class Module
 */
class Module {
    constructor(instanceID) {
        this.instanceID = instanceID;
        this.logger = logger_1.default.createNamedLogger(this.instanceID);
    }
}
exports.Module = Module;
//# sourceMappingURL=module.js.map