#!/usr/bin/env node
/**
 * Inventario do banco canonico -> inventario/estado/banco.json (fonte de consulta dos agentes).
 *
 * Tudo sai de comando: as secoes de `scripts/inventario/banco.sql`, o uso de cada tabela no codigo
 * (`.from('tabela')` em src/ e supabase/functions/) e as edge functions do repo. Nada escrito a mao.
 * Mesmo padrao do Zapp Web V2 (scripts/inventario), adaptado ao DP V3:
 *   - a credencial do CI e o secret de repositorio SUPABASE_DB_URL_READONLY (role ci_auditor, so
 *     catalogo). O SUPABASE_ACCESS_TOKEN/SUPABASE_DB_URL vivem no environment Production, com revisor
 *     obrigatorio — um job semanal autonomo nao pode depender deles;
 *   - cada secao do SQL roda separada: secao sem permissao vira null e entra em
 *     `coleta.secoes_indisponiveis`, sem derrubar o resto.
 *
 * Dois jeitos de rodar:
 *   1) Com credencial (CI semanal / maquina com acesso):
 *        DATABASE_URL=postgresql://... node scripts/inventario/gerar-banco.mjs
 *      Usa `psql` (cliente 16+). So aceita o projeto canonico (frjbfeamybqsejlvmqbl; CANONICAL_SUPABASE_REF
 *      so troca para teste e exige INVENTARIO_PERMITIR_OUTRO_PROJETO=1).
 *   2) Sessao de agente sem credencial: rodar cada secao de banco.sql no MCP do banco canonico, salvar
 *      { "<secao>": <valor de j>, ... } num arquivo e
 *        node scripts/inventario/gerar-banco.mjs --entrada /caminho/respostas.json
 *      Com SUPABASE_ACCESS_TOKEN no ambiente (opcional), compara tambem as edges publicadas (GET /functions).
 *
 * Antes de gravar, recusa saida com cara de credencial (Bearer, JWT, sb_secret_, DSN com senha).
 * Exit: 0 = gravado; 2 = entrada invalida, consulta falhou ou saida com credencial.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SQL_PATH = path.join(RAIZ, 'scripts/inventario/banco.sql');
const SAIDA = path.join(RAIZ, 'inventario/estado/banco.json');
const TYPES_PATH = 'src/integrations/supabase/types.ts';
const PASTAS_CODIGO = ['src', 'supabase/functions'];
const EXTENSOES = /\.(ts|tsx|js|jsx|mjs)$/;
export const PROJETO_CANONICO = 'frjbfeamybqsejlvmqbl';
const API = `${(process.env.SUPABASE_API_URL || 'https://api.supabase.com').replace(/\/$/, '')}/v1/projects`;

/** Secoes obrigatorias: sem elas o inventario nao faz sentido e nada e gravado. */
export const SECOES_OBRIGATORIAS = ['resumo', 'tabelas'];

// Limiares dos alertas: o que um agente precisa saber antes de mexer no sistema.
export const LIMIARES = {
  taxaFalhaCronPct: 5,
  historicoCronMaisDe7Dias: 50000,
};

