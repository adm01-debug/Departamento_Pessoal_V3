#!/usr/bin/env node
/**
 * Inventario das rotas do front -> inventario/estado/rotas.json (fonte de consulta dos agentes).
 * Mesmo padrao do Zapp Web V2 (scripts/inventario/gerar-rotas.mjs), adaptado ao roteamento do DP V3.
 *
 * Le o codigo, nao documentacao:
 *  - URLs: src/App.tsx (<Route> aninhadas -> caminho completo, componente via `LazyPage Component={X}`
 *          ou JSX direto, ProtectedRoute/AdminRoute herdados do pai, Navigate) + os imports/lazy do arquivo
 *  - Menu: src/components/layout/AppSidebar.tsx (`menuGroups` -> grupo, rotulo, caminho; `portalItem`)
 *  - Para cada tela: segue os imports a partir do arquivo da tela (src/hooks, src/services, src/lib,
 *    src/utils, ...) e lista hooks, edge functions invocadas, RPCs, tabelas (.from e /rest/v1) e buckets.
 *  - `problemas`: item de menu sem rota (cai no NotFound), item de menu visivel para todos apontando
 *    rota de AdminRoute, URL sem arquivo e import local que nao resolve.
 *
 * Uso:
 *   node scripts/inventario/gerar-rotas.mjs           grava inventario/estado/rotas.json
 *   node scripts/inventario/gerar-rotas.mjs --check   exit 1 se o arquivo commitado esta desatualizado
 * Saida deterministica (sem data): o mesmo codigo gera o mesmo arquivo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ_PADRAO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SAIDA_REL = 'inventario/estado/rotas.json';
const ARQ_ROTAS = 'src/App.tsx';
const ARQ_MENU = 'src/components/layout/AppSidebar.tsx';
const EXTENSOES = ['.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts'];
const INVOLUCROS = new Set(['ProtectedRoute', 'AdminRoute', 'Navigate', 'Route', 'Suspense', 'ErrorBoundary', 'RouteErrorBoundary', 'LazyPage']);

const ler = (raiz, rel) => fs.readFileSync(path.join(raiz, rel), 'utf8');
const rel = (raiz, abs) => path.relative(raiz, abs).split(path.sep).join('/');
const unico = (lista) => [...new Set(lista)].sort();

/** Resolve um especificador de import para um arquivo do repo (ou null se externo/inexistente). */
export function resolverImport(raiz, deArquivoAbs, especificador) {
  let base;
  if (especificador.startsWith('@/')) base = path.join(raiz, 'src', especificador.slice(2));
  else if (especificador.startsWith('.')) base = path.resolve(path.dirname(deArquivoAbs), especificador);
  else return null;
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  for (const ext of EXTENSOES) if (fs.existsSync(base + ext)) return base + ext;
  return undefined; // local, mas nao existe
}

/** Imports de um arquivo: [{ especificador, nomes[] }] (estaticos e import() dinamico). */
export function extrairImports(texto) {
  const out = [];
  for (const m of texto.matchAll(/import\s+(type\s+)?([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g)) {
    if (m[1]) continue;
    const nomes = [...m[2].matchAll(/\b([A-Za-z_$][\w$]*)\b(?!\s*as\b)/g)].map((x) => x[1])
      .filter((n) => !['type', 'as', 'default'].includes(n));
    out.push({ especificador: m[3], nomes });
  }
  for (const m of texto.matchAll(/(?:import|export)\s*(?:\*\s*from\s*)?['"]([^'"]+)['"]/g)) out.push({ especificador: m[1], nomes: [] });
  for (const m of texto.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)) out.push({ especificador: m[1], nomes: [] });
  for (const m of texto.matchAll(/export\s+(?:\{[^}]*\}|\*)\s+from\s+['"]([^'"]+)['"]/g)) out.push({ especificador: m[1], nomes: [] });
  return out;
}

