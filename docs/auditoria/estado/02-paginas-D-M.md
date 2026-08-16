# Frontend — Páginas, lote 2/3 (`src/pages/`, arquivos D–M)

## 1. Cobertura

**Escopo:** 34 arquivos `src/pages/[D-M]*.tsx` (`ls -1 src/pages | grep -E '^[D-M]'` = 34).

**Lidos integralmente (18):** `DashboardPage`, `DashboardExecutivoPage`, `DepartamentosPage`, `DescontosPage`,
`EmpresasPage`, `EscalasPage`, `ExamesPage`, `FeriadosPage`, `FeriasProgramacaoPage`, `FolhaPage`,
`FolhaCompliancePage`, `FolhaPagamentoPage`, `GeradorDocumentosPage`, `HoleritesPage`, `HorasExtrasPage`,
`IntegracoesPage`, `JornadasPage`, `LocaisTrabalhoPage`, `LotacoesPage`, `MovimentacoesPage`.

**Amostrados por seção + grep dirigido (imports/`from()`/`rpc()`/`mutate`/botões sem `onClick`/blocos hardcoded) (14):**
`DesignSystemPage`, `DesligamentosPage`, `DespesasPage`, `DocumentosPage`, `EPIsPage`, `ESocialPage`,
`EmpresaFormPage`, `FaltasPage`, `FeriasPage`, `FinanceiroBancarioPage`, `ImportacaoPage`, `LGPDPage`,
`LoginPage`, `MedidasDisciplinaresPage`.

**Fora do meu escopo mas lidos como dependência:** `src/App.tsx` (só rotas), `services/baseService.ts`,
`services/{documento,empresa,folha,ferias,despesa,epis,faltas,medidasDisciplinares,lgpd,cnab,esocial}Service.ts`,
`hooks/{useExecutiveDashboard,useProgramacaoFerias,useImportacaoColaboradores,useGenericCrud}.ts`,
`components/esocial/ESocialAIInsights.tsx`, `components/dashboard/WorkforceHealthScore.tsx`.

**Banco:** consultado AO VIVO em somente-leitura (project `frjbfeamybqsejlvmqbl`) para contagens, existência de
colunas/views/RPCs e buckets de storage. Zero DDL/DML.

**Não executado:** build, typecheck, lint, testes (`node_modules` ausente — briefing). Nenhuma afirmação de
compilação neste relatório.

---

## 2. Tabela de funcionalidades

