# Plano Executivo de Melhorias — 50 Etapas

**Projeto:** Departamento Pessoal V3
**Data-base:** 10/09/2026
**Estado inicial:** 4,11/10 após auditoria direta do banco canônico
**Dados:** massa sintética/descartável; entrada de dados reais bloqueada
**Meta:** ≥8,0/10, zero P0/P1 e liberação reproduzível

> Consolida a auditoria local, a inspeção viva do Supabase e o grafo de dependências. Não autoriza reset, exclusão, `db push` ou `migration repair` em massa.

> **Revisão de implementação vigente (11/09/2026):** a existência de código, migration, teste ou documentação não encerra uma etapa. Consulte [`REVISAO_IMPLEMENTACAO_PLANO_50_2026-09-11.md`](./REVISAO_IMPLEMENTACAO_PLANO_50_2026-09-11.md) e seu snapshot JSON: 42 etapas parciais, 2 com dependência externa e 6 sem demonstração integral do objetivo; **nenhuma com C4 comprovado**. A revisão de 10/09 permanece como histórico.
>
> **Exceção de ambiente autorizada pelo owner:** alterações podem ser realizadas diretamente no canônico enquanto os dados são descartáveis. Não exigir nova autorização genérica ou staging como condição de autorização. Permanecem necessários escopo versionado, recuperação, testes e evidências; essa exceção não comprova staging/DR nem encerra E50-048.

## Regras de execução

- Ordem obrigatória, com contenção E50-001–E50-008 antes de qualquer feature.
- Banco muda primeiro em ambiente efêmero, depois staging; canônico somente com autorização explícita.
- Testes usam exclusivamente dados e identidades sintéticos.
- Checkbox requer evidência vinculada ao PR/run; afirmação verbal não conta.
- C1–C4 são cumulativos; somente C4 encerra a etapa.
- Ausência de conexão/secret/ambiente bloqueia o gate, nunca produz verde.
- Toda mudança tem teste positivo, teste negativo, observabilidade e rollback ensaiado.

## Ondas

| Onda             | Etapas          | Saída                                                       |
| ---------------- | --------------- | ----------------------------------------------------------- |
| 0 — Contenção    | E50-001–E50-008 | credenciais, views, RPCs, RLS, hashes e Auth contidos       |
| 1 — Reconstrução | E50-009–E50-019 | baseline/ledger/schema/Storage/cron restauráveis            |
| 2 — Aplicação    | E50-020–E50-029 | tipos e domínios críticos coerentes                         |
| 3 — Verificação  | E50-030–E50-039 | Edge, integração, RLS, E2E e segurança comprovados          |
| 4 — Engenharia   | E50-040–E50-046 | arquitetura, qualidade, performance, observabilidade e a11y |
| 5 — Entrega      | E50-047–E50-050 | CI protegido, staging/DR, docs e recertificação             |

## E50-001 — Rotacionar credenciais comprometidas

| Campo        | Valor                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------ |
| Onda         | Onda 0 — Contenção                                                                         |
| Prioridade   | P0                                                                                         |
| Dependências | nenhuma                                                                                    |
| Objetivo     | Revogar senha de banco e token administrativo expostos; atualizar somente secret managers. |

### 10 subetapas

1. [ ] **Evidência inicial:** senha de banco e token administrativo foram expostos; inventariar fingerprints, consumidores e status de revogação sem revelar valores.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Revogar senha de banco e token administrativo expostos; atualizar somente secret managers.
5. [ ] **Teste positivo:** Consumers autorizados conectam; credencial antiga recebe 401/403.
6. [ ] **Teste negativo:** Segredo em Git/log ou consumidor esquecido bloqueia.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-002 — Congelar dados reais e criar recuperação

| Campo        | Valor                                                                              |
| ------------ | ---------------------------------------------------------------------------------- |
| Onda         | Onda 0 — Contenção                                                                 |
| Prioridade   | P0                                                                                 |
| Dependências | E50-001                                                                            |
| Objetivo     | Bloquear go-live, preservar branch, exportar schema/ledger/config e testar backup. |

### 10 subetapas

1. [ ] **Evidência inicial:** Massa atual declarada sintética; canais de entrada de PII e rollback catalogados.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Bloquear go-live, preservar branch, exportar schema/ledger/config e testar backup.
5. [ ] **Teste positivo:** Restore isolado reproduz estado e fixtures continuam descartáveis.
6. [ ] **Teste negativo:** Promoção/importação de PII sem aprovação falha.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-003 — Fixar Supabase canônico e sincronizar Git

| Campo        | Valor                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------ |
| Onda         | Onda 0 — Contenção                                                                               |
| Prioridade   | P0                                                                                               |
| Dependências | E50-002                                                                                          |
| Objetivo     | Parametrizar o ref frjb…, neutralizar ciziy… remoto e integrar origin/main por branch protegida. |

### 10 subetapas

1. [ ] **Evidência inicial:** Ref confirmado pelo owner; local um commit atrás e vite remoto divergente.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Parametrizar o ref frjb…, neutralizar ciziy… remoto e integrar origin/main por branch protegida.
5. [ ] **Teste positivo:** Build, CLI, health e smoke resolvem o mesmo projeto.
6. [ ] **Teste negativo:** Ref ausente, misturado ou proibido aborta antes da primeira chamada.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-004 — Fechar as views anônimas

| Campo        | Valor                                                                                         |
| ------------ | --------------------------------------------------------------------------------------------- |
| Onda         | Onda 0 — Contenção                                                                            |
| Prioridade   | P0                                                                                            |
| Dependências | E50-002–003                                                                                   |
| Objetivo     | Revogar anon/PUBLIC, aplicar security_invoker/RPC autorizada e minimizar campos nas 44 views. |

### 10 subetapas

1. [ ] **Evidência inicial:** Quatro views retornaram PII, auditoria, banco de horas ou SQL sem login; 43 têm grant anon.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Revogar anon/PUBLIC, aplicar security_invoker/RPC autorizada e minimizar campos nas 44 views.
5. [ ] **Teste positivo:** Papéis aprovados recebem somente linhas/colunas previstas.
6. [ ] **Teste negativo:** Publishable key sem JWT, usuário sem empresa e tenant vizinho obtêm zero dado protegido.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-005 — Endurecer SECURITY DEFINER

