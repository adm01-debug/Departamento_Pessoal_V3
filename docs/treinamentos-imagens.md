# Imagens do Hub de Treinamentos — Fase 2 (auditoria) + preparação da Fase 3

Status: **integração DESATIVADA**. Nenhuma chamada à OpenAI, nenhuma chave
configurada, nenhuma migration aplicada. As quatro áreas exibem o fallback
visual aprovado (SVG/CSS com a família cromática da categoria).

> Documento atualizado após a auditoria da Fase 2. Ele descreve o estado real do
> código — não o desejado.

---

## 1. Camadas

| Arquivo | Responsabilidade |
|---|---|
| `types.ts` | contratos: conteúdo, pedido, provedor, resultado, registro, status |
| `paths.ts` | caminho canônico no bucket + validação de tenant |
| `briefing.ts` | saneamento + briefing visual derivado do cadastro (léxico de enriquecimento + caminho genérico) |
| `request.ts` | monta o pedido, `contentHash` (FNV-1a) e `operationId` (idempotência) |
| `provider.ts` | registro do provedor; padrão = desativado; erro tipado (`retryable`) |
| `storage.ts` | validação de MIME/tamanho, upload (backend) e URL assinada (frontend) |
| `service.ts` | leitura por empresa, herança de capa, solicitação com dedupe/limite |
| `config.ts` | flag de leitura, validade de URL, `staleTime`/`gcTime` |
| `index.ts` | API pública única |
| `hooks/useTrainingImages.ts` | consulta por empresa, cache, chave e invalidação |
| `components/treinamentos/TrainingCover.tsx` | capa única (imagem real + fallback) |

## 2. Estrutura de armazenamento

```text
training-images/                 (bucket PRIVADO, 5 MB, webp/png/jpeg)
  <empresa_id>/
    courses/<curso_id>/cover.webp
    learning-paths/<trilha_id>/cover.webp
    training-sessions/<turma_id>/cover.webp     (herança; sem geração)
    certificates/<certificado_id>/cover.webp    (herança; sem geração)
```

- O primeiro segmento é **sempre** o `empresa_id`.
- Uma única fonte de verdade: `public.training_images` (não há coluna nova em
  `catalogo_cursos`/`trilhas_aprendizado`).
- Turmas e certificados herdam a capa do curso (`source_content_id`), então não
  existe geração por turma.

## 3. Migration (preparada, NÃO aplicada)

`supabase/migrations/20261023120000_training_images_infrastructure.sql`

- bucket privado + 4 políticas de Storage;
- `training_images`: uma linha por conteúdo, `status`, `attempts`,
  `content_hash`, `prompt_version`, `last_error`, `requested_at/completed_at`;
- `claim_training_image(...)`: reivindicação **atômica** (`INSERT … ON CONFLICT
  … WHERE`), valida a posse do conteúdo pela empresa e limita tentativas;
- leitura por tenant; escrita **somente** service role (`REVOKE` + `GRANT SELECT`).

### Autorização por tipo (schema REAL)

| `content_type` | Posse validada por |
|---|---|
| `course` | `catalogo_cursos.empresa_id` |
| `learning_path` | `trilhas_aprendizado.empresa_id` |
| `training_session` | `treinamento_instancias.curso_id → catalogo_cursos.empresa_id` |
| `certificate` | `treinamento_certificados.colaborador_id → colaboradores.empresa_id` (+ curso, quando informado) |

> Turmas e certificados **não têm** `empresa_id` no schema. Qualquer validação
> que assuma essa coluna está errada.


## 4. Correções aplicadas na Fase 2

