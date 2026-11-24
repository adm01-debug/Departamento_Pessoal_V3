-- Habilitar RLS nas tabelas identificadas
ALTER TABLE public.fila_notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sst_regimento_interno ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lgpd_politicas_retencao ENABLE ROW LEVEL SECURITY;

-- Políticas para fila_notificacoes
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fila_notificacoes' AND policyname = 'Usuários podem ver suas próprias notificações') THEN
        CREATE POLICY "Usuários podem ver suas próprias notificações" 
        ON public.fila_notificacoes FOR SELECT 
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- Políticas para sst_regimento_interno (Leitura para autenticados)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sst_regimento_interno' AND policyname = 'Leitura para autenticados') THEN
        CREATE POLICY "Leitura para autenticados" 
        ON public.sst_regimento_interno FOR SELECT 
        USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Políticas para lgpd_politicas_retencao (Leitura para autenticados)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lgpd_politicas_retencao' AND policyname = 'Leitura para autenticados') THEN
        CREATE POLICY "Leitura para autenticados" 
        ON public.lgpd_politicas_retencao FOR SELECT 
        USING (auth.role() = 'authenticated');
    END IF;
END $$;
