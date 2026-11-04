# public.beneficiarios_plano

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
| 2 | `plano_saude_id` | `uuid` | sim |  |  |  |
| 3 | `colaborador_id` | `uuid` | sim |  |  |  |
| 4 | `nome` | `text` | sim |  |  |  |
| 5 | `parentesco` | `text` | sim |  |  |  |
| 6 | `cpf` | `text` | sim |  |  |  |
| 7 | `data_inclusao` | `date` | sim | `CURRENT_DATE` |  |  |
| 8 | `data_exclusao` | `date` | sim |  |  |  |
| 9 | `data_carencia` | `date` | sim |  |  |  |
| 10 | `tipo` | `text` | sim | `'titular'::text` |  |  |
| 11 | `status` | `text` | sim | `'ativo'::text` |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| beneficiarios_plano_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| beneficiarios_plano_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| beneficiarios_plano_plano_saude_id_fkey | FOREIGN KEY | `FOREIGN KEY (plano_saude_id) REFERENCES planos_saude(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| beneficiarios_plano_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX beneficiarios_plano_pkey ON public.beneficiarios_plano USING btree (id)` |
| idx_beneficiarios_plano_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_beneficiarios_plano_colaborador_id ON public.beneficiarios_plano USING btree (colaborador_id)` |
| idx_beneficiarios_plano_plano_saude_id | btree | plano_saude_id | não | sim |  | `CREATE INDEX idx_beneficiarios_plano_plano_saude_id ON public.beneficiarios_plano USING btree (plano_saude_id)` |


## Policies (RLS)

### `beneficiarios_plano_rh_manage`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM colaboradores c   WHERE ((c.id = beneficiarios_plano.colaborador_id) AND pode_gerir_rh(c.empresa_id))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM colaboradores c   WHERE ((c.id = beneficiarios_plano.colaborador_id) AND pode_gerir_rh(c.empresa_id))))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
