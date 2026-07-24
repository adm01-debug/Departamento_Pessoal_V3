# AUDITORIA EXAUSTIVA V2 - Sistema Departamento Pessoal

**Data:** 2026-07-19
**Escopo:** Análise completa de 662+ arquivos TS/TSX, 43+ edge functions, 508 arquivos Supabase
**Metodologia:** 12 agentes paralelos + investigação direta | Cobertura: services, pages, edge functions, migrations, utils, auth/security

---

## RESUMO EXECUTIVO

| Severidade | Quantidade |
|-----------|-----------|
| **CRITICAL** | 32 |
| **HIGH** | 89 |
| **MEDIUM** | 97 |
| **LOW** | 41 |
| **TOTAL** | **259** |

### Top 10 Padrões Sistêmicos

1. **Isolamento de tenant ausente** - 80%+ dos services/pages não filtram por `empresa_id`
2. **Edge functions sem autenticação** - 12+ funções completamente abertas na internet
3. **Criptografia falsa** - assinaturas btoa(), hash sem HMAC, biometria Math.random()
4. **Proteção brute-force desabilitada** - LOGIN_PROTECTION_RPC_FALLBACKS retorna valores hardcoded
5. **Leituras anônimas via bridge** - SELECT e RPC não requerem JWT
6. **nome_completo fantasma** - 346 referências a coluna inexistente (coluna real: `nome`)
7. **Race conditions financeiros** - empréstimos, CNAB, PIX sem atomicidade
8. **LGPD violações sistêmicas** - CPF em plaintext, URLs públicas para documentos médicos, logs com PII
9. **eSocial em modo simulação** - ESOCIAL_SIMULATE default=true, protocolos falsos
10. **Páginas admin sem controle de acesso** - /auditoria, /seguranca, /backup acessíveis a qualquer user

---

## SEÇÃO 1: SEGURANÇA E AUTENTICAÇÃO

### 1.1 Edge Functions Completamente Sem Autenticação (CRITICAL)

| Função | Impacto |
|--------|---------|
| `alertas-dp` | Dump de dados de saúde/contratos de TODAS empresas |
| `assistente-ia` | Queima ilimitada de créditos IA + prompt injection |
| `auth-gov-br` | URLs staging hardcoded, open redirect, flood de states |
| `backup` | SELECT * em 13 tabelas sensíveis sem auth |
| `limpeza` | Deleta blocked_ips/login_attempts (bypass brute-force) |
| `validar-biometria` | Valida com Math.random() > 0.05 (95% aceita qualquer foto) |
| `OCR` | Acesso a qualquer bucket via service_role + SSRF |
| `process-document-ocr` | SSRF + prompt injection + sem auth |
| `processar-ponto-offline` | Forja registros de ponto para qualquer funcionário |
| `processar-agendamentos` | Dispara envio de relatórios com service_role |
| `processar-ponto` | Manipula horas/banco de horas para qualquer empresa |
| `consultarCEP/consultarCNPJ` | Proxy aberto (menor risco) |

### 1.2 Bridge - Falhas Críticas de Segurança

| Linha | Falha |
|-------|-------|
| 379-382 | SELECTs e RPCs anônimos (só writes requerem auth) |
| 453 | Injeção de filtro `or` - acesso cross-tenant |
| 529-531 | Login protection RPCs retornam fallback (brute-force desabilitado) |
| 96-99 | LOGIN_PROTECTION_RPC_FALLBACKS hardcoded |
| 497/512 | UPDATE/DELETE ignoram filtros não-eq silenciosamente |
| 420-425 | Tenant scope só verifica payload, não filters |
| 16 | CORS wildcard `Access-Control-Allow-Origin: *` |

### 1.3 Controle de Acesso em Rotas (HIGH)

**Rotas sem proteção admin:**
- `/auditoria` - Logs de auditoria completos (IPs, emails, dados)
- `/seguranca` - Unblock IPs, resolver alertas de segurança
- `/backup` - Export de dados do sistema inteiro
- `/lgpd` - Gestão de consentimentos e solicitações LGPD
- `/usuarios` - Gestão de usuários
- `/configuracoes` - Configurações do sistema
- `/importacao` - Import de dados em lote
- `/calculadora-rescisao` - Cálculos de rescisão

