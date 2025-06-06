// ==========================================================================
// MultiBPO MVP Frontend - Sistema de Validações em Tempo Real
// Mini-Fase MVP 3 - Validações em tempo real nos formulários
// 
// Sistema de validação instantânea para formulários com feedback visual
// Compatível com validações brasileiras e integrado com error_handler.js
// ==========================================================================

import { ErrorHandler } from './error_handler.js';

/**
 * Tipos de validação disponíveis
 */
export const VALIDATION_TYPES = {
  REQUIRED: 'required',
  EMAIL: 'email',
  PASSWORD: 'password',
  CPF: 'cpf',
  CNPJ: 'cnpj',
  PHONE: 'phone',
  MIN_LENGTH: 'min_length',
  MAX_LENGTH: 'max_length',
  CONFIRM_PASSWORD: 'confirm_password',
  CUSTOM: 'custom'
};

/**
 * Configurações padrão para validações
 */
const VALIDATION_CONFIG = {
  debounceDelay: 300,  // ms para debounce de validação
  showSuccessIndicator: true,
  showErrorOnFirstFocus: false,
  clearErrorOnFocus: true
};

/**
 * Regex patterns para validações brasileiras
 */
const PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  cpf: /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/,
  cnpj: /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/,
  phone: /^(\+55\s?)?(\(\d{2}\)\s?|\d{2}\s?)?\d{4,5}-?\d{4}$/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
};

/**
 * Mensagens de erro personalizadas
 */
const ERROR_MESSAGES = {
  required: 'Este campo é obrigatório',
  email: 'Email inválido',
  password_weak: 'Senha deve ter pelo menos 8 caracteres',
  password_strong: 'Senha deve conter: maiúscula, minúscula, número e símbolo',
  cpf: 'CPF inválido',
  cnpj: 'CNPJ inválido',
  phone: 'Telefone inválido',
  min_length: 'Mínimo de {min} caracteres',
  max_length: 'Máximo de {max} caracteres',
  confirm_password: 'Senhas não coincidem',
  custom: 'Valor inválido'
};

/**
 * Classe principal para validações em tempo real
 */
export class RealTimeValidator {
  
  constructor(options = {}) {
    this.config = { ...VALIDATION_CONFIG, ...options };
    this.validators = new Map();
    this.debounceTimers = new Map();
    this.fieldStates = new Map();
  }
  
  /**
   * Adicionar validação a um campo
   * @param {string} fieldId - ID do campo
   * @param {Array} rules - Regras de validação
   * @param {Object} options - Opções específicas do campo
   */
  addField(fieldId, rules, options = {}) {
    const field = document.getElementById(fieldId);
    if (!field) {
      console.warn(`[Validator] Campo não encontrado: ${fieldId}`);
      return;
    }
    
    const fieldConfig = {
      rules,
      options: { ...this.config, ...options },
      element: field,
      isValid: false,
      hasBeenValidated: false
    };
    
    this.validators.set(fieldId, fieldConfig);
    this.fieldStates.set(fieldId, { isValid: false, message: '', showSuccess: false });
    
    // Configurar event listeners
    this.setupFieldListeners(fieldId, field, fieldConfig);
  }
  
  /**
   * Configurar event listeners para um campo
   * @param {string} fieldId - ID do campo
   * @param {HTMLElement} field - Elemento do campo
   * @param {Object} fieldConfig - Configuração do campo
   */
  setupFieldListeners(fieldId, field, fieldConfig) {
    // Validação em tempo real (input/change)
    const validateHandler = () => {
      this.debounceValidation(fieldId, fieldConfig.options.debounceDelay);
    };
    
    // Focus - limpar erro se configurado
    const focusHandler = () => {
      if (fieldConfig.options.clearErrorOnFocus) {
        this.clearFieldError(fieldId);
      }
    };
    
    // Blur - validar sempre
    const blurHandler = () => {
      this.validateField(fieldId, true);
    };
    
    field.addEventListener('input', validateHandler);
    field.addEventListener('change', validateHandler);
    field.addEventListener('focus', focusHandler);
    field.addEventListener('blur', blurHandler);
    
    // Formatação automática para campos brasileiros
    if (this.hasRule(fieldConfig.rules, VALIDATION_TYPES.CPF)) {
      field.addEventListener('input', () => this.formatCPF(field));
    }
    if (this.hasRule(fieldConfig.rules, VALIDATION_TYPES.CNPJ)) {
      field.addEventListener('input', () => this.formatCNPJ(field));
    }
    if (this.hasRule(fieldConfig.rules, VALIDATION_TYPES.PHONE)) {
      field.addEventListener('input', () => this.formatPhone(field));
    }
  }
  
