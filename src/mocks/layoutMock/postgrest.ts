/**
 * MOCK VISUAL (layout) — mini-emulador de leitura do PostgREST.
 *
 * Responde, em memória, às consultas `GET /rest/v1/<tabela>` que o
 * `supabase-js` monta (`select` com joins embutidos, filtros, `order`,
 * `limit`/`offset`, `count`, `.single()`). NÃO implementa escrita: toda
 * escrita é bloqueada em `index.ts` antes de chegar aqui.
 *
 * É propositalmente simples — cobre o que as telas de Tempo & Ausências usam,
 * não é um PostgREST completo. Nada aqui toca rede, Supabase ou storage.
 */

export type Row = Record<string, unknown>;
export type Tabelas = Record<string, Row[]>;

/** Colunas cujo filtro é ignorado: todo o dataset pertence à mesma empresa fictícia. */
const FILTROS_IGNORADOS = new Set(['empresa_id', 'user_id', 'created_by']);

/** Reserved query params do PostgREST (não são filtros de coluna). */
const PARAMS_RESERVADOS = new Set(['select', 'order', 'limit', 'offset', 'columns', 'on_conflict']);

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function singular(tabela: string): string {
  if (tabela.endsWith('ies')) return `${tabela.slice(0, -3)}y`;
  if (tabela.endsWith('s')) return tabela.slice(0, -1);
  return tabela;
}

/** Divide `a,b(c,d),e` apenas nas vírgulas do nível zero. */
function dividirNivelZero(texto: string): string[] {
  const partes: string[] = [];
  let profundidade = 0;
  let atual = '';
  for (const ch of texto) {
    if (ch === '(') profundidade++;
    if (ch === ')') profundidade--;
    if (ch === ',' && profundidade === 0) {
      partes.push(atual);
      atual = '';
    } else {
      atual += ch;
    }
  }
  if (atual.trim()) partes.push(atual);
  return partes.map((p) => p.trim()).filter(Boolean);
}

function comparar(a: unknown, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  if (a !== null && a !== '' && !Number.isNaN(na) && b !== '' && !Number.isNaN(nb)) return na - nb;
  return String(a).localeCompare(b);
}

function igual(valor: unknown, alvo: string): boolean {
  if (valor === null || valor === undefined) return false;
  return String(valor) === alvo;
}

function padraoLike(alvo: string, insensivel: boolean): RegExp {
  const escapado = alvo.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '%').replace(/%/g, '.*').replace(/_/g, '.');
  return new RegExp(`^${escapado}$`, insensivel ? 'i' : '');
}

// ---------------------------------------------------------------------------
// Filtros
// ---------------------------------------------------------------------------

/** Avalia `operador.valor` (ex.: `gte.2026-01-01`, `in.(a,b)`, `is.null`). */
function avaliarOperador(valor: unknown, expressao: string): boolean {
  if (expressao.startsWith('not.')) return !avaliarOperador(valor, expressao.slice(4));
  const ponto = expressao.indexOf('.');
  const operador = expressao.slice(0, ponto);
  const alvo = expressao.slice(ponto + 1);
  switch (operador) {
    case 'eq':
      return igual(valor, alvo);
    case 'neq':
      return !igual(valor, alvo);
    case 'gt':
      return valor != null && comparar(valor, alvo) > 0;
    case 'gte':
      return valor != null && comparar(valor, alvo) >= 0;
    case 'lt':
      return valor != null && comparar(valor, alvo) < 0;
    case 'lte':
      return valor != null && comparar(valor, alvo) <= 0;
    case 'like':
      return valor != null && padraoLike(alvo, false).test(String(valor));
    case 'ilike':
      return valor != null && padraoLike(alvo, true).test(String(valor));
    case 'in': {
      const itens = dividirNivelZero(alvo.replace(/^\(/, '').replace(/\)$/, '')).map((i) => i.replace(/^"|"$/g, ''));
      return valor != null && itens.includes(String(valor));
    }
    case 'is':
      if (alvo === 'null') return valor === null || valor === undefined;
      if (alvo === 'true') return valor === true;
      if (alvo === 'false') return valor === false;
      return false;
    case 'cs':
    case 'ov': {
      const itens = dividirNivelZero(alvo.replace(/^[{(]/, '').replace(/[})]$/, ''));
      return Array.isArray(valor) && itens.some((i) => valor.map(String).includes(i));
    }
    default:
      return true;
  }
}

function avaliarCondicao(linha: Row, coluna: string, expressao: string, tabela: string): boolean {
  if (FILTROS_IGNORADOS.has(coluna)) return true;
  // O usuário logado (e-mail real) não existe no dataset fictício: o filtro por e-mail
  // resolve para o primeiro colaborador, senão o card 'Hoje' do Ponto ficaria vazio.
  if (tabela === 'colaboradores' && coluna === 'email') return true;
  return avaliarOperador(linha[coluna], expressao);
}

/** `or=(a.eq.1,b.is.null)` / `and=(...)`. */
function avaliarGrupo(linha: Row, grupo: string, modo: 'or' | 'and', tabela: string): boolean {
  const interior = grupo.replace(/^\(/, '').replace(/\)$/, '');
  const termos = dividirNivelZero(interior);
  const resultados = termos.map((termo) => {
    const aninhado = termo.match(/^(or|and)\((.*)\)$/);
    if (aninhado) return avaliarGrupo(linha, `(${aninhado[2]})`, aninhado[1] as 'or' | 'and', tabela);
    const primeiroPonto = termo.indexOf('.');
    const coluna = termo.slice(0, primeiroPonto);
    return avaliarCondicao(linha, coluna, termo.slice(primeiroPonto + 1), tabela);
  });
  return modo === 'or' ? resultados.some(Boolean) : resultados.every(Boolean);
}

