-- ============================================================================
-- ONBOARDING — CONVERGÊNCIA DO MODELO B PARA O MODELO CANÔNICO (FASE 9.4)
--
-- ADITIVA E IDEMPOTENTE. NÃO faz DROP, NÃO faz DELETE, NÃO altera schema.
-- Só COPIA (INSERT) tarefas do modelo legado para o modelo canônico, e só
-- quando existe admissão correspondente pelo MESMO CPF.
--
-- POR QUE EXISTE (conferência de dados, resultado):
--   • `public.onboarding_colaborador` / `public.onboarding_tarefas` TÊM dados
--     reais — ver `supabase/migrations/20260730000000_seed_admissao_onboarding_*`
--     (6 registros de onboarding e 26 tarefas por colaborador, com datas de
--     conclusão e categorias que NÃO existem no modelo canônico);
--   • o modelo canônico (`admissoes` + `tarefas_onboarding`) recebe apenas as 3
--     tarefas padrão criadas pelo trigger `tr_create_onboarding_tasks`.
--   ⇒ Logo há DADOS EXCLUSIVOS no modelo B. Nada pode ser apagado; o caminho é
--     convergir (copiar) e só depois aposentar os leitores.
--
-- MAPEAMENTO (preserva o histórico, sem inventar):
--   onboarding_tarefas.titulo        → tarefas_onboarding.titulo
--   onboarding_tarefas.descricao     → tarefas_onboarding.descricao
--   onboarding_tarefas.created_at    → tarefas_onboarding.created_at
--   onboarding_tarefas.concluida     → tarefas_onboarding.concluida
--   onboarding_tarefas.data_conclusao→ tarefas_onboarding.concluida_em
--   onboarding_tarefas.data_prazo    → prazo_dias = (data_prazo − created_at) em dias
--   responsavel_id                   → NULL (o modelo B não guarda usuário; usa
--                                      `responsavel_tipo` no template — não há de
--                                      onde tirar um UUID sem inventar)
--
-- IDEMPOTÊNCIA: a cópia só acontece se ainda NÃO existir, na MESMA admissão, uma
-- tarefa com o mesmo título. Rodar duas vezes não duplica nada.
--
-- ORDEM DE EXECUÇÃO RECOMENDADA (com autorização explícita):
--   1. rodar a CONFERÊNCIA (docs/ONBOARDING_MODELO_B_DEPRECATED.md);
--   2. rodar ESTA migration;
--   3. revalidar registro por registro (o mesmo doc traz a consulta);
--   4. só então remover o fallback de leitura do modelo B no frontend.
-- ============================================================================

DO $$
DECLARE
  migradas INTEGER := 0;
BEGIN
  -- `admissoes` não tem `colaborador_id`: o vínculo é o CPF (chave natural).
  INSERT INTO public.tarefas_onboarding
    (admissao_id, titulo, descricao, responsavel_id, prazo_dias, concluida, concluida_em, created_at)
  SELECT
    a.id,
    ot.titulo,
    ot.descricao,
    NULL,
    GREATEST(0, COALESCE((ot.data_prazo::date - COALESCE(ot.created_at::date, ot.data_prazo::date)), 5)),
    COALESCE(ot.concluida, false),
    ot.data_conclusao::timestamptz,
    COALESCE(ot.created_at, now())
  FROM public.onboarding_tarefas ot
  JOIN public.onboarding_colaborador oc ON oc.id = ot.onboarding_id
  JOIN public.colaboradores c ON c.id = oc.colaborador_id
  JOIN public.admissoes a ON a.cpf = c.cpf
  WHERE c.cpf IS NOT NULL
    AND ot.titulo IS NOT NULL
    -- IDEMPOTÊNCIA: nada de duplicar tarefa que já exista na admissão.
    AND NOT EXISTS (
      SELECT 1 FROM public.tarefas_onboarding t
      WHERE t.admissao_id = a.id
        AND t.titulo = ot.titulo
    );

  GET DIAGNOSTICS migradas = ROW_COUNT;
  RAISE NOTICE '[convergencia onboarding] tarefas copiadas do modelo B: %', migradas;
END $$;

-- Nenhum DELETE, nenhum DROP: as tabelas legadas continuam intactas e completas.
