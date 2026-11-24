// Catálogo central de identidade visual de bancos — fonte única usada em
// qualquer lugar que renderize uma conta bancária (tabela, formulário de
// criação/edição, etc.). A resolução é sempre determinística: nunca "escolhe"
// um logo, apenas deriva do banco informado na conta.
//
// Prioridade de resolução (resolveBankBrand):
//   1. código bancário oficial (COMPE/ISPB) — fonte mais confiável;
//   2. nome do banco normalizado (sem acento/caixa) contra um dicionário de
//      apelidos conhecidos — só usado quando o código não bate com nada;
//   3. nenhum dos dois bate → fallback neutro (`isKnown: false`), nunca a
//      identidade de outro banco.
//
// `logoSrc` só é usado quando `verified: true` — cada entrada com asset real
// documenta `sourceType`/`sourceUrl`/`verifiedAt` (pesquisados em
// 2026-09-24, ver detalhe completo por banco em
// src/assets/banks/SOURCES.md). Sem verificação, cai no fallback de sigla +
// cor, nunca numa logo não confirmada.

import logo001 from '@/assets/banks/001.png';
import logo033 from '@/assets/banks/033.png';
import logo041 from '@/assets/banks/041.png';
import logo077 from '@/assets/banks/077.svg';
import logo104 from '@/assets/banks/104.png';
import logo237 from '@/assets/banks/237.png';
import logo260 from '@/assets/banks/260.png';
import logo336 from '@/assets/banks/336.png';
import logo341 from '@/assets/banks/341.svg';
import logo422 from '@/assets/banks/422.png';
import logo655 from '@/assets/banks/655.svg';
import logo748 from '@/assets/banks/748.png';
import logo756 from '@/assets/banks/756.png';

export interface BankBrand {
  code: string;
  name: string;
  shortLabel: string;
  bg: string;
  text?: string;
  /** Símbolo/monograma/app icon oficial do banco — só é usado pelo
   * renderizador quando `verified` também for `true` (ver `resolveBankBrand`
   * e `BancoLogo`). Nunca um wordmark horizontal (ver `logoType`). */
  logoSrc?: string;
  /** Tipo do asset — todos os valores aqui são variações de "marca reduzida
   * sem o nome escrito por extenso ao lado": symbol (ícone/monograma
   * isolado, ex.: favicon oficial), app-icon (ícone do app oficial, quadrado
   * autocontido) ou monogram (só as iniciais estilizadas, ex.: "BV"). */
  logoType?: 'symbol' | 'app-icon' | 'monogram';
  /** Só `true` quando a origem foi checada nesta auditoria (domínio oficial
   * do banco ou conta de desenvolvedor oficial na Play Store/App Store,
   * comparado contra a identidade visual atual da marca). `logoSrc` sem
   * `verified: true` NUNCA deve ser renderizado como logo real. */
  verified?: boolean;
  /** De onde o asset foi baixado — para reprodutibilidade/auditoria futura. */
  sourceUrl?: string;
  sourceType?: 'official-site' | 'official-app-store' | 'wikimedia';
  /** Data (YYYY-MM-DD) em que a origem foi conferida — os apps/sites mudam
   * de ícone com o tempo, então isso marca até quando a escolha é válida
   * sem reconferir. */
  verifiedAt?: string;
  /** 'light' só quando o próprio asset usa uma cor sem contraste suficiente
   * contra o fundo azul-marinho escuro do app (#111C2A) — decidido por
   * amostragem de cor de cada asset, nunca aplicado por padrão. A maioria
   * dos ícones abaixo já vem com fundo quadrado opaco próprio (a cor
   * oficial do app) e não precisa disso. */
  logoBg?: 'light';
  /** false quando nada no catálogo bateu — quem renderiza deve usar um
   * ícone/estado neutro, nunca a marca de outro banco. */
  isKnown: boolean;
}

type CatalogEntry = Omit<BankBrand, 'isKnown'>;

