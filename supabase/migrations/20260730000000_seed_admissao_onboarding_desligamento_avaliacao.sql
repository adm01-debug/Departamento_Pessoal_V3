-- ============================================================
-- Seed v4 — placeholder explícito
-- Empresa: 66104399-aba8-4105-bbd3-9bf67820c1d0
-- fake-colab: 11110000-0000-0000-0000-000000000001 a ...012
-- Colunas onboarding_tarefas (sem concluida_por — FK auth.users):
--   id, onboarding_id, template_tarefa_id, titulo, descricao,
--   categoria, ordem, data_prazo, data_conclusao, concluida,
--   observacoes, created_at, empresa_id
-- ============================================================

DO $$
DECLARE
  emp  CONSTANT uuid := '66104399-aba8-4105-bbd3-9bf67820c1d0';

  -- Onboarding templates
  ot01 uuid := gen_random_uuid();
  ot02 uuid := gen_random_uuid();
  ot03 uuid := gen_random_uuid();
  ot04 uuid := gen_random_uuid();

  -- Tarefas do template 1 (analista)
  tt01_1 uuid := gen_random_uuid();
  tt01_2 uuid := gen_random_uuid();
  tt01_3 uuid := gen_random_uuid();
  tt01_4 uuid := gen_random_uuid();
  tt01_5 uuid := gen_random_uuid();
  tt01_6 uuid := gen_random_uuid();
  tt01_7 uuid := gen_random_uuid();

  -- Tarefas do template 2 (admin)
  tt02_1 uuid := gen_random_uuid();
  tt02_2 uuid := gen_random_uuid();
  tt02_3 uuid := gen_random_uuid();
  tt02_4 uuid := gen_random_uuid();

  -- Tarefas do template 3 (financeiro)
  tt03_1 uuid := gen_random_uuid();
  tt03_2 uuid := gen_random_uuid();
  tt03_3 uuid := gen_random_uuid();
  tt03_4 uuid := gen_random_uuid();
  tt03_5 uuid := gen_random_uuid();

  -- Tarefas do template 4 (TI)
  tt04_1 uuid := gen_random_uuid();
  tt04_2 uuid := gen_random_uuid();
  tt04_3 uuid := gen_random_uuid();
  tt04_4 uuid := gen_random_uuid();
  tt04_5 uuid := gen_random_uuid();

  -- Onboarding_colaborador
  oc01 uuid := gen_random_uuid(); -- Ana  43%
  oc02 uuid := gen_random_uuid(); -- João 57%
  oc03 uuid := gen_random_uuid(); -- Maria 86%
  oc04 uuid := gen_random_uuid(); -- Lucas 60%
  oc05 uuid := gen_random_uuid(); -- Pedro 100%
  oc06 uuid := gen_random_uuid(); -- Carla 71%

  -- Tarefas por colab (Pedro)
  tp01 uuid := gen_random_uuid();
  tp02 uuid := gen_random_uuid();
  tp03 uuid := gen_random_uuid();
  tp04 uuid := gen_random_uuid();
  tp05 uuid := gen_random_uuid();

  -- Tarefas por colab (Ana)
  ta01 uuid := gen_random_uuid();
  ta02 uuid := gen_random_uuid();
  ta03 uuid := gen_random_uuid();
  ta04 uuid := gen_random_uuid();

  -- Admissões
  a01 uuid := gen_random_uuid();
  a02 uuid := gen_random_uuid();
  a03 uuid := gen_random_uuid();
  a04 uuid := gen_random_uuid();
  a05 uuid := gen_random_uuid();
  a06 uuid := gen_random_uuid();
  a07 uuid := gen_random_uuid();
  a08 uuid := gen_random_uuid();

  -- Ciclos
  c01 uuid := gen_random_uuid();
  c02 uuid := gen_random_uuid();

  -- Workflow (necessário para trigger)
  wf uuid := gen_random_uuid();
