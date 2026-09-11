# Auditoria Técnica Exaustiva — Departamento Pessoal V3

**Data de corte:** 10/09/2026
**Escopo:** repositório local, GitHub, pipelines, aplicação, testes, artefatos versionados e inspeção SQL/HTTP ao vivo do Supabase canônico
**Branch auditada:** `main`
**Commit local:** `ef66e39d08c2a864a5459771e5ebc0d36d3a0dfb`
**Commit `origin/main`:** `3fc90810332289884b7a2a5978afcbddb6b51420`
**Resultado geral ponderado após validação viva:** **4,11/10**

> Esta é uma fotografia técnica, não uma homologação de produção. O banco canônico foi acessado diretamente pelo pooler e testado em modo read-only, inclusive com simulação dos papéis `anon` e `authenticated` e requisições PostgREST sem login. O detalhamento reproduzível está em `AUDITORIA_BANCO_CANONICO_AO_VIVO_2026-09-10.md`. A Management API privada continua sem privilégio suficiente; backups/PITR, secrets e hashes das Edge Functions implantadas permanecem fora do escopo comprovado.

## 0. Resumo executivo

O sistema tem uma base funcional ampla e sinais reais de engenharia: TypeScript estrito, 4.853 testes unitários aprovados, typecheck separado para aplicação/testes/E2E, 60 Edge Functions, proteção estática do gateway, testes Playwright estruturados por papel e uma suíte de auditoria de banco. O build de produção também conclui. Contudo, a execução dessa suíte contra o banco real demonstrou que os controles físicos não acompanham a qualidade local.

Essas virtudes ainda não fecham a cadeia de confiança necessária para implantação. Oito bloqueios impedem uma promoção responsável:

1. quatro views retornam PII, auditoria ou SQL para uma requisição sem login;
2. um usuário autenticado sem empresa consegue ler dados de auditoria, CNAB, folha e SST;
3. RPCs `SECURITY DEFINER` permitem anonimização, batida de ponto, assinatura ou remoção de lockout sem autorização interna suficiente;
4. onze gatilhos de hash/selagem falham em runtime por `search_path` incompatível com `pgcrypto`;
5. código e tipos dependem de RPCs, tabelas e 15 buckets ausentes no banco vivo;
6. a cadeia de 644 migrations não reconstrói o schema canônico e o ledger reconhece só 33 versões;
7. o E2E do GitHub não executa por ausência das quatro credenciais obrigatórias;
8. há uma vulnerabilidade alta em `sharp@0.35.3`, transitiva de `vite-imagetools`.

Além disso, o checkout local está um commit atrás do GitHub. O commit remoto altera o proxy de desenvolvimento para outro projeto Supabase, enquanto `supabase/config.toml` e a decisão canônica documentada apontam para `frjbfeamybqsejlvmqbl`. Esse conflito deve ser resolvido por configuração explícita e gate, não por escolha silenciosa de uma das URLs.

## 1. Metodologia e limites

Foram usados:

- inventário por Git, `rg`, contagem de arquivos/linhas e inspeção de configurações;
- grafo persistente do projeto, com 13.454 nós e consulta sobre acoplamento e risco;
- análise de ciclos com Madge;
- análise de duplicação com jscpd;
- typecheck, lint, Vitest, build, testes de migrations e testes Deno;
- `npm audit` e varredura local de segredos;
- leitura dos workflows e dos resultados recentes do GitHub;
- leitura do ensaio de restore/replay de 31/08/2026;
- conexão read-only pelo pooler ao PostgreSQL 17.6 canônico;
- inventário de schemas, ACLs, tabelas, views, funções, policies, triggers, constraints, cron e Storage;
- execução dos sete gates SQL do repositório contra o banco vivo;
- simulação transacional de `anon` e `authenticated` sem vínculo de empresa;
- requisições PostgREST anônimas às views expostas;
- inspeção pública do Auth, health e métricas.

As notas medem evidência operacional, não quantidade de código. A inspeção foi não mutante: nenhuma RPC mutante, DDL, upload, `db push` ou `migration repair` foi executado.

### Regra de ponderação

- peso 3: autenticação, autorização, integridade de dados e segurança;
- peso 2: arquitetura, banco, testes, tipagem e validação;
- peso 1: demais dimensões.

O prompt declara 22 dimensões, mas enumera somente 20. Para cumprir as 22, foram acrescentadas:

- 21. Acessibilidade e UX inclusiva;
- 22. Privacidade e LGPD operacional.

## 2. Inventário do sistema

