-- Garantir que RLS está habilitado
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.desligamentos ENABLE ROW LEVEL SECURITY;

-- Limpar políticas antigas se existirem para evitar conflitos
DROP POLICY IF EXISTS "Users can view own audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "System can insert audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "Users can view relevant audit_logs" ON public.audit_log;
DROP POLICY IF EXISTS "Authenticated users can insert audit_logs" ON public.audit_log;

-- Políticas para audit_log
-- Permitir que usuários vejam seus próprios logs ou se forem administradores (usando metadados de auth ou profiles se disponível)
CREATE POLICY "Users can view relevant audit_logs" 
ON public.audit_log 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR 
  (auth.jwt() ->> 'role' = 'service_role')
);

-- Permitir inserção apenas para usuários autenticados
DROP POLICY IF EXISTS "Authenticated users can insert audit_logs" ON public.audit_log;
CREATE POLICY "Authenticated users can insert audit_logs" 
ON public.audit_log 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Adicionar índices para busca rápida na auditoria
CREATE INDEX IF NOT EXISTS idx_audit_log_tabela ON public.audit_log(tabela);
CREATE INDEX IF NOT EXISTS idx_audit_log_registro_id ON public.audit_log(registro_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- Adicionar campo hash_integridade em desligamentos se não existir para assinatura de TRCT
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'desligamentos' AND column_name = 'hash_integridade') THEN
    ALTER TABLE public.desligamentos ADD COLUMN hash_integridade TEXT;
  END IF;
END $$;
