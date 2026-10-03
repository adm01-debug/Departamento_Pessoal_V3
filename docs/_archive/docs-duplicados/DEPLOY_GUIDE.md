# Guia de Deploy - Sistema DP V18

## Ambientes
- **Development**: localhost:5173
- **Staging**: staging.sistema-dp.com.br
- **Production**: sistema-dp.com.br

## Pre-requisitos
- Node.js 20+
- npm 10+
- Supabase account
- Vercel/Netlify account

## Deploy Manual
```bash
npm run build
npm run preview # testar local
```

## Deploy Automatico (CI/CD)
Push para `main` dispara deploy automatico via GitHub Actions.

## Variaveis de Ambiente
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_APP_ENV=production
```

## Rollback
```bash
vercel rollback
# ou
git revert HEAD && git push
```

## Checklist Pre-Deploy
- [ ] Testes passando
- [ ] Build sem erros
- [ ] Variaveis configuradas
- [ ] Migrations aplicadas
- [ ] Backup realizado