| Funcionalidade (página) | Classificação | Evidência (arquivo:linha / objeto de banco) | O que falta |
|---|---|---|---|
| **DashboardPage** (`/dashboard`) | `IMPLEMENTADO_PARCIAL` | rota `App.tsx:196`; queries `DashboardPage.tsx:72-82`; `colaboradores=13`, `folhas_pagamento=4`, `ferias=12`, `banco_horas=25` | Trends `+2,5%` e `-1,2%` **hardcoded** (`:260`,`:263`); sparkline fixa em zeros (`:186`); `vw_kpi_turnover`/`vw_kpi_absenteismo` retornam **0 linhas** → absenteísmo sempre `0` (`:103`); wizard navega para `/empresas/nova` (`:192`) e a rota é `empresas/novo` (`App.tsx:228`) → 404; queries 72-82 sem `.eq('empresa_id')` |
| **DashboardExecutivoPage** (`/dashboard-executivo`) | `IMPLEMENTADO_PARCIAL` | rota `App.tsx:197`; `useExecutiveDashboard.ts:39-50` | Card "Plano de Sustentabilidade de Pessoal" **100% fictício** (`:294-335`: score `9.2/10`, "42% da receita", "+ R$ 128k em Dez/26", recomendação literal "economizando R$ 12k/mês"); absenteísmo vem de `batidas_ponto` que tem **0 linhas** (`useExecutiveDashboard.ts:45`, dado real está em `registros_ponto=120`); orçamento fabricado quando `personnel_budget` (=0) não tem linha (`:262`); botão "Ajustar Metas" sem `onClick` (`:288`); atalho navega para `/folha-pagamento` (`:380`) — rota inexistente → 404 |
| **DepartamentosPage** (`/departamentos`) | `IMPLEMENTADO_PARCIAL` | rota `App.tsx:233`; `useDepartamentos.ts:1-12` → `departamentoService`; `departamentos=10` | Sem exclusão na UI; os 10 registros são carga de seed (§3.1) |
| **DescontosPage** (`/descontos`) | `IMPLEMENTADO_PARCIAL` | rota `App.tsx:408`; `DescontosPage.tsx:40,53,64,80`; `emprestimos_consignados=7`, `adiantamentos_salariais=4` | Badge "Financial Wellness Hub 10/10 Ativado" é texto fixo (`:126`); `update` de status sem filtro de tenant (`:96-100`, só `.eq('id')`); sem edição/exclusão |
| **DesignSystemPage** (`/design-system`) | `SUGERIDO_OU_INICIADO` | rota `App.tsx:413`; tokens estáticos `:14-42`; nenhuma query | Sem entrada no `AppSidebar.tsx` nem no `command-palette.tsx` (só `Breadcrumbs.tsx:22` e `PageTransition.tsx:119`) → alcançável apenas digitando a URL; é styleguide, não funcionalidade de negócio |
| **DesligamentosPage** (`/desligamentos`) | `IMPLEMENTADO_PARCIAL` | rota `App.tsx:208`; `desligamentoService.ts:5` (`super('desligamentos')`); `desligamentos=2` | Os 2 registros são seed (mesmo `created_at`); "Calcular rescisão" só navega para `/calculadora-rescisao` (`:98`,`:218`) — sem vínculo do cálculo ao desligamento |
| **DespesasPage** (`/despesas`) | `IMPLEMENTADO_PARCIAL` | rota `App.tsx:391`; `despesaService.ts:13,26,38,49`; `despesas=8`, `despesas_aprovacoes_log=8`; RPCs `aprovar_despesa`/`rejeitar_despesa` existem | Upload de comprovante grava em bucket `comprovantes-despesas` (`despesaService.ts:86`) — **não existe nenhum bucket** (§3.2) → anexo sempre falha |
| **DocumentosPage** (`/documentos`) | `MORTO_OU_ABANDONADO` | rota `App.tsx:249`; `documentos=0` | **Fio rompido em todas as camadas** (§3.3): a tabela `documentos` não tem `empresa_id` (erro `column "empresa_id" does not exist`) e `documentoService.listarDocumentos` filtra por ela (`documentoService.ts:25`) → listagem sempre erra; `criar()` envia `nome_arquivo/tamanho/mime_type/storage_path` (`DocumentosPage.tsx:117-125`) — colunas inexistentes; `excluir(doc.id)` sem `empresaId` (`:87`) e `baseService.ts:159` lança sempre; bucket `documentos` (`:28`) não existe; "Aplicar ao Cadastro" do OCR só emite toast (`:346-349`) |
| **EPIsPage** (`/epis`) | `MORTO_OU_ABANDONADO` | **ÓRFÃ**: importada em `App.tsx:71`, zero `<Route>` (`grep -c "Component={EPIsPage}" App.tsx` = 0); único outro hit é a própria definição `EPIsPage.tsx:31` | Rota inexistente → `/epis` cai em `NotFoundPage` (`App.tsx:421`). Código completo e `epis=8`/`epis_entregas=8` ficam inacessíveis. `PageTransition.tsx:108` ainda lista `/epis` (config obsoleta) |
| **ESocialPage** (`/esocial`) | `SUGERIDO_OU_INICIADO` | rota `App.tsx:252`; `esocialService.ts:52,281,302,334`; `esocial_eventos=0`, `configuracoes_esocial=0`, `certificados_digitais=0`, `esocial_transmissao_logs=0` | Nunca usado. Diálogo de certificado com dados fixos ("Vencimento: 12/12/2026 (Em 224 dias)", badge "Válido") em `:317-341` com tabela vazia; botão "Upload Novo Certificado (.pfx)" sem `onClick` (`:338`); card "Status do Webservice" com "Operacional" e "Latência 124ms" fixos (`:558-576`) e botão sem `onClick` (`:574`); sidebar `ESocialAIInsights.tsx:7-20` é IA **inteiramente falsa** (§3.4) |
| **EmpresaFormPage** (`/empresas/novo`, `/empresas/editar/:id`) | `IMPLEMENTADO_PARCIAL` | rotas `App.tsx:228-229`; `empresaService.ts:1-9`; `empresas=1` | **Edição sempre falha**: `empresaService.atualizar(id, data)` sem 3º arg (`EmpresaFormPage.tsx:77`) e `baseService.ts:127-130` exige `empresaId` (`requireEmpresaId` default `true`, `baseService.ts:31-32`); além disso `empresas` não possui coluna `empresa_id`. Criação funciona |
| **EmpresasPage** (`/empresas`) | `IMPLEMENTADO_PARCIAL` | rota `App.tsx:227`; `useTodasEmpresas.ts:1-8`; `empresas=1` | Botão "Editar" (`:90`) leva ao formulário cujo submit sempre lança (linha acima) |
| **EscalasPage** (`/escalas`) | `SUGERIDO_OU_INICIADO` | rota `App.tsx:389`; `EscalasPage.tsx:28,39,51`; **`escalas=0`** | Módulo duplicado/abandonado: os dados reais de escala estão em `escalas_trabalho=96`, gravados por `turnoService.ts:42-62` e consumidos por `TurnosPage.tsx:31`. `EscalasPage` é a **única** consumidora de `escalas` (`grep "from('escalas')"` = 3 hits, todos nela). Sem edição |
| **ExamesPage** (`/exames`) | `SUGERIDO_OU_INICIADO` | rota `App.tsx:409`; `ExamesPage.tsx:40,56,76`; **`exames=0`** | Tabela `exames` **não tem coluna `empresa_id`** (verificado no schema) → sem isolamento de tenant; a query nem usa `empresaAtual` (`queryKey: ['exames']`, `:37`) e o insert também não (`:56-64`). Módulo concorrente já povoado: `exames_agendamentos=6`, `asos=6` (usados por `AdminAgendamentoExamesPage`/`AdminAsoWorkflowPage`) |
| **FaltasPage** (`/faltas`) | `MORTO_OU_ABANDONADO` | **ÓRFÃ**: importada em `App.tsx:72`, zero `<Route>`; `faltas=0` | `/faltas` cai em `NotFoundPage`. Pior: `components/dashboard/WorkforceHealthScore.tsx:69` define `route: '/faltas'` e `:142` faz `navigate(m.route)` → clicar no indicador "Absenteísmo" do dashboard leva a 404 |
| **FeriadosPage** (`/feriados`) | `IMPLEMENTADO_PARCIAL` | rota `App.tsx:386`; `FeriadosPage.tsx:33,47`; **`feriados=28`** (maior massa real do lote) | Sem editar/excluir; sem paginação |
| **FeriasPage** (`/ferias`) | `IMPLEMENTADO_PARCIAL` | rota `App.tsx:209`; `feriasService.ts:104`, `useFeriasAprovacao`; `ferias=12`, `periodos_aquisitivos=12`, `ferias_audit_log=12` | `feriasService.syncWithHub` é **stub** (`feriasService.ts:101-114`: faz `select id limit 1` e retorna `recordsUpdated: 0` fixo) — mesmo assim há `setInterval` de 60 s chamando-o (`FeriasPage.tsx:62-77`) e o botão "Sincronizar" exibe "Sincronização concluída com o hub unificado" (`:96`), afirmação sem lastro. Estatísticas (`:131-137`) contam só a página carregada, não o total (comentário admite: "This is local but we might want global stats") |
| **FeriasProgramacaoPage** (`/ferias/programacao`) | `SUGERIDO_OU_INICIADO` | rota `App.tsx:210`; `useProgramacaoFerias.ts:70,122,138-213`; **`ferias_programacao=0`** | Backend pronto (RPCs `programacao_ferias_{mover,aprovar_gestor,aprovar_rh,rejeitar,converter}` existem), mas nenhuma programação foi criada: o kanban abre sempre vazio |
| **FinanceiroBancarioPage** (`/financeiro-bancario`) | `IMPLEMENTADO_PARCIAL` | rota `App.tsx:222`; `cnabService.ts:81,115,126,199`; `cnab_remessas=3`, `cnab_configuracoes=1`, `pix_lotes=2` | **A página nunca carrega dados**: `loadData` chama `folhaService.list()` **sem argumentos** (`FinanceiroBancarioPage.tsx:77`) e `folhaService.ts:31` faz `if (!empresaId) throw` → o `Promise.all` (`:73-78`) rejeita e o `catch` (`:83-85`) descarta config/remessas/PIX, exibindo "Erro ao carregar dados bancários" |
| **FolhaCompliancePage** (`/folha/compliance`) | `SUGERIDO_OU_INICIADO` | rota `App.tsx:218`; `FolhaCompliancePage.tsx:88`; **`vw_folha_compliance` = 0 linhas** | A view nunca terá linhas: `audit_log` tem 281 registros mas **nenhum** com `acao` em `PAYROLL_CALC/CLOSE/REOPEN` (só `INSERT/UPDATE/DELETE/VISUALIZACAO`). O docstring `:7` promete "validação client-side do `integrity_hash`", mas o código só **imprime** o hash com um `ShieldCheck` verde incondicional (`:244-251`) — badge de conformidade sem verificação |
| **FolhaPagamentoPage** (`/folha/calcular`) | `IMPLEMENTADO_PARCIAL` | rota `App.tsx:217`; `folha_itens=12`, `folhas_pagamento=4` | Pipeline **fabricado**: `ponto:'importado'`, `lancamentos:'conferido'`, `beneficios:'processado'` derivam só de `colaboradores > 0` (`:88-94`); mutation `calcularFolha` (`:111-132`) **não é chamada em lugar nenhum** do JSX (código morto) e, se fosse, faria `insert({competencia, tipo})` sem `empresa_id` (`:124`); botão "Importar Ponto" sem `onClick` (`:201-204`); `.eq('folha.competencia', …)` sem `!inner` (`:66-67`) não filtra de fato; texto fixo "Motor de cálculo validado pela Portaria 671 MTP" (`:265`) |
| **FolhaPage** (`/folha`) | `IMPLEMENTADO_PARCIAL` | rota `App.tsx:216`; `useFolha.ts:1-11` → `folhaService`; `folhas_pagamento=4` | As 4 folhas são fixtures (ids `dd000000-0000-0000-0000-00000000000X`, mesmo `created_at`); botão "olho"/card mobile navegam para `/folha/calcular` (`:438`,`:458`) em vez de uma tela de detalhe |
| **GeradorDocumentosPage** (`/gerador-documentos`) | `IMPLEMENTADO_PARCIAL` | rota `App.tsx:250`; PDF client-side `:32-164`; lê `colaboradores` (`:176`) | O PDF gerado **não é persistido** (nenhum `insert`, nenhum upload) → não há rastro; badges de categoria são `cursor-pointer` sem `onClick` (`:220-225`) → filtro inexistente; ignora `contrato_templates=5` usando 8 templates hardcoded (`:21-30`) |
| **HoleritesPage** (`/holerites`) | `IMPLEMENTADO_PARCIAL` | rota `App.tsx:410`; `HoleritesPage.tsx:32`; `folha_itens=12` | Filtro de competência **não funciona**: `.filter('folha.competencia','eq',mes)` sem `!inner` (`:38`) apenas anula o objeto embutido, mantendo a linha-pai; sem `empresa_id` na query; tabela `holerites` existe e está vazia (0) — a página lê `folha_itens` |
| **HorasExtrasPage** (`/horas-extras`) | `IMPLEMENTADO_PARCIAL` | rota `App.tsx:385`; `useHorasExtras.ts:2,16,21` → `horaExtraService`; **`solicitacoes_hora_extra=15`** | Dados de seed; sem paginação/filtro; sem vínculo com `banco_horas` |
| **ImportacaoPage** (`/importacao`) | `IMPLEMENTADO_PARCIAL` | rota `App.tsx:263`; `useImportacaoColaboradores.ts:45-72` insere em `colaboradores` | **Métrica de resultado falsa**: `importar()` calcula `successCount` interno mas só o usa num toast e retorna `void` (`hook:70-71`); a página então monta o resultado a partir do status de **validação** das linhas (`ImportacaoPage.tsx:38-42`) → se todos os inserts falharem, a tela ainda exibe "N sucessos / 0 erros" |
| **IntegracoesPage** (`/integracoes`) | `IMPLEMENTADO_PARCIAL` | rota `App.tsx:414`; painéis reais Bitrix24/WhatsApp/CNAB/Webhooks (`:61-136`) | `integracoesFixas` (`:27-31`) tem status **hardcoded** — inclusive `eSocial: 'ativo'`, contradito por `esocial_eventos=0` e `configuracoes_esocial=0`; os 3 cards renderizados por esse array têm botão "Configurar" **sem `onClick`** (`:153`) |
| **JornadasPage** (`/jornadas`) | `SUGERIDO_OU_INICIADO` | rota `App.tsx:387`; `JornadasPage.tsx:29,39,51`; **`jornadas=0`** | CRUD parcial (sem edição) sobre tabela nunca usada |
| **LGPDPage** (`/lgpd`, admin) | `SUGERIDO_OU_INICIADO` | rota `App.tsx:257`; `lgpdService.ts:6,15,33,42`; **`lgpd_consentimentos=0`, `lgpd_solicitacoes=0`** | "Score de Conformidade LGPD" quase constante: 3 de 8 checks são `ok: true` literais e 3 são `ok: false` literais (`:480-489`) — só 1 depende de dado real; `MAPEAMENTO_DADOS` (`:52-88`) é estático e cita `batidas_ponto` (0 linhas); ignora `lgpd_politicas_retencao=3` |
| **LocaisTrabalhoPage** (`/locais-trabalho`) | `IMPLEMENTADO_PARCIAL` | rota `App.tsx:235`; `useLocaisTrabalho.ts:1-11`; **`locais_trabalho=5`** | Sem edição (apenas criar/excluir); dados de seed |
| **LoginPage** (`/login`) | `IMPLEMENTADO_PARCIAL` | rota `App.tsx:178`; `supabase.rpc('check_rate_limit')` (`:183`, RPC existe); `profiles=2`, `user_roles=4`, `login_lockouts=3`, `rate_limits=3` | Feature list de marketing afirma "eSocial 100% Integrado" (`:23`) com o módulo em zero uso; login gov.br chama edge function `auth-gov-br` (`:88`) — **deploy `NAO_VERIFICADO`** (sem PAT para listar functions) |
| **LotacoesPage** (`/lotacoes`) | `SUGERIDO_OU_INICIADO` | rota `App.tsx:234`; `LotacoesPage.tsx:27,38,45`; **`lotacoes=0`** | Nunca usada; sem edição |
| **MedidasDisciplinaresPage** (`/medidas-disciplinares`) | `SUGERIDO_OU_INICIADO` | rota `App.tsx:400`; `medidasDisciplinaresService.ts:24,93,126-181`; **`medidas_disciplinares=0`** | Backend rico (10 RPCs `medida_*`/`sugerir_proxima_medida` existem, tabela com 55 colunas de workflow) e **zero uso**; geração de PDF (`:138`) e anexos gravam nos buckets `medidas-disciplinares`/`medidas-contestacoes` (`service:118,197,238`) — **nenhum bucket existe** (§3.2) |
| **MovimentacoesPage** (`/movimentacoes`) | `SUGERIDO_OU_INICIADO` | rota `App.tsx:401`; `MovimentacoesPage.tsx:35,46,56,65`; **`transferencias=0`, `promocoes=0`** | Nunca usada; sem edição/exclusão; não atualiza `colaboradores.cargo`/`salario_base` ao registrar promoção |

