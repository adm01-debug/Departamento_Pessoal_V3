# AUDITORIA MASTER - RELATÓRIO COMPLETO DO SISTEMA

**Data:** 2026-07-19  
**Escopo:** Auditoria exaustiva de todo o sistema (frontend, backend, edge functions, banco de dados, cálculos, segurança)  
**Metodologia:** 30+ agentes paralelos auditando cada camada independentemente  
**Total de achados:** 247 falhas documentadas  

---

## SUMÁRIO EXECUTIVO

O sistema apresenta **vulnerabilidades sistêmicas críticas** em múltiplas camadas:

1. **Multi-tenancy quebrado**: ~40 services e ~20 páginas não filtram por `empresa_id`, expondo dados entre empresas
2. **Zero autorização em services**: Nenhum service verifica role/permissão do usuário antes de operar
3. **Cálculos financeiros com erros legais**: INSS/IRRF/FGTS usam `Math.round` ao invés de `Math.trunc` (não conformidade com legislação brasileira)
4. **MFA decorativo**: Configurável mas nunca enforced no login
5. **Race conditions em operações financeiras**: Pagamento de rescisão, folha, CNAB sem idempotência
6. **Dados sensíveis em plaintext**: CPF, PIS, contas bancárias, senhas de certificado sem criptografia

---

## CLASSIFICAÇÃO POR SEVERIDADE

| Severidade | Quantidade | Categorias Principais |
|-----------|-----------|----------------------|
| **CRITICAL** | 52 | Tenant isolation, autorização, cálculos financeiros, escalação de privilégios |
| **HIGH** | 68 | Validação ausente, race conditions, IDOR, XSS, auditoria ausente |
| **MEDIUM** | 82 | Information leakage, tipos inseguros, paginação ausente, memory leaks |
| **LOW** | 45 | Performance, code quality, edge cases menores |

---

## SEÇÃO 1: FALHAS CRITICAL (52 achados)

### 1.1 Multi-Tenancy Quebrado (empresa_id ausente)

#### Services Layer (20 services)

| # | Service | Linhas | Descrição |
|---|---------|--------|-----------|
| C01 | `rescisaoService.ts` | 10-239 | ZERO filtros empresa_id em 8 queries. Qualquer usuário autenticado pode ler/calcular/homologar/assinar/pagar rescisões de qualquer empresa. |
| C02 | `folhaPagamentoService.ts` | 22-104 | `gerarDadosHolerite` e `assinarHolerite` sem empresa_id. Exposição cross-tenant de dados de folha. |
| C03 | `pontoService.ts` | 63-184 | Todas queries filtram apenas por colaboradorId. |
| C04 | `contratacaoService.ts` | 30-204 | Admissão consultada por `id` sem empresa_id. Cross-tenant em geração de contratos, tokens, eSocial. |
| C05 | `edgeFunctionsService.ts` | 26-177 | `limpezaDados`, `gerarHolerite` e múltiplas operações sem empresa_id. |
| C06 | `bancoHorasService.ts` | 4-9 | empresa_id completamente ausente. |
| C07 | `episService.ts` | 5, 42 | empresa_id opcional em ambas listagens. |
| C08 | `faltasService.ts` | 3 | empresa_id opcional. |
| C09 | `medidasDisciplinaresService.ts` | 3 | empresa_id opcional. |
| C10 | `horaExtraService.ts` | 3 | empresa_id opcional. |
| C11 | `turnoService.ts` | 3, 38 | empresa_id opcional. |
| C12 | `intervaloService.ts` | 3 | empresa_id opcional. |
| C13 | `controleAcessoService.ts` | 3 | empresa_id opcional. |
| C14 | `workflowService.ts` | 3, 62 | empresa_id opcional. |
| C15 | `pesquisaService.ts` | 3 | empresa_id opcional. |
| C16 | `avaliacaoService.ts` | 5-81 | empresa_id opcional em TODOS os 5 métodos. |
| C17 | `catalogoCursoService.ts` | 6-105 | empresa_id opcional em 4 métodos. |
| C18 | `lgpdService.ts` | 3, 31 | empresa_id opcional - violação LGPD Art. 37. |
| C19 | `pontoAbertoService.ts` | 4 | empresa_id opcional. |
| C20 | `folhaService.ts` | 10 | empresa_id opcional. |

#### Páginas Frontend (9 páginas P0)

| # | Página | Descrição |
|---|--------|-----------|
| C21 | `DashboardPage.tsx` | 11 queries Supabase sem empresa_id (página mais visitada). |
| C22 | `HoleritesPage.tsx` | Dados de folha (salário, INSS, IRRF, FGTS, CPF) expostos cross-tenant. |
| C23 | `PensoesPage.tsx` | Pensões/alimentos com dados bancários expostos. |
| C24 | `ExamesPage.tsx` | Resultados de exames médicos expostos. |
| C25 | `PortalPage.tsx` | 6 tabelas expostas (ponto, férias, folha, benefícios, comunicados, treinamentos). |
| C26 | `PontoKioskPage.tsx` | Endpoint PÚBLICO consulta TODOS colaboradores globalmente (sem auth). |
| C27 | `OnboardingPage.tsx` | Admissões cross-tenant + mutações sem guarda. |
| C28 | `OrganogramaPage.tsx` | Organograma inteiro exposto (comentário: "Removido filtro empresa_id"). |
| C29 | `UsuariosPage.tsx` | Todos perfis do sistema sem filtro. |

