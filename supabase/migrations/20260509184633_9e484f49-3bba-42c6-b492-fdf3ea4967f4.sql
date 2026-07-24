DROP POLICY IF EXISTS "Usuários deletam suas próprias notificações lidas" ON public.notificacoes;
CREATE POLICY "Usuários deletam suas próprias notificações lidas" 
ON public.notificacoes 
FOR DELETE 
USING (
  auth.uid() = user_id AND lida = true
);
