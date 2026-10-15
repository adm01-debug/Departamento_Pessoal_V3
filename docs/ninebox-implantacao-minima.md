# Nine-Box · Implantação mínima no Supabase atual (sem Docker, sem segundo projeto)

Documento de decisão. **Nada foi executado.** Responde às entregas pedidas e
registra o que depende da sua autorização.

## 1. Compatibilidade com o banco principal — verificável offline

Análise dos **649 arquivos** de `supabase/migrations` (a autoridade local):

| Verificação | Resultado |
|---|---|
| Quem cria `feedbacks_360` | `20260315220807_…` (com RLS habilitado) |
| Quem já criou a policy de INSERT | `20260315221544_…`, **com o nome exato `feedbacks_360_insert`** — o mesmo que a migration do Nine-Box substitui ⇒ substituição **limpa**, sem policy antiga remanescente |
| Quem mais altera a tabela | `20260509124932_…` (`ALTER TABLE public.feedbacks_360`, colunas) |
| Dependências (`app_role`, `user_roles`, `audit_log`, `get_user_empresas`, `colaboradores`, `ciclos_avaliacao`) | criadas em `20251220135248…`, `20251220132737…`, `20251220140409…`, `20250102000000…`, `20260315220807…` — **todas anteriores** |
| Migrations locais **posteriores** ao Nine-Box | **nenhuma além das duas do Nine-Box** ⇒ não há “migration pendente não relacionada” a arrastar |
| Migrations do Nine-Box | `20261015090000` (etapa 1) e `20261016090000` (etapa 2) |

**Conclusão:** a implantação **não depende do histórico completo**; depende de os
objetos acima existirem no banco atual (bloco **Q**). Existindo, a migration
aplica isolada.

> Nada disso substitui a conferência no banco real: rode os scripts de leitura e
> devolva a saída antes de qualquer aplicação.

## 2. Verificação manual, somente leitura

Dois arquivos, ambos `begin; set transaction read only; … rollback;` (zero escrita):

| Script | Responde |
|---|---|
| `docs/ninebox-validacao-banco.sql` (Q1–Q16) | papéis RH/admin (Q1, Q13); estrutura de permissões e `user_roles` (Q2, Q2b, Q15); policies/RLS de `feedbacks_360` (Q5b, Q9b, Q10) e policies **sem filtro de empresa** (Q12); tabelas usadas (Q5c); funções/helpers (Q3, Q16); auditoria (Q4, Q4b, Q4c); dependências das RPCs (Q6, Q14, Q14b); **objetos da migration que já existem** (Q7, Q16) |
| `docs/ninebox-divergencias-migrations.sql` (**novo**, D1–D6) | se as duas migrations do Nine-Box **já foram aplicadas**; última versão aplicada; se algo foi aplicado depois; **pré-requisitos existem aqui** (tabelas/funções, policy `feedbacks_360_insert` com o nome esperado, as 13 colunas usadas) |
| `docs/ninebox-pre-aplicacao.sql` (**novo**, gate `B1–B8`/`A1–A3` + `BASE` + diagnóstico `D1–D4`) | **antes** de aplicar: consolida os bloqueios num único `pode_aplicar` (tabela alvo, etapa 1 já aplicada, papéis, `get_user_empresas`, `audit_log`, vínculo admin/rh, dono da tabela, **contexto empresarial dos colaboradores/ciclos**), avisa sobre locks concorrentes, registra o estado ATUAL do `TRUNCATE` (a prova do "antes") e traz o **diagnóstico agregado e sem dados pessoais** `D1–D4` (colaboradores sem empresa, ciclos sem empresa, referências de empresa inconsistentes no histórico e compatibilidade com as novas validações da RPC) |
| `docs/ninebox-verificacao-truncate.sql` (**novo**, T1–T9 + `ACEITE`) | **pós-**migration: se o `TRUNCATE` de `feedbacks_360` está de fato revogado para `anon`/`authenticated`/PUBLIC (via `has_table_privilege` + ACL cru), se **algum papel herdado** ou um `WITH GRANT OPTION` ainda o concede, se uma função `SECURITY DEFINER` trunca (caminho indireto), se o dono da tabela ou os default privileges reabririam o furo, e se os caminhos de RH/proprietário (SELECT + RPCs) seguem intactos |

**Devolver:** saída de **Q1, Q5b, Q7, Q13, Q16** e de **D1, D2, D4, D5, D6**.

## 3. Migrations necessárias (mínimo absoluto)

| Ordem | Arquivo | Obrigatório? |
|---|---|---|
| 1 | `20261015090000_ninebox_finalizacao_e_potencial.sql` | **SIM** — é a implantação inteira |
| 2 | `20261016090000_ninebox_revoga_insert_direto.sql` | **DEPOIS** — só com o modo real em uso |
| — | Qualquer uma das outras 647 | **NÃO** — nenhuma é pré-requisito do Nine-Box |

