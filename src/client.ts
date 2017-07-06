import Logger from './lib/logger';
import { RabbitConnector } from './lib/rabbit';
const logger = Logger.createModuleLogger(module);

import { default as pManager } from './lib/pmanager';

const rabbit = new RabbitConnector({
    DEVICE_STATE: (data: string): boolean => {
        logger.info({ data }, 'State');
        return true;
    },
    JEV_BEAT: (data: string): boolean => {
        const ev = JSON.parse(data);
        logger.info({ deviceID : ev.deviceID }, 'Beat');
        (async () => {
            try {
                const answer = await rabbit.sendAction('GET_DEVICE_ATTRIBUTES', { deviceID: ev.deviceID});
                logger.info({answer}, 'Got Answer');
            } catch (err) {
              logger.error({err}, 'Error during JEV_BEAT');
            }
        })();
        return true;
    },
}, 'DemoClient');

pManager.on('exit', () => logger.info('Stopping Democlient'));

(async () => {
    try {
        const answer = await rabbit.sendAction('FLASH_DEVICE', {
            deviceID: '3d004b001051353338363333',
            firmwareName: 'firmware.bin.0.9.2.aquatast_exta.bin',
        });
        logger.info({answer}, 'Got Answer');
    } catch (err) {
        logger.error({err}, 'Error during EV_BEAT');
    }
})();
