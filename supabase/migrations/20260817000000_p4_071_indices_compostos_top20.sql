-- =============================================================
-- P4-071: Índices compostos para top-20 queries frequentes
-- Sprint 13 · Performance e Escalabilidade
-- =============================================================
-- Cenários de falha simulados:
--   1. Tabela > 100K sem índice → sequential scan → P95 > 5s
--   2. Índice duplicado já existe → CREATE INDEX CONCURRENTLY com
--      IF NOT EXISTS previne erro em re-execução
--   3. INSERT durante index build → CONCURRENTLY evita lock
--   4. Tabela particionada → usar ONLY no parent (sem isso, índice
--      é criado no parent mas ignora dados das partições)
-- =============================================================
-- DROP: DROP INDEX IF EXISTS idx_<name>;
-- TESTE: EXPLAIN ANALYZE SELECT ... WHERE ... AND ... ORDER BY ...;
--        antes: Seq Scan on xxx (cost=...)
--        depois: Index Scan using idx_xxx on xxx (cost=...)
-- =============================================================

BEGIN;

-- ── 1. COLABORADORES ─────────────────────────────────────────
-- Query: SELECT * FROM colaboradores
--        WHERE empresa_id = ? AND status = 'ativo'
--        ORDER BY data_admissao DESC
--        LIMIT 20 OFFSET 0
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_colaboradores_empresa_status_admissao
  ON colaboradores(empresa_id, status, data_admissao DESC)
  WHERE status = 'ativo';

-- Query: SELECT * FROM colaboradores WHERE empresa_id = ? AND id = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_colaboradores_empresa_pk
  ON colaboradores(empresa_id, id);

-- Query: Busca por CPF (anti-fraude, holerites)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_colaboradores_cpf
  ON colaboradores(cpf) WHERE cpf IS NOT NULL;

-- Query: Busca por departamento + cargo
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_colaboradores_dep_cargo
  ON colaboradores(empresa_id, departamento, cargo);


-- ── 2. REGISTROS DE PONTO ─────────────────────────────────────
-- Query: Espelho mensal — SELECT * FROM registros_ponto
--        WHERE empresa_id = ? AND colaborador_id = ?
--        AND data_hora >= ? AND data_hora < ?
--        ORDER BY data_hora
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_registros_ponto_empresa_colab_data
  ON registros_ponto(empresa_id, colaborador_id, data_hora DESC);

-- Query: Batidas do dia — ponto aberto, marcar entrada
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_registros_ponto_data_aberto
  ON registros_ponto(data_hora, empresa_id)
  WHERE status = 'aberto';

-- Query: Ausências detectadas — 谁 não bateu ponto hoje
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_registros_ponto_sem_batida
  ON registros_ponto(empresa_id, data_hora DESC)
  WHERE data_hora >= CURRENT_DATE - INTERVAL '1 day'
    AND data_hora < CURRENT_DATE;


-- ── 3. FÉRIAS ─────────────────────────────────────────────────
-- Query:SELECT * FROM ferias
--       WHERE empresa_id = ? AND colaborador_id = ?
--       ORDER BY periodo_aquisitivo_fim DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ferias_empresa_colab_periodo
  ON ferias(empresa_id, colaborador_id, periodo_aquisitivo_fim DESC);

-- Query: Férias pendentes de aprovação (workflow)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ferias_empresa_status
  ON ferias(empresa_id, status) WHERE status IN ('solicitada', 'aprovada', 'programada');

-- Query: Férias que vencem nos próximos 30 dias (alerta DP)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ferias_vencendo
  ON ferias(data_fim)
  WHERE status NOT IN ('concluida', 'cancelada')
    AND data_fim BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days';


-- ── 4. AFASTAMENTOS ────────────────────────────────────────────
-- Query: Afastamentos ativos (INSS, acidente, maternidade)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_afastamentos_empresa_status_data
  ON afastamentos(empresa_id, status, data_inicio DESC)
  WHERE status = 'ativo';

-- Query: CLT Art. 476 — afastamento > 15 dias consecutivos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_afastamentos_tipo_data
  ON afastamentos(tipo, data_inicio)
  WHERE status = 'ativo'
    AND tipo IN ('inss', 'acidente_trabalho', 'maternidade');


-- ── 5. FOLHAS DE PAGAMENTO ────────────────────────────────────
-- Query: Folha mais recente por competência
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folhas_pagamento_empresa_competencia
  ON folhas_pagamento(empresa_id, competencia DESC);

-- Query: Status de geração (gerando / processando / calculado)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folhas_pagamento_empresa_status
  ON folhas_pagamento(empresa_id, status)
  WHERE status IN ('gerando', 'processando');