/**
 * Mapa nome -> valor dos `const NOME = 'literal'` (ou `export const`) de nivel de modulo no texto.
 * So resolve o caso mais comum do repo: identificador passado direto pra `.from`/`fromTable`/
 * `storage.from`/`rpc`/`invoke` que e, no mesmo arquivo, uma constante de string (ex.:
 * `TALKX_MEDIA_BUCKET`, `ACL_ALERTS_TABLE`). Nao resolve parametro de funcao nem ternario.
 * Coluna zero sozinha nao basta (achado do Qodo na revisao desta correcao): um `const` dentro
 * de funcao tambem pode estar em coluna zero se o arquivo nao passou pelo Prettier (o repo nao
 * tem `prettier --check` no CI). Por isso conta profundidade de `{`/`}` linha a linha e so
 * aceita o `const` quando a profundidade, ANTES de processar a linha, e zero (nivel de modulo
 * de verdade). Contagem ingenua (nao ignora chave dentro de string/template) e de proposito:
 * na duvida, prefere nao resolver a resolver errado.
 */
function constantesDeString(texto) {
  const mapa = new Map();
  let profundidade = 0;
  for (const linha of texto.split('\n')) {
    if (profundidade === 0) {
      const m = linha.match(/^(?:export\s+)?const\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?::\s*[^=]+)?=\s*['"`]([A-Za-z0-9_.-]+)['"`]\s*[;,]?\s*$/);
      if (m) mapa.set(m[1], m[2]);
    }
    for (const ch of linha) {
      if (ch === '{') profundidade++;
      else if (ch === '}') profundidade--;
    }
  }
  return mapa;
}

/**
 * Chamadas ao Supabase num texto: tabelas (`.from` do cliente — no DP ele passa pelo
 * external-db-bridge de forma transparente —, `fromTable` e `/rest/v1/<tabela>`), buckets
 * (`storage.from`), RPCs (`.rpc`) e edges (`functions.invoke`, `invokeEdge`, `/functions/v1/<edge>`).
 */
export function extrairChamadas(texto) {
  const pegar = (re) => [...texto.matchAll(re)].map((m) => m[1]);
  const consts = constantesDeString(texto);
  const tabelas = [];
  const buckets = [];
  for (const m of texto.matchAll(/(\bstorage\s*)?\.from\(\s*['"`]([A-Za-z0-9_-]+)['"`]/g)) (m[1] ? buckets : tabelas).push(m[2]);
  for (const m of texto.matchAll(/(\bstorage\s*)?\.from\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/g)) {
    if (consts.has(m[2])) (m[1] ? buckets : tabelas).push(consts.get(m[2]));
  }
  // `fromTable('x')` / `fromTable(CONST)` — atalho tipado de src/lib/supabaseHelpers.ts, sempre tabela.
  for (const m of texto.matchAll(/\bfromTable\(\s*['"`]([A-Za-z0-9_-]+)['"`]/g)) tabelas.push(m[1]);
  for (const m of texto.matchAll(/\bfromTable\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/g)) {
    if (consts.has(m[1])) tabelas.push(consts.get(m[1]));
  }
  tabelas.push(...pegar(/\/rest\/v1\/([A-Za-z0-9_]+)/g).filter((t) => t !== 'rpc'));
  return {
    tabelas,
    buckets,
    // `.rpc('x')` e o apelido `const rpc = supabase.rpc.bind(...)` + `rpc('x')`.
    rpcs: [...pegar(/(?:\.|\b)rpc\(\s*['"`]([A-Za-z0-9_]+)['"`]/g), ...pegar(/\/rest\/v1\/rpc\/([A-Za-z0-9_]+)/g)],
    // `functions.invoke` (inclusive quebrado em linha) e o atalho `invokeEdge<T>(...)` de
    // src/lib/invokeEdge.ts; `invoke('evolution-api/connect')` conta como a edge `evolution-api`.
    // `fetch(`${SUPABASE_URL}/functions/v1/get-call-recording`)` (chamada direta pela URL): so dentro
    // de string/template; a URL mostrada como texto em JSX (ex.: GmailWebhookMonitor) nao e chamada.
    edges: [
      ...pegar(/(?:functions\s*\.\s*invoke|\binvokeEdge)(?:<[^>()]*>)?\(\s*['"`]([A-Za-z0-9_-]+)(?:\/[^'"`]*)?['"`]/g),
      ...pegar(/['"`][^'"`\n]*\/functions\/v1\/([A-Za-z0-9_-]+)/g),
    ],
  };
}

/** Tira comentarios de bloco e linhas inteiras de `//` (nao mexe em `//` dentro de string, ex.: URL). */
export const semComentarios = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const ehTeste = (p) => /(\.test\.|\.spec\.|__tests__|\.stories\.)/.test(p);

/**
 * Fecho de imports a partir do arquivo da tela. Segue sem limite a pasta da tela e PASTAS_LIVRES
 * (hooks, services, lib, utils, calculators, schemas — onde o DP chama tabela/RPC/edge);
 * componentes de src/components/ entram ate MAX_SALTOS_FEATURE saltos. Fica de fora so o kit de UI
 * (src/components/ui/) e teste. Import local que nao resolve vira problema.
 */
export const PASTAS_LIVRES = ['src/hooks', 'src/services', 'src/lib', 'src/utils', 'src/calculators', 'src/schemas'];
export const MAX_SALTOS_FEATURE = 2;
export function fechoDaTela(raiz, arquivoTelaAbs) {
  const pastaFeature = path.dirname(arquivoTelaAbs);
  const dentro = (abs, rel_) => abs.startsWith(path.join(raiz, rel_) + path.sep);
  const livre = (abs) => abs.startsWith(pastaFeature + path.sep) || PASTAS_LIVRES.some((d) => dentro(abs, d));
  const outraFeature = (abs) => dentro(abs, 'src/components') && !dentro(abs, 'src/components/ui');
  const saltosVistos = new Map(); // arquivo -> menor numero de saltos com que foi visitado
  const hooks = new Map();
  const quebrados = new Set();
  const chamadas = { tabelas: [], buckets: [], rpcs: [], edges: [] };
  const fila = [[arquivoTelaAbs, 0]];
  while (fila.length) {
    const [atual, saltos] = fila.shift();
    if (saltosVistos.has(atual) && saltosVistos.get(atual) <= saltos) continue;
    const primeiraVez = !saltosVistos.has(atual);
    saltosVistos.set(atual, saltos);
    const texto = fs.readFileSync(atual, 'utf8');
    if (primeiraVez) {
      const c = extrairChamadas(texto);
      for (const k of Object.keys(chamadas)) chamadas[k].push(...c[k]);
    }
    // Comentario nao e import: `// export * from './X'` desligado nao pode virar import quebrado.
    for (const imp of extrairImports(semComentarios(texto))) {
      const alvo = resolverImport(raiz, atual, imp.especificador);
      if (alvo === undefined && !/\.(css|scss|svg|png|jpe?g|webp|gif|json)(\?.*)?$|\?/.test(imp.especificador)) {
        quebrados.add(`${rel(raiz, atual)} -> ${imp.especificador}`);
      }
      if (!alvo || ehTeste(alvo)) continue;
      for (const nome of imp.nomes) if (/^use[A-Z]/.test(nome) && !hooks.has(nome)) hooks.set(nome, rel(raiz, alvo));
      if (livre(alvo)) fila.push([alvo, saltos]);
      else if (outraFeature(alvo) && saltos < MAX_SALTOS_FEATURE) fila.push([alvo, saltos + 1]);
    }
  }
  return {
    arquivos_lidos: saltosVistos.size,
    hooks: [...hooks.entries()].map(([nome, arquivo]) => ({ nome, arquivo })).sort((a, b) => a.nome.localeCompare(b.nome)),
    buckets: unico(chamadas.buckets),
    edges: unico(chamadas.edges),
    rpcs: unico(chamadas.rpcs),
    tabelas: unico(chamadas.tabelas),
    imports_quebrados: [...quebrados].sort(),
  };
}


/**
 * <Route> de um JSX com <Routes>: [{ tag, pai }] na ordem do arquivo. Acha o fim da tag de abertura
 * contando chaves e aspas (o `element={...}` tem `>` dentro) e empilha as que tem filhos.
 */
export function lerTagsDeRota(texto) {
  const ini = texto.indexOf('<Routes>');
  const fim = texto.lastIndexOf('</Routes>');
  if (ini === -1 || fim === -1) return [];
  const corpo = texto.slice(ini, fim);
  const tags = [];
  const pilha = [];
  let i = 0;
  while (i < corpo.length) {
    if (corpo.startsWith('</Route>', i)) { pilha.pop(); i += 8; continue; }
    if (corpo.startsWith('<Route', i) && /[\s/>]/.test(corpo[i + 6] ?? '')) {
      let j = i + 6;
      let profundidade = 0;
      let aspas = null;
      for (; j < corpo.length; j += 1) {
        const c = corpo[j];
        if (aspas) { if (c === aspas) aspas = null; continue; }
        if (c === '"' || c === "'" || c === '`') aspas = c;
        else if (c === '{') profundidade += 1;
        else if (c === '}') profundidade -= 1;
        else if (c === '>' && profundidade === 0) break;
      }
      const no = { tag: corpo.slice(i, j + 1), pai: pilha[pilha.length - 1] ?? null };
      tags.push(no);
      if (corpo[j - 1] !== '/') pilha.push(no);
      i = j + 1;
      continue;
    }
    i += 1;
  }
  return tags;
}

const caminhoProprio = (tag) => (tag.match(/\spath=["']([^"']+)["']/) || [])[1] ?? null;
export function juntarCaminho(pai, filho) {
  if (!filho) return pai ?? null;
  if (filho.startsWith('/')) return filho;
  const base = (pai ?? '/').replace(/\/$/, '');
  return `${base}/${filho}`;
}

/** Componentes importados no arquivo de rotas: nome -> especificador (lazy, default e nomeado). */
export function importsDeComponentes(texto) {
  const mapa = {};
  for (const m of texto.matchAll(/const\s+(\w+)\s*=\s*lazy\w*\(\s*\(\)\s*=>\s*import\(\s*['"]([^'"]+)['"]\s*\)/g)) mapa[m[1]] = m[2];
  for (const m of texto.matchAll(/^import\s+(\w+)\s*(?:,\s*\{([^}]*)\})?\s*from\s*['"]([^'"]+)['"]/gm)) {
    mapa[m[1]] ??= m[3];
    for (const n of (m[2] || '').split(',').map((s) => s.trim().split(/\s+as\s+/).pop()).filter(Boolean)) mapa[n] ??= m[3];
  }
  for (const m of texto.matchAll(/^import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/gm)) {
    for (const n of m[1].split(',').map((s) => s.trim().split(/\s+as\s+/).pop()).filter(Boolean)) mapa[n] ??= m[2];
  }
  return mapa;
}

/** URLs do react-router em src/App.tsx, com caminho completo e protecao herdada dos pais. */
export function lerUrls(raiz) {
  const texto = ler(raiz, ARQ_ROTAS);
  const abs = path.join(raiz, ARQ_ROTAS);
  const imports = importsDeComponentes(texto);
  const tags = lerTagsDeRota(texto);
  const caminhoDe = new Map();
  const temFilhos = new Set(tags.map((t) => t.pai).filter(Boolean));
  const urls = [];
  for (const no of tags) {
    const pai = no.pai ? caminhoDe.get(no.pai) : null;
    const indice = /\sindex[\s/>]/.test(no.tag);
    const caminho = indice ? (pai ?? '/') : juntarCaminho(pai, caminhoProprio(no.tag));
    caminhoDe.set(no, caminho);
    if (!caminho) continue;
    const ancestrais = [];
    for (let p = no; p; p = p.pai) ancestrais.push(p.tag);
    const componente = (no.tag.match(/Component=\{(\w+)\}/) || [])[1]
      // Prefere o componente importado: `fallback={<PageLoader />}` e local do App.tsx, nao e a tela.
      ?? [...no.tag.matchAll(/<([A-Z]\w*)/g)].map((m) => m[1]).filter((n) => !INVOLUCROS.has(n))
        .sort((x, y) => Number(!imports[x]) - Number(!imports[y]))[0] ?? null;
    const alvo = componente && imports[componente] ? resolverImport(raiz, abs, imports[componente]) : null;
    urls.push({
      caminho,
      componente,
      arquivo: alvo ? rel(raiz, alvo) : null,
      layout: temFilhos.has(no),
      protegida: ancestrais.some((t) => t.includes('<ProtectedRoute')),
      admin: ancestrais.some((t) => t.includes('<AdminRoute')),
      redireciona: (no.tag.match(/<Navigate\s+to=["']([^"']+)["']/) || [])[1] ?? null,
    });
  }
  return urls.sort((a, b) => a.caminho.localeCompare(b.caminho) || String(a.componente).localeCompare(String(b.componente)));
}

/** Itens do menu lateral: [{ grupo, rotulo, caminho }] de `menuGroups` (+ `portalItem`). */
export function lerMenu(raiz) {
  if (!fs.existsSync(path.join(raiz, ARQ_MENU))) return [];
  const texto = ler(raiz, ARQ_MENU);
  const ini = texto.indexOf('const menuGroups');
  const itens = [];
  if (ini !== -1) {
    const bloco = texto.slice(ini, texto.indexOf('\n];', ini) + 3);
    const grupos = [...bloco.matchAll(/\bid:\s*'([^']+)',\s*\n\s*label:\s*'([^']+)'/g)].map((m) => ({ id: m[1], label: m[2], pos: m.index }));
    for (const m of bloco.matchAll(/\{\s*icon:\s*\w+,\s*label:\s*'([^']+)',\s*path:\s*'([^']+)'/g)) {
      const grupo = grupos.filter((g) => g.pos < m.index).pop();
      itens.push({ grupo: grupo?.label ?? null, rotulo: m[1], caminho: m[2] });
    }
  }
  const portal = texto.match(/const\s+portalItem[^=]*=\s*\{[^}]*label:\s*'([^']+)',\s*path:\s*'([^']+)'/);
  if (portal) itens.push({ grupo: null, rotulo: portal[1], caminho: portal[2] });
  return itens;
}

/** O caminho do menu casa com algum padrao de rota (`:param` casa um segmento; `*` nao conta)? */
export function casaRota(caminho, padroes) {
  const partes = caminho.replace(/\/$/, '').split('/');
  return padroes.some((p) => {
    if (p.endsWith('*')) return false;
    const pp = p.replace(/\/$/, '').split('/');
    return pp.length === partes.length && pp.every((s, i) => s.startsWith(':') || s === partes[i]);
  });
}

/** Monta o inventario inteiro a partir de uma raiz de repo. */
export function gerarRotas(raiz = RAIZ_PADRAO) {
  const urls = lerUrls(raiz);
  const menu = lerMenu(raiz);
  const padroes = urls.filter((u) => !u.layout && !u.redireciona).map((u) => u.caminho);
  const porArquivo = new Map();
  for (const u of urls) if (u.arquivo && !u.layout) {
    if (!porArquivo.has(u.arquivo)) porArquivo.set(u.arquivo, { componente: u.componente, urls: [] });
    porArquivo.get(u.arquivo).urls.push(u.caminho);
  }
  const telas = [...porArquivo.entries()].map(([arquivo, t]) => ({
    arquivo,
    componente: t.componente,
    urls: unico(t.urls),
    menu: menu.filter((m) => casaRota(m.caminho, t.urls)).map((m) => ({ grupo: m.grupo, rotulo: m.rotulo })),
    ...fechoDaTela(raiz, path.join(raiz, arquivo)),
  })).sort((a, b) => a.arquivo.localeCompare(b.arquivo));

  const hooks = {};
  for (const t of telas) for (const h of t.hooks) {
    hooks[h.nome] ??= { arquivo: h.arquivo, telas: [] };
    hooks[h.nome].telas.push(t.arquivo);
  }
  const admin = urls.filter((u) => u.admin).map((u) => u.caminho);
  const problemas = [
    ...menu.filter((m) => !casaRota(m.caminho, padroes))
      .map((m) => ({ tipo: 'menu_sem_rota', id: m.caminho, detalhe: `item "${m.rotulo}" (${m.grupo ?? 'sem grupo'}) nao casa com nenhuma <Route>: cai no NotFound` })),
    ...menu.filter((m) => casaRota(m.caminho, admin))
      .map((m) => ({ tipo: 'menu_aponta_rota_admin', id: m.caminho, detalhe: `item "${m.rotulo}" aparece para todos no menu, mas a rota exige AdminRoute` })),
    ...urls.filter((u) => u.componente && !u.arquivo && !u.redireciona && !u.layout)
      .map((u) => ({ tipo: 'url_sem_arquivo', id: u.caminho, detalhe: `${u.componente} nao resolve em ${ARQ_ROTAS}` })),
    ...telas.flatMap((t) => t.imports_quebrados.map((q) => ({ tipo: 'import_quebrado', id: t.arquivo, detalhe: q }))),
  ];
  const comMenu = new Set(telas.filter((t) => t.menu.length).flatMap((t) => t.urls));
  const rotasSemMenu = urls.filter((u) => u.protegida && !u.layout && !u.redireciona && !u.caminho.includes(':')
    && !u.caminho.endsWith('*') && !comMenu.has(u.caminho)).map((u) => u.caminho);

  return {
    format_version: 1,
    fonte: `scripts/inventario/gerar-rotas.mjs (le ${ARQ_ROTAS}, ${ARQ_MENU} e os imports de cada tela)`,
    resumo: {
      urls: urls.length,
      telas: telas.length,
      itens_de_menu: menu.length,
      urls_admin: admin.length,
      urls_publicas: urls.filter((u) => !u.protegida && !u.layout).length,
      hooks_distintos: Object.keys(hooks).length,
      problemas: problemas.length,
    },
    urls,
    menu,
    telas,
    hooks: Object.fromEntries(Object.keys(hooks).sort().map((k) => [k, { arquivo: hooks[k].arquivo, telas: unico(hooks[k].telas) }])),
    rotas_sem_item_de_menu: {
      criterio: 'rota protegida, sem parametro, que nao e alvo de nenhum item do menu lateral (pode ser alcancada por link interno)',
      lista: rotasSemMenu,
    },
    problemas,
  };
}

export const serializar = (inv) => JSON.stringify(inv, null, 2) + '\n';

function main(argv) {
  const saida = path.join(RAIZ_PADRAO, SAIDA_REL);
  const conteudo = serializar(gerarRotas(RAIZ_PADRAO));
  if (argv.includes('--check')) {
    const atual = fs.existsSync(saida) ? fs.readFileSync(saida, 'utf8') : '';
    if (atual !== conteudo) {
      console.error(`${SAIDA_REL} desatualizado: rode node scripts/inventario/gerar-rotas.mjs e commite o resultado.`);
      process.exit(1);
    }
    console.log(`${SAIDA_REL} em dia.`);
    return;
  }
  fs.mkdirSync(path.dirname(saida), { recursive: true });
  fs.writeFileSync(saida, conteudo);
  const r = JSON.parse(conteudo).resumo;
  console.log(`rotas.json: ${r.urls} URLs, ${r.telas} telas, ${r.itens_de_menu} itens de menu, ${r.hooks_distintos} hooks, ${r.problemas} problemas.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
