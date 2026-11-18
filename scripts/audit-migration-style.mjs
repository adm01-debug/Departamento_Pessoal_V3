#!/usr/bin/env node

/**
 * Gate estático (sem DATABASE_URL): reprova migration nova com
 * `DROP POLICY IF EXISTS` solto -- sem verificação fail-closed no mesmo
 * arquivo e sem exceção anotada e revisada.
 *
 * O INCIDENTE QUE MOTIVOU ESTE GATE (A-036, E50-12)
 * `DROP POLICY IF EXISTS "nome"` é silencioso por natureza: se o nome não
 * bater exatamente (acento, cedilha, espaço), o Postgres não dropa nada e
 * não avisa nada. O lote de migrations de 19-31/07/2026 fez exatamente
 * isso -- passou no CI, ficou meses no repositório parecendo aplicado,
 * enquanto a policy antiga e insegura continuava viva em produção ao lado
 * da nova (policies PERMISSIVE se combinam por OU: a nova não protege
 * enquanto a antiga continuar lá).
 *
 * O QUE É EXIGIDO
 * Toda ocorrência de `DROP POLICY IF EXISTS` numa migration NOVA (versão >=
 * CUTOFF_VERSION -- não reprova retroativamente o histórico já aplicado)
 * precisa de uma das duas coisas:
 *   1. Verificação fail-closed NO MESMO ARQUIVO **referenciando a mesma
 *      policy ou tabela** do DROP: o arquivo consulta `pg_policies` E usa
 *      `RAISE EXCEPTION` E cita, entre aspas, o nome da policy dropada ou
 *      o nome da tabela (padrão de supabase/migrations/_template.sql).
 *      Pareado por nome, não por arquivo inteiro -- ver nota de segurança
 *      abaixo.
 *   2. Exceção anotada imediatamente acima da linha do DROP:
 *      `-- audit-migration-style: allow-silent-drop <motivo>`
 *
 * NOTA DE SEGURANÇA (achado em auditoria adversarial, 24/09/2026)
 * A primeira versão deste gate checava `pg_policies`+`RAISE EXCEPTION` em
 * QUALQUER lugar do arquivo, sem parear com o DROP específico -- um DROP
 * POLICY IF EXISTS genuinamente solto passava despercebido bastando o
 * arquivo conter qualquer OUTRO bloco fail-closed não relacionado
 * (ex.: verificação de uma policy diferente, em outra tabela). Isso
 * reproduzia exatamente o padrão do incidente original (A-036) disfarçado.
 * Corrigido para exigir que o bloco de verificação cite o nome exato da
 * policy ou da tabela sendo dropada.
 *
 * O QUE NÃO É AVALIADO
 * - `DROP POLICY` sem `IF EXISTS` (falha alto e claro sozinho, sem gate).
 * - Migrations já aplicadas antes deste gate existir -- CUTOFF_VERSION.
 * - Pareamento por nome ainda não é 100% preciso: um bloco fail-closed que
 *   cite a TABELA certa mas verifique uma POLICY diferente na mesma tabela
 *   passaria. Combater isso exigiria parsear o SQL de verdade; heurística
 *   por nome já fecha o bypass encontrado sem esse custo.
 *
 * Saída: 0 limpo, 1 com migration nova reprovada.
 */
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const migrationsDir = resolve(import.meta.dirname, '../supabase/migrations');

// Migrations com versão >= este timestamp são "novas" para este gate --
// tudo antes já foi aplicado e não é reavaliado retroativamente.
const CUTOFF_VERSION = '20260924300000';

const DROP_POLICY_RE =
  /^\s*DROP\s+POLICY\s+IF\s+EXISTS\s+"?([A-Za-z0-9_]+)"?\s+ON\s+(?:"?[A-Za-z0-9_]+"?\.)?"?([A-Za-z0-9_]+)"?/i;
const ALLOW_ANNOTATION_RE = /^\s*--\s*audit-migration-style:\s*allow-silent-drop\b/i;