| # | Severidade | Problema | Correção |
|---|---|---|---|
| 1 | **Alta** | Storage aceitava INSERT/UPDATE/DELETE de qualquer membro do tenant | escrita exige `is_admin` **e** vínculo com a empresa; leitura continua por tenant |
| 2 | **Alta** | Proteção contra duplicidade só existia em memória do navegador | `claim_training_image` atômico no banco, com posse + `content_hash` + limite de tentativas |
| 3 | **Alta** | Briefing genérico e léxico fechado; sem defesa contra injeção de prompt | `briefing.ts` com saneamento, assunto derivado do cadastro e caminho genérico para qualquer tema |
| 4 | **Média** | Política `training_images_admin_all` (`FOR ALL`, admin global) | removida; escrita fica no backend (service role) |
| 5 | **Média** | `TrainingCover` ficava preso no fallback após uma falha de URL | falha amarrada à URL; URL nova volta a renderizar a imagem |
| 6 | **Média** | Cache (5 min) sem política de renovação de URL assinada (1 h) | `staleTime` 15 min + `refetchOnWindowFocus` + `gcTime` 30 min |
| 7 | **Média** | Erro do provedor sem classificação; mensagem crua podia vazar chave/URL | `TrainingImageProviderError` (`retryable`) + `mensagemSeguraDoErro` |
| 8 | **Média** | Contrato sem identidade de operação | `operationId`, `contentHash`, `promptVersion` no pedido e no resultado |
| 9 | **Baixa** | Upload sem validação prévia de MIME/tamanho | `validarArquivoDeCapa` antes de enviar |
| 10 | **Baixa** | Mapa de tentativas em memória crescia sem limite | poda em 500 chaves |

## 6. Fase 3 — Ativação da geração (NÃO executar agora)

### 6.1 Modelo e API

- **Confirmar o modelo vigente na documentação oficial no dia da ativação** —
  nomes de modelos mudam. A doc atual descreve a família `gpt-image-2.5`
  (`sunburst` para precisão de edição, `flare` para uso geral); o identificador
  deve ficar em **variável de servidor** (`TRAINING_IMAGE_MODEL`), nunca no
  código do frontend.
- Usar **Image API** (`POST /v1/images/generations`) — geração única a partir de
  um prompt.
- Parâmetros sugeridos: `size` horizontal (ex.: `1536x1024`), `quality` média,
  `background: "opaque"`, `output_format: "webp"`, `n = 1`.
- `safety_identifier` opcional com hash estável da empresa (nunca e-mail).
- A API de imagens pode exigir verificação da organização — validar antes.
- Tratar `b64_json` (padrão) e **não** depender de URL temporária do provedor.

### 6.2 Edge Function `training-image-generate`

1. `verifyCsrf` + `Authorization` + `supabase.auth.getUser()` (padrão das
   funções existentes em `supabase/functions`).
2. Validar `empresa_id` **pelo vínculo** `user_empresas` (nunca confiar no body).
3. `checkRateLimit` por usuário e por empresa.
4. `rpc('claim_training_image', …)` com `contentHash`/`promptVersion`; se
   `reclamado = false`, responder `202` sem chamar o provedor.
5. Marcar `status='processing'`, chamar a OpenAI com timeout (`AbortController`).
6. Converter para WebP (se necessário), `upload` em
   `training-images/<empresa>/…` com `upsert: true`, `status='succeeded'`,
   `completed_at = now()`.
7. Em erro: `status='failed'`, `last_error` seguro (sem chave), `attempts` já
   incrementado pelo claim. Erro permanente esgota tentativas.
8. Resposta sempre sem dados sensíveis.

**Limites de plataforma (Supabase):** parede de 150 s (free) / 400 s (pago),
CPU 2 s por request, idle timeout 150 s. Geração + upload cabe, mas **não**
presuma execução infinita.

### 6.3 Fila e recuperação

- Sem serviço externo de filas: usar a própria tabela como fila
  (`status`, `attempts`, `requested_at`).
- Disparo: `pg_cron` chamando a função (ou `pg_net`) a cada N minutos, ou
  `EdgeRuntime.waitUntil` após o `claim` — sempre com o claim como trava.
- Recuperação: registros `pending/processing` com `requested_at` antigo são
  reivindicáveis (`p_stale_after`, default 10 min).

### 6.4 Ativação gradual

1. Aplicar a migration (com autorização e backup).
2. `supabase secrets set OPENAI_API_KEY=…` e `TRAINING_IMAGE_MODEL=…`
   (nunca em `VITE_*`).
3. Testar **uma** imagem de um curso de teste em homologação.
4. Ligar para cursos; depois trilhas (nome + descrição + cursos vinculados).
5. Turmas/certificados **não geram**: herdam do curso.
6. Só então `VITE_TRAINING_IMAGES=true` no frontend (somente leitura).
7. Monitorar custo por `provider/model/attempts` e o `status` das linhas.

