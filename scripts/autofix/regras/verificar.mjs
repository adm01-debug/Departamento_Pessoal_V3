#!/usr/bin/env node
/**
 * verificar — confere as regras de negócio de CÁLCULO do sistema contra uma referência legal. Sem IA.
 *
 *   node scripts/autofix/regras/verificar.mjs [--cwd <repo>] [--ref origin/main] [--strict] [--report-dir <pasta>]
 *   --ref: verifica o código daquele commit (extraído para uma pasta temporária), não a árvore de trabalho.
 *
 * Executa os motores reais (calculators/ e utils/*Calc), compara com scripts/autofix/regras/referencia.mjs e
 * escreve um relatório de gaps (divergências, pontos a revisar, melhorias, cobertura de testes).
 * Não altera nenhum arquivo do projeto. Com --strict, sai com código 1 se houver divergência crítica/alta.
 */
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync, existsSync, mkdtempSync, symlinkSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir, tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { carregarMotores } from './motores.mjs';
import { regras } from './catalogo.mjs';
import { regrasDados } from './dados.mjs';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
let cwd = resolve(opt('cwd', join(import.meta.dirname, '..', '..', '..')));
const rotulo = opt('ref', null) ? `${cwd} @ ${opt('ref', '')}` : cwd;
let tmpRef = null;
if (opt('ref', null)) {
  // Extrai só o necessário do commit pedido e reaproveita o node_modules do checkout. Não altera nada no repositório.
  tmpRef = mkdtempSync(join(tmpdir(), 'dp-ref-'));
  const tar = execFileSync('git', ['-C', cwd, 'archive', opt('ref', ''), 'src', 'supabase', 'scripts', 'package.json'], { maxBuffer: 1 << 30 });
  execFileSync('tar', ['-x', '-C', tmpRef], { input: tar });
  symlinkSync(join(cwd, 'node_modules'), join(tmpRef, 'node_modules'));
  cwd = tmpRef;
  process.on('exit', () => rmSync(tmpRef, { recursive: true, force: true }));
}
const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '').replace(/^(\d{8})/, '$1-');

// ---------- checagens estáticas (melhorias e cobertura) ----------
const walk = (dir, pred, out = []) => {
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir)) {
    if (n === 'node_modules') continue;
    const p = join(dir, n);
    statSync(p).isDirectory() ? walk(p, pred, out) : pred(p) && out.push(p);
  }
  return out;
};
const read = (p) => readFileSync(p, 'utf8');

