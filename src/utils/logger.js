/**
 * Logger - Sistema de Logs
 * Configuração do Pino para logging estruturado
 */

import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:dd/mm/yyyy HH:MM:ss',
      ignore: 'pid,hostname',
      singleLine: false
    }
  }
});

export default logger;
