# public.ponto_espelhos_revogacoes

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
| 2 | `espelho_id` | `uuid` | não |  |  |  |
| 3 | `revogado_por_user_id` | `uuid` | não |  |  |  |
| 4 | `motivo` | `text` | não |  |  |  |
| 5 | `revogado_em` | `timestamp with time zone` | não | `now()` |  |  |
| 6 | `ip` | `inet` | sim |  |  |  |
| 7 | `user_agent` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ponto_espelhos_revogacoes_espelho_id_fkey | FOREIGN KEY | `FOREIGN KEY (espelho_id) REFERENCES ponto_espelhos_assinados(id)` | NO ACTION | NO ACTION | sim |
| ponto_espelhos_revogacoes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_revogacoes_espelho | btree | espelho_id | não | sim |  | `CREATE INDEX idx_revogacoes_espelho ON public.ponto_espelhos_revogacoes USING btree (espelho_id)` |
| ponto_espelhos_revogacoes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ponto_espelhos_revogacoes_pkey ON public.ponto_espelhos_revogacoes USING btree (id)` |


## Policies (RLS)

### `Admins inserem revogações`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((revogado_por_user_id = auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))` |

### `Admins/RH visualizam revogações da sua empresa`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM (ponto_espelhos_assinados e      JOIN user_empresas ue ON ((ue.empresa_id = e.empresa_id)))   WHERE ((e.id = ponto_espelhos_revogacoes.espelho_id) AND (ue.user_id = auth.uid()))))` |
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
