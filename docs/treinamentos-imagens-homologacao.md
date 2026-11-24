# Homologação isolada — Hub de imagens (alternativa ao Docker)

Status: **procedimento preparado, NÃO executado**. Nenhum projeto Supabase foi
criado, nenhuma migration remota foi aplicada, nenhum deploy foi feito.

Enquanto o Docker/WSL2 não estiver funcional (engine Linux não inicia;
`HypervisorPresent=False`), a homologação usa um **projeto Supabase dedicado**,
sem relação com produção.

---

## 1. Topologia do ambiente

| Item | Valor sugerido |
|---|---|
| Projeto | `dp-treinamentos-homolog` (região mais próxima) |
| Ref | anotar em `HOMOLOG_PROJECT_REF` |
| Banco | PostgreSQL gerenciado do projeto |
| Auth | e-mail/senha, usuários fictícios |
| Storage | bucket privado `training-images` |
| Functions | `training-image-generate`, `training-image-dispatch` |
| Empresas | `Empresa Homolog A` e `Empresa Homolog B` (UUIDs fixos do script) |
| Usuários | `homolog.a@exemplo.local` / `homolog.b@exemplo.local` (senha só no ambiente) |

Separação: **nunca** reutilizar o projeto de produção; o script recusa URL cujo
ref seja igual ao `project_id` de `supabase/config.toml`.

---

## 2. Custos e limitações

| Recurso | Free | Observação |
|---|---|---|
| Projetos ativos | 2 | suficiente para 1 de homologação |
| Banco | 500 MB | migrations + fixtures são pequenas |
| Storage | 1 GB | capas de teste têm ~KB |
| Edge Functions | 500 mil invocações/mês | agendamento a cada 2 min ≈ 21,6 mil/mês |
| Egress | 5 GB | URLs assinadas curtas |
| Pausa | após ~7 dias sem uso | reativar no painel |
| Auth | 50 mil MAU | usuários fictícios |

Plano Pro (~US$ 25/mês) remove a pausa e amplia limites. **Nenhuma cobrança é
feita por este repositório.** Custo de imagem da OpenAI só existe após
autorização e chave; consultar o preço vigente do modelo antes de gerar.

Limitações conhecidas:
- pg_cron/pg_net precisam existir no projeto (Free já oferece; confirmar no SQL).
- Edge Functions têm wall clock limitado (150 s free / 400 s pago) — por isso o
  worker processa lotes de 2.
- O provedor simulado **não** é importado pelas funções de produção. A validação
  do pipeline com simulado é feita localmente (Deno + PostgreSQL). Na stack real,
  a geração simulada é feita por **fixture** (upload + linha `training_images`
  com `provider='simulado-teste'`), exercitando Auth, RLS, Storage e URL
  assinada sem chamar a OpenAI.

---

## 3. Comandos de criação e deploy (exigem autorização)

```bash
# 1) Criar o projeto (uma vez)
supabase projects create dp-treinamentos-homolog --org-id <ORG_ID> --region sa-east-1

# 2) Vincular o repositório ao projeto ISOLADO
supabase link --project-ref "$HOMOLOG_PROJECT_REF"

# 3) Aplicar SOMENTE as migrations pendentes neste projeto
supabase db push

# 4) Publicar as funções
supabase functions deploy training-image-generate --project-ref "$HOMOLOG_PROJECT_REF"
supabase functions deploy training-image-dispatch --project-ref "$HOMOLOG_PROJECT_REF"

# 5) Segredos do SERVIDOR (nunca no .env versionado)
supabase secrets set \
  TRAINING_IMAGE_AUTOQUEUE_ENABLED=false \
  TRAINING_IMAGE_GENERATION_ENABLED=false \
  TRAINING_IMAGE_DISPATCH_SECRET="$(openssl rand -hex 32)" \
  TRAINING_IMAGE_RATE_LIMIT=5 \
  TRAINING_IMAGE_RATE_LIMIT_EMPRESA=20 \
  --project-ref "$HOMOLOG_PROJECT_REF"
```

> `OPENAI_API_KEY` **não** é configurada nesta fase. Sem ela, o worker responde
> `503 chave_ausente` e a fila permanece intacta.

Migrations envolvidas (nesta ordem):
1. `20260724120000_atomic_rate_limit_rpc.sql` (já existente)
2. `20261023120000_training_images_infrastructure.sql`
3. `20261023130000_training_image_autoqueue.sql`
4. `20261023140000_edge_rate_limit_dual.sql`

---

## 4. Segredos do agendador (Vault) e ativação

```sql
-- Executar no SQL Editor do projeto de HOMOLOGAÇÃO, com autorização.
SELECT vault.create_secret(
  'https://<ref>.supabase.co/functions/v1/training-image-dispatch',
  'training_image_dispatch_url'
);
SELECT vault.create_secret('<mesmo valor de TRAINING_IMAGE_DISPATCH_SECRET>', 'training_image_dispatch_secret');
```

Depois: `scripts/training-images-homolog/scheduler-enable.sql` (a cada 2 min).
Desativar: `scheduler-disable.sql`. Diagnóstico: `scheduler-status.sql`.

Com as flags desligadas, cada execução apenas retorna `503` e não consome fila.
A ativação real exige, nesta ordem: flags no banco
(`set_training_image_autoqueue(true)`), segredos da função, agendamento e
autorização para a **primeira geração real**.


