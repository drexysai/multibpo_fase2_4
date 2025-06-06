// ==========================================================================
// MultiBPO MVP Frontend - Cliente API v3 Aprimorado
// Mini-Fase MVP 3 - Error handling robusto + Loading states
// 
// Versão melhorada do api_client.js com integração completa aos novos
// sistemas: error_handler, notification_system e route_protection
// ==========================================================================

import axios from 'axios';
import { ErrorHandler, ErrorHandlers } from './error_handler.js';
import { showError, showSuccess, showLoading, dismissNotification } from './notification_system.js';

// ==========================================================================
// CONFIGURAÇÕES DA API V3
// ==========================================================================
const API_CONFIG = {
  baseURL: window.MULTIBPO_CONFIG?.API_BASE_URL || 'http://192.168.1.4:8082/api/v1/mvp',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  retryAttempts: 3,
  retryDelay: 1000,
  loadingMinDuration: 500  // Mínimo 500ms para evitar flash de loading
};

// ==========================================================================
// ESTADO GLOBAL DO CLIENTE
// ==========================================================================
const clientState = {
  activeRequests: new Map(),
  loadingNotifications: new Map(),
  retryCounters: new Map(),
  lastRequestTime: null,
  totalRequests: 0,
  errorCount: 0,
  successCount: 0
};

// ==========================================================================
// CRIAR INSTÂNCIA AXIOS V3
// ==========================================================================
const axiosInstance = axios.create(API_CONFIG);

// ==========================================================================
// INTERCEPTOR DE REQUEST V3 (MELHORADO)
// ==========================================================================
axiosInstance.interceptors.request.use(
  (config) => {
    // Gerar ID único para requisição
    const requestId = generateRequestId();
    config.metadata = {
      requestId,
      startTime: Date.now(),
      context: config.context || 'unknown',
      showLoading: config.showLoading !== false,
      showSuccessNotification: config.showSuccessNotification || false,
      loadingMessage: config.loadingMessage || 'Processando...'
    };

    // Adicionar JWT token se disponível
    const token = localStorage.getItem('multibpo_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Mostrar loading se configurado
    if (config.metadata.showLoading) {
      const loadingId = showLoading(config.metadata.loadingMessage, {
        persistent: true
      });
      clientState.loadingNotifications.set(requestId, loadingId);
    }

    // Registrar requisição ativa
    clientState.activeRequests.set(requestId, {
      url: config.url,
      method: config.method.toUpperCase(),
      startTime: config.metadata.startTime,
      context: config.metadata.context
    });

    // Estatísticas
    clientState.totalRequests++;
    clientState.lastRequestTime = Date.now();

    // Log detalhado para desenvolvimento
    logRequest(config);

    return config;
  },
  (error) => {
    console.error('[API Client v3] Request Error:', error);
    return Promise.reject(error);
  }
);

// ==========================================================================
// INTERCEPTOR DE RESPONSE V3 (MELHORADO)
// ==========================================================================
axiosInstance.interceptors.response.use(
  (response) => {
    const requestId = response.config.metadata?.requestId;
    const metadata = response.config.metadata;
    
    // Calcular duração da requisição
    const duration = Date.now() - metadata.startTime;
    
    // Remover loading com duração mínima
    if (requestId && clientState.loadingNotifications.has(requestId)) {
      const loadingId = clientState.loadingNotifications.get(requestId);
      const minDuration = API_CONFIG.loadingMinDuration;
      
      if (duration >= minDuration) {
        dismissNotification(loadingId);
      } else {
        setTimeout(() => {
          dismissNotification(loadingId);
        }, minDuration - duration);
      }
      
      clientState.loadingNotifications.delete(requestId);
    }

    // Mostrar notificação de sucesso se configurado
    if (metadata?.showSuccessNotification) {
      const successMessage = response.data?.message || 'Operação realizada com sucesso!';
      showSuccess(successMessage, { duration: 3000 });
    }

    // Limpar requisição ativa
    if (requestId) {
      clientState.activeRequests.delete(requestId);
      clientState.retryCounters.delete(requestId);
    }

    // Estatísticas
    clientState.successCount++;

    // Log de sucesso
    logResponse(response, duration);

    // Retornar dados diretamente (mantém compatibilidade)
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;
    const requestId = originalRequest?.metadata?.requestId;
    const metadata = originalRequest?.metadata;

    // Calcular duração até o erro
    const duration = metadata ? Date.now() - metadata.startTime : 0;

    // Remover loading
    if (requestId && clientState.loadingNotifications.has(requestId)) {
      const loadingId = clientState.loadingNotifications.get(requestId);
      dismissNotification(loadingId);
      clientState.loadingNotifications.delete(requestId);
    }

    // Limpar requisição ativa
    if (requestId) {
      clientState.activeRequests.delete(requestId);
    }

    // Estatísticas
    clientState.errorCount++;

    // =======================================================================
    // RETRY LOGIC MELHORADO
    // =======================================================================
    const shouldRetry = await handleRetryLogic(error, originalRequest);
    if (shouldRetry) {
      return axiosInstance(originalRequest);
    }

    // =======================================================================
    // TOKEN REFRESH MELHORADO
    // =======================================================================
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshSuccess = await attemptTokenRefresh();
        
        if (refreshSuccess) {
          // Atualizar header e repetir requisição
          const newToken = localStorage.getItem('multibpo_access_token');
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        // Refresh falhou, tratar como erro de auth
        const processedError = ErrorHandler.processError(refreshError, 'token_refresh');
        
        // Notificar sobre expiração de sessão
        showError('Sua sessão expirou. Você será redirecionado para login.', {
          duration: 4000,
          persistent: false
        });

        // Redirecionar após delay
        if (window.routeProtection) {
          setTimeout(() => {
            window.routeProtection.forceLogout({
              redirectTo: '/login?expired=true',
              message: 'Sessão expirada'
            });
          }, 2000);
        }

        return Promise.reject(processedError);
      }
    }

    // =======================================================================
    // ERROR HANDLING INTEGRADO
    // =======================================================================
    const processedError = ErrorHandler.processError(error, metadata?.context || 'api_request');
    
    // Mostrar erro apenas se não foi uma tentativa de retry
    if (!originalRequest._isRetry) {
      ErrorHandler.showError(error, metadata?.context || 'api_request');
    }

    // Log de erro
    logError(error, duration, processedError);

    return Promise.reject(processedError);
  }
);

