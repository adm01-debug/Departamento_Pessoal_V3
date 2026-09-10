# Revisão de Implementação do Plano de 50 Etapas

**Projeto:** Departamento Pessoal V3
**Corte:** 10/09/2026
**SHA revisado:** `0630fefa564ec2874d6210f1190737283a58ce90`
**Branch:** `codex/e50-preflight-20260910`
**PR:** `#98`, aberto e bloqueado
**Banco de referência:** Supabase canônico `frjbfeamybqsejlvmqbl`, auditado diretamente em modo read-only na mesma data

## 1. Veredito

**Não implementamos todas as melhorias. Nenhuma das 50 etapas atingiu C4.**

O plano continua estruturalmente íntegro — 50 etapas, 500 subetapas, 200 checkpoints, sem dependência futura ou circular — mas os 700 itens permanecem desmarcados. Isso está correto: vários artefatos existem, porém o resultado ponta a ponta ainda falha no banco, no deploy, no E2E ou no caminho funcional real.

| Estado auditado                                  | Etapas                                                | Quantidade |
| ------------------------------------------------ | ----------------------------------------------------- | ---------: |
| **PV — parcial com evidência executável**        | 003, 009, 010, 012, 031, 033, 034, 035, 038, 047, 049 |         11 |
| **PI — implementação parcial/inconsistente**     | 002, 004–008, 013–015, 021–029, 032, 036, 040–046     |         27 |
| **NI — objetivo ainda não implementado**         | 011, 016–020, 030, 039, 050                           |          9 |
| **BE — bloqueado por ação/configuração externa** | 001, 037, 048                                         |          3 |
| **C4 — concluído e promovido**                   | nenhum                                                |      **0** |

`PV` não significa pronto: indica somente que existe ao menos uma prova local/CI útil. `PI` indica código ou migration existente, mas contrato, banco, teste real ou operação continuam incompletos. `BE` não autoriza pular a etapa.

### Execução incremental posterior à revisão

Em 10/09/2026, após a simulação de ausência e de alvo inalcançável, foram feitas três correções locais verificadas. Elas elevam a qualidade dos gates e removem dois sucessos falsos, mas **não alteram a classificação para C4**: ainda falta deploy, auditoria canônica autenticada, staging e promoção por PR.

| Item              | Mudança aplicada                                                                                                          | Evidência local                                                                                    | Limite para aceite                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| E50-035 / E50-047 | `db-integrity` passou a exigir `SUPABASE_DB_URL`; sete auditores agora reprovam conexão/consulta falha.                   | `npm run test:db-audit-contract`: 7/7 confirmam skip local sem alvo e falha com alvo inalcançável. | O secret seguro ainda precisa ser configurado e a auditoria precisa rodar contra o canônico/staging. |
| E50-026           | `listarContatosEmergencia` deixou de devolver lista vazia fictícia e consulta `contatos_emergencia` por `colaborador_id`. | 45 testes do serviço, incluindo sucesso, nulo e erro.                                              | Validar a policy real T1/T2 e o fluxo autenticado em staging.                                        |
| E50-045           | A taxa Prometheus agora é `erros/consultas`; falha de coleta é sinalizada e devolve `503`.                                | 4 testes Deno da matemática, `deno check` e parse de todas as 109 Edge Functions.                  | Implantar, configurar scrape/alerta e comprovar comportamento no ambiente.                           |

## 2. Critério usado

Uma melhoria só é `C4` quando as cinco camadas concordam no mesmo SHA:

1. **Código:** caminho produtivo alcançável, sem stub, protocolo fictício ou sucesso simulado.
2. **Contrato:** tipos, tabela, coluna, RPC, bucket, caller e autorização coincidem.
3. **Teste:** positivo, negativo, concorrência/rollback quando aplicável e execução sem skip.
4. **Ambiente:** schema/Edge Function/secret/config realmente implantados em staging e no destino aprovado.
5. **Operação:** CI obrigatório, smoke pós-deploy, métricas corretas e evidência anexada.

