# Operação Nine-Box — implementação e evidências (2026-10-20)

## Regra corrigida: conclusão ≠ aprovação

- **Concluir avaliação** (RH ou gestor) só grava `feedbacks_360.status = 'concluido'`.
  Não cria linha em `feedbacks_360_aprovacoes_gestor`, não preenche
  `desempenho_aprovado`/`potencial_aprovado` e não define `aprovacao_id`.
- A classificação oficial exige decisão `aprovado` vigente do gestor responsável,
  casada com a versão consolidada do conjunto.
- `nineBox360` é **fail-closed**: sem aprovação/consolidação (ou com arrays
  omitidos), retorna `aprovacao_pendente` e nunca inventa quadrante.
- `FeedbacksTab` usa a mesma regra ao exibir classificação nos cards.
- Na vitrine, registros `demo-*` recém-criados exigem aprovação local; fixtures
  históricas intocadas continuam formando a vitrine aprovada.
- A decisão do gestor continua exclusiva de `decidir_aprovacao_gestor`;
  `pode_aprovar_colaborador` exige papel `gestor` + vínculo, portanto RH não
  aprova nem devolve pelo caminho do gestor. Na fila, as ações Aprovar/Devolver
  não são renderizadas para quem não é gestor autorizado (exceto exceção
  confirmada pelo servidor).
- E2E real: `_tmp-validar-conclusao-nao-classifica.mjs` provou RH/admin
  concluindo preparação → `status=concluido`, `aprovacoes=0`,
  `consolidacao=sem_gestor` e Nine-Box exibindo aprovação pendente, sem quadrante.
  Evidências: `tmp-integracao-ninebox/relatorio-conclusao-nao-classifica.json` e
  `tmp-integracao-ninebox/conclusao-nao-classifica.png`.

As seções abaixo preservam o histórico das rodadas anteriores; onde houver
menção a validação posterior do Potencial pelo RH, vale a regra acima (a
aprovação do gestor é a decisão final).

Branch de trabalho: `fix/ninebox-operacao-definitiva`
Commit base (antes das alterações desta rodada): `380e44a31`

## 1. O que foi implementado nesta rodada

### NB-004 — autorização excepcional confirmada pelo SERVIDOR

- `src/services/avaliacaoService.ts`
  - novo `podeAprovarColaborador(colaboradorId)` → RPC `pode_aprovar_colaborador`.
  - nenhuma lista de e-mails, UUID ou allowlist no frontend.
- `src/pages/AvaliacaoPage.tsx`
  - consulta a RPC para cada colaborador com avaliação **real** do ciclo
    (`idDemonstrativo` é ignorado; nenhuma chamada para a vitrine).
  - resultado em `autorizacoesAprovacao` e repasse à aba Feedbacks.
  - `refetchInterval` de 30 s: expiração/revogação da exceção reflete sem F5.
  - invalidação do cache após envio, decisão e validação do RH.
  - falha de RPC não libera nada (o `Promise.all` rejeita e o mapa fica vazio).
- `src/components/avaliacao/aprovacaoGestor.ts`
  - `EstadoAprovacao.autorizadoServidor` e `PendenciaAprovacao.autorizadoServidor`.
  - `situacaoAprovacao` aceita a exceção, mas **não inventa gestor**: antes da
    decisão o status continua `sem_gestor`; depois da decisão avança para
    `aprovada_gestor`/`concluida_validada`.
  - `aprovacaoPermitida` e `podeDecidir` passam a considerar a confirmação do
    servidor; a avaliação do Gestor continua obrigatória.
- `src/components/avaliacao/feedbackCanonico.ts`
  - `SituacaoAprovacaoCanonica.autorizadoServidor` e uso em `getFeedbackActions`.
  - com exceção confirmada, não bloqueia por papel/vínculo, mas mantém o bloqueio
    de avaliação obrigatória e de etapa.
- `src/components/avaliacao/FeedbackAcoesRodape.tsx` e `FeedbacksTab.tsx`
  - recebem/repassam `autorizacoesAprovacao`; o rodapé real libera Aprovar/Devolver
    quando o servidor confirmou a exceção (inclusive sem `supervisor_id`).
  - nenhuma alteração de JSX, classe, cor, espaçamento ou texto visual.

### Correções de fluxo já consolidadas nesta branch (contexto)

- Criação/edição demonstrativa sem decisão não classifica no Nine-Box.
- Aprovação do gestor não faz o colaborador “desaparecer”: banner mostra nome +
  `Ciclo: <nome>` enquanto o RH valida o Potencial.
