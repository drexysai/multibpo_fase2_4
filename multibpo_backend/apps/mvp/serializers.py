"""
Serializers MVP - MultiBPO
Mini-Fase MVP 1 - Backend Essencial

Serializers simplificados para MVP com apenas campos essenciais.
NÃO interfere com serializers enterprise existentes.
"""

from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.db import transaction
from validate_docbr import CPF
import logging

from .models import MVPUser

logger = logging.getLogger(__name__)


class MVPRegisterSerializer(serializers.Serializer):
    """
    Serializer simplificado para registro MVP
    
    Apenas 5 campos obrigatórios vs 15+ do sistema enterprise:
    - Nome, sobrenome, email, senha, CPF
    
    Cria User Django + MVPUser automaticamente.
    Validações brasileiras essenciais mantidas.
    """
    
    # Dados básicos do usuário
    first_name = serializers.CharField(
        max_length=30,
        help_text="Primeiro nome"
    )
    last_name = serializers.CharField(
        max_length=150,
        help_text="Sobrenome"
    )
    email = serializers.EmailField(
        help_text="Email será usado para login"
    )
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        help_text="Senha deve ter pelo menos 8 caracteres"
    )
    password_confirm = serializers.CharField(
        write_only=True,
        help_text="Confirmação da senha"
    )
    
    # CPF obrigatório para validação brasileira
    cpf = serializers.CharField(
        max_length=14,
        help_text="CPF (com ou sem formatação)"
    )
    
    # Telefone opcional
    telefone = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True,
        help_text="Telefone de contato (opcional)"
    )
    
    def validate_email(self, value):
        """
        Validar se email já existe
        """
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Já existe uma conta com este email.")
        return value.lower().strip()
    
    def validate_cpf(self, value):
        """
        Validar CPF brasileiro
        """
        # Limpar CPF (remover formatação)
        cpf_limpo = ''.join(filter(str.isdigit, value))
        
        # Validar com validate-docbr
        cpf_validator = CPF()
        if not cpf_validator.validate(cpf_limpo):
            raise serializers.ValidationError("CPF inválido. Verifique os números digitados.")
        
        # Verificar se CPF já existe
        cpf_formatado = f"{cpf_limpo[:3]}.{cpf_limpo[3:6]}.{cpf_limpo[6:9]}-{cpf_limpo[9:]}"
        if MVPUser.objects.filter(cpf=cpf_formatado).exists():
            raise serializers.ValidationError("Já existe uma conta com este CPF.")
        
        return cpf_formatado
    
    def validate(self, data):
        """
        Validações gerais
        """
        # Verificar se senhas coincidem
        password = data.get('password')
        password_confirm = data.get('password_confirm')
        
        if password != password_confirm:
            raise serializers.ValidationError({
                'password_confirm': 'As senhas não coincidem.'
            })
        
        return data
    
    @transaction.atomic
    def create(self, validated_data):
        """
        Criar User Django + MVPUser
        
        Operação atômica que garante consistência.
        Se falhar, faz rollback automático.
        """
        try:
            # Remover campos que não vão para User
            password_confirm = validated_data.pop('password_confirm')
            cpf = validated_data.pop('cpf')
            telefone = validated_data.pop('telefone', '')
            
            # Criar username baseado no email
            email = validated_data['email']
            username = email.split('@')[0]
            
            # Garantir username único
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1
            
            # Criar usuário MVP
            mvp_user = MVPUser.create_mvp_user(
                username=username,
                email=validated_data['email'],
                password=validated_data['password'],
                first_name=validated_data['first_name'],
                last_name=validated_data['last_name'],
                cpf=cpf,
                telefone=telefone
            )
            
            logger.info(f"Usuário MVP criado: {mvp_user.email} - CPF: {mvp_user.cpf}")
            
            return mvp_user
            
        except Exception as e:
            logger.error(f"Erro na criação do usuário MVP: {e}")
            raise serializers.ValidationError({
                'non_field_errors': 'Erro interno na criação da conta. Tente novamente.'
            })
    
    def to_representation(self, instance):
        """
        Representação do usuário criado
        """
        return {
            'id': instance.id,
            'nome_completo': instance.nome_completo,
            'email': instance.email,
            'cpf': instance.cpf,
            'telefone': instance.telefone,
            'ativo': instance.ativo,
            'created_at': instance.created_at,
            'message': f'Usuário {instance.nome_completo} criado com sucesso!'
        }


