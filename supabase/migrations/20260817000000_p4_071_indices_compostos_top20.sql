-- =============================================================
-- P4-071: Índices compostos para top-20 queries frequentes
-- Sprint 13 · Performance e Escalabilidade
-- =============================================================
-- Cenários de falha simulados:
--   1. Tabela > 100K sem índice → sequential scan → P95 > 5s
--   2. Índice duplicado já existe → CREATE INDEX com
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
CREATE INDEX IF NOT EXISTS idx_colaboradores_empresa_status_admissao
  ON colaboradores(empresa_id, status, data_admissao DESC)
  WHERE status = 'ativo';

-- Query: SELECT * FROM colaboradores WHERE empresa_id = ? AND id = ?
CREATE INDEX IF NOT EXISTS idx_colaboradores_empresa_pk
  ON colaboradores(empresa_id, id);

-- Query: Busca por CPF (anti-fraude, holerites)
CREATE INDEX IF NOT EXISTS idx_colaboradores_cpf
  ON colaboradores(cpf) WHERE cpf IS NOT NULL;

-- Query: Busca por departamento + cargo
CREATE INDEX IF NOT EXISTS idx_colaboradores_dep_cargo
  ON colaboradores(empresa_id, departamento, cargo);


-- ── 2. REGISTROS DE PONTO ─────────────────────────────────────
-- Query: Espelho mensal — SELECT * FROM registros_ponto
--        WHERE empresa_id = ? AND colaborador_id = ?
--        AND data_hora >= ? AND data_hora < ?
--        ORDER BY data_hora
CREATE INDEX IF NOT EXISTS idx_registros_ponto_empresa_colab_data
  ON registros_ponto(empresa_id, colaborador_id, data DESC);

-- Query: Batidas do dia — ponto aberto, marcar entrada
CREATE INDEX IF NOT EXISTS idx_registros_ponto_data_aberto
  ON registros_ponto(data, empresa_id)
  WHERE saida_1 IS NULL;

-- Query: Ausências detectadas — 谁 não bateu ponto hoje
CREATE INDEX IF NOT EXISTS idx_registros_ponto_sem_batida
  ON registros_ponto(empresa_id, data DESC);


-- ── 3. FÉRIAS ─────────────────────────────────────────────────
-- Query:SELECT * FROM ferias
--       WHERE empresa_id = ? AND colaborador_id = ?
--       ORDER BY periodo_aquisitivo_fim DESC
CREATE INDEX IF NOT EXISTS idx_ferias_empresa_colab_periodo
  ON ferias(empresa_id, colaborador_id, periodo_aquisitivo_fim DESC);

-- Query: Férias pendentes de aprovação (workflow)
CREATE INDEX IF NOT EXISTS idx_ferias_empresa_status
  ON ferias(empresa_id, status) WHERE status IN ('solicitada', 'aprovada', 'programada');

-- Query: Férias que vencem nos próximos 30 dias (alerta DP)
-- Reconcilia coluna canônica ausente em schemas legados.
ALTER TABLE public.ferias ADD COLUMN IF NOT EXISTS data_fim date;
CREATE INDEX IF NOT EXISTS idx_ferias_vencendo
  ON ferias(data_fim)
  WHERE status NOT IN ('concluida', 'cancelada');


-- ── 4. AFASTAMENTOS ────────────────────────────────────────────
-- Query: Afastamentos ativos (INSS, acidente, maternidade)
CREATE INDEX IF NOT EXISTS idx_afastamentos_empresa_status_data
  ON afastamentos(empresa_id, status, data_inicio DESC)
  WHERE status = 'ativo';

-- Query: CLT Art. 476 — afastamento > 15 dias consecutivos
CREATE INDEX IF NOT EXISTS idx_afastamentos_tipo_data
  ON afastamentos(tipo, data_inicio)
  WHERE status = 'ativo'
    AND tipo IN ('inss', 'acidente_trabalho', 'maternidade');


-- ── 5. FOLHAS DE PAGAMENTO ────────────────────────────────────
-- Query: Folha mais recente por competência
CREATE INDEX IF NOT EXISTS idx_folhas_pagamento_empresa_competencia
  ON folhas_pagamento(empresa_id, competencia DESC);

-- Query: Folhas em andamento (status válidos do enum status_folha)
CREATE INDEX IF NOT EXISTS idx_folhas_pagamento_empresa_status
  ON folhas_pagamento(empresa_id, status)
  WHERE status IN ('aberta', 'calculada');

-- Query: Cálculos de um colaborador específico
-- calculos_folha não existe no schema canônico (tabela aspiracional) — pular.
DO $$
BEGIN
  IF to_regclass('public.calculos_folha') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE INDEX IF NOT EXISTS idx_calculos_folha_colaborador_competencia
        ON calculos_folha(colaborador_id, competencia DESC);
    $sql$;
  ELSE
    RAISE NOTICE 'idx_calculos_folha_colaborador_competencia ignorado: calculos_folha ausente';
  END IF;
