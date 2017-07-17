import { EventProvider, EventPublisher, IDeviceAttributeRepository } from 'spark-protocol';
import { IData } from './lib/rabbit';
/**
 * Provides an Interface to Spark, based von Rabbit
 *
 * @class HeadLessManagers
 */
declare class HeadLessManagers {
    private eventPublisher;
    private eventProvider;
    private deviceAttributeRepository;
    private rabbit;
    constructor(deviceAttributeRepository: IDeviceAttributeRepository, eventProvider: EventProvider, eventPublisher: EventPublisher);
    sysactiondevices: (context: IData) => Promise<IData>;
    /**
     * Start a SPARKSERVER Event using the Data provided
     *
     * @memberof HeadLessManagers
     */
    run: (method: string, context: IData) => Promise<IData>;
    /**
     * get current Attributes based on DeviceID (directly from Storage Interface)
     *
     * @memberof HeadLessManagers
     */
    getDevice: (deviceID: string) => Promise<any>;
    /**
     * Assign a user to a device, if the device is not found, a plain device will be created
     *
     * @memberof HeadLessManagers
     */
    initDevice: (deviceID: string, userID: string) => Promise<void>;
    /**
     * Claim an existing device to the user provided
     * (original code from Spark-Server)
     * @memberof HeadLessManagers
     */
    claimDevice: (deviceID: string, userID: string) => Promise<any>;
}
export default HeadLessManagers;
