/**
 * Serviço WhatsApp - Baileys 7.x
 * Implementação robusta baseada nas melhores práticas oficiais
 * https://baileys.wiki/docs/intro/
 */

import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import { existsSync } from 'fs';
import { rm } from 'fs/promises';
import logger from '../utils/logger.js';
import P from 'pino';

let sock = null;
let qrCodeAtual = null;
let statusConexao = 'disconnected';

const AUTH_DIR = './auth_info';

/**
 * Limpa credenciais
 */
async function limparCredenciais() {
  try {
    if (existsSync(AUTH_DIR)) {
      logger.warn('🗑️ Removendo auth_info...');
      await rm(AUTH_DIR, { recursive: true, force: true });
      logger.info('✅ Auth removido.');
      return true;
    }
  } catch (error) {
    logger.error('❌ Erro ao limpar:', error);
  }
  return false;
}

/**
 * Inicializa a conexão com WhatsApp
 */
export async function iniciarWhatsApp() {
  try {
    // Se forçado a gerar novo QR, limpar credenciais primeiro
    if (forcarNovoQR) {
      logger.info('🔄 Forçando geração de novo QR Code...');
      await limparCredenciais();
      forcarNovoQR = false;
      tentativasReconexao = 0;
    }

    // Carregar autenticação salva
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();
    
    // Verificar integridade das credenciais
    const temCredenciaisValidas = credenciaisEstaoCorretas(state);
    
    if (temCredenciaisValidas) {
      logger.info('📱 Credenciais encontradas, tentando reconectar...');
    } else {
      logger.info('🆕 Nenhuma credencial válida encontrada, gerando QR Code...');
      // Se tinha credenciais mas estão inválidas, limpar
      if (existsSync(AUTH_DIR)) {
        await limparCredenciais();
      }
    }
    
    // Criar socket com configurações robustas
    sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: logger.child({ module: 'baileys', level: 'info' }),
      browser: ['Barbearia BR99', 'Chrome', '1.0.0'],
      markOnlineOnConnect: false,
      generateHighQualityLinkPreview: true,
      // Configurações de conexão mais robustas
      connectTimeoutMs: 60000, // 60 segundos timeout
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 30000, // Keep alive a cada 30s
      retryRequestDelayMs: 250,
      maxMsgRetryCount: 5,
      // Configurações de sincronização
      syncFullHistory: false,
      getMessage: async () => undefined
    });

    // Evento: Atualização de credenciais
    sock.ev.on('creds.update', saveCreds);

    // Evento: Atualização de conexão
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // Mostrar QR Code no terminal
      if (qr) {
        console.log('\n\n');
        console.log('═══════════════════════════════════════════════════════');
        console.log('📱 QR CODE GERADO! ESCANEIE COM SEU WHATSAPP:');
        console.log('═══════════════════════════════════════════════════════');
        console.log('\n');
        qrcode.generate(qr, { small: true });
        console.log('\n');
        console.log('═══════════════════════════════════════════════════════');
        console.log('Como escanear:');
        console.log('1. Abra o WhatsApp no celular');
        console.log('2. Vá em Configurações → Aparelhos conectados');
        console.log('3. Toque em "Conectar um aparelho"');
        console.log('4. Escaneie o QR Code acima');
        console.log('═══════════════════════════════════════════════════════');
        console.log('\n\n');
        logger.info('📱 QR Code exibido no console');
        
        // Resetar contador ao gerar QR
        tentativasReconexao = 0;
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const errorMessage = lastDisconnect?.error?.message;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        logger.warn('❌ Conexão fechada.', {
          statusCode,
          reconectar: shouldReconnect,
          motivo: errorMessage,
          tentativa: tentativasReconexao + 1
        });

        // Detectar erros críticos que indicam credenciais corrompidas
        // NOTA: "Stream Errored" (código 515) é normal após pareamento, não limpar credenciais
        const errosCriticos = [
          'Connection Failure',
          'Connection Terminated',
          'Timed Out'
        ];
        
        const ehErroCritico = errosCriticos.some(erro => 
          errorMessage?.includes(erro)
        );
        
        // Stream Errored (515) é normal após pareamento, apenas reconectar
        const ehStreamError = errorMessage?.includes('Stream Errored');

        // Se foi deslogado, limpar e gerar novo QR
        if (statusCode === DisconnectReason.loggedOut) {
          logger.error('🚫 Dispositivo desconectado do WhatsApp.');
          logger.info('🗑️ Limpando credenciais antigas...');
          await limparCredenciais();
          tentativasReconexao = 0;
          
          const delay = 3000;
          logger.info(`🔄 Gerando novo QR Code em ${delay/1000}s...`);
          setTimeout(() => iniciarWhatsApp(), delay);
        }
        // Stream Error: apenas reconectar sem limpar (normal após pareamento)
        else if (ehStreamError) {
          logger.info('⚠️ Stream Error detectado (normal após pareamento). Reconectando...');
          tentativasReconexao = 0; // Resetar contador para Stream Error
          const delay = 3000;
          setTimeout(() => iniciarWhatsApp(), delay);
        }
        // Se é erro crítico e já tentou várias vezes, limpar credenciais
        else if (ehErroCritico && tentativasReconexao >= MAX_TENTATIVAS) {
          logger.error(`❌ Falha crítica após ${MAX_TENTATIVAS} tentativas.`);
          logger.warn('🗑️ Credenciais podem estar corrompidas. Limpando...');
          await limparCredenciais();
          tentativasReconexao = 0;
          
          const delay = 5000;
          logger.info(`🔄 Gerando novo QR Code em ${delay/1000}s...`);
          setTimeout(() => iniciarWhatsApp(), delay);
        }
        // Outros erros: tentar reconectar com backoff
        else if (shouldReconnect) {
          tentativasReconexao++;
          const delay = calcularTempoEspera();
          
          logger.info(`🔄 Tentativa ${tentativasReconexao}/${MAX_TENTATIVAS} - Reconectando em ${delay/1000}s...`);
          
          setTimeout(() => iniciarWhatsApp(), delay);
        }
      } else if (connection === 'open') {
        logger.info('✅ Conectado ao WhatsApp com sucesso!');
        // Resetar contadores ao conectar com sucesso
        tentativasReconexao = 0;
        ultimaFalha = null;
      } else if (connection === 'connecting') {
        logger.info('🔌 Conectando ao WhatsApp...');
      }
    });

    // Evento: Mensagens recebidas (para futura interação)
    sock.ev.on('messages.upsert', async ({ messages }) => {
      const msg = messages[0];
      
      if (!msg.key.fromMe && msg.message) {
        logger.info('📨 Mensagem recebida:', {
          de: msg.key.remoteJid,
          texto: msg.message.conversation || 'Mídia'
        });
        
        // Aqui você pode adicionar lógica para responder mensagens
        // Por exemplo: comandos, respostas automáticas, etc.
      }
    });

    return sock;
  } catch (error) {
    logger.error('❌ Erro ao inicializar WhatsApp:', error);
    
    // Se erro na inicialização, pode ser credenciais corrompidas
    tentativasReconexao++;
    
    if (tentativasReconexao >= MAX_TENTATIVAS) {
      logger.error('❌ Múltiplas falhas na inicialização. Limpando credenciais...');
      await limparCredenciais();
      tentativasReconexao = 0;
    }
    
    const delay = calcularTempoEspera();
    logger.info(`🔄 Tentando novamente em ${delay/1000}s...`);
    setTimeout(() => iniciarWhatsApp(), delay);
  }
}

