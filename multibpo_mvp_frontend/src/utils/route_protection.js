// ==========================================================================
// MultiBPO MVP Frontend - Sistema de Proteção de Rotas
// Mini-Fase MVP 3 - Proteção de rotas (dashboard só para logados)
// 
// Middleware robusto para controle de acesso com verificação de token,
// redirecionamentos automáticos e integração com notification_system
// ==========================================================================

import { showWarning, showError } from './notification_system.js';

/**
 * Tipos de proteção de rota disponíveis
 */
export const PROTECTION_TYPES = {
  AUTHENTICATED: 'authenticated',     // Apenas usuários logados
  UNAUTHENTICATED: 'unauthenticated', // Apenas usuários não logados
  PUBLIC: 'public'                    // Acesso livre
};

/**
 * Rotas e suas configurações de proteção
 */
const ROUTE_CONFIG = {
  // Rotas protegidas (apenas logados)
  '/dashboard': {
    protection: PROTECTION_TYPES.AUTHENTICATED,
    redirectTo: '/login',
    message: 'Você precisa estar logado para acessar o dashboard.'
  },
  '/perfil': {
    protection: PROTECTION_TYPES.AUTHENTICATED,
    redirectTo: '/login',
    message: 'Acesso restrito a usuários autenticados.'
  },
  
  // Rotas para não logados (apenas visitantes)
  '/login': {
    protection: PROTECTION_TYPES.UNAUTHENTICATED,
    redirectTo: '/dashboard',
    message: 'Você já está logado!'
  },
  '/cadastro': {
    protection: PROTECTION_TYPES.UNAUTHENTICATED,
    redirectTo: '/dashboard',
    message: 'Você já possui uma conta ativa.'
  },
  
  // Rotas públicas (sem restrição)
  '/': {
    protection: PROTECTION_TYPES.PUBLIC
  },
  '/sobre': {
    protection: PROTECTION_TYPES.PUBLIC
  },
  '/contato': {
    protection: PROTECTION_TYPES.PUBLIC
  }
};

/**
 * Configurações padrão do sistema de proteção
 */
const DEFAULT_CONFIG = {
  tokenRefreshAttempts: 3,
  refreshTokenThreshold: 300000, // 5 minutos em ms
  checkInterval: 60000,          // Verificar token a cada 1 minuto
  enablePeriodicCheck: true,
  showNotifications: true,
  logActivity: true
};

/**
 * Classe principal para proteção de rotas
 */
export class RouteProtection {
  
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentUser = null;
    this.lastTokenCheck = null;
    this.checkInterval = null;
    this.refreshAttempts = 0;
    
