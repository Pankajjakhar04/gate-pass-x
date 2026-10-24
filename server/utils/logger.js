const winston = require('winston');

const isTest = process.env.NODE_ENV === 'test';

const logger = winston.createLogger({
  level: isTest ? 'silent' : (process.env.LOG_LEVEL || 'info'),
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ level, message, timestamp, stack }) => {
            return `[${timestamp}] ${level}: ${stack || message}`;
          })
        )
  ),
  transports: [
    new winston.transports.Console()
  ]
});

module.exports = logger;
