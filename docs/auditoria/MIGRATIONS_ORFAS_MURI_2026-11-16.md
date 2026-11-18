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
