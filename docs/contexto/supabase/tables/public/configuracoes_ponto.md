# public.configuracoes_ponto

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
| 2 | `empresa_id` | `uuid` | não |  |  |  |
| 3 | `tolerancia_minutos` | `integer` | sim | `10` |  |  |
| 4 | `intervalo_minimo_minutos` | `integer` | sim | `60` |  |  |
| 5 | `permite_ponto_offline` | `boolean` | sim | `true` |  |  |
| 6 | `exige_geolocalizacao` | `boolean` | sim | `true` |  |  |
| 7 | `exige_reconhecimento_facial` | `boolean` | sim | `false` |  |  |
| 8 | `raio_maximo_metros` | `integer` | sim | `200` |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| cfg_ponto_tolerancias_nao_negativas | CHECK | `CHECK (COALESCE(tolerancia_minutos, 0) >= 0 AND COALESCE(intervalo_minimo_minutos, 0) >= 0 AND COALESCE(raio_maximo_metros, 0) >= 0)` |  |  | sim |
| configuracoes_ponto_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| configuracoes_ponto_empresa_id_key | UNIQUE | `UNIQUE (empresa_id)` |  |  | sim |
| configuracoes_ponto_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| configuracoes_ponto_empresa_id_key | btree | empresa_id | sim | sim |  | `CREATE UNIQUE INDEX configuracoes_ponto_empresa_id_key ON public.configuracoes_ponto USING btree (empresa_id)` |
| configuracoes_ponto_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX configuracoes_ponto_pkey ON public.configuracoes_ponto USING btree (id)` |


## Policies (RLS)

### `Apenas admins podem atualizar configurações de ponto`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `pertence_a_empresa(empresa_id)` |
| WITH CHECK | `pertence_a_empresa(empresa_id)` |

### `Configurações de ponto visíveis por membros da empresa`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `pertence_a_empresa(empresa_id)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_updated_at_config_ponto | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
