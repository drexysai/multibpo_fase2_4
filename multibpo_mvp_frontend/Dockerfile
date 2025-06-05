FROM node:18-alpine

WORKDIR /app

# Instalar dependências do sistema
RUN apk add --no-cache git python3 make g++

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar código fonte
COPY . .

# Dar permissão total (simplificado para MVP)
RUN chmod -R 755 /app

EXPOSE 3000

# Rodar como root (para MVP é aceitável)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]