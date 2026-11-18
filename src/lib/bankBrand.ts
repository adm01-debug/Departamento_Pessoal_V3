// Catálogo central de identidade visual de bancos — fonte única para qualquer
// lugar que renderize uma conta bancária (tabela, formulário de criação/edição).
// Resgatado da branch `muri` (PR #546, fechada sem merge).
//
// A resolução é sempre determinística: nunca "escolhe" uma identidade, só deriva
// do banco informado na conta.
//
// Prioridade de resolução (resolveBankBrand):
//   1. código bancário oficial (COMPE/ISPB) — fonte mais confiável;
//   2. nome do banco normalizado (sem acento/caixa) contra um dicionário de
//      apelidos conhecidos — só usado quando o código não bate com nada;
//   3. nenhum dos dois bate → fallback neutro (`isKnown: false`), nunca a
//      identidade de outro banco.
//
// POR QUE SEM AS IMAGENS DOS LOGOS, medido em 18/11/2026:
// a versão da muri trazia 13 assets em src/assets/banks (304 KB no repo, sendo
// 152 KB num único PNG). Três deles estão abaixo do limite de inline do Vite
// (4096 B, não configurado em vite.config.ts), então o bundler os embute como
// base64 DENTRO do JS. Medição em bytes exatos: main sem eles = 8.079.037 B de
// JS (7889,68 KB); com eles = 8.084.700 B (7895,21 KB), +5,53 KB. Somado aos
// cards do Dashboard resgatados em #698, o total passa de 7900 KB e reprova o
// gate `audit:bundle` (scripts/check-bundle-budget.mjs mede só .js e .css).
//
// A identidade visual é preservada pelo caminho que o PRÓPRIO autor desenhou
// como fallback: sigla curta (`shortLabel`) sobre a cor oficial (`bg`/`text`).
// O ganho para o usuário permanece — reconhecer o banco de relance em vez de
// ler "Banco do Brasil (001)" em texto cru — sem o custo desproporcional.
// Se algum dia os assets entrarem, o lugar é este arquivo, com o orçamento de
// bundle remedido antes.

export interface BankBrand {
  code: string;
  name: string;
  /** Sigla curta mostrada sobre a cor do banco (ex.: BB, Sant, CEF). */
  shortLabel: string;
  /** Classe Tailwind da cor oficial de fundo. */
  bg: string;
  /** Classe de cor do texto, quando o fundo claro exige preto. */
  text?: string;
  /** false quando nada no catalogo bateu — quem renderiza deve usar um estado
   * neutro, nunca a marca de outro banco. */
  isKnown: boolean;
}

type CatalogEntry = Omit<BankBrand, 'isKnown'>;

export const BANK_CATALOG: Record<string, CatalogEntry> = {
  '001': {
    code: '001',
    name: 'Banco do Brasil',
    shortLabel: 'BB',
    bg: 'bg-[#f7d117]',
    text: 'text-black',
  },
  '033': {
    code: '033',
    name: 'Santander',
    shortLabel: 'Sant',
    bg: 'bg-red-600',
  },
  '104': {
    code: '104',
    name: 'Caixa Econômica Federal',
    shortLabel: 'CEF',
    bg: 'bg-blue-700',
  },
  '237': {
    code: '237',
    name: 'Bradesco',
    shortLabel: 'Brad',
    bg: 'bg-red-700',
  },
  '341': {
    code: '341',
    name: 'Itaú Unibanco',
    shortLabel: 'Itaú',
    bg: 'bg-orange-500',
  },
  '260': {
    code: '260',
    name: 'Nubank',
    shortLabel: 'Nu',
    bg: 'bg-purple-600',
  },
  '336': {
    code: '336',
    name: 'C6 Bank',
    shortLabel: 'C6',
    bg: 'bg-neutral-900',
  },
  '041': {
    code: '041',
    name: 'Banrisul',
    shortLabel: 'Banri',
    bg: 'bg-blue-900',
  },
  '748': {
    code: '748',
    name: 'Sicredi',
    shortLabel: 'Sicredi',
    bg: 'bg-green-700',
  },
  '756': {
    code: '756',
    name: 'Sicoob',
    shortLabel: 'Sicoob',
    bg: 'bg-emerald-700',
  },
  '655': {
    code: '655',
    name: 'Banco Votorantim (BV)',
    shortLabel: 'BV',
    bg: 'bg-sky-600',
  },
  '422': {
    code: '422',
    name: 'Banco Safra',
    shortLabel: 'Safra',
    bg: 'bg-slate-800',
  },
  '077': {
    code: '077',
    name: 'Banco Inter',
    shortLabel: 'Inter',
    bg: 'bg-orange-600',
  },
  // Nenhum símbolo/app icon compacto oficial confirmado (ver SOURCES.md para
  // as fontes pesquisadas e descartadas) — fallback de sigla + cor até
  // existir um asset verificável.
  '212': { code: '212', name: 'Banco Original', shortLabel: 'Orig', bg: 'bg-emerald-600' },
};

// Apelidos normalizados (sem acento, minúsculo) → código do catálogo acima.
// Só é consultado quando o código bancário não resolveu nada — nunca tem
// prioridade sobre o código.
const NOME_PARA_CODIGO: Record<string, string> = {
  itau: '341',
  'itau unibanco': '341',
  'banco itau': '341',
  'itau unibanco s.a.': '341',
  bb: '001',
  'banco do brasil': '001',
  santander: '033',
  'banco santander': '033',
  caixa: '104',
  'caixa economica federal': '104',
  cef: '104',
  bradesco: '237',
  'banco bradesco': '237',
  nubank: '260',
  nu: '260',
  'nu pagamentos': '260',
  inter: '077',
  'banco inter': '077',
  original: '212',
  'banco original': '212',
  c6: '336',
  'c6 bank': '336',
  bv: '655',
  votorantim: '655',
  'banco votorantim': '655',
  'banco bv': '655',
  banrisul: '041',
  sicredi: '748',
  sicoob: '756',
  safra: '422',
  'banco safra': '422',
};

function normalizar(valor: string): string {
  return valor.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Resolve a identidade visual (cor + rótulo, e o logo oficial quando
 * verificado) de um banco a partir do código/nome já salvos na conta —
 * nunca a partir de escolha manual do usuário. Reutilizar esta função em
 * qualquer lugar que exiba uma conta bancária, para nunca duplicar o
 * mapeamento. */
export function resolveBankBrand(codigo?: string | null, nome?: string | null): BankBrand {
  const cod = (codigo ?? '').trim();
  if (cod && BANK_CATALOG[cod]) {
    return { ...BANK_CATALOG[cod], isKnown: true };
  }

  const normalizado = normalizar(nome ?? '');
  if (normalizado) {
    const codigoPorNome =
      NOME_PARA_CODIGO[normalizado] ??
      Object.entries(NOME_PARA_CODIGO).find(([apelido]) => normalizado.includes(apelido))?.[1];
    if (codigoPorNome && BANK_CATALOG[codigoPorNome]) {
      return { ...BANK_CATALOG[codigoPorNome], isKnown: true };
    }
  }

  return { code: cod, name: nome ?? '', shortLabel: '', bg: '', isKnown: false };
}