    this.init();
  }
  
  /**
   * Inicializar sistema de proteção
   */
  init() {
    // Verificar estado inicial
    this.checkAuthState();
    
    // Configurar verificação periódica se habilitada
    if (this.config.enablePeriodicCheck) {
      this.startPeriodicCheck();
    }
    
    // Listener para mudanças na página
    this.setupNavigationListeners();
    
    // Listener para mudanças no localStorage (logout em outra aba)
    this.setupStorageListener();
    
    this.log('Sistema de proteção de rotas inicializado');
  }
  
  /**
   * Verificar estado de autenticação atual
   * @returns {Promise<boolean>} Se usuário está autenticado
   */
  async checkAuthState() {
    try {
      const token = localStorage.getItem('multibpo_access_token');
      const refreshToken = localStorage.getItem('multibpo_refresh_token');
      const userData = localStorage.getItem('multibpo_user');
      
      if (!token || !refreshToken) {
        this.setUnauthenticated();
        return false;
      }
      
      // Verificar se token está próximo do vencimento
      const tokenData = this.parseJWT(token);
      if (!tokenData) {
        this.setUnauthenticated();
        return false;
      }
      
      const now = Math.floor(Date.now() / 1000);
      const timeToExpiry = (tokenData.exp - now) * 1000;
      
      // Se token expirou, tentar refresh
      if (timeToExpiry <= 0) {
        this.log('Token expirado, tentando refresh...');
        return await this.attemptTokenRefresh();
      }
      
      // Se token expira em breve, fazer refresh preventivo
      if (timeToExpiry <= this.config.refreshTokenThreshold) {
        this.log('Token próximo do vencimento, fazendo refresh preventivo...');
        this.attemptTokenRefresh(); // Não aguardar resultado
      }
      
      // Token válido, definir usuário autenticado
      if (userData) {
        try {
          this.currentUser = JSON.parse(userData);
        } catch (error) {
          this.log('Erro ao parsear dados do usuário', 'error');
        }
      }
      
      this.lastTokenCheck = Date.now();
      return true;
      
    } catch (error) {
      this.log('Erro na verificação de autenticação', 'error', error);
      this.setUnauthenticated();
      return false;
    }
  }
  
  /**
   * Tentar renovar token
   * @returns {Promise<boolean>} Se refresh foi bem-sucedido
   */
  async attemptTokenRefresh() {
    if (this.refreshAttempts >= this.config.tokenRefreshAttempts) {
      this.log('Máximo de tentativas de refresh atingido');
      this.setUnauthenticated();
      return false;
    }
    
    this.refreshAttempts++;
    
    try {
      const refreshToken = localStorage.getItem('multibpo_refresh_token');
      if (!refreshToken) {
        throw new Error('Refresh token não encontrado');
      }
      
      // Usar api_client se disponível, senão fazer requisição direta
      let response;
      if (window.multibpoAPI && window.multibpoAPI.axios) {
        response = await window.multibpoAPI.axios.post('/token/refresh/', {
          refresh: refreshToken
        });
      } else {
        // Fallback para fetch direto
        const apiResponse = await fetch('http://192.168.1.4:8082/api/v1/token/refresh/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ refresh: refreshToken })
        });
        
        if (!apiResponse.ok) {
          throw new Error(`HTTP ${apiResponse.status}`);
        }
        
        response = { data: await apiResponse.json() };
      }
      
      // Salvar novos tokens
      if (response.data?.access) {
        localStorage.setItem('multibpo_access_token', response.data.access);
        
        if (response.data.refresh) {
          localStorage.setItem('multibpo_refresh_token', response.data.refresh);
        }
        
        this.refreshAttempts = 0;
        this.lastTokenCheck = Date.now();
        this.log('Token renovado com sucesso');
        return true;
      }
      
      throw new Error('Response inválida do refresh');
      
    } catch (error) {
      this.log('Erro no refresh do token', 'error', error);
      
      // Se todas as tentativas falharam, deslogar
      if (this.refreshAttempts >= this.config.tokenRefreshAttempts) {
        this.setUnauthenticated();
        
        if (this.config.showNotifications && window.showWarning) {
          showWarning('Sua sessão expirou. Faça login novamente.', {
            duration: 6000,
            persistent: false
          });
        }
      }
      
      return false;
    }
  }
  
  /**
   * Definir estado como não autenticado
   */
  setUnauthenticated() {
    this.currentUser = null;
    this.refreshAttempts = 0;
    
    // Limpar dados de autenticação se api_client disponível
    if (window.multibpoAPI && window.multibpoAPI.clearAuth) {
      window.multibpoAPI.clearAuth();
    } else {
      // Fallback manual
      localStorage.removeItem('multibpo_access_token');
      localStorage.removeItem('multibpo_refresh_token');
      localStorage.removeItem('multibpo_user');
    }
  }
  
  /**
   * Parse JWT token sem verificação (apenas para ler dados)
   * @param {string} token - JWT token
   * @returns {Object|null} Payload do token
   */
  parseJWT(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      return JSON.parse(jsonPayload);
    } catch (error) {
      this.log('Erro ao parsear JWT', 'error', error);
      return null;
    }
  }
  
  /**
   * Verificar se usuário tem acesso à rota atual
   * @param {string} path - Caminho da rota (opcional, usa window.location.pathname)
   * @returns {Promise<Object>} Resultado da verificação
   */
  async checkRouteAccess(path = null) {
    const currentPath = path || window.location.pathname;
    const routeConfig = this.getRouteConfig(currentPath);
    const isAuthenticated = await this.checkAuthState();
    
    const result = {
      hasAccess: false,
      shouldRedirect: false,
      redirectTo: null,
      message: null,
      routeConfig
    };
    
    switch (routeConfig.protection) {
      case PROTECTION_TYPES.PUBLIC:
        result.hasAccess = true;
        break;
        
      case PROTECTION_TYPES.AUTHENTICATED:
        if (isAuthenticated) {
          result.hasAccess = true;
        } else {
          result.shouldRedirect = true;
          result.redirectTo = routeConfig.redirectTo || '/login';
          result.message = routeConfig.message || 'Acesso restrito a usuários autenticados.';
        }
        break;
        
      case PROTECTION_TYPES.UNAUTHENTICATED:
        if (!isAuthenticated) {
          result.hasAccess = true;
        } else {
          result.shouldRedirect = true;
          result.redirectTo = routeConfig.redirectTo || '/dashboard';
          result.message = routeConfig.message || 'Você já está logado.';
        }
        break;
        
      default:
        // Rota não configurada - assumir pública
        result.hasAccess = true;
        break;
    }
    
    this.log(`Verificação de rota: ${currentPath}`, 'info', {
      hasAccess: result.hasAccess,
      shouldRedirect: result.shouldRedirect,
      isAuthenticated
    });
    
    return result;
  }
  
  /**
   * Obter configuração para uma rota
   * @param {string} path - Caminho da rota
   * @returns {Object} Configuração da rota
   */
  getRouteConfig(path) {
    // Buscar configuração exata
    if (ROUTE_CONFIG[path]) {
      return ROUTE_CONFIG[path];
    }
    
    // Buscar padrões (ex: /dashboard/settings)
    for (const routePath in ROUTE_CONFIG) {
      if (path.startsWith(routePath) && routePath !== '/') {
        return ROUTE_CONFIG[routePath];
      }
    }
    
    // Padrão: rota pública
    return { protection: PROTECTION_TYPES.PUBLIC };
  }
  
  /**
   * Enforcar proteção da rota atual
   * @param {Object} options - Opções de enforcement
   * @returns {Promise<boolean>} Se acesso foi permitido
   */
  async enforceCurrentRoute(options = {}) {
    const accessResult = await this.checkRouteAccess();
    
    if (!accessResult.hasAccess && accessResult.shouldRedirect) {
      // Mostrar notificação se configurado
      if (this.config.showNotifications && accessResult.message && window.showWarning) {
        showWarning(accessResult.message, {
          duration: 4000
        });
      }
      
      // Aguardar um pouco antes de redirecionar para permitir que notificação apareça
      if (!options.preventRedirect) {
        setTimeout(() => {
          window.location.href = accessResult.redirectTo;
        }, options.redirectDelay || 1500);
      }
      
      return false;
    }
    
    return true;
  }
  
  /**
   * Configurar verificação periódica
   */
  startPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    this.checkInterval = setInterval(() => {
      this.checkAuthState();
    }, this.config.checkInterval);
  }
  
  /**
   * Parar verificação periódica
   */
  stopPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
  
  /**
   * Configurar listeners para navegação
   */
  setupNavigationListeners() {
    // Listener para mudanças de hash/história (SPA)
    window.addEventListener('popstate', () => {
      setTimeout(() => this.enforceCurrentRoute(), 100);
    });
    
    // Listener para clicks em links internos
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a');
      if (link && link.href && link.href.startsWith(window.location.origin)) {
        const path = new URL(link.href).pathname;
        const routeConfig = this.getRouteConfig(path);
        
        // Se rota é protegida, verificar antes de navegar
        if (routeConfig.protection === PROTECTION_TYPES.AUTHENTICATED) {
          event.preventDefault();
          
          this.checkRouteAccess(path).then(accessResult => {
            if (accessResult.hasAccess) {
              window.location.href = link.href;
            } else if (accessResult.shouldRedirect) {
              if (this.config.showNotifications && accessResult.message && window.showWarning) {
                showWarning(accessResult.message);
              }
              window.location.href = accessResult.redirectTo;
            }
          });
        }
      }
    });
  }
  
  /**
   * Configurar listener para mudanças no localStorage
   */
  setupStorageListener() {
    window.addEventListener('storage', (event) => {
      // Detectar logout em outra aba
      if (event.key === 'multibpo_access_token' && !event.newValue) {
        this.log('Logout detectado em outra aba');
        this.setUnauthenticated();
        
        // Verificar se rota atual requer autenticação
        const currentConfig = this.getRouteConfig(window.location.pathname);
        if (currentConfig.protection === PROTECTION_TYPES.AUTHENTICATED) {
          if (this.config.showNotifications && window.showWarning) {
            showWarning('Você foi deslogado em outra aba.', {
              duration: 3000
            });
          }
          
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        }
      }
    });
  }
  
  /**
   * Obter informações do usuário atual
   * @returns {Object|null} Dados do usuário ou null
   */
  getCurrentUser() {
    return this.currentUser;
  }
  
  /**
   * Verificar se usuário está autenticado (sync)
   * @returns {boolean} Se está autenticado
   */
  isAuthenticated() {
    const token = localStorage.getItem('multibpo_access_token');
    if (!token) return false;
    
    const tokenData = this.parseJWT(token);
    if (!tokenData) return false;
    
    const now = Math.floor(Date.now() / 1000);
    return tokenData.exp > now;
  }
  
  /**
   * Forçar logout programático
   * @param {Object} options - Opções de logout
   */
  async forceLogout(options = {}) {
    try {
      // Tentar logout no backend se api disponível
      if (window.multibpoAPI && window.multibpoAPI.logout) {
        const refreshToken = localStorage.getItem('multibpo_refresh_token');
        if (refreshToken) {
          await window.multibpoAPI.logout(refreshToken);
        }
      }
    } catch (error) {
      this.log('Erro no logout do backend', 'error', error);
    }
    
    // Limpar estado local
    this.setUnauthenticated();
    
    // Mostrar notificação se configurado
    if (this.config.showNotifications && options.message && window.showInfo) {
      showInfo(options.message, { duration: 3000 });
    }
    
    // Redirecionar se necessário
    if (options.redirectTo) {
      setTimeout(() => {
        window.location.href = options.redirectTo;
      }, options.redirectDelay || 1000);
    }
  }
  
  /**
   * Logging com controle
   * @param {string} message - Mensagem de log
   * @param {string} level - Nível do log
   * @param {any} data - Dados adicionais
   */
  log(message, level = 'info', data = null) {
    if (!this.config.logActivity) return;
    
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      user: this.currentUser?.email || 'anonymous',
      path: window.location.pathname
    };
    
    switch (level) {
      case 'error':
        console.error('[RouteProtection]', message, data);
        break;
      case 'warn':
        console.warn('[RouteProtection]', message, data);
        break;
      default:
        console.log('[RouteProtection]', message, data);
        break;
    }
    
    // TODO: Enviar para serviço de monitoramento em produção
  }
  
  /**
   * Obter estatísticas do sistema
   * @returns {Object} Estatísticas
   */
  getStats() {
    return {
      isAuthenticated: this.isAuthenticated(),
      currentUser: this.getCurrentUser(),
      lastTokenCheck: this.lastTokenCheck,
      refreshAttempts: this.refreshAttempts,
      periodicCheckEnabled: this.config.enablePeriodicCheck,
      currentRoute: window.location.pathname,
      routeConfig: this.getRouteConfig(window.location.pathname)
    };
  }
}