| Item                    | Evidência                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| Repositório             | `adm01-debug/Departamento_Pessoal_V3`; checkout local em `main`                                      |
| Sincronização           | local atrás de `origin/main` por 1 commit                                                            |
| Frontend                | React 19.2.8, TypeScript 6.0.3, Vite 8.2.x, Tailwind 4.3.x                                           |
| Backend                 | 60 diretórios de Edge Functions Supabase/Deno; gateway `external-db-bridge`                          |
| Banco                   | PostgreSQL/Supabase; projeto declarado `frjbfeamybqsejlvmqbl`                                        |
| Banco vivo              | PostgreSQL 17.6; 40,9 MiB; 362 tabelas, 44 views, 299 funções, 611 policies e 398 triggers públicos  |
| Massa atual             | 5 usuários Auth, 1 empresa, 13 colaboradores; declarada sintética e descartável pelo proprietário    |
| Storage vivo            | 4/19 buckets esperados; 15 ausentes; zero objetos                                                    |
| Ledger remoto           | 33 versões; somente 3 em interseção com 640 versões locais únicas                                    |
| Integrações             | Supabase Auth/Storage/Functions, Sentry, HIBP, ViaCEP/BrasilAPI, OAuth Lovable/Google, webhooks HMAC |
| Infra                   | Netlify/Vercel, Docker/Nginx; artefatos Kubernetes/Helm ainda incompletos                            |
| Arquivos rastreados     | 2.459                                                                                                |
| Aplicação               | 1.205 arquivos em `src`; 1.199 TS/TSX; 177.814 linhas                                                |
| Edge Functions          | 107 arquivos TS; 18.005 linhas                                                                       |
| Banco versionado        | 644 migrations SQL; 49.961 linhas                                                                    |
| Tipos gerados           | `src/integrations/supabase/types.ts`: 24.160 linhas                                                  |
| Inventário pelos tipos  | 353 tabelas públicas, 38 views, 165 funções, 30 enums, 3 tipos compostos                             |
| Rotas                   | 84 caminhos e 111 elementos `Route`; 106 páginas lazy                                                |
| Testes                  | 501 arquivos de teste/spec; 24 specs E2E                                                             |
| CI/CD                   | 7 workflows GitHub                                                                                   |
| Documentação            | 208 arquivos Markdown em `docs`; 9 runbooks                                                          |
| Ambientes               | local e produção parcialmente configurados; staging hospedado não comprovado                         |
| Último deploy produtivo | **não auditável**: commit Git não prova promoção/deploy                                              |

## 3. Evidência de execução

| Verificação               | Resultado                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| `bun run ci:verify`       | aprovado; lint terminou com 14 warnings permitidos por teto 18                                 |
| Typecheck aplicação       | aprovado com `strict: true` e `noImplicitAny: true`                                            |
| Typecheck testes/E2E      | aprovado por configs dedicadas                                                                 |
| Vitest completo           | 462 arquivos aprovados, 1 ignorado; 4.853 testes aprovados, 9 ignorados; 57,07 s               |
| Cobertura                 | 60,94% statements; 56,11% branches; 53,72% functions; 65,26% lines                             |
| Build                     | aprovado em 3,24 s; 6.486 módulos                                                              |
| Bundle                    | chunk principal 1.697 KB bruto/381,80 KB gzip; Excel 1.319,54/287,67 KB; precache PWA ~12 MB   |
| Migrations de reparo      | 28 asserts aprovados, mas cobrem apenas 3 migrations específicas                               |
| Deno bridge               | `deno check` aprovado                                                                          |
| Deno compartilhado        | 27 testes aprovados                                                                            |
| Ciclos                    | 2: Supabase client ↔ logger; barrel de layout ↔ MainLayout                                     |
| Duplicação                | 90 clones; 1,16%/1.526 linhas; duplicações relevantes em MFA, containers e validadores         |
| Auditoria de dependências | 1 vulnerabilidade alta em `sharp <0.35.4`                                                      |
| E2E remoto                | bloqueado antes dos testes por quatro secrets ausentes                                         |
| Healthcheck remoto        | recuperado nesta sessão: health/Auth/Storage HTTP 200; histórico do workflow contém 402        |
| Banco vivo nesta sessão   | acessado pelo pooler em read-only; PostgreSQL 17.6; projeto canônico confirmado                |
| Gates físicos do banco    | 6 reprovados e 1 aprovado; RLS, menor privilégio, `SECURITY DEFINER` e `search_path` vermelhos |
| Teste anônimo HTTP        | 4 views retornam linhas sem login, incluindo CPF, nomes, auditoria e trechos de SQL            |

## 4. Achados críticos transversais

### A-001 — Divergência do projeto Supabase canônico

