
-- =====================================================
-- GAP 1: Locais de Trabalho (Locations)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.locais_trabalho (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  endereco text,
  cidade text,
  uf text,
  cep text,
  pais text DEFAULT 'BR',
  telefone text,
  ativo boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.locais_trabalho ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage locais_trabalho" ON public.locais_trabalho;
CREATE POLICY "Authenticated users can manage locais_trabalho" ON public.locais_trabalho FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- GAP 2: Histórico de Contratos (Contract Versions)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.historico_contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  data_inicio date NOT NULL,
  data_fim date,
  cargo text,
  departamento text,
  tipo_contrato text,
  salario numeric(12,2),
  carga_horaria_semanal numeric(5,2),
  motivo_alteracao text,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.historico_contratos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage historico_contratos" ON public.historico_contratos;
CREATE POLICY "Authenticated users can manage historico_contratos" ON public.historico_contratos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- GAP 3: Solicitações de Hora Extra
-- =====================================================
CREATE TABLE IF NOT EXISTS public.solicitacoes_hora_extra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  data date NOT NULL,
  horas_solicitadas numeric(5,2) NOT NULL,
  motivo text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  aprovado_por uuid,
  aprovado_em timestamptz,
  observacoes_aprovador text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.solicitacoes_hora_extra ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage solicitacoes_hora_extra" ON public.solicitacoes_hora_extra;
CREATE POLICY "Authenticated users can manage solicitacoes_hora_extra" ON public.solicitacoes_hora_extra FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- GAP 4: Configurações de Intervalo
-- =====================================================
CREATE TABLE IF NOT EXISTS public.configuracoes_intervalo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  duracao_minutos integer NOT NULL DEFAULT 60,
  tipo text NOT NULL DEFAULT 'almoco',
  obrigatorio boolean DEFAULT true,
  horario_inicio_permitido time,
  horario_fim_permitido time,
  ativo boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.configuracoes_intervalo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage configuracoes_intervalo" ON public.configuracoes_intervalo;
CREATE POLICY "Authenticated users can manage configuracoes_intervalo" ON public.configuracoes_intervalo FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- GAP 5: Campos faltantes no Colaborador
-- =====================================================
ALTER TABLE public.colaboradores
  ADD COLUMN IF NOT EXISTS pronomes text,
  ADD COLUMN IF NOT EXISTS pais_nascimento text DEFAULT 'BR',
  ADD COLUMN IF NOT EXISTS data_senioridade date,
  ADD COLUMN IF NOT EXISTS gestor_ferias_id uuid REFERENCES public.colaboradores(id),
  ADD COLUMN IF NOT EXISTS local_trabalho_id uuid,
  ADD COLUMN IF NOT EXISTS nome_nascimento text,
  ADD COLUMN IF NOT EXISTS rg_data_validade date,
  ADD COLUMN IF NOT EXISTS identificador_tipo text,
  ADD COLUMN IF NOT EXISTS identificador_validade date;

-- =====================================================
-- GAP 7: Webhooks com Retry
-- =====================================================
CREATE TABLE IF NOT EXISTS public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  url text NOT NULL,
  ativo boolean DEFAULT true,
  eventos text[] DEFAULT '{}',
  max_tentativas integer DEFAULT 3,
  timeout_segundos integer DEFAULT 30,
  retry_intervalo_segundos integer DEFAULT 60,
  ultimo_status integer,
  ultimo_erro text,
  ultima_execucao timestamptz,
  total_sucesso integer DEFAULT 0,
  total_falha integer DEFAULT 0,
  secret text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage webhooks" ON public.webhooks;
CREATE POLICY "Authenticated users can manage webhooks" ON public.webhooks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- GAP 8: Webhook Logs
-- =====================================================
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  evento text NOT NULL,
  payload jsonb,
  status_code integer,
  resposta text,
  tentativa integer DEFAULT 1,
  erro text,
  duracao_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage webhook_logs" ON public.webhook_logs;
CREATE POLICY "Authenticated users can manage webhook_logs" ON public.webhook_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Triggers
DROP TRIGGER IF EXISTS update_locais_trabalho_updated_at ON public.locais_trabalho;
CREATE TRIGGER update_locais_trabalho_updated_at BEFORE UPDATE ON public.locais_trabalho FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_historico_contratos_updated_at ON public.historico_contratos;
CREATE TRIGGER update_historico_contratos_updated_at BEFORE UPDATE ON public.historico_contratos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_solicitacoes_hora_extra_updated_at ON public.solicitacoes_hora_extra;
CREATE TRIGGER update_solicitacoes_hora_extra_updated_at BEFORE UPDATE ON public.solicitacoes_hora_extra FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_configuracoes_intervalo_updated_at ON public.configuracoes_intervalo;
CREATE TRIGGER update_configuracoes_intervalo_updated_at BEFORE UPDATE ON public.configuracoes_intervalo FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_webhooks_updated_at ON public.webhooks;
CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON public.webhooks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- FK for local_trabalho_id (after table exists)
ALTER TABLE public.colaboradores ADD CONSTRAINT fk_colaboradores_local_trabalho FOREIGN KEY (local_trabalho_id) REFERENCES public.locais_trabalho(id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitacoes_hora_extra;