function checagensEstaticas() {
  const calcFiles = [
    ...walk(join(cwd, 'src/calculators'), (p) => p.endsWith('.ts') && !/__tests__|index\.ts|trabalhistas\.ts|tabelas\.ts/.test(p)),
    ...['rescisaoCalc', 'folhaCalc', 'calculoFerias'].map((n) => join(cwd, `src/utils/${n}.ts`)).filter(existsSync),
  ];
  const testes = walk(join(cwd, 'src'), (p) => /\.(test|spec)\.tsx?$/.test(p)).map(read).join('\n');
  const exportadas = new Map(); // nome -> [arquivos]
  const arredondamento = [];
  const pendencias = [];
  for (const f of calcFiles) {
    const rel = relative(cwd, f);
    const src = read(f);
    for (const m of src.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+([A-Za-z0-9_]+)/g)) {
      if (!exportadas.has(m[1])) exportadas.set(m[1], []);
      exportadas.get(m[1]).push(rel);
    }
    const tipos = [/Math\.trunc\(/.test(src) && 'trunc', /Math\.round\(/.test(src) && 'round', /toDecimalPlaces|ROUND_HALF/.test(src) && 'Decimal'].filter(Boolean);
    if (tipos.length > 1) arredondamento.push(`${rel}: mistura ${tipos.join(' + ')}`);
    const todos = [...src.matchAll(/\/\/\s*(TODO|FIXME|HACK)\b.*/g)].length;
    if (todos) pendencias.push(`${rel}: ${todos} marcador(es) TODO/FIXME`);
  }
  const semTeste = [...exportadas].filter(([nome]) => !new RegExp(`\\b${nome}\\b`).test(testes)).map(([nome, fs]) => `${nome} (${fs[0]})`);
  const duplicadas = [...exportadas].filter(([, fs]) => fs.length > 1).map(([nome, fs]) => `${nome}: ${fs.join(' e ')}`);

  // Constantes de tabela com ano/salário-mínimo desatualizado dentro do próprio arquivo de tabelas.
  const tabelasPath = join(cwd, 'src/calculators/tabelas.ts');
  const incoerencias = [];
  if (existsSync(tabelasPath)) {
    const t = read(tabelasPath);
    const sm = /SALARIO_MINIMO_2026\s*=\s*([\d.]+)/.exec(t)?.[1];
    const citado = /base SM R\$\s*([\d.,]+)/.exec(t)?.[1]?.replace('.', '').replace(',', '.');
    if (sm && citado && Number(citado) !== Number(sm)) incoerencias.push(`tabelas.ts: Seguro-Desemprego "2026" cita base SM R$ ${citado} (o SM 2026 do mesmo arquivo é R$ ${sm}) — tabela provavelmente não foi atualizada`);
  }
  const semFonte = ['FAIXAS_PLR_2026', 'LIMITE_ISENCAO_PLR', 'SALARIO_FAMILIA_TETO', 'SALARIO_FAMILIA_VALOR', 'FAIXAS_SEGURO_DESEMPREGO_2026', 'ENCARGOS_PADRAO'].filter((c) => existsSync(tabelasPath) && read(tabelasPath).includes(c));
  return { semTeste, duplicadas, arredondamento, pendencias, incoerencias, semFonte, arquivos: calcFiles.length, funcoes: exportadas.size };
}

// ---------- execução ----------
const rodar = async () => {
  const linhas = [];
  let eng = null;
  let erro;
  try {
    eng = await carregarMotores(cwd);
  } catch (e) {
    erro = String(e.message);
    console.error(`[regras] não consegui carregar os motores de cálculo: ${erro}`);
  }
  const resultados = [];
  for (const r of [...regras, ...regrasDados]) {
    let res;
    if (!eng && !r.semMotor) res = { status: 'nao_verificavel', resumo: 'motores de cálculo não carregaram', exemplos: [] };
    else {
      try {
        res = await r.run({ eng, cwd });
      } catch (e) {
        res = { status: 'nao_verificavel', resumo: `erro ao executar: ${e.message}`, exemplos: [] };
      }
    }
    resultados.push({ id: r.id, area: r.area, titulo: r.titulo, fonte: r.fonte, confianca: r.confianca, severidade: r.severidade, acao: r.acao, ...res });
    linhas.push(`${res.status === 'ok' ? 'OK        ' : res.status.toUpperCase().padEnd(10)}${r.id}  ${res.resumo}`);
  }
  console.log(linhas.join('\n'));
  return { ok: Boolean(eng), resultados, estaticas: checagensEstaticas(), erro };
};

// ---------- relatório ----------
const ICON = { ok: 'OK', divergente: 'DIVERGENTE', revisar: 'REVISAR', nao_verificavel: 'NÃO VERIFICÁVEL' };
function markdown({ resultados, estaticas: e, erro }) {
  const por = (s) => resultados.filter((r) => r.status === s);
  const bloco = (r) =>
    [
      `### ${r.id} — ${r.titulo}`,
      `- **Status:** ${ICON[r.status]} · severidade ${r.severidade} · confiança da referência: ${r.confianca}`,
      `- **Fonte:** ${r.fonte}`,
      `- **Resultado:** ${r.resumo}${r.impactoMaximoMensal ? ` · maior diferença: R$ ${r.impactoMaximoMensal.toFixed(2)}/mês por empregado` : ''}`,
      ...(r.exemplos?.length ? ['- **Casos:**', ...r.exemplos.map((x) => `  - ${x}`)] : []),
      ...(r.acao ? [`- **Ação sugerida:** ${r.acao}`] : []),
    ].join('\n');
  const lista = (t, xs) => (xs.length ? [`**${t}** (${xs.length})`, ...xs.map((x) => `- ${x}`), ''] : []);
  return [
    `# Verificação das regras de negócio (cálculo e dados) — ${stamp}`,
    `Repositório: \`${rotulo}\``,
    erro && `> Não foi possível executar os motores: ${erro}`,
    '',
    `**Resumo:** ${resultados.length} regras · ${por('ok').length} ok · ${por('divergente').length} divergentes · ${por('revisar').length} a revisar · ${por('nao_verificavel').length} não verificáveis`,
    '',
    '> Divergente = o sistema contraria a norma/gabarito. Revisar = os dois motores do sistema discordam ou a regra é discutível; exige decisão humana.',
    '> O gabarito está em `scripts/autofix/regras/referencia.mjs`, com fonte e confiança de cada tabela. Confiança "média" = confirmada em fontes secundárias; conferir no texto oficial antes de alterar o cálculo.',
    '',
    '## Divergências com a norma',
    ...(por('divergente').length ? por('divergente').map(bloco) : ['Nenhuma.']),
    '',
    '## A revisar',
    ...(por('revisar').length ? por('revisar').map(bloco) : ['Nenhuma.']),
    '',
    '## Melhorias e lacunas (checagens estáticas)',
    `Analisados ${e.arquivos} arquivos de cálculo e ${e.funcoes} funções exportadas.`,
    '',
    ...lista('Funções de cálculo sem nenhuma referência em testes', e.semTeste),
    ...lista('Mesma função exportada por mais de um módulo (risco de divergência)', e.duplicadas),
    ...lista('Arredondamento misturado no mesmo arquivo (trunc/round/Decimal)', e.arredondamento),
    ...lista('Tabelas com incoerência interna', e.incoerencias),
    ...lista('Tabelas que o catálogo ainda NÃO verifica (faltam fonte oficial e regra)', e.semFonte),
    ...lista('Marcadores pendentes', e.pendencias),
    por('ok').length ? `## Regras conformes\n${por('ok').map((r) => `- ${r.id}: ${r.titulo} — ${r.resumo}`).join('\n')}\n` : '',
  ]
    .filter((x) => x !== false && x !== undefined)
    .join('\n');
}

const saida = await rodar();
const dir = opt('report-dir', join(homedir(), '.autofix-reports', 'Departamento_Pessoal_V3', 'regras'));
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, `${stamp}.md`), markdown(saida) + '\n');
writeFileSync(join(dir, `${stamp}.json`), JSON.stringify(saida, null, 2));
writeFileSync(join(dir, 'ULTIMO.md'), markdown(saida) + '\n');
console.log(`\nrelatório: ${join(dir, 'ULTIMO.md')}`);
const grave = saida.resultados.some((r) => r.status === 'divergente' && ['critica', 'alta'].includes(r.severidade));
process.exit(flag('strict') && (grave || !saida.ok) ? 1 : 0);
