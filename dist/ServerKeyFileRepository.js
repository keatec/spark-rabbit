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
const FileManager_1 = require("./FileManager");
const logger_1 = require("./lib/logger");
const logger = logger_1.default.createModuleLogger(module);
class ServerKeyFileRepository {
    constructor(serverKeysDir, serverKeyFileName) {
        this.createKeys = (privateKeyPem, publicKeyPem) => __awaiter(this, void 0, void 0, function* () {
            logger.info({}, 'Creating Keys');
            const extIdx = this.serverKeyFileName.lastIndexOf('.');
            const pubPemFilename = `${this.serverKeyFileName.substring(0, extIdx)}.pub.pem`;
            this.fileManager.createFile(this.serverKeyFileName, privateKeyPem);
            this.fileManager.createFile(pubPemFilename, publicKeyPem);
            return { privateKeyPem, publicKeyPem };
        });
        this.getPrivateKey = () => __awaiter(this, void 0, void 0, function* () {
            logger.info({}, 'Getting Key');
            return this.fileManager.getFile(this.serverKeyFileName);
        });
        logger.info({ serverKeysDir, serverKeyFileName }, 'Create Manager');
        this.fileManager = new FileManager_1.default(serverKeysDir);
        this.serverKeyFileName = serverKeyFileName;
    }
}
exports.ServerKeyFileRepository = ServerKeyFileRepository;
//# sourceMappingURL=ServerKeyFileRepository.js.map