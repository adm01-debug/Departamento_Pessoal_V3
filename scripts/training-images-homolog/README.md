# Homologação — scripts

Procedimento completo: [`docs/treinamentos-imagens-homologacao.md`](../../docs/treinamentos-imagens-homologacao.md).

| Arquivo | Uso | Executa agora? |
|---|---|---|
| `scheduler-enable.sql` | cria a ponte `dispatch_training_image_worker()` + job pg_cron a cada 2 min | **não** (exige autorização) |
| `scheduler-disable.sql` | remove o job (idempotente) | não |
| `scheduler-status.sql` | job, últimas execuções, fila e incertezas pendentes | leitura |
| `homolog.mjs` | roteiro via API (Auth/RLS/Storage/fila/worker/backfill) | **não** (exige `HOMOLOG_CONFIRM=SIM`) |

## Ordem de ativação (somente após autorização)

1. criar projeto Supabase isolado e `supabase link`;
2. `supabase db push` (migrations);
3. `supabase functions deploy training-image-generate training-image-dispatch`;
4. `supabase secrets set TRAINING_IMAGE_DISPATCH_SECRET=... TRAINING_IMAGE_AUTOQUEUE_ENABLED=false TRAINING_IMAGE_GENERATION_ENABLED=false`;
5. rodar `homolog.mjs` (flags desligadas — valida Auth, RLS, Storage, fila e 503);
6. criar segredos no Vault + `scheduler-enable.sql`;
7. rodar o teste Playwright `training-images-homolog` com `VITE_TRAINING_IMAGES=true`;
8. só então (Fase 3B, autorização específica): `OPENAI_API_KEY`,
   `TRAINING_IMAGE_GENERATION_ENABLED=true`, `set_training_image_autoqueue(true)`
   e **uma** geração real.

Com as flags desligadas, o worker responde `503` em toda execução agendada:
nenhum trabalho é perdido e nenhuma cobrança ocorre.
