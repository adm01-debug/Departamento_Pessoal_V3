/**
 * TEMPORÁRIO — FATOS DO AMBIENTE REAL (SOMENTE LEITURA, sem SQL).
 *
 * Responde, com os MESMOS endpoints que o app consome (PostgREST GET, sessão do
 * usuário E2E), o que falta para o encaminhamento REAL funcionar:
 *   1. os colaboradores reais têm `supervisor_id`/`user_id` (vínculo do gestor)?
 *   2. os `feedbacks_360` reais têm `avaliado_id`/`avaliador_id`/`ciclo_id` e
 *      quantos são de GESTOR concluídos (a única âncora da fila)?
 *   3. as tabelas de aprovação e as RPCs da migration `20261017090000` existem?
 *
 * Nenhuma escrita. Uso: node scripts/_tmp-probe-real-encaminhamento.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const OUT = 'tmp-encaminhamento-alinhamento';
mkdirSync(OUT, { recursive: true });

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim()])
);
const URL_BASE = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_ANON_KEY;

const estado = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));
const chave = estado.origins?.[0]?.localStorage?.find((i) => i.name.endsWith('-auth-token'));
const token = JSON.parse(chave.value);
const JWT = token.access_token;

const cabecalhos = {
  apikey: ANON,
  Authorization: `Bearer ${JWT}`,
  'Content-Type': 'application/json',
};

const get = async (caminho) => {
  const r = await fetch(`${URL_BASE}/rest/v1/${caminho}`, { headers: cabecalhos });
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
  const r = await fetch(`${URL_BASE}/rest/v1/rpc/${nome}`, {
    method: 'POST',
    headers: cabecalhos,
    body: JSON.stringify(args),
  });
  const texto = await r.text();
  let corpo;
  try {
    corpo = JSON.parse(texto);
  } catch {
    corpo = texto.slice(0, 200);
  }
  return { status: r.status, corpo };
};

const relatorio = {};
try {
  const empresas = await get('empresas?select=id&limit=3');
  relatorio.empresas = { status: empresas.status, total: Array.isArray(empresas.corpo) ? empresas.corpo.length : null };
  const ids = Array.isArray(empresas.corpo) ? empresas.corpo.map((e) => e.id) : [];
  relatorio.empresaId = ids[0] ?? null;
  relatorio.porEmpresa = {};

  for (const empresaId of ids) {
    const colabs = await get(
      `colaboradores?select=id,nome_completo,user_id,supervisor_id&empresa_id=eq.${empresaId}&limit=200`
    );
    const lista = Array.isArray(colabs.corpo) ? colabs.corpo : [];
    const fbs = await get(
      `feedbacks_360?select=id,tipo,status,avaliado_id,avaliador_id,ciclo_id,created_at&empresa_id=eq.${empresaId}&order=created_at.desc&limit=50`
    );
    const listaFb = Array.isArray(fbs.corpo) ? fbs.corpo : [];
    relatorio.porEmpresa[empresaId.slice(0, 8)] = {
      colaboradores: lista.length,
      comSupervisor: lista.filter((c) => c.supervisor_id).length,
      comUserId: lista.filter((c) => c.user_id).length,
      feedbacks: listaFb.length,
      porTipo: listaFb.reduce((acc, f) => ({ ...acc, [f.tipo ?? '?']: (acc[f.tipo ?? '?'] ?? 0) + 1 }), {}),
      gestorConcluido: listaFb.filter(
        (f) => String(f.tipo).toLowerCase() === 'gestor' && String(f.status).toLowerCase() === 'concluido'
      ).length,
      semAvaliado: listaFb.filter((f) => !f.avaliado_id).length,
      semAvaliador: listaFb.filter((f) => !f.avaliador_id).length,
      semCiclo: listaFb.filter((f) => !f.ciclo_id).length,
      amostraFeedbacks: listaFb.slice(0, 6).map((f) => ({
        id: String(f.id).slice(0, 8),
        tipo: f.tipo,
        status: f.status,
        avaliado: f.avaliado_id ? String(f.avaliado_id).slice(0, 8) : null,
        avaliador: f.avaliador_id ? String(f.avaliador_id).slice(0, 8) : null,
        ciclo: f.ciclo_id ? String(f.ciclo_id).slice(0, 8) : null,
      })),
    };
  }

  if (relatorio.empresaId) {
    const colabs = await get(
      `colaboradores?select=id,nome_completo,user_id,supervisor_id&empresa_id=eq.${relatorio.empresaId}&limit=200`
    );
    const lista = Array.isArray(colabs.corpo) ? colabs.corpo : [];
    relatorio.vinculos = {
      status: colabs.status,
      total: lista.length,
      comSupervisor: lista.filter((c) => c.supervisor_id).length,
      comUserId: lista.filter((c) => c.user_id).length,
      amostra: lista.slice(0, 5).map((c) => ({
        nome: c.nome_completo,
        supervisor: c.supervisor_id ? String(c.supervisor_id).slice(0, 8) : null,
        user: c.user_id ? String(c.user_id).slice(0, 8) : null,
      })),
    };
  }

  relatorio.tabelasDaMigration = {
    consolidacoes: (await get('feedbacks_360_consolidacoes?select=*&limit=1')).status,
    aprovacoes: (await get('feedbacks_360_aprovacoes_gestor?select=*&limit=1')).status,
    versoes: (await get('vw_feedbacks_360_versao?select=*&limit=1')).status,
  };
  relatorio.rpcsDaMigration = {
    pode_aprovar_colaborador: (await rpc('pode_aprovar_colaborador', { p_colaborador: null })).status,
    situacao_aprovacao: (await rpc('situacao_aprovacao', { p_colaborador: null, p_ciclo: null })).status,
  };
} catch (erro) {
  relatorio.erro = String(erro?.message ?? erro).slice(0, 400);
}

writeFileSync(`${OUT}/probe-real.json`, JSON.stringify(relatorio, null, 2));
console.log(JSON.stringify(relatorio, null, 2));