- `vite.config.ts:18` aponta localmente para `frjbfeamybqsejlvmqbl`.
- `supabase/config.toml:3` declara o mesmo projeto.
- `origin/main` está um commit à frente e muda o proxy para `ciziytrrjjotlsjzshnm`.
- A URL deve vir de variável validada; nenhuma configuração local deve mascarar o destino.
- **Risco:** desenvolver, testar ou gravar contra banco errado.
- **Severidade:** P0.

### A-002 — Monitoramento remoto divergente do estado atual

- O workflow agendado exige backend em `.github/workflows/healthcheck.yml:24-29`.
- As execuções históricas recentes receberam HTTP 402 do Supabase, mas os mesmos endpoints responderam HTTP 200 nesta auditoria.
- `APP_URL` não está definida, logo o frontend é pulado.
- Há oito issues de healthcheck duplicadas, sem fechamento automático confiável.
- **Risco:** alerta e disponibilidade não representam o estado real e não verificam o frontend.
- **Severidade:** P0.

### A-003 — Cadeia de migrations não reproduzível

A evidência de 31/08/2026 registra:

- 644 arquivos locais versus 33 versões no ledger;
- somente 3 versões em interseção;
- replay falhando no ordinal 529;
- 4 versões duplicadas e 69 nomes/timestamps não canônicos;
- prefixo de 528 migrations ainda divergente do canônico em milhares de itens;
- baseline candidato ainda não promovido.

**Risco:** novos ambientes e recuperação de desastre não reproduzem produção.
**Severidade:** P0.

### A-004 — Segurança física do banco reprovada ao vivo

No banco canônico vivo:

- 48 relações de dependência, equivalentes a 24 funções únicas, reprovaram `search_path`;
- 60 policies reprovaram isolamento tenant;
- 17 policies reprovaram proteção de PII;
- 50 policies reprovaram menor privilégio;
- 27 funções `SECURITY DEFINER` reprovaram autorização;
- há 43 views acessíveis por `anon`, 55 `USING (true)` e 12 constraints `CHECK NOT VALID` públicas;
- quatro views retornaram dados reais da massa de teste sem login.

Esses resultados foram reproduzidos nesta execução e são bloqueadores.

### A-005 — Gates de qualidade parcialmente permissivos

- `.github/workflows/ci.yml` usa `npm install`, não instalação congelada.
- Typecheck das Edge Functions não-bridge usa `continue-on-error`.
- `eslint.config.js:40-43` desliga `no-unused-vars` e `no-explicit-any`; hooks são warnings.
- `lint:ci` aceita até 18 warnings.
- Testes e E2E são ignorados pelo lint em `eslint.config.js:17-23`.
- **Risco:** CI verde coexistindo com dívida conhecida e não bloqueante.
- **Severidade:** P1.

### A-006 — Métrica de erro matematicamente inválida

`supabase/functions/metrics/index.ts` divide contagem de erros por latência P95. Isso não é taxa de erro. A função ainda responde HTTP 200 quando falha a própria coleta.

**Risco:** dashboard/alerta informa normalidade ou valor sem significado durante incidente.
**Severidade:** P0 para observabilidade.

### A-007 — Vazamento potencial de PII em logs

- `AuthContext.tsx` envia email em logs de login, cadastro e recuperação.
- `loggerService.ts` adiciona URL completa e user-agent.
- Warn/error/fatal são persistidos remotamente; o “lote” executa uma RPC por item.
- Não há redator central comprovado nem correlação por request cross-service.
- **Risco:** retenção indevida de PII, tokens/query strings em URL e custo/pressão no banco.
- **Severidade:** P1.

### A-008 — Infraestrutura declarativa enganosa/incompleta

- `k8s/service.yaml`, Helm e outros artefatos contêm apenas TODO.
- Deployment usa imagem `:latest`, sem readiness e sem security context.
- `docker-compose.prod.yml` testa `/health`, mas o `nginx.conf` não oferece esse endpoint.
- Nginx não inclui os headers já presentes no Netlify.
- **Risco:** falsa sensação de prontidão para deploy/DR.
- **Severidade:** P1.

### A-009 — Views expõem PII e dados internos anonimamente

- `vw_colaboradores_completo` retornou 12 linhas, inclusive CPF, nomes e e-mail, sem login.
- `v_audit_events_unified`, `dp_slow_queries` e `vw_banco_horas_saldo` também retornaram linhas a `anon`.
- 43/44 views têm grant de `SELECT` para `anon`; somente 2 usam `security_invoker=true`.
- **Risco:** vazamento direto de PII, trilhas de auditoria e SQL antes de qualquer autenticação.
- **Severidade:** P0.

