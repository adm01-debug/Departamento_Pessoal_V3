-- ============================================================================
-- ONBOARDING — CONVERGÊNCIA DO MODELO LEGADO PARA O CANÔNICO
--
-- ADITIVA E IDEMPOTENTE. Nenhum DROP, nenhum DELETE, nenhuma mudança de schema.
-- Só COPIA (INSERT) tarefas do modelo legado para o canônico, e só quando há
-- admissão correspondente pelo mesmo CPF. As tabelas legadas ficam intactas.
--
-- ORIGEM: esta migration RESGATA a `20261005020000_onboarding_modelo_b_convergencia.sql`
-- da PR #546 ("muri", fechada sem merge). Aquela migration NUNCA rodou em lugar
-- nenhum — não está no ledger do canônico (`supabase_migrations.schema_migrations`)
-- nem tem arquivo na `main` — e nenhuma migration da `main` faz esta cópia.
--
-- POR QUE AINDA É NECESSÁRIA (contado no canônico hoje, via MCP):
--   • `onboarding_tarefas`      = 27 linhas  (modelo legado)
--   • `onboarding_colaborador`  =  6 linhas
--   • `tarefas_onboarding`      = 24 linhas  (modelo canônico)
--   • `admissoes`               =  8 linhas
--   • `tarefas_onboarding` cujo título aparece em `onboarding_tarefas` = 0
--   ⇒ As 24 canônicas são exatamente 8 admissões × 3 tarefas padrão do trigger
--     `fn_create_default_onboarding_tasks`. NENHUMA das 27 tarefas reais chegou
--     ao modelo canônico: o histórico de onboarding de 6 colaboradores, com
--     data de conclusão, existe só no legado e não aparece nas telas.
--   ⇒ As 27 têm admissão pareável por CPF (contado: 27 de 27).
--
-- MAPEAMENTO (preserva o que há, sem inventar nada):
--   onboarding_tarefas.titulo         → tarefas_onboarding.titulo
--   onboarding_tarefas.descricao      → tarefas_onboarding.descricao
--   onboarding_tarefas.created_at     → tarefas_onboarding.created_at
--   onboarding_tarefas.concluida      → tarefas_onboarding.concluida
--   onboarding_tarefas.data_conclusao → tarefas_onboarding.concluida_em
--   onboarding_tarefas.data_prazo     → prazo_dias = (data_prazo − created_at), em dias
--   responsavel_id                    → NULL
--
-- `responsavel_id` fica NULL de propósito: o modelo legado não guarda usuário
-- responsável. Ele tem `concluida_por`, que é QUEM CONCLUIU, não quem responde
-- pela tarefa — usar um no lugar do outro seria inventar dado.
--
-- O QUE NÃO TEM DESTINO NO MODELO CANÔNICO (dito aqui para não se perder):
--   `categoria`, `ordem`, `concluida_por`, `observacoes` e `template_tarefa_id`
--   não existem em `tarefas_onboarding` (9 colunas contra 15 do legado). Esta
--   migration NÃO os apaga — eles continuam em `onboarding_tarefas`, de onde
--   podem ser trazidos depois se o dono quiser as colunas no canônico. Enquanto
--   isso, o que a tela passa a mostrar é título, descrição, prazo e conclusão.
--
-- DIFERENÇA DELIBERADA EM RELAÇÃO À VERSÃO DA MURI (correção, não estilo):
--   a versão original fazia `JOIN admissoes a ON a.cpf = c.cpf` direto. Se um
--   CPF tiver MAIS DE UMA admissão (readmissão), aquele JOIN multiplica: a mesma
--   tarefa legada seria copiada para todas as admissões daquele CPF, inventando
--   histórico em admissão que não o teve. Aqui o `DISTINCT ON (c.cpf)` escolhe
--   UMA admissão por CPF — a mais recente por `data_prevista`, com `created_at`
--   e `id` como desempate determinístico. Cada tarefa legada cai em exatamente
--   uma admissão, e o sidecar assere isso.
--
-- IDEMPOTÊNCIA: a cópia só ocorre se ainda não existir, NA MESMA admissão, uma
-- tarefa com o mesmo título. Rodar duas vezes não duplica nada.
-- ============================================================================

DO $$
DECLARE
  v_copiadas integer := 0;
BEGIN
  WITH admissao_do_cpf AS (
    -- UMA admissão por CPF, a mais recente. Ver "DIFERENÇA DELIBERADA" acima.
    SELECT DISTINCT ON (a.cpf)
           a.cpf,
           a.id AS admissao_id
    FROM public.admissoes a
    WHERE a.cpf IS NOT NULL
    ORDER BY a.cpf, a.data_prevista DESC, a.created_at DESC, a.id
  )
  INSERT INTO public.tarefas_onboarding
    (admissao_id, titulo, descricao, responsavel_id, prazo_dias, concluida, concluida_em, created_at)
  SELECT
    ac.admissao_id,
    ot.titulo,
    ot.descricao,
    NULL,
    GREATEST(0, COALESCE(ot.data_prazo - ot.created_at::date, 5)),
    COALESCE(ot.concluida, false),
    ot.data_conclusao,
    ot.created_at
  FROM public.onboarding_tarefas ot
  JOIN public.onboarding_colaborador oc ON oc.id = ot.onboarding_id
  JOIN public.colaboradores c ON c.id = oc.colaborador_id
  JOIN admissao_do_cpf ac ON ac.cpf = c.cpf
  WHERE c.cpf IS NOT NULL
    AND ot.titulo IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.tarefas_onboarding t
      WHERE t.admissao_id = ac.admissao_id
        AND t.titulo = ot.titulo
    );

  GET DIAGNOSTICS v_copiadas = ROW_COUNT;
  RAISE NOTICE '[convergencia onboarding] tarefas copiadas do modelo legado: %', v_copiadas;

  -- Pós-condição: toda tarefa legada pareável por CPF tem destino no canônico.
  -- Fail-closed: se sobrou alguma sem par, a transação não passa.
  IF EXISTS (
    WITH admissao_do_cpf AS (
      SELECT DISTINCT ON (a.cpf) a.cpf, a.id AS admissao_id
      FROM public.admissoes a
      WHERE a.cpf IS NOT NULL
      ORDER BY a.cpf, a.data_prevista DESC, a.created_at DESC, a.id
    )
    SELECT 1
    FROM public.onboarding_tarefas ot
    JOIN public.onboarding_colaborador oc ON oc.id = ot.onboarding_id
    JOIN public.colaboradores c ON c.id = oc.colaborador_id
    JOIN admissao_do_cpf ac ON ac.cpf = c.cpf
    WHERE ot.titulo IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.tarefas_onboarding t
        WHERE t.admissao_id = ac.admissao_id
          AND t.titulo = ot.titulo
      )
  ) THEN
    RAISE EXCEPTION 'pos-condicao: sobrou tarefa do modelo legado sem correspondente no canonico';
  END IF;
END $$;

-- Nenhum DELETE, nenhum DROP: `onboarding_tarefas` e `onboarding_colaborador`
-- continuam intactas e completas, com as 5 colunas que o canônico não tem.
