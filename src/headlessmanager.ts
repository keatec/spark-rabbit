import { DeviceAttributes, Event, EventProvider, EventPublisher, IDeviceAttributeRepository } from 'spark-protocol';
import { SPARK_SERVER_EVENTS } from 'spark-protocol';
import { FirmwareInfo } from './lib/firmwareinfo';
import Logger from './lib/logger';
import { IData, RabbitConnector } from './lib/rabbit';
const logger = Logger.createModuleLogger(module);

interface IDeviceInfo {
  attributes?: DeviceAttributes;
  lastSeen: number;
  lastAttributes?: number;
  online: boolean;
}

const devices: {
  [name: string]: IDeviceInfo;
}  = {};

/**
 * Provides an Interface to Spark, based von Rabbit
 *
 * @class HeadLessManagers
 */
class HeadLessManagers {
  private eventPublisher: EventPublisher;
  private eventProvider: EventProvider;
  private deviceAttributeRepository: IDeviceAttributeRepository;
  private rabbit: RabbitConnector;
  constructor(
      deviceAttributeRepository: IDeviceAttributeRepository,
      eventProvider: EventProvider,
      eventPublisher: EventPublisher ) {
    this.eventPublisher = eventPublisher;
    this.eventProvider = eventProvider;
    this.deviceAttributeRepository = deviceAttributeRepository;
    this.eventProvider.onNewEvent((event: Event) => {
      let device = devices[event.deviceID];
      if (device === undefined) {
        device = {
          lastSeen: Date.now(),
          online: true,
        };
        devices[event.deviceID] = device;
      } else {
        device.lastSeen = Date.now();
      }
      logger.info({
          data: (event.name.substr(0, 6) === 'spark/') ? event.data : 'JSON?',
          deviceID: event.deviceID,
          event: event.name,
          evx: event,
      }, 'Event');
      if (event.data !== undefined && event.data[0] === '{') {
        this.rabbit.send(`JEV_${event.name}`, event);
      } else {
        this.rabbit.send(`EV_${event.name}`, event);
      }
      if (event.name === 'spark/status') {
        if (event.data === 'online') {
          (async () => {
            try {
              const attr = await this.run('GET_DEVICE_ATTRIBUTES', {
                deviceID: event.deviceID,
              });
              attr.firmware = FirmwareInfo.identify(attr.appHash);
              logger.info({ attr }, 'Attributes found');
              device.attributes = attr;
              device.lastAttributes = Date.now();
              this.rabbit.send(`DEVICE_STATE`, { online: attr });
            } catch (err) {
              logger.error({err}, 'Error on processing online Message');
            }
          })();
        }
        if (event.data === 'offline') {
          device.online = false;
          this.rabbit.send(`DEVICE_STATE`, {
            offline: { deviceID: event.deviceID },
          });
        }
      }
    });
    this.rabbit = new RabbitConnector({
      DEVICE_ACTION: (eventString: string, ack: () => void): boolean => {
        const event = JSON.parse(eventString);
        (async () => {
          if (event.context.firmwareName !== undefined) {
            logger.info({name: event.context.firmwareName}, 'Reading Firmware)');
            event.context.fileBuffer = await FirmwareInfo.getFileBuffer(event.context.firmwareName);
            delete event.context.firmwareName;
            logger.info(`Readed`);
          }
          if (event.context.deviceID !== undefined) {
            if (devices[event.context.deviceID] === undefined) {
              logger.warn({ deviceID: event.context.deviceID }, 'Cant found device for action');
              ack();
              if (event.answerTo !== undefined) {
                this.rabbit.send(event.answerTo, { error: 'Cant found device for action', answerID: event.answerID });
              }
              return;
            } else {
              if (devices[event.context.deviceID].online) {
                logger.warn({ deviceID: event.context.deviceID }, 'Device is currently offline');
                ack();
                if (event.answerTo !== undefined) {
                  this.rabbit.send(event.answerTo, { error: 'Device is currently offline', answerID: event.answerID });
                }
                return;
              }
            }
          }
          this.run(event.action, event.context)
            .then((answer: IData) => {
              logger.info({ ans: answer }, 'Answer found for action');
              if (answer.error !== undefined) {
                throw new Error('Error from Spark-Server' + answer.error);
              }
              ack();
              if (event.answerTo !== undefined) {
                this.rabbit.send(event.answerTo, { answer, answerID: event.answerID });
              }
            })
            .catch((err: Error) => {
              logger.warn({ err }, 'Error found for action');
              ack();
              if (event.answerTo !== undefined) {
                this.rabbit.send(event.answerTo, { error: err.message, answerID: event.answerID });
              }
            });
        })();
        return false;
      },
      SYS_ACTION: (eventString: string, ack: () => void): boolean => {
        (async () => {
          ack();
          let event: IData = {};
          try {
            event = JSON.parse(eventString);
            if (this['action_' + event.action] !== undefined) {
                  const answer: IData = await this['sysaction' + event.action](event.context);
                  if (event.answerTo !== undefined) {
                    this.rabbit.send(event.answerTo, { answer, answerID: event.answerID });
                  }
            } else {
                if (event.answerTo !== undefined) {
                  this.rabbit.send(event.answerTo, { answerID: event.answerID,
                      error: 'Action was not found for SYS_ACTION ',
                  });
                }
            }
          } catch (e) {
            if (event.answerTo !== undefined) {
              this.rabbit.send(event.answerTo, { answerID: event.answerID,
                  error: 'Error on executing SYS_ACTION '  +  event.action + ('' + JSON.stringify(e))});
            } else {
              logger.error({ event, eventString }, ' Error Executing SysAction');
            }
          }
        })();
        return false;
      },
    }, 'HLM');
  }
  public sysactiondevices = async (context: IData): Promise<IData> => {
    logger.info({ context }, 'Running Devices');
    return Promise.resolve(Object.keys(devices));
  }
  /**
   * Start a SPARKSERVER Event using the Data provided
   *
   * @memberof HeadLessManagers
   */
  public run = async (method: string, context: IData): Promise<IData> => {
    if (SPARK_SERVER_EVENTS[method] === undefined) {
      return Promise.reject(`Not a SparkServer Method ${method}`);
    }
    const answer = await this.eventPublisher.publishAndListenForResponse({
      context: context === undefined ? {} : context,
      name: SPARK_SERVER_EVENTS[method],
    });
    return answer;
  }
  /**
   * get current Attributes based on DeviceID (directly from Storage Interface)
   *
   * @memberof HeadLessManagers
   */
  public getDevice = async (deviceID: string): Promise<DeviceAttributes> => {
    return this.deviceAttributeRepository.getByID(deviceID);
  }
  /**
   * Assign a user to a device, if the device is not found, a plain device will be created
   *
   * @memberof HeadLessManagers
   */
  public initDevice = async (deviceID: string, userID: string) => {
    const attributes = await this.deviceAttributeRepository.getByID(deviceID);
    if (attributes) {
      logger.warn({ deviceID }, 'InitiDevice, Device already exists');
      if ( attributes.ownerID !== userID ) {
        logger.info({deviceID, existingOwner: attributes.ownerID}, 'Claiming device during init');
        await this.eventPublisher.publishAndListenForResponse({
          context: { attributes: { ownerID: userID }, deviceID },
          name: SPARK_SERVER_EVENTS.UPDATE_DEVICE_ATTRIBUTES,
        });
        await this.deviceAttributeRepository.updateByID(deviceID, {
          ownerID: userID,
        });
      }
    } else {
        await this.deviceAttributeRepository.updateByID(deviceID, {
          ownerID: userID,
        });
    }
  }
  /**
   * Claim an existing device to the user provided
   * (original code from Spark-Server)
   * @memberof HeadLessManagers
   */
  public claimDevice = async (
    deviceID: string,
    userID: string,
  ): Promise<DeviceAttributes> => {
    // todo check: we may not need to get attributes from db here.
    let attributes = await this.deviceAttributeRepository.getByID(deviceID);
    let claim = true;
    if (!attributes) {
      logger.warn('No device found');
      claim = false;
    }
    if (attributes.ownerID && attributes.ownerID !== userID) {
      logger.warn('The device belongs to someone else, reassign to me');
    }

    if (attributes.ownerID && attributes.ownerID === userID) {
      logger.warn('The device is already claimed.');
      claim = false;
    }

    if (claim) {
      logger.info({ deviceID, attributes }, 'Claiming device');
      // update connected device attributes
      /*await this.eventPublisher.publishAndListenForResponse({
        context: { attributes: { ownerID: userID }, deviceID },
        name: SPARK_SERVER_EVENTS.UPDATE_DEVICE_ATTRIBUTES,
      });
      */
      // todo check: we may not need to update attributes in db here.
      await this.deviceAttributeRepository.updateByID(deviceID, {
        ownerID: userID,
      });
      attributes = await this.deviceAttributeRepository.getByID(deviceID);
    }
    return attributes;
  }
}

export default HeadLessManagers;
