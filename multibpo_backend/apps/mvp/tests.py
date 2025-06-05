"""
Tests MVP - MultiBPO (CORRIGIDO)
Mini-Fase MVP 1 - Backend Essencial

Testes unitários para views, serializers e models MVP.
CORREÇÃO: CPFs válidos e outros ajustes.
"""

from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
import json

from .models import MVPUser
from .serializers import MVPRegisterSerializer, MVPLoginSerializer, MVPProfileSerializer


class MVPUserModelTest(TestCase):
    """
    Testes para o model MVPUser
    """
    
    def setUp(self):
        """
        Configuração inicial para testes
        """
        self.user_data = {
            'username': 'testuser',
            'email': 'test@email.com',
            'password': 'testpass123',
            'first_name': 'João',
            'last_name': 'Silva'
        }
        
        self.mvp_data = {
            'cpf': '11144477735',  # ← CORRIGIDO: CPF válido
            'telefone': '11999999999'
        }
    
    def test_create_mvp_user_success(self):
        """
        Teste criação bem-sucedida de MVPUser
        """
        mvp_user = MVPUser.create_mvp_user(
            username=self.user_data['username'],
            email=self.user_data['email'],
            password=self.user_data['password'],
            first_name=self.user_data['first_name'],
            last_name=self.user_data['last_name'],
            cpf=self.mvp_data['cpf'],
            telefone=self.mvp_data['telefone']
        )
        
        # Verificar criação
        self.assertIsNotNone(mvp_user.id)
        self.assertEqual(mvp_user.cpf, '111.444.777-35')  # Formatação automática
        self.assertEqual(mvp_user.nome_completo, 'João Silva')
        self.assertTrue(mvp_user.esta_ativo)
        
        # Verificar User relacionado
        self.assertEqual(mvp_user.user.email, 'test@email.com')
        self.assertTrue(mvp_user.user.check_password('testpass123'))
    
    def test_cpf_validation(self):
        """
        Teste validação de CPF
        """
        # CPF inválido deve falhar
        with self.assertRaises(Exception):
            MVPUser.create_mvp_user(
                username='testuser2',
                email='test2@email.com',
                password='testpass123',
                first_name='Maria',
                last_name='Santos',
                cpf='12345678900',  # CPF inválido
                telefone='11999999999'
            )
    
    def test_unique_cpf(self):
        """
        Teste unicidade do CPF
        """
        # Criar primeiro usuário
        MVPUser.create_mvp_user(
            username='user1',
            email='user1@email.com',
            password='pass123',
            first_name='User',
            last_name='One',
            cpf='11144477735',  # ← CORRIGIDO: CPF válido
            telefone='11111111111'
        )
        
        # Tentar criar segundo usuário com mesmo CPF deve falhar
        with self.assertRaises(Exception):
            MVPUser.create_mvp_user(
                username='user2',
                email='user2@email.com',
                password='pass123',
                first_name='User',
                last_name='Two',
                cpf='11144477735',  # ← CORRIGIDO: Mesmo CPF válido
                telefone='22222222222'
            )


