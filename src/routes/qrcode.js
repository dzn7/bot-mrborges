/**
 * Rotas para QR Code
 */

import express from 'express';
import QRCode from 'qrcode';
import { forcarNovoQRCode } from '../services/whatsapp.js';

const router = express.Router();

// Armazenar o último QR Code gerado
let ultimoQRCode = null;
let ultimoQRCodeTimestamp = null;

export function setQRCode(qr) {
  ultimoQRCode = qr;
  ultimoQRCodeTimestamp = new Date();
}

// Rota para ver o QR Code como imagem
router.get('/imagem', async (req, res) => {
  try {
    if (!ultimoQRCode) {
      return res.status(404).send(`
        <html>
          <head>
            <title>QR Code - WhatsApp</title>
            <style>
              body { font-family: Arial; text-align: center; padding: 50px; }
              .error { color: #ff0000; }
            </style>
          </head>
          <body>
            <h1>❌ Nenhum QR Code disponível</h1>
            <p class="error">O bot já está conectado ou ainda não gerou um QR Code.</p>
            <p><a href="/api/qrcode/imagem">Recarregar</a></p>
          </body>
        </html>
      `);
    }

    // Gerar QR Code como imagem
    const qrCodeDataURL = await QRCode.toDataURL(ultimoQRCode);
    
    const tempoDecorrido = Math.floor((new Date() - ultimoQRCodeTimestamp) / 1000);
    
    res.send(`
      <html>
        <head>
          <title>QR Code - WhatsApp Bot</title>
          <meta http-equiv="refresh" content="30">
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 20px;
              background: #f0f0f0;
            }
            .container {
              background: white;
              border-radius: 10px;
              padding: 30px;
              max-width: 500px;
              margin: 0 auto;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 { color: #25D366; }
            img { max-width: 100%; border: 2px solid #25D366; border-radius: 10px; }
            .instructions {
              text-align: left;
              margin: 20px 0;
              padding: 15px;
              background: #f9f9f9;
              border-radius: 5px;
            }
            .instructions ol { margin: 10px 0; }
            .warning { color: #ff6600; font-size: 14px; margin-top: 15px; }
            .timestamp { color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>📱 QR Code - WhatsApp Bot</h1>
            <p><strong>Mr.Borges</strong></p>
            
            <img src="${qrCodeDataURL}" alt="QR Code WhatsApp" />
            
            <div class="instructions">
              <h3>Como conectar:</h3>
              <ol>
                <li>Abra o WhatsApp no seu celular</li>
                <li>Vá em <strong>Configurações</strong> → <strong>Aparelhos conectados</strong></li>
                <li>Toque em <strong>"Conectar um aparelho"</strong></li>
                <li>Escaneie o QR Code acima</li>
              </ol>
            </div>
            
            <p class="warning">⚠️ Este QR Code expira em 60 segundos!</p>
            <p class="timestamp">Gerado há ${tempoDecorrido} segundos | Página atualiza automaticamente</p>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`Erro ao gerar QR Code: ${error.message}`);
  }
});

// Rota para ver o QR Code como texto (para terminal)
router.get('/texto', (req, res) => {
  if (!ultimoQRCode) {
    return res.status(404).json({
      erro: 'Nenhum QR Code disponível',
      mensagem: 'O bot já está conectado ou ainda não gerou um QR Code.'
    });
  }

  res.json({
    qrCode: ultimoQRCode,
    timestamp: ultimoQRCodeTimestamp,
    tempoDecorrido: Math.floor((new Date() - ultimoQRCodeTimestamp) / 1000)
  });
});

// Rota para forçar regeneração do QR Code
router.post('/regenerar', async (req, res) => {
  try {
    await forcarNovoQRCode();
    
    res.json({
      sucesso: true,
      mensagem: 'QR Code será regenerado. Aguarde alguns segundos e recarregue a página.',
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      sucesso: false,
      erro: error.message
    });
  }
});

export default router;
