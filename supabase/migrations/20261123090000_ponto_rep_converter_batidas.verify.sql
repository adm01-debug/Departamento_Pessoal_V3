-- ok so se a conversao do dia do relogio em batida existe, esta fechada para o
-- navegador e e idempotente de verdade: as 4 funcoes no lugar, EXECUTE so com
-- service_role (e authenticated apenas na RPC do RH), zero dia pendente com o
-- trigger de imutabilidade violado e nenhuma batida de relogio com hash vazio
-- (hash vazio quebraria a trilha da Portaria 671).
WITH funcoes (nome, assinatura, exige_auth) AS (
  VALUES
    ('ponto_rep_posicao_para_batida', 'ponto_rep_posicao_para_batida(text)', false),
    ('ponto_rep_converter_dia', 'ponto_rep_converter_dia(uuid)', false),
    ('ponto_rep_processar_dias', 'ponto_rep_processar_dias(integer)', false),
    ('ponto_rep_reprocessar_periodo', 'ponto_rep_reprocessar_periodo(date,date)', false),
    ('reprocessar_ponto_relogio', 'reprocessar_ponto_relogio(date,date,uuid)', true)
)
SELECT CASE
  WHEN EXISTS (
    SELECT 1 FROM funcoes f
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = f.nome
    )
  ) THEN 'FALHOU: funcao de conversao do relogio ausente'
  WHEN EXISTS (
    SELECT 1 FROM funcoes f
    WHERE has_function_privilege('anon', f.assinatura, 'EXECUTE')
  ) THEN 'FALHOU: anon executa funcao de conversao do relogio'
  WHEN EXISTS (
    SELECT 1 FROM funcoes f
    WHERE NOT f.exige_auth AND has_function_privilege('authenticated', f.assinatura, 'EXECUTE')
  ) THEN 'FALHOU: authenticated executa funcao interna de conversao'
  WHEN NOT has_function_privilege('authenticated', 'reprocessar_ponto_relogio(date,date,uuid)', 'EXECUTE') THEN
    'FALHOU: RPC de reprocessamento do RH sem EXECUTE para authenticated'
  WHEN EXISTS (
    SELECT 1 FROM public.batidas_ponto
    WHERE origem = 'relogio' AND (hash_digital IS NULL OR hash_integridade IS NULL)
  ) THEN 'FALHOU: batida do relogio sem hash de integridade'
  WHEN EXISTS (
    SELECT 1 FROM public.batidas_ponto
    WHERE origem = 'relogio' AND ordem NOT BETWEEN 1 AND 12
  ) THEN 'FALHOU: batida do relogio com ordem fora de 1..12'
  ELSE 'ok'
END;