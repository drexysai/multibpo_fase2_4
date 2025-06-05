"""
Configuração do App MVP - MultiBPO
Mini-Fase MVP 1 - Backend Essencial

Este app implementa funcionalidades MVP básicas em paralelo ao sistema complexo,
preservando toda a arquitetura enterprise existente.
"""

from django.apps import AppConfig


class MvpConfig(AppConfig):
    """
    Configuração do App MVP
    
    App dedicado para implementação MVP que funciona em paralelo
    ao sistema completo sem interferir nas funcionalidades existentes.
    
    Características:
    - Models User simplificado para MVP
    - Serializers básicos (5 campos vs 15+ enterprise)
    - Views essenciais (cadastro, login, perfil)
    - URLs independentes (/api/v1/mvp/)
    """
    
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.mvp'
    verbose_name = 'MultiBPO MVP'
    
    def ready(self):
        """
        Configurações executadas quando o app é carregado
        
        Mantém compatibilidade total com apps existentes:
        - authentication (sistema enterprise)
        - contadores (models complexos)
        - receita (APIs governamentais)
        """
        # Imports de sinais ou configurações adicionais se necessário
        pass