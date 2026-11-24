// Gera `src/mocks/gestaoMock/esquema.ts` a partir dos tipos gerados pelo
// Supabase (`src/integrations/supabase/types.ts`).
//
// Serve ao mock de demonstração das áreas operacionais: o esquema dá nome e
// tipo "grosseiro" de cada coluna para que as linhas fictícias sejam criadas
// no formato que as telas esperam. Rodar após qualquer migration nova:
//
//   node scripts/gerar-esquema-mock.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const origem = 'src/integrations/supabase/types.ts';
const linhas = readFileSync(origem, 'utf8').split(/\r?\n/);

const tipoGrosseiro = (coluna, tipoTs) => {
  const t = tipoTs.trim().replace(/\s*\|\s*null\s*$/, '');
  if (t.endsWith('[]')) return 'lista';
  if (t === 'number') return 'numero';
  if (t === 'boolean') return 'booleano';
  if (t === 'Json') return 'json';
  if (t === 'string') {
    if (coluna === 'id' || coluna.endsWith('_id')) return 'id';
    if (coluna.endsWith('_at') || coluna.startsWith('data_') || coluna.endsWith('_em') || coluna.endsWith('_date')) return 'data';
    if (coluna === 'competencia' || coluna === 'competencia_desconto' || coluna === 'mes_referencia') return 'competencia';
    return 'texto';
  }
  return 'texto';
};

const tabelas = new Map();
let nivelTables = -1;
let nivelTabela = -1;
let nivelRow = -1;
let tabelaAtual = null;
let dentroDeRow = false;

for (const linha of linhas) {
  const indentacao = linha.length - linha.trimStart().length;
  const texto = linha.trim();

  if (nivelTables < 0) {
    if (/^\s*Tables:\s*\{\s*$/.test(linha)) {
      nivelTables = indentacao;
      nivelTabela = indentacao + 2;
      nivelRow = indentacao + 4;
    }
    continue;
  }

  // Fim do bloco Tables.
  if (indentacao === nivelTables && texto === '}') break;

  if (dentroDeRow) {
    if (indentacao === nivelRow && texto === '}') {
      dentroDeRow = false;
      continue;
    }
    if (indentacao === nivelRow + 2) {
      const m = texto.match(/^([a-z0-9_]+):\s*(.+)$/);
      if (m) tabelas.get(tabelaAtual)[m[1]] = tipoGrosseiro(m[1], m[2]);
    }
    continue;
  }

  if (indentacao === nivelTabela) {
    const m = texto.match(/^([a-z0-9_]+):\s*\{\s*$/);
    if (m) {
      tabelaAtual = m[1];
      if (!tabelas.has(tabelaAtual)) tabelas.set(tabelaAtual, {});
      continue;
    }
    if (texto === '}') tabelaAtual = null;
    continue;
  }

  if (tabelaAtual && indentacao === nivelRow && /^Row:\s*\{\s*$/.test(texto)) {
    dentroDeRow = true;
  }
}

const linhasSaida = [...tabelas.entries()].map(([tabela, colunas]) => {
  const cols = Object.entries(colunas).map(([c, k]) => `${c}:${k}`).join(',');
  return `  ${tabela}: '${cols}',`;
});

const conteudo = `/**
 * ESQUEMA GERADO — NÃO EDITAR À MÃO.
 *
 * Extraído de \`src/integrations/supabase/types.ts\` (tipos gerados pelo
 * Supabase) por \`scripts/gerar-esquema-mock.mjs\`. Serve só ao gerador de
 * fixtures do mock de demonstração: dá o nome e o tipo "grosseiro" de cada
 * coluna (id | numero | booleano | data | competencia | json | lista | texto)
 * para que as linhas fictícias tenham o formato que as telas esperam.
 *
 * Regenerar: node scripts/gerar-esquema-mock.mjs
 */

export type TipoColuna = 'id' | 'numero' | 'booleano' | 'data' | 'competencia' | 'json' | 'lista' | 'texto';

/** tabela → "coluna:tipo,coluna:tipo,..." (compacto de propósito: são ~350 tabelas). */
export const ESQUEMA_TABELAS: Record<string, string> = {
${linhasSaida.join('\n')}
};

function analisar(linha: string): Record<string, TipoColuna> {
  const colunas: Record<string, TipoColuna> = {};
  for (const par of linha.split(',')) {
    const [nome, tipo] = par.split(':');
    if (nome) colunas[nome] = (tipo as TipoColuna) ?? 'texto';
  }
  return colunas;
}

/** Colunas (nome → tipo) de uma tabela do schema público; \`undefined\` se não existir. */
export function colunasDaTabela(tabela: string): Record<string, TipoColuna> | undefined {
  const bruto = ESQUEMA_TABELAS[tabela];
  return bruto ? analisar(bruto) : undefined;
}
`;

writeFileSync('src/mocks/gestaoMock/esquema.ts', conteudo, 'utf8');
console.log(`src/mocks/gestaoMock/esquema.ts gerado com ${tabelas.size} tabelas.`);