Foram cruzados: grafo de 13.454 nós, source atual, 644 migrations, baseline/rebaseline, 60 Edge Functions, 24 specs Playwright, workflows e checks do PR, inventário histórico de 369 linhas classificadas e auditoria SQL/HTTP do banco canônico. As 369 linhas históricas são uma base de descoberta — 172 `IMPLEMENTADO_PARCIAL`, 113 `SUGERIDO_OU_INICIADO` e 84 `MORTO_OU_ABANDONADO` — e não foram promovidas automaticamente a fatos atuais; alterações posteriores foram conferidas por delta.

## 3. Matriz completa das 50 etapas

| Etapa   | Estado | Evidência atual e condição que impede C4                                                                                                                                                                            |
| ------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E50-001 | **BE** | Credenciais foram expostas. Não há prova de revogação das antigas e rotação de todos os consumidores. O repositório possui apenas os secrets públicos de URL/chave publishable.                                     |
| E50-002 | **PI** | Massa está declarada descartável e há export/baseline/runbook, mas não existe restore atual, verificável e promovível após a rotação de credenciais.                                                                |
| E50-003 | **PV** | Gate `audit-canonical-project`, branch e PR existem; o local usa `frjb…`. `origin/main` ainda termina em commit que aponta o proxy para `ciziy…`; PR #98 não foi integrado.                                         |
| E50-004 | **PI** | Há SQL candidato de remediação. No banco auditado, 43/44 views eram selecionáveis por `anon` e quatro retornaram dados sem login; só duas eram `security_invoker`.                                                  |
| E50-005 | **PI** | Há auditor e SQL candidato. O banco ainda reprovou 27 funções `SECURITY DEFINER`; 23 overloads eram executáveis por `anon` e 113 por `authenticated`.                                                               |
| E50-006 | **PI** | Auditores existem e detectam o problema, mas o banco reprovou 60 policies tenant, 17 de PII e 50 de menor privilégio; 55 tinham `USING(true)`.                                                                      |
| E50-007 | **PI** | Smoke automatizado existe. Onze selagens/hash triggers falharam ao resolver `digest()` e dois triggers de folha estavam desabilitados.                                                                              |
| E50-008 | **PI** | UI/hook/Edge de Auth e migrations locais existem. RPCs de lockout usadas pelo código estavam ausentes, o bridge contém fallback fixo e `reset_login_attempts` era executável por `anon`.                            |
| E50-009 | **PV** | Inventários SQL, manifest do baseline, hashes e relatórios existem. Ainda não há manifest automático, completo e anexado a cada promoção no mesmo SHA.                                                              |
| E50-010 | **PV** | Drift de migrations foi classificado em CSV/JSON e a revisão funcional existe. Falta decisão owner-backed para cada objeto, stub, página, integração e função órfã.                                                 |
| E50-011 | **NI** | Existem sete ADRs gerais e um runbook de drift, mas não há ADR aprovado que declare corte, fonte canônica, política de squash e promoção do baseline.                                                               |
| E50-012 | **PV** | Baseline candidato com 12 arquivos, manifest e `verify.sql` existe. Não foi homologado em staging hospedado nem promovido como nova origem do schema.                                                               |
| E50-013 | **PI** | Há definições históricas/candidatas para helpers e RPCs. O banco vivo ainda não contém objetos exigidos por Auth, rate limit, LGPD, autorização e vínculo.                                                          |
| E50-014 | **PI** | Migration e serviço PCS existem localmente. As cinco tabelas/RPCs PCS não estavam no banco canônico; não há decisão formal de completar ou remover a feature.                                                       |
| E50-015 | **PI** | Migration/rebaseline definem buckets e policies. O canônico tinha somente 4/19 buckets; os 15 restantes e os testes 19/19 não foram promovidos.                                                                     |
| E50-016 | **NI** | Sete cron jobs vivem no canônico e três jobs de segurança esperados não existem. O conjunto vivo não foi convertido em fonte versionada aprovada.                                                                   |
| E50-017 | **NI** | Continuam 12 `CHECK NOT VALID`, uma tabela pública sem PK e 398 triggers sem consolidação/ensaio integral.                                                                                                          |
| E50-018 | **NI** | Foram inventariadas 24 FKs sem índice de prefixo compatível e 31 grupos duplicados, mas não há decisão baseada em workload, `EXPLAIN` e custo de escrita.                                                           |
| E50-019 | **NI** | O replay histórico para no ordinal 529 por `query_telemetry.bytes_sent` inexistente. Não houve duas restaurações idênticas nem reconciliação segura do ledger.                                                      |
| E50-020 | **NI** | Tipos atuais continuam divergentes do físico: 17 tabelas live-only/8 type-only e 158 funções live-only/26 type-only na auditoria. Não houve codegen do staging aprovado.                                            |
| E50-021 | **PI** | Services e helpers existem, mas há 232 ocorrências produtivas de `.select('*')`, acesso Supabase direto e contratos paralelos; a camada por domínio não é fonte única.                                              |
| E50-022 | **PI** | Supabase Auth, sessão, MFA e guards existem. Lockout físico, bypass do endpoint de token, configuração MFA e E2E autenticado não estão comprovados.                                                                 |
| E50-023 | **PI** | Guards de UI e RLS existem. Views, policies e RPCs demonstraram bypass/menor privilégio insuficiente; autorização server-owned ainda não é universal.                                                               |
| E50-024 | **PI** | Há engines e testes de cálculo, mas caminhos concorrentes permanecem, folha em lote/provisões têm contratos inválidos e holerite/PDF não fecha ponta a ponta.                                                       |
| E50-025 | **PI** | Offline/idempotência/ponto receberam melhorias. Vínculo, tabelas paralelas, bucket biométrico, hashes e RPCs privilegiadas ainda impedem prova antifraude.                                                          |
| E50-026 | **PI** | Férias/afastamentos/benefícios possuem UI e services. Bucket ausente, `syncWithHub` fachada e split `beneficios_colaborador` × `beneficios_colaboradores` mantêm fluxos quebrados.                                  |
| E50-027 | **PI** | Contratos, tokens e assinatura têm código/RPCs. Buckets faltam, não há jornada E2E e a emissão de PDF de holerite ainda devolve URL fixa externa.                                                                   |
| E50-028 | **PI** | Existem validadores e funções, mas eSocial/ICP-Brasil, FGTS Digital, DCTFWeb, PIX e WhatsApp são simulados ou locais; CNAB e integrações externas não foram homologados.                                            |
| E50-029 | **PI** | SST, disciplina e LGPD têm tabelas/páginas/RPCs. Há sucesso de UI sem persistência, buckets ausentes, funções privilegiadas reprovadas e jobs de segurança faltando.                                                |
| E50-030 | **NI** | Não há comparação Management API nome/hash/config/secret/caller no mesmo SHA. A versão implantada das 60 Edge Functions permanece não comprovada.                                                                   |
| E50-031 | **PV** | Contrato/CORS/CSRF/rate limit compartilhados e gate estático passam. Nem todas as Edge Functions são bloqueantes no typecheck e o estado implantado não foi comparado.                                              |
| E50-032 | **PI** | Há Zod, `safe-fetch` e validações compartilhadas. Validação não é uniforme, há dois OCRs e 15 buckets ausentes quebram uploads/downloads.                                                                           |
| E50-033 | **PV** | 4.853 testes unitários passaram na auditoria e o PR atual aprovou Unit Tests; cobertura foi ~61% statements/~56% branches, insuficiente para os riscos críticos.                                                    |
| E50-034 | **PV** | Três migrations recentes passaram duas vezes com 28 asserts. O replay integral falhou na 529ª; Auth/PostgREST/RPC/Storage completos não foram restaurados e testados.                                               |
| E50-035 | **PV** | Sete auditores SQL existem e detectaram violações reais. O workflow agora falha fechado sem `SUPABASE_DB_URL` ou com alvo inacessível; ainda falta matriz CRUD por papel/tenant e execução autenticada no canônico. |
| E50-036 | **PI** | Existem idempotency keys, locking otimista e testes unitários. Não há carga concorrente real cobrindo folha, ponto, CNAB, PIX, webhooks e filas.                                                                    |
| E50-037 | **BE** | Há 24 specs e projetos por papel/dispositivo. GitHub não tem as quatro identidades E2E obrigatórias; Playwright falha antes de executar. Duas specs na raiz não casam nenhum `testMatch`.                           |
| E50-038 | **PV** | `sharp` foi atualizado, audit/CodeQL passam e há scanner estático. Rotação de credenciais expostas e inventário de secrets/dependências implantadas não estão encerrados.                                           |
| E50-039 | **NI** | Não há relatório atual de threat model/pentest autenticado cobrindo IDOR, SQLi, XSS, CSRF, SSRF, upload, replay e separação T1/T2.                                                                                  |
| E50-040 | **PI** | Grafo e medições existem; ainda há dois ciclos, arquivos grandes/clones, rotas órfãs, services paralelos e Edge Functions sem caminho de execução.                                                                  |
| E50-041 | **PI** | `strict` e typechecks de app/testes/E2E passam. O lint tolera 14 warnings, há grande cauda de `any`, testes/Edge não são lintados integralmente e Edge não-bridge é informativo.                                    |
| E50-042 | **PI** | Lazy pages e PWA existem. Main/Excel/charts/precache excedem budgets; Capacitor tem config/script, mas faltam dependências e projetos Android/iOS versionados.                                                      |
| E50-043 | **PI** | Cursor/helpers e alguns índices existem. Permanecem `.select('*')`, paginação offset/sem limite e nenhuma certificação por workload/EXPLAIN.                                                                        |
| E50-044 | **PI** | Logger/batch/tracing existem. Auth ainda registra e-mail, URL/user-agent podem conter PII/token e não há redator central/retention proof ponta a ponta.                                                             |
| E50-045 | **PI** | Health/telemetria agora falham fechado: erro é calculado por consultas e coleta incompleta retorna `503`. `APP_URL`, scrape/alertas, política das slow queries e operação implantada continuam não comprovados.     |
| E50-046 | **PI** | Há componentes ARIA e testes dispersos. Não existe laudo WCAG 2.2 AA completo por teclado, leitor, contraste, zoom, reduced motion e mobile.                                                                        |
| E50-047 | **PV** | PR/ruleset e sete checks requeridos existem; o gate de DB agora exige secret e reprova indisponibilidade. E2E e Netlify falham, installs não são herméticos e há bypass permanente.                                 |
| E50-048 | **BE** | Não há staging Supabase hospedado isolado, promoção por digest, PITR/restore atual nem game day. Requer plataforma, credenciais e owner.                                                                            |
| E50-049 | **PV** | Auditoria, planos, handoff, sete ADRs e runbooks existem. Documentos históricos se contradizem; faltam catálogo canônico, OpenAPI/ERD/RoPA/DPIA completos e freshness gates.                                        |
| E50-050 | **NI** | Nota vigente é 4,11/10. Não houve recertificação das 22 dimensões no mesmo SHA nem decisão formal de go-live.                                                                                                       |