class MVPSerializersTest(TestCase):
    """
    Testes para serializers MVP
    """
    
    def setUp(self):
        """
        Configuração inicial
        """
        self.valid_register_data = {
            'first_name': 'João',
            'last_name': 'Silva',
            'email': 'joao@email.com',
            'password': 'senha123456',
            'password_confirm': 'senha123456',
            'cpf': '11144477735',  # ← CORRIGIDO: CPF válido
            'telefone': '11999999999'
        }
        
        self.valid_login_data = {
            'email': 'joao@email.com',
            'password': 'senha123456'
        }
    
    def test_register_serializer_valid(self):
        """
        Teste serializer de registro com dados válidos
        """
        serializer = MVPRegisterSerializer(data=self.valid_register_data)
        self.assertTrue(serializer.is_valid())
        
        # Criar usuário
        mvp_user = serializer.save()
        self.assertIsNotNone(mvp_user.id)
        self.assertEqual(mvp_user.email, 'joao@email.com')
    
    def test_register_serializer_password_mismatch(self):
        """
        Teste serializer com senhas diferentes
        """
        data = self.valid_register_data.copy()
        data['password_confirm'] = 'senha_diferente'
        
        serializer = MVPRegisterSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('password_confirm', serializer.errors)
    
    def test_register_serializer_invalid_cpf(self):
        """
        Teste serializer com CPF inválido
        """
        data = self.valid_register_data.copy()
        data['cpf'] = '12345678900'  # CPF inválido
        
        serializer = MVPRegisterSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('cpf', serializer.errors)
    
    def test_register_serializer_duplicate_email(self):
        """
        Teste serializer com email duplicado
        """
        # Criar primeiro usuário
        serializer1 = MVPRegisterSerializer(data=self.valid_register_data)
        self.assertTrue(serializer1.is_valid())
        serializer1.save()
        
        # Tentar criar segundo com mesmo email
        data = self.valid_register_data.copy()
        data['cpf'] = '52998224725'  # ← CORRIGIDO: CPF válido diferente
        
        serializer2 = MVPRegisterSerializer(data=data)
        self.assertFalse(serializer2.is_valid())
        self.assertIn('email', serializer2.errors)
    
    def test_login_serializer_valid(self):
        """
        Teste serializer de login com dados válidos
        """
        # Criar usuário primeiro
        register_serializer = MVPRegisterSerializer(data=self.valid_register_data)
        self.assertTrue(register_serializer.is_valid())
        register_serializer.save()
        
        # Testar login
        login_serializer = MVPLoginSerializer(data=self.valid_login_data)
        self.assertTrue(login_serializer.is_valid())
        
        user_data = login_serializer.get_user_data()
        self.assertIsNotNone(user_data)
        self.assertEqual(user_data['email'], 'joao@email.com')
    
    def test_login_serializer_invalid_email(self):
        """
        Teste login com email inexistente
        """
        serializer = MVPLoginSerializer(data=self.valid_login_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)
    
    def test_login_serializer_wrong_password(self):
        """
        Teste login com senha incorreta
        """
        # Criar usuário primeiro
        register_serializer = MVPRegisterSerializer(data=self.valid_register_data)
        self.assertTrue(register_serializer.is_valid())
        register_serializer.save()
        
        # Testar login com senha errada
        data = self.valid_login_data.copy()
        data['password'] = 'senha_errada'
        
        serializer = MVPLoginSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('password', serializer.errors)


