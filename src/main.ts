import { Container } from 'constitute';
import { defaultBindings } from 'spark-server';
import HeadLessManagers from './headlessmanager';
import Logger from './lib/logger';
import { default as pManager } from './lib/pmanager';
import settings from './settings';

const logger = Logger.createModuleLogger(module);

const container = new Container();
// Change Settings if you want here
defaultBindings(container, settings);

container.bindClass('HeadLessManagers', HeadLessManagers, [
    'EventPublisher',
    'EVENT_PROVIDER',
]);

const deviceServer = container.constitute('DeviceServer');
deviceServer.start();

container.constitute('HeadLessManagers');

logger.info('Started');

pManager.on('exit', () => logger.info('Should stop deviceServer.'));
