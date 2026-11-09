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
    if (c === '/' && d === '*') { const e = sql.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; cur += ' '; continue; }
    if (c === "'") { let j = i + 1; while (j < n) { if (sql[j] === "'" && sql[j + 1] === "'") j += 2; else if (sql[j] === "'") break; else j++; } cur += sql.slice(i, j + 1); i = j + 1; continue; }
    if (c === '"') { const j = sql.indexOf('"', i + 1); const e = j < 0 ? n : j; cur += sql.slice(i, e + 1); i = e + 1; continue; }
    if (c === '$') {
      const m = /^\$([A-Za-z_]\w*)?\$/.exec(sql.slice(i, i + 40));
      if (m) { const e = sql.indexOf(m[0], i + m[0].length); const end = e < 0 ? n : e + m[0].length; cur += sql.slice(i, end); i = end; continue; }
    }
    if (c === ';') { if (cur.trim()) out.push(cur.trim()); cur = ''; i++; continue; }
    cur += c; i++;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const norm = (s) => s.replace(/"/g, '').replace(/^public\./i, '').toLowerCase().trim();
const TBL = String.raw`((?:"?[\w]+"?\.)?"?[\w]+"?)`;
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
  const dinamico = (st, origem) => {
    for (const lit of st.matchAll(/'((?:[^']|'')*)'/g)) {
      const sql = lit[1].replace(/''/g, "'").trim();
      if (/^(alter|drop|create)\s/i.test(sql) && !sql.includes('%')) for (const sub of dividirStatements(sql)) aplicar(sub, origem);
    }
    for (const h of st.matchAll(/_ensure_search_path\s*\(\s*'[^']*'\s*,\s*'([^']+)'/gi)) { const f = funcoes.get(norm(h[1])); if (f) f.searchPath = true; }
    const nomes = [...st.matchAll(/'([A-Za-z_]\w*)'/g)].map((x) => x[1].toLowerCase());
    if (/enable\s+row\s+level\s+security/i.test(st)) {
      if (/pg_tables|information_schema\.tables|pg_class/i.test(st)) for (const n of tabelas.keys()) rls.add(n);
      for (const n of nomes) if (tabelas.has(n)) rls.add(n);
    }
    if (/search_path/i.test(st)) {
      if (/pg_proc|information_schema\.routines/i.test(st)) for (const f of funcoes.values()) f.searchPath = true;
      for (const n of nomes) { const f = funcoes.get(n); if (f) f.searchPath = true; }
      // allowlists por assinatura: 'public.nome(text,text)'
      for (const sig of st.matchAll(/'(?:"?public"?\.)?"?([A-Za-z_]\w*)"?\s*\(/g)) { const f = funcoes.get(sig[1].toLowerCase()); if (f) f.searchPath = true; }
    }
  };

  const aplicar = (st, origem) => {
      let m;
      if ((m = re(String.raw`^(revoke|grant)\s+.*?\bon\s+(?:table\s+)?${TBL}\s+(?:from|to)\s+(.+)$`, 'is').exec(st)) && !/\bon\s+(?:all\s+)?(?:tables|functions|sequences)\s+in\s+schema/i.test(st)) {
        const t = norm(m[2]); const papeis = m[3].toLowerCase().replace(/\s+with\s+.*$/, '').split(',').map((x) => x.trim().replace(/^group\s+/, ''));
        const alvo = papeis.flatMap((x) => (x === 'public' ? ['anon', 'authenticated'] : [x]));
        if (!acl.has(t)) acl.set(t, new Set());
        if (m[1].toLowerCase() === 'revoke' && /^revoke\s+all\b/i.test(st)) for (const r of alvo) acl.get(t).add(r);
        if (m[1].toLowerCase() === 'grant') for (const r of alvo) acl.get(t).delete(r);
        return;
      }
      if (/^do\b/i.test(st) || /(_ensure_search_path|set_search_path)\s*\(/i.test(st)) { dinamico(st, origem); return; }
      if ((m = re(String.raw`^create\s+(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?${TBL}\s*\(`).exec(st))) {
        const nome = norm(m[1]);
        if (nome.includes('.')) return; // outro schema
        const t = { origem, cols: new Map(), pk: false, fks: [] };
        for (const item of splitTopLevel(corpoParenteses(st))) {
          if (/^(constraint\s+\S+\s+)?primary\s+key/i.test(item)) { t.pk = true; continue; }
          const fk = /(?:constraint\s+\S+\s+)?foreign\s+key\s*\(([^)]+)\)\s*references\s+(\S+)/i.exec(item);
          if (fk) { t.fks.push({ cols: fk[1].split(',').map((x) => norm(x)), ref: norm(fk[2].replace(/\(.*/, '')), origem }); continue; }
          if (/^(constraint|unique|check|exclude|like)\b/i.test(item)) continue;
          const col = /^"?(\w+)"?\s+([A-Za-z_][\w ]*?(?:\([^)]*\))?(?:\[\])?)(?:\s|$)/.exec(item);
          if (!col) continue;
          t.cols.set(col[1].toLowerCase(), col[2].toLowerCase());
          if (/primary\s+key/i.test(item)) t.pk = true;
          const inl = /references\s+((?:"?\w+"?\.)?"?\w+"?)/i.exec(item);
          if (inl) t.fks.push({ cols: [col[1].toLowerCase()], ref: norm(inl[1]), origem });
        }
        tabelas.set(nome, t);
      } else if ((m = re(String.raw`^drop\s+table\s+(?:if\s+exists\s+)?(.+)$`).exec(st))) {
        for (const x of m[1].replace(/\s+(cascade|restrict)\s*$/i, '').split(',')) { const n = norm(x); tabelas.delete(n); rls.delete(n); for (const k of [...policies.keys()]) if (k.startsWith(`${n}|`)) policies.delete(k); }
      } else if ((m = re(String.raw`^alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?${TBL}\s+(enable|disable|force)\s+row\s+level\s+security`).exec(st))) {
        const n = norm(m[1]);
        if (m[2].toLowerCase() === 'enable') rls.add(n); else if (m[2].toLowerCase() === 'disable') rls.delete(n);
      } else if ((m = re(String.raw`^alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?${TBL}\s+(.*)$`, 'is').exec(st))) {
        const n = norm(m[1]); const t = tabelas.get(n); if (!t) return;
        for (const acao of splitTopLevel(m[2])) {
          let a;
          if ((a = /^add\s+column\s+(?:if\s+not\s+exists\s+)?"?(\w+)"?\s+([A-Za-z_][\w ]*?(?:\([^)]*\))?(?:\[\])?)(?:\s|$)/i.exec(acao))) {
            t.cols.set(a[1].toLowerCase(), a[2].toLowerCase());
            const inl = /references\s+((?:"?\w+"?\.)?"?\w+"?)/i.exec(acao); if (inl) t.fks.push({ cols: [a[1].toLowerCase()], ref: norm(inl[1]), origem });
          } else if ((a = /^alter\s+column\s+"?(\w+)"?\s+(?:set\s+data\s+)?type\s+([A-Za-z_][\w ]*?(?:\([^)]*\))?)(?:\s|$)/i.exec(acao))) t.cols.set(a[1].toLowerCase(), a[2].toLowerCase());
          else if (/^add\s+(constraint\s+\S+\s+)?primary\s+key/i.test(acao)) t.pk = true;
          else if ((a = /^add\s+(?:constraint\s+\S+\s+)?foreign\s+key\s*\(([^)]+)\)\s*references\s+(\S+)/i.exec(acao))) t.fks.push({ cols: a[1].split(',').map((x) => norm(x)), ref: norm(a[2].replace(/\(.*/, '')), origem });
          else if ((a = /^drop\s+column\s+(?:if\s+exists\s+)?"?(\w+)"?/i.exec(acao))) t.cols.delete(a[1].toLowerCase());
        }
      } else if ((m = re(String.raw`^create\s+policy\s+("[^"]+"|\w+)\s+on\s+${TBL}\s*(.*)$`, 'is').exec(st))) {
        const resto = m[3];
        const cmd = /\bfor\s+(all|select|insert|update|delete)\b/i.exec(resto)?.[1]?.toLowerCase() ?? 'all';
        const roles = /\bto\s+([\w",\s]+?)(?=\s+(?:using|with)\b|$)/i.exec(resto)?.[1]?.replace(/\s+/g, '').toLowerCase() ?? 'public';
        const u = /\busing\s*\(/i.exec(resto); const c = /\bwith\s+check\s*\(/i.exec(resto);
        const body = (idx) => (idx ? corpoParenteses(resto.slice(idx.index)) : '').replace(/\s+/g, ' ').trim();
        policies.set(`${norm(m[2])}|${m[1].replace(/"/g, '').toLowerCase()}`, { tabela: norm(m[2]), nome: m[1].replace(/"/g, ''), cmd, roles, using: body(u), check: body(c), origem });
      } else if ((m = re(String.raw`^alter\s+policy\s+("[^"]+"|\w+)\s+on\s+${TBL}\s*(.*)$`, 'is').exec(st))) {
        const p = policies.get(`${norm(m[2])}|${m[1].replace(/"/g, '').toLowerCase()}`);
        if (p) {
          const u = /\busing\s*\(/i.exec(m[3]); const c = /\bwith\s+check\s*\(/i.exec(m[3]);
          if (u) p.using = corpoParenteses(m[3].slice(u.index)).replace(/\s+/g, ' ').trim();
          if (c) p.check = corpoParenteses(m[3].slice(c.index)).replace(/\s+/g, ' ').trim();
        }
      } else if ((m = re(String.raw`^drop\s+policy\s+(?:if\s+exists\s+)?("[^"]+"|\w+)\s+on\s+${TBL}`).exec(st))) {
        policies.delete(`${norm(m[2])}|${m[1].replace(/"/g, '').toLowerCase()}`);
      } else if ((m = re(String.raw`^create\s+(?:unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?(?:\S+\s+)?on\s+(?:only\s+)?${TBL}\s*(?:using\s+\w+\s*)?\(([^)]*)\)`).exec(st))) {
        indices.push({ tabela: norm(m[1]), cols: m[2].split(',').map((x) => norm(x.trim().split(/\s+/)[0])) });
      } else if ((m = re(String.raw`^create\s+(?:or\s+replace\s+)?function\s+((?:"?\w+"?\.)?"?\w+"?)\s*\(`).exec(st))) {
        const nome = norm(m[1]);
        funcoes.set(nome, { secdef: /\bsecurity\s+definer\b/i.test(st), searchPath: /\bset\s+"?search_path"?\b/i.test(st), origem });
      } else if ((m = re(String.raw`^alter\s+function\s+((?:"?\w+"?\.)?"?\w+"?)\s*\([^)]*\)\s+(.*)$`, 'is').exec(st))) {
        const f = funcoes.get(norm(m[1]));
        if (f) { if (/\bset\s+"?search_path"?\b/i.test(m[2])) f.searchPath = true; if (/\bsecurity\s+definer\b/i.test(m[2])) f.secdef = true; if (/\bsecurity\s+invoker\b/i.test(m[2])) f.secdef = false; }
      }
  };

  for (const arq of arquivos) {
    for (const st of dividirStatements(readFileSync(join(dirMigrations, arq), 'utf8'))) aplicar(st, arq);
  }
  const aclFechada = new Set([...acl].filter(([, r]) => r.has('anon') && r.has('authenticated')).map(([t]) => t));
  return { tabelas, rls, policies, funcoes, indices, aclFechada, total: arquivos.length };
}

// ---------- regras ----------
const PII = /^(cpf|rg|pis|nis|ctps|titulo_eleitor|salario(_\w+)?|conta(_\w+)?|agencia|pix(_\w+)?|iban|data_nascimento|nome_mae|telefone|email_pessoal|endereco|cep)$/;
const MONEY = /(valor|salario|total|preco|custo|saldo|remuneracao|desconto|provento|liquido|bruto|inss|irrf|fgts)/;
const FLOAT = /^(real|double precision|float|float4|float8)$/;
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
      const abertas = [...s.policies.values()].filter((p) => p.roles !== 'service_role' && (/^\(?\s*true\s*\)?$/i.test(p.using || '') || (p.cmd !== 'select' && /^\(?\s*true\s*\)?$/i.test(p.check || ''))));
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
      return { status: ruins.length ? 'divergente' : 'ok', resumo: `${total - ruins.length}/${total} funções SECURITY DEFINER com search_path fixo`, exemplos: exemplos(ruins).map(([n, f]) => `${n} (${f.origem})`) };
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
      for (const [n, t] of s.tabelas) for (const [c, ty] of t.cols) if (MONEY.test(c) && FLOAT.test(ty.trim())) ruins.push(`${n}.${c} :: ${ty}`);
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
      for (const [n, t] of s.tabelas) for (const fk of t.fks) { total++; const lead = fk.cols[0]; const cobre = idx.get(n)?.has(lead) || (t.pk && lead === 'id'); if (!cobre) sem.push(`${n}.${fk.cols.join(',')} → ${fk.ref} (${fk.origem})`); }
      return { status: sem.length ? 'revisar' : 'ok', resumo: `${sem.length}/${total} FKs sem índice dedicado (índices de PK/UNIQUE inline não são vistos: conferir)`, exemplos: exemplos(sem) };
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
