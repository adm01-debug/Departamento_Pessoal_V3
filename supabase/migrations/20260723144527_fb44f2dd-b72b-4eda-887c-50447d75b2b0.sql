
-- =========================================================
-- Tabela: contrato_templates
-- =========================================================
CREATE TABLE public.contrato_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo_contrato TEXT NOT NULL CHECK (tipo_contrato IN (
    'clt_indeterminado','clt_experiencia','clt_determinado',
    'estagio','pj','temporario','intermitente','jovem_aprendiz'
  )),
  cargo_id UUID REFERENCES public.cargos(id) ON DELETE SET NULL,
  departamento_id UUID REFERENCES public.departamentos(id) ON DELETE SET NULL,
  versao INT NOT NULL DEFAULT 1,
  ativo BOOLEAN NOT NULL DEFAULT true,
  corpo_html TEXT NOT NULL,
  clausulas_condicionais JSONB NOT NULL DEFAULT '[]'::jsonb,
  variaveis_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contrato_templates_empresa ON public.contrato_templates(empresa_id) WHERE ativo;
CREATE INDEX idx_contrato_templates_cargo   ON public.contrato_templates(cargo_id) WHERE ativo;
CREATE UNIQUE INDEX uq_contrato_templates_default
  ON public.contrato_templates(empresa_id, tipo_contrato, COALESCE(cargo_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE ativo;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contrato_templates TO authenticated;
GRANT ALL ON public.contrato_templates TO service_role;
ALTER TABLE public.contrato_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contrato_templates_read"
  ON public.contrato_templates FOR SELECT TO authenticated
  USING (public.user_belongs_to_empresa(auth.uid(), empresa_id));

CREATE POLICY "contrato_templates_write"
  ON public.contrato_templates FOR ALL TO authenticated
  USING (
    public.user_belongs_to_empresa(auth.uid(), empresa_id)
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'rh'))
  )
  WITH CHECK (
    public.user_belongs_to_empresa(auth.uid(), empresa_id)
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'rh'))
  );

CREATE TRIGGER trg_contrato_templates_updated
  BEFORE UPDATE ON public.contrato_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Tabela: contratos_gerados
-- =========================================================
CREATE TABLE public.contratos_gerados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  admissao_id UUID REFERENCES public.admissoes(id) ON DELETE CASCADE,
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.contrato_templates(id) ON DELETE RESTRICT,
  template_versao INT NOT NULL,
  variaveis_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  html_final TEXT,
  storage_path TEXT,
  sha256 TEXT,
  status TEXT NOT NULL DEFAULT 'gerado' CHECK (status IN ('rascunho','gerado','enviado','assinado','cancelado')),
  assinado_em TIMESTAMPTZ,
  assinatura_metadata JSONB,
  gerado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT contratos_gerados_alvo CHECK (admissao_id IS NOT NULL OR colaborador_id IS NOT NULL)
);

CREATE INDEX idx_contratos_gerados_empresa    ON public.contratos_gerados(empresa_id);
CREATE INDEX idx_contratos_gerados_admissao   ON public.contratos_gerados(admissao_id);
CREATE INDEX idx_contratos_gerados_colaborador ON public.contratos_gerados(colaborador_id);
CREATE INDEX idx_contratos_gerados_hash       ON public.contratos_gerados(sha256);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratos_gerados TO authenticated;
GRANT ALL ON public.contratos_gerados TO service_role;
ALTER TABLE public.contratos_gerados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contratos_gerados_read"
  ON public.contratos_gerados FOR SELECT TO authenticated
  USING (public.user_belongs_to_empresa(auth.uid(), empresa_id));

CREATE POLICY "contratos_gerados_write"
  ON public.contratos_gerados FOR ALL TO authenticated
  USING (
    public.user_belongs_to_empresa(auth.uid(), empresa_id)
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'rh'))
  )
  WITH CHECK (
    public.user_belongs_to_empresa(auth.uid(), empresa_id)
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'rh'))
  );

CREATE TRIGGER trg_contratos_gerados_updated
  BEFORE UPDATE ON public.contratos_gerados
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Storage policies (bucket 'contratos-trabalho')
-- =========================================================
CREATE POLICY "contratos-trabalho read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'contratos-trabalho'
    AND public.user_belongs_to_empresa(
      auth.uid(),
      NULLIF(split_part(name, '/', 1), '')::uuid
    )
  );

CREATE POLICY "contratos-trabalho write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'contratos-trabalho'
    AND public.user_belongs_to_empresa(
      auth.uid(),
      NULLIF(split_part(name, '/', 1), '')::uuid
    )
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'rh'))
  );

