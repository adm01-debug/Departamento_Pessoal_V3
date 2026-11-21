# Plano — Integração do ponto Henry / Ponto AtecSoft com o DP V3

> Criado em 21/11/2026. Plano de execução em 100 etapas, com critério de conclusão por etapa.
> Marque `[x]` no mesmo PR que conclui a etapa. Este arquivo é plano, não regra: `AGENTS.md` vence.

## 1. Objetivo

Hoje o colaborador bate ponto com a digital no relógio Henry (matriz e filial), o Ponto AtecSoft de um PC
recolhe as batidas, e no fim do mês o DP imprime o espelho, colhe assinaturas em papel e repassa para a
contabilidade apurar horas extras, atestados e faltas.

Meta: as batidas do relógio aparecem sozinhas no DP V3, o espelho é conferido e assinado dentro do sistema e a
contabilidade recebe o fechamento sem redigitação. **O relógio e o AtecSoft continuam sendo o registro legal e
não são alterados**: o DP V3 só lê.

## 2. O que foi verificado (21/11/2026)

| Fato | Evidência |
| --- | --- |
| AtecSoft 2.1.13 grava em Firebird 1.5 local (ODS 10.1), 51 tabelas, sem chaves, triggers ou procedures | banco `DADOS\PONTO_ATECSOFT.FDB` do instalador, aberto com `isql` |
| `CP` guarda um registro por funcionário/dia: `E1..E6`, `S1..S6`, `REF_*`, `OBS_*`, `JE*/JS*`, `EQUIP_*`, `ABONO`, `ABONO_NEG`, `FOLGA`, `NEUTRO` | DDL extraído do banco |
| `FUNCIONARIO` tem `PIS`, `CPF`, `MATRICULA`, `EMPRESA`, `SITUACAO`, `HORARIO` | DDL extraído do banco |
| Textos do banco estão em `CHARACTER SET OCTETS` (latin-1 cru) | consulta em `JUSTFICATIVA` devolve bytes |
| O AtecSoft exporta AFD, AFDT, ACJEF, espelho e layouts de folha Domínio, Rubi, Pholy e Consistem | tabela `EXP` e textos do executável |
| O banco do instalador vem vazio (0 funcionários, 0 batidas) | `SELECT COUNT(*)` em `FUNCIONARIO` e `CP` |
| O DP V3 já importa AFDT/ACJEF/AEJ, reconcilia e lista divergências, mas **não cria batida a partir do relógio** e o upload é manual | `supabase/functions/parse-afdt/index.ts`, `src/components/ponto/ImportarAFDTDialog.tsx` |
| O DP V3 já tem assinatura eletrônica de espelho | `assinar_espelho_ponto`, `src/components/ponto/AssinarEspelhoDialog.tsx` |
| `colaboradores` já tem `codigo_firebird`, `unidade`, `pis_pasep`, `matricula` | `src/integrations/supabase/types.ts` |
| O coletor antigo pula dia já sincronizado e perde saídas e correções | `sync_ponto.py`: `if (cid, db) in es: sk += 1; continue` |
| O coletor antigo guarda a chave `service_role` em arquivo texto no PC | `config.json` / `env_GO.txt` dos dois protótipos |

**NÃO VERIFICADO** (vira etapa abaixo): conteúdo real do banco das duas unidades; se o AtecSoft recolhe do
relógio sozinho ou só quando alguém clica em "Receber"; significado exato de `REF_*` e de `CP_T`; estado real do
banco de produção do DP V3 (só o código foi lido); modelo e firmware dos relógios.

## 3. Arquitetura

```
Relógio Henry ──rede──> Ponto AtecSoft (PC da unidade) ──> PONTO_ATECSOFT.FDB
                                                              │ somente leitura
                                                     Coletor Windows (1 por unidade)
                                                              │ HTTPS + token da unidade
                                              Edge Function `ingest-ponto-rep` (DP V3)
                                                              │
                              staging `ponto_rep_*` ──> `batidas_ponto` / `registros_ponto`
                                                              │
                         espelho → assinatura eletrônica → fechamento → exportação para a contabilidade
```

