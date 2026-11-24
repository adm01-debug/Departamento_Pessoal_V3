# Auditoria ao Vivo do Banco Canônico — Departamento Pessoal V3

**Data de corte:** 10/09/2026
**Projeto confirmado pelo proprietário:** `frjbfeamybqsejlvmqbl`
**Endpoint:** `https://frjbfeamybqsejlvmqbl.supabase.co`
**Banco:** PostgreSQL 17.6, database `postgres`, usuário de sessão `postgres`, timezone UTC
**Modo da auditoria:** conexão pelo pooler, consultas read-only, simulação transacional de papéis e chamadas HTTP sem autenticação
**Classificação:** **CRÍTICA — promoção bloqueada**

> Nenhuma credencial, token, senha, linha de PII ou payload de usuário foi gravado neste relatório. As credenciais fornecidas no chat devem ser rotacionadas ao final da auditoria.

## 1. Conclusão executiva

O banco canônico foi acessado e inspecionado diretamente. A conclusão é inequívoca: o schema vivo **não está sincronizado** com o ledger de migrations, com os tipos TypeScript nem com partes relevantes do código. Também existem falhas de autorização exploráveis antes da entrada de dados reais.

Os quatro bloqueios mais graves são:

1. quatro views retornam PII, auditoria ou telemetria a uma requisição sem login;
2. funções `SECURITY DEFINER` executáveis por `anon`/`authenticated` permitem operações privilegiadas sem autorização interna suficiente;
3. funções, tabelas e buckets usados pelo código não existem no canônico;
4. onze gatilhos de integridade falham em runtime porque suas funções não encontram `digest()` no `search_path`.

O fato de os registros atuais serem massa de teste reduz o impacto material imediato, mas não reduz a severidade do defeito. Este é o momento seguro para corrigir: antes de cadastrar pessoas reais.

## 2. Método e garantias de não mutação

Foram realizadas:

- consultas aos catálogos `pg_catalog` e `information_schema`;
- inventário físico determinístico por `scripts/db/schema-inventory.sql`;
- execução dos auditores versionados do repositório contra o banco vivo;
- simulações com `SET LOCAL ROLE anon` e `SET LOCAL ROLE authenticated`, usando usuário UUID inexistente e transação read-only;
- requisições PostgREST com apenas a chave publicável, sem bearer token de usuário;
- inspeção de configurações públicas do Auth e healthchecks das Edge Functions;
- comparação do ledger remoto com os nomes/versões das migrations locais;
- comparação do schema vivo com `src/integrations/supabase/types.ts`.

Não foram executados `INSERT`, `UPDATE`, `DELETE`, DDL, RPC mutante, `db push`, `migration repair`, upload ou alteração de configuração.

## 3. Fotografia física do canônico

| Indicador                    |                                Estado vivo |
| ---------------------------- | -----------------------------------------: |
| Tamanho do banco             | 42.912.915 bytes, aproximadamente 40,9 MiB |
| Schemas                      |                                         13 |
| Tabelas públicas             |       362: 361 ordinárias e 1 particionada |
| Views públicas               |                                         44 |
| Sequences públicas           |                                         17 |
| Índices públicos             |                                      1.203 |
| Funções públicas             |         299 overloads; 297 nomes distintos |
| Policies públicas            |                                        611 |
| Triggers de usuário públicos |                       398; 2 desabilitados |
| Constraints públicas         |                                      1.141 |
| Extensões                    |                                          8 |
| Usuários Auth                |                                          5 |
| Empresas                     |                                          1 |
| Colaboradores                |                                         13 |
| Buckets                      |                          4, todos privados |
| Objetos no Storage           |                                          0 |

Contagens de negócio são apresentadas apenas para provar que o ambiente ainda contém massa pequena e descartável; nenhum valor de linha foi lido para este documento.

### Inventário determinístico

O inventário físico atual contém 9.037 registros e SHA-256 `368081a46033279364cd946fd6f14b74e5898a61e61bfcb1dc6381ea8e12e639`:

| Categoria  | Quantidade |
| ---------- | ---------: |
| ACL        |        423 |
| COLUMN     |      4.512 |
| CONSTRAINT |      1.141 |
| EXTENSION  |          8 |
| FUNCTION   |        299 |
| INDEX      |      1.203 |
| POLICY     |        611 |
| RELATION   |        423 |
| TRIGGER    |        398 |
| TYPE       |         19 |

O baseline de 31/08/2026 tinha 9.024 registros e hash diferente. A diferença exata é de 13 policies adicionadas sem qualquer nova versão no ledger. Portanto, houve mudança física **não registrada como migration aplicada**.

## 4. P0 — Views expõem dados sem login

Uma chamada HTTP ao PostgREST usando apenas `apikey: <publishable-key>` retornou `200` e linhas nas quatro views abaixo:

| View                        | Linhas visíveis anonimamente | Dados expostos                                                                                |
| --------------------------- | ---------------------------: | --------------------------------------------------------------------------------------------- |
| `vw_colaboradores_completo` |                           12 | nome completo, CPF, e-mail corporativo, admissão, empresa, departamento, cargo e `empresa_id` |
| `v_audit_events_unified`    |                          345 | `user_id`, evento e JSON de dados anteriores/novos                                            |
| `dp_slow_queries`           |                           60 | trechos de SQL, chamadas e tempos de execução                                                 |
| `vw_banco_horas_saldo`      |                           12 | colaborador, nome completo, empresa e saldo de horas                                          |

### Causa técnica

- 43 das 44 views públicas possuem `SELECT` para `anon`;
- somente 2 das 44 estão configuradas com `security_invoker=true`;
- as quatro views confirmadas são de propriedade de `postgres` e executam com privilégios do proprietário;
- RLS ativa nas tabelas-base não impede o bypass por uma view `security definer` implícita.

### Correção obrigatória

1. revogar imediatamente `SELECT` de `anon` e `PUBLIC` em todas as views não deliberadamente públicas;
2. recriar views de negócio com `security_invoker=true` quando o acesso direto fizer sentido;
3. expor dados agregados somente por RPC autorizada quando uma view precisar atravessar tabelas sensíveis;
4. adicionar testes HTTP negativos sem JWT para todas as views;
5. bloquear o release enquanto qualquer view com PII retornar `200` com linhas para `anon`.

## 5. P0 — Privilégios e ACL padrão excessivamente amplos

Os grants físicos abrangem quase todo o schema:

| Papel           | Objetos com SELECT | INSERT | UPDATE | DELETE | Views selecionáveis |
| --------------- | -----------------: | -----: | -----: | -----: | ------------------: |
| `anon`          |                403 |    403 |    402 |    402 |                  43 |
| `authenticated` |                405 |    404 |    403 |    403 |                  44 |

As ACLs padrão de `postgres` e `supabase_admin` concedem `arwdDxtm` em novas relações públicas para `anon` e `authenticated`, além de `EXECUTE` em funções. Em tabelas com RLS correta, a policy ainda limita linhas. Porém, esse desenho transforma qualquer policy permissiva, view sem `security_invoker` ou função mal autorizada em exposição direta.

**Gate requerido:** default privileges de menor privilégio; grants explícitos por objeto; nenhuma concessão implícita de escrita para `anon`; diff de ACL obrigatório em toda migration.

## 6. P0 — Funções privilegiadas sem autorização interna

No schema `public`:

- `anon` pode executar 116 funções distintas, incluindo 23 `SECURITY DEFINER`;
- `authenticated` pode executar 208 overloads/206 nomes, incluindo 113 `SECURITY DEFINER`;
- 204 dos 299 overloads públicos são `SECURITY DEFINER`;
- 18 overloads privilegiados não possuem `proconfig` fixado.

Casos confirmados por leitura da definição viva:

