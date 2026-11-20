# Contexto do projeto para agentes de IA

GERADO AUTOMATICAMENTE por scripts/ai-context/gerar.mjs — não editar à mão; será sobrescrito.
Publicado em `docs/contexto/codigo/` na branch `contexto` (gerada, nunca abra PR dela) a cada push em `main` e a cada 10 minutos pelo workflow `contexto.yml`; índice único das três fontes em `docs/contexto/00-INDEX.md`. Gere local com `node scripts/ai-context/gerar.mjs`. Commit-base: `c33db80722c9722eddda34d96e5f8bf3b96f3d95` (2026-11-20T14:07:16-03:00).

## Como usar (leia antes de planejar ou executar qualquer tarefa)
1. **Tela/rota/menu** → `rotas.json` (url/vista/menu → arquivo → hooks → tabelas → edges; `rotas_http_backend` para APIs) e `modulos.json` (módulo inteiro + dependências entre módulos).
2. **Hook/serviço/lógica** → `hooks.json`, `logica.json` (quem usa, o que toca, se tem teste).
3. **Edge function / serverless** → `edge-functions.json` (verify_jwt, tabelas, env, quem chama, órfãs).
4. **Banco** → `banco.json` (colunas, RLS, policies, índices, FKs, triggers, cron jobs, buckets, drift migration×types, uso no código) — visão do código; para o banco vivo use o MCP.
5. **Antes de criar arquivo** → `convencoes.json` (onde ficam as coisas, nomenclatura, alias), `componentes.json` (nomes duplicados, órfãos), `grafo.json` (hubs, ciclos de import) e `grafo-graphify.json` (grafo por AST: comunidades, símbolos mais chamados, comunidade de cada arquivo).
6. **CI/scripts/deploy/env/integrações/permissões/flags** → `ferramentas.json` e `scripts.json`.
7. **Antes de abrir PR** → `testes.json` (o que tem e não tem teste, onde os testes ficam), `baseline.json` (alertas, TODOs, hotspots, últimos commits).
Os JSONs são grandes: filtre com `grep`/`jq` pelo caminho/arquivo/tabela da sua tarefa; não carregue tudo.

## Stack
- linguagens: TypeScript (1981), SQL (978), Markdown (338), JavaScript (134), JSON (63), Shell (57), YAML (56), Python (5)
- linguagem_principal: TypeScript
- framework: React
- backend_http: n/d
- bundler: Vite
- roteador: react-router
- banco: Supabase
- testes: vitest, playwright
- ui: tailwind, radix/shadcn
- estado: react-query, zustand
- gerenciador_pacotes: npm
- node: 22
- python: n/d
- deploy: vercel, docker, compose/swarm
- monorepo: n/d
- pastas_fonte: src

## Números
| item | qtd |
|---|---|
| arquivos_total | 3662 |
| arquivos_codigo | 2119 |
| linhas_codigo | 422850 |
| rotas | 116 |
| rotas_http_backend | 17 |
| vistas_por_id | 0 |
| itens_menu | 97 |
| modulos | 81 |
| componentes | 641 |
| hooks | 121 |
| edge_functions | 67 |
| tabelas | 430 |
| migrations | 904 |
| cron_jobs | 41 |
| testes | 800 |
| workflows | 21 |
| scripts | 135 |
| docs_md | 338 |

## Onde ficam as coisas
- telas: src/pages (110), src/components (1)
- componentes: src/components (523), src/pages (110), src/contexts (3)
- hooks: src/hooks (101), src/components (10), src/contexts (4)
- servicos_logica: src/services (97), src/utils (35), src/schemas (25)
- testes: co-localizado (__tests__) (669), co-localizado (*.test) (73), e2e/ (33)
- edge_functions: supabase/functions
- migrations: supabase/migrations
- scripts: scripts/simulacao (13), scripts/training-images-local (13), scripts/autofix (10)
- docs: docs (95), (raiz) (32), .github (1)
- nomenclatura: {"componentes":"PascalCase (89%)","hooks":"use + PascalCase","servicos":"camelCase (98%)","edge_functions":"kebab-case (69%)","tabelas":"snake_case (85%)"}
- instruções para agentes no repo: .claude/CLAUDE.md, AGENTS.md, CLAUDE.md

## Módulos (menu → domínio)
| módulo | itens de menu | telas/rotas | arquivos | hooks locais | edges | tabelas |
|---|---|---|---|---|---|---|
| calculators | 0 | 0 | 8 | 0 | 0 | 0 |
| components | 0 | 0 | 7 | 18 | 24 | 7 |
| components/admin | 0 | 0 | 7 | 1 | 0 | 1 |
| components/admissoes | 0 | 0 | 21 | 149 | 9 | 168 |
| components/afastamentos | 0 | 0 | 6 | 9 | 0 | 7 |
| components/avaliacao | 0 | 0 | 83 | 5 | 0 | 11 |
| components/colaborador-detalhes | 0 | 0 | 62 | 160 | 8 | 173 |
| components/colaboradores | 0 | 0 | 9 | 9 | 0 | 3 |
| components/dashboard | 0 | 0 | 21 | 13 | 25 | 63 |
| components/descontos | 0 | 0 | 5 | 0 | 0 | 1 |
| components/desligamentos | 0 | 0 | 18 | 4 | 1 | 6 |
| components/epis | 0 | 0 | 5 | 0 | 0 | 0 |
| components/esocial | 0 | 0 | 21 | 2 | 2 | 7 |
| components/exames | 0 | 0 | 5 | 0 | 0 | 0 |
| components/ferias | 0 | 0 | 22 | 157 | 8 | 137 |
| components/folha | 0 | 0 | 21 | 151 | 13 | 144 |
| components/forms | 0 | 0 | 5 | 0 | 0 | 0 |
| components/layout | 0 | 1 | 28 | 17 | 24 | 6 |
| components/medidas-disciplinares | 0 | 0 | 9 | 147 | 8 | 132 |
| components/notifications | 0 | 0 | 5 | 4 | 0 | 5 |
| components/obrigacoes | 0 | 0 | 5 | 0 | 0 | 0 |
| components/organograma | 0 | 0 | 10 | 2 | 0 | 2 |
| components/pcs | 0 | 0 | 6 | 9 | 0 | 8 |
| components/ponto | 0 | 0 | 19 | 148 | 11 | 134 |
| components/portal | 0 | 0 | 5 | 4 | 3 | 86 |
| components/premiacoes | 0 | 0 | 23 | 148 | 8 | 137 |
| components/recrutamento | 0 | 0 | 26 | 4 | 0 | 5 |
| components/settings | 0 | 0 | 11 | 150 | 32 | 173 |
| components/sst | 0 | 0 | 11 | 6 | 2 | 8 |
| components/treinamentos | 0 | 0 | 47 | 1 | 3 | 82 |
| components/ui | 0 | 0 | 72 | 18 | 2 | 5 |
| hooks | 0 | 0 | 96 | 206 | 13 | 163 |
| hooks/ferias | 0 | 0 | 6 | 11 | 0 | 7 |
| integrations/supabase | 0 | 0 | 6 | 0 | 0 | 0 |
| lib | 0 | 0 | 14 | 1 | 0 | 0 |
| pages | 96 | 114 | 115 | 220 | 50 | 271 |
| schemas | 0 | 0 | 19 | 0 | 0 | 0 |
| schemas/esocial | 0 | 0 | 6 | 0 | 0 | 0 |
| services | 0 | 0 | 78 | 0 | 36 | 195 |
| services/tabelas | 0 | 0 | 8 | 0 | 0 | 47 |
| services/trainingImages | 0 | 0 | 10 | 0 | 0 | 1 |
| types | 0 | 0 | 13 | 0 | 0 | 0 |
| utils | 0 | 0 | 28 | 0 | 0 | 1 |
| utils/importacao | 0 | 0 | 5 | 0 | 0 | 0 |

