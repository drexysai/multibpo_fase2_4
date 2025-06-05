// ==========================================================================
// MultiBPO MVP Frontend - Configuração Tailwind CSS
// Mini-Fase MVP 2 - Frontend básico
// 
// Design system baseado na documentação MULTIBPO
// Cores azuis profissionais, componentes contábeis
// ==========================================================================

/** @type {import('tailwindcss').Config} */
export default {
  // ==========================================================================
  // ARQUIVOS PARA SCAN (Purge CSS)
  // ==========================================================================
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
    './public/**/*.html'
  ],

  // ==========================================================================
  // CONFIGURAÇÕES DE TEMA MULTIBPO
  // ==========================================================================
  theme: {
    extend: {
      // ========================================================================
      // PALETA DE CORES MULTIBPO (baseada na documentação)
      // ========================================================================
      colors: {
        // Cores principais MULTIBPO
        primary: {
          50: '#eff6ff',
          100: '#dbeafe', 
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',  // Azul secundário MULTIBPO
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',  // Azul principal MULTIBPO
          950: '#172554'
        },

        // Cores semânticas para contabilidade
        contabil: {
          azul: '#1e3a8a',      // Azul principal
          azul_claro: '#3b82f6', // Azul secundário
          cinza: '#f8f9fa',     // Background neutro
          texto: '#333333',     // Texto principal
          sucesso: '#059669',   // Verde aprovado
          aviso: '#ffc107',     // Amarelo atenção
          erro: '#dc2626',      // Vermelho erro
          info: '#0ea5e9'       // Azul informação
        },

        // Alias para facilitar uso
        azul: {
          principal: '#1e3a8a',
          secundario: '#3b82f6',
          claro: '#dbeafe'
        }
      },

      // ========================================================================
      // TIPOGRAFIA MULTIBPO
      // ========================================================================
      fontFamily: {
        sans: [
          'Segoe UI',
          'Tahoma', 
          'Geneva',
          'Verdana',
          'sans-serif'
        ],
        mono: [
          'Fira Code',
          'Cascadia Code',
          'Consolas',
          'Courier New',
          'monospace'
        ]
      },

      fontSize: {
        // Tamanhos específicos MULTIBPO
        'header-xl': ['3rem', { lineHeight: '1.2', fontWeight: '600' }],
        'header-lg': ['2.2rem', { lineHeight: '1.3', fontWeight: '600' }],
        'header-md': ['1.5rem', { lineHeight: '1.4', fontWeight: '500' }],
        'body': ['1rem', { lineHeight: '1.6', fontWeight: '400' }],
        'small': ['0.9rem', { lineHeight: '1.5', fontWeight: '400' }]
      },

      // ========================================================================
      // ESPAÇAMENTOS E LAYOUT
      // ========================================================================
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem'
      },

      maxWidth: {
        'container': '1200px',  // Max-width padrão MULTIBPO
        'form': '500px',        // Forms MVP
        'card': '400px'         // Cards componentes
      },

      // ========================================================================
      // BORDER RADIUS MULTIBPO
      // ========================================================================
      borderRadius: {
        'multibpo': '15px',     // Padrão MULTIBPO
        'card': '10px',         // Cards
        'button': '8px',        // Botões
        'input': '6px'          // Inputs
      },

      // ========================================================================
      // BOX SHADOW MULTIBPO
      // ========================================================================
      boxShadow: {
        'multibpo': '0 10px 30px rgba(0,0,0,0.2)',      // Container principal
        'card': '0 4px 6px rgba(0,0,0,0.1)',            // Cards normais
        'card-hover': '0 8px 15px rgba(0,0,0,0.2)',     // Cards hover
        'form': '0 2px 4px rgba(0,0,0,0.1)',            // Forms
        'button': '0 2px 4px rgba(30,58,138,0.2)'       // Botões azuis
      },

      // ========================================================================
      // GRADIENTES MULTIBPO
      // ========================================================================
      backgroundImage: {
        'gradient-multibpo': 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
        'gradient-success': 'linear-gradient(120deg, #d4edda 0%, #c3e6cb 100%)',
        'gradient-info': 'linear-gradient(120deg, #dbeafe 0%, #e0e7ff 100%)',
        'gradient-warning': 'linear-gradient(120deg, #fff3cd 0%, #ffeaa7 100%)'
      },

      // ========================================================================
      // ANIMAÇÕES E TRANSIÇÕES
      // ========================================================================
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-in-out',
        'bounce-soft': 'bounceSoft 0.6s ease-in-out'
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        bounceSoft: {
          '0%, 20%, 50%, 80%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-5px)' },
          '60%': { transform: 'translateY(-3px)' }
        }
      },

      // ========================================================================
      // BREAKPOINTS RESPONSIVOS
      // ========================================================================
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px'
      }
    }
  },

  // ==========================================================================
  // PLUGINS TAILWIND
  // ==========================================================================
  plugins: [
    // Plugin para forms melhorados
    require('@tailwindcss/forms')({
      strategy: 'class' // Usar classes .form-input, .form-select, etc.
    })
  ],

  // ==========================================================================
  // CONFIGURAÇÕES DARK MODE (futuro)
  // ==========================================================================
  darkMode: 'class', // Habilita dark mode via classe

  // ==========================================================================
  // SAFELIST (classes que não devem ser removidas)
  // ==========================================================================
  safelist: [
    // Cores dinâmicas que podem ser usadas via JavaScript
    'bg-contabil-sucesso',
    'bg-contabil-erro', 
    'bg-contabil-aviso',
    'text-contabil-azul',
    'border-contabil-azul',
    // Classes de animação
    'animate-fade-in',
    'animate-slide-up',
    'animate-bounce-soft'
  ]
};

// ==========================================================================
// CLASSES UTILITÁRIAS PERSONALIZADAS DISPONÍVEIS:
// 
// CONTAINERS:
// - max-w-container (1200px)
// - shadow-multibpo 
// - rounded-multibpo
// - bg-gradient-multibpo
// 
// CARDS:
// - shadow-card, shadow-card-hover
// - rounded-card
// - max-w-card
// 
// FORMS:
// - max-w-form
// - rounded-input
// - shadow-form
// 
// CORES:
// - bg-azul-principal, bg-azul-secundario
// - text-contabil-azul, text-contabil-texto
// - border-contabil-azul
// 
// TIPOGRAFIA:
// - text-header-xl, text-header-lg, text-header-md
// - font-sans (Segoe UI stack)
// 
// ANIMAÇÕES:
// - animate-fade-in, animate-slide-up
// ==========================================================================