| Campo        | Valor                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------- |
| Onda         | Onda 0 — Contenção                                                                                |
| Prioridade   | P0                                                                                                |
| Dependências | E50-004                                                                                           |
| Objetivo     | Revisar 204 overloads; revogar EXECUTE excessivo e validar auth.uid, papel e tenant internamente. |

### 10 subetapas

1. [ ] **Evidência inicial:** 23 funções privilegiadas executáveis por anon e 113 por authenticated; nove casos críticos priorizados.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Revisar 204 overloads; revogar EXECUTE excessivo e validar auth.uid, papel e tenant internamente.
5. [ ] **Teste positivo:** Callers legítimos preservam contrato.
6. [ ] **Teste negativo:** Anon, UUID arbitrário, tenant vizinho e chamada indireta são negados.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-006 — Reconstruir RLS e ACLs

| Campo        | Valor                                                                                          |
| ------------ | ---------------------------------------------------------------------------------------------- |
| Onda         | Onda 0 — Contenção                                                                             |
| Prioridade   | P0                                                                                             |
| Dependências | E50-004–005                                                                                    |
| Objetivo     | Substituir claims livres, alinhar USING/WITH CHECK e adotar grants/default privileges mínimos. |

### 10 subetapas

1. [ ] **Evidência inicial:** 611 policies; 60 falhas tenant, 17 PII, 50 least-privilege, 55 USING(true).
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Substituir claims livres, alinhar USING/WITH CHECK e adotar grants/default privileges mínimos.
5. [ ] **Teste positivo:** Cada papel opera somente no próprio tenant.
6. [ ] **Teste negativo:** Usuário sem empresa, metadata forjada e FK para T2 não leem nem mutam.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-007 — Restaurar hashes e triggers

| Campo        | Valor                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------ |
| Onda         | Onda 0 — Contenção                                                                               |
| Prioridade   | P0                                                                                               |
| Dependências | E50-005–006                                                                                      |
| Objetivo     | Corrigir search_path/qualificação de pgcrypto e decidir os dois triggers de folha desabilitados. |

### 10 subetapas

1. [x] **Evidência inicial:** 13 funções `enforce_*_hash` identificadas; dez com `search_path=public`, uma sem configuração e duas com `public, extensions`. `digest(...)` sob `public` reproduz SQLSTATE `42883`.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Migration local `20260911190000_p0_hash_trigger_search_path.sql` restaura `public, extensions, pg_catalog` nos 13 gatilhos; aplicação no canônico e decisão sobre os dois triggers de folha seguem pendentes.
5. [ ] **Teste positivo:** Em fixture PostgreSQL 17, os 13 gatilhos executam `digest()` após duas aplicações idempotentes; falta validar os corpos/dados canônicos e os 11 smokes completos.
6. [ ] **Teste negativo:** A fixture rejeita migration sem `pgcrypto` no schema `extensions` e com função de gatilho faltante; adulteração, schema malicioso e bypass real seguem pendentes.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [x] **Gate permanente:** `test:migrations:p0` e o job CI `P0 Hash-trigger migration` reproduzem o defeito, validam os 13 gatilhos, reaplicação e cenários fail-closed.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito e escopo técnico reproduzidos; falta aprovação formal de owner/contrato operacional.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-008 — Restaurar lockout e rate limit de Auth

| Campo        | Valor                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------- |
| Onda         | Onda 0 — Contenção                                                                          |
| Prioridade   | P0                                                                                          |
| Dependências | E50-005–006                                                                                 |
| Objetivo     | Implementar RPCs ausentes, remover reset público e combinar CAPTCHA/WAF/rate limit atômico. |

### 10 subetapas

1. [ ] **Evidência inicial:** auth-login degrada por RPCs ausentes; reset_login_attempts é anon-executable.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Implementar RPCs ausentes, remover reset público e combinar CAPTCHA/WAF/rate limit atômico.
5. [ ] **Teste positivo:** Login, bloqueio, expiração e recuperação autorizada funcionam.
6. [ ] **Teste negativo:** Brute force distribuído, enumeração, replay e bypass do wrapper falham.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-009 — Criar manifest físico determinístico

| Campo        | Valor                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------- |
| Onda         | Onda 1 — Reconstrução                                                                     |
| Prioridade   | P0                                                                                        |
| Dependências | E50-002                                                                                   |
| Objetivo     | Versionar inventário de schema, ACL, policies, funções, triggers, Storage, cron e ledger. |

### 10 subetapas

1. [ ] **Evidência inicial:** Inventário vivo possui 9.037 itens e hash conhecido.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Versionar inventário de schema, ACL, policies, funções, triggers, Storage, cron e ledger.
5. [ ] **Teste positivo:** Duas execuções sem mudança geram o mesmo hash.
6. [ ] **Teste negativo:** Mudança fora de migration produz diff legível e bloqueante.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-010 — Classificar todo drift técnico e funcional

| Campo        | Valor                                                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Onda         | Onda 1 — Reconstrução                                                                                                   |
| Prioridade   | P0                                                                                                                      |
| Dependências | E50-009                                                                                                                 |
| Objetivo     | Decidir manter/implementar/substituir/arquivar/remover cada diferença de schema, função, página, integração e contrato. |

### 10 subetapas

1. [ ] **Evidência inicial:** Conciliar drift físico e o inventário funcional: páginas parciais, Edge Functions sem chamador, stubs, sucessos simulados, integrações ausentes e código morto.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Registrar decisão e owner para cada diferença código↔tipos↔banco e para cada funcionalidade parcial, sugerida, simulada, órfã ou morta.
5. [ ] **Teste positivo:** Todo consumidor ativo aponta para objeto aprovado.
6. [ ] **Teste negativo:** Objeto órfão, chamada fantasma ou remoção com consumer reprova.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-011 — Aprovar ADR de baseline/squash

