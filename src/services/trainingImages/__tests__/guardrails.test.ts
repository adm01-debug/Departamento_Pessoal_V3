import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * ============================================================================
 * GUARDRAILS — a Fase 2 NÃO conecta a OpenAI e o frontend não pode carregar
 * credencial. Estes testes falham se alguém introduzir, por descuido:
 *   • chamada direta a api.openai.com;
 *   • variável `VITE_OPENAI_*` (vazaria no bundle);
 *   • leitura de `OPENAI_API_KEY` fora do backend;
 *   • upload de capa disparado pelo navegador.
 * ============================================================================
 */

const RAIZ = process.cwd();
const ARQUIVOS_DO_FRONTEND = [
  path.join(RAIZ, 'src/services/trainingImages'),
  path.join(RAIZ, 'src/components/treinamentos'),
  path.join(RAIZ, 'src/hooks/useTrainingImages.ts'),
  path.join(RAIZ, 'src/pages/TreinamentosPage.tsx'),
];

function listarArquivos(entrada: string): string[] {
  const info = statSync(entrada);
  if (info.isFile()) return [entrada];
  return readdirSync(entrada).flatMap((nome) => listarArquivos(path.join(entrada, nome)));
}

const ARQUIVOS = ARQUIVOS_DO_FRONTEND.flatMap((entrada) => listarArquivos(entrada)).filter((arquivo) =>
  /\.(ts|tsx)$/.test(arquivo)
);

/** Conteúdo concatenado do código auditado (sem os próprios testes). */
const CODIGO_BRUTO = ARQUIVOS.filter((arquivo) => !arquivo.includes('__tests__'))
  .map((arquivo) => `\n// ${arquivo}\n${readFileSync(arquivo, 'utf8')}`)
  .join('\n');

