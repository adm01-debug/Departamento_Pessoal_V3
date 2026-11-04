# public.exames

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
| 2 | `colaborador_id` | `uuid` | sim |  |  |  |
| 3 | `tipo` | `text` | não |  |  |  |
| 4 | `data_exame` | `date` | sim |  |  |  |
| 5 | `data_validade` | `date` | sim |  |  |  |
| 6 | `resultado` | `text` | sim |  |  |  |
| 7 | `medico` | `text` | sim |  |  |  |
| 8 | `crm` | `text` | sim |  |  |  |
| 9 | `observacoes` | `text` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| exames_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| exames_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| exames_validade_coerente | CHECK | `CHECK (data_validade IS NULL OR data_exame IS NULL OR data_validade >= data_exame)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| exames_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX exames_pkey ON public.exames USING btree (id)` |
| idx_exames_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_exames_colaborador_id ON public.exames USING btree (colaborador_id)` |


## Policies (RLS)

### `exames_rh_manage`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM colaboradores c   WHERE ((c.id = exames.colaborador_id) AND pode_gerir_rh(c.empresa_id))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM colaboradores c   WHERE ((c.id = exames.colaborador_id) AND pode_gerir_rh(c.empresa_id))))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
