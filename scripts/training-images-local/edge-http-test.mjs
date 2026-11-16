#!/usr/bin/env node
/**
 * =============================================================================
 * EDGE FUNCTION `training-image-generate` — TESTE HTTP NO RUNTIME DENO
 * =============================================================================
 * Sobe a função REAL com `deno run` (runtime Deno, não parsing de TypeScript) e
 * exercita o contrato HTTP contra um stub local da API do Supabase:
 *   • CORS/preflight (origem permitida e negada);
 *   • CSRF (Origin obrigatório);
 *   • autenticação (401 sem JWT);
 *   • validação de corpo (400/422);
 *   • gate de ativação (503 sem flag/chave, ANTES de qualquer claim);
 *   • vínculo com a empresa (403) e conteúdo inexistente (404);
 *   • headers de segurança e ausência de segredo na resposta.
 *
 * NÃO chama a OpenAI (a chave usada é fictícia e nenhum caminho chega ao
 * provedor). NÃO usa Supabase remoto. NÃO faz deploy.
 *
 * Uso: node scripts/training-images-local/edge-http-test.mjs
 * Requisitos: Deno disponível via `npx deno` (ou DENO_BIN).
 * Limitação: sem Docker não há `supabase functions serve`/Storage/PostgREST
 * reais; o stub cobre apenas o contrato HTTP da função.
 * =============================================================================
 */
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import process from 'node:process';

const FUNCAO = 'http://127.0.0.1:8000';
const STUB_PORTA = 54321;
const ORIGEM = 'http://localhost:5173';
const USUARIO = '11111111-1111-4111-8111-111111111111';
const EMPRESA = '66104399-aba8-4105-bbd3-9bf67820c1d0';
const CURSO = 'aaaa1111-1111-1111-1111-111111111111';
const OUTRA_EMPRESA = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const OUTRO_CURSO = 'a0000003-0000-4000-8000-000000000003';
const TRILHA = 'a0000002-0000-4000-8000-000000000002';
const CORPO_VALIDO = { empresa_id: EMPRESA, content_type: 'course', content_id: CURSO };
const ALLOWLIST_ENV = {
  TRAINING_IMAGE_ALLOWED_EMPRESA_ID: EMPRESA,
  TRAINING_IMAGE_ALLOWED_CONTENT_ID: CURSO,
};

const falhas = [];
const passos = [];
let modoVinculo = 'nenhum';
let funcao = null;
let conteudoCurso = null;
let conteudoTrilha = null;
let capaExistente = null;
let filaLote = [];
let rpcAllowed = true;
let rpcReason = null;
const rpc = {
  claim: 0,
  rateLimit: 0,
  fila: 0,
  finish: [],
  rateLimitBody: null,
  trainingImagesPatch: [],
};
let ultimoHashReivindicado = null;

function afirmar(condicao, mensagem, detalhe = '') {
  if (condicao) {
    passos.push(mensagem);
    console.log(`   PASS — ${mensagem}`);
  } else {
    falhas.push(mensagem);
    console.log(`   FALHOU — ${mensagem}${detalhe ? ` (${detalhe})` : ''}`);
  }
}

function json(res, status, corpo) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(corpo));
}

