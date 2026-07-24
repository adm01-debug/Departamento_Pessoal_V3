-- Criar tabela de templates de documentos
CREATE TABLE IF NOT EXISTS public.documento_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'geral',
  conteudo_html TEXT NOT NULL,
  variaveis JSONB DEFAULT '[]',
  ativo BOOLEAN DEFAULT true,
  empresa_id UUID REFERENCES public.empresas(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documento_templates ENABLE ROW LEVEL SECURITY;

-- Policy
DROP POLICY IF EXISTS "Authenticated users can manage documento_templates" ON public.documento_templates;
CREATE POLICY "Authenticated users can manage documento_templates"
ON public.documento_templates FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_documento_templates_updated_at ON public.documento_templates;
CREATE TRIGGER update_documento_templates_updated_at
BEFORE UPDATE ON public.documento_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir templates padrão
INSERT INTO public.documento_templates (nome, tipo, categoria, conteudo_html, variaveis) VALUES
('Declaração de Vínculo Empregatício', 'declaracao', 'trabalhista', 
'<h1 style="text-align: center;">DECLARAÇÃO DE VÍNCULO EMPREGATÍCIO</h1>
<p>Declaramos para os devidos fins que <strong>{{nome_colaborador}}</strong>, portador(a) do CPF nº <strong>{{cpf}}</strong>, é funcionário(a) desta empresa desde <strong>{{data_admissao}}</strong>, exercendo a função de <strong>{{cargo}}</strong>, com carga horária de <strong>{{jornada_semanal}}</strong> horas semanais.</p>
<p>Por ser verdade, firmamos a presente declaração.</p>
<p style="text-align: right;">{{cidade}}, {{data_atual}}</p>
<p style="text-align: center; margin-top: 60px;">_______________________________<br/>{{empresa_razao_social}}<br/>CNPJ: {{empresa_cnpj}}</p>',
'["nome_colaborador", "cpf", "data_admissao", "cargo", "jornada_semanal", "cidade", "data_atual", "empresa_razao_social", "empresa_cnpj"]'),

('Atestado de Comparecimento', 'atestado', 'trabalhista',
'<h1 style="text-align: center;">ATESTADO DE COMPARECIMENTO</h1>
<p>Atestamos para os devidos fins que <strong>{{nome_colaborador}}</strong>, portador(a) do CPF nº <strong>{{cpf}}</strong>, compareceu a esta empresa no dia <strong>{{data_comparecimento}}</strong>, no período das <strong>{{hora_entrada}}</strong> às <strong>{{hora_saida}}</strong>.</p>
<p style="text-align: right;">{{cidade}}, {{data_atual}}</p>
<p style="text-align: center; margin-top: 60px;">_______________________________<br/>{{empresa_razao_social}}</p>',
'["nome_colaborador", "cpf", "data_comparecimento", "hora_entrada", "hora_saida", "cidade", "data_atual", "empresa_razao_social"]'),

('Termo de Responsabilidade de Equipamentos', 'termo', 'patrimonial',
'<h1 style="text-align: center;">TERMO DE RESPONSABILIDADE</h1>
<p>Eu, <strong>{{nome_colaborador}}</strong>, portador(a) do CPF nº <strong>{{cpf}}</strong>, funcionário(a) da empresa <strong>{{empresa_razao_social}}</strong>, declaro ter recebido os seguintes equipamentos:</p>
<p>{{lista_equipamentos}}</p>
<p>Comprometo-me a zelar pela conservação e uso adequado dos mesmos, responsabilizando-me por eventuais danos causados por mau uso ou negligência.</p>
<p style="text-align: right;">{{cidade}}, {{data_atual}}</p>
<p style="text-align: center; margin-top: 60px;">_______________________________<br/>{{nome_colaborador}}<br/>CPF: {{cpf}}</p>',
'["nome_colaborador", "cpf", "empresa_razao_social", "lista_equipamentos", "cidade", "data_atual"]'),

('Aviso de Férias', 'aviso', 'trabalhista',
'<h1 style="text-align: center;">AVISO DE FÉRIAS</h1>
<p>Comunicamos ao colaborador <strong>{{nome_colaborador}}</strong>, inscrito no CPF sob o nº <strong>{{cpf}}</strong>, que suas férias foram programadas para o período de <strong>{{data_inicio_ferias}}</strong> a <strong>{{data_fim_ferias}}</strong>, totalizando <strong>{{dias_ferias}}</strong> dias.</p>
<p>O pagamento das férias será efetuado até 2 dias antes do início do período de gozo, conforme legislação vigente.</p>
<p style="text-align: right;">{{cidade}}, {{data_atual}}</p>
<p style="text-align: center; margin-top: 40px;">_______________________________<br/>Recursos Humanos<br/>{{empresa_razao_social}}</p>
<p style="text-align: center; margin-top: 40px;">Ciente:<br/><br/>_______________________________<br/>{{nome_colaborador}}</p>',
'["nome_colaborador", "cpf", "data_inicio_ferias", "data_fim_ferias", "dias_ferias", "cidade", "data_atual", "empresa_razao_social"]');