### A-010 — RPCs privilegiadas permitem ações arbitrárias

- `reset_login_attempts` é executável por `anon`.
- Usuário autenticado pode chamar funções de anonimização, batida, assinatura e geração de espelho para identificadores fornecidos pelo cliente sem autorização interna suficiente.
- 113 overloads `SECURITY DEFINER` são executáveis por `authenticated`.
- **Risco:** fraude, destruição lógica, bypass de brute force, PII cross-tenant e assinatura em nome de terceiros.
- **Severidade:** P0.

### A-011 — Integridade criptográfica e automações quebradas

- O smoke dinâmico reprovou 11 gatilhos de hash/selagem porque `digest()` não resolve no `search_path` fixado.
- Dois triggers de folha estão desabilitados.
- Três jobs de segurança esperados pela tela de diagnóstico não existem.
- **Risco:** documentos e eventos sem selo verificável, provisões/alertas omitidos e controles periódicos ausentes.
- **Severidade:** P0.

### A-012 — Schema, tipos, Storage e ledger não convergem

- O código tipado usa 8 tabelas e 26 funções ausentes no banco; o banco contém 17 tabelas e 158 funções não refletidas nos tipos.
- Existem apenas 4 dos 19 buckets esperados pelo código.
- O ledger remoto possui 33 versões e não registra as 13 policies adicionadas desde 31/08.
- **Risco:** falhas de runtime previsíveis, falsa segurança do typecheck e impossibilidade de restaurar o ambiente.
- **Severidade:** P0.

## 5. Análise das 22 dimensões

### 1. Arquitetura — 6,0/10

**Evidências:** separação básica em páginas, componentes, hooks, services e Edge Functions; 106 rotas lazy; gateway com boundary explícito. Existem 2 ciclos, `App.tsx` concentra mais de 100 rotas, 157 arquivos produtivos excedem 200 linhas e há somente um ADR.

**Gaps para 10:** módulos de domínio não são boundaries rígidos; UI/services compartilham tipos/adaptações; componentes “God”; ciclos; decisões arquiteturais não registradas.

**Ações:** registry tipado de rotas; pacotes/camadas por domínio; portas/adapters para Supabase; quebrar ciclos; ADRs para auth, tenancy, migrations, observabilidade e deploy.

### 2. Autenticação — 4,0/10

**Evidências:** Supabase Auth, refresh de sessão, MFA/TOTP, senha vazada, wrapper de login e testes de guards. Porém `auth-login` chama `check_account_lockout` e `record_login_attempt`, que não existem no banco vivo, enquanto `reset_login_attempts` é executável por `anon`. Cadastro por e-mail está aberto e confirmação automática está desligada.

**Gaps para 10:** controle anti-brute-force efetivo; impedir bypass do wrapper pelo endpoint público de token; CAPTCHA/rate limit nativo; sessão no browser exposta a XSS; MFA regular fail-open; configuração privada de Auth/MFA não comprovada.

**Ações:** combinar rate limits nativos/WAF/CAPTCHA; threat model do bypass; política única de MFA; rotação/revogação de sessão testada; remover PII de logs de auth.

### 3. Autorização — 2,0/10

**Evidências:** guards frontend, perfis/roles, RLS e auditores; AdminRoute exige AAL2. No banco vivo, 43 views são selecionáveis por `anon`, quatro retornaram linhas sem login, usuário autenticado sem empresa leu tabelas sensíveis, 60 policies falharam isolamento tenant e 27 funções privilegiadas falharam o auditor de autorização.

**Gaps para 10:** revogar vazamentos já demonstrados; grants mínimos; views `security_invoker`; autorização interna em RPCs; policies sem claims forjáveis; cobertura negativa por tabela, view, função e papel.

**Ações:** matriz RBAC/ABAC; teste real `anon/authenticated/admin/service_role` por tabela/coluna; revogar grants; `security_invoker` nas views; validação server-side em toda escrita.

### 4. Banco de dados — 3,0/10

**Evidências:** o canônico foi inventariado ao vivo: 362 tabelas, 44 views, 299 funções, 611 policies e 398 triggers. Porém 644 migrations não reproduzem o canônico; o ledger contém apenas 33 versões; há quatro versões duplicadas, 13 policies fora do ledger, 12 checks não validados, 24 FKs sem índice adequado e 31 grupos de índices duplicados.

**Gaps para 10:** baseline não promovido; ledger divergente; naming quebrado; constraints não validadas; 15 buckets ausentes; tipos e objetos vivos incompatíveis; top queries sem EXPLAIN verificável.

