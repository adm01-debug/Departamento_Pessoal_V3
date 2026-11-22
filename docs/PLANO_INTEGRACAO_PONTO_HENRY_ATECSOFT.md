# Plano — Integração do ponto Henry / Ponto AtecSoft com o DP V3

> Criado em 21/11/2026. Plano de execução em 120 etapas, com critério de conclusão por etapa.
> Revisão 2 (21/11/2026): o dono decidiu integração de mão dupla — ver D1 e Fase 9.
> Marque `[x]` no mesmo PR que conclui a etapa. Este arquivo é plano, não regra: `AGENTS.md` vence.

## 1. Objetivo

Hoje o colaborador bate ponto com a digital no relógio Henry (matriz e filial), o Ponto AtecSoft de um PC
recolhe as batidas, e no fim do mês o DP imprime o espelho, colhe assinaturas em papel e repassa para a
contabilidade apurar horas extras, atestados e faltas.

Meta: as batidas do relógio aparecem sozinhas no DP V3, o espelho é conferido e assinado dentro do sistema e a
contabilidade recebe o fechamento sem redigitação. **O DP V3 passa a ser a única tela que as pessoas usam**: o
AtecSoft continua instalado e rodando em segundo plano como registro legal, o DP V3 lê as batidas dele e grava
nele os lançamentos feitos no nosso sistema (atestado, férias, afastamento, folga, abono, cadastro). O horário
de uma batida original do relógio nunca é alterado.

## 2. O que foi verificado (21/11/2026)

| Fato                                                                                                                                             | Evidência                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| AtecSoft 2.1.13 grava em Firebird 1.5 local (ODS 10.1), 51 tabelas, sem chaves, triggers ou procedures                                           | banco `DADOS\PONTO_ATECSOFT.FDB` do instalador, aberto com `isql`                       |
| `CP` guarda um registro por funcionário/dia: `E1..E6`, `S1..S6`, `REF_*`, `OBS_*`, `JE*/JS*`, `EQUIP_*`, `ABONO`, `ABONO_NEG`, `FOLGA`, `NEUTRO` | DDL extraído do banco                                                                   |
| `FUNCIONARIO` tem `PIS`, `CPF`, `MATRICULA`, `EMPRESA`, `SITUACAO`, `HORARIO`                                                                    | DDL extraído do banco                                                                   |
| Textos do banco estão em `CHARACTER SET OCTETS` (latin-1 cru)                                                                                    | consulta em `JUSTFICATIVA` devolve bytes                                                |
| O AtecSoft exporta AFD, AFDT, ACJEF, espelho e layouts de folha Domínio, Rubi, Pholy e Consistem                                                 | tabela `EXP` e textos do executável                                                     |
| O banco do instalador vem vazio (0 funcionários, 0 batidas)                                                                                      | `SELECT COUNT(*)` em `FUNCIONARIO` e `CP`                                               |
| O DP V3 já importa AFDT/ACJEF/AEJ, reconcilia e lista divergências, mas **não cria batida a partir do relógio** e o upload é manual              | `supabase/functions/parse-afdt/index.ts`, `src/components/ponto/ImportarAFDTDialog.tsx` |
| O DP V3 já tem assinatura eletrônica de espelho                                                                                                  | `assinar_espelho_ponto`, `src/components/ponto/AssinarEspelhoDialog.tsx`                |
| `colaboradores` já tem `codigo_firebird`, `unidade`, `pis_pasep`, `matricula`                                                                    | `src/integrations/supabase/types.ts`                                                    |
| O coletor antigo pula dia já sincronizado e perde saídas e correções                                                                             | `sync_ponto.py`: `if (cid, db) in es: sk += 1; continue`                                |
| O coletor antigo guarda a chave `service_role` em arquivo texto no PC                                                                            | `config.json` / `env_GO.txt` dos dois protótipos                                        |

### Achados de 21/11/2026 sobre o banco do DP V3 e o Promo_Finance_V2

Fonte: `inventario/estado/banco.json` (medido em 16/11/2026, contagens estimadas) e
`supabase/baseline/20260831_canonical/canonical_schema.sql`. As três primeiras linhas foram **confirmadas ao vivo**
em 21/11/2026 pelo `canonical-sql-diag.yml` (run 44951290182), consertado na PR #791. O mesmo run mostrou que
`registros_ponto.tipo_dia` aceita `normal`, `feriado`, `compensado`, `folga`, `falta`, `atestado`, `ferias` e `licenca`,
que é o destino das justificativas do AtecSoft (etapas 13 e 68).

| Achado                                                                                                                            | Evidência                                                                                                              | Efeito no plano                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `batidas_ponto.origem` é texto livre, sem lista fechada de valores                                                                | baseline: `"origem" "text" DEFAULT 'manual'` e nenhum CHECK                                                            | etapa 24 não precisa de DDL                                                        |
| Já existem as unicidades (colaborador, data, ordem) e (colaborador, data, hora, tipo)                                             | baseline: `batidas_ponto_colaborador_id_data_ordem_key`, `batidas_ponto_no_duplicate_batida`                           | etapa 25 vira conferência, sem índice novo                                         |
| Batida não pode ser apagada: há gatilho de imutabilidade                                                                          | baseline: `trigger_imutabilidade_ponto BEFORE DELETE` em `batidas_ponto`                                               | etapa 41 não pode "apagar e recriar"                                               |
| Inserir batida dispara hash, validação e consolidação automática                                                                  | baseline: `tr_gerar_hash_batida_ponto`, `trg_enforce_batida_ponto_hash`, `tr_validate_ponto`, `trg_consolidar_batidas` | etapas 41 e 67 precisam passar por esses gatilhos                                  |
| O banco tem 1 empresa, cerca de 16 colaboradores e 0 batidas                                                                      | `inventario/estado/banco.json`: `empresas`=1, `colaboradores`=16, `batidas_ponto`=0                                    | matriz e filial e os colaboradores reais ainda precisam ser cadastrados (etapa 17) |
| O Promo_Finance_V2 não consome ponto: ele pede o total mensal da folha (salários, pró-labore, encargos), hoje digitado ou por CSV | `Promo_Finance_V2`: `src/components/tributario/historico/FolhaTab.tsx:48-59`                                           | etapa 88 fecha no DP V3; o envio da folha ao Finance é outra integração            |

