import { Container } from 'constitute';
import {
    defaultBindings,
    } from 'spark-server';
import HeadLessManagers from './headlessmanager';
import Logger from './lib/logger';
import settings from './settings';
const logger = Logger.createModuleLogger(module);

process.on('uncaughtException', (exception: Error) => {
  logger.error({ err: exception }, 'uncaughtException');
  process.exit(1); // exit with failure
});

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