## Rotas (url → arquivo)
- `/` [tela] → src/components/layout/index.ts (protegida)
- `/` [redirect] → **ARQUIVO NÃO RESOLVIDO** (protegida)
- `/*` [tela] → src/pages/NotFoundPage.tsx (protegida)
- `/admin/diagnostico-migracao` [tela] → src/pages/AdminDiagnosticoMigracaoPage.tsx (protegida)
- `/admin/idempotencia` [tela] → src/pages/AdminIdempotenciaPage.tsx (protegida)
- `/admin/operacao` [tela] → src/pages/AdminOperacaoPage.tsx (protegida)
- `/admin/ponto/divergencias` [tela] → src/pages/AdminPontoDivergenciasPage.tsx (protegida)
- `/admin/security` [tela] → src/pages/AdminSecurityPage.tsx (protegida)
- `/admin/sst/agendamentos` [tela] → src/pages/AdminAgendamentoExamesPage.tsx (protegida)
- `/admin/sst/aso` [tela] → src/pages/AdminAsoWorkflowPage.tsx (protegida)
- `/admin/sst/cat` [tela] → src/pages/AdminCatPage.tsx (protegida)
- `/admin/sst/clinicas` [tela] → src/pages/AdminClinicasPartnersPage.tsx (protegida)
- `/admin/sst/dashboard` [tela] → src/pages/AdminSstDashboardPage.tsx (protegida)
- `/admin/sst/epis` [tela] → src/pages/AdminEpisFichasPage.tsx (protegida)
- `/admin/sst/extintores` [tela] → src/pages/AdminExtintoresPage.tsx (protegida)
- `/admin/sst/regimento` [tela] → src/pages/AdminRegimentoInternoPage.tsx (protegida)
- `/admin/telemetria` [tela] → src/pages/AdminTelemetriaPage.tsx (protegida)
- `/admissoes` [tela] → src/pages/AdmissoesPage.tsx (protegida)
- `/afastamentos` [tela] → src/pages/AfastamentosPage.tsx (protegida)
- `/assinar-contrato/:token` [tela] → src/pages/AssinarContratoPage.tsx
- `/assinaturas` [tela] → src/pages/AssinaturasPage.tsx (protegida)
- `/assistente-ia` [tela] → src/pages/AssistenteIAPage.tsx (protegida)
- `/auditoria` [tela] → src/pages/AuditoriaPage.tsx (protegida)
- `/auth/callback` [tela] → src/pages/AuthCallbackPage.tsx (protegida)
- `/avaliacao` [tela] → src/pages/AvaliacaoPage.tsx (protegida)
- `/avaliacao/ninebox-preview` [tela] → src/pages/NineBoxPreviewPage.tsx (protegida)
- `/backup` [tela] → src/pages/BackupPage.tsx (protegida)
- `/banco-horas` [tela] → src/pages/BancoHorasPage.tsx (protegida)
- `/beneficios` [tela] → src/pages/BeneficiosPage.tsx (protegida)
- `/beneficios/:id/editar` [tela] → src/pages/BeneficioFormPage.tsx (protegida)
- `/beneficios/novo` [tela] → src/pages/BeneficioFormPage.tsx (protegida)
- `/calculadora-rescisao` [tela] → src/pages/CalculadoraRescisaoPage.tsx (protegida)
- `/canal-etica` [tela] → src/pages/CanalEticaPage.tsx (protegida)
- `/cargos` [tela] → src/pages/CargosPage.tsx (protegida)
- `/cargos-salarios` [tela] → src/pages/PlanoCargosSalariosPage.tsx (protegida)
- `/centros-custo` [tela] → src/pages/CentrosCustoPage.tsx (protegida)
- `/ciencia-medida/:token` [tela] → src/pages/CienciaMedidaPage.tsx
- `/colaboradores` [tela] → src/pages/ColaboradoresPage.tsx (protegida)
- `/colaboradores/:id` [tela] → src/pages/ColaboradorDetalhesPage.tsx (protegida)
- `/colaboradores/editar/:id` [tela] → src/pages/ColaboradorFormPage.tsx (protegida)
- `/colaboradores/novo` [tela] → src/pages/ColaboradorFormPage.tsx (protegida)
- `/comunicacao-interna` [tela] → src/pages/ComunicacaoInternaPage.tsx (protegida)
- `/configuracoes` [tela] → src/pages/ConfiguracoesPage.tsx (protegida)
- `/configuracoes/contratos-templates` [tela] → src/pages/ContratoTemplatesPage.tsx (protegida)
- `/contabilidade` [tela] → src/pages/ContabilidadePage.tsx (protegida)
- `/contabilidade/canal` [tela] → src/pages/CanalContabilidadePage.tsx (protegida)
- `/contratacao` [tela] → src/pages/ContratacaoPage.tsx
- `/contratos-gerados` [tela] → src/pages/ContratosGeradosPage.tsx (protegida)
- `/controle-acesso` [tela] → src/pages/ControleAcessoPage.tsx (protegida)
- `/convenios` [tela] → src/pages/ConveniosPage.tsx (protegida)
- `/dashboard` [tela] → src/pages/DashboardPage.tsx (protegida)
- `/dashboard-executivo` [tela] → src/pages/DashboardExecutivoPage.tsx (protegida)
- `/departamentos` [tela] → src/pages/DepartamentosPage.tsx (protegida)
- `/descontos` [tela] → src/pages/DescontosPage.tsx (protegida)
- `/design-system` [tela] → src/pages/DesignSystemPage.tsx (protegida)
- `/desligamentos` [tela] → src/pages/DesligamentosPage.tsx (protegida)
- `/despesas` [tela] → src/pages/DespesasPage.tsx (protegida)
- `/documentos` [tela] → src/pages/DocumentosPage.tsx (protegida)
- `/empresas` [tela] → src/pages/EmpresasPage.tsx (protegida)
- `/empresas/editar/:id` [tela] → src/pages/EmpresaFormPage.tsx (protegida)
- `/empresas/novo` [tela] → src/pages/EmpresaFormPage.tsx (protegida)
- `/epis` [tela] → src/pages/EPIsPage.tsx (protegida)
- `/escalas` [tela] → src/pages/EscalasPage.tsx (protegida)
- `/esocial` [tela] → src/pages/ESocialPage.tsx (protegida)
- `/exames` [tela] → src/pages/ExamesPage.tsx (protegida)
- `/faltas` [tela] → src/pages/FaltasPage.tsx (protegida)
- `/feriados` [tela] → src/pages/FeriadosPage.tsx (protegida)
- `/ferias` [tela] → src/pages/FeriasPage.tsx (protegida)
- `/ferias/programacao` [tela] → src/pages/FeriasProgramacaoPage.tsx (protegida)
- `/financeiro-bancario` [tela] → src/pages/FinanceiroBancarioPage.tsx (protegida)
- `/folha` [tela] → src/pages/FolhaPage.tsx (protegida)
- `/folha/calcular` [tela] → src/pages/FolhaPagamentoPage.tsx (protegida)
- `/folha/compliance` [tela] → src/pages/FolhaCompliancePage.tsx (protegida)
- `/gerador-documentos` [tela] → src/pages/GeradorDocumentosPage.tsx (protegida)
- `/holerites` [tela] → src/pages/HoleritesPage.tsx (protegida)
- `/horas-extras` [tela] → src/pages/HorasExtrasPage.tsx (protegida)
- `/importacao` [tela] → src/pages/ImportacaoPage.tsx (protegida)
- `/integracoes` [tela] → src/pages/IntegracoesPage.tsx (protegida)
- `/jornadas` [tela] → src/pages/JornadasPage.tsx (protegida)
- `/lgpd` [tela] → src/pages/LGPDPage.tsx (protegida)
- `/locais-trabalho` [tela] → src/pages/LocaisTrabalhoPage.tsx (protegida)
- `/login` [tela] → src/pages/LoginPage.tsx
- `/lotacoes` [tela] → src/pages/LotacoesPage.tsx (protegida)
- `/medidas-disciplinares` [tela] → src/pages/MedidasDisciplinaresPage.tsx (protegida)
- `/movimentacoes` [tela] → src/pages/MovimentacoesPage.tsx (protegida)
- `/notificacoes` [tela] → src/pages/NotificacoesPage.tsx (protegida)
- `/obrigacoes-fiscais` [tela] → src/pages/ObrigacoesFiscaisPage.tsx (protegida)
- `/onboarding` [tela] → src/pages/OnboardingPage.tsx (protegida)
- `/organograma` [tela] → src/pages/OrganogramaPage.tsx (protegida)
- `/passivo-trabalhista` [tela] → src/pages/PassivoTrabalhistaPage.tsx (protegida)
- `/pensoes` [tela] → src/pages/PensoesPage.tsx (protegida)
- `/perfil` [tela] → src/pages/PerfilPage.tsx (protegida)
- `/pesquisas-clima` [tela] → src/pages/PesquisasClimaPage.tsx (protegida)
- `/planos-saude` [tela] → src/pages/PlanosSaudePage.tsx (protegida)
- `/ponto` [tela] → src/pages/PontoPage.tsx (protegida)
- `/ponto/kiosk` [tela] → src/pages/PontoKioskPage.tsx (protegida)
- `/portal` [tela] → src/pages/PortalPage.tsx (protegida)
- `/premiacoes` [tela] → src/pages/PremiacoesPage.tsx (protegida)
- `/promo-brindes` [tela] → src/pages/PromoBrindesPage.tsx (protegida)
- `/promo-brindes/vinculos` [tela] → src/pages/VinculosPromoPage.tsx (protegida)
- `/provisoes` [tela] → src/pages/ProvisoesPage.tsx (protegida)
- `/recrutamento` [tela] → src/pages/RecrutamentoPage.tsx (protegida)
- `/relatorios` [tela] → src/pages/RelatoriosPage.tsx (protegida)
- `/rubricas` [tela] → src/pages/RubricasPage.tsx (protegida)
- `/seguranca` [tela] → src/pages/SegurancaPage.tsx (protegida)
- `/seguros-vida` [tela] → src/pages/SegurosVidaPage.tsx (protegida)
- `/sindicatos` [tela] → src/pages/SindicatosPage.tsx (protegida)
- `/sst` [tela] → src/pages/SSTPage.tsx (protegida)
- `/times` [tela] → src/pages/TimesPage.tsx (protegida)
- `/treinamentos` [tela] → src/pages/TreinamentosPage.tsx (protegida)
- `/turnos` [tela] → src/pages/TurnosPage.tsx (protegida)
- `/usuarios` [tela] → src/pages/UsuariosPage.tsx (protegida)
- `/vales` [tela] → src/pages/ValesPage.tsx (protegida)
- `/verificar-contrato` [tela] → src/pages/VerificarContratoPage.tsx
- `/verificar-contrato/:hash` [tela] → src/pages/VerificarContratoPage.tsx
- `/workflows` [tela] → src/pages/WorkflowsPage.tsx (protegida)

