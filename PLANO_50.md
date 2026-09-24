# Plano de correção em 50 etapas — Departamento Pessoal V3

**Base:** reverificação delta de 24/09/2026 (`AUDITORIA.md § 3a`) contra o commit `6594b9af79ca`.
**Escopo:** só o que está comprovadamente aberto ou parcial hoje. Etapas já executadas do
`PLANO_100.md` (views, `search_path`, bridge com JWT, buckets, idempotency key, TypeScript,
secrets de CI, CodeQL) **não** reaparecem aqui.

**Rastreabilidade:** toda etapa cita o achado de origem (`A-0XX`) e, quando existe, a etapa
equivalente do plano anterior (`E-0XX`), para não duplicar trabalho em andamento.

**Convenções**

- Tamanho: **S** até 1 dia · **M** 1–3 dias · **L** mais de 3 dias.
- Classe (só banco): **aditiva** (só cria) · **destrutiva** (remove/substitui autorização ou
  constraint em produção → obriga expand-contract e preview).
- Uma etapa = uma PR. Nenhuma etapa depende de etapa posterior.

**Ordem de execução:** Bloco A (contenção) → B (reconciliação) → C (autorização) → D (regressões
funcionais) → E (autenticação) → F (integrações) → G (modelo de dados) → H (backup) →
I (governança) → J (hardening e honestidade de produto).

> ⚠️ **Os blocos A e B são contenção de exposição ativa.** O gate `audit-rls-pii` reprova o commit
> atual de `main` por violação real de isolamento multiempresa. Nada dos blocos C–J deve começar
> antes de A-01…A-08 estarem em produção.

## Status de execução (24/09/2026, sessão de execução)

**Aplicado e verificado em produção** (migrations `20260924140000`, `20260924141500`,
`20260924143000` — cada uma validada com `mode=validate` antes de `mode=apply`, e confirmada por
verificação pós-apply lendo `pg_policies` ao vivo, não só "sem erro"):

- **E50-02/03/04/05 (parcial)** — `colaboradores`, `dependentes`, `ferias`, `provisoes_folha`,
  `pix_lotes`, `pix_itens` fechados. Achado durante a execução, fora do escopo original: `cnab_remessas`
  e `cnab_itens` tinham o mesmo padrão aberto (`roles: public`, "qualquer linha que exista") — corrigidos
  junto.
- **E50-18/19/20 (colaboradores/contas_bancarias/folha_itens/folhas_pagamento)** — policies tenant-only
  sem checar papel substituídas por `pode_gerir_rh`/`pode_gerir_pessoas`.
- **A-003 residual (integracao_logs, notificacoes_admissao)** — as duas policies `USING (true)` que
  ainda anulavam a policy segura ao lado foram removidas.
- **Achado novo, fora do PLANO_50 original**: depois de A-039 (o gate só roda em `push`/`dispatch`,
  nunca em PR) ser confirmado na prática, disparei `ci.yml` via `workflow_dispatch` para obter uma
  corrida real do `audit-rls-pii` pós-fix — ele apontou 2 violações novas em `audit_log`
  ("Authenticated users can insert audit_logs" sem `WITH CHECK` correlacionando autor;
  "Users can view relevant audit_logs" com branch `auth.jwt()->>'role'`). Corrigidas na mesma sessão
  (migration `20260924143000`).
- **E50-06 (harden `get_auth_empresa_id()` na origem)** — **não executado**: a investigação mostrou que
  nenhuma das novas policies criadas depende dessa função (todas usam `get_user_empresas`/
  `pertence_a_empresa`/`pode_gerir_rh`, já verificados como membership-based). Reescrever uma função
  com esse alcance sem necessidade concreta foi descartado por risco/benefício.
- **E50-16 (`is_admin(uuid)` verificar chamador)** — **avaliado e adiado deliberadamente**: dezenas de
  policies já em produção chamam `public.is_admin(auth.uid())` diretamente no `USING`, o que exige
  `EXECUTE` de `authenticated` na função. Revogar esse grant (o fix ingênuo) quebraria todas elas.
  Corrigir de verdade exige mudar o corpo da função para permitir auto-consulta e negar consulta de
  terceiro sem recursão — não tentado às pressas dentro desta sessão.
- **E50-23/24 (`ColaboradorFormPage` sem `empresa_id`)** — corrigido (código, não banco).
- **E50-26/27 (botão "Encerrar" folha)** — corrigido: usa `folhaPagamentoService.fecharFolha` +
  confirmação nomeando competência e total líquido.

**Ainda não executado** (blocos B remanescente, C remanescente, D remanescente, E, F, G, H, I, J —
ver etapas individuais abaixo, nenhuma teve o texto alterado): reconciliação sistemática de todo o
lote de migrations de 19-31/07 além do que já foi tratado ad-hoc, `registros_ponto`/`ferias` além do
que já foi corrigido, triagem dos 18 specs E2E, lockout no GoTrue, quiosque, Bitrix/SSRF/webhook,
CPF/matrícula, backup, gate de PR, proteção de `main`, dashboards falsos, headers Nginx.

---

## Bloco A — Contenção da exposição ativa (P0)

### E50-01 · [P0] · banco — inventariar toda policy que confia em claim de JWT

Corrige: A-035 (pré-requisito)
Onde: todas as tabelas `public` · saída versionada em `infra/audit/rls-claim-based-policies.md`
Classe: — (somente leitura)
Ação:

1. Consultar `pg_policies` filtrando `qual`/`with_check` que contenham `get_auth_empresa_id()`,
   `auth.jwt() ->> 'empresa_id'` ou `current_setting('request.jwt%`.
2. Classificar cada ocorrência: tabela, cmd, contém PII/financeiro, tem policy alternativa correta.
3. Versionar a lista como alvo fechado das etapas E50-02 a E50-06 — sem ela corrige-se 5 tabelas e
   restam as demais silenciosamente.
   Diff estimado: 1 arquivo de evidência · S
   Depende de: —
   Verificação: a lista reproduz, no mínimo, as 6 violações que o gate `audit-rls-pii` reporta hoje
   (`colaboradores`, `dependentes`, `ferias`, `provisoes_folha`, `pix_itens` ×2).
   Risco: nenhum (leitura). Exige acesso SQL direto ao banco — o MCP atual não expõe `pg_policies.qual`.

