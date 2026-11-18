# As dez migrations órfãs da branch `muri` — classificação com evidência

As dez migrations abaixo existem só na branch `muri`: **não estão na `main` e não
estão no ledger** `supabase_migrations.schema_migrations` do projeto canônico
`frjbfeamybqsejlvmqbl` (conferido por consulta direta: zero linhas para estas
versões).

> **Revisado em 2026-11-16.** A primeira versão deste documento recomendava
> aplicar a migration `20261005020000`. Essa recomendação foi **retirada**: a
> conferência de procedência mostrou que os dados que ela converteria são do
> seed placeholder, não histórico real. Ver a seção 9.

O nome delas sugere correção urgente — três se chamam `p0_`. A conferência
objeto por objeto contra o banco real mostra o contrário: **oito não devem ser
aplicadas**, e **duas delas causariam regressão de segurança**. Nenhuma tem
valor de negócio imediato.

Resumo:

| versão           | arquivo                                  | veredito                                 |
| ---------------- | ---------------------------------------- | ---------------------------------------- |
| `20260819000000` | `p0_fix_user_empresa_id_rls`             | **obsoleta e perigosa**                  |
| `20260820000000` | `p0_fix_auditoria_rpc`                   | **obsoleta e perigosa**                  |
| `20260821000000` | `p0_rls_dashboard_audit`                 | **obsoleta** (desfaria duas remediações) |
| `20260925120000` | `document_upload_storage_columns`        | falta, mas sem consumidor na `main`      |
| `20260925130000` | `storage_documentos_delete_tenant_scope` | falta, e **amplia** acesso               |
| `20260929120000` | `colaborador_lotacoes`                   | falta, sem consumidor na `main`          |
| `20261005000000` | `onboarding_kits_rls_additive`           | redundante (falta só um índice)          |
| `20261005010000` | `onboarding_audit_trigger`               | falta, valor baixo                       |
| `20261005020000` | `onboarding_modelo_b_convergencia`       | **não aplicar** — os dados são do seed   |
| `20261026090000` | `ciclos_exclusao_autorizada`             | **já está em produção**                  |

---

## 1. `20260819000000_p0_fix_user_empresa_id_rls` — obsoleta e perigosa

A migration reescreve `public.user_empresa_id()` com três prioridades, e a
**primeira** é `auth.jwt() -> 'user_metadata' ->> 'empresa_id'`.

O que o banco tem hoje (corpo real da função):

```sql
SELECT ue.empresa_id
FROM public.user_empresas AS ue
WHERE ue.user_id = auth.uid()
ORDER BY COALESCE(ue.is_default, false) DESC, ue.created_at ASC, ue.id ASC
LIMIT 1
```

Uma função SQL, estável, `SECURITY DEFINER`, que lê **só** a tabela de vínculo e
tem desempate determinístico (`id ASC`). O caminho do `user_metadata` foi
deliberadamente abandonado — e com razão: no Supabase o `user_metadata` é
**gravável pelo próprio cliente**. Aplicar esta migration daria a qualquer
usuário autenticado a capacidade de escrever `empresa_id` no seu próprio
`user_metadata` e, com prioridade 1, **ler os dados de outra empresa** em toda
policy que usa `user_empresa_id()`.

**Não aplicar.** O problema que ela se propunha a resolver (usuário com vínculo
mas sem `empresa_id` no JWT vendo listas vazias) já está resolvido, e de forma
mais segura.

## 2. `20260820000000_p0_fix_auditoria_rpc` — obsoleta e perigosa

A premissa do cabeçalho ("as funções não existem no banco, gerando 404") é
falsa hoje. As duas existem, com assinatura idêntica à da migration:

- `registrar_auditoria(p_tabela text, p_registro_id text, p_acao text, p_dados_anteriores jsonb, p_dados_novos jsonb, p_empresa_id uuid)`
- `listar_auditoria(p_empresa_id uuid, p_tabela text, p_acao text, p_registro_id text, p_data_inicio timestamptz, p_data_fim timestamptz, p_limite integer)`

O perigo está no meio do arquivo:

```sql
DROP POLICY IF EXISTS "audit_log_all" ON public.audit_log;
CREATE POLICY "audit_log_all" ON public.audit_log FOR ALL USING (true) WITH CHECK (true);
```

Uma policy `FOR ALL USING (true)` **abre a trilha de auditoria inteira para
leitura e escrita de qualquer um**. O banco hoje tem três policies escopadas no
lugar disso:

| policy                            | comando | regra                  |
| --------------------------------- | ------- | ---------------------- |
| `Admins podem ver todo audit_log` | SELECT  | `is_admin(auth.uid())` |
| `audit_log_self_read`             | SELECT  | `user_id = auth.uid()` |
| `audit_log_self_insert`           | INSERT  | (com check próprio)    |

E a `main` removeu a policy pública antiga de propósito, em
`20260719120000_rls_fix_public_access_batch2.sql:64` (`DROP POLICY "view_audit"`).

**Não aplicar.**

## 3. `20260821000000_p0_rls_dashboard_audit` — obsoleta, e desfaria duas remediações

A migration cria treze policies `<tabela>_tenant_select`. Onze delas **já
existem em produção** com esse nome exato: `admissoes`, `batidas_ponto`,
`provisoes_mensais`, `registros_ponto`, `faltas`, `esocial_eventos`,
`banco_horas`, `solicitacoes_ajuste_ponto`, `documentos_assinatura`,
`colaborador_beneficios`.

Elas não vieram desta migration: vieram de
`supabase/migrations/20260912190000_p0_identity_rls_authz.sql` na `main`, que faz
o mesmo trabalho na versão canônica.

As três que **não** existem — `exames`, `desligamentos` e `folhas_pagamento` —
foram removidas **de propósito** depois:

- `20260924200000_p0_rls_least_privilege_remediation.sql:162` → `DROP POLICY exames_tenant_select`
- `20260924200000_p0_rls_least_privilege_remediation.sql:62` → `DROP POLICY desligamentos_tenant_select`
- `20260924141500_p0_role_gate_bancarias_folha_ponto_logs.sql:67` → `DROP POLICY "folhas_pagamento_tenant_select"`

Hoje essas três tabelas são `*_rh_manage` / `folhas_gestor_read`. Aplicar a
migration da `muri` recriaria o SELECT amplo e **daria a qualquer usuário da
empresa acesso a folha de pagamento, desligamentos e exames ocupacionais** —
dado médico e financeiro. É exatamente a regressão que as duas remediações
fecharam.

**Não aplicar.**

## 4. `20260925120000_document_upload_storage_columns` — falta, sem consumidor

Adiciona colunas de Storage a `public.documentos` e
`public.documentos_pessoais_arquivos`. Nenhuma existe em produção:

- `documentos`: `id, colaborador_id, nome, tipo, url, validado, validado_por, data_validade, observacoes, created_at, updated_at, empresa_id`
- `documentos_pessoais_arquivos`: `id, colaborador_id, tipo_documento, arquivo_url, arquivo_nome, arquivo_tamanho, created_by, created_at, updated_at, numero, orgao_emissor, data_emissao, data_validade`

Quem usa essas colunas é o anexo real de arquivo do dossiê do colaborador, que
está na `muri` (`FileUploadField.tsx`, `DocumentosPessoaisCard.tsx`). A `main`
trabalha com `url` / `arquivo_url`.

**Aplicar junto com a área do dossiê**, não antes: coluna sem leitor é schema
morto.

## 5. `20260925130000_storage_documentos_delete_tenant_scope` — falta, e amplia acesso

Cria duas policies de DELETE em `storage.objects` para RH/admin nos buckets
`documentos` e `documentos-colaboradores`.

Hoje `storage.objects` **não tem nenhuma policy** para esses dois buckets — e
`storage.objects` é deny-by-default. Ou seja: hoje só a service role apaga ali.
A migration **amplia** o acesso (de ninguém para RH/admin), não restringe.

Faz sentido junto com o anexo real de arquivo do item 4, quando houver quem
precise apagar pela interface. **Aplicar junto com a área do dossiê.**

## 6. `20260929120000_colaborador_lotacoes` — falta, sem consumidor

Cria a tabela `public.colaborador_lotacoes` com RLS por `empresa_id`, índice
único de lotação principal, trigger de validação de tenant e três índices. A
tabela **não existe** em produção.

A `main` menciona o nome em exatamente um lugar, e é comentário:
`src/mocks/colaboradoresMock.ts:1679` e `:1686`. Nenhum código consulta a tabela.
Quem consulta é a aba Trabalho & Hierarquia da `muri`.

**Aplicar junto com essa aba.**

## 7. `20261005000000_onboarding_kits_rls_additive` — redundante

A premissa é que `onboarding_kits` está sem proteção. Em produção:

- RLS **ligada** (`relrowsecurity = true`);
- uma policy cobrindo tudo: `empresa_isolation_onboarding_kits`, `FOR ALL TO authenticated`, `USING (empresa_id = get_auth_empresa_id())` e o mesmo no `WITH CHECK`.

As três policies que a migration criaria (`select`, `insert`, `update`) seriam
equivalentes, com outro nome e outra função de empresa. A única coisa que
realmente falta é o índice:

