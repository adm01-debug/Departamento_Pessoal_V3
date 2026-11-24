# Frontend — Páginas (lote 3/3: `src/pages/` iniciais N–Z)

## 1. Cobertura

**Escopo:** 32 arquivos em `src/pages/` cujo nome começa com N–Z (8.039 linhas). `src/pages/__tests__/`
contém apenas 2 arquivos (`CienciaMedidaPage.test.tsx`, `ImportacaoPage.test.tsx`) — **ambos fora do
meu escopo (letras C e I)**: portanto **0 (zero) das 32 páginas N–Z tem teste de página**.

**Lidos integralmente (10):** `PontoPage.tsx`, `PortalPage.tsx`, `RelatoriosPage.tsx`,
`RecrutamentoPage.tsx`, `TreinamentosPage.tsx`, `SSTPage.tsx`, `UsuariosPage.tsx`,
`PlanoCargosSalariosPage.tsx`, `OrganogramaPage.tsx` (parcial de render), `VerificarContratoPage.tsx`.

**Lidos parcialmente / por trechos dirigidos (22):** `NotificacoesPage`, `ObrigacoesFiscaisPage`,
`OnboardingPage`, `PassivoTrabalhistaPage`, `PensoesPage`, `PerfilPage`, `PesquisasClimaPage`,
`PlanosSaudePage`, `PontoKioskPage`, `PremiacoesPage`, `PromoBrindesPage`, `ProvisoesPage`,
`RubricasPage`, `SegurancaPage`, `SegurosVidaPage`, `SindicatosPage`, `TimesPage`, `TurnosPage`,
`ValesPage`, `VinculosPromoPage`, `WorkflowsPage`, `NotFoundPage`.

**Método complementar (amostragem exaustiva por padrão, 32/32 arquivos):** varredura de
`.from('…')`/`.rpc('…')`/`functions.invoke`, `useMutation`/`insert`/`update`/`delete`,
`toast.success(...)` sem persistência, `Math.random`, `TODO/FIXME/mock/em breve`, e métricas
hardcoded em JSX. Serviços/hooks consumidos foram abertos para mapear a tabela final:
`pontoService`, `batidasPontoService`, `pcsService`, `premiacoesService`, `recrutamentoService`,
`securityService`, `workflowService`, `turnoService`, `pesquisaService`, `provisaoService`,
`useOrganograma`, `useNotificacoes`, `src/services/tabelas/*`.

**Roteamento:** confirmei em `src/App.tsx` que **as 32 páginas estão roteadas** (imports lazy
linhas 18–124; `<Route path=…>` linhas 178–421). **Nenhuma página órfã por rota neste lote.**
`Math.random()` — **0 ocorrências** nas 32 páginas.

**Não executei nada** (`node_modules` ausente). Volumetria de tabelas vem do briefing medido.

---

## 2. Tabela de funcionalidades

