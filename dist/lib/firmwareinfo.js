"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("./logger");
const logger = logger_1.default.createModuleLogger(module);
const Reader = require("binary-version-reader");
const reader = new (Reader.HalModuleParser)();
const fs = require("fs");
function parseDir(directory) {
    return new Promise((resolve, reject) => {
        fs.readdir(`${directory}`, (err, files) => {
            if (err) {
                return reject(err + '' + directory);
            }
            resolve(Promise.all(files
                .filter((filename) => ('' + filename).match(/.bin$/) !== null)
                .map((filename) => {
                return new Promise((res, rej) => {
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
            })));
        });
    });
}
const knownAppHash = {};
const knownFirmware = {};
function syncFirmwareImages() {
    return __awaiter(this, void 0, void 0, function* () {
        const files = yield parseDir('./firmware/');
        logger.info({ files }, 'Found Firmare images');
        files.map((fInfo) => {
            fInfo.appHash = (fInfo.appHash + '').toUpperCase();
            knownAppHash[fInfo.appHash] = fInfo;
            knownFirmware[fInfo.name] = fInfo;
        });
        logger.info({ knownAppHash, knownFirmware }, 'Firmware Result');
    });
}
setTimeout(() => syncFirmwareImages(), 100).unref();
setInterval(() => syncFirmwareImages(), 5 * 60 * 1000).unref();
class FirmwareInfo {
    static identify(appHash) {
        return knownAppHash[appHash].name;
    }
    static getFileBuffer(name) {
        const kn = knownFirmware[name];
        if (kn === undefined) {
            logger.error({ name }, 'Filebuffer not found for');
            return Promise.resolve(undefined);
        }
        if (kn.buffer !== undefined) {
            return Promise.resolve(kn.buffer);
        }
        return new Promise((res) => {
            fs.readFile(kn.fileName, (err, buffer) => {
                if (err) {
                    logger.error({ err, name: kn.fileName }, 'Cant load Firmware file');
                    return res(undefined);
                }
                return res(buffer);
            });
        });
    }
}
exports.FirmwareInfo = FirmwareInfo;
//# sourceMappingURL=firmwareinfo.js.map