-- =========================================================
-- RPC: resolver template para uma admissão
-- =========================================================
CREATE OR REPLACE FUNCTION public.contrato_resolver_template(p_admissao_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE
  v_empresa UUID; v_cargo TEXT; v_cargo_id UUID; v_tipo TEXT; v_template UUID;
BEGIN
  SELECT a.empresa_id, a.cargo, COALESCE((a.metadata->>'tipo_contrato'),'clt_indeterminado')
    INTO v_empresa, v_cargo, v_tipo
  FROM public.admissoes a WHERE a.id = p_admissao_id;
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Admissão % não encontrada', p_admissao_id; END IF;
  IF NOT public.user_belongs_to_empresa(auth.uid(), v_empresa) THEN
    RAISE EXCEPTION 'Sem acesso a esta admissão';
  END IF;

  SELECT id INTO v_cargo_id FROM public.cargos
    WHERE empresa_id = v_empresa AND lower(nome) = lower(v_cargo) LIMIT 1;

  -- 1) match exato (empresa, tipo, cargo)
  SELECT id INTO v_template FROM public.contrato_templates
    WHERE empresa_id = v_empresa AND tipo_contrato = v_tipo
      AND cargo_id = v_cargo_id AND ativo LIMIT 1;
  -- 2) fallback: mesmo tipo, sem cargo
  IF v_template IS NULL THEN
    SELECT id INTO v_template FROM public.contrato_templates
      WHERE empresa_id = v_empresa AND tipo_contrato = v_tipo
        AND cargo_id IS NULL AND ativo LIMIT 1;
  END IF;
  RETURN v_template;
END; $$;

GRANT EXECUTE ON FUNCTION public.contrato_resolver_template(UUID) TO authenticated;