| Campo        | Valor                                                                                |
| ------------ | ------------------------------------------------------------------------------------ |
| Onda         | Onda 1 — Reconstrução                                                                |
| Prioridade   | P0                                                                                   |
| Dependências | E50-009–010                                                                          |
| Objetivo     | Definir corte, fonte de verdade, arquivo histórico, versionamento futuro e promoção. |

### 10 subetapas

1. [ ] **Evidência inicial:** 640 versões locais únicas versus 33 no ledger; repair em massa é inseguro.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Definir corte, fonte de verdade, arquivo histórico, versionamento futuro e promoção.
5. [ ] **Teste positivo:** Revisor independente reproduz a estratégia.
6. [ ] **Teste negativo:** db push/repair massivo, versão duplicada ou etapa sem rollback são proibidos.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-012 — Construir baseline canônico

| Campo        | Valor                                                                                 |
| ------------ | ------------------------------------------------------------------------------------- |
| Onda         | Onda 1 — Reconstrução                                                                 |
| Prioridade   | P0                                                                                    |
| Dependências | E50-011                                                                               |
| Objetivo     | Produzir DDL ordenado do estado desejado com checksum, ownership e grants explícitos. |

### 10 subetapas

1. [ ] **Evidência inicial:** Export atual é insumo, não verdade segura; correções P0 entram antes do squash.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Produzir DDL ordenado do estado desejado com checksum, ownership e grants explícitos.
5. [ ] **Teste positivo:** Banco vazio recebe baseline e gera manifest esperado.
6. [ ] **Teste negativo:** Execução parcial, ordem inválida ou extensão ausente falha claramente.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-013 — Restaurar RPCs e tabelas requeridas

| Campo        | Valor                                                                                               |
| ------------ | --------------------------------------------------------------------------------------------------- |
| Onda         | Onda 1 — Reconstrução                                                                               |
| Prioridade   | P0                                                                                                  |
| Dependências | E50-010–012                                                                                         |
| Objetivo     | Implementar ou remover deliberadamente objetos ausentes de Auth, authz, rate limit, LGPD e vínculo. |

### 10 subetapas

1. [ ] **Evidência inicial:** Código chama check_account_lockout, edge_rate_limit_check, helpers authz/LGPD e vínculo ausentes.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Implementar ou remover deliberadamente objetos ausentes de Auth, authz, rate limit, LGPD e vínculo.
5. [ ] **Teste positivo:** Fluxos nominais executam no banco restaurado.
6. [ ] **Teste negativo:** Caller indevido, corrida, retry e tenant errado falham fechados.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-014 — Decidir e completar o módulo PCS

| Campo        | Valor                                                                                    |
| ------------ | ---------------------------------------------------------------------------------------- |
| Onda         | Onda 1 — Reconstrução                                                                    |
| Prioridade   | P1                                                                                       |
| Dependências | E50-010–012                                                                              |
| Objetivo     | Implementar tabelas/RPCs PCS com cálculo server-side ou remover integralmente o recurso. |

### 10 subetapas

1. [ ] **Evidência inicial:** pcsService referencia cinco tabelas e várias RPCs ausentes.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Implementar tabelas/RPCs PCS com cálculo server-side ou remover integralmente o recurso.
5. [ ] **Teste positivo:** Plano, fatores, grades, enquadramento e impacto são determinísticos.
6. [ ] **Teste negativo:** Plano alheio, faixa inválida e concorrência não corrompem dados.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-015 — Provisionar os 19 buckets

| Campo        | Valor                                                                                                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Onda         | Onda 1 — Reconstrução                                                                                                                                                                      |
| Prioridade   | P0                                                                                                                                                                                         |
| Dependências | E50-006 e E50-012                                                                                                                                                                          |
| Objetivo     | Convergir os 19 buckets para o contrato canônico: 18 privados com path tenant/owner/MIME/limite; `avatars` público com mutação somente do owner; `backups` privado e exclusivo de serviço. |

### 10 subetapas

1. [ ] **Evidência inicial:** A medição viva de 2026-09-11 registra 18/19 buckets. Falta `backups`; vários buckets existentes não têm MIME/limite. A foto histórica 4/19 foi superada e permanece apenas no relatório de revisão.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Criar `backups` e aplicar o contrato canônico de visibilidade, path, owner, MIME e limite nos 19 buckets; não tornar `avatars` privado nem disponibilizar `backups` ao cliente.
5. [ ] **Teste positivo:** Upload/download assinado/remoção autorizada passam em 19/19.
6. [ ] **Teste negativo:** Anon, T2, path traversal, MIME forjado, excesso e spoof de owner falham.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-016 — Versionar cron e rotinas periódicas

| Campo        | Valor                                                                                                                             |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Onda         | Onda 1 — Reconstrução                                                                                                             |
| Prioridade   | P1                                                                                                                                |
| Dependências | E50-012–013                                                                                                                       |
| Objetivo     | Reconciliar os 50 jobs ativos, revisar comandos duplicados e restaurar as funções ausentes dos três jobs de segurança existentes. |

### 10 subetapas

1. [ ] **Evidência inicial:** Catálogo vivo de 11/09: 50 jobs ativos e oito grupos com comandos idênticos. Os três jobs sec-* existem, mas sec_audit_policies_scan, sec_policy_regressions_purge e sec_verify_seals_scan estão ausentes; o diagnóstico histórico de sete jobs/três agendamentos ausentes foi superado.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Versionar a reconciliação dos 50 jobs; decidir cadência/ownership por grupo repetido e restaurar/testar as três funções de segurança antes de manter seus agendamentos. Não criar novos jobs duplicados.
5. [ ] **Teste positivo:** Cada job executa uma vez com resultado e latência observáveis.
6. [ ] **Teste negativo:** Dupla execução, atraso, lock e erro parcial não duplicam/apagam indevidamente.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-017 — Validar constraints e normalizar triggers

| Campo        | Valor                                                                            |
| ------------ | -------------------------------------------------------------------------------- |
| Onda         | Onda 1 — Reconstrução                                                            |
| Prioridade   | P0                                                                               |
| Dependências | E50-012–013                                                                      |
| Objetivo     | Sanear fixtures, validar 12 CHECKs, decidir PK do archive e consolidar triggers. |

