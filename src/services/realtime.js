/**
 * Serviço Realtime - Supabase
 * Escuta mudanças no banco em tempo real e dispara notificações
 */

import { supabase } from '../config/database.js';
import { enviarConfirmacaoAgendamento, enviarNotificacaoCancelamento } from './notificacoes.js';
import logger from '../utils/logger.js';

let realtimeChannel = null;

/**
 * Inicializa listeners em tempo real
 */
export function iniciarRealtimeListeners() {
  logger.info('🔄 Iniciando listeners Supabase Realtime...');

  // Criar canal de agendamentos
  realtimeChannel = supabase
    .channel('agendamentos-changes', {
      config: {
        broadcast: { self: true },
        presence: { key: '' }
      }
    })
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'agendamentos'
      },
      async (payload) => {
        logger.info('');
        logger.info('🆕🆕🆕 NOVO AGENDAMENTO DETECTADO! 🆕🆕🆕');
        logger.info('ID:', payload.new.id);
        logger.info('Status:', payload.new.status);
        logger.info('Cliente ID:', payload.new.cliente_id);
        logger.info('Data/Hora:', payload.new.data_hora);
        logger.info('');

        // Aguardar 2 segundos para garantir que dados relacionados foram salvos
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Enviar confirmação automaticamente
        try {
          logger.info('📤 Iniciando envio de confirmação...');
          await enviarConfirmacaoAgendamento(payload.new.id);
          logger.info('✅ Confirmação enviada automaticamente!');
          logger.info('');
        } catch (error) {
          logger.error('❌ Erro ao enviar confirmação automática:', error);
          logger.error('');
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'agendamentos'
      },
      async (payload) => {
        const statusAnterior = payload.old.status;
        const statusNovo = payload.new.status;

        logger.info('📝 Agendamento atualizado:', {
          id: payload.new.id,
          statusAnterior,
          statusNovo
        });

        // Se mudou para cancelado, enviar notificação
        if (statusAnterior !== 'cancelado' && statusNovo === 'cancelado') {
          logger.info('❌ Cancelamento detectado, enviando notificação...');
          
          // Aguardar 1 segundo
          await new Promise(resolve => setTimeout(resolve, 1000));

          try {
            await enviarNotificacaoCancelamento(payload.new.id);
            logger.info('✅ Notificação de cancelamento enviada');
          } catch (error) {
            logger.error('❌ Erro ao enviar notificação de cancelamento:', error);
          }
        }

        // Se mudou para confirmado (e antes estava pendente)
        if (statusAnterior === 'pendente' && statusNovo === 'confirmado') {
          logger.info('✅ Status alterado para confirmado');
        }
      }
    )
    .subscribe((status, err) => {
      logger.info('');
      logger.info('📡 Status Realtime:', status);
      
      if (status === 'SUBSCRIBED') {
        logger.info('');
        logger.info('╔═══════════════════════════════════════╗');
        logger.info('║  ✅ REALTIME CONECTADO COM SUCESSO!  ║');
        logger.info('╚═══════════════════════════════════════╝');
        logger.info('');
        logger.info('📡 Escutando mudanças em agendamentos...');
        logger.info('🔍 Eventos monitorados:');
        logger.info('   • INSERT (novo agendamento)');
        logger.info('   • UPDATE (cancelamento/confirmação)');
        logger.info('');
        logger.info('💡 Teste agora: Crie um agendamento no site!');
        logger.info('');
      } else if (status === 'CHANNEL_ERROR') {
        logger.error('');
        logger.error('❌ ERRO NO CANAL REALTIME!');
        if (err) logger.error('Erro:', err);
        logger.error('');
        logger.error('⚠️  Possíveis causas:');
        logger.error('   1. Realtime não ativado no Supabase Dashboard');
        logger.error('   2. Tabela agendamentos sem replicação');
        logger.error('   3. Credenciais incorretas no .env');
        logger.error('');
        logger.error('📖 Veja: supabase-habilitar-realtime.sql');
        logger.error('');
      } else if (status === 'TIMED_OUT') {
        logger.warn('⏱️ Timeout no Realtime, reconectando...');
      } else if (status === 'CLOSED') {
        logger.warn('🔌 Canal Realtime fechado');
      }
    });

  logger.info('🎧 Listeners configurados com sucesso!');
}

/**
 * Desconecta do Realtime
 */
export async function desconectarRealtime() {
  if (realtimeChannel) {
    await supabase.removeChannel(realtimeChannel);
    logger.info('🔌 Desconectado do Realtime');
  }
}

export default {
  iniciarRealtimeListeners,
  desconectarRealtime
};
