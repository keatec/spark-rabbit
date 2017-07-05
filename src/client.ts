import Logger from './lib/logger';
import { RabbitConnector } from './lib/rabbit';
const logger = Logger.createModuleLogger(module);

const rabbit = new RabbitConnector({
    DEVICE_STATE: (data: string): boolean => {
        logger.info({ data }, 'State');
        return true;
    },
    EV_BEAT: (data: string): boolean => {
        const ev = JSON.parse(data);
        logger.info({ deviceID : ev.deviceID }, 'Beat');
        (async () => {
            try {
                const answer = await rabbit.sendAction('GET_DEVICE_ATTRIBUTES', { deviceID: ev.deviceID});
                logger.info({answer}, 'Got Answer');
            } catch (err) {
              logger.error({err}, 'Error during EV_BEAT');
            }
        })();
        return true;
    },
}, 'DemoClient');
