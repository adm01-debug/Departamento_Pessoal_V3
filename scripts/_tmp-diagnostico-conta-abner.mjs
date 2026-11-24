/**
 * TEMPORÁRIO — DIAGNÓSTICO DA CONTA GESTORA (Somente leitura, sem SQL remoto).
 *
 * Confere, com os MESMOS endpoints que o app usa (PostgREST GET + RPC de leitura):
 *   1. papéis da conta (admin + gestor convivem?);
 *   2. vínculo `colaboradores.user_id` da conta (é o bloqueio da aprovação);
 *   3. quem é supervisor de quem (o vínculo que define o gestor responsável);
 *   4. avaliações reais existentes (tipo/status) para atribuição de homologação;
 *   5. infraestrutura de aprovação formal (tabelas e RPCs da migration).
 *
 * Nenhuma escrita. Uso: node scripts/_tmp-diagnostico-conta-abner.mjs
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

const CONTA = '2a1f0c4f-7587-49a7-81aa-e7e35cf0848d';
const OUT = 'tmp-conta-abner';
mkdirSync(OUT, { recursive: true });

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim()])
);
const BASE = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_ANON_KEY;
const estado = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));
const token = JSON.parse(estado.origins[0].localStorage.find((i) => i.name.endsWith('-auth-token')).value);
const JWT = token.access_token;
const headers = { apikey: ANON, Authorization: `Bearer ${JWT}`, 'Content-Type': 'application/json' };

const get = async (caminho) => {
  const r = await fetch(`${BASE}/rest/v1/${caminho}`, { headers });
  const texto = await r.text();
  let corpo;
  try {
    corpo = JSON.parse(texto);
  } catch {
    corpo = texto.slice(0, 200);
  }
  return { status: r.status, corpo };
};

const rpc = async (nome, args = {}) => {
  const r = await fetch(`${BASE}/rest/v1/rpc/${nome}`, { method: 'POST', headers, body: JSON.stringify(args) });
  const texto = await r.text();
  let corpo;
  try {
    corpo = JSON.parse(texto);
  } catch {
    corpo = texto.slice(0, 200);
  }
  return { status: r.status, corpo };
};

const rel = {};
try {
  /* 1 · PAPÉIS */
  const papeis = await get(`user_roles?select=role,user_id&user_id=eq.${CONTA}`);
  rel.papeis = { status: papeis.status, roles: Array.isArray(papeis.corpo) ? papeis.corpo.map((r) => r.role) : papeis.corpo };

  /* 2 · VÍNCULO DA CONTA */
  const porUser = await get(
    `colaboradores?select=id,nome_completo,empresa_id,user_id,supervisor_id,status&user_id=eq.${CONTA}`
  );
  rel.vinculoDaConta = { status: porUser.status, linhas: Array.isArray(porUser.corpo) ? porUser.corpo : porUser.corpo };

  const descartavel = await get(
    'colaboradores?select=id,nome_completo,empresa_id,user_id,supervisor_id,status&or=(cpf.eq.00000000000,nome_completo.ilike.*HOMOLOG*)'
  );
  rel.descartavelHomologacao = { status: descartavel.status, linhas: descartavel.corpo };

  /* 3 · QUEM É SUPERVISOR DE QUEM (empresa da conta) */
  const empresa = Array.isArray(descartavel.corpo) ? descartavel.corpo[0]?.empresa_id : null;
  rel.empresa = empresa;
  if (empresa) {
    const colabs = await get(
      `colaboradores?select=id,nome_completo,user_id,supervisor_id&empresa_id=eq.${empresa}&order=nome_completo.asc&limit=200`
    );
    const lista = Array.isArray(colabs.corpo) ? colabs.corpo : [];
    rel.colaboradores = {
      total: lista.length,
      comUserId: lista.filter((c) => c.user_id).length,
      comSupervisor: lista.filter((c) => c.supervisor_id).length,
      mapa: lista.map((c) => ({
        id: c.id,
        nome: c.nome_completo,
        temUser: Boolean(c.user_id),
        userEhAbner: c.user_id === CONTA,
        supervisor: c.supervisor_id ?? null,
      })),
    };

    /* 4 · AVALIAÇÕES REAIS (para a atribuição de homologação) */
    const fbs = await get(
      `feedbacks_360?select=id,tipo,status,avaliado_id,avaliador_id,ciclo_id,created_at&empresa_id=eq.${empresa}&order=created_at.desc&limit=100`
    );
    const listaFb = Array.isArray(fbs.corpo) ? fbs.corpo : [];
    rel.feedbacks = {
      status: fbs.status,
      total: listaFb.length,
      porTipoStatus: listaFb.reduce((acc, f) => {
        const k = `${f.tipo ?? '?'}/${f.status ?? '?'}`;
        return { ...acc, [k]: (acc[k] ?? 0) + 1 };
      }, {}),
      gestorConcluido: listaFb.filter(
        (f) => String(f.tipo).toLowerCase() === 'gestor' && String(f.status).toLowerCase() === 'concluido'
      ).length,
      amostra: listaFb.slice(0, 8).map((f) => ({
        id: f.id,
        tipo: f.tipo,
        status: f.status,
        avaliado: f.avaliado_id,
        avaliador: f.avaliador_id,
        ciclo: f.ciclo_id,
      })),
    };
  }

  /* 5 · INFRAESTRUTURA DE APROVAÇÃO FORMAL */
  rel.infraestrutura = {
    consolidacoes: (await get('feedbacks_360_consolidacoes?select=*&limit=1')).status,
    aprovacoes: (await get('feedbacks_360_aprovacoes_gestor?select=*&limit=1')).status,
    validacoes: (await get('feedbacks_360_validacoes_potencial?select=*&limit=1')).status,
    versoes: (await get('vw_feedbacks_360_versao?select=*&limit=1')).status,
    rpc_pode_aprovar: (await rpc('pode_aprovar_colaborador', { p_colaborador_id: null })).status,
    rpc_situacao: (await rpc('situacao_aprovacao', { p_colaborador_id: null, p_ciclo_id: null })).status,
    rpc_versao_consolidada: (await rpc('versao_consolidada_avaliacao', { p_colaborador_id: null, p_ciclo_id: null })).status,
  };
} catch (erro) {
  rel.erro = String(erro?.message ?? erro).slice(0, 500);
}

writeFileSync(`${OUT}/diagnostico.json`, JSON.stringify(rel, null, 2));
console.log(JSON.stringify(rel, null, 2).slice(0, 9000));
