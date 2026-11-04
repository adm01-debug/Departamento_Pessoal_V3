# public.tipos_pagamento

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
| 1 | `id` | `integer` | não | `nextval('tipos_pagamento_id_seq'::regclass)` |  |  |
| 2 | `nome` | `text` | não |  |  |  |
| 3 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| tipos_pagamento_nome_key | UNIQUE | `UNIQUE (nome)` |  |  | sim |
| tipos_pagamento_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.colaboradores | colaboradores_tipo_pagamento_id_fkey | tipo_pagamento_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| tipos_pagamento_nome_key | btree | nome | sim | sim |  | `CREATE UNIQUE INDEX tipos_pagamento_nome_key ON public.tipos_pagamento USING btree (nome)` |
| tipos_pagamento_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX tipos_pagamento_pkey ON public.tipos_pagamento USING btree (id)` |


## Policies (RLS)

### `tipos_pagamento_read`

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
