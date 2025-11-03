/**
 * Templates de Mensagens
 * Mensagens formatadas para envio via WhatsApp
 */

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';

// Timezone do Brasil
const TIMEZONE_BRASIL = 'America/Sao_Paulo';

/**
 * Template de confirmação de agendamento
 */
export function templateConfirmacaoAgendamento({ 
  nomeCliente, 
  nomeBarbeiro, 
  nomeServico, 
  preco, 
  dataHora,
  observacoes 
}) {
  // Converter UTC para horário de Brasília
  const dataHoraBrasil = toZonedTime(dataHora, TIMEZONE_BRASIL);
  const dataFormatada = format(dataHoraBrasil, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
  
  let mensagem = `🎉 *Agendamento Confirmado!*\n\n`;
  mensagem += `Olá, *${nomeCliente}*!\n\n`;
  mensagem += `Seu agendamento foi confirmado com sucesso:\n\n`;
  mensagem += `👨‍💼 *Barbeiro:* ${nomeBarbeiro}\n`;
  mensagem += `✂️ *Serviço:* ${nomeServico}\n`;
  mensagem += `💰 *Valor:* R$ ${preco.toFixed(2)}\n`;
  mensagem += `📅 *Data:* ${dataFormatada}\n`;
  
  if (observacoes) {
    mensagem += `📝 *Observações:* ${observacoes}\n`;
  }
  
  mensagem += `\n📍 *Endereço:*\n`;
  mensagem += `Avenida Dom Severino 1524\n`;
  mensagem += `Teresina - PI\n\n`;
  mensagem += `⏰ Por favor, chegue com 5 minutos de antecedência.\n\n`;
  mensagem += `Precisa reagendar? Entre em contato:\n`;
  mensagem += `📱 (86) 94061-106\n\n`;
  mensagem += `Nos vemos em breve! 💈\n`;
  mensagem += `*Mr.Borges*`;
  
  return mensagem;
}

/**
 * Template de lembrete (1 hora antes)
 */
export function templateLembreteAgendamento({ 
  nomeCliente, 
  nomeBarbeiro, 
  nomeServico, 
  dataHora 
}) {
  // Converter UTC para horário de Brasília
  const dataHoraBrasil = toZonedTime(dataHora, TIMEZONE_BRASIL);
  const horaFormatada = format(dataHoraBrasil, "HH:mm", { locale: ptBR });
  const diaFormatado = format(dataHoraBrasil, "dd/MM", { locale: ptBR });
  
  let mensagem = `⏰ *Lembrete: Seu horário está chegando!*\n\n`;
  mensagem += `Olá, *${nomeCliente}*! 👋\n\n`;
  mensagem += `Seu agendamento é *HOJE* às *${horaFormatada}h*!\n\n`;
  mensagem += `📋 *Detalhes:*\n`;
  mensagem += `👨‍💼 Barbeiro: ${nomeBarbeiro}\n`;
  mensagem += `✂️ Serviço: ${nomeServico}\n`;
  mensagem += `📅 Data: ${diaFormatado}\n`;
  mensagem += `🕐 Horário: ${horaFormatada}h\n\n`;
  mensagem += `📍 *Endereço:*\n`;
  mensagem += `Avenida Dom Severino 1524\n`;
  mensagem += `Teresina - PI\n\n`;
  mensagem += `💡 *Dica:* Chegue com 5 minutos de antecedência!\n\n`;
  mensagem += `❌ Não poderá comparecer?\n`;
  mensagem += `Avise-nos: (86) 94061-106\n\n`;
  mensagem += `Estamos te esperando! 💈✨\n`;
  mensagem += `*Mr.Borges*`;
  
  return mensagem;
}

/**
 * Template de cancelamento
 */
export function templateCancelamento({ 
  nomeCliente, 
  nomeBarbeiro, 
  nomeServico, 
  dataHora 
}) {
  // Converter UTC para horário de Brasília
  const dataHoraBrasil = toZonedTime(dataHora, TIMEZONE_BRASIL);
  const dataFormatada = format(dataHoraBrasil, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
  
  let mensagem = `❌ *Agendamento Cancelado*\n\n`;
  mensagem += `Olá, *${nomeCliente}*,\n\n`;
  mensagem += `Seu agendamento foi cancelado:\n\n`;
  mensagem += `👨‍💼 *Barbeiro:* ${nomeBarbeiro}\n`;
  mensagem += `✂️ *Serviço:* ${nomeServico}\n`;
  mensagem += `📅 *Data:* ${dataFormatada}\n\n`;
  mensagem += `Se deseja reagendar, entre em contato:\n`;
  mensagem += `📱 (86) 94061-106\n\n`;
  mensagem += `Ou agende online:\n`;
  mensagem += `🌐 https://mrborges.com.br\n\n`;
  mensagem += `*Mr.Borges*`;
  
  return mensagem;
}

/**
 * Template de mensagem personalizada do dashboard
 */
export function templateMensagemPersonalizada({ 
  nomeCliente, 
  mensagem 
}) {
  return `Olá, *${nomeCliente}*!

${mensagem}

*Mr.Borges* 💈`;
}

/**
 * Template de boas-vindas para novos clientes
 */
export function templateBoasVindas(nomeCliente) {
  let mensagem = `🎉 *Bem-vindo à Mr.Borges!*

Olá, *${nomeCliente}*!

Ficamos felizes em ter você como cliente.

📍 Estamos localizados em:
Avenida Dom Severino 1524
Teresina - PI

⏰ Horário de funcionamento:
Segunda a Sábado: 8h às 20h

Agende online ou pelo WhatsApp!

Até breve! 💈`;
  
  return mensagem;
}

export default {
  templateConfirmacaoAgendamento,
  templateLembreteAgendamento,
  templateCancelamento,
  templateMensagemPersonalizada,
  templateBoasVindas
};
