/**
 * TEMPORÁRIO — DIAGNÓSTICO SOMENTE LEITURA da aprovação formal do gestor.
 *
 * Responde, contra o banco REAL:
 *   1. as tabelas/RPCs da aprovação existem? (migration aplicada?)
 *   2. a conta informada tem colaborador vinculado (user_id → colaboradores.id)?
 *   3. quais avaliações REAIS (gestor + concluído) podem ser aprovadas por ela?
 *
 * NADA é gravado: só `select` (limitado) e a função de leitura
 * `pode_aprovar_colaborador`. Nenhuma RPC de escrita é chamada.
 *
 * Uso: node scripts/_tmp-diagnostico-aprovacao-gestor.mjs <uuid-do-usuario>
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';

const USUARIO = process.argv[2] ?? '2a1f0c4f-7587-49a7-81aa-e7e35cf0848d';

/** Lê URL/chave dos `.env`/`.env.local` sem imprimir valores. */
function envLocal() {
  const texto = ['.env', '.env.local']
    .filter((f) => {
      try {
        readFileSync(f);
        return true;
      } catch {
        return false;
      }
    })
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n');
  const ler = (nome) => {
    const linha = texto.split(/\r?\n/).find((l) => l.trim().startsWith(`${nome}=`));
    return linha ? linha.slice(linha.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '') : '';
  };
  return { url: ler('VITE_SUPABASE_URL'), anon: ler('VITE_SUPABASE_PUBLISHABLE_KEY') || ler('VITE_SUPABASE_ANON_KEY') };
}

/** Sessão E2E salva (access + refresh) — o supabase-js renova o token sozinho. */
function sessaoDaStorage() {
  const estado = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));
  for (const origem of estado.origins ?? []) {
    for (const item of origem.localStorage ?? []) {
      if (/^sb-.*-auth-token$/.test(item.name)) {
        const sessao = JSON.parse(item.value);
        if (sessao?.access_token) return sessao;
      }
    }
  }
  return null;
}

const { url, anon } = envLocal();
if (!url || !anon) {
  console.error('Faltam VITE_SUPABASE_URL / chave no .env');
  process.exit(2);
}

const sessao = sessaoDaStorage();
const supabase = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});
if (sessao) {
  // Renovação de sessão (Auth): NÃO grava nada nas tabelas do app.
  const { error } = await supabase.auth.setSession({
    access_token: sessao.access_token,
    refresh_token: sessao.refresh_token,
  });
  if (error) console.error(`AVISO: não foi possível renovar a sessão (${error.message}).`);
} else {
  console.error('AVISO: sessão E2E não encontrada — as consultas podem voltar vazias por RLS.');
}
const quem = await supabase.auth.getUser();
console.error(`Sessão: ${quem.data?.user?.email ?? 'anônima'}`);

const relatorio = { usuario: USUARIO };

/**
 * Existência de uma tabela: consulta uma COLUNA real (sem `head`) — PostgREST
 * devolve `PGRST205` quando a tabela não existe. (`head:true` NÃO é confiável:
 * volta sem erro para tabela ausente.)
 */
async function existeTabela(nome) {
  const { error } = await supabase.from(nome).select('id').limit(1);
  if (!error) return { existe: true };
  return { existe: false, codigo: error.code ?? null, mensagem: String(error.message ?? '').slice(0, 120) };
}

/** Existência de uma função/RPC de LEITURA (chamada com um uuid qualquer). */
async function existeRpc(nome, args) {
  const { data, error } = await supabase.rpc(nome, args);
  if (!error) return { existe: true, resposta: data };
  return { existe: false, codigo: error.code ?? null, mensagem: String(error.message ?? '').slice(0, 160) };
}

relatorio.tabelas = {
  feedbacks_360_aprovacoes_gestor: await existeTabela('feedbacks_360_aprovacoes_gestor'),
  feedbacks_360_consolidacoes: await existeTabela('feedbacks_360_consolidacoes'),
  feedbacks_360_validacoes_potencial: await existeTabela('feedbacks_360_validacoes_potencial'),
  feedbacks_360_operacoes: await existeTabela('feedbacks_360_operacoes'),
};

/* ── Estrutura REAL das tabelas (colunas da migration) — prova definitiva ─── */
async function colunas(nome, lista) {
  const { error } = await supabase.from(nome).select(lista).limit(1);
  return error ? { ok: false, codigo: error.code, mensagem: String(error.message).slice(0, 140) } : { ok: true };
}
relatorio.estrutura = {
  aprovacoes: await colunas(
    'feedbacks_360_aprovacoes_gestor',
    'id, consolidacao_id, feedback_id, empresa_id, ciclo_id, colaborador_id, decisao, justificativa, versao_avaliacao, revisao, decidido_por, decidido_em, idempotency_key'
  ),
  consolidacoes: await colunas(
    'feedbacks_360_consolidacoes',
    'id, empresa_id, ciclo_id, colaborador_id, status, enviado_por, enviado_em, atualizado_em'
  ),
  validacoesPotencial: await colunas(
    'feedbacks_360_validacoes_potencial',
    'id, feedback_id, empresa_id, ciclo_id, colaborador_id, versao_avaliacao, validado_por, validado_em'
  ),
  operacoes: await colunas('feedbacks_360_operacoes', 'idempotency_key, feedback_id, empresa_id, operacao, resultado'),
};

