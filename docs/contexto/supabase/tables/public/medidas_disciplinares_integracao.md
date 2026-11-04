# public.medidas_disciplinares_integracao

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `medida_id` | `uuid` | não |  |  |  |
| 3 | `empresa_id` | `uuid` | não |  |  |  |
| 4 | `colaborador_id` | `uuid` | não |  |  |  |
| 5 | `tipo_integracao` | `text` | não |  |  |  |
| 6 | `ref_id` | `uuid` | sim |  |  |  |
| 7 | `competencia` | `text` | sim |  |  |  |
| 8 | `valor` | `numeric(12,2)` | sim |  |  |  |
| 9 | `dias` | `integer` | sim |  |  |  |
| 10 | `status` | `text` | não | `'pendente'::text` |  |  |
| 11 | `detalhes` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| medidas_disciplinares_integracao_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| medidas_disciplinares_integracao_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| medidas_disciplinares_integracao_medida_id_fkey | FOREIGN KEY | `FOREIGN KEY (medida_id) REFERENCES medidas_disciplinares(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| medidas_disciplinares_integracao_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| medidas_disciplinares_integracao_status_check | CHECK | `CHECK (status = ANY (ARRAY['pendente'::text, 'aplicado'::text, 'cancelado'::text, 'erro'::text]))` |  |  | sim |
| medidas_disciplinares_integracao_tipo_integracao_check | CHECK | `CHECK (tipo_integracao = ANY (ARRAY['afastamento'::text, 'desligamento'::text, 'lancamento_folha_pendente'::text, 'lancamento_folha_aplicado'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_med_integ_medida | btree | medida_id | não | sim |  | `CREATE INDEX idx_med_integ_medida ON public.medidas_disciplinares_integracao USING btree (medida_id)` |
| idx_med_integ_pendentes | btree | empresa_id, colaborador_id | não | sim | `(status = 'pendente'::text)` | `CREATE INDEX idx_med_integ_pendentes ON public.medidas_disciplinares_integracao USING btree (empresa_id, colaborador_id) WHERE (status = 'pendente'::text)` |
| medidas_disciplinares_integracao_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX medidas_disciplinares_integracao_pkey ON public.medidas_disciplinares_integracao USING btree (id)` |


## Policies (RLS)

### `mdi_tenant_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `rls_tenant_or_admin(empresa_id)` |
| WITH CHECK |  |

### `tenant_medidas_integracao_admin`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role)))` |
| WITH CHECK | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |

### `tenant_medidas_integracao_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_med_integ_updated | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| authenticated | MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