  /**
   * Verificar se campo tem regra específica
   * @param {Array} rules - Regras do campo
   * @param {string} ruleType - Tipo de regra a verificar
   * @returns {boolean|Object} Regra encontrada ou false
   */
  hasRule(rules, ruleType) {
    return rules.find(rule => 
      typeof rule === 'string' ? rule === ruleType : rule.type === ruleType
    );
  }
  
  /**
   * Validação com debounce
   * @param {string} fieldId - ID do campo
   * @param {number} delay - Delay em ms
   */
  debounceValidation(fieldId, delay) {
    // Limpar timer anterior
    if (this.debounceTimers.has(fieldId)) {
      clearTimeout(this.debounceTimers.get(fieldId));
    }
    
    // Criar novo timer
    const timer = setTimeout(() => {
      this.validateField(fieldId);
      this.debounceTimers.delete(fieldId);
    }, delay);
    
    this.debounceTimers.set(fieldId, timer);
  }
  
  /**
   * Validar campo específico
   * @param {string} fieldId - ID do campo
   * @param {boolean} forceShow - Forçar exibição do resultado
   * @returns {boolean} Se campo é válido
   */
  validateField(fieldId, forceShow = false) {
    const fieldConfig = this.validators.get(fieldId);
    if (!fieldConfig) return false;
    
    const field = fieldConfig.element;
    const value = field.value.trim();
    
    // Executar todas as regras
    for (const rule of fieldConfig.rules) {
      const validationResult = this.executeRule(rule, value, fieldId);
      
      if (!validationResult.isValid) {
        // Campo inválido
        this.setFieldState(fieldId, false, validationResult.message);
        
        if (forceShow || fieldConfig.hasBeenValidated) {
          this.showFieldError(fieldId, validationResult.message);
        }
        
        fieldConfig.isValid = false;
        fieldConfig.hasBeenValidated = true;
        return false;
      }
    }
    
    // Campo válido
    this.setFieldState(fieldId, true, '');
    this.showFieldSuccess(fieldId);
    fieldConfig.isValid = true;
    fieldConfig.hasBeenValidated = true;
    
    return true;
  }
  
