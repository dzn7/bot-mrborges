/**
 * Rotas de Teste
 */

import express from 'express';
import { supabase } from '../config/database.js';
import { estaConectado } from '../services/whatsapp.js';

const router = express.Router();

// Teste de conexão Supabase
router.get('/supabase', async (req, res) => {
  try {
    const inicio = Date.now();
    
    // Tentar buscar 1 registro
    const { data, error } = await supabase
      .from('agendamentos')
      .select('id')
      .limit(1);
    
    const tempo = Date.now() - inicio;
    
    if (error) {
      return res.status(500).json({
        sucesso: false,
        erro: error.message,
        detalhes: error,
        tempo: `${tempo}ms`
      });
    }
    
    res.json({
      sucesso: true,
      mensagem: 'Conexão com Supabase OK',
      registros: data?.length || 0,
      tempo: `${tempo}ms`
    });
  } catch (error) {
    res.status(500).json({
      sucesso: false,
      erro: error.message,
      stack: error.stack
    });
  }
});

// Teste de conexão WhatsApp
router.get('/whatsapp', (req, res) => {
  const conectado = estaConectado();
  res.json({
    conectado,
    status: conectado ? 'online' : 'offline'
  });
});

// Status geral
router.get('/status', async (req, res) => {
  try {
    // Testar Supabase
    const inicioSupabase = Date.now();
    const { error: supabaseError } = await supabase
      .from('agendamentos')
      .select('id')
      .limit(1);
    const tempoSupabase = Date.now() - inicioSupabase;
    
    // Testar WhatsApp
    const whatsappConectado = estaConectado();
    
    res.json({
      timestamp: new Date().toISOString(),
      servicos: {
        whatsapp: {
          status: whatsappConectado ? 'online' : 'offline',
          conectado: whatsappConectado
        },
        supabase: {
          status: supabaseError ? 'erro' : 'online',
          erro: supabaseError?.message || null,
          tempo: `${tempoSupabase}ms`
        }
      },
      ambiente: process.env.NODE_ENV || 'development',
      regiao: process.env.CLOUD_RUN_REGION || 'local'
    });
  } catch (error) {
    res.status(500).json({
      erro: error.message
    });
  }
});

export default router;