## 4. Funcionalidades sugeridas, simuladas ou parciais

### 4.1 Segurança e banco — bloqueadores absolutos

| Capacidade                  | Estado real                                            | Correção vinculada                                                                          |
| --------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Views seguras               | **Parcial; banco reprovado**                           | E50-004/006/035: revogar `anon/PUBLIC`, `security_invoker`, colunas mínimas e matriz T1/T2. |
| RPCs privilegiadas          | **Parcial; banco reprovado**                           | E50-005/013/035: autorização interna, grants mínimos e testes negativos diretos.            |
| Lockout/rate limit de login | **Parcial/fallback mascarando ausência**               | E50-008/013/022: RPCs atômicas, WAF/CAPTCHA e bypass do wrapper testado.                    |
| Selos/hash                  | **Implementado parcialmente; 11 smokes falham**        | E50-007/017: qualificar `extensions.digest`, decidir triggers e provar adulteração.         |
| Baseline/ledger             | **Candidato não promovido**                            | E50-009–012/019: ADR, staging, duas restaurações e só então repair do baseline.             |
| Tipos gerados               | **Desatualizados**                                     | E50-020: codegen do staging aprovado e diff bloqueante.                                     |
| Storage                     | **4/19 buckets**                                       | E50-015/032: criar 15 privados e testar owner/path/MIME/limite/T2.                          |
| Cron                        | **7 vivos não reconciliados; 3 de segurança ausentes** | E50-016/045: versionar, testar lock/idempotência/alerta.                                    |
| PCS                         | **Código/migration local; objetos ausentes no vivo**   | E50-014: implementar integralmente ou retirar rota/service/tipos.                           |
| Realtime                    | **Não certificado contra publicação viva**             | E50-009/026/034: manifest da publication e E2E de atualização.                              |

