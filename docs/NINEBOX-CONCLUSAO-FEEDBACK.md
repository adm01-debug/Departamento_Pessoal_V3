# Conclusão de feedback — correção definitiva (2026-10-20)

> **Atualização:** concluir é apenas preparação. A classificação oficial exige a
> decisão `aprovado` do gestor; consulte a regra fail-closed em
> `docs/NINEBOX-OPERACAO-DEFINITIVA.md`.

## Causa comprovada

`acoesDisponiveis` exigia `responsavel === true` para **qualquer** `concluir`.
`responsavel` é a prova de `supervisor_id` usada pela **aprovação** consolidada.
Por isso:

- **Beatriz** (Gestor, supervisor ausente) → `responsavel=false` → botão oculto;
- **Carlos** (Par, supervisor = conta) → `responsavel=true` → botão visível.

O tipo do feedback não era a causa; a atribuição de supervisor estava sendo
usada como pré-requisito indevido da conclusão.

## Regra implementada

A conclusão é separada da aprovação:

- **RH/admin** (`pode_gerir_avaliacoes`);
- **avaliador designado** (`feedbacks_360.avaliador_id` → `colaboradores.user_id`);
- **gestor responsável** (`supervisor_id`) ou exceção confirmada pelo servidor.

`tipo` não concede permissão. Ausência de `supervisor_id` não bloqueia o
avaliador designado. A aprovação/devolução consolidada continua exclusiva do
gestor autorizado em `decidir_aprovacao_gestor`.

## Arquivos

- `src/components/avaliacao/acoesFeedback.ts`
  - `ehAvaliadorDesignado`, `podeConcluirFeedback`;
  - `acoesDisponiveis` recebe `autorizadoConcluir`;
  - perfis efetivos não dependem mais de `responsavel` para manter `gestor`.
- `src/components/avaliacao/statusFeedback.ts`
  - conclusão oferecida a `gestor`, `admin_rh` e `avaliador`; a prova concreta
    fica em `autorizadoConcluir`.
- `src/components/avaliacao/FeedbackAcoesRodape.tsx`
  - calcula a autorização pelo avaliador designado/vínculo/RH/admin;
  - carrega vínculos também para contas `user`, necessárias à prova.
- `src/components/avaliacao/feedbackCanonico.ts`
  - `getFeedbackActions`/`normalizarFeedback` aceitam `autorizadoConcluir`.
- `src/components/avaliacao/FeedbacksTab.tsx`
  - lista e fila passam a autorização calculada por registro.
- `src/components/avaliacao/aprovacaoGestor.ts` / `PendenciasAprovacao.tsx`
  - a pendência carrega `autorizadoConcluir`, sem alterar a aprovação.
- `supabase/migrations/20261022090000_ninebox_conclusao_feedback_autorizada.sql`
  - **aditiva e não executada**: helper `pode_finalizar_feedback` e redefinição
    de `finalizar_feedback` para RH/admin, avaliador designado ou gestor
    responsável/exceção.
- `supabase/rollback/20261022090000_ninebox_conclusao_feedback_autorizada_rollback.sql`.

## Testes executados

- **457 testes** nos arquivos de desempenho/Nine-Box (20 arquivos).
- Casos explícitos:
  - Beatriz: gestor avaliador sem supervisor → Concluir habilitado;
  - Carlos: gestor responsável por feedback Par → Concluir habilitado;
  - gestor sem designação/vínculo → Concluir oculto;
  - admin+gestor avaliador → Concluir habilitado;
  - usuário `user` designado → Concluir; sem designação → oculto;
  - conclusão real chama `finalizarFeedback`/RPC;
  - conclusão demonstrativa chama o serviço local e não a RPC real;
  - aprovação continua separada.
- PostgreSQL real (PGlite/WASM):
  - avaliador designado, RH/admin e gestor responsável autorizados;
  - usuário sem vínculo bloqueado;
  - `finalizar_feedback` gravou `concluido` e auditoria;
  - rollback removeu o helper.
- `node scripts/verificar-layout-protegido.mjs`: OK.
- ESLint: 0 erros.

## Bloqueios (reconciliados em 2026-10-21)

1. A `20261022090000` está **parcialmente ausente** no principal:
   `pode_finalizar_feedback` não existe e `finalizar_feedback` ainda é a versão
   antiga. A reconciliação `20261027090000` cria/substitui somente esses objetos.
2. A conta real do caso (Beatriz/Carlos) não estava disponível nesta sessão;
   a reprodução foi feita com os mesmos campos e regras em testes.
3. As policies do escopo Nine-Box foram conferidas por catálogo; a PGlite valida
   a lógica da migration, não o tenant inteiro.