| Função                                       | Papel exposto   | Falha                                                     | Impacto provável                                           |
| -------------------------------------------- | --------------- | --------------------------------------------------------- | ---------------------------------------------------------- |
| `reset_login_attempts(text,text)`            | `anon`          | aceita identificador/IP e não autoriza o chamador         | remoção arbitrária de lockout e facilitação de brute force |
| `anonimizar_dados_pessoais(uuid)`            | `authenticated` | atualiza o colaborador recebido sem checar vínculo/gestão | anonimização destrutiva de outro tenant                    |
| `registrar_batida_ponto(...)`                | `authenticated` | confia em `colaborador_id` e `empresa_id` fornecidos      | fraude de ponto/cross-tenant                               |
| `gerar_canonical_espelho_ponto(uuid,text)`   | `authenticated` | retorna dados por colaborador arbitrário sem autorização  | CPF, PIS e espelho de ponto de terceiro                    |
| `sst_regimento_assinar(uuid,uuid,text,text)` | `authenticated` | aceita colaborador arbitrário sem autorização             | assinatura em nome de terceiro                             |
| `clinicas_proximas(...)`                     | `anon`          | aceita `empresa_id` arbitrária                            | enumeração de parceiros e contatos                         |
| `get_user_roles(uuid)`                       | `authenticated` | aceita usuário arbitrário                                 | enumeração de privilégios                                  |
| `next_cnab_sequencial(uuid,text)`            | `authenticated` | aceita empresa arbitrária                                 | enumeração/interferência em sequência CNAB                 |
| `cleanup_ciencia_rate_limits()`              | `anon`          | deleção privilegiada sem autorização                      | remoção do controle antiabuso                              |

Funções públicas por token podem ser legítimas, mas cada uma precisa limitar tentativa, expiração, uso único, comparação resistente a timing e retorno mínimo. `PUBLIC EXECUTE` não deve ser o padrão.

## 7. P0 — RLS passa no botão, falha no comportamento

Todas as 362 tabelas públicas têm RLS habilitada, mas apenas 3 usam `FORCE ROW LEVEL SECURITY`. A cobertura aparente não equivale a isolamento:

- 611 policies públicas;
- 150 policies atingem `anon` ou `PUBLIC`;
- 55 possuem `USING (true)`;
- 13 possuem `WITH CHECK (true)`;
- 60 policies foram reprovadas pelo auditor de isolamento tenant;
- 17 policies de tabelas com PII não provaram correlação com usuário/tenant;
- 50 policies foram reprovadas pelo auditor de menor privilégio.

### Simulação com usuário autenticado inexistente e sem empresa

| Objeto                      | Linhas retornadas |
| --------------------------- | ----------------: |
| `audit_log`                 |               281 |
| `cnab_configuracoes`        |                 1 |
| `rubricas_folha`            |                24 |
| `sst_exposicao_riscos`      |                 1 |
| `sst_regimento_interno`     |                 3 |
| `vw_colaboradores_completo` |                12 |
| `v_audit_events_unified`    |               345 |
| `dp_slow_queries`           |                60 |
| `vw_banco_horas_saldo`      |                12 |

Isso prova acesso indevido, não apenas um alerta heurístico.

### Treze policies fora do ledger

Desde o baseline de 31/08, foram acrescentadas policies `*_tenant_select` em 13 tabelas. Nenhuma nova migration aparece no ledger. Além do drift, essas policies incluem padrões inseguros:

- confiança em `auth.jwt() ->> 'role'` para `admin`, `super_admin` ou `financeiro`;
- acesso a registros com `empresa_id IS NULL` em `admissoes` e `esocial_eventos`;
- uso de `user_empresa_id()` sem matriz negativa suficiente.

As 13 tabelas são: `admissoes`, `banco_horas`, `batidas_ponto`, `colaborador_beneficios`, `desligamentos`, `documentos_assinatura`, `esocial_eventos`, `exames`, `faltas`, `folhas_pagamento`, `provisoes_mensais`, `registros_ponto` e `solicitacoes_ajuste_ponto`.

