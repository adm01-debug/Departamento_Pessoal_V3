-- prevent_empty_empresa_id comparava uma coluna UUID com o literal ''.
-- O Postgres resolve ''::uuid em tempo de plano, entao a funcao levantava
-- 22P02 ("invalid input syntax for type uuid: \"\"") em TODA escrita das seis
-- tabelas onde a 20260719170000_security_indexes_constraints.sql instalou os
-- gatilhos trg_prevent_empty_empresa_*: colaboradores, folhas_pagamento,
-- despesas, batidas_ponto, registros_ponto e admissoes.
--
-- Efeito em producao (medido em 25/11/2026 com sessao autenticada real):
--   PATCH /rest/v1/colaboradores?id=eq.<uuid> -> 400 {"code":"22P02"}
--   POST  /rest/v1/folhas_pagamento            -> 400 {"code":"22P02"}
-- O cadastro de colaborador e a batida de ponto falham sempre que dependem de
-- escrita nessas tabelas. O E2E autenticado da main quebrava exatamente aqui:
-- scripts/e2e/ensure-fixtures.mjs cria folha e atualiza colaborador.
--
-- A garantia que o gatilho buscava ja vem do proprio tipo (uuid nao aceita
-- string vazia) e do NOT NULL entregue pela
-- 20261118160000_empresa_id_not_null_rh.sql (ver o comentario final daquele
-- arquivo). A comparacao passa a ser feita em text, que nunca e vazio para um
-- uuid: o gatilho continua instalado e deixa de derrubar a escrita.
CREATE OR REPLACE FUNCTION public.prevent_empty_empresa_id()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.empresa_id IS NOT NULL AND NEW.empresa_id::text = '' THEN
    RAISE EXCEPTION 'empresa_id cannot be an empty string';
  END IF;
  RETURN NEW;
END;
$function$;
