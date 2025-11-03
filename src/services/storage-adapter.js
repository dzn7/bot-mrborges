/**
 * Storage Adapter para Cloud Storage
 * Permite persistir auth_info no Google Cloud Storage
 */

import { Storage } from '@google-cloud/storage';
import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger.js';

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'barbearia-bot-auth';
const AUTH_DIR = './auth_info';

let storage = null;
let bucket = null;

/**
 * Inicializa o cliente do Cloud Storage
 */
export function initStorage() {
  if (process.env.NODE_ENV === 'production' && process.env.GCS_BUCKET_NAME) {
    storage = new Storage();
    bucket = storage.bucket(BUCKET_NAME);
    logger.info(`📦 Cloud Storage inicializado: ${BUCKET_NAME}`);
  } else {
    logger.info('📁 Usando armazenamento local (desenvolvimento)');
  }
}

/**
 * Sincroniza auth_info do Cloud Storage para local
 */
export async function downloadAuthInfo() {
  if (!bucket) return;

  try {
    logger.info('⬇️ Baixando auth_info do Cloud Storage...');
    
    // Criar diretório local se não existir
    await fs.mkdir(AUTH_DIR, { recursive: true });
    
    // Listar todos os arquivos no bucket
    const [files] = await bucket.getFiles({ prefix: 'auth_info/' });
    
    if (files.length === 0) {
      logger.info('📭 Nenhum arquivo de autenticação encontrado no Cloud Storage');
      return;
    }
    
    // Baixar cada arquivo
    for (const file of files) {
      const fileName = file.name.replace('auth_info/', '');
      if (!fileName) continue;
      
      const localPath = path.join(AUTH_DIR, fileName);
      await file.download({ destination: localPath });
      logger.info(`✅ Baixado: ${fileName}`);
    }
    
    logger.info('✅ Auth info sincronizado com sucesso');
  } catch (error) {
    logger.error('❌ Erro ao baixar auth_info:', error);
  }
}

/**
 * Faz upload do auth_info local para Cloud Storage
 */
export async function uploadAuthInfo() {
  if (!bucket) return;

  try {
    logger.info('⬆️ Fazendo upload de auth_info para Cloud Storage...');
    
    // Verificar se diretório existe
    try {
      await fs.access(AUTH_DIR);
    } catch {
      logger.warn('⚠️ Diretório auth_info não existe');
      return;
    }
    
    // Listar arquivos locais
    const files = await fs.readdir(AUTH_DIR);
    
    if (files.length === 0) {
      logger.info('📭 Nenhum arquivo para fazer upload');
      return;
    }
    
    // Upload de cada arquivo
    for (const file of files) {
      const localPath = path.join(AUTH_DIR, file);
      const remotePath = `auth_info/${file}`;
      
      await bucket.upload(localPath, {
        destination: remotePath,
        metadata: {
          cacheControl: 'no-cache',
        },
      });
      
      logger.info(`✅ Upload: ${file}`);
    }
    
    logger.info('✅ Auth info sincronizado com Cloud Storage');
  } catch (error) {
    logger.error('❌ Erro ao fazer upload de auth_info:', error);
  }
}

/**
 * Sincroniza periodicamente (a cada 5 minutos)
 */
export function startAuthSync() {
  if (!bucket) return;
  
  // Upload inicial
  uploadAuthInfo();
  
  // Sincronizar a cada 5 minutos
  setInterval(() => {
    uploadAuthInfo();
  }, 5 * 60 * 1000);
  
  logger.info('🔄 Sincronização automática de auth_info ativada');
}

export default {
  initStorage,
  downloadAuthInfo,
  uploadAuthInfo,
  startAuthSync
};