/** Algo com cara de credencial no texto? */
export const PARECE_CREDENCIAL = /Bearer\s+[A-Za-z0-9._-]{20,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.|sb_secret_|postgres(?:ql)?:\/\/[^\s:@/]+:[^\s@]+@/;

/** Secoes de banco.sql: [{ nome, sql }] na ordem do arquivo. */
export function lerSecoes(texto) {
  const partes = texto.split(/^-- @secao\s+/m).slice(1);
  return partes.map((p) => {
    const nome = p.slice(0, p.indexOf('\n')).trim();
    return { nome, sql: p.slice(p.indexOf('\n') + 1).trim() };
  }).filter((s) => /^[a-z_]+$/.test(s.nome) && s.sql);
}

/** Tira DSN/senha de mensagens de erro do psql antes de imprimir ou gravar. */
export const limparErro = (msg) => String(msg ?? '').split('\n').map((l) => l.trim()).filter(Boolean)
  .find((l) => /ERROR|FATAL|erro|error/i.test(l))?.replace(/postgres(?:ql)?:\/\/\S+/g, '<dsn>').slice(0, 240)
  ?? 'falha sem mensagem';

/**
 * A URL e do projeto canonico? Conexao direta `db.<ref>.supabase.co` ou pooler com usuario `<papel>.<ref>`.
 * Nunca devolve nem imprime a URL.
 */
export function conferirUrl(raw, ref = PROJETO_CANONICO) {
  let url;
  try { url = new URL(raw); } catch { throw new Error('DATABASE_URL nao e uma URI valida'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('DATABASE_URL deve usar postgresql://');
  const direta = url.hostname === `db.${ref}.supabase.co`;
  const pooler = url.hostname.endsWith('.pooler.supabase.com') && decodeURIComponent(url.username).endsWith(`.${ref}`);
  if (!direta && !pooler) throw new Error(`DATABASE_URL nao aponta para o projeto canonico (${ref}).`);
  return { conexao: direta ? 'direta' : 'pooler', papel: decodeURIComponent(url.username).split('.')[0] };
}

/**
 * Junta as respostas por secao. `respostas` = { secao: valor | undefined }, `falhas` = { secao: motivo }.
 * Secao obrigatoria ausente -> erro. Opcional ausente -> null + registro em coleta.secoes_indisponiveis.
 */
export function montarDado(respostas, falhas = {}, medidoEm = new Date().toISOString()) {
  for (const s of SECOES_OBRIGATORIAS) {
    if (respostas[s] === undefined || respostas[s] === null) {
      throw new Error(`secao obrigatoria "${s}" sem resposta${falhas[s] ? `: ${falhas[s]}` : ''}`);
    }
  }
  if (!Array.isArray(respostas.tabelas) || respostas.tabelas.length === 0) throw new Error('entrada sem tabelas');
  const indisponiveis = Object.keys({ cron_jobs: 1, cron_execucoes: 1, ledger: 1 })
    .filter((s) => respostas[s] === undefined || respostas[s] === null)
    .map((s) => ({ secao: s, motivo: falhas[s] ?? 'nao enviada' }));
  return {
    format_version: 1,
    medido_em: medidoEm.replace(/\.\d{3}Z$/, 'Z'),
    resumo: respostas.resumo,
    tabelas: respostas.tabelas,
    cron_jobs: respostas.cron_jobs ?? null,
    cron_execucoes: respostas.cron_execucoes ?? null,
    ledger: respostas.ledger ?? null,
    coleta: { secoes_indisponiveis: indisponiveis },
  };
}

/** Le o arquivo de --entrada: { secao: valor } (MCP por secao) ou { inventario: {...} }. */
export function lerEntrada(texto) {
  let dado = JSON.parse(texto.trim());
  const conteudo = dado?.result?.content ?? dado?.content;
  if (Array.isArray(conteudo) && typeof conteudo[0]?.text === 'string') dado = JSON.parse(conteudo[0].text);
  if (dado && dado.inventario) dado = dado.inventario;
  const respostas = {};
  for (const [k, v] of Object.entries(dado ?? {})) {
    // Aceita o valor cru ou a resposta do MCP para a secao ({ rows: [{ j: ... }] }).
    let val = v;
    if (val && Array.isArray(val.rows)) val = val.rows[0]?.j;
    if (typeof val === 'string') { try { val = JSON.parse(val); } catch { /* mantem */ } }
    respostas[k] = val;
  }
  return respostas;
}

function listarArquivos(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entrada.name === 'node_modules' || entrada.name.startsWith('.')) continue;
    const p = path.join(dir, entrada.name);
    if (entrada.isDirectory()) listarArquivos(p, acc);
    else if (EXTENSOES.test(entrada.name)) acc.push(p);
  }
  return acc;
}

/**
 * Uso de cada tabela no codigo de producao (testes fora): `.from('tabela')` do cliente Supabase
 * (sem `storage.from`, que e bucket) e acesso direto ao PostgREST `/rest/v1/tabela`.
 * No DP o cliente do front passa pelo external-db-bridge de forma transparente: `.from()` continua
 * sendo o ponto de uso. Limite conhecido: `.from(variavel)` nao e resolvido.
 */
export function contarUsoNoCodigo(raiz, nomes) {
  const uso = Object.fromEntries(nomes.map((n) => [n, { src: 0, edges: 0 }]));
  const reFrom = /(\bstorage\s*)?\.from\(\s*['"`]([A-Za-z0-9_]+)['"`]/g;
  const reRest = /\/rest\/v1\/([A-Za-z0-9_]+)/g;
  for (const pasta of PASTAS_CODIGO) {
    const chave = pasta === 'src' ? 'src' : 'edges';
    for (const arquivo of listarArquivos(path.join(raiz, pasta))) {
      if (/(\.test\.|\.spec\.|__tests__)/.test(arquivo)) continue;
      const texto = fs.readFileSync(arquivo, 'utf8');
      for (const m of texto.matchAll(reFrom)) if (!m[1] && uso[m[2]]) uso[m[2]][chave] += 1;
      for (const m of texto.matchAll(reRest)) if (m[1] !== 'rpc' && uso[m[1]]) uso[m[1]][chave] += 1;
    }
  }
  return uso;
}

/** Nomes das tabelas declaradas em `Tables: { ... }` do types.ts gerado. */
export function tabelasDoTypes(texto) {
  const inicio = texto.indexOf('    Tables: {');
  if (inicio === -1) return [];
  const fim = texto.indexOf('\n    Views: {', inicio);
  const bloco = texto.slice(inicio, fim === -1 ? undefined : fim);
  return [...bloco.matchAll(/^ {6}([A-Za-z0-9_]+): \{$/gm)].map((m) => m[1]);
}

/**
 * A resposta e mesmo do banco canonico? Pelo menos 90% das tabelas do types.ts do repo (foto do
 * schema gerada do canonico) tem de estar na resposta: barra resposta colada de outro banco (ex.: MCP
 * de outro projeto). Com o ledger visivel, confere tambem que a maior versao aplicada esta entre as
 * 20 migrations mais recentes do repo (ou a frente) e a contagem a ate 10% da de arquivos.
 */
export const LEDGER_TOLERANCIA = { versoesRecentes: 20, registrosPct: 10 };
export function conferirOrigem(dado, tabelasTypes, versoesRepo = null) {
  const resposta = new Set(dado.tabelas.map((t) => t.nome));
  const esperadas = new Set(tabelasTypes);
  const comuns = [...esperadas].filter((t) => resposta.has(t)).length;
  const cobre = esperadas.size ? comuns / esperadas.size : 0;
  if (cobre < 0.9) {
    throw new Error(`a resposta nao parece ser do banco canonico: ${comuns} de ${esperadas.size} tabelas do `
      + `${TYPES_PATH} (${Math.round(cobre * 100)}%). Confira o projeto/MCP usado.`);
  }
  const origem = { tabelas_do_types_ts_presentes: comuns, tabelas_no_types_ts: esperadas.size };
  if (!versoesRepo?.length || !dado.ledger) return { ...origem, ledger_conferido: false };
  const { versao_max: max, registros } = dado.ledger;
  const recentes = [...versoesRepo].sort().reverse();
  const limite = recentes[Math.min(LEDGER_TOLERANCIA.versoesRecentes, recentes.length) - 1];
  const difPct = Math.abs(registros - versoesRepo.length) * 100 / versoesRepo.length;
  if (!max || String(max) < limite || difPct > LEDGER_TOLERANCIA.registrosPct) {
    throw new Error(`a resposta nao parece ser do banco canonico: ledger com ${registros} registros e maior versao ${max}; `
      + `o repo tem ${versoesRepo.length} migrations e a ${LEDGER_TOLERANCIA.versoesRecentes}a mais recente e ${limite}.`);
  }
  return { ...origem, ledger_conferido: true, ledger_registros: registros, migrations_no_repo: versoesRepo.length };
}

/** Versoes (prefixo numerico) dos .sql de supabase/migrations/ (so o nivel de cima). */
export const versoesDoRepo = (raiz) => fs.readdirSync(path.join(raiz, 'supabase/migrations'))
  .filter((f) => /^\d+_.*\.sql$/.test(f)).map((f) => f.split('_')[0]);

/** Edge functions do repo (pastas com index.ts, sem _shared). */
export function edgesNoRepo(raiz) {
  const dir = path.join(raiz, 'supabase/functions');
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_') && fs.existsSync(path.join(dir, d.name, 'index.ts')))
    .map((d) => d.name).sort();
}

/** Edges publicadas (resposta de GET /functions) x repo. `publicadas` null = nao consultado. */
export function compararEdges(publicadasApi, noRepo) {
  if (!publicadasApi) return { publicadas: null, no_repo: noRepo.length, publicadas_sem_codigo_no_repo: null, no_repo_sem_deploy: null };
  const publicadas = publicadasApi.map((f) => ({
    slug: f.slug,
    versao: f.version,
    status: f.status,
    verify_jwt: f.verify_jwt,
    atualizada_em: f.updated_at ? new Date(f.updated_at).toISOString().slice(0, 16) + 'Z' : null,
  })).sort((a, b) => a.slug.localeCompare(b.slug));
  const slugs = new Set(publicadas.map((f) => f.slug));
  return {
    publicadas,
    no_repo: noRepo.length,
    publicadas_sem_codigo_no_repo: [...slugs].filter((s) => !noRepo.includes(s)).sort(),
    no_repo_sem_deploy: noRepo.filter((s) => !slugs.has(s)),
  };
}

/** Ordena chaves recursivamente: o diff entre execucoes fica so no que mudou. */
function ordenar(valor) {
  if (Array.isArray(valor)) return valor.map(ordenar);
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(Object.keys(valor).sort().map((k) => [k, ordenar(valor[k])]));
  }
  return valor;
}

/**
 * A agenda do pg_cron roda ao menos uma vez por dia? 'N seconds', ou dia do mes, mes e dia da semana
 * cobrindo tudo: `*`, `*\/1` ou a faixa inteira (1-31, 1-12, 0-6/0-7).
 */
const CAMPO_TODO = [/^(\*|\*\/1|1-31)$/, /^(\*|\*\/1|1-12)$/, /^(\*|\*\/1|0-6|0-7|1-7)$/];
export function rodaTodoDia(agenda) {
  const a = String(agenda ?? '').trim();
  if (/^\d+\s+seconds?$/i.test(a)) return true;
  const campos = a.split(/\s+/);
  return campos.length === 5 && CAMPO_TODO.every((re, i) => re.test(campos[i + 2]));
}

/** Junta banco + codigo + edges e calcula orfas e alertas. Funcao pura (testada em scripts/tests/). */
export function montarInventario(dado, uso, edges = compararEdges(null, []), origem = null) {
  const tabelas = dado.tabelas.map((t) => ({ ...t, uso_no_codigo: uso[t.nome] ?? { src: 0, edges: 0 } }));
  const orfas = tabelas
    .filter((t) => t.linhas === 0 && !t.citada_no_banco && t.uso_no_codigo.src + t.uso_no_codigo.edges === 0)
    .map((t) => t.nome);

  const alertas = [];
  const semRls = tabelas.filter((t) => !t.rls).map((t) => t.nome);
  if (semRls.length) alertas.push({ tipo: 'tabela_sem_rls', detalhe: semRls });
  // RLS ligado sem policy nega tudo para authenticated/anon (service_role passa por cima). Pode ser de
  // proposito (tabela so-interna), mas fica invisivel sem este aviso.
  const rlsSemPolicy = tabelas.filter((t) => t.rls && t.policies === 0).map((t) => t.nome);
  if (rlsSemPolicy.length) alertas.push({ tipo: 'rls_sem_policy', detalhe: rlsSemPolicy });
  // Multi-empresa: tabela com empresa_id e policies, mas nenhuma policy cita empresa_id — candidata a
  // vazamento entre empresas (pode ser isolada por funcao/join; confirme no corpo da policy).
  const tenantSemFiltro = tabelas
    .filter((t) => t.tem_empresa_id && t.rls && t.policies > 0 && !t.policy_cita_empresa_id).map((t) => t.nome);
  if (tenantSemFiltro.length) alertas.push({ tipo: 'empresa_id_fora_das_policies', detalhe: tenantSemFiltro });

  const cronJobs = dado.cron_jobs;
  if (cronJobs && cronJobs.visivel === false) {
    alertas.push({ tipo: 'cron_invisivel_para_o_papel', detalhe: ['cron.job filtrado por RLS do pg_cron: lista de jobs nao confiavel'] });
  }
  const exec = dado.cron_execucoes;
  if (exec && cronJobs?.jobs) {
    const porNome = Object.fromEntries((exec.por_job ?? []).map((j) => [j.nome, j]));
    const ativos = cronJobs.jobs.filter((j) => j.ativo);
    const ruins = ativos.filter((j) => (porNome[j.nome]?.taxa_falha_7d_pct ?? 0) >= LIMIARES.taxaFalhaCronPct)
      .map((j) => `${j.nome} (${porNome[j.nome].taxa_falha_7d_pct}% em 7d)`);
    if (ruins.length) alertas.push({ tipo: 'cron_falhando', detalhe: ruins });
    // Cron 100% parado nao grava linha em job_run_details: some de horas_paradas_7d e a taxa fica 0.
    const mudos = ativos.filter((j) => (porNome[j.nome]?.execucoes_24h ?? 0) === 0 && rodaTodoDia(j.agenda)).map((j) => j.nome);
    if (mudos.length) alertas.push({ tipo: 'cron_sem_execucao', detalhe: mudos });
    if (exec.horas_paradas_7d?.length) alertas.push({ tipo: 'cron_parado', detalhe: exec.horas_paradas_7d.map((h) => h.hora) });
    if ((exec.historico?.mais_de_7_dias ?? 0) > LIMIARES.historicoCronMaisDe7Dias) {
      alertas.push({ tipo: 'historico_cron_sem_limpeza', detalhe: [`${exec.historico.mais_de_7_dias} linhas com mais de 7 dias`] });
    }
  }
  if (edges.no_repo_sem_deploy?.length) alertas.push({ tipo: 'edge_sem_deploy', detalhe: edges.no_repo_sem_deploy });
  if (edges.publicadas_sem_codigo_no_repo?.length) {
    alertas.push({ tipo: 'edge_publicada_sem_codigo', detalhe: edges.publicadas_sem_codigo_no_repo });
  }
  if (dado.coleta?.secoes_indisponiveis?.length) {
    alertas.push({ tipo: 'coleta_parcial', detalhe: dado.coleta.secoes_indisponiveis.map((s) => s.secao) });
  }

  return ordenar({
    ...dado,
    fonte: 'scripts/inventario/banco.sql (por secao) + .from() em src/ e supabase/functions/ (scripts/inventario/gerar-banco.mjs)',
    origem,
    tabelas,
    tabelas_orfas: {
      criterio: '0 linhas (estimativa do planner quando linhas_exatas=false) + nao citada em funcao/view do banco + nenhum .from() em src/ ou supabase/functions/',
      lista: orfas,
    },
    edge_functions: edges,
    alertas,
  });
}

/** Roda cada secao via psql. Devolve { respostas, falhas } — nunca imprime a URL. */
export function consultarViaPsql(url, secoes, executar = execFileSync) {
  const respostas = {};
  const falhas = {};
  for (const { nome, sql } of secoes) {
    try {
      const saida = executar('psql', [url, '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1',
        '-c', 'SET default_transaction_read_only = on', '-c', "SET statement_timeout = '90s'", '-c', sql], {
        encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120_000,
        env: { ...process.env, PGCONNECT_TIMEOUT: '20', PGAPPNAME: 'inventario-estado' },
      });
      respostas[nome] = JSON.parse(String(saida).trim().split('\n').filter(Boolean).pop());
    } catch (error) {
      falhas[nome] = limparErro(error.stderr || error.message);
    }
  }
  return { respostas, falhas };
}

async function edgesPublicadas() {
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (!token) return null;
  const res = await fetch(`${API}/${encodeURIComponent(PROJETO_CANONICO)}/functions`, {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(60_000),
  });
  // Nunca repassa o corpo do erro: pode ecoar cabecalho.
  if (!res.ok) throw new Error(`Management API /functions respondeu HTTP ${res.status}`);
  return res.json();
}

async function main(argv) {
  const iEntrada = argv.indexOf('--entrada');
  let respostas;
  let falhas = {};
  if (iEntrada !== -1) {
    const arquivo = argv[iEntrada + 1];
    if (!arquivo) throw new Error('--entrada exige o caminho do arquivo com as respostas do banco.sql');
    respostas = lerEntrada(fs.readFileSync(arquivo, 'utf8'));
  } else {
    const url = (process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '').trim();
    if (!url) throw new Error('sem --entrada e sem DATABASE_URL: nada para ler (veja o cabecalho do script).');
    const ref = (process.env.CANONICAL_SUPABASE_REF || PROJETO_CANONICO).trim();
    if (ref !== PROJETO_CANONICO && process.env.INVENTARIO_PERMITIR_OUTRO_PROJETO !== '1') {
      throw new Error(`CANONICAL_SUPABASE_REF=${ref} nao e o projeto canonico (${PROJETO_CANONICO}).`);
    }
    if (process.env.INVENTARIO_PERMITIR_OUTRO_PROJETO !== '1') conferirUrl(url, ref);
    ({ respostas, falhas } = consultarViaPsql(url, lerSecoes(fs.readFileSync(SQL_PATH, 'utf8'))));
    for (const [s, motivo] of Object.entries(falhas)) console.warn(`aviso: secao ${s} indisponivel — ${motivo}`);
  }

  const dado = montarDado(respostas, falhas);
  const types = path.join(RAIZ, TYPES_PATH);
  const origem = conferirOrigem(dado, fs.existsSync(types) ? tabelasDoTypes(fs.readFileSync(types, 'utf8')) : [], versoesDoRepo(RAIZ));
  const uso = contarUsoNoCodigo(RAIZ, dado.tabelas.map((t) => t.nome));
  const inventario = montarInventario(dado, uso, compararEdges(await edgesPublicadas(), edgesNoRepo(RAIZ)), origem);
  const texto = JSON.stringify(inventario, null, 2) + '\n';
  if (PARECE_CREDENCIAL.test(texto)) {
    throw new Error('a saida tem algo com cara de credencial; nada foi gravado. Revise banco.sql.');
  }
  fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
  fs.writeFileSync(SAIDA, texto);
  const ed = inventario.edge_functions;
  console.log(`banco.json: ${inventario.tabelas.length} tabelas, `
    + `${inventario.cron_jobs ? `${inventario.cron_jobs.jobs.length} cron jobs` : 'cron indisponivel'}, `
    + `${inventario.tabelas_orfas.lista.length} orfas, ${inventario.alertas.length} alertas, `
    + `edges ${ed.publicadas ? `${ed.publicadas.length} publicadas/${ed.no_repo} no repo` : `${ed.no_repo} no repo (publicadas nao consultadas)`}, `
    + `secoes indisponiveis: ${inventario.coleta.secoes_indisponiveis.map((s) => s.secao).join(', ') || 'nenhuma'} `
    + `(medido_em ${inventario.medido_em}).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(`ERRO: ${error.message}`);
    process.exit(2);
  });
}