### 10 subetapas

1. [ ] **Evidência inicial:** 12 CHECK NOT VALID, 398 triggers e uma tabela pública sem PK.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Sanear fixtures, validar 12 CHECKs, decidir PK do archive e consolidar triggers.
5. [ ] **Teste positivo:** Estados legais passam e efeitos dos triggers são únicos.
6. [ ] **Teste negativo:** Estado ilegal, órfão, recursão e transição proibida são recusados.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-018 — Corrigir índices com EXPLAIN

| Campo        | Valor                                                                     |
| ------------ | ------------------------------------------------------------------------- |
| Onda         | Onda 1 — Reconstrução                                                     |
| Prioridade   | P1                                                                        |
| Dependências | E50-017                                                                   |
| Objetivo     | Avaliar 24 FKs sem índice e 31 grupos duplicados usando workload e locks. |

### 10 subetapas

1. [ ] **Evidência inicial:** Contagens são sinais; nenhuma remoção automática é autorizada.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Avaliar 24 FKs sem índice e 31 grupos duplicados usando workload e locks.
5. [ ] **Teste positivo:** Planos críticos melhoram sem degradar escrita além do budget.
6. [ ] **Teste negativo:** Baixa seletividade, carga concorrente e migration longa bloqueiam.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-019 — Restaurar duas vezes e reconciliar ledger

| Campo        | Valor                                                                                |
| ------------ | ------------------------------------------------------------------------------------ |
| Onda         | Onda 1 — Reconstrução                                                                |
| Prioridade   | P0                                                                                   |
| Dependências | E50-012–018                                                                          |
| Objetivo     | Executar duas restaurações vazias e registrar somente a versão aprovada do baseline. |

### 10 subetapas

1. [ ] **Evidência inicial:** Ledger atual não representa o físico nem as 13 policies fora dele.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Executar duas restaurações vazias e registrar somente a versão aprovada do baseline.
5. [ ] **Teste positivo:** As duas restaurações produzem mesmo manifest, hash e ledger.
6. [ ] **Teste negativo:** Objeto extra, versão duplicada ou repair não aprovado impede promoção.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-020 — Regenerar tipos e contratos

| Campo        | Valor                                                                               |
| ------------ | ----------------------------------------------------------------------------------- |
| Onda         | Onda 2 — Aplicação                                                                  |
| Prioridade   | P0                                                                                  |
| Dependências | E50-019                                                                             |
| Objetivo     | Fixar CLI, gerar types.ts do staging aprovado e corrigir callers sem any/supressão. |

### 10 subetapas

1. [ ] **Evidência inicial:** Tipos locais divergem fortemente do banco vivo.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Fixar CLI, gerar types.ts do staging aprovado e corrigir callers sem any/supressão.
5. [ ] **Teste positivo:** Typecheck app/testes/E2E passa contra contratos reais.
6. [ ] **Teste negativo:** Alteração de coluna/enum/RPC sem codegen deixa diff e reprova.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-021 — Criar camada de acesso a dados

| Campo        | Valor                                                                             |
| ------------ | --------------------------------------------------------------------------------- |
| Onda         | Onda 2 — Aplicação                                                                |
| Prioridade   | P1                                                                                |
| Dependências | E50-020                                                                           |
| Objetivo     | Centralizar repositories por domínio, selects mínimos, paginação e erros tipados. |

### 10 subetapas

1. [ ] **Evidência inicial:** Há muitos acessos Supabase diretos e select('*') espalhados.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Centralizar repositories por domínio, selects mínimos, paginação e erros tipados.
5. [ ] **Teste positivo:** Fluxos preservam dados/UX com contrato uniforme.
6. [ ] **Teste negativo:** Timeout, RLS, conflito, zero/múltiplas linhas e payload ruim são tratados.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-022 — Unificar sessão, login e MFA

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Onda         | Onda 2 — Aplicação                                                            |
| Prioridade   | P0                                                                            |
| Dependências | E50-008 e E50-021                                                             |
| Objetivo     | Implementar máquina de estados fail-closed e step-up AAL2 em ações sensíveis. |

### 10 subetapas

1. [ ] **Evidência inicial:** Auth/MFA existe, mas há bypass e comportamento fail-open/degradado.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Implementar máquina de estados fail-closed e step-up AAL2 em ações sensíveis.
5. [ ] **Teste positivo:** Login regular/admin, refresh, MFA, recovery e logout passam.
6. [ ] **Teste negativo:** Token vencido/roubado, downgrade AAL e aba concorrente falham.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-023 — Centralizar RBAC/ABAC server-side

| Campo        | Valor                                                                   |
| ------------ | ----------------------------------------------------------------------- |
| Onda         | Onda 2 — Aplicação                                                      |
| Prioridade   | P0                                                                      |
| Dependências | E50-006 e E50-022                                                       |
| Objetivo     | Usar fonte server-owned de papéis; frontend vira apenas controle de UX. |

### 10 subetapas

1. [ ] **Evidência inicial:** Decisões de acesso estão distribuídas entre guards, profiles, helpers e policies.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Usar fonte server-owned de papéis; frontend vira apenas controle de UX.
5. [ ] **Teste positivo:** Papéis colaborador/RH/financeiro/auditor/admin cumprem a matriz.
6. [ ] **Teste negativo:** Metadata adulterada, rota direta e papel conflitante não elevam privilégio.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-024 — Consolidar a engine de folha

| Campo        | Valor                                                             |
| ------------ | ----------------------------------------------------------------- |
| Onda         | Onda 2 — Aplicação                                                |
| Prioridade   | P0                                                                |
| Dependências | E50-013 e E50-023                                                 |
| Objetivo     | Definir uma engine decimal, transacional e legalmente versionada. |

### 10 subetapas