### 4.2 Fluxos que ainda exibem sucesso ou dado sem lastro

| Fluxo                         | Evidência atual                                                                                           | Decisão obrigatória                                                                              |
| ----------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Protocolo eSocial de admissão | `contratacaoService.ts` espera 2 s e grava `PROTO-${Math.random()}` como sucesso.                         | Integrar endpoint/sandbox real ou desabilitar a ação fora de demo.                               |
| Assinatura ICP-Brasil         | `enviar-esocial/signer.ts` usa `assinaturaMock` e `CERTIFICADO_MOCK`.                                     | Implementar assinatura server-side com certificado homologado; nunca rotular mock como assinado. |
| WhatsApp                      | `whatsappService.ts` grava `status:'sent'` e IDs locais sem chamar Evolution API.                         | Provedor real + delivery receipt, ou estado `simulado/pendente`, nunca `sent`.                   |
| PDF de holerite               | `folhaPagamentoService.ts` devolve `storage.lovable.dev/...` após 1,5 s.                                  | Gerar, persistir, selar e retornar signed URL do bucket aprovado.                                |
| Sincronização de férias       | `syncWithHub` retorna `recordsUpdated: 0`; UI anuncia sincronização.                                      | Implementar contrato de hub ou remover timer/botão/copy.                                         |
| Incidente SST                 | `SSTPage.tsx` fecha modal e emite `toast.success` sem persistir.                                          | Mutation autoritativa + auditoria + teste de falha.                                              |
| Dashboard executivo           | Custos, impacto e economia permanecem literais (“42%”, “R$ 128k”, “R$ 12k/mês”).                          | Consultar fonte auditável ou identificar claramente como cenário demonstrativo.                  |
| Status eSocial                | UI mostra “Operacional” e “124ms” fixos.                                                                  | Health real com timestamp/fonte ou estado indisponível.                                          |
| Métrica Prometheus de erro    | **Remediada localmente:** calcula `erros/consultas`, expõe status de coleta e retorna `503` se degradada. | Implantar e comprovar scrape/alerta real.                                                        |
| Contatos de emergência        | **Remediado localmente:** consulta a tabela existente e propaga erro em vez de devolver `[]`.             | Validar isolamento T1/T2 e jornada autenticada em staging.                                       |
| Views de dashboard            | 16 métodos capturam erro e devolvem `[]`, confundindo falha com zero.                                     | Result/error tipado, observabilidade e estado de erro na UI.                                     |
| Backup por tabela             | Lista histórica usa `folha_pagamento` e `allSettled` pode produzir backup incompleto.                     | Manifest de tabelas real, falha fechada, checksum e restore.                                     |