// ==========================================================================
// FUNÇÕES AUXILIARES
// ==========================================================================

/**
 * Gerar ID único para requisição
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Lógica de retry aprimorada
 */
async function handleRetryLogic(error, originalRequest) {
  const requestId = originalRequest.metadata?.requestId;
  
  // Não fazer retry em alguns casos específicos
  if (
    originalRequest._retry ||
    originalRequest._isRetry ||
    error.response?.status === 401 ||
    error.response?.status === 403 ||
    error.response?.status >= 400 && error.response?.status < 500
  ) {
    return false;
  }

  // Verificar se ainda temos tentativas
  const retryCount = clientState.retryCounters.get(requestId) || 0;
  if (retryCount >= API_CONFIG.retryAttempts) {
    return false;
  }

  // Incrementar contador de retry
  clientState.retryCounters.set(requestId, retryCount + 1);

  // Marcar como retry
  originalRequest._isRetry = true;

  // Delay progressivo
  const delay = API_CONFIG.retryDelay * Math.pow(2, retryCount);
  
  console.log(`[API Client v3] Retry ${retryCount + 1}/${API_CONFIG.retryAttempts} em ${delay}ms`);

  await new Promise(resolve => setTimeout(resolve, delay));
  
  return true;
}

/**
 * Tentar renovar token
 */
async function attemptTokenRefresh() {
  try {
    const refreshToken = localStorage.getItem('multibpo_refresh_token');
    if (!refreshToken) {
      throw new Error('Refresh token não encontrado');
    }

    // Fazer requisição direta para evitar interceptors
    const response = await axios.post(
      `${API_CONFIG.baseURL.replace('/mvp', '')}/token/refresh/`,
      { refresh: refreshToken },
      { 
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000 
      }
    );

    if (response.data?.access) {
      localStorage.setItem('multibpo_access_token', response.data.access);
      
      if (response.data.refresh) {
        localStorage.setItem('multibpo_refresh_token', response.data.refresh);
      }

      console.log('[API Client v3] Token renovado com sucesso');
      return true;
    }

    throw new Error('Response inválida do refresh');
    
  } catch (error) {
    console.error('[API Client v3] Erro no refresh do token:', error);
    
    // Limpar tokens inválidos
    localStorage.removeItem('multibpo_access_token');
    localStorage.removeItem('multibpo_refresh_token');
    localStorage.removeItem('multibpo_user');
    
    return false;
  }
}

/**
 * Log de requisição
 */
function logRequest(config) {
  if (window.MULTIBPO_CONFIG?.DEBUG) {
    console.group(`[API v3] Request ${config.metadata.requestId}`);
    console.log('Method:', config.method.toUpperCase());
    console.log('URL:', config.url);
    console.log('Context:', config.metadata.context);
    console.log('Data:', config.data);
    console.groupEnd();
  }
}

/**
 * Log de resposta
 */
