/**
 * Teste de envio direto
 * Execute: node teste-envio.js
 */

import fetch from 'node-fetch';

const BOT_URL = 'http://localhost:3005';

// Teste 1: Status do bot
console.log('🔍 Verificando status do bot...\n');

const testarBot = async () => {
  try {
    // Verificar status
    const statusRes = await fetch(`${BOT_URL}/api/mensagens/status`);
    const status = await statusRes.json();
    
    console.log('📊 Status do bot:');
    console.log('   Conectado:', status.conectado ? '✅' : '❌');
    console.log('   Bot número:', status.bot?.numero || 'N/A');
    console.log('');
    
    if (!status.conectado) {
      console.log('❌ Bot não está conectado!');
      return;
    }
    
    // Teste de envio
    console.log('📤 Enviando mensagem de teste...\n');
    
    // COLOQUE SEU NÚMERO AQUI (com DDD, sem formatação)
    const numeroTeste = '86981125646'; // ← MUDE PARA SEU NÚMERO
    
    const envioRes = await fetch(`${BOT_URL}/api/mensagens/enviar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        numero: numeroTeste,
        mensagem: '🧪 TESTE DO BOT\n\nSe você recebeu esta mensagem, o bot está funcionando!\n\nHora: ' + new Date().toLocaleTimeString()
      })
    });
    
    const resultado = await envioRes.json();
    
    console.log('📊 Resultado:');
    console.log('   Sucesso:', resultado.sucesso ? '✅' : '❌');
    console.log('   Mensagem:', resultado.mensagem || resultado.erro);
    console.log('');
    
    if (resultado.sucesso) {
      console.log('✅ Mensagem enviada com sucesso!');
      console.log('📱 Verifique seu WhatsApp agora!');
    } else {
      console.log('❌ Erro ao enviar:', resultado.erro);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
};

testarBot();
