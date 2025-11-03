/**
 * WhatsApp Service - Baileys 7.x
 * Implementação sólida baseada em https://baileys.wiki/
 */

import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import { existsSync, rmSync } from 'fs';
import logger from '../utils/logger.js';

let sock = null;
let qrCodeAtual = null;
let statusConexao = 'disconnected';
let setQRCodeCallback = null;
let conectando = false;

const AUTH_DIR = './auth_info';

// Função para registrar callback do QR Code
export function registrarCallbackQR(callback) {
  setQRCodeCallback = callback;
}

/**
 * Limpa auth_info
 */
function limparAuth() {
  try {
    if (existsSync(AUTH_DIR)) {
      rmSync(AUTH_DIR, { recursive: true, force: true });
      logger.info('✅ Auth limpo com sucesso');
    } else {
      logger.info('ℹ️ Auth_info não existe');
    }
  } catch (error) {
    logger.error('❌ Erro ao limpar auth:', error.message);
    // Tentar novamente com delay
    setTimeout(() => {
      try {
        if (existsSync(AUTH_DIR)) {
          rmSync(AUTH_DIR, { recursive: true, force: true });
          logger.info('✅ Auth limpo na segunda tentativa');
        }
      } catch (err) {
        logger.error('❌ Falha na segunda tentativa:', err.message);
      }
    }, 1000);
  }
}

/**
 * Conecta ao WhatsApp
 */
export async function iniciarWhatsApp() {
  // Evitar múltiplas tentativas simultâneas
  if (conectando) {
    logger.warn('⚠️ Já existe uma tentativa de conexão em andamento');
    return;
  }
  
  conectando = true;
  
  try {
    logger.info('🚀 Iniciando WhatsApp...');
    
    // Carregar ou criar auth state
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();
    
    logger.info(`📱 Baileys v${version.join('.')}`);
    
    // Criar socket - configuração minimalista e sólida
    sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
      },
      printQRInTerminal: false,
      browser: Browsers.ubuntu('Mr.Borges'),
      markOnlineOnConnect: false,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      getMessage: async () => undefined,
      // Timeouts otimizados
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 10000,
      emitOwnEvents: false,
      fireInitQueries: true,
      // Logger silencioso
      logger: logger.child({ module: 'baileys', level: 'silent' })
    });

    // Salvar credenciais
    sock.ev.on('creds.update', saveCreds);

    // Gerenciar conexão
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // QR Code
      if (qr) {
        qrCodeAtual = qr;
        console.log('\n═══════════════════════════════════════════');
        console.log('📱 ESCANEIE O QR CODE:');
        console.log('═══════════════════════════════════════════\n');
        qrcode.generate(qr, { small: true });
        console.log('\n═══════════════════════════════════════════\n');
        logger.info('✅ QR Code gerado');
        
        // Notificar callback se registrado
        if (setQRCodeCallback) {
          setQRCodeCallback(qr);
        }
      }

      // Conectado
      if (connection === 'open') {
        conectando = false;
        statusConexao = 'connected';
        logger.info('✅ WhatsApp conectado!');
        const me = sock.user?.id || 'desconhecido';
        logger.info(`📱 Número: ${me}`);
      }

      // Desconectado
      if (connection === 'close') {
        conectando = false; // Resetar flag para permitir reconexão
        statusConexao = 'disconnected';
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const reason = lastDisconnect?.error?.message || 'Desconhecido';
        
        logger.warn(`❌ Desconectado: ${reason} (código: ${statusCode})`);

        // Logout - limpar e gerar novo QR
        if (statusCode === DisconnectReason.loggedOut) {
          logger.info('🔄 Logout detectado, limpando auth...');
          limparAuth();
          logger.info('⏰ Reconectando em 2s...');
          setTimeout(() => {
            logger.info('▶️ Iniciando reconexão após logout...');
            iniciarWhatsApp();
          }, 2000);
        }
        // Stream Error 515 ou restartRequired - reconectar SEM limpar (é normal após pareamento)
        else if (statusCode === DisconnectReason.restartRequired || reason.includes('Stream Errored')) {
          logger.info('🔄 Restart necessário (normal após pareamento)');
          logger.info('⏰ Reconectando em 1s...');
          setTimeout(() => {
            logger.info('▶️ Iniciando reconexão após pareamento...');
            iniciarWhatsApp();
          }, 1000);
        }
        // Outros erros - reconectar
        else {
          logger.info('🔄 Erro desconhecido, reconectando em 3s...');
          setTimeout(() => {
            logger.info('▶️ Iniciando reconexão...');
            iniciarWhatsApp();
          }, 3000);
        }
      }

      // Conectando
      if (connection === 'connecting') {
        statusConexao = 'connecting';
        logger.info('🔌 Conectando...');
      }
    });

    // Mensagens recebidas
    sock.ev.on('messages.upsert', async ({ messages }) => {
      const msg = messages[0];
      if (!msg.key.fromMe && msg.message) {
        logger.info('📨 Mensagem recebida', {
          de: msg.key.remoteJid,
          texto: msg.message.conversation || '[mídia]'
        });
      }
    });

    return sock;
  } catch (error) {
    conectando = false; // Resetar flag em caso de erro
    logger.error('❌ Erro fatal:', error.message);
    // Tentar novamente em 5s
    logger.info('⏰ Tentando novamente em 5s...');
    setTimeout(() => {
      logger.info('▶️ Iniciando nova tentativa...');
      iniciarWhatsApp();
    }, 5000);
  }
}