-- =========================================================
-- RPC: montar variáveis para renderização
-- =========================================================
CREATE OR REPLACE FUNCTION public.contrato_montar_variaveis(p_admissao_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE v JSONB;
BEGIN
  SELECT jsonb_build_object(
    'admissao', to_jsonb(a),
    'empresa', to_jsonb(e),
    'cargo', to_jsonb(c),
    'departamento', to_jsonb(d),
    'gerado_em', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')
  )
  INTO v
  FROM public.admissoes a
  LEFT JOIN public.empresas e ON e.id = a.empresa_id
  LEFT JOIN public.cargos c ON c.empresa_id = a.empresa_id AND lower(c.nome) = lower(a.cargo)
  LEFT JOIN public.departamentos d ON d.empresa_id = a.empresa_id AND lower(d.nome) = lower(a.departamento)
  WHERE a.id = p_admissao_id;

  IF v IS NULL THEN RAISE EXCEPTION 'Admissão % não encontrada', p_admissao_id; END IF;
  IF NOT public.user_belongs_to_empresa(auth.uid(), (v->'admissao'->>'empresa_id')::uuid) THEN
    RAISE EXCEPTION 'Sem acesso a esta admissão';
  END IF;
  RETURN v;
END; $$;

GRANT EXECUTE ON FUNCTION public.contrato_montar_variaveis(UUID) TO authenticated;

-- =========================================================
-- Seeds: 5 modelos padrão por empresa
-- =========================================================
INSERT INTO public.contrato_templates (empresa_id, nome, tipo_contrato, corpo_html, descricao, clausulas_condicionais)
SELECT e.id, 'CLT Prazo Indeterminado — Padrão', 'clt_indeterminado',
$html$<h1 style="text-align:center">CONTRATO INDIVIDUAL DE TRABALHO — PRAZO INDETERMINADO</h1>
<p><strong>EMPREGADOR:</strong> {{empresa.razao_social}}, CNPJ {{empresa.cnpj}}, com sede em {{empresa.logradouro}}, {{empresa.numero}} — {{empresa.cidade}}/{{empresa.uf}}.</p>
<p><strong>EMPREGADO:</strong> {{admissao.nome}}, CPF {{admissao.cpf}}.</p>
<h3>Cláusula 1ª — Função</h3>
<p>O EMPREGADO é contratado para exercer a função de <strong>{{admissao.cargo}}</strong>, no departamento de {{admissao.departamento}}, nos termos do Art. 442 da CLT.</p>
<h3>Cláusula 2ª — Remuneração</h3>
<p>Salário mensal bruto de <strong>R$ {{admissao.salario_proposto}}</strong>, pago até o 5º dia útil do mês subsequente, na forma do Art. 459 da CLT.</p>
<h3>Cláusula 3ª — Vigência</h3>
<p>Contrato por prazo indeterminado a partir de {{admissao.data_prevista}}.</p>
<h3>Cláusula 4ª — Jornada</h3>
<p>Jornada de 44h semanais, respeitados intervalos e descansos legais (Art. 58 e 66 CLT).</p>
<h3>Cláusula 5ª — Confidencialidade e LGPD</h3>
<p>O EMPREGADO obriga-se a guardar sigilo sobre informações confidenciais e autoriza o tratamento de dados pessoais para gestão de RH, benefícios e obrigações legais (Lei 13.709/2018).</p>$html$,
'Modelo padrão CLT prazo indeterminado (Art. 442 CLT)', '[]'::jsonb
FROM public.empresas e
ON CONFLICT DO NOTHING;

INSERT INTO public.contrato_templates (empresa_id, nome, tipo_contrato, corpo_html, descricao)
SELECT e.id, 'CLT Experiência 45+45 dias', 'clt_experiencia',
$html$<h1 style="text-align:center">CONTRATO DE EXPERIÊNCIA (CLT Art. 443 §2º c)</h1>
<p><strong>EMPREGADOR:</strong> {{empresa.razao_social}}, CNPJ {{empresa.cnpj}}.</p>
<p><strong>EMPREGADO:</strong> {{admissao.nome}}, CPF {{admissao.cpf}}.</p>
<h3>Cláusula 1ª — Função e Salário</h3>
<p>Função: <strong>{{admissao.cargo}}</strong>. Salário mensal: R$ {{admissao.salario_proposto}}.</p>
<h3>Cláusula 2ª — Prazo</h3>
<p>Contrato de experiência com prazo inicial de <strong>45 dias</strong> a partir de {{admissao.data_prevista}}, prorrogável por igual período, totalizando no máximo 90 dias (CLT Art. 445 §único).</p>
<h3>Cláusula 3ª — Conversão</h3>
<p>Findo o prazo sem manifestação, o contrato converte-se automaticamente em prazo indeterminado (CLT Art. 451).</p>
<h3>Cláusula 4ª — LGPD</h3>
<p>Aplicam-se as disposições da Lei 13.709/2018 ao tratamento de dados pessoais.</p>$html$,
'Contrato de experiência 45+45 dias (Art. 443/445 CLT)'
FROM public.empresas e ON CONFLICT DO NOTHING;

INSERT INTO public.contrato_templates (empresa_id, nome, tipo_contrato, corpo_html, descricao)
SELECT e.id, 'Estágio (Lei 11.788/2008)', 'estagio',
$html$<h1 style="text-align:center">TERMO DE COMPROMISSO DE ESTÁGIO</h1>
<p><strong>PARTE CONCEDENTE:</strong> {{empresa.razao_social}}, CNPJ {{empresa.cnpj}}.</p>
<p><strong>ESTAGIÁRIO:</strong> {{admissao.nome}}, CPF {{admissao.cpf}}.</p>
<h3>Cláusula 1ª — Objeto</h3>
<p>O presente termo tem por objeto formalizar estágio nos termos da Lei nº 11.788/2008, sem vínculo empregatício.</p>
<h3>Cláusula 2ª — Área e Jornada</h3>
<p>Área: {{admissao.cargo}}. Jornada máxima de 30h semanais.</p>
<h3>Cláusula 3ª — Bolsa-Auxílio</h3>
<p>Bolsa mensal: R$ {{admissao.salario_proposto}} + auxílio-transporte.</p>
<h3>Cláusula 4ª — Vigência</h3>
<p>Início em {{admissao.data_prevista}}, com duração máxima de 2 anos.</p>$html$,
'Termo de estágio (Lei 11.788/2008)'
FROM public.empresas e ON CONFLICT DO NOTHING;

INSERT INTO public.contrato_templates (empresa_id, nome, tipo_contrato, corpo_html, descricao)
SELECT e.id, 'Prestação de Serviços — PJ', 'pj',
$html$<h1 style="text-align:center">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h1>
<p><strong>CONTRATANTE:</strong> {{empresa.razao_social}}, CNPJ {{empresa.cnpj}}.</p>
<p><strong>CONTRATADO:</strong> {{admissao.nome}}, CPF/CNPJ {{admissao.cpf}}.</p>
<h3>Cláusula 1ª — Objeto</h3>
<p>Prestação autônoma de serviços de <strong>{{admissao.cargo}}</strong>, sem vínculo empregatício, nos termos dos Arts. 593 a 609 do Código Civil.</p>
<h3>Cláusula 2ª — Remuneração</h3>
<p>Valor mensal: R$ {{admissao.salario_proposto}}, mediante emissão de nota fiscal.</p>
<h3>Cláusula 3ª — Vigência</h3>
<p>Início em {{admissao.data_prevista}}, por prazo indeterminado, com rescisão mediante aviso de 30 dias.</p>$html$,
'Prestação de serviços autônoma (PJ)'
FROM public.empresas e ON CONFLICT DO NOTHING;

INSERT INTO public.contrato_templates (empresa_id, nome, tipo_contrato, corpo_html, descricao)
SELECT e.id, 'Jovem Aprendiz (Lei 10.097/2000)', 'jovem_aprendiz',
$html$<h1 style="text-align:center">CONTRATO DE APRENDIZAGEM</h1>
<p><strong>EMPREGADOR:</strong> {{empresa.razao_social}}, CNPJ {{empresa.cnpj}}.</p>
<p><strong>APRENDIZ:</strong> {{admissao.nome}}, CPF {{admissao.cpf}}.</p>
<h3>Cláusula 1ª — Objeto</h3>
<p>Contrato de aprendizagem nos termos da Lei 10.097/2000 e Decreto 5.598/2005.</p>
<h3>Cláusula 2ª — Jornada e Remuneração</h3>
<p>Jornada máxima de 6h/dia. Remuneração mensal: R$ {{admissao.salario_proposto}}.</p>
<h3>Cláusula 3ª — Vigência</h3>
<p>Início em {{admissao.data_prevista}}, com duração máxima de 2 anos (Art. 428 §3º CLT).</p>$html$,
'Contrato de aprendizagem (Lei 10.097/2000)'
FROM public.empresas e ON CONFLICT DO NOTHING;
