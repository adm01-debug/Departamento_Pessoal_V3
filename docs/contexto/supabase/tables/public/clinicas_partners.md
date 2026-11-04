# public.clinicas_partners

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
| 3 | `razao_social` | `text` | não |  |  |  |
| 4 | `nome_fantasia` | `text` | sim |  |  |  |
| 5 | `cnpj` | `text` | não |  |  |  |
| 6 | `email` | `text` | sim |  |  |  |
| 7 | `telefone` | `text` | sim |  |  |  |
| 8 | `responsavel_tecnico` | `text` | sim |  |  |  |
| 9 | `crm_responsavel` | `text` | sim |  |  |  |
| 10 | `cep` | `text` | sim |  |  |  |
| 11 | `logradouro` | `text` | sim |  |  |  |
| 12 | `numero` | `text` | sim |  |  |  |
| 13 | `complemento` | `text` | sim |  |  |  |
| 14 | `bairro` | `text` | sim |  |  |  |
| 15 | `cidade` | `text` | sim |  |  |  |
| 16 | `uf` | `text` | sim |  |  |  |
| 17 | `geo_lat` | `numeric(10,7)` | sim |  |  |  |
| 18 | `geo_lng` | `numeric(10,7)` | sim |  |  |  |
| 19 | `especialidades` | `text[]` | não | `'{}'::text[]` |  |  |
| 20 | `tipos_exame` | `text[]` | não | `'{}'::text[]` |  |  |
| 21 | `sla_medio_min` | `integer` | sim |  |  |  |
| 22 | `rating` | `numeric(3,2)` | sim |  |  |  |
| 23 | `aceita_convenio` | `boolean` | não | `false` |  |  |
| 24 | `status` | `text` | não | `'ativo'::text` |  |  |
| 25 | `observacoes` | `text` | sim |  |  |  |
| 26 | `created_by` | `uuid` | sim |  |  |  |
| 27 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 28 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| clinicas_partners_cnpj_empresa_unique | UNIQUE | `UNIQUE (empresa_id, cnpj)` |  |  | sim |
| clinicas_partners_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| clinicas_partners_rating_check | CHECK | `CHECK (rating IS NULL OR rating >= 0::numeric AND rating <= 5::numeric)` |  |  | sim |
| clinicas_partners_status_check | CHECK | `CHECK (status = ANY (ARRAY['ativo'::text, 'inativo'::text, 'suspenso'::text]))` |  |  | sim |
| clinicas_partners_uf_check | CHECK | `CHECK (uf IS NULL OR char_length(uf) = 2)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.asos | asos_clinica_partner_id_fkey | clinica_partner_id | SET NULL |
| public.clinicas_partners_horarios | clinicas_partners_horarios_clinica_id_fkey | clinica_id | CASCADE |
| public.clinicas_partners_servicos | clinicas_partners_servicos_clinica_id_fkey | clinica_id | CASCADE |
| public.exames_agendamentos | exames_agendamentos_clinica_id_fkey | clinica_id | RESTRICT |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| clinicas_partners_cnpj_empresa_unique | btree | empresa_id, cnpj | sim | sim |  | `CREATE UNIQUE INDEX clinicas_partners_cnpj_empresa_unique ON public.clinicas_partners USING btree (empresa_id, cnpj)` |
| clinicas_partners_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX clinicas_partners_pkey ON public.clinicas_partners USING btree (id)` |
| idx_clinicas_partners_cidade_uf | btree | uf, cidade | não | sim |  | `CREATE INDEX idx_clinicas_partners_cidade_uf ON public.clinicas_partners USING btree (uf, cidade)` |
| idx_clinicas_partners_empresa_status | btree | empresa_id, status | não | sim |  | `CREATE INDEX idx_clinicas_partners_empresa_status ON public.clinicas_partners USING btree (empresa_id, status)` |
| idx_clinicas_partners_geo | btree | geo_lat, geo_lng | não | sim | `(geo_lat IS NOT NULL)` | `CREATE INDEX idx_clinicas_partners_geo ON public.clinicas_partners USING btree (geo_lat, geo_lng) WHERE (geo_lat IS NOT NULL)` |


## Policies (RLS)

### `clinicas_partners_select_empresa`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM user_empresas ue   WHERE ((ue.user_id = auth.uid()) AND (ue.empresa_id = clinicas_partners.empresa_id))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_clinicas_partners_upd | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