### E50-02 · [P0] · banco — isolar `pix_itens`, hoje sem correlação de tenant alguma

Corrige: A-035
Onde: tabela `pix_itens` · policies `"Empresas can insert their own PIX itens"` (INSERT) e
`"Empresas can view their own PIX itens"` (SELECT)
Classe: **destrutiva** → expand-contract
Ação:

1. Criar `pix_itens_tenant_select` e `pix_itens_tenant_insert` com predicado
   `lote_id IN (SELECT id FROM pix_lotes WHERE empresa_id IN (SELECT ... vínculo real do usuário))`,
   e `WITH CHECK` idêntico no INSERT.
2. Validar em preview que as novas policies cobrem 100% do uso legítimo atual.
3. Só então dropar as duas policies antigas, na migration seguinte, com `RAISE EXCEPTION` se não
   existirem com o texto esperado.
   Diff estimado: ~60 linhas · 2 migrations (expand + contract) · S
   Depende de: E50-01
   Verificação: sessão autenticada no tenant A recebe zero linhas de `pix_itens` de lote do tenant B;
   INSERT com `lote_id` alheio é rejeitado pelo `WITH CHECK`.
   Risco: predicado errado derruba o fluxo de pagamento. Preview obrigatório com lote real replicado;
   rollback = manter a policy antiga viva até o contract, que é uma migration separada.

### E50-03 · [P0] · banco — fechar UPDATE/DELETE em `pix_itens` e `pix_lotes`

Corrige: A-035 (classe "RLS só de SELECT é vazamento")
Onde: tabelas `pix_itens`, `pix_lotes`
Classe: aditiva
Ação:

1. Verificar quais dos quatro comandos têm policy hoje em cada tabela.
2. Criar policies explícitas de UPDATE e DELETE com o mesmo predicado de tenant de E50-02; onde a
   operação não deve existir pelo app, não criar policy alguma (deny por ausência).
   Diff estimado: ~40 linhas · 1 migration · S
   Depende de: E50-02
   Verificação: UPDATE/DELETE de item PIX de outro tenant retorna zero linhas afetadas.
   Risco: bloquear correção legítima de lote. Levantar os call sites (`grep -rn "pix_itens" src supabase`)
   antes de aplicar.

### E50-04 · [P0] · banco — trocar claim por vínculo real em `colaboradores` e `dependentes`

Corrige: A-035
Onde: policies `empresa_isolation_colaboradores` e `empresa_isolation_dependentes` (ambas FOR ALL)
Classe: **destrutiva** → expand-contract
Ação:

1. Criar policy nova com predicado sobre a tabela de vínculo usuário↔empresa (mesmo padrão
   `get_user_empresas(auth.uid())` já usado nas tabelas corrigidas em 12/09), incluindo `WITH CHECK`.
2. Manter a antiga viva durante um ciclo; dropar em migration separada com verificação fail-closed.
   Diff estimado: ~70 linhas · 2 migrations · M
   Depende de: E50-01
   Verificação: `audit-rls-pii` para de reportar essas duas policies; teste cross-tenant de E50-07 passa.
   Risco: é a tabela mais lida do sistema — medir plano de execução (`EXPLAIN`) antes e depois; se a
   subquery de vínculo degradar, materializar em função `STABLE` indexada.

### E50-05 · [P0] · banco — trocar claim por vínculo real em `ferias` e `provisoes_folha`

Corrige: A-035
Onde: policies `empresa_isolation_ferias` (FOR ALL) e `"Visualização por empresa provisoes"` (SELECT)
Classe: **destrutiva** → expand-contract
Ação: mesmo procedimento de E50-04, aplicado às duas policies; `provisoes_folha` usa hoje
`(auth.jwt() ->> 'empresa_id')::uuid` cru.
Diff estimado: ~60 linhas · 2 migrations · S
Depende de: E50-04 (mesmo padrão validado antes de replicar)
Verificação: `audit-rls-pii` limpo para as duas; provisão de outro tenant invisível.
Risco: `provisoes_folha` alimenta fechamento contábil — validar que o cálculo de provisão continua
enxergando os próprios dados antes de promover.

### E50-06 · [P0] · banco — endurecer `get_auth_empresa_id()` na origem

Corrige: A-035 (causa transversal)
Onde: função `public.get_auth_empresa_id()`
Classe: **destrutiva** (muda semântica de autorização para todo chamador)
Ação:

1. Reescrever a função para derivar a empresa do vínculo persistido do `auth.uid()`, ignorando o
   claim do token; manter a assinatura para não quebrar chamadores.
2. Se houver caso legítimo de "empresa ativa selecionada", validar o claim contra o vínculo e
   rejeitar quando não pertencer — nunca confiar direto.
   Diff estimado: ~35 linhas · 1 migration · M
   Depende de: E50-01
   Verificação: token adulterado com `empresa_id` alheio passa a resolver para a empresa real (ou erro),
   nunca para a empresa do claim.
   Risco: alto alcance — a função é usada por várias policies. Aplicar depois de E50-04/E50-05 para que
   as tabelas críticas já não dependam dela; smoke test de RH/folha/ponto em preview.

### E50-07 · [P0] · testes — prova automatizada de isolamento cross-tenant

Corrige: A-035, A-009 (regressão futura)
Onde: nova suíte em `scripts/tests/` ou `src/tests/`, plugada ao job `db-integrity`
Classe: —
Ação:

1. Criar dois tenants de teste com dados sintéticos (sem PII real) e dois usuários comuns.
2. Para cada tabela sensível (`colaboradores`, `dependentes`, `ferias`, `provisoes_folha`,
   `pix_itens`, `contas_bancarias`, `folhas_pagamento`, `folha_itens`, `registros_ponto`), afirmar
   SELECT/INSERT/UPDATE/DELETE cruzados retornando vazio ou erro.
   Diff estimado: ~250 linhas · M
   Depende de: E50-02, E50-04, E50-05
   Verificação: a suíte falha se qualquer policy voltar ao predicado por claim.
   Risco: suíte lenta vira candidata a ser desativada — manter abaixo de 2 min e rodar só no job de banco.

### E50-08 · [P0] · infra — confirmar e fechar a rota pública do MCP

Corrige: A-001 (não reverificado por falta de conector nesta sessão)
Onde: Cloudflare Worker `supabase-deptpessoal-gw` · rota `/***/mcp`
Classe: —
Ação:

1. Confirmar o estado real: a URL ainda responde JSON-RPC `initialize` sem segunda credencial?
2. Se sim, executar E-001/E-002/E-003 do `PLANO_100.md` (bloquear rota, rotacionar path, exigir
   Cloudflare Access). Se não, registrar a evidência do fechamento em `AUDITORIA.md`.
   Diff estimado: configuração externa · S
   Depende de: —
   Verificação: POST sem autenticação à rota antiga retorna 403/404; nenhum método JSON-RPC responde 200.
   Risco: interrompe automações MCP legítimas — inventariar consumidores antes de rotacionar.

---

## Bloco B — Reconciliação entre migrations e banco vivo (P0 estrutural)

### E50-09 · [P0] · banco — congelar um dump de referência do estado vivo

Corrige: A-036 (pré-requisito)
Onde: `supabase/baseline/` (ao lado do `20260831_canonical/` já existente)
Classe: — (somente leitura)
Ação:

1. Extrair do banco de produção: policies (com `qual`/`with_check`), funções definer com `proconfig`,
   grants por role, índices e constraints.
2. Versionar como baseline datado, sem dado de negócio.
   Diff estimado: artefato gerado · S
   Depende de: —
   Verificação: o dump reproduz as policies que o gate hoje acusa; revisão confirma ausência de PII.
   Risco: dump pode conter nome de policy revelando estrutura interna — repo é público, revisar antes.

### E50-10 · [P0] · governança — diff formal repositório × produção

Corrige: A-036
Onde: `scripts/audit-schema-drift.mjs` (novo) · relatório em `infra/audit/`
Classe: —
Ação:

1. Comparar o baseline de E50-09 com o efeito esperado dos arquivos de `supabase/migrations/`.
2. Produzir três listas: policy que deveria ter sumido e continua viva; policy que deveria existir e
   não existe; objeto vivo sem migration de origem.
   Diff estimado: ~200 linhas · M
   Depende de: E50-09
   Verificação: o relatório contém, no mínimo, as divergências já conhecidas do lote 19–31/07/2026
   (12 arquivos) e das 8 tabelas de A-003/A-009.
   Risco: falso positivo por diferença de formatação do predicado — normalizar antes de comparar.

### E50-11 · [P0] · banco — fechar `integracao_logs` e `notificacoes_admissao`

Corrige: A-003 (residual)
Onde: policies vivas `"Apenas admin pode ver logs de integração"` (com cedilha) e
`"RH pode ver notificacoes"`
Classe: **destrutiva** → expand-contract
Ação:

1. Criar as policies restritivas corretas (`is_admin()` / escopo por empresa) onde faltam.
2. Dropar as permissivas **pelo nome exato observado ao vivo** — a migration de 19/07 falhou porque
   o `DROP POLICY IF EXISTS` grafou o nome sem a cedilha e não dropou nada, silenciosamente.
   Diff estimado: ~50 linhas · 1 migration · S
   Depende de: E50-10
   Verificação: `pg_policies` mostra só as policies novas nas duas tabelas; usuário comum não lê
   notificação de admissão de outra empresa.
   Risco: `integracao_logs` é usada por diagnóstico — confirmar que o time de suporte usa conta admin.

### E50-12 · [P0] · governança — proibir DROP silencioso em migration

Corrige: A-036 (causa raiz)
Onde: `supabase/migrations/_template.sql` (novo) · `scripts/audit-migration-style.mjs` (novo)
Classe: —
Ação:

1. Criar template com bloco `DO $$ ... IF NOT FOUND THEN RAISE EXCEPTION`, no padrão já usado pelas
   migrations de 11–12/09 (que são fail-closed e por isso chegaram ao banco).
2. Criar lint que reprova migration nova contendo `DROP POLICY IF EXISTS` sem verificação posterior.
   Diff estimado: ~120 linhas · S
   Depende de: —
   Verificação: migration de teste com `DROP POLICY IF EXISTS` solto é reprovada no CI.
   Risco: lint pega migrations legítimas de limpeza — permitir exceção anotada e revisada.

### E50-13 · [P0] · CI — detectar drift de schema continuamente

Corrige: A-036
Onde: `.github/workflows/ci.yml`, job `db-integrity`
Classe: —
Ação:

1. Rodar `scripts/audit-schema-drift.mjs` (E50-10) contra o banco de validação em cada execução do job.
2. Falhar quando surgir divergência nova em relação ao baseline aprovado.
   Diff estimado: ~40 linhas · S
   Depende de: E50-10, E50-46
   Verificação: introduzir uma policy manual fora de migration em preview faz o job falhar.
   Risco: ruído se o baseline não for atualizado junto com migrations legítimas — atualizar baseline é
   parte do checklist de PR de banco.

### E50-14 · [P1] · operação — tornar auditável a aplicação de migrations

Corrige: A-036
Onde: `infra/runbooks/MIGRATIONS.md` (novo ou existente) · pipeline de deploy de banco
Classe: —
Ação:

1. Documentar quem aplica migration em produção, por qual canal, e como se prova a aplicação
   (ledger `supabase_migrations.schema_migrations` + verificação do efeito, não só da versão).
2. Registrar explicitamente que versão no ledger **não** prova DDL aplicado — o lote de julho está
   parcialmente no ledger e ausente no schema.
   Diff estimado: ~80 linhas de runbook · S
   Depende de: E50-10
   Verificação: um dry-run do runbook por outra pessoa reproduz a aplicação e a prova.
   Risco: runbook que ninguém segue — amarrar ao checklist do template de PR.

---

## Bloco C — Autorização por papel (P1)

### E50-15 · [P1] · autorização — versionar a matriz papel × entidade × comando

Corrige: A-009 (pré-requisito)
Onde: `docs/AUTORIZACAO.md` (novo)
Classe: —
Ação:

1. Declarar, por entidade sensível, quem pode SELECT/INSERT/UPDATE/DELETE (admin, gestor, RH,
   colaborador) — hoje isso só existe implícito e contraditório entre policies.
2. Marcar cada divergência atual como dívida a fechar nas etapas E50-18 a E50-21.
   Diff estimado: ~150 linhas · S
   Depende de: —
   Verificação: cada policy criada nas etapas seguintes cita uma linha da matriz.
   Risco: matriz sem dono envelhece — atribuir revisão a cada mudança de papel.

