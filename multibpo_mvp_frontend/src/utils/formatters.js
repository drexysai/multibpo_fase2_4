// ==========================================================================
// MultiBPO MVP Frontend - Formatadores e Validadores
// Mini-Fase MVP 2 - Frontend básico
// 
// Utilitários para formatação e validação de dados brasileiros
// CPF, CNPJ, telefone, CEP e outras validações
// ==========================================================================

// ==========================================================================
// FORMATADORES DE DOCUMENTOS BRASILEIROS
// ==========================================================================

/**
 * Formatar CPF com pontos e hífen
 * @param {string} cpf - CPF sem formatação
 * @returns {string} CPF formatado (000.000.000-00)
 */
export function formatCPF(cpf) {
  if (!cpf) return '';
  
  // Remove tudo que não é número
  const numbers = cpf.replace(/\D/g, '');
  
  // Limita a 11 dígitos
  const limited = numbers.slice(0, 11);
  
  // Aplica formatação progressiva
  if (limited.length <= 3) {
    return limited;
  } else if (limited.length <= 6) {
    return `${limited.slice(0, 3)}.${limited.slice(3)}`;
  } else if (limited.length <= 9) {
    return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6)}`;
  } else {
    return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6, 9)}-${limited.slice(9)}`;
  }
}

/**
 * Formatar CNPJ com pontos, barra e hífen
 * @param {string} cnpj - CNPJ sem formatação
 * @returns {string} CNPJ formatado (00.000.000/0000-00)
 */