## 8. P0 — Integridade criptográfica quebrada em runtime

O auditor `audit-db-search-path` retornou 48 relações função/extensão, correspondentes a 24 assinaturas públicas únicas. O teste dinâmico `smoke-hash-triggers` reprovou 11 operações de selagem:

- `enforce_afastamento_hash`;
- `enforce_aso_hash`;
- `enforce_batida_ponto_hash`;
- `enforce_cat_hash`;
- `enforce_cnab_remessa_hash`;
- `enforce_desligamento_hash`;
- `enforce_documento_assinatura_hash`;
- `enforce_epi_entrega_hash`;
- `enforce_esocial_evento_hash`;
- `enforce_holerite_signed_hash`;
- `enforce_medida_disciplinar_hash`.

A extensão `pgcrypto` está em `extensions`, enquanto as funções afetadas fixam `search_path` sem esse schema ou, no caso do desligamento, não o fixam adequadamente. O PostgreSQL aceita a criação da função PL/pgSQL e só revela a quebra na execução.

Além disso, dois triggers de folha estão desabilitados:

- `folhas_pagamento.trigger_alerta_divergencia`;
- `folhas_pagamento.trigger_gerar_provisao`.

## 9. P0 — Código e tipos apontam para objetos inexistentes

### Diferença global

| Categoria         | Banco vivo | Tipos locais | Divergência                                |
| ----------------- | ---------: | -----------: | ------------------------------------------ |
| Tabelas           |        362 |          353 | 17 somente no banco; 8 somente nos tipos   |
| Views             |         44 |           38 | 6 somente no banco                         |
| Funções distintas |        297 |          165 | 158 somente no banco; 26 somente nos tipos |

As oito tabelas tipadas mas ausentes incluem `lgpd_retencao_logs`, cinco tabelas `pcs_*`, `sec_policy_regressions` e `sec_seal_events`.

### Quebras de runtime comprováveis pelo catálogo

| Consumidor local                          | Dependência ausente no banco vivo                                  | Resultado esperado                                 |
| ----------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------- |
| `supabase/functions/auth-login/index.ts`  | `check_account_lockout`, `record_login_attempt`                    | login funciona degradado, sem o controle prometido |
| `supabase/functions/_shared/rateLimit.ts` | `edge_rate_limit_check`                                            | rate limiting compartilhado falha                  |
| `supabase/functions/limpeza/index.ts`     | `drenar_fila_limpeza_lgpd`, `run_lgpd_purge`, `lgpd_retencao_logs` | retenção/limpeza LGPD falha                        |
| `supabase/functions/_shared/authz.ts`     | `pode_gerir_rh_para`, `pode_gerir_pessoas_para`                    | autorizações server-side falham                    |
| `src/hooks/useColaboradorVinculo.ts`      | `vincular_colaborador_ao_usuario`                                  | conciliação de vínculo falha                       |
| `src/services/pcsService.ts`              | cinco tabelas `pcs_*` e RPCs PCS                                   | módulo PCS não opera no canônico                   |

Gerar tipos novamente sem decidir qual lado é a fonte de verdade apenas esconderia ou ampliaria a divergência. Primeiro deve-se promover um baseline aprovado; depois gerar e bloquear o drift no CI.

## 10. P0 — Storage incompleto

O código e a tela de diagnóstico esperam 19 buckets. O banco possui somente quatro, todos privados:

- `comprovantes-despesas`;
- `contabilidade-anexos`;
- `relatorios-privados`;
- `sst-programas`.

Estão ausentes 15 buckets esperados: `afastamentos`, `assinaturas`, `avatars`, `backups`, `contratacao`, `contratos-trabalho`, `documentos`, `documentos-admissao`, `documentos-colaboradores`, `ferias-avisos`, `ferias-coletivas-comunicados`, `medidas-contestacoes`, `medidas-disciplinares`, `ponto-biometria` e `recrutamento-curriculos`.

Há chamadas produtivas para vários deles, incluindo contratos, férias, OCR, ponto biométrico e medidas disciplinares. Esses fluxos falharão com `Bucket not found`.