### 1.2 Cálculos Financeiros Incorretos

| # | Arquivo | Linha | Descrição |
|---|---------|-------|-----------|
| C30 | `impostos.ts` | 30 | **INSS usa `Math.round` ao invés de `Math.trunc`** - IN RFB 2110/2022 exige truncamento de centavos. |
| C31 | `impostos.ts` | 59 | **IRRF usa `Math.round` ao invés de `Math.trunc`** - RFB exige truncamento. |
| C32 | `impostos.ts` | 64 | **FGTS usa `Math.round` ao invés de `Math.trunc`** - CEF trunca valores de depósito. |
| C33 | `folhaCompleta.ts` | 46-51 | **Pensão alimentícia não deduzida da base IRRF** - IRRF calculado antes da pensão, resultando em sobre-tributação. |
| C34 | `rescisao.ts` | 41 | **Férias proporcionais errado em múltiplos de 12** - Atribui 12 meses de proporcional quando período está completo (deveria ser 0). |
| C35 | `rescisao.ts` | 47-48 | **Aviso prévio inflado** - Usa `avosTotal` (que arredonda ≥15 dias) para calcular anos de serviço da Lei 12.506, inflando dias de aviso. |
| C36 | `rescisao.ts` | 84-86 | **Seguro desemprego com valores hardcoded/desatualizados** - Faixas 2024, não 2026. |
| C37 | `rescisao.ts` | 88 | **Parcelas seguro desemprego oversimplificado** - Ignora se é 1ª/2ª/3ª+ solicitação. |

### 1.3 Escalação de Privilégios e Autorização

| # | Arquivo | Linha | Descrição |
|---|---------|-------|-----------|
| C38 | `UserRolesTab.tsx` | 29-34 | Qualquer usuário pode conceder role `admin` via upsert direto em `user_roles`. |
| C39 | `edgeFunctionsService.ts` | 94-101 | Operações admin (`limpezaDados`, `backupServidor`, `healthcheck`) sem verificação de role. |
| C40 | `SegurancaPage.tsx` | route | Página admin sensível (IPs bloqueados, tentativas login) NÃO está protegida por `AdminRoute`. |
| C41 | Services (todos) | - | ZERO verificações de autorização em qualquer service. Nenhum chama `getUser()` para verificar permissão. |

### 1.4 Race Conditions em Operações Financeiras

| # | Arquivo | Linha | Descrição |
|---|---------|-------|-----------|
| C42 | `rescisaoService.ts` | 38-108 | Read-then-write sem lock. Pagamentos duplicados possíveis em requisições concorrentes. |
| C43 | `pontoService.ts` | 63-149 | Verificação de duplicata + insert em operações separadas. Batidas duplicadas. |
| C44 | `pontoService.ts` | 114-123 | `ordem` (sequência) read-then-increment sem lock. Sequência corrompida. |
| C45 | `edgeFunctionsService.ts` | 60-72 | Chave de idempotência OPCIONAL para `calcularFolha`. Sem ela, folha processada duas vezes. |
| C46 | `cnabService.ts` | 133-254 | Geração CNAB240 client-side sem idempotência. Pagamentos duplicados. |
| C47 | `cnab-remessa/index.ts` | 124-131 | `sequencial_arquivo` via MAX+1 sem transação. Duplicatas rejeitadas pelo banco. |

### 1.5 Dados Sensíveis Expostos

| # | Arquivo | Linha | Descrição |
|---|---------|-------|-----------|
| C48 | `esocial/tabs.tsx` | 208 | Senha de certificado digital A1 armazenada como plaintext no banco. |
| C49 | `pontoOfflineService.ts` | 11 | Chave AES hardcoded `'lovable-ponto-secure-v1'` no bundle client-side. |
| C50 | `folhaPagamentoService.ts` | 241 | URL de holerite previsível sem token de auth: `holerites/holerite_${folhaId}.pdf`. IDOR. |
| C51 | `client.ts` | 12 | Supabase key hardcoded ao invés de env var (impede rotação sem deploy). |
| C52 | Migration RLS | Múltiplas | `USING(true)` em: `rubricas_folha`, `eventos_variaveis`, `parametros_fiscais`, `lotacoes`, `exames`. |

---

## SEÇÃO 2: FALHAS HIGH (68 achados)

### 2.1 Validação de Input Ausente

