"""
URLs MVP - MultiBPO
Mini-Fase MVP 1 - Backend Essencial

Roteamento das views MVP em namespace separado.
NÃO interfere com URLs enterprise existentes.
"""

from django.urls import path
from . import views

app_name = 'mvp'

urlpatterns = [
    # ========== ENDPOINTS PRINCIPAIS MVP ==========
    
    # Registro de usuário MVP (5 campos simplificados)
    path('register/', views.MVPRegisterView.as_view(), name='mvp-register'),
    
    # Login MVP (email + senha)
    path('login/', views.MVPLoginView.as_view(), name='mvp-login'),
    
    # Perfil do usuário MVP autenticado
    path('profile/', views.MVPProfileView.as_view(), name='mvp-profile'),
    
    # Logout seguro MVP
    path('logout/', views.mvp_logout_view, name='mvp-logout'),
    
    # ========== ENDPOINTS DE TESTE MVP ==========
    
    # Teste público do sistema MVP
    path('test/', views.mvp_test_view, name='mvp-test'),
    
    # Teste protegido (requer JWT)
    path('protected-test/', views.mvp_protected_test_view, name='mvp-protected-test'),
]

# ========== MAPEAMENTO DE ENDPOINTS RESULTANTES ==========
"""
URLs disponíveis após implementação:

PRINCIPAIS MVP:
- POST /api/v1/mvp/register/         # MVPRegisterView (cadastro 5 campos)
- POST /api/v1/mvp/login/            # MVPLoginView (email + senha)
- GET  /api/v1/mvp/profile/          # MVPProfileView (perfil protegido)
- POST /api/v1/mvp/logout/           # mvp_logout_view (logout seguro)

TESTES MVP:
- GET  /api/v1/mvp/test/             # mvp_test_view (teste público)
- GET  /api/v1/mvp/protected-test/   # mvp_protected_test_view (teste JWT)

NAMESPACE: 'mvp'
- Todas as views ficam isoladas do sistema enterprise
- URLs reversíveis: reverse('mvp:mvp-register'), etc.
- Coexiste com /api/v1/auth/ (sistema complexo)
"""

# ========== FLUXO MVP SUPORTADO ==========
"""
Fluxo completo do usuário MVP:

1. POST /api/v1/mvp/register/     # Cadastro com 5 campos
   Payload: {
     "first_name": "João",
     "last_name": "Silva", 
     "email": "joao@email.com",
     "password": "senha123",
     "password_confirm": "senha123",
     "cpf": "12345678901",
     "telefone": "11999999999"
   }
   Response: user data + JWT tokens

2. POST /api/v1/mvp/login/        # Login simples
   Payload: {
     "email": "joao@email.com",
     "password": "senha123"
   }
   Response: user data + JWT tokens

3. GET /api/v1/mvp/profile/       # Perfil (com Authorization header)
   Headers: Authorization: Bearer <access_token>
   Response: dados completos do perfil

4. POST /api/v1/mvp/logout/       # Logout seguro
   Payload: {
     "refresh_token": "<refresh_token>"
   }
   Response: confirmação logout

TESTES:
- GET /api/v1/mvp/test/           # Status sistema MVP
- GET /api/v1/mvp/protected-test/ # Teste autenticação JWT
"""