function logResponse(response, duration) {
  if (window.MULTIBPO_CONFIG?.DEBUG) {
    console.group(`[API v3] Response ${response.config.metadata.requestId}`);
    console.log('Status:', response.status);
    console.log('Duration:', `${duration}ms`);
    console.log('Data:', response.data);
    console.groupEnd();
  }
}

/**
 * Log de erro
 */
function logError(error, duration, processedError) {
  console.group(`[API v3] Error ${error.config?.metadata?.requestId || 'unknown'}`);
  console.error('Status:', error.response?.status || 'Network Error');
  console.error('Duration:', `${duration}ms`);
  console.error('Processed Error:', processedError);
  console.error('Original Error:', error);
  console.groupEnd();
}

// ==========================================================================
// FUNÇÕES PÚBLICAS APRIMORADAS
// ==========================================================================

/**
 * Fazer requisição GET com opções avançadas
 */
const get = (endpoint, options = {}) => {
  const config = {
    ...options,
    context: options.context || `get_${endpoint}`,
    showLoading: options.showLoading !== false,
    loadingMessage: options.loadingMessage || 'Carregando...'
  };
  
  return axiosInstance.get(endpoint, config);
};

/**
 * Fazer requisição POST com opções avançadas
 */
const post = (endpoint, data = {}, options = {}) => {
  const config = {
    ...options,
    context: options.context || `post_${endpoint}`,
    showLoading: options.showLoading !== false,
    loadingMessage: options.loadingMessage || 'Enviando...',
    showSuccessNotification: options.showSuccessNotification !== false
  };
  
  return axiosInstance.post(endpoint, data, config);
};

/**
 * Fazer requisição PUT com opções avançadas
 */
const put = (endpoint, data = {}, options = {}) => {
  const config = {
    ...options,
    context: options.context || `put_${endpoint}`,
    showLoading: options.showLoading !== false,
    loadingMessage: options.loadingMessage || 'Atualizando...',
    showSuccessNotification: options.showSuccessNotification !== false
  };
  
  return axiosInstance.put(endpoint, data, config);
};

/**
 * Fazer requisição PATCH com opções avançadas
 */
const patch = (endpoint, data = {}, options = {}) => {
  const config = {
    ...options,
    context: options.context || `patch_${endpoint}`,
    showLoading: options.showLoading !== false,
    loadingMessage: options.loadingMessage || 'Atualizando...',
    showSuccessNotification: options.showSuccessNotification !== false
  };
  
  return axiosInstance.patch(endpoint, data, config);
};

/**
 * Fazer requisição DELETE com opções avançadas
 */
const del = (endpoint, options = {}) => {
  const config = {
    ...options,
    context: options.context || `delete_${endpoint}`,
    showLoading: options.showLoading !== false,
    loadingMessage: options.loadingMessage || 'Removendo...',
    showSuccessNotification: options.showSuccessNotification !== false
  };
  
  return axiosInstance.delete(endpoint, config);
};

// ==========================================================================
// MÉTODOS ESPECÍFICOS MVP APRIMORADOS
// ==========================================================================

/**
 * Registrar usuário MVP com UX melhorada
 */
const register = (userData, options = {}) => {
  return post('/register/', userData, {
    context: 'user_registration',
    loadingMessage: 'Criando sua conta...',
    showSuccessNotification: true,
    ...options
  });
};

/**
 * Login com UX melhorada
 */
const login = (credentials, options = {}) => {
  return post('/login/', credentials, {
    context: 'user_login',
    loadingMessage: 'Autenticando...',
    showSuccessNotification: true,
    ...options
  });
};

/**
 * Obter perfil com cache inteligente
 */
const getProfile = (options = {}) => {
  return get('/profile/', {
    context: 'user_profile',
    loadingMessage: 'Carregando perfil...',
    showLoading: options.showLoading !== false,
    ...options
  });
};

/**
 * Logout seguro com UX
 */
const logout = (refreshToken, options = {}) => {
  return post('/logout/', { refresh_token: refreshToken }, {
    context: 'user_logout',
    loadingMessage: 'Finalizando sessão...',
    showSuccessNotification: false,
    ...options
  });
};

/**
 * Teste de conectividade
 */
const testBackend = (options = {}) => {
  return get('/test/', {
    context: 'backend_test',
    loadingMessage: 'Testando conexão...',
    showLoading: options.showLoading !== false,
    ...options
  });
};

/**
 * Teste protegido
 */
const testProtected = (options = {}) => {
  return get('/protected-test/', {
    context: 'protected_test',
    loadingMessage: 'Verificando autenticação...',
    showLoading: options.showLoading !== false,
    ...options
  });
};

// ==========================================================================
// UTILIDADES APRIMORADAS
// ==========================================================================

/**
 * Verificar se usuário está autenticado (com verificação de token)
 */
