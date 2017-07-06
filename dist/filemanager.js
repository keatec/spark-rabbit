"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @flow
const logger_1 = require("./lib/logger");
const logger = logger_1.default.createModuleLogger(module);
const fs = require("fs");
const mkdirp_1 = require("mkdirp");
const path = require("path");
class FileManager {
    constructor(directoryPath, isJSON = true) {
        logger.info({ directoryPath, isJSON }, 'Create Filemanager');
        this.directoryPath = directoryPath;
        this.isJSON = isJSON;
        if (!fs.existsSync(directoryPath)) {
            mkdirp_1.default.sync(directoryPath);
        }
    }
    createFile(fileName, data) {
        logger.info({ fileName }, 'Create File');
        if (fs.existsSync(path.join(this.directoryPath, fileName))) {
            return;
        }
        logger.info({ data }, 'Create File, write');
        this.writeFile(fileName, data);
    }
    deleteFile(fileName) {
        logger.info({ fileName }, 'Delete File');
        const filePath = path.join(this.directoryPath, fileName);
        if (!fs.existsSync(filePath)) {
            return;
        }
        logger.info({ fileName }, 'Delete File, delete');
        fs.unlinkSync(filePath);
    }
    getAllData() {
        logger.info({}, 'Get All data from Directory');
        return fs
            .readdirSync(this.directoryPath)
            .filter((fileName) => fileName.endsWith('.json'))
            .map((fileName) => fs.readFileSync(path.join(this.directoryPath, fileName), 'utf8'));
    }
    getFile(fileName) {
        logger.info({ fileName }, 'Get File Content');
        const filePath = path.join(this.directoryPath, fileName);
        if (!fs.existsSync(filePath)) {
            return null;
        }
        logger.info({ fileName }, 'Get File Content, reading');
        return fs.readFileSync(filePath, 'utf8');
    }
    getFileBuffer(fileName) {
        logger.info({ fileName }, 'Get File Buffer');
        const filePath = path.join(this.directoryPath, fileName);
        if (!fs.existsSync(filePath)) {
            return null;
        }
        logger.info({ fileName }, 'Get File Buffer, reading');
        return fs.readFileSync(filePath);
    }
    hasFile(fileName) {
        logger.info({ fileName }, 'has File');
        const filePath = path.join(this.directoryPath, fileName);
        return fs.existsSync(filePath);
    }
    writeFile(fileName, data) {
        logger.info({ fileName }, 'Write File');
        fs.writeFileSync(path.join(this.directoryPath, fileName), data);
    }
}
exports.default = FileManager;
//# sourceMappingURL=filemanager.js.map