O Storage vivo tem somente 10 policies, todas para os quatro buckets existentes. Elas usam `authenticated`, `owner = auth.uid()` e vínculo de empresa no caminho, desenho melhor do que o schema público; ainda precisam de testes de path traversal, spoof de `owner`, MIME, tamanho e acesso cruzado.

## 11. P0 — Ledger e migrations não representam o banco

| Métrica                   | Valor |
| ------------------------- | ----: |
| Arquivos locais           |   644 |
| Versões locais únicas     |   640 |
| Versões no ledger remoto  |    33 |
| Interseção local/remoto   |     3 |
| Versões somente locais    |   637 |
| Versões somente remotas   |    30 |
| Versões locais duplicadas |     4 |

As quatro versões duplicadas são `20260724120000`, `20260724130000`, `20260724140000` e `20260818000000`. O ledger continua com máximo `20260830000003`; ele não mudou apesar das 13 policies novas observadas no schema.

Não é seguro executar `supabase db push` nem marcar as centenas de versões como aplicadas. Como os dados são descartáveis, o caminho de menor risco é reconstruir um projeto/staging limpo com um baseline único, validar tudo e somente então substituir o canônico mediante janela e rollback.

## 12. P1 — Constraints, índices e estrutura operacional

- 12 constraints `CHECK` públicas estão `NOT VALID`;
- as 513 FKs públicas estão validadas;
- `audit_log_unified_archive` é a única tabela pública sem chave primária;
- 24 FKs não possuem índice com prefixo compatível;
- há 31 grupos de índices duplicados;
- `statement_timeout` global é 120 s; `anon` usa 3 s e `authenticated` 8 s;
- `lock_timeout` global é 0, embora `authenticator` use 8 s;
- `idle_in_transaction_session_timeout` global é 0;
- SSL está ativo, `password_encryption` usa `scram-sha-256` e `row_security` está ligado.

Os números de índice são sinais para análise com carga/EXPLAIN, não autorização para remoção automática.

## 13. Jobs, Auth e observabilidade

### Cron

Existem sete jobs ativos:

- `dp-retention-anonymize-90d`;
- `dp-retention-delete-730d`;
- `dp-partition-monthly`;
- `dp-log-rotation-check`;
- `dp-health-snapshot`;
- `update-despesa-updated-at-daily`;
- `purge-pii-access-logs-daily`.

A página de diagnóstico espera também `sec-audit-policies-daily`, `sec-policy-regressions-purge` e `sec-verify-seals-weekly`; nenhum dos três existe. O baseline de 31/08 registrava zero jobs, logo os sete atuais também precisam ser incorporados à fonte canônica versionada.

### Auth público

- cadastro por e-mail está habilitado;
- confirmação automática de e-mail está desabilitada;
- usuários anônimos e provedores OAuth estão desabilitados;
- telefone está desabilitado;
- passkeys e SAML estão desabilitados;
- o endpoint público não expõe a configuração de MFA do projeto.

O cadastro aberto pode ser legítimo em implantação, mas deve ser uma decisão explícita e acompanhado de CAPTCHA/rate limit nativo. A aplicação referencia duas RPCs de lockout ausentes, e o banco expõe `reset_login_attempts` a `anon`; portanto, o controle anti-brute-force da aplicação não é confiável no estado atual.

### Health e métricas

No momento da auditoria, health/auth/storage responderam HTTP 200 e o health JSON marcou banco e bridge como saudáveis. A latência total/DB observada foi aproximadamente 791 ms. Isso substitui a observação histórica de HTTP 402, mas não prova estabilidade.

O endpoint de métricas continua com erro matemático no código: `bridge_error_rate` divide quantidade de erros pela latência P95, e não pelo número de requests. Além disso, `dp_slow_queries` expõe trechos de SQL anonimamente.

## 14. Resultado dos gates contra o banco vivo

