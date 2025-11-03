/**
 * Serviço de Polling - Alternativa ao Realtime
 * Verifica novos agendamentos periodicamente
 */

import { supabase } from '../config/database.js';
import { enviarConfirmacaoAgendamento, enviarNotificacaoCancelamento } from './notificacoes.js';
import logger from '../utils/logger.js';

let ultimaVerificacao = new Date();
let intervalId = null;

/**
 * Verifica novos agendamentos desde a última verificação
 */
async function verificarNovosAgendamentos() {
  try {
    // Buscar agendamentos criados após a última verificação
    // Nota: A tabela usa 'criado_em' ao invés de 'created_at'
    const { data: novosAgendamentos, error } = await supabase
      .from('agendamentos')
      .select('*')
      .gte('criado_em', ultimaVerificacao.toISOString())
      .order('criado_em', { ascending: true });

    if (error) {
      // Silenciar erros de rede para não poluir logs
      if (error.message?.includes('fetch failed') || error.message?.includes('network')) {
        // Erro de rede - apenas log debug
        return;
      }
      logger.error('❌ Erro ao buscar novos agendamentos:', error.message);
      return;
    }

    if (novosAgendamentos && novosAgendamentos.length > 0) {
      logger.info(`🆕 ${novosAgendamentos.length} novo(s) agendamento(s) detectado(s)!`);

      for (const agendamento of novosAgendamentos) {
        logger.info('');
        logger.info('🆕🆕🆕 NOVO AGENDAMENTO DETECTADO! 🆕🆕🆕');
        logger.info('ID:', agendamento.id);
        logger.info('Status:', agendamento.status);
        logger.info('Cliente ID:', agendamento.cliente_id);
        logger.info('Data/Hora:', agendamento.data_hora);
        logger.info('');

        // Aguardar 2 segundos para garantir que dados relacionados foram salvos
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Enviar confirmação automaticamente
        try {
          logger.info('📤 Iniciando envio de confirmação...');
          await enviarConfirmacaoAgendamento(agendamento.id);
          logger.info('✅ Confirmação enviada automaticamente!');
          logger.info('');
        } catch (error) {
          logger.error('❌ Erro ao enviar confirmação automática:', error);
          logger.error('');
        }
      }
    }

    // Atualizar timestamp da última verificação
    ultimaVerificacao = new Date();
  } catch (error) {
    logger.error('❌ Erro no polling de agendamentos:', error.message || error);
    logger.error('Stack:', error.stack);
  }
}

/**
 * Verifica agendamentos cancelados
 */
async function verificarCancelamentos() {
  try {
    // Buscar agendamentos atualizados recentemente com status cancelado
    const dataLimite = new Date(Date.now() - 60000); // Últimos 60 segundos
    
    // Nota: A tabela usa 'atualizado_em' ao invés de 'updated_at'
    const { data: cancelados, error } = await supabase
      .from('agendamentos')
      .select('*')
      .eq('status', 'cancelado')
      .gte('atualizado_em', dataLimite.toISOString());

    if (error) {
      // Silenciar erros de rede para não poluir logs
      if (error.message?.includes('fetch failed') || error.message?.includes('network')) {
        return;
      }
      logger.error('❌ Erro ao buscar cancelamentos:', error.message);
      return;
    }

    if (cancelados && cancelados.length > 0) {
      for (const agendamento of cancelados) {
        // Verificar se já foi notificado (você pode adicionar uma coluna no banco)
        logger.info('❌ Cancelamento detectado:', agendamento.id);
        
        try {
          await enviarNotificacaoCancelamento(agendamento.id);
          logger.info('✅ Notificação de cancelamento enviada');
        } catch (error) {
          logger.error('❌ Erro ao enviar notificação de cancelamento:', error);
        }
      }
    }
  } catch (error) {
    logger.error('❌ Erro ao verificar cancelamentos:', error.message || error);
    logger.error('Stack:', error.stack);
  }
}

/**
 * Inicia o polling de agendamentos
 */
export function iniciarPolling() {
  logger.info('🔄 Iniciando polling de agendamentos...');
  logger.info('⏱️  Verificando a cada 10 segundos');
  logger.info('');

  // Verificar imediatamente
  verificarNovosAgendamentos();

  // Configurar intervalo de 10 segundos
  intervalId = setInterval(() => {
    verificarNovosAgendamentos();
    verificarCancelamentos();
  }, 10000); // 10 segundos

  logger.info('✅ Polling iniciado com sucesso!');
  logger.info('📡 Monitorando novos agendamentos e cancelamentos...');
  logger.info('');
}

/**
 * Para o polling
 */
export function pararPolling() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('🛑 Polling parado');
  }
}

export default {
  iniciarPolling,
  pararPolling
};
