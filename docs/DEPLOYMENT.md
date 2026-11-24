# Deploy

## Build

```bash
npm run build
```

Os arquivos serão gerados em `dist/`.

## Variáveis de Ambiente

| Variável | Descrição |
|----------|------------|
| VITE_API_URL | URL da API |
| VITE_APP_NAME | Nome do app |

## Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## Nginx

```nginx
location / {
  root /var/www/dist;
  try_files \ /index.html;
}
```
