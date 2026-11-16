-- ============================================================================
-- NINE-BOX · CANONIZA AS FUNCOES QUE SO EXISTEM NO BANCO CANONICO
-- ----------------------------------------------------------------------------
-- POR QUE ESTA MIGRATION EXISTE
--   As 12 migrations do lote NineBox (20261015090000, 20261016090000,
--   20261017090000, 20261018090000, 20261020090000, 20261021090000,
--   20261022090000, 20261025090000, 20261027090000, 20261028090000,
--   20261115120000 e 20261115140000) NAO estao em
--   supabase_migrations.schema_migrations. Elas ainda vao ser aplicadas.
--
--   Mas o canonico (Supabase frjbfeamybqsejlvmqbl) nao esta atrasado em
--   relacao ao repo: em QUATRO funcoes ele esta A FRENTE. Alguem endureceu
--   essas funcoes a mao, direto no banco, e esse endurecimento NAO EXISTE EM
--   NENHUM ARQUIVO deste repositorio. Se o lote for aplicado como esta, o
--   CREATE OR REPLACE de cada migration sobrescreve o corpo vivo e as
--   protecoes abaixo desaparecem sem deixar rastro:
--
--   1. public.decidir_aprovacao_gestor(uuid,uuid,text,text,text)
--      10.198 chars no canonico contra 9.302 na 20261025090000 (a mais nova do
--      repo que a define). O canonico tem uma checagem que o repo nao tem:
--      exige que o colaborador E o ciclo pertencam a MESMA empresa da
--      consolidacao, com erro 'empresa_ciclo_colaborador_inconsistentes'.
--      Sem ela, um ciclo de outra empresa podia ser decidido na consolidacao
--      errada. Tambem tem a reconferencia de versao DEPOIS do lock das
--      avaliacoes ('versao_desatualizada'), o snapshot de aprovacao com a
--      regra 360 (pesos 60/25/10/5) e o fallback de proposta consolidada do RH.
--
--   2. public.situacao_aprovacao(uuid,uuid)
--      4.502 contra 3.669 na 20261017090000. O canonico exige que o supervisor
--      tenha o papel 'gestor' e seja da mesma empresa para sair de
--      'sem_gestor', e invalida a aprovacao quando o gestor TROCA, mesmo com
--      notas iguais. No repo, troca de gestor mantinha a aprovacao antiga.
--
--   3. public.sincronizar_consolidacao_avaliacao(uuid,uuid,uuid)
--      6.601 contra 5.958 na 20261021090000. O canonico grava a proposta do RH
--      (desempenho_proposto/potencial_proposto), preserva o cabecalho quando a
--      versao fica nula (o historico aponta para ele com FK RESTRICT) e so
--      marca 'aguardando_gestor' quando o gestor tem conta E papel.
--
--   4. public.pode_aprovar_colaborador(uuid)
--      1.115 contra 732 na 20261017090000. O canonico exige papel 'gestor',
--      exige gestor da MESMA empresa do avaliado, proibe autoaprovacao
--      (gestor.id <> alvo.id e alvo.user_id distinto de auth.uid()) e restringe
--      a excecao de homologacao a uma linha habilitada e NAO EXPIRADA em
--      public.ninebox_permissoes_homologacao. A versao do repo nao tem nada
--      disso.
--
-- DE ONDE VEIO CADA CORPO
--   Copia fiel de pg_get_functiondef(oid) lido do canonico
--   frjbfeamybqsejlvmqbl em 15/11/2026. Nada foi reescrito, reindentado ou
--   comentado por dentro: os comentarios dentro das funcoes sao os que o banco
--   ja tem. A unica diferenca em relacao ao byte do banco e o fim de linha: o
--   prosrc vivo esta em CRLF (foi aplicado a partir de uma fonte com CR) e
--   este arquivo esta em LF, como todo o repositorio. Por isso o sidecar
--   compara md5/length do prosrc COM O CR REMOVIDO -- a assercao passa antes e
--   depois da aplicacao.
--
-- DESVIO DELIBERADO DO "VERBATIM" -- UM UNICO TRECHO
--   Em public.pode_aprovar_colaborador o corpo vivo do canonico comeca o ramo
--   da excecao de homologacao com uma igualdade a um UUID fixo:
--     auth.uid() = '<uuid de uma conta de pessoa>'::uuid AND EXISTS (...)
--   Esse trecho NAO foi copiado. Motivos:
--     a) este repositorio e PUBLICO e esse UUID e o user_id de uma PESSOA;
--        gravar o literal aqui publicaria o identificador da conta dela, que
--        hoje nao aparece em nenhum arquivo da main;
--     b) o proprio repo ja rejeitou esse padrao: 20261027090000:313-314 diz,
--        sobre pode_editar_colaborador, que a autorizacao "nao usa e-mail/UUID
--        fixo como regra" -- a excecao mora na tabela, nao no codigo.
--
--   POR QUE E SEGURO HOJE (medido no canonico, leitura):
--     public.ninebox_permissoes_homologacao tem exatamente 1 linha, e ela e
--     justamente desse mesmo user_id: habilitado = true, mas
--     expira_em = 2026-10-27 13:05:19+00, ja no passado. Logo
--     (habilitado AND expira_em > now()) = FALSE e o ramo inteiro nao concede
--     nada, com ou sem a igualdade de UUID. Remover o literal NAO muda
--     comportamento nenhum hoje.
--
--   CONSEQUENCIA HONESTA (muda o futuro, nao o presente):
--     a excecao de homologacao passa a ser 100% dirigida pela tabela. Antes,
--     mesmo com uma linha habilitada e valida, so AQUELE usuario era atendido;
--     agora QUALQUER user_id habilitado e nao expirado em
--     ninebox_permissoes_homologacao passa a poder aprovar. Quem controla a
--     excecao e quem escreve nessa tabela.
--     Se o dono quiser o comportamento antigo (um unico usuario), o caminho e
--     restringir a ESCRITA da tabela, nao recolocar o UUID no codigo; para
--     reverter de fato, basta voltar a linha removida.
--
--   O resto de pode_aprovar_colaborador e as outras TRES funcoes continuam
--   copia fiel de pg_get_functiondef, byte a byte.
--
-- A ORDEM IMPORTA
--   Esta migration tem de rodar DEPOIS das do lote que sobrescrevem essas
--   quatro funcoes (20261017090000, 20261021090000 e 20261025090000). O
--   timestamp 20261115150000 e maior que o de todas elas, entao a ordem
--   natural do canonical-migrations ja garante isso. Aplicar o lote SEM esta
--   migration no mesmo apply = perder as quatro protecoes.
--
-- EFEITO ESPERADO NO CANONICO: NENHUM. O corpo gravado aqui e identico ao que
--   o banco ja tem, logo cada CREATE OR REPLACE e no-op. Esse e justamente o
--   teste de que a copia saiu fiel.
--
-- NAO INCLUIDA DE PROPOSITO
--   public.enviar_avaliacao_ao_gestor(uuid,uuid,text): o canonico tem 3.981
--   chars e a 20261115140000 tem 4.174, mas removendo comentarios os dois
--   corpos sao BYTE A BYTE IDENTICOS (md5 7f9f205ff4474ca767051c319fd327d9,
--   3.299 chars nos dois). A diferenca e so texto de comentario, e a
--   20261115140000 ja carrega as tres protecoes do canonico. Reescrever essa
--   funcao aqui seria churn e conflito com aquela migration.
--
--   public.finalizar_feedback_base(uuid,text,text,text) tambem NAO entra: ela
--   nao e orfa. A 20261028090000 a cria renomeando a finalizar_feedback da
--   20261027090000, e o corpo renomeado tem md5
--   3579d8ad25fad207b79ed3e44f8176d9, igual ao do canonico.
--
-- Sem envelope transacional proprio: o canonical-migrations controla a
-- transacao. Somente CREATE OR REPLACE / REVOKE / GRANT / COMMENT -- nenhum
-- DROP, nenhuma DDL de tabela, nenhum dado tocado.
-- ============================================================================

