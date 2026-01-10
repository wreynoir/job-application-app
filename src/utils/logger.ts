/**
 * Logging utility using Winston
 */

import winston from 'winston';
import { getConfig } from './config';
import path from 'path';
import fs from 'fs';

let loggerInstance: winston.Logger | null = null;

/**
 * Get logger instance (singleton)
 */
export function getLogger(): winston.Logger {
  if (!loggerInstance) {
    const config = getConfig();

    // Ensure logs directory exists
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ timestamp, level, message, stack }) => {
        if (stack) {
          return `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`;
        }
        return `${timestamp} [${level.toUpperCase()}]: ${message}`;
      })
    );

    loggerInstance = winston.createLogger({
      level: config.logging.level,
      format: logFormat,
      transports: [
        // Console transport
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ level, message }) => `${level}: ${message}`)
          ),
        }),
        // File transport for errors
        new winston.transports.File({
          filename: path.join(logsDir, 'error.log'),
          level: 'error',
        }),
        // File transport for all logs
        new winston.transports.File({
          filename: path.join(logsDir, 'combined.log'),
        }),
      ],
    });
  }

  return loggerInstance;
}

/**
 * Convenience functions
 */
export const logger = {
  debug: (message: string, meta?: any) => getLogger().debug(message, meta),
  info: (message: string, meta?: any) => getLogger().info(message, meta),
  warn: (message: string, meta?: any) => getLogger().warn(message, meta),
  error: (message: string, meta?: any) => getLogger().error(message, meta),
};
