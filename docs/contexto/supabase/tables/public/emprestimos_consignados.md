# public.emprestimos_consignados

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
| 2 | `empresa_id` | `uuid` | não |  |  |  |
| 3 | `colaborador_id` | `uuid` | não |  |  |  |
| 4 | `valor_total` | `numeric(12,2)` | não |  |  |  |
| 5 | `valor_parcela` | `numeric(12,2)` | não |  |  |  |
| 6 | `numero_parcelas` | `integer` | não |  |  |  |
| 7 | `parcelas_pagas` | `integer` | sim | `0` |  |  |
| 8 | `data_inicio` | `date` | não |  |  |  |
| 9 | `taxa_juros` | `numeric(5,2)` | sim |  |  |  |
| 10 | `instituicao_financeira` | `text` | sim |  |  |  |
| 11 | `status` | `text` | sim | `'ativo'::text` |  |  |
| 12 | `observacoes` | `text` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| emprestimos_consignados_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| emprestimos_consignados_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| emprestimos_consignados_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| emprestimos_consignados_status_check | CHECK | `CHECK (status = ANY (ARRAY['ativo'::text, 'quitado'::text, 'suspenso'::text, 'cancelado'::text]))` |  |  | sim |
| emprestimos_num_parcelas_positivo | CHECK | `CHECK (numero_parcelas > 0)` |  |  | sim |
| emprestimos_parcelas_pagas_faixa | CHECK | `CHECK (parcelas_pagas IS NULL OR parcelas_pagas >= 0 AND parcelas_pagas <= numero_parcelas)` |  |  | sim |
| emprestimos_taxa_juros_positiva | CHECK | `CHECK (taxa_juros IS NULL OR taxa_juros >= 0::numeric)` |  |  | sim |
| emprestimos_valor_parcela_positivo | CHECK | `CHECK (valor_parcela > 0::numeric)` |  |  | sim |
| emprestimos_valor_total_positivo | CHECK | `CHECK (valor_total > 0::numeric)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| emprestimos_consignados_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX emprestimos_consignados_pkey ON public.emprestimos_consignados USING btree (id)` |
| idx_emprestimos_consignados_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_emprestimos_consignados_colaborador_id ON public.emprestimos_consignados USING btree (colaborador_id)` |
| idx_emprestimos_consignados_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_emprestimos_consignados_empresa_id ON public.emprestimos_consignados USING btree (empresa_id)` |


## Policies (RLS)

### `emprestimos_consignados_rh_manage`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `pode_gerir_rh(empresa_id)` |
| WITH CHECK | `pode_gerir_rh(empresa_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_emprestimos_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