const isAuthenticated = () => {
  const token = localStorage.getItem('multibpo_access_token');
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp > currentTime;
  } catch (error) {
    console.error('[API Client v3] Erro ao verificar token:', error);
    return false;
  }
};

/**
 * Obter usuário atual com validação
 */
const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('multibpo_user');
    if (!userStr) return null;
    
    const user = JSON.parse(userStr);
    
    // Validar se dados estão íntegros
    if (!user.email || !user.nome_completo) {
      console.warn('[API Client v3] Dados do usuário incompletos');
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('[API Client v3] Erro ao obter usuário atual:', error);
    return null;
  }
};

/**
 * Limpar autenticação com cleanup completo
 */
const clearAuth = () => {
  // Limpar localStorage
  localStorage.removeItem('multibpo_access_token');
  localStorage.removeItem('multibpo_refresh_token');
  localStorage.removeItem('multibpo_user');
  localStorage.removeItem('multibpo_remember');
  
  // Limpar estado do cliente
  clientState.activeRequests.clear();
  clientState.loadingNotifications.forEach(id => dismissNotification(id));
  clientState.loadingNotifications.clear();
  clientState.retryCounters.clear();
  
  console.log('[API Client v3] Autenticação limpa');
};

/**
 * Salvar autenticação com validação
 */
const saveAuth = (authData) => {
  try {
    if (authData.tokens?.access) {
      localStorage.setItem('multibpo_access_token', authData.tokens.access);
    }
    if (authData.tokens?.refresh) {
      localStorage.setItem('multibpo_refresh_token', authData.tokens.refresh);
    }
    if (authData.user) {
      localStorage.setItem('multibpo_user', JSON.stringify(authData.user));
    }
    
    console.log('[API Client v3] Autenticação salva para:', authData.user?.email);
  } catch (error) {
    console.error('[API Client v3] Erro ao salvar autenticação:', error);
  }
};

/**
 * Cancelar requisições ativas
 */
const cancelActiveRequests = () => {
  clientState.activeRequests.forEach((request, requestId) => {
    console.log(`[API Client v3] Cancelando requisição: ${request.method} ${request.url}`);
  });
  
  clientState.activeRequests.clear();
  clientState.loadingNotifications.forEach(id => dismissNotification(id));
  clientState.loadingNotifications.clear();
};

/**
 * Obter estatísticas do cliente
 */
const getStats = () => {
  return {
    totalRequests: clientState.totalRequests,
    successCount: clientState.successCount,
    errorCount: clientState.errorCount,
    activeRequests: clientState.activeRequests.size,
    successRate: clientState.totalRequests > 0 ? 
      ((clientState.successCount / clientState.totalRequests) * 100).toFixed(2) + '%' : '0%',
    lastRequestTime: clientState.lastRequestTime ? 
      new Date(clientState.lastRequestTime).toISOString() : null
  };
};

// ==========================================================================
// EXPORT DO CLIENTE API V3
// ==========================================================================
export const apiClientV3 = {
  // Métodos HTTP básicos
  get,
  post,
  put,
  patch,
  delete: del,
  
  // Métodos específicos MVP
  register,
  login,
  getProfile,
  logout,
  testBackend,
  testProtected,
  
  // Utilidades de autenticação
  isAuthenticated,
  getCurrentUser,
  clearAuth,
  saveAuth,
  
  // Utilidades de controle
  cancelActiveRequests,
  getStats,
  
  // Instância axios (para casos avançados)
  axios: axiosInstance,
  
  // Estado interno (readonly)
  get state() {
    return { ...clientState };
  }
};

// ==========================================================================
// INICIALIZAÇÃO GLOBAL
// ==========================================================================
export function initializeApiClientV3(config = {}) {
  // Atualizar configurações se fornecidas
  if (config.baseURL) API_CONFIG.baseURL = config.baseURL;
  if (config.timeout) API_CONFIG.timeout = config.timeout;
  if (config.retryAttempts) API_CONFIG.retryAttempts = config.retryAttempts;

  // Disponibilizar globalmente
  window.apiClientV3 = apiClientV3;
  
  // Manter compatibilidade com versão anterior
  if (!window.multibpoAPI) {
    window.multibpoAPI = apiClientV3;
  }
  
  console.log('[MultiBPO MVP] API Client v3 inicializado:', {
    baseURL: API_CONFIG.baseURL,
    timeout: API_CONFIG.timeout,
    retryAttempts: API_CONFIG.retryAttempts,
    authenticated: apiClientV3.isAuthenticated()
  });
}

// Auto-inicializar se estiver no browser
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initializeApiClientV3());
  } else {
    initializeApiClientV3();
  }
}

// Export default para compatibilidade
export default apiClientV3;