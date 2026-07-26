-- ============================================================
-- P4-071: Índices compostos para top-20 queries frequentes
-- Criado: 2026-07-25
-- Origem: PLANO_MELHORIAS.md P4-071
--
-- CONCURRENTLY: não bloqueia leituras durante criação.
-- IF NOT EXISTS: idempotente — pode ser re-executada sem erro.
--
-- Queries-alvo (confirmadas por análise de uso real):
--   Q1: colaboradores WHERE empresa_id=? AND status=? ORDER BY data_admissao DESC
--   Q2: folhas WHERE empresa_id=? AND competencia DESC LIMIT ?
--   Q3: ponto_registros WHERE empresa_id=? AND colaborador_id=? AND data DESC
--   Q4: holerites WHERE empresa_id=? ORDER BY competencia DESC LIMIT ?
--   Q5: ferias WHERE empresa_id=? AND status=? ORDER BY created_at DESC
-- ============================================================

BEGIN;

-- ── Colaboradores ────────────────────────────────────────────

-- Q1: listagem de ativos + ordenação por admissão
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_colaboradores_empresa_status_admissao
  ON public.colaboradores (empresa_id, status, data_admissao DESC)
  WHERE status IN ('ativo', 'ferias', 'afastado', 'admissao');

-- Busca por departamento dentro de empresa
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_colaboradores_empresa_depto_status
  ON public.colaboradores (empresa_id, departamento_id, status)
  WHERE departamento_id IS NOT NULL;

-- Lookup por CPF (autocomplete/punch-clock)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_colaboradores_empresa_cpf
  ON public.colaboradores (empresa_id, cpf)
  WHERE cpf IS NOT NULL;

-- ── Folha de Pagamento ─────────────────────────────────────

-- Q2: folha por empresa + ordenação por competência (mais comum)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folhas_empresa_competencia
  ON public.folhas (empresa_id, competencia DESC);

-- Q2b: folha por competência específica (cálculo mensal batch)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folhas_empresa_competencia_colab
  ON public.folhas (empresa_id, competencia DESC, colaborador_id)
  INCLUDE (total_bruto, total_liquido, status);

-- Provisões: cálculo mensal por empresa
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_provisoes_empresa_competencia
  ON public.provisoes_folha (empresa_id, competencia DESC)
  INCLUDE (colaborador_id, valor_provisao);

-- ── Ponto ─────────────────────────────────────────────────

-- Q3: batidas por colaborador + data (espelho de ponto)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ponto_empresa_colab_data
  ON public.registros_ponto (empresa_id, colaborador_id, data_hora DESC)
  INCLUDE (tipo_registro, just_ativa_id);

-- Batidas do dia (painel do RH)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ponto_empresa_data_tipo
  ON public.registros_ponto (empresa_id, data_hora DESC, tipo_registro)
  WHERE empresa_id IS NOT NULL;

-- ── Holerites ─────────────────────────────────────────────

-- Q4: holerites por empresa + competência (mais recente primeiro)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_holerites_empresa_competencia
  ON public.holerites (empresa_id, competencia DESC);

-- Holerites por colaborador (colaborador acessa seus próprios)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_holerites_colab_competencia
  ON public.holerites (colaborador_id, competencia DESC)
  INCLUDE (empresa_id, status);

-- ── Férias ────────────────────────────────────────────────

-- Q5: férias por empresa + status (pendentes vsGozadas)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ferias_empresa_status_created
  ON public.ferias (empresa_id, status, created_at DESC);

-- Saldo de férias por colaborador (cálculo de provisão)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ferias_colab_periodo
  ON public.ferias (colaborador_id, periodo_aquisitivo DESC)
  INCLUDE (dias_ferias, dias_vencidos_utilizados, status);

-- ── Afastamentos ───────────────────────────────────────────

-- Afastamentos ativos (IN para empresa + status)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_afastamentos_empresa_status_data
  ON public.afastamentos (empresa_id, status, data_inicio DESC)
  WHERE status IN ('ativo', 'encerrado');

-- ── eSocial ────────────────────────────────────────────────

-- Eventos pendentes (fila de envio)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_esocial_empresa_status_retry
  ON public.esocial_eventos (empresa_id, status, retry_count ASC, created_at ASC)
  WHERE status = 'pendente';

-- ── Auditoria (LGPD P3-065) ─────────────────────────────────

-- Busca por usuário + data (quem mudou o quê)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auditoria_usuario_data
  ON public.auditoria (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- Busca por tabela + registro (impacto de uma migration)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auditoria_tabela_registro
  ON public.auditoria (tabela_nome, registro_id, created_at DESC)
  WHERE tabela_nome IS NOT NULL;

-- ── Logs de sistema ─────────────────────────────────────────

-- Logs recentes (monitoramento)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_logs_sistema_data_nivel
  ON public.logs_sistema (created_at DESC, nivel)
  WHERE created_at >= NOW() - INTERVAL '30 days';

-- ── Análise: verificar uso dos índices ───────────────────────
-- EXPLAIN ANALYZE SELECT ... WHERE empresa_id = $1 AND status = 'ativo'
-- ORDER BY data_admissao DESC LIMIT 50;

-- Se "Index Scan using idx_colaboradores_empresa_status_admissao" aparecer
-- no plano → índice está sendo usado.

COMMIT;
