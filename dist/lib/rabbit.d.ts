export declare type SparkActions = "GET_DEVICE_ATTRIBUTES" | "FLASH_DEVICE" | "GET_DEVICE_VARIABLE_VALUE" | "PING_DEVICE" | "RAISE_YOUR_HAND" | "UPDATE_DEVICE_ATTRIBUTES" | "CALL_DEVICE_FUNCTION";
export interface IReceivers {
    [queueName: string]: (data: string, ack?: () => void) => boolean;
}
export interface IData {
    [name: string]: any;
}
/**
 * Central Class to interface with an Rabbit
 */
export declare class RabbitConnector {
    /**
     * Send an exit to all Running Rabbit connectors
     * Should be called from a surrounding system in case of process Exit
     * @static
     * @memberof RabbitConnector
     */
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
    constructor(receivers: IReceivers, name?: string, noIncoming?: boolean);
    sendAction(action: SparkActions, data: IData): Promise<IData>;
    sendSysAction(action: string, data: IData): Promise<IData>;
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
