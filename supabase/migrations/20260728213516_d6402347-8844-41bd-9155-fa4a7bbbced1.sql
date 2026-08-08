-- ---------------------------------------------------------------------------
-- gerar_hash_ponto: a função foi escrita para batidas_ponto (usa NEW.hora e
-- NEW.tipo) mas o gatilho tr_gerar_hash_ponto está ligado a registros_ponto,
-- que não possui essas colunas. Resultado: "record new has no field hora"
-- (SQLSTATE 42703) a cada consolidação de espelho.
--
-- Em vez de mover o gatilho (registros_ponto tem hash_digital e deve mesmo
-- receber um código), a função passa a ler os campos via to_jsonb(NEW): as
-- chaves ausentes viram string vazia, mantendo a fórmula canônica idêntica
-- para batidas_ponto e produzindo um código estável para registros_ponto.
--
-- Observação: hash_digital é um código simples de conferência, distinto do
-- selo hash_integridade (verificado por seal_enforce). Não há sobreposição.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.gerar_hash_ponto()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  j jsonb := to_jsonb(NEW);
BEGIN
  NEW.hash_digital := encode(
    digest(
      COALESCE(j->>'colaborador_id', '') ||
      COALESCE(j->>'data',           '') ||
      COALESCE(j->>'hora',           COALESCE(j->>'entrada_1', '')) ||
      COALESCE(j->>'tipo',           COALESCE(j->>'saida_1',   '')),
      'sha256'
    ),
    'hex'
  );
  RETURN NEW;
END;
$function$;