| # | Contexto | Descrição |
|---|----------|-----------|
| H01 | 40+ services | Padrão `criar(d: any)` passando dados brutos para `.insert(d)`. Zero schemas Zod/yup. |
| H02 | `contratacaoService.ts:52-54` | Dados de empresa interpolados em HTML template SEM escape. XSS armazenado. |
| H03 | `esocialXmlGenerator.ts:54-134` | Valores interpolados em XML sem escape. XML injection. |
| H04 | `uploadValidation.ts:44` | Verificação MIME bypassed quando `file.type` é vazio. |
| H05 | `cnabService.ts:257-313` | Arquivo retorno CNAB parseado sem validação de header/empresa. Cross-tenant corruption. |
| H06 | Esquemas Zod | CPF valida apenas `min(11)` sem verificação algorítmica. |
| H07 | Esquemas Zod | Datas aceitam qualquer string não-vazia. |
| H08 | eSocial S-2200 | Validador cobre apenas 3 de 40+ campos obrigatórios. |
| H09 | `edgeFunctionsService.ts:87-91` | `tabela` parameter sem allowlist. SQL injection indireto possível. |
| H10 | `integracaoService.ts:70-76` | Webhook URL aceita sem validação de formato/protocolo. SSRF armazenado. |

### 2.2 Auditoria e Logging Ausente

| # | Contexto | Descrição |
|---|----------|-----------|
| H11 | `loggerService.ts:61-67` | **Logger descarta TODOS os logs** - buffer coletado mas nunca persistido. No-op em prod. |
| H12 | `authService.ts` | Alterações de senha e resets sem audit log. |
| H13 | `lgpdService.ts` | Operações LGPD sem log - violação Art. 37. |
| H14 | `esocialService.ts` | Transmissões ao governo sem log de auditoria. |
| H15 | `cnabService.ts` | Geração de arquivos de pagamento sem log. |
| H16 | `pontoService.ts` | Registros de ponto sem trilha de auditoria. |
| H17 | `securityService.ts` | Bloqueio/desbloqueio de IPs sem audit trail. |
| H18 | `folhaPagamentoService.ts:83-111` | `assinarHolerite` (legalmente vinculante) sem auditoria. |

### 2.3 Segurança de Autenticação

| # | Contexto | Descrição |
|---|----------|-----------|
| H19 | `AuthContext.tsx:167` | **MFA nunca enforced no login** - Após signInWithPassword, não verifica AAL level. MFA decorativo. |
| H20 | `useBruteForceProtection.ts:39` | Proteção brute-force fail-open. Se RPC falha, login permitido. |
| H21 | `rateLimit.ts:44-47` | Rate limiter fail-open. Se tabela inacessível, todas requests permitidas. |
| H22 | `get_user_roles` RPC | Aceita qualquer user_id - qualquer autenticado pode ler roles de outros. |
| H23 | `.github/workflows/ci.yml:21` | Credenciais E2E hardcoded com fallback `Admin@2026!`. |
| H24 | `csrf.ts:52` | CSRF permite `localhost` em produção. |

### 2.4 IDOR e Acesso não-autorizado

| # | Contexto | Descrição |
|---|----------|-----------|
| H25 | `pontoService.ts` (todos métodos) | Nenhuma verificação que o usuário autenticado pode registrar ponto para o `colaboradorId` dado. |
| H26 | `folhaPagamentoService.ts:85` | `assinarHolerite` sem verificar que caller É o colaborador ou delegado. |
| H27 | `rescisaoService.ts` (todos métodos) | Qualquer usuário pode homologar/assinar/pagar rescisão de qualquer empresa. |
| H28 | `contratacaoService.ts` (todos métodos) | Gerar contratos, validar documentos, emitir tokens sem role check. |
| H29 | Páginas DELETE/UPDATE | 7 páginas fazem delete por `id` sem empresa_id guard. |

### 2.5 Race Conditions

| # | Contexto | Descrição |
|---|----------|-----------|
| H30 | `pontoOfflineService.ts:106-184` | Sync offline sem mutex. Duas abas enviam duplicatas. |
| H31 | `jornadaHorariosService.ts` | `salvarGrade` delete-then-insert. Data loss em falha parcial. |
| H32 | `bancoHorasConfigService.ts` | Read-then-write duplica configs. |
| H33 | `contratacaoService.ts:84-118` | Metadata overwrite (não merge) em validarDocumento. |
| H34 | `processar-ponto-offline/index.ts:167` | `ordemAtual` computado via MAX sem lock atômico. |

### 2.6 Duplicações e Inconsistências de Cálculo

| # | Contexto | Descrição |
|---|----------|-----------|
| H35 | `trabalhista-base.ts` vs `beneficios.ts` | DUAS funções `calcularHorasExtras` com assinaturas diferentes. Barrel exporta a versão simples. |
| H36 | `trabalhista-base.ts:27` vs `beneficios.ts:88` | DUAS funções `calcularDSR` - barrel exporta versão INSEGURA (sem guard divisão por zero). |
| H37 | `rescisao.ts:152-158` vs `tabelas.ts:32-38` | Faixas PLR duplicadas. Se atualizar uma, outra fica desatualizada. |

### 2.7 Edge Cases que Crasham