**Rotas completamente públicas (sem auth):**
- `/ponto/kiosk` - Registro de ponto com biometria fake
- `/contratacao` - Página de contratação

### 1.4 Auth Context - Falhas

- **Race condition de roles** (AuthContext.tsx:100-101): User inicia com `['user']` antes do fetch assíncrono
- **Roles client-side only**: Nenhuma enforcement server-side além de RLS
- **Fail-open no brute-force** (useBruteForceProtection.ts:39): Erro no RPC = login liberado
- **localStorage para tokens**: Vulnerável a XSS

---

## SEÇÃO 2: ISOLAMENTO DE TENANT (empresa_id)

### 2.1 Services SEM filtro obrigatório de empresa_id

| Service | Método(s) afetado(s) |
|---------|---------------------|
| admissaoService | getById, update, concluir, cancelar |
| afastamentoService | listarHistoricoRecente, validarDocumento |
| bancoHorasService | listarPorColaborador, getSaldo, registrar |
| batidasPontoService | listar, ajustar, excluir, fecharPeriodo |
| beneficioService | vincularColaborador (cross-tenant link) |
| colaboradorDetalhesService | atualizarDependente, excluirDependente, excluirWebhook |
| horaExtraService | listar, criar, aprovar, rejeitar, excluir |
| integracaoService | getConfig, getRemessas, webhooks (ALL cross-tenant) |
| lgpdService | revogarConsentimento, atualizarSolicitacao |
| medidasDisciplinaresService | buscarPorColaborador, atualizar, excluir |
| pontoService | todos os métodos |
| pontoAbertoService | listar |
| provisaoService | list |
| rescisaoService | calcularESalvar, assinar, processarPagamento |

### 2.2 Pages com queries diretas sem empresa_id

| Página | Problema |
|--------|----------|
| FolhaPagamentoPage:115 | Busca folha por competencia sem empresa_id (pode UPDATE de outra empresa) |
| CalculadoraRescisaoPage:36 | Busca colaborador por ID sem empresa_id |
| PontoPage:157 | Busca colaborador por email sem empresa_id |
| AdminSecurityPage:99 | `select('*')` em security_alerts sem filtro |
| AdminOperacaoPage:42 | DLQ, telemetry, cron jobs de TODAS empresas |
| RelatoriosPage:37 | Query direta em colaboradores (CPF + salário) |

### 2.3 Edge Functions com vazamento cross-tenant

| Função | Problema |
|--------|----------|
| alertas-dp | Queries sem empresa_id em TODAS tabelas |
| metricas | metricas_processamento sem filtro |
| sincronizar-bitrix | Upsert em departamentos/colaboradores com onConflict sem empresa_id |
| gerar-guias | Apenas salario_base consultado sem verificação de tenant |
| exportacao | Admin pode exportar TODOS os tenants |
| folha-metrics | Métricas cross-tenant para qualquer user com role "rh" |

---

## SEÇÃO 3: INTEGRIDADE DE DADOS E LÓGICA DE NEGÓCIOS

### 3.1 Criptografia e Assinaturas Falsas (CRITICAL)

| Local | Problema |
|-------|----------|
| rescisaoService:172-206 | `btoa('rescisao-${id}-${tipo}-${ts}').slice(0,32)` = NOT a signature |
| folhaPagamentoService:84-85 | `btoa('assinatura-${id}-${ts}').substring(0,32)` = fake |
| pontoService:111-112 | SHA256 sem HMAC secret (qualquer um pode forjar) |
| pontoOfflineService:5 | Key hardcoded `'lovable-ponto-secure-v1'` no bundle JS |
| validar-biometria:60-61 | `Math.random() > 0.05` = 95% aceita qualquer foto |
| rescisaoService:101 | `btoa(JSON.stringify(resultado)).slice(0,32)` = "hash integridade" |

### 3.2 eSocial - Modo Simulação em Produção (CRITICAL)

- **enviar-esocial:31** - `ESOCIAL_SIMULATE` default = `'true'` quando env var não setada
- Marca eventos como "enviado" com protocolo fake
- Empresa acredita estar em conformidade mas nunca transmitiu ao governo
- Multas de R$402,53 a R$181.284,63 por evento não transmitido

### 3.3 Cálculos Financeiros Incorretos

