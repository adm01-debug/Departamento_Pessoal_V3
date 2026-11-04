# public.adiantamentos_salariais

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
| 4 | `valor_solicitado` | `numeric(12,2)` | não |  |  |  |
| 5 | `data_solicitacao` | `date` | não | `CURRENT_DATE` |  |  |
| 6 | `data_pagamento` | `date` | sim |  |  |  |
| 7 | `status` | `text` | sim | `'pendente'::text` |  |  |
| 8 | `motivo` | `text` | sim |  |  |  |
| 9 | `aprovado_por` | `uuid` | sim |  |  |  |
| 10 | `competencia_desconto` | `text` | não |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| adiantamentos_pagamento_coerente | CHECK | `CHECK (data_pagamento IS NULL OR data_pagamento >= data_solicitacao)` |  |  | sim |
| adiantamentos_salariais_aprovado_por_fkey | FOREIGN KEY | `FOREIGN KEY (aprovado_por) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| adiantamentos_salariais_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| adiantamentos_salariais_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| adiantamentos_salariais_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| adiantamentos_salariais_status_check | CHECK | `CHECK (status = ANY (ARRAY['pendente'::text, 'aprovado'::text, 'rejeitado'::text, 'pago'::text]))` |  |  | sim |
| chk_adiantamentos_valor_positivo | CHECK | `CHECK (valor_solicitado IS NULL OR valor_solicitado >= 0::numeric) NOT VALID` |  |  | não |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| adiantamentos_salariais_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX adiantamentos_salariais_pkey ON public.adiantamentos_salariais USING btree (id)` |
| idx_adiantamentos_salariais_aprovado_por | btree | aprovado_por | não | sim |  | `CREATE INDEX idx_adiantamentos_salariais_aprovado_por ON public.adiantamentos_salariais USING btree (aprovado_por)` |
| idx_adiantamentos_salariais_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_adiantamentos_salariais_colaborador_id ON public.adiantamentos_salariais USING btree (colaborador_id)` |
| idx_adiantamentos_salariais_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_adiantamentos_salariais_empresa_id ON public.adiantamentos_salariais USING btree (empresa_id)` |


## Policies (RLS)

### `adiantamentos_salariais_rh_manage`

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
| update_adiantamentos_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