1. [ ] **Evidência inicial:** Existem caminhos de cálculo/fechamento/provisão que precisam de fonte única.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Definir uma engine decimal, transacional e legalmente versionada.
5. [ ] **Teste positivo:** Golden cases conciliam bruto, encargos, descontos, líquido e contabilidade.
6. [ ] **Teste negativo:** Retry, competência fechada, vigência errada e corrida não mudam resultado.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-025 — Tornar ponto e banco de horas antifraude

| Campo        | Valor                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------ |
| Onda         | Onda 2 — Aplicação                                                                         |
| Prioridade   | P0                                                                                         |
| Dependências | E50-007, E50-015 e E50-023                                                                 |
| Objetivo     | Vincular usuário-colaborador, validar dispositivo/tenant, ordenar offline e selar espelho. |

### 10 subetapas

1. [ ] **Evidência inicial:** RPC de batida aceita IDs arbitrários; buckets/hash/offline têm gaps.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Vincular usuário-colaborador, validar dispositivo/tenant, ordenar offline e selar espelho.
5. [ ] **Teste positivo:** Batida online/offline, ajuste e fechamento geram saldo determinístico.
6. [ ] **Teste negativo:** Replay, relógio adulterado, geofence falsa e colaborador de T2 falham.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-026 — Consolidar férias, afastamentos e benefícios

| Campo        | Valor                                                                       |
| ------------ | --------------------------------------------------------------------------- |
| Onda         | Onda 2 — Aplicação                                                          |
| Prioridade   | P1                                                                          |
| Dependências | E50-015, E50-020 e E50-024                                                  |
| Objetivo     | Centralizar períodos, sobreposição, abono, coletivas, retorno e documentos. |

### 10 subetapas

1. [ ] **Evidência inicial:** Regras e uploads atravessam UI, RPCs e buckets ausentes.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Centralizar períodos, sobreposição, abono, coletivas, retorno e documentos.
5. [ ] **Teste positivo:** Cenários legais de borda geram valores/estados/documentos corretos.
6. [ ] **Teste negativo:** Prazo ilegal, sobreposição, dupla concessão e documento adulterado falham.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-027 — Endurecer rescisões, contratos e assinaturas

| Campo        | Valor                                                                               |
| ------------ | ----------------------------------------------------------------------------------- |
| Onda         | Onda 2 — Aplicação                                                                  |
| Prioridade   | P0                                                                                  |
| Dependências | E50-005, E50-007 e E50-015                                                          |
| Objetivo     | Aplicar state machine, homologação, autorização, token one-time e hash verificável. |

### 10 subetapas

1. [ ] **Evidência inicial:** Funções de assinatura/espelho permitem identificadores arbitrários.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Aplicar state machine, homologação, autorização, token one-time e hash verificável.
5. [ ] **Teste positivo:** Fluxo válido mantém trilha imutável até pagamento.
6. [ ] **Teste negativo:** Token expirado/reusado, assinatura de terceiro e pagamento precoce falham.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-028 — Validar obrigações legais, financeiro e integrações externas

| Campo        | Valor                                                                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Onda         | Onda 2 — Aplicação                                                                                                                              |
| Prioridade   | P0                                                                                                                                              |
| Dependências | E50-007, E50-013 e E50-024                                                                                                                      |
| Objetivo     | Tornar reais ou desabilitar explicitamente eSocial/ICP-Brasil, FGTS Digital, DCTFWeb, CNAB, PIX, WhatsApp/e-mail, gov.br, Bitrix, ERP, BI e IA. |

### 10 subetapas

1. [ ] **Evidência inicial:** Há integrações simuladas, CRUD local apresentado como transmissão, protocolos fictícios, serviços órfãos e integrações apenas sugeridas; CAGED/RAIS exigem decisão explícita de escopo.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Versionar layouts/assinaturas/sequenciais/idempotência, integrar provedores aprovados e remover qualquer `success` ou protocolo sintético fora de modo de demonstração isolado.
5. [ ] **Teste positivo:** Sandbox oficial ou double contratual homologado comprova envio, retorno, assinatura, conciliação e trilha exatamente uma vez.
6. [ ] **Teste negativo:** Provedor/secret ausente, layout antigo, CNPJ ruim, replay, webhook forjado, timeout e T2 falham fechados e nunca gravam sucesso.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-029 — Fechar SST, disciplina e LGPD

| Campo        | Valor                                                                       |
| ------------ | --------------------------------------------------------------------------- |
| Onda         | Onda 2 — Aplicação                                                          |
| Prioridade   | P0                                                                          |
| Dependências | E50-005, E50-007, E50-013–016                                               |
| Objetivo     | Autorizar por vínculo, restaurar retenção/DSAR e selar documentos/ciências. |

### 10 subetapas

1. [ ] **Evidência inicial:** PII foi pública; anonimização e assinatura têm authz fraca; limpeza usa objetos ausentes.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Autorizar por vínculo, restaurar retenção/DSAR e selar documentos/ciências.
5. [ ] **Teste positivo:** SST, ciência, retenção e anonimização autorizada passam ponta a ponta.
6. [ ] **Teste negativo:** Acesso médico indevido, anonimização de terceiro e token abusado falham.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-030 — Comparar Edge Functions implantadas

| Campo        | Valor                                                                             |
| ------------ | --------------------------------------------------------------------------------- |
| Onda         | Onda 3 — Verificação                                                              |
| Prioridade   | P0                                                                                |
| Dependências | E50-003 e PAT read-only                                                           |
| Objetivo     | Criar manifest nome/hash/verify_jwt/import-map/secrets e comparar Management API. |

### 10 subetapas

1. [ ] **Evidência inicial:** Comparação Management API de 11/09: 60 Edge Functions locais e 59 remotas; metabase-embed ausente no remoto. Dos 59 entrypoints comparados, 56 diferem textualmente e 3 coincidem após normalização de CRLF/fim de arquivo. Shared dependencies, secrets, callers e equivalência funcional ainda não foram certificados; gerar-holerite e metrics têm divergências semânticas confirmadas.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Criar manifest nome/hash/verify_jwt/import-map/secrets/callers/cron e comparar repositório, Management API e catálogo de capacidades aprovado.
5. [ ] **Teste positivo:** Staging contém exatamente funções/config do commit.
6. [ ] **Teste negativo:** Função extra/órfã, hash diferente, secret ausente, caller inexistente ou verify_jwt inesperado bloqueia.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-031 — Padronizar segurança das Edge Functions