Princípios:

1. Coletor só lê o Firebird (transação read-only). Nunca escreve no banco do AtecSoft.
2. Nenhuma chave mestra fora do Supabase: o PC guarda só um token por unidade, revogável, que serve apenas para
   enviar ponto.
3. Idempotente: reenviar o mesmo dia não duplica; dia alterado no AtecSoft atualiza o DP V3.
4. Vínculo de pessoa por CPF, depois PIS, depois matrícula. Nunca por nome.
5. Batida vinda do relógio não é editável no DP V3; correção nasce no AtecSoft e chega na próxima coleta.
6. DDL só pelo `canonical-migrations.yml`; Edge Function só pelo `canonical-edge-functions.yml`.

## 4. Decisões do dono (bloqueiam as etapas indicadas)

| # | Decisão | Bloqueia |
| --- | --- | --- |
| D1 | Fonte da verdade: ler o banco do AtecSoft (recomendado) ou só o arquivo AFD | 19 em diante |
| D2 | Colaborador continua podendo bater ponto pelo app/quiosque do DP V3 ou só pelo relógio | 66, 80 |
| D3 | Assinatura do espelho passa a ser eletrônica no DP V3 ou o papel continua em paralelo | 83–86 |
| D4 | Qual sistema a contabilidade usa (define o layout de exportação) | 87–89 |
| D5 | Quem instala o coletor nos PCs da matriz e da filial | 91–93 |

## 5. Legenda

- **R8** = item da regra 8 do Fluxo Git: a PR fica aberta aguardando o dono (DDL, segredo, CI, arquitetura).
- **Pronto quando** = evidência exigida para marcar `[x]`.

## 6. Etapas

### Fase 0 — Decisões e insumos (1–8)

- [ ] **1. Registrar D1 (fonte da verdade).** Pronto quando: decisão escrita na seção 4 deste arquivo.
- [ ] **2. Registrar D2 (app/quiosque convive com o relógio).** Pronto quando: decisão escrita na seção 4.
- [ ] **3. Registrar D3 (assinatura eletrônica).** Pronto quando: decisão escrita na seção 4.
- [ ] **4. Registrar D4 (sistema da contabilidade).** Pronto quando: nome do sistema e layout escritos na seção 4.
- [ ] **5. Registrar D5 (responsável pela instalação).** Pronto quando: nome e unidade escritos na seção 4.
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
- [ ] **16. Diagnosticar o banco de produção do DP V3.** Via `canonical-sql-diag.yml` (somente leitura): colunas e constraints de `batidas_ponto`, `registros_ponto`, `afdt_*`, valores aceitos em `origem`, preenchimento de `codigo_firebird`/`pis_pasep`. Pronto quando: saída do workflow anexada.
- [ ] **17. Cruzar funcionários do AtecSoft com `colaboradores`.** Por CPF/PIS, sem gravar nada. Pronto quando: lista de casados, ambíguos e órfãos por unidade.
- [ ] **18. Publicar o relatório de diagnóstico.** `docs/auditoria/ponto-henry-diagnostico.md`, sem dado pessoal. Pronto quando: PR mergeada.

### Fase 2 — Modelo de dados (19–32) — R8