---

## 5. Seed e roteiro reproduzível

O script `scripts/training-images-homolog/homolog.mjs` executa o roteiro via API
(PostgREST/Auth/Storage/Functions), **sem chamar a OpenAI**:

```bash
HOMOLOG_CONFIRM=SIM \
HOMOLOG_PROJECT_REF=<ref-de-homologacao> \
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_ANON_KEY=<anon> \
SUPABASE_SERVICE_ROLE_KEY=<service-role> \
HOMOLOG_CRON_SECRET=<segredo-do-worker> \
node scripts/training-images-homolog/homolog.mjs
```

O script **recusa** rodar se:
- `HOMOLOG_CONFIRM` não for `SIM`;
- a URL não contiver `HOMOLOG_PROJECT_REF`;
- o ref for igual ao `project_id` de `supabase/config.toml` (produção).

Etapas verificadas (relatório JSON ao final):

1. conectividade e criação idempotente de 2 empresas + 2 usuários fictícios;
2. login real (password grant) e obtenção de JWT;
3. **RLS**: A não lê capa de B; `authenticated` não escreve em `training_images`;
4. **Storage**: upload de fixture no prefixo da própria empresa; bloqueio
   cross-tenant; URL assinada do próprio objeto; B não assina objeto de A;
5. fixture de capa (`provider='simulado-teste'`) lida via URL assinada;
6. **fila**: flag desligada não enfileira; flag ligada enfileira 1; `requested_by`
   preenchido quando o INSERT é feito com JWT;
7. **worker**: invocação sem credencial (401) e com flags desligadas (503,
   `fila_preservada=true`), sem chamar provedor;
8. **backfill**: idempotente (1ª execução > 0, 2ª = 0);
9. limpeza opcional (`HOMOLOG_CLEANUP=SIM`).

### Interface (card)

Spec Playwright preparada: `e2e/authenticated/training-images-homolog.spec.ts`.
Ela só roda com:

```bash
E2E_TRAINING_IMAGES_HOMOLOG=1 \
E2E_BASE_URL=https://<app-apontando-para-homolog> \
E2E_USER_EMAIL=homolog.a@exemplo.local \
E2E_USER_PASSWORD=<senha> \
npx playwright test training-images-homolog --project=authenticated
```

Requisitos: build/dev com `VITE_TRAINING_IMAGES=true`; capa `succeeded` no banco
e objeto no bucket. A spec exige `[data-training-cover-estado="imagem"]`.

---

## 6. Backfill e reconciliação (homologação)

```sql
-- Prévia (somente leitura): conteúdos sem capa e sem solicitação
SELECT c.empresa_id, 'course' AS tipo, c.id
FROM public.catalogo_cursos c
WHERE c.empresa_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.training_images ti
                  WHERE ti.empresa_id=c.empresa_id AND ti.content_type='course'
                    AND ti.content_id=c.id AND ti.status IN ('succeeded','pending','processing'))
  AND NOT EXISTS (SELECT 1 FROM public.training_image_requests r
                  WHERE r.empresa_id=c.empresa_id AND r.content_type='course' AND r.content_id=c.id)
UNION ALL
SELECT t.empresa_id, 'learning_path', t.id
FROM public.trilhas_aprendizado t
WHERE t.empresa_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.training_images ti
                  WHERE ti.empresa_id=t.empresa_id AND ti.content_type='learning_path'
                    AND ti.content_id=t.id AND ti.status IN ('succeeded','pending','processing'))
  AND NOT EXISTS (SELECT 1 FROM public.training_image_requests r
                  WHERE r.empresa_id=t.empresa_id AND r.content_type='learning_path' AND r.content_id=t.id);

-- Execução idempotente (backend)
SELECT public.backfill_training_image_requests(50);
```

Resultado desconhecido: `SELECT public.reconcile_training_image(...)` conforme
`docs/treinamentos-imagens-fase3a2.md` §6 (operador + notas obrigatórios).

---

## 7. Limitações da alternativa remota

- Não substitui o teste local de concorrência (feito em PostgreSQL real).
- O plano Free pausa por inatividade; reativar antes de testar.
- `pg_net` entrega a chamada de forma assíncrona; o worker responde em outra
  requisição. O estado fica na fila, então não há perda.
- Sem `OPENAI_API_KEY`, nenhum caminho chega ao provedor por desenho.
- Custos de egress/DB são cobertos pelo plano; nenhuma cobrança é gerada por
  este repositório.

---

## 8. Ações que exigem autorização explícita

1. Criar o projeto Supabase de homologação.
2. `supabase link` / `db push` (aplicar migrations) no projeto.
3. Publicar as Edge Functions.
4. Configurar segredos (`TRAINING_IMAGE_DISPATCH_SECRET`, contas de teste).
5. Criar os segredos no Vault e executar `scheduler-enable.sql`.
6. Ligar `autoqueue_enabled` e `TRAINING_IMAGE_AUTOQUEUE_ENABLED`.
7. Configurar `OPENAI_API_KEY` e `TRAINING_IMAGE_GENERATION_ENABLED=true`.
8. Executar **uma** geração real de teste.
9. Promover qualquer artefato para produção / aplicar migrations em produção.
