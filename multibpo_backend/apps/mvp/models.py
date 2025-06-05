"""
Models MVP - MultiBPO
Mini-Fase MVP 1 - Backend Essencial

Models simplificados para MVP, utilizando o User do Django + extensão mínima.
NÃO interfere com os models complexos existentes (Contador, Escritorio).
"""

from django.db import models
from django.contrib.auth.models import User
from django.core.validators import RegexValidator
from validate_docbr import CPF


class MVPUser(models.Model):
    """
    Extensão simplificada do User Django para MVP
    
    Adiciona apenas campos essenciais sem interferir no sistema complexo.
    Relacionamento OneToOne com User permite coexistência com models Contador.
    
    Campos MVP:
    - CPF (validado)
    - Telefone (opcional)
    - Status ativo
    - Timestamps
    
    NÃO inclui:
    - CRC, especialidades, escritórios (sistema complexo)
    - Documentos, endereços (não necessário para MVP)
    - Relacionamentos complexos (preservados no app contadores)
    """
    
    # Relacionamento com User Django (permite múltiplos perfis)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        verbose_name="Usuário Django",
        help_text="Usuário base do Django",
        related_name='mvp_profile'  # Evita conflito com 'contador' existente
    )
    
    cpf = models.CharField(
    max_length=14,
    unique=True,
    verbose_name="CPF",
    help_text="CPF do usuário (será formatado automaticamente)"
    # REMOVER: validators=[RegexValidator(...)]
)
    
    # Telefone opcional para contato
    telefone = models.CharField(
        max_length=20,
        blank=True,
        verbose_name="Telefone",
        help_text="Telefone de contato (opcional)"
    )
    
    # Status ativo (controle MVP)
    ativo = models.BooleanField(
        default=True,
        verbose_name="Ativo",
        help_text="Usuário ativo no sistema MVP"
    )
    
    # Timestamps automáticos
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Criado em"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Atualizado em"
    )
    
    class Meta:
        db_table = 'mvp_user'
        verbose_name = 'Usuário MVP'
        verbose_name_plural = 'Usuários MVP'
        ordering = ['-created_at']
        
        # Índices para performance
        indexes = [
            models.Index(fields=['cpf']),
            models.Index(fields=['ativo', 'created_at']),
        ]
    
    def clean(self):
        """
        Validação customizada do CPF
        
        Utiliza biblioteca validate-docbr para validação real do CPF,
        não apenas formato mas também dígitos verificadores.
        """
        super().clean()
        
        if self.cpf:
            # Remove formatação para validação
            cpf_limpo = ''.join(filter(str.isdigit, self.cpf))
            
            # Validação com validate-docbr
            cpf_validator = CPF()
            if not cpf_validator.validate(cpf_limpo):
                from django.core.exceptions import ValidationError
                raise ValidationError({'cpf': 'CPF inválido'})
            
            # Formatação automática
            if len(cpf_limpo) == 11:
                self.cpf = f"{cpf_limpo[:3]}.{cpf_limpo[3:6]}.{cpf_limpo[6:9]}-{cpf_limpo[9:]}"
    
    def save(self, *args, **kwargs):
        """
        Salvamento com validação automática
        """
        self.full_clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        """
        Representação string do objeto
        """
        nome = self.user.get_full_name() or self.user.username
        return f"{nome} (MVP - {self.cpf})"
    
    @property
    def nome_completo(self):
        """
        Nome completo do usuário
        """
        if self.user.first_name and self.user.last_name:
            return f"{self.user.first_name} {self.user.last_name}"
        return self.user.username
    
    @property
    def email(self):
        """
        Email do usuário (proxy para User.email)
        """
        return self.user.email
    
    @property
    def esta_ativo(self):
        """
        Verifica se usuário está completamente ativo
        """
        return self.ativo and self.user.is_active
    
    @classmethod
    def create_mvp_user(cls, username, email, password, first_name, last_name, cpf, telefone=""):
        """
        Método helper para criar usuário MVP completo
        
        Cria User Django + MVPUser em uma operação atômica.
        Usado pelos serializers para criação consistente.
        
        Args:
            username: Nome de usuário único
            email: Email único
            password: Senha (será hasheada)
            first_name: Primeiro nome
            last_name: Sobrenome
            cpf: CPF válido
            telefone: Telefone opcional
            
        Returns:
            MVPUser: Instância criada
        """
        from django.db import transaction
        
        with transaction.atomic():
            # Criar User Django
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name
            )
            
            # Criar perfil MVP
            mvp_user = cls.objects.create(
                user=user,
                cpf=cpf,
                telefone=telefone
            )
            
            return mvp_user