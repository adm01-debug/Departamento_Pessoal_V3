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
  const ADAPTADOR = path.join(RAIZ, 'supabase/functions/_shared/trainingImages/openaiProvider.ts');
  const SIMULADO = path.join(RAIZ, 'supabase/functions/_shared/trainingImages/simulatedProvider.ts');

  it('o frontend não importa o adaptador nem a função', () => {
    expect(CODIGO).not.toMatch(/openaiProvider/);
    expect(CODIGO).not.toMatch(/_shared\/trainingImages/);
    expect(CODIGO).not.toMatch(/api\.openai\.com/);
  });

  it('a função exige autenticação, vínculo com a empresa e papel autorizado', () => {
    const funcao = readFileSync(FUNCAO, 'utf8');
    expect(funcao).toMatch(/supabase\.auth\.getUser\(\)/);
    expect(funcao).toMatch(/from\('user_empresas'\)/);
    expect(funcao).toMatch(/from\('user_roles'\)/);
    expect(funcao).toMatch(/claim_training_image/);
    expect(funcao).toMatch(/checkRateLimit/);
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
    const funcao = readFileSync(FUNCAO, 'utf8');
    // Schema gerado tem `nome`; `titulo` não existe e derrubaria a consulta.
    expect(funcao).toMatch(/select\('id, nome, descricao, nivel, empresa_id'\)/);
    expect(funcao).not.toMatch(/select\('id, titulo/);
  });
});
