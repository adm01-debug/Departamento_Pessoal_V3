#!/usr/bin/env node
// W83 — SLA dos alertas abertos de Code Scanning (usado pelo branch-hygiene-audit.yml).
// high/critical → 14 dias; medium/low → 30 dias. Violação → exit 1.
//
// Saiu do YAML em 15/10/2026: inline no workflow, o heredoc do Node estava menos
// indentado que o `run: |` e o arquivo inteiro virou YAML inválido (o GitHub
// recusava o workflow em todo push). Mesmo corrigida a indentação, o passo tinha
// dois defeitos: `echo $ALERTAS | node - <<EOF` entregava o heredoc no stdin e o
// JSON se perdia; e a severidade vinha de `rule.severity` (error/warning/note),
// que nunca vale "high" — nenhum alerta recebia o SLA de 14 dias.
//
// Uso: node scripts/ci/sla-code-scanning.mjs < alertas.json  (markdown no stdout)

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const SLA_DIAS = { alto: 14, baixo: 30 };

// security_severity_level (low/medium/high/critical) e o campo de severidade de
// seguranca; regras sem ele (qualidade) usam rule.severity: error conta como alto.
export function nivel(alerta) {
  const seg = alerta?.rule?.security_severity_level;
  if (seg) return String(seg).toLowerCase();
  return alerta?.rule?.severity === 'error' ? 'high' : 'low';
}

// CodeQL 292/293 (mesma classe já corrigida em actions-kpi.mjs): `location.path`
// é o caminho de um arquivo do PR que disparou o alerta — quem abre o PR (inclusive
// de fork) controla essa string. Ela termina dentro de um bloco ``` no Job Summary
// e no corpo da issue pública [branch-hygiene]; sem neutralizar backtick/quebra de
// linha, um path malicioso rompe a cerca de código e injeta markdown/HTML cru.
function textoSeguro(valor) {
  const limpo = String(valor ?? '?')
    // \v/\f não são "quebra de linha" pro CommonMark (só \r/\n contam) — não
    // rompem a cerca ```, mas entram no mesmo grupo de "não é texto normal
    // de uma linha" que já neutralizamos.
    .replace(/[\r\n\t\v\f]+/g, ' ')
    .replace(/`/g, "'")
    .trim();
  // .slice() opera em code units UTF-16, não em code points: pode cortar um
  // par substituto (emoji, etc.) pela metade. O resto sobrevivendo sozinho
  // (ex.: 0xD83C sem o par) é silenciosamente trocado por U+FFFD ao serializar
  // em UTF-8 (fetch/JSON.stringify não avisam) — não é injeção, mas corrompe
  // o texto publicado na issue.
  let cortado = limpo.slice(0, 200);
  const ultimo = cortado.charCodeAt(cortado.length - 1);
  if (ultimo >= 0xd800 && ultimo <= 0xdbff) cortado = cortado.slice(0, -1);
  return cortado || '?';
}

export function avaliarSla(alertas, agoraMs = Date.now()) {
  const violacoes = [];
  for (const a of alertas) {
    const sev = nivel(a);
    const prazo = sev === 'high' || sev === 'critical' ? SLA_DIAS.alto : SLA_DIAS.baixo;
    const criadoEm = new Date(a.created_at).getTime();
    // created_at ausente/malformado dava NaN: `NaN > prazo` é sempre falso, então o
    // alerta nunca entrava em violacoes mesmo vencido há anos, sem aviso nenhum
    // (diferente do tratamento já existente para "resposta não é array").
    if (!Number.isFinite(criadoEm)) {
      console.error(`::warning::W83: alerta #${a.number ?? '?'} com created_at inválido/ausente — SLA não avaliado`);
      continue;
    }
    const dias = Math.floor((agoraMs - criadoEm) / 86_400_000);
    if (dias > prazo) {
      const local = textoSeguro(a.most_recent_instance?.location?.path);
      violacoes.push(`${sev.toUpperCase()} (${dias}d > ${prazo}d) — #${a.number}: ${textoSeguro(a.rule?.id)} em ${local}`);
    }
  }
  return { total: alertas.length, violacoes };
}

export function relatorio({ total, violacoes }) {
  const linhas = [
    '',
    '### 🔒 Code Scanning — SLA (W83)',
    '',
    `SLA: high/critical → ${SLA_DIAS.alto}d · medium/low → ${SLA_DIAS.baixo}d`,
    '',
    `Alertas abertos: ${total}`,
    '',
  ];
  if (violacoes.length) linhas.push('⚠️ **Violações de SLA:**', '```', ...violacoes, '```');
  else linhas.push('✅ Nenhuma violação de SLA.');
  return `${linhas.join('\n')}\n`;
}

// Lê o JSON do stdin (`node sla-code-scanning.mjs < alertas.json`): o script não
// recebe caminho nenhum, então não há caminho a validar.
function main() {
  let alertas;
  try {
    alertas = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    alertas = null;
  }
  if (!Array.isArray(alertas)) {
    console.error('::warning::W83: a API não devolveu uma lista de alertas');
    process.stdout.write('\n### ⚠️ Code Scanning — SLA (W83)\n\nNão foi possível consultar os alertas (permissão ou API).\n');
    return;
  }
  const r = avaliarSla(alertas);
  process.stdout.write(relatorio(r));
  if (r.violacoes.length) {
    for (const v of r.violacoes) console.error(`::error::W83: SLA vencido — ${v}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
