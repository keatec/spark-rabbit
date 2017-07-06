export declare type SparkActions = "GET_DEVICE_ATTRIBUTES" | "FLASH_DEVICE" | "GET_DEVICE_VARIABLE_VALUE" | "PING_DEVICE" | "RAISE_YOUR_HAND" | "UPDATE_DEVICE_ATTRIBUTES" | "CALL_DEVICE_FUNCTION";
export interface IReceivers {
    [queueName: string]: (data: string, ack?: () => void) => boolean;
}
export interface IData {
    [name: string]: any;
}
export declare class RabbitConnector {
    static onProcessExit(): void;
    private static nameCounter;
    private static runningInstances;
    private rabbitIncoming;
    private publishQueue;
    private awaitingAnswer;
    private rabbitConnection;
    private mainchannel;
    private newReceivers;
    private receivers;
    private queuesInitialized;
    private mqRunning;
    constructor(receivers: IReceivers, name?: string);
    sendAction(action: SparkActions, data: IData): Promise<IData>;
    send(queue: string, data: IData): void;
    protected onExit(): void;
    private sendInternalAsAction(queue, data);
    private sendInternal(queueName, data);
    private processQueues();
    private maintenance();
    private start();
    private registerReceiver(queueName, callback);
    private afterConnect();
    private restart(err?);
}