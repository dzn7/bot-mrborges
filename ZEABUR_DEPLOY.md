# 🚀 Guia de Deploy no Zeabur - Bot WhatsApp Mr.Borges

Este guia detalha o processo completo de deploy do bot WhatsApp no Zeabur.

## 📋 Pré-requisitos

- ✅ Conta no [Zeabur](https://zeabur.com)
- ✅ Repositório GitHub com o código do bot
- ✅ Projeto Supabase configurado
- ✅ Variáveis de ambiente preparadas

---

## 🔧 Passo 1: Preparar o Repositório

### 1.1 Fazer Push do Código para GitHub

```bash
cd bot-barbeariamr
git init
git add .
git commit -m "feat: preparar deploy para Zeabur"
git branch -M main
git remote add origin https://github.com/seu-usuario/bot-barbearia.git
git push -u origin main
```

### 1.2 Verificar Arquivos Criados

Certifique-se que os seguintes arquivos estão no repositório:

- ✅ `Dockerfile` - Imagem Docker otimizada
- ✅ `.dockerignore` - Arquivos a ignorar no build
- ✅ `zbpack.json` - Configurações do Zeabur
- ✅ `.env.example` - Template de variáveis de ambiente

---

## 🌐 Passo 2: Criar Projeto no Zeabur

### 2.1 Acessar Dashboard

1. Acesse [dash.zeabur.com](https://dash.zeabur.com)
2. Faça login com GitHub
3. Clique em **"Create New Project"**
4. Escolha um nome: `barbearia-bot` (ou outro de sua preferência)
5. Selecione a região: **US West** ou **Asia Pacific** (mais próximo do Brasil)

### 2.2 Conectar GitHub

1. No projeto criado, clique em **"Add Service"**
2. Selecione **"Deploy your source code"**
3. Clique em **"Configure GitHub"** (se for primeira vez)
4. Autorize o Zeabur a acessar seus repositórios
5. Selecione o repositório `bot-barbearia`
6. Clique em **"Import"**

---

## ⚙️ Passo 3: Configurar Variáveis de Ambiente

### 3.1 Acessar Configurações

1. No serviço criado, clique na aba **"Variables"**
2. Clique em **"Edit as Raw"** para adicionar múltiplas variáveis

### 3.2 Adicionar Variáveis

Cole as seguintes variáveis (ajuste os valores):

```env
NODE_ENV=production
PORT=8080
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-anon-key-aqui
BOT_NAME=Mr.Borges
BOT_PHONE=+5586994061106
HORARIO_INICIO_LEMBRETES=08:00
HORARIO_FIM_LEMBRETES=22:00
```

### 3.3 Salvar

Clique em **"Save"** - O serviço será reiniciado automaticamente.

---

## 💾 Passo 4: Configurar Volume Persistente (CRÍTICO)

O bot precisa de armazenamento persistente para salvar a autenticação do WhatsApp.

### 4.1 Criar Volume

1. Na página do serviço, vá em **"Volumes"** (menu lateral)
2. Clique em **"Add Volume"**
3. Configure:
   - **Volume ID**: `whatsapp-auth`
   - **Mount Path**: `/app/auth_info`
4. Clique em **"Create"**

### 4.2 Verificar Montagem

O volume será montado automaticamente. Após restart, verifique nos logs:

```
✅ Auth_info directory ready at /app/auth_info
```

---

## 🌍 Passo 5: Configurar Porta e Networking

### 5.1 Expor Porta HTTP

1. Vá em **"Networking"** (menu lateral)
2. Clique em **"Add Port"**
3. Configure:
   - **Port Name**: `http`
   - **Port**: `8080`
   - **Port Type**: `HTTP`
4. Clique em **"Create"**

### 5.2 Gerar Domínio Público

1. Ainda em **"Networking"**, clique em **"Generate Domain"**
2. Zeabur criará um domínio: `seu-servico.zeabur.app`
3. Acesse `https://seu-servico.zeabur.app/health` para testar

Resposta esperada:
```json
{
  "status": "online",
  "servico": "Barbearia WhatsApp Bot",
  "timestamp": "2025-11-03T16:30:00.000Z"
}
```

---

## 📱 Passo 6: Parear WhatsApp

### 6.1 Acessar Logs

1. No serviço, clique em **"Logs"** (menu lateral)
2. Aguarde o bot iniciar (30-60 segundos)

### 6.2 Escanear QR Code

Você verá nos logs:

```
═══════════════════════════════════════════
📱 ESCANEIE O QR CODE:
═══════════════════════════════════════════

[QR CODE AQUI]

═══════════════════════════════════════════
```

**Ou acesse via API:**

```
https://seu-servico.zeabur.app/api/qrcode
```

### 6.3 Confirmar Conexão

Após escanear, você verá:

```
✅ WhatsApp conectado!
📱 Número: 5563981053014@s.whatsapp.net
```

---

## 🔍 Passo 7: Verificar Funcionamento

### 7.1 Testar Health Check

```bash
curl https://seu-servico.zeabur.app/health
```

### 7.2 Verificar Status do Bot

```bash
curl https://seu-servico.zeabur.app/api/qrcode
```

Resposta esperada:
```json
{
  "conectado": true,
  "status": "connected",
  "numero": "5563981053014@s.whatsapp.net",
  "qrCode": null
}
```

### 7.3 Testar Envio de Mensagem (Opcional)

```bash
curl -X POST https://seu-servico.zeabur.app/api/mensagens/enviar \
  -H "Content-Type: application/json" \
  -d '{
    "numero": "5563999999999",
    "mensagem": "Teste de mensagem do bot!"
  }'
```

### 7.4 Criar Agendamento no Sistema

1. Acesse seu sistema web de agendamentos
2. Crie um novo agendamento
3. Verifique nos logs do Zeabur:

```
🆕🆕🆕 NOVO AGENDAMENTO DETECTADO! 🆕🆕🆕
ID: 123
Status: pendente
📤 Iniciando envio de confirmação...
✅ Confirmação enviada automaticamente!
```

---

## 🔄 Passo 8: Configurar Auto-Deploy (CI/CD)

O Zeabur já configura auto-deploy por padrão!

### 8.1 Como Funciona

- ✅ Cada push na branch `main` dispara deploy automático
- ✅ Build é feito usando o Dockerfile
- ✅ Variáveis de ambiente são mantidas
- ✅ Volume persistente é preservado

### 8.2 Testar Auto-Deploy

```bash
# Fazer uma alteração
echo "# Teste" >> README.md
git add .
git commit -m "test: auto-deploy"
git push origin main
```

Acompanhe o deploy nos logs do Zeabur.

---

## 📊 Passo 9: Monitoramento

### 9.1 Logs em Tempo Real

No dashboard do Zeabur:
- **Logs** - Ver logs em tempo real
- **Metrics** - CPU, memória, rede
- **Events** - Histórico de deploys

### 9.2 Logs Importantes

Fique atento a:

```
✅ WhatsApp conectado!
📡 Iniciando Polling (Produção)...
⏰ Iniciando sistema de lembretes...
🤖 Bot pronto! Aguardando eventos...
```

### 9.3 Alertas de Erro

Se ver estes erros:

```
❌ WhatsApp não conectado
❌ Erro ao buscar novos agendamentos
❌ Erro ao enviar confirmação
```

Verifique:
1. Volume persistente está montado?
2. Variáveis de ambiente corretas?
3. WhatsApp ainda está pareado?

---

## 🛠️ Troubleshooting

### Problema: QR Code não aparece

**Solução:**
1. Vá em **Volumes** e delete o volume `whatsapp-auth`
2. Recrie o volume
3. Restart o serviço
4. Novo QR Code será gerado

### Problema: Bot desconecta constantemente

**Solução:**
1. Verifique se o volume está montado corretamente
2. Path deve ser exatamente: `/app/auth_info`
3. Verifique logs para erros de permissão

### Problema: Mensagens não são enviadas

**Solução:**
1. Verifique conexão com Supabase: `SUPABASE_URL` e `SUPABASE_KEY`
2. Teste endpoint: `https://seu-servico.zeabur.app/health`
3. Verifique se Realtime está ativo no Supabase (ou use Polling)

### Problema: Lembretes não funcionam

**Solução:**
1. Verifique horários: `HORARIO_INICIO_LEMBRETES` e `HORARIO_FIM_LEMBRETES`
2. Cron jobs rodam a cada 30 minutos
3. Verifique fuso horário do servidor

---

## 💰 Custos Estimados

### Plano Free (Hobby)
- ✅ 1 projeto
- ✅ Até 3 serviços
- ✅ 5GB armazenamento
- ✅ Domínio gratuito
- ⚠️ Pode hibernar após inatividade

### Plano Developer ($5/mês)
- ✅ Projetos ilimitados
- ✅ Serviços ilimitados
- ✅ Sem hibernação
- ✅ Melhor performance

**Recomendação:** Comece com Free, upgrade se necessário.

---

## 📝 Checklist Final

Antes de considerar o deploy completo:

- [ ] ✅ Repositório no GitHub
- [ ] ✅ Projeto criado no Zeabur
- [ ] ✅ Variáveis de ambiente configuradas
- [ ] ✅ Volume persistente montado em `/app/auth_info`
- [ ] ✅ Porta 8080 exposta (HTTP)
- [ ] ✅ Domínio gerado e acessível
- [ ] ✅ WhatsApp pareado (QR Code escaneado)
- [ ] ✅ Health check respondendo
- [ ] ✅ Teste de agendamento funcionando
- [ ] ✅ Logs sem erros críticos

---

## 🎯 Próximos Passos

1. **Monitorar por 24h** - Verifique estabilidade
2. **Testar todos os cenários**:
   - Novo agendamento → Confirmação
   - Cancelamento → Notificação
   - Lembrete 1h antes
3. **Configurar backup** (opcional):
   - Backup do volume `whatsapp-auth`
   - Backup do banco Supabase
4. **Documentar** - Anote credenciais e configurações

---

## 📞 Suporte

- **Documentação Zeabur**: https://zeabur.com/docs
- **Discord Zeabur**: https://discord.gg/zeabur
- **GitHub Issues**: Abra issue no repositório

---

## 🎉 Deploy Concluído!

Seu bot WhatsApp está rodando no Zeabur com:
- ✅ Deploy automático via GitHub
- ✅ Armazenamento persistente
- ✅ Monitoramento em tempo real
- ✅ Escalabilidade automática
- ✅ HTTPS gratuito

**Bom trabalho! 🚀**
