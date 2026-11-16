# As dez migrations órfãs da branch `muri` — classificação com evidência

As dez migrations abaixo existem só na branch `muri`: **não estão na `main` e não
estão no ledger** `supabase_migrations.schema_migrations` do projeto canônico
`frjbfeamybqsejlvmqbl` (conferido por consulta direta: zero linhas para estas
versões).

O nome delas sugere correção urgente — três se chamam `p0_`. A conferência
objeto por objeto contra o banco real mostra o contrário: **sete não devem ser
aplicadas**, e **duas delas causariam regressão de segurança**. Uma única tem
valor de negócio imediato.

Resumo:

| versão           | arquivo                                  | veredito                                  |
| ---------------- | ---------------------------------------- | ----------------------------------------- |
| `20260819000000` | `p0_fix_user_empresa_id_rls`             | **obsoleta e perigosa**                   |
| `20260820000000` | `p0_fix_auditoria_rpc`                   | **obsoleta e perigosa**                   |
| `20260821000000` | `p0_rls_dashboard_audit`                 | **obsoleta** (desfaria duas remediações)  |
| `20260925120000` | `document_upload_storage_columns`        | falta, mas sem consumidor na `main`       |
| `20260925130000` | `storage_documentos_delete_tenant_scope` | falta, e **amplia** acesso                |
| `20260929120000` | `colaborador_lotacoes`                   | falta, sem consumidor na `main`           |
| `20261005000000` | `onboarding_kits_rls_additive`           | redundante (falta só um índice)           |
| `20261005010000` | `onboarding_audit_trigger`               | falta, valor baixo                        |
| `20261005020000` | `onboarding_modelo_b_convergencia`       | **falta, e é a única com valor imediato** |
| `20261026090000` | `ciclos_exclusao_autorizada`             | **já está em produção**                   |

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

## 9. `20261005020000_onboarding_modelo_b_convergencia` — a única com valor imediato

Esta é a que importa para o negócio. Dados reais, conferidos agora em produção:

| tabela                                          | linhas |
| ----------------------------------------------- | ------ |
| `public.onboarding_colaborador` (modelo legado) | **6**  |
| `public.onboarding_tarefas` (modelo legado)     | **27** |
| `public.tarefas_onboarding` (modelo canônico)   | 24     |

O modelo legado tem 6 onboardings e 27 tarefas **com data de conclusão e
categorias que não existem no modelo canônico**. E a `main` não tem nenhuma tela
que leia esse modelo: as únicas referências são o catálogo genérico de tabelas
(`src/services/tabelas/rhService.ts`,
`supabase/functions/external-db-bridge/tableCatalog.ts`) e os tipos gerados. Quem
lia era a `muri` (`src/services/onboardingJornadaService.ts`,
`src/hooks/useDesenvolvimentoColaborador.ts`).

**Efeito prático: o histórico de onboarding de 6 colaboradores está no banco e
invisível no sistema hoje.**

A migration é aditiva e idempotente: só faz `INSERT` no modelo canônico, casando
pelo CPF, e só quando ainda não existe tarefa de mesmo título na mesma admissão.
Não apaga, não altera schema, não dá `DROP`. Rodar duas vezes não duplica.

**Recomendação: aplicar**, pelo `canonical-migrations.yml`, depois de rodar a
conferência descrita em `docs/ONBOARDING_MODELO_B_DEPRECATED.md`. É DDL/DML em
produção, logo depende de autorização explícita do dono.

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

---

## Conclusão operacional

1. **Descartar** `20260819000000`, `20260820000000`, `20260821000000` e
   `20261026090000`. As três primeiras são regressão; a quarta é duplicata.
2. **Aplicar, com autorização do dono**, `20261005020000` — é a que devolve
   dado real ao sistema.
3. **Aproveitar só o índice** de `20261005000000`.
4. **Guardar para a recuperação das áreas** `20260925120000`, `20260925130000`
   e `20260929120000`: cada uma entra na mesma PR da tela que a consome.
5. **Levar ao dono** `20261005010000` — decisão de negócio, não técnica.

Nenhuma destas migrations foi aplicada por esta auditoria: a auditoria só leu o
banco. O inventário geral do resgate está em
`docs/auditoria/RESGATE_BRANCH_MURI_2026-11-16.md`.