- Separação de versões: decisão usa versão consolidada; validação do RH usa a
  versão da avaliação do Gestor.
- Origem real vs. demonstrativa decidida por registro (`idDemonstrativo`/UUID).

## 2. Evidências executadas

- `npx vitest run` (18 arquivos de desempenho/Nine-Box): **389 testes passando**.
- `node _tmp-validar-integracao-ninebox.mjs`: passos
  `criacao_nao_classifica`, `aprovacao_gestor`, `ninebox_aguardando_rh`,
  `classificacao_ninebox`, `persistencia_f5`, `segundo_ciclo`,
  `reabertura_invalida`, `rbac_rh_nao_aprova`, `rbac_user_sem_controle` OK.
- `node scripts/verificar-layout-protegido.mjs`: **OK** — nenhuma âncora visual
  protegida alterada.
- `npx eslint` nos arquivos tocados: **0 erros** (2 avisos de memoização
  preservada, sem impacto funcional).
- `tsc` dos arquivos de desempenho: sem erros próprios; o repositório tem erros
  preexistentes em outros módulos.

## 3. Bloqueios reais (não contornados)

1. **Edição real de feedback indisponível no banco principal.**
   A RPC `editar_feedback_seguro` responde `PGRST202` (função não encontrada).
   A migration `supabase/migrations/20261020090000_ninebox_edicao_feedback.sql`
   existe no repositório, mas **não foi aplicada**. Sem autorização explícita,
   não executei a migration. Até aplicá-la, a edição real falha no servidor.
2. **Homologação real da exceção (`ti@promobrindes.com.br`) não executada.**
   Não há credenciais disponíveis nesta sessão. A interface agora consulta a RPC
   real, mas a prova de gravação em `feedbacks_360_aprovacoes_gestor` e a
   validação do RH precisam ser feitas com a conta autorizada.
3. **Atribuição administrativa de gestor (`sem_gestor`) e invalidação de
   aprovação na troca de gestor** exigem regra/transação no servidor. Não criei
   migration especulativa nem escrevi direto em `colaboradores` para simular.
4. **Auditoria explícita da exceção** (`homologacao`) não tem coluna própria na
   tabela de decisões; `decidido_por` registra a conta, mas não o motivo
   “exceção”. Classificar isso exige migration aditiva autorizada.
5. **Auditoria de RLS/policies no banco efetivo** não foi possível por falta de
   acesso SQL administrativo. As RPCs conferidas existem; a matriz multiempresa
   deve ser validada com a conta `ti` e consultas diretas.

## 4. Arquivos alterados nesta rodada

- `src/services/avaliacaoService.ts`
- `src/pages/AvaliacaoPage.tsx`
- `src/components/avaliacao/aprovacaoGestor.ts`
- `src/components/avaliacao/feedbackCanonico.ts`
- `src/components/avaliacao/FeedbackAcoesRodape.tsx`
- `src/components/avaliacao/FeedbacksTab.tsx`
- `src/components/__tests__/AprovacaoGestor.test.ts`
- `src/components/__tests__/FeedbackAcoesRodape.test.tsx`
- `src/services/__tests__/avaliacaoAprovacaoService.test.ts`

---

# Rodada 2 — aprovação do gestor como decisão final (2026-10-20)

## Regra implementada

`RH salva a avaliação consolidada → gestor aprova/devolve → Nine-Box classifica.`

Não existe validação posterior do Potencial pelo RH para novas avaliações. O
histórico legado de `feedbacks_360_validacoes_potencial` é preservado, mas o
motor e a interface não o exigem.

## Mudanças

### Motor e leitura

- `motorAvaliacao360.ts`
  - aceita `aprovado`, `desempenhoAprovado`, `potencialAprovado`;
  - quando a aprovação está vigente, o snapshot é a fonte oficial;
  - removeu a etapa obrigatória de `validacaoPotencial`;
  - mantém limites, pesos 60/25/10/5, renormalização e ausência de arredondamento.
- `nineBox360.ts`
  - lê `desempenho_aprovado`/`potencial_aprovado` da consolidação;
  - classifica mesmo sem feedback separado `tipo='gestor'` quando há snapshot;
  - aprovação aprovada **sem snapshot** (`desempenho_aprovado`/`potencial_aprovado`)
    é fail-closed: `aprovacao_sem_valores`, sem quadrante nem notas;
  - bloqueia decisão pendente/devolvida/versão diferente.
