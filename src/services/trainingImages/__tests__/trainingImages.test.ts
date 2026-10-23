import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invalidarCapasDeTreinamento, trainingImagesQueryKey } from '@/hooks/useTrainingImages';
import {
  MAPA_IMAGENS_VAZIO,
  TENTATIVAS_MAX,
  TRAINING_IMAGES_LIMITE_BYTES,
  TrainingImageProviderError,
  carregarImagensDaEmpresa,
  chaveConteudo,
  definirTrainingImageProvider,
  empresaDoCaminho,
  imagensDeTreinamentoHabilitadas,
  integracaoDeImagensAtiva,
  limparControleDeGeracao,
  mensagemSeguraDoErro,
  montarCaminhoImagem,
  montarSolicitacaoImagem,
  obterTrainingImageProvider,
  paletaPorCategoria,
  resolverImagemDoMapa,
  solicitarGeracaoImagem,
  trainingImageProviderDesativado,
  urlAssinadaDoCaminho,
  validarArquivoDeCapa,
  validarCaminhoDaEmpresa,
  type TrainingImageProvider,
} from '@/services/trainingImages';

/**
 * ============================================================================
 * INFRAESTRUTURA DE IMAGENS — sem OpenAI, sem chamadas pagas.
 *
 * Nenhum teste aqui faz rede: o client Supabase é o mock global do
 * `setupTests` e o único provedor "configurado" é um fake local.
 * ============================================================================
 */

const EMPRESA_A = 'empresa-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const EMPRESA_B = 'empresa-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const CURSO_ID = '11111111-1111-4111-8111-111111111111';
const TRILHA_ID = '22222222-2222-4222-8222-222222222222';
const TURMA_ID = '33333333-3333-4333-8333-333333333333';

const entradaCurso = {
  contentType: 'course' as const,
  contentId: CURSO_ID,
  empresaId: EMPRESA_A,
  nome: 'NR-17 Ergonomia',
  descricao: 'Ergonomia aplicada ao posto de trabalho.',
  categoria: 'Segurança do Trabalho',
  modalidade: 'presencial',
  cargaHoraria: 4,
};

/** Provedor fake: devolve sucesso sem rede (nunca usado no app em produção). */
function providerFake(overrides: Partial<TrainingImageProvider> = {}): TrainingImageProvider & {
  generate: ReturnType<typeof vi.fn>;
} {
  const generate = vi.fn(
    async (request: { empresaId: string; contentId: string; operationId: string; promptVersion: string }) => ({
      storagePath: `${request.empresaId}/courses/${request.contentId}/cover.webp`,
      mimeType: 'image/webp',
      width: 1536,
      height: 1024,
      providerId: 'fake',
      model: 'fake-model',
      operationId: request.operationId,
      promptVersion: request.promptVersion,
    })
  );
  return { id: 'fake', configured: true, generate, ...overrides } as TrainingImageProvider & {
    generate: ReturnType<typeof vi.fn>;
  };
}

beforeEach(() => {
  limparControleDeGeracao();
  definirTrainingImageProvider(null);
  // O mock global é um vi.fn; `restoreAllMocks` não desfaz `mockImplementation`.
  // Reset explícito garante que um teste não vaze implementação para o outro.
  vi.mocked(supabase.storage.from).mockImplementation((() => ({
    createSignedUrl: vi.fn(async () => ({ data: { signedUrl: 'https://example.test/signed' }, error: null })),
  })) as never);
});