| Local | Erro |
|-------|------|
| gerar-holerite:115 | diasTrabalhados = count de registros (não dias distintos) → overpayment |
| gerar-holerite:120 | IRRF sem dependentes → over-taxation |
| gerar-guias:177-185 | Usa só salario_base (ignora HE, insalubridade, bonificações) |
| gerar-guias:183 | Patronal INSS hardcoded 20% (ignora RAT/FAP/CNAE) |
| gerar-guias:252-253 | Guias geradas NUNCA persistidas no banco (só retornadas no response) |
| gerar-guias:189-191 | FGTS + FGTS_DIGITAL duplicam obrigação no modo TODAS |
| FolhaPagamentoPage:78 | INSS patronal hardcoded 27.8% (varia por empresa) |
| calculoLoteService:25 | `dataFim = '${ano}-${mes}-31'` (meses com <31 dias) |
| emprestimo-consignado:127 | Race condition na margem → viola Lei 10.820/2003 |

### 3.4 Race Conditions (TOCTOU)

| Local | Impacto |
|-------|---------|
| cnab-remessa:119-127 | Sequencial duplicado → banco rejeita arquivo |
| emprestimo-consignado:127-143 | Margem estourada → violação legal |
| pix-lote:208-223 | Audit failure → criador aprova próprio lote (bypass segregação) |
| dctfweb:101-113 | Declarações duplicadas |
| fgts-digital:99-113 | Guias FGTS duplicadas |
| gerar-pgr:108-114 | PGRs duplicados "ativo" |
| baseService:104-127 | Optimistic versioning com TOCTOU |
| jornadaHorariosService:38 | Delete-then-insert perde dados se insert falha |
| pontoService:62-74 | Duplicate check + ordem calculation race |
| rateLimit:69-84 | Rate limiter burstável sob concorrência |

### 3.5 nome_completo - Referência a Coluna Inexistente

- **Coluna real:** `nome VARCHAR(255) NOT NULL` (migration 002_colaboradores.sql)
- **Referências quebradas:** 346 ocorrências em 126 arquivos
- **Impacto:** Queries retornam `undefined` para nome, exports/PDFs mostram campos vazios
- **Arquivos críticos afetados:** cnabService, calculoLoteService, colaboradorService, exportacao

---

## SEÇÃO 4: CONFORMIDADE LGPD

### 4.1 Exposição de Dados Pessoais

| Local | Dados Expostos | Problema |
|-------|---------------|----------|
| afastamentoService:87 | Documentos médicos | `getPublicUrl()` = URL pública permanente |
| cnabService:346 | CPF completo | CSV PIX em plaintext |
| ColaboradoresPage:299 | CPF completo | Exibido sem máscara na listagem |
| ColaboradoresPage:114 | CPF + salário | Export Excel 5000 registros sem audit |
| RelatoriosPage:37-48 | CPF + salário | Query direta sem controle de acesso |
| AuditoriaPage:66 | IPs, emails, dados | Export sem mascaramento |
| baseService:99 | PII completo | Logado em payloads de erro |
| pontoMonitorService:23 | GPS preciso | Coordenadas sem data minimization |
| AdminOperacaoPage:223 | SQL queries | pg_stat_statements exposto no UI |

### 4.2 Direitos do Titular

- `lgpdService.atualizarSolicitacao` - Qualquer user pode marcar solicitação como "atendida" sem executar
- Sem validação de empresa_id em consentimentos
- Export de dados sem trilha de auditoria obrigatória
- Backup endpoint sem auth pode exportar TODOS os dados pessoais

---

## SEÇÃO 5: EDGE FUNCTIONS - FALHAS ESPECÍFICAS

### 5.1 Batch 1 (adiantamento-salarial, alertas-dp, assinaturaDigital, assistente-ia, auditoria, auth-gov-br, backup, backup-automatico)

- **alertas-dp:** 0 auth, cross-tenant PII dump, XSS em email templates
- **assistente-ia:** 0 auth, prompt injection via history, DoS financeiro
- **auth-gov-br:** URLs de staging hardcoded, open redirect, sem expiração de state
- **backup:** 0 auth, SELECT * em 13 tabelas, sem tenant isolation
- **backup-automatico:** 10K rows/table in memory, signed URL 24h para PII

### 5.2 Batch 2 (cnab-remessa, consultarCEP, consultarCNPJ, criptografia, dctfweb, distribuir-holerites, emprestimo-consignado, enviar-esocial)

