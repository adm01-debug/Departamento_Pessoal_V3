-- ============================================================================
-- P0-011: Índices em empresa_id em 30+ tabelas de negócio
-- ----------------------------------------------------------------------------
-- Subqueries correlacionadas em policies RLS causam N+1 problem. Adicionar
-- índices em empresa_id (a coluna mais filtrada) transforma o plano de query
-- de Seq Scan para Index Scan. CREATE INDEX CONCURRENTLY não bloqueia writes.
-- ============================================================================

-- Tabelas principais de negócio (tenant-scoped)
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'colaboradores', 'empresas', 'folhas_pagamento', 'holerites', 'itens_folha',
    'batidas_ponto', 'registros_ponto', 'admissoes', 'candidaturas',
    'ferias', 'ferias_solicitacoes', 'periodos_aquisitivos',
    'provisoes_mensais', 'provisoes_folha', 'historico_calculos_folha',
    'beneficios', 'documentos', 'notificacoes', 'workflows_execucoes',
    'workflows_definicoes', 'auditoria_logs', 'ferias_audit_log',
    'esocial_eventos', 'guias_impostos', 'desligamentos', 'faltas',
    'atrasos', 'adicionais', 'gratificacoes', 'comissoes', 'pensoes',
    'emprestimos_consignados', 'jornadas', 'escalas', 'turnos',
    'dependentes', 'rubricas_folha', 'eventos_variaveis',
    'avaliacoes', 'medidas_disciplinares', 'epi', 'epis',
    'treinamentos', 'cursos', 'inscricoes_curso',
    'exames', 'aso', 'admissao_tokens'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Verifica se a tabela existe e tem coluna empresa_id antes de criar índice
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'empresa_id'
    ) THEN
      EXECUTE format(
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_%I_empresa_id ON public.%I (empresa_id)',
        t, t
      );
    END IF;
  END LOOP;
END $$;

-- Índices compostos para queries frequentes (queries mais comuns do frontend)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_colaboradores_empresa_status
  ON public.colaboradores (empresa_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_colaboradores_empresa_admissao
  ON public.colaboradores (empresa_id, data_admissao DESC NULLS LAST);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_holerites_empresa_competencia
  ON public.holerites (empresa_id, competencia DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_registros_ponto_empresa_colab_data
  ON public.registros_ponto (empresa_id, colaborador_id, data DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folhas_pagamento_empresa_competencia
  ON public.folhas_pagamento (empresa_id, competencia DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ferias_empresa_colab_status
  ON public.ferias (empresa_id, colaborador_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_desligamentos_empresa_data
  ON public.desligamentos (empresa_id, data_desligamento DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_faltas_empresa_data
  ON public.faltas (empresa_id, data DESC);

-- Comentário
COMMENT ON INDEX idx_colaboradores_empresa_status IS
  '[P0-011] Suporta listagem de colaboradores ativos por tenant (query #1 do frontend).';
COMMENT ON INDEX idx_registros_ponto_empresa_colab_data IS
  '[P0-011] Suporta espelho de ponto mensal (query #2 do frontend).';