const stub = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${STUB_PORTA}`);
  const caminho = url.pathname;

  if (caminho === '/auth/v1/user') {
    if (!req.headers.authorization) return json(res, 401, { message: 'missing jwt' });
    return json(res, 200, {
      id: USUARIO,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'teste@exemplo.local',
      created_at: '2026-01-01T00:00:00Z',
    });
  }

  if (caminho === '/rest/v1/user_empresas') {
    const temVinculo = modoVinculo === 'presente' || modoVinculo === 'sem_papel';
    return json(res, 200, temVinculo ? [{ user_id: USUARIO }] : []);
  }
  if (caminho === '/rest/v1/user_roles') {
    const papeis =
      modoVinculo === 'presente'
        ? [{ role: 'admin' }]
        : modoVinculo === 'sem_papel'
          ? [{ role: 'user' }]
          : [];
    return json(res, 200, papeis);
  }
  if (caminho === '/rest/v1/catalogo_cursos') {
    return json(res, 200, conteudoCurso ? [conteudoCurso] : []);
  }
  if (caminho === '/rest/v1/trilhas_aprendizado') {
    return json(res, 200, conteudoTrilha ? [conteudoTrilha] : []);
  }
  if (caminho === '/rest/v1/training_images' && req.method === 'PATCH') {
    let corpo = '';
    req.on('data', (d) => (corpo += d.toString()));
    req.on('end', () => {
      try {
        rpc.trainingImagesPatch.push(JSON.parse(corpo));
      } catch {
        rpc.trainingImagesPatch.push(null);
      }
      res.writeHead(204);
      res.end();
    });
    return;
  }
  if (caminho === '/rest/v1/training_images') {
    return json(res, 200, capaExistente ? [capaExistente] : []);
  }

  if (caminho === '/rest/v1/rpc/edge_rate_limit_check_dual') {
    rpc.rateLimit += 1;
    let corpo = '';
    req.on('data', (d) => (corpo += d.toString()));
    req.on('end', () => {
      try {
        rpc.rateLimitBody = JSON.parse(corpo);
      } catch {
        rpc.rateLimitBody = null;
      }
      json(res, 200, {
        allowed: rpcAllowed,
        reason: rpcAllowed ? null : (rpcReason ?? 'empresa'),
        empresa_current: rpcAllowed ? 1 : 20,
        empresa_limit: 20,
        empresa_remaining: rpcAllowed ? 19 : 0,
        usuario_current: rpcAllowed ? 1 : 0,
        usuario_limit: 5,
        usuario_remaining: rpcAllowed ? 4 : 5,
        reset: Math.floor(Date.now() / 1000) + 3600,
      });
    });
    return;
  }

  if (caminho === '/rest/v1/rpc/claim_training_image_requests') {
    rpc.fila += 1;
    return json(res, 200, filaLote);
  }

  if (caminho === '/rest/v1/rpc/finish_training_image_request') {
    let corpo = '';
    req.on('data', (d) => (corpo += d.toString()));
    req.on('end', () => {
      let dados = null;
      try {
        dados = JSON.parse(corpo);
      } catch {
        dados = null;
      }
      rpc.finish.push(dados);
      json(res, 200, {
        id: dados?.p_id ?? 'req-teste',
        status: dados?.p_status ?? 'skipped',
      });
    });
    return;
  }

  if (caminho === '/rest/v1/rpc/claim_training_image') {
    rpc.claim += 1;
    let corpo = '';
    req.on('data', (d) => (corpo += d.toString()));
    req.on('end', () => {
      try {
        ultimoHashReivindicado = JSON.parse(corpo)?.p_content_hash ?? null;
      } catch {
        ultimoHashReivindicado = null;
      }
      json(res, 200, [{ reclamado: false, id: 'img-teste', status: 'succeeded', attempts: 1 }]);
    });
    return;
  }

  return json(res, 200, []);
});

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function esperarFuncao(tentativas = 120) {
  for (let i = 0; i < tentativas; i += 1) {
    try {
      const resposta = await fetch(`${FUNCAO}/`, { method: 'GET' });
      if (resposta.status) return true;
    } catch {
      // ainda subindo
    }
    await esperar(250);
  }
  return false;
}

function matarFuncao() {
  if (!funcao || funcao.killed) return;
  try {
    spawnSync('taskkill', ['/PID', String(funcao.pid), '/T', '/F'], { stdio: 'ignore' });
  } catch {
    funcao.kill();
  }
  funcao = null;
}

async function subirFuncao(extraEnv = {}, arquivo = 'supabase/functions/training-image-generate/index.ts') {
  matarFuncao();
  const comando = process.env.DENO_BIN
    ? [process.env.DENO_BIN, 'run', '-A', arquivo]
    : [
        process.env.ComSpec ?? 'cmd.exe',
        '/d',
        '/s',
        '/c',
        `npx --yes deno run -A ${arquivo}`,
      ];
  funcao = spawn(comando[0], comando.slice(1), {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SUPABASE_URL: `http://127.0.0.1:${STUB_PORTA}`,
      SUPABASE_ANON_KEY: 'chave-anon-de-teste',
      SUPABASE_SERVICE_ROLE_KEY: 'chave-service-de-teste',
      EXTRA_ALLOWED_LOCAL_PORTS: '5173',
      ...extraEnv,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  funcao.stdout.on('data', () => {});
  funcao.stderr.on('data', () => {});
  return await esperarFuncao();
}