- [ ] **19. Desenhar `ponto_rep_dispositivos`.** Um coletor por unidade: `empresa_id`, unidade, hash do token, último contato, versão. Pronto quando: DDL revisado na PR.
- [ ] **20. Desenhar `ponto_rep_lotes`.** Cada envio do coletor: dispositivo, período, contagens, hash, status. Pronto quando: DDL revisado.
- [ ] **21. Desenhar `ponto_rep_dias`.** Cópia fiel de cada linha de `CP`: código do funcionário, data, 12 horários, referências, justificativas, abonos, hash do conteúdo. Único por (dispositivo, código, data). Pronto quando: DDL revisado.
- [ ] **22. Desenhar `ponto_rep_funcionarios`.** Cópia de `FUNCIONARIO` + `colaborador_id` vinculado e como foi vinculado. Único por (dispositivo, código). Pronto quando: DDL revisado.
- [ ] **23. Desenhar `ponto_rep_justificativas`.** De-para código AtecSoft → tipo do DP V3. Pronto quando: DDL revisado.
- [ ] **24. Definir a origem "relógio" em `batidas_ponto`.** Conforme a etapa 16: usar valor já aceito ou ampliar a constraint. Pronto quando: decisão escrita na PR com a evidência da etapa 16.
- [ ] **25. Garantir unicidade de batida do relógio.** Índice único parcial (colaborador, data, hora) para a origem relógio. Pronto quando: DDL revisado e sem colisão nos dados atuais.
- [ ] **26. Ligar RLS por `empresa_id` nas 5 tabelas novas.** Leitura para papéis de DP; escrita só `service_role`. Pronto quando: policies no DDL.
- [ ] **27. Escrever a migration.** `supabase/migrations/<timestamp>_ponto_rep_ingestao.sql`, idempotente. Pronto quando: arquivo na PR.
- [ ] **28. Escrever o sidecar `.verify.sql`.** Tabelas, policies, índices e grants. Pronto quando: arquivo na PR.
- [ ] **29. Testar em Postgres descartável.** `scripts/tests/migrations-ponto-rep.sh`. Pronto quando: script passa localmente e no CI.
- [ ] **30. Rodar `validate` no canônico.** Pronto quando: `CANONICAL_MIGRATION_DRY_RUN_OK` no log.
- [ ] **31. Dono aprova e mergeia; rodar `apply` + `verify`.** Pronto quando: job verde e sidecar confirma os objetos.
- [ ] **32. Regenerar os tipos.** `src/integrations/supabase/types.ts`. Pronto quando: `npm run typecheck` verde.

### Fase 3 — Função de ingestão (33–46)

- [ ] **33. Criar `supabase/functions/ingest-ponto-rep/`.** POST-only, JSON. Pronto quando: função responde 405 a GET em teste.
- [ ] **34. Autenticar por token de dispositivo.** Header próprio, comparação por hash em tempo constante; `verify_jwt = false` justificado no `config.toml` (R8). Pronto quando: token errado → 401 em teste.
- [ ] **35. Validar o contrato.** Schema do corpo, tamanho máximo, datas plausíveis. Pronto quando: corpo inválido → 400 com código de erro.
- [ ] **36. Aplicar rate limit por dispositivo.** Usar `_shared/rateLimit.ts`. Pronto quando: excesso → 429 em teste.
- [ ] **37. Travar o dispositivo na própria empresa.** O `empresa_id` vem do dispositivo, nunca do corpo. Pronto quando: teste prova que corpo com outra empresa é ignorado.
- [ ] **38. Gravar o lote e os funcionários.** Upsert em `ponto_rep_lotes` e `ponto_rep_funcionarios`. Pronto quando: reenvio idêntico não cria linhas.
- [ ] **39. Gravar os dias com hash.** Upsert em `ponto_rep_dias`; só processa o dia cujo hash mudou. Pronto quando: teste de idempotência verde.
- [ ] **40. Vincular funcionário a colaborador.** CPF → PIS → matrícula; ambíguo ou ausente fica pendente. Pronto quando: teste cobre os 4 casos.
- [ ] **41. Converter dia em batidas.** Função SQL transacional: apaga e recria as batidas de origem relógio daquele colaborador/dia. Pronto quando: dia alterado no envio seguinte reflete em `batidas_ponto`.
- [ ] **42. Não tocar batida de outra origem.** Pronto quando: teste prova que batida de app/quiosque/ajuste sobrevive ao reprocessamento.
- [ ] **43. Respeitar período fechado.** Dia de competência fechada em `periodos_ponto` não é reprocessado; gera alerta. Pronto quando: teste verde.
- [ ] **44. Registrar auditoria.** Cada lote em `ponto_auditoria`/log de edge, sem CPF em claro. Pronto quando: `audit:edge-audit-log` verde.
- [ ] **45. Testes da função.** Deno: autenticação, idempotência, vínculo, reprocessamento, período fechado. Pronto quando: `lint:edge` e `typecheck:edge` verdes.
- [ ] **46. Publicar.** Via `canonical-edge-functions.yml`. Pronto quando: chamada real com token de teste devolve 200 e a linha aparece em `ponto_rep_lotes`.

