# Fase 3A.2 — finalização da integração do Hub de imagens

Status: **integração pronta para receber a chave**, ainda **DESLIGADA**.
Nenhuma chamada real à OpenAI, nenhuma credencial configurada, nenhum deploy,
nenhuma migration aplicada em banco remoto.

---

## 1. Docker/WSL2 — impedimento documentado

Diagnóstico (somente leitura, sem reset/limpeza):

| Verificação | Resultado |
|---|---|
| `wsl --status` / `wsl --list --verbose` | não suportados nesta instalação (WSL ausente/desatualizado) |
| `HypervisorPresent` (Win32_ComputerSystem) | **False** — virtualização/hipervisor desligados |
| Windows | build **19045** (10.0) |
| `docker context ls` | `desktop-linux` ativo, endpoint `npipe:////./pipe/dockerDesktopLinuxEngine` |
| `docker info` | HTTP 500 / pipe indisponível |
| Docker Desktop | UI e `com.docker.backend` em execução; engine Linux não inicia |
| Log (`%LOCALAPPDATA%\Docker\log\host\monitor.log`) | `dialing 192.168.65.7:2376: context canceled`; `backend is not running`; espera > 2 h pelo VM |
| `Get-WindowsOptionalFeature` | exige elevação (não executado) |

**Conclusão:** habilitar WSL2/VirtualMachinePlatform exige elevação, virtualização
na BIOS e **reinício** da máquina — fora do escopo seguro desta fase. Nenhum
comando destrutivo foi executado. `supabase start` / `functions serve` continuam
**indisponíveis**, e os itens dependentes de Storage/Auth reais permanecem
**PENDENTES** (ver §8).

---

## 2. Certificados — `empresa_id` inexistente

`treinamento_certificados` **não possui** `empresa_id` (schema gerado). O filtro
passou a usar o relacionamento real, o mesmo da RLS:

```ts
.select('*, curso:catalogo_cursos(nome, carga_horaria),
         colaborador:colaboradores!treinamento_certificados_colaborador_id_fkey!inner(nome_completo, empresa_id)')
.eq('colaborador.empresa_id', empresaId)
```

Preservados: nome do colaborador, curso, data de emissão, validade, código de
autenticação, `arquivo_url`, ordenação por `data_emissao` desc e o filtro
opcional por colaborador. Nenhuma coluna nova. Certificado sem colaborador (ou
de outro tenant) é descartado pelo `!inner` — mesmo comportamento da RLS.

Testes: 10 cenários em `catalogoCursoService.test.ts` (empresa correta, empresa
diferente, colaborador opcional, lista vazia, relacionamento inválido,
inexistente, ordenação, campos preservados, erro do banco e empresa obrigatória).

---

## 3. Disparo automático — fila persistente + worker

```
INSERT curso/trilha
      ↓ (trigger AFTER INSERT, se a flag do banco estiver ligada)
training_image_requests (queued)      ← trabalho persistido no banco
      ↓ claim_training_image_requests (FOR UPDATE SKIP LOCKED)
training-image-dispatch (Edge Function, autenticada por segredo/service role)
      ↓ pipeline existente
claim_training_image (barreira atômica de custo)
      ↓ provedor → validação → Storage privado → succeeded
card recebe a capa (source_content_id / training_images)
```

- **Sem interação do usuário**, sem botão, sem prompt, sem geração em render.
- **Nenhum bloqueio no salvamento**: o trigger captura qualquer erro e emite
  `WARNING`; o INSERT original segue.
- **Nenhum trabalho perdido ao fechar a página**: a solicitação está no banco.
- **Sem duplicidade**: `UNIQUE (empresa_id, content_type, content_id)` +
  `SKIP LOCKED` + `claim_training_image`.
- **Sem loop**: requisição `done/skipped/failed` não volta para a fila; apenas
  `processing` > 10 min é recuperável (teto de 5 tentativas).
- **Sem credencial no navegador**: o worker exige `X-Cron-Secret` ou service
  role; o frontend não referencia a função (teste de guardrail).

### Flags (duas camadas, ambas desligadas)

| Camada | Chave | Padrão |
|---|---|---|
| Banco | `training_image_settings.autoqueue_enabled` | `false` |
| Edge Function | `TRAINING_IMAGE_AUTOQUEUE_ENABLED` | `false` |
| Geração | `TRAINING_IMAGE_GENERATION_ENABLED` + `OPENAI_API_KEY` | `false`/ausente |

Sem elas, o worker responde `503` **antes** de reivindicar a fila
(`fila_preservada: true`). O agendamento (pg_cron + pg_net/Vault) está
documentado na migration, **não executado**.

---

## 4. Quotas multiempresa

Novo RPC `edge_rate_limit_check_dual(empresa, limite_empresa, usuario, limite_usuario, janela, now)`:

- dois baldes na **mesma transação**, com advisory locks em ordem determinística;
- **só consome** quando ambos permitem (sem consumo parcial);
- padrão: **20/hora por empresa** + **5/hora por usuário** (configuráveis);
- persistente em `public.rate_limits` e compartilhado entre instâncias;
- empresa A não afeta B; um usuário em duas empresas continua limitado a 5/h.

Duplicidade é resolvida **antes** da quota (idempotência), então solicitação
repetida não consome quota. Conteúdo editado (hash novo) consome — é uma nova
geração.

