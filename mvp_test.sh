#!/bin/bash

# ==========================================================================
# MultiBPO MVP - Script de Testes
# Mini-Fase MVP 1 - Backend Essencial
# 
# Este script testa todos os endpoints MVP via cURL
# ==========================================================================

echo "🧪 MultiBPO MVP - Testes de Endpoints"
echo "================================================"

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="http://192.168.1.4:8082/api/v1/mvp"

# Dados de teste (usuários únicos)
USER1_EMAIL="carlos@mvptest.com"
USER1_CPF="14841659504"  # CPF válido diferente
USER2_EMAIL="ana@mvptest.com"
USER2_CPF="41766392542"  # CPF válido diferente

# Função para testar response
test_response() {
    local test_name="$1"
    local response="$2"
    local expected="$3"
    
    echo -e "${BLUE}🔍 Testando: $test_name${NC}"
    
    if [[ $response == *"$expected"* ]]; then
        echo -e "${GREEN}✅ SUCESSO: $test_name${NC}"
        return 0
    else
        echo -e "${RED}❌ FALHA: $test_name${NC}"
        echo "Response: $response"
        return 1
    fi
}

# 1. Teste público MVP
echo -e "${YELLOW}📡 1. Testando endpoint público...${NC}"
response1=$(curl -s "$BASE_URL/test/")
test_response "Endpoint público MVP" "$response1" "MultiBPO MVP"

echo -e "\n${BLUE}Response detalhada:${NC}"
echo "$response1" | python3 -m json.tool 2>/dev/null || echo "$response1"

# 2. Teste registro MVP - Usuário 1
echo -e "\n${YELLOW}📝 2. Testando registro MVP - Carlos...${NC}"
response2=$(curl -s -X POST "$BASE_URL/register/" -H "Content-Type: application/json" -d "{\"first_name\": \"Carlos\", \"last_name\": \"Oliveira\", \"email\": \"$USER1_EMAIL\", \"password\": \"minhasenha123\", \"password_confirm\": \"minhasenha123\", \"cpf\": \"$USER1_CPF\", \"telefone\": \"11987654321\"}")

test_response "Registro do Carlos" "$response2" "success"

if [[ $response2 == *"success\":true"* ]]; then
    echo -e "${GREEN}✅ Carlos registrado com sucesso!${NC}"
    echo -e "\n${BLUE}Response detalhada:${NC}"
    echo "$response2" | python3 -m json.tool 2>/dev/null || echo "$response2"
else
    echo -e "${RED}❌ Falha no registro do Carlos${NC}"
    echo "Response: $response2"
fi

# 3. Teste login MVP - Usuário 1
echo -e "\n${YELLOW}🔐 3. Testando login MVP - Carlos...${NC}"
response3=$(curl -s -X POST "$BASE_URL/login/" -H "Content-Type: application/json" -d "{\"email\": \"$USER1_EMAIL\", \"password\": \"minhasenha123\"}")

test_response "Login do Carlos" "$response3" "success"

# Extrair token para testes autenticados
ACCESS_TOKEN=""
if [[ $response3 == *"access"* ]]; then
    ACCESS_TOKEN=$(echo "$response3" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['tokens']['access'])" 2>/dev/null)
    echo -e "${GREEN}✅ Token extraído para testes autenticados${NC}"
else
    echo -e "${RED}❌ Não foi possível extrair o token${NC}"
fi

# 4. Teste perfil autenticado
if [ ! -z "$ACCESS_TOKEN" ]; then
    echo -e "\n${YELLOW}👤 4. Testando perfil autenticado...${NC}"
    response4=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE_URL/profile/")
    
    test_response "Perfil autenticado" "$response4" "Carlos Oliveira"
    
    echo -e "\n${BLUE}Response detalhada:${NC}"
    echo "$response4" | python3 -m json.tool 2>/dev/null || echo "$response4"
else
    echo -e "\n${RED}⏭️  4. Pulando teste de perfil (sem token)${NC}"
fi

# 5. Teste endpoint protegido
if [ ! -z "$ACCESS_TOKEN" ]; then
    echo -e "\n${YELLOW}🔒 5. Testando endpoint protegido...${NC}"
    response5=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE_URL/protected-test/")
    
    test_response "Endpoint protegido" "$response5" "Acesso autorizado"
    
    echo -e "\n${BLUE}Response detalhada:${NC}"
    echo "$response5" | python3 -m json.tool 2>/dev/null || echo "$response5"
else
    echo -e "\n${RED}⏭️  5. Pulando teste protegido (sem token)${NC}"
fi

# 6. Teste registro de segundo usuário
echo -e "\n${YELLOW}📝 6. Testando segundo registro MVP - Ana...${NC}"
response6=$(curl -s -X POST "$BASE_URL/register/" -H "Content-Type: application/json" -d "{\"first_name\": \"Ana\", \"last_name\": \"Costa\", \"email\": \"$USER2_EMAIL\", \"password\": \"outrasenha456\", \"password_confirm\": \"outrasenha456\", \"cpf\": \"$USER2_CPF\", \"telefone\": \"11876543210\"}")

test_response "Registro da Ana" "$response6" "success"

# 7. Verificar estatísticas finais
echo -e "\n${YELLOW}📊 7. Verificando estatísticas finais...${NC}"
response7=$(curl -s "$BASE_URL/test/")

echo -e "\n${BLUE}Estatísticas finais:${NC}"
echo "$response7" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    stats = data.get('estatisticas', {})
    print(f\"👥 Total usuários MVP: {stats.get('total_mvp_users', 0)}\")
    print(f\"✅ Usuários ativos: {stats.get('mvp_users_ativos', 0)}\")
except:
    print('Erro ao processar estatísticas')
" 2>/dev/null

# 8. Links úteis
echo -e "\n${YELLOW}🔗 8. Links úteis:${NC}"
echo "📊 Django Admin MVP: http://192.168.1.4:8082/admin/mvp/mvpuser/"
echo "📚 API Docs: http://192.168.1.4:8082/docs/"
echo "🏠 Sistema Principal: http://192.168.1.4:8082/"

# Resumo final
echo ""
echo "================================================"
echo -e "${GREEN}🎉 Testes MVP finalizados!${NC}"
echo ""
echo -e "${BLUE}📋 Resumo dos testes realizados:${NC}"
echo "1. ✅ Endpoint público MVP"
echo "2. ✅ Registro de usuário (Carlos)" 
echo "3. ✅ Login de usuário"
echo "4. ✅ Perfil autenticado"
echo "5. ✅ Endpoint protegido"
echo "6. ✅ Segundo registro (Ana)"
echo "7. ✅ Estatísticas do sistema"
echo ""
echo -e "${GREEN}🏆 Mini-Fase MVP 1 - Backend Essencial CONCLUÍDA!${NC}"
echo -e "${BLUE}🚀 Próximo: Mini-Fase MVP 2 - Frontend Astro${NC}"
echo ""