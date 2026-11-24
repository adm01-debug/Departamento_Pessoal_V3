/**
 * Verificação ESTÁTICA (sem banco) das restrições da migration de aprovação.
 * Uso: node scripts/_tmp-verificar-migration-restricoes.mjs
 */
import { readFileSync, existsSync } from 'node:fs';

const caminho = 'supabase/migrations/20261017090000_ninebox_aprovacao_gestor.sql';
const s = readFileSync(caminho, 'utf8');
const entre = (inicio, fim) => {
  const i = s.indexOf(inicio);
  const j = s.indexOf(fim, i + 1);
  return i < 0 ? '' : s.slice(i, j < 0 ? undefined : j);
};

const pode = entre('create or replace function public.pode_aprovar_colaborador', 'comment on function public.pode_aprovar_colaborador');
const decidir = entre('create or replace function public.decidir_aprovacao_gestor', 'comment on function public.decidir_aprovacao_gestor');
const versao = entre('create or replace function public.versao_consolidada_avaliacao', 'comment on function public.versao_consolidada_avaliacao');
const edit = 'supabase/migrations/20261020090000_ninebox_edicao_feedback.sql';

const checks = [
  ['1. aprovação exige supervisor_id', /alvo\.supervisor_id = gestor\.id/.test(pode)],
  ['1. RH/admin não aprovam', !/pode_gerir_avaliacoes/.test(pode)],
  ['1. autoaprovação removida', !/or alvo\.id = gestor\.id/.test(pode)],
  ['2. exige avaliação do gestor', /tipo, ''\)\)\) = 'gestor'/.test(decidir)],
  ['2. bloqueia ausência', /avaliacao_do_gestor_ausente/.test(decidir)],
  ['2. bloqueia não concluída', /avaliacao_nao_concluida/.test(decidir)],
  ['3. versão cobre o registro inteiro', /to_jsonb\(f\)/.test(versao)],
  ['3. versão é VOLATILE (AFTER INSERT vê a linha)', /language sql volatile/.test(versao)],
  ['4. sincronizar revogada de authenticated', /revoke all on function public\.sincronizar_consolidacao_avaliacao\(uuid, uuid, uuid\) from public, anon, authenticated;/.test(s)],
  ['4. sem grant direto a authenticated', !/grant execute on function public\.sincronizar_consolidacao_avaliacao/.test(s)],
  ['3. sincronização inicial idempotente presente', /SINCRONIZAÇÃO INICIAL/.test(s) && /versao_consolidada_avaliacao\(g\.avaliado_id, g\.ciclo_id\)/.test(s)],
  ['5. GRANT SELECT explícito nas 2 tabelas', /grant select on table public\.feedbacks_360_consolidacoes to authenticated;/.test(s) && /grant select on table public\.feedbacks_360_aprovacoes_gestor to authenticated;/.test(s)],
  ['5. escrita direta revogada', /revoke all on table public\.feedbacks_360_consolidacoes from public, anon, authenticated;/.test(s) && /revoke all on table public\.feedbacks_360_aprovacoes_gestor from public, anon, authenticated;/.test(s)],
  ['5. migration 20261020090000 existe', existsSync(edit)],
];

let falhas = 0;
for (const [nome, ok] of checks) {
  console.log(`${ok ? 'OK ' : 'FALHA'} — ${nome}`);
  if (!ok) falhas += 1;
}
if (existsSync(edit)) console.log(`INFO — migration extra (edição, não exigida pela aprovação): ${edit}`);
if (falhas > 0) process.exit(1);