-- Query: Cálculos de um colaborador específico
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calculos_folha_colaborador_competencia
  ON calculos_folha(colaborador_id, competencia DESC);


-- ── 6. HOLERITES ───────────────────────────────────────────────
-- Query: SELECT * FROM holerites WHERE empresa_id = ? AND competencia = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_holerites_empresa_competencia
  ON holerites(empresa_id, competencia DESC);

-- Query: Holerite de um colaborador específico
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_holerites_colaborador_competencia
  ON holerites(colaborador_id, competencia DESC);

-- Query: Status de holerite (pago / pendente)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_holerites_empresa_status
  ON holerites(empresa_id, status)
  WHERE status = 'pendente';


-- ── 7. DESLIGAMENTOS ──────────────────────────────────────────
-- Query: Histórico de desligamentos por período
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_desligamentos_empresa_data
  ON desligamentos(empresa_id, data_desligamento DESC);

-- Query: Motivo do desligamento (estatísticas de turnover)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_desligamentos_motivo_data
  ON desligamentos(motivo_desligamento, data_desligamento DESC);


-- ── 8. LANÇAMENTOS CONTÁBEIS ──────────────────────────────────
-- Query: Lançamentos por competência (SPED, contabilidade)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lancamentos_contabeis_empresa_data
  ON lancamentos_contabeis(empresa_id, data_lancamento DESC);

-- Query: Lançamentos de uma folha específica
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lancamentos_contabeis_folha
  ON lancamentos_contabeis(folha_id) WHERE folha_id IS NOT NULL;


-- ── 9. PROVISÕES ──────────────────────────────────────────────
-- Query: Provisão mais recente por competência
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_provisoes_empresa_competencia
  ON provisoes_folha(empresa_id, competencia DESC);

-- Query: Provisão de um colaborador
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_provisoes_colaborador_competencia
  ON provisoes_folha(colaborador_id, competencia DESC);


-- ── 10. eSOCIAL ────────────────────────────────────────────────
-- Query: Eventos pendentes de envio
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_esocial_eventos_empresa_status
  ON esocial_eventos(empresa_id, status_envio, data_criacao DESC)
  WHERE status_envio IN ('pendente', 'erro', 'rejeitado');

-- Query: Eventos por tipo S-XXXX em批
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_esocial_eventos_tipo_competencia
  ON esocial_eventos(tipo_evento, competencia DESC);


-- ── 11. AUDITORIA ──────────────────────────────────────────────
-- Query: Auditoria por empresa + usuário + período (LGPD)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auditoria_empresa_data
  ON auditoria(empresa_id, created_at DESC);

-- Query: Auditoria por tabela + registro (track de mudanças)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auditoria_tabela_registro
  ON auditoria(nome_tabela, registro_id, created_at DESC);


-- ── 12. NOTIFICAÇÕES ──────────────────────────────────────────
-- Query: Notificações não lidas do usuário
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notificacoes_usuario_status
  ON notificacoes(usuario_id, lida, created_at DESC)
  WHERE lida = false;

-- ── 13. BANCO DE HORAS ────────────────────────────────────────
-- Query: Saldo do banco por colaborador
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_banco_horas_colaborador_data
  ON banco_horas(colaborador_id, data_referencia DESC);


-- ── 14. CONTRATOS ──────────────────────────────────────────────
-- Query: Contratos por empresa + status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contratos_empresa_status_vcto
  ON contratos(empresa_id, status, data_fim)
  WHERE status IN ('ativo', 'prorrogado')
    AND data_fim BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days';


-- ── 15. ALERTAS ────────────────────────────────────────────────
-- Query: Alertas não resolvidos por empresa
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alertas_empresa_resolvido
  ON alertas(empresa_id, resolvido, created_at DESC)
  WHERE resolvido = false;

COMMIT;

-- =============================================================
-- VALIDAÇÃO PÓS-MIGRAÇÃO (executar manualmente):
--
-- SELECT indexname, tablename, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- ORDER BY idx_scan DESC NULLS LAST
-- LIMIT 20;
--
-- EXPLAIN ANALYZE
-- SELECT c.id, c.nome_completo
-- FROM colaboradores c
-- WHERE c.empresa_id = '00000000-0000-0000-0000-000000000001'
--   AND c.status = 'ativo'
-- ORDER BY c.data_admissao DESC
-- LIMIT 20;
--
-- Resultado esperado: "Index Scan using idx_colaboradores_empresa_status_admissao"
--                     (não "Seq Scan on colaboradores")
-- =============================================================