/**
 * Instância global do sistema de proteção
 */
export const routeProtection = new RouteProtection();

/**
 * Funções de conveniência para uso direto
 */
export const checkAuth = () => routeProtection.checkAuthState();
export const enforceRoute = (options) => routeProtection.enforceCurrentRoute(options);
export const getCurrentUser = () => routeProtection.getCurrentUser();
export const isAuthenticated = () => routeProtection.isAuthenticated();
export const forceLogout = (options) => routeProtection.forceLogout(options);

/**
 * Inicializar sistema globalmente
 */
export function initializeRouteProtection(config = {}) {
  // Atualizar configurações se fornecidas
  if (Object.keys(config).length > 0) {
    routeProtection.config = { ...routeProtection.config, ...config };
  }
  
  // Disponibilizar globalmente
  window.routeProtection = routeProtection;
  window.checkAuth = checkAuth;
  window.enforceRoute = enforceRoute;
  window.getCurrentUser = getCurrentUser;
  window.isAuthenticated = isAuthenticated;
  window.forceLogout = forceLogout;
  
  console.log('[MultiBPO MVP] Route Protection inicializado');
}

// Auto-inicializar se estiver no browser
if (typeof window !== 'undefined') {
  // Aguardar DOM estar pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initializeRouteProtection());
  } else {
    initializeRouteProtection();
  }
}

// Export default para compatibilidade
export default routeProtection;