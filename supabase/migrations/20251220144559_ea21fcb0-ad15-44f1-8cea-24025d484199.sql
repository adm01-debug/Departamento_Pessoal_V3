-- Criar tabela de templates de onboarding
CREATE TABLE IF NOT EXISTS public.onboarding_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  empresa_id UUID REFERENCES public.empresas(id),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Criar tabela de tarefas do template
CREATE TABLE IF NOT EXISTS public.onboarding_template_tarefas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.onboarding_templates(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT NOT NULL DEFAULT 'geral',
  ordem INTEGER NOT NULL DEFAULT 0,
  dias_prazo INTEGER DEFAULT 1,
  responsavel_tipo TEXT DEFAULT 'rh',
  obrigatoria BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de onboarding do colaborador
CREATE TABLE IF NOT EXISTS public.onboarding_colaborador (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.onboarding_templates(id),
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_conclusao DATE,
  status TEXT NOT NULL DEFAULT 'em_andamento',
  progresso INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de tarefas do onboarding do colaborador
CREATE TABLE IF NOT EXISTS public.onboarding_tarefas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  onboarding_id UUID NOT NULL REFERENCES public.onboarding_colaborador(id) ON DELETE CASCADE,
  template_tarefa_id UUID REFERENCES public.onboarding_template_tarefas(id),
  titulo TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT NOT NULL DEFAULT 'geral',
  ordem INTEGER NOT NULL DEFAULT 0,
  data_prazo DATE,
  data_conclusao TIMESTAMP WITH TIME ZONE,
  concluida BOOLEAN DEFAULT false,
  concluida_por UUID REFERENCES auth.users(id),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_template_tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_colaborador ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_tarefas ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Authenticated users can manage onboarding_templates" ON public.onboarding_templates;
CREATE POLICY "Authenticated users can manage onboarding_templates"
ON public.onboarding_templates FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can manage onboarding_template_tarefas" ON public.onboarding_template_tarefas;
CREATE POLICY "Authenticated users can manage onboarding_template_tarefas"
ON public.onboarding_template_tarefas FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can manage onboarding_colaborador" ON public.onboarding_colaborador;
CREATE POLICY "Authenticated users can manage onboarding_colaborador"
ON public.onboarding_colaborador FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can manage onboarding_tarefas" ON public.onboarding_tarefas;
CREATE POLICY "Authenticated users can manage onboarding_tarefas"
ON public.onboarding_tarefas FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_onboarding_colaborador_updated_at ON public.onboarding_colaborador;
CREATE TRIGGER update_onboarding_colaborador_updated_at
BEFORE UPDATE ON public.onboarding_colaborador
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir template padrão
INSERT INTO public.onboarding_templates (nome, descricao) VALUES
('Onboarding Padrão', 'Template padrão para novos colaboradores');

-- Inserir tarefas do template padrão
INSERT INTO public.onboarding_template_tarefas (template_id, titulo, categoria, ordem, dias_prazo, responsavel_tipo) 
SELECT id, 'Boas-vindas e apresentação da empresa', 'integração', 1, 1, 'rh' FROM public.onboarding_templates WHERE nome = 'Onboarding Padrão'
UNION ALL
SELECT id, 'Entrega de crachá e uniformes', 'integração', 2, 1, 'rh' FROM public.onboarding_templates WHERE nome = 'Onboarding Padrão'
UNION ALL
SELECT id, 'Configuração de email e acessos', 'ti', 3, 1, 'ti' FROM public.onboarding_templates WHERE nome = 'Onboarding Padrão'
UNION ALL
SELECT id, 'Tour pelas instalações', 'integração', 4, 1, 'rh' FROM public.onboarding_templates WHERE nome = 'Onboarding Padrão'
UNION ALL
SELECT id, 'Apresentação à equipe', 'integração', 5, 1, 'gestor' FROM public.onboarding_templates WHERE nome = 'Onboarding Padrão'
UNION ALL
SELECT id, 'Treinamento de segurança do trabalho', 'treinamento', 6, 3, 'seguranca' FROM public.onboarding_templates WHERE nome = 'Onboarding Padrão'
UNION ALL
SELECT id, 'Assinatura do contrato de trabalho', 'documentação', 7, 1, 'rh' FROM public.onboarding_templates WHERE nome = 'Onboarding Padrão'
UNION ALL
SELECT id, 'Cadastro de benefícios', 'documentação', 8, 3, 'rh' FROM public.onboarding_templates WHERE nome = 'Onboarding Padrão'
UNION ALL
SELECT id, 'Treinamento do sistema interno', 'treinamento', 9, 5, 'ti' FROM public.onboarding_templates WHERE nome = 'Onboarding Padrão'
UNION ALL
SELECT id, 'Reunião com gestor direto', 'integração', 10, 1, 'gestor' FROM public.onboarding_templates WHERE nome = 'Onboarding Padrão';