## Rotas HTTP de backend
- `GET /{t}` → scripts/ai-context/cenarios.mjs
- `GET /a` → scripts/ai-context/cenarios.mjs
- `GET /a` → scripts/ai-context/cenarios.mjs
- `POST /b` → scripts/ai-context/cenarios.mjs
- `POST /b` → scripts/ai-context/cenarios.mjs
- `DELETE /c` → scripts/ai-context/cenarios.mjs
- `PUT /d` → scripts/ai-context/cenarios.mjs
- `GET /items` → scripts/ai-context/gerar.unit.mjs
- `GET /u` → scripts/ai-context/cenarios.mjs
- `GET /users` → scripts/ai-context/cenarios.mjs
- `POST /users/:id` → scripts/ai-context/cenarios.mjs
- `GET /x` → scripts/ai-context/cenarios.mjs
- `GET ${SUPABASE_URL}/rest/v1/empresas?select=id` → e2e/public/api-auth-errors.spec.ts
- `GET ${SUPABASE_URL}/rest/v1/empresas?select=id` → e2e/public/api-auth-errors.spec.ts
- `GET ${SUPABASE_URL}/rest/v1/empresas?select=id&limit=1` → e2e/public/api-auth-errors.spec.ts
- `POST ${SUPABASE_URL}/rest/v1/rpc/get_user_roles` → e2e/public/api-auth-errors.spec.ts
- `POST ${SUPABASE_URL}/rest/v1/rpc/get_user_roles` → e2e/public/api-auth-errors.spec.ts

## Vistas por id (menu/ViewRouter → arquivo)
- (nenhum)

## Edge functions
- `OCR` — tabelas: -; chamada por 1 arquivo(s) do front
- `adiantamento-salarial` — tabelas: adiantamentos_salariais, auditoria, colaboradores, parametros_sistema; chamada por 1 arquivo(s) do front
- `admissao-publica` (verify_jwt=false) — tabelas: admissao_tokens; chamada por 1 arquivo(s) do front
- `alertas-dp` — tabelas: asos, colaboradores, notificacoes, user_empresas, user_roles, v_login_anomalies; chamada por 1 arquivo(s) do front
- `alertas-preditivos` — tabelas: afastamentos, colaboradores, desligamentos, faltas, notificacoes, registros_ponto; chamada por 1 arquivo(s) do front
- `assinaturaDigital` — tabelas: admissao_tokens, audit_log; chamada por 1 arquivo(s) do front
- `assistente-ia` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `auditoria` — tabelas: auditoria; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `auth-gov-br` (verify_jwt=false) — tabelas: colaboradores, govbr_auth_state, profiles; chamada por 2 arquivo(s) do front
- `auth-login` (verify_jwt=false) — tabelas: -; chamada por 0 arquivo(s) do front
- `backup` — tabelas: audit_log, user_roles; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `backup-automatico` — tabelas: audit_log; chamada por 1 arquivo(s) do front
- `cache` — tabelas: -; chamada por 1 arquivo(s) do front
- `calcular-13-salario` — tabelas: audit_log; chamada por 1 arquivo(s) do front
- `calcular-ferias` — tabelas: audit_log, colaboradores, ferias, periodos_aquisitivos, registros_ponto; chamada por 1 arquivo(s) do front
- `calcular-folha` — tabelas: adiantamentos_salariais, audit_log, beneficios_colaborador, colaboradores, dependentes, emprestimos_consignados, eventos_variaveis, feriados, folha_itens, folha_lock_conflicts, folhas_pagamento, pensoes, registros_ponto, vales_alimentacao, vales_transporte; chamada por 1 arquivo(s) do front
- `calcular-provisoes` — tabelas: colaboradores, empresas, provisao_logs, provisoes_competencia_tributaria; chamada por 1 arquivo(s) do front
- `calcular-rescisao` — tabelas: audit_log, colaboradores; chamada por 1 arquivo(s) do front
- `cnab-remessa` — tabelas: auditoria, cnab_itens, cnab_remessas; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `consultarCEP` — tabelas: -; chamada por 1 arquivo(s) do front
- `consultarCNPJ` — tabelas: -; chamada por 1 arquivo(s) do front
- `criptografia` — tabelas: -; chamada por 1 arquivo(s) do front
- `dctfweb` — tabelas: auditoria, dctfweb_declaracoes; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `distribuir-holerites` — tabelas: colaboradores, folhas_pagamento, holerite_distribuicoes, holerites, notificacoes; chamada por 1 arquivo(s) do front
- `emprestimo-consignado` — tabelas: auditoria, colaboradores, convenios, emprestimos_consignados; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `enviar-email-admissao` — tabelas: admissao_tokens, admissoes, audit_log, notificacoes_admissao; chamada por 1 arquivo(s) do front
- `enviar-esocial` — tabelas: audit_log, configuracoes_esocial, esocial_eventos, esocial_transmissao_logs; chamada por 1 arquivo(s) do front
- `enviar-relatorio` — tabelas: afastamentos, audit_log, colaboradores, ferias, folhas_pagamento, log_envio_relatorios, relatorios_agendados, report_dispatch_attempts; chamada por 1 arquivo(s) do front
- `exportacao` — tabelas: audit_log, colaboradores, folhas_pagamento; chamada por 1 arquivo(s) do front
- `external-db-bridge` — tabelas: query_telemetry; chamada por 1 arquivo(s) do front
- `fechar-folha` — tabelas: audit_log, folhas_pagamento, provisoes_mensais; chamada por 1 arquivo(s) do front
- `fgts-digital` — tabelas: auditoria, fgts_digital_logs, guias_fgts_digital; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `folha-metrics` — tabelas: audit_log, idempotency_keys; chamada por 1 arquivo(s) do front
- `gerar-aej` — tabelas: aej_geracoes, batidas_ponto, colaboradores, empresas, pii_access_logs, registros_ponto; chamada por 1 arquivo(s) do front
- `gerar-afd` — tabelas: afd_geracoes, batidas_ponto, colaboradores, empresas, pii_access_logs; chamada por 1 arquivo(s) do front
- `gerar-contrato-pdf` — tabelas: admissoes, contrato_templates, contratos_gerados; chamada por 1 arquivo(s) do front
- `gerar-guias` — tabelas: audit_log, colaboradores, logs_integracoes; chamada por 1 arquivo(s) do front
- `gerar-holerite` — tabelas: audit_log, beneficios_colaborador, colaboradores, dependentes, registros_ponto; chamada por 1 arquivo(s) do front
- `gerar-ltcat-os` — tabelas: empresas, sst_ltcat_laudos, sst_ordens_servico, user_empresas; chamada por 1 arquivo(s) do front
- `gerar-medida-disciplinar-pdf` — tabelas: audit_log, colaboradores, empresas, medidas_disciplinares; chamada por 1 arquivo(s) do front
- `gerar-pgr` — tabelas: empresas, sst_programas, sst_riscos_ambientais, user_empresas; chamada por 1 arquivo(s) do front
- `healthcheck` (verify_jwt=false) — tabelas: colaboradores, health_checks, query_telemetry; chamada por 1 arquivo(s) do front
- `importacao` — tabelas: audit_log; chamada por 1 arquivo(s) do front
- `integracao` — tabelas: audit_log, integracao_logs, integracoes; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `limpeza` — tabelas: auditoria, blocked_ips, login_attempts, rate_limit_logs, user_roles, user_sessions, verification_tokens; chamada por 1 arquivo(s) do front
- `metricas` — tabelas: colaboradores, esocial_eventos, metricas_processamento, mv_folha_summary, mv_telemetry_dashboard, query_telemetry; chamada por 2 arquivo(s) do front
- `metrics` (verify_jwt=false) — tabelas: colaboradores, health_checks, mv_telemetry_dashboard, query_telemetry; chamada por 0 arquivo(s) do front
- `notificacao` — tabelas: audit_log, fila_notificacoes, notificacoes, user_empresas; chamada por 1 arquivo(s) do front
- `pagar-desligamento` — tabelas: desligamentos; chamada por 1 arquivo(s) do front
- `parse-afdt` — tabelas: afdt_importacoes, afdt_registros_raw, user_empresas; chamada por 1 arquivo(s) do front
- `pix-lote` — tabelas: auditoria, pix_itens, pix_lotes; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `process-document-ocr` — tabelas: -; chamada por 1 arquivo(s) do front
- `processar-agendamentos` — tabelas: fila_notificacoes, log_envio_relatorios; chamada por 1 arquivo(s) do front
- `processar-ponto` — tabelas: banco_horas, banco_horas_config, batidas_ponto, colaboradores, escalas_trabalho, feriados, jornadas, jornadas_horarios, registros_ponto; chamada por 1 arquivo(s) do front
- `processar-ponto-offline` — tabelas: batidas_ponto, colaboradores, user_empresas; chamada por 1 arquivo(s) do front
- `rateLimit` — tabelas: -; chamada por 1 arquivo(s) do front
- `reabrir-folha` — tabelas: audit_log, folhas_pagamento; chamada por 1 arquivo(s) do front
- `relatorio` — tabelas: audit_log, auditoria_logs, colaboradores, ferias_solicitacoes, folhas_pagamento, registros_ponto; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `sincronizar-bitrix` — tabelas: audit_log, bitrix24_config, bitrix24_sync_logs, colaboradores, departamentos; chamada por 2 arquivo(s) do front
- `tabelas-dominio` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `training-image-dispatch` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `training-image-generate` — tabelas: user_empresas, user_roles; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `upload-certificado` — tabelas: certificados_digitais; chamada por 1 arquivo(s) do front
- `validar-biometria` — tabelas: batidas_ponto, colaboradores; chamada por 1 arquivo(s) do front
- `warmup` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `webhook` (verify_jwt=false) — tabelas: webhook_logs; chamada por 0 arquivo(s) do front
- `whatsapp-send` — tabelas: whatsapp_mensagens_logs, whatsapp_templates; chamada por 1 arquivo(s) do front