export function formatCNPJ(cnpj) {
  if (!cnpj) return '';
  
  // Remove tudo que não é número
  const numbers = cnpj.replace(/\D/g, '');
  
  // Limita a 14 dígitos
  const limited = numbers.slice(0, 14);
  
  // Aplica formatação progressiva
  if (limited.length <= 2) {
    return limited;
  } else if (limited.length <= 5) {
    return `${limited.slice(0, 2)}.${limited.slice(2)}`;
  } else if (limited.length <= 8) {
    return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5)}`;
  } else if (limited.length <= 12) {
    return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8)}`;
  } else {
    return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8, 12)}-${limited.slice(12)}`;
  }
}

/**
 * Formatar telefone brasileiro
 * @param {string} telefone - Telefone sem formatação
 * @returns {string} Telefone formatado (11) 99999-9999 ou (11) 9999-9999
 */
export function formatTelefone(telefone) {
  if (!telefone) return '';
  
  // Remove tudo que não é número
  const numbers = telefone.replace(/\D/g, '');
  
  // Limita a 11 dígitos (celular) ou 10 (fixo)
  const limited = numbers.slice(0, 11);
  
  // Aplica formatação baseada no tamanho
  if (limited.length <= 2) {
    return limited;
  } else if (limited.length <= 3) {
    return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
  } else if (limited.length <= 7) {
    return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
  } else if (limited.length <= 10) {
    // Telefone fixo: (11) 3333-4444
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
  } else {
    // Celular: (11) 99999-4444
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
  }
}

/**
 * Formatar CEP
 * @param {string} cep - CEP sem formatação
 * @returns {string} CEP formatado (00000-000)
 */
export function formatCEP(cep) {
  if (!cep) return '';
  
  // Remove tudo que não é número
  const numbers = cep.replace(/\D/g, '');
  
  // Limita a 8 dígitos
  const limited = numbers.slice(0, 8);
  
  // Aplica formatação
  if (limited.length <= 5) {
    return limited;
  } else {
    return `${limited.slice(0, 5)}-${limited.slice(5)}`;
  }
}

// ==========================================================================
// VALIDADORES DE DOCUMENTOS BRASILEIROS
// ==========================================================================

/**
 * Validar CPF brasileiro
 * @param {string} cpf - CPF com ou sem formatação
 * @returns {boolean} True se CPF é válido
 */
export function validateCPF(cpf) {
  if (!cpf) return false;
  
  // Remove formatação
  const numbers = cpf.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (numbers.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(numbers)) return false;
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i]) * (10 - i);
  }
  let digit1 = 11 - (sum % 11);
  if (digit1 >= 10) digit1 = 0;
  
  if (parseInt(numbers[9]) !== digit1) return false;
  
  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i]) * (11 - i);
  }
  let digit2 = 11 - (sum % 11);
  if (digit2 >= 10) digit2 = 0;
  
  return parseInt(numbers[10]) === digit2;
}

/**
 * Validar CNPJ brasileiro
 * @param {string} cnpj - CNPJ com ou sem formatação
 * @returns {boolean} True se CNPJ é válido
 */
export function validateCNPJ(cnpj) {
  if (!cnpj) return false;
  
  // Remove formatação
  const numbers = cnpj.replace(/\D/g, '');
  
  // Verifica se tem 14 dígitos
  if (numbers.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(numbers)) return false;
  
  // Validação do primeiro dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(numbers[i]) * weights1[i];
  }
  let digit1 = sum % 11;
  digit1 = digit1 < 2 ? 0 : 11 - digit1;
  
  if (parseInt(numbers[12]) !== digit1) return false;
  
  // Validação do segundo dígito verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(numbers[i]) * weights2[i];
  }
  let digit2 = sum % 11;
  digit2 = digit2 < 2 ? 0 : 11 - digit2;
  
  return parseInt(numbers[13]) === digit2;
}

/**
 * Validar email
 * @param {string} email - Email para validar
 * @returns {boolean} True se email é válido
 */
export function validateEmail(email) {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validar telefone brasileiro
 * @param {string} telefone - Telefone com ou sem formatação
 * @returns {boolean} True se telefone é válido
 */
export function validateTelefone(telefone) {
  if (!telefone) return false;
  
  // Remove formatação
  const numbers = telefone.replace(/\D/g, '');
  
  // Telefone deve ter 10 (fixo) ou 11 (celular) dígitos
  if (numbers.length < 10 || numbers.length > 11) return false;
  
  // Verifica se DDD é válido (11-99)
  const ddd = parseInt(numbers.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  
  // Se for celular (11 dígitos), o terceiro dígito deve ser 9
  if (numbers.length === 11 && numbers[2] !== '9') return false;
  
  return true;
}

/**
 * Validar CEP brasileiro
 * @param {string} cep - CEP com ou sem formatação
 * @returns {boolean} True se CEP é válido
 */
export function validateCEP(cep) {
  if (!cep) return false;
  
  // Remove formatação
  const numbers = cep.replace(/\D/g, '');
  
  // CEP deve ter exatamente 8 dígitos
  return numbers.length === 8;
}

// ==========================================================================
// FORMATADORES DE TEXTO E NOMES
// ==========================================================================

/**
 * Capitalizar nome próprio
 * @param {string} name - Nome para capitalizar
 * @returns {string} Nome capitalizado
 */
export function capitalizeName(name) {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .split(' ')
    .map(word => {
      // Palavras que não devem ser capitalizadas (preposições)
      const lowercase = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'para'];
      
      if (lowercase.includes(word)) {
        return word;
      }
      
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Limpar texto removendo caracteres especiais
 * @param {string} text - Texto para limpar
 * @returns {string} Texto limpo
 */
export function cleanText(text) {
  if (!text) return '';
  
  return text
    .trim()
    .replace(/\s+/g, ' ') // Múltiplos espaços viram um
    .replace(/[^\w\s\-\.@]/g, ''); // Remove caracteres especiais exceto básicos
}

/**
 * Extrair iniciais do nome
 * @param {string} fullName - Nome completo
 * @returns {string} Iniciais (ex: "João Silva" → "JS")
 */
export function getInitials(fullName) {
  if (!fullName) return '';
  
  return fullName
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word[0].toUpperCase())
    .slice(0, 2) // Máximo 2 iniciais
    .join('');
}

// ==========================================================================
// FORMATADORES DE VALORES E NÚMEROS
// ==========================================================================

/**
 * Formatar valor monetário brasileiro
 * @param {number|string} value - Valor para formatar
 * @param {boolean} showSymbol - Mostrar símbolo R$
 * @returns {string} Valor formatado
 */
export function formatCurrency(value, showSymbol = true) {
  if (value === null || value === undefined || value === '') return '';
  
  const number = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(number)) return '';
  
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number);
  
  return showSymbol ? formatted : formatted.replace('R$', '').trim();
}

/**
 * Formatar número com separadores brasileiros
 * @param {number|string} value - Número para formatar
 * @param {number} decimals - Casas decimais
 * @returns {string} Número formatado
 */
export function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined || value === '') return '';
  
  const number = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(number)) return '';
  
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(number);
}

/**
 * Formatar porcentagem
 * @param {number|string} value - Valor para formatar (0.15 = 15%)
 * @param {number} decimals - Casas decimais
 * @returns {string} Porcentagem formatada
 */
export function formatPercentage(value, decimals = 1) {
  if (value === null || value === undefined || value === '') return '';
  
  const number = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(number)) return '';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(number);
}

// ==========================================================================
// FORMATADORES DE DATA E HORA
// ==========================================================================

/**
 * Formatar data brasileira
 * @param {string|Date} date - Data para formatar
 * @param {boolean} showTime - Incluir horário
 * @returns {string} Data formatada (dd/mm/aaaa)
 */
export function formatDate(date, showTime = false) {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '';
  
  const options = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo'
  };
  
  if (showTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return new Intl.DateTimeFormat('pt-BR', options).format(dateObj);
}

/**
 * Formatar data relativa (há 2 dias, há 1 hora, etc.)
 * @param {string|Date} date - Data para formatar
 * @returns {string} Data relativa
 */
export function formatRelativeDate(date) {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 1) return 'agora';
  if (diffMinutes < 60) return `há ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
  if (diffHours < 24) return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  if (diffDays < 7) return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  
  return formatDate(dateObj);
}

