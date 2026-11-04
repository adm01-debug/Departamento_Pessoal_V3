# public.treinamento_certificados

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `colaborador_id` | `uuid` | sim |  |  |  |
| 3 | `curso_id` | `uuid` | sim |  |  |  |
| 4 | `inscricao_id` | `uuid` | sim |  |  |  |
| 5 | `data_emissao` | `date` | não | `CURRENT_DATE` |  |  |
| 6 | `data_validade` | `date` | sim |  |  |  |
| 7 | `arquivo_url` | `text` | sim |  |  |  |
| 8 | `codigo_autenticacao` | `text` | sim | `upper(SUBSTRING((gen_random_uuid())::text FROM 1 FOR 8))` |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 10 | `empresa_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| treinamento_certificados_codigo_autenticacao_key | UNIQUE | `UNIQUE (codigo_autenticacao)` |  |  | sim |
| treinamento_certificados_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| treinamento_certificados_curso_id_fkey | FOREIGN KEY | `FOREIGN KEY (curso_id) REFERENCES catalogo_cursos(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| treinamento_certificados_inscricao_id_fkey | FOREIGN KEY | `FOREIGN KEY (inscricao_id) REFERENCES inscricoes_cursos(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| treinamento_certificados_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_treinamento_certificados_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_treinamento_certificados_colaborador_id ON public.treinamento_certificados USING btree (colaborador_id)` |
| idx_treinamento_certificados_curso_id | btree | curso_id | não | sim |  | `CREATE INDEX idx_treinamento_certificados_curso_id ON public.treinamento_certificados USING btree (curso_id)` |
| idx_treinamento_certificados_inscricao_id | btree | inscricao_id | não | sim |  | `CREATE INDEX idx_treinamento_certificados_inscricao_id ON public.treinamento_certificados USING btree (inscricao_id)` |
| treinamento_certificados_codigo_autenticacao_key | btree | codigo_autenticacao | sim | sim |  | `CREATE UNIQUE INDEX treinamento_certificados_codigo_autenticacao_key ON public.treinamento_certificados USING btree (codigo_autenticacao)` |
| treinamento_certificados_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX treinamento_certificados_pkey ON public.treinamento_certificados USING btree (id)` |


## Policies (RLS)

### `Colaboradores veem seus próprios certificados`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() = ( SELECT profiles.user_id    FROM profiles   WHERE (profiles.id = treinamento_certificados.colaborador_id)))` |
| WITH CHECK |  |

### `RH e Gestores veem todos os certificados`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() IN ( SELECT user_roles.user_id    FROM user_roles   WHERE (user_roles.role = ANY (ARRAY['admin'::app_role, 'rh'::app_role, 'gestor'::app_role]))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_fill_treinamento_certificados_empresa | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fill_treinamento_certificados_empresa |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