| Gate                        | Resultado  | Evidência                                                     |
| --------------------------- | ---------- | ------------------------------------------------------------- |
| `audit-db-search-path`      | **FALHOU** | 48 relações; 24 funções únicas                                |
| `smoke-hash-triggers`       | **FALHOU** | 11 selagens quebradas                                         |
| `audit-rls-pii`             | **FALHOU** | 17 policies sem isolamento provado; 16 avisos de role pública |
| `audit-rls-least-privilege` | **FALHOU** | 50 policies                                                   |
| `audit-rls-tenant-open`     | **FALHOU** | 60 policies                                                   |
| `audit-secdef-authz`        | **FALHOU** | 27 funções                                                    |
| `audit-embed-hints`         | APROVADO   | 16 relationship hints válidos                                 |

Um pipeline que pula esses gates quando não recebe conexão de banco não constitui aprovação de segurança. Em branch protegida, ausência da conexão deve produzir estado neutro/bloqueado ou falha explícita, nunca verde.

## 15. Ordem segura de correção

1. Rotacionar as credenciais expostas no chat e atualizar consumidores autorizados.
2. Congelar entrada de dados reais e declarar o canônico como ambiente de implantação descartável até a recertificação.
3. Revogar acesso anônimo às quatro views confirmadas e testar via HTTP sem JWT.
4. Revogar ACLs padrão amplas e aplicar grants explícitos de menor privilégio.
5. Revogar `EXECUTE` público das funções não públicas; adicionar autorização interna às RPCs privilegiadas.
6. Corrigir `search_path` das 24 funções e repetir os 11 smokes de hash.
7. Corrigir policies por vínculo relacional confiável; eliminar `auth.jwt()->>'role'` livre, `USING(true)` e acesso global não justificado.
8. Criar baseline/squash a partir do estado funcional desejado, não a partir do ledger quebrado.
9. Restaurar o baseline em projeto temporário vazio e validar inventário, Auth, RLS, RPCs, triggers, constraints, cron e Storage.
10. Criar os buckets requeridos com limites, MIME e policies antes de executar fluxos de upload.
11. Gerar novamente os tipos a partir do staging aprovado e bloquear drift no CI.
12. Executar testes integrados por papéis e E2E; somente depois promover/substituir o canônico.

## 16. Critérios mínimos de liberação

- zero linha de PII/auditoria/SQL acessível sem JWT;
- zero RPC mutante privilegiada executável sem autorização interna e teste negativo;
- todos os sete gates de banco verdes no ambiente restaurado;
- 11/11 smokes de hash aprovados;
- zero policy baseada em claim livre de `user_metadata`/JWT para conceder privilégio;
- tipos, inventário e ledger gerados do mesmo commit/baseline;
- 19/19 buckets esperados presentes, privados por padrão e com testes cruzados;
- constraints críticas validadas e triggers de folha deliberadamente ativos ou removidos por decisão registrada;
- restore do zero reproduzível;
- CI, Security, E2E e healthcheck verdes no mesmo commit.

## 17. Limites que permanecem

Não foi possível auditar pela Management API:

- política de backup/PITR e último restore disponível;
- secrets implantados e suas versões;
- lista/hash/configuração das Edge Functions implantadas;
- logs internos completos da plataforma;
- configuração privada de MFA, CAPTCHA, SMTP e limites de Auth;
- billing, quotas e regiões além do que o endpoint vivo revelou.

Esses itens exigem um Supabase Personal Access Token com escopo de leitura do projeto ou exportação de evidências pelo Dashboard. Eles não invalidam a auditoria SQL/HTTP acima, que foi executada diretamente no canônico.

## 18. Decisão

**NÃO LIBERAR DADOS REAIS E NÃO PROMOVER O SISTEMA.** O banco está acessível e operacional, mas falha em confidencialidade, autorização, integridade criptográfica e reprodutibilidade. A correção é segura agora justamente porque a massa é descartável; depois da entrada de PII real, os mesmos defeitos constituiriam incidente de segurança e LGPD.
