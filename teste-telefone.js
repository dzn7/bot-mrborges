/**
 * Teste de formatação de telefone
 * Execute: node teste-telefone.js
 */

function corrigirTelefone(numero) {
  console.log('📥 Entrada:', numero);
  
  // Limpar
  let numeroLimpo = numero.replace(/\D/g, '');
  console.log('🧹 Após limpar:', numeroLimpo, '(', numeroLimpo.length, 'dígitos)');
  
  // Adicionar 55 se não tiver
  if (!numeroLimpo.startsWith('55')) {
    numeroLimpo = '55' + numeroLimpo;
    console.log('➕ Adicionado 55:', numeroLimpo);
  }
  
  // Corrigir se tiver 14 dígitos
  if (numeroLimpo.length === 14 && numeroLimpo.substring(4, 5) === '9') {
    const antes = numeroLimpo;
    numeroLimpo = numeroLimpo.substring(0, 4) + numeroLimpo.substring(5);
    console.log('🔧 Corrigido:', antes, '→', numeroLimpo);
  }
  
  console.log('✅ Resultado final:', numeroLimpo, '(', numeroLimpo.length, 'dígitos)');
  console.log('');
  
  return numeroLimpo;
}

// Testes
console.log('═══════════════════════════════════════\n');

corrigirTelefone('(86) 99805-3279');
corrigirTelefone('86998053279');
corrigirTelefone('5586998053279');
corrigirTelefone('55869981053014');
corrigirTelefone('(86) 9810-5301');
corrigirTelefone('8698105301');

console.log('═══════════════════════════════════════');
