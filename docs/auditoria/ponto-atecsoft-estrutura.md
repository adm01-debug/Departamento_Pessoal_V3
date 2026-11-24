# Auditoria — estrutura do banco do Ponto AtecSoft (Firebird)

> Gerado em 22/11/2026 a partir do banco que vem **dentro do instalador** do AtecSoft 2.1.13.
> Serve de base para as etapas 9–15, 41–43, 63–72 e 101–107 do
> `docs/PLANO_INTEGRACAO_PONTO_HENRY_ATECSOFT.md`.
> **Limite deste documento:** é a estrutura que o programa cria, não os dados das unidades. O banco analisado
> tem 0 funcionários e 0 batidas. Tudo que depende de conteúdo real (significado de `REF_*`, se a coleta é
> automática, de-para de justificativas customizadas) continua aberto até chegarem as cópias da matriz e da filial.

## 1. O que foi analisado e como reproduzir

| Item | Valor |
| --- | --- |
| Arquivo | `PONTO_ATECSOFT.FDB` da pasta `DADOS` do instalador do AtecSoft 2.1.13 |
| Tamanho | 1.638.400 bytes, data do arquivo 13/01/2021 |
| Criação do banco | 28/07/2019 19:17:57 (cabeçalho) |
| ODS | **10.1** (Firebird 1.5) — o Firebird 3.0 **não abre**; foi usado cliente/engine **Firebird 2.5.9** |
| Página | 4096 bytes · dialeto 3 · `force write`, `no reserve` |
| Charset padrão | `NONE`; praticamente todo texto é `CHARACTER SET OCTETS` (bytes crus, lidos como latin-1) |
| Como foi lido | cópia descartável do `.FDB` + `isql` do Firebird 2.5.9 (32 bits), usuário `SYSDBA` |

Observação de ambiente: a leitura exige Firebird **2.5** (ou 1.5). `gstat -h` lê o cabeçalho em qualquer versão,
mas o `attach` em ODS 10.1 falha com "not a valid database" no Firebird 3.0.

## 2. Estrutura global — o que o banco **não** tem

Confirmado por consulta ao catálogo (`RDB$*`):

| Objeto | Quantidade |
| --- | --- |
| Tabelas de usuário | **51** |
| Views | **0** |
| Stored procedures | **0** |
| Triggers | **0** |
| Generators / sequences | **0** |
| Constraints (PK, FK, UNIQUE, CHECK) | **0** |
| Índices de usuário | **1** — `CP_INDEX` em `CP (DATA_BATIDA, IDENT)`, **não único** |

**Consequências diretas para a integração:**

1. **Nada no banco protege a consistência.** Não há chave primária, chave estrangeira nem unicidade em nenhuma
   tabela. Toda a regra está no programa Delphi. Qualquer escrita nossa (Fase 9) precisa garantir unicidade por
   conta própria — o banco aceitaria duas linhas iguais de `CP` para o mesmo funcionário/dia sem reclamar.
2. **O único índice é `(DATA_BATIDA, IDENT)` em `CP`** — é a chave lógica do cartão ponto: um registro por
   funcionário por dia. Leituras do coletor por janela de data usam esse índice; leitura por funcionário sem data
   faz varredura completa.
3. **Sem triggers ou procedures**, não existe efeito colateral escondido no banco: o que o programa grava é
   exatamente o que está na tabela. Isso torna a comparação antes/depois da etapa 101 confiável.
4. **Numeração de códigos é feita na mão pelo programa**, via tabela `CHAVES` (seção 5) — não há generator.

## 3. Inventário completo das 51 tabelas

`col` = colunas · `linhas` = linhas no banco do instalador.