/**
 * Força regeneração do QR Code
 */
export async function forcarNovoQRCode() {
  logger.info('🔄 Forçando regeneração de QR Code...');
  forcarNovoQR = true;
  tentativasReconexao = 0;
  
  // Fechar conexão atual se existir
  if (sock) {
    try {
      await sock.logout();
    } catch (error) {
      // Ignorar erros ao fazer logout
    }
    sock = null;
  }
  
  // Reiniciar
  await iniciarWhatsApp();
}

/**
 * Envia uma mensagem de texto para um número
 * @param {string} numero - Número no formato 5586999999999
 * @param {string} mensagem - Texto da mensagem
 */
export async function enviarMensagem(numero, mensagem) {
  try {
    if (!sock) {
      throw new Error('WhatsApp não conectado');
    }

    // Limpar e formatar número
    let numeroLimpo = numero.replace(/\D/g, '');
    
    console.log('\n🔍 ===== DEBUG TELEFONE =====');
    console.log('📥 Original:', numero);
    console.log('🧹 Após limpar:', numeroLimpo);
    console.log('📏 Tamanho:', numeroLimpo.length);
    
    // Adicionar 55 se não tiver
    if (!numeroLimpo.startsWith('55')) {
      numeroLimpo = '55' + numeroLimpo;
      console.log('➕ Adicionado código 55:', numeroLimpo);
    }
    
    console.log('📏 Tamanho após adicionar 55:', numeroLimpo.length);
    
    // ⚠️ CORREÇÃO: Se tiver 14 dígitos, significa que tem 99 no início do DDD
    // Exemplo: 558699**8112**5646 (ERRADO - 14 dígitos)
    // Correto: 55869**8112**5646 (CERTO - 13 dígitos)
    // Remover o primeiro 9 após o DDD (posição 4)
    if (numeroLimpo.length === 14 && numeroLimpo.substring(4, 5) === '9') {
      const antes = numeroLimpo;
      numeroLimpo = numeroLimpo.substring(0, 4) + numeroLimpo.substring(5);
      console.log('🔧 CORRIGIDO - Removido 9 extra:');
      console.log('   Antes:  ', antes, '(14 dígitos)');
      console.log('   Depois: ', numeroLimpo, '(13 dígitos)');
      console.log('   ✅ Número corrigido!');
    }
    
    console.log('✅ Número final:', numeroLimpo);
    console.log('📏 Tamanho final:', numeroLimpo.length, 'dígitos');
    
    // Formatar número para padrão WhatsApp
    const numeroFormatado = numeroLimpo.includes('@s.whatsapp.net') 
      ? numeroLimpo 
      : `${numeroLimpo}@s.whatsapp.net`;

    console.log('📱 ENVIANDO PARA:', numeroFormatado);
    console.log('===========================\n');

    // ✅ VERIFICAR SE O NÚMERO EXISTE NO WHATSAPP
    try {
      console.log('🔍 Verificando se número existe no WhatsApp...');
      const [result] = await sock.onWhatsApp(numeroLimpo);
      
      if (!result || !result.exists) {
        console.log('❌ NÚMERO NÃO EXISTE NO WHATSAPP:', numeroLimpo);
        throw new Error(`Número ${numeroLimpo} não está registrado no WhatsApp`);
      }
      
      console.log('✅ Número verificado:', result.jid);
      console.log('   Existe:', result.exists);
      
      // Usar o JID retornado pela verificação (mais confiável)
      const jidVerificado = result.jid;
      
      // Enviar mensagem
      await sock.sendMessage(jidVerificado, { text: mensagem });
      
      console.log('✅ Mensagem enviada para:', jidVerificado);
    } catch (error) {
      console.log('❌ ERRO:', error.message);
      throw error;
    }
    
    logger.info('✅ Mensagem enviada:', {
      para: numeroFormatado,
      tamanho: mensagem.length
    });

    return { sucesso: true, mensagem: 'Mensagem enviada com sucesso' };
  } catch (error) {
    logger.error('❌ Erro ao enviar mensagem:', error);
    return { sucesso: false, erro: error.message };
  }
}

