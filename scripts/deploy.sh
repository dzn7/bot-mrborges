#!/bin/bash

# Script de Deploy para Cloud Run
# Mr.Borges WhatsApp Bot

set -e

echo "🚀 Deploy Barbearia Bot para Cloud Run"
echo "========================================"
echo ""

# Verificar se gcloud está instalado
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud SDK não encontrado"
    echo "   Instale: brew install google-cloud-sdk"
    exit 1
fi

# Verificar se está autenticado
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo "❌ Não autenticado no Google Cloud"
    echo "   Execute: gcloud auth login"
    exit 1
fi

# Solicitar informações
read -p "📝 Project ID do Google Cloud: " PROJECT_ID
read -p "📝 Nome do bucket (ex: barbearia-bot-auth): " BUCKET_NAME
read -p "📝 Região (padrão: us-central1): " REGION
REGION=${REGION:-us-central1}

echo ""
echo "📋 Configuração:"
echo "   Project: $PROJECT_ID"
echo "   Bucket: $BUCKET_NAME"
echo "   Região: $REGION"
echo ""
read -p "Continuar? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deploy cancelado"
    exit 1
fi

# Configurar projeto
echo "⚙️ Configurando projeto..."
gcloud config set project $PROJECT_ID

# Criar bucket se não existir
echo "📦 Verificando bucket..."
if ! gsutil ls gs://$BUCKET_NAME &> /dev/null; then
    echo "   Criando bucket $BUCKET_NAME..."
    gsutil mb -l $REGION gs://$BUCKET_NAME
    echo "   ✅ Bucket criado"
else
    echo "   ✅ Bucket já existe"
fi

# Solicitar variáveis de ambiente
echo ""
echo "🔐 Configurar variáveis de ambiente:"
read -p "SUPABASE_URL: " SUPABASE_URL
read -p "SUPABASE_KEY: " SUPABASE_KEY

# Build e Deploy
echo ""
echo "🏗️ Fazendo build e deploy..."
gcloud run deploy barbearia-bot \
  --source . \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --min-instances=1 \
  --max-instances=1 \
  --memory=512Mi \
  --cpu=1 \
  --timeout=3600 \
  --set-env-vars="SUPABASE_URL=$SUPABASE_URL,SUPABASE_KEY=$SUPABASE_KEY,GCS_BUCKET_NAME=$BUCKET_NAME,NODE_ENV=production,PORT=8080"

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "📱 Próximos passos:"
echo "   1. Conectar WhatsApp localmente primeiro"
echo "   2. Fazer upload da sessão: gsutil -m cp -r ./auth_info/* gs://$BUCKET_NAME/auth_info/"
echo "   3. Reiniciar serviço: gcloud run services update barbearia-bot --region=$REGION"
echo ""
echo "🔗 URL do serviço:"
gcloud run services describe barbearia-bot --region=$REGION --format='value(status.url)'
echo ""