### 4.3 Folha, benefícios, ponto e documentos

| Capacidade                | Estado real                                           | Falta para aceite                                                                                 |
| ------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Engine de folha           | **Parcial e duplicada**                               | Uma engine decimal/legal versionada e equivalência frontend/Edge.                                 |
| Cálculo em lote           | **Contrato quebrado**                                 | Remover `contratos_trabalho` inexistente, alinhar chave de upsert e testar transação.             |
| Provisões                 | **Parcial/quebra de `onConflict`**                    | Constraint real + cálculo único + fechamento/reabertura concorrentes.                             |
| Holerites                 | **Parcial; sem persistência/distribuição comprovada** | Gerar item/PDF/hash, assinar e distribuir com recibo real.                                        |
| CNAB 240/400/retorno      | **Parcial/inconsistente com schema/layout**           | Contrato de colunas, golden files bancários, tamanho exato, sequencial e conciliação idempotente. |
| PIX em lote               | **CRUD local, sem PSP/banco**                         | Provedor/sandbox, dupla aprovação, assinatura e webhook idempotente.                              |
| Benefícios                | **Split-brain de tabela**                             | Escolher `beneficios_colaborador` ou `beneficios_colaboradores`, migrar e eliminar a outra.       |
| Dependentes               | **Service consulta `empresa_id` incompatível**        | Isolamento via colaborador/empresa e testes de IRRF/salário-família.                              |
| Ponto/banco de horas      | **Parcial, tabelas/caminhos paralelos**               | Fonte única, vínculo auth↔colaborador, offline ordenado, biometria privada e selagem.             |
| Documentos/contratos      | **Parcial; buckets ausentes**                         | Schema único, upload privado, malware/MIME/limite, signed URL e lifecycle.                        |
| Rescisões/assinaturas     | **Parcial**                                           | Homologação, assinaturas obrigatórias, bloqueio de pagamento e trilha imutável.                   |
| SST/medidas disciplinares | **Parcial**                                           | Persistência real, PDFs/buckets, autorização das RPCs, token/recusa e E2E.                        |

