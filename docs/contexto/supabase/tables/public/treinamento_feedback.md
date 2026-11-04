# public.treinamento_feedback

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
| 2 | `inscricao_id` | `uuid` | sim |  |  |  |
| 3 | `nota_satisfacao` | `integer` | sim |  |  |  |
| 4 | `comentario` | `text` | sim |  |  |  |
| 5 | `aplicabilidade_nota` | `integer` | sim |  |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `timezone('utc'::text, now())` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| treinamento_feedback_aplicabilidade_nota_check | CHECK | `CHECK (aplicabilidade_nota >= 1 AND aplicabilidade_nota <= 5)` |  |  | sim |
| treinamento_feedback_inscricao_id_fkey | FOREIGN KEY | `FOREIGN KEY (inscricao_id) REFERENCES inscricoes_cursos(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| treinamento_feedback_nota_satisfacao_check | CHECK | `CHECK (nota_satisfacao >= 1 AND nota_satisfacao <= 5)` |  |  | sim |
| treinamento_feedback_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_treinamento_feedback_inscricao_id | btree | inscricao_id | não | sim |  | `CREATE INDEX idx_treinamento_feedback_inscricao_id ON public.treinamento_feedback USING btree (inscricao_id)` |
| treinamento_feedback_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX treinamento_feedback_pkey ON public.treinamento_feedback USING btree (id)` |


## Policies (RLS)

### `Treinamento feedback authenticated`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM inscricoes_cursos ic   WHERE ((ic.id = treinamento_feedback.inscricao_id) AND ((ic.empresa_id IS NULL) OR pertence_a_empresa(ic.empresa_id)))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM inscricoes_cursos ic   WHERE ((ic.id = treinamento_feedback.inscricao_id) AND ((ic.empresa_id IS NULL) OR pertence_a_empresa(ic.empresa_id)))))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