### E50-16 · [P1] · banco — `is_admin(uuid)` deve verificar o chamador

Corrige: A-037
Onde: função `public.is_admin(uuid)` (definida em `20251220135248_...sql:49-62`, nunca redefinida)
Classe: **destrutiva** (muda semântica)
Ação:

1. Exigir `_user_id = auth.uid()` **ou** chamador já admin; hoje aceita qualquer UUID.
2. Revisar os call sites (`grep -rn "is_admin(" supabase/migrations src`) antes de aplicar — várias
   policies chamam a função para checar terceiros.
   Diff estimado: ~30 linhas · 1 migration · S
   Depende de: E50-15
   Verificação: usuário comum chamando `is_admin('<uuid alheio>')` recebe erro ou `false` constante,
   sem revelar o papel real.
   Risco: quebrar policy que legitimamente checa outro usuário — prever variante interna
   `_is_admin_unchecked()` restrita a `service_role` para esses casos.

### E50-17 · [P1] · banco — revisar grants das funções `SECURITY DEFINER` restantes

Corrige: A-008 (residual)
Onde: todas as funções definer de `public` com `EXECUTE` para `anon`/`authenticated`
Classe: **destrutiva**
Ação:

1. Listar grants atuais por função (requer SQL direto; o MCP atual não expõe `routine_privileges`).
2. Revogar `EXECUTE` de `anon` em tudo que não seja onboarding público explícito; revogar de
   `authenticated` onde a função aceita ID de terceiro sem checar `auth.uid()`.
   Diff estimado: ~100 linhas · 1 migration · M
   Depende de: E50-16
   Verificação: `scripts/audit-secdef-authz.mjs` passa sem exceções pendentes.
   Risco: revogar função usada por Edge Function via chave anon — mapear chamadores antes.

### E50-18 · [P1] · banco — `colaboradores` com policy por papel

Corrige: A-009
Onde: policies `empresa_isolation_colaboradores`, `"Usuários podem atualizar/deletar colaboradores da
sua empresa"` vs `"Admins manage employees..."`
Classe: **destrutiva** → expand-contract
Ação:

1. Criar policy única por comando que exige tenant **e** papel (`pode_gerir_rh`/`is_admin`) para
   UPDATE/DELETE; SELECT permanece por tenant.
2. Dropar as permissivas amplas — enquanto coexistirem, o OR entre policies PERMISSIVE anula o gate.
   Diff estimado: ~80 linhas · 2 migrations · M
   Depende de: E50-04, E50-15
   Verificação: usuário sem papel de RH recebe erro ao atualizar colaborador da própria empresa.
   Risco: travar operação de quem hoje depende do acesso amplo — levantar os papéis reais dos usuários
   ativos antes de promover.

### E50-19 · [P1] · banco — `contas_bancarias` com policy por papel

Corrige: A-009
Onde: policy `tenant_contas_bancarias` (FOR ALL, só `empresa_id`); a correção `contas_bancarias_rh_manage`
existe no repo (`20260729151433_...sql:104-107`) e nunca chegou ao banco
Classe: **destrutiva** → expand-contract
Ação: aplicar a policy role-gated já escrita, validar, e dropar a ampla pelo nome vivo.
Diff estimado: ~50 linhas · 2 migrations · S
Depende de: E50-11 (mesmo padrão de reconciliação), E50-15
Verificação: usuário operacional não altera conta bancária; RH/admin altera.
Risco: dado bancário é alvo de fraude — priorizar esta sobre as demais do bloco.

### E50-20 · [P1] · banco — `folhas_pagamento` e `folha_itens` com policy por papel

Corrige: A-009
Onde: `"Gestão de folha por cargo"` (role-gated, hoje anulada) + `empresa_isolation_folhas`,
`tenant_folhas_pagamento`, `"Empresa vê suas próprias folhas"`, `"Folha itens scoped via folha"`
Classe: **destrutiva** → expand-contract
Ação: consolidar em uma policy por comando que exige tenant + papel; dropar as quatro amplas.
Diff estimado: ~90 linhas · 2 migrations · M
Depende de: E50-15
Verificação: estagiário vinculado à empresa não altera folha; fechamento por RH continua funcionando.
Risco: quebrar o fluxo de fechamento — validar junto com E50-26.

### E50-21 · [P1] · banco — `ferias` e `registros_ponto` com policy por papel

Corrige: A-009
Onde: `empresa_isolation_ferias`, `tenant_ferias`, `empresa_isolation_ponto`, `tenant_registros_ponto`
Classe: **destrutiva** → expand-contract
Ação: mesma consolidação; preservar o caso legítimo do colaborador que lê o próprio ponto/férias.
Diff estimado: ~90 linhas · 2 migrations · M
Depende de: E50-05, E50-15
Verificação: colaborador lê só o próprio registro; alteração exige papel de RH.
Risco: bloquear o registro de ponto do próprio usuário — cobrir esse caminho no teste de E50-07.

### E50-22 · [P1] · CI — detectar policy permissiva que anula gate por papel

Corrige: A-009 (regressão futura)
Onde: `scripts/audit-rls-least-privilege.mjs` (existente, ampliar)
Classe: —
Ação:

1. Reprovar quando uma tabela sensível tiver duas policies PERMISSIVE para o mesmo comando sem que
   uma seja estritamente mais restritiva — o padrão exato que anulou `"Gestão de folha por cargo"`.
   Diff estimado: ~80 linhas · S
   Depende de: E50-18, E50-19, E50-20, E50-21
   Verificação: fixture com par permissivo redundante é reprovada.
   Risco: heurística com falso positivo em tabela com papéis legitimamente disjuntos — permitir
   exceção declarada na matriz de E50-15.

---

## Bloco D — Regressões funcionais em produção (P1)

### E50-23 · [P1] · colaboradores — passar `empresa_id` no formulário

Corrige: A-012 (hoje quebra 100% das edições em runtime)
Onde: `src/pages/ColaboradorFormPage.tsx` (schema Zod ~31-75, mutation ~117)
Classe: —
Ação:

1. Obter a empresa ativa pelo hook multiempresa e incluí-la no payload de `criar`.
2. Passar `empresaId` como terceiro argumento de `atualizar` e no `buscarPorId` — `baseService`
   exige (`src/services/baseService.ts:127-131`) e lança hoje em toda edição.