### 4.4 Integrações e roadmap

| Integração/capacidade                       | Classificação revisada                                                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| eSocial transmissão                         | **Sugerida/iniciada:** modo simulado ou HTTP 503; sem cliente oficial.                                                          |
| eSocial S-3000/S-5001/S-5011                | **Parcial:** validadores existem; transmissão/assinatura/retorno não.                                                           |
| FGTS Digital                                | **Sugerida/iniciada:** gravação local, zero integração externa.                                                                 |
| DCTFWeb                                     | **Sugerida/iniciada:** gravação local, zero integração externa.                                                                 |
| CAGED e RAIS                                | **Não existem:** decidir se fazem parte do escopo legal/produto atual.                                                          |
| gov.br OIDC                                 | **Parcial:** código HTTP existe; secrets, uso e níveis de confiança não comprovados.                                            |
| Bitrix24                                    | **Parcial:** HTTP existe; configuração/uso não provados e cargos são stub.                                                      |
| Metabase/BI                                 | **Parcial:** Edge de embed existe; service frontend órfão/stub e ACL/deploy não homologados.                                    |
| Sentry frontend/Edge                        | **Parcial:** SDK/envelope existem; secrets, alertas, redaction e release real não provados.                                     |
| OCR/IA/biometria                            | **Parcial e dependente do Lovable Gateway:** provider, chave, retenção, logs, buckets e custo precisam de decisão explícita.    |
| CNPJ/CEP                                    | **Implementação local útil, operação não certificada:** fallback existe; falta teste de contrato/timeout/rate limit em staging. |
| Resend/e-mail                               | **Parcial:** chamadas existem, mas sem secret pode haver sucesso simulado; fila/entrega não comprovadas.                        |
| Slack                                       | **Sugerida/iniciada:** opt-in, sem prova de secret/canal/alerta.                                                                |
| Webhooks de saída                           | **Sugeridos/iniciados:** CRUD/log existe; `sync` não entrega integração.                                                        |
| Domínio/Alterdata                           | **Morto/órfão:** `fetch` existe, mas não há consumidor produtivo.                                                               |
| Capacitor/mobile                            | **Esqueleto:** config/script existem; pacotes e projetos Android/iOS não.                                                       |
| i18n                                        | **Parcial/órfão:** locales/hook/seletor existem, mas o seletor não tem consumidor e a UI não foi traduzida integralmente.       |
| Workflow BPMN-like                          | **Parcial:** designer/service/UI existem; persistência, concorrência e E2E do ciclo completo não foram certificados.            |
| CAGED, RAIS, SMTP próprio, Telegram, Stripe | **Ausentes:** não são defeitos até o owner aprovar requisito; se aprovados, entram em E50-010/028 antes de implementação.       |

### 4.5 Edge Functions sem caminho funcional comprovado

O inventário detalhado anterior continua válido para os arquivos/callers que não mudaram. Pelo menos estas 20 funções permanecem sem caller produtivo útil, sem cron, redundantes ou sem efeito real:

- `fgts-digital`, `dctfweb`, `pix-lote`, `cnab-remessa`, `emprestimo-consignado`, `adiantamento-salarial`;
- `gerar-holerite`, `assinaturaDigital`, `alertas-preditivos`, `notificacao`, `exportacao`, `importacao`;
- `criptografia`, `rateLimit`, `relatorio`, `auditoria`, `integracao`, `backup-automatico`, `metrics`, `warmup`.

Cada uma precisa de uma decisão em E50-010: **ligar a caller/cron e testar**, **substituir pelo caminho vivo**, ou **remover**. Deployar código órfão aumenta superfície de ataque e custo operacional; não conta como funcionalidade entregue.

## 5. Correções das declarações históricas