| Funcionalidade (página) | Classificação | Evidência (arquivo:linha) | O que falta |
|---|---|---|---|
| **Ponto — registro/gestão** (`PontoPage`) | `IMPLEMENTADO_PARCIAL` | `src/pages/PontoPage.tsx:238` → `pontoService.registrar` → `src/services/pontoService.ts:103` RPC `registrar_batida_ponto`; leitura em `:92` `registros_ponto` (120 linhas) e `:106` `batidasPontoService.listarPorData` → `src/services/batidasPontoService.ts:26` `batidas_ponto` (**0 linhas**) | Fio bipartido: grava em `batidas_ponto` (vazia) e lê "Meu Ponto" de `registros_ponto`. KPIs de gestão hardcoded (`:494` 98.5%, `:505` 12, `:516` 42h, `:527` 100%); badge "3" fixo (`:407`); "Gerar Espelho 671" só emite toast (`:349`) |
| **Ponto — Kiosk/biometria** (`PontoKioskPage`) | `IMPLEMENTADO_PARCIAL` | `src/pages/PontoKioskPage.tsx:65` PIN = `matricula`; `:79-84` `setTimeout(3500)` → "Identidade confirmada"; `:93-96` geo fixa `-23.5505/-46.6333`; `:113` grava via `pontoService.registrar` | Reconhecimento facial **não existe** (só temporizador); PIN sem hash e igual à matrícula; coordenada do quiosque hardcoded |
| **Portal do colaborador** (`PortalPage`) | `IMPLEMENTADO_PARCIAL` | `src/pages/PortalPage.tsx:47` `profiles`(2), `:55` `registros_ponto`(120), `:56` `ferias`(12), `:58` `beneficios`(8) — mas `:57` `holerites` (**0**), `:48` `notificacoes` (**0**), `:63` `comunicados` (**0**) | Aba Financeiro e Comunicados sempre vazias; nenhuma escrita — página 100% leitura |
| **Relatórios** (`RelatoriosPage`) | `IMPLEMENTADO_PARCIAL` | `src/pages/RelatoriosPage.tsx:37-176` consultas reais (`colaboradores`, `folhas_pagamento`, `ferias`, `desligamentos`, `admissoes`); `:241` grava `audit_log` (281 linhas) | `:262` `edgeFunctionsService.enviarRelatorioEmail` — deploy da Edge Function `NAO_VERIFICADO`; aba Agendamentos usa `relatorios_agendados` (**0 linhas**, `src/services/tabelas/*`) |
| **Recrutamento** (`RecrutamentoPage`) | `IMPLEMENTADO_PARCIAL` | `src/pages/RecrutamentoPage.tsx:37-53` lê `vagas`(3)/`candidaturas`(5)/`candidatos`(5); única escrita é `:55-61` `updateEtapa` | **Fio quebrado**: diálogo "Nova Vaga" (`:81-88`) tem inputs não controlados e botão "Publicar Vaga" (`:87`) **sem `onClick`**; "Criar Nova Vaga" (`:260`), "Gerenciar Vaga" (`:251`), excluir (`:223`), contato (`:176`) e "Avançar para Próxima Etapa" (`:419`) também sem handler. "Taxa de Conversão 4.2%" hardcoded (`:332`) |
| **Treinamentos / catálogo / trilhas** (`TreinamentosPage`) | `IMPLEMENTADO_TOTAL` (com ressalva) | CRUD completo: `:174` `treinamentos`(2), `:183` `catalogo_cursos`(3), `:192` `trilhas_aprendizado`(2), `:54` `trilhas_cursos`(2), `:201` `inscricoes_cursos`(2); leituras `treinamento_instancias`(1), `treinamento_certificados`(1) | Turmas e Certificados são **somente leitura** (sem UI de criação/emissão); "Ver" certificado só faz `toast.info('Impressão em breve')` (`:306`) |
| **SST — hub** (`SSTPage`) | `IMPLEMENTADO_PARCIAL` | Lê `asos`(6) `:37`, `epis`(8) `:50`, `epis_entregas`(8) `:60` | **Fio quebrado grave**: "Registrar Incidente" (`:129`) só faz `toast.success('Incidente registrado!')` — o form `incidenteForm` é descartado, **nenhum INSERT em `sst_incidentes`**. Query `:56-66` de `epis_entregas` **sem filtro `empresa_id`** |
| **Segurança / firewall** (`SegurancaPage`) | `SUGERIDO_OU_INICIADO` | `src/pages/SegurancaPage.tsx:33-36` → `src/services/securityService.ts` tabelas `security_alerts`, `blocked_ips`, `login_attempts`, `geo_blocked_attempts` — **nenhuma consta na lista de 112 tabelas com dado** | Todos os 4 KPIs (`:55-60`) são estruturalmente zero; gráfico declarado "disponível em breve" (`:146`) |
| **Workflows** (`WorkflowsPage`) | `IMPLEMENTADO_PARCIAL` | `:67/:73/:78/:84` CRUD + aprovar/rejeitar em `workflows_definicoes`(1) e `workflows_execucoes`(8) via `src/services/workflowService.ts` | Designer (`:353-374`) salva `nome` do nó "start" mas o `tipo` vem de `form.tipo` (estado de outro formulário) — acoplamento incorreto. Timeline do modal exibe entrada fabricada: comentário `{/* Email Delivery Log (Simulated but showing in log) */}` (`:419`) afirmando "E-mail disparado" sem evidência de envio |
| **Premiações / renda variável** (`PremiacoesPage`) | `IMPLEMENTADO_PARCIAL` | Lê `premiacoes_campanhas`(3), `premiacoes_auditoria`(8); `:54` atualiza status. Mas `premiacoes_pagamentos` e `premiacoes_roi_cenarios` estão **vazias** | **Fake**: `:81-90` `handleSyncFolha` = `setTimeout(2000)` + toast "12 registros foram enviados para a folha de Maio/2026" — zero escrita. `:64-79` "Exportar" chama `premiacoesService.exportarRelatorio` que em `src/services/premiacoesService.ts:173-177` só retorna a lista (`// Real logic to export would be here`) e a UI anuncia "Relatório gerado com sucesso!". Hardcoded: `:120` "+12% vs mês anterior", `:143` "Impactando 85% do time", `:217-219` progresso 45%, `:222-230` avatares "U1 U2 U3 +12" |
| **Passivo trabalhista** (`PassivoTrabalhistaPage`) | `IMPLEMENTADO_PARCIAL` | Cálculo client-side real `:110-149` sobre `colaboradores`(13)/`ferias`(12)/`folhas_pagamento`(4) | `:97-101` `provisoes_mensais` **vazia** → bloco "divergências" (`:139-148`) nunca dispara; projeção `:169-172` usa crescimento fixo `1 + i*0.015` (premissa hardcoded); "Relatório PDF" (`:193`) só faz `toast.info('Gerando relatório detalhado…')` |
| **Provisões** (`ProvisoesPage`) | `IMPLEMENTADO_PARCIAL` | `:66` → `src/services/provisaoService.ts:22` `functions.invoke('calcular-provisoes')`; leitura `provisoes_mensais` (`provisaoService.ts:7`) | `provisoes_mensais` e `provisao_logs` (`:125`) **vazias** → tabela, KPIs, trilha de auditoria e gráfico sempre vazios. Deploy da função `calcular-provisoes` `NAO_VERIFICADO` |
| **Obrigações fiscais** (`ObrigacoesFiscaisPage`) | `SUGERIDO_OU_INICIADO` | `:48-54` consulta `dctfweb_declaracoes`, `sefip_arquivos`, `guias_fgts`, `guias_inss`, `certificados_digitais`, `simulacoes_fiscais` — **as 6 vazias**; `:56-63` insert real de guia | **Fake**: `:104` "Sincronizar API" = `toast.success('Sincronizando com FGTS Digital API…')` sem chamada. `:164` "Nova Simulação" sem `onClick`. `:82` depende de `edgeFunctionsService.gerarGuias` (`NAO_VERIFICADO`) |
| **Plano de Cargos e Salários** (`PlanoCargosSalariosPage`) | `SUGERIDO_OU_INICIADO` | `:21` `usePcsPlanos` → `src/hooks/usePcs.ts:9` → `src/services/pcsService.ts`: `pcs_planos`, `pcs_fatores`, `pcs_grades`, `pcs_avaliacoes_cargo`, `pcs_pesquisa_salarial` — **nenhuma na lista de tabelas com dado** | Módulo inteiro (5 abas + 4 RPCs `pcs_*`) opera sobre base vazia; nunca usado em produção |
| **Vales (VA/VR/VT)** (`ValesPage`) | `SUGERIDO_OU_INICIADO` | `:24` `vales_alimentacao`, `:38` `vales_transporte`, `:58` `recargas_vale` — **as 3 vazias**; única escrita `:70-81` recarga | Sem UI de cadastro de VA/VT (só recargas); query de VT (`:37-43`) e insert de recarga (`:72-79`) **sem `empresa_id`** |
| **Planos de saúde** (`PlanosSaudePage`) | `SUGERIDO_OU_INICIADO` | `:122` insert `planos_saude` (**0**), `:131` insert `seguros_vida` (**0**), `:34` `beneficiarios_plano` (**0**) | CRUD escrito, base 100% vazia — nunca operado |
| **Seguros de vida / sinistros** (`SegurosVidaPage`) | `SUGERIDO_OU_INICIADO` | `:101` `seguros_vida`, `:139-141` `sinistros_seguro`, `:33` `beneficiarios_seguro`, `:156` `seguros_colaboradores` — **todas vazias** | Idem: fluxo completo escrito, zero uso |
| **Pensões alimentícias** (`PensoesPage`) | `SUGERIDO_OU_INICIADO` | `:53-62` insert `pensoes`, `:65-66` delete — tabela `pensoes` **vazia** | Sem integração com desconto em folha (`folha_itens`) |
| **Sindicatos** (`SindicatosPage`) | `SUGERIDO_OU_INICIADO` | `:35-41` insert `sindicatos` — tabela **vazia** | CRUD mínimo (criar/excluir), sem edição nem vínculo com CCT/colaborador |
| **Pesquisas de clima** (`PesquisasClimaPage`) | `IMPLEMENTADO_PARCIAL` | `:36/:42/:47` → `src/services/pesquisaService.ts` `pesquisas` (**1 linha**); `pesquisas_perguntas` e `pesquisas_respostas` **vazias** | Existe a pesquisa mas nenhuma pergunta nem resposta: o ciclo de coleta nunca rodou |
| **Notificações** (`NotificacoesPage`) | `SUGERIDO_OU_INICIADO` | `:85-95` update/delete em `notificacoes` (**0 linhas**); `:97-103` `historico_alertas` (**0 linhas**) | Ambas as abas estruturalmente vazias; `historico_alertas` consultada **sem escopo de usuário/empresa** (`:100`) |
| **Onboarding** (`OnboardingPage`) | `IMPLEMENTADO_PARCIAL` | `:20-33` lê `admissoes`(8) + `tarefas_onboarding`(24); `:36-46` conclui tarefa | Query `:22-31` **sem `empresa_id`**. Convive com família concorrente `onboarding_tarefas`(27)/`onboarding_templates`(4)/`onboarding_colaborador`(6) usada em `src/services/tabelas/rhService.ts` — **refactor duplicado não concluído** |
| **Organograma** (`OrganogramaPage`) | `IMPLEMENTADO_TOTAL` | `:5/:13` `useOrganograma` → `src/hooks/useOrganograma.ts` `departamentos`(10) + `colaboradores`(13); KPIs derivados `:16-30` | Somente leitura (por design); sem edição de hierarquia |
| **Usuários** (`UsuariosPage`) | `IMPLEMENTADO_PARCIAL` | `:13-20` lê `profiles`(2) | Página sob `AdminRoute` (`App.tsx:266`) mas **não gerencia nada**: sem criar/editar/desativar; badge "Ativo" **hardcoded para todos** (`:45`); ignora `user_roles`(4) e `user_empresas`(4) |
| **Perfil** (`PerfilPage`) | `IMPLEMENTADO_TOTAL` | `:106` update `profiles`(2); `:142` update de `avatar_url` após upload no bucket `avatars`; `:60-70` `pushNotificationService` | Bucket `avatars` e push `NAO_VERIFICADO` (sem acesso a storage/Management API) |
| **Rubricas de folha** (`RubricasPage`) | `IMPLEMENTADO_TOTAL` | `:63-79` insert/update, `:93` toggle ativo, `:101-103` delete em `rubricas_folha` (**24 linhas**), sempre com `.eq('empresa_id', …)` | Campo `formula` (`:174`) é texto livre — nenhuma validação/execução no front |
| **Turnos** (`TurnosPage`) | `IMPLEMENTADO_TOTAL` | `:35-42` → `src/services/turnoService.ts` `turnos` (**7 linhas**) e `escalas_trabalho` (**96 linhas**) | Sem edição (só criar/excluir) |
| **Times** (`TimesPage`) | `IMPLEMENTADO_TOTAL` | `:37-58` CRUD em `times` (**2 linhas**) com `.eq('empresa_id', …)` | — |
| **Promo Brindes** (`PromoBrindesPage`) | `IMPLEMENTADO_PARCIAL` | `:36-84` CRUD em `promo_brindes` (**2 linhas**) | **Nenhuma referência a `empresa_id` no arquivo** — sem isolamento de tenant no cliente |
| **Vínculos Times×Brindes** (`VinculosPromoPage`) | `IMPLEMENTADO_PARCIAL` | `:66-79` insert e `:90-92` delete em `times_brindes` (**1 linha**) | `delete` (`:92`) sem `empresa_id`; leituras (`:41`, `:52`) sem escopo de tenant |
| **Verificação pública de contrato** (`VerificarContratoPage`) | `IMPLEMENTADO_PARCIAL` | `:48-51` `supabase.rpc('contrato_verificar_autenticidade_v2')`; rota pública `App.tsx:182-183` | `contratos_gerados`/`contratos_assinaturas` **não constam entre as tabelas com dado** → nenhum hash real a verificar. `:41` chama host externo `https://api.ipify.org` (dependência de terceiro / CSP) |
| **404** (`NotFoundPage`) | `IMPLEMENTADO_TOTAL` | 20 linhas; rota curinga `App.tsx:421` | — |