export const BANK_CATALOG: Record<string, CatalogEntry> = {
  '001': {
    code: '001', name: 'Banco do Brasil', shortLabel: 'BB', bg: 'bg-[#f7d117]', text: 'text-black',
    logoSrc: logo001, logoType: 'app-icon', verified: true,
    sourceType: 'official-app-store', sourceUrl: 'https://play.google.com/store/apps/details?id=br.com.bb.android', verifiedAt: '2026-09-24',
  },
  '033': {
    code: '033', name: 'Santander', shortLabel: 'Sant', bg: 'bg-red-600',
    logoSrc: logo033, logoType: 'app-icon', verified: true,
    sourceType: 'official-app-store', sourceUrl: 'https://play.google.com/store/apps/details?id=com.santander.app', verifiedAt: '2026-09-24',
  },
  '104': {
    code: '104', name: 'Caixa Econômica Federal', shortLabel: 'CEF', bg: 'bg-blue-700',
    logoSrc: logo104, logoType: 'app-icon', verified: true,
    sourceType: 'official-app-store', sourceUrl: 'https://play.google.com/store/apps/details?id=br.com.gabba.Caixa', verifiedAt: '2026-09-24',
  },
  '237': {
    code: '237', name: 'Bradesco', shortLabel: 'Brad', bg: 'bg-red-700',
    logoSrc: logo237, logoType: 'symbol', verified: true,
    sourceType: 'official-site', sourceUrl: 'https://banco.bradesco/favicon.ico', verifiedAt: '2026-09-24',
  },
  '341': {
    code: '341', name: 'Itaú Unibanco', shortLabel: 'Itaú', bg: 'bg-orange-500',
    logoSrc: logo341, logoType: 'app-icon', verified: true,
    sourceType: 'wikimedia', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Itaú_Unibanco_logo_2023.svg', verifiedAt: '2026-09-24',
  },
  '260': {
    code: '260', name: 'Nubank', shortLabel: 'Nu', bg: 'bg-purple-600',
    logoSrc: logo260, logoType: 'app-icon', verified: true,
    sourceType: 'official-app-store', sourceUrl: 'https://play.google.com/store/apps/details?id=com.nu.production', verifiedAt: '2026-09-24',
  },
  '336': {
    code: '336', name: 'C6 Bank', shortLabel: 'C6', bg: 'bg-neutral-900',
    logoSrc: logo336, logoType: 'app-icon', verified: true,
    sourceType: 'official-app-store', sourceUrl: 'https://play.google.com/store/apps/details?id=com.c6bank.app', verifiedAt: '2026-09-24',
  },
  '041': {
    code: '041', name: 'Banrisul', shortLabel: 'Banri', bg: 'bg-blue-900',
    logoSrc: logo041, logoType: 'app-icon', verified: true,
    sourceType: 'official-app-store', sourceUrl: 'https://play.google.com/store/apps/details?id=br.com.banrisul', verifiedAt: '2026-09-24',
  },
  '748': {
    code: '748', name: 'Sicredi', shortLabel: 'Sicredi', bg: 'bg-green-700',
    logoSrc: logo748, logoType: 'app-icon', verified: true,
    sourceType: 'official-app-store', sourceUrl: 'https://play.google.com/store/apps/details?id=br.com.sicredi.app', verifiedAt: '2026-09-24',
  },
  '756': {
    code: '756', name: 'Sicoob', shortLabel: 'Sicoob', bg: 'bg-emerald-700',
    logoSrc: logo756, logoType: 'symbol', verified: true,
    sourceType: 'official-site', sourceUrl: 'https://www.sicoob.com.br/o/sicoob-theme/images/favicon/apple-icon-152x152.png', verifiedAt: '2026-09-24',
  },
  '655': {
    code: '655', name: 'Banco Votorantim (BV)', shortLabel: 'BV', bg: 'bg-sky-600',
    logoSrc: logo655, logoType: 'monogram', verified: true,
    sourceType: 'wikimedia', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Banco_BV_Logo.svg', verifiedAt: '2026-09-24',
  },
  '422': {
    code: '422', name: 'Banco Safra', shortLabel: 'Safra', bg: 'bg-slate-800',
    logoSrc: logo422, logoType: 'symbol', verified: true, logoBg: 'light',
    sourceType: 'official-site', sourceUrl: 'https://www.safra.com.br/ (apple-touch-icon-152x152.png)', verifiedAt: '2026-09-24',
  },
  '077': {
    code: '077', name: 'Banco Inter', shortLabel: 'Inter', bg: 'bg-orange-600',
    logoSrc: logo077, logoType: 'symbol', verified: true,
    sourceType: 'official-site', sourceUrl: 'https://www.bancointer.com.br/favicon.svg', verifiedAt: '2026-09-24',
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
  'itau': '341', 'itau unibanco': '341', 'banco itau': '341', 'itau unibanco s.a.': '341',
  'bb': '001', 'banco do brasil': '001',
  'santander': '033', 'banco santander': '033',
  'caixa': '104', 'caixa economica federal': '104', 'cef': '104',
  'bradesco': '237', 'banco bradesco': '237',
  'nubank': '260', 'nu': '260', 'nu pagamentos': '260',
  'inter': '077', 'banco inter': '077',
  'original': '212', 'banco original': '212',
  'c6': '336', 'c6 bank': '336',
  'bv': '655', 'votorantim': '655', 'banco votorantim': '655', 'banco bv': '655',
  'banrisul': '041',
  'sicredi': '748',
  'sicoob': '756',
  'safra': '422', 'banco safra': '422',
};

function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
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
    const codigoPorNome = NOME_PARA_CODIGO[normalizado]
      ?? Object.entries(NOME_PARA_CODIGO).find(([apelido]) => normalizado.includes(apelido))?.[1];
    if (codigoPorNome && BANK_CATALOG[codigoPorNome]) {
      return { ...BANK_CATALOG[codigoPorNome], isKnown: true };
    }
  }

  return { code: cod, name: nome ?? '', shortLabel: '', bg: '', isKnown: false };
}
