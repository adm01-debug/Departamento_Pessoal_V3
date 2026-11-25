-- 32 indices do top-20. Cinco deles so podem existir quando o prerequisito existe no
-- banco (tabela calculos_folha, alertas, colunas holerites.empresa_id, holerites.status
-- e auditoria.tabela). A migration 20260817000000 cria esses cinco sob guarda e emite
-- NOTICE quando pula; a assercao usa exatamente o mesmo criterio, em vez de esperar 32
-- indices que o banco canonico nao comporta.
WITH prerequisito AS (
  SELECT to_regclass('public.calculos_folha') IS NOT NULL AS tem_calculos_folha,
         to_regclass('public.alertas') IS NOT NULL AS tem_alertas,
         EXISTS (
           SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'holerites' AND column_name = 'empresa_id'
         ) AS tem_holerites_empresa_id,
         EXISTS (
           SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'holerites' AND column_name = 'status'
         ) AS tem_holerites_status,
         EXISTS (
           SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'auditoria' AND column_name = 'tabela'
         ) AS tem_auditoria_tabela
),
esperado AS (
  SELECT nome, TRUE AS exigido
    FROM unnest(ARRAY[
      'idx_colaboradores_empresa_status_admissao',
      'idx_colaboradores_empresa_pk',
      'idx_colaboradores_cpf',
      'idx_colaboradores_dep_cargo',
      'idx_registros_ponto_empresa_colab_data',
      'idx_registros_ponto_data_aberto',
      'idx_registros_ponto_sem_batida',
      'idx_ferias_empresa_colab_periodo',
      'idx_ferias_empresa_status',
      'idx_ferias_vencendo',
      'idx_afastamentos_empresa_status_data',
      'idx_afastamentos_tipo_data',
      'idx_folhas_pagamento_empresa_competencia',
      'idx_folhas_pagamento_empresa_status',
      'idx_holerites_colaborador_competencia',
      'idx_desligamentos_empresa_data',
      'idx_desligamentos_motivo_data',
      'idx_lancamentos_contabeis_empresa_data',
      'idx_lancamentos_contabeis_folha',
      'idx_provisoes_empresa_competencia',
      'idx_provisoes_colaborador_competencia',
      'idx_esocial_eventos_empresa_status',
      'idx_esocial_eventos_tipo_competencia',
      'idx_auditoria_empresa_data',
      'idx_notificacoes_usuario_status',
      'idx_banco_horas_colaborador_data',
      'idx_contratos_empresa_status_vcto'
    ]) AS t(nome)
  UNION ALL
  SELECT 'idx_calculos_folha_colaborador_competencia', p.tem_calculos_folha FROM prerequisito p
  UNION ALL
  SELECT 'idx_holerites_empresa_competencia', p.tem_holerites_empresa_id FROM prerequisito p
  UNION ALL
  SELECT 'idx_holerites_empresa_status', p.tem_holerites_status FROM prerequisito p
  UNION ALL
  SELECT 'idx_auditoria_tabela_registro', p.tem_auditoria_tabela FROM prerequisito p
  UNION ALL
  SELECT 'idx_alertas_empresa_resolvido', p.tem_alertas FROM prerequisito p
)
SELECT CASE
  WHEN EXISTS (
         SELECT 1 FROM esperado e
          WHERE e.exigido AND to_regclass('public.' || e.nome) IS NULL
       )
    THEN 'FALHOU: indice composto do top-20 ausente'
  ELSE 'ok'
END;
