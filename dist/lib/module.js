"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("./logger");
class Module {
    constructor(instanceID) {
        this.instanceID = instanceID;
        this.logger = logger_1.default.createNamedLogger(this.instanceID);
    }
}
exports.Module = Module;
//# sourceMappingURL=module.js.map