"""
URLs principais do MultiBPO - VERSÃO CORRIGIDA
Sub-Fase 2.2.3 - Problema de namespace duplicado resolvido
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

def health_check(request):
    """Health check endpoint para monitoramento"""
    return HttpResponse("MultiBPO OK", content_type="text/plain")

urlpatterns = [
    # Django Admin
    path('admin/', admin.site.urls),
    
    # Health Check (manter da Fase 1)
    path('health/', health_check, name='health_check'),
    
    # ========== API v1 Routes ==========
    
    # Autenticação completa
    path('api/v1/auth/', include('apps.authentication.urls')),
    
    # Contadores (dados e perfis)
    path('api/v1/contadores/', include('apps.contadores.urls')),
    
    # Receita Federal (consultas governamentais)
    path('api/v1/receita/', include('apps.receita.urls')),

    path('api/v1/mvp/', include('apps.mvp.urls')),  # ← NOVO: URLs MVP
    
    # ========== JWT Token endpoints (SimpleJWT) ==========
    path('api/v1/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/v1/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

# Static files
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Debug Toolbar URLs
if settings.DEBUG:
    try:
        import debug_toolbar
        urlpatterns = [
            path('__debug__/', include(debug_toolbar.urls)),
        ] + urlpatterns
    except ImportError:
        # Debug toolbar não instalado - ignora silenciosamente
        pass

# ========== ESTRUTURA DE URLs RESULTANTE ==========
"""
APIs disponíveis após correção:

AUTENTICAÇÃO:
- POST /api/v1/auth/register/              # Registro completo original
- POST /api/v1/auth/register-service/      # Registro BPO simplificado
- POST /api/v1/auth/login/                 # Login flexível
- GET  /api/v1/auth/profile/               # Perfil contador
- POST /api/v1/auth/logout/                # Logout seguro
- POST /api/v1/auth/validate/document/     # Validação CPF/CNPJ

RECEITA FEDERAL:
- GET  /api/v1/receita/health/             # Health check serviços RF
- GET  /api/v1/receita/cnpj/{cnpj}/        # Consulta CNPJ na RF

CONTADORES:
- GET  /api/v1/contadores/test/            # Teste (placeholder)

JWT TOKENS:
- POST /api/v1/token/                      # Obter tokens JWT
- POST /api/v1/token/refresh/              # Renovar tokens

OBSERVAÇÃO:
- Removido namespace duplicado que causava erro
- Validação de documentos agora disponível apenas em: /api/v1/auth/validate/document/
- Sistema agora deve inicializar sem erros
"""