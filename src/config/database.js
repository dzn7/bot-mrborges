/**
 * Configuração do Banco de Dados
 * Cliente Supabase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Verificando variáveis de ambiente Supabase...');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Definida' : '❌ Não definida');
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? '✅ Definida' : '❌ Não definida');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  throw new Error('Variáveis de ambiente SUPABASE_URL e SUPABASE_KEY são obrigatórias');
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        'x-client-info': 'barbearia-bot'
      },
      fetch: (url, options = {}) => {
        // Adicionar timeout de 30 segundos
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        
        return fetch(url, {
          ...options,
          signal: controller.signal
        }).finally(() => clearTimeout(timeout));
      }
    },
    db: {
      schema: 'public'
    }
  }
);

export default supabase;
