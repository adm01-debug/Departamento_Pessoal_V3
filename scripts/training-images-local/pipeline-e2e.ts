/**
 * =============================================================================
 * FLUXO COMPLETO COM PROVEDOR SIMULADO — PostgreSQL local + "Storage" de arquivo
 * =============================================================================
 * Executa o pipeline REAL (`_shared/trainingImages/pipeline.ts`) contra o banco
 * local isolado:
 *   1. carrega o cadastro escopado pela empresa (SQL);
 *   2. calcula o hash no servidor;
 *   3. chama o `claim_training_image` REAL (SQL atômico);
 *   4. usa o provedor SIMULADO (PNG 1×1 local, nunca OpenAI);
 *   5. valida os bytes (magic bytes/tamanho);
 *   6. grava o arquivo em um "bucket" local (diretório isolado);
 *   7. atualiza `training_images` para succeeded e lê a referência de volta.
 *
 * O bucket do Supabase Storage NÃO é exercitado (o runtime local exige Docker,
 * indisponível nesta máquina). O caminho/limite/mime do bucket são validados
 * pela migration e pelos testes de RLS em PostgreSQL real.
 *
 * Uso (com o banco local do run-tests.mjs em execução):
 *   npx --yes deno run -A scripts/training-images-local/pipeline-e2e.ts
 * =============================================================================
 */
import {
  gerarCapaDeTreinamento,
  hashConteudoServidor,
  TENTATIVAS_MAX_PIPELINE,
  type DepsPipelineCapa,
} from '../../supabase/functions/_shared/trainingImages/pipeline.ts';
import { criarProvedorSimulado } from '../../supabase/functions/_shared/trainingImages/simulatedProvider.ts';
import type { ConteudoTreinamento } from '../../supabase/functions/_shared/trainingImages/types.ts';

const PORTA = Deno.env.get('PGPORT_LOCAL') ?? '55432';
const DB = Deno.env.get('PGDATABASE_LOCAL') ?? 'training_images_test';
const PG_BIN = Deno.env.get('PG_BIN') ?? 'C:\\Program Files\\PostgreSQL\\17\\bin';
const BUCKET_LOCAL = new URL('../../tmp-training-images-pg/storage/', import.meta.url);

const EMPRESA_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const EMPRESA_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const CURSO_A = 'a0000001-0000-4000-8000-000000000001';
const CURSO_B = 'b0000001-0000-4000-8000-000000000001';
const TRILHA_A = 'a0000002-0000-4000-8000-000000000002';
const TURMA_A = 'a0000003-0000-4000-8000-000000000003';
const CERT_A = 'a0000004-0000-4000-8000-000000000004';

const falhas: string[] = [];
const passos: string[] = [];

function q(texto: string): string {
  return `'${texto.replaceAll("'", "''")}'`;
}

/**
 * O psql do Windows envia o argumento `-c` na codepage do console (CP1252), não
 * em UTF-8. Para não corromper mensagens acentuadas no banco local de teste,
 * a harness grava ASCII. Em produção (PostgREST/HTTP) a gravação é UTF-8 normal.
 */
