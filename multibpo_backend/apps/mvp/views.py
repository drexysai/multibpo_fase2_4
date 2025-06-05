"""
Views MVP - MultiBPO
Mini-Fase MVP 1 - Backend Essencial

Views simplificadas para MVP com funcionalidades essenciais.
NÃO interfere com views enterprise existentes.
"""

import logging
from django.utils import timezone
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import MVPUser
from .serializers import (
    MVPRegisterSerializer,
    MVPLoginSerializer,
    MVPProfileSerializer
)

logger = logging.getLogger(__name__)


class MVPTokenUtils:
    """
    Utilitários para geração de tokens JWT MVP
    """
    
    @staticmethod
    def create_tokens_for_user(user):
        """
        Criar tokens JWT para usuário
        """
        refresh = RefreshToken.for_user(user)
        access = refresh.access_token
        
        # Adicionar claims customizados MVP
        refresh['sistema'] = 'MultiBPO MVP'
        refresh['versao'] = '1.0'
        refresh['tipo_conta'] = 'mvp'
        
        access['sistema'] = 'MultiBPO MVP'
        access['versao'] = '1.0'
        access['tipo_conta'] = 'mvp'
        
        return {
            'access': str(access),
            'refresh': str(refresh),
            'access_expires_in': int(access.lifetime.total_seconds()),
            'refresh_expires_in': int(refresh.lifetime.total_seconds()),
        }


