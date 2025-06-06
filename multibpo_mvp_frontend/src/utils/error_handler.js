// ==========================================================================
// MultiBPO MVP Frontend - Sistema Unificado de Error Handling
// Mini-Fase MVP 3 - Error handling robusto
// 
// Sistema central para tratamento consistente de erros em todo o frontend
// Compatível com api_client.js existente e todas as páginas Astro
// ==========================================================================

/**
 * Tipos de erro padronizados para o MVP
 */
export const ERROR_TYPES = {
  NETWORK: 'network',
  VALIDATION: 'validation', 
  AUTH: 'auth',
  SERVER: 'server',
  TIMEOUT: 'timeout',
  UNKNOWN: 'unknown'
};

/**
 * Códigos de status HTTP para categorização
 */
const HTTP_STATUS_CATEGORIES = {
  400: ERROR_TYPES.VALIDATION,
  401: ERROR_TYPES.AUTH,
  403: ERROR_TYPES.AUTH,
  404: ERROR_TYPES.SERVER,
  422: ERROR_TYPES.VALIDATION,
  429: ERROR_TYPES.SERVER,
  500: ERROR_TYPES.SERVER,
  502: ERROR_TYPES.SERVER,
  503: ERROR_TYPES.SERVER
};

/**
 * Mensagens de erro personalizadas para o contexto contábil MVP
 */
const ERROR_MESSAGES = {
  [ERROR_TYPES.NETWORK]: {
    title: 'Erro de Conexão',
    message: 'Verifique sua conexão com a internet e tente novamente.',
    icon: '🌐',
    color: 'orange'
  },
  [ERROR_TYPES.VALIDATION]: {
    title: 'Dados Inválidos',
    message: 'Verifique os dados preenchidos e tente novamente.',
    icon: '⚠️',
    color: 'yellow'
  },
  [ERROR_TYPES.AUTH]: {
    title: 'Erro de Autenticação',
    message: 'Sua sessão expirou. Faça login novamente.',
    icon: '🔐',
    color: 'red'
  },
  [ERROR_TYPES.SERVER]: {
    title: 'Erro do Servidor',
    message: 'Erro interno do sistema. Tente novamente em alguns instantes.',
    icon: '🔧',
    color: 'red'
  },
  [ERROR_TYPES.TIMEOUT]: {
    title: 'Timeout',
    message: 'A operação demorou muito para responder. Tente novamente.',
    icon: '⏱️',
    color: 'orange'
  },
  [ERROR_TYPES.UNKNOWN]: {
    title: 'Erro Inesperado',
    message: 'Ocorreu um erro inesperado. Tente novamente.',
    icon: '❌',
    color: 'red'
  }
};

/**
 * Classe principal para tratamento de erros
 */
export class ErrorHandler {
  
