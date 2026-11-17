-- =============================================================================
-- permissions: semeia a MATRIZ papel -> recurso -> acao, que esta VAZIA
--
-- DIAGNOSTICO (conferido no canonico frjbfeamybqsejlvmqbl em 17/11/2026):
--   SELECT count(*) FROM public.permissions  ->  0
-- A tabela existe desde 20251220135248 e tem 2 policies, mas NAO tem uma
-- linha. O arquivo daquela migration contem o INSERT de seed, e a versao esta
-- no ledger; a coluna `statements` daquela linha do ledger e NULL, entao nao
-- da para provar pelo ledger o que de fato rodou. O que importa e o estado:
-- matriz vazia.
--
-- POR QUE ISSO BLOQUEIA FUNCIONALIDADE
-- A branch `muri` tem `usePermissions` + `PermissionRoute`, que leem esta
-- matriz e FALHAM FECHADO por desenho: sem dado, `pode()` devolve false. Com a
-- matriz vazia, qualquer tela guardada por eles negaria acesso a todo usuario
-- que nao fosse admin. O codigo nao pode entrar antes deste seed (issue #629).
--
-- IDEMPOTENTE: existe indice unico em (role, resource, action)
-- (`permissions_role_resource_action_key`), entao ON CONFLICT DO NOTHING torna
-- o re-dispatch seguro e nao sobrescreve ajuste manual feito depois.
--
-- COBERTURA DOS PAPEIS, conferida antes de escrever:
--   enum app_role        = admin, gestor, rh, user, supervisor, coordenador
--   em uso em user_roles = admin (6), user (2), gestor (1), rh (1)
-- Os 4 papeis semeados cobrem 100% dos usuarios reais. `supervisor` e
-- `coordenador` existem no enum mas NINGUEM os tem; ficam sem linha de
-- proposito — semear papel sem usuario e adivinhar regra de negocio.
-- Quando alguem receber um desses papeis, a matriz precisa ser estendida ANTES,
-- senao essa pessoa cai no fail-closed.
--
-- As 43 linhas abaixo sao as mesmas do seed original da 20251220135248, sem
-- alteracao de regra: este arquivo repoe, nao redefine.
-- =============================================================================

INSERT INTO public.permissions (role, resource, action, allowed) VALUES
  -- Admin: tudo
  ('admin', 'colaboradores', 'create', true),
  ('admin', 'colaboradores', 'read', true),
  ('admin', 'colaboradores', 'update', true),
  ('admin', 'colaboradores', 'delete', true),
  ('admin', 'admissoes', 'create', true),
  ('admin', 'admissoes', 'read', true),
  ('admin', 'admissoes', 'update', true),
  ('admin', 'admissoes', 'delete', true),
  ('admin', 'desligamentos', 'create', true),
  ('admin', 'desligamentos', 'read', true),
  ('admin', 'desligamentos', 'update', true),
  ('admin', 'desligamentos', 'delete', true),
  ('admin', 'folha', 'create', true),
  ('admin', 'folha', 'read', true),
  ('admin', 'folha', 'update', true),
  ('admin', 'folha', 'delete', true),
  ('admin', 'usuarios', 'create', true),
  ('admin', 'usuarios', 'read', true),
  ('admin', 'usuarios', 'update', true),
  ('admin', 'usuarios', 'delete', true),
  ('admin', 'auditoria', 'read', true),
  -- Gestor: le o time e atualiza o que e dele; NAO cria nem exclui
  ('gestor', 'colaboradores', 'read', true),
  ('gestor', 'colaboradores', 'update', true),
  ('gestor', 'admissoes', 'read', true),
  ('gestor', 'admissoes', 'update', true),
  ('gestor', 'desligamentos', 'read', true),
  ('gestor', 'folha', 'read', true),
  ('gestor', 'auditoria', 'read', true),
  -- RH: opera o cadastro ponta a ponta, menos exclusao
  ('rh', 'colaboradores', 'create', true),
  ('rh', 'colaboradores', 'read', true),
  ('rh', 'colaboradores', 'update', true),
  ('rh', 'admissoes', 'create', true),
  ('rh', 'admissoes', 'read', true),
  ('rh', 'admissoes', 'update', true),
  ('rh', 'desligamentos', 'create', true),
  ('rh', 'desligamentos', 'read', true),
  ('rh', 'desligamentos', 'update', true),
  ('rh', 'folha', 'read', true),
  ('rh', 'auditoria', 'read', true),
  -- User: so leitura do basico
  ('user', 'colaboradores', 'read', true),
  ('user', 'admissoes', 'read', true),
  ('user', 'folha', 'read', true)
ON CONFLICT (role, resource, action) DO NOTHING;
