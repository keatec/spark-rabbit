"use strict";
// @flow
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("./logger");
const logger = logger_1.default.createModuleLogger(module);
class RabbitEventProvider {
    constructor(eventPublisher) {
        this.onNewEvent = (callback, eventNamePrefix = '*') => {
            this.eventPublisher.subscribe(eventNamePrefix, this.onNewEventCallback(callback), {
                filterOptions: {
                    listenToBroadcastedEvents: true,
                    listenToInternalEvents: false,
                },
            });
        };
        this.onNewEventCallback = (callback) => (event) => {
            callback(Object.assign({}, event));
        };
        logger.warn('Own Provider');
        this.eventPublisher = eventPublisher;
    }
}
exports.RabbitEventProvider = RabbitEventProvider;
//# sourceMappingURL=rabbiteventprovider.js.map