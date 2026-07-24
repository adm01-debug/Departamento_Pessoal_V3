-- View to detect point exceptions
CREATE OR REPLACE VIEW public.excecoes_ponto AS
SELECT 
    b.colaborador_id,
    c.nome_completo as colaborador_nome,
    b.data,
    COUNT(*) as total_batidas,
    CASE 
        WHEN COUNT(*) % 2 != 0 THEN 'Batida Ímpar (Possível esquecimento)'
        WHEN COUNT(*) < 4 AND COUNT(*) > 0 THEN 'Batidas Insuficientes'
        ELSE 'Ok'
    END as status_alerta
FROM public.batidas_ponto b
JOIN public.colaboradores c ON b.colaborador_id = c.id
GROUP BY b.colaborador_id, c.nome_completo, b.data
HAVING COUNT(*) % 2 != 0 OR COUNT(*) < 4;

-- Table for point adjustment requests (Self-Service)
CREATE TABLE IF NOT EXISTS public.solicitacoes_ajuste_ponto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    data_ponto DATE NOT NULL,
    hora_original TIME,
    hora_sugerida TIME NOT NULL,
    tipo_ponto TEXT NOT NULL, -- entrada, saida_almoco, etc.
    motivo TEXT NOT NULL,
    status TEXT DEFAULT 'pendente', -- pendente, aprovado, rejeitado
    aprovado_por UUID REFERENCES public.profiles(id),
    observacoes_gestor TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.solicitacoes_ajuste_ponto ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Colaboradores veem suas próprias solicitações" ON public.solicitacoes_ajuste_ponto;
CREATE POLICY "Colaboradores veem suas próprias solicitações" 
ON public.solicitacoes_ajuste_ponto FOR SELECT 
USING (colaborador_id IN (SELECT id FROM colaboradores WHERE email = auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Colaboradores criam suas próprias solicitações" ON public.solicitacoes_ajuste_ponto;
CREATE POLICY "Colaboradores criam suas próprias solicitações" 
ON public.solicitacoes_ajuste_ponto FOR INSERT 
WITH CHECK (colaborador_id IN (SELECT id FROM colaboradores WHERE email = auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Gestores veem solicitações da empresa" ON public.solicitacoes_ajuste_ponto;
CREATE POLICY "Gestores veem solicitações da empresa" 
ON public.solicitacoes_ajuste_ponto FOR SELECT 
USING (empresa_id IN (SELECT id FROM empresas));
