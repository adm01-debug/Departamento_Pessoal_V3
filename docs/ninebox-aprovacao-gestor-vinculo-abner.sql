-- ==========================================
==================================
-- HOMOLOG
AÇÃO · HABILITAR A CONTA ABNER COMO GESTOR
A — ⚠️ NÃO EXECUTADO
-- --------------
---------------------------------------------
-----------------
-- Conta: ti@promobrindes.c
om.br  ·  user_id 2a1f0c4f-7587-49a7-81aa-e7
e35cf0848d
--
-- ── BLOQUEIO COMPROVADO (
leitura real, 19/10/2026) ──────�
��──────────────�
��───
--   • user_roles da conta ....
............................ admin + gestor  
 OK
--     (`get_user_roles` devolve app_role
[] → o front lê os DOIS papéis)
--   • 
colaboradores.user_id = 2a1f0c4f-… ........
......... 0 linhas         ✗
--   • colab
oradores.supervisor_id (empresa 66104399-…)
 ... 0 de 14          ✗
--   • feedbacks_
360_consolidacoes / _aprovacoes_gestor ... 40
4 (migration)   ✗
--   • RPCs pode_aprova
r_colaborador / situacao_aprovacao .. 404 (mi
gration)  ✗
--
-- A aprovação real exige,
 NO SERVIDOR (migration 20261017090000, §0):

--
--   pode_aprovar_colaborador(p_colaborad
or_id) =
--     EXISTS (colaboradores alvo JO
IN colaboradores gestor
--               ON g
estor.user_id = auth.uid() AND gestor.empresa
_id = alvo.empresa_id
--              WHERE a
lvo.id = p AND alvo.supervisor_id = gestor.id
)
--     AND EXISTS (user_roles WHERE user_id
 = auth.uid() AND role = 'gestor')
--
-- Ou s
eja: papel `gestor` + uma LINHA de colaborado
r vinculada à conta
-- (`user_id`) + ser `su
pervisor_id` do AVALIADO. Autoaprovação NÃ
O existe
-- (o avaliado precisa apontar para 
o colaborador gestor) e o papel `admin` NÃO

-- substitui esse vínculo.
--
-- ── O QU
E ESTE SCRIPT FAZ (mínimo; não cria colabor
ador nem avaliação) ──────
--  
 PASSO 1 — vincula a conta gestora de teste
 ao COLABORADOR GESTOR existente
--          
   (`user_id`), uma linha, com guarda para n�
�o sobrescrever vínculo.
--   PASSO 2 — ap
onta o `supervisor_id` do AVALIADO escolhido 
para esse
--             colaborador gestor (
uma linha). Sem este passo, a aprovação
-- 
            permanece FALSE — é a regra es
trita do servidor.
--   (Opcional) 2b — se 
a avaliação de homologação precisar ser d
e OUTRA pessoa,
--             repita o PASSO
 2 para esse avaliado.
--
-- ── PRÉ-REQU
ISITOS (ordem) ──────────
───────────────
───────────────
──────────
--   1. 202610
15090000_ninebox_finalizacao_e_potencial.sql 
  (aplicada ✅)
--   2. 20261017090000_nineb
ox_aprovacao_gestor.sql          (PENDENTE �
�)
--      → tabelas de consolidação/apro
vações + trigger de encaminhamento
--      
  automático + pode_aprovar_colaborador / si
tuacao_aprovacao /
--        decidir_aprovaca
o_gestor (+ privilégios e auditoria)
--   3.
 20261018090000_ninebox_conclusao_gestor.sql 
         (opcional)
--   Depois: PASSO 1 (ví
nculo) e PASSO 2 (atribuição).
-- =========
=============================================
======================

-- begin;

-- ── 
0 · CONFERÊNCIA (só leitura) ────�
��──────────────�
��──────────────�
��─────────
select c.id, c.
nome_completo, c.empresa_id, c.user_id, c.sup
ervisor_id, c.cpf
  from public.colaboradores
 c
 where c.cpf = '00000000000';             
         -- descartável (CPF sentinela)

-- 
Candidatos a AVALIADO (avaliação do gestor 
concluída, sem vínculo):
-- select f.id as 
feedback_id, f.empresa_id, f.ciclo_id, f.aval
iado_id,
--        a.nome_completo as avaliad
o, a.supervisor_id
--   from public.feedbacks
_360 f
--   join public.colaboradores a on a.
id = f.avaliado_id
--  where lower(f.tipo) = 
'gestor' and lower(f.status) = 'concluido'
--
  order by f.updated_at desc;

-- ── 1 ·
 VÍNCULO DA CONTA (uma linha, o descartável
) ──────────────�
��─────────
-- update publi
c.colaboradores
--    set user_id = '2a1f0c4f
-7587-49a7-81aa-e7e35cf0848d'
--  where cpf =
 '00000000000'                               
   -- o descartável
--    and empresa_id = '
66104399-aba8-4105-bbd3-9bf67820c1d0'  -- emp
resa da conta
--    and user_id is null;     
                                -- guarda: n�
�o sobrescreve vínculo existente

-- ── 
1b · PROVA DO VÍNCULO (deve voltar 1 linha 
com o user_id acima) ────────

-- select id, nome_completo, user_id, superv
isor_id
--   from public.colaboradores
--  wh
ere user_id = '2a1f0c4f-7587-49a7-81aa-e7e35c
f0848d';

