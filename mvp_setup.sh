#!/bin/bash

# ==========================================================================
# MultiBPO MVP - Script de Setup
# Mini-Fase MVP 1 - Backend Essencial
# 
# Este script configura e valida o app MVP no container Django
# ==========================================================================

echo "🚀 MultiBPO MVP - Iniciando Setup..."
echo "================================================"

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Entrar no container
echo -e "${BLUE}📦 Entrando no container Docker...${NC}"
docker exec -it multibpo_backend bash -c "

    echo '🔧 Executando comandos dentro do container...'
    echo '============================================='

    # 2. Criar migrações para o app MVP
    echo -e '${YELLOW}📝 Criando migrações MVP...${NC}'
    python manage.py makemigrations mvp
    
    if [ \$? -eq 0 ]; then
        echo -e '${GREEN}✅ Migrações MVP criadas com sucesso!${NC}'
    else
        echo -e '${RED}❌ Erro ao criar migrações MVP${NC}'
        exit 1
    fi

    # 3. Aplicar migrações
    echo -e '${YELLOW}🔄 Aplicando migrações...${NC}'
    python manage.py migrate
    
    if [ \$? -eq 0 ]; then
        echo -e '${GREEN}✅ Migrações aplicadas com sucesso!${NC}'
    else
        echo -e '${RED}❌ Erro ao aplicar migrações${NC}'
        exit 1
    fi

    # 4. Verificar se app foi registrado corretamente
    echo -e '${YELLOW}🔍 Verificando registro do app...${NC}'
    python manage.py check
    
    if [ \$? -eq 0 ]; then
        echo -e '${GREEN}✅ App MVP registrado corretamente!${NC}'
    else
        echo -e '${RED}❌ Erro no registro do app MVP${NC}'
        exit 1
    fi

    # 5. Executar testes MVP
    echo -e '${YELLOW}🧪 Executando testes MVP...${NC}'
    python manage.py test apps.mvp
    
    if [ \$? -eq 0 ]; then
        echo -e '${GREEN}✅ Todos os testes MVP passaram!${NC}'
    else
        echo -e '${RED}❌ Alguns testes MVP falharam${NC}'
        exit 1
    fi

    # 6. Verificar URLs MVP
    echo -e '${YELLOW}🌐 Verificando URLs MVP...${NC}'
    echo 'URLs MVP disponíveis:'
    python manage.py show_urls | grep mvp
    
    if [ \$? -eq 0 ]; then
        echo -e '${GREEN}✅ URLs MVP configuradas!${NC}'
    else
        echo -e '${RED}❌ Erro nas URLs MVP${NC}'
    fi

    echo '================================================'
    echo -e '${GREEN}🎉 Setup MVP concluído com sucesso!${NC}'
    echo '================================================'
"

# 7. Testar endpoint básico (fora do container)
echo -e "${BLUE}🌐 Testando endpoint MVP básico...${NC}"
response=$(curl -s http://192.168.1.4:8082/api/v1/mvp/test/)

if [[ $response == *"MultiBPO MVP"* ]]; then
    echo -e "${GREEN}✅ Endpoint MVP funcionando!${NC}"
    echo "Response: $response"
else
    echo -e "${RED}❌ Endpoint MVP não está funcionando${NC}"
    echo "Response: $response"
fi

echo ""
echo -e "${GREEN}🏆 Setup MVP finalizado!${NC}"
echo -e "${BLUE}📋 Próximo passo: Execute mvp_test.sh para testar funcionalidades${NC}"
echo ""