**NÃO VERIFICADO** (vira etapa abaixo): conteúdo real do banco das duas unidades; se o AtecSoft recolhe do
relógio sozinho ou só quando alguém clica em "Receber"; significado exato de `REF_*` e de `CP_T`; estado real do
banco de produção do DP V3 (só o código foi lido); modelo e firmware dos relógios.

## 3. Arquitetura

```
Relógio Henry ──rede──> Ponto AtecSoft (PC da unidade) ──> PONTO_ATECSOFT.FDB
                                                              │ leitura (batidas) ▲ escrita (lançamentos)
                                                     Coletor Windows (1 por unidade)
                                                              │ HTTPS + token da unidade; o PC sempre inicia
                                              Edge Function `ingest-ponto-rep` (DP V3) + fila de comandos
                                                              │
                              staging `ponto_rep_*` ──> `batidas_ponto` / `registros_ponto`
                                                              │
                         espelho → assinatura eletrônica → fechamento → exportação para a contabilidade
```

Princípios:

1. Leitura em transação read-only. Escrita só pela fila de comandos da Fase 9, só nos campos mapeados, com
   backup antes e conferência depois. Nunca altera nem apaga horário de batida original do relógio.
2. Nenhuma chave mestra fora do Supabase: o PC guarda só um token por unidade, revogável, que serve apenas para
   enviar ponto.
3. Idempotente: reenviar o mesmo dia não duplica; dia alterado no AtecSoft atualiza o DP V3.
4. Vínculo de pessoa por CPF, depois PIS, depois matrícula. Nunca por nome.
5. Batida original do relógio não é editável. Lançamentos nascem no DP V3 e são gravados no AtecSoft pelo coletor.
6. DDL só pelo `canonical-migrations.yml`; Edge Function só pelo `canonical-edge-functions.yml`.

## 4. Decisões do dono (bloqueiam as etapas indicadas)

| #   | Decisão                                                                                                                                                                                                                                 | Bloqueia             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| D1  | **Decidido em 21/11/2026:** mão dupla com o banco do AtecSoft. O DP V3 lê as batidas e grava de volta atestado, férias, afastamento/licenças, folga/abono e cadastro (admissão/desligamento). As pessoas usam só o DP V3                | —                    |
| D6  | Batida esquecida: o DP pode incluir pelo DP V3 e ela é gravada no AtecSoft marcada como manual, com motivo?                                                                                                                             | etapa nova após a 11 |
| D2  | **Decidido em 21/11/2026:** quem bate no relógio Henry bate só no relógio; app e quiosque do DP V3 não registram batida para essas pessoas                                                                                              | —                    |
| D3  | **Decidido em 21/11/2026:** a assinatura do espelho continua no papel; o DP V3 mostra, calcula e imprime                                                                                                                                | —                    |
| D4  | **Decidido em 21/11/2026:** não há layout de sistema contábil a seguir. O fechamento, a documentação e o processo ficam nos sistemas próprios (DP V3 e Promo_Finance_V2); a contabilidade recebe o relatório do DP V3 quando for o caso | —                    |
| D5  | **Decidido em 21/11/2026:** o técnico de TI da empresa instala o coletor nos dois PCs                                                                                                                                                   | —                    |

## 5. Legenda

- **R8** = item da regra 8 do Fluxo Git: a PR fica aberta aguardando o dono (DDL, segredo, CI, arquitetura).
- **Pronto quando** = evidência exigida para marcar `[x]`.

## 6. Etapas

### Fase 0 — Decisões e insumos (1–8)

- [x] **1. Registrar D1 (fonte da verdade).** Pronto quando: decisão escrita na seção 4 deste arquivo.
- [x] **2. Registrar D2 (app/quiosque convive com o relógio).** Pronto quando: decisão escrita na seção 4.
- [x] **3. Registrar D3 (assinatura eletrônica).** Pronto quando: decisão escrita na seção 4.
- [x] **4. Registrar D4 (sistema da contabilidade).** Pronto quando: nome do sistema e layout escritos na seção 4.
- [x] **5. Registrar D5 (responsável pela instalação).** Pronto quando: nome e unidade escritos na seção 4.
- [ ] **6. Receber cópia do banco real da matriz.** Arquivo `C:\Ponto AtecSoft\DADOS\PONTO_ATECSOFT.FDB`. Pronto quando: arquivo abre no `isql` e `CP` tem linhas.
- [ ] **7. Receber cópia do banco real da filial.** Pronto quando: idem etapa 6.
- [ ] **8. Guardar os bancos fora do repositório.** Contêm CPF e PIS. Pronto quando: `git status` limpo e os arquivos só existem em ambiente de análise descartável.

### Fase 1 — Diagnóstico do estado real (9–18)

