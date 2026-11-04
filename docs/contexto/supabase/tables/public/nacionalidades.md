# public.nacionalidades

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
| 1 | `id` | `integer` | não | `nextval('nacionalidades_id_seq'::regclass)` |  |  |
| 2 | `nome` | `text` | não |  |  |  |
| 3 | `codigo_esocial` | `text` | sim |  |  |  |
| 4 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| nacionalidades_nome_key | UNIQUE | `UNIQUE (nome)` |  |  | sim |
| nacionalidades_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.colaboradores | colaboradores_nacionalidade_id_fkey | nacionalidade_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| nacionalidades_nome_key | btree | nome | sim | sim |  | `CREATE UNIQUE INDEX nacionalidades_nome_key ON public.nacionalidades USING btree (nome)` |
| nacionalidades_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX nacionalidades_pkey ON public.nacionalidades USING btree (id)` |


## Policies (RLS)

### `Authenticated users can read nationalities`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.role() = 'authenticated'::text)` |
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
