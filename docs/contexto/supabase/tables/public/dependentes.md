# public.dependentes

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
| 2 | `colaborador_id` | `uuid` | não |  |  |  |
| 3 | `nome` | `text` | não |  |  |  |
| 4 | `cpf` | `text` | sim |  |  |  |
| 5 | `data_nascimento` | `date` | sim |  |  |  |
| 6 | `parentesco` | `text` | não |  |  |  |
| 7 | `para_irrf` | `boolean` | sim | `false` |  |  |
| 8 | `para_salario_familia` | `boolean` | sim | `false` |  |  |
| 9 | `para_plano_saude` | `boolean` | sim | `false` |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `relacionamento_id` | `integer` | sim |  |  |  |
| 12 | `ir` | `boolean` | sim | `false` |  |  |
| 13 | `salario_familia` | `boolean` | sim | `false` |  |  |
| 14 | `estrangeiro` | `boolean` | sim | `false` |  |  |
| 15 | `genero_documento_id` | `integer` | sim |  |  |  |
| 16 | `escolaridade` | `text` | sim |  |  |  |
| 17 | `deficiente` | `boolean` | sim | `false` |  |  |
| 18 | `grau_parentesco` | `text` | sim |  |  |  |
| 19 | `incapacidade_fisica_mental` | `boolean` | sim | `false` |  |  |
| 20 | `data_inicio_vigencia` | `date` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_dependentes_cpf_formato | CHECK | `CHECK (cpf IS NULL OR length(regexp_replace(cpf, '\D'::text, ''::text, 'g'::text)) = 11) NOT VALID` |  |  | não |
| dependentes_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| dependentes_genero_documento_id_fkey | FOREIGN KEY | `FOREIGN KEY (genero_documento_id) REFERENCES generos_documento(id)` | NO ACTION | NO ACTION | sim |
| dependentes_nascimento_plausivel | CHECK | `CHECK (data_nascimento IS NULL OR data_nascimento >= '1900-01-01'::date)` |  |  | sim |
| dependentes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| dependentes_relacionamento_id_fkey | FOREIGN KEY | `FOREIGN KEY (relacionamento_id) REFERENCES relacionamentos_dependentes(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.dependentes_beneficios | dependentes_beneficios_dependente_id_fkey | dependente_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| dependentes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX dependentes_pkey ON public.dependentes USING btree (id)` |
| idx_dependentes_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_dependentes_colaborador_id ON public.dependentes USING btree (colaborador_id)` |
| idx_dependentes_genero_documento_id | btree | genero_documento_id | não | sim |  | `CREATE INDEX idx_dependentes_genero_documento_id ON public.dependentes USING btree (genero_documento_id)` |
| idx_dependentes_relacionamento_id | btree | relacionamento_id | não | sim |  | `CREATE INDEX idx_dependentes_relacionamento_id ON public.dependentes USING btree (relacionamento_id)` |


## Policies (RLS)

### `dependentes_rh_manage`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM colaboradores c   WHERE ((c.id = dependentes.colaborador_id) AND pode_gerir_rh(c.empresa_id))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM colaboradores c   WHERE ((c.id = dependentes.colaborador_id) AND pode_gerir_rh(c.empresa_id))))` |

### `dependentes_tenant_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM colaboradores c   WHERE ((c.id = dependentes.colaborador_id) AND pode_gerir_pessoas(c.empresa_id))))` |
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
