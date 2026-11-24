-- ============================================================
-- P4-071: Índices compostos para top-20 queries frequentes
-- Criado: 2026-07-25  |  Corrigido: 2026-07-25 (auditoria exaustiva)
-- Origem: PLANO_MELHORIAS.md P4-071
--
-- AUDITORIA DE COLUNAS (2026-07-25):
--   folhas              → sem empresa_id (via colaborador); competencia=mes_referencia; total_liquido=liquido
--   folhas_pagamento    → SEM empresa_id (tabela consolidada sem FK direta)
--                        competencia=EXISTS, total_proventos=total_bruto, total_liquido=EXISTS
--   pontos              → SEM empresa_id (via colaborador JOIN)
--                        data_hora = "data" (DATE); tipo = "status"
--                        just_ativa_id = NÃO EXISTE nessa tabela
--   holerites           → SEM empresa_id; SEM competencia (tem folha_id → folha → competencia)
--   provisoes_folha     → empresa_id=EXISTS; competencia=EXISTS; valor_ferias=EXISTS; valor_13_salario=EXISTS
--   esocial_eventos     → empresa_id=EXISTS; status=EXISTS; retry_count = NÃO EXISTE ❌
--
-- CONCURRENTLY: não bloqueia leituras durante criação.
-- IF NOT EXISTS: idempotente — pode ser re-executada sem erro.
-- ============================================================

BEGIN;

-- ── Colaboradores ────────────────────────────────────────────
-- Q1: listagem de ativos + ordenação por admissão
-- Tabela: colaboradores — empresa_id EXISTS, status EXISTS, data_admissao EXISTS
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_colaboradores_empresa_status_admissao
  ON public.colaboradores (empresa_id, status, data_admissao DESC)
  WHERE status IN ('ativo', 'ferias', 'afastado', 'admissao');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_colaboradores_empresa_depto_status
  ON public.colaboradores (empresa_id, departamento_id, status)
  WHERE departamento_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_colaboradores_empresa_cpf
  ON public.colaboradores (empresa_id, cpf)
  WHERE cpf IS NOT NULL;

-- ── Férias ──────────────────────────────────────────────────
-- Tabela: ferias — empresa_id EXISTS, status EXISTS, created_at EXISTS
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ferias_empresa_status_created
  ON public.ferias (empresa_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ferias_colab_periodo
  ON public.ferias (colaborador_id, periodo_aquisitivo_fim DESC)
  INCLUDE (dias_gozo, dias_abono, dias_vendidos, status);

-- ── Afastamentos ─────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_afastamentos_empresa_status_data
  ON public.afastamentos (empresa_id, status, data_inicio DESC)
  WHERE status IN ('ativo', 'encerrado');

-- ── Folha por colaborador ────────────────────────────────────
-- Tabela: folhas — empresa_id via colaborador JOIN; mes_referencia=competencia; liquido=total_liquido
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folhas_colab_mes
  ON public.folhas (colaborador_id, mes_referencia DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folhas_colab_mes_liquido
  ON public.folhas (colaborador_id, mes_referencia DESC)
  INCLUDE (liquido, status);

-- ── Folha de Pagamento Consolidada ──────────────────────────
-- Tabela: folhas_pagamento — SEM empresa_id (tabela sem FK direta)
-- Competência: texto YYYY-MM; ordenação DESC funciona lexicograficamente
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folhas_pagamento_competencia
  ON public.folhas_pagamento (competencia DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folhas_pagamento_status
  ON public.folhas_pagamento (status, competencia DESC);

-- Covering index: busca por competência + status com valores incluídos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folhas_pagamento_competencia_status_covered
  ON public.folhas_pagamento (competencia DESC, status)
  INCLUDE (total_proventos, total_descontos, total_liquido, total_colaboradores);

-- ── Provisões de Folha ─────────────────────────────────────
-- Tabela: provisoes_folha — empresa_id EXISTS, competencia EXISTS, valor_ferias EXISTS
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_provisoes_empresa_competencia
  ON public.provisoes_folha (empresa_id, competencia DESC)
  INCLUDE (colaborador_id, valor_ferias, valor_13_salario);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_provisoes_colab_competencia
  ON public.provisoes_folha (colaborador_id, competencia DESC)
  INCLUDE (valor_ferias, valor_13_salario);

-- ── Ponto ────────────────────────────────────────────────────
-- Tabela: pontos — SEM empresa_id (via colaborador JOIN)
-- Colunas reais: data (DATE), status (tipo_registro)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pontos_colab_data
  ON public.pontos (colaborador_id, data DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pontos_colab_data_status
  ON public.pontos (colaborador_id, data DESC, status)
  WHERE status IN ('normal', 'hora_extra', 'atraso', 'justificado');

-- ── Holerites ────────────────────────────────────────────────
-- Tabela: holerites — SEM empresa_id (via folha_id → folhas_pagamento)
-- Access path mais direto: por folha (competência)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_holerites_folha
  ON public.holerites (folha_id, colaborador_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_holerites_colab_created
  ON public.holerites (colaborador_id, created_at DESC)
  INCLUDE (folha_id, liquido);

-- ── eSocial ─────────────────────────────────────────────────
-- Tabela: esocial_eventos — empresa_id EXISTS, status EXISTS
-- retry_count NÃO EXISTE — ordenação por created_at apenas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_esocial_empresa_status
  ON public.esocial_eventos (empresa_id, status, created_at DESC)
  WHERE status = 'pendente';

-- Eventos por empresa ordenados por data (identificar mais antigos pendentes)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_esocial_empresa_created
  ON public.esocial_eventos (empresa_id, created_at ASC)
  WHERE status = 'pendente';

-- ── Auditoria (LGPD P3-065) ──────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auditoria_usuario_data
  ON public.auditoria (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auditoria_tabela_registro
  ON public.auditoria (tabela_nome, registro_id, created_at DESC)
  WHERE tabela_nome IS NOT NULL;

-- ── Logs de sistema ──────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_logs_sistema_data_nivel
  ON public.logs_sistema (created_at DESC, nivel)
  WHERE created_at >= NOW() - INTERVAL '30 days';

-- ── Query planos para validação em staging ────────────────────
--
-- SELECT f.id, f.mes_referencia, f.liquido
-- FROM folhas f
-- JOIN colaboradores c ON c.id = f.colaborador_id
-- WHERE c.empresa_id = $1
-- ORDER BY f.mes_referencia DESC LIMIT 50;
-- → Deve usar idx_folhas_colab_mes
--
-- SELECT p.* FROM pontos p
-- WHERE p.colaborador_id = $1 ORDER BY p.data DESC LIMIT 50;
-- → Deve usar idx_pontos_colab_data
--
-- SELECT h.* FROM holerites h
-- JOIN folhas_pagamento fp ON fp.id = h.folha_id
-- WHERE fp.competencia = '2026-06' ORDER BY h.created_at DESC LIMIT 50;
-- → Deve usar idx_holerites_folha

COMMIT;
