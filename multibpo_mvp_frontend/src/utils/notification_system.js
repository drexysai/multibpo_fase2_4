// ==========================================================================
// MultiBPO MVP Frontend - Sistema de Notificações Toast
// Mini-Fase MVP 3 - Mensagens de feedback consistentes
// 
// Sistema unificado de notificações com toast moderno e responsivo
// Integrado com error_handler.js e design system MULTIBPO
// ==========================================================================

/**
 * Tipos de notificação disponíveis
 */
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  LOADING: 'loading'
};

/**
 * Posições disponíveis para notificações
 */
export const NOTIFICATION_POSITIONS = {
  TOP_RIGHT: 'top-right',
  TOP_LEFT: 'top-left',
  TOP_CENTER: 'top-center',
  BOTTOM_RIGHT: 'bottom-right',
  BOTTOM_LEFT: 'bottom-left',
  BOTTOM_CENTER: 'bottom-center'
};

/**
 * Configurações padrão do sistema
 */
const DEFAULT_CONFIG = {
  position: NOTIFICATION_POSITIONS.TOP_RIGHT,
  duration: 5000,
  maxNotifications: 5,
  animationDuration: 300,
  enableSounds: false,
  pauseOnHover: true,
  showProgress: true,
  stackNotifications: true
};

/**
 * Templates e estilos para cada tipo de notificação
 */
const NOTIFICATION_STYLES = {
  [NOTIFICATION_TYPES.SUCCESS]: {
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
    iconColor: 'text-green-400',
    progressColor: 'bg-green-500',
    icon: `
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
      </svg>
    `
  },
  [NOTIFICATION_TYPES.ERROR]: {
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    iconColor: 'text-red-400',
    progressColor: 'bg-red-500',
    icon: `
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
      </svg>
    `
  },
  [NOTIFICATION_TYPES.WARNING]: {
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-800',
    iconColor: 'text-yellow-400',
    progressColor: 'bg-yellow-500',
    icon: `
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>
    `
  },
  [NOTIFICATION_TYPES.INFO]: {
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    iconColor: 'text-blue-400',
    progressColor: 'bg-blue-500',
    icon: `
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
      </svg>
    `
  },
  [NOTIFICATION_TYPES.LOADING]: {
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-800',
    iconColor: 'text-gray-400',
    progressColor: 'bg-gray-500',
    icon: `
      <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
      </svg>
    `
  }
};

/**
 * Classe principal do sistema de notificações
 */
export class NotificationSystem {
  
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.notifications = new Map();
    this.container = null;
    this.nextId = 1;
    