afterEach(() => {
  limparControleDeGeracao();
  definirTrainingImageProvider(null);
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('caminhos do bucket training-images', () => {
  it('monta o caminho canônico por tipos de conteúdo', () => {
    expect(montarCaminhoImagem({ empresaId: EMPRESA_A, contentType: 'course', contentId: CURSO_ID })).toBe(
      `${EMPRESA_A}/courses/${CURSO_ID}/cover.webp`
    );
    expect(montarCaminhoImagem({ empresaId: EMPRESA_A, contentType: 'learning_path', contentId: TRILHA_ID })).toBe(
      `${EMPRESA_A}/learning-paths/${TRILHA_ID}/cover.webp`
    );
    expect(montarCaminhoImagem({ empresaId: EMPRESA_A, contentType: 'training_session', contentId: TURMA_ID })).toBe(
      `${EMPRESA_A}/training-sessions/${TURMA_ID}/cover.webp`
    );
  });

  it('recusa identificadores que quebrariam o escopo do tenant', () => {
    expect(() => montarCaminhoImagem({ empresaId: '', contentType: 'course', contentId: CURSO_ID })).toThrow();
    expect(() =>
      montarCaminhoImagem({ empresaId: EMPRESA_A, contentType: 'course', contentId: '../../outra' })
    ).toThrow();
    expect(() =>
      montarCaminhoImagem({ empresaId: `${EMPRESA_A}/x`, contentType: 'course', contentId: CURSO_ID })
    ).toThrow();
  });

  it('valida o caminho contra a empresa (isolamento multiempresa)', () => {
    const caminho = montarCaminhoImagem({ empresaId: EMPRESA_A, contentType: 'course', contentId: CURSO_ID });
    expect(validarCaminhoDaEmpresa(caminho, EMPRESA_A)).toBe(true);
    expect(validarCaminhoDaEmpresa(caminho, EMPRESA_B)).toBe(false);
    expect(validarCaminhoDaEmpresa(`${EMPRESA_A}/../${EMPRESA_B}/courses/x/cover.webp`, EMPRESA_A)).toBe(false);
    expect(empresaDoCaminho(caminho)).toBe(EMPRESA_A);
  });
});

describe('provedor desativado (estado desta fase)', () => {
  it('começa desativado e não se declara configurado', () => {
    expect(obterTrainingImageProvider().id).toBe(trainingImageProviderDesativado.id);
    expect(obterTrainingImageProvider().configured).toBe(false);
    expect(integracaoDeImagensAtiva()).toBe(false);
  });

  it('solicitar geração devolve integracao_desativada sem chamar provedor nem rede', async () => {
    const generate = vi.spyOn(trainingImageProviderDesativado, 'generate');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const resultado = await solicitarGeracaoImagem(entradaCurso);

    expect(resultado).toEqual({ aceito: false, motivo: 'integracao_desativada' });
    expect(generate).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('não cria trabalho pendente: chamadas repetidas respondem na hora, sem estado', async () => {
    const primeira = await solicitarGeracaoImagem(entradaCurso);
    const segunda = await solicitarGeracaoImagem(entradaCurso);
    expect(primeira).toEqual(segunda);
    expect(primeira.aceito).toBe(false);
  });

  it('recusa identificadores vazios antes de qualquer decisão de provedor', async () => {
    expect(await solicitarGeracaoImagem({ ...entradaCurso, empresaId: '' })).toEqual({
      aceito: false,
      motivo: 'identificadores_invalidos',
    });
  });

  it('recusa tipo de conteúdo fora do contrato', async () => {
    const resultado = await solicitarGeracaoImagem({ ...entradaCurso, contentType: 'podcast' as never });
    expect(resultado).toEqual({ aceito: false, motivo: 'tipo_de_conteudo_invalido' });
  });
});

describe('controle de duplicidade e custo (com provedor fake)', () => {
  it('duas solicitações simultâneas do mesmo conteúdo chamam o provedor UMA vez', async () => {
    const provider = providerFake();
    definirTrainingImageProvider(provider);

    const [a, b] = await Promise.all([solicitarGeracaoImagem(entradaCurso), solicitarGeracaoImagem(entradaCurso)]);

    expect(provider.generate).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
    expect(a.aceito).toBe(true);
  });

  it('não compartilha a geração entre empresas diferentes', async () => {
    const provider = providerFake();
    definirTrainingImageProvider(provider);

    await solicitarGeracaoImagem(entradaCurso);
    await solicitarGeracaoImagem({ ...entradaCurso, empresaId: EMPRESA_B, contentId: TRILHA_ID });

    expect(provider.generate).toHaveBeenCalledTimes(2);
  });

  it('rejeita caminho devolvido fora do tenant', async () => {
    const provider = providerFake({
      generate: vi.fn(async () => ({
        storagePath: `${EMPRESA_B}/courses/${CURSO_ID}/cover.webp`,
        mimeType: 'image/webp',
        width: 1,
        height: 1,
        providerId: 'fake',
        model: 'fake-model',
      })) as unknown as TrainingImageProvider['generate'],
    });
    definirTrainingImageProvider(provider as TrainingImageProvider);

    const resultado = await solicitarGeracaoImagem(entradaCurso);
    expect(resultado).toEqual({
      aceito: false,
      motivo: 'falha_no_provedor',
      erro: 'caminho_fora_do_tenant',
      permanente: true,
    });
  });

  it('para de tentar depois do limite, evitando repetição ilimitada', async () => {
    const generate = vi.fn(async () => {
      throw new Error('falha simulada');
    });
    const provider: TrainingImageProvider = {
      id: 'fake-com-falha',
      configured: true,
      generate,
    };
    definirTrainingImageProvider(provider);

    for (let i = 0; i < TENTATIVAS_MAX; i += 1) {
      const resultado = await solicitarGeracaoImagem(entradaCurso);
      expect(resultado).toMatchObject({ aceito: false, motivo: 'falha_no_provedor' });
    }

    const excedente = await solicitarGeracaoImagem(entradaCurso);
    expect(excedente).toEqual({ aceito: false, motivo: 'limite_de_tentativas' });
    expect(generate).toHaveBeenCalledTimes(TENTATIVAS_MAX);
  });
});

describe('solicitação derivada do cadastro (sem prompt do usuário)', () => {
  it('leva apenas dados de catálogo e uma direção de arte determinística', () => {
    const solicitacao = montarSolicitacaoImagem(entradaCurso);

    expect(solicitacao.artDirection.paleta).toBe('--warning');
    expect(solicitacao.artDirection.restricoes.length).toBeGreaterThan(0);
    expect(solicitacao).not.toHaveProperty('prompt');
    // Nenhum CAMPO pessoal é copiado para o pedido (as restrições só proíbem
    // incluir dados pessoais; não carregam dado nenhum).
    expect(solicitacao).not.toHaveProperty('colaborador');
    expect(solicitacao).not.toHaveProperty('colaboradorId');
    const serializado = JSON.stringify(solicitacao).toLowerCase();
    expect(serializado).not.toContain('email');
    expect(serializado).not.toContain('cpf');
    expect(serializado).not.toContain('matricula');
    expect(serializado).not.toMatch(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/);
  });

  it('mesma entrada → mesma direção de arte (capas estáveis)', () => {
    expect(montarSolicitacaoImagem(entradaCurso).artDirection).toEqual(
      montarSolicitacaoImagem({ ...entradaCurso }).artDirection
    );
  });

  it('mapeia assuntos diferentes para famílias do Design System', () => {
    expect(paletaPorCategoria('Panificação Artesanal')).toBe('--warning');
    expect(paletaPorCategoria('Segurança do Trabalho')).toBe('--warning');
    expect(paletaPorCategoria('Primeiros Socorros')).toBe('--success');
    expect(paletaPorCategoria('Liderança')).toBe('--info');
    expect(paletaPorCategoria('Tecnologia')).toBe('--info');
    expect(paletaPorCategoria('Compliance')).toBe('--aqua');
    expect(paletaPorCategoria('Cultura')).toBe('--chart-4');
    expect(paletaPorCategoria(null)).toBe('--muted');
  });
});

describe('herança de capa (turma/certificado usam o curso)', () => {
  const mapa = new Map<string, string>([
    [chaveConteudo('course', CURSO_ID), 'https://example.test/curso.webp'],
    [chaveConteudo('training_session', TURMA_ID), 'https://example.test/turma.webp'],
  ]);

  it('a turma sem capa própria recebe a capa do curso', () => {
    expect(resolverImagemDoMapa(mapa, 'training_session', 'outra-turma', CURSO_ID)).toBe(
      'https://example.test/curso.webp'
    );
  });

  it('a capa própria tem prioridade sobre a herdada', () => {
    expect(resolverImagemDoMapa(mapa, 'training_session', TURMA_ID, CURSO_ID)).toBe('https://example.test/turma.webp');
  });

  it('certificado herda a capa do curso', () => {
    expect(resolverImagemDoMapa(mapa, 'certificate', 'cert-1', CURSO_ID)).toBe('https://example.test/curso.webp');
  });

  it('sem capa e sem origem devolve null (fallback visual)', () => {
    expect(resolverImagemDoMapa(mapa, 'course', 'desconhecido')).toBeNull();
    expect(resolverImagemDoMapa(mapa, 'certificate', 'cert-1', null)).toBeNull();
  });
});

describe('leitura das capas por empresa', () => {
  it('desligada por padrão: nenhuma consulta é disparada', async () => {
    const fromSpy = vi.spyOn(supabase, 'from');
    expect(imagensDeTreinamentoHabilitadas()).toBe(false);

    const mapa = await carregarImagensDaEmpresa(EMPRESA_A);

    expect(mapa).toBe(MAPA_IMAGENS_VAZIO);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('com a flag ligada e tabela ausente/erro, devolve mapa vazio sem lançar', async () => {
    vi.stubEnv('VITE_TRAINING_IMAGES', 'true');

    vi.mocked(supabase.from).mockImplementation((() => {
      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: { message: 'relation does not exist', code: '42P01' } }).then(resolve),
      };
      return builder;
    }) as never);

    await expect(carregarImagensDaEmpresa(EMPRESA_A)).resolves.toBe(MAPA_IMAGENS_VAZIO);
  });

  it('com a flag ligada, monta o mapa e descarta linhas de outra empresa', async () => {
    vi.stubEnv('VITE_TRAINING_IMAGES', 'true');
    const linhas = [
      {
        content_type: 'course',
        content_id: CURSO_ID,
        source_content_id: null,
        storage_path: `${EMPRESA_A}/courses/${CURSO_ID}/cover.webp`,
        status: 'succeeded',
      },
      {
        content_type: 'course',
        content_id: 'curso-alheio',
        source_content_id: null,
        storage_path: `${EMPRESA_B}/courses/curso-alheio/cover.webp`,
        status: 'succeeded',
      },
      {
        content_type: 'training_session',
        content_id: TURMA_ID,
        source_content_id: CURSO_ID,
        storage_path: `${EMPRESA_A}/training-sessions/${TURMA_ID}/cover.webp`,
        status: 'succeeded',
      },
    ];

    vi.mocked(supabase.from).mockImplementation((() => {
      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: linhas, error: null }).then(resolve),
      };
      return builder;
    }) as never);

    vi.mocked(supabase.storage.from).mockImplementation((() => ({
      createSignedUrl: vi.fn(async (caminho: string) => ({
        data: { signedUrl: `https://example.test/${String(caminho).split('/')[0]}` },
        error: null,
      })),
    })) as never);

    const mapa = await carregarImagensDaEmpresa(EMPRESA_A);

    expect(mapa.get(chaveConteudo('course', CURSO_ID))).toBe(`https://example.test/${EMPRESA_A}`);
    expect(mapa.get(chaveConteudo('training_session', TURMA_ID))).toBe(`https://example.test/${EMPRESA_A}`);
    // Herança explícita: a turma também alimenta a chave do curso de origem.
    expect(mapa.get(chaveConteudo('course', CURSO_ID))).toBeTruthy();
    expect([...mapa.values()].every((url) => url.includes(EMPRESA_B))).toBe(false);
    expect(mapa.size).toBeGreaterThan(0);
  });
});

