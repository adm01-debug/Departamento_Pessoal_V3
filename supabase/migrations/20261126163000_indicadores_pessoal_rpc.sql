-- ============================================================================
-- Indicadores de Pessoal: expõe as MVs de dashboard ao app (RPC com guarda de
-- tenant) e liga as 4 materialized views a uma tela de verdade.
--
-- Situação encontrada antes desta migration (medida no canônico, não suposta):
--   * mv_headcount_daily, mv_turnover_rate, mv_ferias_balance e
--     mv_afastamento_summary existem, têm linhas e são refrescadas todo dia às
--     05:00 pelo cron job 71 (`refresh-dashboard-mvs-daily`);
--   * o único objeto do banco que as referenciava era a própria
--     refresh_dashboard_views() — nenhuma API as entregava;
--   * ACL das quatro = {postgres, service_role, dp_mcp_role}: sem grant para
--     anon/authenticated, logo o PostgREST devolvia permission denied e o app
--     não tinha como lê-las.
--
-- Materialized view não aceita RLS: GRANT SELECT direto a authenticated
-- exporia férias, afastamentos e nomes de TODAS as empresas. Por isso a única
-- porta de leitura é a função abaixo, SECURITY DEFINER, que valida
-- public.user_belongs_to_empresa(auth.uid(), p_empresa_id) antes de abrir
-- qualquer MV.
--
-- Aditiva: cria uma função nova e não altera tabela, coluna, policy, trigger ou
-- MV existente. O REVOKE nas MVs é defesa em profundidade (hoje já não há
-- grant para anon/authenticated).
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_indicadores_pessoal(
  p_empresa_id uuid,
  p_dias integer DEFAULT 90,
  p_meses integer DEFAULT 12
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $fn$
DECLARE
  -- Clamps: o payload não pode varrer 3 anos por um parâmetro errado da UI.
  v_dias         integer := LEAST(GREATEST(COALESCE(p_dias, 90), 7), 1095);
  v_meses        integer := LEAST(GREATEST(COALESCE(p_meses, 12), 1), 36);
  v_corte        date    := CURRENT_DATE - (v_dias - 1);
  v_primeiro_mes date    := (date_trunc('month', CURRENT_DATE) - make_interval(months => v_meses - 1))::date;
  v_result       jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Indicadores de pessoal exigem usuário autenticado'
      USING ERRCODE = '42501';
  END IF;

  IF p_empresa_id IS NULL
     OR NOT public.user_belongs_to_empresa(auth.uid(), p_empresa_id) THEN
    RAISE EXCEPTION 'Sem acesso aos indicadores da empresa %', p_empresa_id
      USING ERRCODE = '42501';
  END IF;

  v_result := jsonb_build_object(
    'periodo', jsonb_build_object(
      'dias', v_dias,
      'meses', v_meses,
      'corte', v_corte,
      'primeiro_mes', to_char(v_primeiro_mes, 'YYYY-MM')
    ),

    -- Efetivo e movimentação mês a mês, calculados no banco a partir de
    -- data_admissao/data_desligamento (o front não precisa mais estimar).
    'turnover_mensal', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'mes', to_char(t.mes, 'YYYY-MM'),
               'admissoes', t.admissoes,
               'desligamentos', t.desligamentos,
               'movimentacao', t.total_movimentacao,
               'efetivo_inicio', t.headcount_inicio,
               'efetivo_fim', t.headcount_fim,
               'turnover_pct', t.turnover_rate_pct
             ) ORDER BY t.mes)
        FROM public.mv_turnover_rate t
       WHERE t.empresa_id = p_empresa_id
         AND t.mes >= v_primeiro_mes
    ), '[]'::jsonb),

    -- Cadastros por dia, quebrados por status atual e departamento. A MV
    -- agrupa por created_at do colaborador: é movimentação de entrada, NÃO o
    -- efetivo do dia (o efetivo real está em turnover_mensal). A tela rotula
    -- assim de propósito.
    'cadastros_diarios', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'data', h.snapshot_date,
               'departamento', COALESCE(h.departamento, 'Sem departamento'),
               'status', COALESCE(h.status, 'sem status'),
               'total', h.headcount
             ) ORDER BY h.snapshot_date, h.departamento, h.status)
        FROM public.mv_headcount_daily h
       WHERE h.empresa_id = p_empresa_id
         AND h.snapshot_date >= v_corte
    ), '[]'::jsonb),

    'cadastros_por_departamento', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'departamento', d.departamento,
               'total', d.total,
               'ativos', d.ativos,
               'em_ferias', d.em_ferias,
               'afastados', d.afastados,
               'desligados', d.desligados
             ) ORDER BY d.total DESC, d.departamento)
        FROM (
          SELECT COALESCE(h.departamento, 'Sem departamento') AS departamento,
                 SUM(h.headcount)   AS total,
                 SUM(h.ativos)      AS ativos,
                 SUM(h.em_ferias)   AS em_ferias,
                 SUM(h.afastados)   AS afastados,
                 SUM(h.desligados)  AS desligados
            FROM public.mv_headcount_daily h
           WHERE h.empresa_id = p_empresa_id
             AND h.snapshot_date >= v_corte
           GROUP BY 1
        ) d
    ), '[]'::jsonb),

    -- Afastamentos por mês e tipo: volume, dias corridos e média de duração.
    'absenteismo', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'mes', to_char(a.mes, 'YYYY-MM'),
               'tipo', COALESCE(a.tipo_afastamento, 'Não informado'),
               'total', a.total_afastamentos,
               'dias_totais', a.dias_totais,
               'media_dias', ROUND(COALESCE(a.media_dias, 0)::numeric, 1),
               'em_andamento', a.em_andamento,
               'encerrados', a.encerrados
             ) ORDER BY a.mes DESC, a.total_afastamentos DESC)
        FROM public.mv_afastamento_summary a
       WHERE a.empresa_id = p_empresa_id
         AND a.mes >= v_primeiro_mes
    ), '[]'::jsonb),

    -- Saldo de férias por colaborador, direto do banco (inclui anos
    -- trabalhados e gozos nos últimos 12 meses).
    'ferias_saldo', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'colaborador_id', f.colaborador_id,
               'nome', f.colaborador_nome,
               'departamento', COALESCE(f.departamento, 'Sem departamento'),
               'admissao', f.data_admissao,
               'saldo_dias', f.saldo_dias,
               'anos_trabalhados', f.anos_trabalhados,
               'gozos_12m', f.gozos_12m
             ) ORDER BY f.saldo_dias DESC, f.colaborador_nome)
        FROM public.mv_ferias_balance f
       WHERE f.empresa_id = p_empresa_id
    ), '[]'::jsonb),

    'ferias_resumo', (
      SELECT jsonb_build_object(
               'colaboradores', COUNT(*),
               'saldo_total_dias', COALESCE(SUM(f.saldo_dias), 0),
               'saldo_medio_dias', COALESCE(ROUND(AVG(f.saldo_dias)::numeric, 1), 0),
               -- Acima de 30 dias = mais de um período aquisitivo em aberto.
               'acima_30_dias', COUNT(*) FILTER (WHERE f.saldo_dias > 30),
               'sem_gozo_12m', COUNT(*) FILTER (WHERE f.gozos_12m = 0)
             )
        FROM public.mv_ferias_balance f
       WHERE f.empresa_id = p_empresa_id
    )
  );

  -- Última execução do refresh diário (cron job 71). O schema cron não existe
  -- em todo ambiente local: quando falta, a tela mostra "sem informação" em
  -- vez de quebrar. Os guards são avaliados como expressão plpgsql, então o
  -- SQL que referencia cron.* só é planejado quando o schema existe.
  IF to_regclass('cron.job') IS NOT NULL
     AND to_regclass('cron.job_run_details') IS NOT NULL THEN
    v_result := v_result || jsonb_build_object(
      'atualizacao', COALESCE((
        SELECT jsonb_build_object(
                 'disponivel', true,
                 'agenda', j.schedule,
                 'ultima_execucao', (
                   SELECT MAX(d.start_time) FROM cron.job_run_details d WHERE d.jobid = j.jobid
                 ),
                 'ultimo_status', (
                   SELECT (ARRAY_AGG(d.status ORDER BY d.start_time DESC))[1]
                     FROM cron.job_run_details d
                    WHERE d.jobid = j.jobid
                 )
               )
          FROM cron.job j
         WHERE j.jobname = 'refresh-dashboard-mvs-daily'
      ), jsonb_build_object('disponivel', false))
    );
  ELSE
    v_result := v_result || jsonb_build_object(
      'atualizacao', jsonb_build_object('disponivel', false)
    );
  END IF;

  RETURN v_result;
END;
$fn$;

COMMENT ON FUNCTION public.get_indicadores_pessoal(uuid, integer, integer) IS
  'Indicadores de pessoal (turnover, cadastros, absenteísmo e férias) das MVs de dashboard, com guarda de tenant. Leitura exclusiva via authenticated.';

REVOKE ALL ON FUNCTION public.get_indicadores_pessoal(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_indicadores_pessoal(uuid, integer, integer) TO authenticated;

-- Defesa em profundidade: MV não aceita RLS, então ninguém além do dono e do
-- service_role fala com elas; o caminho do app é o RPC acima.
REVOKE ALL ON TABLE public.mv_headcount_daily     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.mv_turnover_rate       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.mv_ferias_balance      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.mv_afastamento_summary FROM PUBLIC, anon, authenticated;

-- A Data API mantém cache de funções; recarrega depois de criar a RPC.
notify pgrst, 'reload schema';

COMMIT;