-- ── 2 · ATRIBUIÇÃO DO AVAL
IADO (uma linha, sem autoaprovação) ──�
��───────────
-- O cola
borador do PASSO 1 é o GESTOR. A avaliação
 precisa pertencer a OUTRA
-- pessoa (o AVALI
ADO), e o `supervisor_id` dessa pessoa deve a
pontar para o
-- colaborador gestor. Sem isso
 `pode_aprovar_colaborador` retorna FALSE.
--

-- update public.colaboradores
--    set sup
ervisor_id = '0f303507-5b13-4ca2-aa76-16122b5
b37e9'
--  where id = '<UUID_DO_AVALIADO_ESCO
LHIDO>'
--    and empresa_id = '66104399-aba8
-4105-bbd3-9bf67820c1d0'
--    and supervisor
_id is distinct from '0f303507-5b13-4ca2-aa76
-16122b5b37e9';
--
-- 2b · Se houver mais de
 um avaliado na homologação, repita o UPDAT
E acima
--      apenas para os avaliados esco
lhidos (uma linha por avaliado).

-- ── 1
c · PROVA DA AUTORIZAÇÃO (na sessão auten
ticada da conta gestora) ─────
--  
 select public.pode_aprovar_colaborador('<UUI
D_DO_AVALIADO_ESCOLHIDO>');
--     -- esperad
o: TRUE  (o avaliado aponta para o colaborado
r gestor vinculado)
--   select public.pode_a
provar_colaborador('<OUTRO_COLABORADOR>');
--
     -- esperado: FALSE (fora do time da cont
a)
--   select public.pode_aprovar_colaborado
r('0f303507-5b13-4ca2-aa76-16122b5b37e9');
--
     -- esperado: FALSE (é o próprio gestor
; autoaprovação não é permitida)

-- ─�
�� 3 · ESCOPO DE VISÃO DO GESTOR (RLS) — 
PREPARADO, NÃO APLICADO ──────�
�──
-- Hoje `feedbacks_360_select` é por
 EMPRESA:
--   using (empresa_id in (select p
ublic.get_user_empresas(auth.uid())))
-- Para
 uma conta admin+gestor isso é legítimo (o 
`admin` tem visão da empresa).
-- Se você q
uiser que uma conta SÓ `gestor` veja apenas 
o time dela (e não
-- avaliações de tercei
ros), esta é a alteração aditiva — mesma
 semântica de
-- `pode_aprovar_colaborador`,
 sem tocar em admin/rh:
--
-- drop policy if 
exists "feedbacks_360_select" on public.feedb
acks_360;
-- create policy "feedbacks_360_sel
ect" on public.feedbacks_360
--   for select 
to authenticated
--   using (
--     empresa_
id in (select public.get_user_empresas(auth.u
id()))
--     and (
--       public.pode_geri
r_avaliacoes()                       -- admin
/rh: empresa
--       or exists (            
                              -- gestor: só 
o time
--         select 1
--           from 
public.colaboradores alvo
--           join p
ublic.colaboradores gestor
--             on 
gestor.user_id = auth.uid() and gestor.empres
a_id = alvo.empresa_id
--          where alvo
.id = feedbacks_360.avaliado_id
--           
 and (alvo.supervisor_id = gestor.id or alvo.
id = gestor.id)
--       )
--       or feedba
cks_360.avaliador_id = (select c.id from publ
ic.colaboradores c
--                        
                  where c.user_id = auth.uid(
)
--                                         
   and c.empresa_id = feedbacks_360.empresa_i
d limit 1)
--     )
--   );
--
-- ⚠️ Apli
car essa policy só DEPOIS de validar com o R
H: ela reduz a leitura do
-- gestor de "empre
sa" para "seu time + avaliações que ele mes
mo escreveu".

-- ── 4 · O QUE NÃO É A
LTERADO ────────────�
��──────────────�
��──────────────�
��────
--   • `user_roles` da conta
 (admin + gestor) — intocado; o admin conti
nua.
--   • Nenhum colaborador é criado; n
enhuma avaliação é criada.
--   • Nenhum
a outra conta/perfil é vinculada.
--   • A
 conta de RH (`rh.ninebox.teste@promobrindes.
com.br`, user_id
--     60767f3f-bb08-4917-9d
74-17ce19ef8adb) não precisa de vínculo: a 
validação
--     do Potencial exige SOMENTE
 o papel `rh`.

-- commit;

-- ==============
=============================================
=================
-- ROLLBACK (desfaz exatame
nte o que foi feito)
-- =====================
=============================================
==========
-- begin;
--   -- PASSO 2b (soment
e se aplicado)
--   update public.colaborador
es set supervisor_id = null
--    where id = 
'<UUID_DO_AVALIADO_ESCOLHIDO>'
--      and su
pervisor_id = '0f303507-5b13-4ca2-aa76-16122b
5b37e9';
--   -- PASSO 1
--   update public.c
olaboradores set user_id = null
--    where i
d = '0f303507-5b13-4ca2-aa76-16122b5b37e9'
--
      and user_id = '2a1f0c4f-7587-49a7-81aa-
e7e35cf0848d';
--   -- PASSO 3 (somente se ap
licado): recriar a policy original por empres
a
--   -- drop policy if exists "feedbacks_36
0_select" on public.feedbacks_360;
--   -- cr
eate policy "feedbacks_360_select" on public.
feedbacks_360
--   --   for select to authent
icated
--   --   using (empresa_id in (select
 public.get_user_empresas(auth.uid())));
-- c
ommit;