class MVPLoginSerializer(serializers.Serializer):
    """
    Serializer simplificado para login MVP
    
    Apenas email + senha (vs login flexível enterprise).
    Retorna dados básicos + tokens JWT.
    """
    
    email = serializers.EmailField(
        help_text="Email cadastrado"
    )
    password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'},
        help_text="Senha da conta"
    )
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.validated_user = None
        self.validated_mvp_user = None
    
    def validate(self, data):
        """
        Validar credenciais e encontrar usuário
        """
        email = data.get('email', '').lower().strip()
        password = data.get('password')
        
        # Buscar usuário por email
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({
                'email': 'Nenhuma conta encontrada com este email.'
            })
        
        # Verificar senha
        if not user.check_password(password):
            raise serializers.ValidationError({
                'password': 'Senha incorreta.'
            })
        
        # Verificar se usuário está ativo
        if not user.is_active:
            raise serializers.ValidationError({
                'email': 'Esta conta está desativada.'
            })
        
        # Verificar se tem perfil MVP
        try:
            mvp_user = MVPUser.objects.get(user=user)
        except MVPUser.DoesNotExist:
            raise serializers.ValidationError({
                'email': 'Conta sem perfil MVP. Use o sistema principal.'
            })
        
        # Verificar se perfil MVP está ativo
        if not mvp_user.ativo:
            raise serializers.ValidationError({
                'email': 'Perfil MVP desativado.'
            })
        
        # Armazenar para uso posterior
        self.validated_user = user
        self.validated_mvp_user = mvp_user
        
        # Atualizar last_login
        from django.utils import timezone
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        return data
    
    def get_user_data(self):
        """
        Retornar dados do usuário autenticado
        """
        if not self.validated_mvp_user:
            return None
            
        return {
            'id': self.validated_mvp_user.id,
            'user_id': self.validated_user.id,
            'username': self.validated_user.username,
            'email': self.validated_user.email,
            'nome_completo': self.validated_mvp_user.nome_completo,
            'cpf': self.validated_mvp_user.cpf,
            'telefone': self.validated_mvp_user.telefone,
            'ativo': self.validated_mvp_user.ativo,
            'last_login': self.validated_user.last_login,
            'created_at': self.validated_mvp_user.created_at,
        }


class MVPProfileSerializer(serializers.ModelSerializer):
    """
    Serializer para perfil do usuário MVP
    
    Dados completos do usuário autenticado.
    Read-only para visualização de perfil.
    """
    
    # Campos do User relacionado
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    is_active = serializers.BooleanField(source='user.is_active', read_only=True)
    last_login = serializers.DateTimeField(source='user.last_login', read_only=True)
    
    # Campos calculados
    nome_completo = serializers.SerializerMethodField()
    esta_ativo_completo = serializers.SerializerMethodField()
    
    class Meta:
        model = MVPUser
        fields = [
            # IDs
            'id',
            
            # Dados do User
            'username',
            'email', 
            'first_name',
            'last_name',
            'is_active',
            'last_login',
            
            # Dados MVP
            'cpf',
            'telefone',
            'ativo',
            
            # Campos calculados
            'nome_completo',
            'esta_ativo_completo',
            
            # Timestamps
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_active', 'last_login', 'created_at', 'updated_at'
        ]
    
    def get_nome_completo(self, obj):
        """
        Nome completo do usuário
        """
        return obj.nome_completo
    
    def get_esta_ativo_completo(self, obj):
        """
        Status ativo completo (User + MVPUser)
        """
        return obj.esta_ativo