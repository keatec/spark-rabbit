import { Event, EventProvider, EventPublisher } from 'spark-protocol';
import { SPARK_SERVER_EVENTS } from 'spark-protocol';
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
      this.rabbit.send(`EV_${event.name}`, event);
      if (event.name === 'spark/status') {
        if (event.data === 'online') {
          devices[event.deviceID] = true;
          (async () => {
            const attr = await this.run('GET_DEVICE_ATTRIBUTES', {
              deviceID: event.deviceID,
            });
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
        this.run(event.action, event.context)
          .then((answer: IData) => {
            logger.info({ ans: answer, ev: event }, 'Answer found for action');
            if (answer.error !== undefined) {
              throw new Error('Error from Spark-Server' + answer.error);
            }
            ack();
            if (event.answerTo !== undefined) {
              this.rabbit.send(event.answerTo, { answer, answerID: event.answerID });
            }
          })
          .catch((err: Error) => {
            logger.info({ err, ev: event }, 'Error found for action');
            ack();
            if (event.answerTo !== undefined) {
              this.rabbit.send(event.answerTo, { error: err.message, answerID: event.answerID });
            }
          });
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
