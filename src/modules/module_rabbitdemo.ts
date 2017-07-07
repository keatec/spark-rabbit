import Logger from '../lib/logger';
const logger = Logger.createModuleLogger(module);

import { ModuleManager } from '../lib/modulemanager';
import { default as pManager } from '../lib/pmanager';
import { RabbitModule } from '../lib/rabbitmodule';

pManager.on('exit', () => logger.info('Stopping Democlient'));

/*
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
*/

class Rabs extends RabbitModule {
    constructor(instanceID: string) {
        super(instanceID);
        this.configRabbit({
            DEVICE_STATE: this.on_DEVICE_STATE.bind(this),
            JEV_BEAT: this.on_JEV_BEAT.bind(this),
        });
    }
    public on_DEVICE_STATE(data: string): boolean {
        this.logger.info({ data }, 'State');
        return true;
    }
    public on_JEV_BEAT(data: string): boolean {
        const ev = JSON.parse(data);
        this.logger.info({ deviceID : ev.deviceID}, 'Beat');
        (async () => {
            try {
                const answer = await this.rabbit.sendAction('GET_DEVICE_ATTRIBUTES', { deviceID: ev.deviceID});
                this.logger.info({answer}, 'Got Answer');
            } catch (err) {
                this.logger.error({err}, 'Error during JEV_BEAT');
            }
        })();
        return true;
    }
    public start(): void {
        this.logger.info('Started');
    }
}

export default ModuleManager.registerClass(Rabs, module);