| Campo        | Valor                                                                   |
| ------------ | ----------------------------------------------------------------------- |
| Onda         | Onda 3 — Verificação                                                    |
| Prioridade   | P0                                                                      |
| Dependências | E50-023 e E50-030                                                       |
| Objetivo     | Centralizar middleware de JWT, authz, CORS, CSRF, payload e rate limit. |

### 10 subetapas

1. [ ] **Evidência inicial:** 60 funções e o bridge têm modelos de exposição distintos.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Centralizar middleware de JWT, authz, CORS, CSRF, payload e rate limit.
5. [ ] **Teste positivo:** Origem/papel permitido recebe contrato consistente.
6. [ ] **Teste negativo:** Sem JWT, origem hostil, CSRF, body excessivo e método errado falham.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-032 — Uniformizar validação e uploads

| Campo        | Valor                                                                           |
| ------------ | ------------------------------------------------------------------------------- |
| Onda         | Onda 3 — Verificação                                                            |
| Prioridade   | P1                                                                              |
| Dependências | E50-015 e E50-031                                                               |
| Objetivo     | Compartilhar schemas, limites, normalização, magic bytes, quarentena e scanner. |

### 10 subetapas

1. [ ] **Evidência inicial:** Validação existe, mas não cobre toda mutation/upload de forma comprovada.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Compartilhar schemas, limites, normalização, magic bytes, quarentena e scanner.
5. [ ] **Teste positivo:** Entradas legais de fronteira preservam precisão/encoding.
6. [ ] **Teste negativo:** Fuzz, mass assignment, polyglot, ZIP bomb e path traversal falham.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-033 — Elevar testes unitários por risco

| Campo        | Valor                                                                |
| ------------ | -------------------------------------------------------------------- |
| Onda         | Onda 3 — Verificação                                                 |
| Prioridade   | P1                                                                   |
| Dependências | E50-020–029                                                          |
| Objetivo     | Cobrir decisões, bordas, falhas e propriedades dos módulos críticos. |

### 10 subetapas

1. [ ] **Evidência inicial:** Cobertura global é ~61% statements e ~54% functions.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Cobrir decisões, bordas, falhas e propriedades dos módulos críticos.
5. [ ] **Teste positivo:** Casos nominais e invariantes de alto risco estão ≥80%.
6. [ ] **Teste negativo:** Mutation testing seletivo demonstra que defeitos são detectados.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-034 — Criar integração com Supabase real

| Campo        | Valor                                                                                  |
| ------------ | -------------------------------------------------------------------------------------- |
| Onda         | Onda 3 — Verificação                                                                   |
| Prioridade   | P0                                                                                     |
| Dependências | E50-019–020                                                                            |
| Objetivo     | Subir ambiente efêmero, aplicar baseline e testar Auth/PostgREST/RPC/Storage/triggers. |

### 10 subetapas

1. [ ] **Evidência inicial:** Muitos testes usam mocks e os testes de migration cobrem só três arquivos.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Subir ambiente efêmero, aplicar baseline e testar Auth/PostgREST/RPC/Storage/triggers.
5. [ ] **Teste positivo:** CRUD e integrações nominais passam no schema real.
6. [ ] **Teste negativo:** RLS, constraint, timeout, conflito e objeto ausente reprovam.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-035 — Automatizar matriz RLS por papel/tenant

| Campo        | Valor                                                                  |
| ------------ | ---------------------------------------------------------------------- |
| Onda         | Onda 3 — Verificação                                                   |
| Prioridade   | P0                                                                     |
| Dependências | E50-006, E50-023 e E50-034                                             |
| Objetivo     | Gerar harness de anon, sem empresa, T1/T2 e todos os papéis/operações. |

### 10 subetapas

1. [ ] **Evidência inicial:** Vazamentos anônimo e autenticado foram reproduzidos ao vivo.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Gerar harness de anon, sem empresa, T1/T2 e todos os papéis/operações.
5. [ ] **Teste positivo:** Todos os allows definidos passam.
6. [ ] **Teste negativo:** IDs T2, empresa nula, claim forjada, view e RPC indireta não vazam.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-036 — Testar concorrência e idempotência

| Campo        | Valor                                                                      |
| ------------ | -------------------------------------------------------------------------- |
| Onda         | Onda 3 — Verificação                                                       |
| Prioridade   | P0                                                                         |
| Dependências | E50-024–029                                                                |
| Objetivo     | Cobrir folha, ponto, CNAB, PIX, webhooks, filas e sequências concorrentes. |

### 10 subetapas

1. [ ] **Evidência inicial:** Retries/locks/idempotência não são uniformes.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Cobrir folha, ponto, CNAB, PIX, webhooks, filas e sequências concorrentes.
5. [ ] **Teste positivo:** N chamadas concorrentes produzem um único efeito correto.
6. [ ] **Teste negativo:** Replay, timeout pós-commit, deadlock e ordem invertida não duplicam/perdem.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-037 — Executar E2E por papel e dispositivo

| Campo        | Valor                                                                       |
| ------------ | --------------------------------------------------------------------------- |
| Onda         | Onda 3 — Verificação                                                        |
| Prioridade   | P0                                                                          |
| Dependências | E50-022–036                                                                 |
| Objetivo     | Provisionar secrets/identidades sintéticas e rodar jornadas desktop/mobile. |

### 10 subetapas

1. [ ] **Evidência inicial:** 24 specs existem, mas o workflow não inicia por quatro secrets ausentes.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Provisionar secrets/identidades sintéticas e rodar jornadas desktop/mobile.
5. [ ] **Teste positivo:** Jornadas críticas passam em staging no mesmo SHA.
6. [ ] **Teste negativo:** Papel errado, sessão vencida, rede lenta, T2 e retry falham com segurança.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-038 — Sanear supply chain e segredos

