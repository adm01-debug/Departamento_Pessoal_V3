# public.trilhas_cursos

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `trilha_id` | `uuid` | não |  |  |  |
| 3 | `curso_id` | `uuid` | não |  |  |  |
| 4 | `ordem` | `integer` | sim | `0` |  |  |
| 5 | `obrigatorio` | `boolean` | sim | `true` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| trilhas_cursos_curso_id_fkey | FOREIGN KEY | `FOREIGN KEY (curso_id) REFERENCES catalogo_cursos(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| trilhas_cursos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| trilhas_cursos_trilha_id_fkey | FOREIGN KEY | `FOREIGN KEY (trilha_id) REFERENCES trilhas_aprendizado(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_trilhas_cursos_curso_id | btree | curso_id | não | sim |  | `CREATE INDEX idx_trilhas_cursos_curso_id ON public.trilhas_cursos USING btree (curso_id)` |
| idx_trilhas_cursos_trilha_id | btree | trilha_id | não | sim |  | `CREATE INDEX idx_trilhas_cursos_trilha_id ON public.trilhas_cursos USING btree (trilha_id)` |
| trilhas_cursos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX trilhas_cursos_pkey ON public.trilhas_cursos USING btree (id)` |


## Policies (RLS)

### `trilhas_cursos_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(trilha_id IN ( SELECT trilhas_aprendizado.id    FROM trilhas_aprendizado   WHERE (trilhas_aprendizado.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |
| WITH CHECK |  |

### `trilhas_cursos_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(trilha_id IN ( SELECT trilhas_aprendizado.id    FROM trilhas_aprendizado   WHERE (trilhas_aprendizado.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |

### `trilhas_cursos_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(trilha_id IN ( SELECT trilhas_aprendizado.id    FROM trilhas_aprendizado   WHERE (trilhas_aprendizado.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |
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