## Cron jobs (pg_cron / vercel)
- `audit_log_monthly_purge` 0 3 1 * * (20260713124728_fc2bfdf0-5cb2-4318-b4d4-e4b1130bb95b.sql)
- `check_idempotency_anomalies_hourly` 5 * * * * (20260712203121_8562a409-33b5-4785-ace8-f055d7993a92.sql)
- `check-idempotency-anomalies` */15 * * * * (20260712215808_8c16ff4b-eb80-4fbb-a8c6-c15c62ed93c7.sql)
- `cleanup-govbr-states-daily` 15 3 * * * (20260619153616_ccd53f76-f658-4c97-9927-a18db4890cfc.sql)
- `cleanup-logs-daily` 15 3 * * * (20260712215808_8c16ff4b-eb80-4fbb-a8c6-c15c62ed93c7.sql)
- `cleanup-logs-sistema-daily` 30 3 * * * (20260619153616_ccd53f76-f658-4c97-9927-a18db4890cfc.sql)
- `cleanup-rate-limits-daily` 30 3 * * * (20260712215808_8c16ff4b-eb80-4fbb-a8c6-c15c62ed93c7.sql)
- `cleanup-security-logs-daily` 0 3 * * * (20260619153616_ccd53f76-f658-4c97-9927-a18db4890cfc.sql)
- `contrato_lembretes_diario` 0 12 * * * (20260723153630_589ecf53-494d-4834-9e63-d6f4fa1c7822.sql)
- `contratos-alertar-vencimentos` 0 11 * * * (20260723145602_c2a61f2e-7f49-48f4-9c44-b2fec580f43f.sql)
- `contratos-lembretes-assinatura` 0 12 * * * (20260723150213_fc3a2a61-bdf1-4e5f-ad3b-b1da5024d07a.sql)
- `ferias_reconciliacao_sla_alert_daily` 15 11 * * * (20260723123724_8ddc1fd5-3f13-4300-a3b0-7252e47bd6a7.sql)
- `ferias_reconciliar_folha_daily` 15 6 * * * (20260723122004_a4ca3997-6386-4cc6-b575-576a9434188d.sql)
- `ferias-atualizar-status-diario` 30 3 * * * (20261012130000_rotinas_agendadas_falhando.sql)
- `lgpd-cleanup-daily` 15 4 * * * (20260712215808_8c16ff4b-eb80-4fbb-a8c6-c15c62ed93c7.sql)
- `lgpd-fila-drenagem-daily` 45 4 * * * (20261013130000_fix_broken_cron_jobs.sql)
- `lovable-audit-retention-daily` 0 3 * * * (20260712232544_936c8e57-5bce-4539-80fa-e174ecf3ac9b.sql)
- `lovable-check-idempotency-anomalies` */5 * * * * (20260712222151_51c839c6-b3da-4861-afdc-3000fbbfcd7e.sql)
- `lovable-cleanup-security-logs` 0 */6 * * * (20260712222151_51c839c6-b3da-4861-afdc-3000fbbfcd7e.sql)
- `lovable-ia-provisao-alertas` 0 5 * * * (20260712222151_51c839c6-b3da-4861-afdc-3000fbbfcd7e.sql)
- `lovable-lgpd-cleanup-queue` 0 2 * * * (20260712222151_51c839c6-b3da-4861-afdc-3000fbbfcd7e.sql)
- `lovable-log-retention` 0 3 * * * (20260712223051_0c34a43a-072a-4c06-8ff7-f2ac782d9041.sql)
- `lovable-purge-idempotency-keys` */15 * * * * (20260712222151_51c839c6-b3da-4861-afdc-3000fbbfcd7e.sql)
- `lovable-purge-lock-conflicts` 15 3 * * * (20260712222151_51c839c6-b3da-4861-afdc-3000fbbfcd7e.sql)
- `lovable-purge-security-data` 0 * * * * (20260712222151_51c839c6-b3da-4861-afdc-3000fbbfcd7e.sql)
- `notificar-ferias-pagamento-d5` 0 11 * * 1-5 (20260723121100_ab96c1dd-5f9e-48e3-8540-f31915b8a419.sql)
- `pii-access-anomaly-daily` 15 6 * * * (20261013130000_fix_broken_cron_jobs.sql)
- `purge_expired_idempotency_keys_daily` 15 3 * * * (20260712202243_a08e07a3-e8ff-4ca2-90c9-a2119f0b21b1.sql)
- `purge-idempotency-daily` 0 3 * * * (20260712215808_8c16ff4b-eb80-4fbb-a8c6-c15c62ed93c7.sql)
- `purge-lock-conflicts-daily` 45 3 * * * (20260712215808_8c16ff4b-eb80-4fbb-a8c6-c15c62ed93c7.sql)
- `purge-pii-access-logs-daily` 20 3 * * * (20260830000002_plano100_e036_pii_access_logs.sql)
- `purge-rate-limits-hourly` 7 * * * * (20260728175807_7e07b595-24a3-4d07-a361-45daedacd333.sql)
- `purge-security-data-daily` 0 4 * * * (20260712215808_8c16ff4b-eb80-4fbb-a8c6-c15c62ed93c7.sql)
- `refresh-dashboard-mvs-daily` 0 5 * * * (20261013130000_fix_broken_cron_jobs.sql)
- `refresh-mv-folha` 0 5 * * * (20261018130000_onda4e_objetos_ausentes.sql)
- `refresh-telemetry-mv` */30 * * * * (20261013130000_fix_broken_cron_jobs.sql)
- `sec-audit-policies-daily` 0 4 * * * (20260912203000_p1_security_cron_contract.sql)
- `sec-policy-regressions-purge` 30 4 * * 0 (20260912203000_p1_security_cron_contract.sql)
- `sec-verify-seals-weekly` 15 3 * * 1 (20260912203000_p1_security_cron_contract.sql)
- `status_anomalies_scan` */10 * * * * (20260713124926_a1152a5e-9744-4462-9fc2-f423c57445bb.sql)
- `weekly-analyze-critical-tables` 0 4 * * 0 (20260712232250_7c362241-4abe-4970-956e-c985f2c1e683.sql)