---

## 5. `attempts` e contadores por conceito

| Campo | Significado |
|---|---|
| `attempts` | tentativas de processamento **da versão atual** (`content_hash`) |
| `generations` | capas concluídas com sucesso (histórico) |
| `failures` | falhas conhecidas (provedor/upload/registro) |
| `unknown_outcomes` | resultados pagos desconhecidos |
| `last_attempt_at` | início da última tentativa |
| `operation_id` | rastreabilidade da requisição no provedor |

O `claim_training_image` agora **reinicia `attempts` para 1 quando o hash muda**.
Falhas antigas não bloqueiam conteúdo legítimo editado; a MESMA versão continua
limitada a 3 tentativas. Os contadores são mantidos por trigger
(`training_images_track_outcomes`) e não duplicam em updates repetidos.


---

## 6. Resultado desconhecido — política e reconciliação

Timeouts, falhas de rede, 5xx e falha ao baixar a imagem são tratados como
**resultado pago desconhecido**:

- linha marcada `failed`, `last_error = 'resultado_desconhecido: ...'`,
  `unknown_outcomes += 1`, `attempts` esgotado;
- `operation_id` persistido para suporte;
- **nenhum reenvio automático** (a fila fecha como `skipped`; a geração manual
  devolve `409 resultado_desconhecido` antes de consumir quota);
- `X-Client-Request-Id`/`operationId` são **rastreabilidade**, não garantia
  contra cobrança duplicada.

### Procedimento administrativo (obrigatório)

1. Localizar a linha:
   ```sql
   SELECT id, operation_id, unknown_outcomes, last_error, requested_at
   FROM public.training_images
   WHERE empresa_id = '<empresa>' AND content_type = 'course' AND content_id = '<conteudo>';
   ```
2. Conferir no painel da OpenAI, pela **janela de tempo** e pelo `operation_id`,
   se houve geração cobrada.
3. Registrar a decisão (operador + notas obrigatórias):
   ```sql
   -- confirmado que NÃO houve geração/cobrança
   SELECT public.reconcile_training_image(
     '<empresa>', 'course', '<conteudo>', 'confirmar_nao_gerado',
     '<operador>', 'Painel OpenAI sem registro para <operation_id> em <data>.'
   );

   -- houve cobrança: mantém bloqueado e audita
   SELECT public.reconcile_training_image(
     '<empresa>', 'course', '<conteudo>', 'manter_bloqueado',
     '<operador>', 'Cobrança confirmada em <data>; capa será tratada manualmente.'
   );
   ```
4. A função recusa: decisão inválida, operador vazio, notas vazias ou linha que
   **não** esteja em `resultado_desconhecido` — portanto não é possível “zerar
   `attempts`” por engano. `confirmar_nao_gerado` é a única via que devolve a
   linha para `disabled` com `attempts = 0`.

Não há tela administrativa nesta fase.

---

## 7. Testes executados

| Suíte | Comando | Resultado |
|---|---|---|
| Vitest (imagens + componentes + serviço) | `npx vitest run …` | **318 testes / 21 arquivos** |
| PostgreSQL local: migrations reais | `node scripts/training-images-local/run-tests.mjs` | OK (4 migrations) |
| RLS/Storage/constraints/trigger | idem | 10 grupos |
| Claim + contadores + reconciliação | idem | 21 cenários |
| Fila automática (trigger/claim/finish) | idem | 10 cenários |
| Rate limit simples + duplo | idem | 9 cenários |
| Concorrência S1–S6 | idem | 1 claim; 1 worker; 1 quota |
| Pipeline + provedor simulado + fila | `npx deno run -A …/pipeline-e2e.ts` | **40 verificações** |
| HTTP Edge Functions (Deno real) | `node …/edge-http-test.mjs` | **54 verificações** (gera + worker) |
| Type-check Deno | `npx deno check …` | OK |
| Build | `npm run build` | OK |
| ESLint (arquivo alterado) | `npx eslint src/services/catalogoCursoService.ts` | 0 erros |
| `tsc --noEmit` | `npm run typecheck` | 13 erros **pré-existentes** em módulos alheios; 0 nos arquivos desta fase |

Validações de segurança cobertas: authenticated não lê/escreve `training_images`
nem a fila; não executa `claim_training_image`, `claim_training_image_requests`,
`reconcile_training_image` nem o RPC duplo; `service_role` opera; bucket privado
e caminho com prefixo do tenant.

---

## 8. Bloqueios remanescentes

1. **Docker/WSL2** (§1): sem Stack Supabase local, permanecem **PENDENTES**
   Auth real, PostgREST real, Storage real, URL assinada e exibição no
   `TrainingCover` com dados reais. Foram substituídos por PostgreSQL local real
   + arquivo local + stub HTTP; não são declarados como aprovados.
2. **Agendamento do worker** não foi criado (decisão deliberada): depende de
   pg_cron/pg_net + Vault no ambiente de homologação. Modelo documentado na
   migration `20261023130000_training_image_autoqueue.sql`.
3. `getCertificado(id)` continua sem filtro explícito de tenant (protegido
   apenas pela RLS). Fora do escopo desta fase.
4. Primeira geração real exige autorização explícita, chave nova e orçamento
   (Fase 3B).