    this.init();
  }
  
  /**
   * Inicializar o sistema
   */
  init() {
    this.createContainer();
    this.injectStyles();
    
    // Log de inicialização
    console.log('[MultiBPO MVP] Notification System inicializado', {
      position: this.config.position,
      maxNotifications: this.config.maxNotifications
    });
  }
  
  /**
   * Criar container para notificações
   */
  createContainer() {
    // Remover container existente se houver
    const existingContainer = document.getElementById('multibpo-notifications');
    if (existingContainer) {
      existingContainer.remove();
    }
    
    this.container = document.createElement('div');
    this.container.id = 'multibpo-notifications';
    this.container.className = this.getContainerClasses();
    
    document.body.appendChild(this.container);
  }
  
  /**
   * Obter classes CSS para o container baseado na posição
   */
  getContainerClasses() {
    const baseClasses = 'fixed z-50 pointer-events-none';
    
    switch (this.config.position) {
      case NOTIFICATION_POSITIONS.TOP_RIGHT:
        return `${baseClasses} top-4 right-4 flex flex-col space-y-2`;
      case NOTIFICATION_POSITIONS.TOP_LEFT:
        return `${baseClasses} top-4 left-4 flex flex-col space-y-2`;
      case NOTIFICATION_POSITIONS.TOP_CENTER:
        return `${baseClasses} top-4 left-1/2 transform -translate-x-1/2 flex flex-col space-y-2 items-center`;
      case NOTIFICATION_POSITIONS.BOTTOM_RIGHT:
        return `${baseClasses} bottom-4 right-4 flex flex-col-reverse space-y-reverse space-y-2`;
      case NOTIFICATION_POSITIONS.BOTTOM_LEFT:
        return `${baseClasses} bottom-4 left-4 flex flex-col-reverse space-y-reverse space-y-2`;
      case NOTIFICATION_POSITIONS.BOTTOM_CENTER:
        return `${baseClasses} bottom-4 left-1/2 transform -translate-x-1/2 flex flex-col-reverse space-y-reverse space-y-2 items-center`;
      default:
        return `${baseClasses} top-4 right-4 flex flex-col space-y-2`;
    }
  }
  
  /**
   * Injetar estilos CSS necessários
   */
  injectStyles() {
    const styleId = 'multibpo-notification-styles';
    
    // Remover estilos existentes
    const existingStyles = document.getElementById(styleId);
    if (existingStyles) {
      existingStyles.remove();
    }
    
    const styles = document.createElement('style');
    styles.id = styleId;
    styles.textContent = `
      .multibpo-notification {
        transition: all ${this.config.animationDuration}ms ease-in-out;
        transform: translateX(0);
        opacity: 1;
        max-width: 24rem;
        width: 100%;
      }
      
      .multibpo-notification.entering {
        transform: translateX(100%);
        opacity: 0;
      }
      
      .multibpo-notification.exiting {
        transform: translateX(100%);
        opacity: 0;
        max-height: 0;
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
      
      .multibpo-notification:hover .notification-progress {
        animation-play-state: paused;
      }
      
      .notification-progress {
        height: 3px;
        background: currentColor;
        border-radius: 0 0 0.375rem 0.375rem;
        animation: progress linear;
      }
      
      @keyframes progress {
        from { width: 100%; }
        to { width: 0%; }
      }
      
      @media (max-width: 640px) {
        .multibpo-notification {
          max-width: calc(100vw - 2rem);
          margin: 0 1rem;
        }
      }
    `;
    
    document.head.appendChild(styles);
  }
  
  /**
   * Mostrar notificação
   * @param {string} message - Mensagem da notificação
   * @param {string} type - Tipo da notificação
   * @param {Object} options - Opções adicionais
   * @returns {string} ID da notificação
   */
  show(message, type = NOTIFICATION_TYPES.INFO, options = {}) {
    const notificationId = this.generateId();
    
    const notification = {
      id: notificationId,
      message,
      type,
      title: options.title || '',
      duration: options.duration !== undefined ? options.duration : this.config.duration,
      persistent: options.persistent || false,
      onClick: options.onClick || null,
      onClose: options.onClose || null,
      createdAt: Date.now()
    };
    
    // Limitar número máximo de notificações
    this.enforceMaxNotifications();
    
    // Criar elemento DOM
    const element = this.createElement(notification);
    notification.element = element;
    
    // Adicionar ao container com animação
    this.container.appendChild(element);
    this.notifications.set(notificationId, notification);
    
    // Trigger animação de entrada
    requestAnimationFrame(() => {
      element.classList.remove('entering');
    });
    
    // Configurar auto-dismiss se não for persistente
    if (!notification.persistent && notification.duration > 0) {
      notification.timeoutId = setTimeout(() => {
        this.dismiss(notificationId);
      }, notification.duration);
    }
    
    // Log para debug
    console.log(`[Notification] Showing: ${type} - ${message}`);
    
    return notificationId;
  }
  
  /**
   * Gerar ID único para notificação
   */
  generateId() {
    return `notification_${this.nextId++}_${Date.now()}`;
  }
  
  /**
   * Enforcar limite máximo de notificações
   */
  enforceMaxNotifications() {
    if (this.notifications.size >= this.config.maxNotifications) {
      // Remover a notificação mais antiga
      const oldestId = Array.from(this.notifications.keys())[0];
      this.dismiss(oldestId, true);
    }
  }
  
  /**
   * Criar elemento DOM para notificação
   * @param {Object} notification - Dados da notificação
   * @returns {HTMLElement} Elemento criado
   */
  createElement(notification) {
    const style = NOTIFICATION_STYLES[notification.type];
    
    const element = document.createElement('div');
    element.className = `multibpo-notification entering pointer-events-auto`;
    element.setAttribute('data-notification-id', notification.id);
    element.setAttribute('role', 'alert');
    element.setAttribute('aria-live', 'polite');
    
    // Configurar hover para pausar
    if (this.config.pauseOnHover && !notification.persistent) {
      this.setupHoverPause(element, notification);
    }
    
    // Configurar click handler
    if (notification.onClick) {
      element.style.cursor = 'pointer';
      element.addEventListener('click', () => {
        notification.onClick(notification);
      });
    }
    
    element.innerHTML = `
      <div class="rounded-lg border-l-4 ${style.bgColor} ${style.borderColor} p-4 shadow-lg">
        <div class="flex items-start">
          <div class="flex-shrink-0 ${style.iconColor}">
            ${style.icon}
          </div>
          <div class="ml-3 flex-1">
            ${notification.title ? `
              <h3 class="text-sm font-medium ${style.textColor}">
                ${this.escapeHtml(notification.title)}
              </h3>
            ` : ''}
            <div class="text-sm ${style.textColor} ${notification.title ? 'mt-1' : ''}">
              ${this.escapeHtml(notification.message)}
            </div>
          </div>
          <div class="ml-4 flex-shrink-0 flex">
            <button
              class="rounded-md inline-flex ${style.textColor} hover:${style.iconColor} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onclick="window.notificationSystem.dismiss('${notification.id}')"
              aria-label="Fechar notificação"
            >
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>
        </div>
        
        ${this.config.showProgress && !notification.persistent && notification.duration > 0 ? `
          <div class="mt-2 relative">
            <div class="notification-progress ${style.progressColor}" style="animation-duration: ${notification.duration}ms;"></div>
          </div>
        ` : ''}
      </div>
    `;
    
    return element;
  }
  
  /**
   * Configurar pause no hover
   * @param {HTMLElement} element - Elemento da notificação
   * @param {Object} notification - Dados da notificação
   */
  setupHoverPause(element, notification) {
    let remainingTime = notification.duration;
    let pausedAt = null;
    
    element.addEventListener('mouseenter', () => {
      if (notification.timeoutId) {
        clearTimeout(notification.timeoutId);
        pausedAt = Date.now();
        
        const progress = element.querySelector('.notification-progress');
        if (progress) {
          progress.style.animationPlayState = 'paused';
        }
      }
    });
    
    element.addEventListener('mouseleave', () => {
      if (pausedAt) {
        const pausedDuration = Date.now() - pausedAt;
        remainingTime -= pausedDuration;
        
        if (remainingTime > 0) {
          notification.timeoutId = setTimeout(() => {
            this.dismiss(notification.id);
          }, remainingTime);
          
          const progress = element.querySelector('.notification-progress');
          if (progress) {
            progress.style.animationDuration = `${remainingTime}ms`;
            progress.style.animationPlayState = 'running';
          }
        }
        
        pausedAt = null;
      }
    });
  }
  
  /**
   * Escapar HTML para prevenir XSS
   * @param {string} text - Texto a escapar
   * @returns {string} Texto escapado
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Remover notificação
   * @param {string} notificationId - ID da notificação
   * @param {boolean} force - Forçar remoção imediata
   */
  dismiss(notificationId, force = false) {
    const notification = this.notifications.get(notificationId);
    if (!notification) return;
    
    // Limpar timeout se existir
    if (notification.timeoutId) {
      clearTimeout(notification.timeoutId);
    }
    
    // Chamar callback onClose
    if (notification.onClose) {
      try {
        notification.onClose(notification);
      } catch (error) {
        console.warn('[Notification] Erro no callback onClose:', error);
      }
    }
    
    if (force) {
      // Remoção imediata
      this.removeElement(notification);
    } else {
      // Animação de saída
      notification.element.classList.add('exiting');
      
      setTimeout(() => {
        this.removeElement(notification);
      }, this.config.animationDuration);
    }
  }
  
  /**
   * Remover elemento do DOM e do Map
   * @param {Object} notification - Notificação a remover
   */
  removeElement(notification) {
    if (notification.element && notification.element.parentNode) {
      notification.element.parentNode.removeChild(notification.element);
    }
    this.notifications.delete(notification.id);
  }
  
  /**
   * Limpar todas as notificações
   */
  clear() {
    const notificationIds = Array.from(this.notifications.keys());
    notificationIds.forEach(id => this.dismiss(id, true));
  }
  
  /**
   * Atualizar configurações
   * @param {Object} newConfig - Novas configurações
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Recriar container se posição mudou
    if (newConfig.position) {
      this.createContainer();
    }
  }
  
  /**
   * Obter estatísticas do sistema
   * @returns {Object} Estatísticas
   */
  getStats() {
    return {
      activeNotifications: this.notifications.size,
      maxNotifications: this.config.maxNotifications,
      position: this.config.position,
      totalShown: this.nextId - 1
    };
  }
}