function filtrar(linhas: Row[], params: URLSearchParams, tabela: string): Row[] {
  const filtros: Array<[string, string]> = [];
  params.forEach((valor, chave) => {
    if (!PARAMS_RESERVADOS.has(chave)) filtros.push([chave, valor]);
  });
  if (!filtros.length) return linhas;
  return linhas.filter((linha) =>
    filtros.every(([chave, valor]) => {
      if (chave === 'or' || chave === 'and') return avaliarGrupo(linha, valor, chave, tabela);
      // Filtros em colunas de recursos embutidos (`colaborador.nome=...`) não são suportados.
      if (chave.includes('.')) return true;
      return avaliarCondicao(linha, chave, valor, tabela);
    }),
  );
}

// ---------------------------------------------------------------------------
// Ordenação
// ---------------------------------------------------------------------------

function ordenar(linhas: Row[], order: string | null): Row[] {
  if (!order) return linhas;
  const criterios = order.split(',').map((c) => {
    const [coluna, ...mods] = c.split('.');
    return { coluna, desc: mods.includes('desc'), nullsFirst: mods.includes('nullsfirst') };
  });
  return [...linhas].sort((a, b) => {
    for (const { coluna, desc, nullsFirst } of criterios) {
      const va = a[coluna];
      const vb = b[coluna];
      if (va == null && vb == null) continue;
      if (va == null) return nullsFirst ? -1 : 1;
      if (vb == null) return nullsFirst ? 1 : -1;
      let r: number;
      if (typeof va === 'number' && typeof vb === 'number') r = va - vb;
      else if (typeof va === 'boolean' && typeof vb === 'boolean') r = Number(va) - Number(vb);
      else r = String(va).localeCompare(String(vb));
      if (r !== 0) return desc ? -r : r;
    }
    return 0;
  });
}

// ---------------------------------------------------------------------------
// Select (colunas + recursos embutidos)
// ---------------------------------------------------------------------------

interface ItemSelect {
  alias: string;
  nome: string; // coluna ou tabela
  embutido: boolean;
  sub?: string;
}

function interpretarSelect(select: string): ItemSelect[] {
  return dividirNivelZero(select).map((item) => {
    const m = item.match(/^(?:([\w]+):)?([\w*]+)(?:![\w]+)*(?:\((.*)\))?$/s);
    if (!m) return { alias: item, nome: item, embutido: false };
    const [, alias, nome, sub] = m;
    const embutido = sub !== undefined;
    return { alias: alias ?? nome, nome, embutido, sub };
  });
}

function projetar(linha: Row, itens: ItemSelect[], tabela: string, dados: Tabelas): Row {
  const temEstrela = itens.some((i) => !i.embutido && i.nome === '*');
  const saida: Row = temEstrela ? { ...linha } : {};
  for (const item of itens) {
    if (item.embutido) {
      saida[item.alias] = resolverEmbutido(linha, tabela, item, dados);
    } else if (item.nome !== '*') {
      saida[item.alias] = linha[item.nome] ?? null;
    }
  }
  return saida;
}

function resolverEmbutido(pai: Row, tabelaPai: string, item: ItemSelect, dados: Tabelas): unknown {
  const alvo = dados[item.nome] ?? [];
  const sub = interpretarSelect(item.sub ?? '*');

  // 1) N:1 — o pai guarda a FK (`colaborador_id` para `colaboradores`).
  const fk = [`${item.alias}_id`, `${singular(item.nome)}_id`].find((c) => c in pai);
  if (fk) {
    const referenciado = alvo.find((r) => r.id === pai[fk]);
    return referenciado ? projetar(referenciado, sub, item.nome, dados) : null;
  }

  // 2) 1:N — a tabela embutida guarda a FK do pai (`afastamento_id` em prorrogações).
  const fkFilho = `${singular(tabelaPai)}_id`;
  return alvo.filter((r) => r[fkFilho] === pai.id).map((r) => projetar(r, sub, item.nome, dados));
}

// ---------------------------------------------------------------------------
// Execução da consulta
// ---------------------------------------------------------------------------

export interface ResultadoConsulta {
  linhas: Row[];
  total: number;
}

export function executarConsulta(tabela: string, params: URLSearchParams, dados: Tabelas): ResultadoConsulta {
  const base = dados[tabela] ?? [];
  let filtradas = ordenar(filtrar(base, params, tabela), params.get('order'));
  // Filtro por e-mail do usuário logado (ignorado em avaliarCondicao) → resolve para UM colaborador,
  // senão o `.maybeSingle()` receberia vários registros e falharia.
  if (tabela === 'colaboradores' && params.has('email')) filtradas = filtradas.slice(0, 1);
  const total = filtradas.length;

  const offset = Number(params.get('offset') ?? 0) || 0;
  const limite = params.get('limit');
  const paginadas = filtradas.slice(offset, limite != null ? offset + Number(limite) : undefined);

  const itens = interpretarSelect(params.get('select') ?? '*');
  const linhas = paginadas.map((linha) => projetar(linha, itens, tabela, dados));
  return { linhas, total };
}
