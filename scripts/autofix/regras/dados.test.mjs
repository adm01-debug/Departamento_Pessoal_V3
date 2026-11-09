// Regressão do replay estático de migrations (dados.mjs). Cada caso é um FALSO VERDE (dizer "protegido" quando não está)
// ou um falso alarme que a auditoria adversarial de 09/11/2026 reproduziu. Rodar: node --test scripts/autofix/regras/dados.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { reconstruirSchema, dividirStatements, regrasDados } from './dados.mjs';

const mk = (t, sql) => {
  const root = mkdtempSync(join(tmpdir(), 'dados-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'supabase/migrations'), { recursive: true });
  const arqs = Array.isArray(sql) ? sql : [sql];
  arqs.forEach((s, i) => writeFileSync(join(root, `supabase/migrations/00${i + 1}.sql`), s));
  return root;
};
const schema = (t, sql) => reconstruirSchema(join(mk(t, sql), 'supabase/migrations'));
const regra = (id) => regrasDados.find((r) => r.id === id);
const nomes = (s) => [...s.funcoes].map(([k, f]) => `${k}:${f.secdef ? 'D' : 'I'}:${f.searchPath ? 'SP' : 'SEM'}`).sort();

test('tokenizador: comentário de bloco aninhado e dollar-quote aninhado', () => {
  assert.equal(dividirStatements('select 1 /* a /* b; */ c; */; select 2;').length, 2);
  assert.equal(dividirStatements('CREATE FUNCTION f() RETURNS void AS $a$ BEGIN EXECUTE $b$ select 1; select 2; $b$; END $a$ LANGUAGE plpgsql; select 1;').length, 2);
});

test('CREATE POLICY "nua" dentro de DO (idiom EXCEPTION duplicate_object) é vista', (t) => {
  const s = schema(t, "create table a(id int, cpf text); alter table a enable row level security; DO $$ BEGIN CREATE POLICY p ON a FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;");
  assert.ok(s.policies.has('a|p'));
});

test('DO que só VERIFICA (cita pg_class e "enable row level security") não marca tabelas como protegidas', (t) => {
  const s = schema(t, "create table a(id int); create table b(id int); DO $$ BEGIN IF EXISTS (select 1 from pg_class) THEN RAISE NOTICE 'precisa enable row level security'; END IF; END $$;");
  assert.equal(s.rls.size, 0);
});

test('função: o CORPO que cita "set search_path"/"security definer" não conta; atributos APÓS o corpo contam', (t) => {
  const s = schema(t, [
    "CREATE FUNCTION c() RETURNS void AS $$ begin execute 'set search_path = public'; -- security definer\nend $$ LANGUAGE plpgsql;",
    "CREATE FUNCTION a() RETURNS int AS $$ select 1 $$ LANGUAGE sql SECURITY DEFINER;",
  ]);
  assert.deepEqual(nomes(s), ['a():D:SEM', 'c():I:SEM']);
});

test('função: sobrecarga é distinguida por tipo (f(int) sem SP não é escondida por f(text) com SP)', (t) => {
  const s = schema(t, "CREATE FUNCTION f(p int) RETURNS int SECURITY DEFINER AS $$ select 1 $$ LANGUAGE sql; CREATE FUNCTION f(p text) RETURNS int SECURITY DEFINER SET search_path='' AS $$ select 1 $$ LANGUAGE sql;");
  assert.deepEqual(nomes(s), ['f(integer):D:SEM', 'f(text):D:SP']);
});

test('função: RESET search_path remove; DROP FUNCTION remove', (t) => {
  const s = schema(t, "CREATE FUNCTION d() RETURNS int SECURITY DEFINER SET search_path='' AS $$ select 1 $$ LANGUAGE sql; ALTER FUNCTION d() RESET search_path; CREATE FUNCTION e() RETURNS int AS $$ select 1 $$ LANGUAGE sql; DROP FUNCTION e();");
  assert.deepEqual(nomes(s), ['d():D:SEM']);
});

test('loop que APLICA search_path a todas as SECURITY DEFINER (prosecdef + EXECUTE + ALTER FUNCTION) é reconhecido', (t) => {
  const s = schema(t, ["CREATE FUNCTION g() RETURNS int SECURITY DEFINER AS $$ select 1 $$ LANGUAGE sql;",
    "DO $$ DECLARE r record; BEGIN FOR r IN SELECT p.proname FROM pg_proc p WHERE p.prosecdef = true LOOP EXECUTE format('ALTER FUNCTION public.%I() SET search_path = public', r.proname); END LOOP; END $$;"]);
  assert.deepEqual(nomes(s), ['g():D:SP']);
});

test('ACL: PUBLIC não fecha anon/authenticated; DROP+CREATE limpa a ACL; GRANT a PUBLIC reabre', (t) => {
  assert.equal(schema(t, 'create table a(id int); revoke all on table a from public;').aclFechada.has('a'), false);
  assert.equal(schema(t, 'create table a(id int); revoke all on table a from anon, authenticated;').aclFechada.has('a'), true);
  assert.equal(schema(t, 'create table a(id int); revoke all on table a from anon, authenticated; drop table a; create table a(id int);').aclFechada.has('a'), false);
  assert.equal(schema(t, 'create table a(id int); revoke all on table a from anon, authenticated; grant select on table a to public;').aclFechada.has('a'), false);
  assert.equal(schema(t, 'create table a(id int); revoke all (id) on table a from anon, authenticated;').aclFechada.has('a'), false);
});

test('RENAME move o RLS; a tabela recriada com o mesmo nome NÃO herda a proteção', (t) => {
  const s = schema(t, 'create table a(id int); alter table a enable row level security; alter table a rename to a_old; create table a(id int);');
  assert.ok(s.rls.has('a_old'));
  assert.equal(s.rls.has('a'), false);
});

test('ALTER POLICY: muda papéis, renomeia sem corromper os papéis', (t) => {
  const s = schema(t, 'create table a(id int); create policy p on a for select to service_role using (true); alter policy p on a to authenticated; alter policy p on a rename to q;');
  const p = s.policies.get('a|q');
  assert.ok(p);
  assert.equal(p.roles, 'authenticated');
});

test('DROP TABLE a, b com schema; partição e CREATE TABLE AS entram sem RLS', (t) => {
  assert.equal(schema(t, 'create table a(id int); create table b(id int); drop table public.a, public.b;').tabelas.size, 0);
  const s = schema(t, 'create table p(id int) partition by range (id); create table p1 partition of p for values from (0) to (10); create table c as select 1;');
  assert.ok(s.tabelas.has('p1') && s.tabelas.has('c'));
  assert.equal(s.rls.size, 0);
});

test('regra RLS-002: tautologia 1=1 em tabela com PII é divergente; papel entre aspas e service_role não', (t) => {
  const mig = (sql) => regra('DADOS-RLS-002').run({ cwd: mk(t, sql) });
  assert.equal(mig('create table a(cpf text); create policy p on a for select to authenticated using (1=1);').status, 'divergente');
  assert.notEqual(mig('create table a(cpf text); create policy p on a for all to "service_role" using (true);').status, 'divergente');
});

test('regra TIPO-001: double precision, float(53), money e real[] em coluna monetária; hora não', (t) => {
  const r = (sql) => regra('DADOS-TIPO-001').run({ cwd: mk(t, sql) });
  assert.equal(r('create table a(valor double precision);').status, 'divergente');
  assert.equal(r('create table a(salario float(53));').status, 'divergente');
  assert.equal(r('create table a(preco money);').status, 'divergente');
  assert.equal(r('create table a(id int); alter table a add column valor double precision;').status, 'divergente');
  assert.equal(r('create table a(total_horas real);').status, 'ok');
});

test('regra ESTR-002: PK composta, UNIQUE inline e ADD CONSTRAINT UNIQUE contam como índice da FK; DROP INDEX descobre', (t) => {
  const r = (sql) => regra('DADOS-ESTR-002').run({ cwd: mk(t, sql) });
  assert.equal(r('create table p(id int primary key); create table c(p_id int primary key references p);').status, 'ok');
  assert.equal(r('create table p(id int primary key); create table c(p_id int unique references p);').status, 'ok');
  assert.equal(r('create table p(id int primary key); create table c(p_id int references p); create index ix on c(p_id);').status, 'ok');
  assert.equal(r('create table p(id int primary key); create table c(p_id int references p); create index ix on c(p_id); drop index ix;').status, 'revisar');
});

// ---- 2ª auditoria (oráculo Postgres 16): DDL dentro de DO só vale quando o replay sabe que rodou ----
test('DO: RENAME condicional NÃO é aplicado (caso real `ferias`: só renomeia se faltar data_inicio)', (t) => {
  const s = schema(t, "create table ferias(id int, data_inicio date); alter table ferias enable row level security; DO $$ BEGIN IF EXISTS (select 1 from information_schema.tables where table_name='ferias') THEN IF NOT EXISTS (select 1 from information_schema.columns where column_name='data_inicio') THEN ALTER TABLE public.ferias RENAME TO ferias_legacy_003; END IF; END IF; END $$; CREATE TABLE IF NOT EXISTS public.ferias(id int);");
  assert.ok(s.rls.has('ferias'));
  assert.equal(s.tabelas.has('ferias_legacy_003'), false);
});

test('DO: ENABLE RLS dentro de guarda de existência (to_regclass / IF EXISTS catálogo) conta; em IF incerto não', (t) => {
  assert.ok(schema(t, "create table a(id int); DO $$ BEGIN IF to_regclass('public.a') IS NOT NULL THEN EXECUTE 'ALTER TABLE public.a ENABLE ROW LEVEL SECURITY'; END IF; END $$;").rls.has('a'));
  assert.equal(schema(t, "create table a(id int); DO $$ BEGIN IF current_setting('x') = '1' THEN ALTER TABLE a ENABLE ROW LEVEL SECURITY; END IF; END $$;").rls.has('a'), false);
  assert.equal(schema(t, "create table a(id int); DO $$ BEGIN IF true THEN NULL; ELSE ALTER TABLE a ENABLE ROW LEVEL SECURITY; END IF; END $$;").rls.has('a'), false);
});

test('DO: ENABLE depois de RAISE EXCEPTION, em tratador de erro, e literal em RAISE/exclusão não contam', (t) => {
  assert.equal(schema(t, "create table a(id int); DO $$ BEGIN RAISE EXCEPTION 'x'; ALTER TABLE a ENABLE ROW LEVEL SECURITY; END $$;").rls.has('a'), false);
  assert.equal(schema(t, "create table a(id int); DO $$ BEGIN PERFORM 1; EXCEPTION WHEN others THEN ALTER TABLE a ENABLE ROW LEVEL SECURITY; END $$;").rls.has('a'), false);
  assert.equal(schema(t, "create table a(id int); create table b(id int); DO $$ DECLARE r record; BEGIN FOR r IN select tablename from pg_tables where tablename <> 'b' LOOP EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', r.tablename); END LOOP; RAISE NOTICE 'a'; END $$;").rls.has('b'), false);
});

test('DO: array constante de DDL (FOREACH x IN ARRAY) roda; DROP TABLE condicional não apaga a tabela', (t) => {
  const s = schema(t, "create table a(id int, p int references a); DO $$ DECLARE s text; BEGIN FOREACH s IN ARRAY ARRAY['CREATE INDEX IF NOT EXISTS i1 ON public.a(p)'] LOOP EXECUTE s; END LOOP; END $$;");
  assert.ok(s.indices.some((i) => i.tabela === 'a' && i.cols[0] === 'p'));
  assert.ok(schema(t, "create table a(id int); DO $$ BEGIN IF random() > 2 THEN DROP TABLE a; END IF; END $$;").tabelas.has('a'));
});

test('ordem: ENABLE RLS antes do CREATE TABLE não deixa RLS fantasma; identificador com $ não engole o arquivo', (t) => {
  assert.equal(schema(t, 'alter table if exists x enable row level security; create table x(id int);').rls.has('x'), false);
  assert.ok(schema(t, 'create table a$x$y(id int); create table b(id int);').tabelas.has('b'));
});

test('policy aberta: true OR x e x OR true também são abertas; procedure SECURITY DEFINER é vista', (t) => {
  const r = regra('DADOS-RLS-002').run({ cwd: mk(t, 'create table a(cpf text); create policy p on a for select to authenticated using (true or auth.uid() is null);') });
  assert.equal(r.status, 'divergente');
  const s = schema(t, "CREATE PROCEDURE pr() LANGUAGE sql SECURITY DEFINER AS $$ select 1 $$;");
  assert.deepEqual(nomes(s), ['pr():D:SEM']);
});