**Placar do lote:** `IMPLEMENTADO_TOTAL` **0** · `IMPLEMENTADO_PARCIAL` **18** · `SUGERIDO_OU_INICIADO` **12** ·
`MORTO_OU_ABANDONADO` **3** (DocumentosPage, EPIsPage, FaltasPage). *(EPIs e Faltas somam 2 das 3 órfãs; a 3ª,
DocumentosPage, é roteada mas com o fio rompido em toda a pilha.)*

---

## 3. Achados graves

### 3.1 — CRÍTICO · Nenhuma tabela do lote contém dado de uso real: é tudo carga de seed
Prova direta em `colaboradores`: 12 dos 13 registros têm UUID sequencial `11110000-…-0000000000NN`, CPF
sequencial `123.456.789-01` a `-12` e nomes de demonstração ("Ana Silva Santos", "João Pedro Santos"), todos com
o mesmo `created_at = 2026-07-27 11:01:59`. As 4 `folhas_pagamento` têm IDs `dd000000-0000-0000-0000-00000000000X`
e `created_at` idêntico. `folha_itens` (12), `ferias` (12), `despesas` (8), `registros_ponto` (120) e
`desligamentos` (2) têm **um único `created_at` distinto** cada — inserção em lote.
**Consequência para a rubrica:** mesmo as 18 páginas com tabela `N>0` não podem ser `IMPLEMENTADO_TOTAL`,
porque o critério "com dado real no banco" não é satisfeito por fixtures.