| # | Contexto | Descrição |
|---|----------|-----------|
| H38 | `rescisao.ts:82` | `ultimosSalarios.reduce(...) / ultimosSalarios.length` - divisão por zero se array vazio. NaN se propaga. |
| H39 | `trabalhista-base.ts:18` | `salarioBase / jornadaMensal` - sem guard para jornadaMensal ≤ 0. Retorna Infinity. |
| H40 | `trabalhista-base.ts:32` | `totalVariavel / diasUteis` - sem guard divisão por zero (a versão de beneficios.ts TEM guard). |
| H41 | `trabalhista-base.ts:47` | `mesesTrabalhados` sem validação [0,12]. Valores 13 ou -5 produzem resultados incorretos. |

### 2.8 Integrações Externas

| # | Contexto | Descrição |
|---|----------|-----------|
| H42 | `sincronizar-bitrix/index.ts:107` | SSRF: `webhook_url` configurável por usuário usado em fetch sem validação. |
| H43 | `sincronizar-bitrix` + `client.ts` | Nenhum timeout HTTP em chamadas externas. Worker pode ficar preso indefinidamente. |
| H44 | Edge functions (todas) | Circuit breaker existe em lib mas NÃO é usado em edge functions server-side. |
| H45 | `whatsappService.ts:86-119` | Simula envio de mensagem (toast "enviado") sem nunca chamar API real. |
| H46 | `sincronizar-bitrix` | Sem retry/backoff em falhas transientes. Sync parcial silenciosa. |

### 2.9 CNAB/Financeiro

| # | Contexto | Descrição |
|---|----------|-----------|
| H47 | `cnabService.ts:316-351` | PIX batch CSV gerado client-side sem idempotência. Submissão duplicada possível. |
| H48 | `cnabService.ts:276` | Retorno CNAB lookup por `seu_numero` sem scope empresa_id. Cross-tenant data corruption. |

### 2.10 Funcionalidades Fake/Placeholder

| # | Contexto | Descrição |
|---|----------|-----------|
| H49 | Ponto biometria | Scan biométrico completamente simulado (timer auto-avança, qualquer imagem passa). |
| H50 | Ponto batch approve | Aprovação em lote fake (toast only, sem backend call). |
| H51 | `FeriasSaldoReport` | Saldos de férias fabricados (hash do ID do colaborador). |
| H52 | Ponto compliance | Métricas hardcoded ("94.2% Assiduidade", "100% Integridade"). |
| H53 | `FolhaValidationAlerts` | Variação hardcoded (0.35) triggering warning permanente falso. |
| H54 | `esocialEventosPeriodicos.ts:16` | Eventos gerados com `dados: {}` - placeholder que geraria submissions inválidas. |

---

## SEÇÃO 3: FALHAS MEDIUM (82 achados)

### 3.1 Information Leakage (15 achados)

- Raw Supabase errors propagados em 13+ services (expõe nomes de tabelas, colunas, constraints)
- `backupService.ts:46-91` exporta PII (CPF, salários, dados bancários) sem criptografia
- `folhaPagamentoService.ts:76,147,204` vaza status internos e erros de edge function
- Multiple edge function names e error messages propagados ao client

### 3.2 Tipos Inseguros (90+ instâncias)

- `as any` density: `afastamentoService` (10), `batidasPontoService` (8), `premiacoesService` (8), `calculoBeneficiosService` (8), `episService` (10)
- Todos services usam `d: any` para payloads de insert/update
- `auditHelper.ts` usa `any` em funções de assinatura e verificação de integridade

### 3.3 Paginação Ausente (18 services)

`bancoHorasService`, `batidasPontoService`, `controleAcessoService`, `episService`, `faltasService`, `horaExtraService`, `intervaloService`, `jornadaHorariosService`, `medidasDisciplinaresService`, `turnoService`, `lgpdService`, `pontoAbertoService`, `workflowService`, `pesquisaService`, `avaliacaoService`, `catalogoCursoService`, `premiacoesService`, `whatsappService`

### 3.4 Memory Leaks e Race Conditions em Hooks (20 achados)

- `usePontoOffline.ts`: `sync` recriado a cada render, event listener re-registrado
- `useSystemHealth.ts`: Async sem AbortController + wrong empresaId (usa user.id)
- `useESocial.ts`: Queries com null/empty empresa_id
- `useAdmissaoWorkflow.ts`: 4 operações sequenciais sem transação
- `useNotificacoes.ts`: N+1 queries (500 colaboradores = 500 queries)
- `useExecutiveDashboard.ts`: Promise.all com 8+ queries - uma falha mata dashboard inteiro
- 3 páginas com `URL.createObjectURL(blob)` nunca revogado
- 12 páginas com async em useEffect sem AbortController
- `FeriasSyncHub` com setInterval sem cleanup adequado

### 3.5 Datas e Timezone (5 achados)