### 6.5 Atualização no frontend

Após concluir, chamar `invalidarCapasDeTreinamento(queryClient, empresaId)` no
`onSuccess` do fluxo (ou assinar `postgres_changes` de `training_images`). O
`TrainingCover` já troca o fallback pela imagem nova sem recarregar a página.

---

## 7. Riscos ainda existentes

1. **`catalogoCursoService.listarInstancias` filtra por `empresa_id`**, coluna
   que NÃO existe em `treinamento_instancias` (escopo real é via curso). Com o
   mock desligado, a aba Turmas tende a falhar. Fora do escopo desta tarefa —
   reportado para correção própria.
2. **Teste de RLS em banco real** não foi executado (sem acesso/deploy). A
   validação foi estática (migration) + unitária. Aplicar em homologação antes
   de produção.
3. **URL assinada** pode expirar se a aba ficar aberta por mais de 1 h sem foco
   nem refetch; o card cai no fallback e volta ao normal no próximo refetch.
4. **Modelo/limites da OpenAI** precisam ser reconfirmados na ativação.

| 11 | **Baixa** | Cache sem chave canônica/invalidação | `trainingImagesQueryKey` + `invalidarCapasDeTreinamento` |

## 5. Testes

```bash
npx vitest run src/services/trainingImages   # 59 testes
npx vitest run src/components/treinamentos   # 119 testes (14 arquivos)
npm run build
npx tsc --noEmit
```

- `briefing.test.ts` — 4 assuntos + assunto inédito + injeção + hash/idempotência;
- `trainingImages.test.ts` — caminhos, tenant, provedor desativado, dedupe,
  erros permanentes/transitórios, mensagem segura, upload, URL assinada, cache;
- `migration.test.ts` — invariantes estáticas do SQL (privacidade, RLS, posse,
  `ON CONFLICT`, revokes, não destrutiva);
- `guardrails.test.ts` — nenhuma referência a `api.openai.com`/`VITE_OPENAI` no
  frontend, nenhuma chamada de rede no provedor, `.env.example` sem chave;
- `TrainingCover.test.tsx` — fallback por área, imagem válida, imagem quebrada,
  renovação de URL, ausência de loading e de rede.

---

# Fase 3A — integração implementada com provedor simulado

Status: **adaptador OpenAI e Edge Function implementados, geração REAL
desativada**. Nenhuma chave configurada, nenhuma chamada paga, nenhum deploy,
nenhuma migration aplicada.

## Arquivos novos

```text
supabase/functions/_shared/trainingImages/
  types.ts             contratos do backend (bytes, claim, resultado)
  hash.ts              SHA-256 (cópia idêntica à do cliente)
  briefing.ts          briefing + prompt (cópia idêntica à do cliente)
  imageValidation.ts   base64, magic bytes, tamanho, mensagem segura
  openaiProvider.ts    adaptador real (fetch injetável, timeout, erros)
  storagePath.ts       caminho/tenant no bucket
  pipeline.ts          orquestração testável (claim → provedor → upload → status)
  simulatedProvider.ts provedor de TESTE (PNG 1×1 local)

supabase/functions/training-image-generate/
  index.ts             wrapper Deno (auth, vínculo, papel, rate limit)
  README.md            contrato, env, segurança, ativação
```

## SHA-256 no lugar do FNV-1a

`contentHash` passou a ser SHA-256 (64 hex) e `operationId` = `ti_` + 32 hex.
O FNV-1a de 32 bits tinha risco de colisão; com SHA-256 duas versões diferentes
do conteúdo nunca são confundidas.

- Cliente: `src/services/trainingImages/hash.ts`
- Backend: `_shared/trainingImages/hash.ts`
- **Paridade garantida por teste** (`parity.test.ts`): hash do conteúdo e
  `operationId` iguais nos dois lados para cursos, trilhas, assunto inédito e
  texto com tentativa de injeção.
- O `content_hash` do banco já aceita até 128 caracteres — sem mudança de schema.

## Adaptador OpenAI (backend)

`POST https://api.openai.com/v1/images/generations` com `model`
`gpt-image-2.5-flare` (configurável), `size 1536x864`, `quality medium`,
`background opaque`, `output_format webp`, `n 1` e `X-Client-Request-Id` =
`operationId`.

