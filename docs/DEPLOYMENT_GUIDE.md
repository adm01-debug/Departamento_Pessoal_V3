# 🚀 Guia de Deploy - V15

## Ambientes
- **Development**: localhost:5173
- **Staging**: staging.dpessoal.com
- **Production**: app.dpessoal.com

## CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
- Lint & Type Check
- Unit Tests
- Build
- E2E Tests
- Deploy to Environment
```

## Deploy Manual

### Vercel
```bash
npm run build
vercel --prod
```

### Docker
```bash
docker build -t dpessoal .
docker run -p 3000:3000 dpessoal
```

### Kubernetes
```bash
kubectl apply -f k8s/
```

## Environment Variables
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=
```

## Checklist Pré-Deploy
- [ ] Testes passando
- [ ] Build sem erros
- [ ] Variáveis configuradas
- [ ] Migrations executadas
- [ ] Backup realizado