function ascii(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function psql(consulta: string): string {
  const comando = new Deno.Command(`${PG_BIN}\\psql.exe`, {
    args: [
      '-h',
      '127.0.0.1',
      '-p',
      PORTA,
      '-U',
      'postgres',
      '-d',
      DB,
      '-X',
      '-q',
      '-A',
      '-t',
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      consulta,
    ],
    stdout: 'piped',
    stderr: 'piped',
    env: { PGCLIENTENCODING: 'UTF8' },
  });
  const saida = comando.outputSync();
  const texto = new TextDecoder().decode(saida.stdout).trim();
  if (!saida.success) {
    throw new Error(new TextDecoder().decode(saida.stderr).trim());
  }
  return texto;
}

function psqlJson<T>(consulta: string): T | null {
  const texto = psql(consulta);
  return texto ? (JSON.parse(texto) as T) : null;
}

function afirmar(condicao: boolean, mensagem: string): void {
  if (!condicao) {
    falhas.push(mensagem);
    console.log(`   FALHOU — ${mensagem}`);
    return;
  }
  passos.push(mensagem);
  console.log(`   PASS — ${mensagem}`);
}

async function carregarCurso(empresaId: string, contentId: string): Promise<ConteudoTreinamento | null> {
  const linha = psqlJson<Record<string, unknown>>(`
    SELECT row_to_json(t)::text FROM (
      SELECT id, nome, descricao, categoria, modalidade, carga_horaria, obrigatorio, empresa_id
      FROM public.catalogo_cursos
      WHERE id = ${q(contentId)} AND empresa_id = ${q(empresaId)}
    ) t;
  `);
  if (!linha) return null;
  return {
    contentType: 'course',
    contentId: String(linha.id),
    empresaId: String(linha.empresa_id),
    name: String(linha.nome ?? ''),
    description: (linha.descricao as string | null) ?? null,
    category: (linha.categoria as string | null) ?? null,
    modality: (linha.modalidade as string | null) ?? null,
    workloadHours: linha.carga_horaria === null ? null : Number(linha.carga_horaria),
    mandatory: (linha.obrigatorio as boolean | null) ?? null,
  };
}

async function carregarTrilha(empresaId: string, contentId: string): Promise<ConteudoTreinamento | null> {
  const linha = psqlJson<Record<string, unknown>>(`
    SELECT row_to_json(t)::text FROM (
      SELECT id, nome, descricao, nivel, empresa_id
      FROM public.trilhas_aprendizado
      WHERE id = ${q(contentId)} AND empresa_id = ${q(empresaId)}
    ) t;
  `);
  if (!linha) return null;
  return {
    contentType: 'learning_path',
    contentId: String(linha.id),
    empresaId: String(linha.empresa_id),
    name: String(linha.nome ?? ''),
    description: (linha.descricao as string | null) ?? null,
    level: (linha.nivel as string | null) ?? null,
  };
}


function montarDeps(opcoes: {
  provider: ReturnType<typeof criarProvedorSimulado>;
  falhaUpload?: boolean;
}): DepsPipelineCapa {
  return {
    provider: opcoes.provider,
    carregarConteudo: async (entrada) => {
      if (entrada.contentType === 'course') return carregarCurso(entrada.empresaId, entrada.contentId);
      if (entrada.contentType === 'learning_path') return carregarTrilha(entrada.empresaId, entrada.contentId);
      // Turmas e certificados NÃO geram: herdam a capa do curso.
      return null;
    },
    claim: async (dados) => {
      const linha = psql(
        'SELECT reclamado, id, status, attempts FROM public.claim_training_image(' +
          `${q(dados.empresaId)}, ${q(dados.contentType)}, ${q(dados.contentId)}, ` +
          `${q(dados.contentHash)}, ${q(dados.promptVersion)}, ${dados.maxAttempts});`
      );
      const [reclamado, id, status, attempts] = linha.split('|');
      return {
        reclamado: reclamado === 't' || reclamado === 'true',
        id: id || null,
        status: status || null,
        attempts: attempts ? Number(attempts) : null,
      };
    },
    enviarImagem: async ({ bytes, mimeType, empresaId, contentType, contentId, extensao }) => {
      if (opcoes.falhaUpload) throw new Error('storage local indisponível');
      const pasta = contentType === 'course' ? 'courses' : 'learning-paths';
      const caminho = `${empresaId}/${pasta}/${contentId}/cover.${extensao}`;
      const destino = new URL(caminho, BUCKET_LOCAL);
      await Deno.mkdir(new URL('./', destino), { recursive: true });
      await Deno.writeFile(destino, bytes);
      console.log(`   [storage local] ${caminho} · ${bytes.length} bytes · ${mimeType}`);
      return caminho;
    },
    atualizarSucesso: async ({ id, storagePath, provider, model, promptVersion }) => {
      psql(`
        UPDATE public.training_images
           SET status = 'succeeded', storage_path = ${q(storagePath)},
               provider = ${q(provider)}, model = ${q(model)},
               prompt_version = ${q(promptVersion)},
               completed_at = now(), last_error = NULL
         WHERE id = ${q(id)};
      `);
    },
    atualizarFalha: async ({ id, erro, permanente }) => {
      psql(`
        UPDATE public.training_images
           SET status = 'failed', last_error = ${q(ascii(erro))},
               completed_at = now()
               ${permanente ? `, attempts = ${TENTATIVAS_MAX_PIPELINE}` : ''}
         WHERE id = ${q(id)};
      `);
    },
  };
}

function lerRegistro(empresaId: string, contentType: string, contentId: string) {
  return psqlJson<{
    id: string;
    status: string;
    storage_path: string;
    provider: string;
    model: string;
    attempts: number;
    generations: number;
    content_hash: string;
    last_error: string | null;
  }>(`
    SELECT row_to_json(t)::text FROM (
      SELECT id, status, storage_path, provider, model, attempts, generations, content_hash, last_error
      FROM public.training_images
      WHERE empresa_id = ${q(empresaId)} AND content_type = ${q(contentType)}
        AND content_id = ${q(contentId)}
    ) t;
  `);
}

function limpar(empresaId: string, contentId: string): void {
  psql(
    `DELETE FROM public.training_images WHERE empresa_id = ${q(empresaId)} AND content_id = ${q(contentId)};`
  );
}

async function lerBytes(caminho: string): Promise<Uint8Array> {
  return await Deno.readFile(new URL(caminho, BUCKET_LOCAL));
}


const CAMINHO_CURSO = `${EMPRESA_A}/courses/${CURSO_A}/cover.png`;
const CAMINHO_TRILHA = `${EMPRESA_A}/learning-paths/${TRILHA_A}/cover.png`;

async function principal(): Promise<number> {
  console.log('=============================================================');
  console.log(' FLUXO COMPLETO — PROVEDOR SIMULADO + CLAIM SQL REAL');
  console.log('=============================================================');

  limpar(EMPRESA_A, CURSO_A);
  limpar(EMPRESA_A, TRILHA_A);
  limpar(EMPRESA_B, CURSO_B);

  // ── 1. Curso: gera, valida bytes, grava arquivo, marca succeeded, relê ────
  console.log('\n── Curso (course)');
  const providerCurso = criarProvedorSimulado();
  const curso = await gerarCapaDeTreinamento(
    { empresaId: EMPRESA_A, contentType: 'course', contentId: CURSO_A },
    montarDeps({ provider: providerCurso })
  );
  afirmar(curso.gerado === true, 'pipeline gerou a capa do curso');
  afirmar(
    curso.gerado === true && curso.provider === 'simulado-teste' && curso.model === 'fixture-local',
    'provedor identificado como simulado (nunca OpenAI)'
  );
  afirmar(
    curso.gerado === true && curso.storagePath === CAMINHO_CURSO,
    'caminho no padrão {empresa}/courses/{id}/cover.png'
  );

  const registroCurso = lerRegistro(EMPRESA_A, 'course', CURSO_A);
  afirmar(registroCurso?.status === 'succeeded', 'status persistido como succeeded');
  afirmar(registroCurso?.storage_path === CAMINHO_CURSO, 'referência persistida em training_images');
  afirmar(registroCurso?.provider === 'simulado-teste', 'provider rastreável no banco');

  const conteudoCurso = await carregarCurso(EMPRESA_A, CURSO_A);
  afirmar(
    Boolean(conteudoCurso) && registroCurso?.content_hash === hashConteudoServidor(conteudoCurso!),
    'content_hash gravado é o mesmo calculado pelo servidor'
  );

  const bytesCurso = await lerBytes(CAMINHO_CURSO);
  const assinaturaPng =
    bytesCurso[0] === 0x89 && bytesCurso[1] === 0x50 && bytesCurso[2] === 0x4e && bytesCurso[3] === 0x47;
  afirmar(assinaturaPng, 'bytes no Storage local são um PNG válido (magic bytes)');
  afirmar(bytesCurso.length > 0 && bytesCurso.length <= 5 * 1024 * 1024, 'arquivo dentro do limite de 5 MB');

  // ── 2. Idempotência: mesma capa não é regerada ────────────────────────────
  console.log('\n── Duplicidade da mesma solicitação');
  const duplicado = await gerarCapaDeTreinamento(
    { empresaId: EMPRESA_A, contentType: 'course', contentId: CURSO_A },
    montarDeps({ provider: providerCurso })
  );
  afirmar(!duplicado.gerado && duplicado.motivo === 'ja_processado', 'segunda solicitação devolve ja_processado');
  afirmar(providerCurso.chamadas === 1, 'provedor chamado UMA única vez (sem cobrança duplicada)');

  // ── 3. Trilha (learning_path) ─────────────────────────────────────────────
  console.log('\n── Trilha (learning_path)');
  const providerTrilha = criarProvedorSimulado();
  const trilha = await gerarCapaDeTreinamento(
    { empresaId: EMPRESA_A, contentType: 'learning_path', contentId: TRILHA_A },
    montarDeps({ provider: providerTrilha })
  );
  afirmar(trilha.gerado === true, 'pipeline gerou a capa da trilha');
  afirmar(
    trilha.gerado === true && trilha.storagePath === CAMINHO_TRILHA,
    'caminho no padrão {empresa}/learning-paths/{id}/cover.png'
  );
  afirmar((await lerBytes(CAMINHO_TRILHA)).length > 0, 'bytes da trilha gravados no Storage local');

  // ── 4. Turmas e certificados NÃO geram: herdam o curso ────────────────────
  console.log('\n── Herança de turmas e certificados');
  const turma = await gerarCapaDeTreinamento(
    { empresaId: EMPRESA_A, contentType: 'training_session', contentId: TURMA_A },
    montarDeps({ provider: criarProvedorSimulado() })
  );
  const certificado = await gerarCapaDeTreinamento(
    { empresaId: EMPRESA_A, contentType: 'certificate', contentId: CERT_A },
    montarDeps({ provider: criarProvedorSimulado() })
  );
  afirmar(!turma.gerado && turma.motivo === 'conteudo_inexistente', 'turma não gera imagem própria');
  afirmar(
    !certificado.gerado && certificado.motivo === 'conteudo_inexistente',
    'certificado não gera imagem própria'
  );
  afirmar(
    psql(
      "SELECT count(*) FROM public.training_images WHERE content_type IN ('training_session','certificate');"
    ) === '0',
    'nenhuma linha de imagem criada para turma/certificado (herdam o curso)'
  );
  afirmar(
    psql(
      `SELECT count(*) FROM public.training_images WHERE content_type = 'course' AND content_id = '${CURSO_A}';`
    ) === '1',
    'capa do curso permanece a única fonte para turmas/certificados'
  );

  // ── 5. Timeout: resultado pago DESCONHECIDO não é reenviado ───────────────
  console.log('\n── Timeout (resultado desconhecido)');
  const providerTimeout = criarProvedorSimulado({ falha: 'timeout' });
  const timeout = await gerarCapaDeTreinamento(
    { empresaId: EMPRESA_B, contentType: 'course', contentId: CURSO_B },
    montarDeps({ provider: providerTimeout })
  );
  afirmar(!timeout.gerado && timeout.motivo === 'resultado_desconhecido', 'timeout vira resultado_desconhecido');
  const registroTimeout = lerRegistro(EMPRESA_B, 'course', CURSO_B);
  afirmar(
    registroTimeout?.status === 'failed' &&
      String(registroTimeout?.last_error).startsWith('resultado_desconhecido'),
    'estado de incerteza registrado em last_error'
  );
  afirmar(
    registroTimeout?.attempts === TENTATIVAS_MAX_PIPELINE,
    'tentativas esgotadas: não há reenvio pago automático'
  );
  const aposTimeout = await gerarCapaDeTreinamento(
    { empresaId: EMPRESA_B, contentType: 'course', contentId: CURSO_B },
    montarDeps({ provider: providerTimeout })
  );
  afirmar(!aposTimeout.gerado && aposTimeout.motivo === 'limite_de_tentativas', 'retry recusado sem nova chamada');
  afirmar(providerTimeout.chamadas === 1, 'provedor recebeu apenas UMA requisição');

  // ── 6. Falha de upload: imagem já paga não é regerada ─────────────────────
  console.log('\n── Falha de upload');
  const providerUpload = criarProvedorSimulado();
  psql(`DELETE FROM public.training_images WHERE empresa_id = '${EMPRESA_B}' AND content_id = '${CURSO_B}';`);
  const falhaUpload = await gerarCapaDeTreinamento(
    { empresaId: EMPRESA_B, contentType: 'course', contentId: CURSO_B },
    montarDeps({ provider: providerUpload, falhaUpload: true })
  );
  afirmar(!falhaUpload.gerado && falhaUpload.motivo === 'falha_no_upload', 'falha de upload reportada');
  const retryUpload = await gerarCapaDeTreinamento(
    { empresaId: EMPRESA_B, contentType: 'course', contentId: CURSO_B },
    montarDeps({ provider: providerUpload, falhaUpload: true })
  );
  afirmar(
    !retryUpload.gerado && retryUpload.motivo === 'limite_de_tentativas',
    'retry após upload falho é recusado (evita 2ª cobrança)'
  );
  afirmar(providerUpload.chamadas === 1, 'provedor chamado uma única vez no cenário de upload');

  // ── 7. Isolamento entre empresas no pipeline ──────────────────────────────
  console.log('\n── Isolamento entre empresas');
  const providerCruzado = criarProvedorSimulado();
  const cruzado = await gerarCapaDeTreinamento(
    { empresaId: EMPRESA_A, contentType: 'course', contentId: CURSO_B },
    montarDeps({ provider: providerCruzado })
  );
  afirmar(!cruzado.gerado && cruzado.motivo === 'conteudo_inexistente', 'Empresa A não gera capa do curso da B');
  afirmar(providerCruzado.chamadas === 0, 'provedor não é chamado em tentativa cross-tenant');

  // ── 8. Conteúdo editado libera nova geração ───────────────────────────────
  console.log('\n── Conteúdo editado');
  psql(`UPDATE public.catalogo_cursos SET nome = 'Curso A (editado)' WHERE id = '${CURSO_A}';`);
  const providerEditado = criarProvedorSimulado();
  const editado = await gerarCapaDeTreinamento(
    { empresaId: EMPRESA_A, contentType: 'course', contentId: CURSO_A },
    montarDeps({ provider: providerEditado })
  );
  afirmar(editado.gerado === true, 'edição do cadastro (hash novo) libera nova capa');
  const aposEdicao = lerRegistro(EMPRESA_A, 'course', CURSO_A);
  // Versão nova reinicia tentativas; o histórico de sucessos só cresce.
  afirmar(aposEdicao?.attempts === 1, 'versão nova reinicia attempts (1)');
  afirmar(aposEdicao?.generations === 2, 'histórico registra a 2ª geração concluída');
  psql(`UPDATE public.catalogo_cursos SET nome = 'Curso A' WHERE id = '${CURSO_A}';`);

  // ── 9. Fila automática: trigger → worker → imagem (PASSO 4) ───────────────
  console.log('\n── Fila automática (trigger após cadastro → worker)');
  const CURSO_OFF = 'a0000020-0000-4000-8000-000000000020';
  const CURSO_ON = 'a0000021-0000-4000-8000-000000000021';

  for (const id of [CURSO_OFF, CURSO_ON]) {
    psql(`DELETE FROM public.training_image_requests WHERE content_id = '${id}';`);
    psql(`DELETE FROM public.training_images WHERE content_id = '${id}';`);
    psql(`DELETE FROM public.catalogo_cursos WHERE id = '${id}';`);
  }

  psql('SELECT public.set_training_image_autoqueue(false);');
  psql(
    `INSERT INTO public.catalogo_cursos (id, empresa_id, nome)
     VALUES ('${CURSO_OFF}', '${EMPRESA_A}', 'Curso Auto Off');`
  );
  afirmar(
    psql(`SELECT count(*) FROM public.training_image_requests WHERE content_id = '${CURSO_OFF}';`) === '0',
    'flag desligada: cadastro NÃO enfileira geração'
  );

  psql('SELECT public.set_training_image_autoqueue(true);');
  psql(
    `INSERT INTO public.catalogo_cursos (id, empresa_id, nome, descricao)
     VALUES ('${CURSO_ON}', '${EMPRESA_A}', 'Curso Auto On', 'Capa automatica de teste');`
  );
  psql('SELECT public.set_training_image_autoqueue(false);');

  const fila = psql(
    `SELECT id || '|' || status || '|' || attempts FROM public.training_image_requests
     WHERE content_id = '${CURSO_ON}';`
  );
  const [requestId, statusFila, tentativasFila] = fila.split('|');
  afirmar(
    Boolean(requestId) && statusFila === 'queued' && tentativasFila === '0',
    'flag ligada: cadastro enfileira exatamente UMA requisição (queued)'
  );

  const reivindicada = psql('SELECT id FROM public.claim_training_image_requests(1);');
  afirmar(reivindicada === requestId, 'worker reivindica a requisição da fila');
  afirmar(
    psql('SELECT count(*) FROM public.claim_training_image_requests(1);') === '0',
    'segunda execução do worker NÃO pega a mesma requisição'
  );

  const providerFila = criarProvedorSimulado();
  const resultadoFila = await gerarCapaDeTreinamento(
    { empresaId: EMPRESA_A, contentType: 'course', contentId: CURSO_ON },
    montarDeps({ provider: providerFila })
  );
  psql(
    `SELECT public.finish_training_image_request('${requestId}', 'done', NULL);`
  );

  afirmar(resultadoFila.gerado === true, 'worker gera a capa com o provedor simulado');
  afirmar(
    psql(
      `SELECT status FROM public.training_image_requests WHERE id = '${requestId}';`
    ) === 'done',
    'requisição marcada como done (sem loop de retentativa)'
  );
  afirmar(lerRegistro(EMPRESA_A, 'course', CURSO_ON)?.status === 'succeeded', 'capa persistida como succeeded');
  const bytesFila = await lerBytes(`${EMPRESA_A}/courses/${CURSO_ON}/cover.png`);
  afirmar(bytesFila.length > 0, 'arquivo da capa automática gravado no Storage local');
  afirmar(providerFila.chamadas === 1, 'provedor chamado exatamente uma vez pela fila');

  // ── 10. Reabrir/editar o card NÃO cria nova solicitação ───────────────────
  console.log('\n── Idempotência de reabertura/atualização');
  psql(
    `UPDATE public.catalogo_cursos SET nome = 'Curso Auto On (editado)' WHERE id = '${CURSO_ON}';`
  );
  afirmar(
    psql(`SELECT count(*) FROM public.training_image_requests WHERE content_id = '${CURSO_ON}';`) === '1',
    'editar/reabrir o card não enfileira uma segunda solicitação'
  );
  afirmar(
    psql('SELECT count(*) FROM public.claim_training_image_requests(1);') === '0',
    'requisição concluída não volta para a fila'
  );

  // ── 11. Trilha pelo mesmo ciclo da fila ───────────────────────────────────
  console.log('\n── Fila automática para Trilha');
  const TRILHA_AUTO = 'a0000022-0000-4000-8000-000000000022';
  psql(`DELETE FROM public.training_image_requests WHERE content_id = '${TRILHA_AUTO}';`);
  psql(`DELETE FROM public.training_images WHERE content_id = '${TRILHA_AUTO}';`);
  psql(`DELETE FROM public.trilhas_aprendizado WHERE id = '${TRILHA_AUTO}';`);

  psql('SELECT public.set_training_image_autoqueue(true);');
  psql(
    `INSERT INTO public.trilhas_aprendizado (id, empresa_id, nome, descricao, nivel)
     VALUES ('${TRILHA_AUTO}', '${EMPRESA_A}', 'Trilha Auto', 'Fluxo automatico', 'basico');`
  );
  psql('SELECT public.set_training_image_autoqueue(false);');

  const filaTrilha = psql(
    `SELECT id || '|' || status FROM public.training_image_requests
     WHERE content_id = '${TRILHA_AUTO}';`
  );
  const [requestTrilha, statusTrilha] = filaTrilha.split('|');
  afirmar(Boolean(requestTrilha) && statusTrilha === 'queued', 'trilha cadastrada entra na fila');

  psql('SELECT public.claim_training_image_requests(5);');
  const providerTrilhaFila = criarProvedorSimulado();
  const resultadoTrilhaFila = await gerarCapaDeTreinamento(
    { empresaId: EMPRESA_A, contentType: 'learning_path', contentId: TRILHA_AUTO },
    montarDeps({ provider: providerTrilhaFila })
  );
  psql(`SELECT public.finish_training_image_request('${requestTrilha}', 'done', NULL);`);

  afirmar(resultadoTrilhaFila.gerado === true, 'worker gera a capa da trilha');
  afirmar(
    lerRegistro(EMPRESA_A, 'learning_path', TRILHA_AUTO)?.status === 'succeeded',
    'trilha atualizada para succeeded'
  );
  afirmar(
    (await lerBytes(`${EMPRESA_A}/learning-paths/${TRILHA_AUTO}/cover.png`)).length > 0,
    'arquivo da trilha gravado no Storage local'
  );

  // ── 12. Backfill de conteúdos criados com a fila desligada ────────────────
  console.log('\n── Backfill de conteúdos antigos sem capa');
  const CURSO_ANTIGO = 'a0000023-0000-4000-8000-000000000023';
  const TRILHA_ANTIGA = 'a0000024-0000-4000-8000-000000000024';
  psql(`DELETE FROM public.training_image_requests WHERE content_id IN ('${CURSO_ANTIGO}', '${TRILHA_ANTIGA}');`);
  psql(`DELETE FROM public.training_images WHERE content_id IN ('${CURSO_ANTIGO}', '${TRILHA_ANTIGA}');`);
  psql(`DELETE FROM public.catalogo_cursos WHERE id = '${CURSO_ANTIGO}';`);
  psql(`DELETE FROM public.trilhas_aprendizado WHERE id = '${TRILHA_ANTIGA}';`);

  psql('SELECT public.set_training_image_autoqueue(false);');
  psql(
    `INSERT INTO public.catalogo_cursos (id, empresa_id, nome)
     VALUES ('${CURSO_ANTIGO}', '${EMPRESA_A}', 'Curso Antigo');`
  );
  psql(
    `INSERT INTO public.trilhas_aprendizado (id, empresa_id, nome)
     VALUES ('${TRILHA_ANTIGA}', '${EMPRESA_A}', 'Trilha Antiga');`
  );

  afirmar(
    psql(`SELECT count(*) FROM public.training_image_requests WHERE content_id IN ('${CURSO_ANTIGO}', '${TRILHA_ANTIGA}');`) === '0',
    'conteúdo criado com a fila desligada não tem solicitação'
  );

  const inseridos = Number(psql('SELECT public.backfill_training_image_requests(500);'));
  afirmar(inseridos >= 2, `backfill enfileirou conteúdos antigos (${inseridos})`);
  afirmar(
    psql(`SELECT count(*) FROM public.training_image_requests WHERE content_id = '${CURSO_ANTIGO}';`) === '1' &&
      psql(`SELECT count(*) FROM public.training_image_requests WHERE content_id = '${TRILHA_ANTIGA}';`) === '1',
    'backfill cobre curso e trilha sem capa'
  );
  afirmar(
    psql('SELECT public.backfill_training_image_requests(500);') === '0',
    'backfill é idempotente (segunda execução insere 0)'
  );

  console.log('\n=============================================================');
  if (falhas.length === 0) {
    console.log(` RESULTADO: ${passos.length} VERIFICAÇÕES PASSARAM`);
    console.log(' (provedor simulado · sem OpenAI · arquivo local · claim SQL real)');
    console.log(' LIMITAÇÃO: o bucket do Supabase Storage não foi exercitado');
    console.log(' (runtime local exige Docker, indisponível nesta máquina).');
    console.log('=============================================================');
    return 0;
  }
  console.log(` RESULTADO: ${falhas.length} FALHA(S)`);
  for (const falha of falhas) console.log(`  - ${falha}`);
  console.log('=============================================================');
  return 1;
}

const codigo = await principal();
Deno.exit(codigo);