**Resumo do lote:** 8 `IMPLEMENTADO_TOTAL` · 16 `IMPLEMENTADO_PARCIAL` · 8 `SUGERIDO_OU_INICIADO` ·
0 `MORTO_OU_ABANDONADO` (nenhuma página N–Z está fora do roteamento).

---

## 3. Achados graves

1. **[CRÍTICO — fio quebrado] Registro de incidente SST não persiste.**
   `src/pages/SSTPage.tsx:129` — o botão "Registrar Incidente" executa apenas
   `onClick={() => { toast.success('Incidente registrado!'); setOpenIncidente(false); }}`. O estado
   `incidenteForm` (`:31`, alimentado em `:109-128`) é descartado; não há `insert` em
   `sst_incidentes` em nenhum ponto do arquivo. Um acidente de trabalho reportado pela tela some,
   com feedback de sucesso ao usuário. (A tabela `sst_incidentes` tem 2 linhas, gravadas por
   `src/components/sst/SSTIncidentesTab.tsx:20`, um caminho distinto.)

2. **[CRÍTICO — dado fictício] "Sincronização com a folha" das premiações é um `setTimeout`.**
   `src/pages/PremiacoesPage.tsx:81-90` — após 2 s exibe "Sincronização concluída! **12 registros
   foram enviados para a folha de Maio/2026**". Nenhuma chamada de rede/DB. O número 12, o mês e o
   resultado são literais.