| Tabela | col | linhas | Para que serve (leitura da estrutura + manual) |
| --- | --- | --- | --- |
| `CP` | 103 | 0 | **Cartão ponto: 1 linha por funcionário/dia.** Núcleo da integração (seção 4) |
| `CP_T` | 51 | 0 | Cópia do `CP` **só com as batidas cruas**, sem cálculo nem justificativa (seção 4.2) |
| `FUNCIONARIO` | 42 | 0 | Cadastro de pessoas (seção 4.3) |
| `UPD_FUNC` | 14 | 0 | **Fila de envio do cadastro ao relógio** (seção 4.4) |
| `EQUIP` | 32 | 0 | Relógios: IP, porta, modelo, nº do REP, NSR, senhas de acesso (seção 4.5) |
| `NSR` | 8 | 0 | **Histórico de coletas**: data/hora da coleta, faixa de NSR, quantidade (seção 4.6) |
| `LOG` | 6 | 0 | Auditoria do programa: login, data, hora, tabela, observação |
| `EMPRESA` | 27 | 0 | Empresas/unidades: CNPJ, CEI, razão, `IDENT`, responsável |
| `OBS_CP` | 8 | 0 | Observação/evento por funcionário+dia, com quantidade e valor (`VL_UNIT`, `VL_TOT`, `QTD`) |
| `JUST_BAT` | 2 | 0 | Justificativa **da batida** (código + nome) — vazia no instalador |
| `JUSTFICATIVA` | 17 | **9** | **Justificativa do dia** + como ela afeta o cálculo (seção 5.1) |
| `HORARIO` | 47 | **1** | Cabeçalho da jornada: tolerâncias, fechamento, DSR, art. 58 |
| `HORARIO_LINHAS` | 47 | **7** | **Jornada por dia da semana** (seção 5.2) |
| `FERIADO` | 7 | **1** | Feriados (seção 5.3) |
| `FER_CIDADE` / `FER_DEPART` / `FER_EMP` | 3 / 3 / 3 | 0 | Vínculo do feriado a cidade, departamento, empresa |
| `DSR` | 23 | **1** | Regras de DSR com faixas de desconto |
| `TIPO_CALCULO` | 2 | **4** | Normal, Compensado, Intervalo Livre, Horista |
| `ACUMULAR` | 2 | **8** | Regras de acúmulo de hora extra (seção 5.4) |
| `ACAO` | 2 | **3** | INCLUIR / ALTERAR / EXCLUIR — usado por `UPD_FUNC.ACAO` |
| `CHAVES` | 2 | **11** | **Contador de código por tabela** (seção 5.5) |
| `EXTRAS` | 255 | **1** | Configuração de horas extras (255 colunas, 1 linha) |
| `EXTRAS2` | 220 | **1** | Continuação de `EXTRAS` |
| `CONFIG` | 249 | **1** | Configuração geral do programa (seção 6) |
| `CONFIG2` | 119 | **1** | Continuação de `CONFIG` |
| `CONFIG_PD` | 24 | 0 | Configuração do módulo PD |
| `USUARIO` | 44 | **1** | Usuários do AtecSoft + **1 coluna de permissão por tela** (seção 5.6) |
| `USER_DEP` / `USER_EMP` / `USER_GRP` | 3 / 3 / 3 | 0 | Vínculo do usuário a departamento, empresa, grupo |
| `EXP` | 13 | **5** | **Layouts de exportação**: DOMINIO, AFD, PHOLY, RUBI, CONSISTEM (seção 5.7) |
| `EXP_CAB` | 12 | **11** | Campos do cabeçalho de cada layout |
| `EXP_LINHAS` | 13 | **270** | Campos do corpo de cada layout |
| `EXP_ROD` | 12 | **6** | Campos do rodapé de cada layout |
| `LAY_IMP` | 64 | 0 | Layout de importação |
| `LAY_DEP` / `LAY_EMP` | 3 / 3 | 0 | Vínculo do layout a departamento/empresa |
| `ESCALA` | 97 | 0 | Escalas de trabalho |
| `ESCALA_LINHA` | 3 | 0 | Linhas da escala |
| `ESCALA_MENSAL` | 4 | 0 | Escala por mês |
| `BH` | 11 | 0 | Banco de horas por período: saldo, ajuste, extra, falta |
| `DEPARTAMENTO` | 4 | 0 | Departamentos |
| `FUNCAO` | 2 | 0 | Funções/cargos |
| `GRUPO` | 2 | 0 | Grupos |
| `CIDADE` | 3 | 0 | Cidades (para feriado municipal) |
| `EQUIP_EMP` | 4 | 0 | Vínculo relógio ↔ empresa |
| `MODELO` | 2 | 0 | Modelos de relógio suportados |
| `COM_AGEND` | 4 | 0 | **Agendamento de coleta**: nome, horário, habilitado (seção 6) |
| `CONFIRM` | 2 | **1** | Flag interna (`CAMPO` = `SIM`) |
| `CONTROL` | 5 | **1** | Controle interno (`C1`–`C4`, em branco) |