- **cnab-remessa:** Race condition sequencial, getClaims() não-padrão
- **dctfweb:** TOCTOU duplicatas, getClaims() não-padrão
- **distribuir-holerites:** Sem CSRF, sem validação Zod, memory unbounded
- **emprestimo-consignado:** Race na margem (viola Lei 10.820/2003)
- **enviar-esocial:** SIMULATE=true default (CRITICAL)

### 5.3 Batch 3 (enviar-relatorio, exportacao, external-db-bridge, fechar-folha, fgts-digital, folha-metrics, gerar-aej, gerar-guias)

- **external-db-bridge:** or-injection, RPCs sem auth, login protection disabled
- **gerar-guias:** Guias nunca persistidas, FGTS duplicada, cálculos incompletos
- **gerar-aej:** Sem CSRF, sem validação, pagination unbounded
- **exportacao:** Admin export cross-tenant

### 5.4 Batch 4 (gerar-holerite, gerar-ltcat-os, gerar-pgr, healthcheck, importacao, integracao, limpeza, metricas)

- **gerar-holerite:** diasTrabalhados = count de registros (não dias), IRRF sem dependentes
- **limpeza:** 0 auth, deleta blocked_ips/login_attempts
- **healthcheck:** Leak de contagem de registros sem auth

### 5.5 Batch 5 (validar-biometria, OCR, warmup, sincronizar-bitrix, webhook, relatorio, reabrir-folha, cache)

- **validar-biometria:** 0 auth + Math.random() biometria + no tenant isolation
- **OCR:** 0 auth + SSRF + acesso arbitrário a storage
- **sincronizar-bitrix:** Cross-tenant upsert em email/nome
- **reabrir-folha:** getClaims() não-padrão, rollback não verificado

### 5.6 Batch 6 (process-document-ocr, processar-ponto-offline, processar-agendamentos, processar-ponto, pix-lote, parse-afdt, rateLimit, notificacao)

- **processar-ponto-offline:** 0 auth, hash enforcement OFF by default
- **processar-ponto:** 0 auth, manipula banco de horas de qualquer empresa
- **pix-lote:** Audit failure → bypass segregação de duties financeiro
- **rateLimit:** TOCTOU permite burst acima do limite

---

## SEÇÃO 6: PERFORMANCE E RESILIÊNCIA

### 6.1 Queries Unbounded (sem .limit())

- alertas-dp: ASOs vencidos sem limite
- backup-automatico: 10K/table × 15 tables = 150K rows in memory
- distribuir-holerites: Todos holerites sem limit
- gerar-aej: Pagination loop sem max iterations
- processar-ponto-offline: Array de registros sem size check
- folha-metrics: idempotency_keys/audit_log sem limit

### 6.2 N+1 Queries

- calculoLoteService: DB calls dentro de loop por colaborador
- enviar-esocial: Event processing sequencial
- processar-ponto: Queries por colaborador sem batch

### 6.3 Memory Issues

- backup-automatico:125: 150K rows in memory pode OOM
- criptografia:53: `String.fromCharCode(...buf)` crash > 65K args
- parse-afdt:140: 10MB parsed antes do size check
- importacao:49-97: CSV parsed inteiro antes de MAX_ROWS check

---

## SEÇÃO 7: VALIDAÇÃO E INPUT SANITIZATION

### 7.1 PostgREST Filter Injection

| Local | Vetor |
|-------|-------|
| external-db-bridge:453 | `.or(f.value)` sem sanitização |
| afastamentoService:49 | `.or(\`codigo.ilike.%${termo}%\`)` |
| colaboradorService:34 | `.or(\`nome_completo.ilike.%${search}%\`)` |
| beneficioService:18 | `.ilike('nome', \`%${search}%\`)` |
| baseService:54 | `.ilike(column, \`%${search}%\`)` wildcards % e _ |

### 7.2 Métodos Não-Padrão (getClaims)

- cnab-remessa:73, dctfweb:70, emprestimo-consignado:63, adiantamento-salarial:46
- `supabase.auth.getClaims()` NÃO existe no @supabase/supabase-js@2
- Se não houver monkey-patch, TODOS esses endpoints retornam 500

### 7.3 Validação Ausente