| Campo        | Valor                                                                    |
| ------------ | ------------------------------------------------------------------------ |
| Onda         | Onda 3 — Verificação                                                     |
| Prioridade   | P0                                                                       |
| Dependências | E50-001 e E50-003                                                        |
| Objetivo     | Atualizar sharp, regenerar locks, executar CodeQL/gitleaks e gerar SBOM. |

### 10 subetapas

1. [ ] **Evidência inicial:** npm audit encontrou vulnerabilidade alta transitiva.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Atualizar sharp, regenerar locks, executar CodeQL/gitleaks e gerar SBOM.
5. [ ] **Teste positivo:** Build/imagens passam com zero high/critical.
6. [ ] **Teste negativo:** Secret sintético, pacote solto, licença proibida ou advisory novo bloqueia.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-039 — Executar threat model e pentest

| Campo        | Valor                                                                |
| ------------ | -------------------------------------------------------------------- |
| Onda         | Onda 3 — Verificação                                                 |
| Prioridade   | P0                                                                   |
| Dependências | E50-031, E50-035 e E50-038                                           |
| Objetivo     | Testar STRIDE/LINDDUN, IDOR, SQLi, XSS, CSRF, SSRF, upload e replay. |

### 10 subetapas

1. [ ] **Evidência inicial:** A auditoria revelou cadeias reais de view/RPC/RLS.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Testar STRIDE/LINDDUN, IDOR, SQLi, XSS, CSRF, SSRF, upload e replay.
5. [ ] **Teste positivo:** Controles preservam jornadas legítimas.
6. [ ] **Teste negativo:** Cadeias anteriormente exploráveis deixam de atingir dados/efeitos.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-040 — Eliminar ciclos, god files e duplicação

| Campo        | Valor                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------- |
| Onda         | Onda 4 — Engenharia                                                                          |
| Prioridade   | P1                                                                                           |
| Dependências | E50-021                                                                                      |
| Objetivo     | Definir boundaries de domínio, inverter infraestrutura e decompor arquivos/clones por seams. |

### 10 subetapas

1. [ ] **Evidência inicial:** Grafo/Madge: dois ciclos; 157 arquivos >200 linhas; 90 clones; rotas órfãs, services paralelos e código sem caminho de execução.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Definir boundaries, corrigir ou remover rotas/serviços/hooks/Edge Functions órfãos e decompor arquivos/clones por seams.
5. [ ] **Teste positivo:** Rotas e regras permanecem cobertas com boundaries acíclicos.
6. [ ] **Teste negativo:** Import proibido, regressão de estado ou clone novo reprova.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-041 — Fechar dívida de lint e tipos

| Campo        | Valor                                                                                 |
| ------------ | ------------------------------------------------------------------------------------- |
| Onda         | Onda 4 — Engenharia                                                                   |
| Prioridade   | P1                                                                                    |
| Dependências | E50-020 e E50-040                                                                     |
| Objetivo     | Substituir any/assertions por unknown, guards, generics e unions; lintar testes/Edge. |

### 10 subetapas

1. [ ] **Evidência inicial:** 728 ': any', 283 'as any' e 14 warnings sob teto.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Substituir any/assertions por unknown, guards, generics e unions; lintar testes/Edge.
5. [ ] **Teste positivo:** Typecheck/lint ficam verdes com ratchet reduzido.
6. [ ] **Teste negativo:** Any novo, promise perdida, unused e supressão global bloqueiam.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-042 — Reduzir bundle e concluir PWA/mobile

| Campo        | Valor                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------------- |
| Onda         | Onda 4 — Engenharia                                                                                |
| Prioridade   | P1                                                                                                 |
| Dependências | E50-040                                                                                            |
| Objetivo     | Lazy-load Excel/PDF/gráficos, limitar precache e concluir ou retirar o esqueleto Capacitor/mobile. |

### 10 subetapas

1. [ ] **Evidência inicial:** Main ~382KB gzip, Excel ~288KB, precache ~12MB; Capacitor tem config/script, mas não tem dependências nem projetos Android/iOS versionados.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Lazy-load Excel/PDF/gráficos, revisar chunks/precache e entregar pipeline mobile reproduzível ou remover a promessa de app nativo.
5. [ ] **Teste positivo:** Budgets de JS/LCP/INP/CLS passam em cache frio.
6. [ ] **Teste negativo:** Rede lenta e atualização de service worker não quebram navegação.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-043 — Otimizar queries e paginação

| Campo        | Valor                                                                    |
| ------------ | ------------------------------------------------------------------------ |
| Onda         | Onda 4 — Engenharia                                                      |
| Prioridade   | P1                                                                       |
| Dependências | E50-018 e E50-021                                                        |
| Objetivo     | Trocar select('*'), aplicar keyset/batch e validar índices por workload. |

### 10 subetapas

1. [ ] **Evidência inicial:** Há 254 select('*') e pouca evidência de EXPLAIN top-20.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Trocar select('*'), aplicar keyset/batch e validar índices por workload.
5. [ ] **Teste positivo:** P95/custo permanecem no orçamento em tenant grande.
6. [ ] **Teste negativo:** Página profunda, filtro adverso e escrita concorrente não degradam.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-044 — Redigir PII e padronizar logs

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Onda         | Onda 4 — Engenharia                                                           |
| Prioridade   | P0                                                                            |
| Dependências | E50-029 e E50-031                                                             |
| Objetivo     | Criar allowlist/redator central, request ID, sampling, retenção e batch real. |

### 10 subetapas

1. [ ] **Evidência inicial:** Auth/loggers podem persistir email, URL e user-agent.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Criar allowlist/redator central, request ID, sampling, retenção e batch real.
5. [ ] **Teste positivo:** Eventos mantêm contexto sem PII direta.
6. [ ] **Teste negativo:** CPF, email, token e query string são mascarados antes de console/RPC/Sentry.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-045 — Corrigir métricas, health, SLOs e alertas

| Campo        | Valor                                                                                 |
| ------------ | ------------------------------------------------------------------------------------- |
| Onda         | Onda 4 — Engenharia                                                                   |
| Prioridade   | P0                                                                                    |
| Dependências | E50-004, E50-031 e E50-044                                                            |
| Objetivo     | Corrigir taxa de erro, proteger slow queries, separar probes e deduplicar incidentes. |