## 4. As tabelas que importam para a integração

### 4.1 `CP` — o cartão ponto (103 colunas)

Uma linha por **funcionário × dia**, identificada por `IDENT` (funcionário) + `DATA_BATIDA` (dia). Os 103 campos
se organizam em 11 famílias, todas com 6 posições (6 pares entrada/saída por dia):

| Família | Colunas | O que é |
| --- | --- | --- |
| Batida | `E1`–`E6`, `S1`–`S6` (TIME) | Horário de entrada e saída de cada par |
| Data da batida | `DATA_E1`–`DATA_E6`, `DATA_S1`–`DATA_S6` (DATE) | **Data de cada batida** — é o que permite turno que vira a meia-noite |
| Cálculo | `ME1`–`ME6`, `MS1`–`MS6` (TIME) | Horário **tratado/calculado** de cada batida (o original fica em `E*`/`S*`) |
| Origem | `REF_E1`–`REF_E6`, `REF_S1`–`REF_S6` (INTEGER) | Código de referência/origem de cada batida — **significado ainda não decifrado** (etapa 11) |
| Observação | `OBS_E1`–`OBS_E6`, `OBS_S1`–`OBS_S6` (VARCHAR 30) | Texto por batida (motivo de inclusão manual) |
| Justificativa | `JE1`–`JE6`, `JS1`–`JS6` (INTEGER) | Justificativa por posição → `JUSTFICATIVA.CODIGO` |
| Relógio | `EQUIP_E1`–`EQUIP_E6`, `EQUIP_S1`–`EQUIP_S6` (INTEGER) | **Qual relógio** registrou cada batida → `EQUIP.CODIGO` |
| Abono | `ABONO`, `ABONO_NEG` (TIME), `JUST_ABN` (INTEGER) | Abono positivo, negativo e sua justificativa |
| Marcadores do dia | `FOLGA`, `NEUTRO`, `EXTRA`, `NBH`, `FER_EXTRA`, `FALTA_SBH` (INTEGER) | Folga, dia neutro, extra, não computa banco de horas, feriado com extra, falta sem banco de horas |
| Parâmetros do dia | `HORARIO`, `TIPO_CALCULO`, `COD_EXTRA`, `TOL_FALTA`, `TOL_EXTRA`, `FECHA`, `AJUSTE` | Jornada aplicada, tipo de cálculo, regra de extra, tolerâncias, fechamento, ajuste |

**Leituras diretas disso:**

- O horário original e o horário tratado **convivem na mesma linha** (`E1` vs `ME1`). Para o DP V3, a batida legal
  é `E*`/`S*`; `ME*`/`MS*` é resultado de cálculo do AtecSoft e não deve ser importado como batida.
- A virada de dia (etapa 64) **tem campo próprio** (`DATA_E*`/`DATA_S*`): não precisa ser adivinhada.
- A posição é fixa: `E1` é sempre 1ª entrada, `S1` sempre 1ª saída. Confirma a decisão da etapa 63 de classificar
  por posição e nunca por ordem de chegada.
- A identificação do relógio por batida (`EQUIP_*`) permite saber de qual equipamento veio cada marcação — útil
  quando a unidade tiver mais de um relógio.

### 4.2 `CP_T` — a cópia sem tratamento (51 colunas)

`CP_T` é exatamente o subconjunto "batida crua" de `CP`: `E1`–`E6`, `S1`–`S6`, `DATA_BATIDA`, `IDENT`, `OBS_*`,
`EQUIP_*`, `DATA_E*`/`DATA_S*`. **Não tem** `ME*`/`MS*`, `REF_*`, `JE*`/`JS*`, tolerâncias, abono, `FECHA`,
`HORARIO` nem `TIPO_CALCULO`.

Ou seja: `CP_T` **não tem onde guardar tratamento**. Isso restringe a pergunta da etapa 12 — se uma das duas é a
cópia tratada, só pode ser `CP`. Qual delas o programa considera o registro original para efeito legal continua
**NÃO VERIFICADO**: as duas estão vazias aqui e só o banco real das unidades responde (basta comparar as duas para
um mesmo funcionário/dia).

### 4.3 `FUNCIONARIO` (42 colunas)