- `rescisao.ts:12`: DST bug no cálculo de avos (divide ms por 86400000, ignora dias com 23/25h)
- `rescisao.ts:25-26`: Sem validação que dates são válidos. `new Date("invalid")` = NaN silencioso
- `useNotificacoes.ts:139`: `addDays(periodo.data_fim, 365)` ao invés de "12 meses" (leap year bug)
- `CalculadoraRescisaoPage.tsx`: `new Date('YYYY-MM-DD')` é UTC, mas `getDate()` é local. Off-by-one para usuários west of UTC
- `auditHelper.ts:9`: `JSON.stringify` não-determinístico para hash de auditoria (key order varies)

### 3.6 CSRF e CORS (3 achados)

- `client.ts:95-101`: Bridge calls sem CSRF token (server exige verifyCsrf mas client não envia?)
- `csrf.ts:52`: Permite localhost em produção
- `lovable/index.ts`: OAuth redirectTo usa `window.location.origin` sem validação

### 3.7 Hooks com Queries sem Guarda (8 achados)

- `useRealtimeDashboard`: Sem filtro quando `empresaAtualId` undefined → dados de todas empresas
- `usePontoMelhorado`: Query dispara com undefined empresaId
- `useHorasExtras`: Query dispara com undefined empresaId
- `useFerias`: Query dispara com undefined empresaId
- `useAfastamentos.ts:52`: Query enabled sem guard de `afastamentoId`
- `useFeriasAprovacao.ts:19,37,51,76`: `user?.id` pode ser undefined
- `HorasExtrasPage`: `enabled: true` ao invés de `enabled: !!empresaId`
- `FolhaAuditTimeline`: Não filtrado por empresa_id nem competencia

### 3.8 URL/Protocol Safety (4 achados)

- `safeUrl.ts:38`: Protocol-relative URL `//evil.com` bypass (começa com `/`, retornado as-is)
- `safeUrl.ts:28`: `assertAllowedUrl` throw crash quando URL inválida (new URL no error msg)
- 6 páginas usam `useParams().id` sem validação de formato UUID
- `ContratacaoPage.tsx:584`: Token de URL sem validação de formato/tamanho

### 3.9 Stored XSS (1 achado)

- `AdminRegimentoInternoPage.tsx:104,183`: HTML cru de usuário armazenado via Textarea sem sanitização

---

## SEÇÃO 4: FALHAS LOW (45 achados)

### 4.1 Performance

- `auditLogger.ts:14`: `await supabase.auth.getUser()` em cada log entry (RTT desnecessário)
- `importacao/excelDownload.ts:40`: O(n*m) em cálculo de largura de coluna
- `pontoOfflineService.ts:85`: Queue localStorage sem limite máximo (pode atingir 5-10MB e perder dados)
- `useNotificacoes.ts:166`: Durações de contrato hardcoded ao invés de vir do banco

### 4.2 Validações de Boundary Ausentes

- 9 funções de cálculo não validam salário negativo
- `beneficios.ts:55`: Sem limite de abono pecuniário (CLT Art. 143: max 1/3 dos dias)
- `beneficios.ts:124`: Sem bounds em percentual de pensão (>100% produz pensão > salário)
- `rescisao.ts:96-98`: `calcularMulta477` é placeholder (retorna salarioBase sem verificar prazo)

### 4.3 Code Quality

- Funções definidas mas não exportadas via barrel (`calcularValeAlimentacao`, `calcularPlanoSaude`, etc.)
- `passwordPolicy.ts:35-43`: Sem type guard antes de hash (null vira string "null")
- `columnMap.ts:10,12`: Entradas com acentos nunca casam (normalizeHeader remove diacríticos)
- `crypto.subtle` sem try/catch (indisponível em non-secure contexts)
- `useLocalStorage.ts:13-19`: Stale closure em chamadas rápidas de setValue
- `usePontoOffline.ts:43-62`: sync não wrapped em useCallback

### 4.4 Double-Submit e Error States

- 2 páginas sem guard `isPending` em buttons (double-submit)
- 50+ páginas sem render de error state (query failures silently swallowed)
- `ContratacaoPage.tsx`: Sem ErrorBoundary (única exceção)

---

## SEÇÃO 5: ACHADOS POSITIVOS (Implementações Corretas)

1. **Edge functions server-side** (`pix-lote`, `cnab-remessa`, `fgts-digital`, `dctfweb`): JWT auth, CSRF, tenant scope, Zod validation, idempotência, BigInt para currency, audit trails com SHA-256
2. **Webhook receiver**: HMAC-SHA256 signature verification, replay protection, fail-closed
3. **external-db-bridge**: Table denylist, operator allowlist, SQL injection prevention, tenant scoping, telemetry, rate limiting
4. **PKCE auth flow** habilitado (`flowType: 'pkce'`)
5. **Gov.br OAuth**: State single-use com TTL, previne replay
6. **DOMPurify**: Sanitização HTML bem configurada (forbids scripts/iframes/forms)
7. **Security headers**: CSP, HSTS, X-Frame-Options DENY, COOP same-origin em vercel.json e netlify.toml
8. **Clickjacking protection**: iframe detection + frame-busting no main.tsx
9. **Account lockout** server-side (5 tentativas/15min, cooldown 30min)
10. **PIX batch**: Segregação de funções e dual approval para transferências de alto valor

