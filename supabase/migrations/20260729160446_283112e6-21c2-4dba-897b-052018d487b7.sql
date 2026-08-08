-- times_brindes: leitura estava com USING (true) -> correlaciona pelo time.
DROP POLICY IF EXISTS "Times brindes visiveis para autenticados" ON public.times_brindes;

CREATE POLICY "tenant_times_brindes_select"
ON public.times_brindes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.times t
    WHERE t.id = times_brindes.time_id
      AND public.pertence_a_empresa(t.empresa_id)
  )
);

-- auditoria_logs: INSERT com auth.uid() IS NOT NULL permitia forjar trilha
-- em nome de terceiros/outra empresa. user_id/empresa_id nulos seguem
-- permitidos para registros de sistema; o que se impede e a atribuicao falsa.
DROP POLICY IF EXISTS "auditoria_logs_insert" ON public.auditoria_logs;

CREATE POLICY "auditoria_logs_insert"
ON public.auditoria_logs
FOR INSERT
TO authenticated
WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid())
  AND (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id))
);