### Fase 4 — Coletor Windows (47–62)

- [ ] **47. Criar `tools/coletor-ponto-atecsoft/`.** Python 32 bits, sem dependência de biblioteca Firebird. Pronto quando: pasta com README na PR.
- [ ] **48. Reaproveitar o cliente Firebird 1.5.** Portar `fb15_client.py` (leitura via `gds32.dll`, transação read-only). Pronto quando: lê `FUNCIONARIO` do banco real em teste manual registrado.
- [ ] **49. Decodificar textos.** Colunas `OCTETS` como latin-1. Pronto quando: nomes com acento chegam corretos.
- [ ] **50. Ler credencial do Firebird de variável de ambiente.** Nada fixo no código. Pronto quando: `gitleaks` verde e grep sem senha.
- [ ] **51. Ler funcionários.** Código, nome, CPF, PIS, matrícula, empresa, situação, horário. Pronto quando: contagem igual à do AtecSoft.
- [ ] **52. Ler dias com janela móvel.** Sempre os últimos N dias (padrão 45), para capturar correções tardias. Pronto quando: correção feita no AtecSoft em dia antigo é reenviada.
- [ ] **53. Ler justificativas, feriados e horários.** `JUSTFICATIVA`, `FERIADO`, `HORARIO_LINHAS`. Pronto quando: enviados no lote.
- [ ] **54. Nunca gerar falta no coletor.** Coletor só transporta; quem interpreta é o DP V3. Pronto quando: código sem regra de negócio de falta.
- [ ] **55. Enviar em lotes com repetição.** HTTPS, tentativa com espera crescente, fila local em disco se cair a internet. Pronto quando: teste com rede cortada reenvia depois.
- [ ] **56. Guardar o token no cofre do Windows.** Não em arquivo texto. Pronto quando: nenhum arquivo do coletor contém o token.
- [ ] **57. Trava de instância única.** Pronto quando: segunda execução simultânea sai sem enviar.
- [ ] **58. Log local com rotação.** Sem CPF/PIS em claro. Pronto quando: log de 7 dias não passa do limite definido.
- [ ] **59. Batimento cardíaco.** Envia "estou vivo" mesmo sem batida nova. Pronto quando: `ultimo_contato` atualiza a cada ciclo.
- [ ] **60. Instalador em um clique.** Cria tarefa agendada a cada 10 minutos, todos os dias, com reinício após falha. Pronto quando: instalação limpa em Windows de teste.
- [ ] **61. Modo diagnóstico.** Comando que testa DLL, banco, internet e token e diz o que falhou. Pronto quando: cada falha simulada gera mensagem clara.
- [ ] **62. Testes do coletor.** Conversão de datas/horas do Firebird, montagem do lote, fila offline. Pronto quando: suíte verde no CI.

### Fase 5 — Processamento e cálculo (63–72)