  /**
   * Processar erro e retornar informações padronizadas
   * @param {Error|Object} error - Erro capturado
   * @param {string} context - Contexto onde o erro ocorreu (ex: 'login', 'cadastro')
   * @returns {Object} Informações do erro processadas
   */
  static processError(error, context = 'unknown') {
    console.group(`[ErrorHandler] Processando erro - Context: ${context}`);
    console.error('Error original:', error);
    
    let errorType = ERROR_TYPES.UNKNOWN;
    let errorMessage = '';
    let httpStatus = null;
    let fieldErrors = {};
    
    // =======================================================================
    // ANÁLISE DO TIPO DE ERRO
    // =======================================================================
    
    // Erro de rede (sem response)
    if (!error.response && (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED')) {
      errorType = error.code === 'ECONNABORTED' ? ERROR_TYPES.TIMEOUT : ERROR_TYPES.NETWORK;
    }
    // Erro HTTP com response
    else if (error.response) {
      httpStatus = error.response.status;
      errorType = HTTP_STATUS_CATEGORIES[httpStatus] || ERROR_TYPES.SERVER;
      
      // Extrair mensagem do backend se disponível
      if (error.response.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      // Extrair erros de campo para validação
      if (error.response.data?.errors && typeof error.response.data.errors === 'object') {
        fieldErrors = error.response.data.errors;
      }
    }
    // Erro JavaScript nativo
    else if (error instanceof Error) {
      errorType = ERROR_TYPES.UNKNOWN;
      errorMessage = error.message;
    }
    
    // Usar mensagem padrão se não tiver mensagem específica
    if (!errorMessage) {
      errorMessage = ERROR_MESSAGES[errorType].message;
    }
    
    const processedError = {
      type: errorType,
      message: errorMessage,
      title: ERROR_MESSAGES[errorType].title,
      icon: ERROR_MESSAGES[errorType].icon,
      color: ERROR_MESSAGES[errorType].color,
      httpStatus,
      fieldErrors,
      context,
      timestamp: new Date().toISOString(),
      originalError: error
    };
    
    console.log('Error processado:', processedError);
    console.groupEnd();
    
    return processedError;
  }
  
  /**
   * Exibir erro usando sistema de notificação
   * @param {Error|Object} error - Erro para exibir
   * @param {string} context - Contexto do erro
   * @param {Object} options - Opções de exibição
   */
  static showError(error, context = 'unknown', options = {}) {
    const processedError = this.processError(error, context);
    
    // Usar sistema de notificação se disponível
    if (window.showNotification) {
      window.showNotification(
        processedError.message,
        'error',
        {
          title: processedError.title,
          icon: processedError.icon,
          duration: options.duration || 5000,
          persistent: processedError.type === ERROR_TYPES.AUTH
        }
      );
    }
    // Fallback para alert se notificação não disponível
    else {
      alert(`${processedError.title}: ${processedError.message}`);
    }
    
    // Log para monitoramento
    this.logError(processedError);
    
    return processedError;
  }
  
  /**
   * Exibir erros de campo em formulários
   * @param {Object} fieldErrors - Erros por campo
   * @param {string} formId - ID do formulário (opcional)
   */
  static showFieldErrors(fieldErrors, formId = null) {
    Object.entries(fieldErrors).forEach(([fieldName, messages]) => {
      const message = Array.isArray(messages) ? messages[0] : messages;
      this.showFieldError(fieldName, message, formId);
    });
  }
  
  /**
   * Exibir erro em campo específico
   * @param {string} fieldName - Nome do campo
   * @param {string} message - Mensagem de erro
   * @param {string} formId - ID do formulário (opcional)
   */
  static showFieldError(fieldName, message, formId = null) {
    const fieldSelector = formId ? `#${formId} #${fieldName}` : `#${fieldName}`;
    const field = document.querySelector(fieldSelector);
    
    if (field) {
      // Adicionar classes de erro
      field.classList.add('border-red-500', 'focus:ring-red-500');
      field.classList.remove('border-gray-300', 'focus:ring-blue-500');
      
      // Encontrar ou criar elemento de erro
      let errorElement = field.parentElement.querySelector('.field-error-message');
      if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'field-error-message text-red-500 text-sm mt-1';
        field.parentElement.appendChild(errorElement);
      }
      
      errorElement.textContent = message;
      errorElement.classList.remove('hidden');
    }
  }
  
  /**
   * Limpar erros de campo
   * @param {string} fieldName - Nome do campo (opcional, limpa todos se null)
   * @param {string} formId - ID do formulário (opcional)
   */
  static clearFieldErrors(fieldName = null, formId = null) {
    const baseSelector = formId ? `#${formId}` : '';
    
    if (fieldName) {
      // Limpar campo específico
      const fieldSelector = `${baseSelector} #${fieldName}`;
      const field = document.querySelector(fieldSelector);
      
      if (field) {
        field.classList.remove('border-red-500', 'focus:ring-red-500');
        field.classList.add('border-gray-300', 'focus:ring-blue-500');
        
        const errorElement = field.parentElement.querySelector('.field-error-message');
        if (errorElement) {
          errorElement.classList.add('hidden');
        }
      }
    } else {
      // Limpar todos os campos
      const selector = `${baseSelector} .field-error-message`;
      document.querySelectorAll(selector).forEach(element => {
        element.classList.add('hidden');
      });
      
      const fieldSelector = `${baseSelector} input, ${baseSelector} select, ${baseSelector} textarea`;
      document.querySelectorAll(fieldSelector).forEach(field => {
        field.classList.remove('border-red-500', 'focus:ring-red-500');
        field.classList.add('border-gray-300', 'focus:ring-blue-500');
      });
    }
  }
  
  /**
   * Verificar se erro requer redirecionamento
   * @param {Object} processedError - Erro processado
   * @returns {string|null} URL para redirecionamento ou null
   */
  static getRedirectUrl(processedError) {
    // Erro de autenticação - redirecionar para login
    if (processedError.type === ERROR_TYPES.AUTH) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/cadastro') {
        return '/login?expired=true';
      }
    }
    