async function chamar(metodo, opcoes = {}) {
  const {
    headers = {},
    body,
    origem = ORIGEM,
    autenticado = false,
    autorizacao = null,
  } = opcoes;
  const cabecalhos = { ...headers };
  if (origem) cabecalhos.Origin = origem;
  if (autorizacao) cabecalhos.Authorization = autorizacao;
  else if (autenticado) cabecalhos.Authorization = `Bearer jwt-de-teste`;
  let payload;
  if (body !== undefined) {
    cabecalhos['Content-Type'] = 'application/json';
    payload = typeof body === 'string' ? body : JSON.stringify(body);
  }
  const resposta = await fetch(`${FUNCAO}/`, { method: metodo, headers: cabecalhos, body: payload });
  const texto = await resposta.text();
  let jsonCorpo = null;
  try {
    jsonCorpo = texto ? JSON.parse(texto) : null;
  } catch {
    jsonCorpo = null;
  }
  return { status: resposta.status, headers: resposta.headers, texto, json: jsonCorpo };
}


async function principal() {
  console.log('=============================================================');
  console.log(' EDGE FUNCTION — TESTE HTTP NO RUNTIME DENO (stub local)');
  console.log('=============================================================');

  await new Promise((resolve, reject) => {
    stub.once('error', reject);
    stub.listen(STUB_PORTA, '127.0.0.1', resolve);
  });

  // ── Fase A: integração DESLIGADA (estado padrão do repositório) ───────────
  console.log('\n── Fase A · geração desligada (sem flag/chave)');
  const subiu = await subirFuncao();
  afirmar(subiu, 'Edge Function iniciou no runtime Deno e respondeu HTTP');
  if (!subiu) return 1;

  const preflightOk = await chamar('OPTIONS', {
    headers: {
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization,content-type',
    },
  });
  afirmar(preflightOk.status === 204, 'preflight OPTIONS retorna 204', `status ${preflightOk.status}`);
  afirmar(
    preflightOk.headers.get('access-control-allow-origin') === ORIGEM,
    'CORS ecoa a origem local permitida',
    preflightOk.headers.get('access-control-allow-origin') ?? 'ausente'
  );
  afirmar(
    (preflightOk.headers.get('access-control-allow-headers') ?? '').includes('authorization'),
    'CORS permite o header Authorization'
  );
  afirmar(
    (preflightOk.headers.get('access-control-allow-headers') ?? '').includes('x-csrf-token'),
    'CORS permite o header X-CSRF-Token'
  );

  const preflightNegado = await chamar('OPTIONS', { origem: 'https://invasor.example' });
  afirmar(preflightNegado.status === 403, 'preflight de origem não autorizada retorna 403');

  const get = await chamar('GET', { origem: null });
  afirmar(get.status === 405, 'GET retorna 405 (método não permitido)', `status ${get.status}`);

  const semOrigem = await chamar('POST', { origem: null, body: CORPO_VALIDO });
  afirmar(semOrigem.status === 403, 'POST sem Origin/Referer é barrado pelo CSRF', `status ${semOrigem.status}`);

  const semAuth = await chamar('POST', { body: CORPO_VALIDO });
  afirmar(semAuth.status === 401, 'POST sem Authorization retorna 401', `status ${semAuth.status}`);
  afirmar(semAuth.json?.error === 'NAO_AUTENTICADO', 'corpo do 401 identifica NAO_AUTENTICADO');

  const jsonInvalido = await chamar('POST', { autenticado: true, body: '{ nao-e-json' });
  afirmar(jsonInvalido.status === 400, 'JSON inválido retorna 400', `status ${jsonInvalido.status}`);

  const corpoVazio = await chamar('POST', { autenticado: true, body: {} });
  afirmar(corpoVazio.status === 422, 'corpo sem identificadores retorna 422', `status ${corpoVazio.status}`);
  afirmar(corpoVazio.json?.error?.code === 'DADOS_INVALIDOS', 'código DADOS_INVALIDOS no 422');

  const tipoInvalido = await chamar('POST', {
    autenticado: true,
    body: { ...CORPO_VALIDO, content_type: 'training_session' },
  });
  afirmar(tipoInvalido.status === 422, 'turma/certificado NÃO é aceito para geração (422)');

  const desligado = await chamar('POST', { autenticado: true, body: CORPO_VALIDO });
  afirmar(desligado.status === 503, 'integração desligada retorna 503', `status ${desligado.status}`);
  afirmar(desligado.json?.motivo === 'integracao_desativada', 'motivo integracao_desativada');
  afirmar(
    /TRAINING_IMAGE_GENERATION_ENABLED/.test(desligado.json?.detalhe ?? ''),
    'detalhe explica a flag ausente'
  );
  afirmar(
    desligado.headers.get('access-control-allow-origin') === ORIGEM,
    'resposta 503 mantém os headers de CORS'
  );
  afirmar(desligado.headers.get('cache-control') === 'no-store', 'resposta é no-store');
  afirmar(!/sk-[A-Za-z0-9]/i.test(desligado.texto), 'nenhuma chave aparece na resposta');

  // ── Fase B0: allowlist obrigatória quando a geração está ligada ───────────
  console.log('\n── Fase B0 · allowlist temporária obrigatória');
  modoVinculo = 'presente';
  conteudoCurso = null;
  capaExistente = null;

  const subiuSemEmpresa = await subirFuncao({
    TRAINING_IMAGE_GENERATION_ENABLED: 'true',
    OPENAI_API_KEY: 'sk-ficticia-apenas-para-teste-nao-usar',
    TRAINING_IMAGE_ALLOWED_EMPRESA_ID: '',
    TRAINING_IMAGE_ALLOWED_CONTENT_ID: CURSO,
  });
  afirmar(subiuSemEmpresa, 'função reiniciou sem a variável de empresa');
  rpc.rateLimit = 0;
  rpc.claim = 0;
  const semEmpresa = await chamar('POST', { autenticado: true, body: CORPO_VALIDO });
  afirmar(
    semEmpresa.status === 503 && semEmpresa.json?.motivo === 'allowlist_nao_configurada',
    'variável de empresa ausente bloqueia a geração (503)',
    `status ${semEmpresa.status}`
  );
  afirmar(
    rpc.rateLimit === 0 && rpc.claim === 0,
    'bloqueio por empresa ausente não consome quota nem claim'
  );

  const subiuSemCurso = await subirFuncao({
    TRAINING_IMAGE_GENERATION_ENABLED: 'true',
    OPENAI_API_KEY: 'sk-ficticia-apenas-para-teste-nao-usar',
    TRAINING_IMAGE_ALLOWED_EMPRESA_ID: EMPRESA,
    TRAINING_IMAGE_ALLOWED_CONTENT_ID: '',
  });
  afirmar(subiuSemCurso, 'função reiniciou sem a variável de curso');
  rpc.rateLimit = 0;
  rpc.claim = 0;
  const semCurso = await chamar('POST', { autenticado: true, body: CORPO_VALIDO });
  afirmar(
    semCurso.status === 503 && semCurso.json?.motivo === 'allowlist_nao_configurada',
    'variável de curso ausente bloqueia a geração (503)',
    `status ${semCurso.status}`
  );
  afirmar(
    rpc.rateLimit === 0 && rpc.claim === 0,
    'bloqueio por curso ausente não consome quota nem claim'
  );

  const subiuSemAmbos = await subirFuncao({
    TRAINING_IMAGE_GENERATION_ENABLED: 'true',
    OPENAI_API_KEY: 'sk-ficticia-apenas-para-teste-nao-usar',
    TRAINING_IMAGE_ALLOWED_EMPRESA_ID: '',
    TRAINING_IMAGE_ALLOWED_CONTENT_ID: '',
  });
  afirmar(subiuSemAmbos, 'função reiniciou sem as duas variáveis');
  rpc.rateLimit = 0;
  rpc.claim = 0;
  const semAmbos = await chamar('POST', { autenticado: true, body: CORPO_VALIDO });
  afirmar(
    semAmbos.status === 503 && semAmbos.json?.motivo === 'allowlist_nao_configurada',
    'allowlist totalmente ausente bloqueia a geração (503)',
    `status ${semAmbos.status}`
  );
  afirmar(
    rpc.rateLimit === 0 && rpc.claim === 0,
    'bloqueio por allowlist ausente não consome quota nem claim'
  );

  // ── Fase B: flag ligada + allowlist + chave FICTÍCIA (sem chamada paga) ───
  console.log('\n── Fase B · flag ligada, allowlist, chave fictícia, sem vínculo');
  modoVinculo = 'nenhum';
  const subiuB = await subirFuncao({
    TRAINING_IMAGE_GENERATION_ENABLED: 'true',
    OPENAI_API_KEY: 'sk-ficticia-apenas-para-teste-nao-usar',
    ...ALLOWLIST_ENV,
  });
  afirmar(subiuB, 'função reiniciou com a flag ligada');

  const semVinculo = await chamar('POST', { autenticado: true, body: CORPO_VALIDO });
  afirmar(
    semVinculo.status === 403,
    'usuário sem vínculo com a empresa recebe 403',
    `status ${semVinculo.status}`
  );
  afirmar(semVinculo.json?.error === 'SEM_ACESSO_A_EMPRESA', 'código SEM_ACESSO_A_EMPRESA');

  // Usuário com vínculo, mas sem papel admin/RH: a autorização existente vence.
  modoVinculo = 'sem_papel';
  rpc.rateLimit = 0;
  rpc.claim = 0;
  const semPapel = await chamar('POST', { autenticado: true, body: CORPO_VALIDO });
  afirmar(
    semPapel.status === 403 && semPapel.json?.error === 'SEM_PERMISSAO_PARA_GERAR',
    'usuário sem papel admin/RH é rejeitado mesmo com allowlist válida',
    `status ${semPapel.status}`
  );
  afirmar(
    rpc.rateLimit === 0 && rpc.claim === 0,
    'usuário sem papel não consome quota nem claim'
  );

  // ── Fase C0: allowlist bloqueia empresa/curso diferentes ──────────────────
  console.log('\n── Fase C0 · allowlist bloqueia empresa/curso diferentes');
  modoVinculo = 'presente';
  conteudoCurso = null;
  capaExistente = null;
  rpc.rateLimit = 0;
  rpc.claim = 0;

  const empresaFora = await chamar('POST', {
    autenticado: true,
    body: { ...CORPO_VALIDO, empresa_id: OUTRA_EMPRESA },
  });
  afirmar(
    empresaFora.status === 403 && empresaFora.json?.motivo === 'fora_da_allowlist',
    'empresa diferente retorna 403 fora_da_allowlist',
    `status ${empresaFora.status}`
  );
  afirmar(
    rpc.rateLimit === 0 && rpc.claim === 0,
    'empresa fora da allowlist não consome quota nem claim'
  );

  const cursoFora = await chamar('POST', {
    autenticado: true,
    body: { ...CORPO_VALIDO, content_id: OUTRO_CURSO },
  });
  afirmar(
    cursoFora.status === 403 && cursoFora.json?.motivo === 'fora_da_allowlist',
    'curso diferente retorna 403 fora_da_allowlist',
    `status ${cursoFora.status}`
  );
  afirmar(
    rpc.rateLimit === 0 && rpc.claim === 0,
    'curso fora da allowlist não consome quota nem claim'
  );

  console.log('\n── Fase C · vínculo válido, conteúdo inexistente (stub)');
  modoVinculo = 'presente';
  const inexistente = await chamar('POST', { autenticado: true, body: CORPO_VALIDO });
  afirmar(
    inexistente.status === 404,
    'conteúdo inexistente/de outra empresa retorna 404',
    `status ${inexistente.status}`
  );
  afirmar(inexistente.json?.error === 'CONTEUDO_INEXISTENTE', 'código CONTEUDO_INEXISTENTE');
  afirmar(
    inexistente.headers.get('access-control-allow-origin') === ORIGEM,
    'resposta 404 mantém os headers de CORS'
  );
  afirmar(
    rpc.rateLimit === 0 && rpc.claim === 0,
    'allowlist permitida chega à checagem de conteúdo sem consumir quota/claim'
  );

  // ── Fase D: idempotência x quota (solicitação duplicada não gasta o limite) ─
  console.log('\n── Fase D · idempotência NÃO consome quota de geração');
  conteudoCurso = {
    id: CURSO,
    empresa_id: EMPRESA,
    nome: 'Curso A',
    descricao: 'Curso da empresa A',
    categoria: 'Segurança',
    modalidade: 'online',
    carga_horaria: 4,
    obrigatorio: true,
  };
  capaExistente = null;
  rpc.claim = 0;
  rpc.rateLimit = 0;

  const primeiraGeracao = await chamar('POST', { autenticado: true, body: CORPO_VALIDO });
  afirmar(
    primeiraGeracao.status === 200 && primeiraGeracao.json?.motivo === 'ja_processado',
    'primeira solicitação chega ao claim (stub) e devolve ja_processado',
    `status ${primeiraGeracao.status}`
  );
  afirmar(rpc.rateLimit === 1, 'primeira solicitação consumiu 1 unidade de quota');
  afirmar(rpc.claim === 1, 'claim SQL foi chamado uma vez');
  afirmar(
    typeof ultimoHashReivindicado === 'string' && ultimoHashReivindicado.length >= 8,
    'content_hash é calculado no servidor e enviado ao claim'
  );

  capaExistente = {
    status: 'succeeded',
    content_hash: ultimoHashReivindicado,
    requested_at: new Date().toISOString(),
    attempts: 1,
    last_error: null,
  };
  const duplicada = await chamar('POST', { autenticado: true, body: CORPO_VALIDO });
  afirmar(
    duplicada.status === 200 && duplicada.json?.motivo === 'ja_processado',
    'solicitação duplicada devolve ja_processado'
  );
  afirmar(rpc.rateLimit === 1, 'duplicada NÃO consumiu quota adicional');
  afirmar(rpc.claim === 1, 'duplicada NÃO chegou ao claim');

  capaExistente = {
    status: 'pending',
    content_hash: ultimoHashReivindicado,
    requested_at: new Date().toISOString(),
    attempts: 1,
    last_error: null,
  };
  const emAndamento = await chamar('POST', { autenticado: true, body: CORPO_VALIDO });
  afirmar(
    emAndamento.status === 202 && emAndamento.json?.motivo === 'em_processamento',
    'trabalho em andamento devolve 202'
  );
  afirmar(rpc.rateLimit === 1, 'trabalho em andamento NÃO consumiu quota adicional');

  capaExistente = {
    status: 'failed',
    content_hash: ultimoHashReivindicado,
    requested_at: new Date().toISOString(),
    attempts: 3,
    last_error: 'resultado_desconhecido: tempo limite na geracao',
  };
  const incerto = await chamar('POST', { autenticado: true, body: CORPO_VALIDO });
  afirmar(
    incerto.status === 409 && incerto.json?.motivo === 'resultado_desconhecido',
    'resultado desconhecido exige reconciliação (409), sem reenvio automático'
  );
  afirmar(rpc.rateLimit === 1, 'estado de incerteza NÃO consumiu quota adicional');

  capaExistente = {
    status: 'failed',
    content_hash: ultimoHashReivindicado,
    requested_at: new Date().toISOString(),
    attempts: 3,
    last_error: 'falha no provedor',
  };
  const esgotado = await chamar('POST', { autenticado: true, body: CORPO_VALIDO });
  afirmar(
    esgotado.status === 409 && esgotado.json?.motivo === 'limite_de_tentativas',
    'erro permanente esgotado bloqueia novas cobranças (409)'
  );
  afirmar(rpc.rateLimit === 1, 'bloqueio por tentativas NÃO consumiu quota');

  capaExistente = {
    status: 'succeeded',
    content_hash: 'hash-de-uma-versao-antiga',
    requested_at: new Date().toISOString(),
    attempts: 1,
    last_error: null,
  };
  const editado = await chamar('POST', { autenticado: true, body: CORPO_VALIDO });
  afirmar(editado.status === 200, 'conteúdo editado (hash diferente) é processado');
  afirmar(rpc.rateLimit === 2, 'conteúdo editado consome quota (é uma nova geração)');

  // ── Fase E: worker automático (fila) — desligado por padrão ───────────────
  console.log('\n── Fase E · worker automático (fila persistente)');
  const DISPATCH = 'supabase/functions/training-image-dispatch/index.ts';

  const worker = await subirFuncao({ TRAINING_IMAGE_DISPATCH_SECRET: 'segredo-cron-teste' }, DISPATCH);
  afirmar(worker, 'worker iniciou no runtime Deno');

  const semCredencial = await chamar('POST', { origem: null, body: {} });
  afirmar(semCredencial.status === 401, 'worker sem credencial retorna 401', `status ${semCredencial.status}`);
  afirmar(semCredencial.json?.error === 'NAO_AUTORIZADO', 'código NAO_AUTORIZADO');

  const getWorker = await chamar('GET', { origem: null });
  afirmar(getWorker.status === 405, 'worker recusa GET (405)', `status ${getWorker.status}`);

  rpc.fila = 0;
  const desligadoFila = await chamar('POST', {
    headers: { 'X-Cron-Secret': 'segredo-cron-teste' },
    body: {},
  });
  afirmar(desligadoFila.status === 503, 'worker desligado responde 503', `status ${desligadoFila.status}`);
  afirmar(desligadoFila.json?.motivo === 'autoqueue_desativado', 'motivo autoqueue_desativado');
  afirmar(desligadoFila.json?.fila_preservada === true, 'fila é preservada (nada é perdido)');
  afirmar(rpc.fila === 0, 'flag desligada NÃO reivindica a fila');
  afirmar(!/sk-[A-Za-z0-9]{6,}/.test(desligadoFila.texto), 'worker não expõe chave');

  const workerOn = await subirFuncao(
    {
      TRAINING_IMAGE_DISPATCH_SECRET: 'segredo-cron-teste',
      TRAINING_IMAGE_AUTOQUEUE_ENABLED: 'true',
      TRAINING_IMAGE_GENERATION_ENABLED: 'true',
      OPENAI_API_KEY: 'sk-ficticia-worker-nao-usar',
    },
    DISPATCH
  );
  afirmar(workerOn, 'worker reiniciou com as flags ligadas');

  rpc.fila = 0;
  const loteVazio = await chamar('POST', {
    headers: { 'X-Cron-Secret': 'segredo-cron-teste' },
    body: {},
  });
  afirmar(
    loteVazio.status === 200 && loteVazio.json?.processados === 0,
    'worker com fila vazia processa 0 e não chama o provedor',
    `status ${loteVazio.status}`
  );
  afirmar(rpc.fila === 1, 'worker reivindica a fila quando as flags estão ligadas');

  const viaServiceRole = await chamar('POST', {
    autorizacao: 'Bearer chave-service-de-teste',
    body: {},
  });
  afirmar(viaServiceRole.status === 200, 'service role autoriza o worker (agendador)');

  // ── Fase F: quota e recuperação no worker automático ──────────────────────
  console.log('\n── Fase F · quota aplicada ao worker e recuperação segura');
  conteudoCurso = {
    id: CURSO,
    empresa_id: EMPRESA,
    nome: 'Curso A',
    descricao: 'Curso da empresa A',
    categoria: 'Segurança',
    modalidade: 'online',
    carga_horaria: 4,
    obrigatorio: true,
  };
  conteudoTrilha = null;
  capaExistente = null;

  // F1 — quota da empresa esgotada: devolve à fila com adiamento, sem provedor.
  rpcAllowed = false;
  rpcReason = 'empresa';
  filaLote = [
    {
      id: 'req-f1',
      empresa_id: EMPRESA,
      content_type: 'course',
      content_id: CURSO,
      requested_by: USUARIO,
      attempts: 1,
    },
  ];
  rpc.finish = [];
  rpc.rateLimit = 0;
  rpc.claim = 0;

  const quotaNegada = await chamar('POST', {
    headers: { 'X-Cron-Secret': 'segredo-cron-teste' },
    body: {},
  });
  afirmar(
    quotaNegada.status === 200 && quotaNegada.json?.resultados?.[0]?.status === 'queued',
    'quota esgotada devolve o item à fila (queued)',
    JSON.stringify(quotaNegada.json)
  );
  afirmar(
    quotaNegada.json?.resultados?.[0]?.motivo === 'rate_limit_empresa',
    'motivo rate_limit_empresa'
  );
  afirmar(rpc.rateLimit === 1 && rpc.claim === 0, 'worker NÃO chama o provedor quando a quota estoura');
  afirmar(
    rpc.finish[0]?.p_status === 'queued' && Number(rpc.finish[0]?.p_retry_after_seconds) >= 60,
    'item é adiado (available_at futuro), sem loop imediato'
  );
  afirmar(
    String(rpc.rateLimitBody?.p_usuario_key ?? '').includes(USUARIO),
    'worker aplica o balde do usuário registrado no cadastro'
  );

  // F2 — quota liberada: o worker segue para o claim (idempotência decide).
  rpcAllowed = true;
  rpcReason = null;
  rpc.finish = [];
  rpc.rateLimit = 0;
  rpc.claim = 0;

  const processado = await chamar('POST', {
    headers: { 'X-Cron-Secret': 'segredo-cron-teste' },
    body: {},
  });
  afirmar(
    processado.status === 200 && processado.json?.resultados?.[0]?.status === 'skipped',
    'quota liberada: worker chega ao claim e respeita ja_processado'
  );
  afirmar(rpc.rateLimit === 1 && rpc.claim === 1, 'um consumo de quota e um claim por item');
  afirmar(
    !/sk-[A-Za-z0-9]{6,}/.test(processado.texto),
    'worker não expõe chave na resposta'
  );

  // F3 — recuperação de item interrompido NÃO repete chamada paga.
  rpcAllowed = true;
  filaLote = [
    {
      id: 'req-f3',
      empresa_id: EMPRESA,
      content_type: 'course',
      content_id: CURSO,
      requested_by: USUARIO,
      attempts: 2,
    },
  ];
  capaExistente = {
    id: 'img-recuperada',
    status: 'pending',
    content_hash: 'hash-de-tentativa-anterior',
    requested_at: new Date().toISOString(),
    attempts: 1,
    last_error: null,
  };
  rpc.finish = [];
  rpc.rateLimit = 0;
  rpc.claim = 0;
  rpc.trainingImagesPatch = [];

  const recuperacao = await chamar('POST', {
    headers: { 'X-Cron-Secret': 'segredo-cron-teste' },
    body: {},
  });
  afirmar(
    recuperacao.status === 200 && recuperacao.json?.resultados?.[0]?.status === 'skipped',
    'item recuperado é encerrado como skipped'
  );
  afirmar(
    recuperacao.json?.resultados?.[0]?.motivo?.includes('resultado_desconhecido'),
    'recuperação registra resultado_desconhecido'
  );
  afirmar(
    rpc.trainingImagesPatch.length === 1 &&
      String(rpc.trainingImagesPatch[0]?.last_error ?? '').startsWith('resultado_desconhecido'),
    'linha da imagem marcada como incerteza (attempts esgotado)'
  );
  afirmar(rpc.rateLimit === 0 && rpc.claim === 0, 'recuperação NÃO consome quota nem chama o provedor');

  // F4 — sem requested_by: aplica SOMENTE o teto da empresa (não inventa usuário).
  capaExistente = null;
  filaLote = [
    {
      id: 'req-f4',
      empresa_id: EMPRESA,
      content_type: 'course',
      content_id: CURSO,
      requested_by: null,
      attempts: 1,
    },
  ];
  rpc.finish = [];
  rpc.rateLimit = 0;
  rpc.claim = 0;
  rpc.rateLimitBody = null;

  const semUsuario = await chamar('POST', {
    headers: { 'X-Cron-Secret': 'segredo-cron-teste' },
    body: {},
  });
  afirmar(semUsuario.status === 200, 'worker processa item sem usuário identificado');
  afirmar(
    rpc.rateLimitBody?.p_usuario_key === null && Number(rpc.rateLimitBody?.p_usuario_limit) === 0,
    'sem usuário confiável, apenas o balde da empresa é enviado'
  );
  afirmar(rpc.rateLimit === 1 && rpc.claim === 1, 'teto da empresa continua sendo aplicado');

  // F5 — trilha segue o mesmo caminho (learning_path).
  conteudoCurso = null;
  conteudoTrilha = {
    id: TRILHA,
    empresa_id: EMPRESA,
    nome: 'Trilha A',
    descricao: 'Trilha da empresa A',
    nivel: 'basico',
  };
  filaLote = [
    {
      id: 'req-f5',
      empresa_id: EMPRESA,
      content_type: 'learning_path',
      content_id: TRILHA,
      requested_by: USUARIO,
      attempts: 1,
    },
  ];
  rpc.finish = [];
  rpc.rateLimit = 0;
  rpc.claim = 0;

  const trilhaWorker = await chamar('POST', {
    headers: { 'X-Cron-Secret': 'segredo-cron-teste' },
    body: {},
  });
  afirmar(
    trilhaWorker.status === 200 && trilhaWorker.json?.resultados?.[0]?.content_type === 'learning_path',
    'worker processa trilha pelo mesmo pipeline'
  );
  afirmar(rpc.claim === 1, 'trilha passa pelo claim SQL');

  // Restaura estado para não afetar encerramento.
  filaLote = [];
  rpcAllowed = true;
  rpcReason = null;

  matarFuncao();
  return falhas.length === 0 ? 0 : 1;
}

principal()
  .then((codigo) => {
    matarFuncao();
    stub.close();
    console.log('\n=============================================================');
    if (codigo === 0) {
      console.log(` RESULTADO: ${passos.length} VERIFICAÇÕES HTTP PASSARAM`);
      console.log(' (runtime Deno real · stub local · nenhuma chamada à OpenAI)');
    } else {
      console.log(` RESULTADO: ${falhas.length} FALHA(S)`);
      for (const falha of falhas) console.log(`  - ${falha}`);
    }
    console.log('=============================================================');
    process.exit(codigo);
  })
  .catch((erro) => {
    matarFuncao();
    stub.close();
    console.error(erro);
    process.exit(1);
  });
