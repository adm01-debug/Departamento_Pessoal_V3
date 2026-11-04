# public.rubricas_folha

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 7 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `codigo` | `text` | não |  |  |  |
| 3 | `descricao` | `text` | não |  |  |  |
| 4 | `tipo` | `tipo_evento_folha` | não |  |  |  |
| 5 | `incide_inss` | `boolean` | sim | `false` |  |  |
| 6 | `incide_irrf` | `boolean` | sim | `false` |  |  |
| 7 | `incide_fgts` | `boolean` | sim | `false` |  |  |
| 8 | `automatico` | `boolean` | sim | `false` |  |  |
| 9 | `formula` | `text` | sim |  |  |  |
| 10 | `ativo` | `boolean` | sim | `true` |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `empresa_id` | `uuid` | sim |  |  |  |
| 13 | `codigo_esocial` | `text` | sim |  |  |  |
| 14 | `natureza_rubrica` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| rubricas_folha_empresa_codigo_unique | UNIQUE | `UNIQUE (empresa_id, codigo)` |  |  | sim |
| rubricas_folha_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| rubricas_folha_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.eventos_variaveis | eventos_variaveis_rubrica_id_fkey | rubrica_id | NO ACTION |
| public.itens_folha | itens_folha_rubrica_id_fkey | rubrica_id | NO ACTION |
| public.lancamentos_folha | lancamentos_folha_rubrica_id_fkey | rubrica_id | NO ACTION |
| public.verbas_rescisorias | verbas_rescisorias_rubrica_id_fkey | rubrica_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| rubricas_folha_empresa_codigo_unique | btree | empresa_id, codigo | sim | sim |  | `CREATE UNIQUE INDEX rubricas_folha_empresa_codigo_unique ON public.rubricas_folha USING btree (empresa_id, codigo)` |
| rubricas_folha_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX rubricas_folha_pkey ON public.rubricas_folha USING btree (id)` |


## Policies (RLS)

### `Admins can delete rubricas_folha`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin(auth.uid())` |
| WITH CHECK |  |

### `Admins can manage rubricas_folha`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_admin(auth.uid())` |

### `Admins can update rubricas_folha`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin(auth.uid())` |
| WITH CHECK |  |

### `Empresa vê suas próprias rubricas`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(empresa_id IN ( SELECT user_empresas.empresa_id    FROM user_empresas   WHERE (user_empresas.user_id = auth.uid())))` |
| WITH CHECK |  |

### `Empresas podem ver suas rubricas`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() IN ( SELECT user_empresas.user_id    FROM user_empresas   WHERE (user_empresas.empresa_id = rubricas_folha.empresa_id)))` |
| WITH CHECK |  |

### `Gerenciamento por admin`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) AND ((empresa_id = ((auth.jwt() ->> 'empresa_id'::text))::uuid) OR (empresa_id IS NULL)))` |
| WITH CHECK | `(has_role(auth.uid(), 'admin'::app_role) AND ((empresa_id = ((auth.jwt() ->> 'empresa_id'::text))::uuid) OR (empresa_id IS NULL)))` |

### `Visualização por empresa ou global`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((empresa_id = ((auth.jwt() ->> 'empresa_id'::text))::uuid) OR (empresa_id IS NULL))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_updated_at_rubricas | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