**Ações:** staging descartável; concluir squash/baseline; reparar somente versão aprovada; validar constraints; catálogo de objetos; diff físico e `supabase gen types` bloqueantes.

### 5. CI/CD — 5,5/10

**Evidências:** sete workflows cobrem tipos, lint, unidade, segurança, banco, E2E e preview. CI recente passa, mas Security e E2E falham; healthcheck falha. Instalações não estão congeladas em todos os jobs; Bun usa `latest`.

**Gaps para 10:** sem cadeia totalmente verde; preview depende de secrets; produção não tem gate/promote/rollback automatizado comprovado; sem cache consistente; checks permissivos.

**Ações:** congelar toolchain/lockfiles; resolver secrets; required checks; ambientes GitHub com approval; artefato imutável promovido; rollback exercitado.

### 6. Integridade de dados — 3,0/10

**Evidências:** FKs, triggers, hashes, idempotência no webhook, uso de RPCs e auditores específicos. No banco vivo, 11 smokes de hash falham em runtime, dois triggers de folha estão desabilitados e 12 constraints `CHECK` públicas não estão validadas. As 513 FKs públicas estão validadas.

**Gaps para 10:** restaurar selagem criptográfica; decisão sobre triggers desabilitados; transações multi-tabela não inventariadas; regras duplicadas front/edge; locking e idempotência inconsistentes.

**Ações:** catálogo de mutations; RPC transacional; chaves de idempotência; version columns; validar FKs/CHECKs; testes concorrentes e de retry.

### 7. Documentação — 6,0/10

**Evidências:** README, changelog, 208 documentos, 9 runbooks e inventários detalhados. Só há um ADR e não há OpenAPI. Existem documentos duplicados de arquitetura/API/deploy e afirmações antigas contraditórias.

**Gaps para 10:** falta fonte canônica; diagrama ER vivo; dicionário de dados; contrato das Edge Functions; ownership e revisão de validade.

**Ações:** portal/índice canônico; arquivar superseded; OpenAPI/AsyncAPI; ADR catalog; docs-as-code com link checker e “last verified”.

### 8. Infraestrutura / DevOps — 3,5/10

**Evidências:** Dockerfile, compose, Nginx, Netlify/Vercel, headers e health workflow. K8s/Helm/Ansible são placeholders; Node diverge (20/22); imagens não são fixadas por digest; não há IaC real para Supabase/DNS/secrets.

**Gaps para 10:** staging isolado; IaC válido; probes coerentes; container non-root; DR off-site; topologia de rede; inventário de recursos.

**Ações:** remover ou implementar artefatos; padronizar Node 22; endurecer Nginx/container; ambiente staging; backup off-site e restore agendado.

### 9. Logging / Monitoring — 4,5/10

**Evidências:** logger estruturado, Sentry, health/metrics e persistência de erros. Correlação é por sessão, não por request; emails/URL/user-agent entram no contexto; flush faz N RPCs.

**Gaps para 10:** redaction; retention; request ID end-to-end; dashboards implantados; uptime externo; alertas com owner.

**Ações:** schema de evento; redator allowlist; batch RPC; trace/correlation ID; políticas de retenção; smoke de alertas.

### 10. Observabilidade — 3,5/10

**Evidências:** Sentry, telemetria do bridge e endpoint Prometheus. A taxa de erro é inválida e falha interna retorna 200; `dp_slow_queries` expõe trechos de SQL a `anon`; não há prova de scraping, SLOs, tracing distribuído ou métricas USE.

**Gaps para 10:** denominador real de requests; semântica de scrape; RED/USE; trace propagation; SLO/error budget; runbooks vinculados.

**Ações:** corrigir contador/taxa; 5xx em falha de coleta ou métrica `up=0`; OpenTelemetry; dashboards versionados; testes sintéticos.

### 11. Lógica de negócio — 6,5/10

**Evidências:** calculadoras críticas usam Decimal e têm cobertura alta; validadores brasileiros e fluxos de RH são extensos. Há cerca de 138 padrões que merecem triagem para float monetário e regras aparecem em UI e backend.

**Gaps para 10:** fonte única; state machines explícitas; versionamento legal/tabelas; testes de datas, timezone e vigência em todos os módulos.

**Ações:** domínio puro; schemas versionados; RPC autoritativa; matriz de legislação/vigência; testes de propriedade e fronteira.

### 12. Manutenibilidade — 4,5/10

**Evidências:** 157 arquivos produtivos >200 linhas; 13 >500; maiores chegam a 1.010 linhas. jscpd achou 90 clones; Madge achou 2 ciclos; há 728 ocorrências de `: any` fora de testes/tipos gerados.