/* ── Contagens REAIS (sem `head`, para o count vir preenchido) ───────────── */
const contar = async (nome) => {
  const { count, error } = await supabase.from(nome).select('id', { count: 'exact' }).limit(1);
  return error ? { erro: error.code, mensagem: String(error.message).slice(0, 90) } : { total: count ?? 0 };
};
relatorio.contagens = {
  feedbacks360: await contar('feedbacks_360'),
  ciclos: await contar('ciclos_avaliacao'),
  colaboradores: await contar('colaboradores'),
};

/* ── Feedbacks REAIS acessíveis (para escolher a avaliação de homologação) ─ */
const brutos =
  (
    await supabase
      .from('feedbacks_360')
      .select('id, empresa_id, ciclo_id, avaliado_id, avaliador_id, tipo, status, nota_geral, potencial, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(40)
  ).data ?? [];
const idsColab = [...new Set(brutos.flatMap((g) => [g.avaliado_id, g.avaliador_id]).filter(Boolean))];
const colabs = idsColab.length
  ? ((await supabase.from('colaboradores').select('id, nome_completo, empresa_id, supervisor_id, user_id').in('id', idsColab)).data ?? [])
  : [];
const porId = new Map(colabs.map((c) => [c.id, c]));
relatorio.feedbacksReais = brutos.map((g) => ({
  id: g.id,
  empresaId: g.empresa_id,
  cicloId: g.ciclo_id,
  tipo: g.tipo,
  status: g.status,
  avaliado: porId.get(g.avaliado_id)?.nome_completo ?? null,
  avaliadoId: g.avaliado_id,
  avaliadoSupervisor: porId.get(g.avaliado_id)?.supervisor_id ?? null,
  avaliadoUserId: porId.get(g.avaliado_id)?.user_id ?? null,
  avaliador: porId.get(g.avaliador_id)?.nome_completo ?? null,
  atualizadoEm: g.updated_at,
}));

relatorio.ciclos = (await supabase.from('ciclos_avaliacao').select('id, nome, empresa_id, status').limit(20)).data ?? [];

/* ── Leituras que o modal/fila usam no MODO REAL (precisam existir) ───────── */
relatorio.leiturasModoReal = {
  vw_feedbacks_360_versao: await colunas(
    'vw_feedbacks_360_versao',
    'feedback_id, empresa_id, ciclo_id, tipo, status, potencial, versao_avaliacao'
  ),
  feedbacks_360_select: await colunas('feedbacks_360', 'id, empresa_id, ciclo_id, tipo, status'),
};

/* ── O DESCARTÁVEL de homologação (nunca um registro real) ────────────────── */
relatorio.colaboradoresHomolog = (
  await supabase
    .from('colaboradores')
    .select('id, nome_completo, empresa_id, supervisor_id, user_id, status, cargo')
    .ilike('nome_completo', '%HOMOLOG%')
).data ?? [];

/* ── Avaliações REAIS do GESTOR já CONCLUÍDAS (candidatas à aprovação) ────── */
const gestores = brutos.filter((g) => String(g.tipo).toLowerCase() === 'gestor' && String(g.status).toLowerCase() === 'concluido');
relatorio.avaliacoesDoGestorConcluidas = gestores.map((g) => ({
  feedbackId: g.id,
  empresaId: g.empresa_id,
  cicloId: g.ciclo_id,
  avaliado: porId.get(g.avaliado_id)?.nome_completo ?? null,
  avaliadoId: g.avaliado_id,
  avaliadoSupervisor: porId.get(g.avaliado_id)?.supervisor_id ?? null,
  avaliadoUserId: porId.get(g.avaliado_id)?.user_id ?? null,
}));

/* ── Já existe solicitação/decisão? (tabelas da migration pendente) ───────── */
const consolidacoes = await supabase.from('feedbacks_360_consolidacoes').select('colaborador_id, ciclo_id, status').limit(20);
relatorio.consolidacoesExistentes = consolidacoes.error
  ? { erro: consolidacoes.error.code }
  : (consolidacoes.data ?? []);
const aprovacoes = await supabase.from('feedbacks_360_aprovacoes_gestor').select('colaborador_id, decisao').limit(20);
relatorio.aprovacoesExistentes = aprovacoes.error ? { erro: aprovacoes.error.code } : (aprovacoes.data ?? []);

relatorio.rpcs = {
  pode_aprovar_colaborador: await existeRpc('pode_aprovar_colaborador', { p_colaborador_id: USUARIO }),
  pode_gerir_avaliacoes: await existeRpc('pode_gerir_avaliacoes', {}),
  pode_validar_potencial: await existeRpc('pode_validar_potencial', {}),
  versao_avaliacao_feedback: await existeRpc('versao_avaliacao_feedback', { p_feedback_id: USUARIO }),
};

relatorio.empresasDoUsuario = (await supabase.from('user_empresas').select('empresa_id, is_default').eq('user_id', USUARIO)).data ?? [];
relatorio.papeisDoUsuario = (await supabase.from('user_roles').select('role').eq('user_id', USUARIO)).data ?? [];

// Vínculo: colaborador cujo user_id é o da conta informada.
relatorio.colaboradorDoUsuario = (
  await supabase
    .from('colaboradores')
    .select('id, nome_completo, empresa_id, supervisor_id, status, user_id')
    .eq('user_id', USUARIO)
).data ?? [];

writeFileSync('tmp-diagnostico-aprovacao.json', JSON.stringify(relatorio, null, 2));
console.log(JSON.stringify(relatorio, null, 2));
