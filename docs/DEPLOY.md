# Guia de Deploy

## Requisitos

- Node.js 18+
- npm ou yarn

## Build

```bash
npm install
npm run build
```

## Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## Variáveis de Ambiente

- `VITE_API_URL` - URL da API
- `VITE_APP_NAME` - Nome da aplicação