  /**
   * Executar regra específica
   * @param {string|Object} rule - Regra a executar
   * @param {string} value - Valor a validar
   * @param {string} fieldId - ID do campo
   * @returns {Object} Resultado da validação
   */
  executeRule(rule, value, fieldId) {
    let ruleType, ruleOptions = {};
    
    if (typeof rule === 'string') {
      ruleType = rule;
    } else {
      ruleType = rule.type;
      ruleOptions = rule.options || {};
    }
    
    switch (ruleType) {
      case VALIDATION_TYPES.REQUIRED:
        return {
          isValid: value.length > 0,
          message: ERROR_MESSAGES.required
        };
        
      case VALIDATION_TYPES.EMAIL:
        return {
          isValid: value === '' || PATTERNS.email.test(value),
          message: ERROR_MESSAGES.email
        };
        
      case VALIDATION_TYPES.PASSWORD:
        const minLength = ruleOptions.minLength || 8;
        const requireStrong = ruleOptions.strong || false;
        
        if (value.length < minLength) {
          return {
            isValid: false,
            message: ERROR_MESSAGES.password_weak
          };
        }
        
        if (requireStrong && !PATTERNS.strongPassword.test(value)) {
          return {
            isValid: false,
            message: ERROR_MESSAGES.password_strong
          };
        }
        
        return { isValid: true, message: '' };
        
      case VALIDATION_TYPES.CPF:
        return {
          isValid: value === '' || this.validateCPF(value),
          message: ERROR_MESSAGES.cpf
        };
        
      case VALIDATION_TYPES.CNPJ:
        return {
          isValid: value === '' || this.validateCNPJ(value),
          message: ERROR_MESSAGES.cnpj
        };
        
      case VALIDATION_TYPES.PHONE:
        return {
          isValid: value === '' || PATTERNS.phone.test(value),
          message: ERROR_MESSAGES.phone
        };
        
      case VALIDATION_TYPES.MIN_LENGTH:
        const min = ruleOptions.min || 1;
        return {
          isValid: value.length >= min,
          message: ERROR_MESSAGES.min_length.replace('{min}', min)
        };
        
      case VALIDATION_TYPES.MAX_LENGTH:
        const max = ruleOptions.max || 255;
        return {
          isValid: value.length <= max,
          message: ERROR_MESSAGES.max_length.replace('{max}', max)
        };
        
      case VALIDATION_TYPES.CONFIRM_PASSWORD:
        const originalFieldId = ruleOptions.originalField;
        const originalField = document.getElementById(originalFieldId);
        const originalValue = originalField ? originalField.value : '';
        
        return {
          isValid: value === originalValue,
          message: ERROR_MESSAGES.confirm_password
        };
        
      case VALIDATION_TYPES.CUSTOM:
        const customValidator = ruleOptions.validator;
        if (typeof customValidator === 'function') {
          const result = customValidator(value, fieldId);
          return {
            isValid: result.isValid,
            message: result.message || ERROR_MESSAGES.custom
          };
        }
        return { isValid: true, message: '' };
        
      default:
        console.warn(`[Validator] Regra desconhecida: ${ruleType}`);
        return { isValid: true, message: '' };
    }
  }
  
