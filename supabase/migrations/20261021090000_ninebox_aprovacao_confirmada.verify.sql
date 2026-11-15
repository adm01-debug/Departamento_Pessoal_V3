-- Sidecar de 20261021090000_ninebox_aprovacao_confirmada.sql
-- Prova o ESTADO-ALVO da migration (aprovacao do gestor = decisao final):
--   1. as 8 colunas de proposta/aprovacao em feedbacks_360_consolidacoes, com os tipos declarados;
--   2. os 4 CHECK fbc_*_escala (1-5, NULL permitido) validados;
--   3. os 6 comentarios de coluna documentando proposta/snapshot;
--   4. sincronizar_consolidacao_avaliacao gravando a PROPOSTA e zerando o snapshot quando a versao muda;
--   5. decidir_aprovacao_gestor sem exigir feedback tipo='gestor', gravando snapshot + auditoria.
-- Invariantes (nao texto literal) nas funcoes: 20261025090000 reescreve decidir_aprovacao_gestor
-- e a producao ainda recebeu endurecimentos posteriores; o efeito desta migration e o que se exige.
-- Somente leitura: pg_attribute/pg_constraint/pg_proc. Nenhuma RPC e executada.

-- 1. As 8 colunas de proposta/aprovacao existem.
SELECT 'ok' WHERE (
  (SELECT count(*) FROM pg_attribute a
    WHERE a.attrelid = 'public.feedbacks_360_consolidacoes'::regclass
      AND a.attnum > 0 AND NOT a.attisdropped
      AND a.attname IN ('desempenho_proposto','potencial_proposto','desempenho_aprovado',
                        'potencial_aprovado','aprovado_por','aprovado_em','aprovacao_id','snapshot_aprovado')) = 4 + 4
);

-- 2. As 4 notas sao numeric(4,3), como a migration declara.
SELECT 'ok' WHERE (
  (SELECT count(*) FROM pg_attribute a
    WHERE a.attrelid = 'public.feedbacks_360_consolidacoes'::regclass
      AND a.attnum > 0 AND NOT a.attisdropped
      AND a.attname IN ('desempenho_proposto','potencial_proposto','desempenho_aprovado','potencial_aprovado')
      AND format_type(a.atttypid, a.atttypmod) = 'numeric(4,3)') = 4
);

-- 3. Autoria/instante/vinculo/snapshot com os tipos declarados.
SELECT 'ok' WHERE (
  (SELECT count(*) FROM pg_attribute a
    WHERE a.attrelid = 'public.feedbacks_360_consolidacoes'::regclass
      AND a.attnum > 0 AND NOT a.attisdropped
      AND ( (a.attname IN ('aprovado_por','aprovacao_id') AND format_type(a.atttypid, a.atttypmod) = 'uuid')
         OR (a.attname = 'aprovado_em' AND format_type(a.atttypid, a.atttypmod) = 'timestamp with time zone')
         OR (a.attname = 'snapshot_aprovado' AND format_type(a.atttypid, a.atttypmod) = 'jsonb') )) = 4
);

-- 4. Os 4 CHECK de escala 1-5 (NULL permitido) existem e estao validados.
SELECT 'ok' WHERE (
  (SELECT count(*) FROM pg_constraint k
    WHERE k.conrelid = 'public.feedbacks_360_consolidacoes'::regclass
      AND k.contype = 'c' AND k.convalidated
      AND k.conname IN ('fbc_desempenho_proposto_escala','fbc_potencial_proposto_escala',
                        'fbc_desempenho_aprovado_escala','fbc_potencial_aprovado_escala')
      AND pg_get_constraintdef(k.oid) ~ 'IS NULL'
      AND pg_get_constraintdef(k.oid) ~ '>= \(1\)'
      AND pg_get_constraintdef(k.oid) ~ '<= \(5\)') = 4
);

-- 5. Os 6 comentarios de coluna da migration estao aplicados.
SELECT 'ok' WHERE (
  (SELECT count(*) FROM pg_attribute a
    WHERE a.attrelid = 'public.feedbacks_360_consolidacoes'::regclass
      AND a.attnum > 0 AND NOT a.attisdropped
      AND ( (a.attname IN ('desempenho_proposto','potencial_proposto')
             AND col_description(a.attrelid, a.attnum) ~ 'proposto pelo RH')
         OR (a.attname IN ('desempenho_aprovado','potencial_aprovado')
             AND col_description(a.attrelid, a.attnum) ~ 'confirmado pelo gestor')
         OR (a.attname = 'aprovacao_id'
             AND col_description(a.attrelid, a.attnum) ~ 'feedbacks_360_aprovacoes_gestor')
         OR (a.attname = 'snapshot_aprovado'
             AND col_description(a.attrelid, a.attnum) ~ 'imut') )) = 6
);

-- 6. sincronizar_consolidacao_avaliacao(uuid,uuid,uuid): SECURITY DEFINER com search_path fixo.
SELECT 'ok' WHERE (
  EXISTS (SELECT 1 FROM pg_proc p
           WHERE p.oid = to_regprocedure('public.sincronizar_consolidacao_avaliacao(uuid,uuid,uuid)')
             AND p.prosecdef
             AND p.proconfig @> ARRAY['search_path=public, pg_temp'])
);