/** Remove comentários: a documentação PODE citar a chave; o código não pode lê-la. */
const CODIGO = CODIGO_BRUTO.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('nenhuma conexão com a OpenAI nesta fase', () => {
  it('não há endpoint, SDK ou chave da OpenAI no código do frontend', () => {
    expect(CODIGO).not.toMatch(/api\.openai\.com/i);
    expect(CODIGO).not.toMatch(/from ['"]openai['"]/i);
    expect(CODIGO).not.toMatch(/VITE_OPENAI/i);
    expect(CODIGO).not.toMatch(/OPENAI_API_KEY/);
  });

  it('não há chamada de rede no módulo de provedor nem no serviço de solicitação', () => {
    const provider = readFileSync(path.join(RAIZ, 'src/services/trainingImages/provider.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    expect(provider).not.toMatch(/\bfetch\s*\(/);
    expect(provider).not.toMatch(/supabase/);

    const servico = readFileSync(path.join(RAIZ, 'src/services/trainingImages/service.ts'), 'utf8');
    const trechoSolicitacao = servico.slice(servico.indexOf('export async function solicitarGeracaoImagem'));
    expect(trechoSolicitacao).not.toMatch(/\bfetch\s*\(/);
    expect(trechoSolicitacao).not.toMatch(/api\.openai/i);
  });

  it('.env.example expõe apenas a flag de LEITURA, nunca uma chave de cliente', () => {
    const env = readFileSync(path.join(RAIZ, '.env.example'), 'utf8');
    expect(env).toMatch(/VITE_TRAINING_IMAGES=false/);

    // Só valem variáveis ATIVAS (linhas não comentadas).
    const ativas = env
      .split('\n')
      .filter((linha) => !linha.trim().startsWith('#'))
      .join('\n');
    expect(ativas).not.toMatch(/VITE_OPENAI/i);
    expect(ativas).not.toMatch(/OPENAI_API_KEY\s*=\s*\S/);
  });
});

describe('separação frontend × backend (Fase 3A)', () => {
  const FUNCAO = path.join(RAIZ, 'supabase/functions/training-image-generate/index.ts');
  const DEPENDENCIAS = path.join(RAIZ, 'supabase/functions/_shared/trainingImages/supabaseDeps.ts');
  const ADAPTADOR = path.join(RAIZ, 'supabase/functions/_shared/trainingImages/openaiProvider.ts');
  const SIMULADO = path.join(RAIZ, 'supabase/functions/_shared/trainingImages/simulatedProvider.ts');

  it('o frontend não importa o adaptador nem a função', () => {
    expect(CODIGO).not.toMatch(/openaiProvider/);
    expect(CODIGO).not.toMatch(/_shared\/trainingImages/);
    expect(CODIGO).not.toMatch(/api\.openai\.com/);
  });

  it('a função exige autenticação, vínculo com a empresa e papel autorizado', () => {
    const funcao = readFileSync(FUNCAO, 'utf8');
    const dependencias = readFileSync(DEPENDENCIAS, 'utf8');
    expect(funcao).toMatch(/supabase\.auth\.getUser\(\)/);
    expect(funcao).toMatch(/from\('user_empresas'\)/);
    expect(funcao).toMatch(/from\('user_roles'\)/);
    expect(dependencias).toMatch(/claim_training_image/);
    expect(funcao).toMatch(/checkRateLimitDuplo/);
    expect(funcao).toMatch(/openssl|verifyCsrf/);
  });

  it('a geração é desativada por padrão e a chave só existe no backend', () => {
    const funcao = readFileSync(FUNCAO, 'utf8');
    expect(funcao).toMatch(/TRAINING_IMAGE_GENERATION_ENABLED/);
    expect(funcao).toMatch(/Deno\.env\.get\('OPENAI_API_KEY'\)/);
    expect(funcao).toMatch(/motivo: 'integracao_desativada'/);
    // A função nunca importa o provedor simulado.
    expect(funcao).not.toMatch(/simulatedProvider/);
  });

  it('o adaptador não lê ambiente nem segredo por conta própria', () => {
    const adaptador = readFileSync(ADAPTADOR, 'utf8');
    expect(adaptador).not.toMatch(/Deno\.env/);
    expect(adaptador).not.toMatch(/VITE_/);
    expect(adaptador).toMatch(/apiKey/);
  });

  it('o provedor simulado se declara apenas para testes', () => {
    const simulado = readFileSync(SIMULADO, 'utf8');
    expect(simulado).toMatch(/SOMENTE TESTES/);
    expect(simulado).toMatch(/providerId: 'simulado-teste'/);
  });

  it('a função consulta apenas colunas existentes em trilhas_aprendizado', () => {
    const dependencias = readFileSync(DEPENDENCIAS, 'utf8');
    // Schema gerado tem `nome`; `titulo` não existe e derrubaria a consulta.
    expect(dependencias).toMatch(/select\('id, nome, descricao, nivel, empresa_id'\)/);
    expect(dependencias).not.toMatch(/select\('id, titulo/);
  });
});

describe('worker automático e quota multiempresa (Fase 3A.2)', () => {
  const DISPATCH = path.join(RAIZ, 'supabase/functions/training-image-dispatch/index.ts');
  const DISPATCH_SRC = readFileSync(DISPATCH, 'utf8');

  it('exige credencial de agendador/service role (nunca o navegador)', () => {
    expect(DISPATCH_SRC).toMatch(/estaAutorizado/);
    expect(DISPATCH_SRC).toMatch(/X-Cron-Secret/);
    expect(DISPATCH_SRC).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(DISPATCH_SRC).toMatch(/NAO_AUTORIZADO/);
    expect(DISPATCH_SRC).toMatch(/iguaisEmTempoConstante/);
  });

  it('fica DESLIGADO por padrão e responde 503 antes de reivindicar a fila', () => {
    expect(DISPATCH_SRC).toMatch(/TRAINING_IMAGE_AUTOQUEUE_ENABLED/);
    expect(DISPATCH_SRC).toMatch(/TRAINING_IMAGE_GENERATION_ENABLED/);
    expect(DISPATCH_SRC).toMatch(/fila_preservada: true/);

    const posFlags = DISPATCH_SRC.indexOf('TRAINING_IMAGE_AUTOQUEUE_ENABLED');
    const posClaim = DISPATCH_SRC.indexOf(".rpc('claim_training_image_requests'");
    expect(posFlags).toBeGreaterThan(-1);
    expect(posClaim).toBeGreaterThan(posFlags);
  });

  it('consome a fila persistente e fecha cada requisição', () => {
    expect(DISPATCH_SRC).toMatch(/claim_training_image_requests/);
    expect(DISPATCH_SRC).toMatch(/finish_training_image_request/);
    expect(DISPATCH_SRC).toMatch(/criarDepsSupabase/);
    expect(DISPATCH_SRC).toMatch(/gerarCapaDeTreinamento/);
  });

  it('aplica o MESMO rate limit e a MESMA idempotência da geração manual', () => {
    expect(DISPATCH_SRC).toMatch(/checkRateLimitDuplo/);
    expect(DISPATCH_SRC).toMatch(/consultarEstadoDaCapa/);
    expect(DISPATCH_SRC).toMatch(/chaveEmpresa/);
    expect(DISPATCH_SRC).toMatch(/chaveUsuario/);
    expect(DISPATCH_SRC).toMatch(/requested_by/);
    expect(DISPATCH_SRC).toMatch(/p_retry_after_seconds/);
    expect(DISPATCH_SRC).toMatch(/STALE_FILA_MINUTOS/);

    const quota = readFileSync(
      path.join(RAIZ, 'supabase/functions/_shared/trainingImages/quotas.ts'),
      'utf8'
    );
    expect(quota).toMatch(/LIMITE_EMPRESA_PADRAO = 20/);
    expect(quota).toMatch(/LIMITE_USUARIO_PADRAO = 5/);
    expect(quota).toMatch(/STALE_FILA_MINUTOS = 30/);
  });

  it('não repete chamada paga na recuperação de item interrompido', () => {
    expect(DISPATCH_SRC).toMatch(/marcarResultadoDesconhecido/);
    expect(DISPATCH_SRC).toMatch(/recuperacao_apos_interrupcao/);
    expect(DISPATCH_SRC).toMatch(/pedido\.attempts > 1/);
  });

  it('não importa o provedor simulado nem expõe segredo na resposta', () => {
    expect(DISPATCH_SRC).not.toMatch(/simulatedProvider/);
    expect(DISPATCH_SRC).toMatch(/\[redigido\]/);
  });

  it('o frontend não chama o worker (fila é server-side)', () => {
    expect(CODIGO).not.toMatch(/training-image-dispatch/);
  });

  it('a geração manual usa quota por empresa E por usuário', () => {
    const funcao = readFileSync(
      path.join(RAIZ, 'supabase/functions/training-image-generate/index.ts'),
      'utf8'
    );
    const quota = readFileSync(
      path.join(RAIZ, 'supabase/functions/_shared/trainingImages/quotas.ts'),
      'utf8'
    );
    expect(funcao).toMatch(/checkRateLimitDuplo/);
    expect(funcao).toMatch(/chaveEmpresa/);
    expect(funcao).toMatch(/chaveUsuario/);
    expect(funcao).toMatch(/TRAINING_IMAGE_RATE_LIMIT_EMPRESA/);
    expect(quota).toMatch(/training-image-generate:empresa:/);
    expect(quota).toMatch(/training-image-generate:usuario:/);
  });
});