- HorasExtrasPage:27-31: Aceita horas negativas ou > 24h
- bancoHorasService:18-22: `registrar(d: any)` sem nenhuma validação
- gerar-pgr:49: empresa_id não validado como UUID
- auth-gov-br:18: action/code/state/redirectUri sem schema

---

## SEÇÃO 8: PÁGINAS - FALHAS ESPECÍFICAS

### 8.1 Falhas Críticas em Páginas

| Página | Severidade | Problema |
|--------|-----------|----------|
| AdminOperacaoPage | CRITICAL | 0 role check, expõe DLQ/SQL/cron/alerts |
| AuditoriaPage:28 | CRITICAL | 0 role check, 500 logs sem filtro |
| AdminSecurityPage:99 | CRITICAL | 0 role check, resolve security alerts |
| FolhaPagamentoPage:115 | CRITICAL | Cross-company payroll update |
| RelatoriosPage:37 | CRITICAL | CPF+salário query sem role check |

### 8.2 Hard-deletes em Dados Legais

- DesligamentosPage:57-68: Delete permanente de registros de rescisão (documentos legais)
- HorasExtrasPage:89: Delete sem confirmation dialog
- medidasDisciplinaresService:39-43: Delete de registros disciplinares (evidência legal)

### 8.3 Double-Submit / Race em UI

- HorasExtrasPage:28: Sem loading state no submit
- ContabilidadePage:49-65: Sem debounce em "Gerar Lancamentos"
- ESocialPage:498-501: isSending compartilhado entre todos os botões

---

## 30 ETAPAS DE AUDITORIA (Organizadas por Prioridade)

### BLOCO A: CRÍTICOS IMEDIATOS (Etapas 1-10)

1. **AUTH-001:** Adicionar autenticação JWT a TODAS edge functions sem auth (12 funções)
2. **AUTH-002:** Corrigir bridge para exigir auth em SELECT e RPC (não só writes)
3. **AUTH-003:** Desabilitar LOGIN_PROTECTION_RPC_FALLBACKS (executar RPCs reais)
4. **AUTH-004:** Proteger rotas admin com AdminRoute (/auditoria, /seguranca, /backup, etc)
5. **TENANT-001:** Tornar empresa_id obrigatório em TODOS os services (não optional)
6. **TENANT-002:** Adicionar filtro empresa_id em queries de pages (FolhaPagamento, Ponto, etc)
7. **CRYPTO-001:** Substituir btoa/Math.random por implementações criptográficas reais
8. **ESOCIAL-001:** Inverter default ESOCIAL_SIMULATE para false + warning em startup
9. **CALC-001:** Corrigir diasTrabalhados em gerar-holerite (usar distinct dates)
10. **CALC-002:** Persistir guias geradas no banco (gerar-guias nunca faz INSERT)

### BLOCO B: HIGH PRIORITY (Etapas 11-20)

11. **RACE-001:** Atomic operations para CNAB sequencial + empréstimo margem
12. **RACE-002:** Atomic operations para PIX lote (audit + segregação)
13. **LGPD-001:** Remover getPublicUrl() de documentos médicos → signed URLs curtos
14. **LGPD-002:** Mascarar CPF em listagens e exports (LGPD Art. 11)
15. **LGPD-003:** Remover PII de logs (baseService:99)
16. **BRIDGE-001:** Sanitizar filtro `or` no bridge (regex ou whitelist)
17. **BRIDGE-002:** Implementar validação para TODOS filter ops em UPDATE/DELETE
18. **NOME-001:** Corrigir 346 referências nome_completo → nome
19. **CALC-003:** IRRF com dependentes + INSS progressivo com RAT/FAP configurável
20. **KIOSK-001:** Implementar biometria real ou remover feature (não Math.random)

### BLOCO C: MEDIUM PRIORITY (Etapas 21-27)

21. **CSRF-001:** Adicionar verifyCsrf() em funções que faltam (distribuir-holerites, gerar-aej, etc)
22. **CORS-001:** Restringir Access-Control-Allow-Origin para domínios conhecidos
23. **PERF-001:** Adicionar .limit() em queries unbounded + pagination
24. **PERF-002:** Converter N+1 queries em batch operations
25. **VAL-001:** Adicionar Zod schemas em funções sem validação (gerar-aej, backup, etc)
26. **VAL-002:** Corrigir getClaims() → getUser() em 4 edge functions
27. **STATE-001:** Implementar state machine guards (admissão, rescisão, overtime)