class MVPViewsTest(APITestCase):
    """
    Testes para views MVP
    """
    
    def setUp(self):
        """
        Configuração inicial para testes de API
        """
        self.client = APIClient()
        
        self.register_data = {
            'first_name': 'João',
            'last_name': 'Silva',
            'email': 'joao@email.com',
            'password': 'senha123456',
            'password_confirm': 'senha123456',
            'cpf': '11144477735',  # ← CORRIGIDO: CPF válido
            'telefone': '11999999999'
        }
        
        self.login_data = {
            'email': 'joao@email.com',
            'password': 'senha123456'
        }
    
    def test_register_view_success(self):
        """
        Teste endpoint de registro bem-sucedido
        """
        url = reverse('mvp:mvp-register')
        response = self.client.post(url, self.register_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertIn('tokens', response.data)
        self.assertIn('user', response.data)
        
        # Verificar se usuário foi criado
        self.assertTrue(MVPUser.objects.filter(cpf='111.444.777-35').exists())
    
    def test_register_view_invalid_data(self):
        """
        Teste endpoint de registro com dados inválidos
        """
        url = reverse('mvp:mvp-register')
        invalid_data = self.register_data.copy()
        invalid_data['cpf'] = '123'  # CPF inválido
        
        response = self.client.post(url, invalid_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertIn('errors', response.data)
    
    def test_login_view_success(self):
        """
        Teste endpoint de login bem-sucedido
        """
        # Registrar usuário primeiro
        register_url = reverse('mvp:mvp-register')
        register_response = self.client.post(register_url, self.register_data, format='json')
        
        # Verificar se registro foi bem-sucedido
        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)
        
        # Fazer login
        login_url = reverse('mvp:mvp-login')
        response = self.client.post(login_url, self.login_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIn('tokens', response.data)
        self.assertIn('user', response.data)
    
    def test_login_view_invalid_credentials(self):
        """
        Teste login com credenciais inválidas
        """
        url = reverse('mvp:mvp-login')
        response = self.client.post(url, self.login_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
    
    def test_profile_view_authenticated(self):
        """
        Teste endpoint de perfil com usuário autenticado
        """
        # Registrar e fazer login
        register_url = reverse('mvp:mvp-register')
        register_response = self.client.post(register_url, self.register_data, format='json')
        
        # Verificar se registro foi bem-sucedido
        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', register_response.data)
        
        # Pegar token
        access_token = register_response.data['tokens']['access']
        
        # Acessar perfil
        profile_url = reverse('mvp:mvp-profile')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = self.client.get(profile_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['email'], 'joao@email.com')
    
    def test_profile_view_unauthenticated(self):
        """
        Teste endpoint de perfil sem autenticação
        """
        url = reverse('mvp:mvp-profile')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_logout_view_success(self):
        """
        Teste endpoint de logout bem-sucedido
        """
        # Registrar usuário
        register_url = reverse('mvp:mvp-register')
        register_response = self.client.post(register_url, self.register_data, format='json')
        
        # Verificar se registro foi bem-sucedido
        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', register_response.data)
        
        # Pegar tokens
        access_token = register_response.data['tokens']['access']
        refresh_token = register_response.data['tokens']['refresh']
        
        # Fazer logout
        logout_url = reverse('mvp:mvp-logout')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = self.client.post(logout_url, {
            'refresh_token': refresh_token
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
    
    def test_test_view_public(self):
        """
        Teste endpoint de teste público
        """
        url = reverse('mvp:mvp-test')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['sistema'], 'MultiBPO MVP')
        self.assertEqual(response.data['status'], 'FUNCIONANDO')
        self.assertTrue(response.data['mvp_ready'])
    
    def test_protected_test_view_authenticated(self):
        """
        Teste endpoint de teste protegido com autenticação
        """
        # Registrar usuário
        register_url = reverse('mvp:mvp-register')
        register_response = self.client.post(register_url, self.register_data, format='json')
        
        # Verificar se registro foi bem-sucedido
        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', register_response.data)
        
        # Pegar token
        access_token = register_response.data['tokens']['access']
        
        # Acessar teste protegido
        protected_url = reverse('mvp:mvp-protected-test')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = self.client.get(protected_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('mvp_info', response.data)
        self.assertEqual(response.data['user_info']['email'], 'joao@email.com')
    
    def test_protected_test_view_unauthenticated(self):
        """
        Teste endpoint de teste protegido sem autenticação
        """
        url = reverse('mvp:mvp-protected-test')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class MVPIntegrationTest(APITestCase):
    """
    Testes de integração end-to-end MVP
    """
    
    def test_complete_user_flow(self):
        """
        Teste fluxo completo: registro → login → perfil → logout
        """
        client = APIClient()
        
        # 1. Registro
        register_data = {
            'first_name': 'Maria',
            'last_name': 'Santos',
            'email': 'maria@email.com',
            'password': 'senha123456',
            'password_confirm': 'senha123456',
            'cpf': '52998224725',  # ← CORRIGIDO: CPF válido diferente
            'telefone': '11888888888'
        }
        
        register_url = reverse('mvp:mvp-register')
        register_response = client.post(register_url, register_data, format='json')
        
        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(register_response.data['success'])
        
        # 2. Login
        login_data = {
            'email': 'maria@email.com',
            'password': 'senha123456'
        }
        
        login_url = reverse('mvp:mvp-login')
        login_response = client.post(login_url, login_data, format='json')
        
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertTrue(login_response.data['success'])
        
        access_token = login_response.data['tokens']['access']
        refresh_token = login_response.data['tokens']['refresh']
        
        # 3. Perfil
        profile_url = reverse('mvp:mvp-profile')
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        profile_response = client.get(profile_url)
        
        self.assertEqual(profile_response.status_code, status.HTTP_200_OK)
        self.assertTrue(profile_response.data['success'])
        self.assertEqual(profile_response.data['user']['email'], 'maria@email.com')
        
        # 4. Logout
        logout_url = reverse('mvp:mvp-logout')
        logout_response = client.post(logout_url, {
            'refresh_token': refresh_token
        }, format='json')
        
        self.assertEqual(logout_response.status_code, status.HTTP_200_OK)
        self.assertTrue(logout_response.data['success'])
        
        # 5. Verificar que não consegue mais acessar perfil com token antigo
        profile_response_after_logout = client.get(profile_url)
        # Nota: token ainda pode funcionar até expirar, mas refresh foi invalidado