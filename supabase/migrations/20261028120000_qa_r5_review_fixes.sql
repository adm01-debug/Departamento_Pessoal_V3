-- ================================================================
-- QA round-5 — achados do Devin Review (PR #301)
--
-- BUG-2: INSERT em lgpd_solicitacoes sem empresa_id → a listagem LGPD
--        filtra por empresa e a conclusão nunca aparecia no histórico.
-- SEC-1: anonimização deixava PII no cadastro (nascimento, endereço,
--        documentos, dados bancários do próprio cadastro, dados
--        sensíveis do art. 11 e vínculos familiares/sociais) — a fila
--        marcava sucesso com a pessoa ainda identificável.
-- SEC-2: esocial_eventos vinculados via dados.colaborador.id ou
--        admissao_id não eram encontrados, e o JSON `dados` mantinha
--        nome e CPF em claro mesmo nos eventos encontrados.
-- ================================================================

CREATE OR REPLACE FUNCTION public.anonimizar_dados_pessoais(target_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_anon_cpf TEXT;
  v_cpf TEXT;
  v_cpf_fmt TEXT;
  v_nome TEXT;
  v_email TEXT;
  v_empresa UUID;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem executar apagamento LGPD' USING ERRCODE = '42501';
  END IF;

  -- Captura a identidade ANTES da anonimização: o CPF/nome originais são
  -- necessários para localizar e limpar os eventos eSocial vinculados e
  -- para casar a admissão (que não tem colaborador_id no canônico).
  SELECT cpf, nome_completo, empresa_id, COALESCE(email_corporativo, email)
    INTO v_cpf, v_nome, v_empresa, v_email
  FROM public.colaboradores
  WHERE id = target_id;

  v_cpf := NULLIF(regexp_replace(COALESCE(v_cpf, ''), '[^0-9]', '', 'g'), '');
  v_cpf_fmt := CASE WHEN v_cpf ~ '^\d{11}$' THEN
      substr(v_cpf, 1, 3) || '.' || substr(v_cpf, 4, 3) || '.' || substr(v_cpf, 7, 3) || '-' || substr(v_cpf, 10, 2)
    ELSE NULL END;

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
    metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{lgpd_anonimizado}', 'true'),
    updated_at = now()
  WHERE id = target_id;

  UPDATE public.contas_bancarias
  SET banco_nome = NULL, banco_codigo = NULL, agencia = NULL, agencia_digito = NULL,
      conta = NULL, digito = NULL, pix_chave = NULL, pix_tipo = NULL
  WHERE colaborador_id = target_id;

  UPDATE public.dependentes
  SET nome = 'DEPENDENTE ANONIMIZADO (LGPD)', cpf = NULL, data_nascimento = NULL
  WHERE colaborador_id = target_id;

  DELETE FROM public.documentos_colaborador WHERE colaborador_id = target_id;

  -- esocial_eventos não tem colaborador_id nem mensagem_retorno no
  -- canônico: os eventos se ligam ao colaborador por `dados->>'colaborador_id'`,
  -- `dados->>'colaboradorId'`, `dados->'colaborador'->>'id'` ou pela admissão
  -- (admissao_id → admissoes.cpf). Além de anular os XMLs, o JSON `dados`
  -- precisa ser varrido — nome e CPF permaneciam em claro nele.
  UPDATE public.esocial_eventos e
  SET xml_envio = NULL,
      xml_retorno = NULL,
      xml = NULL,
      dados = CASE
        WHEN e.dados IS NULL THEN NULL
        ELSE replace(
               replace(
                 replace(e.dados::text,
                         COALESCE(v_cpf_fmt, '⟂'), 'ANONIMIZADO'),
                 COALESCE(v_cpf, '⟂'), 'ANONIMIZADO'),
               COALESCE(v_nome, '⟂'), 'ANONIMIZADO')::jsonb
      END
  WHERE e.dados->>'colaborador_id' = target_id::text
     OR e.dados->>'colaboradorId' = target_id::text
     OR e.dados->'colaborador'->>'id' = target_id::text
     OR (v_cpf IS NOT NULL AND e.admissao_id IN (
          SELECT a.id FROM public.admissoes a
          WHERE regexp_replace(COALESCE(a.cpf, ''), '[^0-9]', '', 'g') = v_cpf
        ));

  -- Shape legada do replay (005_esocial_auditoria): colaborador_id em coluna.
  -- Guardada para não quebrar no canônico, onde a coluna não existe.
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'esocial_eventos'
               AND column_name = 'colaborador_id') THEN
    EXECUTE $u$
      UPDATE public.esocial_eventos e
      SET xml_envio = NULL, xml_retorno = NULL, xml = NULL,
          dados = CASE WHEN e.dados IS NULL THEN NULL ELSE replace(
            replace(
              replace(e.dados::text, $1, 'ANONIMIZADO'),
              $2, 'ANONIMIZADO'),
            $3, 'ANONIMIZADO')::jsonb END
      WHERE e.colaborador_id = $4
    $u$
    USING COALESCE(v_cpf_fmt, '⟂'), COALESCE(v_cpf, '⟂'), COALESCE(v_nome, '⟂'), target_id;
  END IF;

  UPDATE public.cnab_itens
  SET nome_favorecido = 'ANONIMIZADO (LGPD)', cpf_cnpj_favorecido = v_anon_cpf
  WHERE colaborador_id = target_id;

  -- empresa_id é obrigatório para a conclusão aparecer no histórico LGPD
  -- (a listagem filtra por empresa).
  INSERT INTO public.lgpd_solicitacoes (colaborador_id, empresa_id, tipo, status, descricao, concluida_em)
  VALUES (target_id, v_empresa, 'exclusao', 'concluida', 'Anonimização automática por política de retenção', now());
END;
$function$;