Chaves de vínculo disponíveis: `CODIGO` (interno), `MATRICULA` (15), `CRACHA` (14), `PIS` (11), `CPF` (15),
`RG`, `CTPS`. Também: `NOME` (52), `EMPRESA`, `HORARIO`, `HORARIO_2`, `DEPARTAMENTO`, `FUNCAO`, `GRUPO`,
`SITUACAO` (texto, 15), `DATA_ADM`, `DATA_DESLIG`, `DATA_NASC`, endereço completo, `FOTO`, `MESTRE`, `BIO`,
`SENHA`, `HAB_ESCALA`/`ID_ESCALA`, `MONITOR`/`HAB_MONITOR`, `CAMPO1`–`CAMPO3` (livres),
`HAB_SENHA_APP`/`SENHA_APP`.

Dois pontos de atenção:

- **`FUNCIONARIO` não tem coluna `IDENT`.** `CP.IDENT` deve apontar para `FUNCIONARIO.CODIGO`, mas isso é
  **hipótese** — sem chave estrangeira e com as duas tabelas vazias, não há como confirmar aqui. É a primeira
  consulta a rodar no banco real (etapa 9), porque toda a importação depende desse vínculo.
- `SITUACAO` é **texto livre**, não código. A lista de valores usados só sai do banco real.
- `PIS` tem 11 caracteres e `CPF` 15 — o de-para do DP V3 (etapa 40, CPF → PIS → matrícula) segue válido.

### 4.4 `UPD_FUNC` (14 colunas) — a fila para o relógio

`CODIGO`, `ID`, `NOME`, `CRACHA`, `PIS`, `CPF`, `MATRICULA`, `EMPRESA`, `ACAO`, `DATA`, `HORA`, `MESTRE`,
`BIO`, `SENHA`.

`ACAO` aponta para a tabela `ACAO`, cujos 3 valores estão preenchidos: **1 = INCLUIR, 2 = ALTERAR, 3 = EXCLUIR**.

Isto é o mecanismo das etapas 106 e 116: o cadastro de uma pessoa no relógio é uma **linha nesta fila**, com a
ação e os dados do crachá. Fica **NÃO VERIFICADO** se o AtecSoft consome a fila sozinho ou só quando alguém clica
em "Enviar", e o que ele faz com a linha depois (apaga ou marca) — a tabela está vazia e não há coluna de status,
o que sugere que a linha é **apagada** após o envio. Confirmar no banco real.

### 4.5 `EQUIP` (32 colunas) — os relógios

Rede e identificação: `IP` (100), `IP_PORT`, `PORTA`, `TIPO_COM` (6), `OPCAO_COM`, `NUM_REP` (17 — número do REP
da Portaria 1510), `MODELO` (40), `TIMEOUT`, `HOST`/`DIR`/`LOGIN_HOST`/`SENHA_HOST` (150 cada),
`BUFFER`/`TIME_BUFFER`, `SITUACAO`, `MONITOR`, `HAB_ACENT`, `POS_MEM`/`HAB_POS_MEM`, `CPF`, `CHAVE` (256).

Coleta: `NSR` (último NSR lido), `DATA_NSR`, `DATA_COM` (data da última comunicação).

Credenciais do equipamento: `SENHA_MENU` (6), `LOGIN_ADM_8X` (16), `SENHA_ADM_8X` (6), `LOGIN_USR_8X` (16),
`SENHA_USR_8X` (6).

Dois achados:

- O sufixo **`_8X`** nas credenciais confirma suporte à linha **Henry 8X** direto no modelo de dados.
- **As senhas do relógio ficam em colunas comuns do banco**, sem criptografia visível. O coletor lê `EQUIP` para
  responder a etapa 15 (modelo e nº de série), e **não deve** transportar nem logar as colunas de senha —
  `SENHA_MENU`, `SENHA_ADM_8X`, `SENHA_USR_8X`, `SENHA_HOST`, `CHAVE`. Vale listar colunas explicitamente na
  query, nunca `SELECT *`.

### 4.6 `NSR` (8 colunas) — o histórico de coletas

`CODIGO`, `EQUIP`, `DATA_COLETA`, `HORA_COLETA`, `DATA_BATIDA`, `HORA_BATIDA`, `NSR`, `QUANT_BATIDA`.