// Duas portas de RLS permissiva, derivadas de uma migration real que ficou fora
// da `main` justamente por reabrir isto (docs/auditoria/sql-preservado/README.md):
//
//   USING (empresa_id = user_empresa_id() OR empresa_id IS NULL
//          OR auth.jwt() ->> 'role' IN ('admin','super_admin'))
//
// 1. `empresa_id IS NULL` numa policy libera toda linha de tenant nulo para
//    QUALQUER usuário autenticado de QUALQUER empresa — uma linha basta para
//    vazar entre inquilinos. A `main` exige `empresa_id IS NOT NULL`.
// 2. Autorização lida de `auth.jwt()` é payload de token, não fonte de verdade
//    do servidor. A `main` decide por `public.is_admin(auth.uid())` /
//    `rls_tenant_or_admin()`, e tem invariantes de banco exigindo isso.
//
// `"empresa_id"` entre aspas é o MESMO identificador para o PostgreSQL, então a
// detecção aceita as duas formas — sem isso a guarda era contornável trocando
// `empresa_id` por `"empresa_id"`.
const POLICY_NULL_TENANT_RE = /(?:"empresa_id"|\bempresa_id\b)\s+IS\s+NULL\b/i;
const POLICY_JWT_AUTHZ_RE = /\bauth\s*\.\s*jwt\s*\(\s*\)/i;

// Nome entre aspas pode conter espaço (`CREATE POLICY "Leitura global"`), e
// capturar só `[A-Za-z0-9_]+` truncava no primeiro token: a anotação de
// `"Leitura global"` passava a liberar `"Leitura"` também. Global (`g`) porque
// a varredura não exige mais que o statement COMECE com CREATE POLICY — uma
// policy criada dentro de `DO $$ ... $$` tem de ser inspecionada igual.
const CREATE_POLICY_GLOBAL_RE = /CREATE\s+POLICY\s+(?:"([^"]+)"|([A-Za-z0-9_]+))/gi;

/** Substitui um trecho por espaços preservando os `\n`, para que o texto
 *  limpo tenha o MESMO comprimento do original e o índice de cada achado
 *  continue mapeando na linha certa do arquivo. */
function mascarar(trecho) {
  return trecho.replace(/[^\n]/g, ' ');
}

/**
 * Neutraliza o que não é código executável, preservando posições.
 *
 * Varredura ÚNICA da esquerda para a direita. A versão anterior fazia três
 * passadas de regex independentes (comentários → dollar-quoted → aspas
 * simples) e cada uma ignorava o estado léxico das outras. Os revisores da
 * PR #681 acharam três fugas reais, todas reproduzidas antes da correção:
 *
 *  1. `COMMENT ON t IS '--'; CREATE POLICY ...` — o `--` dentro do literal era
 *     lido como comentário de linha e apagava a policy da mesma linha.
 *  2. `IS 'x IS $$'` ... policy ... `IS 'fim $$'` — os dois `$$` dentro de
 *     literais se pareavam como um dollar-quote e, como o texto anterior
 *     terminava em `IS`, o corpo (com a policy dentro) era descartado.
 *  3. `IS 'linha um\nfim'; CREATE POLICY ... 'role' ...` — a aspa de fecho do
 *     literal multilinha se pareava com a aspa seguinte da MESMA linha e
 *     mascarava a policy entre elas.
 *
 * Com um só varredor isso não acontece: quem abre primeiro consome o trecho.
 *
 * Regras por token:
 *  - `--` até fim de linha e `/* *\/` (aninhável, como no PostgreSQL): máscara.
 *  - `'...'` (com `''`, e com `\` quando é `E'...'`), podendo atravessar
 *    linhas: máscara.
 *  - `"..."`: identificador — NÃO mascara, só atravessa. O nome da policy vive
 *    aqui e precisa continuar legível para a captura; mas `--` ou `'` dentro
 *    dele não pode virar delimitador.
 *  - `$tag$ ... $tag$`: o corpo de `DO $$ ... $$` e de
 *    `CREATE FUNCTION ... AS $$ ... $$` é EXECUTÁVEL e pode criar policy, então
 *    continua sendo varrido. Só é descartado quando a palavra imediatamente
 *    anterior é `IS` (o caso `COMMENT ON ... IS $doc$ ... $doc$`, que é texto).
 *    Fail-closed: em qualquer outra posição o corpo permanece e é inspecionado.
 *  - Delimitador sem fechamento no arquivo: mantém o resto (fail-closed).
 *
 * Decisão deliberada: dentro de um corpo dollar-quoted MANTIDO (o executável),
 * os literais NÃO são mascarados. É assim que
 * `EXECUTE 'CREATE POLICY ... empresa_id IS NULL'` dentro de `DO $$ ... $$`
 * continua visível para a guarda — SQL dinâmico cria policy de verdade, e é
 * justamente ali que uma permissiva passaria sem ser vista. O preço é falso
 * positivo possível (texto dentro do corpo), que é anotável; o inverso seria
 * um furo. Foi medindo isso que apareceu
 * `20261002103000_p0_fix_audit_critical_gaps.sql:112`, uma policy real que o
 * tokenizador anterior nunca avaliou.
 *
 * A máscara troca cada caractere por espaço e preserva `\n`, então as posições
 * e os números de linha continuam valendo.
 */
