/**
 * Central File to start application, referenced from npm run start
 */

/** */
import { Container } from 'constitute';
import fs = require ('fs');
import { defaultBindings, DeviceAttributes, DeviceServer } from 'spark-server';
import HeadLessManagers from './headlessmanager';
import Logger from './lib/logger';
import settings from './settings';
const logger = Logger.createModuleLogger(module);

/**
 * Create Global Container
 */
const container = new Container();
defaultBindings(container, settings);

/**
 * Propagate HeadLessManager
 */
container.bindClass('HeadLessManagers', HeadLessManagers, [
    'DeviceAttributeRepository',
    'EVENT_PROVIDER',
    'EventPublisher',
]);

/**
 * Parse Directory for KeyFiles and answer a List of DeviceID's
 *
 * @param {string} directory
 * @returns {Promise<string[]>}
 */
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

/**
 * Prepare current Storage
 * - create admin user, if not found
 * - read all keyfiles from Directory and prepare / claim the devices to admin user
 * @returns {Promise<boolean>}
 */
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
        return Promise.resolve(true);
    } catch ( err ) {
        logger.error({err}, 'Error');
    }
    return Promise.reject('Error');
}

const users = container.constitute('UserRepository');

const manager: HeadLessManagers = container.constitute('HeadLessManagers');

/**
 * Startup Squenz.
 * Start Server, after Storage is prepared with existing KeyFiles
 */
(async () => {
    await prepareManager();
    const deviceServer: DeviceServer = container.constitute('DeviceServer');
    deviceServer.start();
})();