## Integrações externas
- SDKs: Sentry, Supabase, react-query, zod
- hosts mais citados: departamento-pessoal-v3.vercel.app, example.test, lovable.app, test.supabase.co, api.resend.com, unified-harmony-hub.lovable.app, api.openai.com, api.deepseek.com, brasilapi.com.br, example.invalid, frjbfeamybqsejlvmqbl.supabase.co, hooks.test, id-preview--6b75936b-47df-442a-8778-2840c71d84af.lovable.app, randomuser.me, signed.url
- webhooks recebidos: admissao-publica, auth-gov-br, auth-login, healthcheck, metrics, webhook
- env de integração (só nomes): AI_GATEWAY_API_KEY, CRON_SECRET, DEEPSEEK_API_KEY, E2E_PONTO_HASH_SECRET, GOVBR_CLIENT_ID, GOVBR_CLIENT_SECRET, OPENAI_API_KEY, PONTO_HASH_SECRET, REPORT_SCHEDULER_SECRET, RESEND_API_KEY, SENTRY_DSN, SENTRY_ENVIRONMENT, SENTRY_RELEASE, SLACK_WEBHOOK_URL, TRAINING_IMAGE_DISPATCH_SECRET, TURNSTILE_SECRET_KEY, VITE_AUTH_GOOGLE_ENABLED, VITE_SENTRY_DSN, VITE_SENTRY_ORG, VITE_SENTRY_PROJECT, VITE_SENTRY_RELEASE, WEBHOOK_REQUIRE_TIMESTAMP, WEBHOOK_SECRET

## Permissões / papéis
- papéis no código: dialog (37), rh (27), admin (23), alert (23), user (22), gestor (13), tablist (10), progressbar (8), group (7), status (7), tab (7), menuitem (5), row (5), combobox (4), service_role (4), cell (3), columnheader (3), list (3), rowgroup (3), switch (3), table (3), grid (2), listitem (2), system (2), agent (1), alertdialog (1), anon (1), assistant (1), authenticated (1), banner (1), button (1), ci_auditor (1), colaborador (1), coordenador (1), heading (1), img (1), main (1), option (1), sup (1), supabase_admin (1), super_admin (1), supervisor (1), tabpanel (1), tooltip (1)
- enums de papel: app_role: admin|moderator|user|supervisor|coordenador; dp_user_role: colaborador|gestor|rh|auditoria|admin|dpo
- guards: src/components/ProtectedRoute.tsx, src/components/RouteErrorBoundary.tsx · rotas protegidas: 110 · públicas: /assinar-contrato/:token, /ciencia-medida/:token, /contratacao, /login, /verificar-contrato, /verificar-contrato/:hash
- feature flags: FEATURE_X, nova-tela, novo-inbox

## Alertas (baseline.json → alertas)
- rotas_sem_arquivo: 0
- componentes_ambiguos: 0
- menu_sem_destino: 1 — ex.: Ações -> /quick-actions
- edges_orfas: 14 — ex.: assistente-ia, auditoria, backup
- edges_chamadas_sem_pasta: 0
- tabelas_sem_rls: 15 — ex.: cbo, cnae, config_retencao
- tabelas_usadas_sem_definicao: 0
- tabelas_com_drift_migration_vs_types: 81 — ex.: admissao_tokens, admissoes, afastamentos
- rpcs_sem_definicao: 4 — ex.: aplicar_medida_folha_ponto, complete_admission_esocial_event, drenar_fila_limpeza_lgpd
- componentes_orfaos: 25 — ex.: src/components/admissoes/OnboardingDashboard.tsx, src/components/animate-ui/components/animate/tabs.tsx, src/components/avaliacao/NineBoxMatrix.tsx
- componentes_com_nome_duplicado: 24 — ex.: AlertasRHWidget, CadastroIncompletoWidget, CamposCustomizadosTab
- scripts_orfaos: 0
- env_usadas_nao_declaradas: 20 — ex.: CI, DEV, GITHUB_ACTIONS
- ciclos_de_import: 4
- possiveis_segredos_no_codigo: 2 — ex.: e2e/public/api-auth-errors.spec.ts:56, scripts/ai-context/cenarios.mjs:120

## Grafo de código (graphify)
- 27755 nós · 62656 arestas · 2409 comunidades · grafo do commit `c33db807`
- comunidades maiores: useEmpresas (655), 20260831_corrected_public.sql (485), canonical_schema.sql (481), vitest (454), lucide-react (426), button.tsx (424), cn (418), nineBoxComum.ts (208), hooks/index.ts (203), react (195), contract.ts (192), App.tsx (191)
- símbolos mais chamados: cn() (src/lib/utils.ts), useEmpresas() (src/hooks/useEmpresas.ts), safeErrorMessage() (src/utils/safeError.ts), validateTablePayload() (src/schemas/validate.ts), entradaCard() (src/components/ui/entrada-cards.tsx), useAuth() (src/contexts/AuthContext.tsx), checkRateLimit() (supabase/functions/_shared/rateLimit.ts), rateLimitResponse() (supabase/functions/_shared/rateLimit.ts), findMockColaborador() (src/mocks/colaboradoresMock.ts), usePiiMask() (src/hooks/usePiiMask.ts), validateInput() (src/schemas/validate.ts), registrarAcessoPII() (src/services/piiAccessLogService.ts)
- consulta local: `graphify query "<pergunta>"`, `graphify path "<A>" "<B>"`, `graphify explain "<X>"`

## Hotspots (arquivos mais alterados, 90 dias)
- .github/workflows/canonical-migrations.yml (28)
- inventario/estado/rotas.json (23)
- scripts/canonical-invariants.sql (16)
- src/pages/ColaboradorDetalhesPage.tsx (12)
- docs/auditoria/MIGRATIONS_ORFAS_MURI_2026-11-16.md (10)
- docs/prod-readiness.md (9)
- package.json (9)
- package-lock.json (8)
- docs/auditoria/sql-preservado/README.md (7)
- src/App.tsx (7)
- src/pages/CalculadoraRescisaoPage.tsx (7)
- src/pages/ColaboradoresPage.tsx (7)
- docs/auditoria/VEREDITO_MURI_2026-11-17.md (6)
- scripts/e2e/ensure-fixtures.mjs (6)
- src/components/colaborador-detalhes/index.ts (6)

## Workflows
- `automation-local.yml` — Automação local (pull_request, push, workflow_dispatch)
- `branch-hygiene-audit.yml` — Branch Hygiene Audit (schedule, workflow_dispatch; cron 56 7 * * 1)
- `canonical-edge-functions.yml` — Canonical Supabase — Edge Functions (pull_request, push, workflow_dispatch)
- `canonical-migrations.yml` — Canonical database — scoped migrations (workflow_dispatch)
- `canonical-probes.yml` — Canonical database — read-only security probes (schedule, workflow_call, workflow_dispatch; cron 23 6 * * 2)
- `canonical-sql-diag.yml` — Canonical database — read-only SQL diagnostic (workflow_dispatch)
- `ci.yml` — Continuous Integration & Delivery (pull_request, push, workflow_dispatch)
- `contexto.yml` — Contexto para agentes de IA (10 min) (push, schedule, workflow_dispatch; cron 3 * * * *)
- `deploy.yml` — Manual & Preview Deploy (pull_request, workflow_dispatch)
- `e2e.yml` — E2E Tests (Playwright) (pull_request, push, workflow_dispatch)
- `gitleaks.yml` — Gitleaks (pull_request, push, workflow_dispatch)
- `healthcheck.yml` — Environment Healthcheck (schedule, workflow_dispatch; cron 17 */6 * * *)
- `inventario-estado-semanal.yml` — Inventário do estado real (semanal) (schedule, workflow_dispatch; cron 23 10 * * 1)
- `notifica-falha-main.yml` — Notifica falha na main (workflow_run)
- `ossf-scorecard.yml` — OSSF Scorecard (schedule, workflow_dispatch; cron 15 7 * * 2)
- `post-deploy-smoke.yml` — Post-deploy smoke (deployment_status)
- `ruleset-sync.yml` — Ruleset sync (schedule, workflow_dispatch; cron 41 7 * * 1)
- `security.yml` — Security Scan & Code Quality (pull_request, push, schedule, workflow_dispatch; cron 47 6 * * 4 | 2 13 * * 1)
- `settings-guard.yml` — Settings Guard (schedule, workflow_dispatch; cron 19 7 * * *)
- `workflow-lint.yml` — Workflow lint (actionlint) (pull_request, workflow_dispatch)
- `workflows-report.yml` — Workflows report (schedule, workflow_dispatch; cron 10 8 * * 3)

