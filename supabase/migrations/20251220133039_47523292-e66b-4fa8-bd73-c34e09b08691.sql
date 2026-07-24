-- Create tipos_beneficio table
CREATE TABLE IF NOT EXISTS public.tipos_beneficio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  icone TEXT,
  operadora TEXT,
  valor_padrao NUMERIC(10,2) DEFAULT 0,
  desconto_colaborador NUMERIC(5,2) DEFAULT 0, -- percentual
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create beneficios_colaborador table
CREATE TABLE IF NOT EXISTS public.beneficios_colaborador (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  tipo_beneficio_id UUID NOT NULL REFERENCES public.tipos_beneficio(id) ON DELETE CASCADE,
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(10,2) DEFAULT 0,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE,
  ativo BOOLEAN DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(colaborador_id, tipo_beneficio_id)
);

-- Enable RLS
ALTER TABLE public.tipos_beneficio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficios_colaborador ENABLE ROW LEVEL SECURITY;

-- Policies for tipos_beneficio
DROP POLICY IF EXISTS "Authenticated users can view tipos_beneficio" ON public.tipos_beneficio;
CREATE POLICY "Authenticated users can view tipos_beneficio"
ON public.tipos_beneficio
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can manage tipos_beneficio" ON public.tipos_beneficio;
CREATE POLICY "Authenticated users can manage tipos_beneficio"
ON public.tipos_beneficio
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Policies for beneficios_colaborador
DROP POLICY IF EXISTS "Authenticated users can manage beneficios_colaborador" ON public.beneficios_colaborador;
CREATE POLICY "Authenticated users can manage beneficios_colaborador"
ON public.beneficios_colaborador
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_beneficios_colaborador_colaborador ON public.beneficios_colaborador(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_beneficios_colaborador_tipo ON public.beneficios_colaborador(tipo_beneficio_id);
CREATE INDEX IF NOT EXISTS idx_beneficios_colaborador_ativo ON public.beneficios_colaborador(ativo);

-- Insert default benefit types
INSERT INTO public.tipos_beneficio (codigo, nome, descricao, icone, valor_padrao, desconto_colaborador) VALUES
('VT', 'Vale Transporte', 'Vale transporte para deslocamento', '🚌', 220, 6),
('VR', 'Vale Refeição', 'Vale para refeições', '🍽️', 440, 0),
('VA', 'Vale Alimentação', 'Vale para compras em supermercados', '🛒', 400, 0),
('PS', 'Plano de Saúde', 'Plano de saúde médico', '🏥', 380, 0),
('PO', 'Plano Odontológico', 'Plano odontológico', '🦷', 80, 0),
('SV', 'Seguro de Vida', 'Seguro de vida em grupo', '🛡️', 50, 0),
('GYM', 'Gympass/Wellhub', 'Benefício academia e bem-estar', '🏋️', 100, 0),
('AUX', 'Auxílio Creche', 'Auxílio para creche/escola', '👶', 500, 0);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_beneficios_colaborador_updated_at ON public.beneficios_colaborador;
CREATE TRIGGER update_beneficios_colaborador_updated_at
BEFORE UPDATE ON public.beneficios_colaborador
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add audit trigger
DROP TRIGGER IF EXISTS audit_beneficios_colaborador ON public.beneficios_colaborador;
CREATE TRIGGER audit_beneficios_colaborador
  AFTER INSERT OR UPDATE OR DELETE ON public.beneficios_colaborador
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();