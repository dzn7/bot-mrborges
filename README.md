# 🤖 Bot WhatsApp - Mr.Borges

Sistema automatizado de notificações via WhatsApp para gerenciamento de agendamentos.

## 📋 Funcionalidades

- ✅ **Confirmação Automática** - Envia confirmação imediata ao criar agendamento
- ❌ **Notificação de Cancelamento** - Avisa cliente sobre cancelamentos
- ⏰ **Lembretes Automáticos** - Lembrete 1 hora antes do horário agendado
- 📡 **Monitoramento em Tempo Real** - Integração com Supabase Realtime/Polling
- 🔄 **Reconexão Automática** - Mantém WhatsApp sempre conectado

## 🛠️ Tecnologias

- **Node.js 20** - Runtime JavaScript
- **Baileys 7.x** - WhatsApp Web API
- **Supabase** - Banco de dados PostgreSQL + Realtime
- **Express** - Servidor HTTP
- **node-cron** - Agendamento de tarefas

## 🚀 Deploy

### Zeabur (Recomendado)

Siga o guia completo: **[ZEABUR_DEPLOY.md](./ZEABUR_DEPLOY.md)**

Resumo:
1. Push código para GitHub
2. Criar projeto no Zeabur
3. Conectar repositório
4. Configurar variáveis de ambiente
5. Criar volume persistente em `/app/auth_info`
6. Escanear QR Code

### Fly.io (Legado)

Configuração antiga disponível em `fly.toml` (não recomendado para novos deploys).

## ⚙️ Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

```env
NODE_ENV=production
PORT=8080
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-anon
BOT_NAME=Mr.Borges
BOT_PHONE=+5586994061106
HORARIO_INICIO_LEMBRETES=08:00
HORARIO_FIM_LEMBRETES=22:00
```

## 🏃 Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Copiar .env.example
cp .env.example .env

# Editar .env com suas credenciais
nano .env

# Iniciar em modo desenvolvimento
npm run dev
```

## 📡 Endpoints API

### Health Check
```
GET /health
```

### QR Code WhatsApp
```
GET /api/qrcode
```

### Enviar Mensagem Manual
```
POST /api/mensagens/enviar
Content-Type: application/json

{
  "numero": "5563999999999",
  "mensagem": "Olá, teste!"
}
```

## 📊 Estrutura do Projeto

```
bot-barbeariamr/
├── src/
│   ├── config/
│   │   └── database.js          # Configuração Supabase
│   ├── services/
│   │   ├── whatsapp.js          # Conexão Baileys
│   │   ├── realtime.js          # Listeners Supabase Realtime
│   │   ├── polling.js           # Polling alternativo
│   │   ├── notificacoes.js      # Envio de mensagens
│   │   └── lembretes.js         # Cron jobs
│   ├── routes/
│   │   ├── mensagens.js         # Rotas de mensagens
│   │   ├── qrcode.js            # Rota QR Code
│   │   └── teste.js             # Rotas de teste
│   ├── utils/
│   │   ├── logger.js            # Sistema de logs
│   │   └── templates.js         # Templates de mensagens
│   └── index.js                 # Servidor principal
├── Dockerfile                   # Build Docker
├── .dockerignore               # Arquivos ignorados
├── zbpack.json                 # Config Zeabur
├── package.json                # Dependências
└── README.md                   # Este arquivo
```

## 🔧 Troubleshooting

### Bot não conecta no WhatsApp

1. Verifique se volume persistente está montado
2. Delete `auth_info/` e gere novo QR Code
3. Verifique logs para erros

### Mensagens não são enviadas

1. Confirme que WhatsApp está conectado
2. Verifique credenciais do Supabase
3. Teste endpoint `/health`

### Lembretes não funcionam

1. Verifique horários configurados
2. Cron roda a cada 30 minutos
3. Verifique fuso horário

## 📝 Licença

ISC

## 👨‍💻 Autor

Mr.Borges