3. Remover os `as any` que mascaravam a divergência de contrato.
   Diff estimado: ~40 linhas · S
   Depende de: —
   Verificação: criar e editar colaborador pela UI em dois tenants distintos, sem exceção e sem
   vazamento de registro alheio na busca por ID.
   Risco: o hook pode não expor empresa em rota de admin — tratar o caso ausente com erro explícito,
   nunca com fallback silencioso.

### E50-24 · [P1] · serviços — tornar `empresaId` obrigatório no tipo

Corrige: A-012 (recorrência)
Onde: `src/services/colaboradorService.ts:8-12` · `src/services/baseService.ts:31-33,97-131`
Classe: —
Ação: mudar a assinatura para exigir `empresaId` em tempo de compilação nas entidades com
`requireEmpresaId`, em vez de validar só em runtime.
Diff estimado: ~60 linhas · S
Depende de: E50-23
Verificação: `bun run typecheck` reprova chamada sem empresa em qualquer call site.
Risco: expõe outros call sites quebrados — é o objetivo; corrigir contrato, não silenciar com cast.

### E50-25 · [P1] · testes — cobrir o formulário de colaborador em dois tenants

Corrige: A-012
Onde: `src/tests/` (unitário) + `e2e/` (fluxo)
Classe: —
Ação: teste que cria/edita colaborador no tenant A e confirma que o mesmo ID não é alcançável
autenticado no tenant B.
Diff estimado: ~120 linhas · S
Depende de: E50-23
Verificação: o teste falha se `empresaId` voltar a ser omitido.
Risco: nenhum relevante.

### E50-26 · [P1] · folha — encerrar pelo service autoritativo

Corrige: A-013
Onde: `src/pages/FolhaPagamentoPage.tsx:138-156,222` → `src/services/folhaPagamentoService.ts`
(`fecharFolha`, com lock otimista, bloqueio por alerta crítico, hashes e auditoria)
Classe: —
Ação: substituir o `UPDATE` direto de `status: 'fechada'` pela chamada a `fecharFolha`, propagando
erro de validação para a UI.
Diff estimado: ~50 linhas · S
Depende de: E50-20
Verificação: encerrar folha com alerta crítico pendente é recusado; hash e trilha de auditoria são
gravados como no caminho canônico.
Risco: expõe folhas que hoje fecham indevidamente — comportamento correto, comunicar ao RH antes.

### E50-27 · [P1] · folha/UX — confirmação e bloqueio de duplo clique no encerramento

Corrige: A-013
Onde: `src/pages/FolhaPagamentoPage.tsx` (botão "Encerrar")
Classe: —
Ação: diálogo de confirmação nomeando competência e total, e `disabled` enquanto a mutation está em voo.
Diff estimado: ~40 linhas · S
Depende de: E50-26
Verificação: clique duplo dispara uma única requisição; cancelar no diálogo não altera estado.
Risco: nenhum relevante.

### E50-28 · [P1] · testes — lock otimista e fechamento concorrente de folha

Corrige: A-013
Onde: `src/tests/` sobre `folhaPagamentoService`
Classe: —
Ação: simular duas sessões fechando a mesma folha; a segunda deve falhar por versão, não sobrescrever.
Diff estimado: ~100 linhas · S
Depende de: E50-26
Verificação: o teste falha se a página voltar a escrever direto na tabela.
Risco: nenhum relevante.

### E50-29 · [P1] · CI — triar as 18 falhas de E2E autenticado

Corrige: A-038
Onde: specs de `e2e/` (colaboradores, folha, holerites, ponto, férias, eSocial, relatórios,
configurações, contratos, PIX/espelho) · run `35506735807`
Classe: —
Ação:

1. Rodar a suíte contra preview e classificar cada falha: causada por RLS (blocos A/C), por A-012, ou
   independente.
2. Registrar a classificação antes de corrigir — a hipótese de causa comum precisa ser provada.
   Diff estimado: relatório · M
   Depende de: E50-07, E50-23
   Verificação: cada uma das 18 falhas tem causa atribuída e etapa responsável.
   Risco: tratar sintoma spec a spec e mascarar a causa comum — por isso a triagem vem antes do conserto.

**Triagem executada (24/09/2026, run `36038831016`, commit `e68a8b531` — já inclui os fixes de RLS
colaboradores/dependentes/ferias/pix/cnab/contas_bancarias/folha_itens/audit_log e A-012
empresaId em colaboradores, squashados nesse commit único):** 18/18 falhas classificadas.
**Nenhuma é RLS de tabela específica nem A-012** — a hipótese de causa comum do bloco A/C/E50-23
não se confirmou.

- **15/18 · causa dominante:** `external-db-bridge` responde 403 sem header `Access-Control-Allow-Origin`
  na primeira chamada RPC (`get_user_roles`, `get_my_user_empresas`) de cada contexto de teste —
  o browser reporta como falha de CORS antes de expor o 403 real. Afeta carregamento de quase toda
  rota autenticada (`/colaboradores`, `/folha`, `/holerites`, `/ponto`, `/ferias`, `/esocial`,
  `/relatorios`, `/configuracoes`, dashboard admin, EmpresaSwitcher, listagem de contratos,
  divergências de ponto, smoke pós-cutover). Causa raiz não confirmável só com log de browser —
  precisa de log server-side do bridge (rate limit dos workers Playwright em paralelo é a hipótese
  mais provável, dado o limite de 30 writes/100 reads/min já documentado; não descartar erro de
  config de CORS no path de erro do bridge).
- **3/18 · bugs de teste pré-existentes, não relacionados a RLS/A-012:**
  `esocial.spec.ts:7` e `ferias.spec.ts:12` usam `getByRole('heading', ...)` que resolve pra
  múltiplos elementos na página (dado carregou certo, seletor é ambíguo);
  `esocial.spec.ts:50` reaproveita o contexto autenticado do browser em vez de abrir um anônimo,
  então o teste de "rota exige autenticação" nunca dispara o redirect.

Próximo passo (E50-30) não deve tentar corrigir RLS/A-012 nessas specs — não é a causa. Prioridade:
(1) log server-side do bridge pra confirmar rate-limit vs. CORS na resposta de erro; (2) corrigir os
3 bugs de teste independentes; (3) só depois reavaliar se algo residual é causado por policy.

