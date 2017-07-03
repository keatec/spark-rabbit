import bunyan = require('bunyan');
import path = require ('path');

export default class Logger {
   public static createModuleLogger(applicationModule: any): bunyan {
    return bunyan.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      name: path.basename(applicationModule.filename),
      serializers: bunyan.stdSerializers,
    });
  }
}
