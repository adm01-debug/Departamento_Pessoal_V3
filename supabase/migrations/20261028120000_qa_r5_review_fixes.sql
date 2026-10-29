-- ================================================================
-- QA round-5 — achados do Devin Review (PR #301) + review round 2 (#305)
--
-- BUG-2: INSERT em lgpd_solicitacoes sem empresa_id → a listagem LGPD
--        filtra por empresa e a conclusão nunca aparecia no histórico.
--        + backfill das conclusões antigas órfãs de empresa_id.
-- SEC-1: anonimização deixava PII no cadastro (nascimento, endereço,
--        documentos civis, dados bancários do próprio cadastro, dados
--        sensíveis do art. 11, vínculos familiares/sociais, observações
--        e metadata anterior). Para apagar de verdade, os NOT NULL de
--        data_nascimento/sexo/estado_civil (colaboradores) e
--        data_nascimento (dependentes) precisam cair — não existe valor
--        anônimo válido nos enums (sexo só tem masculino/feminino).
-- SEC-2: esocial_eventos vinculados por dados.colaborador.id,
--        dados.colaboradorId, admissao_id (via admissoes.cpf) ou a
--        coluna legada colaborador_id (replay) passavam batido, e o
--        JSON `dados` mantinha PII. Agora dados/xml são anulados por
--        completo — scrub parcial sempre deixaria algum campo.
-- SEC-3: admissoes vinculadas (mesmo CPF) mantinham nome/CPF/nascimento.
-- ================================================================

-- (0) NOT NULL que impedia a anonimização real (abortava a função e a
--     fila LGPD marcava eternamente pendente). Dropping NOT NULL é
--     relaxação segura — writers não dependem dele.
ALTER TABLE public.colaboradores ALTER COLUMN data_nascimento DROP NOT NULL;
ALTER TABLE public.colaboradores ALTER COLUMN sexo DROP NOT NULL;
ALTER TABLE public.colaboradores ALTER COLUMN estado_civil DROP NOT NULL;
ALTER TABLE public.dependentes   ALTER COLUMN data_nascimento DROP NOT NULL;

-- (0b) Reconcilia o histórico LGPD: conclusões gravadas antes do fix do
--      empresa_id ficam visíveis na listagem por empresa.
UPDATE public.lgpd_solicitacoes s
SET empresa_id = c.empresa_id
FROM public.colaboradores c
WHERE s.colaborador_id = c.id
  AND s.empresa_id IS NULL;

-- (1) anonimizar_dados_pessoais — reescrita completa
CREATE OR REPLACE FUNCTION public.anonimizar_dados_pessoais(target_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_anon_cpf TEXT;
  v_cpf TEXT;
  v_empresa UUID;
  v_esocial_retidos BIGINT := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem executar apagamento LGPD' USING ERRCODE = '42501';
  END IF;

  -- Captura CPF/empresa ANTES da anonimização: o CPF original localiza os
  -- eventos eSocial e a admissão (admissoes não tem colaborador_id no
  -- canônico — o vínculo é por cpf).
  SELECT cpf, empresa_id INTO v_cpf, v_empresa
  FROM public.colaboradores WHERE id = target_id;
  v_cpf := NULLIF(regexp_replace(COALESCE(v_cpf, ''), '[^0-9]', '', 'g'), '');

  -- CPF determinístico por registro: a versão canônica antiga gravava a
  -- constante '000.000.000-00' e violava o UNIQUE na 2ª anonimização.
  v_anon_cpf := LPAD(
    ((('x' || substr(md5(target_id::text || 'lgpd-anon'), 1, 15))::bit(60)::bigint) % 100000000000)::text,
    11, '0'
  );

  UPDATE public.colaboradores
  SET
    -- identidade
    nome_completo = 'COLABORADOR ANONIMIZADO (LGPD)',
    nome_nascimento = NULL,
    nome_social = NULL,
    nome_mae = 'ANONIMIZADO',
    nome_pai = NULL,
    cpf = v_anon_cpf,
    rg = NULL, rg_orgao_emissor = NULL, rg_uf = NULL,
    rg_data_emissao = NULL, rg_data_validade = NULL,
    pis_pasep = NULL,
    identificador_tipo = NULL, identificador_validade = NULL,
    -- documentos civis
    ctps_numero = NULL, ctps_serie = NULL, ctps_uf = NULL, ctps_data_emissao = NULL,
    titulo_eleitor = NULL, titulo_zona = NULL, titulo_secao = NULL,
    certificado_reservista = NULL,
    cnh_numero = NULL, cnh_categoria = NULL, cnh_validade = NULL,
    inscricao_orgao_classe = NULL, conselho_profissional = NULL,
    -- atributos pessoais e dados sensíveis (art. 11 LGPD)
    data_nascimento = NULL, sexo = NULL, estado_civil = NULL,
    nacionalidade = NULL, nacionalidade_id = NULL,
    naturalidade_cidade = NULL, naturalidade_uf = NULL, pais_nascimento = NULL,
    etnia = NULL, identidade_genero = NULL, genero_documento_id = NULL,
    pronomes = NULL, tipo_sanguineo = NULL,
    escolaridade = NULL, formacao = NULL, cursos_certificacoes = NULL,
    data_exame_admissional = NULL, seguro_desemprego = NULL,
    -- contato e redes
    email = 'anonimo+' || target_id::text || '@anonimizado.invalid',
    email_pessoal = NULL, email_corporativo = NULL,
    telefone = NULL, telefone_residencial = NULL, celular = NULL,
    whatsapp = NULL, instagram = NULL, facebook = NULL,
    linkedin = NULL, tiktok = NULL,
    -- endereço completo
    cep = NULL, logradouro = NULL, numero = NULL, complemento = NULL,
    bairro = NULL, cidade = NULL, uf = NULL,
    -- cônjuge
    conjuge_nome = NULL, conjuge_cpf = NULL,
    conjuge_data_nascimento = NULL, conjuge_telefone = NULL,
    -- dados bancários no próprio cadastro (espelham contas_bancarias)
    banco_codigo = NULL, banco_nome = NULL, agencia = NULL, conta = NULL,
    tipo_conta = NULL, pix_tipo = NULL, pix_chave = NULL,
    -- biometria/imagem
    foto_url = NULL, foto_referencia_url = NULL,
    -- texto livre e metadata: substituídos (não mergeados) — podiam conter PII
    observacoes = NULL,
    metadata = '{"lgpd_anonimizado": true}'::jsonb,
    updated_at = now()
  WHERE id = target_id;

  UPDATE public.contas_bancarias
  SET banco_nome = NULL, banco_codigo = NULL, agencia = NULL, agencia_digito = NULL,
      conta = NULL, digito = NULL, pix_chave = NULL, pix_tipo = NULL
  WHERE colaborador_id = target_id;

  UPDATE public.dependentes
  SET nome = 'DEPENDENTE ANONIMIZADO (LGPD)', cpf = NULL, data_nascimento = NULL,
      escolaridade = NULL, grau_parentesco = NULL,
      incapacidade_fisica_mental = NULL, deficiente = NULL
  WHERE colaborador_id = target_id;

  DELETE FROM public.documentos_colaborador WHERE colaborador_id = target_id;

  -- esocial_eventos: vínculo por dados->>'colaborador_id',
  -- dados->>'colaboradorId', dados->'colaborador'->>'id' ou admissao_id
  -- (via admissoes.cpf DO MESMO tenant). XMLs e o JSON dados são anulados
  -- por completo — scrub parcial sempre deixava PII residual.
  -- Eventos já transmitidos (recibo/id_recibo) são imutáveis por trigger
  -- `impedir_alteracao_esocial_transmitido` e retidos por obrigação fiscal
  -- (LGPD art. 16 III) — contados, pulados, nunca abortamos a fila.
  SELECT count(*) INTO v_esocial_retidos
  FROM public.esocial_eventos e
  WHERE (e.recibo IS NOT NULL OR e.id_recibo IS NOT NULL)
    AND (e.empresa_id IS NULL OR e.empresa_id = v_empresa)
    AND (e.dados->>'colaborador_id' = target_id::text
         OR e.dados->>'colaboradorId' = target_id::text
         OR e.dados->'colaborador'->>'id' = target_id::text
         OR (v_cpf IS NOT NULL AND e.admissao_id IN (
              SELECT a.id FROM public.admissoes a
              WHERE regexp_replace(COALESCE(a.cpf, ''), '[^0-9]', '', 'g') = v_cpf
                AND (a.empresa_id IS NULL OR a.empresa_id = v_empresa)
            )));

  UPDATE public.esocial_eventos e
  SET xml_envio = NULL, xml_retorno = NULL, xml = NULL, dados = NULL
  WHERE e.recibo IS NULL AND e.id_recibo IS NULL
    AND (e.empresa_id IS NULL OR e.empresa_id = v_empresa)
    AND (e.dados->>'colaborador_id' = target_id::text
         OR e.dados->>'colaboradorId' = target_id::text
         OR e.dados->'colaborador'->>'id' = target_id::text
         OR (v_cpf IS NOT NULL AND e.admissao_id IN (
              SELECT a.id FROM public.admissoes a
              WHERE regexp_replace(COALESCE(a.cpf, ''), '[^0-9]', '', 'g') = v_cpf
                AND (a.empresa_id IS NULL OR a.empresa_id = v_empresa)
            )));

  -- Shape legada do replay (005_esocial_auditoria): colaborador_id em coluna.
  -- Guardada para não quebrar no canônico, onde a coluna não existe.
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'esocial_eventos'
               AND column_name = 'colaborador_id') THEN
    EXECUTE $u$
      UPDATE public.esocial_eventos
      SET xml_envio = NULL, xml_retorno = NULL, xml = NULL, dados = NULL
      WHERE colaborador_id = $1
        AND (empresa_id IS NULL OR empresa_id = $2)
    $u$ USING target_id, v_empresa;
  END IF;

  -- Admissões vinculadas pelo mesmo CPF: nome/CPF/nascimento/contato saem.
  -- `nome`, `cargo`, `departamento`, `etapa` são NOT NULL no canônico →
  -- nome recebe placeholder; cargo/departamento/etapa são dados da vaga,
  -- não da pessoa (mantidos).
  -- Escopo por empresa: só pulamos admissões provadamente de outro
  -- tenant (empresa_id diferente); NULL é legado nosso → anonimiza.
  UPDATE public.admissoes
  SET nome = 'ADMISSAO ANONIMIZADA (LGPD)',
      cpf = NULL, data_nascimento = NULL, sexo = NULL,
      email = NULL, telefone = NULL, estado_civil = NULL, nome_mae = NULL,
      observacoes = NULL,
      metadata = '{"lgpd_anonimizado": true}'::jsonb
  WHERE v_cpf IS NOT NULL
    AND regexp_replace(COALESCE(cpf, ''), '[^0-9]', '', 'g') = v_cpf
    AND (empresa_id IS NULL OR empresa_id = v_empresa);

  UPDATE public.cnab_itens
  SET nome_favorecido = 'ANONIMIZADO (LGPD)', cpf_cnpj_favorecido = v_anon_cpf
  WHERE colaborador_id = target_id;

  -- empresa_id é obrigatório para a conclusão aparecer no histórico LGPD
  -- (a listagem filtra por empresa).
  INSERT INTO public.lgpd_solicitacoes (colaborador_id, empresa_id, tipo, status, descricao, concluida_em)
  VALUES (target_id, v_empresa, 'exclusao', 'concluida',
          'Anonimização automática por política de retenção.'
          || CASE WHEN v_esocial_retidos > 0
                  THEN ' ' || v_esocial_retidos || ' evento(s) eSocial já transmitidos retidos por obrigação fiscal (LGPD art. 16).'
                  ELSE '' END,
          now());
END;
$function$;
