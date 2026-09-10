#!/usr/bin/env node

/**
 * Impede que a edição do plano executivo perca etapas, subetapas, checkpoints
 * ou introduza dependências que inviabilizem a própria ordem de execução.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const planPath = resolve(import.meta.dirname, '../docs/auditoria/PLANO_MELHORIAS_50_ETAPAS_2026-09-10.md');
const plan = await readFile(planPath, 'utf8');
const headers = [...plan.matchAll(/^## E50-(\d{3}) — .+$/gm)];
const failures = [];
let checks = 0;

const expect = (condition, message) => {
  checks += 1;
  if (!condition) {
    console.error(`  ❌ ${message}`);
    failures.push(message);
  }
};

const stages = headers.map((match, index) => {
  const number = Number(match[1]);
  const start = match.index ?? 0;
  const end = headers[index + 1]?.index ?? plan.length;
  return { number, text: plan.slice(start, end) };
});

expect(stages.length === 50, `50 etapas presentes (encontradas: ${stages.length})`);
expect(
  stages.every((stage, index) => stage.number === index + 1),
  'IDs E50-001 até E50-050 são únicos e contínuos'
);

for (const stage of stages) {
  const label = `E50-${String(stage.number).padStart(3, '0')}`;
  const substeps = (stage.text.match(/^\d+\. \[ \]/gm) ?? []).length;
  const checkpoints = (stage.text.match(/^- \[ \] \*\*C[1-4] /gm) ?? []).length;
  expect(substeps === 10, `${label} tem 10 subetapas (encontradas: ${substeps})`);
  expect(checkpoints === 4, `${label} tem C1–C4 (encontrados: ${checkpoints})`);
}

for (const stage of stages) {
  const label = `E50-${String(stage.number).padStart(3, '0')}`;
  const dependencyCell = stage.text.match(/\| Dependências \|([^|]*)\|/);
  expect(dependencyCell !== null, `${label} declara dependências`);
  if (!dependencyCell) continue;

  for (const dependency of dependencyCell[1].matchAll(/E50-(\d{3})(?:–(\d{3}))?/g)) {
    const first = Number(dependency[1]);
    const last = Number(dependency[2] ?? dependency[1]);
    expect(first < stage.number && last < stage.number, `${label} não depende de etapa futura ou de si mesma`);
  }
}

if (failures.length > 0) {
  console.error(`\n❌ Plano de 50 etapas reprovado: ${failures.length} falha(s).`);
  process.exit(1);
}

console.log(`✅ Plano de 50 etapas estruturalmente executável (${checks} verificações).`);