### 3.2 — CRÍTICO · Não existe nenhum bucket de storage: toda funcionalidade de arquivo está morta
`select count(*) from storage.buckets` → **0**; `storage.objects` → **0**; policies em `storage` → **0**.
Dependem de bucket, e portanto falham em runtime:
- `DocumentosPage.tsx:28,112,115,163` (bucket `documentos`) — upload, URL assinada, download;
- `despesaService.ts:86,94` (`comprovantes-despesas`) — anexo de comprovante em `DespesasPage.tsx:75`;
- `medidasDisciplinaresService.ts:118,197,238` (`medidas-disciplinares`, `medidas-contestacoes`) — PDF e
  anexos de contestação em `MedidasDisciplinaresPage.tsx:138`;
- upload de certificado `.pfx` no `ESocialPage.tsx:338`.
Observação: o `CLAUDE.md` afirma que a migração `20260723113000` criou o bucket `ferias-avisos`; ele **não
existe** em produção — coerente com o briefing (30 migrations registradas × 641 arquivos no repo).

### 3.3 — CRÍTICO · `DocumentosPage` está quebrada em todas as camadas (schema × código divergentes)
A tabela `documentos` tem 11 colunas (`id, colaborador_id, nome, tipo, url, validado, validado_por,
data_validade, observacoes, created_at, updated_at`). Não existe `empresa_id` — confirmado por erro do
Postgres: `column "empresa_id" does not exist`.
1. **Listar:** `documentoService.ts:25` faz `.eq('empresa_id', empresaId)` → erro em toda carga da página.
2. **Criar:** `DocumentosPage.tsx:117-125` envia `nome_arquivo`, `tamanho`, `mime_type`, `storage_path` —
   nenhuma dessas colunas existe → insert sempre rejeitado.
