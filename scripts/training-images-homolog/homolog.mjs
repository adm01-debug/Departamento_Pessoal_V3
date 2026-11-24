#!/usr/bin/env node
/**
 * =============================================================================
 * ROTEIRO DE HOMOLOGAÇÃO ISOLADA — Hub de imagens
 * =============================================================================
 * Executa testes de API (Auth, RLS, Storage, fila, worker, backfill) contra um
 * projeto Supabase DEDICADO de homologação. NÃO chama a OpenAI (flags desligadas
 * e nenhuma chave é usada) e NÃO aplica migrations.
 *
 * SEGURANÇAS
 *   • exige HOMOLOG_CONFIRM=SIM;
 *   • exige HOMOLOG_PROJECT_REF presente na URL;
 *   • recusa rodar se o ref for igual ao project_id de supabase/config.toml.
 *
 * Uso: ver docs/treinamentos-imagens-homologacao.md §5.
 * =============================================================================
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';

const CONFIRM = process.env.HOMOLOG_CONFIRM ?? '';
const URL_BASE = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
const ANON = process.env.SUPABASE_ANON_KEY ?? '';
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const PROJECT_REF = process.env.HOMOLOG_PROJECT_REF ?? '';
const CRON_SECRET = process.env.HOMOLOG_CRON_SECRET ?? '';
const SENHA = process.env.HOMOLOG_PASSWORD ?? 'Homolog#2026-teste';
const CLEANUP = process.env.HOMOLOG_CLEANUP === 'SIM';

const EMPRESA_A = 'd0000001-0000-4000-8000-000000000001';
const EMPRESA_B = 'd0000002-0000-4000-8000-000000000002';
const CURSO_A = 'd0000010-0000-4000-8000-000000000010';
const CURSO_A2 = 'd0000011-0000-4000-8000-000000000011';
const CURSO_B = 'd0000012-0000-4000-8000-000000000012';
const CURSO_ANTIGO = 'd0000013-0000-4000-8000-000000000013';
const TRILHA_A = 'd0000014-0000-4000-8000-000000000014';
const IMAGEM_A = 'd0000020-0000-4000-8000-000000000020';
const EMAIL_A = 'homolog.a@exemplo.local';
const EMAIL_B = 'homolog.b@exemplo.local';

const FIXTURE_PNG = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  )
);

const resultado = { aprovado: [], pendente: [], falha: [], dados: {} };
const empresa = { A: { ...dadosEmpresa(EMPRESA_A, EMAIL_A), token: null, userId: null },
                  B: { ...dadosEmpresa(EMPRESA_B, EMAIL_B), token: null, userId: null } };

function dadosEmpresa(id, email) {
  return { id, email, nome: `Empresa Homolog ${id === EMPRESA_A ? 'A' : 'B'}` };
}

function ok(nome, detalhe) {
  resultado.aprovado.push({ nome, detalhe });
  console.log(`   PASS — ${nome}`);
}
function falhou(nome, detalhe) {
  resultado.falha.push({ nome, detalhe: String(detalhe ?? '') });
  console.log(`   FALHOU — ${nome}${detalhe ? ` (${detalhe})` : ''}`);
}
function pendente(nome, detalhe) {
  resultado.pendente.push({ nome, detalhe });
  console.log(`   PENDENTE — ${nome}${detalhe ? ` (${detalhe})` : ''}`);
}
function conferir(condicao, nome, detalhe) {
  if (condicao) ok(nome, detalhe);
  else falhou(nome, detalhe);
}

async function api(caminho, opcoes = {}) {
  const { method = 'GET', token = null, service = false, body, headers = {} } = opcoes;
  const chave = service ? SERVICE : ANON;
  const resposta = await fetch(`${URL_BASE}${caminho}`, {
    method,
    headers: {
      apikey: chave,
      ...(token ? { Authorization: `Bearer ${token}` } : service ? { Authorization: `Bearer ${SERVICE}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const texto = await resposta.text();
  let json = null;
  try {
    json = texto ? JSON.parse(texto) : null;
  } catch {
    json = null;
  }
  return { status: resposta.status, headers: resposta.headers, texto, json };
}

async function rpc(nome, args) {
  return api(`/rest/v1/rpc/${nome}`, { method: 'POST', service: true, body: args ?? {} });
}

async function upsert(tabela, registros, onConflict = 'id') {
  return api(`/rest/v1/${tabela}?on_conflict=${onConflict}`, {
    method: 'POST',
    service: true,
    body: registros,
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
  });
}

async function criarOuBuscarUsuario(email) {
  const criado = await api('/auth/v1/admin/users', {
    method: 'POST',
    service: true,
    body: { email, password: SENHA, email_confirm: true },
  });
  if (criado.status === 200 || criado.status === 201) return criado.json?.id ?? criado.json?.user?.id ?? null;

  const lista = await api('/auth/v1/admin/users?page=1&per_page=200', { service: true });
  const usuarios = lista.json?.users ?? [];
  return usuarios.find((u) => u.email === email)?.id ?? null;
}

async function login(email) {
  const resposta = await api('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email, password: SENHA },
  });
  return resposta.status === 200 ? resposta.json?.access_token ?? null : null;
}

function refDeConfig() {
  try {
    const conteudo = readFileSync('supabase/config.toml', 'utf8');
    return conteudo.match(/project_id\s*=\s*"([^"]+)"/)?.[1] ?? '';
  } catch {
    return '';
  }
}

async function uploadStorage(caminho, token) {
  return fetch(`${URL_BASE}/storage/v1/object/training-images/${caminho}`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'image/png',
      'x-upsert': 'true',
    },
    body: FIXTURE_PNG,
  });
}

async function urlAssinada(caminho, token) {
  const resposta = await fetch(`${URL_BASE}/storage/v1/object/sign/training-images/${caminho}`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expiresIn: 600 }),
  });
  let json = null;
  try {
    json = await resposta.json();
  } catch {
    json = null;
  }
  if (resposta.status !== 200 || !json?.signedURL) return { status: resposta.status, url: null };
  const assinada = json.signedURL.startsWith('http')
    ? json.signedURL
    : `${URL_BASE}/storage/v1${json.signedURL.startsWith('/') ? '' : '/'}${json.signedURL}`;
  return { status: 200, url: assinada };
}

async function principal() {
  const refConfig = refDeConfig();
  if (CONFIRM !== 'SIM') {
    console.error('Recusado: defina HOMOLOG_CONFIRM=SIM (confirmação explícita).');
    return 2;
  }
  if (!URL_BASE || !ANON || !SERVICE || !PROJECT_REF) {
    console.error('Recusado: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY e HOMOLOG_PROJECT_REF são obrigatórios.');
    return 2;
  }
  if (!URL_BASE.includes(PROJECT_REF)) {
    console.error('Recusado: SUPABASE_URL não contém HOMOLOG_PROJECT_REF.');
    return 2;
  }
  if (refConfig && PROJECT_REF === refConfig) {
    console.error('Recusado: o ref informado é o MESMO de supabase/config.toml (produção).');
    return 2;
  }

  console.log('=============================================================');
  console.log(' HOMOLOGAÇÃO ISOLADA — Hub de imagens');
  console.log(` projeto ${PROJECT_REF} · nenhuma chamada à OpenAI`);
  console.log('=============================================================');

  // 1. Conectividade
  console.log('\n── 1. Conectividade e infraestrutura');
  const ping = await api('/rest/v1/empresas?select=id&limit=1', { service: true });
  conferir(ping.status === 200, 'projeto responde ao PostgREST', `status ${ping.status}`);
  const bucket = await api('/storage/v1/bucket/training-images', { service: true });
  conferir(bucket.status === 200 && bucket.json?.public === false, 'bucket training-images é privado', `status ${bucket.status}`);
  const tabela = await api('/rest/v1/training_image_requests?select=id&limit=1', { service: true });
  conferir(tabela.status === 200, 'tabela da fila existe (migrations aplicadas)', `status ${tabela.status}`);

  // 2. Empresas e usuários fictícios
  console.log('\n── 2. Empresas e usuários fictícios');
  const empresas = await upsert('empresas', [
    { id: EMPRESA_A, nome: empresa.A.nome },
    { id: EMPRESA_B, nome: empresa.B.nome },
  ]);
  conferir([200, 201, 204].includes(empresas.status), 'empresas fictícias criadas/atualizadas', `status ${empresas.status}`);

  for (const lado of ['A', 'B']) {
    const dados = empresa[lado];
    dados.userId = await criarOuBuscarUsuario(dados.email);
    conferir(Boolean(dados.userId), `usuário ${dados.email} disponível`);
    if (!dados.userId) continue;
    await upsert('user_empresas', [{ user_id: dados.userId, empresa_id: dados.id }], 'user_id,empresa_id');
    await upsert('user_roles', [{ user_id: dados.userId, role: 'admin' }], 'user_id,role');
    dados.token = await login(dados.email);
    conferir(Boolean(dados.token), `login real de ${dados.email}`);
  }



  // 3. Conteúdo fictício
  console.log('\n── 3. Conteúdo fictício');
  await upsert('catalogo_cursos', [
    { id: CURSO_A, empresa_id: EMPRESA_A, nome: 'Curso Homolog A', descricao: 'Fixture', categoria: 'Teste', modalidade: 'online', carga_horaria: 2, obrigatorio: true },
    { id: CURSO_A2, empresa_id: EMPRESA_A, nome: 'Curso Homolog A2', descricao: 'Fila', categoria: 'Teste', modalidade: 'online', carga_horaria: 2, obrigatorio: false },
    { id: CURSO_B, empresa_id: EMPRESA_B, nome: 'Curso Homolog B', descricao: 'Outro tenant', categoria: 'Teste', modalidade: 'online', carga_horaria: 2, obrigatorio: false },
  ]);
  await upsert('trilhas_aprendizado', [
    { id: TRILHA_A, empresa_id: EMPRESA_A, nome: 'Trilha Homolog A', descricao: 'Fila', nivel: 'basico' },
  ]);
  ok('cursos e trilha fictícios disponíveis');

  // 4. RLS
  console.log('\n── 4. Isolamento entre empresas (RLS)');
  const leituraCruzada = await api(`/rest/v1/training_images?select=id&empresa_id=eq.${EMPRESA_B}`, {
    token: empresa.A.token,
  });
  conferir(
    leituraCruzada.status === 200 && Array.isArray(leituraCruzada.json) && leituraCruzada.json.length === 0,
    'Empresa A não lê capas da Empresa B',
    `status ${leituraCruzada.status}`
  );
  const escritaNavegador = await api('/rest/v1/training_images', {
    method: 'POST',
    token: empresa.A.token,
    body: {
      empresa_id: EMPRESA_A,
      content_type: 'course',
      content_id: CURSO_A,
      storage_path: `${EMPRESA_A}/courses/${CURSO_A}/cover.png`,
      status: 'pending',
      provider: 'x',
      attempts: 1,
    },
    headers: { Prefer: 'return=minimal' },
  });
  conferir(
    [401, 403].includes(escritaNavegador.status),
    'authenticated NÃO escreve em training_images',
    `status ${escritaNavegador.status}`
  );

  // 5. Storage
  console.log('\n── 5. Storage privado, cross-tenant e URL assinada');
  const caminhoA = `${EMPRESA_A}/courses/${CURSO_A}/cover.png`;
  const caminhoB = `${EMPRESA_B}/courses/${CURSO_B}/cover.png`;
  const uploadA = await uploadStorage(caminhoA, empresa.A.token);
  conferir([200, 201].includes(uploadA.status), 'upload no prefixo da própria empresa', `status ${uploadA.status}`);
  const uploadCruzado = await uploadStorage(caminhoB, empresa.A.token);
  conferir([400, 403].includes(uploadCruzado.status), 'upload cross-tenant bloqueado', `status ${uploadCruzado.status}`);

  const assinaturaA = await urlAssinada(caminhoA, empresa.A.token);
  conferir(Boolean(assinaturaA.url), 'URL assinada para o próprio objeto', `status ${assinaturaA.status}`);
  const assinaturaCruzada = await urlAssinada(caminhoB, empresa.A.token);
  conferir(!assinaturaCruzada.url, 'Empresa A não assina objeto da Empresa B', `status ${assinaturaCruzada.status}`);

  // 6. Fixture de capa (provedor simulado, sem OpenAI)
  console.log('\n── 6. Fixture de capa simulada + leitura');
  await upsert('training_images', [
    {
      id: IMAGEM_A,
      empresa_id: EMPRESA_A,
      content_type: 'course',
      content_id: CURSO_A,
      storage_path: caminhoA,
      content_hash: 'homolog-fixture-0001',
      status: 'succeeded',
      provider: 'simulado-teste',
      model: 'fixture-local',
      attempts: 1,
    },
  ]);
  const leituraImagem = await api(
    `/rest/v1/training_images?id=eq.${IMAGEM_A}&select=storage_path,provider,status`,
    { token: empresa.A.token }
  );
  conferir(
    leituraImagem.status === 200 && leituraImagem.json?.[0]?.provider === 'simulado-teste',
    'Empresa A lê a própria capa simulada',
    `status ${leituraImagem.status}`
  );
  if (assinaturaA.url) {
    const bytes = await fetch(assinaturaA.url);
    const buffer = new Uint8Array(await bytes.arrayBuffer());
    const png = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    conferir(bytes.status === 200 && png, 'URL assinada devolve o PNG da fixture', `status ${bytes.status}`);
  } else {
    pendente('Download da fixture', 'sem URL assinada');
  }
  resultado.dados.caminhoCapa = caminhoA;


  // 7. Fila automática (flag desligada/ligada + requested_by)
  console.log('\n── 7. Fila automática');
  await rpc('set_training_image_autoqueue', { p_enabled: false });
  const cursoOff = 'd0000016-0000-4000-8000-000000000016';
  const cursoFila = 'd0000017-0000-4000-8000-000000000017';

  const inserirCurso = (id, nome) =>
    api('/rest/v1/catalogo_cursos', {
      method: 'POST',
      token: empresa.A.token,
      body: { id, empresa_id: EMPRESA_A, nome },
      headers: { Prefer: 'return=minimal' },
    });

  const off = await inserirCurso(cursoOff, 'Curso com fila desligada');
  conferir([201, 204].includes(off.status), 'curso criado com a fila desligada', `status ${off.status}`);
  const semFila = await api(`/rest/v1/training_image_requests?content_id=eq.${cursoOff}&select=id`, {
    service: true,
  });
  conferir(
    semFila.status === 200 && semFila.json?.length === 0,
    'flag desligada NÃO enfileira',
    `status ${semFila.status}`
  );

  await rpc('set_training_image_autoqueue', { p_enabled: true });
  const on = await inserirCurso(cursoFila, 'Curso com fila ligada');
  conferir([201, 204].includes(on.status), 'curso criado com a fila ligada', `status ${on.status}`);
  const comFila = await api(
    `/rest/v1/training_image_requests?content_id=eq.${cursoFila}&select=id,status,requested_by`,
    { service: true }
  );
  conferir(
    comFila.status === 200 && comFila.json?.length === 1 && comFila.json[0].status === 'queued',
    'flag ligada enfileira exatamente uma solicitação',
    `status ${comFila.status}`
  );
  conferir(
    comFila.json?.[0]?.requested_by === empresa.A.userId,
    'requested_by registra o usuário do JWT',
    String(comFila.json?.[0]?.requested_by)
  );
  await rpc('set_training_image_autoqueue', { p_enabled: false });

  // 8. Worker sem provedor (flags desligadas)
  console.log('\n── 8. Worker (nenhuma geração)');
  const semCredencial = await fetch(`${URL_BASE}/functions/v1/training-image-dispatch`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: '{}',
  });
  conferir(semCredencial.status === 401, 'worker sem credencial retorna 401', `status ${semCredencial.status}`);

  const workerDesligado = await fetch(`${URL_BASE}/functions/v1/training-image-dispatch`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${SERVICE}`,
      ...(CRON_SECRET ? { 'X-Cron-Secret': CRON_SECRET } : {}),
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  const workerJson = await workerDesligado.json().catch(() => null);
  conferir(
    workerDesligado.status === 503 && workerJson?.fila_preservada === true,
    'worker com flags desligadas responde 503 e preserva a fila',
    `status ${workerDesligado.status}`
  );

  // 9. Backfill idempotente
  console.log('\n── 9. Backfill de conteúdo antigo');
  await api('/rest/v1/catalogo_cursos', {
    method: 'POST',
    service: true,
    body: { id: CURSO_ANTIGO, empresa_id: EMPRESA_A, nome: 'Curso antigo sem capa' },
    headers: { Prefer: 'return=minimal' },
  });
  const backfill1 = await rpc('backfill_training_image_requests', { p_limit: 50 });
  const inseridos1 = Number(backfill1.json ?? 0);
  conferir(backfill1.status === 200 && inseridos1 >= 1, 'backfill enfileira conteúdo sem capa', `inseridos ${inseridos1}`);
  const backfill2 = await rpc('backfill_training_image_requests', { p_limit: 50 });
  conferir(Number(backfill2.json ?? -1) === 0, 'backfill é idempotente', `inseridos ${backfill2.json}`);

  // 10. Limpeza opcional
  if (CLEANUP) {
    console.log('\n── 10. Limpeza das fixtures');
    for (const caminho of [caminhoA, caminhoB]) {
      await fetch(`${URL_BASE}/storage/v1/object/training-images/${caminho}`, {
        method: 'DELETE',
        headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
      });
    }
    for (const tabela of ['training_image_requests', 'training_images']) {
      await api(`/rest/v1/${tabela}?id=not.is.null`, { method: 'DELETE', service: true });
    }
    await api(
      `/rest/v1/catalogo_cursos?id=in.(${[CURSO_A, CURSO_A2, CURSO_B, CURSO_ANTIGO, cursoOff, cursoFila].join(',')})`,
      { method: 'DELETE', service: true }
    );
    await api(`/rest/v1/trilhas_aprendizado?id=eq.${TRILHA_A}`, { method: 'DELETE', service: true });
    for (const lado of ['A', 'B']) {
      const dados = empresa[lado];
      if (!dados.userId) continue;
      await api(`/rest/v1/user_empresas?user_id=eq.${dados.userId}`, { method: 'DELETE', service: true });
      await api(`/rest/v1/user_roles?user_id=eq.${dados.userId}`, { method: 'DELETE', service: true });
      await api(`/auth/v1/admin/users/${dados.userId}`, { method: 'DELETE', service: true });
    }
    await api(`/rest/v1/empresas?id=in.(${EMPRESA_A},${EMPRESA_B})`, { method: 'DELETE', service: true });
    ok('fixtures removidas (dados de teste)');
  } else {
    pendente('Limpeza das fixtures', 'defina HOMOLOG_CLEANUP=SIM para remover');
  }

  return resultado.falha.length === 0 ? 0 : 1;
}

principal()
  .then((codigo) => {
    console.log('\n=============================================================');
    console.log(
      ` RESULTADO: ${resultado.aprovado.length} aprovados · ${resultado.pendente.length} pendentes · ${resultado.falha.length} falhas`
    );
    console.log(JSON.stringify(resultado, null, 2));
    console.log('=============================================================');
    process.exit(codigo);
  })
  .catch((erro) => {
    console.error('ERRO FATAL:', erro?.message ?? erro);
    process.exit(1);
  });
