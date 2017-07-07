import { IReceivers, RabbitConnector } from './rabbit';
import { Module } from './module';
export declare abstract class RabbitModule extends Module {
    protected rabbit: RabbitConnector;
    constructor(instanceID: string);
    configRabbit(receivers: IReceivers): void;
    abstract start(): void;
}