function limparPreservandoPosicao(sql) {
  const n = sql.length;
  const ehIdent = (c) => c !== undefined && /[A-Za-z0-9_]/.test(c);
  let out = '';
  let i = 0;

  while (i < n) {
    const c = sql[i];

    if (c === '-' && sql[i + 1] === '-') {
      let j = sql.indexOf('\n', i);
      if (j === -1) j = n;
      out += mascarar(sql.slice(i, j));
      i = j;
      continue;
    }

    if (c === '/' && sql[i + 1] === '*') {
      let nivel = 1;
      let j = i + 2;
      while (j < n && nivel > 0) {
        if (sql[j] === '/' && sql[j + 1] === '*') {
          nivel += 1;
          j += 2;
        } else if (sql[j] === '*' && sql[j + 1] === '/') {
          nivel -= 1;
          j += 2;
        } else {
          j += 1;
        }
      }
      out += mascarar(sql.slice(i, j));
      i = j;
      continue;
    }

    if (c === "'") {
      const comBarra = /[eE]/.test(sql[i - 1] ?? '') && !ehIdent(sql[i - 2]);
      let j = i + 1;
      while (j < n) {
        if (comBarra && sql[j] === '\\') {
          j += 2;
        } else if (sql[j] === "'" && sql[j + 1] === "'") {
          j += 2;
        } else if (sql[j] === "'") {
          j += 1;
          break;
        } else {
          j += 1;
        }
      }
      const fim = Math.min(j, n);
      out += mascarar(sql.slice(i, fim));
      i = fim;
      continue;
    }

    if (c === '"') {
      let j = i + 1;
      while (j < n) {
        if (sql[j] === '"' && sql[j + 1] === '"') {
          j += 2;
        } else if (sql[j] === '"') {
          j += 1;
          break;
        } else {
          j += 1;
        }
      }
      const fim = Math.min(j, n);
      out += sql.slice(i, fim);
      i = fim;
      continue;
    }

    if (c === '$' && !ehIdent(sql[i - 1])) {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i));
      if (m) {
        const delim = m[0];
        const fecha = sql.indexOf(delim, i + delim.length);
        if (fecha === -1) {
          out += sql.slice(i);
          i = n;
          continue;
        }
        const ehLiteral = /\bIS$/i.test(out.replace(/\s+$/, ''));
        const corpo = sql.slice(i + delim.length, fecha);
        out += mascarar(delim) + (ehLiteral ? mascarar(corpo) : corpo) + mascarar(delim);
        i = fecha + delim.length;
        continue;
      }
    }

    out += c;
    i += 1;
  }

  return out;
}

/**
 * Escape hatch explícito. O nome da policy vai ENTRE ASPAS DUPLAS na anotação:
 * sem isso, `allow-null-tenant ... Leitura global` liberava a policy `Leitura`,
 * porque o nome dela aparece dentro do outro nome.
 */
function temAnotacaoPara(rawContent, tipo, policyName) {
  const re = new RegExp(`^\\s*--\\s*audit-migration-style:\\s*${tipo}\\b.*"${escapeRegex(policyName)}"`, 'im');
  return re.test(rawContent);
}