  /**
   * Validar CPF brasileiro
   * @param {string} cpf - CPF a validar
   * @returns {boolean} Se CPF é válido
   */
  validateCPF(cpf) {
    const cleanCPF = cpf.replace(/\D/g, '');
    
    if (cleanCPF.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false; // CPFs com todos dígitos iguais
    
    // Validar dígitos verificadores
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
    }
    let digit1 = (sum * 10) % 11;
    if (digit1 === 10) digit1 = 0;
    
    if (digit1 !== parseInt(cleanCPF.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
    }
    let digit2 = (sum * 10) % 11;
    if (digit2 === 10) digit2 = 0;
    
    return digit2 === parseInt(cleanCPF.charAt(10));
  }
  
  /**
   * Validar CNPJ brasileiro
   * @param {string} cnpj - CNPJ a validar
   * @returns {boolean} Se CNPJ é válido
   */
  validateCNPJ(cnpj) {
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    
    if (cleanCNPJ.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false; // CNPJs com todos dígitos iguais
    
    // Validar dígitos verificadores
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cleanCNPJ.charAt(i)) * weights1[i];
    }
    let digit1 = (sum % 11) < 2 ? 0 : 11 - (sum % 11);
    
    if (digit1 !== parseInt(cleanCNPJ.charAt(12))) return false;
    
    sum = 0;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cleanCNPJ.charAt(i)) * weights2[i];
    }
    let digit2 = (sum % 11) < 2 ? 0 : 11 - (sum % 11);
    
    return digit2 === parseInt(cleanCNPJ.charAt(13));
  }
  
  /**
   * Formatação automática de CPF
   * @param {HTMLElement} field - Campo de input
   */
  formatCPF(field) {
    let value = field.value.replace(/\D/g, '');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    field.value = value;
  }
  
  /**
   * Formatação automática de CNPJ
   * @param {HTMLElement} field - Campo de input
   */
  formatCNPJ(field) {
    let value = field.value.replace(/\D/g, '');
    value = value.replace(/(\d{2})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1/$2');
    value = value.replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    field.value = value;
  }
  
  /**
   * Formatação automática de telefone
   * @param {HTMLElement} field - Campo de input
   */
  formatPhone(field) {
    let value = field.value.replace(/\D/g, '');
    
    if (value.length <= 10) {
      // Telefone fixo: (11) 1234-5678
      value = value.replace(/(\d{2})(\d)/, '($1) $2');
      value = value.replace(/(\d{4})(\d)/, '$1-$2');
    } else {
      // Celular: (11) 91234-5678
      value = value.replace(/(\d{2})(\d)/, '($1) $2');
      value = value.replace(/(\d{5})(\d)/, '$1-$2');
    }
    
    field.value = value;
  }
  
  /**
   * Definir estado do campo
   * @param {string} fieldId - ID do campo
   * @param {boolean} isValid - Se campo é válido
   * @param {string} message - Mensagem de erro
   */
  setFieldState(fieldId, isValid, message) {
    this.fieldStates.set(fieldId, {
      isValid,
      message,
      showSuccess: isValid && this.config.showSuccessIndicator
    });
  }
  
  /**
   * Mostrar erro no campo
   * @param {string} fieldId - ID do campo
   * @param {string} message - Mensagem de erro
   */
  showFieldError(fieldId, message) {
    ErrorHandler.showFieldError(fieldId, message);
    this.removeFieldSuccess(fieldId);
  }
  
  /**
   * Mostrar sucesso no campo
   * @param {string} fieldId - ID do campo
   */
  showFieldSuccess(fieldId) {
    ErrorHandler.clearFieldErrors(fieldId);
    
    if (this.config.showSuccessIndicator) {
      const field = document.getElementById(fieldId);
      if (field) {
        field.classList.add('border-green-500', 'focus:ring-green-500');
        field.classList.remove('border-gray-300', 'border-red-500');
        
        // Adicionar ícone de sucesso
        this.addSuccessIcon(field);
      }
    }
  }
  
  /**
   * Limpar erro do campo
   * @param {string} fieldId - ID do campo
   */
  clearFieldError(fieldId) {
    ErrorHandler.clearFieldErrors(fieldId);
    this.removeFieldSuccess(fieldId);
  }
  
  /**
   * Remover indicador de sucesso
   * @param {string} fieldId - ID do campo
   */
  removeFieldSuccess(fieldId) {
    const field = document.getElementById(fieldId);
    if (field) {
      field.classList.remove('border-green-500', 'focus:ring-green-500');
      field.classList.add('border-gray-300');
      
      // Remover ícone de sucesso
      this.removeSuccessIcon(field);
    }
  }
  
  /**
   * Adicionar ícone de sucesso
   * @param {HTMLElement} field - Campo de input
   */
  addSuccessIcon(field) {
    // Remover ícone existente
    this.removeSuccessIcon(field);
    
    // Verificar se campo já tem container com ícone
    const parent = field.parentElement;
    if (parent.classList.contains('relative')) {
      const icon = document.createElement('div');
      icon.className = 'validation-success-icon absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none';
      icon.innerHTML = `
        <svg class="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
        </svg>
      `;
      parent.appendChild(icon);
    }
  }
  
  /**
   * Remover ícone de sucesso
   * @param {HTMLElement} field - Campo de input
   */
  removeSuccessIcon(field) {
    const parent = field.parentElement;
    const existingIcon = parent.querySelector('.validation-success-icon');
    if (existingIcon) {
      existingIcon.remove();
    }
  }
  
  /**
   * Validar formulário completo
   * @param {string} formId - ID do formulário (opcional)
   * @returns {boolean} Se formulário é válido
   */
  validateForm(formId = null) {
    let isFormValid = true;
    
    for (const [fieldId, fieldConfig] of this.validators) {
      // Se formId especificado, validar apenas campos desse form
      if (formId) {
        const field = fieldConfig.element;
        const form = field.closest('form');
        if (!form || form.id !== formId) continue;
      }
      
      const isFieldValid = this.validateField(fieldId, true);
      if (!isFieldValid) {
        isFormValid = false;
      }
    }
    
    return isFormValid;
  }
  
  /**
   * Limpar todas as validações
   * @param {string} formId - ID do formulário (opcional)
   */
  clearValidations(formId = null) {
    for (const [fieldId, fieldConfig] of this.validators) {
      if (formId) {
        const field = fieldConfig.element;
        const form = field.closest('form');
        if (!form || form.id !== formId) continue;
      }
      
      this.clearFieldError(fieldId);
      fieldConfig.hasBeenValidated = false;
      fieldConfig.isValid = false;
    }
  }
  
  /**
   * Obter estado atual dos campos
   * @returns {Object} Estados dos campos
   */
  getValidationState() {
    const state = {};
    for (const [fieldId, fieldState] of this.fieldStates) {
      state[fieldId] = { ...fieldState };
    }
    return state;
  }
}

