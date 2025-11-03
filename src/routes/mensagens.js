/**
 * Rotas da API - Mensagens
 * Endpoints para envio de mensagens via dashboard
 */

import express from 'express';
import { enviarMensagem, enviarMensagemComImagem, estaConectado, obterInfoBot } from '../services/whatsapp.js';
import { 
  enviarConfirmacaoAgendamento,
  enviarLembreteAgendamento,
  enviarNotificacaoCancelamento
} from '../services/notificacoes.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/mensagens/status
 * Verifica status da conexão do bot
 */
router.get('/status', (req, res) => {
  const conectado = estaConectado();
  const info = obterInfoBot();

  res.json({
    conectado,
    bot: info,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/mensagens/enviar
 * Envia mensagem customizada para um número
 * Body: { numero, mensagem }
 */
router.post('/enviar', async (req, res) => {
  try {
    const { numero, mensagem } = req.body;

    if (!numero || !mensagem) {
      return res.status(400).json({ 
        erro: 'Número e mensagem são obrigatórios' 
      });
    }

    if (!estaConectado()) {
      return res.status(503).json({ 
        erro: 'Bot não está conectado ao WhatsApp' 
      });
    }

    logger.info('📤 Enviando mensagem via API:', { numero });

    const resultado = await enviarMensagem(numero, mensagem);

    if (resultado.sucesso) {
      res.json({
        sucesso: true,
        mensagem: 'Mensagem enviada com sucesso',
        dados: resultado
      });
    } else {
      res.status(500).json({
        sucesso: false,
        erro: resultado.erro
      });
    }
  } catch (error) {
    logger.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ 
      erro: 'Erro ao enviar mensagem',
      detalhes: error.message 
    });
  }
});

/**
 * POST /api/mensagens/enviar-imagem
 * Envia mensagem com imagem
 * Body: { numero, imagemUrl, caption }
 */
router.post('/enviar-imagem', async (req, res) => {
  try {
    const { numero, imagemUrl, caption } = req.body;

    if (!numero || !imagemUrl) {
      return res.status(400).json({ 
        erro: 'Número e URL da imagem são obrigatórios' 
      });
    }

    if (!estaConectado()) {
      return res.status(503).json({ 
        erro: 'Bot não está conectado ao WhatsApp' 
      });
    }

    const resultado = await enviarMensagemComImagem(numero, imagemUrl, caption);

    if (resultado.sucesso) {
      res.json({
        sucesso: true,
        mensagem: 'Mensagem com imagem enviada',
        dados: resultado
      });
    } else {
      res.status(500).json({
        sucesso: false,
        erro: resultado.erro
      });
    }
  } catch (error) {
    logger.error('Erro ao enviar imagem:', error);
    res.status(500).json({ 
      erro: 'Erro ao enviar imagem',
      detalhes: error.message 
    });
  }
});

/**
 * POST /api/mensagens/confirmacao-agendamento
 * Envia confirmação de agendamento
 * Body: { agendamentoId }
 */
router.post('/confirmacao-agendamento', async (req, res) => {
  try {
    const { agendamentoId } = req.body;

    if (!agendamentoId) {
      return res.status(400).json({ 
        erro: 'ID do agendamento é obrigatório' 
      });
    }

    const resultado = await enviarConfirmacaoAgendamento(agendamentoId);

    if (resultado.sucesso) {
      res.json({
        sucesso: true,
        mensagem: 'Confirmação enviada com sucesso'
      });
    } else {
      res.status(500).json({
        sucesso: false,
        erro: resultado.erro
      });
    }
  } catch (error) {
    logger.error('Erro ao enviar confirmação:', error);
    res.status(500).json({ 
      erro: 'Erro ao enviar confirmação',
      detalhes: error.message 
    });
  }
});

/**
 * POST /api/mensagens/lembrete-agendamento
 * Envia lembrete de agendamento
 * Body: { agendamentoId }
 */
router.post('/lembrete-agendamento', async (req, res) => {
  try {
    const { agendamentoId } = req.body;

    if (!agendamentoId) {
      return res.status(400).json({ 
        erro: 'ID do agendamento é obrigatório' 
      });
    }

    const resultado = await enviarLembreteAgendamento(agendamentoId);

    if (resultado.sucesso) {
      res.json({
        sucesso: true,
        mensagem: 'Lembrete enviado com sucesso'
      });
    } else {
      res.status(500).json({
        sucesso: false,
        erro: resultado.erro
      });
    }
  } catch (error) {
    logger.error('Erro ao enviar lembrete:', error);
    res.status(500).json({ 
      erro: 'Erro ao enviar lembrete',
      detalhes: error.message 
    });
  }
});

/**
 * POST /api/mensagens/cancelamento
 * Envia notificação de cancelamento
 * Body: { agendamentoId }
 */
router.post('/cancelamento', async (req, res) => {
  try {
    const { agendamentoId } = req.body;

    if (!agendamentoId) {
      return res.status(400).json({ 
        erro: 'ID do agendamento é obrigatório' 
      });
    }

    const resultado = await enviarNotificacaoCancelamento(agendamentoId);

    if (resultado.sucesso) {
      res.json({
        sucesso: true,
        mensagem: 'Notificação de cancelamento enviada'
      });
    } else {
      res.status(500).json({
        sucesso: false,
        erro: resultado.erro
      });
    }
  } catch (error) {
    logger.error('Erro ao enviar cancelamento:', error);
    res.status(500).json({ 
      erro: 'Erro ao enviar cancelamento',
      detalhes: error.message 
    });
  }
});

export default router;
