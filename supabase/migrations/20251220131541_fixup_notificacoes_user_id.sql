-- Fixup: add user_id to notificacoes table
-- 005_esocial_auditoria.sql created notificacoes with 'usuario_id' (not 'user_id').
-- 20251220131540 tried CREATE TABLE IF NOT EXISTS with 'user_id', but the table already
-- existed, so the CREATE was skipped and 'user_id' was never added.
-- 20260314204312 creates a policy using user_id = auth.uid(), which fails without this column.
ALTER TABLE public.notificacoes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.notificacoes ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_notificacoes_user_id ON public.notificacoes(user_id);
