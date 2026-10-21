/**
 * TEMPORÁRIO — analisa um arquivo de quadros gravado por
 * `_tmp-validar-entrada-pagamentos.mjs` (opacity + translateY por quadro).
 *
 * Uso: node scripts/_tmp-analisar-quadros.mjs tmp-entrada-pagamentos/quadros-....json
 */
import { readFileSync } from 'node:fs';

const caminho = process.argv[2];
if (!caminho) throw new Error('informe o caminho do JSON de quadros');
const quadros = JSON.parse(readFileSync(caminho, 'utf8'));
const chaves = Object.keys(quadros.find((q) => Object.keys(q).length > 1) ?? {}).filter((k) => k !== 't');

const t0 = quadros[0]?.t ?? 0;
const resumo = {};
for (const chave of chaves) {
  const serie = quadros.filter((q) => q[chave]).map((q) => ({ t: q.t - t0, ...q[chave] }));
  if (serie.length === 0) {
    resumo[chave] = null;
    continue;
  }
  const subidas = [];
  for (let i = 1; i < serie.length; i += 1) {
    if (serie[i - 1].o <= 0.02 && serie[i].o > 0.02) subidas.push(i);
  }
  const iFinal = subidas.length ? subidas[subidas.length - 1] : -1;
  const inicio = iFinal >= 0 ? serie[iFinal].t : null;
  const chegou = iFinal >= 0 ? (serie.slice(iFinal).find((s) => s.o >= 0.99)?.t ?? null) : null;
  resumo[chave] = {
    inicio_ms: inicio === null ? null : Math.round(inicio),
    duracao_ms: inicio !== null && chegou !== null ? Math.round(chegou - inicio) : null,
    y_entrada: Math.round(Math.max(...serie.filter((s) => s.o < 0.9).map((s) => Math.abs(s.y)), 0) * 10) / 10,
    passagens: subidas.length,
  };
}
const inicios = Object.values(resumo)
  .map((v) => (v ? v.inicio_ms : null))
  .filter((v) => v !== null);
const menor = inicios.length ? Math.min(...inicios) : null;
for (const v of Object.values(resumo)) {
  if (v && menor !== null && v.inicio_ms !== null) v.atraso_rel_ms = v.inicio_ms - menor;
}
for (const [chave, v] of Object.entries(resumo)) {
  console.log(
    v === null
      ? `${chave.padEnd(20)} —`
      : `${chave.padEnd(20)} atraso=${String(v.atraso_rel_ms).padStart(4)}ms dur=${String(v.duracao_ms).padStart(4)}ms y=${String(v.y_entrada).padStart(4)} passagens=${v.passagens}`,
  );
}