3. **Excluir:** `DocumentosPage.tsx:87` chama `documentoService.excluir(doc.id)` sem `empresaId`, e
   `baseService.ts:156-160` lança `empresa_id obrigatório para excluir documentos` (default
   `requireEmpresaId = true`, `baseService.ts:31-32`).
4. **OCR:** `DocumentosPage.tsx:346-349` — "Aplicar ao Cadastro" só chama `toast.info(...)` e fecha o diálogo;
   nada é gravado no colaborador.
Causa raiz do silêncio do TypeScript: `types/entities.ts:84-92` declara `Documento` **com** `empresa_id?`,
enquanto o `types.ts` gerado do banco (linha ~`documentos: { Row: {…} }`) não o tem — o tipo escrito à mão mente.

### 3.4 — ALTA · Dado fictício apresentado como informação operacional em 6 telas
| Onde | Conteúdo inventado |
|---|---|
| `DashboardExecutivoPage.tsx:294-335` | "Score de Risco **9.2/10**", "Custos fixos representam **42% da receita bruta**", "Impacto previsto: **+ R$ 128k em Dez/26**", recomendação em aspas "reduzir horas extras em 15%, economizando R$ 12k/mês" |
| `components/esocial/ESocialAIInsights.tsx:7-20,58` | "Insights da IA" totalmente hardcoded, citando colaborador literal **"João Silva"** com atestado a expirar, "3 rubricas" e "Ver todos os insights (12)" — sem nenhuma chamada de IA ou query |
| `ESocialPage.tsx:326-334, 558-576` | Certificado "e-CNPJ … Vencimento 12/12/2026 (Em 224 dias) — Válido" com `certificados_digitais=0`; "Gov.br Gateway: Operacional" e "Latência 124ms" fixos |
| `DashboardPage.tsx:186,260,263` | Variação "vs mês anterior" fixa em `+2,5%` / `-1,2%`; sparklines constantes em zero |
| `IntegracoesPage.tsx:27-31` | Status "eSocial: **ativo**" hardcoded, contradito pelas tabelas do módulo (todas em 0) |
| `LGPDPage.tsx:480-489` | 6 dos 8 itens do "Score de Conformidade LGPD" são booleanos literais → score praticamente constante |
| `FolhaPagamentoPage.tsx:88-94` | Pipeline "ponto importado / lançamentos conferidos / benefícios processados" derivado apenas de `colaboradores > 0` |

