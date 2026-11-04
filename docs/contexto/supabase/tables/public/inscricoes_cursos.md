# public.inscricoes_cursos

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
| 2 | `curso_id` | `uuid` | não |  |  |  |
| 3 | `colaborador_id` | `uuid` | não |  |  |  |
| 4 | `status` | `text` | sim | `'inscrito'::text` |  |  |
| 5 | `nota` | `numeric(5,2)` | sim |  |  |  |
| 6 | `data_inicio` | `date` | sim |  |  |  |
| 7 | `data_conclusao` | `date` | sim |  |  |  |
| 8 | `certificado_url` | `text` | sim |  |  |  |
| 9 | `empresa_id` | `uuid` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| inscricoes_cursos_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id)` | NO ACTION | NO ACTION | sim |
| inscricoes_cursos_curso_id_fkey | FOREIGN KEY | `FOREIGN KEY (curso_id) REFERENCES catalogo_cursos(id)` | NO ACTION | NO ACTION | sim |
| inscricoes_cursos_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| inscricoes_cursos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.treinamento_certificados | treinamento_certificados_inscricao_id_fkey | inscricao_id | CASCADE |
| public.treinamento_feedback | treinamento_feedback_inscricao_id_fkey | inscricao_id | CASCADE |
| public.treinamento_feedbacks | treinamento_feedbacks_inscricao_id_fkey | inscricao_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_inscricoes_cursos_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_inscricoes_cursos_colaborador_id ON public.inscricoes_cursos USING btree (colaborador_id)` |
| idx_inscricoes_cursos_curso_id | btree | curso_id | não | sim |  | `CREATE INDEX idx_inscricoes_cursos_curso_id ON public.inscricoes_cursos USING btree (curso_id)` |
| idx_inscricoes_cursos_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_inscricoes_cursos_empresa_id ON public.inscricoes_cursos USING btree (empresa_id)` |
| inscricoes_cursos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX inscricoes_cursos_pkey ON public.inscricoes_cursos USING btree (id)` |


## Policies (RLS)

### `inscricoes_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |

### `inscricoes_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |

### `inscricoes_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |

### `inscricoes_update`

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
| tr_auto_generate_certificate | AFTER | UPDATE | ROW | enabled | public.fn_auto_generate_training_certificate |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