### Alterações DDL e de permissão da etapa 1 (inventário exato)

**Cria (novo):** `versao_avaliacao_feedback(uuid)`; view `vw_feedbacks_360_versao`;
`pode_gerir_avaliacoes()`; `pode_validar_potencial()`; tabelas
`feedbacks_360_operacoes` e `feedbacks_360_validacoes_potencial` (+ índice + RLS +
policy de leitura); `finalizar_feedback`, `validar_potencial_avaliacao`,
`criar_feedback_seguro`.

**Altera em `feedbacks_360` (5 pontos, só nela):**
`drop/create policy "feedbacks_360_insert"` (passa a exigir **papel admin/rh E
empresa**); `drop policy "feedbacks_360_delete"` + `revoke delete` (exclusão
física bloqueada); `drop/create policy "feedbacks_360_select"` (leitura por
empresa mantida); `revoke update` + `drop policy "feedbacks_360_update"`;
`revoke truncate` de PUBLIC/`anon`/`authenticated` (§3b — destruição total da
tabela bloqueada; o script de verificação é
`docs/ninebox-verificacao-truncate.sql`).

**Grants:** `revoke all … from public, anon` e `grant execute … to authenticated`
nas funções; `grant select` nas duas tabelas novas e na view.

Nenhuma tabela de outro módulo é criada, alterada ou removida. **Nenhum DML**
(insert/update/delete): zero risco para avaliações existentes.

## 4. Riscos efetivos

| # | Risco | Probabilidade | Mitigação |
|---|---|---|---|
| R1 | A criação de feedback passa a exigir **papel admin/rh** (antes bastava estar na empresa) | **média** se não houver usuário `admin`/`rh` ativo | Q13 confirma; sem esse papel a criação falharia para todos ⇒ resolver com um `user_roles` de admin ANTES de aplicar |
| R2 | Exclusão física de feedback deixa de funcionar (intencional) | baixa | nenhuma rotina do app usa DELETE (verificado); a correção oficial é **cancelar** |
| R3 | `revoke update` em `feedbacks_360` | baixa | o app não tem UPDATE nessa tabela (inventário do plano §9) |
| R4 | `get_user_empresas(auth.uid())` ou `audit_log` com estrutura diferente da assumida | baixa | Q3/Q4/Q4b antes de aplicar; se divergir, ajusto a migration — **não aplico assim** |
| R5 | Histórico de migrations divergente (banco ≠ repo) | média | **não bloqueia o Nine-Box** (nenhuma migration antiga será aplicada); D2 registra a divergência |
| R6 | Aplicar a etapa 2 antes de o modo real estar em uso | **alta se invertida** | ordem obrigatória: etapa 1 → modo real ligado → etapa 2 |

## 5. Procedimento mínimo de implantação

1. **Backup**: confirmar point-in-time/backup automático ativo e registrar o horário.
2. Rodar os **dois scripts de leitura** (§2) e conferir: `Q7/Q16 = false`,
   `D4/D5/D6 = tudo presente`, `Q1 = admin, gestor, rh, user`, `Q4b` aceita
   `'UPDATE'`/`'INSERT'`.
3. **Aplicar 1 arquivo**: `20261015090000_ninebox_finalizacao_e_potencial.sql`
   (SQL Editor, colado inteiro, ou `psql -f`). Este arquivo **é transacional por
   si**: começa com `begin;` e termina com `commit;` (ver §5.2). Não é preciso
   envolver nada à mão — e não cole pedaços: cole o arquivo INTEIRO.
4. Conferir: `Q7/Q16` agora **true**; `feedbacks_360_insert` com o `with check`
   novo; as 3 RPCs com `grant execute to authenticated`; e rodar
   `docs/ninebox-verificacao-truncate.sql` (§6 teste 1b) com `falhas = 0`.
5. Ligar o modo real (`NINEBOX_MODO_REAL_ATIVO = true` em `nineBoxModo.ts`).
6. Rodar os testes do §6. **Só então** considerar a etapa 2
   (`20261016090000_…`), reversível por
   `supabase/rollback/20261016090000_revoga_insert_direto_rollback.sql`.
7. Reversão: ver §5.4 (ordem segura). Emergência total: PITR do passo 1.

### 5.1 Condições que IMPEDEM a execução (bloqueios)

Rodar `docs/ninebox-pre-aplicacao.sql` e exigir **`pode_aplicar = true`**
(`bloqueios = 0`). Os bloqueios computáveis são:

| Código | Bloqueio | Por quê |
|---|---|---|
| B1 | `public.feedbacks_360` ausente | é a tabela alvo |
| B2 | algum objeto da etapa 1 **já existe** | é reaplicação, não implantação — pare e escale (D1/D2) |
| B3 | papel `anon` ou `authenticated` ausente | as policies e as revogações os referenciam |
| B4 | `public.get_user_empresas(uuid)` ausente | é o isolamento por empresa |
| B5 | `public.audit_log` ausente | as RPCs gravam nela |
| B6 | **nenhum** usuário com papel `admin`/`rh` | risco R1: a criação passaria a falhar para todos |
| B7 | dono de `feedbacks_360` é papel de aplicação | o dono tem TRUNCATE implícito: a invariante §3b nunca passaria |
| B8 | alguma empresa **com feedback** não tem colaborador **ou** não tem ciclo com o mesmo `empresa_id` | a validação §7 da RPC passa a exigir os dois ⇒ a CRIAÇÃO ficaria impossível nessa empresa |

Além dos bloqueios, o mesmo arquivo traz o **diagnóstico agregado (sem dados
pessoais) `D1–D4`**: colaboradores com `empresa_id` nulo, ciclos com `empresa_id`
nulo, referências de empresa **inconsistentes** no histórico (feedback cuja
empresa difere da do colaborador ou do ciclo) e a **compatibilidade** das
empresas que já têm feedback com as novas validações. Nada é corrigido ou
preenchido automaticamente — é leitura.

Bloqueios **documentais** (não computáveis pelo script, mesma força):

- sem **backup** point-in-time registrado (data/hora) → não aplique;
- qualquer divergência em `Q1`/`Q5b`/`Q7`/`Q13`/`Q16` ou `D1`/`D2`/`D4`/`D5`/`D6` → não aplique;
- `Q4b` que **não** aceite `'UPDATE'`/`'INSERT'` em `audit_log.acao` → não aplique;
- a linha `ACEITE` do `docs/ninebox-verificacao-truncate.sql`, rodada **ANTES**,
  deve acusar `anon`/`authenticated` com `pode_truncate = true`; se já vier
  `false`, **pare e escale** (alguém corrigiu por outro caminho e a migration
  seria aplicada sobre um estado inesperado).

Avisos que **não** bloqueiam, mas exigem decisão: `A1` (outra sessão segurando
lock em `feedbacks_360` → espere e rode de novo), `A2` (RLS desligada),
`A3` (função `SECURITY DEFINER` truncando fora de `public`).

### 5.2 Aplicação atômica (BEGIN/COMMIT)

A etapa 1 é **uma única transação**, declarada no próprio arquivo:

```
begin;          -- linha 73, imediatamente após o cabeçalho
  0…5)          -- todo o conteúdo da migration (DDL + DCL, ZERO DML)
commit;         -- última linha do arquivo
```

- **Atomicidade**: qualquer falha → o PostgreSQL aborta e **nada** permanece
  (nem função criada, nem policy trocada, nem privilégio revogado).
- **Compatibilidade verificada**: nenhuma instrução do arquivo é incompatível
  com bloco transacional — não há `CREATE INDEX CONCURRENTLY`, `ALTER TYPE …
  ADD VALUE`, `VACUUM`, `REINDEX`, `CREATE`/`DROP DATABASE`, `ALTER SYSTEM`,
  `CREATE TABLESPACE`, `REFRESH MATERIALIZED VIEW CONCURRENTLY`, `SET` de
  sessão, `SAVEPOINT` nem `COMMIT`/`ROLLBACK` internos.
- **CLI** (`supabase db push`): a CLI já transaciona cada migration; o `begin;`
  do arquivo vira `WARNING` e o `commit;` fecha essa mesma transação — nada fica
  fora do envelope.
- **Se algo falhar no SQL Editor**: rode `rollback;` imediatamente — isso libera
  o `ACCESS EXCLUSIVE` retido em `feedbacks_360` e garante que nada foi aplicado.
  **Nunca** execute `commit;` sobre uma transação abortada.
- ⚠️ **Lock**: `drop`/`create policy` e `revoke` em `feedbacks_360` seguram
  `ACCESS EXCLUSIVE` até o `commit;`. São operações de catálogo (rápidas), mas a
  janela deve ser de baixo uso (ver `A1` do gate).


**Janela sugerida:** 15 minutos; impacto esperado em outros módulos: **nenhum**.

### 5.3 Conferência pós-aplicação

1. `docs/ninebox-verificacao-truncate.sql` → **`ACEITE … falhas = 0`**; `T3` e
   `T8b` **vazios**; `T1` sem `pode_truncate = true` em `anon`/`authenticated`.
2. `Q7`/`Q16` agora **true**; `D1` confirmando que as migrations constam como
   aplicadas.
