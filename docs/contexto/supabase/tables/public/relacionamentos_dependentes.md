# public.relacionamentos_dependentes

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
| 1 | `id` | `integer` | não | `nextval('relacionamentos_dependentes_id_seq'::regclass)` |  |  |
| 2 | `nome` | `text` | não |  |  |  |
| 3 | `descricao` | `text` | sim |  |  |  |
| 4 | `codigo_esocial` | `text` | sim |  |  |  |
| 5 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| relacionamentos_dependentes_nome_key | UNIQUE | `UNIQUE (nome)` |  |  | sim |
| relacionamentos_dependentes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.dependentes | dependentes_relacionamento_id_fkey | relacionamento_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| relacionamentos_dependentes_nome_key | btree | nome | sim | sim |  | `CREATE UNIQUE INDEX relacionamentos_dependentes_nome_key ON public.relacionamentos_dependentes USING btree (nome)` |
| relacionamentos_dependentes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX relacionamentos_dependentes_pkey ON public.relacionamentos_dependentes USING btree (id)` |


## Policies (RLS)

### `relacionamentos_dependentes_read`

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