É o diário de bordo da comunicação com o relógio: cada linha é uma coleta, com quando foi feita, até que NSR leu e
quantas batidas trouxe. **É a resposta definitiva da etapa 14**: com o banco real, a distribuição de
`DATA_COLETA`/`HORA_COLETA` mostra se a coleta é automática (intervalos regulares, inclusive fora do horário
comercial) ou manual (horários esparsos, só em dia útil). Nenhuma suposição necessária — basta contar.

## 5. Os dados que já vêm no instalador

O banco não é vazio: 20 das 51 tabelas vêm com dados de fábrica. Textos abaixo decodificados de `OCTETS`/latin-1.

### 5.1 `JUSTFICATIVA` — 9 justificativas padrão

| CÓDIGO | NOME | NORMAL | FALTA |
| --- | --- | --- | --- |
| 1 | Atestado | 1 | 0 |
| 2 | Falta | 0 | 1 |
| 3 | Dispensado | 0 | 0 |
| 4 | Férias | 0 | 0 |
| 5 | Folga | 0 | 0 |
| 6 | Lic.Patern | 0 | 0 |
| 7 | Lic.Matern | 0 | 0 |
| 8 | Luto | 0 | 0 |
| 9 | INSS | 0 | 0 |

As outras 15 colunas da tabela definem o efeito no cálculo e estão todas nulas no padrão: `REL_OC`, `REL_AB`,
`REL_EXT` (sai em relatório de ocorrência/abono/extra), `FALTASBH`, `FALTASFH`, `ADNOT` (adicional noturno),
`NDSR` (perde DSR), `ABJ1`–`ABJ5`, `JUST_AJ`.

Leitura importante: **"Atestado" vem com `NORMAL=1`** — o AtecSoft conta o dia de atestado como jornada normal, e
"Falta" com `FALTA=1`. As demais não marcam nem uma nem outra no padrão de fábrica.

De-para proposto para `registros_ponto.tipo_dia` do DP V3 (valores aceitos confirmados na run 44951290182:
`normal`, `feriado`, `compensado`, `folga`, `falta`, `atestado`, `ferias`, `licenca`):

| AtecSoft | DP V3 |
| --- | --- |
| 1 Atestado | `atestado` |
| 2 Falta | `falta` |
| 3 Dispensado | `folga` |
| 4 Férias | `ferias` |
| 5 Folga | `folga` |
| 6 Lic.Patern / 7 Lic.Matern / 9 INSS | `licenca` |
| 8 Luto | `licenca` |

**A etapa 13 não fecha com isso**: cada unidade pode ter criado justificativas próprias, com códigos acima de 9 ou
com os 9 primeiros renomeados. O de-para acima é o ponto de partida; a tabela real das duas unidades manda.

### 5.2 `HORARIO` e `HORARIO_LINHAS` — a jornada padrão

`HORARIO` tem 1 linha: "HORÁRIO PADRÃO", `COD_EXTRA=1`, demais parâmetros nulos.

`HORARIO_LINHAS` tem 7 linhas, uma por dia da semana (`DIA_SEMANA` 1–7):

| DIA_SEMANA | ENT1 | SAI1 | ENT2 | SAI2 | TIPO_CALCULO | TOL_FALTA | TOL_EXTRA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 a 5 | 08:00 | 12:00 | 14:00 | 18:00 | 2 (Compensado) | 00:10 | 00:10 |
| 6 | 08:00 | 12:00 | — | — | 2 | 00:10 | 00:10 |
| 7 | — | — | — | — | 2 | 00:10 | 00:10 |

Colunas da tabela (47): `CODIGO`, `IDENT`, `DIA_SEMANA`, `ENT1`–`ENT6`, `SAI1`–`SAI6`, `TB_ENT1`–`TB_ENT6`,
`TB_SAI1`–`TB_SAI6`, `J_ENT1`–`J_ENT6`, `J_SAI1`–`J_SAI6`, `TIPO_CALCULO`, `TOL_FALTA`, `TOL_EXTRA`, `NEUTRO`,
`FECHA`, `AJUSTE`, `FOLGA`, `EXTRA`.

`DIA_SEMANA` 1 parece ser segunda (6 = sábado com meio período, 7 = domingo sem jornada), mas isso é **hipótese**
pela carga de fábrica; confirmar no banco real.

### 5.3 `FERIADO` — 7 colunas