### E50-30 · [P1] · CI — zerar a suíte E2E e voltar a tratá-la como gate

Corrige: A-038
Onde: `e2e/`, `.github/workflows/e2e.yml`
Classe: —
Ação: corrigir o que a triagem apontar como causa própria dos specs (seed, seletor, espera) e exigir
a suíte verde antes de `main`.
Diff estimado: variável · L
Depende de: E50-29
Verificação: `bun run test:e2e:auth` verde em preview e no CI, duas execuções seguidas.
Risco: flake mascarado como conserto — nunca desativar spec para ficar verde.

---

## Bloco E — Autenticação (P1)

### E50-31 · [P1] · autenticação — aplicar lockout no provedor, não só no proxy

Corrige: A-014
Onde: configuração do GoTrue (rate limit, CAPTCHA) · `supabase/functions/auth-login/index.ts`
Classe: —
Ação:

1. Ligar limites nativos e CAPTCHA no provedor, já que `/auth/v1/token?grant_type=password` é público
   por desenho e ignora `check_account_lockout`.
2. Decidir e registrar: ou o endpoint nativo é restringido no gateway, ou o lockout do app é
   declarado como defesa parcial — hoje o código documenta o bypass como risco aceito
   (`src/contexts/AuthContext.tsx:171-176`), sem enforcement.
   Diff estimado: configuração + ~30 linhas · M
   Depende de: —
   Verificação: credential stuffing direto no endpoint nativo é barrado por limite/CAPTCHA, medido com
   tentativas controladas.
   Risco: CAPTCHA mal configurado bloqueia login legítimo — habilitar primeiro em staging.

### E50-32 · [P1] · observabilidade — tornar visível a falha do caminho protegido

Corrige: A-014
Onde: `supabase/functions/auth-login/index.ts:88-111` (503 `LOGIN_PROTECTION_UNAVAILABLE`)
Classe: —
Ação: emitir métrica/alerta quando a proteção cair — hoje o fail-closed está correto, mas silencioso,
e derruba login sem avisar ninguém.
Diff estimado: ~40 linhas · S
Depende de: E50-31
Verificação: derrubar a RPC em staging gera alerta, não só 503 para o usuário.
Risco: alerta ruidoso — limiar por taxa, não por evento único.

### E50-33 · [P1] · ponto — autenticar de verdade o quiosque

Corrige: A-011 (residual)
Onde: `src/pages/PontoKioskPage.tsx:20,74-79` (`KIOSK_DEVICE_ID` fixo; matrícula como único fator)
Classe: —
Ação:

1. Exigir segundo fator por colaborador (PIN pessoal ou credencial de dispositivo), já que matrícula
   é pública dentro da empresa.
2. Identificar o dispositivo por registro assinado, substituindo o `KIOSK-01` hardcoded.
   Diff estimado: ~200 linhas · M
   Depende de: —
   Verificação: bater ponto com a matrícula de terceiro sem o segundo fator é recusado; o registro
   carrega o dispositivo real.
   Risco: fricção no chão de fábrica — validar o fluxo com o RH antes de habilitar.

---

## Bloco F — Integrações externas (P1)

### E50-34 · [P1] · banco/Bitrix — criar as constraints que o upsert pressupõe

Corrige: A-017
Onde: `departamentos` (hoje só PK), `colaboradores` (sem unique em `email`)
Classe: aditiva (mas exige limpeza prévia de duplicatas)
Ação:

1. Medir duplicatas existentes por `(empresa_id, nome)` e `(empresa_id, email)`.
2. Criar índices únicos compostos tenant-scoped com `CREATE INDEX CONCURRENTLY`.
   Diff estimado: ~40 linhas · 1 migration · S
   Depende de: —
   Verificação: `pg_get_indexdef` mostra os índices; contagem de duplicatas é zero.
   Risco: criação falha se houver duplicata — por isso a medição vem antes, e a limpeza é decisão de
   negócio (qual registro sobrevive), não automática.

### E50-35 · [P1] · Bitrix — alinhar `onConflict` às constraints reais

Corrige: A-017
Onde: `supabase/functions/sincronizar-bitrix/index.ts:116,144`
Classe: —
Ação: trocar `onConflict:'nome'` e `onConflict:'email'` pelas chaves compostas criadas em E50-34 —
hoje o upsert falha em runtime porque a coluna não tem constraint.
Diff estimado: ~30 linhas · S
Depende de: E50-34
Verificação: sincronização repetida não duplica departamento nem colaborador e não lança erro de
conflito inexistente.
Risco: chave composta muda o critério de identidade do registro — validar com um tenant piloto.

### E50-36 · [P1] · Bitrix — parar de reportar sucesso em falha parcial

Corrige: A-017
Onde: `supabase/functions/sincronizar-bitrix/index.ts:179-182` · `ConfigPanels.tsx` (toast)
Classe: —
Ação: responder `success:false` (ou 207 com detalhamento) quando `totalErrors > 0`, e refletir isso
na UI em vez do toast de conclusão.
Diff estimado: ~50 linhas · S
Depende de: E50-35
Verificação: forçar erro em um registro faz a UI mostrar falha parcial com contagem.
Risco: operação passa a ver falhas que já existiam — é o objetivo.

### E50-37 · [P1] · Edge/SSRF — restringir destino das chamadas externas

Corrige: A-031
Onde: `supabase/functions/_shared/safe-fetch.ts` (hoje só timeout/retry) · `webhook_url` configurável
em `ConfigPanels.tsx:35-59,87-99`
Classe: —
Ação:

1. Validar protocolo (`https` apenas), allowlist de host do Bitrix e bloqueio de IP privado/loopback/
   link-local, inclusive após resolução de DNS e em redirect.
2. Validar a URL também na gravação da configuração, não só no consumo.
   Diff estimado: ~150 linhas + testes · M
   Depende de: —
   Verificação: `webhook_url` apontando para host interno é recusado na gravação e no fetch.
   Risco: allowlist rígida quebra instância self-hosted do Bitrix — permitir domínio adicional por
   configuração revisada, nunca livre.

### E50-38 · [P1] · webhook — não confirmar `processed` sem efeito de negócio

