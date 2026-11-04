# public.provisoes_mensais

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 8 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `empresa_id` | `uuid` | não |  |  |  |
| 3 | `colaborador_id` | `uuid` | não |  |  |  |
| 4 | `competencia` | `date` | não |  |  |  |
| 5 | `tipo` | `text` | não |  |  |  |
| 6 | `valor_principal` | `numeric(15,2)` | não | `0` |  |  |
| 7 | `encargos_inss` | `numeric(15,2)` | não | `0` |  |  |
| 8 | `encargos_fgts` | `numeric(15,2)` | não | `0` |  |  |
| 9 | `total` | `numeric(15,2)` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `log_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| provisoes_mensais_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| provisoes_mensais_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| provisoes_mensais_log_id_fkey | FOREIGN KEY | `FOREIGN KEY (log_id) REFERENCES provisao_logs(id)` | NO ACTION | NO ACTION | sim |
| provisoes_mensais_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| provisoes_mensais_tipo_check | CHECK | `CHECK (tipo = ANY (ARRAY['ferias'::text, '13_salario'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_provisoes_colaborador | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_provisoes_colaborador ON public.provisoes_mensais USING btree (colaborador_id)` |
| idx_provisoes_empresa_competencia | btree | empresa_id, competencia | não | sim |  | `CREATE INDEX idx_provisoes_empresa_competencia ON public.provisoes_mensais USING btree (empresa_id, competencia)` |
| idx_provisoes_mensais_log_id | btree | log_id | não | sim |  | `CREATE INDEX idx_provisoes_mensais_log_id ON public.provisoes_mensais USING btree (log_id)` |
| provisoes_mensais_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX provisoes_mensais_pkey ON public.provisoes_mensais USING btree (id)` |


## Policies (RLS)

### `Provisoes scoped by empresa`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |

### `Users can manage provisoes of their companies`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM user_empresas   WHERE ((user_empresas.empresa_id = provisoes_mensais.empresa_id) AND (user_empresas.user_id = auth.uid()))))` |
| WITH CHECK |  |

### `Users can view provisoes of their companies`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM user_empresas   WHERE ((user_empresas.empresa_id = provisoes_mensais.empresa_id) AND (user_empresas.user_id = auth.uid()))))` |
| WITH CHECK |  |

### `Usuários podem atualizar provisões da sua empresa`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |

### `Usuários podem deletar provisões da sua empresa`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |

### `Usuários podem inserir provisões na sua empresa`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |

### `Usuários podem ver provisões da sua empresa`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |

### `provisoes_mensais_tenant_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)) OR is_admin(auth.uid()))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_calcular_total_provisao | BEFORE | INSERT OR UPDATE | ROW | enabled | public.calcular_total_provisao |
| update_provisoes_mensais_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| update_provisoes_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