/**
 * Envia mensagem com imagem
 * @param {string} numero - Número no formato 5586999999999
 * @param {string} imagemUrl - URL da imagem
 * @param {string} caption - Legenda da imagem
 */
export async function enviarMensagemComImagem(numero, imagemUrl, caption) {
  try {
    if (!sock) {
      throw new Error('WhatsApp não conectado');
    }

    // Limpar e formatar número
    let numeroLimpo = numero.replace(/\D/g, '');
    
    // Adicionar 55 se não tiver
    if (!numeroLimpo.startsWith('55')) {
      numeroLimpo = '55' + numeroLimpo;
    }
    
    // Corrigir: Se tiver 14 dígitos, remover o primeiro 9
    if (numeroLimpo.length === 14 && numeroLimpo.substring(4, 5) === '9') {
      numeroLimpo = numeroLimpo.substring(0, 4) + numeroLimpo.substring(5);
    }

    const numeroFormatado = numeroLimpo.includes('@s.whatsapp.net') 
      ? numeroLimpo 
      : `${numeroLimpo}@s.whatsapp.net`;

    await sock.sendMessage(numeroFormatado, {
      image: { url: imagemUrl },
      caption: caption
    });

    logger.info('✅ Mensagem com imagem enviada:', { para: numeroFormatado });
    return { sucesso: true, mensagem: 'Mensagem enviada com sucesso' };
  } catch (error) {
    logger.error('❌ Erro ao enviar mensagem com imagem:', error);
    return { sucesso: false, erro: error.message };
  }
}

/**
 * Verifica se o bot está conectado
 */
export function estaConectado() {
  return sock !== null && sock.user;
}

/**
 * Retorna informações do bot
 */
export function obterInfoBot() {
  if (!sock || !sock.user) {
    return null;
  }

  return {
    numero: sock.user.id.split(':')[0],
    nome: sock.user.name,
    conectado: true
  };
}

export default {
  iniciarWhatsApp,
  enviarMensagem,
  enviarMensagemComImagem,
  estaConectado,
  obterInfoBot,
  forcarNovoQRCode
};
