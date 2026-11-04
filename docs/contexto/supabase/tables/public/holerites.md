# public.holerites

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `folha_id` | `uuid` | não |  |  |  |
| 3 | `colaborador_id` | `uuid` | não |  |  |  |
| 4 | `colaborador_nome` | `text` | não |  |  |  |
| 5 | `colaborador_cpf` | `text` | não |  |  |  |
| 6 | `colaborador_cargo` | `text` | não |  |  |  |
| 7 | `colaborador_departamento` | `text` | não |  |  |  |
| 8 | `colaborador_matricula` | `text` | sim |  |  |  |
| 9 | `salario_base` | `numeric(12,2)` | não |  |  |  |
| 10 | `total_proventos` | `numeric(12,2)` | não | `0` |  |  |
| 11 | `total_descontos` | `numeric(12,2)` | não | `0` |  |  |
| 12 | `liquido` | `numeric(12,2)` | não | `0` |  |  |
| 13 | `base_inss` | `numeric(12,2)` | sim | `0` |  |  |
| 14 | `base_irrf` | `numeric(12,2)` | sim | `0` |  |  |
| 15 | `base_fgts` | `numeric(12,2)` | sim | `0` |  |  |
| 16 | `valor_inss` | `numeric(12,2)` | sim | `0` |  |  |
| 17 | `valor_irrf` | `numeric(12,2)` | sim | `0` |  |  |
| 18 | `valor_fgts` | `numeric(12,2)` | sim | `0` |  |  |
| 19 | `dependentes_irrf` | `integer` | sim | `0` |  |  |
| 20 | `faltas_dias` | `numeric(5,2)` | sim | `0` |  |  |
| 21 | `horas_extras_50` | `numeric(6,2)` | sim | `0` |  |  |
| 22 | `horas_extras_100` | `numeric(6,2)` | sim | `0` |  |  |
| 23 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 24 | `hash_assinatura` | `text` | sim |  |  |  |
| 25 | `data_assinatura` | `timestamp with time zone` | sim |  |  |  |
| 26 | `assinado` | `boolean` | sim | `false` |  |  |
| 27 | `hash_validacao` | `text` | sim |  |  |  |
| 28 | `data_visualizacao` | `timestamp with time zone` | sim |  |  |  |
| 29 | `ip_visualizacao` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_holerites_valores_nao_negativos | CHECK | `CHECK (COALESCE(total_proventos, 0::numeric) >= 0::numeric AND COALESCE(total_descontos, 0::numeric) >= 0::numeric AND COALESCE(liquido, 0::numeric) >= 0::numeric AND COALESCE(valor_inss, 0::numeric) >= 0::numeric AND COALESCE(valor_irrf, 0::numeric) >= 0::numeric AND COALESCE(valor_fgts, 0::numeric) >= 0::numeric) NOT VALID` |  |  | não |
| holerites_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| holerites_folha_id_colaborador_id_key | UNIQUE | `UNIQUE (folha_id, colaborador_id)` |  |  | sim |
| holerites_folha_id_fkey | FOREIGN KEY | `FOREIGN KEY (folha_id) REFERENCES folhas_pagamento(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| holerites_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.holerite_distribuicoes | holerite_distribuicoes_holerite_id_fkey | holerite_id | CASCADE |
| public.lancamentos_folha | lancamentos_folha_holerite_id_fkey | holerite_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| holerites_folha_id_colaborador_id_key | btree | folha_id, colaborador_id | sim | sim |  | `CREATE UNIQUE INDEX holerites_folha_id_colaborador_id_key ON public.holerites USING btree (folha_id, colaborador_id)` |
| holerites_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX holerites_pkey ON public.holerites USING btree (id)` |
| idx_holerites_assinado | btree | assinado | não | sim | `(assinado = true)` | `CREATE INDEX idx_holerites_assinado ON public.holerites USING btree (assinado) WHERE (assinado = true)` |
| idx_holerites_assinado_partial | btree | folha_id | não | sim | `(assinado = false)` | `CREATE INDEX idx_holerites_assinado_partial ON public.holerites USING btree (folha_id) WHERE (assinado = false)` |
| idx_holerites_colab_created | btree | colaborador_id, created_at | não | sim |  | `CREATE INDEX idx_holerites_colab_created ON public.holerites USING btree (colaborador_id, created_at DESC)` |
| idx_holerites_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_holerites_colaborador_id ON public.holerites USING btree (colaborador_id)` |
| idx_holerites_folha | btree | folha_id | não | sim |  | `CREATE INDEX idx_holerites_folha ON public.holerites USING btree (folha_id)` |
| idx_holerites_folha_colab_covering | btree | folha_id, colaborador_id, liquido, total_proventos, total_descontos, assinado | não | sim |  | `CREATE INDEX idx_holerites_folha_colab_covering ON public.holerites USING btree (folha_id, colaborador_id) INCLUDE (liquido, total_proventos, total_descontos, assinado)` |
| idx_holerites_folha_id | btree | folha_id | não | sim |  | `CREATE INDEX idx_holerites_folha_id ON public.holerites USING btree (folha_id)` |


## Policies (RLS)

### `holerites_rh_manage`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM colaboradores c   WHERE ((c.id = holerites.colaborador_id) AND pode_gerir_rh(c.empresa_id))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM colaboradores c   WHERE ((c.id = holerites.colaborador_id) AND pode_gerir_rh(c.empresa_id))))` |

### `holerites_self_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(sou_o_colaborador(colaborador_id) AND (EXISTS ( SELECT 1    FROM folhas_pagamento f   WHERE ((f.id = holerites.folha_id) AND ((f.status)::text = ANY (ARRAY['fechada'::text, 'paga'::text]))))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| audit_holerites | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.log_audit_change |
| tr_notify_new_holerite | AFTER | INSERT | ROW | enabled | public.fn_enqueue_notification |
| trg_enforce_holerite_signed_hash | BEFORE | INSERT OR UPDATE | ROW | enabled | public.enforce_holerite_signed_hash |
| trg_impedir_alteracao_holerite_assinado | BEFORE | UPDATE | ROW | enabled | public.impedir_alteracao_holerite_assinado |
| trg_proibir_delete_holerite_assinado | BEFORE | DELETE | ROW | enabled | public.proibir_delete_holerite_assinado |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
