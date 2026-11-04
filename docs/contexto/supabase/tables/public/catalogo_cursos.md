# public.catalogo_cursos

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
| 2 | `nome` | `text` | não |  |  |  |
| 3 | `descricao` | `text` | sim |  |  |  |
| 4 | `categoria` | `text` | sim |  |  |  |
| 5 | `carga_horaria` | `integer` | sim |  |  |  |
| 6 | `modalidade` | `text` | sim | `'presencial'::text` |  |  |
| 7 | `obrigatorio` | `boolean` | sim | `false` |  |  |
| 8 | `nr_relacionada` | `text` | sim |  |  |  |
| 9 | `ativo` | `boolean` | sim | `true` |  |  |
| 10 | `empresa_id` | `uuid` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| catalogo_cursos_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| catalogo_cursos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.inscricoes_cursos | inscricoes_cursos_curso_id_fkey | curso_id | NO ACTION |
| public.treinamento_certificados | treinamento_certificados_curso_id_fkey | curso_id | SET NULL |
| public.treinamento_instancias | treinamento_instancias_curso_id_fkey | curso_id | CASCADE |
| public.trilhas_cursos | trilhas_cursos_curso_id_fkey | curso_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| catalogo_cursos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX catalogo_cursos_pkey ON public.catalogo_cursos USING btree (id)` |
| idx_catalogo_cursos_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_catalogo_cursos_empresa_id ON public.catalogo_cursos USING btree (empresa_id)` |


## Policies (RLS)

### `catalogo_cursos_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |

### `catalogo_cursos_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |

### `catalogo_cursos_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |

### `catalogo_cursos_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| enqueue_training_image_course | AFTER | INSERT | ROW | enabled | public.enqueue_training_image_request |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