### 10 subetapas

1. [ ] **Evidência inicial:** bridge_error_rate é inválida; dp_slow_queries era anon; houve 402/200 e 8 issues.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Corrigir taxa de erro, proteger slow queries, separar probes e deduplicar incidentes.
5. [ ] **Teste positivo:** Dashboards/health refletem incidentes sintéticos e recuperação.
6. [ ] **Teste negativo:** Falha de coleta, página genérica e label ausente não geram falso verde/storm.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-046 — Garantir acessibilidade WCAG 2.2 AA

| Campo        | Valor                                                                     |
| ------------ | ------------------------------------------------------------------------- |
| Onda         | Onda 4 — Engenharia                                                       |
| Prioridade   | P1                                                                        |
| Dependências | E50-037 e E50-040                                                         |
| Objetivo     | Auditar foco, teclado, contraste, labels, erros, zoom e leitores de tela. |

### 10 subetapas

1. [ ] **Evidência inicial:** Atributos existem, mas cobertura axe e manual é insuficiente para a superfície.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Auditar foco, teclado, contraste, labels, erros, zoom e leitores de tela.
5. [ ] **Teste positivo:** Jornadas críticas passam axe, teclado, NVDA/VoiceOver e mobile.
6. [ ] **Teste negativo:** Modal sem foco, controle sem nome e erro não anunciado bloqueiam.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-047 — Tornar CI hermético e proteger main

| Campo        | Valor                                                                                    |
| ------------ | ---------------------------------------------------------------------------------------- |
| Onda         | Onda 5 — Entrega                                                                         |
| Prioridade   | P0                                                                                       |
| Dependências | E50-019, E50-030, E50-034–039                                                            |
| Objetivo     | Fixar toolchains/Actions, frozen install e required checks sem continue-on-error/bypass. |

### 10 subetapas

1. [ ] **Evidência inicial:** Sete workflows existem, mas checks essenciais podem não executar ou falhar.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Fixar toolchains/Actions, frozen install e required checks sem continue-on-error/bypass.
5. [ ] **Teste positivo:** Mesmo SHA produz artefato e resultados equivalentes.
6. [ ] **Teste negativo:** Lock drift, DB sem conexão, E2E sem secret e push direto bloqueiam.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-048 — Implantar staging, rollback e DR

| Campo        | Valor                                                                           |
| ------------ | ------------------------------------------------------------------------------- |
| Onda         | Onda 5 — Entrega                                                                |
| Prioridade   | P0                                                                              |
| Dependências | E50-019 e E50-047                                                               |
| Objetivo     | Criar staging isolado, artefato por digest, promoção imutável, PITR e game day. |

### 10 subetapas

1. [ ] **Evidência inicial:** Staging/último deploy/backup privado ainda não foram comprovados.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Criar staging isolado, artefato por digest, promoção imutável, PITR e game day.
5. [ ] **Teste positivo:** Canário, restore e rollback cumprem RTO/RPO.
6. [ ] **Teste negativo:** Falha de migration, quota, health ou rollback aborta promoção.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-049 — Consolidar documentação e governança

| Campo        | Valor                                                                                                                      |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Onda         | Onda 5 — Entrega                                                                                                           |
| Prioridade   | P1                                                                                                                         |
| Dependências | E50-010–048                                                                                                                |
| Objetivo     | Publicar índice canônico, catálogo honesto de capacidades, ADRs, ERD/dicionário, OpenAPI, runbooks, RoPA/DPIA e ownership. |

### 10 subetapas

1. [ ] **Evidência inicial:** Há centenas de docs e sete ADRs, mas também status históricos contraditórios, capacidades declaradas como concluídas sem execução e contratos incompletos.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Publicar índice/catálogo canônico, marcar documentos legados como superados e manter ADRs, ERD/dicionário, OpenAPI, runbooks, RoPA/DPIA e ownership.
5. [ ] **Teste positivo:** Novo mantenedor reproduz ambiente/incidente só com docs aprovadas.
6. [ ] **Teste negativo:** Link quebrado, fato sem last-verified e item sem owner reprovam.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## E50-050 — Recertificar e decidir go-live

| Campo        | Valor                                                                     |
| ------------ | ------------------------------------------------------------------------- |
| Onda         | Onda 5 — Entrega                                                          |
| Prioridade   | Gate final                                                                |
| Dependências | E50-001–049                                                               |
| Objetivo     | Reexecutar as 22 dimensões no mesmo SHA e emitir decisão formal go/no-go. |

### 10 subetapas

1. [ ] **Evidência inicial:** Baseline atual é 4,11/10 com P0 comprovados.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Reexecutar as 22 dimensões no mesmo SHA e emitir decisão formal go/no-go.
5. [ ] **Teste positivo:** Restore, DB gates, CI, Security, E2E, health e domínios críticos ficam verdes.
6. [ ] **Teste negativo:** Qualquer P0/P1, drift, PII pública, credencial antiga ou rollback não provado bloqueia.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** automatizar os testes e o critério objetivo; exceção exige owner, compensação e expiração.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** defeito reproduzido; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente e métricas dentro do limite.
- [ ] **C4 — Evidência:** staging/canário aprovado, documentação atualizada e links anexados.

## Gate final

O sistema só poderá receber dados reais depois da conclusão de E50-050 e da comprovação simultânea de:

- credenciais expostas revogadas e zero segredo em Git/log;
- zero PII, auditoria ou SQL acessível anonimamente;
- zero acesso cross-tenant por tabela, view, RPC, Storage ou Edge Function;
- 11/11 smokes de integridade aprovados;
- baseline restaurado duas vezes com o mesmo inventário/hash;
- tipos, schema, ledger, buckets, cron e Edge manifest no mesmo SHA;
- CI, Security, integração, E2E e healthcheck verdes;
- zero vulnerabilidade crítica/alta sem exceção formal;
- backup/PITR, rollback e DR dentro de RTO/RPO;
- nota reavaliada ≥8,0 e zero P0/P1 aberto.