**Gaps para 10:** complexidade não limitada; arquivos grandes; duplicação de guards/forms/containers; dívida de tipos e dead code não bloqueados.

**Ações:** budgets por arquivo/função; refatoração por seams; módulos comuns; dependency-cruiser/Madge no CI; backlog com owner/data.

### 13. Operacionalidade — 4,0/10

**Evidências:** runbooks de incidentes, rotação e promoção de banco; circuit breakers em partes do código. O endpoint vivo se recuperou, mas o workflow histórico está vermelho, `APP_URL` é ausente, rollback <5 min não foi demonstrado e staging não está comprovado.

**Gaps para 10:** deploy reproduzível; canary/rollback; feature flags controladas; on-call/escalation; testes de runbook.

**Ações:** release checklist; game day; feature flags; kill switches; promoção por ambiente; MTTR medido.

### 14. Performance — 5,0/10

**Evidências:** lazy loading, manual chunks e cache. O build gera chunks de 382 KB e 288 KB gzip e precache ~12 MB; há 254 `.select('*')`, poucas paginações e nenhuma evidência de top-20 EXPLAIN.

**Gaps para 10:** orçamento de bundle; paginação universal; queries selecionando colunas; Web Vitals/RUM; índices validados por workload.

**Ações:** imports sob demanda de Excel/PDF/gráficos; budget CI; keyset pagination; RUM; pg_stat_statements + EXPLAIN.

### 15. Qualidade de código — 5,0/10

**Evidências:** ESLint, Prettier, Husky e testes existem. Lint aceita 18 warnings e reporta 14; regras de `any` e unused estão desligadas; testes/E2E são ignorados; ainda há consoles diretos.

**Gaps para 10:** zero-warning; lint type-aware; cobertura de todos os arquivos; error handling padronizado; secret scanning afinado.

**Ações:** ratchet de warnings; configs por camada; lint staged; logger único; TODOs ligados a issues; quality gate no PR.

### 16. Segurança — 2,5/10

**Evidências:** CORS allowlist, CSRF, HMAC webhook, limite de payload, deny/allowlists, headers e auditores existem. Entretanto, houve vazamento anônimo confirmado por quatro views, RPCs privilegiadas sem autorização, ACL padrão excessiva, CVE alta em `sharp`, CSP com `unsafe-inline` e credenciais administrativas expostas nesta conversa que exigem rotação.

**Gaps para 10:** fechar exposições vivas; rotação comprovada; grants/RLS/RPCs verdes; zero CVE alta; CSP com nonce/hash; upload com magic bytes/antimalware; pen test.

**Ações:** atualizar sharp; sanear e rotacionar; `.gitleaks.toml` mínimo; endurecer CSP; quarentena de upload; ASVS/OWASP testado.

### 17. Testes — 6,5/10

**Evidências:** 4.853 unitários aprovados, typecheck dedicado e Playwright por papel/mobile. Cobertura global está em 60,94/56,11/53,72/65,26; serviços relevantes ficam abaixo de 40%; E2E remoto nem inicia; testes de banco cobrem só 3 migrations.

**Gaps para 10:** integração com Postgres real; E2E verde; RLS por papel; contrato; carga; flakiness tracking; cobertura crítica ≥80%.

**Ações:** Testcontainers/Supabase local; contas descartáveis; coverage por diretório crítico; Pact/contratos; k6; quarantine com prazo.

### 18. Tipagem / Type Safety — 3,5/10

**Evidências:** `strict` e `noImplicitAny` ativos e typecheck de app/testes/E2E aprovado. Porém os tipos gerados divergem materialmente do canônico: 8 tabelas e 26 funções existem só nos tipos; 17 tabelas e 158 funções existem só no banco. Código produtivo chama objetos ausentes.

**Gaps para 10:** codegen a partir do baseline promovido; gate de drift; remover chamadas a objetos inexistentes; DTOs de Edge Functions compartilhados; runtime validation uniforme; reduzir `any` e assertions.

**Ações:** orçamento decrescente de `any`; unknown+guards; contratos Zod; codegen no CI; habilitar flags por pasta; lint type-aware.

### 19. Validação — 5,5/10

**Evidências:** 127 usos de Zod e 42 de DOMPurify/sanitização; validadores de CPF/CNPJ/periódicos; limits no gateway. Não há prova de validação server-side em toda mutation ou magic-byte/antimalware em todo upload.

**Gaps para 10:** inventário de entradas; schemas compartilhados; transição de estado; limites uniformes; mensagens/erros tipados.

**Ações:** registry de comandos; schema por endpoint; testes fuzz/property; validação de arquivo; constraints equivalentes no banco.

### 20. Operações do time — 4,5/10