```sql
CREATE INDEX IF NOT EXISTS idx_onboarding_kits_empresa_id ON public.onboarding_kits (empresa_id);
```

Em produção a tabela só tem `onboarding_kits_pkey`.

**Aproveitar só o índice**, descartar o resto.

## 8. `20261005010000_onboarding_audit_trigger` — falta, valor baixo

Cria o trigger `audit_tarefas_onboarding` em `public.tarefas_onboarding`
(ausente em produção). Ele grava em `public.audit_log`, que é um destino fraco
para trilha confiável: `authenticated` tem INSERT, e há duas rotinas de expurgo
(`maintenance_archive_old_audit(180, 5000)` diária e
`_purge_audit_log_internal(365)` mensal) que apagam o histórico.

**Decisão do dono.** Tecnicamente aplicável, mas entrega menos garantia do que
o nome promete.

## 9. `20261005020000_onboarding_modelo_b_convergencia` — não aplicar: é seed

**Correção.** A primeira versão desta auditoria recomendava aplicar esta
migration, tratando as linhas do modelo legado como histórico real de
colaboradores. **Estava errado.**

A migration copia linhas de `onboarding_colaborador` / `onboarding_tarefas` para
o modelo canônico, casando pelo CPF. As contagens em produção são:

| tabela                                          | linhas |
| ----------------------------------------------- | ------ |
| `public.onboarding_colaborador` (modelo legado) | 6      |
| `public.onboarding_tarefas` (modelo legado)     | 27     |
| `public.tarefas_onboarding` (modelo canônico)   | 24     |

O que a contagem não mostra, e a procedência mostra: **as seis linhas são do
seed**. Todas têm `colaborador_id` na faixa
`11110000-0000-0000-0000-00000000000X`, que
`supabase/migrations/20260730000000_seed_admissao_onboarding_desligamento_avaliacao.sql`
declara no próprio cabeçalho como "Seed v4 — placeholder explícito" e
"fake-colab: 11110000-0000-0000-0000-000000000001 a ...012". Conferido no banco:

| `colaborador_id`  | status       | progresso | início     |
| ----------------- | ------------ | --------- | ---------- |
| `...000000000006` | concluido    | 100       | 2024-08-05 |
| `...000000000007` | em_andamento | 71        | 2024-09-02 |
| `...000000000001` | em_andamento | 43        | 2025-01-06 |
| `...000000000002` | em_andamento | 57        | 2025-01-06 |
| `...000000000003` | em_andamento | 86        | 2025-01-13 |
| `...000000000008` | em_andamento | 60        | 2025-01-13 |

E `public.colaboradores` tem 12 registros nessa mesma faixa de ids fictícios: o
conjunto inteiro dessa empresa é demonstração.

**Não há histórico real de onboarding a recuperar.** Aplicar a migration
copiaria 27 tarefas fictícias, com datas de conclusão inventadas, para o modelo
canônico — o mesmo tipo de dado falso em tela que a `main` vem removendo.

Fica registrado o erro de método: **contar linhas em produção não prova que o
dado é real.** Recomendação de convergência de dados exige conferir a
procedência dos registros antes de olhar o volume.

## 10. `20261026090000_ciclos_exclusao_autorizada` — já está em produção

O conteúdo desta migration já está aplicado, e veio pela `main`:
`supabase/migrations/20261027090000_ninebox_reconciliacao_incremental.sql`
contém a função `bloquear_exclusao_ciclo_com_dependencias`.

Estado real de `public.ciclos_avaliacao`:

| policy                    | comando | regra                                                                       |
| ------------------------- | ------- | --------------------------------------------------------------------------- |
| `ciclos_avaliacao_insert` | INSERT  | `empresa_id IN (get_user_empresas(auth.uid())) AND pode_gerir_avaliacoes()` |
| `ciclos_avaliacao_delete` | DELETE  | `empresa_id IN (get_user_empresas(auth.uid())) AND pode_gerir_avaliacoes()` |
| `ciclos_avaliacao_select` | SELECT  | `empresa_id IN (get_user_empresas(auth.uid()))`                             |
| `ciclos_avaliacao_update` | UPDATE  | `empresa_id IN (get_user_empresas(auth.uid()))`                             |

`pode_gerir_avaliacoes()` e `bloquear_exclusao_ciclo_com_dependencias()`
existem. **Nada a fazer** — o arquivo da `muri` é duplicata de versão anterior.

### Medido: a versão da `main` é um SUPERCONJUNTO estrito, não um empate

Esta seção dizia só que o conteúdo "já está aplicado". Faltava a medida. Diff dos blocos
equivalentes — `20261026090000_ciclos_exclusao_autorizada.sql` linhas 14-71 contra
`supabase/migrations/20261027090000_ninebox_reconciliacao_incremental.sql` linhas 590-657:

- as duas policies (`ciclos_avaliacao_insert`, `ciclos_avaliacao_delete`), o `revoke` e o
  trigger `ciclos_bloqueio_exclusao_com_dependencias` são **idênticos**;
- a `main` acrescenta uma sexta dependência que a `muri` não checava: `v_auditoria`, um
  `count(*)` em `audit_log` para `tabela = ciclos_avaliacao`. Sem ela, excluir um ciclo
  deixaria a trilha de auditoria apontando para um registro inexistente;
- a `main` documenta por que PDI **não** é dependência (`pdis` e `pdi_plano_desenvolvimento`
  não têm `ciclo_id`) e anota o `allow-silent-drop` exigido pelo gate de estilo.

Ou seja: o trabalho do outro agente não só foi incorporado — foi **endurecido**. Nenhuma regra
de negócio da versão da `muri` ficou de fora. Nada a fazer confirmado por medição, não por
inspeção de nome de arquivo.

---

## Fechamento: as 5 migrations resgatadas estão NO BANCO, não só na `main`

