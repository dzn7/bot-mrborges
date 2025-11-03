/**
 * Serviço de Notificações
 * Envia notificações automáticas via WhatsApp
 */

import { enviarMensagem } from './whatsapp.js';
import { supabase } from '../config/database.js';
import { 
  templateConfirmacaoAgendamento,
  templateLembreteAgendamento,
  templateCancelamento
} from '../utils/templates.js';
import logger from '../utils/logger.js';

/**
 * Envia notificação de confirmação de agendamento
 * @param {string} agendamentoId - ID do agendamento
 */
export async function enviarConfirmacaoAgendamento(agendamentoId) {
  try {
    logger.info(`📤 Enviando confirmação de agendamento: ${agendamentoId}`);

    // Buscar dados do agendamento
    const { data: agendamento, error } = await supabase
      .from('agendamentos')
      .select(`
        *,
        clientes (nome, telefone),
        barbeiros (nome),
        servicos (nome, preco)
      `)
      .eq('id', agendamentoId)
      .single();

    if (error || !agendamento) {
      throw new Error('Agendamento não encontrado');
    }

    const { clientes, barbeiros, servicos } = agendamento;

    if (!clientes?.telefone) {
      logger.warn('⚠️ Cliente sem telefone cadastrado');
      return { sucesso: false, erro: 'Telefone não cadastrado' };
    }

    // Formatar telefone (remover formatação)
    let telefone = clientes.telefone.replace(/\D/g, '');
    
    // Adicionar código do país se não tiver
    if (!telefone.startsWith('55')) {
      telefone = '55' + telefone;
    }
    
    // Remover o 9 extra se tiver 13 dígitos (formato antigo com 9 extra)
    // Formato correto: 55 + DDD (2) + Número (8 dígitos) = 12 dígitos
    // Exemplo: 558698053279
    if (telefone.length === 13 && telefone.charAt(4) === '9') {
      telefone = telefone.substring(0, 4) + telefone.substring(5);
      logger.info('🔧 Removido 9 extra do número');
    }
    
    logger.info('📱 Telefone formatado:', {
      original: clientes.telefone,
      final: telefone,
      digitos: telefone.length
    });

    // Gerar mensagem
    const mensagem = templateConfirmacaoAgendamento({
      nomeCliente: clientes.nome,
      nomeBarbeiro: barbeiros.nome,
      nomeServico: servicos.nome,
      preco: servicos.preco,
      dataHora: new Date(agendamento.data_hora),
      observacoes: agendamento.observacoes
    });

    // Enviar mensagem
    const resultado = await enviarMensagem(telefone, mensagem);

    if (resultado.sucesso) {
      // Registrar envio no banco
      await supabase
        .from('notificacoes_enviadas')
        .insert([{
          agendamento_id: agendamentoId,
          tipo: 'confirmacao',
          telefone: telefone,
          mensagem: mensagem,
          status: 'enviada',
          data_envio: new Date().toISOString()
        }]);

      logger.info('✅ Confirmação enviada com sucesso');
    }

    return resultado;
  } catch (error) {
    logger.error('❌ Erro ao enviar confirmação:', error);
    return { sucesso: false, erro: error.message };
  }
}

/**
 * Envia lembrete de agendamento (1h antes)
 * @param {string} agendamentoId - ID do agendamento
 * @returns {Promise<{sucesso: boolean, erro?: string}>}
 */
export async function enviarLembreteAgendamento(agendamentoId) {
  try {
    logger.info(`📤 Enviando lembrete de agendamento: ${agendamentoId}`);

    // Verificar se já foi enviado lembrete (proteção contra duplicatas)
    const { data: lembreteExistente } = await supabase
      .from('notificacoes_enviadas')
      .select('id, criado_em')
      .eq('agendamento_id', agendamentoId)
      .eq('tipo', 'lembrete')
      .maybeSingle();

    if (lembreteExistente) {
      logger.warn(`⚠️ Lembrete já foi enviado para agendamento ${agendamentoId} em ${lembreteExistente.criado_em}`);
      return { sucesso: true, mensagem: 'Lembrete já enviado anteriormente' };
    }

    // Buscar dados do agendamento
    const { data: agendamento, error } = await supabase
      .from('agendamentos')
      .select(`
        *,
        clientes (nome, telefone),
        barbeiros (nome),
        servicos (nome)
      `)
      .eq('id', agendamentoId)
      .single();

    if (error || !agendamento) {
      throw new Error('Agendamento não encontrado');
    }

    const { clientes, barbeiros, servicos } = agendamento;

    if (!clientes?.telefone) {
      logger.warn('⚠️ Cliente sem telefone cadastrado');
      return { sucesso: false, erro: 'Telefone não cadastrado' };
    }

    let telefone = clientes.telefone.replace(/\D/g, '');
    
    // Adicionar código do país se não tiver
    if (!telefone.startsWith('55')) {
      telefone = '55' + telefone;
    }
    
    // Remover o 9 extra se tiver 13 dígitos
    if (telefone.length === 13 && telefone.charAt(4) === '9') {
      telefone = telefone.substring(0, 4) + telefone.substring(5);
    }

    logger.info(`📱 Enviando lembrete para: ${telefone}`);

    // Gerar mensagem de lembrete
    const mensagem = templateLembreteAgendamento({
      nomeCliente: clientes.nome,
      nomeBarbeiro: barbeiros.nome,
      nomeServico: servicos.nome,
      dataHora: new Date(agendamento.data_hora)
    });

    // Enviar mensagem
    const resultado = await enviarMensagem(telefone, mensagem);

    if (resultado.sucesso) {
      // Registrar envio no banco (com proteção de constraint única)
      const { error: erroInsert } = await supabase
        .from('notificacoes_enviadas')
        .insert([{
          agendamento_id: agendamentoId,
          tipo: 'lembrete',
          telefone: telefone,
          mensagem: mensagem,
          status: 'enviada',
          data_envio: new Date().toISOString()
        }]);

      if (erroInsert) {
        // Se erro for de constraint única, ignorar (já foi registrado)
        if (erroInsert.code === '23505') {
          logger.warn('⚠️ Lembrete já estava registrado no banco');
        } else {
          logger.error('Erro ao registrar lembrete:', erroInsert);
        }
      }

      logger.info('✅ Lembrete enviado com sucesso');
      return { sucesso: true };
    } else {
      logger.error('❌ Falha ao enviar lembrete via WhatsApp');
      return resultado;
    }
  } catch (error) {
    logger.error('❌ Erro ao enviar lembrete:', error);
    return { sucesso: false, erro: error.message };
  }
}

