#!/usr/bin/env node

/**
 * Impede que a edição dos planos executivos perca etapas, subetapas, checkpoints
 * ou introduza dependências que inviabilizem a própria ordem de execução.
 *
 * Valida todos os ciclos (`PLANO_MELHORIAS_50_ETAPAS_*.md`). Cada arquivo usa um
 * único prefixo de etapa (E50, E51, …) detectado a partir do primeiro cabeçalho.
 */
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const planDir = resolve(import.meta.dirname, '../docs/auditoria');
const planFiles = (await readdir(planDir))
  .filter((name) => /^PLANO_MELHORIAS_50_ETAPAS_\d{4}-\d{2}-\d{2}\.md$/.test(name))
  .sort();

if (planFiles.length === 0) {
  console.error('❌ Nenhum plano PLANO_MELHORIAS_50_ETAPAS_<data>.md encontrado.');
  process.exit(1);
}

let totalChecks = 0;
const allFailures = [];

for (const fileName of planFiles) {
  const plan = await readFile(resolve(planDir, fileName), 'utf8');
  const failures = [];
  let checks = 0;

  const expect = (condition, message) => {
    checks += 1;
    if (!condition) {
      console.error(`  ❌ [${fileName}] ${message}`);
      failures.push(message);
    }
  };

  const headers = [...plan.matchAll(/^## (E\d{2})-(\d{3}) — .+$/gm)];
  const prefix = headers[0]?.[1];
  expect(prefix !== undefined, 'cabeçalho de etapa `## Exx-NNN — Título` presente');
  expect(
    headers.every((match) => match[1] === prefix),
    `todas as etapas usam o mesmo prefixo (${prefix ?? '?'})`
  );

  const stages = headers.map((match, index) => {
    const number = Number(match[2]);
    const start = match.index ?? 0;
    const end = headers[index + 1]?.index ?? plan.length;
    return { number, text: plan.slice(start, end) };
  });

  expect(stages.length === 50, `50 etapas presentes (encontradas: ${stages.length})`);
  expect(
    stages.every((stage, index) => stage.number === index + 1),
    `IDs ${prefix}-001 até ${prefix}-050 são únicos e contínuos`
  );

  const label = (n) => `${prefix}-${String(n).padStart(3, '0')}`;

  for (const stage of stages) {
    // A checklist permanece estrutural mesmo quando uma subetapa é concluída.
    const substeps = (stage.text.match(/^\d+\. \[(?: |x|X)\]/gm) ?? []).length;
    const checkpoints = (stage.text.match(/^- \[(?: |x|X)\] \*\*C[1-4] /gm) ?? []).length;
    expect(substeps === 10, `${label(stage.number)} tem 10 subetapas (encontradas: ${substeps})`);
    expect(checkpoints === 4, `${label(stage.number)} tem C1–C4 (encontrados: ${checkpoints})`);

    // C1-C4 individualmente presentes — 4x o mesmo label (ex: 4x C1) passaria na
    // contagem acima mas indicaria que os checkpoints C2/C3/C4 foram apagados.
    for (const c of [1, 2, 3, 4]) {
      const hasC = new RegExp(`- \\[(?: |x|X)\\] \\*\\*C${c} `).test(stage.text);
      expect(hasC, `${label(stage.number)} contém checkpoint C${c} com label distinto`);
    }
  }

  // Títulos únicos — cópia acidental de cabeçalho produz dois stages com
  // o mesmo nome; isso não é detectado pela checagem de IDs (números distintos
  // mas textos idênticos passariam sem este check).
  const titlesSeen = new Map();
  for (let i = 0; i < stages.length; i++) {
    const title = headers[i][0].replace(/^## [A-Z]\d+-\d{3} — /, '').trim();
    if (titlesSeen.has(title)) {
      expect(false, `título duplicado: "${title}" em ${label(stages[i].number)} e ${label(titlesSeen.get(title))}`);
    } else {
      titlesSeen.set(title, stages[i].number);
      checks++; // unique-title pass conta como verificação
    }
  }

  // Intervalo aceita en dash, em dash ou hífen: com só `–`, um `E51-001-049`
  // digitado com hífen validava apenas o início e a dependência futura passava.
  const depRe = new RegExp(`${prefix}-(\\d{3})(?:[–—-](\\d{3}))?`, 'g');
  for (const stage of stages) {
    const dependencyCell = stage.text.match(/\| Dependências \|([^|]*)\|/);
    expect(dependencyCell !== null, `${label(stage.number)} declara dependências`);
    if (!dependencyCell) continue;

    for (const dependency of dependencyCell[1].matchAll(depRe)) {
      const first = Number(dependency[1]);
      const last = Number(dependency[2] ?? dependency[1]);
      expect(
        first < stage.number && last < stage.number,
        `${label(stage.number)} não depende de etapa futura ou de si mesma`
      );
    }
  }

  totalChecks += checks;
  allFailures.push(...failures.map((message) => `${fileName}: ${message}`));
  if (failures.length === 0) {
    console.log(`  ✅ ${fileName} (${prefix}): ${checks} verificações`);
  }
}

if (allFailures.length > 0) {
  console.error(`\n❌ Planos de 50 etapas reprovados: ${allFailures.length} falha(s).`);
  process.exit(1);
}

console.log(`✅ ${planFiles.length} plano(s) de 50 etapas estruturalmente executáveis (${totalChecks} verificações).`);
