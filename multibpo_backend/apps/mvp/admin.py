"""
Admin MVP - MultiBPO
Mini-Fase MVP 1 - Backend Essencial

Configuração Django Admin simplificada para models MVP.
Interface administrativa básica para gerenciar usuários MVP.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import MVPUser


@admin.register(MVPUser)
class MVPUserAdmin(admin.ModelAdmin):
    """
    Admin customizado para MVPUser
    
    Interface simplificada focada na gestão básica de usuários MVP.
    Mantém separação clara do sistema enterprise.
    """
    
    # ========== LISTAGEM ==========
    
    list_display = [
        'nome_completo_display',
        'email_display',
        'cpf',
        'telefone',
        'ativo_status',
        'esta_ativo_display',
        'created_at_display',
        'acoes'
    ]
    
    list_filter = [
        'ativo',
        'user__is_active',
        'created_at',
        'updated_at',
    ]
    
    search_fields = [
        'user__first_name',
        'user__last_name',
        'user__email',
        'cpf',
        'telefone',
    ]
    
    ordering = ['-created_at']
    
    list_per_page = 25
    
    # ========== FORMULÁRIO ==========
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('user', 'cpf', 'telefone')
        }),
        ('Status', {
            'fields': ('ativo',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
    
    readonly_fields = [
        'created_at',
        'updated_at',
    ]
    
    # ========== MÉTODOS CUSTOMIZADOS ==========
    
    def nome_completo_display(self, obj):
        """
        Exibir nome completo com link para edição
        """
        nome = obj.nome_completo
        if not obj.esta_ativo:
            return format_html(
                '<span style="color: #999; text-decoration: line-through;">{}</span>',
                nome
            )
        return format_html('<strong>{}</strong>', nome)
    
    nome_completo_display.short_description = 'Nome Completo'
    nome_completo_display.admin_order_field = 'user__first_name'
    
    def email_display(self, obj):
        """
        Exibir email com link para User Django
        """
        user_url = reverse('admin:auth_user_change', args=[obj.user.id])
        return format_html(
            '<a href="{}" target="_blank" title="Ver User Django">{}</a>',
            user_url,
            obj.email
        )
    
    email_display.short_description = 'Email'
    email_display.admin_order_field = 'user__email'
    
    def ativo_status(self, obj):
        """
        Status visual do MVP User
        """
        if obj.ativo:
            return format_html(
                '<span style="color: green; font-weight: bold;">✓ Ativo</span>'
            )
        else:
            return format_html(
                '<span style="color: red; font-weight: bold;">✗ Inativo</span>'
            )
    
    ativo_status.short_description = 'Status MVP'
    ativo_status.admin_order_field = 'ativo'
    
    def esta_ativo_display(self, obj):
        """
        Status completo (User + MVP)
        """
        if obj.esta_ativo:
            return format_html(
                '<span style="color: green;">✓ Completo</span>'
            )
        else:
            return format_html(
                '<span style="color: orange;">⚠ Parcial</span>'
            )
    
    esta_ativo_display.short_description = 'Status Completo'
    
    def created_at_display(self, obj):
        """
        Data de criação formatada
        """
        return obj.created_at.strftime('%d/%m/%Y %H:%M')
    
    created_at_display.short_description = 'Criado em'
    created_at_display.admin_order_field = 'created_at'
    
    def acoes(self, obj):
        """
        Ações rápidas para o usuário
        """
        actions = []
        
        # Link para ver perfil detalhado
        profile_url = reverse('admin:mvp_mvpuser_change', args=[obj.id])
        actions.append(f'<a href="{profile_url}" title="Editar">📝</a>')
        
        # Link para User Django
        user_url = reverse('admin:auth_user_change', args=[obj.user.id])
        actions.append(f'<a href="{user_url}" target="_blank" title="Ver User Django">👤</a>')
        
        # Toggle ativo/inativo
        if obj.ativo:
            toggle_title = "Desativar"
            toggle_icon = "🔴"
        else:
            toggle_title = "Ativar"
            toggle_icon = "🟢"
        
        actions.append(f'<span title="{toggle_title}">{toggle_icon}</span>')
        
        return format_html(' '.join(actions))
    
    acoes.short_description = 'Ações'
    
    # ========== MÉTODOS DO ADMIN ==========
    
    def get_queryset(self, request):
        """
        Otimizar queries com select_related
        """
        queryset = super().get_queryset(request)
        return queryset.select_related('user')
    
    def save_model(self, request, obj, form, change):
        """
        Customizar salvamento se necessário
        """
        super().save_model(request, obj, form, change)
        
        # Log de alteração
        if change:
            self.message_user(
                request,
                f'Usuário MVP {obj.nome_completo} atualizado com sucesso.'
            )
        else:
            self.message_user(
                request,
                f'Usuário MVP {obj.nome_completo} criado com sucesso.'
            )
    
    def delete_model(self, request, obj):
        """
        Customizar exclusão com confirmação
        """
        nome = obj.nome_completo
        super().delete_model(request, obj)
        
        self.message_user(
            request,
            f'Usuário MVP {nome} excluído com sucesso.',
            level='WARNING'
        )
    
    # ========== AÇÕES EM MASSA ==========
    
    def ativar_usuarios(self, request, queryset):
        """
        Ativar usuários MVP selecionados
        """
        updated = queryset.update(ativo=True)
        self.message_user(
            request,
            f'{updated} usuário(s) MVP ativado(s) com sucesso.'
        )
    
    ativar_usuarios.short_description = "Ativar usuários MVP selecionados"
    
    def desativar_usuarios(self, request, queryset):
        """
        Desativar usuários MVP selecionados
        """
        updated = queryset.update(ativo=False)
        self.message_user(
            request,
            f'{updated} usuário(s) MVP desativado(s) com sucesso.',
            level='WARNING'
        )
    
    desativar_usuarios.short_description = "Desativar usuários MVP selecionados"
    
    actions = ['ativar_usuarios', 'desativar_usuarios']
    
    # ========== PERMISSÕES ==========
    
    def has_add_permission(self, request):
        """
        Controlar permissão de adicionar
        
        Usuários MVP normalmente são criados via API,
        mas admin pode criar para testes.
        """
        return request.user.is_superuser
    
    def has_delete_permission(self, request, obj=None):
        """
        Controlar permissão de deletar
        
        Apenas superusuários podem deletar usuários MVP.
        """
        return request.user.is_superuser
    
    # ========== CUSTOMIZAÇÕES VISUAIS ==========
    
    class Media:
        css = {
            'all': ('admin/css/mvp_admin.css',)  # CSS customizado se necessário
        }
        js = ('admin/js/mvp_admin.js',)  # JS customizado se necessário


# ========== CONFIGURAÇÕES ADICIONAIS ==========

# Customizar título do admin MVP
admin.site.site_header = "MultiBPO MVP - Administração"
admin.site.site_title = "MultiBPO MVP Admin"
admin.site.index_title = "Painel Administrativo MVP"

# Adicionar link rápido para sistema enterprise
def link_sistema_enterprise(request):
    """
    Link rápido para acessar sistema enterprise
    """
    return {
        'sistema_enterprise_url': '/admin/contadores/',
        'sistema_enterprise_nome': 'Sistema Enterprise'
    }

# Registrar context processor se necessário
# admin.site.each_context = link_sistema_enterprise