3. **[CRÍTICO — dado fictício] Exportação de premiações anuncia sucesso sem gerar arquivo.**
   `src/services/premiacoesService.ts:173-177` contém `// Real logic to export would be here` e
   apenas retorna a lista; `src/pages/PremiacoesPage.tsx:64-79` mostra
   "Relatório gerado com sucesso! Trilha de auditoria incluída."

4. **[CRÍTICO — biometria falsa no quiosque] `src/pages/PontoKioskPage.tsx:79-84`** — a etapa
   `facial_scan` é um `setTimeout(3500)` que anuncia "Identidade confirmada" e libera o registro.
   Não há chamada a `pontoService.validarBiometria` (que **existe** e é usada em
   `src/pages/PontoPage.tsx:260`). Além disso `:65` autentica por `matricula` como PIN
   (comentário no código: *"simulating with matricula"*) e `:93-96` fixa a geolocalização em
   `-23.5505 / -46.6333`.

5. **[CRÍTICO — fio bipartido no Ponto] O botão de bater ponto grava numa tabela vazia.**
   `src/pages/PontoPage.tsx:238` → `src/services/pontoService.ts:103` RPC `registrar_batida_ponto`
   (destino `batidas_ponto`, **0 linhas** no banco), enquanto o cartão "Meu Ponto" lê
   `registros_ponto` (`PontoPage.tsx:92`, **120 linhas**) e o processamento server-side é outra
   função (`:289` `edgeFunctionsService.processarPonto`). Conclusão medida: **as 120 batidas
   existentes não foram produzidas pelo botão da UI**, e a lista "Batidas Recentes" (`:569`) e a aba
   Geofencing (`:554`) — ambas alimentadas por `batidas_ponto` — estão permanentemente vazias.

