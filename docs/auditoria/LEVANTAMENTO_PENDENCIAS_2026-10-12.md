# Levantamento exaustivo de funcionalidades planejadas e não executadas — Departamento Pessoal V3

> **Data:** 12/10/2026 · **Commit analisado:** `bb6756cb5` (`main`) · **Banco consultado:** produção canônica, somente leitura (PostgreSQL 17.6, 373 tabelas).
> **Escopo:** repositório inteiro, camada por camada: ~40 planos e relatórios, 259 docs, 109 páginas, 1.232 arquivos de `src/`, 61 edge functions, 735 migrations, 10 workflows de CI, 12 runbooks, `monitoring/`, `scripts/` e `e2e/`. Cada item foi conferido no código atual e, quando possível, no banco de produção.
> **Pergunta respondida:** *o que foi planejado para o sistema e não foi feito, foi feito pela metade, é só fachada (simulado) ou existe mas não está ligado a nada?*

Este documento é o **consolidado**. A prova linha a linha de cada achado (arquivo:linha, consulta ao banco, commit) está nos **8 anexos** em [`LEVANTAMENTO_PENDENCIAS_2026-10-12/`](./LEVANTAMENTO_PENDENCIAS_2026-10-12/). Os IDs entre colchetes (ex.: `[E-CAL-01]`) apontam para o anexo correspondente (§12).

---

## Sumário