-- ── PRE-CONDICOES (fail-closed) ─────────────────────────────────────────────
-- Os quatro corpos abaixo leem tabelas, colunas e funcoes especificas. Se
-- qualquer dependencia faltar, a migration PARA aqui em vez de gravar uma
-- funcao que falharia em runtime na primeira aprovacao.
DO $$
BEGIN
  IF to_regclass('public.colaboradores') IS NULL THEN
    RAISE EXCEPTION 'preflight: public.colaboradores nao existe';
  END IF;
  IF to_regclass('public.user_roles') IS NULL THEN
    RAISE EXCEPTION 'preflight: public.user_roles nao existe';
  END IF;
  IF to_regclass('public.ciclos_avaliacao') IS NULL THEN
    RAISE EXCEPTION 'preflight: public.ciclos_avaliacao nao existe';
  END IF;
  IF to_regclass('public.audit_log') IS NULL THEN
    RAISE EXCEPTION 'preflight: public.audit_log nao existe';
  END IF;
  IF to_regclass('public.ninebox_permissoes_homologacao') IS NULL THEN
    RAISE EXCEPTION 'preflight: public.ninebox_permissoes_homologacao nao existe -- pode_aprovar_colaborador le essa tabela';
  END IF;
  IF to_regclass('public.feedbacks_360') IS NULL THEN
    RAISE EXCEPTION 'preflight: public.feedbacks_360 nao existe';
  END IF;
  IF to_regclass('public.feedbacks_360_consolidacoes') IS NULL THEN
    RAISE EXCEPTION 'preflight: public.feedbacks_360_consolidacoes nao existe -- aplicar 20261017090000 antes';
  END IF;
  IF to_regclass('public.feedbacks_360_aprovacoes_gestor') IS NULL THEN
    RAISE EXCEPTION 'preflight: public.feedbacks_360_aprovacoes_gestor nao existe -- aplicar 20261017090000 antes';
  END IF;
  IF to_regclass('public.feedbacks_360_validacoes_potencial') IS NULL THEN
    RAISE EXCEPTION 'preflight: public.feedbacks_360_validacoes_potencial nao existe -- aplicar 20261015090000 antes';
  END IF;
  IF to_regclass('public.feedbacks_360_operacoes') IS NULL THEN
    RAISE EXCEPTION 'preflight: public.feedbacks_360_operacoes nao existe';
  END IF;

  IF to_regprocedure('public.get_user_empresas(uuid)') IS NULL THEN
    RAISE EXCEPTION 'preflight: public.get_user_empresas(uuid) nao existe -- e o isolamento por empresa das quatro funcoes';
  END IF;
  IF to_regprocedure('public.versao_consolidada_avaliacao(uuid,uuid)') IS NULL THEN
    RAISE EXCEPTION 'preflight: public.versao_consolidada_avaliacao(uuid,uuid) nao existe -- aplicar 20261017090000 antes';
  END IF;
  IF to_regprocedure('public.versao_avaliacao_feedback(uuid)') IS NULL THEN
    RAISE EXCEPTION 'preflight: public.versao_avaliacao_feedback(uuid) nao existe -- aplicar 20261015090000 antes';
  END IF;

  IF (
    SELECT count(*) FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'feedbacks_360_consolidacoes'
       AND column_name IN ('versao_consolidada','status','revisao','aprovacao_id',
                           'snapshot_aprovado','desempenho_proposto','potencial_proposto',
                           'desempenho_aprovado','potencial_aprovado','enviado_por','enviado_em',
                           'gestor_responsavel_colaborador_id','gestor_responsavel_user_id',
                           'atualizado_em','atualizado_por','aprovado_por','aprovado_em')
  ) <> 17 THEN
    RAISE EXCEPTION 'preflight: public.feedbacks_360_consolidacoes nao tem as 17 colunas que os corpos abaixo escrevem';
  END IF;