`CODIGO`, `NOME` (20), `DATA`, `NBH`, `VINC_CIDADE`, `VINC_DEPART`, `VINC_EMP`. Vem com 1 linha: "NATAL",
25/12/2016 (data de fábrica, não atualizada pelo fornecedor).

`NBH` = não computa banco de horas. Os três `VINC_*` dizem se o feriado vale só para uma cidade, departamento ou
empresa — detalhe que o DP V3 precisa respeitar quando houver feriado municipal diferente entre matriz e filial.

**Isto encerra o impedimento da etapa 53**: os nomes de coluna de `FERIADO` e `HORARIO_LINHAS` estão acima, lidos
do banco, e não precisam mais ser adivinhados.

### 5.4 `ACUMULAR` — 8 regras de acúmulo de extra

1 SOMAR TODAS · 2 INDEPENDENTES · 3 [ÚTEIS+SÁB] [DOM] [FER] · 4 [ÚTEIS+SÁB] [DOM+FER] ·
5 [ÚTEIS+SÁB+DOM] [FER] · 6 [SOMAR TODAS ATÉ 02:00] [ACIMA 02:00] ·
7 [ÚTEIS+SÁB ATÉ 02:00] [ACIMA 02:00+DOM+FER] · 8 [50% EXTRA] [50% BANCO DE HORAS]

É o vocabulário de hora extra do AtecSoft. Quando a etapa 71 for comparar o apurado do DP V3 com a tela de
Cálculos, a regra em uso (`CP.COD_EXTRA` → `EXTRAS`) sai daqui.

### 5.5 `CHAVES` — como o programa numera

11 linhas, cada uma com o nome de uma tabela e um número:

| TABELA | CODIGO | TABELA | CODIGO |
| --- | --- | --- | --- |
| `EXTRAS` | 1 | `DSR` | 1 |
| `HORARIO` | 1 | `EXP` | 5 |
| `HORARIO_LINHAS` | 7 | `EXP_LINHAS` | 270 |
| `JUSTFICATIVA` | 9 | `EXP_CAB` | 11 |
| `FERIADO` | 1 | `EXP_ROD` | 6 |
| `EXTRAS2` | 1 | | |

Cada número é **exatamente a contagem de linhas** da tabela correspondente. Então `CHAVES.CODIGO` é o último
código usado, e o programa gera código novo lendo e incrementando esse valor — não há generator no banco.

Isso é o mecanismo da etapa 102, identificado. Fica **NÃO VERIFICADO** se o incremento é feito dentro da mesma
transação da inserção (se não for, duas inserções simultâneas podem gerar o mesmo código — risco a considerar na
Fase 9, quando o coletor e uma pessoa no AtecSoft puderem gravar ao mesmo tempo).

### 5.6 `USUARIO` — permissão por tela

1 linha de fábrica. Além de `NOME` e `SENHA`, a tabela tem **uma coluna por permissão**: `FUNC`, `HORARIO`,
`DEP`, `FUNCAO`, `DSR`, `FERIADO`, `USUARIO`, `EXTRAS`, `ESCALA`, `JUSTIF`, `ENVIAR`, `REVEBER` (sic), `REC_AFD`,
`PD`, `CP`, `CALC`, `ARQ_FISC`, `EQUIP`, `BACKUP`, `CONEXAO`, `SITU_FUNC`, `INC_EXC_BAT`, `AFAST`, `CONFIG`,
`CONFIG_EXTRAS`, `ESPELHO`, `CIDADE`, `CALC_HR`, `COM_AGEND`, `GRUPO`, `VINC_EMP`, `VINC_DEP`, `VINC_GRP`,
`LAY_IMP`, `PERM_JUST`, `PERM_MV_BAT`, `PERM_BH`, `PERM_OBS`.

Interessa à auditoria do processo atual: `INC_EXC_BAT` (incluir/excluir batida), `PERM_MV_BAT` (mover batida),
`PERM_JUST`, `PERM_BH`, `PERM_OBS`. No banco real, essas colunas dizem **quem pode alterar batida hoje** —
informação que o DP V3 deve preservar quando assumir a tela única.

### 5.7 `EXP*` — os layouts de exportação estão no banco

`EXP` traz os 5 layouts de fábrica:

| CÓDIGO | NOME | TIPO | Cabeçalho | Rodapé |
| --- | --- | --- | --- | --- |
| 1 | DOMINIO | SINTÉTICO | — | — |
| 2 | **AFD** | ANALÍTICO | sim | sim |
| 3 | PHOLY | SINTÉTICO | — | — |
| 4 | RUBI | SINTÉTICO | sim | — |
| 5 | CONSISTEM | SINTÉTICO | — | — |

Os campos de cada layout estão em `EXP_CAB` (cabeçalho), `EXP_LINHAS` (corpo) e `EXP_ROD` (rodapé), com
`CAMPO`, `TAMANHO`, `ALINHAR`, `COMPLETAR`, `ZERADOR`, `DATA_FORMATO`, `TROCAR`/`POR`, `SEQ` (tipo de registro) e
`SEQ_COL` (posição do campo no registro):

| ID_EXP | Layout | Campos | Tipos de registro |
| --- | --- | --- | --- |
| 1 | DOMINIO | 21 | 3 |
| 2 | AFD | 60 | 12 |
| 3 | PHOLY | 96 | 8 |
| 4 | RUBI | 63 | 7 |
| 5 | CONSISTEM | 30 | 6 |

Exemplo lido do AFD: o cabeçalho é `0000000001` (10, dir.) + `1` + CNPJ EMPRESA (14) + CEI EMPRESA (12) +
RAZÃO SOCIAL (150) + zeros (17) + DATA INICIAL (10, DD/MM/AAAA) + DATA FINAL + DATA ARQUIVO + HORA ARQUIVO (4) —
o registro tipo 1 da Portaria 1510. O corpo do AFD tem 12 tipos de registro, um por posição de batida
(`SEQ=2` = SEQUENCIAL(9) + `3` + DATA BATIDA(10) + SAI.1(5) + PIS(12)).

Consequência prática: **o formato exato dos arquivos fiscais que o AtecSoft gera é extraível do próprio banco**,
campo a campo. Serve de referência para a conferência cruzada com AFD da etapa 90 e para o relatório da etapa 87,
sem depender de documentação do fornecedor.

## 6. Configuração — a coleta automática vem desligada

`CONFIG` tem 249 colunas e 1 linha. Os campos de comunicação agendada:

| Campo | Valor de fábrica |
| --- | --- |
| `HAB_COM_AGEND` | **0** (desligado) |
| `HAB_COM_MONITOR` | **0** (desligado) |
| `COM_TIME_MONITOR` | nulo |

E `COM_AGEND` (`CODIGO`, `NOME`, `HORARIO`, `HABILITADO`), que guardaria os horários agendados, está **vazia**.

Ou seja: **na instalação limpa, o AtecSoft não busca batida do relógio sozinho — alguém tem que mandar**. Isso
reforça o risco nº 1 do plano. A pergunta da etapa 14 ("o AtecSoft recolhe sozinho? de quanto em quanto tempo?")
se resolve com três consultas no banco de cada unidade: `CONFIG.HAB_COM_AGEND`, as linhas de `COM_AGEND` e a
distribuição de `NSR.DATA_COLETA`/`HORA_COLETA`.

## 7. O que este documento resolve e o que continua travado

**Resolvido (estrutura lida do banco, não suposição):**

- Estrutura completa das 51 tabelas, com colunas e tipos — inclusive `FERIADO` e `HORARIO_LINHAS`, que travavam a
  etapa 53 por falta de DDL documentado.
- Ausência total de PK/FK/unicidade/trigger/procedure/generator, e o único índice `CP_INDEX (DATA_BATIDA, IDENT)`.
- Famílias de campo do `CP` e a diferença entre batida original (`E*`/`S*`) e calculada (`ME*`/`MS*`).
- Existência de data por batida (`DATA_E*`/`DATA_S*`) para turno que vira a meia-noite.
- `CP_T` não tem colunas de tratamento — logo não pode ser a cópia tratada.
- Códigos de `ACAO` (1 INCLUIR, 2 ALTERAR, 3 EXCLUIR) e papel de `UPD_FUNC` como fila para o relógio.
- Mecanismo de numeração via `CHAVES`.
- As 9 justificativas de fábrica e um de-para inicial para `registros_ponto.tipo_dia`.
- Jornada e DSR padrão; estrutura de feriado com vínculo por cidade/departamento/empresa.
- Layouts de exportação (AFD, DOMINIO, PHOLY, RUBI, CONSISTEM) extraíveis campo a campo do próprio banco.
- Coleta agendada desligada por padrão, e as três consultas que respondem a etapa 14 no banco real.
- Suporte Henry 8X no modelo (`LOGIN_ADM_8X`/`SENHA_ADM_8X`) e **senhas de relógio em claro** no banco — o coletor
  precisa listar colunas na query e nunca usar `SELECT *` em `EQUIP`.

