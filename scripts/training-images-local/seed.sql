-- =============================================================================
-- SEED — duas empresas fictícias e isoladas
-- =============================================================================
-- IDs fixos para que os testes de RLS e concorrência possam afirmar
-- exatamente quem vê o quê. Nenhum dado real.
-- =============================================================================

INSERT INTO public.empresas (id, nome) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Empresa A'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Empresa B');

INSERT INTO public.user_empresas (user_id, empresa_id) VALUES
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

INSERT INTO public.user_roles (user_id, role) VALUES
  ('11111111-1111-4111-8111-111111111111', 'admin'),
  ('22222222-2222-4222-8222-222222222222', 'admin');

INSERT INTO public.colaboradores (id, empresa_id, nome_completo) VALUES
  ('c0000001-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Colaborador A'),
  ('c0000002-0000-4000-8000-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Colaborador B');

INSERT INTO public.catalogo_cursos
  (id, empresa_id, nome, descricao, categoria, modalidade, carga_horaria, obrigatorio)
VALUES
  ('a0000001-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'Curso A', 'Curso da empresa A', 'Segurança', 'online', 4, true),
  ('b0000001-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
   'Curso B', 'Curso da empresa B', 'Gestão', 'presencial', 8, false);

INSERT INTO public.trilhas_aprendizado (id, empresa_id, nome, descricao, nivel) VALUES
  ('a0000002-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'Trilha A', 'Trilha da empresa A', 'basico'),
  ('b0000002-0000-4000-8000-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
   'Trilha B', 'Trilha da empresa B', 'avancado');

INSERT INTO public.treinamento_instancias (id, curso_id, instrutor_id, data_inicio, status) VALUES
  ('a0000003-0000-4000-8000-000000000003', 'a0000001-0000-4000-8000-000000000001',
   'c0000001-0000-4000-8000-000000000001', now(), 'planejado'),
  ('b0000003-0000-4000-8000-000000000003', 'b0000001-0000-4000-8000-000000000001',
   'c0000002-0000-4000-8000-000000000002', now(), 'planejado');

INSERT INTO public.treinamento_certificados (id, colaborador_id, curso_id, data_emissao) VALUES
  ('a0000004-0000-4000-8000-000000000004', 'c0000001-0000-4000-8000-000000000001',
   'a0000001-0000-4000-8000-000000000001', current_date),
  ('b0000004-0000-4000-8000-000000000004', 'c0000002-0000-4000-8000-000000000002',
   'b0000001-0000-4000-8000-000000000001', current_date);
