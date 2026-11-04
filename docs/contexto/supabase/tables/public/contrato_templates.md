# public.contrato_templates

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
| usada por views | public.v_contratos_tokens_pendentes, public.v_contratos_vencendo |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `empresa_id` | `uuid` | não |  |  |  |
| 3 | `nome` | `text` | não |  |  |  |
| 4 | `descricao` | `text` | sim |  |  |  |
| 5 | `tipo_contrato` | `text` | não |  |  |  |
| 6 | `cargo_id` | `uuid` | sim |  |  |  |
| 7 | `departamento_id` | `uuid` | sim |  |  |  |
| 8 | `versao` | `integer` | não | `1` |  |  |
| 9 | `ativo` | `boolean` | não | `true` |  |  |
| 10 | `corpo_html` | `text` | não |  |  |  |
| 11 | `clausulas_condicionais` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 12 | `variaveis_schema` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 13 | `created_by` | `uuid` | sim |  |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| contrato_templates_cargo_id_fkey | FOREIGN KEY | `FOREIGN KEY (cargo_id) REFERENCES cargos(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| contrato_templates_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| contrato_templates_departamento_id_fkey | FOREIGN KEY | `FOREIGN KEY (departamento_id) REFERENCES departamentos(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| contrato_templates_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| contrato_templates_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| contrato_templates_tipo_contrato_check | CHECK | `CHECK (tipo_contrato = ANY (ARRAY['clt_indeterminado'::text, 'clt_experiencia'::text, 'clt_determinado'::text, 'estagio'::text, 'pj'::text, 'temporario'::text, 'intermitente'::text, 'jovem_aprendiz'::text]))` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.contratos_gerados | contratos_gerados_template_id_fkey | template_id | RESTRICT |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| contrato_templates_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX contrato_templates_pkey ON public.contrato_templates USING btree (id)` |
| idx_contrato_templates_cargo | btree | cargo_id | não | sim | `ativo` | `CREATE INDEX idx_contrato_templates_cargo ON public.contrato_templates USING btree (cargo_id) WHERE ativo` |
| idx_contrato_templates_empresa | btree | empresa_id | não | sim | `ativo` | `CREATE INDEX idx_contrato_templates_empresa ON public.contrato_templates USING btree (empresa_id) WHERE ativo` |
| uq_contrato_templates_default | btree | empresa_id, tipo_contrato | sim | sim | `ativo` | `CREATE UNIQUE INDEX uq_contrato_templates_default ON public.contrato_templates USING btree (empresa_id, tipo_contrato, COALESCE(cargo_id, '00000000-0000-0000-0000-000000000000'::uuid)) WHERE ativo` |


## Policies (RLS)

### `contrato_templates_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `user_belongs_to_empresa(auth.uid(), empresa_id)` |
| WITH CHECK |  |

### `contrato_templates_write`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_belongs_to_empresa(auth.uid(), empresa_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role)))` |
| WITH CHECK | `(user_belongs_to_empresa(auth.uid(), empresa_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role)))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_contrato_templates_updated | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