## Scripts npm
- `maintenance:doctor`: `sh scripts/maintenance/run.sh doctor --root .`
- `maintenance:check`: `sh scripts/maintenance/run.sh check --root . --ref origin/main`
- `maintenance:heal`: `sh scripts/maintenance/run.sh heal --root . --ref origin/main`
- `test:maintenance`: `node --test scripts/maintenance/maintenance.unit.mjs`
- `dev`: `vite`
- `build`: `node scripts/check-dependencies.js && node scripts/generate-audit-pdf.js && vite build`
- `audit:pdf`: `node scripts/generate-audit-pdf.js`
- `build:dev`: `vite build --mode development`
- `preview`: `vite preview`
- `lint`: `eslint src --ext ts,tsx`
- `lint:edge`: `eslint supabase/functions --ext ts --no-warn-ignored --max-warnings=0`
- `audit:search-path`: `node scripts/audit-db-search-path.mjs`
- `audit:canonical-project`: `node scripts/audit-canonical-project.mjs`
- `audit:canonical-db-url`: `node scripts/validate-canonical-db-url.mjs`
- `audit:bridge-contract`: `node scripts/audit-bridge-frontend-contract.mjs`
- `audit:edge-audit-log`: `node scripts/audit-edge-audit-log-contract.mjs`
- `audit:plan50`: `node scripts/validate-plan-50.mjs`
- `smoke:selos`: `node scripts/smoke-hash-triggers.mjs`
- `audit:rls-pii`: `node scripts/audit-rls-pii.mjs`
- `audit:rls-roles`: `node scripts/audit-rls-least-privilege.mjs`
- `audit:rls-tenant`: `node scripts/audit-rls-tenant-open.mjs`
- `audit:secdef`: `node scripts/audit-secdef-authz.mjs`
- `audit:embeds`: `node scripts/audit-embed-hints.mjs`
- `audit:ratchet-any`: `node scripts/ratchet-any.mjs`
- `audit:ratchet-any-tests`: `node scripts/ratchet-any-tests.mjs`
- `audit:ratchet-warnings`: `node scripts/ratchet-lint-warnings.mjs`
- `audit:types-drift`: `node scripts/audit-types-drift.mjs`
- `verificar:layout`: `node scripts/verificar-layout-protegido.mjs --sem-diff`
- `verificar:tipografia`: `node scripts/verificar-tipografia.mjs`
- `capturar:referencias`: `node scripts/capturar-referencias-protegidas.mjs`
- `lint:ci`: `eslint src --ext ts,tsx --max-warnings=1`
- `format:check`: `prettier --check "src/**/*.{ts,tsx,css,json,md}"`
- `format:check:changed`: `bash scripts/format-check-changed.sh`
- `format:write`: `prettier --write "src/**/*.{ts,tsx,css,json,md}"`
- `gen:table-columns`: `node scripts/gen-table-columns.mjs`
- `typecheck`: `tsc --noEmit`
- `typecheck:tests`: `tsc --noEmit -p tsconfig.tests.json`
- `typecheck:e2e`: `tsc --noEmit -p tsconfig.e2e.json`
- `audit:edge-syntax`: `node scripts/audit-edge-syntax.mjs`
- `typecheck:edge`: `bash scripts/typecheck-edge.sh`
- `ci:verify`: `npm run audit:plan50 && npm run audit:canonical-project && npm run audit:bridge-contract && npm run audit:edge-audit-log && npm run audit:edge-syntax && npm run typecheck:edge && npm run test:rebaseline && npm run typecheck && npm run typecheck:tests && npm run typecheck:e2e && npm run lint:ci && npm run audit:ratchet-any && npm run audit:types-drift && npm run format:check:changed`
- `test`: `vitest`
- `graph:update`: `graphify update .`
- `graph:rebuild`: `graphify update . --force`
- `contexto:ia`: `node scripts/ai-context/gerar.mjs --out docs/contexto/codigo`
- `contexto:ia:test`: `node --test scripts/ai-context/gerar.unit.mjs`
- `inventario:rotas`: `node scripts/inventario/gerar-rotas.mjs`
- `test:coverage`: `vitest run --coverage`
- `test:e2e`: `playwright test`
- `test:lighthouse`: `npm run build && ./node_modules/.bin/lhci autorun`
- `audit:bundle`: `node scripts/check-bundle-budget.mjs`
- `test:e2e:ui`: `playwright test --ui`
- `test:migrations`: `bash scripts/tests/migrations-plano100.sh`
- `test:migrations:p0`: `bash scripts/tests/migrations-p0-hash-search-path.sh`
- `test:migrations:p0:auth`: `bash scripts/tests/migrations-p0-auth-lockout.sh`
- `test:rebaseline`: `node scripts/tests/rebaseline-artifact.test.mjs`
- `test:db-audit-contract`: `bash scripts/tests/db-audit-fail-closed.sh`
- `test:canonical-db-url`: `node scripts/tests/validate-canonical-db-url.test.mjs`
- `test:migrations:pcs`: `bash scripts/tests/migrations-p1-pcs-contract.sh`
- `test:migrations:security-cron`: `bash scripts/tests/migrations-p1-security-cron-contract.sh`
- `test:e2e:public`: `playwright test --project=public`
- `test:e2e:auth`: `playwright test --project=authenticated`
- `test:e2e:mobile`: `playwright test --project=mobile-smoke`
- `test:e2e:report`: `playwright show-report`
- `build:mobile`: `./scripts/capacitor-build.sh`
- `build:mobile:android`: `./scripts/capacitor-build.sh --apk`
- `cap:check`: `./scripts/capacitor-build.sh --check`
- `prepare`: `husky`
- `automation:doctor`: `node scripts/automation.mjs doctor`
- `automation:test`: `node scripts/automation.mjs test`
- `automation:check`: `node scripts/automation.mjs check --ref HEAD`
- `automation:heal`: `node scripts/automation.mjs heal --ref origin/main`
- `automation:nightly`: `node scripts/automation.mjs nightly --ref origin/main`
- `automation:graph`: `node scripts/automation.mjs graph`
- `automation:status`: `node scripts/automation.mjs graph status`
- `automation:install-hooks`: `node scripts/automation.mjs install-hooks`
- `automation:uninstall-hooks`: `node scripts/automation.mjs uninstall-hooks`

