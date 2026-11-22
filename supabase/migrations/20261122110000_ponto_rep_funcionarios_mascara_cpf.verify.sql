-- ok só se: cpf_last4 existe, o gatilho está ligado, authenticated não lê
-- cpf/pis inteiros, authenticated lê cpf_last4, e service_role continua com
-- acesso total (precisa de cpf/pis para o vínculo).
SELECT CASE
  WHEN NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ponto_rep_funcionarios' AND column_name = 'cpf_last4'
  ) THEN 'FALHOU: cpf_last4 nao existe'
  WHEN NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.ponto_rep_funcionarios'::regclass
      AND tgname = 'trg_ponto_rep_funcionario_cpf_last4' AND NOT tgisinternal
  ) THEN 'FALHOU: gatilho de cpf_last4 ausente'
  WHEN has_column_privilege('authenticated', 'public.ponto_rep_funcionarios', 'cpf', 'SELECT')
    THEN 'FALHOU: authenticated ainda le cpf inteiro'
  WHEN has_column_privilege('authenticated', 'public.ponto_rep_funcionarios', 'pis', 'SELECT')
    THEN 'FALHOU: authenticated ainda le pis inteiro'
  WHEN NOT has_column_privilege('authenticated', 'public.ponto_rep_funcionarios', 'cpf_last4', 'SELECT')
    THEN 'FALHOU: authenticated nao le cpf_last4'
  WHEN NOT has_column_privilege('authenticated', 'public.ponto_rep_funcionarios', 'nome', 'SELECT')
    THEN 'FALHOU: authenticated perdeu acesso a coluna nao sensivel'
  WHEN NOT has_column_privilege('service_role', 'public.ponto_rep_funcionarios', 'cpf', 'SELECT')
    THEN 'FALHOU: service_role perdeu acesso a cpf'
  WHEN EXISTS (
    SELECT 1 FROM public.ponto_rep_funcionarios
    WHERE cpf IS NOT NULL AND cpf_last4 IS DISTINCT FROM right(regexp_replace(cpf, '\D', '', 'g'), 4)
  ) THEN 'FALHOU: cpf_last4 desatualizado em alguma linha'
  ELSE 'ok'
END;
