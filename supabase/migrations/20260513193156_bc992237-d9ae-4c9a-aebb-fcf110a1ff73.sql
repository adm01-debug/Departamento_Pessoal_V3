-- 1. Tabela para Certificados de Treinamento
CREATE TABLE IF NOT EXISTS public.treinamento_certificados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    curso_id UUID REFERENCES public.catalogo_cursos(id) ON DELETE SET NULL,
    inscricao_id UUID REFERENCES public.inscricoes_cursos(id) ON DELETE CASCADE,
    data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_validade DATE, -- Para NRs com validade periódica
    arquivo_url TEXT,
    codigo_autenticacao TEXT UNIQUE DEFAULT upper(substring(gen_random_uuid()::text from 1 for 8)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS para Certificados
ALTER TABLE public.treinamento_certificados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Colaboradores veem seus próprios certificados" ON public.treinamento_certificados;
CREATE POLICY "Colaboradores veem seus próprios certificados"
ON public.treinamento_certificados FOR SELECT
USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = colaborador_id));

DROP POLICY IF EXISTS "RH e Gestores veem todos os certificados" ON public.treinamento_certificados;
CREATE POLICY "RH e Gestores veem todos os certificados"
ON public.treinamento_certificados FOR SELECT
USING (auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'rh', 'gestor')
));

-- 2. Tabela para Feedbacks de Treinamento (Avaliação de Reação)
CREATE TABLE IF NOT EXISTS public.treinamento_feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inscricao_id UUID REFERENCES public.inscricoes_cursos(id) ON DELETE CASCADE UNIQUE,
    nota_instrutor INTEGER CHECK (nota_instrutor BETWEEN 1 AND 5),
    nota_conteudo INTEGER CHECK (nota_conteudo BETWEEN 1 AND 5),
    comentario TEXT,
    sugestoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS para Feedbacks
ALTER TABLE public.treinamento_feedbacks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários criam feedbacks de suas inscrições" ON public.treinamento_feedbacks;
CREATE POLICY "Usuários criam feedbacks de suas inscrições"
ON public.treinamento_feedbacks FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM public.inscricoes_cursos i
    JOIN public.profiles p ON p.id = i.colaborador_id
    WHERE i.id = inscricao_id AND p.user_id = auth.uid()
));

-- 3. Trigger para gerar certificado automaticamente ao concluir curso
CREATE OR REPLACE FUNCTION public.fn_auto_generate_training_certificate()
RETURNS TRIGGER AS $$
DECLARE
    _curso_id UUID;
    _validade_meses INTEGER;
BEGIN
    IF (NEW.status = 'concluido' AND (OLD.status IS DISTINCT FROM 'concluido')) THEN
        -- Busca dados do curso
        SELECT id, COALESCE((metadata->>'validade_meses')::INTEGER, 0) 
        INTO _curso_id, _validade_meses
        FROM public.catalogo_cursos 
        WHERE id = NEW.curso_id;

        -- Insere certificado
        INSERT INTO public.treinamento_certificados (
            colaborador_id,
            curso_id,
            inscricao_id,
            data_validade
        ) VALUES (
            NEW.colaborador_id,
            NEW.curso_id,
            NEW.id,
            CASE WHEN _validade_meses > 0 THEN (CURRENT_DATE + (_validade_meses * interval '1 month'))::DATE ELSE NULL END
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_auto_generate_certificate ON public.inscricoes_cursos;
CREATE TRIGGER tr_auto_generate_certificate
AFTER UPDATE ON public.inscricoes_cursos
FOR EACH ROW
EXECUTE FUNCTION public.fn_auto_generate_training_certificate();