- [ ] **9. Perfilar `FUNCIONARIO` das duas unidades.** Contar ativos, sem CPF, sem PIS, códigos repetidos entre unidades. Pronto quando: tabela de contagens anexada à PR da etapa 18.
- [ ] **10. Perfilar `CP`.** Período coberto, dias por funcionário, uso de `E3..E6`. Pronto quando: contagens anexadas.
- [ ] **11. Decifrar `REF_*`.** Comparar batidas originais com inseridas à mão no AtecSoft. Pronto quando: tabela valor → significado, com 3 exemplos reais.
- [ ] **12. Decifrar `CP_T`.** Pronto quando: confirmado por dados se é a cópia tratada ou o original.
- [ ] **13. Mapear `JUSTFICATIVA` e `JE*/JS*`.** Atestado, férias, folga, licenças, INSS. Pronto quando: tabela código → tipo do DP V3.
- [ ] **14. Verificar coleta automática.** Ler `CONFIG.HAB_COM_AGEND`, `COM_AGEND`, `EQUIP.DATA_COM`, `NSR`. Pronto quando: resposta "o AtecSoft recolhe sozinho? de quanto em quanto tempo?" por unidade.
- [ ] **15. Identificar os relógios.** Ler `EQUIP` (modelo, `NUM_REP`, IP). Pronto quando: modelo e número de série de cada relógio registrados neste arquivo.
- [x] **16. Diagnosticar o banco de produção do DP V3.** Feito em 21/11/2026: constraints de `batidas_ponto` e `registros_ponto` lidas ao vivo (run 44951290182). O preenchimento de `codigo_firebird`/`pis_pasep` fica para a etapa 17, que depende do banco real do AtecSoft. Via `canonical-sql-diag.yml` (somente leitura): colunas e constraints de `batidas_ponto`, `registros_ponto`, `afdt_*`, valores aceitos em `origem`, preenchimento de `codigo_firebird`/`pis_pasep`. Pronto quando: saída do workflow anexada.
- [ ] **17. Cruzar funcionários do AtecSoft com `colaboradores`.** Por CPF/PIS, sem gravar nada. Pronto quando: lista de casados, ambíguos e órfãos por unidade.
- [ ] **18. Publicar o relatório de diagnóstico.** `docs/auditoria/ponto-henry-diagnostico.md`, sem dado pessoal. Pronto quando: PR mergeada.

### Fase 2 — Modelo de dados (19–32) — R8

