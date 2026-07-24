
-- =========================================
-- CANAL CONTABILIDADE (Fase A #2)
-- =========================================

CREATE TABLE IF NOT EXISTS public.contabilidade_contatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  escritorio TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, email)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contabilidade_contatos TO authenticated;
GRANT ALL ON public.contabilidade_contatos TO service_role;
ALTER TABLE public.contabilidade_contatos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contabilidade_contatos_tenant_all" ON public.contabilidade_contatos;
CREATE POLICY "contabilidade_contatos_tenant_all" ON public.contabilidade_contatos
  FOR ALL TO authenticated
  USING (public.user_belongs_to_empresa(auth.uid(), empresa_id))
  WITH CHECK (public.user_belongs_to_empresa(auth.uid(), empresa_id));

CREATE INDEX IF NOT EXISTS idx_contab_contatos_empresa ON public.contabilidade_contatos(empresa_id) WHERE ativo = true;

-- Threads
CREATE TABLE IF NOT EXISTS public.contabilidade_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  assunto TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'outro' CHECK (categoria IN ('folha','esocial','admissao','rescisao','tributos','ferias','outro')),
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','respondido','resolvido','arquivado')),
  prioridade TEXT NOT NULL DEFAULT 'normal' CHECK (prioridade IN ('baixa','normal','alta','urgente')),
  contato_id UUID REFERENCES public.contabilidade_contatos(id) ON DELETE SET NULL,
  aberto_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ultima_atividade_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolvido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contabilidade_threads TO authenticated;
GRANT ALL ON public.contabilidade_threads TO service_role;
ALTER TABLE public.contabilidade_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contab_threads_tenant_all" ON public.contabilidade_threads;
CREATE POLICY "contab_threads_tenant_all" ON public.contabilidade_threads
  FOR ALL TO authenticated
  USING (public.user_belongs_to_empresa(auth.uid(), empresa_id))
  WITH CHECK (public.user_belongs_to_empresa(auth.uid(), empresa_id));

CREATE INDEX IF NOT EXISTS idx_contab_threads_empresa_ativ ON public.contabilidade_threads(empresa_id, ultima_atividade_em DESC);
CREATE INDEX IF NOT EXISTS idx_contab_threads_status ON public.contabilidade_threads(empresa_id, status) WHERE status IN ('aberto','respondido');

-- Mensagens
CREATE TABLE IF NOT EXISTS public.contabilidade_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.contabilidade_threads(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  autor_tipo TEXT NOT NULL CHECK (autor_tipo IN ('rh','contabilidade','sistema')),
  autor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  autor_nome TEXT,
  corpo TEXT NOT NULL CHECK (length(corpo) BETWEEN 1 AND 10000),
  anexos JSONB NOT NULL DEFAULT '[]'::jsonb,
  lida_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contabilidade_mensagens TO authenticated;
GRANT ALL ON public.contabilidade_mensagens TO service_role;
ALTER TABLE public.contabilidade_mensagens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contab_msgs_tenant_all" ON public.contabilidade_mensagens;
CREATE POLICY "contab_msgs_tenant_all" ON public.contabilidade_mensagens
  FOR ALL TO authenticated
  USING (public.user_belongs_to_empresa(auth.uid(), empresa_id))
  WITH CHECK (public.user_belongs_to_empresa(auth.uid(), empresa_id));

CREATE INDEX IF NOT EXISTS idx_contab_msgs_thread ON public.contabilidade_mensagens(thread_id, created_at);

-- Trigger: sempre que uma nova mensagem entrar, atualiza ultima_atividade e status
CREATE OR REPLACE FUNCTION public.trg_contab_msg_bump_thread()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.contabilidade_threads
  SET ultima_atividade_em = now(),
      updated_at = now(),
      status = CASE
        WHEN NEW.autor_tipo = 'contabilidade' AND status = 'aberto' THEN 'respondido'
        WHEN NEW.autor_tipo = 'rh' AND status = 'respondido' THEN 'aberto'
        ELSE status
      END
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_contab_thread ON public.contabilidade_mensagens;
CREATE TRIGGER trg_bump_contab_thread
AFTER INSERT ON public.contabilidade_mensagens
FOR EACH ROW EXECUTE FUNCTION public.trg_contab_msg_bump_thread();

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_contab_contatos_updated ON public.contabilidade_contatos;
CREATE TRIGGER trg_contab_contatos_updated BEFORE UPDATE ON public.contabilidade_contatos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_contab_threads_updated ON public.contabilidade_threads;
CREATE TRIGGER trg_contab_threads_updated BEFORE UPDATE ON public.contabilidade_threads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
