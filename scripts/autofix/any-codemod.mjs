// Codemod determinístico para `@typescript-eslint/no-explicit-any` (823 avisos, sem autofix no ESLint).
//
// Estratégia "tentar e provar": para cada `any` aplica uma transformação mecânica
// de TIPO (nunca muda runtime) e só mantém se o `tsc` não ganhar nenhum erro novo.
//   drop    : `(h: any) => …` em callback  ->  `(h) => …`   (o TS infere do contexto)
//             `catch (e: any)`             ->  `catch (e)`
//   unknown : `x: any`, `any[]`, `Record<string, any>`, `Promise<any>`  ->  `unknown`
//   as      : `x as any`  -> NÃO tocado por padrão (quase sempre exige conserto humano)
// Os candidatos são testados em lote; o que quebra é isolado por atribuição de erro
// (arquivo/linha) e, se não der, por bisseção. Cada teste é um tsc incremental.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { newErrors } from './lib.mjs';

class BudgetExhausted extends Error {}

function skipFile(text) {
  // Só pula o arquivo se o desligamento de bloco no topo cobre no-explicit-any (ou é um disable genérico).
  return /\/\*\s*eslint-disable\s*(\*\/|[^*]*no-explicit-any[^*]*\*\/)/.test(text.slice(0, 600));
}

/** Percorre a AST e devolve edits {start,end,text,line,kind} para cada `any` elegível. */
export function collectCandidates(ts, file, text) {
  if (skipFile(text)) return [];
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const lines = text.split('\n');
  const out = [];
  const K = ts.SyntaxKind;

  const insideAssertionType = (n) => {
    for (let a = n.parent; a && !ts.isStatement(a); a = a.parent) {
      if ((a.kind === K.AsExpression || a.kind === K.TypeAssertionExpression || a.kind === K.SatisfiesExpression) && a.type) {
        if (n.pos >= a.type.pos && n.end <= a.type.end) return true;
      }
    }
    return false;
  };

  const isCallbackArg = (fn) => {
    let c = fn.parent;
    while (c && c.kind === K.ParenthesizedExpression) c = c.parent;
    // Só callback de chamada/JSX tem tipo contextual; fora disso, remover o `: any` geraria "implicit any".
    return Boolean(c && (ts.isCallExpression(c) || ts.isNewExpression(c) || ts.isJsxExpression(c)));
  };

  const visit = (n) => {
    if (n.kind === K.AnyKeyword) {
      const start = n.getStart(sf);
      const line = sf.getLineAndCharacterOfPosition(start).line + 1;
      const same = lines[line - 1] ?? '';
      const prev = lines[line - 2] ?? '';
      const disabled = /eslint-disable-line/.test(same) || /eslint-disable-next-line/.test(prev);
      if (!disabled) {
        const p = n.parent;
        if (insideAssertionType(n)) {
          out.push({ file, start, end: n.end, text: 'unknown', line, kind: 'as' });
        } else if (ts.isParameter(p) && p.type === n && ts.isIdentifier(p.name) && !p.questionToken && (ts.isArrowFunction(p.parent) || ts.isFunctionExpression(p.parent)) && isCallbackArg(p.parent)) {
          out.push({ file, start: p.name.getEnd(), end: n.end, text: '', line, kind: 'drop' });
        } else if (ts.isVariableDeclaration(p) && p.type === n && ts.isCatchClause(p.parent) && ts.isIdentifier(p.name)) {
          out.push({ file, start: p.name.getEnd(), end: n.end, text: '', line, kind: 'drop' });
        } else {
          out.push({ file, start, end: n.end, text: 'unknown', line, kind: 'unknown' });
        }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

export function applyEdits(text, edits) {
  let out = text;
  for (const e of [...edits].sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return out;
}

/**
 * ctx: { cwd, ts, files, kinds, baselineErrors, typecheck(), maxRuns, log }
 * Devolve { candidates, accepted, rejected, runs, exhausted }.
 */
export async function runAnyPass(ctx) {
  const { cwd, ts, files, kinds, baselineErrors, maxRuns, log } = ctx;
  const original = new Map();
  const candidates = [];
  for (const f of files) {
    const text = readFileSync(join(cwd, f), 'utf8');
    original.set(f, text);
    for (const c of collectCandidates(ts, f, text)) if (kinds.includes(c.kind)) candidates.push(c);
  }

  let runs = 0;
  const accepted = new Set();
  const rejected = new Set();
  const dirty = new Set();

  const write = (live) => {
    const by = new Map();
    for (const e of [...accepted, ...live]) (by.get(e.file) ?? by.set(e.file, []).get(e.file)).push(e);
    for (const f of new Set([...dirty, ...by.keys()])) writeFileSync(join(cwd, f), applyEdits(original.get(f), by.get(f) ?? []));
    dirty.clear();
    for (const f of by.keys()) dirty.add(f);
  };

  const test = async (live) => {
    if (runs >= maxRuns) throw new BudgetExhausted();
    write(live);
    runs++;
    const res = await ctx.typecheck();
    const fresh = newErrors(baselineErrors, res.errors);
    return { ok: !res.crashed && fresh.length === 0, fresh };
  };

  // Culpa provável por erro: a edição mais próxima ANTES da linha do erro (ou a mais próxima depois).
  const attribute = (fresh, live) => {
    const bad = new Set();
    for (const err of fresh) {
      const inFile = live.filter((e) => e.file === err.file);
      if (!inFile.length) continue;
      const before = inFile.filter((e) => e.line <= err.line);
      const pool = before.length ? before : inFile;
      const target = before.length ? Math.max(...pool.map((e) => e.line)) : Math.min(...pool.map((e) => e.line));
      for (const e of pool) if (e.line === target) bad.add(e);
    }
    return bad;
  };

  const settle = async (cands) => {
    let live = cands;
    while (live.length) {
      const res = await test(live);
      if (res.ok) {
        for (const e of live) accepted.add(e);
        return;
      }
      const bad = attribute(res.fresh, live);
      if (bad.size === 0 || bad.size === live.length) {
        if (live.length === 1) {
          rejected.add(live[0]);
          return;
        }
        // Erro em arquivo não editado (efeito cruzado) ou tudo suspeito: bisseção.
        const mid = Math.ceil(live.length / 2);
        await settle(live.slice(0, mid));
        await settle(live.slice(mid));
        return;
      }
      for (const e of bad) rejected.add(e);
      live = live.filter((e) => !bad.has(e));
    }
  };

  let exhausted = false;
  try {
    log(`any[${kinds}]: ${candidates.length} candidatos em ${new Set(candidates.map((c) => c.file)).size} arquivos`);
    await settle(candidates);
    // Segunda chance: a atribuição por linha pode ter rejeitado inocentes.
    const again = [...rejected];
    if (again.length && again.length < candidates.length) {
      rejected.clear();
      log(`any[${kinds}]: segunda chance para ${again.length} rejeitados`);
      await settle(again);
    }
  } catch (e) {
    if (!(e instanceof BudgetExhausted)) throw e;
    exhausted = true;
    log(`any[${kinds}]: orçamento de ${maxRuns} rodadas do tsc esgotado — mantendo só o já provado`);
  }
  write([]); // estado final = somente o aceito (todo aceito foi provado em conjunto)
  return { candidates: candidates.length, accepted: accepted.size, rejected: candidates.length - accepted.size, runs, exhausted };
}