- [ ] **63. Classificar entrada/saída pela posição.** `E1`=entrada, `S1`=saída… vindo do AtecSoft; não alternar por ordem de chegada. Pronto quando: teste com dia de 6 pares verde.
- [ ] **64. Tratar virada de dia.** Usar `DATA_E*/DATA_S*` para turno que passa da meia-noite. Pronto quando: teste com saída no dia seguinte verde.
- [ ] **65. Marcar batida inserida à mão no AtecSoft.** Conforme etapa 11, com o motivo de `OBS_*`. Pronto quando: aparece identificada no espelho.
- [ ] **66. Regra de convivência com o app.** Conforme D2: se o relógio é a única fonte, o app deixa de gravar batida para quem tem vínculo. Pronto quando: regra implementada e testada.
- [ ] **67. Alimentar `registros_ponto`.** Consolidar o dia (entradas, saídas, total trabalhado). Pronto quando: total bate com o cartão ponto do AtecSoft em 20 dias de amostra.
- [ ] **68. Levar justificativas.** Atestado, férias, folga e licença viram ocorrência no DP V3 conforme etapa 13. Pronto quando: dia justificado não aparece como falta.
- [ ] **69. Levar abonos.** `ABONO` e `ABONO_NEG` entram no cálculo do dia. Pronto quando: teste verde.
- [ ] **70. Falta só para dia encerrado.** Dia corrente nunca vira falta. Pronto quando: teste com dia de hoje verde.
- [ ] **71. Conferir horas extras e banco de horas.** Comparar o apurado no DP V3 com a tela de Cálculos do AtecSoft em um mês real. Pronto quando: diferença explicada linha a linha ou zerada.
- [ ] **72. Reprocessamento sob demanda.** Função para refazer um período a partir do staging. Pronto quando: rodar duas vezes dá o mesmo resultado.

### Fase 6 — Interface (73–82)

- [ ] **73. Card "Relógios" em Integrações.** Unidade, último contato, última batida recebida, versão do coletor. Pronto quando: visível em `IntegracoesPage.tsx` com dados reais.
- [ ] **74. Alerta de coletor parado.** Sem contato há mais de 30 minutos em horário comercial. Pronto quando: notificação gerada em teste.
- [ ] **75. Cadastro de coletor.** Criar unidade, gerar token (mostrado uma vez), revogar. Só administrador. Pronto quando: criar, revogar e recriar funcionam.
- [ ] **76. Tela de vínculos pendentes.** Funcionário do relógio sem colaborador: sugerir, vincular, desfazer. Pronto quando: vínculo manual libera as batidas retidas.
- [ ] **77. Selo de origem na lista de batidas.** "Relógio" em `GestaoRegistrosPonto.tsx`. Pronto quando: visível e filtrável.
- [ ] **78. Bloquear edição de batida do relógio.** Botões de ajustar/excluir desabilitados com explicação. Pronto quando: tentativa via tela e via API é recusada.
- [ ] **79. Histórico de lotes.** Lista de envios com contagens e erros. Pronto quando: lote com erro mostra o motivo.
- [ ] **80. Ajustar app e quiosque conforme D2.** Pronto quando: comportamento decidido refletido em `PontoPage.tsx` e `PontoKioskPage.tsx`.
- [ ] **81. Estados de carregando, vazio e erro em todas as telas novas.** Pronto quando: testes de componente cobrem os três.
- [ ] **82. Atualizar inventário de rotas.** `npm run inventario:rotas` se houver rota nova. Pronto quando: CI verde.

### Fase 7 — Fechamento mensal (83–90)

- [ ] **83. Espelho mensal com batidas do relógio.** `vw_espelho_ponto_mensal` reflete a origem relógio. Pronto quando: espelho de um colaborador confere com o impresso do AtecSoft.
- [ ] **84. Fluxo de assinatura eletrônica.** Conforme D3: DP libera o mês, colaborador assina no portal. Pronto quando: assinatura registrada em `ponto_espelhos_assinados` em homologação.
- [ ] **85. Painel de pendências de assinatura.** Quem assinou, quem falta, lembrete. Pronto quando: lembrete enviado em teste.
- [ ] **86. Travar o mês após o fechamento.** `periodos_ponto` fechado bloqueia reprocessamento (etapa 43). Pronto quando: lote de mês fechado gera alerta e não altera nada.
- [ ] **87. Relatório de fechamento para a contabilidade.** Por colaborador: normais, extras 50/100, noturnas, faltas, atrasos, atestados, banco de horas. Pronto quando: PDF e planilha gerados de um mês real.
- [ ] **88. Exportação no layout do sistema contábil.** Conforme D4. Pronto quando: arquivo importado com sucesso pela contabilidade em teste.
- [ ] **89. Envio do fechamento.** Botão que entrega o pacote (relatório + arquivo) ao contato da contabilidade. Pronto quando: envio registrado com data e destinatário.
- [ ] **90. Conferência cruzada com AFD.** Importar o AFD do relógio e reconciliar com as batidas de origem relógio. Pronto quando: divergência zero ou explicada no mês de teste.