    return null;
  }
  
  /**
   * Executar ação de recuperação baseada no tipo de erro
   * @param {Object} processedError - Erro processado
   * @param {Object} options - Opções de recuperação
   */
  static executeRecoveryAction(processedError, options = {}) {
    const redirectUrl = this.getRedirectUrl(processedError);
    
    if (redirectUrl && !options.preventRedirect) {
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 2000);
    }
    
    // Limpar dados de autenticação se erro de auth
    if (processedError.type === ERROR_TYPES.AUTH && window.multibpoAPI) {
      window.multibpoAPI.clearAuth();
    }
  }
  
  /**
   * Log estruturado para monitoramento
   * @param {Object} processedError - Erro processado
   */
  static logError(processedError) {
    const logData = {
      timestamp: processedError.timestamp,
      type: processedError.type,
      context: processedError.context,
      message: processedError.message,
      httpStatus: processedError.httpStatus,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: window.multibpoAPI?.getCurrentUser()?.id || 'anonymous'
    };
    
    // Log no console para desenvolvimento
    console.error('[MultiBPO MVP] Error Log:', logData);
    
    // TODO: Enviar para serviço de monitoramento em produção
    // analytics.track('error_occurred', logData);
  }
  
  /**
   * Criar handler genérico para promises com contexto
   * @param {string} context - Contexto da operação
   * @param {Object} options - Opções do handler
   * @returns {Function} Handler de erro
   */
  static createHandler(context, options = {}) {
    return (error) => {
      const processedError = this.showError(error, context, options);
      
      if (!options.preventRecovery) {
        this.executeRecoveryAction(processedError, options);
      }
      
      // Re-throw se necessário para chain de promises
      if (options.rethrow) {
        throw processedError;
      }
      
      return processedError;
    };
  }
}

/**
 * Handlers especializados para contextos específicos do MVP
 */
export const ErrorHandlers = {
  
  // Handler para operações de autenticação
  auth: (error, action = 'unknown') => {
    return ErrorHandler.showError(error, `auth_${action}`, {
      duration: 6000
    });
  },
  
  // Handler para operações de formulário
  form: (error, formName = 'unknown') => {
    const processedError = ErrorHandler.processError(error, `form_${formName}`);
    
    // Mostrar erros de campo se disponíveis
    if (Object.keys(processedError.fieldErrors).length > 0) {
      ErrorHandler.showFieldErrors(processedError.fieldErrors);
    } else {
      ErrorHandler.showError(error, `form_${formName}`);
    }
    
    return processedError;
  },
  
  // Handler para operações de API
  api: (error, endpoint = 'unknown') => {
    return ErrorHandler.createHandler(`api_${endpoint}`, {
      duration: 4000,
      preventRecovery: false
    })(error);
  },
  
  // Handler para navegação e redirecionamento
  navigation: (error, page = 'unknown') => {
    return ErrorHandler.showError(error, `navigation_${page}`, {
      duration: 3000,
      preventRecovery: true
    });
  }
};

/**
 * Inicializar error handler globalmente
 */
export function initializeErrorHandler() {
  // Capturar erros JavaScript não tratados
  window.addEventListener('error', (event) => {
    ErrorHandler.logError(ErrorHandler.processError(event.error, 'unhandled_js'));
  });
  
  // Capturar promises rejeitadas não tratadas
  window.addEventListener('unhandledrejection', (event) => {
    ErrorHandler.logError(ErrorHandler.processError(event.reason, 'unhandled_promise'));
  });
  
  // Disponibilizar globalmente
  window.ErrorHandler = ErrorHandler;
  window.ErrorHandlers = ErrorHandlers;
  
  console.log('[MultiBPO MVP] Error Handler inicializado');
}

// Auto-inicializar se estiver no browser
if (typeof window !== 'undefined') {
  initializeErrorHandler();
}

// Export default para compatibilidade
export default ErrorHandler;