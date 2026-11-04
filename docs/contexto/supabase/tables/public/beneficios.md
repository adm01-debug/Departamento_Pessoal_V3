# public.beneficios

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
| usada por views | public.vw_kpi_beneficios_custo |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `empresa_id` | `uuid` | sim |  |  |  |
| 3 | `nome` | `text` | não |  |  |  |
| 4 | `tipo` | `text` | sim | `'outros'::text` |  |  |
| 5 | `descricao` | `text` | sim |  |  |  |
| 6 | `valor` | `numeric` | sim | `0` |  |  |
| 7 | `ativo` | `boolean` | sim | `true` |  |  |
| 8 | `colaborador_id` | `uuid` | sim |  |  |  |
| 9 | `status` | `text` | sim | `'ativo'::text` |  |  |
| 10 | `data_inicio` | `text` | sim |  |  |  |
| 11 | `data_fim` | `text` | sim |  |  |  |
| 12 | `observacoes` | `text` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `valor_empresa` | `numeric(12,2)` | sim | `0` |  |  |
| 16 | `valor_colaborador` | `numeric(12,2)` | sim | `0` |  |  |
| 17 | `operadora` | `text` | sim |  |  |  |
| 18 | `metodo_pagamento` | `text` | sim |  |  |  |
| 19 | `categoria` | `text` | sim | `'outros'::text` |  |  |
| 20 | `codigo_esocial` | `text` | sim |  |  |  |
| 21 | `obrigatorio_por_lei` | `boolean` | sim | `false` |  |  |
| 22 | `teto_coparticipacao` | `numeric` | sim |  |  |  |
| 23 | `percentual_subsidio_empresa` | `numeric` | sim | `100` |  |  |
| 24 | `carencia_dias` | `integer` | sim | `0` |  |  |
| 25 | `exige_anexo_comprovante` | `boolean` | sim | `false` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| beneficios_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| beneficios_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| beneficios_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| beneficios_subsidio_percentual | CHECK | `CHECK (percentual_subsidio_empresa IS NULL OR percentual_subsidio_empresa >= 0::numeric AND percentual_subsidio_empresa <= 100::numeric)` |  |  | sim |
| beneficios_valores_nao_negativos | CHECK | `CHECK (COALESCE(valor, 0::numeric) >= 0::numeric AND COALESCE(valor_empresa, 0::numeric) >= 0::numeric AND COALESCE(valor_colaborador, 0::numeric) >= 0::numeric AND COALESCE(teto_coparticipacao, 0::numeric) >= 0::numeric AND COALESCE(carencia_dias, 0) >= 0)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.beneficio_arquivos | beneficio_arquivos_beneficio_id_fkey | beneficio_id | CASCADE |
| public.beneficio_movimentacoes | beneficio_movimentacoes_beneficio_id_fkey | beneficio_id | CASCADE |
| public.beneficio_regras_elegibilidade | beneficio_regras_elegibilidade_beneficio_id_fkey | beneficio_id | CASCADE |
| public.beneficios_colaboradores | beneficios_colaboradores_beneficio_id_fkey | beneficio_id | CASCADE |
| public.colaborador_beneficios | colaborador_beneficios_beneficio_id_fkey | beneficio_id | CASCADE |
| public.dependentes_beneficios | dependentes_beneficios_beneficio_id_fkey | beneficio_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| beneficios_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX beneficios_pkey ON public.beneficios USING btree (id)` |
| idx_beneficios_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_beneficios_colaborador_id ON public.beneficios USING btree (colaborador_id)` |
| idx_beneficios_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_beneficios_empresa_id ON public.beneficios USING btree (empresa_id)` |


## Policies (RLS)

### `Empresa vê seus benefícios`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(empresa_id IN ( SELECT user_empresas.empresa_id    FROM user_empresas   WHERE (user_empresas.user_id = auth.uid())))` |
| WITH CHECK |  |

### `tenant_beneficios`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| audit_beneficios | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.log_audit_change |
| tr_updated_at_beneficios | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| trigger_protecao_beneficio_lei | BEFORE | UPDATE | ROW | enabled | public.validar_suspensao_beneficio_obrigatorio |
| update_beneficios_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