/**
 * Envia notificação de cancelamento
 * @param {string} agendamentoId - ID do agendamento
 */
export async function enviarNotificacaoCancelamento(agendamentoId) {
  try {
    logger.info(`📤 Enviando notificação de cancelamento: ${agendamentoId}`);

    // Verificar se já foi enviada notificação de cancelamento
    const { data: notificacaoExistente } = await supabase
      .from('notificacoes_enviadas')
      .select('id')
      .eq('agendamento_id', agendamentoId)
      .eq('tipo', 'cancelamento')
      .single();

    if (notificacaoExistente) {
      logger.info('⚠️ Notificação de cancelamento já foi enviada anteriormente');
      return { sucesso: true, mensagem: 'Notificação já enviada' };
    }

    const { data: agendamento, error } = await supabase
      .from('agendamentos')
      .select(`
        *,
        clientes (nome, telefone),
        barbeiros (nome),
        servicos (nome)
      `)
      .eq('id', agendamentoId)
      .single();

    if (error || !agendamento) {
      throw new Error('Agendamento não encontrado');
    }

    const { clientes, barbeiros, servicos } = agendamento;

    if (!clientes?.telefone) {
      return { sucesso: false, erro: 'Telefone não cadastrado' };
    }

    let telefone = clientes.telefone.replace(/\D/g, '');
    
    // Adicionar código do país se não tiver
    if (!telefone.startsWith('55')) {
      telefone = '55' + telefone;
    }
    
    // Remover o 9 extra se tiver 13 dígitos
    if (telefone.length === 13 && telefone.charAt(4) === '9') {
      telefone = telefone.substring(0, 4) + telefone.substring(5);
    }

    const mensagem = templateCancelamento({
      nomeCliente: clientes.nome,
      nomeBarbeiro: barbeiros.nome,
      nomeServico: servicos.nome,
      dataHora: new Date(agendamento.data_hora)
    });

    // Registrar ANTES de enviar para evitar duplicatas (race condition)
    const { error: insertError } = await supabase
      .from('notificacoes_enviadas')
      .insert([{
        agendamento_id: agendamentoId,
        tipo: 'cancelamento',
        telefone: telefone,
        mensagem: mensagem,
        status: 'pendente',
        data_envio: new Date().toISOString()
      }]);

    // Se falhou ao inserir (já existe), retornar sucesso
    if (insertError) {
      logger.info('⚠️ Notificação já registrada (race condition evitada)');
      return { sucesso: true, mensagem: 'Notificação já registrada' };
    }

    const resultado = await enviarMensagem(telefone, mensagem);

    // Atualizar status após envio
    if (resultado.sucesso) {
      await supabase
        .from('notificacoes_enviadas')
        .update({ status: 'enviada' })
        .eq('agendamento_id', agendamentoId)
        .eq('tipo', 'cancelamento');

      logger.info('✅ Notificação de cancelamento enviada');
    } else {
      await supabase
        .from('notificacoes_enviadas')
        .update({ status: 'erro' })
        .eq('agendamento_id', agendamentoId)
        .eq('tipo', 'cancelamento');
    }

    return resultado;
  } catch (error) {
    logger.error('❌ Erro ao enviar cancelamento:', error);
    return { sucesso: false, erro: error.message };
  }
}

export default {
  enviarConfirmacaoAgendamento,
  enviarLembreteAgendamento,
  enviarNotificacaoCancelamento
};
