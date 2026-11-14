-- Corrige a geração automática de certificado ao concluir um treinamento.
-- public.fn_auto_generate_training_certificate() (trigger AFTER UPDATE
-- tr_auto_generate_certificate em inscricoes_cursos, criada em 20260513193156)
-- lê catalogo_cursos.metadata->>'validade_meses', mas essa coluna não existe no
-- canônico (frjbfeamybqsejlvmqbl). Resultado: todo UPDATE que leva a inscrição
-- para status 'concluido' falha com "column metadata does not exist" e nenhum
-- certificado é emitido.
-- Correção: mesmo corpo, assinatura, SECURITY DEFINER e search_path da definição
-- viva (pg_get_functiondef em 12/11/2026), sem a leitura de metadata. Como o
-- catálogo não guarda validade, o certificado sai com data_validade NULL
-- (equivalente ao COALESCE(..., 0) original). empresa_id do certificado continua
-- preenchido pela trigger BEFORE INSERT fill_treinamento_certificados_empresa
-- (coluna é nullable no canônico; o preflight falha se isso mudar).
-- Idempotente: CREATE OR REPLACE preserva owner e ACL; o REVOKE repete o da
-- 20260619150614/20260716175930.

DO $preflight$
BEGIN
  IF to_regprocedure('public.fn_auto_generate_training_certificate()') IS NULL THEN
    RAISE EXCEPTION 'preflight: public.fn_auto_generate_training_certificate() não existe';
  END IF;
  IF (
    SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'inscricoes_cursos'
      AND column_name IN ('id', 'curso_id', 'colaborador_id', 'status')
  ) <> 4 THEN
    RAISE EXCEPTION 'preflight: public.inscricoes_cursos sem as colunas esperadas (id, curso_id, colaborador_id, status)';
  END IF;
  IF (
    SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'treinamento_certificados'
      AND column_name IN ('colaborador_id', 'curso_id', 'inscricao_id', 'data_validade')
  ) <> 4 THEN
    RAISE EXCEPTION 'preflight: public.treinamento_certificados sem as colunas esperadas (colaborador_id, curso_id, inscricao_id, data_validade)';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'treinamento_certificados'
      AND column_name = 'empresa_id' AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'preflight: treinamento_certificados.empresa_id virou NOT NULL; a função precisa preencher empresa_id';
  END IF;
END
$preflight$;

CREATE OR REPLACE FUNCTION public.fn_auto_generate_training_certificate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    -- catalogo_cursos não tem campo de validade: certificado sem vencimento
    _validade_meses INTEGER := 0;
BEGIN
    IF (NEW.status = 'concluido' AND (OLD.status IS DISTINCT FROM 'concluido')) THEN
        -- Insere certificado
        INSERT INTO public.treinamento_certificados (
            colaborador_id,
            curso_id,
            inscricao_id,
            data_validade
        ) VALUES (
            NEW.colaborador_id,
            NEW.curso_id,
            NEW.id,
            CASE WHEN _validade_meses > 0 THEN (CURRENT_DATE + (_validade_meses * interval '1 month'))::DATE ELSE NULL END
        );
    END IF;
    RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.fn_auto_generate_training_certificate() FROM PUBLIC, anon, authenticated;