### 3.5 — ALTA · Páginas órfãs com prova de ausência de rota
`grep -c "Component={EPIsPage}" src/App.tsx` = **0** e `grep -c "Component={FaltasPage}" src/App.tsx` = **0**,
apesar de ambas serem importadas (`App.tsx:71` e `App.tsx:72`). O `grep -rn "EPIsPage\|FaltasPage" src/` retorna
apenas o import e a própria definição (`EPIsPage.tsx:31`, `FaltasPage.tsx:42`). Logo `/epis` e `/faltas` caem no
catch-all `App.tsx:421` → `NotFoundPage`. Agravante: `components/dashboard/WorkforceHealthScore.tsx:69` define
`route: '/faltas'` e `:142` executa `navigate(m.route)` — o indicador "Absenteísmo" do dashboard leva a 404.
`components/layout/PageTransition.tsx:106,108` ainda lista `/faltas` e `/epis` como rotas conhecidas.

### 3.6 — ALTA · Três fios rompidos que fazem ações "de sucesso" não persistirem
1. **Editar empresa nunca grava** — `EmpresaFormPage.tsx:77` chama `empresaService.atualizar(id, data)` com 2
   argumentos; `baseService.ts:127-130` lança quando `requireEmpresaId` (default `true`) e `empresaId` ausente.
   `empresaService.ts:4-9` não desliga a flag. E a tabela `empresas` (26 colunas) não tem `empresa_id`, então
   nem passando o argumento a query funcionaria.
