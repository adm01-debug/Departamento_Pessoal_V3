# 📦 Guia de Scripts - Package.json

## Scripts Recomendados para Adicionar

Adicione estes scripts úteis ao seu `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "build:optimized": "vite build --config vite.config.optimized.ts",
    "build:analyze": "vite build --config vite.analyze.config.ts",
    "preview": "vite preview",
    
    "type-check": "tsc --noEmit",
    "type-check:watch": "tsc --noEmit --watch",
    
    "lint": "eslint . --ext ts,tsx",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    
    "format": "prettier --write \"src/**/*.{ts,tsx,css,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,css,md}\"",
    
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    
    "clean": "rm -rf dist node_modules .turbo",
    "fresh": "npm run clean && npm install && npm run build",
    
    "docker:dev": "docker-compose -f docker-compose.dev.yml up",
    "docker:down": "docker-compose -f docker-compose.dev.yml down"
  }
}
```

## Como Adicionar

1. Abra seu `package.json`
2. Localize a seção `"scripts"`
3. Adicione os scripts acima que ainda não existem
4. Salve o arquivo

## Uso dos Scripts

### Desenvolvimento
```bash
npm run dev              # Inicia servidor de desenvolvimento
npm run type-check       # Verifica tipos TypeScript
```

### Build
```bash
npm run build            # Build padrão
npm run build:optimized  # Build com configuração otimizada
npm run build:analyze    # Build com análise de bundle
```

### Qualidade de Código
```bash
npm run lint             # Verifica código
npm run lint:fix         # Corrige problemas automaticamente
npm run format           # Formata código com Prettier
```

### Limpeza
```bash
npm run clean            # Remove arquivos gerados
npm run fresh            # Reinstala tudo do zero
```

### Docker
```bash
npm run docker:dev       # Inicia ambiente Docker
npm run docker:down      # Para ambiente Docker
```

## Scripts Úteis Adicionais

### Para CI/CD
```json
{
  "scripts": {
    "ci:install": "npm ci",
    "ci:build": "npm run type-check && npm run lint && npm run build",
    "ci:test": "npm run test -- --run"
  }
}
```

### Para Manutenção
```json
{
  "scripts": {
    "deps:check": "npm outdated",
    "deps:update": "npm update",
    "audit:fix": "npm audit fix"
  }
}
```

## Scripts de Manutenção

### sync-lockfiles.sh (P2-035)
Valida paridade entre `bun.lock` e `package-lock.json`.

```bash
# Verificação (padrão — dry-run)
./scripts/sync-lockfiles.sh

# Corrigir drift automaticamente
./scripts/sync-lockfiles.sh --fix
```

| Saída | Significado |
|-------|------------|
| Exit 0 | Paridade OK ou drift abaixo do threshold (3) |
| Exit 1 | Drift crítico detectado — CI deve falhar |
| Exit 2 | Lockfile ausente |

Packages comparados: `react`, `react-dom`, `vite`, `typescript`, `@supabase/supabase-js`, `zod`, `@tanstack/react-query`, `zustand`, etc. (14 críticos).

### regenerate-supabase-types.sh (P2-044)
Regenera tipos TypeScript a partir do schema live do banco.

```bash
# Supabase Cloud (padrão)
./scripts/regenerate-supabase-types.sh

# Self-hosted (psql direto)
SUPABASE_DB_URL="postgresql://user:pass@host:5432/db" \
  ./scripts/regenerate-supabase-types.sh
```

Saída: `src/integrations/supabase/types.ts`.

---

## Dicas

1. **Use `bun run`** para ver todos os scripts disponíveis (preferível a `npm run`).
2. **CI**: adicione `sync-lockfiles.sh` ao workflow de CI para detectar drift antes do merge.
3. **Dependências**: após `bun install`, rode `sync-lockfiles.sh --fix` se usar npm em CI.
4. **Documente** scripts complexos com comentários no próprio comando.

---

**Última atualização:** 24/07/2026
**Versão:** 1.1
