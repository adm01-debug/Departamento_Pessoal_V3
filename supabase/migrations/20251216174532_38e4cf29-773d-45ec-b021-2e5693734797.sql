-- Create table for indicator alert limits configuration
CREATE TABLE IF NOT EXISTS public.config_alertas_indicadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL UNIQUE,
  limite_atencao numeric NOT NULL,
  limite_critico numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.config_alertas_indicadores ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
DROP POLICY IF EXISTS "Authenticated users can view config_alertas" ON public.config_alertas_indicadores;
CREATE POLICY "Authenticated users can view config_alertas" 
ON public.config_alertas_indicadores 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert config_alertas" ON public.config_alertas_indicadores;
CREATE POLICY "Authenticated users can insert config_alertas" 
ON public.config_alertas_indicadores 
FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update config_alertas" ON public.config_alertas_indicadores;
CREATE POLICY "Authenticated users can update config_alertas" 
ON public.config_alertas_indicadores 
FOR UPDATE 
USING (true);

-- Insert default values
INSERT INTO public.config_alertas_indicadores (tipo, limite_atencao, limite_critico) VALUES
('turnover', 10, 20),
('absenteismo', 3, 5);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_config_alertas_updated_at ON public.config_alertas_indicadores;
CREATE TRIGGER update_config_alertas_updated_at
BEFORE UPDATE ON public.config_alertas_indicadores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();