\set ON_ERROR_STOP on
alter table colaboradores add column nome_completo text;
alter table feedbacks_360_consolidacoes
  add column enviado_em timestamptz,
  add column enviado_por uuid;
alter table feedbacks_360_aprovacoes_gestor
  add column justificativa text,
  add column decisao text,
  add column feedback_id uuid,
  add column decidido_por uuid,
  add column decidido_em timestamptz default now();

insert into feedbacks_360
  (id,empresa_id,ciclo_id,avaliado_id,avaliador_id,tipo,nota_geral,potencial,status)
values
  ('10000000-0000-4000-8000-000000000201',
   '11111111-1111-4111-8111-111111111111',
   '22222222-2222-4222-8222-222222222222',
   '66666666-6666-4666-8666-666666666666',
   '44444444-4444-4444-8444-444444444444',
   'gestor', 4, 4, 'pendente');