**Evidências:** CONTRIBUTING, CODEOWNERS, Dependabot, workflows e runbooks. Há regras de branch, mas bypass administrativo precisa ser eliminado/verificado; oito issues de healthcheck duplicadas estão abertas; nenhum PR aberto corrige os vermelhos.

**Gaps para 10:** SLA de review/on-call; ownership de checks; post-mortem; backlog técnico único; gestão de incidentes sem tempestade.

**Ações:** branch ruleset sem bypass permanente; issue template/label bootstrap; SLA; calendário de segurança/deps; release notes e post-mortem.

### 21. Acessibilidade e UX inclusiva — 5,5/10

**Evidências:** há atributos ARIA/labels e referências a axe, mas a superfície é grande (mais de mil botões em busca textual) e apenas uma fração dos fluxos tem auditoria automatizada. Não há evidência de WCAG 2.2 AA completa, navegação por teclado ou leitores de tela.

**Gaps para 10:** baseline axe por rota; foco/modal; contraste; teclado; mensagens de erro anunciadas; mobile/zoom; testes manuais assistivos.

**Ações:** axe no Playwright; checklist WCAG; componentes acessíveis canônicos; teste NVDA/VoiceOver; orçamento zero violações críticas.

### 22. Privacidade e LGPD operacional — 2,5/10

**Evidências:** página/serviços LGPD, mascaramento de PII, logs de acesso e sete jobs de retenção/saúde existem. Porém CPF, nome e e-mail foram acessíveis sem login; `lgpd_retencao_logs` e as RPCs de limpeza usadas pela Edge Function não existem; há logs com e-mail/URL e nenhuma prova de eliminação em backups.

**Gaps para 10:** eliminar exposição anônima; tornar retenção executável e testada; governança, minimização, finalidade, DSAR, matriz de retenção, eliminação em backups e processo de incidente.

**Ações:** mapa de dados; DPIA; matriz de retenção; testes de DSAR; pseudonimização; redaction de logs; drill de vazamento.

## 6. Scorecard consolidado

|   # | Dimensão                 |        Nota |   Peso | Gap principal                                         |
| --: | ------------------------ | ----------: | -----: | ----------------------------------------------------- |
|   1 | Arquitetura              |         6,0 |      2 | boundaries/ciclos/componentes grandes                 |
|   2 | Autenticação             |         4,0 |      3 | RPCs de lockout ausentes/reset público                |
|   3 | Autorização              |         2,0 |      3 | vazamentos anônimo e cross-tenant confirmados         |
|   4 | Banco de dados           |         3,0 |      2 | migrations/tipos/Storage não reproduzem canônico      |
|   5 | CI/CD                    |         5,5 |      1 | pipelines essenciais vermelhos/permissivos            |
|   6 | Integridade de dados     |         3,0 |      3 | 11 selagens quebradas e triggers desabilitados        |
|   7 | Documentação             |         6,0 |      1 | duplicação, ausência de OpenAPI/ADRs                  |
|   8 | Infraestrutura/DevOps    |         3,5 |      1 | IaC placeholder e ambientes não comprovados           |
|   9 | Logging/Monitoring       |         4,5 |      1 | PII, N RPCs e correlação fraca                        |
|  10 | Observabilidade          |         3,5 |      1 | SQL público, métrica inválida e ausência de SLO       |
|  11 | Lógica de negócio        |         6,5 |      1 | fonte única/state machines                            |
|  12 | Manutenibilidade         |         4,5 |      1 | arquivos grandes, any, clones e ciclos                |
|  13 | Operacionalidade         |         4,0 |      1 | deploy/rollback/staging não demonstrados              |
|  14 | Performance              |         5,0 |      1 | bundle/precache e queries amplas                      |
|  15 | Qualidade de código      |         5,0 |      1 | lint permissivo e warnings aceitos                    |
|  16 | Segurança                |         2,5 |      3 | PII anônima, RPCs privilegiadas, ACL e CVE            |
|  17 | Testes                   |         6,5 |      2 | E2E remoto/integrados/cobertura                       |
|  18 | Tipagem                  |         3,5 |      2 | tipos divergem de tabelas/RPCs vivas                  |
|  19 | Validação                |         5,5 |      2 | cobertura server-side/uploads                         |
|  20 | Operações do time        |         4,5 |      1 | incidentes duplicados e governança                    |
|  21 | Acessibilidade/UX        |         5,5 |      1 | WCAG não comprovada                                   |
|  22 | Privacidade/LGPD         |         2,5 |      1 | PII pública e retenção referenciando objetos ausentes |
|     | **Nota geral ponderada** | **4,11/10** | **35** | **falhas P0 comprovadas no banco vivo**               |

