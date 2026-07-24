
DO $$
DECLARE
  r TEXT;
BEGIN
  FOR r IN SELECT unnest(ARRAY[
    'CREATE INDEX IF NOT EXISTS idx_holerites_folha_colab_covering ON public.holerites (folha_id, colaborador_id) INCLUDE (liquido, total_proventos, total_descontos, assinado)',
    'CREATE INDEX IF NOT EXISTS idx_holerites_assinado_partial ON public.holerites (folha_id) WHERE assinado = false',
    'CREATE INDEX IF NOT EXISTS idx_folha_itens_folha_colab_covering ON public.folha_itens (folha_id, colaborador_id) INCLUDE (total_liquido, total_proventos, total_descontos)',
    'CREATE INDEX IF NOT EXISTS idx_batidas_colab_data_desc ON public.batidas_ponto (colaborador_id, data DESC, hora DESC) INCLUDE (tipo, origem, dentro_raio)',
    'CREATE INDEX IF NOT EXISTS idx_batidas_anomalia_partial ON public.batidas_ponto (empresa_id, data DESC) WHERE anomalia_detectada = true',
    'CREATE INDEX IF NOT EXISTS idx_registros_ponto_colab_aprovado ON public.registros_ponto (colaborador_id, data) WHERE aprovado = true',
    'CREATE INDEX IF NOT EXISTS idx_solic_ajuste_pendente ON public.solicitacoes_ajuste_ponto (empresa_id, created_at DESC) WHERE status = ''pendente''',
    'CREATE INDEX IF NOT EXISTS idx_colaboradores_empresa_status ON public.colaboradores (empresa_id, nome_completo) WHERE status = ''ativo'''
  ]) LOOP
    BEGIN
      EXECUTE r;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END LOOP;
END $$;

ANALYZE public.holerites;
ANALYZE public.folha_itens;
ANALYZE public.batidas_ponto;
ANALYZE public.registros_ponto;
ANALYZE public.colaboradores;