---

## SEÇÃO 6: ACHADOS DO CODEX BOT (PR #43)

Os seguintes achados foram identificados pelo Codex bot e são incorporados ao plano de execução:

| # | Prioridade | Arquivo | Descrição |
|---|-----------|---------|-----------|
| CB1 | P1 | `calcular-folha/index.ts:248` | Coluna `ir_dependente` não existe - schema usa `para_irrf`. Dependentes sempre zero. |
| CB2 | P1 | `migration LGPD:267` | Coluna `nome` e `pis` não existem - schema usa `nome_completo` e `pis_pasep`. Anonymization falha. |
| CB3 | P1 | `admin_role_management_rpc:23` | Bridge não forwarda JWT → `auth.uid()` sempre null → RPCs rejeitam todos admins. |
| CB4 | P1 | `CalculadoraRescisaoPage:93` | Date-only input UTC vs local: janeiro 1 vira dezembro 31 para timezone west of UTC. |
| CB5 | P1 | `migration LGPD:93` | Trigger de imutabilidade não protege `data_pagamento` e `comprovante_pagamento_url`. |
| CB6 | P1 | `migration LGPD:254` | RPC de anonimização aceita `auth.uid() = null` como "system context" → unauthenticated deletion. |
| CB7 | P2 | `rescisaoService.ts:145` | Bridge upsert ignora onConflict → retry falha com uniqueness error. |
| CB8 | P2 | `validar-biometria:120` | Double-prefix data URL → imagem indecodificável. |
| CB9 | P2 | `external-db-bridge:474` | Rejeição de filtros não-eq quebra delete com `.lt()` em useNotificacoes e AdminTelemetria. |
| CB10 | P2 | `processar-ponto-offline:167` | Ordem offline não-atômica → concurrent sync duplica sequência. |
| CB11 | P2 | `alertas-dp:66` | Auth user lookup sem paginação → admins após página 1000 não recebem alertas. |

---

## SEÇÃO 7: DIVISÃO EM 30 ETAPAS DE REMEDIAÇÃO

### Fase A: Fundação de Segurança (Etapas 1-6)

| Etapa | Foco | Achados Cobertos |
|-------|------|-----------------|
| **1** | Tornar empresa_id OBRIGATÓRIO em todos os services | C01-C20 |
| **2** | Adicionar empresa_id em todas queries de páginas frontend | C21-C29 |
| **3** | Implementar autorização server-side (role checks em RPCs) | C38-C41, H25-H28 |
| **4** | Corrigir RPCs que não recebem JWT do bridge | CB3, CB6 |
| **5** | Enforcar MFA no login (verificar AAL level) | H19 |
| **6** | Corrigir brute-force e rate-limit para fail-closed | H20, H21 |

### Fase B: Cálculos Financeiros (Etapas 7-12)

| Etapa | Foco | Achados Cobertos |
|-------|------|-----------------|
| **7** | Math.trunc em INSS/IRRF/FGTS | C30-C32 |
| **8** | Corrigir dedução de pensão na base IRRF | C33 |
| **9** | Corrigir férias proporcionais e aviso prévio | C34-C35 |
| **10** | Atualizar tabelas seguro desemprego 2026 + parcelas corretas | C36-C37 |
| **11** | Fix timezone em cálculos de data (UTC parse) | CB4, M-dates |
| **12** | Guards divisão por zero + bounds validation em calculadoras | H38-H41 |

### Fase C: Race Conditions e Idempotência (Etapas 13-16)

| Etapa | Foco | Achados Cobertos |
|-------|------|-----------------|
| **13** | Idempotência obrigatória em calcularFolha e pagamento rescisão | C42, C45 |
| **14** | Atomic order + dedup em ponto (online e offline) | C43-C44, H30, CB10 |
| **15** | Transações em CNAB e sequencial_arquivo | C46-C47, H47 |
| **16** | Transação em admissao workflow e metadata merge | H31-H33 |

### Fase D: Validação de Input (Etapas 17-20)

| Etapa | Foco | Achados Cobertos |
|-------|------|-----------------|
| **17** | Zod schemas para todos services de escrita (colaboradores, folha, ponto) | H01 |
| **18** | XML escape em eSocial generator | H03 |
| **19** | Validação MIME com magic bytes + upload hardening | H04 |
| **20** | Corrigir URL validation (protocol-relative, webhook SSRF) | H10, H42, M-url |

### Fase E: Dados Sensíveis (Etapas 21-23)

| Etapa | Foco | Achados Cobertos |
|-------|------|-----------------|
| **21** | Criptografar senha certificado, migrar Supabase key para env var | C48, C51 |
| **22** | Corrigir IDOR em holerite URL (adicionar token auth) | C50 |
| **23** | Corrigir RLS policies com USING(true) | C52 |

### Fase F: Auditoria e Logging (Etapas 24-25)