Arquivo na `main` não é DDL em produção — foi esse exatamente o buraco em que
`colaborador_lotacoes` ficou. E linha no ledger também não prova que o objeto existe (lição da
PR #671). O que prova é o sidecar rodando contra o banco.

`canonical-migrations.yml` em `mode=verify`, run
[44236033035](https://github.com/adm01-debug/Departamento_Pessoal_V3/actions/runs/44236033035),
em 2026-11-18, sobre o commit de merge da #677, **conclusion: success**:

```
Sidecar: supabase/migrations/20260929120000_colaborador_lotacoes.verify.sql (ledger ✓ versão 20260929120000)
Sidecar: supabase/migrations/20261117170000_storage_documentos_delete_tenant_scope.verify.sql (ledger ✓ versão 20261117170000)
Sidecar: supabase/migrations/20261117170100_onboarding_audit_trigger.verify.sql (ledger ✓ versão 20261117170100)
Sidecar: supabase/migrations/20261117170200_onboarding_kits_indice_empresa.verify.sql (ledger ✓ versão 20261117170200)
Sidecar: supabase/migrations/20261117170300_documentos_colunas_storage.verify.sql (ledger ✓ versão 20261117170300)
CANONICAL_VERIFY_OK
```

Por que isso é prova, e não um verde qualquer:

- o `ledger ✓` de cada linha só é impresso depois de `count(*) = 1` em
  `supabase_migrations.schema_migrations` — o passo recusa migration pendente;
- cada sidecar roda com `default_transaction_read_only=on` contra o canônico, e o passo exige que
  **toda linha não-vazia seja literalmente `ok`**;
- `CANONICAL_VERIFY_OK` só é emitido com `verify_errors = 0`;
- no mesmo run, o passo de dry-run reportou `Nada a aplicar — lote já registrado no ledger
canônico.`, confirmando por outro caminho que o LOTE ATUAL inteiro está registrado.

**As 10 órfãs da `muri` estão encerradas:** 6 vivas no banco, 3 preservadas como NÃO APLICAR
(reabririam buracos de RLS que a `main` fechou) e 1 preservada por copiar linhas de seed fictício.

### Nota de método: dois erros meus no dispatch do `verify`

Registrados porque custaram dois runs vermelhos e são fáceis de repetir:

1. passei os nomes dos **sidecars**; o input quer o da **migration** — o passo monta o
   `.verify.sql` sozinho a partir do nome da migration;
2. passei a lista **separada por espaço**; o loop é `while IFS= read -r`, ou seja **uma por
   linha** — com espaços os cinco nomes viram um só, e o `tr -d` os concatena.

## Conclusão operacional

1. **Descartar** `20260819000000`, `20260820000000`, `20260821000000` e
   `20261026090000`. As três primeiras são regressão; a quarta é duplicata.
2. **Descartar também** `20261005020000`: as linhas que ela converteria são do
   seed placeholder, não histórico real (seção 9).
3. **Aproveitar só o índice** de `20261005000000`.
4. **Guardar para a recuperação das áreas** `20260925120000`, `20260925130000`
   e `20260929120000`: cada uma entra na mesma PR da tela que a consome.
5. **Levar ao dono** `20261005010000` — decisão de negócio, não técnica.

Nenhuma destas migrations foi aplicada por esta auditoria: a auditoria só leu o
banco. O inventário geral do resgate está em
`docs/auditoria/RESGATE_BRANCH_MURI_2026-11-16.md`.

## 11. Eixo que faltava: repo x ledger de produção (medido em 2026-11-18)

> **A conclusão desta seção foi RETRATADA.** O trecho "as 52 estão aplicadas em
> produção" estava errado: provei 4 arquivos e generalizei para 52. A medição real,
> arquivo por arquivo, está na **§12** — 27 dos 52 têm DDL que não está viva, e o backfill
> do ledger recomendado aqui foi retirado porque esconderia essas lacunas.

As seções 1–10 varreram **branch por branch**. Faltava um eixo: comparar os arquivos de
migration da `main` com o ledger do banco de produção. Isso veio à tona porque o check
`Supabase Preview` está vermelho na `main` desde 2026-11-17 21:39 com:

```
Remote migration versions not found in local migrations directory.
```

Medido com `supabase_db_migrations` (1 087 versões no ledger) contra
`supabase/migrations/*.sql` (823 versões em arquivo):

| medida                                     | valor   |
| ------------------------------------------ | ------- |
| versões no ledger **sem** arquivo no repo  | **316** |
| arquivos no repo **sem** entrada no ledger | **52**  |

### As 316 sem arquivo: é o que o check reclama, e é histórico

A grande maioria tem `name` nulo ou um UUID (ex. `20260729161527` →
`f56939e3-4ec6-4534-a18e-68f33f812b96`), assinatura de DDL aplicada pelo Studio/Lovable
em jul/2026, antes da disciplina de arquivo. O efeito dessas está no schema; a fonte
nunca existiu como arquivo. É isso que deixa o `Supabase Preview` vermelho — e é por isso
que ele não é check obrigatório.

### As 52 sem ledger: NÃO é trabalho perdido — estão aplicadas

A hipótese perigosa era a inversa: arquivo na `main` cuja DDL nunca chegou à produção,
isto é, trabalho de outro agente escrito e nunca aplicado. **Medido, item por item, em
quatro arquivos independentes de duas eras diferentes — todos vivos no banco:**

| arquivo ausente do ledger                               | objeto que só ele cria                    | estado no banco                                                               |
| ------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------- |
| `20261114000500_pensoes_empresa_id_drift.sql:93`        | trigger `trg_pensoes_set_empresa`         | **existe** (BEFORE INSERT + UPDATE em `pensoes`)                              |
| `20261114000600_rls_escrita_por_papel.sql:31-41`        | 4 policies em `comunicados`               | **existem** as 4 (`_tenant_select`, `_rh_insert`, `_rh_update`, `_rh_delete`) |
| `20261114000400_adiciona_updated_at_faltante.sql:71-72` | `blocked_ips.updated_at`                  | **existe**, `NOT NULL DEFAULT now()`, última coluna                           |
| `20260725130000_p5_077_passivo_trabalhista.sql`         | view `vw_passivo_trabalhista_consolidado` | **existe**, 9 colunas                                                         |

Cinco das 52 são ainda mais simples: foram aplicadas sob **outra versão**. Exemplo:
`20260911190000_p0_hash_trigger_search_path.sql` não está no ledger, mas
`20260912142449 p0_hash_trigger_search_path` está — mesmo conteúdo, carimbo diferente.
O mesmo vale para `p0_views_revoke_public`, `p0_payroll_upsert_contract`,
`p1_function_search_path` e `p0_pgcrypto_routine_search_path`.

**Conclusão:** a divergência é do **ledger**, não da produção. Nenhuma funcionalidade
falta no banco por causa dela, e nenhum trabalho de agente ficou sem aplicar. O que existe
é um registro incompleto — exatamente o que a seção 5 do `AGENTS.md` já avisa
("Ledger não prova DDL: exija o sidecar `.verify.sql`"), agora com número.

### Por que não corrigi

Reconciliar o ledger é INSERT em `supabase_migrations.schema_migrations` no banco de
produção: DDL/dado em produção, regra 8 do Fluxo Git. Fica para o dono decidir, com duas
opções honestas:

1. **Backfill do ledger** (registrar as 52 versões já aplicadas) — deixa o
   `Supabase Preview` verde do lado do repo, mas não resolve as 316 sem arquivo.
2. **Aceitar e silenciar o check** — ele é informativo, não obrigatório, e a integridade
   real já é coberta por `Integridade do banco canônico (live)`, que passa.

Esta auditoria só leu o banco. Nada foi aplicado.

## 12. RETRATAÇÃO da §11: as 52 NÃO estão todas aplicadas (medido 2026-11-18)

A §11 afirmava, em negrito, que **"as 52 estão aplicadas em produção"**. **Isso estava errado.** Um
revisor automático (Devin, na PR #683) apontou a falha de método antes de eu medir: a §11 provava
objetos de **4** arquivos e generalizava para 52. A regra 3 da seção 2 do `AGENTS.md` ("toda
afirmação sobre código cita evidência; sem evidência = NÃO VERIFICADO") existe exatamente para
impedir isso, e eu a violei no mesmo documento em que a invoco.

Refeito: os **52** arquivos foram verificados **objeto por objeto** contra o banco canônico
`frjbfeamybqsejlvmqbl`, com as ferramentas estruturadas do MCP (`list_columns`, `list_policies`,
`list_triggers`, `list_indexes`, `list_functions`, `list_views`, `constraints`). Resultado real:

| veredito            | arquivos | significado                                                        |
| ------------------- | -------- | ------------------------------------------------------------------ |
| **APLICADA**        | **7**    | todos os objetos verificáveis existem                              |
| **SUPERSEDIDA**     | **2**    | conteúdo aplicado sob outra versão, com evidência                  |
| **PARCIAL**         | **8**    | parte dos objetos existe, parte não                                |
| **AUSENTE**         | **19**   | nenhum objeto verificável existe                                   |
| **NÃO_VERIFICÁVEL** | **16**   | só `REVOKE`/`GRANT`/`COMMENT`/`DO` opaco, ou precisa de `db_query` |

**27 arquivos (8 PARCIAL + 19 AUSENTE) têm DDL que não está viva em produção.** Isto é trabalho de
outro agente que foi escrito, mergeado na `main` e **nunca aplicado** — exatamente o que a auditoria
existia para encontrar, e que a §11 declarou inexistente.

### O erro concreto que me levou ao engano

A §11 citava `20260725130000_p5_077_passivo_trabalhista.sql` como prova, baseada em
`vw_passivo_trabalhista_consolidado` existir no banco. **Aquele arquivo não cria essa view.** Ele
cria `mv_saldo_ferias`, `mv_provisao_13`, `mv_fgts_passivo`, `mv_passivo_trabalhista`,
`refresh_passivo_trabalhista()` e `v_passivo_summary` — e `mv_passivo_trabalhista` **não existe**
(`list_columns` devolve 0 colunas). Eu conferi por **semelhança de nome**, não por identidade. É a
sexta vez nesta auditoria que concluo de um agregado ou de um proxy em vez do item.

### Consequência grave: o backfill do ledger que eu recomendei faria MAL

A §11 recomendava "backfill do ledger (registrar as 52 versões já aplicadas)". **Retirado.**
Registrar no ledger 27 migrations que nunca rodaram marcaria DDL ausente como aplicada e esconderia
essas lacunas para sempre — o oposto do que o ledger serve. Qualquer reconciliação precisa ser feita
**só sobre as 7 APLICADA e as 2 SUPERSEDIDA**, e as 27 precisam de decisão arquivo por arquivo.

### Bug de produção encontrado assim: login com gov.br está quebrado

`20261028230000_govbr_auth_state_user_id.sql` está **AUSENTE**. A tabela `govbr_auth_state` tem 6
colunas e **não tem `user_id`**. A edge `auth-gov-br` insere essa coluna em
`supabase/functions/auth-gov-br/index.ts:130` (`user_id: userId`) e faz `throw stateErr` na linha
133, então **todo pedido de URL de autenticação gov.br falha em produção**. O comentário no topo do
próprio arquivo já dizia que a coluna "nunca foi criada em migration" — e continua não criada.

### As 27 não aplicadas

| arquivo                                                     | veredito | presentes/conferidos | exemplos do que falta                                                                                                                          |
| ----------------------------------------------------------- | -------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260719170000_security_indexes_constraints.sql`           | AUSENTE  | 0/13                 | index idx_audit_log_tabela_acao_created (public.audit_log); index idx_login_attempts_email_created (public.login_attempts)                     |
| `20260719190000_audit_delete_trigger.sql`                   | AUSENTE  | 0/11                 | function public.audit_delete_operation(); trigger trg_audit_delete_colaboradores                                                               |
| `20260719191000_empresa_id_not_null_constraints.sql`        | AUSENTE  | 0/8                  | NOT NULL em colaboradores.empresa_id; NOT NULL em folhas_pagamento.empresa_id                                                                  |
| `20260719193000_security_monitoring_views.sql`              | AUSENTE  | 0/3                  | view public.v_security_dashboard; view public.v_security_brute_force_targets                                                                   |
| `20260720040000_fix_jornada_fk_ordering.sql`                | AUSENTE  | 0/1                  | constraint colaboradores_jornada_id_fkey (FOREIGN KEY colaboradores.jo                                                                         |
| `20260724000200_fix_desligamentos_empresa_id_not_null.sql`  | AUSENTE  | 0/1                  | NOT NULL em desligamentos.empresa_id                                                                                                           |
| `20260317001935_1663bc94-c134-4084-9b08-4b4257a48256.sql`   | PARCIAL  | 4/7                  | vw_dashboard_time; vw_colaboradores_completo                                                                                                   |
| `20260317130255_3d640e88-8321-4584-b921-81b859f83b82.sql`   | AUSENTE  | 0/17                 | fk_afastamentos_colaborador; fk_afastamentos_empresa                                                                                           |
| `20260719150000_storage_bucket_security_hardening.sql`      | PARCIAL  | 12/19                | POLICY afastamentos_delete_rh_admin ON storage.objects; POLICY admissao_docs_insert_public ON storage.objects                                  |
| `20260724000500_fix_faltas_status_default.sql`              | AUSENTE  | 0/1                  | public.faltas.status DEFAULT 'pendente' (valor real no banco: 'registr                                                                         |
| `20260724000700_fix_rls_recrutamento_onboarding.sql`        | AUSENTE  | 0/5                  | policy empresa_isolation_vagas em public.vagas; policy empresa_isolation_candidatos em public.candidatos                                       |
| `20260724001200_fix_faltas_tipo_default_and_constraint.sql` | AUSENTE  | 0/1                  | public.faltas.tipo DEFAULT 'falta_injustificada' (valor real no banco:                                                                         |
| `20260724140000_p4_072_p4_072_mv_dashboards.sql`            | PARCIAL  | 2/13                 | mv_headcount_daily (materialized view); idx_mv_headcount_daily_pk                                                                              |
| `20260724140001_t007_backup_logs_rls.sql`                   | AUSENTE  | 0/2                  | policy backup_logs_select ON public.backup_logs; policy backup_logs_insert ON public.backup_logs                                               |
| `20260725100000_p3_060_backup_logs.sql`                     | AUSENTE  | 0/5                  | tabela public.backup_logs (e as 9 colunas do ALTER TABLE ... ADD COLUM; idx_backup_logs_empresa                                                |
| `20260725120000_p4_071_compound_indexes.sql`                | PARCIAL  | 4/22                 | idx_colaboradores_empresa_status_admissao; idx_colaboradores_empresa_depto_status                                                              |
| `20260725130000_p5_077_passivo_trabalhista.sql`             | AUSENTE  | 0/15                 | MATERIALIZED VIEW public.mv_saldo_ferias; INDEX idx_mv_saldo_ferias_pk                                                                         |
| `20260726110000_p2_037_consolidate_duplicates.sql`          | PARCIAL  | 1/4                  | VIEW public.v_documentos_unificado; FUNCTION public.documento_registrar(...)                                                                   |
| `20260726120000_p4_068_connection_pooling.sql`              | AUSENTE  | 0/13                 | SCHEMA admin; VIEW admin.v_pgbouncer_stats                                                                                                     |
| `20260802000000_p0_007_views_security_invoker.sql`          | PARCIAL  | 2/17                 | VIEW public.v_filter_stats (inexistente no banco); public.vw_dashboard_time (existe com definicao divergente)                                  |
| `20260804000000_p0_010_write_policies_provisoes.sql`        | AUSENTE  | 0/4                  | POLICY "provisoes_folha_insert" ON public.provisoes_folha (FOR INSERT); POLICY "provisoes_folha_update" ON public.provisoes_folha (FOR UPDATE) |
| `20260815000000_p1_023_naming_pattern.sql`                  | AUSENTE  | 0/2                  | TABLE public.migration_naming_audit; FUNCTION public._classify_migration_name(TEXT)                                                            |
| `20260816000000_p1_024_policies_orfas.sql`                  | AUSENTE  | 0/3                  | policy public.backup_logs_tenant_all (tabela backup_logs nem existe); policy public.contratos_tenant_all                                       |
| `20260817000000_p4_071_indices_compostos_top20.sql`         | PARCIAL  | 6/33                 | idx_colaboradores_empresa_status_admissao; idx_colaboradores_empresa_pk                                                                        |
| `20260817010000_p4_072_materialized_views_dashboards.sql`   | AUSENTE  | 0/14                 | tabela mv_refresh_log; tabela feriados_brasileiros                                                                                             |
| `20261012130000_rotinas_agendadas_falhando.sql`             | PARCIAL  | 3/4                  | public.fn_atualizar_status_ferias_diario() RETURNS jsonb (linha 160); conteudo de chk_notificacoes_tipo com 'ferias_pagamento_d5'              |
| `20261028230000_govbr_auth_state_user_id.sql`               | AUSENTE  | 0/2                  | public.govbr_auth_state.user_id (uuid, REFERENCES auth.users ON DELETE; indice public.idx_govbr_auth_state_user_id                             |

Quatro destes vereditos foram reconferidos por mim, em quatro lotes diferentes, com chamada direta
ao MCP: `mv_passivo_trabalhista` (0 colunas), `govbr_auth_state` (6 colunas, sem `user_id`),
`colaboradores` (tem `idx_colaboradores_cpf`, não tem `idx_colaboradores_empresa_status_admissao`
nem `idx_colaboradores_empresa_pk`) e as views do primeiro arquivo de 2026-03. Todos bateram.

### O que NÃO foi feito

Nada foi aplicado. Aplicar qualquer uma das 27 é DDL em produção — regra 8 do Fluxo Git, decisão do
dono, pelo `canonical-migrations.yml`. O `supabase_db_query` do MCP está devolvendo zero linhas até
para `select 1`, o que é a razão dos 16 `NÃO_VERIFICÁVEL`: `REVOKE`/`GRANT`, corpo de função e
conteúdo de policy não têm como ser lidos pelas ferramentas estruturadas. Esses 16 são
**NÃO VERIFICADO**, não "aplicados".

## 13. Triagem das 26 restantes, em lotes de decisão (2026-11-18)

A §12 mediu 27 arquivos com DDL não viva. **Uma já foi aplicada:**
`20261028230000_govbr_auth_state_user_id` — PR #687, `validate` run 44278442293, `apply` run
44278669976, `verify` run 44278831397 (`Sidecar: ... (ledger ✓ versão 20261028230000)` +
`CANONICAL_VERIFY_OK`), e conferido fora do workflow: `public.govbr_auth_state` tem 7 colunas, com
`user_id uuid` nullable na posição 7. Login com gov.br destravado.

Restam **26**. Elas não são um bloco: há bug vivo, há redundância e há decisão de produto no mesmo
monte. Agrupadas por **decisão**, não por tema, para que cada lote vire uma PR.

### Lote 1 — RETRATADO: não era funcionalidade morta (ver §14)

> **Os dois arquivos deste lote caem.** Fui verificar os consumidores antes de aplicar e nenhum é
> defeito vivo: `provisoes_folha` não tem escritor cliente (só o trigger SECURITY DEFINER, que
> bypassa RLS) e usa padrão de tenant obsoleto; e a ausência de policy no bucket
> `documentos-admissao` é decisão registrada em duas migrations. Medição na **§14**.

| arquivo                                                                 | efeito hoje                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260804000000_p0_010_write_policies_provisoes.sql`                    | as 4 policies de escrita estão ausentes e a RLS está ligada: `INSERT`/`UPDATE`/`DELETE` em `provisoes_folha` e `historico_calculos_folha` ficam **bloqueados por deny-by-default** para `authenticated`. Quem usa a tela de provisões não consegue gravar.                            |
| `20260719150000_storage_bucket_security_hardening.sql` (PARCIAL, 12/19) | `afastamentos`, `documentos` e `documentos-colaboradores` estão cobertos (10 policies vivas), mas o bucket **`documentos-admissao` ficou sem nenhuma das 3 policies** — RLS ligada sem policy = tudo negado. É o mesmo bug que a `20261117193000` já corrigiu para os outros buckets. |

### Lote 2 — isolamento por empresa: investigar antes de decidir

| arquivo                                                    | o que falta saber                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260724000700_fix_rls_recrutamento_onboarding.sql`       | as 5 tabelas têm hoje uma policy `"Multi-tenant access"` para role **`public`** além da nominal. Se o `USING` dela não restringir por `empresa_id`, é vazamento entre empresas. **Não consegui ler o `USING`**: exige `db_query`, que está quebrado.                                                                      |
| `20260719191000_empresa_id_not_null_constraints.sql`       | as 8 colunas `empresa_id` conferidas seguem **NULLABLE**. Linha sem `empresa_id` é exatamente o vetor que torna perigosa a policy `OR empresa_id IS NULL` que recusei (§ do `sql-preservado`). O `NOT NULL` fecharia a porta na raiz, mas exige backfill antes — e o backfill precisa saber a empresa de cada linha órfã. |
| `20260724000200_fix_desligamentos_empresa_id_not_null.sql` | contém `DELETE FROM public.desligamentos WHERE empresa_id IS NULL`. **Isso apaga dado, sem volta.** Não aplico sem sua palavra, e antes é preciso contar quantas linhas são.                                                                                                                                              |

### Lote 3 — auditoria e observabilidade (baixo risco, aplicar se quiser o recurso)

`20260719170000_security_indexes_constraints.sql` (13 índices em `audit_log`, `login_attempts`,
`rate_limit_logs` — as 3 tabelas existem) · `20260719190000_audit_delete_trigger.sql` (1 função +
10 triggers que registram DELETE; as 10 tabelas existem) ·
`20260719193000_security_monitoring_views.sql` (3 views de monitoramento) ·
`20260815000000_p1_023_naming_pattern.sql` (2 objetos).

Nenhum deles conserta bug: são capacidade nova. Índices e triggers custam escrita.

### Lote 4 — a tabela `backup_logs` não existe: o recurso entra ou sai?

Três arquivos encadeados: `20260725100000_p3_060_backup_logs.sql` cria a tabela;
`20260724140001_t007_backup_logs_rls.sql` e `20260816000000_p1_024_policies_orfas.sql` criam policies
**sobre ela**. Hoje nada disso existe. É decisão de produto: o sistema vai ter registro de backup
dentro do banco? Aplicar os três na ordem, ou descartar os três — meio caminho deixa policy órfã.

### Lote 5 — dashboards materializados: decisão de custo

`20260725130000_p5_077_passivo_trabalhista.sql` (4 materialized views — saldo de férias, provisão de
13º, passivo de FGTS, passivo consolidado — mais 9 índices, a função `refresh_passivo_trabalhista()`
e a view `v_passivo_summary`) · `20260817010000_p4_072_materialized_views_dashboards.sql` (14
objetos) · `20260724140000_p4_072_mv_dashboards.sql` (PARCIAL; a única MV viva, `mv_folha_summary`,
veio de `20261018130000`, que está no ledger e diz isso no próprio texto).

Materialized view ocupa espaço e **precisa de refresh agendado** para não mostrar número velho. O
valor de negócio é real (passivo trabalhista é número que vai a balanço), o custo também.

### Lote 6 — descartar: medido como redundante, superado ou impossível

| arquivo                                                     | por que não aplicar                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260317130255_3d640e88-….sql`                             | tenta criar 135 constraints `fk_<tabela>_<ref>`. A integridade **já existe** sob os nomes default `<tabela>_<coluna>_fkey` (conferido em 12 tabelas). Trabalho redundante, não buraco.                                                                                                                                                                                                                                                |
| `20260720040000_fix_jornada_fk_ordering.sql`                | referencia `colaboradores.jornada_id`, coluna que **não existe**. Sem `EXCEPTION` no bloco: aplicar daria erro.                                                                                                                                                                                                                                                                                                                       |
| `20260725120000_p4_071_compound_indexes.sql`                | referencia `public.folhas` e `public.pontos`, tabelas que **não existem**. É uma transação única: abortaria inteira.                                                                                                                                                                                                                                                                                                                  |
| `20260726120000_p4_068_connection_pooling.sql`              | o schema `admin` não existe (arrasta 4 views e 2 funções) e os 6 índices `_sw` também não.                                                                                                                                                                                                                                                                                                                                            |
| `20260817000000_p4_071_indices_compostos_top20.sql`         | 32 índices; os 6 presentes são **homônimos criados por outras migrations**, não obra dele.                                                                                                                                                                                                                                                                                                                                            |
| `20261012130000_rotinas_agendadas_falhando.sql`             | **superada de fato**: `20261013130000` e `20261013140000`, ambas no ledger, recriam as mesmas funções. O tipo de retorno divergente (`integer` vs `jsonb`) prova que o que está vivo é a versão posterior.                                                                                                                                                                                                                            |
| `20260802000000_p0_007_views_security_invoker.sql`          | **corrigi aqui um falso alarme meu.** Parecia buraco de segurança (14 views sem `security_invoker`). Não é: `20260911180000_p0_views_security_invoker` **está no ledger** e faz `ALTER VIEW … SET (security_invoker = true)` + `REVOKE SELECT … FROM anon` sobre a mesma lista de views. O que resta neste arquivo é **redefinição** de 17 views; aplicar trocaria definições vivas por outras. Decisão de produto, não de segurança. |
| `20260317001935_1663bc94-….sql`                             | 3 das 7 views rodam definição diferente (mais enxuta) da do arquivo. Mesmo caso: redefinição, não falha.                                                                                                                                                                                                                                                                                                                              |
| `20260726110000_p2_037_consolidate_duplicates.sql`          | o único objeto presente (`documentos.empresa_id`) vem de `20260712214642_fixup_documentos_empresa_id.sql:3`, não deste arquivo.                                                                                                                                                                                                                                                                                                       |
| `20260724000500_fix_faltas_status_default.sql`              | o `DEFAULT` vivo de `faltas.status` é `'registrada'`, que não consta da lista do `chk_faltas_status` citada no arquivo. **Bloqueado por ferramenta:** ler o conteúdo do CHECK exige `db_query`.                                                                                                                                                                                                                                       |
| `20260724001200_fix_faltas_tipo_default_and_constraint.sql` | mesmo caso em `faltas.tipo` (`DEFAULT 'falta'`). Se o CHECK vivo for o de `20260713110053`, sem `'falta'` na lista, **qualquer INSERT em `faltas` sem `tipo` explícito falha** — mas isso é hipótese, não medição, enquanto o `db_query` estiver quebrado.                                                                                                                                                                            |

### O que trava a triagem completa

Os dois últimos itens do lote 6 e o primeiro do lote 2 são os três casos em que **a decisão depende
de ler conteúdo de `CHECK` ou de policy**, o que as ferramentas estruturadas do MCP não fazem. Com o
`supabase_db_query` devolvendo zero linhas até para `select 1`, eles ficam **NÃO VERIFICADOS** — não
"sem problema". Consertar esse acesso de leitura é pré-requisito para fechar a triagem, e é também o
que destrava o `canonical-sql-diag.yml` (§ do `banco.md`).

Nada deste lote foi aplicado. Cada lote acima vira uma PR própria, pelo mesmo caminho que funcionou
na #687: editar o `LOTE ATUAL` do `canonical-migrations.yml`, escrever o sidecar `.verify.sql`, e
disparar `validate` → `apply` → `verify` a partir da `main`.

## 14. RETRATAÇÃO do Lote 1 da §13: não era funcionalidade morta (medido 2026-11-18)

A §13 colocou dois arquivos no **Lote 1 — funcionalidade morta em produção (recomendo aplicar)**.
**Os dois caem.** Fui verificar os consumidores antes de montar a PR de aplicação, e nenhum dos dois
é defeito vivo. Se eu tivesse seguido a própria recomendação, teria aplicado DDL em produção para
resolver problema que não existe — e, no primeiro caso, com um padrão de tenant que o sistema
abandonou.

### 1. `20260804000000_p0_010_write_policies_provisoes.sql` — não aplicar nesta forma

O que é verdade: `public.provisoes_folha` tem **uma única policy**, `provisoes_folha_rh_read`
(SELECT), logo `INSERT`/`UPDATE`/`DELETE` estão bloqueados por deny-by-default.

O que eu não tinha verificado, e muda a conclusão:

- **Nenhum código cliente escreve nessa tabela.** `provisoes_folha` aparece em `src/` apenas em
  arquivos **gerados** (`src/schemas/tableColumns.ts` e `src/integrations/supabase/types.ts`).
  Nenhum `insert`/`update`/`delete`/`upsert` em serviço, hook ou página.
- **Quem escreve é o trigger** `calcular_provisao_mensal`, que é `SECURITY DEFINER` e portanto
  **bypassa RLS**. O próprio arquivo de migration diz isso: a policy de INSERT seria
  "defense-in-depth", não requisito de funcionamento.
- **O padrão de tenant do arquivo está obsoleto.** Ele deriva a empresa de
  `current_setting('request.jwt.claims')::jsonb -> 'app_metadata' ->> 'empresa_id'`. A policy que
  está **viva** na mesma tabela usa `public.pode_gerir_rh(empresa_id)`, criada pela
  `20260924140000_p0_close_live_rls_gap_pix_cnab_colaboradores.sql`, que **está no ledger**.
  Aplicar o arquivo de agosto colocaria dois padrões de isolamento na mesma tabela; e se
  `app_metadata.empresa_id` não estiver preenchido no JWT, as policies novas avaliariam para NULL e
  a escrita seguiria bloqueada — ou seja, nem o "conserto" funcionaria.

Veredito: **descartar nesta forma.** Se o dono quiser a defesa em profundidade, o caminho é uma
migration nova com `pode_gerir_rh(empresa_id)` — melhoria, não conserto, e sem urgência.

Correção colateral: a §13 dizia "escrita em `provisoes_folha`/`historico_calculos_folha` bloqueada".
Errado para a segunda: `historico_calculos_folha` **já tem** policy de SELECT
(`Acesso por empresa historico`) e de INSERT (`Inserção por empresa historico`). Lá só faltam UPDATE
e DELETE, e o próprio arquivo de agosto diz que o UPDATE **deve** ficar bloqueado ("histórico fiscal
é IMUTÁVEL").

### 2. `20260719150000_storage_bucket_security_hardening.sql` — a lacuna é deliberada

O bucket `documentos-admissao` existe, é privado, e realmente **não tem nenhuma policy** em
`storage.objects` (nenhuma das 25 vivas nomeia `admissao`).

Só que isso **não é esquecimento — é decisão registrada duas vezes**, por duas migrations
diferentes. A `20261117193000_storage_documentos_tenant_scope.sql:38-40` escreve:

> `documentos-admissao` segue intocado, pela mesma razao que a t008 registrava: recebe documento por
> fluxo com token ANTES de o usuario ter vinculo de empresa, entao nao da para exigir `empresa_id` no
> caminho.

E o único código cliente que toca o bucket é **código morto**: `src/hooks/useDocumentOCR.ts` é
importado **apenas pelo próprio teste** (`src/hooks/__tests__/useDocumentOCR.test.ts`); nenhuma
página ou componente o usa. Além disso o hook tem dois outros defeitos que confirmam que nunca
rodou de verdade: chama `getPublicUrl` num bucket **privado** (`:40`), e invoca a função
`process-document-ocr` quando a edge no repositório se chama `OCR`.

Veredito: **não aplicar.** Criar policy de `empresa_id` nesse bucket contrariaria a decisão de
arquitetura do fluxo de admissão por token.

### A lição, que é a mesma de novo

Este é o **sétimo e o oitavo** caso nesta auditoria do mesmo erro: tomar o resultado de uma medição
de schema ("faltam as policies") como defeito de produto ("a tela não grava") **sem conferir se
existe consumidor**. O schema diz o que o banco permite; só o código diz o que o sistema faz. As
duas perguntas são diferentes e eu as misturei.

O que passou a fazer parte do método, e está registrado aqui para o próximo agente: antes de
classificar DDL ausente como "funcionalidade morta", procurar o consumidor — `grep` no `src/` por
escrita na tabela ou no bucket, e checar se o arquivo que a usa é importado por algo além do próprio
teste.

## 15. Dos 3 casos sem veredito da §13: um cai, um é o maior risco aberto (2026-11-18)

A §13 deixou três itens como **NÃO VERIFICADOS** porque dependiam de ler conteúdo de `CHECK` ou de
policy, o que o `supabase_db_query` faria e ele está devolvendo zero linhas. Em vez de esperar a
ferramenta, apliquei o caminho que funcionou nas §14: **procurar o consumidor**. Dois dos três
fecharam.

### Caem: os dois CHECKs de `faltas` não são bug vivo

A suspeita era que `faltas.tipo` tem `DEFAULT 'falta'` e `faltas.status` tem `DEFAULT 'registrada'`,
valores que podem não constar das listas de `chk_faltas_tipo` / `chk_faltas_status` — e então
qualquer `INSERT` sem esses campos explodiria.

`supabase_db_constraints` confirma que as duas constraints existem, mas **não devolve a cláusula**,
então a lista continua ilegível. O que resolve é o consumidor:

- `tipo` e `status` são **opcionais** no tipo gerado (`tipo?: string`, `status?: string | null`), logo
  um insert pode omiti-los e cair no DEFAULT;
- mas **nenhuma UI cria falta**. `faltasService.criar` só é chamado por `useCriarFalta`
  (`src/hooks/useNovasTabelas.ts:72`), que é exportado no barrel `src/hooks/index.ts:57` e **não é
  chamado por nenhum componente**. `JornadaPontoTab.tsx` usa os hooks de **leitura** de faltas.

Veredito: o DEFAULT nunca é exercitado pelo aplicativo. **Não é bug vivo**, e a migration
`20260724001200` não tem urgência. Fica como melhoria, se um dia a tela de registro de falta for
construída — e aí o CHECK precisa ser lido antes.

### RETRATADO (ver §16): a policy `public` é INERTE, não é risco

> **Esta subseção estava errada.** O `USING` da policy, que eu disse não conseguir ler, estava
> versionado em `20260516175648_835be6f9-b129-4520-bc17-b60bf8d426c1.sql:169`: compara `empresa_id`
> com `auth.uid()` e busca `colaboradores.id = auth.uid()` quando o vínculo é `colaboradores.user_id`.
> Nunca concede nada — é fail-closed por acidente. **Não há vazamento.** Medição na §16.

Aqui o raciocínio do consumidor **se inverte** e é importante entender por quê: uma policy
permissiva para role `public` não precisa de código nosso para ser explorada. `public` inclui
`anon`, e o PostgREST aceita a chave anônima — qualquer pessoa com a chave pública do projeto pode
tentar a consulta direto, sem passar pela nossa interface.

Medido com `supabase_db_list_policies`:

| tabela         | policy                | permissive | roles        | cmd     |
| -------------- | --------------------- | ---------- | ------------ | ------- |
| `candidatos`   | `Multi-tenant access` | PERMISSIVE | **`public`** | **ALL** |
| `candidaturas` | `Multi-tenant access` | PERMISSIVE | **`public`** | **ALL** |

A `20260724000700_fix_rls_recrutamento_onboarding.sql:15-33` mira **5** tabelas com esse mesmo
padrão: `vagas`, `candidatos`, `candidaturas`, `onboarding_colaborador`, `onboarding_tarefas`.

No PostgreSQL, policies PERMISSIVE são combinadas por **OR**. Então, se o `USING` dessa policy for
frouxo, ela concede acesso por si só — a policy nominal correta ao lado não restringe nada.

**O que falta para fechar, e eu não consigo medir:**

1. **o `USING` da policy** — exige `db_query`;
2. **se `anon` tem GRANT de tabela** nessas 5 tabelas. Sem GRANT a policy é inerte, qualquer que
   seja o `USING`. Procurei: **não existe em migration nenhuma** um
   `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon` (nem `FROM PUBLIC`). Os `REVOKE ... FROM
PUBLIC, anon` da `20260912190000` (`:65`, `:135-141`, `:173`) são todos **sobre funções**, não
   sobre tabelas.

Portanto: **não afirmo que há vazamento, e não afirmo que está seguro.** Afirmo que é o item de maior
risco em aberto nesta auditoria, que o dado em jogo é PII de candidato, e que as duas medições que o
resolveriam dependem do acesso de leitura que está quebrado.

**O conserto já existe no repositório** e nunca foi aplicado: a `20260724000700` faz
`DROP POLICY IF EXISTS 'Multi-tenant access'` e cria, no lugar,
`FOR ALL TO authenticated USING (empresa_id = public.get_auth_empresa_id()) WITH CHECK (mesma
expressão)`. O helper `get_auth_empresa_id` é estabelecido: definido desde 2026-05 e usado em **28**
arquivos de migration. Ou seja, aplicar é viável como está escrito — mas é DDL de RLS em produção
sobre tabelas com PII, então é decisão do dono, e o certo é medir o `USING` antes, não depois.

Este caso sobe para o topo dos próximos passos e passa à frente do conserto do `db_query` — porque é
o `db_query` que o destrava.

## 16. RETRATAÇÃO da §15: a policy `public` é inerte, não permissiva (medido 2026-11-18)

A §15 classificou a policy `"Multi-tenant access"` (PERMISSIVE, role `public`, cmd ALL) nas 5 tabelas
de recrutamento como **"o maior risco aberto desta auditoria"**, com PII de candidato em jogo, e
disse que as medições para decidir dependiam do `supabase_db_query` quebrado.

**Estava errado, e o texto que eu disse não conseguir ler estava no repositório todo o tempo.**

`20260516175648_835be6f9-b129-4520-bc17-b60bf8d426c1.sql:169` cria a policy assim:

```sql
CREATE POLICY "Multi-tenant access" ON public.%I FOR ALL
  USING (empresa_id = auth.uid()
         OR (SELECT c.empresa_id FROM public.colaboradores c WHERE c.id = auth.uid()) = empresa_id)
```

Os dois lados do `OR` não concedem nada:

1. `empresa_id = auth.uid()` compara o **id da empresa** com o **id do usuário autenticado**. São
   entidades diferentes; nunca coincidem.
2. A subconsulta procura `colaboradores.id = auth.uid()`, mas o vínculo entre usuário e colaborador
   neste schema é `colaboradores.user_id`, não `colaboradores.id`. Logo a subconsulta devolve NULL
   para qualquer usuário, e `NULL = empresa_id` é NULL — que a RLS trata como falso.

E para `anon` não há sequer usuário: `auth.uid()` é NULL e as duas pernas são NULL.

**Conclusão: a policy é inerte. Fail-closed por acidente, não permissiva.** Não existe o vazamento
que eu levantei. O acesso dessas tabelas vem das outras policies PERMISSIVE, por `authenticated`
(`Users can manage candidatos of their empresa`, `Users can manage candidaturas via vaga empresa`),
e é isso que governa hoje.

O cabeçalho da própria `20260724000700` já dizia isso, na linha 9: "As 5 tabelas abaixo ficaram com a
policy **fail-closed (ninguém consegue ler/escrever)** desde então". Eu li esse arquivo para extrair a
lista de tabelas e não li o parágrafo que explicava o efeito.

### O erro de método, que é novo

Os oito anteriores foram variações de "concluir de um agregado em vez de conferir o item". **Este é
diferente e pior:** eu tratei "o `db_query` está quebrado" como "o dado é inconhecível", quando a
definição da policy estava versionada no repositório, em texto, a um `grep` de distância. Procurei a
resposta só no banco porque a pergunta era sobre o banco.

Entra no método: **antes de declarar uma medição bloqueada por ferramenta, procurar o objeto no
`supabase/migrations/`.** O que criou está escrito lá, e o ledger diz se foi aplicado.

### O que isso muda na fila

A §15 pôs a `20260724000700` como prioridade de segurança. **Não é.** O que ela faz, de fato:

- remove a policy inerte `"Multi-tenant access"` das 5 tabelas — **limpeza**, sem efeito de acesso;
- cria `empresa_isolation_<tabela>` com `empresa_id = public.get_auth_empresa_id()`, **PERMISSIVE,
  para `authenticated`**.

Atenção ao segundo ponto, que é o motivo de eu **não** aplicar por conta própria mesmo com a
aplicação autorizada: policies PERMISSIVE são combinadas por **OR**. A policy nova somaria ao que já
existe. Se `get_auth_empresa_id()` for mais amplo que o `USING` das policies atuais (que eu ainda não
li), aplicar **alargaria** o acesso em vez de apertar. O ganho é cosmético; o risco não é zero.

Recomendação revisada: se o dono quiser a limpeza, o caminho certo é uma migration nova que **só
derruba** `"Multi-tenant access"` nas 5 tabelas, sem criar policy permissiva no lugar — mantendo o
que hoje governa o acesso. Isso é diff mínimo e efeito nulo sobre quem já usa o sistema.

Também não há pressa: nada está quebrado nem exposto nessas tabelas.

## 17. Item 2 do bloco: a lição da §16 achou um defeito real em `public.faltas`

A §16 fixou no método: **antes de declarar uma medição bloqueada por ferramenta, procurar o objeto
no `supabase/migrations/`.** Aplicada aos dois casos que a §13 marcou como bloqueados — os CHECKs de
`faltas` — ela produziu o oposto do que a §15 concluiu por "falta de consumidor".

### O que o repositório entregou, que o `db_query` não entregaria mais rápido

`20260713110053_2154cbf4-e4c4-4863-9f2b-ca5a517c93de.sql:41-50` define as duas listas:

```sql
ADD CONSTRAINT chk_faltas_status CHECK (
  status IS NULL OR status IN ('pendente','justificada','abonada','injustificada','em_analise','rejeitada')
),
ADD CONSTRAINT chk_faltas_tipo CHECK (
  tipo IS NULL OR tipo IN (
    'atestado_medico','falta_injustificada','falta_justificada','licenca',
    'ausencia_parcial','atraso','saida_antecipada','luto','casamento',
    'doacao_sangue','servico_militar','doenca_familiar','maternidade',
    'paternidade','outros'
  )
)
```

E o estado vivo, medido com `supabase_db_list_columns`:

| coluna   | tipo | nulo?        | DEFAULT vivo         | está na lista do CHECK?                    |
| -------- | ---- | ------------ | -------------------- | ------------------------------------------ |
| `tipo`   | text | **NOT NULL** | `'falta'::text`      | **não** (15 valores, nenhum é `falta`)     |
| `status` | text | sim          | `'registrada'::text` | **não** (6 valores, nenhum é `registrada`) |

**Conclusão: as duas colunas são armadilha.** Qualquer `INSERT` que omita `tipo` ou `status` pega o
DEFAULT e **viola o CHECK**. E como `tipo` é `NOT NULL`, nem passar NULL escapa — é obrigatório
mandar um valor válido explícito. O `DEFAULT` da coluna, que existe justamente para o caso de
omissão, é inutilizável.

A §15 tinha fechado esses dois casos como "não é bug vivo porque nenhuma UI cria falta". Isso
continua verdade para o aplicativo **hoje**, e por isso ninguém tropeçou ainda. Mas a conclusão
estava incompleta: o defeito é real e está armado. Qualquer tela de registro de falta, qualquer
script, qualquer edge function ou carga de dados que omita um dos dois campos falha no primeiro
INSERT.

### Por que aplicar agora foi a decisão certa, e barata

`public.faltas` tem **0 linhas** (`supabase_db_count`). Isso muda a natureza das duas migrations:

- `20260724000500` faz `UPDATE ... WHERE status = 'ativo'` → **no-op**;
- `20260724001200` faz `UPDATE ... WHERE tipo = 'falta' OR tipo NOT IN (...)` → **no-op**.

Sem linha nenhuma para tocar, as duas viram **DDL pura**: trocar dois `DEFAULT` e recriar um `CHECK`.
Zero mudança de dado, zero risco de perda. É o melhor momento possível — depois de a tabela receber
dado, o mesmo conserto passaria a reescrever valores de falta de funcionário.

Os sidecars prendem o que importa, não só o que mudou:

- o `DEFAULT` novo de cada coluna é exatamente o esperado **e** é aceito pelo CHECK — era a
  incompatibilidade entre os dois que quebrava o INSERT, então assertar um sem o outro não provaria
  o conserto;
- `chk_faltas_tipo` **voltou a existir** — a migration o derruba para fazer o backfill, e se o passo
  4 não rodasse a tabela ficaria **sem validação de tipo**, pior que o problema original;
- o valor `'falta'` **não** foi somado à lista válida — a correção certa é trocar o default, não
  afrouxar a constraint para aceitar um tipo que não existe no domínio de negócio;
- `tipo` continua `NOT NULL`.

## 18. Veredito das 21 migrations restantes (medido 2026-11-18)

Fecha o eixo aberto na §13. Das 26 triadas: 2 aplicadas (§17), 1 substituída pela
`20261118110000` (§16), 2 retratadas (§14), restavam **21**. Cada uma foi medida contra o
banco canônico `frjbfeamybqsejlvmqbl` e contra o `src/`, com as duas lições:

- **§16** — antes de dizer "falta medição", procurar o objeto em `supabase/migrations/`.
- **§14** — medição de schema não é defeito de produto; procurar o **consumidor**.

Placar: **2 aplicáveis**, **19 descartáveis** (11 impossíveis, 5 obsoletas, 3 redundantes).

### 18.1 As 2 que valem — mesmo defeito: isolamento multi-tenant não garantido por banco

| Arquivo | Efeito | Medição |
| --- | --- | --- |
| `20260719191000_empresa_id_not_null_constraints.sql` | `SET NOT NULL` em `empresa_id` | DDL puro, sem DELETE. Guarda por `information_schema` (linhas 25-31) pula o que não existe |
| `20260724000200_fix_desligamentos_empresa_id_not_null.sql` | idem, em `desligamentos` | **contém `DELETE` na linha 19** |

Por que `desligamentos` ficou de fora da primeira: a lista da `20260719191000:17` traz
`'rescisoes'`, tabela que **não existe** — o nome real é `desligamentos`. Erro de digitação
que deixou a tabela de rescisão (salário, valor líquido, hashes de assinatura) sem a
restrição.

Estado medido hoje em produção, tabela por tabela — `empresa_id` **NULLABLE** em
`colaboradores` (pos.70), `ferias` (pos.26), `contas_bancarias`, `beneficios`, `asos`,
`despesas`, `folhas_pagamento`, `batidas_ponto` e `desligamentos` (pos.30). Ou seja: a
`20260719191000` **nunca produziu efeito em produção**, ao contrário do que o cabeçalho da
`20260724000200` (linhas 3-6) afirma. Linhas com `empresa_id IS NULL`: **0 em todas as 9**.
`desligamentos` tem 2 linhas, nenhuma órfã — então o `DELETE` da linha 19 é no-op hoje.

`dependentes`, `holerites` (nenhuma das duas tem a coluna) e `rescisoes` (tabela ausente)
são puladas em silêncio pela guarda. O arquivo não entrega o que o título promete para essas
três.

### 18.2 Erro do agente — e RETRATAÇÃO parcial da minha própria correção

**O agente errou.** Classificou a `20260719191000` como "risco BAIXO" afirmando que
`src/components/settings/BeneficiosSettingsTab.tsx:58-69` — o único `INSERT` que omite
`empresa_id` — estava em componente "importado APENAS pelo seu próprio teste, por nenhuma
página ou componente".

É falso: o componente é renderizado por `src/pages/ConfiguracoesPage.tsx:18,135`, roteado em
`src/App.tsx:338` em `/configuracoes` sob `AdminRoute`. É tela viva.

**Eu também errei, e a Devin Review pegou em #695.** Conclui daí que o `NOT NULL` quebraria o
botão e tirei `beneficios` do lote. O mecanismo estava errado: parei no `supabase.from(...)` e
supus PostgREST direto.

O `supabase` exportado por `src/integrations/supabase/client.ts:444` é um **Proxy** cujo `from`
monta `createQueryBuilder` e manda tudo para o `external-db-bridge` (`client.ts:201`) — não vai
direto ao banco. E o gateway recusa esse insert **antes** de chegar ao Postgres: `beneficios`
está em `TENANT_SCOPED_TABLES` (`external-db-bridge/validation.ts:105-110`) e `index.ts:610-615`
devolve **403 `TENANT_SCOPE_REQUIRED`** para qualquer `insert` cuja linha não traga `empresa_id`
não-vazio (`tenantScope.ts:37-50`: `missingTenantRows` > 0 reprova).

Está vivo desde **2026-07-23** (`7a3672fc5`), e a prova empírica fecha: `public.beneficios` tem
8 linhas e **0 com `empresa_id` NULL**. Se esse insert gravasse NULL, haveria NULL.

Consequências:

1. **`beneficios` VOLTA para o lote do `NOT NULL`.** A restrição não introduz regressão nenhuma
   — o caminho de escrita já é barrado uma camada antes, com 403.
2. **O defeito real é outro, e é anterior:** o botão "criar plano de benefício" em Configurações
   **já está quebrado em produção**, devolvendo 403. Não é consequência de migration; é um
   `INSERT` que esqueceu `empresa_id` num caminho que exige o tenant. Fica fora deste escopo e
   vai para os próximos passos.
3. **Lição de método (a 3ª):** antes de afirmar o que um `INSERT` do front faz no banco,
   **seguir o cliente até o fim**. Neste repo `supabase.from()` não é PostgREST — é gateway com
   fail-closed de tenant. Ler a chamada e parar ali erra nas duas direções: inventei uma
   regressão que não existe e deixei de ver um botão que já falha.

Os outros caminhos de escrita preenchem `empresa_id` e foram conferidos:
`src/services/tabelasReferenciaService.ts:145-151` (`contas_bancarias`),
`src/hooks/useCalculoFolha.ts:55-66` (`folhas_pagamento`),
`supabase/functions/processar-ponto-offline/index.ts:257-262` (`batidas_ponto`),
`src/components/desligamentos/NovoDesligamentoDialog.tsx:107` e
`src/pages/CalculadoraRescisaoPage.tsx:231` (`desligamentos`).

### 18.3 Sobre o `DELETE` da `20260724000200`

O arquivo apaga linhas sem `empresa_id` antes de aplicar a restrição. Hoje atinge 0 de 2
linhas, mas se uma rescisão órfã nascer entre a medição e o `apply`, ela é **apagada sem
backup** — e rescisão carrega salário e valor líquido.

Decisão: **não aplicar o arquivo como está.** A restrição vai para uma migration nova que só
faz `SET NOT NULL`, sem `DELETE`. Se aparecer linha órfã, o `ALTER` falha e a migration aborta
sem mudar nada — falha segura, em vez de falha destrutiva. O trabalho do outro agente é
preservado no efeito; o que fica de fora é só o risco.

### 18.4 As 19 descartáveis, com a prova

**Quebram ao rodar (11).** Não é opinião: cada uma tem um objeto que não existe no schema
canônico, dentro de bloco que não tolera a falha.

| Arquivo | Ponto exato da quebra |
| --- | --- |
| `20260719170000_security_indexes_constraints` | `prevent_empty_empresa_id` (linhas 52-60) compara `NEW.empresa_id = ''` numa coluna `uuid`. O gatilho é instalado em `colaboradores`, `folhas_pagamento`, `despesas`, `batidas_ponto`, `registros_ponto` e `admissoes` (linhas 63-75) e **quebra toda escrita** dessas 6 tabelas com `22P02` |
| `20260719190000_audit_delete_trigger` | usa `OLD.empresa_id` para toda tabela ≠ `empresas`; `dependentes` (linha 44) **não tem a coluna** → todo `DELETE` nela passa a falhar com `42703` |
| `20260720040000_fix_jornada_fk_ordering` | `colaboradores.jornada_id` não existe; a guarda só testa a constraint, não a coluna |
| `20260317001935_1663bc94` | `CREATE OR REPLACE VIEW` não renomeia coluna: prod `vw_dashboard_time` tem `empresa_id` na pos.1, o arquivo quer `total_ativos` |
| `20260724140001_t007_backup_logs_rls` | `public.backup_logs` não existe |
| `20260725100000_p3_060_backup_logs` | `INSERT` em `config_retencao` (linha 145), tabela ausente; tudo em `BEGIN`/`COMMIT` |
| `20260816000000_p1_024_policies_orfas` | `CREATE POLICY ... ON public.backup_logs` (linha 39) **sem** `to_regclass`, ao contrário dos blocos vizinhos |
| `20260817010000_p4_072_materialized_views_dashboards` | compara `tipo_contrato` com `'CLT'`, `'PJ'`, `'estagio'` (linhas 127-129); labels reais do enum: `clt`, `pj`, `estagiario`, `temporario`, `intermitente`, `aprendiz` |
| `20260725120000_p4_071_compound_indexes` | `ferias.dias_vendidos`, `public.folhas` e `public.pontos` — nenhum existe |
| `20260817000000_p4_071_indices_compostos_top20` | `holerites(empresa_id, ...)` (linhas 120-129); `holerites` não tem `empresa_id` nem `status` |
| `20261012130000_rotinas_agendadas_falhando` | `CREATE OR REPLACE` de `fn_atualizar_status_ferias_diario()` com `RETURNS jsonb`; a função viva retorna `integer` |

**Obsoletas (5).** O objetivo foi atendido depois, por caminho melhor, ou deixou de existir.

- `20260719193000_security_monitoring_views` — as 3 views não existem e não têm consumidor;
  substituídas por `v_login_anomalies_email`/`v_login_anomalies_ip` (`20260724110000`), vivas.
- `20260815000000_p1_023_naming_pattern` — a tabela criada é **inerte**: não existe um `INSERT`
  em `migration_naming_audit` nem uma chamada a `_classify_migration_name` em todo o repo, então
  ela não valida nada; é registro que ninguém escreve.
  **Correção (Devin Review em #695):** eu havia justificado o descarte dizendo que o gate de
  nome já roda em CI. **Não roda.** `scripts/audit-migration-style.mjs:452` é um `.filter()` que
  **exclui** da auditoria o arquivo fora do padrão `^\d{14}_.+\.sql$` — não o reprova — e as
  verificações seguintes (linhas 470-545) avaliam policies, não nomes. Nenhum outro script ou
  workflow testa o padrão: buscar `\d{14}` em `scripts/` e `.github/workflows/` devolve só essa
  linha. **Existe lacuna real: migration com nome fora do padrão passa no CI e ainda é
  silenciosamente ignorada pela auditoria de policies** — o pior dos dois mundos. O descarte da
  migration continua certo (tabela inerte não fecha lacuna nenhuma); o gate certo é no CI, e vai
  para os próximos passos.
- `20260725130000_p5_077_passivo_trabalhista` — as 4 matviews nascem `WITH NO DATA` e a única
  função que as popula usa `REFRESH ... CONCURRENTLY`, que falha em matview nunca populada.
- `20260726120000_p4_068_connection_pooling` — PgBouncer não se configura por SQL (o próprio
  cabeçalho, linhas 7-28, são instruções de Dashboard); o SQL que sobra duplica índice
  existente.
- `20260726110000_p2_037_consolidate_duplicates` — reintroduziria view sem RLS com URLs de
  documentos de **todas** as empresas, objeto que migration posterior classificou como
  vazamento.

**Redundantes (3).** O efeito já está em produção; reaplicar piora.

- `20260317130255_3d640e88` — as FKs existem com nome canônico `<tabela>_<coluna>_fkey`; o
  arquivo só silencia `duplicate_object`, que depende do nome, então criaria uma **segunda** FK
  sobre a mesma coluna, agora com `ON DELETE CASCADE`.
- `20260724140000_p4_072_mv_dashboards` — `mv_folha_summary` já vive, reaplicada por
  `20261018130000_onda4e_objetos_ausentes.sql:203`; as outras 4 matviews não têm consumidor.
- `20260802000000_p0_007_views_security_invoker` — `security_invoker` já posto por
  `20260911180000` via `ALTER VIEW`, preservando as definições; o P0-007 faz `DROP`+`CREATE`
  com definições reinventadas e trocaria o contrato de 19 views.

### 18.5 Método: três camadas de erro no mesmo veredito

Nenhum dos 19 descartes é "não achei consumidor, logo é morto" — todos têm objeto ausente,
substituto vivo nomeado, ou efeito já presente.

O caso de `beneficios` é o mais instrutivo desta sessão porque errou três vezes seguidas, e cada
camada pegou a anterior:

1. **O agente** disse que o componente era código morto. Era tela viva (`App.tsx:338`).
2. **Eu**, conferindo, achei a tela viva e concluí regressão — mas parei no `supabase.from()` e
   não segui o Proxy até o `external-db-bridge`.
3. **A Devin Review**, em #695, apontou o gateway. Conferido: 403 `TENANT_SCOPE_REQUIRED` desde
   julho, e produção confirma (8 linhas, 0 NULL).

O veredito final — `beneficios` entra no lote, e existe um botão já quebrado — só aparece depois
das três. Nenhuma das camadas sozinha chegaria nele. Vale registrar que a minha correção do erro
do agente estava errada também: conferir não é o mesmo que conferir até o fim.

Placar de método da sessão: **12 erros meus corrigidos na `main` com prova ao lado**, 1 de
agente, 2 de documentação achados pelo revisor automático neste PR.
