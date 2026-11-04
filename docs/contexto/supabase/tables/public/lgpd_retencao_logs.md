# public.lgpd_retencao_logs

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
| 2 | `tabela` | `text` | não |  |  |  |
| 3 | `coluna_data` | `text` | não |  |  |  |
| 4 | `dias` | `integer` | não |  |  |  |
| 5 | `ativo` | `boolean` | não | `true` |  |  |
| 6 | `observacao` | `text` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| lgpd_retencao_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| lgpd_retencao_logs_tabela_key | UNIQUE | `UNIQUE (tabela)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| lgpd_retencao_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX lgpd_retencao_logs_pkey ON public.lgpd_retencao_logs USING btree (id)` |
| lgpd_retencao_logs_tabela_key | btree | tabela | sim | sim |  | `CREATE UNIQUE INDEX lgpd_retencao_logs_tabela_key ON public.lgpd_retencao_logs USING btree (tabela)` |


## Policies (RLS)

### `Admins gerenciam retencao de logs`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(auth.uid(), 'admin'::app_role)` |
| WITH CHECK | `has_role(auth.uid(), 'admin'::app_role)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_lgpd_retencao_logs_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
