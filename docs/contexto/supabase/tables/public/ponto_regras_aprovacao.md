# public.ponto_regras_aprovacao

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
| 3 | `tipo_solicitacao` | `text` | não |  |  |  |
| 4 | `niveis_aprovacao` | `integer` | sim | `1` |  |  |
| 5 | `sla_horas` | `integer` | sim | `48` |  |  |
| 6 | `exige_anexo` | `boolean` | sim | `false` |  |  |
| 7 | `limite_mensal_solicitacoes` | `integer` | sim | `5` |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ponto_regras_aprovacao_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| ponto_regras_aprovacao_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ponto_regras_aprovacao_pkey ON public.ponto_regras_aprovacao USING btree (id)` |


## Policies (RLS)

### `Ponto regras scoped by empresa`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