- timeout com `AbortController`; erros 400/401/403/404 permanentes (não repetem)
  e 408/409/425/429/5xx/rede/timeout recuperáveis;
- `Retry-After` lido em 429;
- base64 decodificado e validado por **magic bytes** (webp/png/jpeg) e tamanho
  (64 B a 5 MB); aceita `b64_json` ou URL temporária do provedor;
- mensagens sanitizadas (sem chave, Bearer ou URL);
- a chave entra por parâmetro — o adaptador não lê ambiente.

## Edge Function `training-image-generate`

1. CORS + CSRF + JWT (`auth.getUser()`).
2. Corpo estrito `{ empresa_id, content_type, content_id }` (UUID), apenas
   `course` e `learning_path` — turmas/certificados **não geram**.
3. `TRAINING_IMAGE_GENERATION_ENABLED` + `OPENAI_API_KEY`: sem ambos, `503`
   **antes** de qualquer claim (zero custo, zero linha pendente).
4. Vínculo real `user_empresas` e papel `admin`/`rh`.
5. Rate limit por usuário (5/hora por padrão).
6. Pipeline: cadastro escopado por empresa → briefing do servidor → claim
   atômico → provedor → validação → upload (`upsert`) → `succeeded`/`failed`.
7. `claim_training_image` valida a posse no SQL (curso/trilha por empresa; turma
   por curso; certificado por colaborador) e limita tentativas.

O estado do trabalho vive em `training_images` — não em `waitUntil` nem em
memória. Trabalho travado é reivindicável após 10 min (`p_stale_after`).

## Provedor simulado (testes)

`_shared/trainingImages/simulatedProvider.ts` devolve um PNG 1×1 válido e se
identifica como `simulado-teste` / `fixture-local` (nunca “OpenAI”). A função de
produção **não** o importa (guardrail testado).

## Testes da Fase 3A

| Suíte | Testes |
|---|---|
| `trainingImages/__tests__` | **107** |
| `components/treinamentos/__tests__` | **138** |
| `services/__tests__/catalogoCursoService.test.ts` | **31** |

Cobrem: hash (vetores oficiais + paridade), briefing (5 assuntos + injeção),
adaptador (16 casos), pipeline (16 casos: concorrência, idempotência, falhas,
limite, isolamento), guardrails (frontend sem OpenAI/sem chave; função com auth,
vínculo, papel e flag) e a regressão de Turmas.

## Correção do problema de Turmas

`catalogoCursoService.listarInstancias` filtrava por `empresa_id`, coluna que
NÃO existe em `treinamento_instancias`. Agora usa o recurso embutido:
`curso:catalogo_cursos!inner(nome, empresa_id)` + `.eq('curso.empresa_id', ...)`,
preservando ordenação por `data_inicio` e o filtro opcional `curso_id`.
Regressão coberta por 3 testes.

> Achado adicional (não corrigido, fora do escopo): `criarInstancia` exige
> `d.empresa_id` e o envia no INSERT da mesma tabela, que não possui a coluna.

## Confirmações

- Nenhuma chamada real à OpenAI (adaptador testado com `fetch` simulado).
- Nenhuma cobrança; nenhuma chave configurada.
- Nenhum deploy; nenhuma migration aplicada remotamente.
- Nenhum dado de produção alterado.
- Layouts das quatro abas preservados (Playwright: 21 capas em fallback, 0 overflow).

## Pendências para a Fase 3B (ativação real)

1. Aplicar a migration em homologação.
2. Criar uma NOVA chave OpenAI (as anteriores foram revogadas).
3. `supabase secrets set OPENAI_API_KEY=... TRAINING_IMAGE_MODEL=...`.
4. Confirmar o modelo e o `size` vigentes na documentação oficial (se
   `1536x864` for recusado, usar `TRAINING_IMAGE_SIZE=1536x1024`).
5. Definir orçamento de testes.
6. `TRAINING_IMAGE_GENERATION_ENABLED=true` só no ambiente de teste.
7. Autorizar UMA geração real de um curso de teste.
8. Validar o arquivo no bucket e a exibição no card.
9. Conferir o consumo no painel da OpenAI.
10. Só então ligar o disparo automático no salvamento.