/** Detecção pura, para o laço de arquivos e para o `--selftest`. */
function analisarPolicies(raw) {
  const limpo = limparPreservandoPosicao(raw);
  const violacoes = [];
  let policies = 0;

  CREATE_POLICY_GLOBAL_RE.lastIndex = 0;
  for (let m; (m = CREATE_POLICY_GLOBAL_RE.exec(limpo)) !== null;) {
    policies += 1;
    const policyName = m[1] ?? m[2];
    const fim = limpo.indexOf(';', m.index);
    const stmt = limpo.slice(m.index, fim === -1 ? limpo.length : fim);
    const lineNo = raw.slice(0, m.index).split('\n').length;

    if (POLICY_NULL_TENANT_RE.test(stmt) && !temAnotacaoPara(raw, 'allow-null-tenant', policyName)) {
      violacoes.push({
        policyName,
        lineNo,
        tipo: 'allow-null-tenant',
        porque: '`empresa_id IS NULL` libera linhas de tenant nulo para qualquer empresa',
      });
    }
    if (POLICY_JWT_AUTHZ_RE.test(stmt) && !temAnotacaoPara(raw, 'allow-jwt-authz', policyName)) {
      violacoes.push({
        policyName,
        lineNo,
        tipo: 'allow-jwt-authz',
        porque: 'autorização vinda de `auth.jwt()` em vez de is_admin(auth.uid()) / rls_tenant_or_admin()',
      });
    }
  }

  return { policies, violacoes };
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasFailClosedGuardFor(contentWithoutDropLine, policyName, tableName) {
  if (!/pg_policies/i.test(contentWithoutDropLine) || !/RAISE\s+EXCEPTION/i.test(contentWithoutDropLine)) {
    return false;
  }
  const policyRe = new RegExp(`['"\`]${escapeRegex(policyName)}['"\`]`, 'i');
  const tableRe = new RegExp(`['"\`]${escapeRegex(tableName)}['"\`]`, 'i');
  return policyRe.test(contentWithoutDropLine) || tableRe.test(contentWithoutDropLine);
}

// ── `--selftest`: matriz de regressão da guarda de RLS permissiva ───────────
// `scripts/` não é coletado pelo vitest (vitest.config.ts só inclui `src/**`),
// e foi por falta de regressão que quatro bypasses passaram na primeira versão
// desta guarda. Rodar: `node scripts/audit-migration-style.mjs --selftest`.
if (process.argv.includes('--selftest')) {
  const CASOS = [
    {
      nome: 'policy da muri, literal — tem de REPROVAR nos dois defeitos',
      sql: `CREATE POLICY "teste_select" ON public.admissoes
  FOR SELECT TO authenticated
  USING (
    empresa_id = public.user_empresa_id()
    OR empresa_id IS NULL
    OR auth.jwt() ->> 'role' IN ('admin', 'super_admin')
  );`,
      espera: ['allow-null-tenant', 'allow-jwt-authz'],
    },
    {
      nome: 'a mesma, com as duas anotações citando a policy entre aspas — PASSA',
      sql: `-- audit-migration-style: allow-null-tenant motivo "teste_select"
-- audit-migration-style: allow-jwt-authz motivo "teste_select"
CREATE POLICY "teste_select" ON public.admissoes
  FOR SELECT TO authenticated
  USING (empresa_id IS NULL OR auth.jwt() ->> 'role' = 'admin');`,
      espera: [],
    },
    {
      nome: 'identificador entre aspas `"empresa_id" IS NULL` — tem de REPROVAR',
      sql: `CREATE POLICY p ON public.admissoes FOR SELECT TO authenticated
  USING ("empresa_id" IS NULL);`,
      espera: ['allow-null-tenant'],
    },
    {
      nome: 'COMMENT ON com exemplo dollar-quoted — NÃO pode reprovar',
      sql: `COMMENT ON TABLE public.admissoes IS $doc$Exemplo de policy proibida:; CREATE POLICY p ON public.admissoes USING (empresa_id IS NULL);$doc$;`,
      espera: [],
    },
    {
      nome: 'policy dentro de bloco DO — tem de REPROVAR nos dois defeitos',
      sql: `DO $$
BEGIN
  CREATE POLICY "dentro_do_do" ON public.admissoes FOR SELECT TO authenticated
    USING (empresa_id IS NULL OR auth.jwt() ->> 'role' = 'admin');
END $$`,
      espera: ['allow-null-tenant', 'allow-jwt-authz'],
    },
    {
      nome: 'anotação de "Leitura global" NÃO pode liberar a policy "Leitura"',
      sql: `-- audit-migration-style: allow-null-tenant motivo "Leitura global"
CREATE POLICY "Leitura" ON public.admissoes FOR SELECT TO authenticated
  USING (empresa_id IS NULL);`,
      espera: ['allow-null-tenant'],
    },
    {
      nome: 'fuga 1: marcador -- dentro de literal NÃO pode esconder a policy da linha',
      sql: `COMMENT ON TABLE public.admissoes IS '--'; CREATE POLICY b1 ON public.admissoes FOR SELECT TO authenticated USING (empresa_id IS NULL);`,
      espera: ['allow-null-tenant'],
    },
    {
      nome: 'fuga 2: $$ dentro de dois literais NÃO pode parear e engolir a policy',
      sql: `COMMENT ON TABLE public.admissoes IS 'exemplo onde x IS ${'$$'}';
CREATE POLICY b2 ON public.admissoes FOR SELECT TO authenticated USING (empresa_id IS NULL);
COMMENT ON TABLE public.admissoes IS 'fim ${'$$'}';`,
      espera: ['allow-null-tenant'],
    },
    {
      nome: 'fuga 3: aspa de fecho de literal multilinha NÃO pode mascarar a policy',
      sql: `COMMENT ON TABLE public.admissoes IS 'linha um
fim'; CREATE POLICY b3 ON public.admissoes FOR SELECT TO authenticated USING (empresa_id IS NULL OR auth.jwt() ->> 'role' = 'admin');`,
      espera: ['allow-null-tenant', 'allow-jwt-authz'],
    },
    {
      nome: 'comentário de bloco aninhado é neutralizado por inteiro',
      sql: `/* fora /* dentro: CREATE POLICY p ON public.admissoes USING (empresa_id IS NULL); */ ainda fora */
CREATE POLICY ok2 ON public.admissoes FOR SELECT TO authenticated
  USING (empresa_id IS NOT NULL AND public.is_admin(auth.uid()));`,
      espera: [],
    },
    {
      nome: 'nome de policy entre aspas duplas com aspa simples dentro continua legível',
      sql: `CREATE POLICY "leitura d'area" ON public.admissoes FOR SELECT TO authenticated
  USING (empresa_id IS NULL);`,
      espera: ['allow-null-tenant'],
    },
    {
      nome: 'fuga 4: policy permissiva via EXECUTE dentro de DO — tem de REPROVAR',
      sql: `DO $$
BEGIN
  EXECUTE 'CREATE POLICY "via_execute" ON public.admissoes FOR SELECT TO authenticated USING (empresa_id IS NULL)';
END $$;`,
      espera: ['allow-null-tenant'],
    },
    {
      nome: 'policy correta (IS NOT NULL + is_admin) — PASSA',
      sql: `CREATE POLICY ok_select ON public.admissoes FOR SELECT TO authenticated
  USING ((empresa_id IS NOT NULL AND empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
         OR public.is_admin(auth.uid()));`,
      espera: [],
    },
  ];

  let falhas = 0;
  for (const caso of CASOS) {
    const { violacoes } = analisarPolicies(caso.sql);
    const obtido = violacoes.map((v) => v.tipo).sort();
    const esperado = [...caso.espera].sort();
    const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
    if (!ok) {
      falhas += 1;
      console.error(`❌ ${caso.nome}`);
      console.error(`   esperado: [${esperado.join(', ')}] | obtido: [${obtido.join(', ')}]`);
    } else {
      console.log(`✅ ${caso.nome}`);
    }
  }
  if (falhas > 0) {
    console.error(`\n${falhas} de ${CASOS.length} caso(s) do selftest falharam.`);
    process.exit(1);
  }
  console.log(`\n✅ selftest: ${CASOS.length} casos, todos como esperado.`);
  process.exit(0);
}

let entries;
try {
  entries = await readdir(migrationsDir);
} catch (err) {
  console.error(`❌ audit-migration-style: diretório de migrations não encontrado: ${migrationsDir}`);
  console.error(`   ${String(err.message || err)}`);
  process.exit(1);
}

const migrationFiles = entries
  .filter((name) => /^\d{14}_.+\.sql$/.test(name))
  .filter((name) => name.split('_')[0] >= CUTOFF_VERSION)
  .sort();

// Guard de falso verde: o corte é histórico, então 0 migrations avaliadas
// significa diretório esvaziado ou padrão de nome quebrado -- não "tudo limpo".
if (migrationFiles.length === 0) {
  console.error(
    `❌ audit-migration-style: nenhuma migration >= ${CUTOFF_VERSION} em ${migrationsDir} — nada foi avaliado.`
  );
  process.exit(1);
}

let failures = 0;
// Conta arquivos que possuem algum DROP POLICY IF EXISTS (guardado ou não),
// para o relatório mostrar o escopo real da varredura.
let filesWithAnyDrop = 0;

for (const fileName of migrationFiles) {
  const path = resolve(migrationsDir, fileName);
  const content = await readFile(path, 'utf8');
  const lines = content.split('\n');

  const hasAnyDrop = lines.some((line) => DROP_POLICY_RE.test(line));
  if (hasAnyDrop) filesWithAnyDrop += 1;

  const unguardedDrops = [];
  lines.forEach((line, i) => {
    const match = DROP_POLICY_RE.exec(line);
    if (!match) return;
    const prevLine = lines[i - 1] ?? '';
    if (ALLOW_ANNOTATION_RE.test(prevLine)) return;
    const [, policyName, tableName] = match;
    // Exclui a própria linha do DROP da busca -- ela sempre contém o nome
    // da policy entre aspas (é o que está sendo dropado), então buscar no
    // conteúdo inteiro sem excluir essa linha faria a checagem "achar" o
    // nome ali mesmo, sem exigir nenhuma verificação de fato separada.
    const contentWithoutThisDrop = lines.filter((_, idx) => idx !== i).join('\n');
    if (hasFailClosedGuardFor(contentWithoutThisDrop, policyName, tableName)) return;
    unguardedDrops.push({ lineNo: i + 1, text: line.trim(), policyName, tableName });
  });

  if (unguardedDrops.length === 0) continue;
  failures += 1;
  console.error(`❌ ${fileName}`);
  for (const drop of unguardedDrops) {
    console.error(`   linha ${drop.lineNo}: ${drop.text}`);
  }
  console.error(
    '   DROP POLICY IF EXISTS sem verificação fail-closed que cite a policy ou tabela (pg_policies + ' +
      'RAISE EXCEPTION + nome entre aspas, ver supabase/migrations/_template.sql) e sem ' +
      '"-- audit-migration-style: allow-silent-drop <motivo>" na linha imediatamente acima.'
  );
}

if (failures > 0) {
  console.error(
    `\n${failures} migration(s) nova(s) com DROP POLICY IF EXISTS solto ` +
      `(de ${filesWithAnyDrop} com DROP, ${migrationFiles.length} migrations avaliadas desde ${CUTOFF_VERSION}).`
  );
  process.exit(1);
}

// ── Segunda passada: policy permissiva (tenant nulo / authz por JWT) ─────────
let rlsFailures = 0;
let policiesAvaliadas = 0;

for (const fileName of migrationFiles) {
  const raw = await readFile(resolve(migrationsDir, fileName), 'utf8');
  const { policies, violacoes } = analisarPolicies(raw);
  policiesAvaliadas += policies;

  if (violacoes.length === 0) continue;
  rlsFailures += 1;
  console.error(`❌ ${fileName}`);
  for (const v of violacoes) {
    console.error(`   linha ${v.lineNo} — policy "${v.policyName}": ${v.porque}`);
    console.error(`   Se for intencional: -- audit-migration-style: ${v.tipo} <motivo> "${v.policyName}"`);
  }
}

if (rlsFailures > 0) {
  console.error(
    `\n${rlsFailures} migration(s) nova(s) com policy permissiva ` +
      `(de ${policiesAvaliadas} CREATE POLICY avaliadas desde ${CUTOFF_VERSION}).`
  );
  process.exit(1);
}

console.log(
  `✅ audit-migration-style: ${migrationFiles.length} migration(s) desde ${CUTOFF_VERSION} sem DROP POLICY solto, ${policiesAvaliadas} policy(s) sem tenant nulo nem authz por JWT` +
    (filesWithAnyDrop > 0 ? ` (${filesWithAnyDrop} com DROP guardado OK)` : '') +
    '.'
);
