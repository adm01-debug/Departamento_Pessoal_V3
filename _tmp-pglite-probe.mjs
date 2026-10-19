import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
await db.exec(`
create table t(id int);
create table log(id int);
create function f() returns trigger language plpgsql as $fn$
begin
  insert into log values (new.id);
  return null;
end;
$fn$;
create trigger x after insert on t for each row execute function f();
`);
await db.exec('insert into t values (7)');
const r = await db.query('select count(*)::int as n from log');
console.log('RESULT', JSON.stringify(r.rows));
await db.close();
