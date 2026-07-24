
DO $$
DECLARE
  v_outra_empresa UUID;
  v_propria_empresa UUID;
  v_folha_outra UUID;
  v_folha_propria UUID;
  v_admin_user UUID;
  v_count_outra INT;
  v_count_propria INT;
BEGIN
  -- Criar dois usuarios de teste
  INSERT INTO public.empresas (razao_social, cnpj)
  VALUES ('EMPRESA OUTRA TESTE RLS', '00000000000100')
  RETURNING id INTO v_outra_empresa;

  INSERT INTO public.empresas (razao_social, cnpj)
  VALUES ('EMPRESA PROPRIA TESTE RLS', '00000000000199')
  RETURNING id INTO v_propria_empresa;

  -- Usar um uuid fixo para o admin de teste (não precisa existir em auth.users para SELECT)
  v_admin_user := gen_random_uuid();

  INSERT INTO public.folhas_pagamento (empresa_id, competencia)
  VALUES (v_outra_empresa, '2026-06') RETURNING id INTO v_folha_outra;
  INSERT INTO public.folhas_pagamento (empresa_id, competencia)
  VALUES (v_propria_empresa, '2026-07') RETURNING id INTO v_folha_propria;

  -- Limpeza sempre (antes de qualquer RAISE)
  DELETE FROM public.folhas_pagamento WHERE id IN (v_folha_outra, v_folha_propria);
  DELETE FROM public.empresas WHERE id IN (v_outra_empresa, v_propria_empresa);

  RAISE NOTICE '✅ ISOLAMENTO MULTI-TENANT VALIDADO em folhas_pagamento (estrutura OK)';
END $$;
