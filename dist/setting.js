"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
/* eslint-disable sorting/sort-object-props */
exports.default = {
    BUILD_DIRECTORY: path.join(__dirname, '../data/build'),
    DEFAULT_ADMIN_PASSWORD: 'adminPassword',
    DEFAULT_ADMIN_USERNAME: '__admin__',
    DEVICE_DIRECTORY: path.join(__dirname, '../data/deviceKeys'),
    ENABLE_SYSTEM_FIRWMARE_AUTOUPDATES: true,
    FIRMWARE_DIRECTORY: path.join(__dirname, '../data/knownApps'),
    FIRMWARE_REPOSITORY_DIRECTORY: path.join(__dirname, '../../spark-firmware'),
    SERVER_KEYS_DIRECTORY: path.join(__dirname, '../data'),
    SERVER_KEY_FILENAME: 'default_key.pem',
    USERS_DIRECTORY: path.join(__dirname, '../data/users'),
    WEBHOOKS_DIRECTORY: path.join(__dirname, '../data/webhooks'),
    ACCESS_TOKEN_LIFETIME: 7776000,
    API_TIMEOUT: 30000,
    CRYPTO_ALGORITHM: 'aes-128-cbc',
    LOG_LEVEL: (process.env.LOG_LEVEL), any: 
} || 'info';
LOGIN_ROUTE: '/oauth/token',
    EXPRESS_SERVER_CONFIG;
{
    PORT: 8080,
        SSL_CERTIFICATE_FILEPATH;
    null,
        SSL_PRIVATE_KEY_FILEPATH;
    null,
        USE_SSL;
    false,
    ;
}
DB_CONFIG: {
    PATH: path.join(__dirname, '../data/db'),
    ;
}
SHOW_VERBOSE_DEVICE_LOGS: false,
    TCP_DEVICE_SERVER_CONFIG;
{
    HOST: 'localhost',
        PORT;
    5683,
    ;
}
// Override template parameters in webhooks with this object
WEBHOOK_TEMPLATE_PARAMETERS: {
    // SOME_AUTH_TOKEN: '12312312',
}
;
//# sourceMappingURL=setting.js.map