# public.esocial_eventos

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
| 2 | `empresa_id` | `uuid` | sim |  |  |  |
| 3 | `tipo_evento` | `text` | não |  |  |  |
| 4 | `dados` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 5 | `competencia` | `text` | sim |  |  |  |
| 6 | `status` | `text` | sim | `'rascunho'::text` |  |  |
| 7 | `data_envio` | `timestamp with time zone` | sim |  |  |  |
| 8 | `protocolo` | `text` | sim |  |  |  |
| 9 | `erros` | `jsonb` | sim |  |  |  |
| 10 | `xml` | `text` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `assinatura_xml` | `text` | sim |  |  |  |
| 14 | `hash_seguranca` | `text` | sim |  |  |  |
| 15 | `xml_retorno` | `text` | sim |  |  |  |
| 16 | `recibo` | `text` | sim |  |  |  |
| 17 | `xml_envio` | `text` | sim |  |  |  |
| 18 | `data_processamento` | `timestamp with time zone` | sim |  |  |  |
| 19 | `id_recibo` | `text` | sim |  |  |  |
| 20 | `tentativas_envio` | `integer` | sim | `0` |  |  |
| 21 | `proxima_tentativa` | `timestamp with time zone` | sim |  |  |  |
| 22 | `hash_arquivo` | `text` | sim |  |  |  |
| 23 | `admissao_id` | `uuid` | sim |  |  |  |
| 24 | `transmission_claim_token` | `uuid` | sim |  |  |  |
| 25 | `transmission_claimed_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| esocial_eventos_admissao_id_fkey | FOREIGN KEY | `FOREIGN KEY (admissao_id) REFERENCES admissoes(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| esocial_eventos_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| esocial_eventos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.esocial_transmissao_logs | esocial_transmissao_logs_evento_id_fkey | evento_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| esocial_eventos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX esocial_eventos_pkey ON public.esocial_eventos USING btree (id)` |
| idx_esocial_eventos_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_esocial_eventos_empresa_id ON public.esocial_eventos USING btree (empresa_id)` |
| idx_esocial_eventos_medida | btree |  | não | sim | `(tipo_evento = ANY (ARRAY['S-2299'::text, 'S-2206'::text]))` | `CREATE INDEX idx_esocial_eventos_medida ON public.esocial_eventos USING btree (((dados ->> 'medida_id'::text))) WHERE (tipo_evento = ANY (ARRAY['S-2299'::text, 'S-2206'::text]))` |
| idx_esocial_status_comp | btree | status, competencia | não | sim |  | `CREATE INDEX idx_esocial_status_comp ON public.esocial_eventos USING btree (status, competencia)` |
| idx_esocial_tipo | btree | empresa_id, tipo_evento | não | sim |  | `CREATE INDEX idx_esocial_tipo ON public.esocial_eventos USING btree (empresa_id, tipo_evento)` |
| uq_esocial_eventos_admissao_s2200 | btree | admissao_id | sim | sim | `((admissao_id IS NOT NULL) AND (tipo_evento = 'S-2200'::text))` | `CREATE UNIQUE INDEX uq_esocial_eventos_admissao_s2200 ON public.esocial_eventos USING btree (admissao_id) WHERE ((admissao_id IS NOT NULL) AND (tipo_evento = 'S-2200'::text))` |


## Policies (RLS)

### `esocial_eventos_tenant_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(((empresa_id IS NOT NULL) AND (empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))) OR is_admin(auth.uid()))` |
| WITH CHECK |  |

### `tenant_esocial_eventos`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_audit_esocial_transmission | AFTER | UPDATE | ROW | enabled | public.log_esocial_transmission |
| tr_protect_esocial_transport_fields | BEFORE | UPDATE | ROW | enabled | public.protect_esocial_transport_fields |
| trg_enforce_esocial_evento_hash | BEFORE | INSERT OR UPDATE | ROW | enabled | public.enforce_esocial_evento_hash |
| trg_impedir_alteracao_esocial_transmitido | BEFORE | UPDATE | ROW | enabled | public.impedir_alteracao_esocial_transmitido |
| trg_proibir_delete_esocial_transmitido | BEFORE | DELETE | ROW | enabled | public.proibir_delete_esocial_transmitido |
| update_esocial_eventos_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