## Documentos (raiz e docs/)
- `.github/PULL_REQUEST_TEMPLATE.md` — cole aqui o trecho do log, resultado de query ou request que prova que funciona (29 linhas)
- `AGENTS.md` — AGENTS.md — Departamento_Pessoal_V3 (116 linhas)
- `ARCHITECTURE.md` — Arquitetura e Fluxo de Dados - RH ERP (125 linhas)
- `AUDITORIA.md` — Auditoria total — Departamento Pessoal V3 (414 linhas)
- `AUDITORIA_10_10.md` (71 linhas)
- `AUDIT_REPORT.md` — Auditoria Enterprise e Inventário de Funcionalidades - Sistema de Gestão de RH (69 linhas)
- `BACKLOG_11_ITEMS.md` — BACKLOG — 2 Itens Restantes (70 linhas)
- `BUILD_INSTRUCTIONS.md` — 🚀 Instruções de Build - Sistema Departamento Pessoal (81 linhas)
- `CHANGELOG.md` — Changelog - Sistema Departamento Pessoal (128 linhas)
- `CLAUDE.md` (2 linhas)
- `CODE_OF_CONDUCT.md` — Código de Conduta (24 linhas)
- `CODE_REVIEW.md` — 📋 Code Review Automatizado — Cline (121 linhas)
- `CODE_TODOS.md` — Code TODO (162 linhas)
- `CONTRACT_AUDIT_REPORT.md` — Relatório de Auditoria Técnica e Conformidade de Contratos (61 linhas)
- `CONTRIBUTING.md` — Contribuindo (42 linhas)
- `CRUD_README.md` — 🚀 CRUD Toolkit - DP System (182 linhas)
- `DOCS_GOVBR.md` — Guia Definitivo: Integração Gov.br (SERPRO) - 10/10 (42 linhas)
- `DOCS_MONITORING.md` — Monitoramento e Alertas de Performance (178 linhas)
- `ESTADO_ATUAL.md` — ESTADO ATUAL DO SISTEMA — Departamento Pessoal V3 (370 linhas)
- `MIGRATION_GUIDE.md` — 📚 Guia de Migração - Breaking Changes V18 (313 linhas)
- `PENDENCIAS.md` — PENDENCIAS.md — Itens que dependem do Joaquim ou de ação externa (108 linhas)
- `PLANO_100.md` — Plano de correção — Departamento Pessoal V3 (1233 linhas)
- `PLANO_50.md` — Plano de correção em 50 etapas — Departamento Pessoal V3 (893 linhas)
- `PLANO_MELHORIAS.md` — 🎯 PLANO MESTRE DE MELHORIAS — Departamento Pessoal v2 (1875 linhas)
- `PLANO_REFATORACAO_TIPOS.md` — 📐 Plano de Refatoração: Eliminar `any` em TypeScript (249 linhas)
- `PLANO_REFATORACAO_TIPOS_FASE2.md` — 📐 Plano Fase 2 — Atacar os 1077 `any` restantes (113 linhas)
- `QA_SIMULATION_REPORT.md` — Relatório de QA — Simulação e Auditoria Exaustiva (103 linhas)
- `README.md` — Sistema Departamento Pessoal (36 linhas)
- `RELATORIO_CI.md` — RELATORIO_CI.md — Correção de workflows em falha na main (97 linhas)
- `ROADMAP.md` — Roadmap - Sistema Departamento Pessoal (31 linhas)
- `SCRIPTS_GUIDE.md` — 📦 Guia de Scripts - Package.json (147 linhas)
- `SECURITY.md` — Política de Segurança (21 linhas)
- `SECURITY_AUDIT_REPORT.md` — 🔐 Relatório de Auditoria de Segurança e Backend (801 linhas)
- `docs/ACCESSIBILITY.md` — ♿ ACCESSIBILITY.md - Guia de Acessibilidade (22 linhas)
- `docs/ANALISE_BACKEND_VS_FRONTEND.md` — Análise Exaustiva: Backend vs Frontend (105 linhas)
- `docs/ANALISE_FUNCIONALIDADES_PENDENTES.md` — 🔍 ANÁLISE EXAUSTIVA - FUNCIONALIDADES SUGERIDAS MAS NÃO IMPLEMENTADAS (57 linhas)
- `docs/AUDITORIA_SISTEMA_COMPLETA.md` — 📋 Auditoria Completa do Sistema — Departamento Pessoal (311 linhas)
- `docs/AUDIT_APIS_EXTERNAS.md` — P1-015: Auditoria de Chamadas a APIs Externas (170 linhas)
- `docs/AUDIT_REPORT.md` — 📋 RELATÓRIO DE AUDITORIA - DEPARTAMENTO PESSOAL (116 linhas)
- `docs/AUDIT_REPORT_GITHUB.md` — 🔍 RELATÓRIO DE AUDITORIA GITHUB - DEPARTAMENTO-PESSOAL (185 linhas)
- `docs/AUDIT_REPORT_V7.md` — 🔍 RELATÓRIO DE AUDITORIA COMPLETA V7 (179 linhas)
- `docs/AUTOMACAO_LOCAL.md` — Automação local — Departamento_Pessoal_V3 (224 linhas)
- `docs/BACKUP.md` — 💾 BACKUP.md - Estratégia de Backup (23 linhas)
- `docs/CALCULO_FOLHA.md` — Cálculo de Folha de Pagamento (38 linhas)
- `docs/CALCULO_RESCISAO.md` — Cálculo de Rescisão Trabalhista (44 linhas)
- `docs/CHANGELOG.md` — Changelog (24 linhas)
- `docs/CHANGELOG_QA_V8.1.md` — CHANGELOG - Análise QA V8.1 (157 linhas)
- `docs/CICLOS-PERSISTENCIA-E-EXCLUSAO.md` — Ciclos de avaliação — persistência real e exclusão segura (65 linhas)
- `docs/CODE_REVIEW.md` — Protocolo de Code Review e Excelência Técnica (24 linhas)
- `docs/COMPONENTES.md` — Documentação de Componentes (39 linhas)
- `docs/COMPONENTS.md` — Components (19 linhas)
- `docs/CUTOVER_10_DE_10.md` — Cutover 10/10 — Certificado de conclusão (90 linhas)
- `docs/CUTOVER_VALIDACAO.md` — Checklist de Validação Pós-Cutover (62 linhas)
- `docs/DATABASE.md` — DATABASE (33 linhas)
- `docs/DESENVOLVIMENTO.md` — Guia de Desenvolvimento (36 linhas)
- `docs/DESIGN-SYSTEM-TIPOGRAFIA.md` — Design System — Tipografia oficial (132 linhas)
- `docs/DEVELOPMENT.md` — Guia de Desenvolvimento (52 linhas)
- `docs/E2E_TESTING.md` — Testes End-to-End (E2E) — Playwright (119 linhas)
- `docs/ENVIRONMENT.md` — 🔑 ENVIRONMENT.md (24 linhas)
- `docs/ESOCIAL.md` — Integração eSocial (28 linhas)
- `docs/ESOCIAL_EVENTOS.md` — eSocial - Eventos (34 linhas)
- `docs/EXECUCAO_PLANO_100_2026-08-30.md` — Execução do PLANO_100 — Relatório de 30/08/2026 (158 linhas)
- `docs/FAQ.md` — FAQ - Perguntas Frequentes (34 linhas)
- `docs/FEATURES.md` — Funcionalidades (36 linhas)
- `docs/FERIAS.md` — Férias — Matriz de Conformidade CLT (v31) (80 linhas)
- `docs/FERIAS_PROGRAMACAO.md` — Programação Anual de Férias (53 linhas)
- `docs/FOLHA.md` — Folha de Pagamento (26 linhas)
- `docs/GLOSSARY.md` — Glossário (28 linhas)
- `docs/GUIAS_IMPOSTOS.md` — Guias e Impostos (33 linhas)
- `docs/HOMOLOGACAO-CANCELAMENTO-REAL.md` — Homologação — cancelamento de feedback REAL (125 linhas)
- `docs/HOOKS.md` — Custom Hooks (20 linhas)
- `docs/INDEX.md` — Central de Documentação — Sistema DP (45 linhas)
- `docs/INTEGRACOES.md` — Integracoes Externas - Sistema DP V18 (25 linhas)
- `docs/INTEGRATION.md` — 🔗 INTEGRATION.md - Guia de Integrações (24 linhas)
- `docs/INTEGRATIONS.md` — INTEGRATIONS (33 linhas)
- `docs/LEVANTAMENTO_FUNCIONALIDADES.md` — 📋 LEVANTAMENTO COMPLETO DE FUNCIONALIDADES E FERRAMENTAS (739 linhas)
- `docs/LISTA_ARQUIVOS_PENDENTES_V13.md` — 📁 LISTA DETALHADA DE ARQUIVOS PENDENTES - V13 (447 linhas)
- `docs/MAPA_API.md` — Mapa de API — E-094 (55 linhas)
- `docs/MIGRATION.md` — 🔄 MIGRATION.md - Guia de Migração (22 linhas)
- `docs/MONITORING.md` — 📊 Monitoring & Observability — Departamento Pessoal v2 (256 linhas)
- `docs/NINEBOX-CONCLUSAO-FEEDBACK.md` — Conclusão de feedback — correção definitiva (2026-10-20) (84 linhas)
- `docs/NINEBOX-ESTABILIZACAO-PRODUCAO.md` — Nine-Box — estabilização e reconciliação com o Supabase principal (309 linhas)
- `docs/NINEBOX-OPERACAO-DEFINITIVA.md` — Operação Nine-Box — implementação e evidências (2026-10-20) (227 linhas)
- `docs/ONBOARDING_MODELO_B_DEPRECATED.md` — MODELO B DE ONBOARDING — DEPRECATED (133 linhas)
- `docs/P2-037_TABELAS_DUPLICADAS_ANALISE.md` — P2-037: Consolidação de Tabelas Duplicadas — Análise e Runbook (53 linhas)
- `docs/PERFORMANCE.md` — ⚡ PERFORMANCE.md - Guia de Performance (27 linhas)
- `docs/PONTO.md` — ⏰ PONTO.md - Guia de Ponto (23 linhas)
- `docs/QA_EXHAUSTIVE_REPORT_V26.md` — 🔬 QA Exaustivo V26 — Relatório Final (146 linhas)
- `docs/QA_EXHAUSTIVE_REPORT_V27.md` — QA Exaustivo V27 — Relatório Final (87 linhas)
- `docs/QA_EXHAUSTIVE_REPORT_V28.md` — QA Exaustivo V28 — Etapa 8 (Hardening Final Sustentado) (83 linhas)
- `docs/QA_FERIAS_V31.md` — QA Férias v31 — Etapa 10 (81 linhas)
- `docs/QA_FINAL_REPORT_V8.5.md` — 🏆 RELATÓRIO FINAL QA V8.5 - MISSÃO COMPLETA (176 linhas)
- `docs/README.md` — Sistema Departamento Pessoal (30 linhas)
- `docs/README_FINAL.md` — README_FINAL (33 linhas)
- `docs/RECUPERACAO-FEEDBACKS.md` — Recuperação — feedbacks do ciclo TESTE DEFINITIVO (116 linhas)
- `docs/RELATORIOS.md` — 📊 RELATORIOS.md - Guia de Relatórios (26 linhas)
- `docs/RELEASE_NOTES.md` — Release Notes (27 linhas)
- `docs/RESCISAO.md` — Rescisão (33 linhas)
- `docs/ROADMAP.md` — Roadmap - Departamento Pessoal (26 linhas)
- `docs/ROLLBACK_DRILL.md` — Rollback Drill — Cutover Supabase (58 linhas)
- `docs/SAUDE_OCUPACIONAL.md` — Saúde Ocupacional (34 linhas)
- `docs/SECURITY.md` — Security (21 linhas)
- `docs/SETUP.md` — Setup (14 linhas)
- `docs/SIMULACAO_FOLHA_CENARIOS.md` — Simulação Exaustiva — Fluxo de Folha de Pagamento (155 linhas)
- `docs/SLO.md` — SLOs e Mapa Alerta → Runbook (44 linhas)
- `docs/STYLE_GUIDE.md` — 🎨 STYLE_GUIDE.md - Guia de Estilo (33 linhas)
- `docs/TESTING.md` — Testing (14 linhas)
- `docs/TESTING_GUIDE.md` — 🧪 Guia de Testes - V15 (54 linhas)
- `docs/TROUBLESHOOTING.md` — 🔧 TROUBLESHOOTING.md (27 linhas)
- `docs/UTILS.md` — Documentação de Utilitários (29 linhas)
- `docs/V17_CHECKLIST.md` — ✅ V17 CHECKLIST - IMPLEMENTAÇÃO CONCLUÍDA (176 linhas)
- `docs/V17_INDEX.md` — 📚 V17 - ÍNDICE DE DOCUMENTAÇÃO (48 linhas)
- `docs/VISAO_FUTURA.md` — Visão futura — E-100 (59 linhas)
- `docs/WORKFLOWS.md` — 🔄 WORKFLOWS.md - Fluxos de Trabalho (26 linhas)
- `docs/ninebox-aprovacao-gestor-implantacao.md` — Aprovação do gestor — implantação para a conta de homologação (432 linhas)
- `docs/ninebox-aprovacao-gestor-ui.md` — Nine-Box — Aprovação do gestor na interface (subaba "Aguardando gestor") (100 linhas)
- `docs/ninebox-homologacao-aprovacao-real.md` — Homologação REAL da Aprovação do Gestor — runbook de implantação (207 linhas)
- `docs/ninebox-homologacao-funcional.md` — Nine-Box — Roteiro de homologação funcional (v2 — corrigido) (515 linhas)
- `docs/ninebox-homologacao.md` — Nine-Box — Roteiro de homologação (ambiente isolado) (290 linhas)
- `docs/ninebox-implantacao-minima.md` — Nine-Box · Implantação mínima no Supabase atual (sem Docker, sem segundo projeto) (238 linhas)
- `docs/ninebox-mapa-fontes.md` — Nine-Box — MAPA DEFINITIVO DAS FONTES DE DADOS E CONSISTÊNCIA (158 linhas)
- `docs/ninebox-plano-finalizacao.md` — Nine-Box — Plano de ativação segura da finalização de feedbacks (598 linhas)
- `docs/ninebox-proposta-controles-feedback.md` — Nine-Box · Proposta localizada dos controles de feedback (aguardando aprovação) (176 linhas)
- `docs/prod-readiness.md` — Prontidão para produção — Departamento Pessoal V3 (853 linhas)
- `docs/treinamentos-imagens-fase3a2.md` — Fase 3A.2 — finalização da integração do Hub de imagens (211 linhas)
- `docs/treinamentos-imagens-fase3b-prep.md` — Fase 3B — preparação final (relatório) (133 linhas)
- `docs/treinamentos-imagens-homologacao.md` — Homologação isolada — Hub de imagens (alternativa ao Docker) (233 linhas)
- `docs/treinamentos-imagens.md` — Imagens do Hub de Treinamentos — Fase 2 (auditoria) + preparação da Fase 3 (426 linhas)
- subpastas de docs/: docs/auditoria (67), docs/_archive (41), docs/guides (33), docs/adr (7), docs/agentes (6), docs/contexto (2), docs/lgpd (2), docs/contratos (1), docs/protegido (1), docs/seguranca (1)
- CHANGELOG topo: [22.0.0] - 2026-07-27