/**
 * Envia mensagem de texto
 */
export async function enviarMensagem(numero, mensagem) {
  try {
    if (!sock || statusConexao !== 'connected') {
      throw new Error('WhatsApp não conectado');
    }

    // Log do número recebido
    logger.info('📞 Número recebido:', numero);
    
    // Limpar número - apenas dígitos
    let numeroLimpo = numero.replace(/\D/g, '');
    logger.info('🧹 Número limpo:', numeroLimpo);
    
    // Garantir que tem código do país (55 para Brasil)
    if (!numeroLimpo.startsWith('55')) {
      numeroLimpo = '55' + numeroLimpo;
    }
    
    // Formato correto para Baileys: numero@s.whatsapp.net
    const jid = `${numeroLimpo}@s.whatsapp.net`;
    logger.info('📱 JID final:', jid);
    
    await sock.sendMessage(jid, { text: mensagem });
    
    logger.info('✅ Mensagem enviada com sucesso');
    return { sucesso: true };
  } catch (error) {
    logger.error('❌ Erro ao enviar:', error.message);
    return { sucesso: false, erro: error.message };
  }
}

/**
 * Envia mensagem com imagem
 */
export async function enviarMensagemComImagem(numero, mensagem, imagemUrl) {
  try {
    if (!sock || statusConexao !== 'connected') {
      throw new Error('WhatsApp não conectado');
    }

    // Limpar número - apenas dígitos
    let numeroLimpo = numero.replace(/\D/g, '');
    
    // Garantir que tem código do país (55 para Brasil)
    if (!numeroLimpo.startsWith('55')) {
      numeroLimpo = '55' + numeroLimpo;
    }
    
    const jid = `${numeroLimpo}@s.whatsapp.net`;
    
    await sock.sendMessage(jid, {
      image: { url: imagemUrl },
      caption: mensagem
    });
    
    logger.info('✅ Imagem enviada', { para: numeroLimpo });
    return { sucesso: true };
  } catch (error) {
    logger.error('❌ Erro ao enviar imagem:', error.message);
    return { sucesso: false, erro: error.message };
  }
}

/**
 * Verifica se está conectado
 */
export function estaConectado() {
  return sock && statusConexao === 'connected';
}

/**
 * Retorna info do bot
 */
export function obterInfoBot() {
  return {
    conectado: estaConectado(),
    status: statusConexao,
    numero: sock?.user?.id || null,
    qrCode: qrCodeAtual
  };
}

/**
 * Força novo QR Code
 */
export async function forcarNovoQRCode() {
  logger.info('🔄 Forçando novo QR...');
  
  if (sock) {
    try {
      await sock.logout();
    } catch (e) {
      // Ignorar erro
    }
    sock = null;
  }
  
  await limparAuth();
  setTimeout(() => iniciarWhatsApp(), 1000);
}

export default {
  iniciarWhatsApp,
  enviarMensagem,
  enviarMensagemComImagem,
  estaConectado,
  obterInfoBot,
  forcarNovoQRCode
};