- `aprovacaoLocal.ts`
  - aprovação demonstrativa classifica imediatamente;
  - não usa mais validação local do RH;
  - invalida a decisão quando a versão do conjunto muda.

### Fluxo/UI

- `aprovacaoGestor.ts`
  - `elegivelNineBox` inclui `aprovada_gestor`;
  - `podeValidarPotencial` é `false` no fluxo novo.
- `feedbackCanonico.ts` / `FeedbackAcoesRodape.tsx`
  - a terceira etapa não é oferecida;
  - o controle legado “Validar Potencial” permanece no layout aprovado, porém
    desabilitado, sem chamada de RPC.
- Avaliação sem Desempenho E Potencial válidos bloqueia antes da decisão.

### Backend

Estrutura **já refletida no principal** (ver `NINEBOX-ESTABILIZACAO-PRODUCAO.md`):
`supabase/migrations/20261021090000_ninebox_aprovacao_confirmada.sql`

- adiciona `desempenho_proposto`, `potencial_proposto`, `desempenho_aprovado`,
  `potencial_aprovado`, `aprovado_por`, `aprovado_em`, `aprovacao_id` e
  `snapshot_aprovado`;
- `sincronizar_consolidacao_avaliacao` passa a registrar a proposta e limpa o
  snapshot quando a versão muda;
- `decidir_aprovacao_gestor` deixa de exigir feedback separado `tipo='gestor'`,
  aceita a proposta consolidada de qualquer categoria, calcula o desempenho
  360° com os pesos aprovados, valida 1–5 e versão vigente, grava decisão +
  snapshot + auditoria na mesma transação. O gestor autorizado pode aprovar a
  avaliação que ele mesmo criou; a autoria não é bloqueio.
- o principal possui ainda uma checagem remota adicional
  (`empresa_ciclo_colaborador_inconsistentes`) que o repositório não contém e
  que **não deve ser sobrescrita**;
- rollback real em
  `supabase/rollback/20261021090000_ninebox_aprovacao_confirmada_rollback.sql`;
- `20261025090000_ninebox_aprovacao_autoria.sql` é funcionalmente idêntica à
  função de 210 (diferença apenas de whitespace); não acrescenta objeto novo.

## Evidências desta rodada

- **391 testes unitários** nos 18 arquivos de desempenho/Nine-Box.
- `node _tmp-validar-integracao-ninebox.mjs`:
  - `criacao_nao_classifica`;
  - `aprovacao_gestor`;
  - `classificacao_apos_aprovacao` (Core Player, sem validação do RH);
  - `persistencia_f5`;
  - `segundo_ciclo`;
  - `reabertura_invalida`;
  - RBAC.
- Migration executada em **PostgreSQL real via PGlite/WASM**:
  - aprovação de um feedback `tipo='par'` (sem gestor separado) → `aprovada_gestor`
    e snapshot 3/2;
  - idempotência;
  - desempenho 360° gestor 60% + par 25% = `4.411764705882353`;
  - ausência de Potencial bloqueada;
  - gestor criador aprovando a própria avaliação: permitido;
  - rollback removeu as colunas aditivas.
- `node scripts/verificar-layout-protegido.mjs`: **OK**.
- ESLint: **0 erros** nos arquivos tocados.

## Bloqueios reais (reconciliados em 2026-10-21)

1. A estrutura de `20261021090000` **já está refletida** no principal (colunas,
   constraints, `sincronizar_consolidacao_avaliacao` e `decidir_aprovacao_gestor`).
   Não reaplicar.
2. `20261025090000` é funcionalmente idêntica à versão de 210; não há objeto novo.
3. `20261022090000` está parcialmente ausente: `pode_finalizar_feedback` não existe
   e `finalizar_feedback` ainda é a versão antiga.
4. `20261020090000` continua ausente (`editar_feedback_seguro` → `PGRST202`) e o
   CHECK de operações não aceita `editar_feedback`.
5. `20261026090000` também está ausente: policies antigas de ciclo e trigger de
   dependências inexistente.
6. A reconciliação incremental `20261027090000` está preparada e testada em
   PGlite, mas **não aplicada** por falta de autorização.
7. A conta `ti@promobrindes.com.br` não está disponível nesta sessão; o fluxo
   real de aprovação/RH/F5 não foi executado no Supabase.
8. RLS/policies efetivas foram verificadas por catálogo para o escopo do Nine-Box,
   mas não houve auditoria administrativa ampla do tenant.
