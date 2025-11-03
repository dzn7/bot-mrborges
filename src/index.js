/**
 * Servidor Principal - WhatsApp Bot Mr.Borges
 * Sistema automatizado de notificações via WhatsApp
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { iniciarWhatsApp, registrarCallbackQR } from './services/whatsapp.js';
import { iniciarCronLembretes } from './services/lembretes.js';
import { iniciarRealtimeListeners } from './services/realtime.js';
import { iniciarPolling } from './services/polling.js';
import { initStorage, downloadAuthInfo, startAuthSync } from './services/storage-adapter.js';
import mensagensRoutes from './routes/mensagens.js';
import qrcodeRoutes, { setQRCode } from './routes/qrcode.js';
import testeRoutes from './routes/teste.js';
import logger from './utils/logger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas
app.use('/api/mensagens', mensagensRoutes);
app.use('/api/qrcode', qrcodeRoutes);
app.use('/api/teste', testeRoutes);

// Rota de saúde
app.get('/health', (req, res) => {
  res.json({ 
    status: 'online', 
    servico: 'Barbearia WhatsApp Bot',
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Servidor rodando na porta ${PORT}`);
  logger.info(`📱 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  logger.info('✅ Servidor HTTP pronto para receber requisições');
  
  // Inicializar serviços de forma assíncrona (não bloqueia o servidor)
  (async () => {
    try {
      // Registrar callback do QR Code
      registrarCallbackQR(setQRCode);
      
      // Inicializar WhatsApp (não bloqueia o servidor)
      logger.info('📲 Iniciando conexão com WhatsApp...');
      iniciarWhatsApp().catch(error => {
        logger.error('❌ Erro ao inicializar WhatsApp:', error);
        // Não mata o servidor, apenas loga o erro
      });
      
      // Iniciar sistema de lembretes automáticos
      logger.info('⏰ Iniciando sistema de lembretes...');
      iniciarCronLembretes();
      
      // Usar Polling em produção (Fly.io) e Realtime em desenvolvimento
      if (process.env.NODE_ENV === 'production') {
        logger.info('📡 Iniciando Polling (Produção)...');
        iniciarPolling();
      } else {
        logger.info('📡 Iniciando Supabase Realtime (Desenvolvimento)...');
        iniciarRealtimeListeners();
      }
      
      logger.info('✅ Sistema inicializado com sucesso!');
      logger.info('');
      logger.info('🤖 Bot pronto! Aguardando eventos...');
      logger.info('   ✉️  Novos agendamentos → Confirmação automática');
      logger.info('   ❌ Cancelamentos → Notificação automática');
      logger.info('   ⏰ Lembretes → 1 hora antes (verificação a cada 30min)');
    } catch (error) {
      logger.error('❌ Erro ao inicializar sistema:', error);
      // Não mata o servidor, apenas loga o erro
    }
  })();
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (error) => {
  logger.error('Erro não tratado:', error);
});

process.on('SIGINT', () => {
  logger.info('🛑 Encerrando servidor...');
  process.exit(0);
});