| Etapa | Foco | Achados Cobertos |
|-------|------|-----------------|
| **24** | Consertar loggerService (persistir logs de verdade) | H11 |
| **25** | Adicionar audit logging em auth, LGPD, eSocial, CNAB, ponto | H12-H18 |

### Fase G: Funcionalidades Fake (Etapas 26-27)

| Etapa | Foco | Achados Cobertos |
|-------|------|-----------------|
| **26** | Remover/desabilitar features fake (biometria simulada, batch approve fake, saldos fabricados) | H49-H54 |
| **27** | Corrigir duplicações de funções e barrels | H35-H37 |

### Fase H: Qualidade e Polish (Etapas 28-30)

| Etapa | Foco | Achados Cobertos |
|-------|------|-----------------|
| **28** | Adicionar paginação em todos list queries | M-paginação |
| **29** | Sanitizar error messages + corrigir information leakage | M-info-leak |
| **30** | Corrigir memory leaks, useEffect cleanups, error states em páginas | M-hooks, LOW |

---

## SEÇÃO 8: PLANO DE EXECUÇÃO EM 50 PASSOS

### Bloco 1: Tenant Isolation (Passos 1-8)

| Passo | Ação | Arquivos |
|-------|------|----------|
| 1 | Criar type `RequiredEmpresaId = { empresaId: string }` e aplicar em todos services | `src/services/*.ts` |
| 2 | Adicionar guard `if (!empresaId) throw new Error('empresa_id obrigatório')` em cada método | 40+ services |
| 3 | Adicionar `.eq('empresa_id', empresaId)` em todas queries de DashboardPage | `DashboardPage.tsx` |
| 4 | Adicionar empresa_id em HoleritesPage, PensoesPage, ExamesPage, PortalPage | 4 páginas |
| 5 | Adicionar empresa_id em PontoKioskPage (requerer auth ou empresa context) | `PontoKioskPage.tsx` |
| 6 | Adicionar empresa_id em OnboardingPage, OrganogramaPage, UsuariosPage | 3 páginas |
| 7 | Adicionar empresa_id em ValesPage, SegurosVidaPage, ConveniosPage, RubricasPage | 4 páginas |
| 8 | Adicionar empresa_id em todas mutations DELETE/UPDATE (7 páginas) | `LotacoesPage`, etc. |

### Bloco 2: Autorização (Passos 9-13)

| Passo | Ação | Arquivos |
|-------|------|----------|
| 9 | Criar middleware `assertRole(userId, requiredRole, empresaId)` | Novo: `src/lib/authorization.ts` |
| 10 | Forward caller JWT na bridge para RPCs (`external-db-bridge`) | `external-db-bridge/index.ts` |
| 11 | Corrigir `admin_set_user_role` para usar JWT forwardado | Migration RPC |
| 12 | Mover role assignment para Edge Function server-side | `UserRolesTab.tsx` + nova EF |
| 13 | Proteger SegurancaPage com AdminRoute | `App.tsx` routing |

### Bloco 3: Cálculos Financeiros (Passos 14-21)

| Passo | Ação | Arquivos |
|-------|------|----------|
| 14 | Substituir Math.round por Math.trunc em INSS/IRRF/FGTS | `impostos.ts:30,59,64` |
| 15 | Implementar dedução de pensão da base IRRF (usar flag isPensaoAlimenticia) | `folhaCompleta.ts:46-51`, `impostos.ts:33` |
| 16 | Corrigir férias proporcionais em múltiplos de 12 | `rescisao.ts:41` |
| 17 | Corrigir anos de serviço para aviso prévio (não usar avosTotal arredondado) | `rescisao.ts:47-48` |
| 18 | Mover tabelas seguro desemprego para `tabelas.ts` e atualizar 2026 | `rescisao.ts:84-88` |
| 19 | Implementar parcelas por histórico de solicitações | `rescisao.ts:88` |
| 20 | Usar date-fns `parseISO` + UTC arithmetic em todos cálculos | `rescisao.ts`, `CalculadoraRescisaoPage.tsx` |
| 21 | Adicionar guards: salário ≥ 0, jornadaMensal > 0, diasUteis > 0, meses [0,12] | Todas calculadoras |

### Bloco 4: Race Conditions (Passos 22-27)

| Passo | Ação | Arquivos |
|-------|------|----------|
| 22 | Tornar idempotency key OBRIGATÓRIA em calcularFolha | `edgeFunctionsService.ts`, `calcular-folha/index.ts` |
| 23 | Atomic order via `INSERT ... ON CONFLICT DO UPDATE` em ponto | `pontoService.ts`, `processar-ponto-offline` |
| 24 | Unique constraint em batidas_ponto(colaborador_id, data, hora, tipo) | Nova migration |
| 25 | Transação atômica para sequencial_arquivo CNAB (SELECT FOR UPDATE) | `cnab-remessa/index.ts` |
| 26 | Wrap admissao workflow em RPC transacional | `useAdmissaoWorkflow.ts` → Edge Function |
| 27 | Mutex/lock para offline sync (navigator.locks API) | `pontoOfflineService.ts` |