2. **Financeiro Bancário nunca carrega** — `FinanceiroBancarioPage.tsx:77` chama `folhaService.list()` sem
   argumentos; `folhaService.ts:31` lança `empresa_id obrigatório…`; o `Promise.all` (`:73-78`) rejeita inteiro
   e o `catch` (`:83`) descarta config, remessas e lotes PIX.
3. **Importação reporta sucesso que não aconteceu** — `useImportacaoColaboradores.ts:45-72` conta os inserts
   bem-sucedidos numa variável local usada só em `toast.success`, e devolve `void`; `ImportacaoPage.tsx:38-42`
   monta a tela final contando linhas com `status === 'valido'` (resultado da **validação**, não da gravação).
   Com 100% dos inserts falhando, a tela ainda mostra "N importados, 0 erros".

### 3.7 — ALTA · Trilha de compliance da folha nunca é alimentada, mas exibe selo de integridade
`vw_folha_compliance` tem 0 linhas porque `audit_log` (281 registros) não possui **nenhuma** ação
`PAYROLL_CALC`, `CLOSE` ou `REOPEN` (só `INSERT/UPDATE/DELETE/VISUALIZACAO`). A `FolhaCompliancePage` promete no
próprio cabeçalho (`:5-8`) "validação client-side do `integrity_hash` (badge de conformidade)", mas o código
apenas renderiza o hash ao lado de um `ShieldCheck` verde incondicional (`:244-251`) — não existe função de
verificação. Como o encerramento de folha (`FolhaPagamentoPage.tsx:165-170`) grava `acao: 'UPDATE'`, a view
seguirá vazia mesmo com uso real.

### 3.8 — MÉDIA · `syncWithHub` é stub e dispara a cada 60 s
`feriasService.ts:101-114`: executa `select id … limit 1` e retorna `{ success: true, recordsUpdated: 0 }`
fixo. `FeriasPage.tsx:62-77` monta um `setInterval(…, 60000)` chamando esse stub e o botão "Sincronizar"
(`:92-97`) exibe "Sincronização concluída com o hub unificado". Nenhuma sincronização existe.

### 3.9 — MÉDIA · Módulos duplicados: a tela roteada aponta para a tabela vazia
| Tela do lote | Tabela que ela usa | Tabela realmente povoada | Quem usa a povoada |
|---|---|---|---|
| `EscalasPage.tsx:28` | `escalas` = **0** | `escalas_trabalho` = **96** | `turnoService.ts:42-62` ← `TurnosPage.tsx:31` |
| `ExamesPage.tsx:40` | `exames` = **0** | `exames_agendamentos`=6, `asos`=6 | `AdminAgendamentoExamesPage` / `AdminAsoWorkflowPage` |
| `GeradorDocumentosPage.tsx:21-30` | templates hardcoded | `contrato_templates` = **5** | `ContratoTemplatesPage` |
| `HoleritesPage.tsx:32` | `folha_itens` | `holerites` = 0 (tabela criada e nunca usada) | — |
| `useExecutiveDashboard.ts:45` | `batidas_ponto` = **0** | `registros_ponto` = **120** | `PontoPage` (outro lote) |
Ou seja: o dashboard executivo calcula absenteísmo sobre a tabela errada e sempre dá 0.

