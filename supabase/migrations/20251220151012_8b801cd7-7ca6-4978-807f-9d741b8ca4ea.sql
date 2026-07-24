
-- Tabela para tokens de acesso do candidato (link único)
CREATE TABLE IF NOT EXISTS public.admissao_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admissao_id UUID NOT NULL REFERENCES public.admissoes(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  email_candidato TEXT,
  telefone_candidato TEXT,
  data_expiracao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  dados_preenchidos BOOLEAN DEFAULT false,
  documentos_enviados BOOLEAN DEFAULT false,
  contrato_gerado BOOLEAN DEFAULT false,
  contrato_assinado BOOLEAN DEFAULT false,
  assinatura_base64 TEXT,
  assinado_em TIMESTAMP WITH TIME ZONE,
  ip_assinatura TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para documentos enviados pelo candidato
CREATE TABLE IF NOT EXISTS public.documentos_admissao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admissao_id UUID NOT NULL REFERENCES public.admissoes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  url TEXT NOT NULL,
  tamanho_bytes INTEGER,
  validado BOOLEAN DEFAULT false,
  validado_por UUID,
  validado_em TIMESTAMP WITH TIME ZONE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Histórico de notificações enviadas
CREATE TABLE IF NOT EXISTS public.notificacoes_admissao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admissao_id UUID NOT NULL REFERENCES public.admissoes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- 'email', 'whatsapp'
  canal TEXT NOT NULL, -- email ou telefone
  assunto TEXT,
  mensagem TEXT,
  status TEXT DEFAULT 'enviado',
  erro TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admissao_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_admissao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes_admissao ENABLE ROW LEVEL SECURITY;

-- Políticas para admissao_tokens (acesso público via token para candidatos)
DROP POLICY IF EXISTS "Authenticated users can manage admissao_tokens" ON public.admissao_tokens;
CREATE POLICY "Authenticated users can manage admissao_tokens" 
ON public.admissao_tokens FOR ALL 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public can read own token by token value" ON public.admissao_tokens;
CREATE POLICY "Public can read own token by token value" 
ON public.admissao_tokens FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Public can update own token by token value" ON public.admissao_tokens;
CREATE POLICY "Public can update own token by token value" 
ON public.admissao_tokens FOR UPDATE 
USING (true);

-- Políticas para documentos_admissao
DROP POLICY IF EXISTS "Authenticated users can manage documentos_admissao" ON public.documentos_admissao;
CREATE POLICY "Authenticated users can manage documentos_admissao" 
ON public.documentos_admissao FOR ALL 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public can insert documentos via token" ON public.documentos_admissao;
CREATE POLICY "Public can insert documentos via token" 
ON public.documentos_admissao FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view documentos via token" ON public.documentos_admissao;
CREATE POLICY "Public can view documentos via token" 
ON public.documentos_admissao FOR SELECT 
USING (true);

-- Políticas para notificacoes_admissao
DROP POLICY IF EXISTS "Authenticated users can manage notificacoes_admissao" ON public.notificacoes_admissao;
CREATE POLICY "Authenticated users can manage notificacoes_admissao" 
ON public.notificacoes_admissao FOR ALL 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_admissao_tokens_updated_at ON public.admissao_tokens;
CREATE TRIGGER update_admissao_tokens_updated_at
BEFORE UPDATE ON public.admissao_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar bucket público para documentos de admissão
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documentos-admissao', 'documentos-admissao', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para uploads públicos
DROP POLICY IF EXISTS "Anyone can upload admissao documents" ON storage.objects;
CREATE POLICY "Anyone can upload admissao documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documentos-admissao');

DROP POLICY IF EXISTS "Anyone can view admissao documents" ON storage.objects;
CREATE POLICY "Anyone can view admissao documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'documentos-admissao');

DROP POLICY IF EXISTS "Authenticated users can delete admissao documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete admissao documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'documentos-admissao' AND auth.role() = 'authenticated');