BEGIN

  -- ── 0. Workflow de admissão ──────────────────────────────
  INSERT INTO workflows_definicoes (id,nome,descricao,tipo,ativo,empresa_id)
  VALUES (wf,'Workflow Padrao Admissao',
          'Workflow automatico para novas admissoes','admissao',true,emp);

  -- ── 1. ONBOARDING TEMPLATES ────────────────────────────────
  INSERT INTO onboarding_templates (id,nome,descricao,empresa_id,ativo)
  VALUES
    (ot01,'Onboarding Analista/Assistente',
     'Modelo padrao para posicoes de nivel medio. Duracao: 30 dias.',emp,true),
    (ot02,'Onboarding Administrativo',
     'Checklist para funcoes de apoio administrativo. Duracao: 15 dias.',emp,true),
    (ot03,'Onboarding Financeiro/Contabil',
     'Rotina especifica com enfase em compliance. Duracao: 30 dias.',emp,true),
    (ot04,'Onboarding Tecnologia (TI)',
     'Provisionamento de equipamentos e acessos. Duracao: 7 dias.',emp,true);

  -- ── 2. TEMPLATE TAREFAS ─────────────────────────────────
  -- Template 1: Analista (7 tarefas)
  INSERT INTO onboarding_template_tarefas
    (id,template_id,titulo,descricao,categoria,ordem,dias_prazo,responsavel_tipo,obrigatoria)
  VALUES
    (tt01_1,ot01,'Entrega de documentos pessoais','CPF, RG, CNH, comprovante de residencia','documentos',1,1,'rh',true),
    (tt01_2,ot01,'Assinatura do contrato de trabalho','Contrato assinado e protocolado','documentos',2,1,'rh',true),
    (tt01_3,ot01,'Exame medico admissional','ASO — Atestado de Saude Ocupacional','saude',3,3,'rh',true),
    (tt01_4,ot01,'Cadastro no sistema de folha','Acesso ao portal RH e dados bancarios','sistemas',4,5,'rh',true),
    (tt01_5,ot01,'Tour pelas instalacoes','Apresentacao as areas e colegas','integracao',5,1,'gestor',false),
    (tt01_6,ot01,'Treinamento de boas-vindas','Apresentacao cultura e politicas da empresa','integracao',6,7,'rh',true),
    (tt01_7,ot01,'Configurar e-mail e ferramentas','Outlook, Teams, sistema interno','sistemas',7,3,'ti',true);

  -- Template 2: Administrativo (4 tarefas)
  INSERT INTO onboarding_template_tarefas
    (id,template_id,titulo,descricao,categoria,ordem,dias_prazo,responsavel_tipo,obrigatoria)
  VALUES
    (tt02_1,ot02,'Entrega de documentos pessoais','CPF, RG, comprovante de residencia','documentos',1,1,'rh',true),
    (tt02_2,ot02,'Assinatura do contrato de trabalho','2 vias assinadas','documentos',2,1,'rh',true),
    (tt02_3,ot02,'Exame medico admissional','ASO emitido','saude',3,3,'rh',true),
    (tt02_4,ot02,'Cadastro no sistema de ponto','Registro de batidas e horario','sistemas',4,2,'rh',true);

  -- Template 3: Financeiro (5 tarefas)
  INSERT INTO onboarding_template_tarefas
    (id,template_id,titulo,descricao,categoria,ordem,dias_prazo,responsavel_tipo,obrigatoria)
  VALUES
    (tt03_1,ot03,'Entrega de documentos pessoais','CPF, RG, titulo de eleitor','documentos',1,1,'rh',true),
    (tt03_2,ot03,'Assinatura do contrato e NDA','NDA de informacoes financeiras','documentos',2,1,'juridico',true),
    (tt03_3,ot03,'Exame medico admissional','ASO especifico','saude',3,3,'rh',true),
    (tt03_4,ot03,'Acesso aos sistemas financeiros','ERP, contabilidade, bancos','sistemas',4,5,'ti',true),
    (tt03_5,ot03,'Treinamento LGPD e compliance','Modulo obrigatorio de 4 horas','integracao',5,14,'compliance',true);

  -- Template 4: TI (5 tarefas)
  INSERT INTO onboarding_template_tarefas
    (id,template_id,titulo,descricao,categoria,ordem,dias_prazo,responsavel_tipo,obrigatoria)
  VALUES
    (tt04_1,ot04,'Entrega de equipamentos','Notebook, cracha, celular corporativo','documentos',1,1,'ti',true),
    (tt04_2,ot04,'Provisionamento de acessos','AD, GitHub, Jira, VPN','sistemas',2,2,'ti',true),
    (tt04_3,ot04,'Assinatura do contrato de trabalho','Termo de uso de ativos de TI','documentos',3,1,'rh',true),
    (tt04_4,ot04,'Exame medico admissional','ASO','saude',4,3,'rh',true),
    (tt04_5,ot04,'Treinamento seguranca da informacao','Phishing, LGPD, politicas de TI','integracao',5,5,'ti',true);

  -- ── 3. ONBOARDING COLABORADOR ───────────────────────────
  INSERT INTO onboarding_colaborador
    (id,colaborador_id,template_id,data_inicio,data_conclusao,status,progresso,empresa_id)
  VALUES
    (oc01,'11110000-0000-0000-0000-000000000001',ot01,'2025-01-06',NULL,'em_andamento',43,emp),
    (oc02,'11110000-0000-0000-0000-000000000002',ot01,'2025-01-06',NULL,'em_andamento',57,emp),
    (oc03,'11110000-0000-0000-0000-000000000003',ot01,'2025-01-13',NULL,'em_andamento',86,emp),
    (oc04,'11110000-0000-0000-0000-000000000008',ot04,'2025-01-13',NULL,'em_andamento',60,emp),
    (oc05,'11110000-0000-0000-0000-000000000006',ot04,'2024-08-05','2024-08-30','concluido',100,emp),
    (oc06,'11110000-0000-0000-0000-000000000007',ot01,'2024-09-02',NULL,'em_andamento',71,emp);

  -- ── 4. TAREFAS POR COLABORADOR ─────────────────────────
  -- Colunas: id, onboarding_id, template_tarefa_id, titulo, descricao,
  --          categoria, ordem, data_prazo, data_conclusao, concluida,
  --          observacoes, created_at, empresa_id

  -- Pedro (oc05): 5/5 concluídas
  INSERT INTO onboarding_tarefas
    (id,onboarding_id,template_tarefa_id,titulo,descricao,categoria,ordem,
     data_prazo,data_conclusao,concluida,empresa_id)
  VALUES
    (tp01,oc05,tt04_1,'Entrega de equipamentos','Notebook, cracha, celular','documentos',1,'2024-08-06','2024-08-06',true,emp),
    (tp02,oc05,tt04_2,'Provisionamento de acessos','AD, GitHub, Jira, VPN','sistemas',2,'2024-08-07','2024-08-07',true,emp),
    (tp03,oc05,tt04_3,'Assinatura do contrato de trabalho','Termo de uso de ativos de TI','documentos',3,'2024-08-07','2024-08-07',true,emp),
    (tp04,oc05,tt04_4,'Exame medico admissional','ASO','saude',4,'2024-08-09','2024-08-09',true,emp),
    (tp05,oc05,tt04_5,'Treinamento seguranca da informacao','Phishing, LGPD, politicas de TI','integracao',5,'2024-08-12','2024-08-12',true,emp);

  -- Ana (oc01): 3 concluídas, 4 pendentes
  INSERT INTO onboarding_tarefas
    (id,onboarding_id,template_tarefa_id,titulo,descricao,categoria,ordem,
     data_prazo,data_conclusao,concluida,empresa_id)
  VALUES
    (ta01,oc01,tt01_1,'Entrega de documentos pessoais','CPF, RG, CNH, comprovante de residencia','documentos',1,'2025-01-07','2025-01-07',true,emp),
    (ta02,oc01,tt01_2,'Assinatura do contrato de trabalho','Contrato assinado e protocolado','documentos',2,'2025-01-07','2025-01-07',true,emp),
    (ta03,oc01,tt01_3,'Exame medico admissional','ASO','saude',3,'2025-01-10','2025-01-10',true,emp),
    (ta04,oc01,tt01_4,'Cadastro no sistema de folha','Acesso ao portal RH e dados bancarios','sistemas',4,'2025-01-10',NULL,false,emp);

  -- João (oc02): 4 concluídas
  INSERT INTO onboarding_tarefas
    (id,onboarding_id,template_tarefa_id,titulo,descricao,categoria,ordem,
     data_prazo,data_conclusao,concluida,empresa_id)
  VALUES
    (gen_random_uuid(),oc02,tt01_1,'Entrega de documentos pessoais','CPF, RG, CNH, comprovante de residencia','documentos',1,'2025-01-07','2025-01-07',true,emp),
    (gen_random_uuid(),oc02,tt01_2,'Assinatura do contrato de trabalho','Contrato assinado e protocolado','documentos',2,'2025-01-07','2025-01-07',true,emp),
    (gen_random_uuid(),oc02,tt01_3,'Exame medico admissional','ASO','saude',3,'2025-01-10','2025-01-10',true,emp),
    (gen_random_uuid(),oc02,tt01_4,'Cadastro no sistema de folha','Acesso ao portal RH e dados bancarios','sistemas',4,'2025-01-10','2025-01-10',true,emp);

  -- Maria (oc03): 6 concluídas
  INSERT INTO onboarding_tarefas
    (id,onboarding_id,template_tarefa_id,titulo,descricao,categoria,ordem,
     data_prazo,data_conclusao,concluida,empresa_id)
  VALUES
    (gen_random_uuid(),oc03,tt01_1,'Entrega de documentos pessoais','CPF, RG, CNH, comprovante de residencia','documentos',1,'2025-01-14','2025-01-14',true,emp),
    (gen_random_uuid(),oc03,tt01_2,'Assinatura do contrato de trabalho','Contrato assinado e protocolado','documentos',2,'2025-01-14','2025-01-14',true,emp),
    (gen_random_uuid(),oc03,tt01_3,'Exame medico admissional','ASO','saude',3,'2025-01-17','2025-01-17',true,emp),
    (gen_random_uuid(),oc03,tt01_4,'Cadastro no sistema de folha','Acesso ao portal RH e dados bancarios','sistemas',4,'2025-01-17','2025-01-17',true,emp),
    (gen_random_uuid(),oc03,tt01_5,'Tour pelas instalacoes','Apresentacao as areas e colegas','integracao',5,'2025-01-17','2025-01-17',true,emp),
    (gen_random_uuid(),oc03,tt01_6,'Treinamento de boas-vindas','Apresentacao cultura e politicas da empresa','integracao',6,'2025-01-21','2025-01-21',true,emp);

  -- Lucas (oc04): 3 concluídas
  INSERT INTO onboarding_tarefas
    (id,onboarding_id,template_tarefa_id,titulo,descricao,categoria,ordem,
     data_prazo,data_conclusao,concluida,empresa_id)
  VALUES
    (gen_random_uuid(),oc04,tt04_1,'Entrega de equipamentos','Notebook, cracha, celular corporativo','documentos',1,'2025-01-14','2025-01-14',true,emp),
    (gen_random_uuid(),oc04,tt04_2,'Provisionamento de acessos','AD, GitHub, Jira, VPN','sistemas',2,'2025-01-15','2025-01-15',true,emp),
    (gen_random_uuid(),oc04,tt04_3,'Assinatura do contrato de trabalho','Termo de uso de ativos de TI','documentos',3,'2025-01-14','2025-01-14',true,emp);

  -- Carla (oc06): 5 concluídas
  INSERT INTO onboarding_tarefas
    (id,onboarding_id,template_tarefa_id,titulo,descricao,categoria,ordem,
     data_prazo,data_conclusao,concluida,empresa_id)
  VALUES
    (gen_random_uuid(),oc06,tt01_1,'Entrega de documentos pessoais','CPF, RG, CNH, comprovante de residencia','documentos',1,'2024-09-03','2024-09-03',true,emp),
    (gen_random_uuid(),oc06,tt01_2,'Assinatura do contrato de trabalho','Contrato assinado e protocolado','documentos',2,'2024-09-03','2024-09-03',true,emp),
    (gen_random_uuid(),oc06,tt01_3,'Exame medico admissional','ASO','saude',3,'2024-09-06','2024-09-06',true,emp),
    (gen_random_uuid(),oc06,tt01_4,'Cadastro no sistema de folha','Acesso ao portal RH e dados bancarios','sistemas',4,'2024-09-06','2024-09-06',true,emp),
    (gen_random_uuid(),oc06,tt01_5,'Tour pelas instalacoes','Apresentacao as areas e colegas','integracao',5,'2024-09-06','2024-09-06',true,emp);

  -- ── 5. ADMISSÕES ────────────────────────────────────────
  INSERT INTO admissoes
    (id,nome,cargo,departamento,salario_proposto,data_prevista,etapa,
     cpf,email,telefone,estado_civil,data_nascimento,
     empresa_id,status_esocial,checklist_documentos_pessoais,
     checklist_comprovante_endereco,checklist_foto,
     checklist_ctps,checklist_exame_admissional,
     checklist_contrato_assinado,checklist_esocial_enviado,
     metadata)
  VALUES
    (a01,'Ana Silva Santos','Analista de Marketing','Marketing',
     3800.00,'2025-01-06','contrato',
     '123.456.789-01','ana.silva@promobrindes.com.br','(11) 99000-0001','solteiro','1998-03-15',
     emp,'pendente',true,true,false,false,false,true,false,
     '{"placeholder":true}'::jsonb),

    (a02,'João Pedro Santos','Assistente Administrativo','Administrativo',
     2100.00,'2025-01-06','assinatura',
     '123.456.789-02','joao.santos@promobrindes.com.br','(11) 99000-0002','solteiro','1999-07-22',
     emp,'pendente',true,true,true,true,false,true,false,
     '{"placeholder":true}'::jsonb),

    (a03,'Maria Oliveira Lima','Analista de RH','Recursos Humanos',
     4200.00,'2025-01-13','esocial',
     '123.456.789-03','maria.oliveira@promobrindes.com.br','(11) 99000-0003','solteiro','1995-11-08',
     emp,'pendente',true,true,true,true,true,true,false,
     '{"placeholder":true}'::jsonb),

    (a04,'Ricardo Costa Pereira','Analista de Vendas','Comercial',
     3500.00,'2024-03-04','esocial',
     '123.456.789-04','ricardo.costa@promobrindes.com.br','(11) 99000-0004','casado','1990-05-30',
     emp,'enviado',true,true,true,true,true,true,true,
     '{"placeholder":true}'::jsonb),

    (a05,'Juliana Mendes Rocha','Analista Financeiro','Financeiro',
     4500.00,'2024-06-03','esocial',
     '123.456.789-05','juliana.mendes@promobrindes.com.br','(11) 99000-0005','solteiro','1992-09-14',
     emp,'enviado',true,true,true,true,true,true,true,
     '{"placeholder":true}'::jsonb),

    (a06,'Pedro Almeida Souza','Analista de TI','Tecnologia',
     5000.00,'2024-08-05','esocial',
     '123.456.789-06','pedro.almeida@promobrindes.com.br','(11) 99000-0006','casado','1988-12-01',
     emp,'enviado',true,true,true,true,true,true,true,
     '{"placeholder":true}'::jsonb),

    (a07,'Carla Souza Ferreira','Analista de Marketing','Marketing',
     3800.00,'2024-09-02','esocial',
     '123.456.789-07','carla.souza@promobrindes.com.br','(11) 99000-0007','solteiro','1996-04-19',
     emp,'enviado',true,true,true,true,true,true,true,
     '{"placeholder":true}'::jsonb),

    (a08,'Lucas Ferreira Lima','Assistente de Logística','Operações',
     2300.00,'2025-01-13','exame',
     '123.456.789-08','lucas.ferreira@promobrindes.com.br','(11) 99000-0008','solteiro','2000-02-28',
     emp,'pendente',true,true,true,true,false,false,false,
     '{"placeholder":true}'::jsonb);

  -- ── 6. CICLOS DE AVALIAÇÃO ──────────────────────────────
  INSERT INTO ciclos_avaliacao (id,empresa_id,nome,descricao,data_inicio,data_fim,status,tipo)
  VALUES
    (c01,emp,'Ciclo Anual 2025',
     'Avaliacao de desempenho anual — metas e competencias',
     '2025-07-01','2025-12-31','concluido','anual'),
    (c02,emp,'Ciclo S1 2026',
     'Avaliacao de desempenho do 1o semestre — metas e competencias',
     '2026-01-01','2026-06-30','ativo','semestral');

  -- ── 7. DESLIGAMENTOS ───────────────────────────────────
  INSERT INTO desligamentos
    (colaborador_id,tipo,data_desligamento,data_aviso,motivo,status,
     salario_base,saldo_salario,aviso_previo,ferias_vencidas,
     ferias_proporcionais,terco_constitucional,decimo_terceiro,
     multa_fgts,total_proventos,total_descontos,valor_liquido,
     checklist_comunicacao,checklist_documentacao,checklist_calculo_rescisao,
     checklist_homologacao,checklist_revogacao_acessos,
     checklist_devolucao_equipamentos,checklist_esocial,
     checklist_pagamento,empresa_id,etapa,quebra_contrato)
  VALUES
    -- Bruno — sem justa causa, encerrado
    ('11110000-0000-0000-0000-000000000012',
     'sem_justa_causa','2025-07-15','2025-06-25',
     'Reestruturacao do setor — corte de vagas',
     'finalizado',
     2800.00,933.33,2800.00,0,1200.00,933.33,2800.00,2333.33,
     10066.66,0,10066.66,
     true,true,true,true,true,true,true,true,
     emp,'concluido',false),

    -- Felipe — pedido de demissão, em_andamento
    ('11110000-0000-0000-0000-000000000010',
     'pedido_demissao','2025-07-01',NULL,
     'Oportunidade de carreira',
     'em_andamento',
     3200.00,533.33,0,0,800.00,533.33,1066.67,0,
     2133.33,533.33,1600.00,
     true,false,false,false,false,false,false,false,
     emp,'pagamento',false);

END $$;
