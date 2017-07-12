import Logger from './logger';
const logger = Logger.createModuleLogger(module);

import Reader = require('binary-version-reader');
const reader = new (Reader.HalModuleParser)();

import fs = require('fs');

interface IFileInfo {
    appHash: string;
    buffer: Buffer;
    fileName: string;
    name: string;
}

function parseDir(directory: string): Promise<IFileInfo[]> {
    return new Promise((resolve, reject) => {
        fs.readdir(`${directory}`, (err: NodeJS.ErrnoException, files: string[]) => {
            if (err) {
                return reject(err + '' +  directory);
            }
            resolve(Promise.all(
                files
                    .filter((filename) => ('' + filename).match(/.bin$/) !== null )
                    .map((filename): Promise<IFileInfo> => {
                        return new Promise ((res, rej) => {
                            reader.parseFile(`${directory}${filename}`, (fileInfo, parseerr) => {
                                if (parseerr) {
                                    return rej(parseerr);
                                }
                                return res({
                                    appHash: fileInfo.suffixInfo.fwUniqueId,
                                    buffer: undefined,
                                    fileName: directory + filename,
                                    name: filename,
                                });
                            });
                        });
                    }),
            ));
        });
    });
}

const knownAppHash = {

};

const knownFirmware = {

};

async function syncFirmwareImages() {
    const files = await parseDir('./firmware/');
    logger.info({files}, 'Found Firmare images');
    files.map((fInfo) => {
        fInfo.appHash = (fInfo.appHash + '').toUpperCase();
        knownAppHash[fInfo.appHash] = fInfo;
        knownFirmware[fInfo.name] = fInfo;
    });
    logger.info({knownAppHash, knownFirmware}, 'Firmware Result');
}

setTimeout(() => syncFirmwareImages(), 100).unref();
setInterval(() => syncFirmwareImages(), 5 * 60 * 1000).unref();

export class FirmwareInfo {
    public static identify(appHash: string) {
        if (knownAppHash[appHash] !== undefined) {
            return knownAppHash[appHash].name;
        }
        return 'unknown-' + appHash + '';
    }
    public static getFileBuffer(name: string): Promise<Buffer> {
        const kn = knownFirmware[name];
        if (kn === undefined) {
            logger.error({name}, 'Filebuffer not found for');
            return Promise.resolve(undefined);
        }
        if (kn.buffer !== undefined) {
            return Promise.resolve(kn.buffer);
        }
        return new Promise((res) => {
            fs.readFile(kn.fileName, (err, buffer) => {
                if (err) {
                    logger.error({err, name: kn.fileName}, 'Cant load Firmware file');
                    return res(undefined);
                }
                return res(buffer);
            });
        });
    }
}