3. `docs/ninebox-testes-seguranca.sql` — 24 casos, `falhas = 0`. Os casos **20–24**
   cobrem exatamente as correções da revisão: reenvio idempotente sem papel,
   nota fora da escala 1–5, reabertura invalidando a validação do RH, exigência
   de NOVA validação de Potencial após a reabertura e `avaliado_id` de outra
   empresa.
4. Fluxo real (criar → concluir → cancelar → reabrir → validar Potencial) e
   **1 linha em `audit_log` por operação**.

### 5.4 Ordem segura de reversão

A reversão é **último recurso** e a ordem importa: reverter na sequência errada
reabre escrita direta sem auditoria.

| # | Situação | O que fazer | Por quê nesta ordem |
|---|---|---|---|
| 0 | Falha **durante** a aplicação | `rollback;` no SQL Editor | nada foi aplicado — não há o que reverter |
| 1 | A criação quebrou com o modo real ligado | **desligar** `NINEBOX_MODO_REAL_ATIVO` | volta ao INSERT direto, que a etapa 1 mantém: resolve sem mexer no banco |
| 2 | Falta a **funcionalidade** (concluir/cancelar/reabrir/validar/view) | `supabase/rollback/20261015090000_…rollback-operacional.sql` | reverte só funcionalidade e **mantém TODO o endurecimento**, incluindo o `TRUNCATE` revogado |
| 3 | A etapa 2 foi aplicada e precisa voltar | `supabase/rollback/20261016090000_revoga_insert_direto_rollback.sql` | **antes** do item 2 (a etapa 2 depende da etapa 1); reabre apenas o INSERT direto |
| 4 | Precisa mesmo reverter o **endurecimento** | `supabase/rollback/20261015090000_…rollback-seguranca.sql` | último recurso, **desaconselhado**, com decisão registrada; restaura INSERT/UPDATE/DELETE amplos e **NÃO** re-concede `TRUNCATE` |
| 5 | Ambiente comprometido / irreversível | PITR do passo 1 | — |

**Regras da ordem:**

- **nunca** comece pelo item 4 — é o único que reabre escrita ampla;
- o item 2 **jamais** reabre `TRUNCATE` (é o objetivo da correção). Se o que
  quebrou foi o privilégio, isso **não é reversão**: é bug, e a resposta é
  manter fechado (uso de `service_role` para manutenção), nunca devolvê-lo aos
  papéis de aplicação;
- para reaplicar depois de reverter, siga de novo do §5.1 (gate). A etapa 1 é
  idempotente (`create or replace`, `if not exists`, `drop … if exists`), mas o
  bloqueio B2 deve ser reinterpretado conforme o que foi revertido.

**O que NENHUM rollback restaura:** `TRUNCATE` para PUBLIC/`anon`/`authenticated`.


## 6. Testes necessários após a implantação

| Ordem | Teste | Como |
|---|---|---|
| 1 | Estrutural | `docs/ninebox-validacao-banco.sql` (`Q7/Q16` agora `true`) |
| 1b | **Privilégio TRUNCATE (P1)** | `docs/ninebox-verificacao-truncate.sql` — `RESULTADO.falhas = 0`; T1 não pode trazer `anon`/`authenticated` com `pode_truncate = true`; T3 deve voltar **vazio** (nenhuma herança concedendo) |
| 2 | Segurança/RLS | `docs/ninebox-testes-seguranca.sql` — 24 casos, `falhas = 0` |
| 3 | Fluxo real | criar → concluir → cancelar (com motivo) → reabrir (com justificativa) → validar Potencial (usuário `rh`) |
| 4 | Auditoria | **1 linha em `audit_log` por operação**, com status anterior/novo |
| 5 | Idempotência/concorrência | mesma chave 2× (1 registro) e C1–C6 do anexo de `docs/ninebox-proposta-controles-feedback.md`, em duas sessões |
| 6 | Isolamento | empresa A não lê nem cria na empresa B |
| 7 | Cálculo 360° | 4 avaliações (gestor/par/auto/subordinado) → pesos 60/25/10/5 e quadrante esperado |
| 8 | Interface | modo real ligado: os 4 controles no modal, selos de Potencial, matriz/KPIs lendo os dados persistidos |
| 9 | Regressão mínima | abrir Feedbacks/PDI/Ciclos/Auditoria (não devem mudar) |

## 7. Depende da sua autorização

1. Executar os dois scripts de **leitura** (Q1–Q16 e D1–D6) — não alteram nada.
2. Autorizar a aplicação de **`20261015090000_…`** no banco atual.
3. Autorizar a troca de `NINEBOX_MODO_REAL_ATIVO` para `true` após os testes.
4. Autorizar, em momento separado, a etapa 2 (`20261016090000_…`).