1. [Veredito](#1-veredito)
2. [Legenda e método](#2-legenda-e-método)
3. [Placar](#3-placar)
4. [As 40 lacunas de maior impacto no negócio](#4-as-40-lacunas-de-maior-impacto-no-negócio)
5. [Planejado que não chegou à produção](#5-planejado-que-não-chegou-à-produção)
6. [Pendências por módulo de negócio](#6-pendências-por-módulo-de-negócio)
7. [Situação de cada plano](#7-situação-de-cada-plano)
8. [Inventários: o que existe mas não está ligado](#8-inventários-o-que-existe-mas-não-está-ligado)
9. [Bloqueios externos](#9-bloqueios-externos-dependem-do-dono-ou-de-terceiros)
10. [Documentação que diz o contrário do código](#10-documentação-que-diz-o-contrário-do-código)
11. [Ordem recomendada de ataque](#11-ordem-recomendada-de-ataque)
12. [Anexos, cobertura e limitações](#12-anexos-cobertura-e-limitações)

---

## 1. Veredito

O sistema tem **muita tela e muita estrutura**, mas os fluxos que movem dinheiro e obrigação legal **não fecham de ponta a ponta**. Os problemas se repetem em 7 padrões:

1. **A folha não roda inteira.**
   - O cálculo em lote quebra em produção porque pede colunas que não existem `[E-CAL-01]`.
   - O cálculo do servidor considera só salário-base, INSS e IRRF `[E-CAL-02]`.
   - A folha calculada não pode ser fechada, porque o status gravado (`calculada`) não é o que o fechamento aceita (`aberta`) `[E-FLX-01]`.
   - A tabela `holerites` tem **0 linhas** em produção.
2. **Os impostos estão desatualizados e divergentes.**
   - A tela usa INSS 2026; as 4 funções do servidor usam INSS 2025.
   - O IRRF é a tabela de 2024, sem a isenção/redutor da Lei 15.270/2025.
   - A tabela `parametros_fiscais` existe, tem 0 linhas e nenhum código a lê `[A-001] [A-002] [E-CAL-03..05]`.
   - Efeito medido: para salário de R$ 10.000, o INSS sai R$ 988,09 na tela e R$ 951,63 no servidor.
3. **Integrações com governo e banco são simuladas.**
   - eSocial não transmite nada: a assinatura digital é um texto falso e só 2 dos 27 eventos têm XML `[G-001..003] [ESO-01..04]`.
   - FGTS Digital, DCTFWeb e PIX em lote apenas gravam um registro local `[A-012..014]`.
   - Guias não têm código de barras `[GUI-01..04]`.
   - Não existem GRRF nem informe de rendimentos `[RES-02] [CAT-07]`.
4. **Os descontos não chegam à folha.** Pensão alimentícia, consignado (7 contratos em produção), adiantamento (4 lançamentos), salário-família, adicional noturno, insalubridade, periculosidade e premiação/PLR existem como cadastro ou como função que ninguém chama `[E-CAL-06,16..20] [G-046..048] [FOL-08]`.
5. **A tela mostra sucesso de coisas que não aconteceram.**
   - "Incidente registrado!" sem gravar nada `[A-007]`.
   - PDF de holerite com link inexistente `[P-02]`.
   - "FGTS Digital sincronizado via API Caixa" com valor fixo `[A-071]`.
   - Certificado eSocial "válido até 12/12/2026" fixo na tela.
   - "12 registros enviados para a folha" de premiações, fixo.
   - Botão "Backup" que conclui com "0 registros" `[G-051]`.
   - WhatsApp marcado como "enviado" sem envio `[P-01]`.
   - Alerta de "variação salarial atípica 35%" sempre ligado.
6. **Nada roda sozinho.**
   - Não há disparo agendado de nenhuma edge function: `pg_net` não existe em produção e nenhum cron chama HTTP `[G-041] [H-AGD-09]`.
   - Dos 50 jobs SQL de produção, 223 das 5.315 execuções dos últimos 7 dias falharam: a purga LGPD falhou 14/14, o status de férias 7/7 e o aviso D-5 de pagamento de férias 5/5 `[H-AGD-01..06]`.
7. **O repositório não descreve o banco real.**
   - São 735 migrations no repo contra 421 versões registradas em produção.
   - A criptografia de dados bancários está no repo mas não em produção: agência, conta e PIX estão em texto puro `[I] [A-023]`.
   - 3 telas existem sem rota: Faltas, EPIs e Centros de Custo. O link do dashboard para Faltas dá 404 `[A-008/009]`.
   - 22 telas só são acessíveis digitando a URL `[I]`.

**Uso real em produção, em 12/10/2026:**

| Dado | Quantidade |
|---|---:|
| Empresa | 1 |
| Colaboradores | 13 |
| Folhas | 4 (semeadas) |
| Holerites | **0** |
| Eventos eSocial | **0** |
| Batidas de ponto (`batidas_ponto`) | **0** |
| Contratos gerados | **0** |
| Guias INSS | **0** |
| Declarações DCTFWeb | **0** |
| Certificados digitais | **0** |
| Solicitações LGPD | **0** |

**Conclusão de negócio:** antes de pôr folha real no sistema, é preciso fechar o ciclo **cálculo → fechamento → holerite → pagamento → guias**, atualizar as tabelas fiscais 2026 e trocar toda "tela que finge" por estado verdadeiro. Integração com o governo (eSocial, FGTS Digital, DCTFWeb) depende de **certificado digital A1** e de decisão sua (ver §9).

---

## 2. Legenda e método

| Status | Significado |
|---|---|
| **NAO_INICIADO** | Planejado em doc, plano ou tabela, mas não há nada no código. |
| **PARCIAL** | Existe uma parte: tela sem backend, backend sem tela, cadastro sem efeito no cálculo, sem teste real. |
| **SIMULADO** | Existe, mas devolve valor fixo, mock, `setTimeout` ou sucesso falso, ou a integração externa é fingida. |
| **ORFAO** | O código existe mas não está ligado: sem rota, sem menu, sem chamador, sem agenda, sem deploy. |
| **BLOQUEADO** | Depende de credencial, certificado, decisão ou ação fora do repositório. |
| **DOC_DESATUALIZADA** | O doc diz "pendente" e já está feito, ou diz "feito" e não está. |

Esforço: **P** ≤ 1 dia · **M** 2–5 dias · **G** > 5 dias.

**Método**
- Análise em 9 frentes paralelas: planos da raiz, plano de 100 etapas, planos de 50 etapas e de 100 workflows, docs de produto e históricos, frontend/cálculos/fluxos, edge functions, infra/CI/observabilidade/testes, varredura mecânica e banco de produção. Cada frente leu os documentos e conferiu no código atual.
- Os achados de maior impacto foram **reconferidos manualmente** pelo coordenador. Exemplos: `SSTPage.tsx:186`, `folhaPagamentoService.ts:292`, `FolhaValidationAlerts.tsx:26`, `admissaoService.ts:54-72`, `PremiacoesPage.tsx:155-161` e as colunas reais de `dependentes`/`eventos_variaveis` no banco.
- Nenhum arquivo do sistema foi alterado e nenhum dado de produção foi escrito.

---

## 3. Placar

### 3.1 Por camada analisada

| Anexo | Camada | Itens com achado | Principais status |
|---|---|---:|---|
| A | Planos da raiz (ROADMAP, BACKLOG, CODE_TODOS, ESTADO_ATUAL, CLAUDE.md, PLANO_100/50/MELHORIAS, relatórios) | 90+ | ver anexo |
| B1 | Plano mestre de 100 etapas (10/09) | 100 etapas | 7 concluídas, 61 parciais, 26 não iniciadas, 5 bloqueadas (E-001..E-077 conferidas em detalhe) |
| B2 | Planos de 50 etapas (E50, E51) e de 100 workflows | 200 etapas + 30 achados | ver §7 |
| C | Docs de produto, `docs/api`, guias, catálogo histórico V2–V19 | 203 | 113 PARCIAL · 53 NAO_INICIADO · 20 DOC · 12 SIMULADO · 4 ORFAO · 1 BLOQ. |
| E | Frontend, cálculos trabalhistas, fluxos ponta a ponta, páginas, integrações | 79 + matriz de 35 regras + 25 integrações + 66 páginas | 38 PARCIAL · 16 NAO_INIC. · 9 SIMUL. · 7 ORFAO · 4 BLOQ. · 5 DOC |
| G | Edge functions (61) e ponte `external-db-bridge` | 81 | 46 PARCIAL · 11 ORFAO · 8 SIMUL. · 3 BLOQ. · 2 NAO_INIC. · 10 DOC |
| H | Infra, CI, runbooks, agendamentos, observabilidade, testes, scripts | 126 | 46 PARCIAL · 30 NAO_INIC. · 17 ORFAO · 13 BLOQ. · 5 SIMUL. · 15 DOC |
| I | Banco de produção ao vivo e varredura mecânica | inventários | ver §5 e §8 |

**Total:** mais de **800 itens rastreados** (os anexos se sobrepõem em alguns temas; os itens de §4 e §6 já estão deduplicados).

### 3.2 Regras trabalhistas (matriz de 35 regras, anexo E §1.1)

| Situação | Quantidade | Exemplos |
|---|---:|---|
| Implementadas | 11 | INSS progressivo (com 2 tabelas diferentes), FGTS 8%, férias com 1/3 e abono, aviso prévio proporcional, multa de 40%/20% do FGTS, VT 6% |
| Parciais | 15 | IRRF com dependentes (critério diferente por motor), 13º com médias, DSR, pedido de demissão, acordo 484-A, insalubridade/periculosidade/salário-família/pensão (só em motor órfão) |
| Ausentes | 7 | IRRF 2026 (Lei 15.270/2025), médias de variáveis nas férias, art. 479/480, desconto de adiantamento, desconto de consignado, término de experiência com regra própria, hora noturna reduzida |

### 3.3 Integrações externas (25 avaliadas, anexo E)

- **Reais:** 2 (CEP/CNPJ e webhook de entrada).
- **Parciais:** 14.
- **Simuladas:** 6 (eSocial, FGTS Digital, DCTFWeb, WhatsApp, e-mail de admissão/holerite, assinatura ICP).
- **Não iniciadas:** 2.
- **Órfã:** 1 (Metabase).

---

## 4. As 40 lacunas de maior impacto no negócio

Ordenadas pelo efeito sobre dinheiro, obrigação legal e confiança no sistema.

| # | Lacuna | Módulo | Status | Efeito no negócio | Evidência principal | Esf. |
|---|---|---|---|---|---|---|
| 1 | "Calcular em lote" quebra: o select pede `dependentes.tipo` e `eventos_variaveis.codigo/descricao/tipo`, colunas inexistentes (reconferido no banco) | Folha | PARCIAL | Não existe caminho funcional para calcular a folha completa | `src/services/folha/calculoLoteService.ts:38-39` `[E-CAL-01]` | P |
| 2 | Folha calculada não fecha: grava status `calculada` e o fechamento exige `aberta`; `holerites` fica vazio | Folha | PARCIAL | Sem fechamento não há holerite, guia, pagamento nem eSocial | `calcular-folha/index.ts:313` × `fechar-folha/index.ts:105` `[E-FLX-01]` | P |
| 3 | Cálculo do servidor só faz salário-base − INSS − IRRF (sem HE, adicionais, benefícios, descontos) | Folha | PARCIAL | Holerite oficial errado para quem tem qualquer variável | `calcular-folha/index.ts:282-341` `[E-CAL-02] [FOL-01]` | G |
| 4 | Tabelas fiscais: INSS 2025 no servidor × 2026 na tela; IRRF de 2024; sem a Lei 15.270/2025; nada parametrizado por competência | Folha/Férias/13º/Rescisão/Guias | NAO_INICIADO | INSS e IR descontados errado; risco trabalhista e fiscal (validar com a contabilidade) | `src/calculators/tabelas.ts:5-22` × `calcular-folha/index.ts:19-36` e mais 5 cópias `[A-001/002] [E-CAL-03..05]` | M |
| 5 | Eventos variáveis sem entrada nem leitura: nenhuma tela lança comissão, bônus ou falta; férias e medidas gravam em `eventos_variaveis`, que nenhum motor lê | Folha | NAO_INICIADO | Variáveis nunca chegam ao holerite | `[E-FLX-03..05]` | M |
| 6 | Pensão alimentícia, consignado, adiantamento, salário-família, adicional noturno, insalubridade e periculosidade fora do cálculo real | Folha | PARCIAL/ORFAO | Descontos judiciais e contratuais não aplicados; perda de caixa (consignado e adiantamento já têm 11 lançamentos em produção) | `[E-CAL-06,16..20] [G-046..048] [FOL-08]` | G |
| 7 | eSocial: sem transmissão real (503 fora do sandbox), assinatura falsa, XML só de S-1000/S-2200, sem S-1200/1210/1299/2230/2299; botão de upload do certificado sem ação | eSocial | SIMULADO + BLOQUEADO | Nenhuma obrigação eSocial é cumprida pelo sistema | `enviar-esocial/index.ts:143-154,302-329`, `utils/signer.ts:24` `[G-001..004] [ESO-01..20]` | G |
| 8 | Certificado digital: a tela grava a senha do .pfx em texto puro na coluna "encriptada" e as datas de validade são inventadas | eSocial/Segurança | SIMULADO | Risco de vazamento da credencial da empresa | `src/components/esocial/tabs.tsx:249-259` `[ESO-03]` | P |
| 9 | FGTS Digital e DCTFWeb só gravam registro local; painel "FGTS sincronizado via API Caixa" com R$ 12.450,80 fixo, **visível na tela de Folha** | Obrigações | SIMULADO | A empresa pode achar que recolheu ou declarou | `FGTSDigitalDashboard.tsx:26,41,69` (montado em `FolhaPagamentoPage.tsx:285`) `[A-012/013/071]` | M |
| 10 | Guias INSS/FGTS/DARF calculadas do salário cadastrado, sem código de barras; GRRF, informe de rendimentos e EFD-Reinf inexistentes | Obrigações | PARCIAL/NAO_INICIADO | Recolhimento feito fora do sistema | `[GUI-01..09] [RES-02]` | G |
| 11 | Rescisão: 3 motores divergentes; sem art. 479/480; sem desconto de aviso no pedido de demissão; multa do FGTS somada ao líquido do empregado; sem TRCT oficial, GRRF, S-2299 e seguro-desemprego | Rescisão | PARCIAL | Valores de rescisão diferentes por tela, alguns errados | `src/utils/rescisaoCalc.ts:162`, `calcular-rescisao/index.ts:255` `[E-CAL-07..12]` | G |
| 12 | Pagamento: retorno CNAB falha em silêncio (colunas inexistentes); PIX em lote só gera CSV; edges `cnab-remessa`/`pix-lote` sem chamador | Pagamentos | PARCIAL/ORFAO | Conciliação e pagamento manuais | `[E-FLX-06..11] [I]` | M |
| 13 | PDF de holerite: `emitirPDF` espera 1,5 s e devolve um link `storage.lovable.dev` que não existe | Folha | SIMULADO | O operador acha que emitiu o holerite | `src/services/folhaPagamentoService.ts:292-295` `[P-02]` | M |
| 14 | Portal do colaborador sem PDF/download do holerite; distribuição de holerite por e-mail/WhatsApp não envia | Portal | PARCIAL/SIMULADO | A demanda continua no RH | `PortalFinanceiroTab.tsx:7-53` `[A-031] [G-013]` | M |
| 15 | WhatsApp: marca "enviado" sem enviar; 13 mensagens presas em `pending_trigger` em produção | Comunicação | SIMULADO | Convites, lembretes e avisos nunca chegam | `src/services/whatsappService.ts:54-68,100-131` `[P-01] [POR-07]` | M |
| 16 | E-mail e push enfileirados sem consumidor; remetente de teste `onboarding@resend.dev` | Comunicação | PARCIAL | Alertas e notificações não saem do sistema | `[G-037] [G-040]` | M |
| 17 | Nenhuma edge function é disparada por agenda (relatórios agendados, alertas, backup, Bitrix, limpeza LGPD) | Automação | NAO_INICIADO | Tudo depende de clique manual | `pg_net` ausente em produção, 0 `net.http_post` `[G-041] [H-AGD-09]` | M |
| 18 | 223 falhas em 7 dias nos jobs agendados: purga LGPD 14/14, status de férias 7/7, aviso D-5 de pagamento de férias 5/5, purge do rate-limit 168/168 | Automação | PARCIAL | Férias não mudam de status, alerta de pagamento de férias não sai, LGPD não limpa | `[H-AGD-01..06]` | P |
| 19 | Dobra de férias e status automático de férias sem `cron.schedule` | Férias | ORFAO | Risco de pagar férias em dobro sem aviso | `[FER-01/02]` | P |
| 20 | Admissão não vira colaborador; concluir e cancelar falham no banco (o enum não tem os estados); botão S-2200 usa o id errado | Admissão | PARCIAL | Retrabalho de recadastro; admissão nunca encerra | `src/services/admissaoService.ts:54-72` `[ADM-01/02] [E-FLX-16]` | M |
| 21 | Ponto: hora extra paga na folha **e** creditada no banco de horas; tudo tratado como HE 50%; sem noturno, DSR ou turno que cruza a meia-noite; espelho Portaria 671 é só um toast | Ponto | PARCIAL | Pagamento em duplicidade; descumprimento da Portaria 671 | `[PON-01..05,13] [E-FLX-18/19]` | G |
| 22 | Dois modelos de ponto sem ponte: `processar-ponto` e `gerar-aej` leem `batidas_ponto` (vazia) e o app grava `registros_ponto` | Ponto | PARCIAL | AEJ sai vazio; tratamento do servidor não tem entrada | `[G-049]` | M |
| 23 | Incidente/quase-acidente de SST: o botão só mostra "Incidente registrado!" e nada é gravado | SST | SIMULADO | Acidente informado desaparece; risco de CAT e NR | `src/pages/SSTPage.tsx:186-190` `[A-007]` | P |
| 24 | Configurações de folha e de ponto não gravam; jornada, escala e feriado cadastrados não têm efeito no cálculo | Config/Ponto | PARCIAL | Parametrização ignorada | `[E-FLX-24/26]` | M |
| 25 | Benefícios em duas tabelas (`beneficios_colaborador` × `beneficios_colaboradores`, a segunda com 74 linhas e sem uso no código) | Benefícios | NAO_INICIADO | Benefício cadastrado na tabela errada não entra na folha | `[A-005] [P-07]` | M |
| 26 | Premiações: "sincronizar com a folha" só mostra um toast com "12 registros enviados" fixo | Premiações | SIMULADO | PLR/prêmio nunca chega ao holerite | `src/pages/PremiacoesPage.tsx:152-161` `[BEN-07]` | M |
| 27 | Dashboard executivo com números inventados ("Score 9.2", "Custos fixos 42%", "+ R$ 128k em Dez/26") | BI | SIMULADO | A diretoria decide com base em ficção | `src/pages/DashboardExecutivoPage.tsx:526-543` `[P-04]` | M |
| 28 | Alerta de folha "variação salarial atípica 35%" sempre ligado (constante `VARIACAO_SIMULADA = 0.35`) | Folha | SIMULADO | Alerta falso em toda folha; o operador passa a ignorar alertas | `src/components/folha/FolhaValidationAlerts.tsx:26-34` `[I]` | P |
| 29 | Workflow de aprovação: o designer não salva (manda a coluna `etapas`, que não existe); o motor (`executarWorkflow`, SLA) não tem chamador | Workflows | PARCIAL | Fluxos de aprovação desenhados não valem | `src/pages/WorkflowsPage.tsx:575-598` `[A-021]` | M |
| 30 | Backup: o botão do painel não faz backup ("0 registros"); `backup-automatico` sem chamador, sem agenda e sem restauração ensaiada; o S3 prometido no doc não existe | Operação | SIMULADO/ORFAO | Perda de dados sem volta | `[G-051/052] [H-AGD-10] [A-078]` | M |
| 31 | Criptografia de dados bancários (agência, conta, PIX) está no repo mas não em produção; CPF, RG e salário sem criptografia | Segurança/LGPD | PARCIAL | Risco LGPD; dados legíveis no banco | `contas_bancarias` sem colunas `*_encrypted` em produção `[I] [A-023]` | G |
| 32 | 28 policies `USING (true)` (2 abertas a `anon`) e 26 funções SECURITY DEFINER executáveis por `anon`; `is_admin(uuid)` revela o admin de qualquer empresa | Segurança | PARCIAL | Superfície de vazamento entre empresas | `[H-RUN-13,27,28] [A-088]` | M |
| 33 | Ponte de dados (`external-db-bridge`) sem catálogo deny-by-default e sem projeção de colunas sensíveis (`select=*` liberado em CPF, salário e conta) | Segurança | NAO_INICIADO | Qualquer tela pode puxar PII de todos | `[A-058/060]` | G |
| 34 | Step-up MFA no servidor inexistente (`aal2` só checado no navegador); sem CAPTCHA no login | Segurança | NAO_INICIADO | Sessão roubada fecha folha, troca papéis, exporta PII | `[E-015] [P-10] [A-068]` | M |
| 35 | Conta de teste E2E existe no banco de produção, com senha publicada no repositório e sem papéis | Segurança/Testes | BLOQUEADO | Credencial pública em produção | `[H-TST-16]` (senha propositalmente não reproduzida aqui) | P |
| 36 | Observabilidade só no papel: 8 dos 10 arquivos de `monitoring/` são o mesmo placeholder; `/metrics` sempre 503; telemetria da ponte com 0 linhas desde 22/07 | Operação | SIMULADO/PARCIAL | Ninguém sabe quando algo quebra | `[H-OBS-01..05] [G-057/074]` | M |
| 37 | Alertas DP falham 100% em produção (`alertas-dp` usa a view `v_login_anomalies`, que não existe) | Operação | PARCIAL | Alertas de férias vencendo e de contrato de experiência nunca chegam | `[G-038]` | P |
| 38 | E2E autenticado vermelho desde 24/09 (identidades E2E sem papéis/seed); E2E nunca calcula nem fecha folha; 40 de 59 edge functions sem nenhum teste | Testes | BLOQUEADO/PARCIAL | Regressões em folha, férias e rescisão chegam ao usuário | `[A-079] [H-TST-02/03/10]` | M |
| 39 | Repositório não reconstrói o banco: 735 migrations × 421 no ledger; RPC usada pelo app que só existe no baseline; 3 buckets sem migration; sem staging | Dados/Infra | PARCIAL | Um desastre exige reconstrução manual | `[I] [A-033] [E-030] [H-RUN-16..19]` | G |
| 40 | Telas escondidas: 3 páginas sem rota (Faltas, EPIs, Centros de Custo) e 22 telas sem item de menu (Holerites, Rubricas, Provisões, Vales, Pensões, Sindicatos, Planos de saúde…) | UX | ORFAO | Funcionalidade pronta que o usuário não encontra | `src/App.tsx:71-75`, `AppSidebar.tsx:92+` `[A-008/009] [I]` | P |

---

## 5. Planejado que não chegou à produção

Confronto do repositório com o banco real (consulta somente leitura em 11–12/10/2026) `[I] [B1 E-030] [H]`.

| Tema | Repositório | Produção | Consequência |
|---|---|---|---|
| Ledger de migrations | 735 arquivos | 421 versões (360 antigas sem nome, da era Lovable) | O repo não reconstrói o banco; "corrigido no repo" ≠ "corrigido em produção" |
| Migrations sem registro em produção | `20260912140000_replay_backfill_canonical_routines`, `20261006100000_fix_wave7_contrato_rpcs_regression`; ≥ 66 arquivos nas janelas 24–27/07 e 01–29/08 (ex.: `p0_001_rls_batch1..5`, `p4_072_materialized_views_dashboards`, `p1_025_encryption_dados_bancarios`, `p2_037_deprecate_legacy_tables`) | ausentes | Confirmado por efeito: sem colunas `*_encrypted` em `contas_bancarias`; produção tem só 1 materialized view, sem refresh `[H-AGD-07]` |
| Migrations aplicadas com outra versão | 7 (`p0_hash_trigger_search_path`, `p0_auth_lockout_contract`, `p0_views_revoke_public`, `p0_payroll_upsert_contract`, `p0_secdef_search_path`, `p1_function_search_path`, `p0_pgcrypto_routine_search_path`) | aplicadas em 12/09 com timestamps diferentes | O check "Supabase Preview" falha com "Remote migration versions not found" `[B1 E-030]` |
| Correção da purga LGPD | migration `20260728180353` | não aplicada | Job falha 14/14 `[H-AGD-06]` |
| `pg_net` | pressuposto por rotinas HTTP | **ausente** | Nenhuma edge function pode ser agendada pelo banco |
| Tabelas planejadas e nunca criadas em produção | `adicionais`, `comissoes`, `gratificacoes`, `darfs`, `grrf`, `trct`, `recibos_ferias`, `recibos_rescisao`, `homologacoes`, `exames_medicos`, `eventos_rh` | inexistentes | Modelos de dados de verbas, guias e documentos rescisórios nunca saíram do papel |
| Buckets | 3 sem migration (`medidas-disciplinares`, `medidas-contestacoes`, `contratos-trabalho`) | existem (criados à mão em 11/09); 14 sem limite de tamanho ou tipo de arquivo; `avatars` público | Ambiente reconstruído falha com "Bucket not found" `[A-006] [E-025]` |
| RPC `aplicar_medida_folha_ponto` | só no baseline `canonical_schema.sql:555` | — | Ambiente recriado só por migrations perde a função usada pelo app |
| Uso real | — | 13 colaboradores, 1 empresa, 0 holerites, 0 eventos eSocial, 0 batidas, 0 contratos gerados, 0 guias, 0 DCTFWeb, 0 certificados | Nenhum módulo de negócio tem prova de uso real |

---

## 6. Pendências por módulo de negócio

Cada tabela traz o essencial. A lista completa, com evidência, está nos anexos C (por módulo), E (cálculos e fluxos) e G (servidor).

### 6.1 Folha de pagamento

| Funcionalidade planejada | Status | O que existe / o que falta | Ref. |
|---|---|---|---|
| Motor único de cálculo (decimal, versionado por vigência) | PARCIAL | Existem **8 motores**, ao menos 4 com resultados diferentes; o motor completo do front (`calcularFolhaCompleta`, com HE/DSR/noturno/insalubridade/VT/pensão) **não tem chamador** | `[E §1.0] [A-004] [P-13]` |
| Cálculo em lote | PARCIAL (quebrado) | Select com colunas inexistentes; N+1 consultas por colaborador | `[E-CAL-01]` |
| Cálculo no servidor | PARCIAL | Só salário-base − INSS − IRRF; tabela 2025 | `[E-CAL-02] [FOL-01/02]` |
| Fechamento e reabertura | PARCIAL (quebrado) | Status incompatível; sem holerites gerados | `[E-FLX-01]` |
| Holerite (geração, PDF, assinatura, entrega) | SIMULADO/PARCIAL | `holerites` com 0 linhas; PDF falso; portal sem download; distribuição não envia | `[P-02] [A-031] [G-013]` |
| Eventos variáveis (comissão, bônus, falta, HE 100%, noturno) | NAO_INICIADO | Sem tela de lançamento, sem leitura pelos motores; rubricas 1050–1055 inexistentes em produção | `[E-FLX-03..05]` |
| Descontos legais (pensão, consignado, adiantamento, salário-família) | PARCIAL/ORFAO | Cadastros existem; nenhum entra no cálculo; edges `adiantamento-salarial`/`emprestimo-consignado` sem chamador | `[E-CAL-06,16..20] [G-046..048]` |
| DSR | PARCIAL | Fórmula com 26 dias úteis e 4 domingos fixos, sem calendário nem feriados reais | `[E §1.1]` |
| IRRF 2026 / desconto simplificado | NAO_INICIADO | Tabela e simplificado de 2024 (564,80); sem redutor | `[A-002] [E-CAL-03]` |
| Parâmetros fiscais por competência | NAO_INICIADO | `parametros_fiscais` com 0 linhas e sem consumidor; 6 cópias de tabela em código | `[E-CAL-05] [A-001]` |
| Provisões (13º/férias/encargos) | PARCIAL | RPC atômica existe; encargos fixos; nenhum caso homologado com contador | `[E51-021] [E §1.0 M8]` |
| Validação de folha | SIMULADO | Alerta de variação 35% fixo | `[I]` |
| Simulador "what-if" e simulador de 13º | PARCIAL | Existem na tela; não reaproveitam o motor oficial | `[I] [C]` |
| Integração folha × ponto × férias × medidas | PARCIAL | Grava em `eventos_variaveis`, que ninguém lê; HE só 50% | `[E-FLX-03] [PON-01]` |
| Optimistic locking / transação multi-tabela | PARCIAL | Só na folha (`version`); rescisão, admissão e férias sem transação | `[E-036/038]` |

### 6.2 Férias e 13º

| Funcionalidade | Status | Detalhe | Ref. |
|---|---|---|---|
| Programação anual de férias | DOC_DESATUALIZADA (feito) | Existe; docs dizem pendente | `[C DOC-*]` |
| Aviso de férias em PDF | DOC_DESATUALIZADA (feito) | Bucket `ferias-avisos` criado | `[C]` |
| Status automático de férias e cálculo da dobra | ORFAO / quebrado | Funções sem agenda; o job diário de status falha 7/7 | `[FER-01/02] [H-AGD-03]` |
| Aviso D-5 de pagamento de férias (art. 145) | PARCIAL | Job falha 5/5 | `[H-AGD-04]` |
| Férias com médias de variáveis | NAO_INICIADO | O cálculo recebe só `salario_base` | `[E §1.1]` |
| Redução por faltas (art. 130) e fracionamento no cálculo | PARCIAL | Regras só em trigger do banco, não no cálculo | `[E §1.1]` |
| Cálculo de férias no servidor | PARCIAL | Só devolve JSON + auditoria; não persiste; INSS 2025 | `[E M4]` |
| Recibo de férias | NAO_INICIADO | Tabela `recibos_ferias` planejada e nunca criada em produção | `[I]` |
| 13º no servidor | PARCIAL | Só grava auditoria; não gera folha de 13º; IRRF da 2ª parcela deduz INSS duas vezes no modo simplificado | `[E M5, §1.1]` |
| 13º com médias e regra dos 15 dias | PARCIAL | Média digitada à mão; regra aproximada | `[E §1.1]` |
| Relatório de férias | PARCIAL | Estatística ajustada por "mock update" | `[I]` |

### 6.3 Rescisão

| Funcionalidade | Status | Detalhe | Ref. |
|---|---|---|---|
| Motor único | PARCIAL | 3 motores divergentes (um deles órfão); aviso proporcional calculado de jeitos diferentes; projeção do aviso só no servidor | `[E §1.3] [E-CAL-07..12]` |
| Modalidades | PARCIAL | Pedido de demissão sem desconto de aviso; término de experiência sem regra; culpa recíproca incompleta; acordo 484-A sem limite de saque de 80% | `[E §1.1]` |
| Art. 479/480 CLT | NAO_INICIADO | 0 ocorrências | `[E §1.1]` |
| Multa art. 477 §8º | ORFAO | Função sem chamador | `[E §1.1]` |
| Multa do FGTS | PARCIAL (erro) | Somada ao líquido do empregado | `[E §1.1]` |
| TRCT oficial, GRRF, S-2299, seguro-desemprego | NAO_INICIADO | Tabelas `trct`/`grrf` nunca criadas; S-2299 sem XML | `[RES-02] [E-FLX-13/14]` |
| Homologação e assinatura antes do pagamento | PARCIAL | Trigger de proteção existe; jornada ponta a ponta não executada | `[E50-027]` |
| Operação transacional | PARCIAL | `rescisaoService.ts:187-340` faz 3 gravações separadas | `[E-036]` |

### 6.4 Ponto e jornada

| Funcionalidade | Status | Detalhe | Ref. |
|---|---|---|---|
| Registro de ponto (web, quiosque, mobile) | PARCIAL | PIN opcional (padrão desligado); sem cadastro de dispositivo; geofence com fallback fixo em São Paulo | `[A-066]` |
| Biometria / reconhecimento facial | PARCIAL | Comparação por gateway de IA; sem WebAuthn; tabelas `webauthn_*` sem uso | `[PON-06/07] [I]` |
| Tratamento do ponto | PARCIAL | Ignora intervalos, noturno, feriado e jornada por colaborador; HE só 50% | `[PON-01..05] [E-FLX-18]` |
| Banco de horas × folha | PARCIAL (erro) | Hora extra paga **e** creditada | `[PON-02]` |
| Espelho de ponto Portaria 671 (assinado) | SIMULADO/ORFAO | Botão só mostra toast; `AssinarEspelhoDialog` órfão | `[E-FLX-19] [I]` |
| AFD/AEJ | PARCIAL | AEJ lê tabela vazia; AFDT tem reconciliação | `[G-049/050]` |
| Ponto offline | PARCIAL | Fila existe; jornada real (replay, dispositivo) nunca testada | `[E50-025]` |
| Mapa de batidas | SIMULADO | "Fake Map Grid Background" | `[I]` |
| Divergências de ponto | ORFAO | Página `/admin/ponto/divergencias` sem menu | `[I]` |
| Integração com relógios de mercado | NAO_INICIADO | Só importação de AFDT | `[CAT-12]` |
| Teste do registro de ponto ponta a ponta | NAO_INICIADO | E2E só verifica que a tela renderiza | `[A-065]` |

### 6.5 Admissão, contratos e onboarding

| Funcionalidade | Status | Detalhe | Ref. |
|---|---|---|---|
| Admissão → colaborador | NAO_INICIADO | Não cria colaborador nem matrícula | `[ADM-01]` |
| Encerrar ou cancelar admissão | PARCIAL (quebrado) | O enum do banco não tem os estados | `[ADM-02]` |
| Pré-admissão pública por link | PARCIAL | Link por e-mail/WhatsApp não é enviado de verdade | `[E-FLX-12]` |
| OCR de documentos da admissão | PARCIAL/BLOQUEADO | Depende de chave de IA; sem classificação de documento | `[G-027] [CAT-20]` |
| Login gov.br | PARCIAL | Edge existe; a tela mostra "Em breve: Acesso via Gov.br" | `[G-033] [I]` |
| Contrato: geração, assinatura, verificação | PARCIAL | RPCs de token existem; `contratos_gerados` com 0 linhas; geração sem acionador; assinatura sem ICP-Brasil | `[E-FLX-16] [E50-027]` |
| S-2200 da admissão | PARCIAL (erro) | Chamado com o id da admissão no lugar do id do evento | `[E-FLX-15]` |
| Onboarding (kits, documentos obrigatórios) | NAO_INICIADO | Tabelas `onboarding_kits`/`onboarding_documentos_obrigatorios` sem uso; "time to hire" inventado | `[I] [ADM-03]` |
| Assinatura de documento no portal | PARCIAL | Grava IP fixo `127.0.0.1` | `PortalDocumentosTab.tsx:196` `[I]` |

### 6.6 eSocial e obrigações acessórias

| Funcionalidade | Status | Detalhe | Ref. |
|---|---|---|---|
| Transmissão SOAP/mTLS, lote, recibo e retorno | SIMULADO + BLOQUEADO | 0 chamadas de rede; precisa de certificado A1 e credenciamento | `[G-001] [A-011/073]` |
| Assinatura XMLDSig ICP-Brasil | SIMULADO | `SIG-<hash>` em base64 | `[G-002]` |
| XML por evento (27 tipos) | PARCIAL | Só S-1000 e S-2200; o resto vira JSON em CDATA; leiaute S-1.1 | `[G-003] [ESO-04]` |
| Geradores de eventos periódicos e de SST no front | ORFAO | `esocialEventosPeriodicos.ts` e `esocialEventosSST.ts` sem import | `[I]` |
| Validadores | PARCIAL | 28 tipos; faltam S-2250, S-2260, S-2298, S-5002, S-5003, S-5012, S-5013, S-8299; o doc diz "35/35" | `[ESO-20]` |
| Fila, retry e lote | PARCIAL | Envio manual, um evento por vez | `[G-004]` |
| Estados rascunho → gerado → transmitido → aceito/rejeitado | PARCIAL | Sem campos de erro estruturado nem bloqueio de transição | `[A-072]` |
| FGTS Digital (GFD) | SIMULADO | Protocolo local `FGD-…` | `[A-012]` |
| DCTFWeb | SIMULADO | Status `gerada` local | `[A-013]` |
| Guias INSS/DARF/FGTS | PARCIAL | Sem código de barras; base é o salário cadastrado | `[GUI-01..04]` |
| GRRF, informe de rendimentos, EFD-Reinf | NAO_INICIADO | — | `[GUI-05..09] [CAT-07/08]` |
| RAIS, DIRF, CAGED, SEFIP | NAO_INICIADO | Avaliar com a contabilidade quais ainda são exigidas | `[A-019] [CAT-07]` |

### 6.7 Pagamentos bancários

| Funcionalidade | Status | Detalhe | Ref. |
|---|---|---|---|
| CNAB 240/400 remessa | PARCIAL | Gerado no navegador; sequencial atômico corrigido (#193); envio ao banco manual | `[A-015]` |
| CNAB retorno | PARCIAL (quebrado) | Falha em silêncio (colunas inexistentes) | `[E-FLX-06..08]` |
| PIX em lote | PARCIAL/ORFAO | Só CSV; edge `pix-lote` sem chamador; sem API bancária | `[A-014]` |
| Conciliação bancária | NAO_INICIADO | — | `[CAT-09]` |
| API de bancos e PSPs | NAO_INICIADO | — | `[CAT-10]` |

### 6.8 Benefícios, descontos e premiações

| Funcionalidade | Status | Detalhe | Ref. |
|---|---|---|---|
| Tabela única de benefícios | NAO_INICIADO | Duas tabelas; a plural tem 74 linhas sem uso | `[A-005]` |
| Regras de elegibilidade, arquivos e utilização | NAO_INICIADO | Tabelas `beneficio_regras_elegibilidade`, `beneficio_arquivos`, `beneficio_utilizacao` sem uso | `[I]` |
| Benefícios no cálculo do servidor | NAO_INICIADO | Só VT 6% no cálculo em lote | `[E §1.1]` |
| Operadoras (VR, Alelo, Flash, Caju…) | NAO_INICIADO | — | `[CAT-13]` |
| Premiação/PLR na folha | SIMULADO | Toast fixo | `[BEN-07]` |
| Excluir snapshots de premiação | SIMULADO | `onClick={() => {}}` | `RewardsSimulator.tsx:302` `[I]` |
| Faixas salariais por cargo | NAO_INICIADO | `cargo_faixas_salariais` sem uso (o módulo PCS existe) | `[I]` |

### 6.9 SST (saúde e segurança do trabalho)

| Funcionalidade | Status | Detalhe | Ref. |
|---|---|---|---|
| Registro de incidente | SIMULADO | Toast sem gravação | `[A-007]` |
| Exportação de incidentes | NAO_INICIADO | "Funcionalidade de exportação em breve" | `SSTIncidentesTab.tsx:116` |
| PGR, LTCAT e OS | PARCIAL | PDF real, mas conteúdo digitado; sem medições nem limites; sem assinatura ICP do responsável técnico; não alimenta S-2240/S-2220 | `[G SST]` |
| CAT (anexos, testemunhas) | PARCIAL | `sst_cat_anexos`/`sst_cat_testemunhas` sem uso | `[I]` |
| Exposição a riscos e regimento interno (tabela legada) | NAO_INICIADO | `sst_exposicao_riscos`, `sst_regimento_interno` sem uso | `[I]` |
| APR, PT, DDS, CIPA/SIPAT, PPP | NAO_INICIADO | — | `[CAT-27]` |
| Eventos eSocial de SST | ORFAO | Gerador sem import | `[I]` |

### 6.10 Portal do colaborador, comunicação, mobile e idioma

| Funcionalidade | Status | Detalhe | Ref. |
|---|---|---|---|
| Portal (5 abas) | PARCIAL | Sem holerite em PDF; sem solicitações completas | `[A-031] [POR-01/02]` |
| WhatsApp, e-mail, push | SIMULADO/PARCIAL | Ver §4 #15–16; push sem chave VAPID | `[POR-05..07]` |
| Botão "Suporte" | SIMULADO | Só toast | `AppSidebar.tsx:610` |
| Chat interno, helpdesk, enquetes | NAO_INICIADO | — | `[CAT-16]` |
| App nativo (loja) | NAO_INICIADO | Capacitor configurado sem dependências nem projetos Android/iOS | `[A-020] [CAT-01]` |
| PWA avançado (background sync, aviso de atualização) | PARCIAL | Só cache estático e fila offline do ponto | `[CAT-02]` |
| Multi-idioma | ORFAO | 279 chaves em 3 idiomas; nenhuma tela usa; `LanguageSelector` órfão | `[CAT-04] [I]` |
| White-label | NAO_INICIADO | — | `[CAT-05]` |
| RD Station, Google Workspace | NAO_INICIADO | Cartões "EM BREVE" com botão desabilitado | `InlineTabs.tsx:444,472` |

### 6.11 Recrutamento, treinamento, desempenho e clima

| Funcionalidade | Status | Detalhe | Ref. |
|---|---|---|---|
| Funil de recrutamento completo | PARCIAL | `vaga_etapas`, `vaga_entrevistas`, `recrutamento_agendamentos`, `triagem_notas`, `curriculos_arquivos` sem uso | `[REC-01..03] [I]` |
| Avaliação 360, nine-box, PDI | PARCIAL | PDF de PDI órfão (`evaluationPDF.ts`) | `[REC-04/05] [I]` |
| Certificado de treinamento | PARCIAL | "Impressão em breve"; `treinamento_feedbacks` sem uso | `TreinamentosPage.tsx:415` `[I]` |
| LMS/EAD | NAO_INICIADO | — | `[CAT-30]` |

### 6.12 Relatórios, BI e dashboards

| Funcionalidade | Status | Detalhe | Ref. |
|---|---|---|---|
| Dashboard executivo | SIMULADO | Números fixos | `[P-04]` |
| Metabase/BI | ORFAO | Service removido (#201); componente e edge sem tela consumidora | `[A-018] [P-08] [G-034]` |
| Relatórios agendados | PARCIAL | Tela pronta; 0 execuções automáticas (sem agenda) | `[H-AGD-09] [REL-04]` |
| Materialized views de dashboard | NAO_INICIADO em produção | 5 views planejadas, 1 existe, sem refresh | `[H-AGD-07]` |
| Relatório PDF do passivo trabalhista | SIMULADO | Só toast | `PassivoTrabalhistaPage.tsx:250` |
| Gráfico de tendência de login (segurança) | NAO_INICIADO | "disponível em breve" | `SegurancaPage.tsx:201` |
| Construtor de relatório, headcount, comparativo salarial | NAO_INICIADO | — | `[CAT-33]` |

### 6.13 Integrações (contábil, CRM, IA)

| Funcionalidade | Status | Detalhe | Ref. |
|---|---|---|---|
| Domínio/Alterdata (P5-084) | NAO_INICIADO | Código removido em 11/10 (#201); BACKLOG ainda diz "já criado" | `[A-017] [CAT-11]` |
| Bitrix24 | PARCIAL | Só importa, num sentido; cargos "require custom mapping"; sem tabela de mapeamento; sem agenda; sem testes | `[A-076/077]` |
| Assistente de IA | PARCIAL/BLOQUEADO | Funciona com chave do gateway de IA | `[CAT-19]` |
| Alertas preditivos | ORFAO | Heurística sem chamador | `[G] [I]` |
| Webhook de saída/entrada | SIMULADO (entrada) | Marca `processed` sem efeito de negócio | `[A-086]` |
| Contrato front × edge | PARCIAL | Chamadas que falham com 400/422 | `[G "Contrato front×edge"]` |

### 6.14 Segurança e LGPD

| Funcionalidade | Status | Detalhe | Ref. |
|---|---|---|---|
| Criptografia de PII | PARCIAL | Dados bancários só no repo; CPF, RG e salário sem cifra; `decrypt` liberado a qualquer usuário logado | `[A-023]` |
| Atendimento ao titular (LGPD) | PARCIAL | CRUD existe; sem prazo, exportação ou anonimização acionada pela solicitação; purga falhando | `[E50-029] [H-AGD-06]` |
| Política de retenção (`run_lgpd_purge`) | NAO_INICIADO em produção | — | `[H-AGD-08]` |
| Matriz de papéis aprovada (quem vê salário) | NAO_INICIADO | `docs/security/` não existe; papéis financeiro e auditor inexistentes | `[A-064] [E-018]` |
| Isolamento entre empresas provado (matriz T1/T2) | NAO_INICIADO | — | `[E-021/049]` |
| Senhas: histórico e redefinição | NAO_INICIADO | `password_history`, `password_reset_requests` sem uso | `[I]` |
| Passkeys/WebAuthn | NAO_INICIADO | Tabelas sem uso | `[I]` |
| Gitleaks, SBOM, rotação de segredos | NAO_INICIADO/BLOQUEADO | Incidente A-015 com rotação pendente | `[A-070] [H-RUN-01..11]` |
| Upload seguro (magic bytes, antivírus) | NAO_INICIADO | — | `[P-11]` |
| Headers de segurança no nginx (Docker) | NAO_INICIADO | CSP só na Vercel e no `index.html` | `[A-046/083]` |
| Rota do MCP Cloudflare pública | BLOQUEADO | Fora do repo; não verificado | `[A-055]` |
| Threat model e pentest | NAO_INICIADO | — | `[E50-039]` |

### 6.15 Automação, operação, observabilidade e dados

| Funcionalidade | Status | Detalhe | Ref. |
|---|---|---|---|
| Agendador de edge functions | NAO_INICIADO | Ver §4 #17 | `[G-041]` |
| Saúde dos jobs SQL | PARCIAL | 223 falhas em 7 dias; a tela só confere se o job existe | `[H-AGD-16]` |
| Backup, restore drill, PITR, DR (RTO/RPO) | SIMULADO/NAO_INICIADO | Ver §4 #30 | `[H-RUN-15] [E50-048]` |
| Staging descartável | BLOQUEADO | Exige novo projeto Supabase (custo) | `[E-029]` |
| Monitoramento (Prometheus, Grafana, alertas) | SIMULADO | Configuração de prateleira | `[H-OBS]` |
| SLOs por módulo (login, ponto, folha, eSocial) | PARCIAL | Só bridge e banco | `[E-076]` |
| Trace ponta a ponta | PARCIAL | `src/lib/tracing.ts` removido; `_shared/trace.ts` usado por 1 função | `[E-073]` |
| Read replica e PgBouncer | BLOQUEADO | Plano pago e painel | `[A-028/051]` |
| Keyset pagination e cache na ponte | PARCIAL | Só timeout implementado | `[P-18] [G-066..075]` |
| Consolidação de tabelas duplicadas (P2-037) | NAO_INICIADO | — | `[A-005]` |

### 6.16 Infra, CI e qualidade

| Funcionalidade | Status | Detalhe | Ref. |
|---|---|---|---|
| Proteção da `main` única e completa | NAO_INICIADO/BLOQUEADO | Ruleset com 7 checks, bypass `always`, E2E fora; branch protection clássica coexistindo | `[W-01]` |
| Credencial de produção fora do CI de PR | NAO_INICIADO | `db-integrity` usa a URL admin em PR | `[W-02]` |
| Um gerenciador de pacotes, `npm ci` e cache | NAO_INICIADO | `bun.lock` e `package-lock.json` convivem | `[W-05] [E-041]` |
| Deploy de edge functions pelo CI | BLOQUEADO | Falta `SUPABASE_ACCESS_TOKEN` | `[W-14]` |
| Smoke pós-deploy | NAO_INICIADO | — | `[W-10]` |
| Gates escritos e desligados | ORFAO | `audit-edge-authz.mjs`, `audit-schema-drift.mjs`, `provision-e2e-users.mjs`, k6, fuzz | `[ORF-01..03] [H-SCR]` |
| Cobertura por módulo crítico e mutation testing | NAO_INICIADO | Só limiares globais | `[A-087] [E-053]` |
| Acessibilidade WCAG (axe) | NAO_INICIADO | — | `[E50-046]` |
| God files e ciclos de import | PARCIAL | `types.ts` com 24.445 linhas; `cnabService.ts` com 960; ciclo client↔logger | `[E50-040] [E-056/057]` |
| Flags TypeScript adicionais (`noUnusedLocals` etc.) | NAO_INICIADO | — | `[E-046]` |

---

## 7. Situação de cada plano

| Plano | Total | Feito | Parcial | Não iniciado | Bloqueado | Doc errada | Observação |
|---|---:|---:|---:|---:|---:|---:|---|
| **Plano 100 Workflows** (27/09) — `docs/auditoria/PLANO_100_WORKFLOWS_2026-09-27.md` | 100 | 35 | 11 | 37 | 15 | 2 | A revisão do plano usa numeração diferente a partir de E49; o CLAUDE.md herdou o erro `[B2 DOC-W04]` |
| **Plano de 50 etapas E50** (10/09) | 50 | 1 | 33 | 10 | 4 | 2 | Só 4 de 700 checkboxes marcados `[B2 DOC-50-01]` |
| **Ciclo E51** (13/09) | 50 | 9 | 23 | 12 | 4 | 1 | 1 não verificado; os IDs "E51-0xx" no código não batem com o plano |
| **Plano mestre de 100 etapas** (10/09) | 100 | 7 | ~61 | ~26 | 5 | — | Contagem parcial (E-001..E-099); detalhe no anexo B1 |
| **PLANO_100.md** (raiz, 106 etapas, 30/08) | 106 | ~45 confirmadas no repo | — | — | — | — | Pendências A-055..A-090 no anexo A |
| **BACKLOG_11_ITEMS** | 2 pendentes declarados | 0 | 1 (P5-083 workflow) | 1 (P5-084 contábil) | — | P5-086 Metabase dado como feito, mas está órfão | `[A-017/018/021]` |
| **ROADMAP.md / docs/ROADMAP.md** | — | — | — | Q2–Q4/2025 sem marcação real | — | Inúteis como planejamento | `[A-041]` |
| **VISAO_FUTURA (E-100)** | 5 eixos | — | Operabilidade parcial | Ponte por domínio, cálculo no servidor, integrações governamentais | — | Indicador "migrations = repo 100%" não atingido | `[C §Visão]` |
| **Catálogo histórico V2–V19** | 34 funcionalidades | 0 completas | ~18 | ~14 | — | — | `[C CAT-01..35]` |

---

## 8. Inventários: o que existe mas não está ligado

### 8.1 Telas
- **Importadas sem rota (inacessíveis):** `FaltasPage` (485 linhas; o link do dashboard dá 404), `EPIsPage` (424), `CentrosCustoPage` (169) — `src/App.tsx:71-75`.
- **Sem item de menu (só pela URL):** `/holerites`, `/rubricas`, `/provisoes`, `/folha/compliance`, `/contratos-gerados`, `/configuracoes/contratos-templates`, `/convenios`, `/escalas`, `/exames`, `/jornadas`, `/lotacoes`, `/medidas-disciplinares`, `/movimentacoes`, `/pensoes`, `/planos-saude`, `/seguros-vida`, `/sindicatos`, `/times`, `/vales`, `/canal-etica`, `/admin/ponto/divergencias`, `/admin/diagnostico-migracao`.

### 8.2 Edge functions sem nenhum chamador
- **No código ou SQL:** `adiantamento-salarial`, `alertas-preditivos`, `backup-automatico`, `cnab-remessa`, `emprestimo-consignado`, `fgts-digital`, `integracao`, `pix-lote`, `warmup` (aparecem só em `scripts/audit-edge-authz.mjs`).
- **Contando wrappers não usados:** 19 de 61 `[G tabela-resumo]`.
- **Nenhuma** é agendada.

### 8.3 Código órfão (nenhum import), após a limpeza de 11/10

| Arquivo | Funcionalidade perdida |
|---|---|
| `src/utils/esocialEventosPeriodicos.ts` (`gerarEventosMensais`) | Geração de S-1200/S-1210 |
| `src/utils/esocialEventosSST.ts` (`gerarEventosSST`) | Geração de S-2210/2220/2240 |
| `src/validators/esocialValidators.ts` | Validação eSocial |
| `src/components/ponto/AssinarEspelhoDialog.tsx` | Espelho de ponto assinado |
| `src/components/metabase/MetabaseEmbed.tsx` | BI |
| `src/components/i18n/LanguageSelector.tsx` | Multi-idioma |
| `src/utils/evaluationPDF.ts` (`gerarPDIPDF`) | PDF do PDI |
| `src/services/folha/provisoesService.ts` | Provisões |
| `src/services/automacaoService.ts` | Automações |
| `src/services/cnabLayoutService.ts` | Layout CNAB |
| `src/services/dominioService.ts` | Domínio (CBO/CNAE) |
| `src/hooks/useCalculoFeriasPreview.ts`, `src/hooks/useActionStateHelper.ts` | — |
| `calcularFolhaCompleta` (`src/calculators/folhaCompleta.ts`) | Motor completo de folha |
| `calcularMulta477`, `calcularSalarioFamilia` | Multa 477 e salário-família |
| `e2e/fuzz-testing.spec.ts`, `e2e/audit-checklist.spec.ts` | Fora do `testMatch`: nunca rodam |

### 8.4 Tabelas sem uso (modelo de dados sem funcionalidade)

**45 tabelas existem em produção e nenhum código ou SQL as usa:**
- Verbas e folha: `verbas_rescisorias`, `folha_assinaturas`, `folha_eventos_auditoria`, `historico_calculos_folha`, `provisao_auditoria`.
- Benefícios e cargos: `beneficio_regras_elegibilidade`, `beneficio_arquivos`, `beneficio_utilizacao`, `beneficios_colaboradores`, `cargo_faixas_salariais`.
- Ponto: `ponto_ajustes`, `ponto_auditoria_fraude`, `ponto_regras_aprovacao`, `ponto_seguranca_blacklist`.
- Recrutamento e treinamento: `vaga_etapas`, `vaga_entrevistas`, `recrutamento_agendamentos`, `triagem_notas`, `curriculos_arquivos`, `treinamento_feedbacks`.
- SST e disciplina: `sst_cat_anexos`, `sst_cat_testemunhas`, `sst_exposicao_riscos`, `sst_regimento_interno`, `epis_fichas_itens`, `catalogo_infracoes`, `medidas_disciplinares_anexos`, `clinicas_partners_horarios`, `clinicas_partners_servicos`.
- Onboarding: `onboarding_kits`, `onboarding_documentos_obrigatorios`.
- Acesso e segurança: `permissao_perfis`, `permissao_recursos`, `role_permissions`, `password_history`, `password_reset_requests`, `webauthn_credentials`, `webauthn_challenges`, `auth_gov_br_sessions`.
- Diversas: `premiacoes_alertas`, `premiacoes_cenarios_simulacao`, `configuracoes_alertas`, `logs_sincronizacao`, `taxas_cambio`, `vinculos`.

**11 tabelas foram planejadas em migration e nunca criadas em produção:** ver §5.

### 8.5 Rotinas planejadas sem agenda ou quebradas
- **Sem agenda:** relatórios agendados, `backup-automatico`, `alertas-dp`, `alertas-preditivos`, `processar-agendamentos`, `processar-ponto`, `sincronizar-bitrix`, `limpeza`, `fn_recalcular_dobra_e_alertas`, refresh das materialized views (4 `cron.schedule` comentados), `run_lgpd_purge`, `fn_alert_pii_access_anomaly`.
- **Agendadas e falhando:** purga LGPD, status de férias, aviso D-5, purge de rate-limit, limpeza de logs `[H-AGD-01..06]`.

---

## 9. Bloqueios externos (dependem do dono ou de terceiros)

| Bloqueio | Destrava | Quem |
|---|---|---|
| Certificado digital A1 (ICP-Brasil) da empresa + credenciamento eSocial | Transmissão eSocial, DCTFWeb e assinatura válida | Dono/contabilidade |
| Credenciais FGTS Digital, e-CAC e convênio bancário (CNAB/PIX/API) | FGTS Digital, DCTFWeb, pagamento automático | Dono/banco/contabilidade |
| Instância WhatsApp (Evolution `wpp2`) e domínio de e-mail verificado (Resend) | WhatsApp e e-mail reais | Infra |
| `SUPABASE_ACCESS_TOKEN` no GitHub (environment production) | Deploy auditável de edge functions | Dono |
| Service role para provisionar identidades E2E com papéis | E2E autenticado verde | Dono |
| Projeto Supabase de staging (custo) | Restore drill, testes de migration e E2E fora da produção | Decisão de custo |
| PITR / plano pago (read replica) | Recuperação a um ponto no tempo | Decisão de custo |
| Rotação das credenciais do incidente A-015 | Fechar o incidente de segredos | Dono |
| Chaves Domínio/Alterdata (P5-084) | Integração contábil | Contabilidade |
| Decisões de produto: integrar ou declarar "geração de arquivo + protocolo manual" (FGTS/DCTFWeb); estado final da admissão; consolidar tabelas duplicadas | Vários itens de §6 | Dono |

---

## 10. Documentação que diz o contrário do código

A correção desses docs evita retrabalho e decisões baseadas em estado falso. Lista completa em `[A] [B2 DOC-*] [C DOC-01..09] [H-INF-28]`.

**Docs dizem "pendente", mas já está feito:**
- CNAB 240 com remessa e retorno; login gov.br (edge); manifest e service worker do PWA; upload no portal; aviso de férias em PDF; programação anual de férias.
- Timeout da ponte; testes da ponte; tipos sem `any`; RPCs de vínculo e PCS; bucket `backups`; funções `sec_*`.

**Docs dizem "feito", mas não está:**
- Metabase (P5-086) e integração contábil ("já criado em commit": o código foi apagado).
- "35/35 validadores eSocial".
- "E48 secrets E2E": as identidades não funcionam.
- "E66 SHA-pinning" (numeração trocada).
- Monitoramento ativo.
- Backup em S3.

**CLAUDE.md:**
- Gaps críticos já resolvidos ainda listados (CI em repo privado, branch protection, Netlify).
- Versões de stack defasadas (vitest 5.0.3, react 19.3.0 e vite 8.3.2 no `package.json`).
- Diz que o typecheck roda com `tsgo`; o CI usa `tsc`.
- Não registra os PRs #166–#205.
- Diz que os usuários E2E não existem: a conta admin existe em produção.

**Outros:**
- `docs/api/*.md` (37) e `docs/guides/*.md` (32 de 33) são o mesmo gabarito com o nome trocado e documentam uma API REST `/api` que não existe; o `nginx.conf` aponta para `api:3001`, que não existe.
- README: clona `departamento-pessoal-v2.git`.
- `netlify.toml` órfão.
- `docs/ROLLBACK_DRILL.md` trata do cutover antigo.
- Planos E50/E51 com 4/700 e 3/703 checkboxes marcados.

---

## 11. Ordem recomendada de ataque

Critério: primeiro o que **impede a folha real** e o que **engana o usuário**; depois automação e segurança; por fim, expansão.

**Onda 1 — Fazer a folha fechar de verdade (1–2 semanas, sem dependência externa)**
1. Corrigir o select do cálculo em lote e o descompasso de status calcular × fechar `[#1, #2]`.
2. Tabelas fiscais 2026 em `parametros_fiscais`, lidas por todos os motores; INSS 2026 nas edges; IRRF conforme a Lei 15.270/2025, validado com a contabilidade `[#4]`.
3. Eleger **um** motor (servidor) com eventos variáveis, descontos legais e benefícios; aposentar os demais `[#3, #5, #6]`.
4. Holerite gerado no fechamento, com PDF real no bucket e download no portal `[#13, #14]`.

**Onda 2 — Tirar as telas que fingem (2–4 dias)**
- Incidente SST, painel FGTS Digital, certificado eSocial, premiação "enviada", dashboard executivo, alerta de 35%, backup "0 registros", toasts de PDF/relatório, "time to hire", IP `127.0.0.1` `[#8, #9, #23, #26–28, #30]`.
- Cada item deve gravar de verdade ou mostrar honestamente "não configurado".

**Onda 3 — Automação e rotinas (3–5 dias)**
- Consertar os jobs que falham (LGPD, férias, D-5, rate-limit) `[#18]`.
- Agendar dobra e status de férias `[#19]`.
- Definir o agendador das edge functions: `pg_net` ou n8n `[#17]`.
- Consertar `alertas-dp` e o remetente de e-mail `[#16, #37]`.

**Onda 4 — Reconciliar banco × repositório e segurança (1–2 semanas; envolve DDL em produção, com sua aprovação)**
- Aplicar a criptografia bancária e a correção LGPD pendentes.
- Reconciliar o ledger.
- Fechar as policies `USING(true)` e as funções expostas a `anon`.
- Corrigir `is_admin`.
- Remover a conta E2E de produção e rotacionar os segredos `[#31–35, #39]`.

**Onda 5 — Rescisão, ponto, admissão e pagamento**
- Motor de rescisão único, com TRCT `[#11]`.
- Ponto: HE 100%, noturno e fim da dupla contagem; espelho 671 assinado `[#21, #22]`.
- Admissão gera colaborador e encerra `[#20]`.
- Retorno CNAB `[#12]`.
- Ligar as telas escondidas ao menu `[#40]`.

**Onda 6 — Integrações governamentais (depende do certificado A1 e das credenciais, §9)**
- eSocial completo (XML dos 27 eventos, assinatura, transmissão, lote e retorno).
- FGTS Digital, DCTFWeb e GRRF, ou a decisão de "arquivo + protocolo manual".

**Contínuo:**
- E2E verde com seed.
- Testes nas 40 edge functions críticas.
- Monitoramento real.
- Correção dos docs (§10).

---

## 12. Anexos, cobertura e limitações

### 12.1 Anexos (evidência completa, arquivo:linha)

| Anexo | Conteúdo | Prefixos de ID |
|---|---|---|
| [A — Planos da raiz](./LEVANTAMENTO_PENDENCIAS_2026-10-12/anexo-A-planos-raiz.md) | ROADMAP, BACKLOG, CODE_TODOS, ESTADO_ATUAL, CLAUDE.md, PLANO_100/50/MELHORIAS, relatórios de auditoria da raiz | `A-0xx` |
| [B1 — Plano de 100 etapas](./LEVANTAMENTO_PENDENCIAS_2026-10-12/anexo-B1-plano-100-etapas.md) | Tabela E-001..E-100 + itens abertos das auditorias de 10/09 e do estado de 16/08 | `E-0xx` |
| [B2 — Planos de 50 etapas e workflows](./LEVANTAMENTO_PENDENCIAS_2026-10-12/anexo-B2-planos-50-e-workflows.md) | Tabelas E01..E100 (workflows), E50-001..050, E51-001..050 | `W-`, `P-`, `ORF-`, `DOC-` |
| [C — Docs de produto](./LEVANTAMENTO_PENDENCIAS_2026-10-12/anexo-C-docs-produto.md) | 17 módulos, docs/api, guias, catálogo histórico V2–V19 | `ESO-`, `FOL-`, `FER-`, `RES-`, `PON-`, `GUI-`, `ADM-`, `BEN-`, `POR-`, `REC-`, `REL-`, `INT-`, `OPE-`, `CAT-` |
| [E — Frontend, cálculos e fluxos](./LEVANTAMENTO_PENDENCIAS_2026-10-12/anexo-E-frontend-calculos-fluxos.md) | Mapa dos 8 motores, matriz de 35 regras, 5 fluxos ponta a ponta, 66 páginas, 25 integrações | `E-CAL-`, `E-FLX-`, `E-INT-`, `E-PAG-` |
| [G — Edge functions](./LEVANTAMENTO_PENDENCIAS_2026-10-12/anexo-G-edge-functions.md) | 61 funções (tabela-resumo), 10 gaps da ponte, agendamento | `G-0xx` |
| [H — Infra, CI, observabilidade, testes](./LEVANTAMENTO_PENDENCIAS_2026-10-12/anexo-H-infra-ci-observabilidade-testes.md) | Workflows, 12 runbooks, jobs de cron, monitoring, testes, scripts | `H-INF`, `H-RUN`, `H-AGD`, `H-OBS`, `H-TST`, `H-SCR` |
| [I — Produção e varredura](./LEVANTAMENTO_PENDENCIAS_2026-10-12/anexo-I-producao-e-varredura.md) | Ledger, tabelas, buckets, contagens, telas sem menu, órfãos, marcadores de simulação | `[I]` |

### 12.2 O que foi verificado
- **Código:** leitura integral dos planos e de todos os motores de cálculo; varredura programática de 100% de `src/` (rotas, imports, chamadas a tabela/RPC/edge, marcadores), das 735 migrations (tabelas, funções, `cron.schedule`), dos 106 scripts e dos 10 workflows.
- **Produção (somente leitura):** ledger de migrations, 373 tabelas com RLS, 46 views, extensões, 19 buckets, contagens de uso, colunas reais de tabelas usadas pelo cálculo, `cron.job_run_details` (falhas dos últimos 7 dias), policies e funções expostas.

### 12.3 Não verificado / limitações
- Deploy real das 61 edge functions e secrets configurados em produção (sem token de acesso).
- Configurações fora do repositório: GitHub Settings/Environments, Vercel, painéis Supabase, Sentry e Cloudflare.
- Mensagens de erro dos jobs de cron e nomes de 7 dos 15 jobs sem origem no repo.
- Cobertura percentual real dos testes (nenhum teste foi executado nesta análise).
- **Legislação:** tabelas INSS/IRRF 2026, Lei 15.270/2025 e extinção de DIRF/RAIS/CAGED/SEFIP foram citadas pelo conhecimento dos analistas, sem consulta oficial. **Validar com a contabilidade antes de implementar.**
- A conta de teste em produção foi identificada por contagem; a senha publicada no repositório não é reproduzida neste documento.