-- 7. Ela grava a PROPOSTA (desempenho+potencial 1-5, gestor preferido) na consolidacao.
SELECT 'ok' WHERE (
  EXISTS (SELECT 1 FROM pg_proc p
           WHERE p.oid = to_regprocedure('public.sincronizar_consolidacao_avaliacao(uuid,uuid,uuid)')
             AND p.prosrc LIKE '%into v_prop_desem, v_prop_pot%'
             AND p.prosrc LIKE '%f.nota_geral between 1 and 5%'
             AND p.prosrc LIKE '%f.potencial between 1 and 5%'
             AND p.prosrc LIKE '%desempenho_proposto, potencial_proposto)%'
             AND p.prosrc LIKE '%desempenho_proposto = excluded.desempenho_proposto%'
             AND p.prosrc LIKE '%potencial_proposto = excluded.potencial_proposto%'
             AND p.prosrc LIKE '%''desempenho_proposto'', v_linha.desempenho_proposto%')
);

-- 8. Versao do conjunto mudou => o snapshot aprovado anterior e zerado.
SELECT 'ok' WHERE (
  EXISTS (SELECT 1 FROM pg_proc p
           WHERE p.oid = to_regprocedure('public.sincronizar_consolidacao_avaliacao(uuid,uuid,uuid)')
             AND p.prosrc LIKE '%desempenho_aprovado = case when c.versao_consolidada is distinct from excluded.versao_consolidada%'
             AND p.prosrc LIKE '%potencial_aprovado = case when c.versao_consolidada is distinct from excluded.versao_consolidada%'
             AND p.prosrc LIKE '%aprovado_por = case when c.versao_consolidada is distinct from excluded.versao_consolidada%'
             AND p.prosrc LIKE '%aprovado_em = case when c.versao_consolidada is distinct from excluded.versao_consolidada%'
             AND p.prosrc LIKE '%aprovacao_id = case when c.versao_consolidada is distinct from excluded.versao_consolidada%'
             AND p.prosrc LIKE '%snapshot_aprovado = case when c.versao_consolidada is distinct from excluded.versao_consolidada%')
);

-- 9. decidir_aprovacao_gestor(uuid,uuid,text,text,text): SECURITY DEFINER com search_path fixo.
SELECT 'ok' WHERE (
  EXISTS (SELECT 1 FROM pg_proc p
           WHERE p.oid = to_regprocedure('public.decidir_aprovacao_gestor(uuid,uuid,text,text,text)')
             AND p.prosecdef
             AND p.proconfig @> ARRAY['search_path=public, pg_temp'])
);

-- 10. A decisao NAO exige mais um feedback separado tipo='gestor' (regra 360 ou proposta do RH).
SELECT 'ok' WHERE (
  EXISTS (SELECT 1 FROM pg_proc p
           WHERE p.oid = to_regprocedure('public.decidir_aprovacao_gestor(uuid,uuid,text,text,text)')
             AND p.prosrc NOT LIKE '%avaliacao_do_gestor_ausente%'
             AND p.prosrc LIKE '%avaliacao_consolidada_ausente%'
             AND p.prosrc LIKE '%case when v_tem_gestor then ''360_gestor'' else ''proposta_consolidada_rh'' end%'
             AND p.prosrc LIKE '%perfil_nao_autorizado%')
);

-- 11. A decisao serializa pela consolidacao e recusa versao vencida.
SELECT 'ok' WHERE (
  EXISTS (SELECT 1 FROM pg_proc p
           WHERE p.oid = to_regprocedure('public.decidir_aprovacao_gestor(uuid,uuid,text,text,text)')
             AND p.prosrc LIKE '%from public.feedbacks_360_consolidacoes c%'
             AND p.prosrc LIKE '%for update%'
             AND p.prosrc LIKE '%consolidacao_ausente%'
             AND p.prosrc LIKE '%versao_desatualizada%'
             AND p.prosrc LIKE '%get_user_empresas(v_uid)%'
             AND p.prosrc LIKE '%situacao_aprovacao(p_colaborador_id, p_ciclo_id)%')
);

-- 12. A aprovacao grava o snapshot na consolidacao (e o limpa na devolucao).
SELECT 'ok' WHERE (
  EXISTS (SELECT 1 FROM pg_proc p
           WHERE p.oid = to_regprocedure('public.decidir_aprovacao_gestor(uuid,uuid,text,text,text)')
             AND p.prosrc LIKE '%update public.feedbacks_360_consolidacoes%'
             AND p.prosrc LIKE '%desempenho_aprovado = v_desempenho%'
             AND p.prosrc LIKE '%potencial_aprovado = v_potencial%'
             AND p.prosrc LIKE '%aprovado_por = case when v_decisao = ''aprovado'' then v_uid else null end%'
             AND p.prosrc LIKE '%aprovado_em = case when v_decisao = ''aprovado'' then now() else null end%'
             AND p.prosrc LIKE '%aprovacao_id = case when v_decisao = ''aprovado'' then v_id else null end%'
             AND p.prosrc LIKE '%snapshot_aprovado = v_snapshot%')
);

-- 13. Decisao, snapshot e auditoria na MESMA transacao.
SELECT 'ok' WHERE (
  EXISTS (SELECT 1 FROM pg_proc p
           WHERE p.oid = to_regprocedure('public.decidir_aprovacao_gestor(uuid,uuid,text,text,text)')
             AND p.prosrc LIKE '%insert into public.feedbacks_360_aprovacoes_gestor%'
             AND p.prosrc LIKE '%insert into public.audit_log%'
             AND p.prosrc LIKE '%''snapshot_aprovado'', v_snapshot%'
             AND p.prosrc LIKE '%array[''decisao'', ''versao_avaliacao'', ''desempenho_aprovado'', ''potencial_aprovado'']%')
);
