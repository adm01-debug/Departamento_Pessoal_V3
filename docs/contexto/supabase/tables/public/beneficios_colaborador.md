# public.beneficios_colaborador

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `colaborador_id` | `uuid` | não |  |  |  |
| 3 | `tipo_beneficio_id` | `uuid` | não |  |  |  |
| 4 | `valor` | `numeric(10,2)` | não | `0` |  |  |
| 5 | `desconto` | `numeric(10,2)` | sim | `0` |  |  |
| 6 | `data_inicio` | `date` | não | `CURRENT_DATE` |  |  |
| 7 | `data_fim` | `date` | sim |  |  |  |
| 8 | `ativo` | `boolean` | sim | `true` |  |  |
| 9 | `observacoes` | `text` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `created_by` | `uuid` | sim |  |  |  |
| 13 | `status_vinculo` | `text` | sim | `'ativo'::text` |  |  |
| 14 | `motivo_suspensao` | `text` | sim |  |  |  |
| 15 | `hash_autorizacao` | `text` | sim |  |  |  |
| 16 | `ip_adesao` | `text` | sim |  |  |  |
| 17 | `data_validacao_rh` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| benef_colab_valores_nao_negativos | CHECK | `CHECK (valor >= 0::numeric AND COALESCE(desconto, 0::numeric) >= 0::numeric)` |  |  | sim |
| benef_colab_vigencia_coerente | CHECK | `CHECK (data_fim IS NULL OR data_fim >= data_inicio)` |  |  | sim |
| beneficios_colaborador_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| beneficios_colaborador_colaborador_id_tipo_beneficio_id_key | UNIQUE | `UNIQUE (colaborador_id, tipo_beneficio_id)` |  |  | sim |
| beneficios_colaborador_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| beneficios_colaborador_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| beneficios_colaborador_tipo_beneficio_id_fkey | FOREIGN KEY | `FOREIGN KEY (tipo_beneficio_id) REFERENCES tipos_beneficio(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.beneficio_utilizacao | beneficio_utilizacao_beneficio_colaborador_id_fkey | beneficio_colaborador_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| beneficios_colaborador_colaborador_id_tipo_beneficio_id_key | btree | colaborador_id, tipo_beneficio_id | sim | sim |  | `CREATE UNIQUE INDEX beneficios_colaborador_colaborador_id_tipo_beneficio_id_key ON public.beneficios_colaborador USING btree (colaborador_id, tipo_beneficio_id)` |
| beneficios_colaborador_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX beneficios_colaborador_pkey ON public.beneficios_colaborador USING btree (id)` |
| idx_beneficios_colaborador_ativo | btree | ativo | não | sim |  | `CREATE INDEX idx_beneficios_colaborador_ativo ON public.beneficios_colaborador USING btree (ativo)` |
| idx_beneficios_colaborador_colaborador | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_beneficios_colaborador_colaborador ON public.beneficios_colaborador USING btree (colaborador_id)` |
| idx_beneficios_colaborador_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_beneficios_colaborador_colaborador_id ON public.beneficios_colaborador USING btree (colaborador_id)` |
| idx_beneficios_colaborador_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_beneficios_colaborador_created_by ON public.beneficios_colaborador USING btree (created_by)` |
| idx_beneficios_colaborador_tipo | btree | tipo_beneficio_id | não | sim |  | `CREATE INDEX idx_beneficios_colaborador_tipo ON public.beneficios_colaborador USING btree (tipo_beneficio_id)` |


## Policies (RLS)

### `Users can manage beneficios_colaborador`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(colaborador_id IN ( SELECT colaboradores.id    FROM colaboradores   WHERE (colaboradores.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |
| WITH CHECK | `(colaborador_id IN ( SELECT colaboradores.id    FROM colaboradores   WHERE (colaboradores.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| audit_beneficios_colaborador | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.log_audit_change |
| update_beneficios_colaborador_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