Cálculo: soma ponderada 144 ÷ peso total 35 = 4,1143.

## 7. Top 10 ações por ROI

| Ordem | Ação                                                                  | Impacto | Esforço     | Por quê agora                                   |
| ----: | --------------------------------------------------------------------- | ------- | ----------- | ----------------------------------------------- |
|     1 | Rotacionar senha/JWT administrativo expostos no chat                  | crítico | baixo       | encerra credencial comprometida                 |
|     2 | Revogar acesso `anon` às views e testar HTTP sem JWT                  | crítico | baixo       | fecha vazamento confirmado de PII/SQL           |
|     3 | Revogar RPCs públicas e autorizar internamente `SECURITY DEFINER`     | crítico | médio       | impede fraude, destruição e bypass de lockout   |
|     4 | Corrigir `search_path` e aprovar os 11 smokes de hash                 | crítico | baixo/médio | restaura integridade criptográfica              |
|     5 | Corrigir RLS/ACLs e executar matriz negativa por papel/tenant         | crítico | alto        | fecha vazamento autenticado/cross-tenant        |
|     6 | Fixar o Supabase canônico e impedir o ref divergente de `origin`      | crítico | baixo       | evita operar o banco errado                     |
|     7 | Criar baseline/squash em staging descartável                          | crítico | alto        | torna restore e novo ambiente reproduzíveis     |
|     8 | Criar os 15 buckets e objetos/RPCs ausentes pelo baseline aprovado    | crítico | médio       | remove falhas de runtime certas                 |
|     9 | Gerar tipos do staging e bloquear drift/DB gates no CI                | crítico | médio       | CI verde passa a representar o banco real       |
|    10 | Atualizar `sharp`, configurar E2E/`APP_URL` e corrigir health/metrics | alto    | baixo/médio | fecha security e valida o sistema ponta a ponta |

## 8. Roadmap de correção

### Onda 1 — Quick Wins, 1–3 dias

Etapas E-001 a E-010 do plano:

- rotação das credenciais expostas e congelamento da entrada de PII real;
- bloqueio imediato das views anônimas e RPCs privilegiadas vulneráveis;
- correção de `search_path` e execução dos 11 smokes de hash;
- fixação do projeto canônico, CVE alta, E2E, `APP_URL` e healthcheck.

**Checkpoint da onda:** zero linha sensível sem JWT; zero RPC crítica sem autorização; 11/11 smokes de hash; credenciais rotacionadas; URL canônica validada.

### Onda 2 — Sprint 1, 1–2 semanas

Etapas E-011 a E-055:

- autenticação/autorização e banco;
- baseline/migrations;
- RLS real e integridade;
- CI, testes integrados e cobertura crítica.

**Checkpoint da onda:** restore reproduzível em staging hospedado descartável; todos os gates de DB verdes; E2E por papel; nenhum Edge typecheck informativo.

### Onda 3 — Sprint 2, 2–4 semanas

Etapas E-056 a E-100:

- arquitetura/manutenibilidade;
- performance e observabilidade;
- IaC/operação/documentação;
- acessibilidade e LGPD;
- recertificação final.

**Checkpoint da onda:** nota reavaliada ≥8,0 sem P0/P1 aberto; SLOs ativos; bundle dentro do orçamento; DR/rollback/DSAR exercitados.

## 9. Decisão de promoção

**NÃO PROMOVER** o estado atual a produção e **NÃO EXECUTAR** `supabase db push` ou `migration repair` em massa. A promoção só deve ocorrer quando:

1. o projeto canônico for inequívoco;
2. nenhuma view retornar PII, auditoria ou SQL sem autenticação e autorização;
3. RPCs privilegiadas, RLS, ACLs e os 11 smokes de hash estiverem verdes;
4. Security, E2E e healthcheck estiverem verdes;
5. o baseline for restaurado em staging hospedado descartável;
6. constraints, buckets, tipos e ledger passarem nos gates;
7. houver rollback e evidências anexadas ao release.

## 10. Nota final de maturidade

**4,11/10 — base funcional relevante, mas segurança e reprodutibilidade incompatíveis com dados reais.** O produto não é um protótipo simples: há cobertura funcional extensa, controles e automação. Porém, a validação viva provou vazamento anônimo, acesso autenticado sem tenant, RPCs privilegiadas inseguras, selagem quebrada e forte drift de schema. O caminho para 8/10 começa por conter os P0, reconstruir o banco a partir de baseline único e tornar os gates fail-closed; somente depois vêm refatoração estrutural, SLOs, DR recorrente, acessibilidade e LGPD demonstráveis.
