# public.tipos_beneficio

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `codigo` | `text` | não |  |  |  |
| 3 | `nome` | `text` | não |  |  |  |
| 4 | `descricao` | `text` | sim |  |  |  |
| 5 | `icone` | `text` | sim |  |  |  |
| 6 | `operadora` | `text` | sim |  |  |  |
| 7 | `valor_padrao` | `numeric(10,2)` | sim | `0` |  |  |
| 8 | `desconto_colaborador` | `numeric(5,2)` | sim | `0` |  |  |
| 9 | `ativo` | `boolean` | sim | `true` |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| tipos_beneficio_codigo_key | UNIQUE | `UNIQUE (codigo)` |  |  | sim |
| tipos_beneficio_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.beneficios_colaborador | beneficios_colaborador_tipo_beneficio_id_fkey | tipo_beneficio_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| tipos_beneficio_codigo_key | btree | codigo | sim | sim |  | `CREATE UNIQUE INDEX tipos_beneficio_codigo_key ON public.tipos_beneficio USING btree (codigo)` |
| tipos_beneficio_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX tipos_beneficio_pkey ON public.tipos_beneficio USING btree (id)` |


## Policies (RLS)

### `Admins can delete tipos_beneficio`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin(auth.uid())` |
| WITH CHECK |  |

### `Admins can manage tipos_beneficio`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_admin(auth.uid())` |

### `Admins can update tipos_beneficio`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin(auth.uid())` |
| WITH CHECK |  |

### `Authenticated can read tipos_beneficio`

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
