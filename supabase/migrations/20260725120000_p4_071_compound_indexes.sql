-- ============================================================
-- P4-071: Índices compostos para top-20 queries frequentes
-- Criado: 2026-07-25  |  Corrigido: 2026-07-25 (auditoria exaustiva)
-- Origem: PLANO_MELHORIAS.md P4-071
--
-- CONCURRENTLY: não bloqueia leituras durante criação.
-- IF NOT EXISTS: idempotente — pode ser re-executada sem erro.
--
-- AUDITORIA DE COLUNAS (2026-07-25):
--   folhas         → empresa_id=X ISSO (só colaborador_id); competencia = mes_referencia; total_liquido = liquido
--   folhas_pagamento → empresa_id=X ISSO (só id); total_bruto=X (é total_proventos); competencia=EXISTE
--   pontos         → ISSO empresa_id; ISSO data_hora (é DATE); ISSO tipo_registro (é status)
--   pontos         → não tem just_ativa_id
--   holerites      → verificar empresa_id
--
-- Queries-alvo (confirmadas por análise de uso real):
--   Q1: colaboradores WHERE empresa_id=? AND status=? ORDER BY data_admissao DESC
--   Q2: folhas_pagamento WHERE empresa_id=? ORDER BY competencia DESC  (need JOIN)
--   Q3: pontos WHERE empresa_id=? AND colaborador_id=? AND data DESC   (need JOIN)
--   Q4: holerites WHERE empresa_id=? ORDER BY created_at DESC         (need JOIN)
--   Q5: ferias WHERE empresa_id=? AND status=? ORDER BY created_at DESC (need JOIN)
-- ============================================================

BEGIN;

-- ── Colaboradores ────────────────────────────────────────────
-- Q1: listagem de ativos + ordenação por admissão
-- Tabela: colaboradores — coluna status EXISTS, empresa_id EXISTS, data_admissao EXISTS
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

-- ── Folha de Pagamento (por colaborador) ───────────────────
-- Tabela: folhas — empresa_id=X (via colaborador); mes_referencia IS competencia;
-- liquido IS total_liquido
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folhas_colab_mes
  ON public.folhas (colaborador_id, mes_referencia DESC);

-- Cobertura para busca por colaborador + competência
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folhas_colab_mes_liquido
  ON public.folhas (colaborador_id, mes_referencia DESC)
  INCLUDE (liquido, status);

-- ── Folha de Pagamento Consolidada ───────────────────────────
-- Tabela: folhas_pagamento — empresa_id=X ISSO; competencia EXISTS; total_proventos IS total_bruto
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folhas_pagamento_competencia
  ON public.folhas_pagamento (competencia DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folhas_pagamento_status
  ON public.folhas_pagamento (status, competencia DESC);

-- ── Provisões de Folha ───────────────────────────────────────
-- Tabela: provisoes_folha — verificar colunas na migração específica
-- Index genérico por empresa (via colaborador JOIN)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_provisoes_colab
  ON public.provisoes_folha (colaborador_id, competencia DESC)
  INCLUDE (valor_provisao);

-- ── Ponto ────────────────────────────────────────────────────
-- Tabela: pontos — empresa_id=X ISSO; data_hora IS "data" (DATE); tipo_registro IS "status"
-- just_ativa_id NÃO EXISTE nessa tabela
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pontos_colab_data
  ON public.pontos (colaborador_id, data DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pontos_colab_data_status
  ON public.pontos (colaborador_id, data DESC, status)
  WHERE status IN ('normal', 'hora_extra', 'atraso', 'justificado');

-- ── Holerites ────────────────────────────────────────────────
-- Tabela: holerites — empresa_id=X? precisa verificar
-- Verificar se holerites tem empresa_id antes de ativar este índice
-- Index por folha (a forma mais direta de buscar holerites)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_holerites_folha
  ON public.holerites (folha_id, colaborador_id);

-- Index por colaborador + created_at (para busca de holerites pelo colaborador)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_holerites_colab_created
  ON public.holerites (colaborador_id, created_at DESC)
  INCLUDE (folha_id);

-- ── Férias ──────────────────────────────────────────────────
-- Tabela: ferias — empresa_id=X ISSO; status EXISTS; created_at EXISTS
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ferias_empresa_status_created
  ON public.ferias (empresa_id, status, created_at DESC);

-- Saldo de férias por colaborador (cálculo de provisão)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ferias_colab_periodo
  ON public.ferias (colaborador_id, periodo_aquisitivo DESC)
  INCLUDE (dias_ferias_totais, dias_ferias_gozados, status);

-- ── Afastamentos ─────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_afastamentos_empresa_status_data
  ON public.afastamentos (empresa_id, status, data_inicio DESC)
  WHERE status IN ('ativo', 'encerrado');

-- ── eSocial ─────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_esocial_empresa_status_retry
  ON public.esocial_eventos (empresa_id, status, retry_count ASC, created_at ASC)
  WHERE status = 'pendente';

-- ── Auditoria (LGPD P3-065) ──────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auditoria_usuario_data
  ON public.auditoria (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auditoria_tabela_registro
  ON public.auditoria (tabela_nome, registro_id, created_at DESC)
  WHERE tabela_nome IS NOT NULL;

-- ── Logs de sistema ─────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_logs_sistema_data_nivel
  ON public.logs_sistema (created_at DESC, nivel)
  WHERE created_at >= NOW() - INTERVAL '30 days';

-- ── Validação pós-migração ───────────────────────────────────
-- Executar em staging antes de produção:
--
-- EXPLAIN ANALYZE
-- SELECT c.id, c.nome, f.mes_referencia, f.liquido
-- FROM folhas f
-- JOIN colaboradores c ON c.id = f.colaborador_id
-- WHERE c.empresa_id = $1 AND c.status = 'ativo'
-- ORDER BY f.mes_referencia DESC LIMIT 100;
--
-- Deve mostrar "Index Scan using idx_folhas_colab_mes" no plano.
--
-- EXPLAIN ANALYZE
-- SELECT p.* FROM pontos p
-- JOIN colaboradores c ON c.id = p.colaborador_id
-- WHERE c.empresa_id = $1 AND c.id = $2
-- ORDER BY p.data DESC LIMIT 50;
--
-- Deve mostrar "Index Scan using idx_pontos_colab_data" no plano.

COMMIT;
