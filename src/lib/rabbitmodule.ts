import { IReceivers, RabbitConnector  } from './rabbit';

import { Module } from './module';
/**
 * A Module containing a predefined Rabbit Connection
 * @export
 * @abstract
 * @class RabbitModule
 * @extends {Module}
 */
export abstract class RabbitModule extends Module {
    protected rabbit: RabbitConnector;
    constructor(instanceID: string) {
        super(instanceID);
    }
    public configRabbit(receivers: IReceivers)  {
        this.rabbit = new RabbitConnector(receivers, this.instanceID);
    }
    public abstract start(): void;
}