### BLOCO D: LOW PRIORITY (Etapas 28-30)

28. **PERF-003:** Memoizar filtros em pages, corrigir memory leaks (URL.revokeObjectURL)
29. **UX-001:** Adicionar confirmation dialogs em deletes, double-submit protection
30. **CONFIG-001:** Externalizar tax tables (INSS/IRRF/FGTS) para banco com effective_date

---

## 50 ETAPAS DE EXECUÇÃO (Plano Detalhado)

### FASE 1: SEGURANÇA CRÍTICA (Etapas 1-15)

| # | Ação | Arquivo(s) | Estimativa |
|---|------|-----------|-----------|
| 1 | Adicionar JWT auth em alertas-dp, assistente-ia, backup, limpeza | 4 edge functions | 30min |
| 2 | Adicionar JWT auth em validar-biometria, OCR, process-document-ocr | 3 edge functions | 20min |
| 3 | Adicionar JWT auth em processar-ponto-offline, processar-ponto, processar-agendamentos | 3 edge functions | 20min |
| 4 | Corrigir bridge: exigir auth para SELECT e RPC | external-db-bridge/index.ts | 30min |
| 5 | Remover LOGIN_PROTECTION_RPC_FALLBACKS, chamar RPCs reais | external-db-bridge/index.ts | 15min |
| 6 | Sanitizar filtro `or` no bridge (regex de colunas) | external-db-bridge/index.ts | 20min |
| 7 | Aplicar TODOS filter ops em UPDATE/DELETE (não só eq) | external-db-bridge/index.ts | 20min |
| 8 | Proteger tenant scope em filters (não só data payload) | external-db-bridge/index.ts | 30min |
| 9 | Envolver rotas sensíveis com AdminRoute em App.tsx | App.tsx | 15min |
| 10 | Adicionar role check no PontoKioskPage (ou remover Math.random biometria) | PontoKioskPage.tsx | 20min |
| 11 | ESOCIAL_SIMULATE default → false + fail-loud | enviar-esocial/index.ts | 10min |
| 12 | Corrigir auth-gov-br: URLs production, validação, state expiry | auth-gov-br/index.ts | 30min |
| 13 | Restringir CORS de * para domínios permitidos | _shared/contract.ts + todas funções | 20min |
| 14 | Remover localhost/127.0.0.1 do CSRF allowlist | _shared/csrf.ts | 5min |
| 15 | Adicionar verifyCsrf() em distribuir-holerites, gerar-aej, gerar-pgr, gerar-ltcat-os | 4 edge functions | 15min |

### FASE 2: TENANT ISOLATION (Etapas 16-25)

| # | Ação | Arquivo(s) | Estimativa |
|---|------|-----------|-----------|
| 16 | Tornar empresa_id obrigatório em admissaoService | admissaoService.ts | 15min |
| 17 | Tornar empresa_id obrigatório em horaExtraService + bancoHorasService | 2 services | 20min |
| 18 | Tornar empresa_id obrigatório em batidasPontoService + pontoService | 2 services | 20min |
| 19 | Tornar empresa_id obrigatório em beneficioService + medidasDisciplinaresService | 2 services | 20min |
| 20 | Tornar empresa_id obrigatório em integracaoService (CNAB config!) | integracaoService.ts | 15min |
| 21 | Tornar empresa_id obrigatório em lgpdService + provisaoService | 2 services | 15min |
| 22 | Tornar empresa_id obrigatório em rescisaoService | rescisaoService.ts | 20min |
| 23 | Corrigir FolhaPagamentoPage:115 (adicionar empresa_id no lookup) | FolhaPagamentoPage.tsx | 10min |
| 24 | Corrigir PontoPage:157 (empresa_id no lookup por email) | PontoPage.tsx | 10min |
| 25 | Corrigir AdminSecurityPage + AdminOperacaoPage (role + tenant filter) | 2 pages | 20min |

### FASE 3: INTEGRIDADE FINANCEIRA (Etapas 26-35)

