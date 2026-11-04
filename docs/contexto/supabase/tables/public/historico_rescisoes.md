# public.historico_rescisoes

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
| 3 | `created_by` | `uuid` | sim |  |  |  |
| 4 | `nome_colaborador` | `text` | sim |  |  |  |
| 5 | `cpf` | `text` | sim |  |  |  |
| 6 | `cargo` | `text` | sim |  |  |  |
| 7 | `salario` | `numeric` | não |  |  |  |
| 8 | `data_admissao` | `date` | não |  |  |  |
| 9 | `data_desligamento` | `date` | não |  |  |  |
| 10 | `tipo_rescisao` | `text` | não |  |  |  |
| 11 | `aviso_trabalhado` | `boolean` | sim | `false` |  |  |
| 12 | `ferias_vencidas` | `boolean` | sim | `false` |  |  |
| 13 | `saldo_fgts` | `numeric` | sim | `0` |  |  |
| 14 | `total_proventos` | `numeric` | sim |  |  |  |
| 15 | `total_descontos` | `numeric` | sim |  |  |  |
| 16 | `total_liquido` | `numeric` | sim |  |  |  |
| 17 | `resultado` | `jsonb` | sim |  |  |  |
| 18 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| historico_rescisoes_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| historico_rescisoes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| historico_rescisoes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX historico_rescisoes_pkey ON public.historico_rescisoes USING btree (id)` |
| idx_historico_rescisoes_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_historico_rescisoes_empresa_id ON public.historico_rescisoes USING btree (empresa_id)` |


## Policies (RLS)

### `historico_rescisoes_rh_manage`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `pode_gerir_rh(empresa_id)` |
| WITH CHECK | `pode_gerir_rh(empresa_id)` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
