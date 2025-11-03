/**
 * Serviço de Lembretes Automáticos
 * Envia lembretes agendados usando cron jobs
 */

import cron from 'node-cron';
import { supabase } from '../config/database.js';
import { enviarLembreteAgendamento } from './notificacoes.js';
import logger from '../utils/logger.js';

/**
 * Verifica agendamentos que precisam de lembrete
 * Envia lembretes 1 hora antes do horário
 */
async function verificarLembretes() {
  try {
    logger.info('⏰ Verificando agendamentos para lembretes (1h antes)...');

    const agora = new Date();
    
    // Janela de tempo: 55 minutos a 65 minutos no futuro
    // Isso garante que pegamos agendamentos na próxima hora, com margem
    const em55min = new Date(agora.getTime() + (55 * 60 * 1000));
    const em65min = new Date(agora.getTime() + (65 * 60 * 1000));

    // Buscar agendamentos na próxima hora que ainda não receberam lembrete
    const { data: agendamentos, error } = await supabase
      .from('agendamentos')
      .select('id, data_hora')
      .gte('data_hora', em55min.toISOString())
      .lte('data_hora', em65min.toISOString())
      .in('status', ['pendente', 'confirmado']);

    if (error) {
      throw error;
    }

    if (!agendamentos || agendamentos.length === 0) {
      logger.info('📭 Nenhum agendamento para lembrete na próxima hora');
      return;
    }

    logger.info(`📬 ${agendamentos.length} agendamento(s) encontrado(s) para lembrete`);

    // Para cada agendamento, verificar se já foi enviado lembrete
    for (const agendamento of agendamentos) {
      try {
        // Verificar se já enviou lembrete (com verificação mais rigorosa)
        const { data: lembreteJaEnviado, error: erroConsulta } = await supabase
          .from('notificacoes_enviadas')
          .select('id, criado_em')
          .eq('agendamento_id', agendamento.id)
          .eq('tipo', 'lembrete')
          .maybeSingle();

        if (erroConsulta && erroConsulta.code !== 'PGRST116') {
          logger.error(`Erro ao consultar lembrete: ${erroConsulta.message}`);
          continue;
        }

        if (lembreteJaEnviado) {
          logger.info(`⏭️ Lembrete já enviado para agendamento ${agendamento.id} em ${lembreteJaEnviado.criado_em}`);
          continue;
        }

        // Calcular tempo exato até o agendamento
        const dataAgendamento = new Date(agendamento.data_hora);
        const minutosRestantes = Math.round((dataAgendamento - agora) / (60 * 1000));
        
        logger.info(`📤 Enviando lembrete para agendamento ${agendamento.id} (faltam ${minutosRestantes} minutos)`);
        
        // Enviar lembrete
        const sucesso = await enviarLembreteAgendamento(agendamento.id);
        
        if (sucesso) {
          logger.info(`✅ Lembrete enviado com sucesso para agendamento ${agendamento.id}`);
        } else {
          logger.warn(`⚠️ Falha ao enviar lembrete para agendamento ${agendamento.id}`);
        }
        
        // Delay entre mensagens para evitar spam
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (erroAgendamento) {
        logger.error(`❌ Erro ao processar agendamento ${agendamento.id}:`, erroAgendamento);
        continue;
      }
    }

    logger.info('✅ Verificação de lembretes concluída');
  } catch (error) {
    logger.error('❌ Erro ao verificar lembretes:', error);
  }
}

/**
 * Inicializa os cron jobs de lembretes
 */
export function iniciarCronLembretes() {
  // Executar a cada 30 minutos (para lembretes de 1h antes)
  // Formato: minuto hora dia mês dia-da-semana
  // */30 = a cada 30 minutos
  cron.schedule('*/30 * * * *', () => {
    logger.info('🔄 Iniciando verificação de lembretes (1h antes)...');
    verificarLembretes();
  });

  // Executar também ao iniciar (apenas em dev)
  if (process.env.NODE_ENV === 'development') {
    logger.info('🧪 [DEV] Executando verificação inicial...');
    // Delay de 5 segundos para dar tempo do WhatsApp conectar
    setTimeout(() => {
      verificarLembretes();
    }, 5000);
  }

  logger.info('✅ Sistema de lembretes inicializado');
  logger.info('📅 Lembretes (1h antes) serão verificados a cada 30 minutos');
}

/**
 * Verifica agendamentos do dia atual
 * Para enviar bom dia ou lembretes de última hora
 */
async function verificarAgendamentosHoje() {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const { data: agendamentos, error } = await supabase
      .from('agendamentos')
      .select(`
        id,
        data_hora,
        clientes (nome, telefone),
        barbeiros (nome),
        servicos (nome)
      `)
      .gte('data_hora', hoje.toISOString())
      .lt('data_hora', amanha.toISOString())
      .in('status', ['pendente', 'confirmado']);

    if (error) throw error;

    logger.info(`📅 ${agendamentos?.length || 0} agendamentos hoje`);
    return agendamentos || [];
  } catch (error) {
    logger.error('Erro ao verificar agendamentos de hoje:', error);
    return [];
  }
}

// Cron para verificar agendamentos do dia (8h da manhã)
cron.schedule('0 8 * * *', async () => {
  logger.info('🌅 Bom dia! Verificando agendamentos de hoje...');
  await verificarAgendamentosHoje();
});

export default {
  iniciarCronLembretes,
  verificarLembretes,
  verificarAgendamentosHoje
};