class MVPRegisterView(APIView):
    """
    View para registro de usuários MVP
    
    POST /api/v1/mvp/register/
    
    Funcionalidades:
    - Cadastro simplificado (5 campos)
    - Validação brasileira (CPF)
    - Criação atômica User + MVPUser
    - Geração automática de JWT tokens
    - Response com dados completos
    """
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Registrar novo usuário MVP
        
        Payload:
        {
            "first_name": "João",
            "last_name": "Silva",
            "email": "joao@email.com",
            "password": "senha123",
            "password_confirm": "senha123",
            "cpf": "11144477735",
            "telefone": "11999999999"
        }
        
        Returns:
            201: Usuário criado + JWT tokens
            400: Erro de validação
        """
        
        serializer = MVPRegisterSerializer(data=request.data)
        
        if not serializer.is_valid():
            logger.warning(f"Registro MVP inválido: {serializer.errors}")
            return Response({
                'success': False,
                'message': 'Dados de registro inválidos.',
                'errors': serializer.errors,
                'error_code': 'VALIDATION_ERROR'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Criar usuário MVP
            mvp_user = serializer.save()
            
            # Gerar tokens JWT
            tokens = MVPTokenUtils.create_tokens_for_user(mvp_user.user)
            
            # Log de sucesso
            logger.info(f"Usuário MVP registrado: {mvp_user.email}")
            
            # Response com dados + tokens
            response_data = {
                'success': True,
                'message': f'Conta criada com sucesso para {mvp_user.nome_completo}!',
                'user': serializer.to_representation(mvp_user),
                'tokens': tokens,
                'sistema': 'MultiBPO MVP',
                'versao': '1.0',
                'registered_at': timezone.now().isoformat(),
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            # Erro inesperado
            logger.error(f"Erro no registro MVP: {e}", exc_info=True)
            
            return Response({
                'success': False,
                'message': 'Erro interno no servidor. Tente novamente.',
                'error_code': 'INTERNAL_ERROR'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MVPLoginView(APIView):
    """
    View para autenticação de usuários MVP
    
    POST /api/v1/mvp/login/
    
    Funcionalidades:
    - Login via email + senha
    - Validação de credenciais
    - Geração de JWT tokens
    - Response com dados do usuário
    - Atualização automática do last_login
    """
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Autenticar usuário MVP
        
        Payload:
        {
            "email": "joao@email.com",
            "password": "senha123"
        }
        
        Returns:
            200: Login realizado + JWT tokens
            400: Dados inválidos
            401: Credenciais incorretas
        """
        
        serializer = MVPLoginSerializer(data=request.data)
        
        if not serializer.is_valid():
            logger.warning(f"Login MVP inválido: {serializer.errors}")
            return Response({
                'success': False,
                'message': 'Dados de login inválidos.',
                'errors': serializer.errors,
                'error_code': 'VALIDATION_ERROR'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Serializer já validou credenciais
            user_data = serializer.get_user_data()
            
            if not user_data:
                return Response({
                    'success': False,
                    'message': 'Erro na autenticação.',
                    'error_code': 'AUTH_ERROR'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            # Gerar tokens JWT
            tokens = MVPTokenUtils.create_tokens_for_user(serializer.validated_user)
            
            # Log de sucesso
            logger.info(f"Login MVP realizado: {user_data['email']}")
            
            # Response com dados + tokens
            response_data = {
                'success': True,
                'message': f'Login realizado com sucesso!',
                'user': user_data,
                'tokens': tokens,
                'sistema': 'MultiBPO MVP',
                'versao': '1.0',
                'login_at': timezone.now().isoformat(),
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            # Erro inesperado
            logger.error(f"Erro no login MVP: {e}", exc_info=True)
            
            return Response({
                'success': False,
                'message': 'Erro interno no servidor. Tente novamente.',
                'error_code': 'INTERNAL_ERROR'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MVPProfileView(APIView):
    """
    View para perfil do usuário MVP autenticado
    
    GET /api/v1/mvp/profile/
    
    Funcionalidades:
    - Dados completos do usuário logado
    - Requer autenticação JWT
    - Response com informações de perfil
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Retornar perfil do usuário MVP autenticado
        
        Headers:
        Authorization: Bearer <access_token>
        
        Returns:
            200: Dados do perfil
            401: Token inválido/expirado
            404: Perfil MVP não encontrado
        """
        
        try:
            # Buscar perfil MVP do usuário autenticado
            mvp_user = MVPUser.objects.select_related('user').get(user=request.user)
            
            # Serializar dados
            serializer = MVPProfileSerializer(mvp_user)
            
            # Response com dados completos
            response_data = {
                'success': True,
                'message': 'Perfil carregado com sucesso.',
                'user': serializer.data,
                'sistema': 'MultiBPO MVP',
                'versao': '1.0',
                'profile_retrieved_at': timezone.now().isoformat(),
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except MVPUser.DoesNotExist:
            logger.warning(f"Usuário sem perfil MVP: {request.user.id}")
            
            return Response({
                'success': False,
                'message': 'Perfil MVP não encontrado para este usuário.',
                'error_code': 'PROFILE_NOT_FOUND',
                'user_info': {
                    'user_id': request.user.id,
                    'username': request.user.username,
                    'email': request.user.email,
                }
            }, status=status.HTTP_404_NOT_FOUND)
        
        except Exception as e:
            # Erro inesperado
            logger.error(f"Erro no perfil MVP: {e}", exc_info=True)
            
            return Response({
                'success': False,
                'message': 'Erro interno no servidor.',
                'error_code': 'INTERNAL_ERROR'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mvp_logout_view(request):
    """
    Logout seguro para usuários MVP (sem blacklist)
    """
    try:
        refresh_token = request.data.get('refresh_token')
        
        if refresh_token:
            logger.info(f"Logout MVP: User {request.user.id}")
            
            return Response({
                'success': True,
                'message': 'Logout realizado com sucesso.',
                'sistema': 'MultiBPO MVP',
                'logout_at': timezone.now().isoformat(),
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'message': 'Refresh token é obrigatório para logout.',
                'error_code': 'MISSING_REFRESH_TOKEN'
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f"Erro no logout MVP: {e}")
        return Response({
            'success': False,
            'message': 'Erro no logout.',
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def mvp_test_view(request):
    """
    View de teste para verificar se o sistema MVP está funcionando
    
    GET /api/v1/mvp/test/
    
    Retorna status do sistema MVP e informações de debug
    """
    
    # Estatísticas MVP
    total_mvp_users = MVPUser.objects.count()
    mvp_users_ativos = MVPUser.objects.filter(ativo=True).count()
    
    response_data = {
        'sistema': 'MultiBPO MVP',
        'versao': '1.0',
        'status': 'FUNCIONANDO',
        'mvp_ready': True,
        'endpoints_implementados': [
            'POST /api/v1/mvp/register/',
            'POST /api/v1/mvp/login/',
            'GET /api/v1/mvp/profile/',
            'POST /api/v1/mvp/logout/',
            'GET /api/v1/mvp/test/',
        ],
        'estatisticas': {
            'total_mvp_users': total_mvp_users,
            'mvp_users_ativos': mvp_users_ativos,
        },
        'user_authenticated': request.user.is_authenticated,
        'timestamp': timezone.now().isoformat(),
    }
    
    return Response(response_data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mvp_protected_test_view(request):
    """
    View de teste protegida para verificar autenticação JWT MVP
    
    GET /api/v1/mvp/protected-test/
    
    Requer: Authorization: Bearer <access_token>
    """
    
    try:
        mvp_user = MVPUser.objects.get(user=request.user)
        
        response_data = {
            'message': 'Acesso autorizado ao MVP!',
            'user_info': {
                'user_id': request.user.id,
                'username': request.user.username,
                'email': request.user.email,
                'is_authenticated': True,
            },
            'mvp_info': {
                'mvp_user_id': mvp_user.id,
                'nome_completo': mvp_user.nome_completo,
                'cpf': mvp_user.cpf,
                'ativo': mvp_user.ativo,
            },
            'token_info': {
                'valid': True,
                'tested_at': timezone.now().isoformat(),
            },
            'sistema': 'MultiBPO MVP',
            'versao': '1.0'
        }
        
    except MVPUser.DoesNotExist:
        response_data = {
            'message': 'Usuário autenticado mas sem perfil MVP',
            'user_info': {
                'user_id': request.user.id,
                'username': request.user.username,
                'email': request.user.email,
                'is_authenticated': True,
            },
            'mvp_info': None,
            'warning': 'User sem perfil MVP vinculado'
        }
    
    return Response(response_data, status=status.HTTP_200_OK)