## Últimos commits
- 2026-11-20 `c33db80` fix: passa empresaAtual.id para folhaService.list em FinanceiroBancarioPage (#765)
- 2026-11-20 `32be71e` fix: itens 8, 13 e 14 da issue #571 (Avaliação/NineBox) (#764)
- 2026-11-20 `e8fff0c` fix: limpa listarTrilhaMock no beforeEach dos estados da consulta (Auditoria de Admiss?es) (#763)
- 2026-11-19 `cc9b25a` fix: restaura etapas canonicas do pipeline no seed do E2E (#762)
- 2026-11-19 `92ac009` fix(recrutamento): restaura header 'Histórico do processo' no dossiê do candidato (#761)
- 2026-11-19 `c351847` fix(e2e): corrige scroll da lista e overflow do board do pipeline (#760)
- 2026-11-19 `3b4e3cc` fix(e2e): backfill de empresa_id em candidaturas orfas do seed (#759)
- 2026-11-19 `893a2aa` fix(e2e): seed de candidaturas envia empresa_id explícito (#758)
- 2026-11-19 `23cd2e2` fix(e2e): corrige as 2 falhas do pipeline de recrutamento na main (#757)
- 2026-11-19 `c60bf64` fix(onboarding): ancora assercoes do verify na admissao de destino (#756)
- 2026-11-19 `074c01e` infra(banco): inclui a 20261019235900 (dp_*) e a 20261119170000 (onboarding) no lote do canônico (#755)
- 2026-11-19 `b2df382` fix(onboarding): resgata a convergência do modelo legado, sem duplicar histórico (#747)
- 2026-11-19 `49cbb50` infra(banco): versiona o DDL órfão da família dp_* (imutabilidade do log de auditoria) (#751)
- 2026-11-19 `16d4f17` chore(autofix): eslint --fix nas regras seguras (pdiComum, useAfastamentos, colaboradoresMock) (#754)
- 2026-11-19 `21048eb` fix(avaliacao): mescla MOCK_COLABORADORES no modo demo para destravar aprovacao de feedback (E2E :210) (#753)

## Arquivos deste diretório
- `docs/contexto/codigo/rotas.json`
- `docs/contexto/codigo/modulos.json`
- `docs/contexto/codigo/componentes.json`
- `docs/contexto/codigo/hooks.json`
- `docs/contexto/codigo/edge-functions.json`
- `docs/contexto/codigo/banco.json`
- `docs/contexto/codigo/ferramentas.json`
- `docs/contexto/codigo/scripts.json`
- `docs/contexto/codigo/testes.json`
- `docs/contexto/codigo/logica.json`
- `docs/contexto/codigo/grafo.json`
- `docs/contexto/codigo/grafo-arestas.json`
- `docs/contexto/codigo/convencoes.json`
- `docs/contexto/codigo/grafo-graphify.json`
- `docs/contexto/codigo/baseline.json`
- `docs/contexto/codigo/manifest.json` (commit, data, hashes, erros — único arquivo com data/hora)