| # | Ação | Arquivo(s) | Estimativa |
|---|------|-----------|-----------|
| 26 | Corrigir gerar-holerite: usar SET de datas distintas para diasTrabalhados | gerar-holerite/index.ts | 15min |
| 27 | Corrigir gerar-holerite: incluir contagem de dependentes no IRRF | gerar-holerite/index.ts | 20min |
| 28 | Corrigir gerar-guias: INSERT guias no banco + remover duplicação FGTS/FGTS_DIGITAL | gerar-guias/index.ts | 30min |
| 29 | Atomic sequence para CNAB (nextval ou SELECT FOR UPDATE) | cnab-remessa/index.ts | 20min |
| 30 | Atomic margin check para empréstimo (database-level constraint) | emprestimo-consignado/index.ts | 20min |
| 31 | Corrigir PIX lote: audit blocking + segregation enforcement | pix-lote/index.ts | 20min |
| 32 | Corrigir DCTF/FGTS: unique constraint para evitar duplicatas | dctfweb + fgts-digital | 15min |
| 33 | Substituir btoa "signatures" por crypto.subtle HMAC | rescisaoService + folhaPagamento | 30min |
| 34 | Implementar key derivation real para pontoOfflineService | pontoOfflineService.ts | 20min |
| 35 | Corrigir gerar-guias: usar remuneração total (não só salario_base) | gerar-guias/index.ts | 30min |

### FASE 4: LGPD E COMPLIANCE (Etapas 36-42)

| # | Ação | Arquivo(s) | Estimativa |
|---|------|-----------|-----------|
| 36 | Substituir getPublicUrl por createSignedUrl (5min TTL) em afastamentos | afastamentoService.ts | 15min |
| 37 | Mascarar CPF em ColaboradoresPage (listar) + export Excel/PDF | ColaboradoresPage.tsx | 20min |
| 38 | Mascarar CPF em cnabService PIX batch CSV | cnabService.ts | 10min |
| 39 | Remover PII de logs (baseService error handler) | baseService.ts | 15min |
| 40 | Adicionar audit log obrigatório em exports (RelatoriosPage, exportacao) | RelatoriosPage + exportacao | 20min |
| 41 | Reduzir signed URL TTL em backup-automatico (24h → 5min) | backup-automatico/index.ts | 5min |
| 42 | Implementar LGPD request execution real (não só status update) | lgpdService.ts | 30min |

### FASE 5: DATA INTEGRITY (Etapas 43-47)

| # | Ação | Arquivo(s) | Estimativa |
|---|------|-----------|-----------|
| 43 | Corrigir 346 referências nome_completo → nome (search & replace inteligente) | 126 arquivos | 45min |
| 44 | Corrigir getClaims() → getUser() em 4 edge functions | cnab-remessa, dctfweb, etc | 15min |
| 45 | Implementar state machine guards em rescisão (bloquear backward) | rescisaoService.ts | 20min |
| 46 | Implementar state machine guards em admissão/hora-extra | admissao + horaExtra | 20min |
| 47 | Atomic delete+insert em jornadaHorariosService (transação) | jornadaHorariosService.ts | 15min |

### FASE 6: PERFORMANCE E POLISH (Etapas 48-50)

| # | Ação | Arquivo(s) | Estimativa |
|---|------|-----------|-----------|
| 48 | Adicionar .limit() + pagination em queries unbounded | Múltiplos | 30min |
| 49 | Double-submit protection (loading states, debounce) | HorasExtras, Contabilidade, etc | 20min |
| 50 | Externalizar tabelas INSS/IRRF/FGTS para banco com effective_date | Nova migration + services | 45min |

---

## TEMPO TOTAL ESTIMADO: ~14 horas de desenvolvimento

### Priorização Recomendada:
- **Semana 1:** Fases 1-2 (Segurança + Tenant) → elimina 80% do risco
- **Semana 2:** Fase 3 (Financeiro) → corrige cálculos incorretos
- **Semana 3:** Fases 4-5 (LGPD + Integridade) → compliance legal
- **Semana 4:** Fase 6 (Performance) → polish e otimização

---

## NOTA SOBRE TESTES

Antes de cada correção, os cenários de teste E2E relevantes devem ser executados para confirmar:
1. O bug existe (teste falha)
2. A correção resolve (teste passa)
3. Nenhuma regressão é introduzida

A matriz de testes E2E está documentada em `02_MATRIZ_TESTES_E2E.md`.
