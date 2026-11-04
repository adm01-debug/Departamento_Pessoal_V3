# public.contrato_token_eventos

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
| usada por views | public.v_contrato_token_timeline |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `empresa_id` | `uuid` | não |  |  |  |
| 3 | `token_id` | `uuid` | não |  |  |  |
| 4 | `contrato_id` | `uuid` | não |  |  |  |
| 5 | `evento` | `text` | não |  |  |  |
| 6 | `detalhes` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 7 | `ator_id` | `uuid` | sim |  |  |  |
| 8 | `ip` | `inet` | sim |  |  |  |
| 9 | `user_agent` | `text` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| contrato_token_eventos_ator_id_fkey | FOREIGN KEY | `FOREIGN KEY (ator_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| contrato_token_eventos_contrato_id_fkey | FOREIGN KEY | `FOREIGN KEY (contrato_id) REFERENCES contratos_gerados(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| contrato_token_eventos_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| contrato_token_eventos_evento_check | CHECK | `CHECK (evento = ANY (ARRAY['gerado'::text, 'reenviado'::text, 'revogado'::text, 'estendido'::text, 'lembrete_enviado'::text, 'acesso_link'::text, 'tentativa_invalida'::text, 'assinado'::text, 'expirado'::text]))` |  |  | sim |
| contrato_token_eventos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| contrato_token_eventos_token_id_fkey | FOREIGN KEY | `FOREIGN KEY (token_id) REFERENCES contrato_assinatura_tokens(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| contrato_token_eventos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX contrato_token_eventos_pkey ON public.contrato_token_eventos USING btree (id)` |
| idx_ctk_eventos_contrato | btree | contrato_id, created_at | não | sim |  | `CREATE INDEX idx_ctk_eventos_contrato ON public.contrato_token_eventos USING btree (contrato_id, created_at DESC)` |
| idx_ctk_eventos_empresa | btree | empresa_id, created_at | não | sim |  | `CREATE INDEX idx_ctk_eventos_empresa ON public.contrato_token_eventos USING btree (empresa_id, created_at DESC)` |
| idx_ctk_eventos_token | btree | token_id, created_at | não | sim |  | `CREATE INDEX idx_ctk_eventos_token ON public.contrato_token_eventos USING btree (token_id, created_at DESC)` |


## Policies (RLS)

### `contrato_token_eventos_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `user_belongs_to_empresa(auth.uid(), empresa_id)` |
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