- [x] **19. Desenhar `ponto_rep_dispositivos`.** Um coletor por unidade: `empresa_id`, unidade, hash do token, último contato, versão. Pronto quando: DDL revisado na PR. Feito: #795; tabela no canônico (apply 44956208120, verify 44956510074).
- [x] **20. Desenhar `ponto_rep_lotes`.** Cada envio do coletor: dispositivo, período, contagens, hash, status. Pronto quando: DDL revisado. Feito: #795; idem.
- [x] **21. Desenhar `ponto_rep_dias`.** Cópia fiel de cada linha de `CP`: código do funcionário, data, 12 horários, referências, justificativas, abonos, hash do conteúdo. Único por (dispositivo, código, data). Pronto quando: DDL revisado. Feito: #795; idem.
- [x] **22. Desenhar `ponto_rep_funcionarios`.** Cópia de `FUNCIONARIO` + `colaborador_id` vinculado e como foi vinculado. Único por (dispositivo, código). Pronto quando: DDL revisado. Feito: #795; idem.
- [x] **23. Desenhar `ponto_rep_justificativas`.** De-para código AtecSoft → tipo do DP V3. Pronto quando: DDL revisado. Feito: #795; idem.
- [x] **24. Definir a origem "relógio" em `batidas_ponto`.** A coluna é texto livre (achados da seção 2): usar `relogio`, sem DDL. Confirmado ao vivo (run 44951290182): nenhum CHECK sobre `origem`.
- [x] **25. Conferir a unicidade de batida.** As unicidades (colaborador, data, ordem) e (colaborador, data, hora, tipo) já existem no baseline. Confirmadas ao vivo (run 44951290182): `batidas_ponto_colaborador_id_data_ordem_key` e `batidas_ponto_no_duplicate_batida`.
- [x] **26. Ligar RLS por `empresa_id` nas 5 tabelas novas.** Leitura para papéis de DP; escrita só `service_role`. Pronto quando: policies no DDL. Feito: #795; policies `<tabela>_select_rh` conferidas pelo sidecar.
- [x] **27. Escrever a migration.** `supabase/migrations/<timestamp>_ponto_rep_ingestao.sql`, idempotente. Pronto quando: arquivo na PR. Feito: `20261121210000_ponto_rep_ingestao.sql` (#795).
- [x] **28. Escrever o sidecar `.verify.sql`.** Tabelas, policies, índices e grants. Pronto quando: arquivo na PR. Feito: `20261121210000_ponto_rep_ingestao.verify.sql` (#795).
- [x] **29. Testar em Postgres descartável.** `scripts/tests/migrations-ponto-rep.sh`. Pronto quando: script passa localmente e no CI. Feito: `scripts/tests/migrations-ponto-rep.sh` (#799), shard 3/3 verde no CI.
- [x] **30. Rodar `validate` no canônico.** Pronto quando: `CANONICAL_MIGRATION_DRY_RUN_OK` no log. Feito: validate run 44956080691.
- [x] **31. Dono aprova e mergeia; rodar `apply` + `verify`.** Pronto quando: job verde e sidecar confirma os objetos. Feito: apply 44956208120 + verify 44956510074 (lote 1); lote 2 (5 migrations) verify 44962489677.
- [ ] **32. Regenerar os tipos.** `src/integrations/supabase/types.ts`. Pronto quando: `npm run typecheck` verde.

### Fase 3 — Função de ingestão (33–46)

- [x] **33. Criar `supabase/functions/ingest-ponto-rep/`.** POST-only, JSON. Pronto quando: função responde 405 a GET em teste. Feito: #798; GET ao vivo → 405.
- [x] **34. Autenticar por token de dispositivo.** Header próprio, comparação por hash em tempo constante; `verify_jwt = false` justificado no `config.toml` (R8). Pronto quando: token errado → 401 em teste. Feito: #798; POST sem token e com token falso ao vivo → 401; `verify_jwt=false` justificado no config.toml.
- [x] **35. Validar o contrato.** Schema do corpo, tamanho máximo, datas plausíveis. Pronto quando: corpo inválido → 400 com código de erro. Feito: #798; schema Zod estrito em `logica.ts`.
- [x] **36. Aplicar rate limit por dispositivo.** Usar `_shared/rateLimit.ts`. Pronto quando: excesso → 429 em teste. Feito: #798; `index.ts:38-39,51-52` chama `checkRateLimit`/`rateLimitResponse` por IP (120/60s) e por dispositivo (60/60s) antes de qualquer acesso a dado; mecanismo de 429 testado em `_shared/rateLimit.test.ts`; confirmado ao vivo em 22/11/2026 que o fluxo não bloqueia tráfego normal (ver etapa 46).
- [x] **37. Travar o dispositivo na própria empresa.** O `empresa_id` vem do dispositivo, nunca do corpo. Pronto quando: teste prova que corpo com outra empresa é ignorado. Feito: #798; corpo com `empresa_id` é rejeitado pelo schema estrito.
- [x] **38. Gravar o lote e os funcionários.** Upsert em `ponto_rep_lotes` e `ponto_rep_funcionarios`. Pronto quando: reenvio idêntico não cria linhas. Feito: #798; upsert por (lote) e (dispositivo, código).
- [x] **39. Gravar os dias com hash.** Upsert em `ponto_rep_dias`; só processa o dia cujo hash mudou. Pronto quando: teste de idempotência verde. Feito: #798; dia só é regravado quando o hash muda (`processado_em` volta a nulo).
- [x] **40. Vincular funcionário a colaborador.** CPF → PIS → matrícula; ambíguo ou ausente fica pendente. Pronto quando: teste cobre os 4 casos. Feito: #798; CPF → PIS → matrícula, ambíguo fica pendente (testes Deno).
- [ ] **41. Converter dia em batidas.** Função SQL transacional que só insere o que falta: batida é imutável (gatilho de imutabilidade), então correção vinda do AtecSoft entra como ajuste, nunca como exclusão. Pronto quando: dia alterado no envio seguinte reflete no espelho sem apagar batida.
- [ ] **42. Não tocar batida de outra origem.** Pronto quando: teste prova que batida de app/quiosque/ajuste sobrevive ao reprocessamento.
- [ ] **43. Respeitar período fechado.** Dia de competência fechada em `periodos_ponto` não é reprocessado; gera alerta. Pronto quando: teste verde.
- [x] **44. Registrar auditoria.** Cada lote em `ponto_auditoria`/log de edge, sem CPF em claro. Pronto quando: `audit:edge-audit-log` verde. Feito: confirmado em 22/11/2026 — `npm run audit:edge-audit-log` → `EDGE_AUDIT_LOG_CONTRACT_OK checked_inserts=25`; erro de lote vira `captureException` (Sentry) sem CPF/PIS (`index.ts:163-170`).
- [ ] **45. Testes da função.** Deno: autenticação, idempotência, vínculo, reprocessamento, período fechado. Pronto quando: `lint:edge` e `typecheck:edge` verdes. Em 22/11/2026: `lint:edge` e `audit:edge-syntax` verdes (sem Deno neste ambiente para `typecheck:edge`, inalterado desde a verificação do #798). Autenticação/idempotência/vínculo já testados (`logica.test.ts`, #798); reprocessamento e período fechado continuam bloqueados pelas etapas 41 e 43.
- [x] **46. Publicar.** Via `canonical-edge-functions.yml`. Pronto quando: chamada real com token de teste devolve 200 e a linha aparece em `ponto_rep_lotes`. Feito em 22/11/2026: dispositivo descartável criado na empresa `[E2E-SEED]` (`61e7d382-…`), POST real em `https://frjbfeamybqsejlvmqbl.supabase.co/functions/v1/ingest-ponto-rep` → `200 {"ok":true,"lote_id":"b6b187a4-…"}`, linha confirmada em `ponto_rep_lotes` (`status=processado`) e removida depois junto com o dispositivo — produção sem resíduo.

### Fase 4 — Coletor Windows (47–62)

- [x] **47. Criar `tools/coletor-ponto-atecsoft/`.** Python 32 bits, sem dependência de biblioteca Firebird. Pronto quando: pasta com README na PR. Feito: #796.
- [ ] **48. Reaproveitar o cliente Firebird 1.5.** Portar `fb15_client.py` (leitura via `gds32.dll`, transação read-only). Pronto quando: lê `FUNCIONARIO` do banco real em teste manual registrado. Código completo e revisado em 22/11/2026 (`fb15_client.py`: protocolo Firebird via ctypes, `isc_tpb_read` — sem caminho de escrita); falta o banco real para o teste manual.
- [ ] **49. Decodificar textos.** Colunas `OCTETS` como latin-1. Pronto quando: nomes com acento chegam corretos. Código completo (`fb15_client.py:402,404`: `decode('latin-1', errors='replace')` em `SQL_TEXT`/`SQL_VARYING`); falta confirmar com nome acentuado real.
- [x] **50. Ler credencial do Firebird de variável de ambiente.** Nada fixo no código. Pronto quando: `gitleaks` verde e grep sem senha. Feito: #796; credencial só por ambiente/DPAPI, gitleaks verde.
- [ ] **51. Ler funcionários.** Código, nome, CPF, PIS, matrícula, empresa, situação, horário. Pronto quando: contagem igual à do AtecSoft. Código completo (`coletor.py`: `SQL_FUNCIONARIOS` + `montar_funcionario`, testado com dados falsos em `tests/test_coletor.py`); falta a contagem contra o banco real.
- [ ] **52. Ler dias com janela móvel.** Sempre os últimos N dias (padrão 45), para capturar correções tardias. Pronto quando: correção feita no AtecSoft em dia antigo é reenviada. Código completo (`coletor.py`: `config.setdefault('dias', 45)`, `ler_tudo` filtra `DATA_BATIDA >= hoje - dias`, testado em `test_leitura_usa_janela`); falta o teste com correção real.
- [ ] **53. Ler justificativas, feriados e horários.** `JUSTFICATIVA`, `FERIADO`, `HORARIO_LINHAS`. Pronto quando: enviados no lote. `JUSTFICATIVA` pronta (`SQL_JUSTIFICATIVAS`/`montar_justificativa`). `FERIADO` e `HORARIO_LINHAS` NÃO escritos: os nomes de coluna dessas duas tabelas não estão documentados em nenhum arquivo do repo (só `CP`, `FUNCIONARIO`, `HORARIO_LINHAS`* e `JUSTFICATIVA` foram citados em prosa na PR #786, sem DDL anexado) — escrever a query seria chutar nome de coluna, proibido pela regra 3. Resolve com o DDL real que vem junto dos bancos das etapas 6–7.
- [x] **54. Nunca gerar falta no coletor.** Coletor só transporta; quem interpreta é o DP V3. Pronto quando: código sem regra de negócio de falta. Feito: #796; o coletor só transporta.
- [x] **55. Enviar em lotes com repetição.** HTTPS, tentativa com espera crescente, fila local em disco se cair a internet. Pronto quando: teste com rede cortada reenvia depois. Feito por outro desenho, documentado em `coletor.py:9-12`: sem fila em disco — o coletor não guarda estado e reenvia a janela inteira (45 dias) a cada ciclo de 10 min; o servidor dedup por hash (etapa 39), então uma queda menor que a janela não perde nada. Retentativa com espera crescente (2,4,8,16s) testada em `test_repete_em_falha_de_rede_e_entrega`; erro 4xx (exceto 429) não repete (`test_401_nao_repete`).
- [x] **56. Guardar o token no cofre do Windows.** Não em arquivo texto. Pronto quando: nenhum arquivo do coletor contém o token. Feito: mesmo mecanismo DPAPI da etapa 50 (`gravar_segredo`/`ler_segredo`, `coletor.py:203-227`); token só é lido em memória (`ler_segredo(ARQ_TOKEN)`) e nunca logado (`test_token_vai_no_cabecalho_e_nao_no_corpo` confirma que não vai no corpo).
- [ ] **57. Trava de instância única.** Pronto quando: segunda execução simultânea sai sem enviar. Código completo (`instancia_unica`, `coletor.py:311-320`, via `msvcrt.locking`); não testável neste ambiente Linux (`msvcrt` é exclusivo do Windows) — falta a instalação real (etapa 91).
- [x] **58. Log local com rotação.** Sem CPF/PIS em claro. Pronto quando: log de 7 dias não passa do limite definido. Feito: `RotatingFileHandler` com limite fixo de 1 MB × 5 arquivos (`coletor.py:323-329`); `executar()` só loga contagens e datas (`coletor.py:342-343`), nunca nome/CPF/PIS/token.
- [x] **59. Batimento cardíaco.** Envia "estou vivo" mesmo sem batida nova. Pronto quando: `ultimo_contato` atualiza a cada ciclo. Feito: cliente sempre envia pelo menos 1 requisição mesmo com 0 dias (`montar_envios`, testado em `test_sem_dias_ainda_envia_sinal_de_vida`); servidor atualiza `ultimo_contato_em` em todo lote processado (`ingest-ponto-rep/index.ts:151-154`), confirmado ao vivo na etapa 46.
- [ ] **60. Instalador em um clique.** Cria tarefa agendada a cada 10 minutos, todos os dias, com reinício após falha. Pronto quando: instalação limpa em Windows de teste. Código completo (`instalar.bat`: checa Python 32-bit, roda `--configurar`/`--diagnostico`, cria a tarefa com `schtasks /sc minute /mo 10`; reinício após falha vem do próprio agendamento repetitivo, não de uma flag separada); falta a instalação real (etapa 91).
- [ ] **61. Modo diagnóstico.** Comando que testa DLL, banco, internet e token e diz o que falhou. Pronto quando: cada falha simulada gera mensagem clara. Código completo (`diagnostico()`, `coletor.py:350-383`: testa Python 32-bit, `config.json`, `gds32.dll`, arquivo do banco, token gravado, leitura do banco e servidor+token, cada um com mensagem própria); falta simular as falhas num Windows real.
- [x] **62. Testes do coletor.** Conversão de datas/horas do Firebird, montagem do lote, fila offline. Pronto quando: suíte verde no CI. Feito: `tools/coletor-ponto-atecsoft/tests` (16 testes) rodando no CI (#799).

### Fase 5 — Processamento e cálculo (63–72)

- [ ] **63. Classificar entrada/saída pela posição.** `E1`=entrada, `S1`=saída… vindo do AtecSoft; não alternar por ordem de chegada. Pronto quando: teste com dia de 6 pares verde.
- [ ] **64. Tratar virada de dia.** Usar `DATA_E*/DATA_S*` para turno que passa da meia-noite. Pronto quando: teste com saída no dia seguinte verde.
- [ ] **65. Marcar batida inserida à mão no AtecSoft.** Conforme etapa 11, com o motivo de `OBS_*`. Pronto quando: aparece identificada no espelho.
- [x] **66. Regra de convivência com o app.** D2: colaborador vinculado ao relógio não registra batida pelo app nem pelo quiosque. Pronto quando: tentativa pela tela e pela API é recusada em teste. Feito: #801; gatilho `trg_batida_relogio_autoatendimento` (erro PT409), lote 2 verificado em 44962489677.
- [ ] **67. Alimentar `registros_ponto`.** Consolidar o dia (entradas, saídas, total trabalhado). Pronto quando: total bate com o cartão ponto do AtecSoft em 20 dias de amostra.
- [ ] **68. Levar justificativas.** Atestado, férias, folga e licença viram ocorrência no DP V3 conforme etapa 13. Pronto quando: dia justificado não aparece como falta.
- [ ] **69. Levar abonos.** `ABONO` e `ABONO_NEG` entram no cálculo do dia. Pronto quando: teste verde.
- [ ] **70. Falta só para dia encerrado.** Dia corrente nunca vira falta. Pronto quando: teste com dia de hoje verde.
- [ ] **71. Conferir horas extras e banco de horas.** Comparar o apurado no DP V3 com a tela de Cálculos do AtecSoft em um mês real. Pronto quando: diferença explicada linha a linha ou zerada.
- [ ] **72. Reprocessamento sob demanda.** Função para refazer um período a partir do staging. Pronto quando: rodar duas vezes dá o mesmo resultado.

### Fase 6 — Interface (73–82)

- [x] **73. Card "Relógios" em Integrações.** Unidade, último contato, última batida recebida, versão do coletor. Pronto quando: visível em `IntegracoesPage.tsx` com dados reais. Feito: #803; painel Relógios em Integrações.
- [x] **74. Alerta de coletor parado.** Sem contato há mais de 30 minutos em horário comercial. Pronto quando: notificação gerada em teste. Feito: #804; `alertar_coletores_ponto_parados` + cron a cada 15 min.
- [x] **75. Cadastro de coletor.** Criar unidade, gerar token (mostrado uma vez), revogar. Só administrador. Pronto quando: criar, revogar e recriar funcionam. Feito: #803; `gerar_token_coletor_ponto`/`revogar_coletor_ponto`, token mostrado uma vez.
- [x] **76. Tela de vínculos pendentes.** Funcionário do relógio sem colaborador: sugerir, vincular, desfazer. Pronto quando: vínculo manual libera as batidas retidas. Feito: #800 + #807; aba Vínculos no painel.
- [x] **77. Selo de origem na lista de batidas.** "Relógio" em `GestaoRegistrosPonto.tsx`. Pronto quando: visível e filtrável. Feito: #801; selo e filtro de origem em `GestaoRegistrosPonto`.
- [x] **78. Bloquear edição de batida do relógio.** Botões de ajustar/excluir desabilitados com explicação. Pronto quando: tentativa via tela e via API é recusada. Feito: #801; gatilho `trg_batida_relogio_protecao` bloqueia update/delete de batida do relógio no banco.
- [x] **79. Histórico de lotes.** Lista de envios com contagens e erros. Pronto quando: lote com erro mostra o motivo. Feito: #803; aba Envios.
- [x] **80. Ajustar app e quiosque conforme D2.** Pronto quando: comportamento decidido refletido em `PontoPage.tsx` e `PontoKioskPage.tsx`. Feito: #801; `PontoPage`/`PontoKioskPage` bloqueiam quem usa relógio.
- [ ] **81. Estados de carregando, vazio e erro em todas as telas novas.** Pronto quando: testes de componente cobrem os três.
- [ ] **82. Atualizar inventário de rotas.** `npm run inventario:rotas` se houver rota nova. Pronto quando: CI verde.

### Fase 7 — Fechamento mensal (83–90)

- [ ] **83. Espelho mensal com batidas do relógio.** `vw_espelho_ponto_mensal` reflete a origem relógio. Pronto quando: espelho de um colaborador confere com o impresso do AtecSoft.
- [ ] **84. Imprimir o espelho para assinatura em papel.** D3: o DP gera pelo DP V3 o espelho do mês, individual ou em lote. Pronto quando: PDF de um mês real confere com o impresso do AtecSoft.
- [x] **85. Controle de espelhos assinados.** O DP marca quem já devolveu o papel assinado e pode anexar a digitalização. Pronto quando: lista de pendentes do mês correta em teste. Feito: #804; `ponto_espelhos_papel` + painel em Gestão da Equipe com anexo.
- [ ] **86. Travar o mês após o fechamento.** `periodos_ponto` fechado bloqueia reprocessamento (etapa 43). Pronto quando: lote de mês fechado gera alerta e não altera nada.
- [ ] **87. Relatório de fechamento para a contabilidade.** Por colaborador: normais, extras 50/100, noturnas, faltas, atrasos, atestados, banco de horas. Pronto quando: PDF e planilha gerados de um mês real.
- [ ] **88. Levar o fechamento do ponto para a folha do DP V3.** D4: sem layout externo; horas extras, faltas, atrasos e adicional noturno do mês fechado entram na folha pelo `vw_folha_ponto_mensal`. Pronto quando: folha de um mês real usa os totais do ponto sem digitação. O Promo_Finance_V2 não consome ponto, só o total mensal da folha (achados da seção 2).
- [ ] **89. Envio do fechamento.** Botão que entrega o pacote (relatório + arquivo) ao contato da contabilidade. Pronto quando: envio registrado com data e destinatário.
- [ ] **90. Conferência cruzada com AFD.** Importar o AFD do relógio e reconciliar com as batidas de origem relógio. Pronto quando: divergência zero ou explicada no mês de teste.

### Fase 8 — Implantação e operação (91–100)

- [ ] **91. Piloto na primeira unidade.** Instalar o coletor em paralelo ao processo atual. Pronto quando: `ultimo_contato` atualizando por 3 dias seguidos.
- [ ] **92. Carga histórica do piloto.** Enviar os meses anteriores definidos pelo dono. Pronto quando: contagem de dias no DP V3 igual à do AtecSoft.
- [ ] **93. Instalar na segunda unidade.** Pronto quando: idem etapa 91.
- [ ] **94. Rodar um mês inteiro em paralelo.** Papel continua valendo. Pronto quando: espelho do DP V3 igual ao impresso para todos os colaboradores.
- [ ] **95. Corrigir as diferenças do paralelo.** Uma PR por causa. Pronto quando: lista de diferenças zerada.
- [ ] **96. Virada.** Dono decide que o fechamento passa a sair do DP V3. Pronto quando: decisão registrada neste arquivo com a competência inicial.
- [x] **97. Runbook de operação.** `infra/runbooks/PONTO_REP.md`: coletor parado, token vazado, PC trocado, relógio trocado (R8 por estar em `infra/`). Pronto quando: PR aprovada pelo dono. Feito: #799.
- [x] **98. Guia do DP.** Reescrever `docs/guides/ponto-eletronico.md` (hoje genérico) com o fluxo real. Pronto quando: PR mergeada. Feito: #799.
- [ ] **99. Rotação do token.** Procedimento testado de trocar o token de uma unidade sem perder batida. Pronto quando: rotação feita em homologação com fila preservada.
- [ ] **100. Encerramento.** Marcar tudo neste arquivo, registrar o que ficou de fora e arquivar os protótipos antigos. Pronto quando: todas as etapas marcadas ou pendência justificada.

### Fase 9 — Escrita no AtecSoft (101–120)

Só começa depois da Fase 4 em produção. O AtecSoft não tem API: a escrita é direto no banco Firebird, sem suporte
do fabricante, por isso cada formato é descoberto por comparação antes/depois em uma cópia do banco.

- [ ] **101. Comparar antes/depois de cada lançamento.** Em cópia do banco real, lançar à mão no AtecSoft um atestado, férias, afastamento, folga, abono positivo e abono negativo; comparar o banco antes e depois. Pronto quando: lista exata de tabelas e campos alterados por tipo de lançamento.
- [ ] **102. Decifrar a numeração de códigos.** Como o programa usa `CHAVES` para gerar `CODIGO`. Pronto quando: regra reproduzida e conferida em 3 inclusões.
- [ ] **103. Decifrar o `LOG` do AtecSoft.** Pronto quando: formato das linhas documentado para registrar as gravações do coletor.
- [ ] **104. Testar gravação com o AtecSoft aberto.** Travas e transações do Firebird 1.5. Pronto quando: gravação com o programa aberto não trava a tela nem perde dado, ou a restrição fica documentada.
- [ ] **105. Verificar recálculo.** Se o AtecSoft recalcula o dia ao abrir ou guarda o cálculo (`ME*/MS*`). Pronto quando: espelho do AtecSoft mostra o lançamento gravado pelo coletor sem intervenção manual.
- [ ] **106. Decifrar o cadastro.** `FUNCIONARIO` + `UPD_FUNC` (fila de envio ao relógio) e se o envio ao relógio é automático ou exige o botão "Enviar". Pronto quando: resposta por dados reais.
- [ ] **107. Publicar o mapa de escrita.** `docs/auditoria/ponto-atecsoft-mapa-escrita.md`. Pronto quando: PR mergeada.
- [ ] **108. Criar a fila `ponto_rep_comandos` (R8).** Tipo, dados, status, tentativas, resultado, chave de idempotência, RLS por `empresa_id`. Pronto quando: migration aplicada e verificada pelo sidecar.
- [ ] **109. Gerar comando a partir do DP V3.** Atestado, afastamento, férias, folga e abono aprovados no DP V3 entram na fila; cancelamento gera comando de desfazer. Pronto quando: cada tipo cria exatamente um comando em teste.
- [ ] **110. Entregar e confirmar comandos.** O coletor busca pendentes e devolve o resultado, com o mesmo token da unidade. Pronto quando: comando confirmado não é entregue de novo.
- [ ] **111. Backup antes de gravar.** Cópia do banco antes do primeiro comando de cada ciclo, com retenção definida. Pronto quando: restauração testada.
- [ ] **112. Gravar atestado, férias e afastamento.** Dia inteiro e período. Pronto quando: aparecem no cartão ponto do AtecSoft iguais ao lançamento manual da etapa 101.
- [ ] **113. Gravar folga e abono.** Pronto quando: idem etapa 112.
- [ ] **114. Conferir depois de gravar.** Reler o registro e comparar com o comando; diferença desfaz a transação e marca erro. Pronto quando: teste com falha simulada não deixa gravação parcial.
- [ ] **115. Desfazer lançamento.** Cancelamento no DP V3 remove o lançamento do AtecSoft. Pronto quando: banco volta ao estado anterior ao comando.
- [ ] **116. Gravar cadastro.** Admissão cria o funcionário; desligamento muda a situação. Pronto quando: funcionário criado pelo DP V3 aparece no AtecSoft e chega ao relógio conforme a etapa 106.
- [ ] **117. Tratar a digital.** A digital é cadastrada fisicamente no relógio. Pronto quando: o DP V3 mostra a pendência "cadastrar digital" para colaborador novo e a baixa quando chega a primeira batida.
- [ ] **118. Mostrar o estado de cada lançamento.** Pendente, gravado ou erro, com botão de reenviar. Pronto quando: visível nas telas de atestado, férias, afastamento e ponto.
- [ ] **119. Mês de prova em cópia do banco.** Todos os lançamentos de um mês feitos só no DP V3. Pronto quando: espelho gerado pelo AtecSoft confere com o do DP V3 para todos os colaboradores.
- [ ] **120. Ligar a escrita em produção.** Por unidade e por tipo de lançamento, com chave liga/desliga. Pronto quando: primeiro lançamento real gravado e conferido em cada unidade.

## 7. Progresso

| Fase                        | Etapas    | Concluídas |
| --------------------------- | --------- | ---------- |
| 0 — Decisões e insumos      | 1–8       | 5/8        |
| 1 — Diagnóstico             | 9–18      | 1/10       |
| 2 — Modelo de dados         | 19–32     | 13/14      |
| 3 — Função de ingestão      | 33–46     | 10/14      |
| 4 — Coletor Windows         | 47–62     | 8/16       |
| 5 — Processamento e cálculo | 63–72     | 1/10       |
| 6 — Interface               | 73–82     | 8/10       |
| 7 — Fechamento mensal       | 83–90     | 1/8        |
| 8 — Implantação e operação  | 91–100    | 2/10       |
| 9 — Escrita no AtecSoft     | 101–120   | 0/20       |
| **Total**                   | **1–120** | **49/120** |

Situação em 22/11/2026. O dono vai enviar os bancos reais das duas unidades (etapas 6–7) amanhã; até lá:

- 36, 44, 46 fechadas nesta sessão com chamada real ao canônico (dispositivo de teste descartável na empresa `[E2E-SEED]`, removido depois). 45 segue aberta: só falta teste de reprocessamento/período fechado, que dependem das etapas 41/43.
- Coletor (Fase 4): código revisado etapa a etapa nesta sessão. 55, 56, 58, 59 fechadas por evidência de código/teste (mecanismo já atende o critério sem precisar do Windows real). 48, 49, 51, 52, 57, 60, 61 têm código completo, mas o critério de cada uma pede um Windows/banco real — seguem abertas, conferidas na instalação pelo técnico de TI (etapa 91). 53 tem uma lacuna real: só `JUSTFICATIVA` foi lida; `FERIADO` e `HORARIO_LINHAS` não têm coluna documentada no repo para escrever a query sem chutar.
- 41–43, 63–72, 83–90, 101–120: dependem da cópia do banco real das duas unidades (etapas 6–15) e do cadastro dos colaboradores no DP V3. Sem isso, qualquer código sobre `REF_*`/virada de dia seria suposição — não escrito por não ter como validar.
- Atenção para amanhã: o banco do AtecSoft é Firebird 1.5 (ODS 10.1); o Ubuntu desta sessão só tem pacotes do Firebird 3.0, que não abre esse formato. Para ler o `.FDB` aqui vou precisar ou de um dump/CSV das tabelas, ou da própria `gds32.dll` do instalador — decido isso quando os arquivos chegarem.

## 8. Riscos

| Risco                                                                                                       | Etapa que trata    |
| ----------------------------------------------------------------------------------------------------------- | ------------------ |
| AtecSoft só recolhe do relógio quando alguém clica: sem isso não há batida diária                           | 14                 |
| Códigos de funcionário repetidos entre matriz e filial                                                      | 9, 21, 22          |
| Funcionário sem CPF/PIS no AtecSoft                                                                         | 17, 40, 76         |
| PC da unidade desligado ou sem internet                                                                     | 55, 59, 74         |
| Correção tardia no AtecSoft depois do fechamento                                                            | 43, 86             |
| Token do coletor vazado                                                                                     | 34, 75, 99         |
| Dado pessoal em log ou em arquivo versionado                                                                | 8, 44, 58          |
| Firebird 1.5 exige processo 32 bits e a DLL do próprio AtecSoft                                             | 47, 48, 61         |
| Escrita direta no banco do AtecSoft não tem suporte do fabricante e pode quebrar em atualização do programa | 101, 107, 111, 114 |
| Gravação errada no registro legal                                                                           | 111, 114, 115, 119 |
| Cadastro novo não chega ao relógio sem alguém clicar em "Enviar" no AtecSoft                                | 106, 116           |
| Digital do colaborador só pode ser cadastrada presencialmente no relógio                                    | 117                |
| DP V3 ainda sem a filial e sem os colaboradores reais cadastrados                                           | 17, 116            |
