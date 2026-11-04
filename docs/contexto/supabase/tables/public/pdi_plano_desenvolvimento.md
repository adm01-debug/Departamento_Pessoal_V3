# public.pdi_plano_desenvolvimento

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
| 2 | `empresa_id` | `uuid` | sim |  |  |  |
| 3 | `colaborador_id` | `uuid` | sim |  |  |  |
| 4 | `titulo` | `text` | não |  |  |  |
| 5 | `competencia_foco` | `text` | sim |  |  |  |
| 6 | `acao_desenvolvimento` | `text` | sim |  |  |  |
| 7 | `prazo` | `date` | sim |  |  |  |
| 8 | `status` | `text` | sim | `'em_andamento'::text` |  |  |
| 9 | `comentarios` | `text` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `timezone('utc'::text, now())` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `timezone('utc'::text, now())` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| pdi_plano_desenvolvimento_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| pdi_plano_desenvolvimento_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| pdi_plano_desenvolvimento_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| pdi_plano_desenvolvimento_status_check | CHECK | `CHECK (status = ANY (ARRAY['pendente'::text, 'em_andamento'::text, 'concluido'::text, 'cancelado'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pdi_plano_desenvolvimento_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_pdi_plano_desenvolvimento_colaborador_id ON public.pdi_plano_desenvolvimento USING btree (colaborador_id)` |
| idx_pdi_plano_desenvolvimento_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_pdi_plano_desenvolvimento_empresa_id ON public.pdi_plano_desenvolvimento USING btree (empresa_id)` |
| pdi_plano_desenvolvimento_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX pdi_plano_desenvolvimento_pkey ON public.pdi_plano_desenvolvimento USING btree (id)` |


## Policies (RLS)

### `PDIs acessíveis por empresa`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((empresa_id IS NULL) OR pertence_a_empresa(empresa_id))` |
| WITH CHECK | `((empresa_id IS NULL) OR pertence_a_empresa(empresa_id))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_timestamp_pdi_plano | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
