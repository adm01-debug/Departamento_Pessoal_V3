
-- =============================================================
-- ONDA 1: TABELAS DE REFERÊNCIA (16 tabelas com seed data)
-- =============================================================

-- 1. Nacionalidades
CREATE TABLE IF NOT EXISTS public.nacionalidades (
  id serial PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  codigo_esocial text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.nacionalidades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nacionalidades_read" ON public.nacionalidades;
CREATE POLICY "nacionalidades_read" ON public.nacionalidades FOR SELECT TO authenticated USING (true);

INSERT INTO public.nacionalidades (nome, codigo_esocial) VALUES
  ('Brasileiro', '10'),
  ('Naturalizado Brasileiro', '20'),
  ('Argentino', '21'),
  ('Boliviano', '22'),
  ('Chileno', '23'),
  ('Paraguaio', '24'),
  ('Uruguaio', '25'),
  ('Venezuelano', '26'),
  ('Colombiano', '27'),
  ('Peruano', '28'),
  ('Português', '30'),
  ('Italiano', '31'),
  ('Espanhol', '32'),
  ('Alemão', '33'),
  ('Japonês', '34'),
  ('Chinês', '35'),
  ('Americano', '36'),
  ('Outros', '99')
ON CONFLICT (nome) DO NOTHING;

-- 2. Centros de Custo (CRUD completo)
CREATE TABLE IF NOT EXISTS public.centros_custo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  codigo text,
  descricao text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "centros_custo_auth" ON public.centros_custo;
CREATE POLICY "centros_custo_auth" ON public.centros_custo FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Tipos de Desligamento
CREATE TABLE IF NOT EXISTS public.tipos_desligamento (
  id serial PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  codigo_esocial text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.tipos_desligamento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tipos_desligamento_read" ON public.tipos_desligamento;
CREATE POLICY "tipos_desligamento_read" ON public.tipos_desligamento FOR SELECT TO authenticated USING (true);

INSERT INTO public.tipos_desligamento (nome, codigo_esocial) VALUES
  ('Demissão SEM justa causa - Pedido da Empresa', '01'),
  ('Demissão COM justa causa - Pedido da Empresa', '02'),
  ('Pedido de demissão pelo empregado', '03'),
  ('Término de contrato por prazo determinado', '04'),
  ('Rescisão antecipada pelo empregador', '05'),
  ('Rescisão antecipada pelo empregado', '06'),
  ('Rescisão por culpa recíproca', '07'),
  ('Rescisão por acordo entre as partes (Art. 484-A CLT)', '08'),
  ('Aposentadoria por invalidez', '09'),
  ('Falecimento', '10'),
  ('Término de contrato de experiência', '11'),
  ('Rescisão durante contrato de experiência pelo empregador', '12'),
  ('Rescisão durante contrato de experiência pelo empregado', '13'),
  ('Transferência de empregado', '14'),
  ('Demissão sem justa causa durante experiência', '15'),
  ('Rescisão indireta (Art. 483 CLT)', '16'),
  ('Força maior', '17'),
  ('Extinção da empresa', '18'),
  ('Suspensão de contrato', '19'),
  ('Aposentadoria compulsória', '20'),
  ('Aposentadoria por idade', '21'),
  ('Aposentadoria por tempo de contribuição', '22'),
  ('Nulidade do contrato', '23'),
  ('Exoneração a pedido', '24'),
  ('Demissão por abandono de emprego', '25'),
  ('Acordo judicial', '26')
ON CONFLICT (nome) DO NOTHING;

-- 4. Tipos de Aviso Prévio
CREATE TABLE IF NOT EXISTS public.tipos_aviso_previo (
  id serial PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.tipos_aviso_previo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tipos_aviso_previo_read" ON public.tipos_aviso_previo;
CREATE POLICY "tipos_aviso_previo_read" ON public.tipos_aviso_previo FOR SELECT TO authenticated USING (true);

INSERT INTO public.tipos_aviso_previo (nome) VALUES
  ('Trabalhado'),
  ('Indenizado'),
  ('Desonerado'),
  ('Não aplicável')
ON CONFLICT (nome) DO NOTHING;

-- 5. Tipos de Deficiência
CREATE TABLE IF NOT EXISTS public.tipos_deficiencia (
  id serial PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.tipos_deficiencia ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tipos_deficiencia_read" ON public.tipos_deficiencia;
CREATE POLICY "tipos_deficiencia_read" ON public.tipos_deficiencia FOR SELECT TO authenticated USING (true);

INSERT INTO public.tipos_deficiencia (nome) VALUES
  ('Física'),
  ('Auditiva'),
  ('Visual'),
  ('Mental/Intelectual'),
  ('Múltipla'),
  ('Reabilitado')
ON CONFLICT (nome) DO NOTHING;

-- 6. Tipos de Pagamento
CREATE TABLE IF NOT EXISTS public.tipos_pagamento (
  id serial PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.tipos_pagamento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tipos_pagamento_read" ON public.tipos_pagamento;
CREATE POLICY "tipos_pagamento_read" ON public.tipos_pagamento FOR SELECT TO authenticated USING (true);

INSERT INTO public.tipos_pagamento (nome) VALUES
  ('Salário'),
  ('Pró-labore'),
  ('Distribuição de lucros'),
  ('Bolsa auxílio'),
  ('Comissão')
ON CONFLICT (nome) DO NOTHING;

-- 7. Tipos de Salário
CREATE TABLE IF NOT EXISTS public.tipos_salario (
  id serial PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  codigo_esocial text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.tipos_salario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tipos_salario_read" ON public.tipos_salario;
CREATE POLICY "tipos_salario_read" ON public.tipos_salario FOR SELECT TO authenticated USING (true);

INSERT INTO public.tipos_salario (nome, codigo_esocial) VALUES
  ('Por mês', '1'),
  ('Por hora', '2'),
  ('Por dia', '3'),
  ('Por tarefa', '4'),
  ('Por comissão', '5'),
  ('Não aplicável', '6')
ON CONFLICT (nome) DO NOTHING;

-- 8. Relacionamentos de Dependentes
CREATE TABLE IF NOT EXISTS public.relacionamentos_dependentes (
  id serial PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  descricao text,
  codigo_esocial text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.relacionamentos_dependentes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "relacionamentos_dependentes_read" ON public.relacionamentos_dependentes;
CREATE POLICY "relacionamentos_dependentes_read" ON public.relacionamentos_dependentes FOR SELECT TO authenticated USING (true);

INSERT INTO public.relacionamentos_dependentes (nome, descricao, codigo_esocial) VALUES
  ('Cônjuge', 'Cônjuge', '01'),
  ('Companheiro(a)', 'Companheiro(a) com filho ou vivendo há mais de 5 anos', '02'),
  ('Filho(a) ou enteado(a)', 'Filho(a) ou enteado(a) até 21 anos', '03'),
  ('Filho(a) ou enteado(a) universitário', 'Até 24 anos cursando ensino superior ou escola técnica', '04'),
  ('Filho(a) ou enteado(a) com deficiência', 'Qualquer idade, com incapacidade física ou mental', '06'),
  ('Irmão(ã), neto(a) ou bisneto(a)', 'Sem arrimo dos pais, com guarda judicial, até 21 anos', '07'),
  ('Pais, avós e bisavós', 'Pais, avós e bisavós', '09'),
  ('Menor pobre', 'Criado e educado, até 21 anos, com guarda judicial', '10'),
  ('Incapaz', 'Pessoa absolutamente incapaz da qual seja tutor ou curador', '11'),
  ('Ex-cônjuge', 'Que receba pensão alimentícia', '12'),
  ('Agregado/Outros', 'Sem relação formal de dependência legal', '99')
ON CONFLICT (nome) DO NOTHING;

-- 9. Gêneros no Documento (diferente de identidade de gênero)
CREATE TABLE IF NOT EXISTS public.generos_documento (
  id serial PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  codigo_esocial text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.generos_documento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "generos_documento_read" ON public.generos_documento;
CREATE POLICY "generos_documento_read" ON public.generos_documento FOR SELECT TO authenticated USING (true);

INSERT INTO public.generos_documento (nome, codigo_esocial) VALUES
  ('Masculino', 'M'),
  ('Feminino', 'F')
ON CONFLICT (nome) DO NOTHING;

-- 10. Tipos de Visto (estrangeiros)
CREATE TABLE IF NOT EXISTS public.tipos_visto (
  id serial PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.tipos_visto ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tipos_visto_read" ON public.tipos_visto;
CREATE POLICY "tipos_visto_read" ON public.tipos_visto FOR SELECT TO authenticated USING (true);

INSERT INTO public.tipos_visto (nome) VALUES
  ('B-1'), ('B-2'), ('B-3'), ('B-4'), ('F-1'), ('F-2'),
  ('J-1'), ('J-2'), ('H-1B'), ('L-1'), ('O-1'), ('P-1'),
  ('VITEM I'), ('VITEM II'), ('VITEM III'), ('VITEM IV'), ('VITEM V'),
  ('VIPER'), ('Refugiado'), ('Asilado'), ('Outros')
ON CONFLICT (nome) DO NOTHING;

-- 11. Condições de Ingresso (estrangeiros)
CREATE TABLE IF NOT EXISTS public.condicoes_ingresso (
  id serial PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.condicoes_ingresso ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "condicoes_ingresso_read" ON public.condicoes_ingresso;
CREATE POLICY "condicoes_ingresso_read" ON public.condicoes_ingresso FOR SELECT TO authenticated USING (true);

INSERT INTO public.condicoes_ingresso (nome) VALUES
  ('Refugiado - Permanência no Brasil em razão de reunião familiar'),
  ('Refugiado - Permanência no Brasil em razão de trabalho'),
  ('Solicitante de refúgio'),
  ('Permanência no Brasil em razão de reunião familiar'),
  ('Beneficiado pelo acordo entre países do Mercosul'),
  ('Dependente de agente diplomático ou consular'),
  ('Beneficiado pelo Tratado de Amizade, Cooperação e Consulta'),
  ('Outros')
ON CONFLICT (nome) DO NOTHING;

-- 12. Tempos de Residência (estrangeiros)
CREATE TABLE IF NOT EXISTS public.tempos_residencia (
  id serial PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.tempos_residencia ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tempos_residencia_read" ON public.tempos_residencia;
CREATE POLICY "tempos_residencia_read" ON public.tempos_residencia FOR SELECT TO authenticated USING (true);

INSERT INTO public.tempos_residencia (nome) VALUES
  ('Prazo indeterminado'),
  ('Prazo determinado'),
  ('Prazo determinado - com cláusula de prorrogação')
ON CONFLICT (nome) DO NOTHING;

-- 13. Descrições de Logradouro (estrangeiros)
CREATE TABLE IF NOT EXISTS public.descricoes_logradouro (
  id serial PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.descricoes_logradouro ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "descricoes_logradouro_read" ON public.descricoes_logradouro;
CREATE POLICY "descricoes_logradouro_read" ON public.descricoes_logradouro FOR SELECT TO authenticated USING (true);

INSERT INTO public.descricoes_logradouro (nome) VALUES
  ('Aeroporto'), ('Alameda'), ('Área'), ('Avenida'), ('Beco'),
  ('Bloco'), ('Bosque'), ('Calçada'), ('Caminho'), ('Campo'),
  ('Chácara'), ('Colônia'), ('Condomínio'), ('Distrito'),
  ('Estação'), ('Estrada'), ('Fazenda'), ('Galeria'),
  ('Jardim'), ('Ladeira'), ('Lago'), ('Largura'), ('Loteamento'),
  ('Morro'), ('Núcleo'), ('Parque'), ('Passarela'), ('Pátio'),
  ('Praça'), ('Quadra'), ('Recanto'), ('Residencial'),
  ('Rodovia'), ('Rua'), ('Setor'), ('Sítio'), ('Travessa'),
  ('Trecho'), ('Trevo'), ('Vale'), ('Via'), ('Viaduto'), ('Viela'), ('Vila')
ON CONFLICT (nome) DO NOTHING;

-- 14. Países
CREATE TABLE IF NOT EXISTS public.paises (
  id serial PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  codigo_iso text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.paises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "paises_read" ON public.paises;
CREATE POLICY "paises_read" ON public.paises FOR SELECT TO authenticated USING (true);

INSERT INTO public.paises (nome, codigo_iso) VALUES
  ('Brasil', 'BR'), ('Argentina', 'AR'), ('Bolívia', 'BO'), ('Chile', 'CL'),
  ('Colômbia', 'CO'), ('Equador', 'EC'), ('Guiana', 'GY'), ('Paraguai', 'PY'),
  ('Peru', 'PE'), ('Suriname', 'SR'), ('Uruguai', 'UY'), ('Venezuela', 'VE'),
  ('Estados Unidos', 'US'), ('Canadá', 'CA'), ('México', 'MX'),
  ('Portugal', 'PT'), ('Espanha', 'ES'), ('Itália', 'IT'), ('Alemanha', 'DE'),
  ('França', 'FR'), ('Reino Unido', 'GB'), ('Japão', 'JP'), ('China', 'CN'),
  ('Índia', 'IN'), ('Coreia do Sul', 'KR'), ('Austrália', 'AU'),
  ('Angola', 'AO'), ('Moçambique', 'MZ'), ('Cabo Verde', 'CV'),
  ('Guiné-Bissau', 'GW'), ('São Tomé e Príncipe', 'ST'), ('Timor-Leste', 'TL'),
  ('Outros', 'XX')
ON CONFLICT (nome) DO NOTHING;

-- 15. Categorias de Trabalhador
CREATE TABLE IF NOT EXISTS public.categorias_trabalhador (
  id serial PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  codigo_esocial text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.categorias_trabalhador ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categorias_trabalhador_read" ON public.categorias_trabalhador;
CREATE POLICY "categorias_trabalhador_read" ON public.categorias_trabalhador FOR SELECT TO authenticated USING (true);

INSERT INTO public.categorias_trabalhador (nome, codigo_esocial) VALUES
  ('Empregado - Geral', '101'),
  ('Empregado - Trabalhador rural por pequeno prazo', '102'),
  ('Empregado - Aprendiz', '103'),
  ('Empregado - Doméstico', '104'),
  ('Empregado - Contrato a termo firmado', '105'),
  ('Trabalhador temporário', '106'),
  ('Empregado - Contrato de trabalho intermitente', '111'),
  ('Trabalhador avulso portuário', '201'),
  ('Trabalhador avulso não portuário', '202'),
  ('Servidor público titular de cargo efetivo', '301'),
  ('Servidor público ocupante de cargo exclusivo em comissão', '302'),
  ('Agente público', '303'),
  ('Servidor público temporário', '306'),
  ('Militar efetivo', '308'),
  ('Contribuinte individual - Autônomo', '701'),
  ('Contribuinte individual - Transportador autônomo', '711'),
  ('Contribuinte individual - Diretor não empregado', '721'),
  ('Contribuinte individual - Cooperado', '731'),
  ('Contribuinte individual - Microempreendedor Individual', '741'),
  ('Estagiário', '901'),
  ('Médico residente', '902'),
  ('Bolsista', '903'),
  ('Beneficiário de Prestação Continuada', '904')
ON CONFLICT (nome) DO NOTHING;

-- 16. Relacionamentos de Contato de Emergência
CREATE TABLE IF NOT EXISTS public.relacionamentos_contato_emergencia (
  id serial PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.relacionamentos_contato_emergencia ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "relacionamentos_contato_emergencia_read" ON public.relacionamentos_contato_emergencia;
CREATE POLICY "relacionamentos_contato_emergencia_read" ON public.relacionamentos_contato_emergencia FOR SELECT TO authenticated USING (true);

INSERT INTO public.relacionamentos_contato_emergencia (nome) VALUES
  ('Pai'), ('Mãe'), ('Cônjuge'), ('Amigo'), ('Irmão(ã)'),
  ('Filho(a)'), ('Avô(ó)'), ('Tio(a)'), ('Primo(a)'), ('Vizinho(a)'), ('Outro')
ON CONFLICT (nome) DO NOTHING;

-- =============================================================
-- ONDA 2: TABELAS FUNCIONAIS
-- =============================================================

-- 17. Contas Bancárias (múltiplas por colaborador)
CREATE TABLE IF NOT EXISTS public.contas_bancarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  banco_nome text,
  banco_codigo text,
  agencia text,
  conta text,
  digito text,
  tipo_conta text DEFAULT 'corrente',
  pix_chave text,
  pix_tipo text,
  modalidade text DEFAULT 'PF',
  principal boolean DEFAULT false,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contas_bancarias_auth" ON public.contas_bancarias;
CREATE POLICY "contas_bancarias_auth" ON public.contas_bancarias FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 18. Dados de Estagiário
CREATE TABLE IF NOT EXISTS public.dados_estagiario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  data_inicio text,
  data_fim text,
  categoria_estagio text,
  obrigatorio boolean DEFAULT false,
  area_atuacao text,
  instituicao_nome text,
  instituicao_cnpj text,
  instituicao_cep text,
  instituicao_endereco text,
  instituicao_numero text,
  instituicao_complemento text,
  instituicao_bairro text,
  instituicao_cidade text,
  instituicao_uf text,
  supervisor_id uuid REFERENCES public.colaboradores(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.dados_estagiario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dados_estagiario_auth" ON public.dados_estagiario;
CREATE POLICY "dados_estagiario_auth" ON public.dados_estagiario FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 19. Documentos Pessoais Arquivos (upload tipado)
CREATE TABLE IF NOT EXISTS public.documentos_pessoais_arquivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  tipo_documento text NOT NULL, -- cpf, ctps, rg, cnh, reservista, titulo_eleitor
  arquivo_url text,
  arquivo_nome text,
  arquivo_tamanho bigint,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.documentos_pessoais_arquivos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "documentos_pessoais_auth" ON public.documentos_pessoais_arquivos;
CREATE POLICY "documentos_pessoais_auth" ON public.documentos_pessoais_arquivos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 20. Férias Aprovações (workflow)
CREATE TABLE IF NOT EXISTS public.ferias_aprovacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferias_id uuid NOT NULL REFERENCES public.ferias(id) ON DELETE CASCADE,
  tipo text NOT NULL, -- 'supervisor', 'rh', 'contabilidade', 'assinatura'
  aprovador_id uuid,
  status text DEFAULT 'pendente', -- pendente, aprovado, rejeitado
  data_acao timestamptz,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.ferias_aprovacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ferias_aprovacoes_auth" ON public.ferias_aprovacoes;
CREATE POLICY "ferias_aprovacoes_auth" ON public.ferias_aprovacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 21. Férias Arquivos
CREATE TABLE IF NOT EXISTS public.ferias_arquivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferias_id uuid NOT NULL REFERENCES public.ferias(id) ON DELETE CASCADE,
  nome text NOT NULL,
  arquivo_url text,
  assinavel boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.ferias_arquivos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ferias_arquivos_auth" ON public.ferias_arquivos;
CREATE POLICY "ferias_arquivos_auth" ON public.ferias_arquivos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 22. Dependentes Benefícios (vinculação)
CREATE TABLE IF NOT EXISTS public.dependentes_beneficios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dependente_id uuid NOT NULL REFERENCES public.dependentes(id) ON DELETE CASCADE,
  beneficio_id uuid NOT NULL REFERENCES public.beneficios(id) ON DELETE CASCADE,
  valor_dependente numeric(12,2) DEFAULT 0,
  valor_empresa numeric(12,2) DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(dependente_id, beneficio_id)
);
ALTER TABLE public.dependentes_beneficios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dependentes_beneficios_auth" ON public.dependentes_beneficios;
CREATE POLICY "dependentes_beneficios_auth" ON public.dependentes_beneficios FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 23. Motivos de Falta/Afastamento
CREATE TABLE IF NOT EXISTS public.motivos_afastamento (
  id serial PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  tipo text, -- falta, afastamento
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.motivos_afastamento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "motivos_afastamento_read" ON public.motivos_afastamento;
CREATE POLICY "motivos_afastamento_read" ON public.motivos_afastamento FOR SELECT TO authenticated USING (true);

INSERT INTO public.motivos_afastamento (nome, tipo) VALUES
  ('Doença', 'afastamento'),
  ('Acidente de trabalho', 'afastamento'),
  ('Licença maternidade', 'afastamento'),
  ('Licença paternidade', 'afastamento'),
  ('Serviço militar', 'afastamento'),
  ('Licença não remunerada', 'afastamento'),
  ('Mandato sindical', 'afastamento'),
  ('Férias', 'afastamento'),
  ('Falta justificada', 'falta'),
  ('Falta injustificada', 'falta'),
  ('Atestado médico', 'falta'),
  ('Atraso', 'falta'),
  ('Saída antecipada', 'falta'),
  ('Convocação eleitoral', 'falta'),
  ('Casamento (Gala)', 'falta'),
  ('Óbito familiar (Nojo)', 'falta'),
  ('Doação de sangue', 'falta'),
  ('Alistamento eleitoral', 'falta'),
  ('Comparecimento em juízo', 'falta'),
  ('Acompanhamento médico de dependente', 'falta'),
  ('Exame vestibular', 'falta')
ON CONFLICT (nome) DO NOTHING;

-- =============================================================
-- ONDA 2: ALTERAÇÕES EM TABELAS EXISTENTES
-- =============================================================

-- Adicionar campos ao beneficios para V2
ALTER TABLE public.beneficios ADD COLUMN IF NOT EXISTS valor_empresa numeric(12,2) DEFAULT 0;
ALTER TABLE public.beneficios ADD COLUMN IF NOT EXISTS valor_colaborador numeric(12,2) DEFAULT 0;
ALTER TABLE public.beneficios ADD COLUMN IF NOT EXISTS operadora text;
ALTER TABLE public.beneficios ADD COLUMN IF NOT EXISTS metodo_pagamento text;

-- Adicionar campos de workflow às férias
ALTER TABLE public.ferias ADD COLUMN IF NOT EXISTS justificativa text;
ALTER TABLE public.ferias ADD COLUMN IF NOT EXISTS enviado_contabilidade boolean DEFAULT false;
ALTER TABLE public.ferias ADD COLUMN IF NOT EXISTS saldo_gasto integer;
ALTER TABLE public.ferias ADD COLUMN IF NOT EXISTS ferias_coletiva_id uuid;

-- Estruturar desligamentos com referências
ALTER TABLE public.desligamentos ADD COLUMN IF NOT EXISTS tipo_desligamento_id integer REFERENCES public.tipos_desligamento(id);
ALTER TABLE public.desligamentos ADD COLUMN IF NOT EXISTS tipo_aviso_previo_id integer REFERENCES public.tipos_aviso_previo(id);
ALTER TABLE public.desligamentos ADD COLUMN IF NOT EXISTS data_aviso_previo text;
ALTER TABLE public.desligamentos ADD COLUMN IF NOT EXISTS quebra_contrato boolean DEFAULT false;
ALTER TABLE public.desligamentos ADD COLUMN IF NOT EXISTS remover_beneficios boolean DEFAULT false;
ALTER TABLE public.desligamentos ADD COLUMN IF NOT EXISTS data_remocao_acesso text;
ALTER TABLE public.desligamentos ADD COLUMN IF NOT EXISTS novo_supervisor_id uuid;
ALTER TABLE public.desligamentos ADD COLUMN IF NOT EXISTS etapa text DEFAULT 'iniciado';
ALTER TABLE public.desligamentos ADD COLUMN IF NOT EXISTS data_contabilidade text;

-- Adicionar referências de tabelas ao colaboradores  
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS nacionalidade_id integer REFERENCES public.nacionalidades(id);
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS centro_custo_id uuid REFERENCES public.centros_custo(id);
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS tipo_pagamento_id integer REFERENCES public.tipos_pagamento(id);
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS tipo_salario_id integer REFERENCES public.tipos_salario(id);
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS categoria_trabalhador_id integer REFERENCES public.categorias_trabalhador(id);
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS genero_documento_id integer REFERENCES public.generos_documento(id);

-- Adicionar referência de tipo deficiência na tabela deficiencia_colaborador (se existir)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deficiencia_colaborador' AND table_schema = 'public') THEN
    EXECUTE 'ALTER TABLE public.deficiencia_colaborador ADD COLUMN IF NOT EXISTS tipo_deficiencia_id integer REFERENCES public.tipos_deficiencia(id)';
  END IF;
END $$;

-- Adicionar referência nos dependentes
ALTER TABLE public.dependentes ADD COLUMN IF NOT EXISTS relacionamento_id integer REFERENCES public.relacionamentos_dependentes(id);
ALTER TABLE public.dependentes ADD COLUMN IF NOT EXISTS ir boolean DEFAULT false;
ALTER TABLE public.dependentes ADD COLUMN IF NOT EXISTS salario_familia boolean DEFAULT false;
ALTER TABLE public.dependentes ADD COLUMN IF NOT EXISTS estrangeiro boolean DEFAULT false;
ALTER TABLE public.dependentes ADD COLUMN IF NOT EXISTS genero_documento_id integer REFERENCES public.generos_documento(id);
ALTER TABLE public.dependentes ADD COLUMN IF NOT EXISTS escolaridade text;
ALTER TABLE public.dependentes ADD COLUMN IF NOT EXISTS deficiente boolean DEFAULT false;

-- Adicionar referências nos contatos de emergência
ALTER TABLE public.contatos_emergencia ADD COLUMN IF NOT EXISTS relacionamento_id integer REFERENCES public.relacionamentos_contato_emergencia(id);
ALTER TABLE public.contatos_emergencia ADD COLUMN IF NOT EXISTS celular text;
ALTER TABLE public.contatos_emergencia ADD COLUMN IF NOT EXISTS telefone_trabalho text;

-- Adicionar referências nos dados de estrangeiro
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dados_estrangeiro' AND table_schema = 'public') THEN
    EXECUTE 'ALTER TABLE public.dados_estrangeiro ADD COLUMN IF NOT EXISTS tipo_visto_id integer REFERENCES public.tipos_visto(id)';
    EXECUTE 'ALTER TABLE public.dados_estrangeiro ADD COLUMN IF NOT EXISTS condicao_ingresso_id integer REFERENCES public.condicoes_ingresso(id)';
    EXECUTE 'ALTER TABLE public.dados_estrangeiro ADD COLUMN IF NOT EXISTS tempo_residencia_id integer REFERENCES public.tempos_residencia(id)';
    EXECUTE 'ALTER TABLE public.dados_estrangeiro ADD COLUMN IF NOT EXISTS descricao_logradouro_id integer REFERENCES public.descricoes_logradouro(id)';
    EXECUTE 'ALTER TABLE public.dados_estrangeiro ADD COLUMN IF NOT EXISTS pais_id integer REFERENCES public.paises(id)';
  END IF;
END $$;