6. **[ALTO — fio quebrado] Criação de vaga em Recrutamento é decorativa.**
   `src/pages/RecrutamentoPage.tsx:81-88`: os quatro `Input` do diálogo "Nova Vaga" são **não
   controlados** (sem `value`/`onChange`) e o botão "Publicar Vaga" (`:87`) **não tem `onClick`**.
   Mesmo padrão em "Criar Nova Vaga" (`:260`), "Gerenciar Vaga" (`:251`), excluir vaga (`:223`),
   contatar candidato (`:176`) e "Avançar para Próxima Etapa" (`:419`). A única escrita da página é
   a troca de etapa (`:55`).

7. **[ALTO — métricas inventadas na gestão de ponto] `src/pages/PontoPage.tsx:494, 505, 516, 527`**
   — "Assiduidade 98.5%", "Inconsistências 12", "Previsão HE 42h", "Compliance 100%" são literais
   JSX. Também o badge "3" de pendências (`:407`) e os selos "REP-P HOMOLOGADO" / "BIOMETRIA ATIVA"
   (`:380-386`). O botão "Gerar Espelho 671" (`:349`) apenas informa
   *"documento assinado digitalmente e disponível no histórico de auditoria"* — sem gerar nada.

8. **[ALTO — log de auditoria fabricado] `src/pages/WorkflowsPage.tsx:419`** — o comentário
   `{/* Email Delivery Log (Simulated but showing in log) */}` precede um item de timeline que
   afirma "Notificação de Aprovação Enviada — E-mail disparado para o aprovador Nível 1". Um rastro
   de auditoria que declara um envio inexistente é risco de compliance, não só cosmético.

