# 🤝 Guia de Contribuição - V15

## Setup Local
```bash
git clone https://github.com/adm01-debug/departamento-pessoal
cd departamento-pessoal
npm install
npm run dev
```

## Branches
- `main` - Produção
- `develop` - Desenvolvimento
- `feature/*` - Novas features
- `fix/*` - Correções
- `hotfix/*` - Correções urgentes

## Commits
Seguimos Conventional Commits:
```
feat: nova funcionalidade
fix: correção de bug
docs: documentação
style: formatação
refactor: refatoração
test: testes
chore: tarefas
```

## Pull Requests
1. Fork do repositório
2. Crie branch: `feature/minha-feature`
3. Commit suas mudanças
4. Push para o fork
5. Abra PR para `develop`

## Code Review
- Mínimo 1 aprovação
- Testes passando
- Lint sem erros
- Documentação atualizada

## Padrões de Código
- TypeScript strict mode
- ESLint + Prettier
- Tailwind CSS
- shadcn/ui components

