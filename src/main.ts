/**
 * Central File to start application, referenced from npm run start
 */

/** */
import { Container } from 'constitute';
import { defaultBindings } from 'spark-server';
import HeadLessManagers from './headlessmanager';
import Logger from './lib/logger';
import { default as pManager } from './lib/pmanager';
import settings from './settings';

const logger = Logger.createModuleLogger(module);

const container = new Container();
defaultBindings(container, settings);

container.bindClass('HeadLessManagers', HeadLessManagers, [
    'DeviceAttributeRepository',
    'EVENT_PROVIDER',
    'EventPublisher',
]);

const deviceServer = container.constitute('DeviceServer');
deviceServer.start();

const users = container.constitute('UserRepository');

const manager: HeadLessManagers = container.constitute('HeadLessManagers');

(async () => {
    try {
        let user = await users.getByUsername('admin');
        if (!user) {
            user = await users.createWithCredentials({ username: 'admin', password: 'admin'}, 'administrator');
            logger.info({ user }, ' Admin was created' );
        }
        logger.info({id : user.id }, ' Readed Admin' );
        manager.claimDevice('3d004b001051353338363333', user.id);
    } catch ( err ) {
        logger.error({err}, 'Error');
    }
})();

logger.info('Started');

pManager.on('exit', () => logger.info('Should stop deviceServer.'));