/**
 * Instância global do validador
 */
export const globalValidator = new RealTimeValidator();

/**
 * Funções de conveniência para uso direto
 */
export const Validators = {
  
  /**
   * Configurar validação para formulário de cadastro
   * @param {string} formId - ID do formulário
   */
  setupCadastroForm(formId = 'form-cadastro') {
    globalValidator.addField('first_name', [VALIDATION_TYPES.REQUIRED]);
    globalValidator.addField('last_name', [VALIDATION_TYPES.REQUIRED]);
    globalValidator.addField('email', [
      VALIDATION_TYPES.REQUIRED,
      VALIDATION_TYPES.EMAIL
    ]);
    globalValidator.addField('password', [
      VALIDATION_TYPES.REQUIRED,
      { type: VALIDATION_TYPES.PASSWORD, options: { minLength: 8 } }
    ]);
    globalValidator.addField('password_confirm', [
      VALIDATION_TYPES.REQUIRED,
      { type: VALIDATION_TYPES.CONFIRM_PASSWORD, options: { originalField: 'password' } }
    ]);
    globalValidator.addField('cpf', [
      VALIDATION_TYPES.REQUIRED,
      VALIDATION_TYPES.CPF
    ]);
    
    // Campo telefone é opcional
    const telefoneField = document.getElementById('telefone');
    if (telefoneField) {
      globalValidator.addField('telefone', [VALIDATION_TYPES.PHONE]);
    }
  },
  
  /**
   * Configurar validação para formulário de login
   * @param {string} formId - ID do formulário
   */
  setupLoginForm(formId = 'form-login') {
    globalValidator.addField('email', [
      VALIDATION_TYPES.REQUIRED,
      VALIDATION_TYPES.EMAIL
    ]);
    globalValidator.addField('password', [VALIDATION_TYPES.REQUIRED]);
  },
  
  /**
   * Validar formulário e retornar resultado
   * @param {string} formId - ID do formulário
   * @returns {Object} Resultado da validação
   */
  validateAndReport(formId) {
    const isValid = globalValidator.validateForm(formId);
    const state = globalValidator.getValidationState();
    
    return {
      isValid,
      fieldStates: state,
      errors: Object.entries(state)
        .filter(([_, fieldState]) => !fieldState.isValid && fieldState.message)
        .reduce((acc, [fieldId, fieldState]) => {
          acc[fieldId] = fieldState.message;
          return acc;
        }, {})
    };
  }
};

/**
 * Inicializar validador globalmente
 */
export function initializeValidators() {
  // Disponibilizar globalmente
  window.RealTimeValidator = RealTimeValidator;
  window.globalValidator = globalValidator;
  window.Validators = Validators;
  
  console.log('[MultiBPO MVP] Validators inicializados');
}

// Auto-inicializar se estiver no browser
if (typeof window !== 'undefined') {
  initializeValidators();
}

// Export default para compatibilidade
export default globalValidator;