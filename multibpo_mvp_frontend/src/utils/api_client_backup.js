// ==========================================================================
// MultiBPO MVP Frontend - Cliente HTTP API
// Mini-Fase MVP 2 - Frontend básico
// 
// Cliente Axios para integração com backend Django MVP
// Interceptors JWT, error handling e configurações
// ==========================================================================

import axios from 'axios';

// ==========================================================================
// CONFIGURAÇÕES DA API
// ==========================================================================
const API_CONFIG = {
  baseURL: window.MULTIBPO_CONFIG?.API_BASE_URL || 'http://192.168.1.4:8082/api/v1/mvp',
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
};

// ==========================================================================
// CRIAR INSTÂNCIA AXIOS
// ==========================================================================
const axiosInstance = axios.create(API_CONFIG);

// ==========================================================================
// INTERCEPTOR DE REQUEST (ADICIONAR JWT TOKEN)
// ==========================================================================
axiosInstance.interceptors.request.use(
  (config) => {
    // Adicionar JWT token se disponível
    const token = localStorage.getItem('multibpo_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log para desenvolvimento
    if (window.MULTIBPO_CONFIG?.APP_NAME) {
      console.log(`[${window.MULTIBPO_CONFIG.APP_NAME}] API Request:`, {
        method: config.method.toUpperCase(),
        url: config.url,
        data: config.data,
        headers: config.headers
      });
    }

    return config;
  },
  (error) => {
    console.error('[API Client] Request Error:', error);
    return Promise.reject(error);
  }
);

// ==========================================================================
// INTERCEPTOR DE RESPONSE (REFRESH TOKEN E ERROR HANDLING)
// ==========================================================================
axiosInstance.interceptors.response.use(
  (response) => {
    // Log para desenvolvimento
    if (window.MULTIBPO_CONFIG?.APP_NAME) {
      console.log(`[${window.MULTIBPO_CONFIG.APP_NAME}] API Response:`, {
        status: response.status,
        url: response.config.url,
        data: response.data
      });
    }

    // Retornar dados da resposta diretamente
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // Log de erro para desenvolvimento
    console.error('[API Client] Response Error:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message,
      data: error.response?.data
    });

    // =======================================================================
    // HANDLE TOKEN EXPIRADO (401)
    // =======================================================================
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('multibpo_refresh_token');
        
        if (refreshToken) {
          console.log('[API Client] Tentando refresh do token...');
          
          // Tentar renovar token
          const refreshResponse = await axios.post(
            `${API_CONFIG.baseURL.replace('/mvp', '')}/token/refresh/`,
            { refresh: refreshToken },
            { 
              headers: { 'Content-Type': 'application/json' },
              timeout: 10000 
            }
          );

          if (refreshResponse.data?.access) {
            // Salvar novo token
            localStorage.setItem('multibpo_access_token', refreshResponse.data.access);
            
            // Atualizar header da requisição original
            originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.access}`;
            
            console.log('[API Client] Token renovado com sucesso');
            
            // Repetir requisição original
            return axiosInstance(originalRequest);
          }
        }
      } catch (refreshError) {
        console.error('[API Client] Erro no refresh do token:', refreshError);
        
        // Refresh falhou, limpar storage e redirecionar
        localStorage.clear();
        
        // Só redirecionar se não estivermos já na página de login
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?expired=true';
        }
        
        return Promise.reject(refreshError);
      }

      // Se chegou até aqui, refresh falhou
      localStorage.clear();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?expired=true';
      }
    }

    // =======================================================================
    // HANDLE OUTROS ERROS HTTP
    // =======================================================================
    const errorResponse = {
      success: false,
      message: getErrorMessage(error),
      status: error.response?.status,
      data: error.response?.data,
      response: error.response
    };

    return Promise.reject(errorResponse);
  }
);

// ==========================================================================
// FUNÇÃO PARA EXTRAIR MENSAGEM DE ERRO
// ==========================================================================
function getErrorMessage(error) {
  // Mensagem do backend
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  // Mensagens baseadas no status HTTP
  switch (error.response?.status) {
    case 400:
      return 'Dados inválidos. Verifique os campos preenchidos.';
    case 401:
      return 'Não autorizado. Faça login novamente.';
    case 403:
      return 'Acesso negado. Você não tem permissão.';
    case 404:
      return 'Recurso não encontrado.';
    case 422:
      return 'Erro de validação. Verifique os dados enviados.';
    case 429:
      return 'Muitas tentativas. Tente novamente em alguns minutos.';
    case 500:
      return 'Erro interno do servidor. Tente novamente.';
    case 502:
      return 'Servidor indisponível. Tente novamente.';
    case 503:
      return 'Serviço temporariamente indisponível.';
    default:
      break;
  }

  // Mensagem de erro de rede
  if (error.code === 'ECONNABORTED') {
    return 'Timeout: Operação demorou muito para responder.';
  }

  if (error.code === 'ERR_NETWORK') {
    return 'Erro de rede. Verifique sua conexão com a internet.';
  }

  // Mensagem genérica
  return error.message || 'Erro inesperado. Tente novamente.';
}

// ==========================================================================
// FUNÇÕES AUXILIARES PARA CHAMADAS API
// ==========================================================================

/**
 * Fazer requisição GET
 * @param {string} endpoint - Endpoint da API (ex: '/profile/')
 * @param {object} config - Configurações adicionais
 * @returns {Promise} Response data
 */
const get = (endpoint, config = {}) => {
  return axiosInstance.get(endpoint, config);
};

/**
 * Fazer requisição POST
 * @param {string} endpoint - Endpoint da API (ex: '/login/')
 * @param {object} data - Dados para enviar
 * @param {object} config - Configurações adicionais
 * @returns {Promise} Response data
 */
const post = (endpoint, data = {}, config = {}) => {
  return axiosInstance.post(endpoint, data, config);
};

/**
 * Fazer requisição PUT
 * @param {string} endpoint - Endpoint da API
 * @param {object} data - Dados para enviar
 * @param {object} config - Configurações adicionais
 * @returns {Promise} Response data
 */
const put = (endpoint, data = {}, config = {}) => {
  return axiosInstance.put(endpoint, data, config);
};

/**
 * Fazer requisição PATCH
 * @param {string} endpoint - Endpoint da API
 * @param {object} data - Dados para enviar
 * @param {object} config - Configurações adicionais
 * @returns {Promise} Response data
 */
const patch = (endpoint, data = {}, config = {}) => {
  return axiosInstance.patch(endpoint, data, config);
};

/**
 * Fazer requisição DELETE
 * @param {string} endpoint - Endpoint da API
 * @param {object} config - Configurações adicionais
 * @returns {Promise} Response data
 */
const del = (endpoint, config = {}) => {
  return axiosInstance.delete(endpoint, config);
};

// ==========================================================================
// FUNÇÕES ESPECÍFICAS PARA AUTENTICAÇÃO MVP
// ==========================================================================

/**
 * Registrar novo usuário MVP
 * @param {object} userData - Dados do usuário
 * @returns {Promise} Response com tokens e dados do usuário
 */
const register = (userData) => {
  return post('/register/', userData);
};

/**
 * Fazer login no sistema MVP
 * @param {object} credentials - Email e senha
 * @returns {Promise} Response com tokens e dados do usuário
 */
const login = (credentials) => {
  return post('/login/', credentials);
};

/**
 * Obter perfil do usuário autenticado
 * @returns {Promise} Response com dados do perfil
 */
const getProfile = () => {
  return get('/profile/');
};

/**
 * Fazer logout seguro
 * @param {string} refreshToken - Refresh token para invalidar
 * @returns {Promise} Response de confirmação
 */
const logout = (refreshToken) => {
  return post('/logout/', { refresh_token: refreshToken });
};

/**
 * Testar conectividade com o backend
 * @returns {Promise} Response com status do sistema
 */
const testBackend = () => {
  return get('/test/');
};

/**
 * Testar endpoint protegido (requer autenticação)
 * @returns {Promise} Response com dados do teste
 */
const testProtected = () => {
  return get('/protected-test/');
};

// ==========================================================================
// UTILIDADES PARA GERENCIAMENTO DE TOKENS
// ==========================================================================

/**
 * Verificar se usuário está autenticado
 * @returns {boolean} True se possui token válido
 */
const isAuthenticated = () => {
  const token = localStorage.getItem('multibpo_access_token');
  if (!token) return false;

  try {
    // Decodificar JWT para verificar expiração
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    
    return payload.exp > currentTime;
  } catch (error) {
    console.error('[API Client] Erro ao verificar token:', error);
    return false;
  }
};

/**
 * Obter dados do usuário do localStorage
 * @returns {object|null} Dados do usuário ou null
 */
const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('multibpo_user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('[API Client] Erro ao obter usuário atual:', error);
    return null;
  }
};

/**
 * Limpar dados de autenticação
 */
const clearAuth = () => {
  localStorage.removeItem('multibpo_access_token');
  localStorage.removeItem('multibpo_refresh_token');
  localStorage.removeItem('multibpo_user');
  localStorage.removeItem('multibpo_remember');
};

/**
 * Salvar dados de autenticação
 * @param {object} authData - Dados de autenticação (tokens + user)
 */
const saveAuth = (authData) => {
  if (authData.tokens?.access) {
    localStorage.setItem('multibpo_access_token', authData.tokens.access);
  }
  if (authData.tokens?.refresh) {
    localStorage.setItem('multibpo_refresh_token', authData.tokens.refresh);
  }
  if (authData.user) {
    localStorage.setItem('multibpo_user', JSON.stringify(authData.user));
  }
};

// ==========================================================================
// EXPORT DO CLIENTE API
// ==========================================================================
export const apiClient = {
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
  
  // Instância axios (para casos avançados)
  axios: axiosInstance
};

// Export default para compatibilidade
export default apiClient;

// ==========================================================================
// CONFIGURAÇÃO GLOBAL PARA DESENVOLVIMENTO
// ==========================================================================
if (typeof window !== 'undefined') {
  // Disponibilizar cliente API globalmente para debug
  window.multibpoAPI = apiClient;
  
  // Log de inicialização
  console.log('[MultiBPO MVP] API Client inicializado:', {
    baseURL: API_CONFIG.baseURL,
    timeout: API_CONFIG.timeout,
    authenticated: apiClient.isAuthenticated(),
    user: apiClient.getCurrentUser()?.nome_completo || 'Não logado'
  });
}

// ==========================================================================
// FUNCIONALIDADES DO API CLIENT:
//
// 1. CONFIGURAÇÃO AUTOMÁTICA:
//    - Base URL configurável via window.MULTIBPO_CONFIG
//    - Headers padrão JSON
//    - Timeout de 30 segundos
//
// 2. INTERCEPTORS INTELIGENTES:
//    - Request: Adiciona JWT token automaticamente
//    - Response: Refresh automático de tokens
//    - Error handling: Mensagens específicas por status
//
// 3. REFRESH TOKEN AUTOMÁTICO:
//    - Detecta token expirado (401)
//    - Tenta renovar automaticamente
//    - Re-executa requisição original
//    - Limpa storage se refresh falhar
//
// 4. MÉTODOS ESPECÍFICOS MVP:
//    - register(), login(), getProfile(), logout()
//    - testBackend(), testProtected()
//    - Funções prontas para usar no frontend
//
// 5. UTILIDADES DE AUTENTICAÇÃO:
//    - isAuthenticated(): Verifica token válido
//    - getCurrentUser(): Dados do localStorage
//    - saveAuth(), clearAuth(): Gerenciamento storage
//
// 6. ERROR HANDLING ROBUSTO:
//    - Mensagens específicas por status HTTP
//    - Diferenciação entre erro de rede e servidor
//    - Logs detalhados para desenvolvimento
//
// 7. DEBUG E DESENVOLVIMENTO:
//    - Logs automáticos de requests/responses
//    - window.multibpoAPI global para debug
//    - Informações de inicialização
// ==========================================================================