-- Criar tabela para agendamentos de relatórios
CREATE TABLE IF NOT EXISTS public.relatorios_agendados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo_relatorio TEXT NOT NULL,
  formato TEXT NOT NULL DEFAULT 'PDF',
  parametros JSONB DEFAULT '{}',
  email_destinatario TEXT NOT NULL,
  frequencia TEXT NOT NULL CHECK (frequencia IN ('diario', 'semanal', 'mensal')),
  dia_semana INTEGER CHECK (dia_semana >= 0 AND dia_semana <= 6),
  dia_mes INTEGER CHECK (dia_mes >= 1 AND dia_mes <= 31),
  hora_envio TIME NOT NULL DEFAULT '08:00:00',
  ativo BOOLEAN DEFAULT true,
  ultimo_envio TIMESTAMP WITH TIME ZONE,
  proximo_envio TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.relatorios_agendados ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Usuários autenticados podem ver agendamentos" ON public.relatorios_agendados;
CREATE POLICY "Usuários autenticados podem ver agendamentos"
  ON public.relatorios_agendados FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Usuários autenticados podem criar agendamentos" ON public.relatorios_agendados;
CREATE POLICY "Usuários autenticados podem criar agendamentos"
  ON public.relatorios_agendados FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Usuários autenticados podem atualizar agendamentos" ON public.relatorios_agendados;
CREATE POLICY "Usuários autenticados podem atualizar agendamentos"
  ON public.relatorios_agendados FOR UPDATE
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Usuários autenticados podem deletar agendamentos" ON public.relatorios_agendados;
CREATE POLICY "Usuários autenticados podem deletar agendamentos"
  ON public.relatorios_agendados FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_relatorios_agendados_updated_at ON public.relatorios_agendados;
CREATE TRIGGER update_relatorios_agendados_updated_at
  BEFORE UPDATE ON public.relatorios_agendados
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela para log de envios
CREATE TABLE IF NOT EXISTS public.log_envio_relatorios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agendamento_id UUID REFERENCES public.relatorios_agendados(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('sucesso', 'erro', 'pendente')),
  mensagem TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.log_envio_relatorios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários autenticados podem ver logs" ON public.log_envio_relatorios;
CREATE POLICY "Usuários autenticados podem ver logs"
  ON public.log_envio_relatorios FOR SELECT
  USING (auth.uid() IS NOT NULL);