### 3.10 — MÉDIA · Botões e filtros sem handler (UI que promete ação inexistente)
`FolhaPagamentoPage.tsx:201-204` ("Importar Ponto") · `DashboardExecutivoPage.tsx:288` ("Ajustar Metas") ·
`IntegracoesPage.tsx:153` ("Configurar", nos 3 cards fixos) · `ESocialPage.tsx:338` ("Upload Novo Certificado")
e `:574` ("Ver Status da Infraestrutura") · `GeradorDocumentosPage.tsx:220-225` (badges de categoria com
`cursor-pointer` e nenhum filtro). Além disso, `FolhaPagamentoPage.tsx:111-132` (`calcularFolha`) é mutation
**sem chamador** — `grep "calcularFolha" FolhaPagamentoPage.tsx` retorna apenas a definição, a função
server-side homônima e o `onClick` que aponta para a versão server-side (`:208`).

### 3.11 — MÉDIA · Links de navegação para rotas inexistentes
`DashboardPage.tsx:192` → `/empresas/nova` (a rota é `empresas/novo`, `App.tsx:228`) ·
`DashboardExecutivoPage.tsx:380` → `/folha-pagamento` (as rotas são `folha`, `folha/calcular`,
`folha/compliance`) · `WorkforceHealthScore.tsx:69` → `/faltas` (órfã). Os três caem em `NotFoundPage`.

### 3.12 — MÉDIA · Isolamento de tenant ausente em consultas/escritas de página
Sem `empresa_id`: `DashboardPage.tsx:72-82` e `:162-166` · `ExamesPage.tsx:37-46,56-64` (a tabela nem tem a
coluna) · `HoleritesPage.tsx:31-39` · `FolhaPagamentoPage.tsx:115` (`maybeSingle()` global por competência) e
`:124` (insert sem `empresa_id`) · `DescontosPage.tsx:96-100` (update só por `id`).
**Mitigação parcial verificada:** todas essas tabelas têm `relrowsecurity = true` e ≥1 policy, então o vazamento
depende da qualidade das policies — não auditei o conteúdo delas (fora do meu escopo).

---

## 4. Lacunas (o que não consegui verificar e por quê)

1. **Build/typecheck/lint/testes:** `node_modules` ausente (briefing §Toolchain). Não afirmo que nada compila.
   Em especial, não pude confirmar se os erros de tipo dos itens 3.3 e 3.6 são pegos pelo CI ou apenas em runtime.
2. **Deploy das Edge Functions:** `NAO_VERIFICADO`. Sem PAT para a Management API não sei se
   `auth-gov-br` (`LoginPage.tsx:88`), `calcular-folha` (`FolhaPagamentoPage.tsx:142`), `calcular-ferias`
   (`FeriasPage.tsx:116`), `ocr-documento` (`DocumentosPage.tsx:145`) e `enviar-esocial`
   (`esocialService.ts:168`) estão publicadas. Todo caminho que passa por elas fica com estado indeterminado.
3. **Conteúdo das RLS policies:** confirmei apenas *existência* (`relrowsecurity` + contagem em `pg_policies`).
   Não avaliei se as expressões realmente restringem por `empresa_id` — isso muda a severidade do achado 3.12.
4. **Comportamento em runtime dos filtros PostgREST embutidos** (`HoleritesPage.tsx:38`,
   `FolhaPagamentoPage.tsx:66-67`): a análise é estática, baseada na semântica documentada de `!inner`. Sem app
   rodando não executei a requisição para medir o resultado.
5. **Componentes filhos pesados** que essas páginas montam (`components/folha/*` — `CalculoFolhaWizard`,
   `FolhaDashboard`, `FGTSDigitalDashboard`, `MetricasFolhaDashboard`; `components/esocial/tabs/*`;
   `components/descontos/*`; `components/exames/*`) não foram auditados linha a linha — pertencem à dimensão
   "componentes". Só verifiquei o que a página passa para eles e as duas exceções citadas explicitamente
   (`ESocialAIInsights`, `WorkforceHealthScore`), por serem fonte direta de dado fictício e de link morto.
6. **Origem dos dados de seed:** identifiquei o padrão (§3.1) mas não localizei o arquivo de migration/script
   que os inseriu — 641 arquivos de migration contra 30 registradas tornam a rastreabilidade inviável no tempo
   deste lote.