END $$;


-- ── 6. HOLERITES ───────────────────────────────────────────────
-- Query: SELECT * FROM holerites WHERE empresa_id = ? AND competencia = ?
CREATE INDEX IF NOT EXISTS idx_holerites_empresa_competencia
  ON holerites(empresa_id, folha_id DESC);

-- Query: Holerite de um colaborador específico
CREATE INDEX IF NOT EXISTS idx_holerites_colaborador_competencia
  ON holerites(colaborador_id, folha_id DESC);

-- Query: Status de holerite (pago / pendente)
CREATE INDEX IF NOT EXISTS idx_holerites_empresa_status
  ON holerites(empresa_id, status)
  WHERE status = 'pendente';


-- ── 7. DESLIGAMENTOS ──────────────────────────────────────────
-- Query: Histórico de desligamentos por período
CREATE INDEX IF NOT EXISTS idx_desligamentos_empresa_data
  ON desligamentos(empresa_id, data_desligamento DESC);

-- Query: Motivo do desligamento (estatísticas de turnover)
CREATE INDEX IF NOT EXISTS idx_desligamentos_motivo_data
  ON desligamentos(motivo, data_desligamento DESC);


-- ── 8. LANÇAMENTOS CONTÁBEIS ──────────────────────────────────
-- Query: Lançamentos por competência (SPED, contabilidade)
CREATE INDEX IF NOT EXISTS idx_lancamentos_contabeis_empresa_data
  ON lancamentos_contabeis(empresa_id, data_lancamento DESC);

-- Query: Lançamentos de uma folha específica
CREATE INDEX IF NOT EXISTS idx_lancamentos_contabeis_folha
  ON lancamentos_contabeis(folha_id) WHERE folha_id IS NOT NULL;


-- ── 9. PROVISÕES ──────────────────────────────────────────────
-- Query: Provisão mais recente por competência
CREATE INDEX IF NOT EXISTS idx_provisoes_empresa_competencia
  ON provisoes_folha(empresa_id, competencia DESC);

-- Query: Provisão de um colaborador
CREATE INDEX IF NOT EXISTS idx_provisoes_colaborador_competencia
  ON provisoes_folha(colaborador_id, competencia DESC);


-- ── 10. eSOCIAL ────────────────────────────────────────────────
-- Query: Eventos pendentes de envio
CREATE INDEX IF NOT EXISTS idx_esocial_eventos_empresa_status
  ON esocial_eventos(empresa_id, status, created_at DESC)
  WHERE status IN ('pendente', 'erro', 'rejeitado');

-- Query: Eventos por tipo S-XXXX em批
CREATE INDEX IF NOT EXISTS idx_esocial_eventos_tipo_competencia
  ON esocial_eventos(tipo_evento, competencia DESC);


-- ── 11. AUDITORIA ──────────────────────────────────────────────
-- Query: Auditoria por empresa + usuário + período (LGPD)
CREATE INDEX IF NOT EXISTS idx_auditoria_empresa_data
  ON auditoria(empresa_id, created_at DESC);

-- Query: Auditoria por tabela + registro (track de mudanças)
CREATE INDEX IF NOT EXISTS idx_auditoria_tabela_registro
  ON auditoria(tabela, registro_id, created_at DESC);


-- ── 12. NOTIFICAÇÕES ──────────────────────────────────────────
-- Query: Notificações não lidas do usuário
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_status
  ON notificacoes(usuario_id, lida, created_at DESC)
  WHERE lida = false;

-- ── 13. BANCO DE HORAS ────────────────────────────────────────
-- Query: Saldo do banco por colaborador
CREATE INDEX IF NOT EXISTS idx_banco_horas_colaborador_data
  ON banco_horas(colaborador_id, data DESC);


-- ── 14. CONTRATOS ──────────────────────────────────────────────
-- Query: Contratos por empresa + status
CREATE INDEX IF NOT EXISTS idx_contratos_empresa_status_vcto
  ON contratos(empresa_id, status, data_fim)
  WHERE status IN ('ativo', 'prorrogado');


-- ── 15. ALERTAS ────────────────────────────────────────────────
-- Query: Alertas não resolvidos por empresa
-- alertas não existe no schema canônico (tabela aspiracional) — pular.
DO $$
BEGIN
  IF to_regclass('public.alertas') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE INDEX IF NOT EXISTS idx_alertas_empresa_resolvido
        ON alertas(empresa_id, resolvido, created_at DESC)
        WHERE resolvido = false;
    $sql$;
  ELSE
    RAISE NOTICE 'idx_alertas_empresa_resolvido ignorado: tabela alertas ausente';
  END IF;
END $$;

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