**Continua NÃO VERIFICADO — depende do banco real da matriz e da filial (etapas 6–7):**

- Se `CP.IDENT` = `FUNCIONARIO.CODIGO` (sem FK e com as tabelas vazias, é hipótese; é a 1ª consulta a rodar).
- Significado dos valores de `REF_*` (etapa 11) e qual das duas tabelas, `CP` ou `CP_T`, o programa trata como
  registro original (etapa 12).
- Justificativas customizadas de cada unidade e seus códigos (etapa 13).
- Se a coleta está agendada em produção e com que frequência (etapa 14).
- Modelo, nº de série e IP dos relógios (etapa 15).
- Valores usados em `FUNCIONARIO.SITUACAO`; códigos de funcionário repetidos entre as duas unidades.
- Se o incremento de `CHAVES` é transacional (risco de código duplicado na Fase 9).
- Se o AtecSoft consome `UPD_FUNC` sozinho e se apaga a linha depois (etapas 106 e 116).
- Se o banco das unidades tem a **mesma** estrutura deste instalador — versão diferente do programa pode ter
  colunas a mais.

## 8. Como repetir a leitura

Com o `.FDB` em uma cópia descartável (nunca no arquivo da unidade) e o Firebird 2.5 disponível:

```bash
FB=<pasta do firebird 2.5>/opt/firebird
export FIREBIRD=$FB LD_LIBRARY_PATH=$FB/lib ISC_USER=sysdba ISC_PASSWORD=masterkey
$FB/bin/gstat -h copia.fdb                      # cabeçalho: ODS, data de criação, página
echo "SELECT ... ;" | $FB/bin/isql -q copia.fdb  # consultas
```

Texto em `CHARACTER SET OCTETS` sai como hexadecimal no `isql`; decodificar como **latin-1**.

Consultas que respondem as etapas 9–15 no banco real, na ordem:

```sql
-- vínculo funcionário × cartão ponto (etapa 9 / hipótese CP.IDENT = FUNCIONARIO.CODIGO)
SELECT COUNT(*) FROM CP c WHERE NOT EXISTS (SELECT 1 FROM FUNCIONARIO f WHERE f.CODIGO = c.IDENT);
-- perfil do cadastro (etapa 9)
SELECT SITUACAO, COUNT(*) FROM FUNCIONARIO GROUP BY 1;
SELECT COUNT(*) FROM FUNCIONARIO WHERE CPF IS NULL OR CPF = '';
SELECT COUNT(*) FROM FUNCIONARIO WHERE PIS IS NULL OR PIS = '';
-- período e volume do cartão ponto (etapa 10)
SELECT MIN(DATA_BATIDA), MAX(DATA_BATIDA), COUNT(*) FROM CP;
SELECT COUNT(*) FROM CP WHERE E3 IS NOT NULL OR E4 IS NOT NULL OR E5 IS NOT NULL OR E6 IS NOT NULL;
-- origem da batida (etapa 11)
SELECT REF_E1, COUNT(*) FROM CP GROUP BY 1 ORDER BY 2 DESC;
-- CP vs CP_T (etapa 12)
SELECT COUNT(*) FROM CP_T;
-- justificativas reais (etapa 13)
SELECT CODIGO, NOME, NORMAL, FALTA FROM JUSTFICATIVA ORDER BY CODIGO;
-- coleta automática (etapa 14)
SELECT HAB_COM_AGEND, HAB_COM_MONITOR, COM_TIME_MONITOR FROM CONFIG;
SELECT * FROM COM_AGEND;
SELECT DATA_COLETA, COUNT(*), MIN(HORA_COLETA), MAX(HORA_COLETA) FROM NSR GROUP BY 1 ORDER BY 1 DESC;
-- relógios (etapa 15) — colunas listadas, sem SELECT * para não trazer senha
SELECT CODIGO, NOME, MODELO, NUM_REP, IP, IP_PORT, TIPO_COM, NSR, DATA_NSR, DATA_COM, SITUACAO FROM EQUIP;
```
