/**
 * PROBE READ-ONLY — estado real do backend de aprovação no projeto principal.
 *
 * Faz login com a conta E2E (não cria nada), então consulta:
 *   1. quantos feedbacks reais existem;
 *   2. se as tabelas novas existem (esperado 404/PGRST205 antes da migration);
 *   3. se as RPCs novas existem (idem);
 *   4. o vínculo `colaboradores.user_id` da conta usada.
 *
 * Uso: node _tmp-probe-aprovacao-real.mjs
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim()])
);
const BASE = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_ANON_KEY;
const EMAIL = process.env.E2E_USER_EMAIL ?? 'admin@teste.local';
const SENHA = process.env.E2E_USER_PASSWORD ?? 'Admin@2026!';

const login = await fetch(`${BASE}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: SENHA }),
});
const sessao = await login.json();
if (!login.ok || !sessao.access_token) {
  console.error('login falhou:', login.status, sessao?.msg ?? sessao?.error_description ?? '');
  process.exit(1);
}
const JWT = sessao.access_token;
const headers = { apikey: ANON, Authorization: `Bearer ${JWT}`, 'Content-Type': 'application/json' };

const get = async (caminho) => {
  const r = await fetch(`${BASE}/rest/v1/${caminho}`, { headers });
  const texto = await r.text();
  let corpo;
  try {
    corpo = JSON.parse(texto);
  } catch {
    corpo = texto.slice(0, 160);
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
    corpo = texto.slice(0, 160);
  }
  return { status: r.status, corpo };
};

const resumo = (r) => ({
  status: r.status,
  ok: r.status >= 200 && r.status < 300,
  erro: r.status >= 300 ? (r.corpo?.message ?? String(r.corpo).slice(0, 80)) : null,
  linhas: Array.isArray(r.corpo) ? r.corpo.length : null,
});

const rel = {
  projeto: BASE,
  conta: EMAIL,
  userId: sessao.user?.id ?? null,
  feedbacks: resumo(await get('feedbacks_360?select=id,tipo,status,ciclo_id,avaliado_id&limit=1000')),
  consolidacoes: resumo(await get('feedbacks_360_consolidacoes?select=id&limit=1')),
  aprovacoes: resumo(await get('feedbacks_360_aprovacoes_gestor?select=id&limit=1')),
  validacoesPotencial: resumo(await get('feedbacks_360_validacoes_potencial?select=id&limit=1')),
  rpcPodeAprovar: resumo(await rpc('pode_aprovar_colaborador', { p_colaborador_id: null })),
  rpcSituacao: resumo(await rpc('situacao_aprovacao', { p_colaborador_id: null, p_ciclo_id: null })),
  rpcVersaoConsolidada: resumo(
    await rpc('versao_consolidada_avaliacao', { p_colaborador_id: null, p_ciclo_id: null })
  ),
  papeis: resumo(await get(`user_roles?select=role,user_id&user_id=eq.${sessao.user?.id}`)),
  vinculoDaConta: resumo(
    await get(`colaboradores?select=id,user_id,supervisor_id,nome_completo&user_id=eq.${sessao.user?.id}`)
  ),
};

mkdirSync('tmp-aprovacao-real', { recursive: true });
writeFileSync('tmp-aprovacao-real/probe.json', `${JSON.stringify(rel, null, 2)}\n`);
console.log(JSON.stringify(rel, null, 2));
