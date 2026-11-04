# public.epis_fichas_assinaturas

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
| 2 | `ficha_id` | `uuid` | não |  |  |  |
| 3 | `assinatura_tipo` | `text` | não |  |  |  |
| 4 | `assinatura_dados` | `text` | não |  |  |  |
| 5 | `hash_sha256` | `text` | não |  |  |  |
| 6 | `ip_address` | `inet` | sim |  |  |  |
| 7 | `user_agent` | `text` | sim |  |  |  |
| 8 | `assinado_em` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| epis_fichas_assinaturas_assinatura_tipo_check | CHECK | `CHECK (assinatura_tipo = ANY (ARRAY['canvas'::text, 'webauthn'::text, 'biometria_mobile'::text]))` |  |  | sim |
| epis_fichas_assinaturas_ficha_id_fkey | FOREIGN KEY | `FOREIGN KEY (ficha_id) REFERENCES epis_fichas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| epis_fichas_assinaturas_ficha_id_key | UNIQUE | `UNIQUE (ficha_id)` |  |  | sim |
| epis_fichas_assinaturas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| epis_fichas_assinaturas_ficha_id_key | btree | ficha_id | sim | sim |  | `CREATE UNIQUE INDEX epis_fichas_assinaturas_ficha_id_key ON public.epis_fichas_assinaturas USING btree (ficha_id)` |
| epis_fichas_assinaturas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX epis_fichas_assinaturas_pkey ON public.epis_fichas_assinaturas USING btree (id)` |


## Policies (RLS)

### `Assinatura inserida por admin/rh`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM (epis_fichas f      JOIN user_empresas ue ON ((ue.empresa_id = f.empresa_id)))   WHERE ((f.id = epis_fichas_assinaturas.ficha_id) AND (ue.user_id = auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role)))))` |

### `Assinatura visível para membros da empresa`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM (epis_fichas f      JOIN user_empresas ue ON ((ue.empresa_id = f.empresa_id)))   WHERE ((f.id = epis_fichas_assinaturas.ficha_id) AND (ue.user_id = auth.uid()))))` |
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