/**
 * Instância global do sistema de notificações
 */
export const notificationSystem = new NotificationSystem();

/**
 * Funções de conveniência para mostrar notificações
 */
export const showNotification = (message, type = NOTIFICATION_TYPES.INFO, options = {}) => {
  return notificationSystem.show(message, type, options);
};

export const showSuccess = (message, options = {}) => {
  return notificationSystem.show(message, NOTIFICATION_TYPES.SUCCESS, options);
};

export const showError = (message, options = {}) => {
  return notificationSystem.show(message, NOTIFICATION_TYPES.ERROR, {
    duration: 7000,
    ...options
  });
};

export const showWarning = (message, options = {}) => {
  return notificationSystem.show(message, NOTIFICATION_TYPES.WARNING, options);
};

export const showInfo = (message, options = {}) => {
  return notificationSystem.show(message, NOTIFICATION_TYPES.INFO, options);
};

export const showLoading = (message, options = {}) => {
  return notificationSystem.show(message, NOTIFICATION_TYPES.LOADING, {
    persistent: true,
    duration: 0,
    ...options
  });
};

/**
 * Funções para gerenciar notificações
 */
export const dismissNotification = (id) => {
  notificationSystem.dismiss(id);
};

export const clearAllNotifications = () => {
  notificationSystem.clear();
};

/**
 * Inicializar sistema globalmente
 */
export function initializeNotificationSystem(config = {}) {
  // Atualizar configurações se fornecidas
  if (Object.keys(config).length > 0) {
    notificationSystem.updateConfig(config);
  }
  
  // Disponibilizar globalmente
  window.notificationSystem = notificationSystem;
  window.showNotification = showNotification;
  window.showSuccess = showSuccess;
  window.showError = showError;
  window.showWarning = showWarning;
  window.showInfo = showInfo;
  window.showLoading = showLoading;
  window.dismissNotification = dismissNotification;
  window.clearAllNotifications = clearAllNotifications;
  
  console.log('[MultiBPO MVP] Notification System disponível globalmente');
}

// Auto-inicializar se estiver no browser
if (typeof window !== 'undefined') {
  // Aguardar DOM estar pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initializeNotificationSystem());
  } else {
    initializeNotificationSystem();
  }
}

// Export default para compatibilidade
export default notificationSystem;