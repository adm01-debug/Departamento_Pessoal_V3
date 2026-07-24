
-- beneficiarios_plano (planoSaudeService.ts)
CREATE TABLE IF NOT EXISTS public.beneficiarios_plano (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_saude_id UUID REFERENCES public.planos_saude(id) ON DELETE CASCADE,
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  nome TEXT,
  parentesco TEXT,
  cpf TEXT,
  data_inclusao DATE DEFAULT CURRENT_DATE,
  data_exclusao DATE,
  data_carencia DATE,
  tipo TEXT DEFAULT 'titular',
  status TEXT DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.beneficiarios_plano ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage beneficiarios_plano" ON public.beneficiarios_plano;
CREATE POLICY "Auth users manage beneficiarios_plano" ON public.beneficiarios_plano FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- vales_transporte (valeTransporteService.ts)
CREATE TABLE IF NOT EXISTS public.vales_transporte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  optante BOOLEAN DEFAULT true,
  valor_diario NUMERIC DEFAULT 0,
  valor_mensal NUMERIC DEFAULT 0,
  desconto NUMERIC DEFAULT 0,
  valor_liquido NUMERIC DEFAULT 0,
  dias_uteis INTEGER DEFAULT 22,
  percentual_desconto NUMERIC DEFAULT 6,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vales_transporte ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage vales_transporte" ON public.vales_transporte;
CREATE POLICY "Auth users manage vales_transporte" ON public.vales_transporte FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- linhas_transporte (valeTransporteService.ts)
CREATE TABLE IF NOT EXISTS public.linhas_transporte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vale_transporte_id UUID REFERENCES public.vales_transporte(id) ON DELETE CASCADE,
  tipo TEXT DEFAULT 'onibus',
  nome TEXT NOT NULL,
  valor NUMERIC DEFAULT 0,
  ida_volta BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.linhas_transporte ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage linhas_transporte" ON public.linhas_transporte;
CREATE POLICY "Auth users manage linhas_transporte" ON public.linhas_transporte FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- audit_logs (auditLogService.ts uses audit_logs, DB has audit_log)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_email TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users read audit_logs" ON public.audit_logs;
CREATE POLICY "Auth users read audit_logs" ON public.audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
