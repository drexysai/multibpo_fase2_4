// ==========================================================================
// MultiBPO MVP Frontend - Configuração Astro
// Mini-Fase MVP 2 - Frontend básico
// 
// Configuração otimizada para integração com backend MVP Django
// ==========================================================================

import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  // ==========================================================================
  // INTEGRAÇÕES
  // ==========================================================================
  integrations: [
    tailwind({
      // Configuração Tailwind integrada
      config: { path: './tailwind.config.js' }
    })
  ],

  // ==========================================================================
  // CONFIGURAÇÕES DE SERVIDOR (DESENVOLVIMENTO)
  // ==========================================================================
  server: {
    host: '0.0.0.0',  // Permite acesso externo (Docker)
    port: 3000,       // Porta padrão (mapeada para 8013)
  },

  // ==========================================================================
  // CONFIGURAÇÕES DE BUILD (PRODUÇÃO)
  // ==========================================================================
  build: {
    assets: 'assets',
    inlineStylesheets: 'auto',
  },

  // ==========================================================================
  // CONFIGURAÇÕES DE OUTPUT
  // ==========================================================================
  output: 'static',  // Site estático (SPA-like com client-side routing)

  // ==========================================================================
  // CONFIGURAÇÕES DE DESENVOLVIMENTO
  // ==========================================================================
  devToolbar: {
    enabled: true  // Toolbar de desenvolvimento ativa
  },

  // ==========================================================================
  // CONFIGURAÇÕES DE VITE (BUILD TOOL)
  // ==========================================================================
  vite: {
    // Configurações de proxy para desenvolvimento (opcional)
    server: {
      proxy: {
        // Proxy para APIs backend durante desenvolvimento
        '/api': {
          target: 'http://192.168.1.4:8082',
          changeOrigin: true,
          secure: false
        }
      }
    },
    
    // Otimizações de build
    build: {
      rollupOptions: {
        output: {
          // Separar vendors em chunk separado
          manualChunks: {
            vendor: ['axios']
          }
        }
      }
    },

    // Definir variáveis de ambiente
    define: {
      __API_BASE_URL__: JSON.stringify(
        process.env.API_BASE_URL || 'http://192.168.1.4:8082/api/v1/mvp'
      )
    }
  },

  // ==========================================================================
  // CONFIGURAÇÕES DE MARKDOWN (se necessário)
  // ==========================================================================
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true
    }
  },

  // ==========================================================================
  // CONFIGURAÇÕES DE EXPERIMENTAL
  // ==========================================================================
  experimental: {
    // Recursos experimentais se necessário
  }
});

// ==========================================================================
// NOTAS DE CONFIGURAÇÃO:
// 
// 1. SERVER:
//    - Host 0.0.0.0 permite acesso do Docker
//    - Porta 3000 é mapeada para 8013 no host
// 
// 2. PROXY:
//    - /api proxy para backend durante desenvolvimento
//    - Facilita integração com APIs MVP
// 
// 3. BUILD:
//    - Output static para deploy simples
//    - Chunks otimizados para performance
// 
// 4. INTEGRAÇÃO:
//    - Tailwind CSS integrado
//    - Configuração personalizada disponível
// 
// 5. VARIÁVEIS:
//    - API_BASE_URL configurável via environment
//    - Padrão aponta para backend MVP
// ==========================================================================