"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
/**
 * Default Export Parameters
 */
exports.default = {
    ACCESS_TOKEN_LIFETIME: 7776000,
    API_TIMEOUT: 30000,
    BUILD_DIRECTORY: path.join(__dirname, '../data/build'),
    CRYPTO_ALGORITHM: 'aes-128-cbc',
    DB_CONFIG: {
        PATH: path.join(__dirname, '../data/db'),
    },
    DEFAULT_ADMIN_PASSWORD: 'adminPassword',
    DEFAULT_ADMIN_USERNAME: '__admin__',
    DEVICE_DIRECTORY: path.join(__dirname, '../data/deviceKeys'),
    ENABLE_SYSTEM_FIRWMARE_AUTOUPDATES: true,
    EXPRESS_SERVER_CONFIG: {
        PORT: 8080,
        SSL_CERTIFICATE_FILEPATH: null,
        SSL_PRIVATE_KEY_FILEPATH: null,
        USE_SSL: false,
    },
    FIRMWARE_DIRECTORY: path.join(__dirname, '../data/knownApps'),
    FIRMWARE_REPOSITORY_DIRECTORY: path.join(__dirname, '../../spark-firmware'),
    LOGIN_ROUTE: '/oauth/token',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    SERVER_KEYS_DIRECTORY: path.join(__dirname, '../data'),
    SERVER_KEY_FILENAME: 'default_key.pem',
    SHOW_VERBOSE_DEVICE_LOGS: false,
    TCP_DEVICE_SERVER_CONFIG: {
        HOST: 'localhost',
        PORT: 5683,
    },
    USERS_DIRECTORY: path.join(__dirname, '../data/users'),
    WEBHOOKS_DIRECTORY: path.join(__dirname, '../data/webhooks'),
    // Override template parameters in webhooks with this object
    WEBHOOK_TEMPLATE_PARAMETERS: {},
};
//# sourceMappingURL=settings.js.map