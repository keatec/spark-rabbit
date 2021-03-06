"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rabbit_1 = require("./rabbit");
const module_1 = require("./module");
/**
 * A Module containing a predefined Rabbit Connection
 * @export
 * @abstract
 * @class RabbitModule
 * @extends {Module}
 */
class RabbitModule extends module_1.Module {
    constructor(instanceID) {
        super(instanceID);
    }
    configRabbit(receivers) {
        this.rabbit = new rabbit_1.RabbitConnector(receivers, this.instanceID);
    }
}
exports.RabbitModule = RabbitModule;
//# sourceMappingURL=rabbitmodule.js.map