### Fase 8 — Implantação e operação (91–100)

- [ ] **91. Piloto na primeira unidade.** Instalar o coletor em paralelo ao processo atual. Pronto quando: `ultimo_contato` atualizando por 3 dias seguidos.
- [ ] **92. Carga histórica do piloto.** Enviar os meses anteriores definidos pelo dono. Pronto quando: contagem de dias no DP V3 igual à do AtecSoft.
- [ ] **93. Instalar na segunda unidade.** Pronto quando: idem etapa 91.
- [ ] **94. Rodar um mês inteiro em paralelo.** Papel continua valendo. Pronto quando: espelho do DP V3 igual ao impresso para todos os colaboradores.
- [ ] **95. Corrigir as diferenças do paralelo.** Uma PR por causa. Pronto quando: lista de diferenças zerada.
- [ ] **96. Virada.** Dono decide que o fechamento passa a sair do DP V3. Pronto quando: decisão registrada neste arquivo com a competência inicial.
- [ ] **97. Runbook de operação.** `infra/runbooks/PONTO_REP.md`: coletor parado, token vazado, PC trocado, relógio trocado (R8 por estar em `infra/`). Pronto quando: PR aprovada pelo dono.
- [ ] **98. Guia do DP.** Reescrever `docs/guides/ponto-eletronico.md` (hoje genérico) com o fluxo real. Pronto quando: PR mergeada.
- [ ] **99. Rotação do token.** Procedimento testado de trocar o token de uma unidade sem perder batida. Pronto quando: rotação feita em homologação com fila preservada.
- [ ] **100. Encerramento.** Marcar tudo neste arquivo, registrar o que ficou de fora e arquivar os protótipos antigos. Pronto quando: 100/100 ou pendência justificada.

## 7. Progresso

| Fase | Etapas | Concluídas |
| --- | --- | --- |
| 0 — Decisões e insumos | 1–8 | 0/8 |
| 1 — Diagnóstico | 9–18 | 0/10 |
| 2 — Modelo de dados | 19–32 | 0/14 |
| 3 — Função de ingestão | 33–46 | 0/14 |
| 4 — Coletor Windows | 47–62 | 0/16 |
| 5 — Processamento e cálculo | 63–72 | 0/10 |
| 6 — Interface | 73–82 | 0/10 |
| 7 — Fechamento mensal | 83–90 | 0/8 |
| 8 — Implantação e operação | 91–100 | 0/10 |
| **Total** | **1–100** | **0/100** |

## 8. Riscos

| Risco | Etapa que trata |
| --- | --- |
| AtecSoft só recolhe do relógio quando alguém clica: sem isso não há batida diária | 14 |
| Códigos de funcionário repetidos entre matriz e filial | 9, 21, 22 |
| Funcionário sem CPF/PIS no AtecSoft | 17, 40, 76 |
| PC da unidade desligado ou sem internet | 55, 59, 74 |
| Correção tardia no AtecSoft depois do fechamento | 43, 86 |
| Token do coletor vazado | 34, 75, 99 |
| Dado pessoal em log ou em arquivo versionado | 8, 44, 58 |
| Firebird 1.5 exige processo 32 bits e a DLL do próprio AtecSoft | 47, 48, 61 |
