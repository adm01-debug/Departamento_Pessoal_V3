-- Sequencial de arquivo CNAB alocado atomicamente por (empresa, banco).
-- A versão anterior de next_cnab_sequencial lia MAX(sequencial_arquivo)+1 sem
-- reservar o número: duas gerações concorrentes recebiam o mesmo sequencial e
-- produziam remessas bancárias duplicadas. O contador agora é persistido e o
-- INSERT ... ON CONFLICT DO UPDATE reserva o número dentro da transação da
-- RPC — chamadas concorrentes recebem valores distintos. Gaps são possíveis
-- (remessa que falha depois de alocar) e são aceitáveis: o NSA distingue
-- arquivos; duplicados é que são rejeitados pelo banco.

CREATE TABLE IF NOT EXISTS public.cnab_sequencias (
  empresa_id uuid NOT NULL,
  banco_codigo text NOT NULL,
  last_seq bigint NOT NULL,
  CONSTRAINT cnab_sequencias_pkey PRIMARY KEY (empresa_id, banco_codigo)
);

-- Sem policies: nenhum acesso direto pela API — só via RPC SECURITY DEFINER.
ALTER TABLE public.cnab_sequencias ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.cnab_sequencias FROM PUBLIC, anon, authenticated;

-- Semeia o contador com o último sequencial já emitido, preservando a
-- semântica do MAX+1 anterior na primeira alocação pós-migration.
INSERT INTO public.cnab_sequencias (empresa_id, banco_codigo, last_seq)
SELECT empresa_id, banco_codigo, MAX(sequencial_arquivo)
FROM public.cnab_remessas
WHERE sequencial_arquivo IS NOT NULL
GROUP BY empresa_id, banco_codigo
ON CONFLICT (empresa_id, banco_codigo) DO NOTHING;

CREATE OR REPLACE FUNCTION public.next_cnab_sequencial(
  p_empresa_id uuid,
  p_banco_codigo text
)
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  actor uuid := auth.uid();
  service_request boolean := COALESCE(auth.jwt() ->> 'role', '') = 'service_role';
  result integer;
BEGIN
  IF p_empresa_id IS NULL OR p_banco_codigo IS NULL OR btrim(p_banco_codigo) = '' THEN
    RAISE EXCEPTION 'invalid CNAB sequence arguments' USING ERRCODE = '22023';
  END IF;
  IF NOT service_request AND (
    actor IS NULL OR (
      NOT public.is_admin(actor)
      AND NOT EXISTS (
        SELECT 1 FROM public.user_empresas ue
        WHERE ue.user_id = actor AND ue.empresa_id = p_empresa_id
      )
    )
  ) THEN
    RAISE EXCEPTION 'CNAB sequence outside caller tenant' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.cnab_sequencias (empresa_id, banco_codigo, last_seq)
  VALUES (p_empresa_id, p_banco_codigo, 1)
  ON CONFLICT (empresa_id, banco_codigo)
  DO UPDATE SET last_seq = public.cnab_sequencias.last_seq + 1
  RETURNING last_seq INTO result;
  RETURN result;
END
$function$;
REVOKE ALL ON FUNCTION public.next_cnab_sequencial(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_cnab_sequencial(uuid, text) TO authenticated, service_role;
