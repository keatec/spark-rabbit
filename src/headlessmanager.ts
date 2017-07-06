import { Event, EventProvider, EventPublisher } from 'spark-protocol';
import { SPARK_SERVER_EVENTS } from 'spark-protocol';
import { FirmwareInfo } from './firmwareinfo';
import Logger from './lib/logger';
import { IData, RabbitConnector } from './lib/rabbit';
const logger = Logger.createModuleLogger(module);

const devices = {};

class HeadLessManagers {
  private eventPublisher: EventPublisher;
  private eventProvider: EventProvider;
  private rabbit: RabbitConnector;
  constructor(eventPublisher: EventPublisher, eventProvider: EventProvider) {
    this.eventPublisher = eventPublisher;
    this.eventProvider = eventProvider;
    this.eventProvider.onNewEvent((event: Event) => {
      logger.info({ event }, 'New Event');
      if (event.data !== undefined && event.data[0] === '{') {
        this.rabbit.send(`JEV_${event.name}`, event);
      } else {
        this.rabbit.send(`EV_${event.name}`, event);
      }
      if (event.name === 'spark/status') {
        if (event.data === 'online') {
          devices[event.deviceID] = true;
          (async () => {
            const attr = await this.run('GET_DEVICE_ATTRIBUTES', {
              deviceID: event.deviceID,
            });
            attr.firmware = FirmwareInfo.identify(attr.appHash);
            logger.info({ attr }, 'Attributes found');
            this.rabbit.send(`DEVICE_STATE`, { online: attr });
          })();
        }
        if (event.data === 'offline') {
          devices[event.deviceID] = false;
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
              if (devices[event.context.deviceID] === false) {
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
    }, 'HLM');
  }

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
}

export default HeadLessManagers;