// ==========================================================================
// UTILIDADES DE VALIDAÇÃO DE FORMULÁRIOS
// ==========================================================================

/**
 * Validar força da senha
 * @param {string} password - Senha para validar
 * @returns {object} Resultado da validação com score e sugestões
 */
export function validatePasswordStrength(password) {
  if (!password) {
    return {
      score: 0,
      strength: 'muito-fraca',
      message: 'Senha é obrigatória',
      suggestions: ['Digite uma senha']
    };
  }
  
  let score = 0;
  const suggestions = [];
  
  // Comprimento
  if (password.length >= 8) score += 1;
  else suggestions.push('Use pelo menos 8 caracteres');
  
  if (password.length >= 12) score += 1;
  
  // Letras minúsculas
  if (/[a-z]/.test(password)) score += 1;
  else suggestions.push('Inclua letras minúsculas');
  
  // Letras maiúsculas
  if (/[A-Z]/.test(password)) score += 1;
  else suggestions.push('Inclua letras maiúsculas');
  
  // Números
  if (/\d/.test(password)) score += 1;
  else suggestions.push('Inclua números');
  
  // Caracteres especiais
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
  else suggestions.push('Inclua caracteres especiais');
  
  // Determinar força
  let strength, message;
  if (score <= 2) {
    strength = 'fraca';
    message = 'Senha fraca';
  } else if (score <= 4) {
    strength = 'media';
    message = 'Senha média';
  } else {
    strength = 'forte';
    message = 'Senha forte';
  }
  
  return {
    score,
    strength,
    message,
    suggestions: suggestions.slice(0, 3) // Máximo 3 sugestões
  };
}

/**
 * Remover formatação de documento (CPF/CNPJ)
 * @param {string} document - Documento formatado
 * @returns {string} Apenas números
 */
export function removeDocumentFormatting(document) {
  if (!document) return '';
  return document.replace(/\D/g, '');
}

/**
 * Detectar tipo de documento (CPF ou CNPJ)
 * @param {string} document - Documento com ou sem formatação
 * @returns {string} 'cpf', 'cnpj' ou 'unknown'
 */
export function detectDocumentType(document) {
  if (!document) return 'unknown';
  
  const numbers = document.replace(/\D/g, '');
  
  if (numbers.length === 11) return 'cpf';
  if (numbers.length === 14) return 'cnpj';
  
  return 'unknown';
}

// ==========================================================================
// EXPORT PRINCIPAL
// ==========================================================================
export const formatters = {
  // Formatadores
  formatCPF,
  formatCNPJ,
  formatTelefone,
  formatCEP,
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatDate,
  formatRelativeDate,
  
  // Validadores
  validateCPF,
  validateCNPJ,
  validateEmail,
  validateTelefone,
  validateCEP,
  validatePasswordStrength,
  
  // Texto
  capitalizeName,
  cleanText,
  getInitials,
  
  // Utilidades
  removeDocumentFormatting,
  detectDocumentType
};

// Export default para compatibilidade
export default formatters;

// ==========================================================================
// DISPONIBILIZAR GLOBALMENTE PARA DEBUG
// ==========================================================================
if (typeof window !== 'undefined') {
  window.multibpoFormatters = formatters;
}

// ==========================================================================
// FUNCIONALIDADES DOS FORMATTERS:
//
// 1. DOCUMENTOS BRASILEIROS:
//    - formatCPF(): 12345678901 → 123.456.789-01
//    - formatCNPJ(): 12345678000195 → 12.345.678/0001-95
//    - validateCPF(), validateCNPJ(): Algoritmo oficial
//
// 2. CONTATOS:
//    - formatTelefone(): 11999999999 → (11) 99999-9999
//    - validateTelefone(): DDD + 9 dígitos para celular
//    - validateEmail(): Regex completa
//
// 3. ENDEREÇO:
//    - formatCEP(): 01234567 → 01234-567
//    - validateCEP(): 8 dígitos obrigatórios
//
// 4. VALORES E NÚMEROS:
//    - formatCurrency(): 1234.56 → R$ 1.234,56
//    - formatNumber(): 1234.567 → 1.234,567
//    - formatPercentage(): 0.1567 → 15,7%
//
// 5. DATAS:
//    - formatDate(): ISO → dd/mm/aaaa hh:mm
//    - formatRelativeDate(): há 2 horas, há 3 dias
//
// 6. VALIDAÇÕES AVANÇADAS:
//    - validatePasswordStrength(): Score + sugestões
//    - detectDocumentType(): CPF ou CNPJ automaticamente
//
// 7. TEXTO E NOMES:
//    - capitalizeName(): joão silva → João Silva
//    - getInitials(): João Silva → JS
//    - cleanText(): Remove caracteres especiais
//
// 8. UTILIDADES:
//    - removeDocumentFormatting(): Remove pontos/hífens
//    - Formatação progressiva em tempo real
//    - Compatibilidade com todos os navegadores
// ==========================================================================