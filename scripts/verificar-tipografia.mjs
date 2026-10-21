/**
 * ============================================================================
 * VERIFICADOR DE TIPOGRAFIA — guarda-corpo do Design System.
 *
 * Regras que FALHAM o comando:
 *  1. `font-family` declarado fora das fontes oficiais (`src/index.css` e
 *     `tailwind.config.js`) — salvo exceções documentadas em
 *     `docs/DESIGN-SYSTEM-TIPOGRAFIA.md`.
 *  2. `font-mono` aplicado a valor monetário/numérico de interface
 *     (`R$`, `formatCurrency`, `Intl.NumberFormat`, `toLocaleString`…).
 *  3. As famílias oficiais deixaram de ser carregadas em `index.html`.
 *
 * Também lista (sem falhar) os `font-mono` fora dos arquivos técnicos
 * conhecidos — sinal para revisão, não bloqueio.
 *
 * Uso: npm run verificar:tipografia
 * ============================================================================
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const RAIZ = process.cwd();
const SRC = join(RAIZ, 'src');

const EXCECOES_FONT_FAMILY = new Set([
  // HTML de e-mail transacional (fora da aplicação; Arial por compatibilidade).
  'src/services/contratacaoService.ts',
  // Texto de SVG do editor técnico de workflow (system-ui no desenho).
  'src/components/workflows/WorkflowDesigner.tsx',
  // Tela de fallback de boot (antes do CSS carregar).
  'src/main.tsx',
]);

/** Arquivos cujo `font-mono` é legítimo (hash, código, log, JSON, protocolo). */
const TECNICOS = [
  /^src\/(components\/)?(admin|settings|seguranca|esocial|workflows|integracoes)\//,
  /^src\/errors\//,
  /^src\/components\/(MfaGate|RouteErrorBoundary)\.tsx$/,
  /^src\/components\/(afastamentos\/AfastamentoTable|epis\/EpiEntregasTable|ferias\/FeriasColetivasTab|medidas-disciplinares\/(MedidasTable|GerarLinkCienciaDialog)|pcs\/PcsAvaliacaoTab|portal\/PortalRegimentoCard|ponto\/(PontoAdjustmentRequests|PontoAuditTimeline|PontoInconsistencyPanel|AssinarEspelhoDialog|GerarAEJDialog)|dashboard\/(AnalyticsSection|MorningBriefing)|desligamentos\/TrilhaAuditoriaDesligamentos|documents\/DocumentoTimeline|folha\/(PagamentoBancarioWizard|RubricasDialog)|contratacao\/TokenInput|contratos\/ContratoTokenTimelineDialog|ui\/(command-palette|sync-error-state)|relatorios\/RelatoriosAgendadosTab|sst\/GerarPgrButton|layout\/(AppSidebar|Header))\.tsx$/,
  /^src\/pages\/(Admin|Auditoria|Avaliacao|Departamentos|Seguranca|Workflows|DesignSystem|Rubricas|Contratacao|ContratosGerados|AssinarContrato|VerificarContrato|CienciaMedida|ComunicacaoInterna|CanalEtica|Treinamentos|Documentos|ESocial|FolhaCompliance|LD|LGPD|LocaisTrabalho|Login|ColaboradorDetalhes|BancoHoras|Cargos|Contabilidade|ContratoTemplates|Provisoes)\w*\.tsx$/,
];
const ehTecnico = (arquivo) => TECNICOS.some((re) => re.test(arquivo));

const caminhar = (dir, saida = []) => {
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) caminhar(p, saida);
    else if (/\.(tsx?|css)$/.test(nome)) saida.push(p);
  }
  return saida;
};

const erros = [];
const avisos = [];
const rel = (p) => relative(RAIZ, p).replace(/\\/g, '/');

/* 1 · font-family fora da fonte oficial */
for (const arquivo of caminhar(SRC)) {
  const relativo = rel(arquivo);
  if (relativo === 'src/index.css' || EXCECOES_FONT_FAMILY.has(relativo)) continue;
  const linhas = readFileSync(arquivo, 'utf8').split('\n');
  linhas.forEach((linha, i) => {
    if (/font-family\s*:/i.test(linha) && !/^\s*(\/\/|\*|\/\*)/.test(linha)) {
      erros.push(`${relativo}:${i + 1} — font-family fora do Design System: ${linha.trim().slice(0, 90)}`);
    }
  });
}
const tailwind = readFileSync(join(RAIZ, 'tailwind.config.js'), 'utf8');
if (/font-family\s*:/i.test(tailwind)) {
  erros.push('tailwind.config.js — declaração font-family crua (use fontFamily).');
}

/* 2 · font-mono em valor monetário/numérico de interface */
const MARCADOR_NUMERICO = /R\$|formatCurrency|formatBRL|\bbrl\(|formatarMoeda/;
for (const arquivo of caminhar(SRC)) {
  const relativo = rel(arquivo);
  const linhas = readFileSync(arquivo, 'utf8').split('\n');
  linhas.forEach((linha, i) => {
    if (!linha.includes('font-mono')) return;
    // Se o elemento abre E fecha na mesma linha, o valor está nela; caso
    // contrário (ex.: `<dd className="...">`), o valor começa na linha seguinte.
    const janela = /<\//.test(linha) ? linha : [linha, linhas[i + 1] ?? ''].join(' ');
    if (MARCADOR_NUMERICO.test(janela)) {
      erros.push(`${relativo}:${i + 1} — font-mono em valor numérico/monetário (use text-numeric).`);
    }
  });
}

/* 3 · famílias oficiais carregadas */
const html = readFileSync(join(RAIZ, 'index.html'), 'utf8').toLowerCase();
for (const familia of ['Outfit', 'Plus Jakarta Sans', 'JetBrains Mono']) {
  if (!html.includes(familia.toLowerCase().replace(/\s+/g, '+'))) {
    erros.push(`index.html — família oficial "${familia}" não está sendo carregada.`);
  }
}

/* 4 · inventário de font-mono (aviso, não erro) */
let totalMono = 0;
const foraDoAllowlist = {};
for (const arquivo of caminhar(SRC)) {
  const relativo = rel(arquivo);
  if (relativo.endsWith('.css')) continue; // comentários técnicos do próprio DS
  const ocorrencias = readFileSync(arquivo, 'utf8').split('font-mono').length - 1;
  if (!ocorrencias) continue;
  totalMono += ocorrencias;
  if (!ehTecnico(relativo)) foraDoAllowlist[relativo] = ocorrencias;
}
for (const [arquivo, qtd] of Object.entries(foraDoAllowlist)) {
  avisos.push(`${arquivo} — ${qtd}× font-mono fora da lista técnica (revise se é código/hash).`);
}

console.log(`\nTipografia — ${totalMono} uso(s) de font-mono (conteúdo técnico esperado).`);
for (const aviso of avisos) console.log(`  aviso: ${aviso}`);

if (erros.length) {
  console.error('\nFALHOU — divergências de tipografia:');
  for (const erro of erros) console.error(`  x ${erro}`);
  process.exit(1);
}

console.log('\nRESULTADO: OK — famílias oficiais, escala e valores numéricos em conformidade.');