END $$;

-- ── 1/4 · public.pode_aprovar_colaborador(uuid) ─────────────────────────────
-- Corpo do canonico MENOS o literal de UUID (ver DESVIO DELIBERADO no
-- cabecalho). O canonico vivo tem 1.115 chars sem CR / md5
-- 379623e7a46e48461c04c17369891823; o corpo deste arquivo tem 1042 chars /
-- md5 93db329a80ddcd93c79a1ef9b98be70d. Unica funcao nao verbatim das quatro.
-- Guarda o papel 'gestor', a mesma empresa, a nao-autoaprovacao e a validade
-- da excecao de homologacao. A 20261017090000 (732 chars) nao tem nenhuma.
CREATE OR REPLACE FUNCTION public.pode_aprovar_colaborador(p_colaborador_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1
      FROM public.colaboradores alvo
     WHERE alvo.id = p_colaborador_id
       AND alvo.empresa_id IS NOT NULL
       AND alvo.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
       AND EXISTS (
         SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid() AND ur.role::text = 'gestor'
       )
       AND (
         EXISTS (
           SELECT 1 FROM public.colaboradores gestor
            WHERE gestor.id = alvo.supervisor_id
              AND gestor.empresa_id = alvo.empresa_id
              AND gestor.user_id = auth.uid()
              AND gestor.id <> alvo.id
         )
         OR (
           EXISTS (
             SELECT 1 FROM public.ninebox_permissoes_homologacao h
              WHERE h.user_id = auth.uid()
                AND h.habilitado = true
                AND h.expira_em > now()
           )
           -- Evita autoaprovacao se o avaliado for vinculado a mesma conta.
           AND alvo.user_id IS DISTINCT FROM auth.uid()
         )
       )
  );
$function$;

revoke all on function public.pode_aprovar_colaborador(uuid) from public, anon;
grant execute on function public.pode_aprovar_colaborador(uuid) to authenticated;

comment on function public.pode_aprovar_colaborador(uuid) is
  'Gestor responsavel normal ou excecao temporaria de homologacao da conta Abner; restrito as empresas do usuario, sem autoaprovacao.';