Corrige: A-032
Onde: `supabase/functions/webhook/index.ts:169-203` (`processWebhookV1/V2` só fazem `console.log`)
Classe: —
Ação:

1. Rotear eventos suportados para handlers reais; responder 422 para evento desconhecido.
2. Marcar `processed` só após o efeito persistir; usar `accepted` quando o processamento for assíncrono.
   Diff estimado: ~180 linhas + testes · M
   Depende de: —
   Verificação: evento suportado altera a entidade e o log; desconhecido não recebe 200 `processed`;
   replay não duplica.
   Risco: produtores podem reenviar ao ver novo status — manter idempotência por `event_id`.

**Status (24/09/2026): adiado deliberadamente, não bloqueado.** Investigação ao vivo (ver
`AUDITORIA.md` § A-032) confirmou `webhook_logs`, `webhooks` e `webhooks_config` com 0 linhas em
produção — nenhum consumidor real chamou este endpoint nem configurou webhook de saída. Decisão do
Joaquim: manter como está, sem implementar handlers reais nem remover, até existir caso de uso
concreto.

---

## Bloco G — Modelo de dados multiempresa (P1)

### E50-39 · [P1] · banco — medir colisões antes de mexer em CPF/matrícula

Corrige: A-025 (pré-requisito)
Onde: `colaboradores` (`colaboradores_cpf_key`, `colaboradores_matricula_key`, ambos UNIQUE globais)
Classe: — (somente leitura)
Ação: contar quantos CPFs/matrículas se repetiriam sob unicidade por `(empresa_id, campo)` e quantas
pessoas teriam vínculo legítimo em duas empresas hoje bloqueado.
Diff estimado: consulta + registro · S
Depende de: —
Verificação: números registrados em `AUDITORIA.md`; decisão de negócio tomada com dado, não suposição.
Risco: nenhum (leitura). Mascarar CPF em qualquer evidência publicada.

### E50-40 · [P1] · banco — criar índices únicos compostos tenant-scoped

Corrige: A-025
Onde: `colaboradores`
Classe: aditiva (fase _expand_)
Ação: `CREATE UNIQUE INDEX CONCURRENTLY` para `(empresa_id, cpf)` e `(empresa_id, matricula)`,
convivendo com as constraints globais antigas.
Diff estimado: ~25 linhas · 1 migration · S
Depende de: E50-39
Verificação: índices criados e válidos; nenhuma escrita bloqueada durante a criação.
Risco: `CONCURRENTLY` falha sem abortar a transação — prever verificação de `indisvalid` e repetição.

### E50-41 · [P1] · aplicação — tratar CPF/matrícula como identidade por empresa

Corrige: A-025
Onde: serviços e telas de colaborador (busca, criação, validação de duplicidade)
Classe: —
Ação: toda checagem de existência passa a filtrar por empresa; mensagem de erro deixa de afirmar
"CPF já cadastrado" globalmente.
Diff estimado: ~120 linhas · M
Depende de: E50-40, E50-24
Verificação: mesma pessoa é cadastrada em duas empresas; duplicata dentro da mesma empresa é recusada.
Risco: relatórios que assumem CPF único global — levantar consumidores antes.

**Status (24/09/2026): escopo reduzido, honesto sobre o que falta.** `colaboradorService.criar`/`atualizar`
mapeiam `23505` pela constraint que disparou: `colaboradores_empresa_{cpf,matricula}_key` (novo índice
composto, E50-40) → mensagem escopada por empresa; `colaboradores_cpf_key`/`colaboradores_matricula_key`
(constraint global antiga, ainda ativa) → mensagem que **não finge** que cadastro cross-empresa já
funciona, porque não funciona: a constraint antiga ainda bloqueia de fato até E50-42 (fora de escopo
aqui, destrutiva, exige ciclo de observação). "Mesma pessoa em duas empresas" da verificação acima só
é alcançável depois de E50-42. Testado com unit test (4 casos: cpf/matrícula duplicado na mesma
empresa, cpf duplicado em outra empresa, erro não-relacionado passa sem reescrever mensagem — esse
último pegou um bug real: o fallback inicial mascarava qualquer erro não-23505 com uma mensagem
genérica, perdendo a causa real). Levantamento de consumidores que assumem CPF único global (risco
citado acima) não foi feito — pendente antes de prosseguir para E50-42.

### E50-42 · [P1] · banco — remover as constraints globais antigas

Corrige: A-025
Onde: `colaboradores_cpf_key`, `colaboradores_matricula_key`
Classe: **destrutiva** (fase _contract_)
Ação: dropar as duas constraints somente depois que E50-41 estiver em produção e estável por um ciclo.
Diff estimado: ~15 linhas · 1 migration · S
Depende de: E50-41
Verificação: cadastro legítimo da mesma pessoa em duas empresas passa; duplicata intraempresa falha
pelo índice composto.
Risco: irreversível na prática (recriar exige dado sem colisão) — só aplicar com a medição de E50-39
em mãos e após janela de observação.

---

## Bloco H — Backup e resiliência (P1)

### E50-43 · [P1] · backup — paginar em vez de falhar acima de 10.000 linhas

Corrige: A-018
Onde: `supabase/functions/backup-automatico/backupSnapshot.ts:1` (`BACKUP_TABLE_ROW_LIMIT = 10_000`)
e `requireCompleteBackupTable()` (~43-57)
Classe: —
Ação: paginar por keyset até esgotar a tabela, mantendo o fail-closed atual como rede de segurança —
hoje qualquer tabela acima do cap faz o backup inteiro falhar com 503.
Diff estimado: ~120 linhas + teste · M
Depende de: —
Verificação: backup de tabela com mais de 10.000 linhas conclui e a contagem do manifesto bate com a
contagem da tabela.
Risco: consumo de memória/tempo no runtime da Edge Function — paginar em lotes e escrever
incrementalmente no bucket.

### E50-44 · [P1] · operação — agendar o backup e alertar ausência

Corrige: A-018
Onde: `cron.job` (nenhum job de backup hoje) · bucket `backups`
Classe: aditiva
Ação:

1. Agendar `backup-automatico` na frequência que o RPO exigir.
2. Alertar quando não houver artefato novo na janela esperada — a ausência precisa ser detectada sem
   depender de alguém olhar.
   Diff estimado: ~60 linhas · 1 migration + config · S
   Depende de: E50-43
   Verificação: artefato novo aparece no bucket na janela; suprimir uma execução dispara alerta.
   Risco: job pesado em horário de pico — agendar fora da janela de folha/ponto.

