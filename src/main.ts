/**
 * Central File to start application, referenced from npm run start
 */

/** */
import { Container } from 'constitute';
import fs = require ('fs');
import { defaultBindings, DeviceAttributes } from 'spark-server';
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

function parseDir(directory: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        fs.readdir(`${directory}`, (err: NodeJS.ErrnoException, files: string[]) => {
            if (err) {
                return reject(err + '' +  directory);
            }
            resolve(Promise.all(
                files
                    .filter((filename) => ('' + filename).match(/.pub.pem$/) !== null )
                    .map((filename): Promise<string> => {
                        return Promise.resolve(filename.substr(0, 24));
                    }),
            ));
        });
    });
}

async function prepareManager(): Promise<boolean> {
    try {
        let user = await users.getByUsername('admin');
        if (!user) {
            user = await users.createWithCredentials({ username: 'admin', password: 'admin'}, 'administrator');
            logger.info({ user }, 'Admin was created' );
        }
        logger.info({id : user.id }, 'Readed Admin, looking up deviceKeys' );
        const devices = await parseDir('./data/deviceKeys/');
        logger.info({ count: devices.length }, 'Keyfiles found');
        for (const deviceID of devices) {
            const dev: DeviceAttributes = await manager.getDevice(deviceID);
            if (dev) {
                logger.info({deviceID}, 'Found device');
                if (dev.ownerID !== user.id) {
                    logger.info({ existingOwnerID: dev.ownerID }, 'Claiming for admin');
                    await manager.claimDevice(deviceID, user.id);
                }
            } else {
                logger.warn({deviceID}, 'Device not found, prepare for admin');
                await manager.initDevice (deviceID, user.id);
            }
        }
    } catch ( err ) {
        logger.error({err}, 'Error');
    }
    return Promise.resolve(true);
}

const users = container.constitute('UserRepository');

const manager: HeadLessManagers = container.constitute('HeadLessManagers');

(async () => {
    await prepareManager();
    const deviceServer = container.constitute('DeviceServer');
    deviceServer.start();
})();

logger.info('Started');

pManager.on('exit', () => logger.info('Should stop deviceServer.'));
