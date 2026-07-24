-- Refinar política de inserção para colaboradores
DROP POLICY IF EXISTS "Colaboradores criam suas próprias solicitações" ON public.solicitacoes_ajuste_ponto;

DROP POLICY IF EXISTS "Colaboradores criam rascunho ou enviada" ON public.solicitacoes_ajuste_ponto;
CREATE POLICY "Colaboradores criam rascunho ou enviada" 
ON public.solicitacoes_ajuste_ponto 
FOR INSERT 
WITH CHECK (
  (colaborador_id IN (SELECT id FROM colaboradores WHERE email = auth.jwt() ->> 'email'))
  AND (status IN ('rascunho', 'enviado'))
);

-- Adicionar política para deleção (apenas rascunhos pelo próprio colaborador)
DROP POLICY IF EXISTS "Colaboradores deletam seus rascunhos" ON public.solicitacoes_ajuste_ponto;
CREATE POLICY "Colaboradores deletam seus rascunhos" 
ON public.solicitacoes_ajuste_ponto 
FOR DELETE 
USING (
  (colaborador_id IN (SELECT id FROM colaboradores WHERE email = auth.jwt() ->> 'email'))
  AND (status = 'rascunho')
);