9. **[ALTO — módulo inteiro sobre base vazia] Segurança/Firewall.**
   `src/pages/SegurancaPage.tsx:33-36` → `src/services/securityService.ts`: `security_alerts`,
   `blocked_ips`, `login_attempts`, `geo_blocked_attempts` — **nenhuma aparece entre as 112 tabelas
   com dado**. Os 4 KPIs (`:55-60`) são zero por construção, apesar de existirem `login_lockouts`(3)
   e `rate_limits`(3) no banco (tabelas diferentes, não consultadas). Mesma situação para
   `PlanoCargosSalariosPage` (todas as `pcs_*` vazias), `ObrigacoesFiscaisPage` (6 tabelas vazias),
   `ValesPage`, `PlanosSaudePage`, `SegurosVidaPage`, `PensoesPage`, `SindicatosPage`,
   `NotificacoesPage`.

10. **[ALTO — integrações anunciadas que não existem] `src/pages/ObrigacoesFiscaisPage.tsx:104`**
    — "Sincronizar API" com o rótulo *FGTS Digital* executa somente
    `toast.success('Sincronizando com FGTS Digital API...')`. Sem cliente HTTP, sem edge function.

11. **[MÉDIO — isolamento de tenant no cliente] Consultas sem `empresa_id`:**
    `SSTPage.tsx:56-66` (`epis_entregas`), `OnboardingPage.tsx:22-31` (`admissoes`),
    `ValesPage.tsx:37-43` (`vales_transporte`) e `:72-79` (insert de `recargas_vale`),
    `NotificacoesPage.tsx:100` (`historico_alertas`), `VinculosPromoPage.tsx:41,52,92`,
    `PromoBrindesPage.tsx` (nenhuma ocorrência de `empresa_id` no arquivo inteiro),
    `UsuariosPage.tsx:16` (`profiles` global). A correção depende integralmente de RLS — com
    `empresas=1` no banco, a falha ficaria invisível hoje e apareceria no primeiro tenant novo.

12. **[MÉDIO — refactor duplicado não concluído] Duas famílias de tabelas de onboarding.**
    `src/pages/OnboardingPage.tsx:22-31` usa `admissoes` + `tarefas_onboarding` (24 linhas),
    enquanto `src/services/tabelas/rhService.ts` opera `onboarding_tarefas` (27),
    `onboarding_templates` (4), `onboarding_template_tarefas` (21) e `onboarding_colaborador` (6).
    Ambas com dado — o estado do onboarding está partido em dois modelos concorrentes.

