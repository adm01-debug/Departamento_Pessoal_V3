# public.tipos_salario

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
| 1 | `id` | `integer` | não | `nextval('tipos_salario_id_seq'::regclass)` |  |  |
| 2 | `nome` | `text` | não |  |  |  |
| 3 | `codigo_esocial` | `text` | sim |  |  |  |
| 4 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| tipos_salario_nome_key | UNIQUE | `UNIQUE (nome)` |  |  | sim |
| tipos_salario_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.colaboradores | colaboradores_tipo_salario_id_fkey | tipo_salario_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| tipos_salario_nome_key | btree | nome | sim | sim |  | `CREATE UNIQUE INDEX tipos_salario_nome_key ON public.tipos_salario USING btree (nome)` |
| tipos_salario_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX tipos_salario_pkey ON public.tipos_salario USING btree (id)` |


## Policies (RLS)

### `tipos_salario_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
