-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- 'ferias_vencendo', 'contrato_vencendo', 'documento_vencendo', 'periodo_aquisitivo'
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  entidade_tipo TEXT, -- 'colaborador', 'ferias', 'documento'
  entidade_id UUID,
  lida BOOLEAN DEFAULT false,
  data_referencia DATE, -- data do evento (vencimento)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
DROP POLICY IF EXISTS "Authenticated users can view notifications" ON public.notificacoes;
CREATE POLICY "Authenticated users can view notifications"
ON public.notificacoes
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notificacoes;
CREATE POLICY "Authenticated users can insert notifications"
ON public.notificacoes
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update notifications" ON public.notificacoes;
CREATE POLICY "Authenticated users can update notifications"
ON public.notificacoes
FOR UPDATE
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete notifications" ON public.notificacoes;
CREATE POLICY "Authenticated users can delete notifications"
ON public.notificacoes
FOR DELETE
USING (auth.role() = 'authenticated');

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON public.notificacoes(lida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_tipo ON public.notificacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_notificacoes_created_at ON public.notificacoes(created_at DESC);