### E50-45 · [P1] · restore — provar que o backup restaura

Corrige: A-018
Onde: ambiente isolado + `scripts/` de restore
Classe: —
Ação: automatizar restauração do último artefato em ambiente descartável e comparar contagens por
tabela contra o manifesto.
Diff estimado: ~200 linhas · L
Depende de: E50-44
Verificação: drill executado e registrado com data, artefato e divergências encontradas.
Risco: drill com dado real em ambiente menos protegido — usar amostragem mascarada ou ambiente com
o mesmo nível de controle.

---

## Bloco I — Governança do pipeline (P0/P1)

### E50-46 · [P0] · CI — rodar o gate `db-integrity` em Pull Request

Corrige: A-039
Onde: `.github/workflows/ci.yml`, job `db-integrity` (`if: github.event_name != 'pull_request'`)
Classe: —
Ação: restringir a exceção a PRs sem acesso ao secret (Dependabot e forks), mantendo os sete gates
obrigatórios nos PRs internos — hoje uma regressão de RLS só é detectada depois do merge.
Diff estimado: ~15 linhas · S
Depende de: —
Verificação: PR de teste que reintroduz policy permissiva é reprovado antes do merge.
Risco: PRs de fork seguem sem cobertura — documentar como limitação aceita.

### E50-47 · [P1] · GitHub — proteger `main`

Corrige: A-024
Onde: configuração de branch protection do repositório
Classe: —
Ação: exigir PR com revisão e os checks obrigatórios (CI, E2E, Security, `db-integrity`) — hoje
`branches/main/protection` responde 404 e `main` está com CI e E2E vermelhos.
Diff estimado: configuração · S
Depende de: E50-30, E50-46 (proteger antes de a suíte ficar verde trava o próprio conserto)
Verificação: push direto em `main` é recusado; PR sem check verde não pode ser mergeado.
Risco: travar hotfix urgente — definir quem tem bypass documentado antes de ativar.

---

## Bloco J — Honestidade de produto e hardening residual (P2)

### E50-48 · [P2] · frontend — remover métricas fictícias apresentadas como reais

Corrige: A-016 (residual), A-026
Onde: `src/components/folha/FGTSDigitalDashboard.tsx:41,88` ("API Caixa Ativa", "100% Sincronizado",
R$ 12.450,80) · `src/components/admissoes/OnboardingDashboard.tsx:21-27` ("mocked for demo")
Classe: —
Ação: substituir por dado real da própria base ou por estado "sem dados"/"configurando", no mesmo
padrão já aplicado em `LoginPage` e `IntegracoesPage`.
Diff estimado: ~80 linhas · S
Depende de: —
Verificação: nenhuma tela afirma integração ativa sem chamada real correspondente.
Risco: nenhum — é remoção de conteúdo enganoso; risco maior é manter (decisão de RH sobre número falso).

### E50-49 · [P2] · privacidade — capturar IP no servidor, com timeout e base legal

Corrige: A-027
Onde: `src/pages/AssinarContratoPage.tsx:121` · `src/pages/VerificarContratoPage.tsx:44`
(`api.ipify.org` sem `AbortController`)
Classe: —
Ação: obter o IP no backend no ato da assinatura, com timeout, e declarar a coleta no aviso de
privacidade do fluxo — hoje o dado do titular vai a terceiro sem aviso e pode pendurar a assinatura.
Diff estimado: ~90 linhas · S
Depende de: —
Verificação: assinatura conclui com terceiro indisponível; IP registrado vem do backend.
Risco: IP server-side pode divergir do observado pelo titular atrás de proxy — registrar a origem.

### E50-50 · [P2] · infraestrutura — baseline de headers de segurança no Nginx

Corrige: A-028
Onde: `nginx.conf` (servido pelo `Dockerfile:10`)
Classe: —
Ação: adicionar `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, política de frame
e HSTS; introduzir CSP primeiro em `Report-Only` e só depois em modo bloqueante.
Diff estimado: ~40 linhas · S
Depende de: —
Verificação: resposta de produção carrega os headers; CSP em `Report-Only` não gera violação no fluxo
crítico antes de promover.
Risco: CSP direto em modo bloqueante quebra Metabase/Sentry/embeds — por isso a fase `Report-Only`.

---

## Resumo por severidade

| Bloco | Etapas          | Severidade dominante | Tema                                            |
| ----- | --------------- | -------------------- | ----------------------------------------------- |
| A     | E50-01 … E50-08 | P0                   | Isolamento multiempresa quebrado em produção    |
| B     | E50-09 … E50-14 | P0                   | Schema vivo diverge das migrations do repo      |
| C     | E50-15 … E50-22 | P1                   | Autorização por papel anulada por policy ampla  |
| D     | E50-23 … E50-30 | P1                   | Regressões funcionais (colaborador, folha, E2E) |
| E     | E50-31 … E50-33 | P1                   | Autenticação e quiosque                         |
| F     | E50-34 … E50-38 | P1                   | Integrações: Bitrix, SSRF, webhook              |
| G     | E50-39 … E50-42 | P1                   | CPF/matrícula por empresa (expand-contract)     |
| H     | E50-43 … E50-45 | P1                   | Backup paginado, agendado e testado             |
| I     | E50-46 … E50-47 | P0/P1                | Gate em PR e proteção de `main`                 |
| J     | E50-48 … E50-50 | P2                   | Métricas falsas, privacidade, headers           |

**Caminho crítico:** E50-01 → E50-02 → E50-04 → E50-05 → E50-07 (fecha a exposição ativa) e, em
paralelo, E50-09 → E50-10 → E50-11 → E50-12 (impede que a correção se perca de novo entre o
repositório e o banco).

**Fora deste plano, por não terem sido reverificados em 24/09:** A-019 (telemetria do bridge stale),
A-029 (contrato de env incompleto), A-030 (build não reprodutível), A-033 (`any` em contratos) e
A-034 (cobertura). Continuam endereçados pelas etapas E-088/E-089, E-095/E-096, E-097, E-099 e E-100
do `PLANO_100.md`; exigem nova checagem antes de serem executadas.