13. **[MÉDIO — administração sem administração] `src/pages/UsuariosPage.tsx`** (55 linhas) é
    protegida por `AdminRoute` (`src/App.tsx:266`) mas só lista `profiles`; o status "Ativo" é um
    literal em `:45` (todo usuário aparece ativo). `user_roles`(4) e `user_empresas`(4) — que são a
    fonte real de permissão — nunca são lidos.

14. **[MÉDIO — premissa financeira hardcoded] `src/pages/PassivoTrabalhistaPage.tsx:169-172`** — a
    projeção de 6 meses do passivo multiplica o total por `(1 + i * 0.015)`: crescimento fixo de
    1,5% a.m. embutido no código, apresentado como projeção. As alíquotas em `:29-31`
    (FGTS 8%, multa 40%, INSS 20%) são corretas mas também não configuráveis.

15. **[MÉDIO — cobertura de teste zero] Nenhuma das 32 páginas N–Z tem teste.**
    `src/pages/__tests__/` contém apenas `CienciaMedidaPage.test.tsx` e `ImportacaoPage.test.tsx`.
    Inclui páginas críticas de risco trabalhista (`PontoPage`, `PontoKioskPage`,
    `PassivoTrabalhistaPage`, `SSTPage`).

16. **[BAIXO — dependência externa em rota pública] `src/pages/VerificarContratoPage.tsx:41`**
    faz `fetch('https://api.ipify.org?format=json')` numa rota pública (`App.tsx:182-183`) para
    alimentar o rate limit do RPC. Falha de terceiro ou CSP degrada o controle de abuso.

---

## 4. Lacunas (não verificado e por quê)

- **Deploy das Edge Functions** — `processarPonto` (`PontoPage.tsx:289`), `gerarGuias`
  (`ObrigacoesFiscaisPage.tsx:82`), `enviarRelatorioEmail` (`RelatoriosPage.tsx:262`),
  `calcular-provisoes` (`provisaoService.ts:22`): a Management API está indisponível (sem PAT),
  então **não sei se estão deployadas**. `NAO_VERIFICADO`.
- **Existência das tabelas de segurança e PCS** — sei que `security_alerts`, `blocked_ips`,
  `login_attempts`, `geo_blocked_attempts`, `pcs_*`, `batidas_ponto`, `holerites`, `comunicados`,
  `provisoes_mensais`, `relatorios_agendados` **não têm dado** (não constam nas 112 com linhas), mas
  não distingo "tabela existe e está vazia" de "tabela não existe" — não consultei o banco.
- **RPCs** `registrar_batida_ponto`, `contrato_verificar_autenticidade_v2`, `pcs_simular_impacto`,
  `pcs_gerar_grades`, `pcs_enquadramento`, `pcs_grades_mercado`: não verifiquei se existem no schema
  nem se estão na allowlist do `external-db-bridge`.
- **Políticas RLS** — vários achados de item 11 dependem de RLS para não vazar dados entre tenants;
  **não auditei as 599 policies** (fora do meu escopo e sem acesso de leitura ao banco).
- **Comportamento em runtime** — `node_modules` ausente: não compilei, não rodei lint nem testes.
  Nenhuma afirmação deste relatório sobre "funciona/quebra em execução" foi observada; tudo é
  leitura estática de código + volumetria medida do banco fornecida no briefing.
- **Componentes filhos** — abas e widgets em `src/components/**` (ex.: `PontoCharts`,
  `SSTIncidentesTab`, `RewardsSimulator`, `CampaignWizard`, `PortalOverviewTab`, `PcsEquidadeTab`)
  foram apenas amostrados quando decisivos para o fio de persistência; **a auditoria completa de
  `src/components/` pertence a outro lote**.
- **`src/App.tsx`** foi consultado somente para confirmar roteamento (linhas 18–124 e 178–430),
  conforme instruído — não auditado.
