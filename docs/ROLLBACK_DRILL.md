# Rollback Drill — Cutover Supabase

Passo-a-passo testado para reverter o cutover do projeto novo
(`frjbfeamybqsejlvmqbl`) de volta ao projeto antigo (`ciziytrrjjotlsjzshnm`) em
menos de 5 minutos. **Use somente se o novo projeto estiver instável.**

## Pré-requisitos

- Snapshot pré-cutover salvo em `/mnt/documents/migration/rollback/`
  contendo `.env.old`, `client.old.ts`, `config.old.toml`.
- Acesso ao editor Lovable (ou ao repositório localmente).

## Passos

### 1. Restaurar `.env` (30 s)

Substitua o conteúdo de `.env` na raiz do projeto pelo do snapshot
`.env.old` (variáveis `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
`VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`).

### 2. Restaurar `src/integrations/supabase/client.ts` (60 s)

Copie o conteúdo de `/mnt/documents/migration/rollback/client.old.ts` por cima
de `src/integrations/supabase/client.ts`. Nenhum outro arquivo TS precisa
mudar — o `Proxy` da bridge é o mesmo dos dois lados.

### 3. Restaurar `supabase/config.toml` (30 s)

Substituir apenas a linha `project_id = "…"` pelo valor antigo
(`ciziytrrjjotlsjzshnm`).

### 4. Rebuild / redeploy do front-end (2 min)

- No Lovable, publique novamente (frontend precisa de build).
- Locally: `bun install --frozen-lockfile && bun run build`.

### 5. Verificação (1 min)

- Abrir `/admin/diagnostico-migracao` — todos os checks devem retornar
  verdes contra o projeto antigo.
- Health monitor deve estabilizar em `online`.
- Fazer um login real e conferir dashboard.

## O que **NÃO** reverter

- **Edge Functions**: continuam publicadas em ambos os projetos; ficam
  ociosas do lado não usado.
- **Cron jobs / storage**: permanecem intactos no antigo (nada foi
  removido de lá).
- **Auth users / dados**: nada foi apagado do antigo — o cutover era
  aditivo.

## Após o rollback

Documente a causa em `docs/CUTOVER_VALIDACAO.md` (seção *Postmortem*) e
crie plano de correção antes de tentar cutover novamente. A janela ideal
para re-tentativa é fora de horário comercial (< 10 req/s).