### Bloco 5: Validação (Passos 28-33)

| Passo | Ação | Arquivos |
|-------|------|----------|
| 28 | Criar Zod schemas para: colaborador, folha_item, registro_ponto, rescisao | Novo: `src/schemas/` |
| 29 | Aplicar schemas em todos `criar()` / `inserir()` de services | 40+ services |
| 30 | Implementar XML escape function e aplicar em esocialXmlGenerator | `esocialXmlGenerator.ts` |
| 31 | Magic bytes validation em upload (PDF header, image headers) | `uploadValidation.ts` |
| 32 | URL validation com URL constructor + protocol whitelist | `safeUrl.ts`, `integracaoService.ts` |
| 33 | Corrigir coluna `ir_dependente` → `para_irrf` em calcular-folha | `calcular-folha/index.ts:248` |

### Bloco 6: Dados Sensíveis (Passos 34-37)

| Passo | Ação | Arquivos |
|-------|------|----------|
| 34 | Criptografar senha_certificado via edge function de criptografia | `esocial/tabs.tsx`, `esocialService.ts` |
| 35 | Migrar Supabase URL/key para env vars (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) | `client.ts` |
| 36 | Adicionar signed URL com expiração para download de holerites | `folhaPagamentoService.ts` |
| 37 | Corrigir RLS policies: USING(auth.uid() = ...) nas tabelas com USING(true) | Nova migration |

### Bloco 7: Auditoria e Auth (Passos 38-42)

| Passo | Ação | Arquivos |
|-------|------|----------|
| 38 | Consertar loggerService: route logs via edge function ao invés de insert direto | `loggerService.ts` |
| 39 | Adicionar audit logging em password reset, MFA changes, role changes | `authService.ts`, `MFASetup.tsx` |
| 40 | Enforcar MFA: verificar AAL2 em ProtectedRoute para users com TOTP enrollado | `AuthContext.tsx`, `ProtectedRoute` |
| 41 | Fail-closed em brute-force check e rate limiter para endpoints de auth | `useBruteForceProtection.ts`, `rateLimit.ts` |
| 42 | Adicionar audit logging em CNAB, eSocial, ponto | Respectivos services |

### Bloco 8: Funcionalidades Fake e Duplicações (Passos 43-46)

| Passo | Ação | Arquivos |
|-------|------|----------|
| 43 | Remover biometria simulada; mostrar "em implementação" ou integrar API real | Componentes ponto |
| 44 | Implementar batch approve real (chamada backend) ou remover botão | Componentes ponto |
| 45 | Remover saldos fabricados em FeriasSaldoReport; calcular do banco | `FeriasSaldoReport` |
| 46 | Unificar calcularHorasExtras/calcularDSR: manter versão segura, remover duplicata | `trabalhista-base.ts`, `beneficios.ts` |

### Bloco 9: Quality of Life (Passos 47-50)

| Passo | Ação | Arquivos |
|-------|------|----------|
| 47 | Adicionar `.limit(100)` default em todas list queries de services | 18 services |
| 48 | Wrap error messages com `safeError()` em todos services (nunca propagar raw) | 13+ services |
| 49 | Adicionar AbortController em useEffects async + revogar Blob URLs | 12+ páginas |
| 50 | Corrigir double data URL prefix em validar-biometria | `validar-biometria/index.ts:120` |

---

## SEÇÃO 9: MÉTRICAS DE COMPLETUDE

### Estado Atual: 3/10

| Dimensão | Score | Justificativa |
|----------|-------|---------------|
| Multi-tenancy | 2/10 | ~60% dos services sem empresa_id |
| Autorização | 1/10 | Zero checks em application layer |
| Cálculos financeiros | 4/10 | Funções existem mas com erros legais |
| Segurança de auth | 5/10 | PKCE/lockout bom, mas MFA/brute-force fraco |
| Validação de input | 2/10 | Quase inexistente em services |
| Integridade financeira | 3/10 | Race conditions em operações monetárias |
| Auditoria/logging | 2/10 | Logger é no-op, coverage mínima |
| Data privacy (LGPD) | 3/10 | Dados sensíveis em plaintext |
| Frontend quality | 4/10 | Funcional mas memory leaks e error states ausentes |
| Funcionalidades reais | 4/10 | Muitas features são simuladas/fake |

### Meta: 10/10

Execução completa dos 50 passos acima elevará cada dimensão para score 9+ através de:
- Tenant isolation enforced em 100% dos endpoints
- Role-based access control server-side
- Cálculos conformes com legislação brasileira
- Zero race conditions em operações financeiras
- Validação Zod em todas boundaries
- Audit trail completo para operações legais
- Dados sensíveis criptografados
- Todas features funcionais (sem simulações)

---

*Documento gerado automaticamente pela auditoria de sistema em 2026-07-19.*
*Agentes utilizados: 30+ (frontend, services, edge functions, database, calculators, auth, hooks, data flow)*