-- ── 2/4 · public.situacao_aprovacao(uuid,uuid) ──────────────────────────────
-- Corpo do canonico (4.502 chars sem CR, md5 b8c52d426eb10e8eefad29c5c724f0e7).
-- Exige papel 'gestor' + mesma empresa para sair de 'sem_gestor' e invalida a
-- aprovacao quando o gestor troca. A 20261017090000 (3.669 chars) nao faz isso.
CREATE OR REPLACE FUNCTION public.situacao_aprovacao(p_colaborador_id uuid, p_ciclo_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid           uuid := auth.uid();
  v_empresa       uuid;
  v_versao_gestor text;
  v_status_consolidacao text;
  v_decisao       text;
  v_decisao_versao text;
  v_decidido_por uuid;
  v_gestor_feedback uuid;
  v_validacao     boolean := false;
begin
  /* ISOLAMENTO DE EMPRESA: o status é derivado, mas ainda é dado do tenant.
     Fora das empresas do usuário autenticado a função não responde. */
  select c.empresa_id into v_empresa from public.colaboradores c where c.id = p_colaborador_id;
  if v_empresa is null
     or v_empresa not in (select public.get_user_empresas(v_uid)) then
    raise exception 'nao_autorizado';
  end if;

  /* FONTE DA VERDADE: a linha de CONSOLIDAÇÃO (mantida pelo trigger da §7).
     `sem_gestor` = existe avaliação, mas o colaborador não tem gestor definido:
     é AVISO de atribuição (visível ao RH), NÃO um bloqueio da decisão — por
     isso a decisão vigente é lida antes e prevalece sobre esse status. */
  select c.versao_consolidada, c.status
    into v_versao_gestor, v_status_consolidacao
    from public.feedbacks_360_consolidacoes c
   where c.colaborador_id = p_colaborador_id and c.ciclo_id = p_ciclo_id;

  /* Sem linha (migration recém-aplicada / dados legados): calcula na hora. */
  -- Fonte de verdade: versao calculada, mesmo que a consolidacao esteja desatualizada.
  v_versao_gestor := public.versao_consolidada_avaliacao(p_colaborador_id, p_ciclo_id);

  select a.decisao, a.versao_avaliacao, a.decidido_por
    into v_decisao, v_decisao_versao, v_decidido_por
    from public.feedbacks_360_aprovacoes_gestor a
   where a.ciclo_id = p_ciclo_id and a.colaborador_id = p_colaborador_id
   order by a.decidido_em desc limit 1;

  /* INVALIDAÇÃO: decisão de OUTRA versão não é aplicada — a consolidação volta a
     aguardar o gestor (é o reencaminhamento automático quando o conjunto muda). */
  if v_decisao is not null
     and (v_versao_gestor is null or v_decisao_versao is distinct from v_versao_gestor) then
    v_decisao := null;
    v_decisao_versao := null;
  end if;

  /* VALIDAÇÃO DO RH: a âncora de `feedbacks_360_validacoes_potencial` é a versão
     CANÔNICA DO FEEDBACK DO GESTOR (`versao_avaliacao_feedback`) — a MESMA usada
     por `validar_potencial_avaliacao` e pelo motor do Nine-Box. Comparar com a
     versão do CONJUNTO (usada pela decisão) nunca casaria e o fluxo ficaria
     eternamente em `aprovada_gestor`. */
  select f.id into v_gestor_feedback
    from public.feedbacks_360 f
   where f.avaliado_id = p_colaborador_id
     and f.ciclo_id = p_ciclo_id
     and lower(btrim(coalesce(f.tipo, ''))) = 'gestor'
     and lower(btrim(coalesce(f.status, ''))) = 'concluido'
   order by f.updated_at desc nulls last
   limit 1;

  if v_gestor_feedback is not null then
    select exists (
      select 1 from public.feedbacks_360_validacoes_potencial v
       where v.ciclo_id = p_ciclo_id
         and v.colaborador_id = p_colaborador_id
         and v.feedback_id = v_gestor_feedback
         and v.versao_avaliacao = public.versao_avaliacao_feedback(v_gestor_feedback)
    ) into v_validacao;
  end if;

  /* A DECISÃO VIGENTE TEM PRIORIDADE sobre a ausência de vínculo: `sem_gestor` é
     pendência de ATRIBUIÇÃO, não um estado terminal. Com a regra estrita atual,
     a decisão só é criada pelo gestor vinculado; a leitura mantém compatibilidade
     com decisões históricas já gravadas. */
  if v_versao_gestor is null then return 'em_preparacao'; end if;
  if not exists (
    select 1 from public.colaboradores alvo
      join public.colaboradores gestor on gestor.id = alvo.supervisor_id
      join public.user_roles ur on ur.user_id = gestor.user_id and ur.role::text = 'gestor'
     where alvo.id = p_colaborador_id and alvo.empresa_id = gestor.empresa_id
  ) then return 'sem_gestor'; end if;
  -- Troca de gestor invalida aprovacoes anteriores, mesmo com notas iguais.
  if v_decidido_por is not null and not exists (
    select 1 from public.colaboradores alvo
      join public.colaboradores gestor on gestor.id = alvo.supervisor_id
     where alvo.id = p_colaborador_id and gestor.user_id = v_decidido_por
       and gestor.empresa_id = alvo.empresa_id
  ) then v_decisao := null; end if;
  if v_decisao is not null then
    if v_decisao = 'devolvido' then return 'devolvida'; end if;
    if v_decisao = 'aprovado' and v_validacao then return 'concluida_validada'; end if;
    if v_decisao = 'aprovado' then return 'aprovada_gestor'; end if;
  end if;
  return 'aguardando_gestor';
end;
$function$;

revoke all on function public.situacao_aprovacao(uuid, uuid) from public, anon;
grant execute on function public.situacao_aprovacao(uuid, uuid) to authenticated;

comment on function public.situacao_aprovacao(uuid, uuid) is
  'Estado do fluxo (em_preparacao|sem_gestor|aguardando_gestor|devolvida|aprovada_gestor|concluida_validada) derivado da CONSOLIDACAO (versao do conjunto) + aprovacao vigente + validacao RH vigente.';

-- ── 3/4 · public.sincronizar_consolidacao_avaliacao(uuid,uuid,uuid) ─────────
-- Corpo do canonico (6.601 chars sem CR, md5 6fd5b6078f474b0ee379b4535e9d4ffa).
-- Grava a proposta do RH, preserva o cabecalho quando a versao zera e exige
-- conta + papel do gestor. A 20261021090000 (5.958 chars) nao tem.
-- Sem EXECUTE para authenticated: e chamada pelas RPCs SECURITY DEFINER e pelo
-- trigger de consolidacao, nunca pelo cliente (mesma exposicao de hoje).
CREATE OR REPLACE FUNCTION public.sincronizar_consolidacao_avaliacao(p_colaborador_id uuid, p_ciclo_id uuid, p_por uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_empresa     uuid;
  v_gestor      uuid;
  v_gestor_uid  uuid;
  v_versao      text;
  v_status      text;
  v_prop_desem  numeric;
  v_prop_pot    numeric;
  v_linha       public.feedbacks_360_consolidacoes%rowtype;
begin
  if p_colaborador_id is null or p_ciclo_id is null then
    return jsonb_build_object('ok', false, 'motivo', 'chave_incompleta');
  end if;

  select c.empresa_id, c.supervisor_id into v_empresa, v_gestor
    from public.colaboradores c where c.id = p_colaborador_id;
  if v_empresa is null then
    return jsonb_build_object('ok', false, 'motivo', 'colaborador_inexistente');
  end if;

  if v_gestor is not null then
    select u.user_id into v_gestor_uid from public.colaboradores u where u.id = v_gestor and u.empresa_id = v_empresa;
  end if;

  v_versao := public.versao_consolidada_avaliacao(p_colaborador_id, p_ciclo_id);

  if v_versao is null then
    -- Não apagar o cabeçalho: o histórico referencia a consolidação com FK RESTRICT.
    update public.feedbacks_360_consolidacoes c
       set status = 'em_preparacao', versao_consolidada = null,
           desempenho_proposto = null, potencial_proposto = null,
           desempenho_aprovado = null, potencial_aprovado = null,
           aprovado_por = null, aprovado_em = null,
           aprovacao_id = null, snapshot_aprovado = null,
           atualizado_em = now(), atualizado_por = p_por
     where c.empresa_id = v_empresa and c.ciclo_id = p_ciclo_id
       and c.colaborador_id = p_colaborador_id;
    return jsonb_build_object('ok', true, 'status', 'em_preparacao');
  end if;

  /*
   * PROPOSTA: o RH prepara a avaliação consolidada. Se houver uma avaliação
   * do GESTOR concluída com os dois valores, ela é a referência; caso contrário,
   * usa-se a avaliação concluída mais recente que tenha Desempenho E Potencial.
   * Isso evita exigir um segundo feedback só para a aprovação.
   */
  select f.nota_geral, f.potencial
    into v_prop_desem, v_prop_pot
    from public.feedbacks_360 f
   where f.avaliado_id = p_colaborador_id
     and f.ciclo_id = p_ciclo_id
     and lower(btrim(coalesce(f.status, ''))) = 'concluido'
     and f.nota_geral between 1 and 5
     and f.potencial between 1 and 5
   order by (lower(btrim(coalesce(f.tipo, ''))) = 'gestor') desc,
            f.updated_at desc nulls last
   limit 1;

  v_status := case when v_gestor is null or v_gestor_uid is null
    or not exists (select 1 from public.user_roles ur
                   where ur.user_id = v_gestor_uid and ur.role::text = 'gestor')
    then 'sem_gestor' else 'aguardando_gestor' end;


  insert into public.feedbacks_360_consolidacoes as c
    (empresa_id, ciclo_id, colaborador_id, status, versao_consolidada,
     gestor_responsavel_colaborador_id, gestor_responsavel_user_id,
     enviado_por, enviado_em, revisao, atualizado_em, atualizado_por,
     desempenho_proposto, potencial_proposto)
  values (v_empresa, p_ciclo_id, p_colaborador_id, v_status, v_versao,
          v_gestor, v_gestor_uid, p_por, now(), 1, now(), p_por,
          v_prop_desem, v_prop_pot)
  on conflict (empresa_id, ciclo_id, colaborador_id) do update
    set versao_consolidada = excluded.versao_consolidada,
        status = case
                   when c.versao_consolidada is distinct from excluded.versao_consolidada then excluded.status
                   when c.status = 'sem_gestor' and excluded.status = 'aguardando_gestor' then excluded.status
                   else c.status
                 end,
        gestor_responsavel_colaborador_id = excluded.gestor_responsavel_colaborador_id,
        gestor_responsavel_user_id = excluded.gestor_responsavel_user_id,
        revisao = case when c.versao_consolidada is distinct from excluded.versao_consolidada
                       then c.revisao + 1 else c.revisao end,
        enviado_em = case when c.versao_consolidada is distinct from excluded.versao_consolidada
                          then now() else c.enviado_em end,
        enviado_por = case when c.versao_consolidada is distinct from excluded.versao_consolidada
                           then coalesce(excluded.enviado_por, c.enviado_por) else c.enviado_por end,
        /* CONJUNTO MUDOU ⇒ a aprovação anterior deixa de valer. */
        desempenho_aprovado = case when c.versao_consolidada is distinct from excluded.versao_consolidada
                                   then null else c.desempenho_aprovado end,
        potencial_aprovado = case when c.versao_consolidada is distinct from excluded.versao_consolidada
                                  then null else c.potencial_aprovado end,
        aprovado_por = case when c.versao_consolidada is distinct from excluded.versao_consolidada
                            then null else c.aprovado_por end,
        aprovado_em = case when c.versao_consolidada is distinct from excluded.versao_consolidada
                           then null else c.aprovado_em end,
        aprovacao_id = case when c.versao_consolidada is distinct from excluded.versao_consolidada
                            then null else c.aprovacao_id end,
        snapshot_aprovado = case when c.versao_consolidada is distinct from excluded.versao_consolidada
                                 then null else c.snapshot_aprovado end,
        desempenho_proposto = excluded.desempenho_proposto,
        potencial_proposto = excluded.potencial_proposto,
        atualizado_em = now(),
        atualizado_por = coalesce(excluded.atualizado_por, c.atualizado_por)
  returning * into v_linha;

  insert into public.audit_log (empresa_id, tabela, registro_id, acao, dados_novos, user_id, user_email)
  values (v_empresa, 'feedbacks_360_consolidacoes', p_colaborador_id, 'UPDATE',
          jsonb_build_object('empresa_id', v_empresa, 'ciclo_id', p_ciclo_id,
                             'colaborador_id', p_colaborador_id, 'status', v_linha.status,
                             'versao_consolidada', v_linha.versao_consolidada,
                             'desempenho_proposto', v_linha.desempenho_proposto,
                             'potencial_proposto', v_linha.potencial_proposto,
                             'gestor_responsavel_user_id', v_linha.gestor_responsavel_user_id,
                             'revisao', v_linha.revisao),
          p_por, null);

  return jsonb_build_object('ok', true, 'status', v_linha.status, 'versao', v_linha.versao_consolidada,
                            'revisao', v_linha.revisao,
                            'desempenho_proposto', v_linha.desempenho_proposto,
                            'potencial_proposto', v_linha.potencial_proposto);
end;
$function$;

revoke all on function public.sincronizar_consolidacao_avaliacao(uuid, uuid, uuid)
  from public, anon, authenticated;

comment on function public.sincronizar_consolidacao_avaliacao(uuid, uuid, uuid) is
  'Cria/atualiza a consolidacao (empresa+ciclo+colaborador) a cada avaliacao salva: versao do conjunto, gestor responsavel pelo vinculo e status inicial (sem_gestor quando nao ha gestor). Idempotente.';

-- ── 4/4 · public.decidir_aprovacao_gestor(uuid,uuid,text,text,text) ─────────
-- Corpo do canonico (10.198 chars sem CR, md5 e174f9e70f05c7f9f7c2e780a5ab0d4f).
-- Depende das tres funcoes acima, por isso vem por ultimo no arquivo.
-- Protecao exclusiva do canonico: 'empresa_ciclo_colaborador_inconsistentes'.
CREATE OR REPLACE FUNCTION public.decidir_aprovacao_gestor(p_colaborador_id uuid, p_ciclo_id uuid, p_decisao text, p_justificativa text DEFAULT NULL::text, p_idempotencia text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid       uuid := auth.uid();
  v_email     text := nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'email', '');
  v_decisao   text := lower(btrim(coalesce(p_decisao, '')));
  v_just      text := nullif(btrim(coalesce(p_justificativa, '')), '');
  v_chave     text;
  v_hash      text;
  v_confere   text;
  v_anterior  jsonb;
  v_linha     public.feedbacks_360%rowtype;
  v_cons      public.feedbacks_360_consolidacoes%rowtype;
  v_versao    text;
  v_versao_atual text;
  v_status    text;
  v_id        uuid;
  v_resultado jsonb;
  v_desempenho numeric;
  v_potencial  numeric;
  v_soma_pesos numeric := 0;
  v_soma_notas numeric := 0;
  v_peso       numeric;
  v_tem_gestor boolean := false;
  v_snapshot   jsonb;
  v_cat        record;
begin
  if v_uid is null then
    raise exception 'nao_autenticado' using errcode = '28000';
  end if;
  if p_idempotencia is null or btrim(p_idempotencia) = '' then
    raise exception 'idempotencia_ausente';
  end if;
  if v_decisao not in ('aprovado','devolvido') then
    raise exception 'decisao_invalida';
  end if;
  if v_decisao = 'devolvido' and (v_just is null or length(v_just) < 10) then
    raise exception 'justificativa_obrigatoria';
  end if;

  -- PERMISSÃO: gestor vinculado ou exceção autenticada de homologação. Autoria do feedback permitida; autorização do gestor obrigatória.
  if not public.pode_aprovar_colaborador(p_colaborador_id) then
    raise exception 'perfil_nao_autorizado';
  end if;

  -- A consolidação é a chave ÚNICA (empresa + ciclo + colaborador) e o LOCK
  -- serializa duas aprovações concorrentes do mesmo conjunto.
  select * into v_cons
    from public.feedbacks_360_consolidacoes c
   where c.colaborador_id = p_colaborador_id
     and c.ciclo_id = p_ciclo_id
   for update;
  if not found then
    perform public.sincronizar_consolidacao_avaliacao(p_colaborador_id, p_ciclo_id, v_uid);
    select * into v_cons
      from public.feedbacks_360_consolidacoes c
     where c.colaborador_id = p_colaborador_id
       and c.ciclo_id = p_ciclo_id
     for update;
  end if;
  if not found then
    raise exception 'consolidacao_ausente';
  end if;
  if v_cons.empresa_id is null
     or v_cons.empresa_id not in (select public.get_user_empresas(v_uid)) then
    raise exception 'nao_autorizado';
  end if;
  if not exists (select 1 from public.colaboradores c
                  where c.id=p_colaborador_id and c.empresa_id=v_cons.empresa_id)
     or not exists (select 1 from public.ciclos_avaliacao ca
                     where ca.id=p_ciclo_id and ca.empresa_id=v_cons.empresa_id) then
    raise exception 'empresa_ciclo_colaborador_inconsistentes';
  end if;

  v_versao := coalesce(v_cons.versao_consolidada,
                       public.versao_consolidada_avaliacao(p_colaborador_id, p_ciclo_id));
  v_versao_atual := public.versao_consolidada_avaliacao(p_colaborador_id, p_ciclo_id);
  if v_versao is null then
    raise exception 'sem_avaliacao';
  end if;
  if v_versao_atual is distinct from v_versao then
    raise exception 'versao_desatualizada';
  end if;
  -- Verificar novamente a versão depois de bloquear as avaliações existentes.
  perform 1 from public.feedbacks_360 f
   where f.avaliado_id = p_colaborador_id and f.ciclo_id = p_ciclo_id
   for update;
  if public.versao_consolidada_avaliacao(p_colaborador_id,p_ciclo_id)
       is distinct from v_versao then
    raise exception 'versao_desatualizada';
  end if;

  /**
   * REGISTRO DE REFERÊNCIA: prioriza `tipo='gestor'`, mas NÃO o exige. O RH
   * pode preparar o conjunto em qualquer categoria; o gestor aprova a proposta
   * consolidada. O registro precisa estar concluído e não cancelado.
   */
  select * into v_linha
    from public.feedbacks_360 f
   where f.avaliado_id = p_colaborador_id
     and f.ciclo_id = p_ciclo_id
     and lower(btrim(coalesce(f.status, ''))) = 'concluido'
     and lower(btrim(coalesce(f.tipo, ''))) in ('gestor','par','auto','subordinado')
   order by (lower(btrim(coalesce(f.tipo, ''))) = 'gestor') desc,
            f.updated_at desc nulls last
   limit 1;
  if not found then
    raise exception 'avaliacao_consolidada_ausente';
  end if;

  -- Gestor autorizado pode criar e aprovar o feedback; autoria nao bloqueia decisao.

  v_chave := 'decidir_aprovacao:' || p_colaborador_id::text || ':' || p_ciclo_id::text || ':' || p_idempotencia;
  v_hash  := md5(p_colaborador_id::text || '|' || p_ciclo_id::text || '|' || v_decisao || '|' || coalesce(v_just, ''));

  select resultado, hash_parametros into v_anterior, v_confere
    from public.feedbacks_360_operacoes
   where idempotency_key = v_chave and empresa_id = v_cons.empresa_id;
  if found then
    if v_confere <> v_hash then
      raise exception 'idempotencia_conflito';
    end if;
    return v_anterior || jsonb_build_object('idempotente', true);
  end if;

  if public.situacao_aprovacao(p_colaborador_id, p_ciclo_id) not in ('aguardando_gestor', 'sem_gestor') then
    raise exception 'pendencia_nao_aguarda_decisao';
  end if;


  if v_decisao = 'aprovado' then
    /*
     * DESEMPENHO: mesma composição 360 do motor do front — última avaliação
     * elegível por categoria, pesos 60/25/10/5, renormalizados sobre as
     * categorias disponíveis. Se NÃO existe categoria Gestor, usa-se a
     * proposta consolidada do RH (nota + potencial do registro de referência).
     */
    for v_cat in
      select distinct on (lower(btrim(coalesce(f.tipo, ''))))
             lower(btrim(coalesce(f.tipo, ''))) as tipo,
             f.nota_geral,
             f.potencial
        from public.feedbacks_360 f
       where f.avaliado_id = p_colaborador_id
         and f.ciclo_id = p_ciclo_id
         and lower(btrim(coalesce(f.status, ''))) = 'concluido'
         and lower(btrim(coalesce(f.tipo, ''))) in ('gestor','par','auto','subordinado')
         and f.nota_geral between 1 and 5
       order by lower(btrim(coalesce(f.tipo, ''))), f.updated_at desc nulls last
    loop
      v_peso := case v_cat.tipo
                  when 'gestor' then 0.60
                  when 'par' then 0.25
                  when 'auto' then 0.10
                  when 'subordinado' then 0.05
                  else 0
                end;
      v_soma_pesos := v_soma_pesos + v_peso;
      v_soma_notas := v_soma_notas + (v_cat.nota_geral * v_peso);
      if v_cat.tipo = 'gestor' then
        v_tem_gestor := true;
        v_potencial := v_cat.potencial;
      end if;
    end loop;

    if v_tem_gestor then
      if v_potencial is null or v_potencial < 1 or v_potencial > 5 then
        raise exception 'avaliacao_sem_potencial';
      end if;
      if v_soma_pesos <= 0 then
        raise exception 'avaliacao_sem_desempenho';
      end if;
      v_desempenho := v_soma_notas / v_soma_pesos;
    else
      -- Proposta consolidada do RH: precisa dos DOIS valores no registro.
      if v_linha.nota_geral is null or v_linha.nota_geral < 1 or v_linha.nota_geral > 5 then
        raise exception 'avaliacao_sem_desempenho';
      end if;
      if v_linha.potencial is null or v_linha.potencial < 1 or v_linha.potencial > 5 then
        raise exception 'avaliacao_sem_potencial';
      end if;
      v_desempenho := v_linha.nota_geral;
      v_potencial := v_linha.potencial;
    end if;

    if v_desempenho is null or v_desempenho < 1 or v_desempenho > 5 then
      raise exception 'avaliacao_sem_desempenho';
    end if;

    v_snapshot := jsonb_build_object(
      'desempenho', v_desempenho,
      'potencial', v_potencial,
      'versao_consolidada', v_versao,
      'regra', case when v_tem_gestor then '360_gestor' else 'proposta_consolidada_rh' end,
      'fonte_feedback_id', v_linha.id,
      'fonte_tipo', lower(btrim(coalesce(v_linha.tipo, ''))),
      'aprovado_em', now()
    );
    v_status := 'aprovada_gestor';
  else
    v_status := 'devolvida';
    v_desempenho := null;
    v_potencial := null;
    v_snapshot := null;
  end if;

  insert into public.feedbacks_360_aprovacoes_gestor (
    consolidacao_id, feedback_id, empresa_id, ciclo_id, colaborador_id,
    decisao, justificativa, versao_avaliacao, revisao,
    decidido_por, idempotency_key, hash_parametros
  ) values (
    v_cons.id, v_linha.id, v_cons.empresa_id, p_ciclo_id, p_colaborador_id,
    v_decisao, v_just, v_versao, v_cons.revisao,
    v_uid, 'aprov:' || v_chave, v_hash
  ) returning id into v_id;

  update public.feedbacks_360_consolidacoes
     set status = v_status,
         desempenho_aprovado = v_desempenho,
         potencial_aprovado = v_potencial,
         aprovado_por = case when v_decisao = 'aprovado' then v_uid else null end,
         aprovado_em = case when v_decisao = 'aprovado' then now() else null end,
         aprovacao_id = case when v_decisao = 'aprovado' then v_id else null end,
         snapshot_aprovado = v_snapshot,
         atualizado_em = now()
   where id = v_cons.id;

  insert into public.audit_log (
    empresa_id, tabela, registro_id, acao, dados_anteriores, dados_novos, campos_alterados, user_id, user_email
  ) values (
    v_cons.empresa_id,
    'feedbacks_360_aprovacoes_gestor', v_id, 'INSERT', null,
    jsonb_build_object(
      'empresa_id', v_cons.empresa_id,
      'ciclo_id', p_ciclo_id,
      'colaborador_id', p_colaborador_id,
      'decisao', v_decisao,
      'versao_avaliacao', v_versao,
      'revisao_avaliada', v_cons.revisao,
      'desempenho_aprovado', v_desempenho,
      'potencial_aprovado', v_potencial,
      'snapshot_aprovado', v_snapshot
    ),
    array['decisao', 'versao_avaliacao', 'desempenho_aprovado', 'potencial_aprovado'],
    v_uid, v_email
  );

  v_resultado := jsonb_build_object(
    'ok', true,
    'aprovacao_id', v_id,
    'decisao', v_decisao,
    'status', v_status,
    'versao_avaliacao', v_versao,
    'desempenho_aprovado', v_desempenho,
    'potencial_aprovado', v_potencial,
    'snapshot_aprovado', v_snapshot,
    'idempotente', false
  );

  insert into public.feedbacks_360_operacoes
    (idempotency_key, feedback_id, empresa_id, operacao, hash_parametros, resultado)
  values (v_chave, v_linha.id, v_cons.empresa_id, 'decidir_aprovacao_gestor', v_hash, v_resultado)
  on conflict (idempotency_key) do nothing;

  return v_resultado;
end;
$function$;

revoke all on function public.decidir_aprovacao_gestor(uuid, uuid, text, text, text) from public, anon;
grant execute on function public.decidir_aprovacao_gestor(uuid, uuid, text, text, text) to authenticated;
