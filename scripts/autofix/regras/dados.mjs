// Regras de DADOS verificadas por replay ESTÁTICO das migrations (supabase/migrations/*.sql, em ordem).
// Reconstrói o estado final aproximado do schema (tabelas, colunas, RLS, policies, funções, índices, FKs) sem
// precisar de banco. É uma aproximação por regex: serve para achar candidatos; todo achado cita a migration de
// origem para conferência. Os auditores do projeto que exigem DATABASE_URL continuam sendo a prova definitiva.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// ---------- tokenizador de statements (respeita comentários, aspas e $$ ... $$) ----------
export function dividirStatements(sql) {
  const out = [];
  let cur = '';
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const c = sql[i];
    const d = sql[i + 1];
    if (c === '-' && d === '-') { while (i < n && sql[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { let depth = 1; i += 2; while (i < n && depth > 0) { if (sql[i] === '/' && sql[i + 1] === '*') { depth++; i += 2; } else if (sql[i] === '*' && sql[i + 1] === '/') { depth--; i += 2; } else i++; } cur += ' '; continue; }
    if (c === "'") { let j = i + 1; while (j < n) { if (sql[j] === "'" && sql[j + 1] === "'") j += 2; else if (sql[j] === "'") break; else j++; } cur += sql.slice(i, j + 1); i = j + 1; continue; }
    if (c === '"') { const j = sql.indexOf('"', i + 1); const e = j < 0 ? n : j; cur += sql.slice(i, e + 1); i = e + 1; continue; }
    if (c === '$' && !(i > 0 && /[\w$]/.test(sql[i - 1]))) {
      const m = /^\$((?:[^\s$\d][^\s$]*)?)\$/.exec(sql.slice(i, i + 80));
      if (m) { const e = sql.indexOf(m[0], i + m[0].length); const end = e < 0 ? n : e + m[0].length; cur += sql.slice(i, end); i = end; continue; }
    }
    if (c === ';') { if (cur.trim()) out.push(cur.trim()); cur = ''; i++; continue; }
    cur += c; i++;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const norm = (s) => s.trim().replace(/^"?public"?\./i, '').replace(/"/g, '').toLowerCase().trim();
const TBL = String.raw`((?:(?:"[^"]+"|\w+)\.)?(?:"[^"]+"|\w+))`;
const re = (s, f = 'i') => new RegExp(s, f);
const splitTopLevel = (s) => {
  const parts = []; let depth = 0; let cur = ''; let q = null;
  for (const ch of s) {
    if (q) { cur += ch; if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"') { q = ch; cur += ch; continue; }
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
};
const corpoParenteses = (s) => { const a = s.indexOf('('); if (a < 0) return ''; let d = 0; for (let i = a; i < s.length; i++) { if (s[i] === '(') d++; else if (s[i] === ')' && --d === 0) return s.slice(a + 1, i); } return s.slice(a + 1); };

// tipo da coluna: tudo até a primeira palavra-chave de restrição ("double precision", "float(53)", "real[]")
const tipoDe = (rest) => rest.split(/\s+(?:not\s+null|null|default|primary|references|check|unique|generated|collate|constraint)\b/i)[0].trim().toLowerCase();
const TIPO_ALIAS = { int: 'integer', int4: 'integer', int8: 'bigint', int2: 'smallint', bool: 'boolean', float8: 'double precision', float4: 'real', varchar: 'character varying', timestamptz: 'timestamp with time zone', timestamp: 'timestamp without time zone', bpchar: 'character' };
const normTipo = (t) => { const x = t.trim().toLowerCase().replace(/\s+/g, ' ').replace(/^"?public"?\./, '').replace(/^"|"$/g, ''); return TIPO_ALIAS[x] ?? x; };
// "p_id int, text, p double precision" -> "integer,text,double precision" (null = assinatura desconhecida)
const tiposDe = (txt) => {
  if (txt === undefined || txt === null) return null;
  if (!txt.trim()) return '';
  return splitTopLevel(txt).map((a) => {
    a = a.replace(/\s+(?:default|=)\s+.*$/is, '').trim().replace(/^(?:in|out|inout|variadic)\s+/i, '');
    const parts = a.split(/\s+/);
    return normTipo(parts.length > 1 && !/^(precision|varying|with|without)$/i.test(parts[1]) ? parts.slice(1).join(' ') : a);
  }).join(',');
};
const fkey = (nome, txt) => `${nome}(${tiposDe(txt)})`;
const nomeDe = (k) => k.slice(0, k.indexOf('('));

// ---------- replay ----------
export function reconstruirSchema(dirMigrations) {
  const tabelas = new Map(); // nome -> {origem, cols:Map(nome->tipo), pk:boolean, fks:[{cols,ref,origem}] }
  const rls = new Set();
  const policies = new Map(); // `${tabela}|${nome}` -> {tabela,nome,cmd,roles,using,check,origem}
  const funcoes = new Map(); // nome -> {secdef, searchPath, origem}
  const indices = []; // {tabela, cols:[...]}
  const acl = new Map(); // tabela -> Set(roles sem acesso): REVOKE ALL ... FROM anon/authenticated/PUBLIC
  const arquivos = readdirSync(dirMigrations).filter((f) => f.endsWith('.sql') && !f.endsWith('.verify.sql')).sort();

  // SQL dinâmico: blocos DO e chamadas ao helper _ensure_search_path. Reaplica os literais SQL
  // ('DROP POLICY ...', 'ALTER TABLE ... ENABLE ROW LEVEL SECURITY') e trata loops por arrays de nomes.
  const marcaSP = (nome, txt) => { const alvo = tiposDe(txt); for (const [k, f] of funcoes) if (nomeDe(k) === nome && (alvo === null || k === `${nome}(${alvo})`)) f.searchPath = true; };
  // Contexto de um DDL dentro de DO: "firme" (roda sempre), "guarda" (só dentro de IF [NOT] EXISTS (SELECT ... catálogo), que numa
  // reconstrução a partir das migrations vale para o que o replay conhece) ou "incerta" (qualquer outra condição, loop, ELSE).
  //  - firme  : aplica tudo.
  //  - guarda : aplica tudo MENOS o destrutivo (DROP, RENAME, SET SCHEMA): o replay não avalia a condição de coluna/dado
  //             (ex.: "só renomeia se a tabela não tiver data_inicio") e renomear errado faz a tabela real sair da auditoria.
  //  - incerta: aplica só o que ACRESCENTA ao que é auditado (policy, tabela, índice); nunca o que "fecha" nem o que apaga.
  const ACRESCENTA = /^(create\s+(?:or\s+replace\s+)?policy|alter\s+policy|create\s+(?:unlogged\s+)?table|create\s+(?:unique\s+)?index)\b/i;
  // DROP POLICY/INDEX em guarda de existência é o idioma normal de migration idempotente e vale; o que faz a tabela real sair da
  // auditoria (DROP TABLE/FUNCTION, RENAME, SET SCHEMA) continua bloqueado quando condicional.
  const DESTRUTIVO = /^(drop\s+(?:table|function|procedure)\b|alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?\S+\s+(?:rename\s|set\s+schema\b))/i;
  const DDL_DO = /\b(create\s+(?:or\s+replace\s+)?policy|alter\s+policy|drop\s+policy|alter\s+table|create\s+(?:unlogged\s+)?table|drop\s+table|create\s+(?:unique\s+)?index|drop\s+index|alter\s+function|drop\s+function)\b/i;
  const GUARDA_EXISTENCIA = /\bif\s+(?:not\s+)?exists\s*\(\s*select\b[\s\S]*?\bfrom\s+(?:information_schema\.|pg_catalog\.|pg_)|\bif\s+(?:not\s+)?to_reg(?:class|proc|procedure|type|namespace)\s*\(/i;
  const caminharDO = (corpo, origem) => {
    const pilha = []; // um item por IF/LOOP aberto: { guarda: bool, senao: bool }
    let handler = false; let abortou = false;
    const contexto = (pre) => {
      let guarda = pilha.every((n) => n.guarda && !n.senao);
      let incerta = !guarda;
      if (/\b(loop|else)\b/i.test(pre)) incerta = true;
      else if (/\bthen\b/i.test(pre)) { if (!GUARDA_EXISTENCIA.test(pre)) incerta = true; else guarda = true; }
      return incerta ? 'incerta' : (pilha.length || /\bthen\b/i.test(pre)) ? 'guarda' : 'firme';
    };
    for (const sub of dividirStatements(corpo)) {
      if (abortou) break;
      if (/\bexception\s+when\b/i.test(sub)) handler = true;          // o que vem depois é tratador de erro: não é o caminho feliz
      if (handler) { if (/^end\b(?!\s+(?:if|loop|case))/i.test(sub)) handler = false; continue; }
      if (/^else\b/i.test(sub) && pilha.length) pilha[pilha.length - 1].senao = true;
      // FOREACH x IN ARRAY ARRAY['CREATE INDEX ...', ...] LOOP EXECUTE x: array CONSTANTE de DDL percorrido por inteiro,
      // então cada literal roda (com o contexto dos IFs que envolvem o loop, não do loop em si).
      if (/\b(?:foreach|for)\b[\s\S]*?\bin\b[\s\S]*?\barray\s*\[/i.test(sub)) {
        const ctx = contexto('');
        for (const lit of sub.matchAll(/'((?:[^']|'')*)'/g)) {
          const q = lit[1].replace(/''/g, "'").trim();
          if (!/^(alter|drop|create)\s/i.test(q) || q.includes('%')) continue;
          for (const x of dividirStatements(q)) if (ctx === 'firme' || (ctx === 'guarda' && !DESTRUTIVO.test(x)) || (ctx === 'incerta' && ACRESCENTA.test(x))) aplicar(x, origem);
        }
      }
      let achou = null;
      const ex = /^(?:[\s\S]*?\bthen\s+|else\s+|begin\s+)?execute\s+'((?:[^']|'')*)'\s*$/i.exec(sub);
      if (ex && !ex[1].includes('%')) achou = { sql: ex[1].replace(/''/g, "'").trim(), pre: sub.slice(0, sub.search(/execute/i)) };
      else if (!/\bexecute\b/i.test(sub)) { const mm = DDL_DO.exec(sub); if (mm) achou = { sql: sub.slice(mm.index), pre: sub.slice(0, mm.index) }; }
      if (achou) {
        const ctx = contexto(achou.pre);
        for (const x of dividirStatements(achou.sql)) {
          if (ctx === 'firme' || (ctx === 'guarda' && !DESTRUTIVO.test(x)) || (ctx === 'incerta' && ACRESCENTA.test(x))) aplicar(x, origem);
        }
      }
      if (!pilha.length && /^(?:begin\s+)?raise\s+exception\b/i.test(sub)) abortou = true;   // o resto não executa
      // abre/fecha níveis: cada THEN de IF abre um (guarda se a condição consulta o catálogo), cada LOOP abre um (incerto)
      const abre = [];
      const cond = sub.split(/\bthen\b/i);
      for (let k = 0; k < cond.length - 1; k++) {
        if (/\bwhen\b/i.test(cond[k]) && !/\bif\b/i.test(cond[k])) continue;        // WHEN ... THEN (case/exception)
        if (/\belsif\b/i.test(cond[k])) continue;                                  // ELSIF não abre nível novo
        if (/\bif\b/i.test(cond[k])) abre.push({ guarda: GUARDA_EXISTENCIA.test(cond[k] + ' then'), senao: false });
      }
      for (let k = 0; k < (sub.match(/\bloop\b/gi) || []).length - 2 * (sub.match(/\bend\s+loop\b/gi) || []).length; k++) abre.push({ guarda: false, senao: false });
      pilha.push(...abre);
      for (let k = 0; k < (sub.match(/\bend\s+if\b/gi) || []).length + (sub.match(/\bend\s+loop\b/gi) || []).length; k++) pilha.pop();
    }
  };
  const dinamico = (st, origem) => {
    if (/^do\b/i.test(st)) {
      for (const bm of st.matchAll(/\$([^\s$]*)\$([\s\S]*?)\$\1\$/g)) caminharDO(bm[2], origem);
    }
    // 3a) loop que APLICA search_path a todas as SECURITY DEFINER existentes: só conta se filtra prosecdef, usa EXECUTE
    //     e contém ALTER FUNCTION ... SET search_path (aplicação real, não um bloco que só verifica/avisa).
    if (/pg_proc|information_schema\.routines/i.test(st) && /prosecdef|security\s+definer/i.test(st) && /\bexecute\b/i.test(st) && /alter\s+function[^;]*set\s+search_path/i.test(st) && !/proname\s*(?:=|<>|!=|~|like\b|not\b|in\s*\()/i.test(st)) {
      for (const f of funcoes.values()) if (f.secdef) f.searchPath = true;
    }
    // 3b) helper de search_path por assinatura. Sem curinga para tabelas e sem curinga genérico para funções.
    for (const h of st.matchAll(/_ensure_search_path\s*\(\s*'[^']*'\s*,\s*'([^']+)'(?:\s*,\s*'([^']*)')?/gi)) marcaSP(norm(h[1]), h[2]);
    if (/alter\s+function|set_search_path/i.test(st)) {
      for (const sig of st.matchAll(/'(?:"?public"?\.)?"?([A-Za-z_]\w*)"?\s*\(([^')]*)\)'/g)) marcaSP(sig[1].toLowerCase(), sig[2]);
    }
    // 4) tabelas citadas por literal em bloco que habilita RLS (loop por array de nomes)
    if (/enable\s+row\s+level\s+security/i.test(st)) {
      const limpo = st.replace(/\braise\s+\w+\s+'(?:[^']|'')*'[^;]*/gi, ' ').replace(/(?:<>|!=)\s*'[^']*'/g, ' ').replace(/not\s+in\s*\([^)]*\)/gi, ' ');
      for (const x of limpo.matchAll(/'([A-Za-z_]\w*)'/g)) if (tabelas.has(x[1].toLowerCase())) rls.add(x[1].toLowerCase());
    }
  };

  const aplicar = (st, origem) => {
      let m;
      if (/^(revoke|grant)\s+(?:all|select|insert|update|references)(?:\s+privileges)?\s*\(/i.test(st)) return; // privilégio por COLUNA não fecha a tabela
      if ((m = /^(revoke|grant)\s+all\b.*?\bon\s+all\s+tables\s+in\s+schema\s+public\s+(?:from|to)\s+(.+)$/is.exec(st))) {
        const papeis = m[2].toLowerCase().split(',').map((x) => x.trim().replace(/"/g, '')); const rv = m[1].toLowerCase() === 'revoke';
        for (const tb of tabelas.keys()) { if (!acl.has(tb)) acl.set(tb, new Set()); for (const r of papeis) { if (r === 'public') { if (!rv) { acl.get(tb).delete('anon'); acl.get(tb).delete('authenticated'); } } else if (rv) acl.get(tb).add(r); else acl.get(tb).delete(r); } }
        return;
      }
      if ((m = re(String.raw`^(revoke|grant)\s+.*?\bon\s+(?:table\s+)?${TBL}\s+(?:from|to)\s+(.+)$`, 'is').exec(st)) && !/\bon\s+(?:all\s+)?(?:tables|functions|sequences)\s+in\s+schema/i.test(st)) {
        const t = norm(m[2]); const papeis = m[3].toLowerCase().replace(/\s+with\s+.*$/, '').split(',').map((x) => x.trim().replace(/^group\s+/, ''));
        const alvo = papeis.map((x) => x.replace(/"/g, '')).filter((x) => x !== 'public'); // no Supabase os grants são diretos a anon/authenticated: PUBLIC não os fecha
        if (!acl.has(t)) acl.set(t, new Set());
        if (m[1].toLowerCase() === 'revoke' && /^revoke\s+all\b/i.test(st)) for (const r of alvo) acl.get(t).add(r);
        if (m[1].toLowerCase() === 'grant') { for (const r of alvo) acl.get(t).delete(r); if (papeis.includes('public')) { acl.get(t).delete('anon'); acl.get(t).delete('authenticated'); } }
        return;
      }
      if (/^do\b/i.test(st) || /(_ensure_search_path|set_search_path)\s*\(/i.test(st)) { dinamico(st, origem); return; }
      if ((m = re(String.raw`^create\s+(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?${TBL}\s+(?:partition\s+of|as\b)`).exec(st))) {
        const nome = norm(m[1]); if (!nome.includes('.')) tabelas.set(nome, { origem, cols: new Map(), pk: true, fks: [], derivada: true });
      } else if ((m = re(String.raw`^create\s+(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?${TBL}\s*\(`).exec(st))) {
        const nome = norm(m[1]);
        if (nome.includes('.')) return; // outro schema
        const t = { origem, cols: new Map(), pk: false, fks: [] };
        for (const item of splitTopLevel(corpoParenteses(st))) {
          const pku = /^(?:constraint\s+\S+\s+)?(primary\s+key|unique)\s*\(([^)]*)\)/i.exec(item);
          if (pku) { if (/^primary/i.test(pku[1])) t.pk = true; indices.push({ tabela: nome, nome: null, cols: pku[2].split(',').map((x) => norm(x)) }); continue; }
          const fk = /(?:constraint\s+\S+\s+)?foreign\s+key\s*\(([^)]+)\)\s*references\s+(\S+)/i.exec(item);
          if (fk) { t.fks.push({ cols: fk[1].split(',').map((x) => norm(x)), ref: norm(fk[2].replace(/\(.*/, '')), origem }); continue; }
          if (/^(constraint|unique|check|exclude|like)\b/i.test(item)) continue;
          const col = /^"?([^"\s]+)"?\s+(.+)$/is.exec(item);
          if (!col) continue;
          t.cols.set(col[1].toLowerCase(), tipoDe(col[2]));
          if (/primary\s+key/i.test(item)) t.pk = true;
          if (/primary\s+key|\bunique\b/i.test(item)) indices.push({ tabela: nome, nome: null, cols: [col[1].toLowerCase()] });
          const inl = /references\s+((?:"?\w+"?\.)?"?\w+"?)/i.exec(item);
          if (inl) t.fks.push({ cols: [col[1].toLowerCase()], ref: norm(inl[1]), origem });
        }
        tabelas.set(nome, t);
      } else if ((m = re(String.raw`^drop\s+table\s+(?:if\s+exists\s+)?(.+)$`).exec(st))) {
        for (const x of m[1].replace(/\s+(cascade|restrict)\s*$/i, '').split(',')) { const n = norm(x); tabelas.delete(n); rls.delete(n); acl.delete(n); for (let k = indices.length - 1; k >= 0; k--) if (indices[k].tabela === n) indices.splice(k, 1); for (const k of [...policies.keys()]) if (k.startsWith(`${n}|`)) policies.delete(k); }
      } else if ((m = re(String.raw`^alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?${TBL}\s+(enable|disable|force)\s+row\s+level\s+security`).exec(st))) {
        const n = norm(m[1]);
        if (m[2].toLowerCase() === 'enable') { if (tabelas.has(n)) rls.add(n); } else if (m[2].toLowerCase() === 'disable') rls.delete(n);
      } else if ((m = re(String.raw`^alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?${TBL}\s+rename\s+to\s+(\S+)`).exec(st))) {
        const a = norm(m[1]); const b = norm(m[2]); const t = tabelas.get(a);
        if (t) { tabelas.delete(a); tabelas.set(b, t); if (rls.delete(a)) rls.add(b); if (acl.has(a)) { acl.set(b, acl.get(a)); acl.delete(a); }
          for (const k of [...policies.keys()]) if (k.startsWith(`${a}|`)) { const p = policies.get(k); policies.delete(k); p.tabela = b; policies.set(`${b}|${k.slice(a.length + 1)}`, p); }
          for (const ix of indices) if (ix.tabela === a) ix.tabela = b; }
      } else if ((m = re(String.raw`^alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?${TBL}\s+set\s+schema\s+(\S+)`).exec(st))) {
        const a = norm(m[1]); if (norm(m[2]) !== 'public') { tabelas.delete(a); rls.delete(a); acl.delete(a); }
      } else if ((m = re(String.raw`^alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?${TBL}\s+(.*)$`, 'is').exec(st))) {
        const n = norm(m[1]); const t = tabelas.get(n); if (!t) return;
        for (const acao of splitTopLevel(m[2])) {
          let a;
          if ((a = /^(enable|disable)\s+row\s+level\s+security/i.exec(acao))) { if (a[1].toLowerCase() === 'enable') rls.add(n); else rls.delete(n); } /* (t existe: checado acima) */
          else if ((a = /^add\s+column\s+(?:if\s+not\s+exists\s+)?"?([^"\s]+)"?\s+(.+)$/is.exec(acao))) {
            t.cols.set(a[1].toLowerCase(), tipoDe(a[2]));
            const inl = /references\s+((?:"?\w+"?\.)?"?\w+"?)/i.exec(acao); if (inl) t.fks.push({ cols: [a[1].toLowerCase()], ref: norm(inl[1]), origem });
          } else if ((a = /^alter\s+column\s+"?([^"\s]+)"?\s+(?:set\s+data\s+)?type\s+(.+)$/is.exec(acao))) t.cols.set(a[1].toLowerCase(), tipoDe(a[2]));
          else if ((a = /^add\s+(?:constraint\s+\S+\s+)?(primary\s+key|unique)\s*\(([^)]*)\)/i.exec(acao))) { if (/^primary/i.test(a[1])) t.pk = true; indices.push({ tabela: n, nome: null, cols: a[2].split(',').map((x) => norm(x)) }); }
          else if ((a = /^add\s+(?:constraint\s+\S+\s+)?foreign\s+key\s*\(([^)]+)\)\s*references\s+(\S+)/i.exec(acao))) t.fks.push({ cols: a[1].split(',').map((x) => norm(x)), ref: norm(a[2].replace(/\(.*/, '')), origem });
          else if ((a = /^drop\s+column\s+(?:if\s+exists\s+)?"?(\w+)"?/i.exec(acao))) t.cols.delete(a[1].toLowerCase());
        }
      } else if ((m = re(String.raw`^create\s+policy\s+("[^"]+"|\w+)\s+on\s+${TBL}\s*(.*)$`, 'is').exec(st))) {
        const resto = m[3];
        const cmd = /\bfor\s+(all|select|insert|update|delete)\b/i.exec(resto)?.[1]?.toLowerCase() ?? 'all';
        const roles = /\bto\s+([\w",\s]+?)(?=\s+(?:using|with)\b|$)/i.exec(resto)?.[1]?.replace(/[\s"]/g, '').toLowerCase() ?? 'public';
        const u = /\busing\s*\(/i.exec(resto); const c = /\bwith\s+check\s*\(/i.exec(resto);
        const body = (idx) => (idx ? corpoParenteses(resto.slice(idx.index)) : '').replace(/\s+/g, ' ').trim();
        policies.set(`${norm(m[2])}|${m[1].replace(/"/g, '').toLowerCase()}`, { tabela: norm(m[2]), nome: m[1].replace(/"/g, ''), cmd, roles, using: body(u), check: body(c), origem });
      } else if ((m = re(String.raw`^alter\s+policy\s+("[^"]+"|\w+)\s+on\s+${TBL}\s*(.*)$`, 'is').exec(st))) {
        const p = policies.get(`${norm(m[2])}|${m[1].replace(/"/g, '').toLowerCase()}`);
        if (p) {
          const rn = /^rename\s+to\s+("[^"]+"|\w+)/i.exec(m[3]);
          if (rn) { policies.delete(`${norm(m[2])}|${m[1].replace(/"/g, '').toLowerCase()}`); p.nome = rn[1].replace(/"/g, ''); policies.set(`${norm(m[2])}|${p.nome.toLowerCase()}`, p); }
          const rl = rn ? null : /\bto\s+([\w",\s]+?)(?=\s+(?:using|with)\b|$)/i.exec(m[3]); if (rl) p.roles = rl[1].replace(/[\s"]/g, '').toLowerCase();
          const u = /\busing\s*\(/i.exec(m[3]); const c = /\bwith\s+check\s*\(/i.exec(m[3]);
          if (u) p.using = corpoParenteses(m[3].slice(u.index)).replace(/\s+/g, ' ').trim();
          if (c) p.check = corpoParenteses(m[3].slice(c.index)).replace(/\s+/g, ' ').trim();
        }
      } else if ((m = re(String.raw`^drop\s+policy\s+(?:if\s+exists\s+)?("[^"]+"|\w+)\s+on\s+${TBL}`).exec(st))) {
        policies.delete(`${norm(m[2])}|${m[1].replace(/"/g, '').toLowerCase()}`);
      } else if ((m = re(String.raw`^drop\s+index\s+(?:concurrently\s+)?(?:if\s+exists\s+)?(.+?)(?:\s+(?:cascade|restrict))?$`).exec(st))) {
        const nomes = m[1].split(',').map((x) => norm(x).replace(/^.*\./, ''));
        for (let k = indices.length - 1; k >= 0; k--) if (indices[k].nome && nomes.includes(indices[k].nome)) indices.splice(k, 1);
      } else if ((m = re(String.raw`^create\s+(?:unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?(?:(\S+)\s+)?on\s+(?:only\s+)?${TBL}\s*(?:using\s+\w+\s*)?\(([^)]*)\)`).exec(st))) {
        indices.push({ nome: m[1] ? norm(m[1]).replace(/^.*\./, '') : null, tabela: norm(m[2]), cols: m[3].split(',').map((x) => norm(x.trim().split(/\s+/)[0])) });
      } else if ((m = re(String.raw`^create\s+(?:or\s+replace\s+)?(?:function|procedure)\s+((?:"?\w+"?\.)?"?\w+"?)\s*\(`).exec(st))) {
        const nome = norm(m[1]);
        const cab = st.replace(/\$([^\s$]*)\$[\s\S]*?\$\1\$/, ' ').replace(/\bas\s+'(?:[^']|'')*'/is, ' '); // sem o CORPO (pode citar "set search_path"/"security definer" sem aplicá-lo), mas COM os atributos antes e depois dele
        funcoes.set(fkey(nome, corpoParenteses(st)), { secdef: /\bsecurity\s+definer\b/i.test(cab), searchPath: /\bset\s+"?search_path"?\b/i.test(cab), origem });
      } else if ((m = re(String.raw`^alter\s+function\s+((?:"?\w+"?\.)?"?\w+"?)\s*\(([^)]*)\)\s+(.*)$`, 'is').exec(st))) {
        const f = funcoes.get(fkey(norm(m[1]), m[2]));
        if (f) {
          if (/\breset\s+(?:"?search_path"?|all)\b/i.test(m[3])) f.searchPath = false;
          else if (/\bset\s+"?search_path"?\b/i.test(m[3])) f.searchPath = true;
          if (/\bsecurity\s+definer\b/i.test(m[3])) f.secdef = true; if (/\bsecurity\s+invoker\b/i.test(m[3])) f.secdef = false;
        }
      } else if ((m = re(String.raw`^drop\s+function\s+(?:if\s+exists\s+)?(.+?)(?:\s+(?:cascade|restrict))?$`, 'is').exec(st))) {
        for (const d of m[1].matchAll(/((?:"?\w+"?\.)?"?\w+"?)\s*\(([^)]*)\)/g)) funcoes.delete(fkey(norm(d[1]), d[2]));
      }
  };

  for (const arq of arquivos) {
    for (const st of dividirStatements(readFileSync(join(dirMigrations, arq), 'utf8'))) aplicar(st, arq);
  }
  const aclFechada = new Set([...acl].filter(([, r]) => r.has('anon') && r.has('authenticated')).map(([t]) => t));
  return { tabelas, rls, policies, funcoes, indices, aclFechada, total: arquivos.length };
}

// ---------- regras ----------
// PII "forte": documentos, dados bancários, salário, nascimento. Telefone/endereço/CEP não entram (aparecem em cadastros de entidades).
const PII = /(^|_)(cpf|rg|pis|nis|ctps|titulo_eleitor|salario|agencia|iban|pix|nome_mae|data_nascimento)(_|$)|^conta(_|$)/;
const MONEY = /(valor|salario|total|preco|custo|saldo|remuneracao|desconto|provento|liquido|bruto|inss|irrf|fgts)/;
const FLOAT = /^(real|double precision|float|float4|float8|float\(\d+\)|money)(\[\])?$/;
const exemplos = (xs, n = 8) => xs.slice(0, n);

let cache;
const schema = (cwd) => (cache?.cwd === cwd ? cache.s : (cache = { cwd, s: reconstruirSchema(join(cwd, 'supabase/migrations')) }).s);
const temDir = (cwd) => existsSync(join(cwd, 'supabase/migrations'));
const naoVer = (m) => ({ status: 'nao_verificavel', resumo: m, exemplos: [] });

export const regrasDados = [
  {
    id: 'DADOS-RLS-001', area: 'RLS', semMotor: true, titulo: 'Toda tabela do schema public tem RLS habilitado',
    fonte: 'Boas práticas Supabase; LGPD art. 46 (segurança de dados pessoais)', confianca: 'media', severidade: 'critica',
    acao: 'ALTER TABLE ... ENABLE ROW LEVEL SECURITY + policies por empresa/usuário, em nova migration.',
    run({ cwd }) {
      if (!temDir(cwd)) return naoVer('supabase/migrations não encontrado');
      const s = schema(cwd);
      const sem = [...s.tabelas].filter(([n]) => !s.rls.has(n) && !s.aclFechada.has(n)).map(([n, t]) => ({ n, t, pii: [...t.cols.keys()].filter((c) => PII.test(c)), tenant: t.cols.has('empresa_id') }));
      const graves = sem.filter((x) => x.pii.length || x.tenant);
      return {
        status: graves.length ? 'divergente' : sem.length ? 'revisar' : 'ok',
        resumo: `${s.tabelas.size - sem.length}/${s.tabelas.size} tabelas protegidas (RLS ou REVOKE total de anon/authenticated); ${sem.length} sem proteção detectada (${graves.length} com PII ou empresa_id)`,
        exemplos: exemplos(graves.length ? graves : sem).map((x) => `${x.n} (criada em ${x.t.origem})${x.pii.length ? ` PII: ${x.pii.slice(0, 4).join(',')}` : ''}${x.tenant ? ' [multi-tenant]' : ''}`),
      };
    },
  },
  {
    id: 'DADOS-RLS-002', area: 'RLS', semMotor: true, titulo: 'Sem policy irrestrita (USING true) em tabela com PII ou multi-tenant',
    fonte: 'Incidentes citados em scripts/audit-rls-pii.mjs e audit-rls-tenant-open.mjs', confianca: 'alta', severidade: 'critica',
    acao: 'Restringir a policy por auth.uid()/empresa (get_user_empresas) em nova migration.',
    run({ cwd }) {
      if (!temDir(cwd)) return naoVer('supabase/migrations não encontrado');
      const s = schema(cwd);
      const abertas = [...s.policies.values()].filter((p) => p.roles !== 'service_role' && (/^\(?\s*(?:(?:true|1\s*=\s*1)\s*\)?$|true\s+or\b|[\s\S]*\bor\s+true\s*\)?$)/i.test(p.using || '') || (p.cmd !== 'select' && /^\(?\s*(?:(?:true|1\s*=\s*1)\s*\)?$|true\s+or\b|[\s\S]*\bor\s+true\s*\)?$)/i.test(p.check || ''))));
      const gravidade = (p) => { const t = s.tabelas.get(p.tabela); if (!t) return 0; return [...t.cols.keys()].some((c) => PII.test(c)) ? 2 : 1; }; // só PII real é grave; multi-tenant sem PII = revisar
      const graves = abertas.filter((p) => gravidade(p) === 2);
      return {
        status: graves.length ? 'divergente' : abertas.length ? 'revisar' : 'ok',
        resumo: `${abertas.length} policies irrestritas (${graves.length} em tabela com PII) de ${s.policies.size}; as demais são leitura de catálogo/lookup: conferir se deve ser global`,
        exemplos: exemplos(graves.length ? graves : abertas).map((p) => `${p.tabela}: "${p.nome}" (${p.cmd}, to ${p.roles}) — ${p.origem}`),
      };
    },
  },
  {
    id: 'DADOS-FUNC-001', area: 'Funções', semMotor: true, titulo: 'Funções SECURITY DEFINER fixam search_path',
    fonte: 'Supabase linter 0011 (function_search_path_mutable); scripts/audit-secdef-authz.mjs', confianca: 'alta', severidade: 'alta',
    acao: 'ALTER FUNCTION ... SET search_path = public, pg_temp (ou schema explícito) em nova migration.',
    run({ cwd }) {
      if (!temDir(cwd)) return naoVer('supabase/migrations não encontrado');
      const s = schema(cwd);
      const ruins = [...s.funcoes].filter(([, f]) => f.secdef && !f.searchPath);
      const total = [...s.funcoes].filter(([, f]) => f.secdef).length;
      return { status: ruins.length ? 'divergente' : 'ok', resumo: `${total - ruins.length}/${total} funções SECURITY DEFINER com search_path fixo`, exemplos: exemplos(ruins).map(([n, f]) => `${nomeDe(n)} (${f.origem})`) };
    },
  },
  {
    id: 'DADOS-TIPO-001', area: 'Tipos', semMotor: true, titulo: 'Colunas monetárias em numeric/decimal, nunca float/real',
    fonte: 'Boa prática financeira (erro de ponto flutuante em valores monetários)', confianca: 'alta', severidade: 'alta',
    acao: 'ALTER COLUMN ... TYPE numeric(14,2) USING ...::numeric em nova migration.',
    run({ cwd }) {
      if (!temDir(cwd)) return naoVer('supabase/migrations não encontrado');
      const s = schema(cwd);
      const ruins = [];
      for (const [n, t] of s.tabelas) for (const [c, ty] of t.cols) if (MONEY.test(c) && !/hora|percent|qtd|qtde|quantidade|count|taxa/.test(c) && FLOAT.test(ty.trim())) ruins.push(`${n}.${c} :: ${ty}`);
      return { status: ruins.length ? 'divergente' : 'ok', resumo: `${ruins.length} colunas monetárias em ponto flutuante`, exemplos: exemplos(ruins) };
    },
  },
  {
    id: 'DADOS-ESTR-001', area: 'Estrutura', semMotor: true, titulo: 'Toda tabela tem chave primária',
    fonte: 'Integridade relacional', confianca: 'alta', severidade: 'media',
    run({ cwd }) {
      if (!temDir(cwd)) return naoVer('supabase/migrations não encontrado');
      const s = schema(cwd);
      const sem = [...s.tabelas].filter(([, t]) => !t.pk).map(([n, t]) => `${n} (${t.origem})`);
      return { status: sem.length ? 'revisar' : 'ok', resumo: `${sem.length} tabelas sem PRIMARY KEY detectada`, exemplos: exemplos(sem) };
    },
  },
  {
    id: 'DADOS-ESTR-002', area: 'Desempenho', semMotor: true, titulo: 'Chaves estrangeiras têm índice na coluna de origem',
    fonte: 'Supabase linter 0001 (unindexed_foreign_keys)', confianca: 'media', severidade: 'media',
    acao: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS em nova migration (melhoria de desempenho de joins e deletes em cascata).',
    run({ cwd }) {
      if (!temDir(cwd)) return naoVer('supabase/migrations não encontrado');
      const s = schema(cwd);
      const idx = new Map();
      for (const i of s.indices) { if (!idx.has(i.tabela)) idx.set(i.tabela, new Set()); idx.get(i.tabela).add(i.cols[0]); }
      const sem = []; let total = 0;
      for (const [n, t] of s.tabelas) for (const fk of t.fks) { total++; const lead = fk.cols[0]; const cobre = idx.get(n)?.has(lead); if (!cobre) sem.push(`${n}.${fk.cols.join(',')} → ${fk.ref} (${fk.origem})`); }
      return { status: sem.length ? 'revisar' : 'ok', resumo: `${sem.length}/${total} FKs sem índice dedicado (PK, UNIQUE e CREATE INDEX são considerados; DROP INDEX também)`, exemplos: exemplos(sem) };
    },
  },
  {
    id: 'DADOS-CFG-001', area: 'Config', semMotor: true, titulo: 'Configuração de segurança das edge functions (gate estático do projeto)',
    fonte: 'scripts/audit-security-config.mjs (E-077)', confianca: 'alta', severidade: 'alta',
    run({ cwd }) {
      const f = join(cwd, 'scripts/audit-security-config.mjs');
      if (!existsSync(f)) return naoVer('gate não existe nesta versão');
      const r = spawnSync('node', [f], { cwd, encoding: 'utf8', timeout: 120000 });
      return { status: r.status === 0 ? 'ok' : 'divergente', resumo: r.status === 0 ? 'gate aprovado' : 'gate reprovou', exemplos: r.status === 0 ? [] : (r.stdout + r.stderr).split('\n').filter(Boolean).slice(0, 6) };
    },
  },
  {
    id: 'DADOS-GATE-001', area: 'Gates', semMotor: true, titulo: 'Os gates de banco do projeto realmente executam (e não passam em silêncio)',
    fonte: 'scripts/audit-rls-pii.mjs, audit-rls-least-privilege.mjs, audit-rls-tenant-open.mjs, audit-secdef-authz.mjs, audit-db-search-path.mjs', confianca: 'alta', severidade: 'alta',
    acao: 'Rodar com DATABASE_URL de um banco de validação (não de produção) e/ou fazer o gate falhar quando exigido por CI (ver test:db-audit-contract).',
    run({ cwd }) {
      const gates = ['audit-rls-pii', 'audit-rls-least-privilege', 'audit-rls-tenant-open', 'audit-secdef-authz', 'audit-db-search-path'].filter((g) => existsSync(join(cwd, `scripts/${g}.mjs`)));
      if (process.env.DATABASE_URL || process.env.PGHOST) return naoVer('há conexão configurada: rode os gates diretamente (bun run audit:rls-pii etc.)');
      return { status: 'nao_verificavel', resumo: `${gates.length} gates de banco NÃO foram executados (sem DATABASE_URL/PGHOST); localmente e em runners sem banco eles saem com sucesso sem verificar nada`, exemplos: gates };
    },
  },
];

// As regras que usam o replay estático das migrations (RLS, FUNC, TIPO, ESTR) devem dizer o que são: uma APROXIMAÇÃO. Validada
// contra um Postgres 16 real em 09/11/2026: precisão/recall ~97–100% nas categorias principais, mas com falsos verdes conhecidos
// (SQL dinâmico por format(), policies/ACL criadas em função chamada por SELECT, DO com condição avaliada só em execução).
export const AVISO_REPLAY = ' [replay estático das migrations: indicativo, NÃO prova; confirme no banco real]';
for (const r of regrasDados) {
  if (!/^DADOS-(RLS|FUNC|TIPO|ESTR)-/.test(r.id)) continue;
  const run = r.run;
  r.run = (ctx) => { const x = run(ctx); return x.status === 'nao_verificavel' ? x : { ...x, resumo: `${x.resumo}${AVISO_REPLAY}` }; };
}
