#!/usr/bin/env node
/**
 * =============================================================================
 * VALIDAÇÃO LOCAL DA INFRAESTRUTURA DE IMAGENS DE TREINAMENTO
 * =============================================================================
 * Sobe um PostgreSQL ISOLADO (cluster próprio em tmp-training-images-pg),
 * aplica a migration real e executa:
 *   • bootstrap.sql + seed.sql (schema mínimo + 2 empresas fictícias)
 *   • migration 20261023120000_training_images_infrastructure.sql
 *   • rls.test.sql      — RLS/Storage/constraints/trigger/permissões
 *   • claim.test.sql    — claim atômico (sequencial)
 *   • concorrência real  — 2 sessões psql simultâneas
 *
 * Não toca em banco remoto, não usa credenciais, não chama a OpenAI.
 *
 * Uso:
 *   node scripts/training-images-local/run-tests.mjs [--keep] [--port 55432]
 * Requisitos: binários do PostgreSQL (initdb, pg_ctl, psql). Defina PG_BIN se
 * não estiverem no PATH nem no caminho padrão do Windows.
 * =============================================================================
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const RAIZ = process.cwd();
const DIR = path.join(RAIZ, 'scripts', 'training-images-local');
const DATA = path.join(RAIZ, 'tmp-training-images-pg', 'data');
const LOG = path.join(RAIZ, 'tmp-training-images-pg', 'pg.log');
const MIGRATION = path.join(
  RAIZ,
  'supabase',
  'migrations',
  '20261023120000_training_images_infrastructure.sql'
);
const MIGRATION_RATE_LIMIT = path.join(
  RAIZ,
  'supabase',
  'migrations',
  '20260724120000_atomic_rate_limit_rpc.sql'
);
const MIGRATION_AUTOQUEUE = path.join(
  RAIZ,
  'supabase',
  'migrations',
  '20261023130000_training_image_autoqueue.sql'
);
const MIGRATION_RATE_LIMIT_DUAL = path.join(
  RAIZ,
  'supabase',
  'migrations',
  '20261023140000_edge_rate_limit_dual.sql'
);
const DB = 'training_images_test';

const args = process.argv.slice(2);
const KEEP = args.includes('--keep');
const portaIdx = args.indexOf('--port');
const PORTA = portaIdx >= 0 ? Number(args[portaIdx + 1]) : 55432;

const EMPRESA_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const EMPRESA_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const CURSO_A = 'a0000001-0000-4000-8000-000000000001';
const CURSO_B = 'b0000001-0000-4000-8000-000000000001';

function resolverPgBin() {
  if (process.env.PG_BIN) {
    const sufixo = process.platform === 'win32' ? 'psql.exe' : 'psql';
    if (existsSync(path.join(process.env.PG_BIN, sufixo))) return process.env.PG_BIN;
  }
  // O cluster criado por initdb só pode ser aberto pela MESMA major version.
  let major = null;
  const marcador = path.join(DATA, 'PG_VERSION');
  if (existsSync(marcador)) {
    major = readFileSync(marcador, 'utf8').trim().split('.')[0];
  }
  const candidatos = [
    ...(major
      ? [
          `C:\\Program Files\\PostgreSQL\\${major}\\bin`,
          `/usr/lib/postgresql/${major}/bin`,
          `/usr/local/pgsql-${major}/bin`,
        ]
      : []),
    'C:\\Program Files\\PostgreSQL\\18\\bin',
    'C:\\Program Files\\PostgreSQL\\17\\bin',
    'C:\\Program Files\\PostgreSQL\\16\\bin',
  ];
  for (const candidato of candidatos) {
    if (existsSync(path.join(candidato, process.platform === 'win32' ? 'psql.exe' : 'psql'))) {
      return candidato;
    }
  }
  return '';
}

const PG_BIN = resolverPgBin();
const exe = (nome) =>
  PG_BIN ? path.join(PG_BIN, process.platform === 'win32' ? `${nome}.exe` : nome) : nome;

const falhas = [];
let servidorAtivo = false;
const sessoes = [];

function rodar(nome, comandos, opcoes = {}) {
  const resultado = spawnSync(comandos[0], comandos.slice(1), {
    cwd: RAIZ,
    encoding: 'utf8',
    env: { ...process.env, PGPASSWORD: '', PGCONNECT_TIMEOUT: '5' },
    ...opcoes,
  });
  if (resultado.status !== 0) {
    falhas.push(nome);
    console.error(`\n[FALHOU] ${nome}`);
    console.error((resultado.stderr || resultado.stdout || '').trim().slice(0, 4000));
    return null;
  }
  return `${resultado.stdout ?? ''}${resultado.stderr ?? ''}`;
}

const psqlBase = [
  exe('psql'),
  '-h',
  '127.0.0.1',
  '-p',
  String(PORTA),
  '-U',
  'postgres',
  '-X',
  '-q',
  '-A',
  '-t',
  '-v',
  'ON_ERROR_STOP=1',
];

const psql = (banco, extra) => [...psqlBase, '-d', banco, ...extra];
const sql = (banco, texto) => rodar(`SQL: ${texto.slice(0, 60)}`, psql(banco, ['-c', texto]));
const arquivo = (banco, caminho) => rodar(path.basename(caminho), psql(banco, ['-f', caminho]));
const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


function iniciarSessao(rotulo, empresa, content, hash, sleepSeg) {
  return new Promise((resolve) => {
    const filho = spawn(
      exe('psql'),
      psql(DB, [
        '-f',
        path.join(DIR, 'concurrency-claim.sql'),
        '-v',
        `empresa=${empresa}`,
        '-v',
        'tipo=course',
        '-v',
        `content=${content}`,
        '-v',
        `hash=${hash}`,
        '-v',
        `sleep=${sleepSeg}`,
      ]),
      { cwd: RAIZ, env: { ...process.env, PGPASSWORD: '' } }
    );
    let saida = '';
    let erro = '';
    filho.stdout.on('data', (d) => (saida += d.toString()));
    filho.stderr.on('data', (d) => (erro += d.toString()));
    filho.on('close', (code) => resolve({ rotulo, code, saida: saida.trim(), erro: erro.trim() }));
    sessoes.push(filho);
  });
}

function encerrarSessoes() {
  for (const filho of sessoes) {
    if (!filho.killed) {
      try {
        filho.kill();
      } catch {
        // já encerrado
      }
    }
  }
}

async function cenarioConcorrencia(nome, preparacao, pedidos, esperadoTrue) {
  console.log(`\n── ${nome}`);
  if (preparacao) sql(DB, preparacao);

  const resultados = await Promise.all(
    pedidos.map(async (pedido, indice) => {
      await esperar(indice === 0 ? 0 : 900);
      return iniciarSessao(
        pedido.rotulo,
        pedido.empresa,
        pedido.content,
        pedido.hash,
        indice === 0 ? 4 : 0
      );
    })
  );

  for (const r of resultados) {
    console.log(`   ${r.rotulo}: ${(r.saida || r.erro).replace(/\n/g, ' | ') || '(vazio)'}`);
  }

  const reclamados = resultados.filter((r) =>
    r.saida
      .split('\n')
      .some((linha) => /^(true|t)\|/i.test(linha.trim()))
  ).length;
  const ok = resultados.every((r) => r.code === 0) && reclamados === esperadoTrue;
  if (!ok) {
    falhas.push(nome);
    console.error(`   [FALHOU] esperava ${esperadoTrue} reivindicação(ões), obteve ${reclamados}`);
  } else {
    console.log(
      `   PASS — ${reclamados} de ${resultados.length} sessão(ões) reivindicaram (esperado ${esperadoTrue})`
    );
  }
}

async function cenarioRateLimit() {
  console.log('\n── S4 · rate limit concorrente (limite 1) → SOMENTE UMA permitida');
  sql(DB, 'TRUNCATE public.rate_limits;');
  const chave = 'training-image-generate:usuario-concorrente';
  const agora = Math.floor(Date.now() / 1000);

  const resultados = await Promise.all(
    [1, 2].map(async (indice) => {
      await esperar(indice === 1 ? 0 : 900);
      return new Promise((resolve) => {
        const filho = spawn(
          exe('psql'),
          psql(DB, [
            '-f',
            path.join(DIR, 'concurrency-rate-limit.sql'),
            '-v',
            `key=${chave}`,
            '-v',
            'limite=1',
            '-v',
            `now=${agora}`,
            '-v',
            `sleep=${indice === 1 ? 4 : 0}`,
          ]),
          { cwd: RAIZ, env: { ...process.env, PGPASSWORD: '' } }
        );
        let saida = '';
        let erro = '';
        filho.stdout.on('data', (d) => (saida += d.toString()));
        filho.stderr.on('data', (d) => (erro += d.toString()));
        filho.on('close', (code) =>
          resolve({ rotulo: `worker-${indice}`, code, saida: saida.trim(), erro: erro.trim() })
        );
        sessoes.push(filho);
      });
    })
  );

  for (const r of resultados) {
    console.log(`   ${r.rotulo}: ${(r.saida || r.erro).replace(/\n/g, ' | ') || '(vazio)'}`);
  }

  const permitidas = resultados.filter((r) => /^true$/i.test(r.saida.trim())).length;
  const ok = resultados.every((r) => r.code === 0) && permitidas === 1;
  if (!ok) {
    falhas.push('S4 · rate limit concorrente');
    console.error(`   [FALHOU] esperava 1 permitida, obteve ${permitidas}`);
  } else {
    console.log('   PASS — exatamente uma chamada consumiu a quota (advisory lock)');
  }
}

function executarScriptConcorrente(script, variaveis, atrasoMs) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const args = psql(DB, ['-f', path.join(DIR, script)]);
      for (const [chave, valor] of Object.entries(variaveis)) args.push('-v', `${chave}=${valor}`);
      const filho = spawn(exe('psql'), args, {
        cwd: RAIZ,
        env: { ...process.env, PGPASSWORD: '' },
      });
      let saida = '';
      let erro = '';
      filho.stdout.on('data', (d) => (saida += d.toString()));
      filho.stderr.on('data', (d) => (erro += d.toString()));
      filho.on('close', (code) => resolve({ code, saida: saida.trim(), erro: erro.trim() }));
      sessoes.push(filho);
    }, atrasoMs);
  });
}

async function cenarioFilaConcorrencia() {
  console.log('\n── S5 · dois workers, UMA requisição na fila → SOMENTE UM pega');
  sql(DB, 'TRUNCATE public.training_image_requests;');
  sql(
    DB,
    `INSERT INTO public.training_image_requests (empresa_id, content_type, content_id)
     VALUES ('${EMPRESA_A}', 'course', '${CURSO_A}');`
  );

  const [a, b] = await Promise.all([
    executarScriptConcorrente('concurrency-autoqueue.sql', { limite: 1, sleep: 4 }, 0),
    executarScriptConcorrente('concurrency-autoqueue.sql', { limite: 1, sleep: 0 }, 900),
  ]);

  console.log(`   worker-1: ${a.saida || a.erro || '(vazio)'}`);
  console.log(`   worker-2: ${b.saida || b.erro || '(vazio)'}`);

  const pegos = [a, b].filter((r) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(r.saida.trim())
  ).length;
  const ok = a.code === 0 && b.code === 0 && pegos === 1;
  if (!ok) {
    falhas.push('S5 · fila concorrente');
    console.error(`   [FALHOU] esperava 1 reivindicação, obteve ${pegos}`);
  } else {
    console.log('   PASS — SKIP LOCKED entregou a requisição a apenas um worker');
  }
}

async function cenarioQuotaDupla() {
  console.log('\n── S6 · quota da EMPRESA (limite 1) com dois usuários → SOMENTE UM passa');
  sql(DB, 'TRUNCATE public.rate_limits;');
  const agora = Math.floor(Date.now() / 1000);
  const base = {
    empresa: 'dual:conc:E1',
    empresa_limite: 1,
    usuario_limite: 5,
    now: agora,
  };

  const [a, b] = await Promise.all([
    executarScriptConcorrente(
      'concurrency-dual.sql',
      { ...base, usuario: 'dual:conc:U1', sleep: 4 },
      0
    ),
    executarScriptConcorrente(
      'concurrency-dual.sql',
      { ...base, usuario: 'dual:conc:U2', sleep: 0 },
      900
    ),
  ]);

  console.log(`   usuario-1: ${a.saida || a.erro || '(vazio)'}`);
  console.log(`   usuario-2: ${b.saida || b.erro || '(vazio)'}`);

  const permitidas = [a, b].filter((r) => /^true$/i.test(r.saida.trim())).length;
  const ok = a.code === 0 && b.code === 0 && permitidas === 1;
  if (!ok) {
    falhas.push('S6 · quota dupla concorrente');
    console.error(`   [FALHOU] esperava 1 permitida, obteve ${permitidas}`);
  } else {
    console.log('   PASS — teto da empresa aplicado atomicamente entre usuários');
  }
}

async function principal() {
  console.log('=============================================================');
  console.log(' INFRAESTRUTURA DE IMAGENS — VALIDAÇÃO EM POSTGRESQL LOCAL');
  console.log(` porta ${PORTA} · banco ${DB} · sem acesso remoto`);
  console.log('=============================================================');
  if (!PG_BIN) {
    console.error('PG_BIN não encontrado. Instale o PostgreSQL ou defina PG_BIN.');
    return 2;
  }

  if (!existsSync(DATA)) {
    console.log('\n[1/8] initdb (cluster isolado)');
    const init = rodar('initdb', [
      exe('initdb'),
      '-D',
      DATA,
      '-U',
      'postgres',
      '--auth=trust',
      '--encoding=UTF8',
      '--locale=C',
    ]);
    if (init === null) return 1;
  }

  const pronto = spawnSync(exe('pg_isready'), [
    '-h',
    '127.0.0.1',
    '-p',
    String(PORTA),
    '-U',
    'postgres',
  ]);
  if (pronto.status !== 0) {
    console.log('\n[2/8] iniciando servidor');
    // `stdio: 'ignore'` é OBRIGATÓRIO: o postgres iniciado por pg_ctl herda os
    // handles do pipe e o spawnSync esperaria EOF para sempre.
    const start = rodar(
      'pg_ctl start',
      [
        exe('pg_ctl'),
        '-D',
        DATA,
        '-o',
        `-p ${PORTA} -c listen_addresses=127.0.0.1`,
        '-l',
        LOG,
        'start',
      ],
      { stdio: 'ignore' }
    );
    if (start === null) return 1;
    servidorAtivo = true;
    await esperar(1500);
  } else {
    console.log('\n[2/8] servidor já em execução');
  }

  console.log('\n[3/8] criando banco de teste');
  if (sql('postgres', `DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`) === null) return 1;
  if (sql('postgres', `CREATE DATABASE ${DB}`) === null) return 1;

  console.log('\n[4/8] schema mínimo + seed de duas empresas');
  if (arquivo(DB, path.join(DIR, 'bootstrap.sql')) === null) return 1;
  if (arquivo(DB, path.join(DIR, 'seed.sql')) === null) return 1;

  console.log('\n[5/8] aplicando as migrations reais');
  if (arquivo(DB, MIGRATION_RATE_LIMIT) === null) return 1;
  if (arquivo(DB, MIGRATION) === null) return 1;
  if (arquivo(DB, MIGRATION_AUTOQUEUE) === null) return 1;
  if (arquivo(DB, MIGRATION_RATE_LIMIT_DUAL) === null) return 1;

  console.log('\n[6/8] RLS, Storage, constraints, trigger e permissões');
  if (arquivo(DB, path.join(DIR, 'rls.test.sql')) === null) return 1;

  console.log('\n[7/8] claim atômico (cenários sequenciais)');
  if (arquivo(DB, path.join(DIR, 'claim.test.sql')) === null) return 1;

  console.log('\n[7.1/8] rate limit persistente e atômico');
  if (arquivo(DB, path.join(DIR, 'rate-limit.test.sql')) === null) return 1;

  console.log('\n[7.2/8] fila automática (trigger, unicidade e SKIP LOCKED)');
  if (arquivo(DB, path.join(DIR, 'autoqueue.test.sql')) === null) return 1;

  console.log('\n[8/8] concorrência REAL (sessões psql simultâneas)');
  await cenarioConcorrencia(
    'S1 · mesma empresa, mesmo hash → SOMENTE UMA reivindica',
    'TRUNCATE public.training_images CASCADE;',
    [
      { rotulo: 'worker-1', empresa: EMPRESA_A, content: CURSO_A, hash: 'hash-concorrente' },
      { rotulo: 'worker-2', empresa: EMPRESA_A, content: CURSO_A, hash: 'hash-concorrente' },
    ],
    1
  );

  await cenarioConcorrencia(
    'S2 · trabalho já concluído → NENHUMA reivindica',
    `TRUNCATE public.training_images CASCADE;
     INSERT INTO public.training_images
       (empresa_id, content_type, content_id, storage_path, content_hash, status, provider, attempts)
     VALUES ('${EMPRESA_A}', 'course', '${CURSO_A}',
             '${EMPRESA_A}/courses/${CURSO_A}/cover.webp', 'hash-concluido', 'succeeded', 'teste', 1);`,
    [
      { rotulo: 'worker-1', empresa: EMPRESA_A, content: CURSO_A, hash: 'hash-concluido' },
      { rotulo: 'worker-2', empresa: EMPRESA_A, content: CURSO_A, hash: 'hash-concluido' },
    ],
    0
  );

  await cenarioConcorrencia(
    'S3 · empresas diferentes, mesmo hash → cada uma reivindica a sua',
    'TRUNCATE public.training_images CASCADE;',
    [
      { rotulo: 'empresa-A', empresa: EMPRESA_A, content: CURSO_A, hash: 'hash-compartilhado' },
      { rotulo: 'empresa-B', empresa: EMPRESA_B, content: CURSO_B, hash: 'hash-compartilhado' },
    ],
    2
  );

  await cenarioRateLimit();
  await cenarioFilaConcorrencia();
  await cenarioQuotaDupla();

  encerrarSessoes();

  if (servidorAtivo && !KEEP) {
    rodar(
      'pg_ctl stop',
      [exe('pg_ctl'), '-D', DATA, '-m', 'fast', 'stop'],
      { stdio: 'ignore' }
    );
  }

  console.log('\n=============================================================');
  if (falhas.length === 0) {
    console.log(' RESULTADO: TODOS OS CENÁRIOS LOCAIS PASSARAM');
    console.log(' (nenhuma chamada à OpenAI, nenhum deploy, nenhum banco remoto)');
    console.log('=============================================================');
    return 0;
  }
  console.log(` RESULTADO: ${falhas.length} FALHA(S)`);
  for (const falha of falhas) console.log(`  - ${falha}`);
  console.log('=============================================================');
  return 1;
}

principal()
  .then((codigo) => process.exit(codigo))
  .catch((erro) => {
    encerrarSessoes();
    console.error(erro);
    process.exit(1);
  });