O arquivo raiz `PLANO_MELHORIAS.md` declarava `88/88`, “100% completo” e diversas features como `IMPLEMENTADO_TOTAL`. A revisão invalida essa interpretação:

- migrations de RLS/views/SECDEF existem, mas os gates físicos do canônico falham;
- migration de materialized views existe, mas o canônico não tinha as MVs esperadas;
- criar `metrics/index.ts` não implementa observabilidade se a fórmula é inválida e não há scraper;
- criar `metabaseService.ts` não implementa BI se o service é órfão/stub e o deploy não é comprovado;
- criar locales/hook não conclui i18n sem consumo real e tradução das jornadas;
- criar config/script Capacitor não entrega app sem dependências e projetos nativos;
- escrever specs não entrega “80% E2E” quando Playwright falha antes de iniciar;
- criar função/migration sem caller, contrato físico e promoção não conclui a feature.

O documento legado foi marcado como histórico. Seu conteúdo permanece útil como intenção e referência de commits, não como placar de aceite.

## 6. Ajustes feitos no plano

Os 50 IDs e a ordem foram preservados. Para fechar lacunas de cobertura:

1. **E50-010** passou a classificar também páginas, Edge Functions, integrações, stubs e sucessos simulados — não apenas drift físico.
2. **E50-028** agora nomeia obrigações legais e integrações externas, exige provider real ou desativação explícita e proíbe sucesso sintético fora de demo.
3. **E50-030** passou a incluir caller/cron no manifest de Edge Functions e a reprovar função órfã.
4. **E50-040** passou a cobrir rotas/services/hooks/Edge Functions sem caminho de execução.
5. **E50-042** passou a exigir decisão/entrega real sobre Capacitor/mobile.
6. **E50-049** passou a exigir catálogo honesto de capacidades e depreciação de status históricos contraditórios.

## 7. Estado do GitHub e consequência para o plano

- PR #98: aberto, `mergeStateStatus=BLOCKED`, sem aprovação.
- Passam: Type Check, Lint, Unit Tests, Edge Functions, configuração estática, job de integridade e CodeQL/Audit.
- Falham: Playwright E2E e Build & Preview/Netlify.
- Secrets do repositório listados: somente `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Ausentes: quatro credenciais E2E, `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`, `SUPABASE_DB_URL`; `APP_URL` também não existe como variável.
- O job de banco pode ficar verde sem `SUPABASE_DB_URL`, portanto esse verde não comprova o canônico.
- O ruleset exige sete checks, mas não exige Playwright nem Build & Preview; usa `strict_required_status_checks_policy=false` e tem um usuário com bypass permanente.

Consequência: E50-047 é parcial. O PR não pode ser usado como evidência de deploy/E2E/banco, mesmo com vários checks verdes.

## 8. Ordem obrigatória revisada

1. **Contenção:** E50-001–008. Rotação, views, SECDEF, RLS, hashes e Auth antes de qualquer nova feature.
2. **Reconstrução:** E50-009–020. ADR, baseline, objetos, Storage, cron, constraints, restore duplo, ledger e tipos.
3. **Verdade funcional:** E50-010 deve atribuir decisão a cada item das seções 4.2–4.5. Até lá, esconder/desabilitar fluxos que simulam sucesso.
4. **Domínios críticos:** E50-021–029, começando por fonte única de dados/folha/benefícios e integrações legalmente obrigatórias.
5. **Prova:** E50-030–039, com staging, callers reais, matriz RLS e E2E sem skip.
6. **Engenharia/entrega:** E50-040–050, sem declarar 10/10 antes da recertificação no mesmo SHA.

## 9. Gate objetivo para a próxima revisão

A próxima revisão só pode elevar uma etapa a `C4` se trouxer:

- link de commit/PR aprovado e checks obrigatórios;
- evidência de staging e hash/version do artefato implantado;
- teste positivo e negativo sem skip;
- prova de contrato físico (schema/RPC/bucket/config) no destino;
- rollback/restore ensaiado;
- smoke pós-deploy e observabilidade correta;
- owner e decisão de escopo para features retiradas.

Até isso ocorrer, o estado oficial é: **0/50 concluídas, go-live bloqueado e nenhuma entrada de dados reais**.