describe('erros do provedor: classificação e mensagem segura', () => {
  it('erro permanente esgota as tentativas e não repete', async () => {
    const generate = vi.fn(async () => {
      throw new TrainingImageProviderError('conteúdo bloqueado pela moderação', {
        code: 'moderation_blocked',
        retryable: false,
      });
    });
    definirTrainingImageProvider({ id: 'fake-permanente', configured: true, generate });

    const primeiro = await solicitarGeracaoImagem(entradaCurso);
    expect(primeiro).toMatchObject({
      aceito: false,
      motivo: 'falha_no_provedor',
      permanente: true,
    });

    const segundo = await solicitarGeracaoImagem(entradaCurso);
    expect(segundo).toEqual({ aceito: false, motivo: 'limite_de_tentativas' });
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('erro transitório consome uma tentativa por chamada', async () => {
    const generate = vi.fn(async () => {
      throw new TrainingImageProviderError('timeout', { code: 'timeout', retryable: true });
    });
    definirTrainingImageProvider({ id: 'fake-transitorio', configured: true, generate });

    for (let i = 0; i < TENTATIVAS_MAX; i += 1) {
      const resultado = await solicitarGeracaoImagem(entradaCurso);
      expect(resultado).toMatchObject({ aceito: false, motivo: 'falha_no_provedor' });
      expect(resultado.aceito === false && resultado.permanente).toBeFalsy();
    }

    expect(await solicitarGeracaoImagem(entradaCurso)).toEqual({
      aceito: false,
      motivo: 'limite_de_tentativas',
    });
    expect(generate).toHaveBeenCalledTimes(TENTATIVAS_MAX);
  });

  it('mensagem de erro nunca carrega chave, token ou URL', () => {
    // Chave/token FICTÍCIOS montados em runtime (não é credencial versionada).
    const chaveFalsa = `sk-${'abcdef123456'}`;
    const tokenFalso = `abc.${'def'}`;
    const mensagem = mensagemSeguraDoErro(
      new Error(`falhou em https://api.exemplo.com/v1 com Bearer ${chaveFalsa} e Authorization: Bearer ${tokenFalso}`)
    );
    expect(mensagem).not.toMatch(/sk-abcdef/);
    expect(mensagem).not.toContain(tokenFalso);
    expect(mensagem).not.toMatch(/https?:\/\//);
    expect(mensagem.length).toBeLessThanOrEqual(240);
  });
});

describe('upload de capa (validação de arquivo)', () => {
  it('aceita webp/png/jpeg dentro do limite', () => {
    expect(() => validarArquivoDeCapa({ mimeType: 'image/webp', tamanho: 1024 })).not.toThrow();
    expect(() => validarArquivoDeCapa({ mimeType: 'image/png', tamanho: 1024 })).not.toThrow();
    expect(() => validarArquivoDeCapa({ mimeType: 'image/jpeg', tamanho: 1024 })).not.toThrow();
  });

  it('recusa formato não suportado, arquivo vazio e excesso de tamanho', () => {
    expect(() => validarArquivoDeCapa({ mimeType: 'image/gif', tamanho: 1024 })).toThrow();
    expect(() => validarArquivoDeCapa({ mimeType: 'application/pdf', tamanho: 1024 })).toThrow();
    expect(() => validarArquivoDeCapa({ mimeType: 'image/webp', tamanho: 0 })).toThrow();
    expect(() => validarArquivoDeCapa({ mimeType: 'image/webp', tamanho: TRAINING_IMAGES_LIMITE_BYTES + 1 })).toThrow();
  });
});

describe('URL assinada e cache', () => {
  it('não assina caminho de OUTRA empresa', async () => {
    const fromSpy = vi.spyOn(supabase.storage, 'from');
    fromSpy.mockClear();
    const caminhoAlheio = `${EMPRESA_B}/courses/${CURSO_ID}/cover.webp`;
    await expect(urlAssinadaDoCaminho(caminhoAlheio, EMPRESA_A)).resolves.toBeNull();
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('assina caminho da própria empresa', async () => {
    const caminho = montarCaminhoImagem({ empresaId: EMPRESA_A, contentType: 'course', contentId: CURSO_ID });
    await expect(urlAssinadaDoCaminho(caminho, EMPRESA_A)).resolves.toBe('https://example.test/signed');
  });

  it('a chave de cache inclui a empresa e a invalidação usa a mesma chave', async () => {
    expect(trainingImagesQueryKey(EMPRESA_A)).toEqual(['training_images', EMPRESA_A]);
    expect(trainingImagesQueryKey(EMPRESA_B)).not.toEqual(trainingImagesQueryKey(EMPRESA_A));
    expect(trainingImagesQueryKey(null)).toEqual(['training_images', null]);

    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    await invalidarCapasDeTreinamento(queryClient, EMPRESA_A);
    expect(spy).toHaveBeenCalledWith({ queryKey: trainingImagesQueryKey(EMPRESA_A) });
  });
});
