import { describe, expect, it, vi } from 'vitest';
import {
  gerarCapaDeTreinamento,
  hashConteudoServidor,
  TENTATIVAS_MAX_PIPELINE,
  type DepsPipelineCapa,
  type EntradaGeracaoCapa,
} from '../../../../supabase/functions/_shared/trainingImages/pipeline';
import { criarProvedorSimulado } from '../../../../supabase/functions/_shared/trainingImages/simulatedProvider';
import type {
  ClaimTrainingImageResult,
  ConteudoTreinamento,
  TrainingImageProvider,
} from '../../../../supabase/functions/_shared/trainingImages/types';

/**
 * ============================================================================
 * PIPELINE — fluxo completo com provedor SIMULADO (fixture local).
 *
 * O banco é um objeto em memória que reproduz a semântica do
 * `claim_training_image`: uma linha por conteúdo, hash da versão, status e
 * tentativas. Testamos concorrência, idempotência e limite sem Postgres e sem
 * nenhuma chamada paga.
 * ============================================================================
 */

const EMPRESA = 'empresa-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OUTRA_EMPRESA = 'empresa-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const CURSO = '11111111-1111-4111-8111-111111111111';

const CONTEUDO: ConteudoTreinamento = {
  contentType: 'course',
  contentId: CURSO,
  empresaId: EMPRESA,
  name: 'NR-17 Ergonomia',
  description: 'Ergonomia aplicada ao posto de trabalho.',
  category: 'Segurança do Trabalho',
  modality: 'presencial',
  workloadHours: 4,
  mandatory: true,
};

interface LinhaFake {
  id: string;
  hash: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  attempts: number;
  storagePath: string | null;
  erro: string | null;
}

const ENTRADA: EntradaGeracaoCapa = { empresaId: EMPRESA, contentType: 'course', contentId: CURSO };
function criarAmbiente(
  opcoes: {
    conteudo?: ConteudoTreinamento | null;
    provider?: TrainingImageProvider;
    falhaUpload?: boolean;
    falhaSucesso?: boolean;
  } = {}
) {
  const linha: { atual: LinhaFake | null } = { atual: null };
  const chamadas = {
    upload: 0,
    sucesso: 0,
    falha: 0,
    operacoes: [] as string[],
    operacoesRegistradas: [] as string[],
  };
  const provider = opcoes.provider ?? criarProvedorSimulado();

  const claim = async (dados: { contentHash: string; maxAttempts: number }): Promise<ClaimTrainingImageResult> => {
    const atual = linha.atual;

    if (!atual) {
      linha.atual = {
        id: 'img-1',
        hash: dados.contentHash,
        status: 'pending',
        attempts: 1,
        storagePath: null,
        erro: null,
      };
      return { reclamado: true, id: 'img-1', status: 'pending', attempts: 1 };
    }

    if (atual.hash === dados.contentHash) {
      if (atual.status === 'succeeded') {
        return { reclamado: false, id: atual.id, status: 'succeeded', attempts: atual.attempts };
      }
      if (atual.status === 'pending' || atual.status === 'processing') {
        return { reclamado: false, id: atual.id, status: atual.status, attempts: atual.attempts };
      }
      if (atual.attempts >= dados.maxAttempts) {
        return { reclamado: false, id: atual.id, status: 'failed', attempts: atual.attempts };
      }
    }

    if (atual.attempts >= dados.maxAttempts) {
      return { reclamado: false, id: atual.id, status: atual.status, attempts: atual.attempts };
    }

    atual.attempts += 1;
    atual.hash = dados.contentHash;
    atual.status = 'pending';
    return { reclamado: true, id: atual.id, status: 'pending', attempts: atual.attempts };
  };

  const deps: DepsPipelineCapa = {
    provider,
    carregarConteudo: async () => (opcoes.conteudo === undefined ? CONTEUDO : opcoes.conteudo),

    claim: async (dados) => claim({ contentHash: dados.contentHash, maxAttempts: dados.maxAttempts }),

    registrarOperacao: async ({ operationId }) => {
      chamadas.operacoesRegistradas.push(operationId);
    },

    enviarImagem: async ({ empresaId, contentType, contentId, bytes, mimeType, extensao }) => {
      chamadas.upload += 1;
      if (opcoes.falhaUpload) throw new Error('storage indisponível');
      const pasta = contentType === 'course' ? 'courses' : 'learning-paths';
      expect(bytes.length).toBeGreaterThan(0);
      expect(['image/png', 'image/webp', 'image/jpeg']).toContain(mimeType);
      return `${empresaId}/${pasta}/${contentId}/cover.${extensao}`;
    },

    atualizarSucesso: async ({ storagePath, operationId }) => {
      chamadas.sucesso += 1;
      chamadas.operacoes.push(operationId);
      if (opcoes.falhaSucesso) throw new Error('update falhou');
      if (linha.atual) {
        linha.atual.status = 'succeeded';
        linha.atual.storagePath = storagePath;
      }
    },

    atualizarFalha: async ({ erro, permanente, operationId }) => {
      chamadas.falha += 1;
      chamadas.operacoes.push(operationId);
      if (linha.atual) {
        linha.atual.status = 'failed';
        linha.atual.erro = erro;
        if (permanente) linha.atual.attempts = TENTATIVAS_MAX_PIPELINE;
      }
    },
  };

  return { deps, linha, chamadas, provider };
}

describe('fluxo completo (provedor simulado)', () => {
  it('gera, valida, sobe e marca succeeded', async () => {
    const ambiente = criarAmbiente();
    const resultado = await gerarCapaDeTreinamento(ENTRADA, ambiente.deps);

    expect(resultado).toMatchObject({
      gerado: true,
      storagePath: `${EMPRESA}/courses/${CURSO}/cover.png`,
      mimeType: 'image/png',
      provider: 'simulado-teste',
      model: 'fixture-local',
    });
    expect(ambiente.linha.atual?.status).toBe('succeeded');
    expect(ambiente.chamadas.upload).toBe(1);
    expect(ambiente.chamadas.sucesso).toBe(1);
    // Rastreabilidade: o operationId calculado no servidor é persistido.
    expect(ambiente.chamadas.operacoes).toHaveLength(1);
    expect(ambiente.chamadas.operacoes[0]).toMatch(/^ti_[0-9a-f]{32}$/);
    expect(ambiente.chamadas.operacoesRegistradas).toEqual(ambiente.chamadas.operacoes);
  });

  it('envia ao provedor o briefing reconstruído no servidor e os identificadores', async () => {
    const provider = criarProvedorSimulado();
    const ambiente = criarAmbiente({ provider });
    await gerarCapaDeTreinamento(ENTRADA, ambiente.deps);

    const pedido = provider.ultimoPedido!;
    expect(pedido.empresaId).toBe(EMPRESA);
    expect(pedido.artDirection.assunto).toMatch(/segurança/i);
    expect(pedido.artDirection.referencia).toContain('nome: NR-17 Ergonomia');
    expect(pedido.contentHash).toBe(hashConteudoServidor(CONTEUDO));
    expect(pedido.operationId).toMatch(/^ti_[0-9a-f]{32}$/);
  });
});

describe('concorrência e idempotência', () => {
  it('duas solicitações simultâneas geram UMA imagem', async () => {
    const provider = criarProvedorSimulado({ atrasoMs: 5 });
    const ambiente = criarAmbiente({ provider });

    const [a, b] = await Promise.all([
      gerarCapaDeTreinamento(ENTRADA, ambiente.deps),
      gerarCapaDeTreinamento(ENTRADA, ambiente.deps),
    ]);

    expect(provider.chamadas).toBe(1);
    expect(ambiente.chamadas.upload).toBe(1);
    const resultados = [a, b];
    expect(resultados.filter((r) => r.gerado)).toHaveLength(1);
    expect(resultados.some((r) => !r.gerado && r.motivo === 'em_processamento')).toBe(true);
  });

  it('solicitação já concluída devolve ja_processado sem chamar o provedor', async () => {
    const provider = criarProvedorSimulado();
    const ambiente = criarAmbiente({ provider });

    await gerarCapaDeTreinamento(ENTRADA, ambiente.deps);
    const segunda = await gerarCapaDeTreinamento(ENTRADA, ambiente.deps);

    expect(segunda).toEqual({ gerado: false, motivo: 'ja_processado' });
    expect(provider.chamadas).toBe(1);
  });

  it('conteúdo editado (hash novo) libera nova geração', async () => {
    const provider = criarProvedorSimulado();
    const ambiente = criarAmbiente({ provider });
    await gerarCapaDeTreinamento(ENTRADA, ambiente.deps);

    ambiente.deps.carregarConteudo = async () => ({ ...CONTEUDO, name: 'NR-17 Ergonomia Avançada' });
    const segunda = await gerarCapaDeTreinamento(ENTRADA, ambiente.deps);

    expect(segunda.gerado).toBe(true);
    expect(provider.chamadas).toBe(2);
  });

  it('trabalho interrompido segue reivindicável quando o claim libera', async () => {
    const ambiente = criarAmbiente();
    ambiente.linha.atual = {
      id: 'img-1',
      hash: hashConteudoServidor(CONTEUDO),
      status: 'pending',
      attempts: 1,
      storagePath: null,
      erro: null,
    };

    const bloqueado = await gerarCapaDeTreinamento(ENTRADA, ambiente.deps);
    expect(bloqueado).toEqual({ gerado: false, motivo: 'em_processamento' });

    ambiente.linha.atual.status = 'failed';
    const retry = await gerarCapaDeTreinamento(ENTRADA, ambiente.deps);
    expect(retry.gerado).toBe(true);
  });

  it('respeita o limite de tentativas do claim', async () => {
    const provider = criarProvedorSimulado();
    const ambiente = criarAmbiente({ provider });
    ambiente.linha.atual = {
      id: 'img-1',
      hash: hashConteudoServidor(CONTEUDO),
      status: 'failed',
      attempts: TENTATIVAS_MAX_PIPELINE,
      storagePath: null,
      erro: 'falha anterior',
    };

    const resultado = await gerarCapaDeTreinamento(ENTRADA, ambiente.deps);
    expect(resultado).toEqual({ gerado: false, motivo: 'limite_de_tentativas' });
    expect(provider.chamadas).toBe(0);
  });
});

describe('autorização e isolamento', () => {
  it('conteúdo inexistente → conteudo_inexistente (sem distinguir outra empresa)', async () => {
    const provider = criarProvedorSimulado();
    const ambiente = criarAmbiente({ provider, conteudo: null });

    const resultado = await gerarCapaDeTreinamento(ENTRADA, ambiente.deps);
    expect(resultado).toEqual({ gerado: false, motivo: 'conteudo_inexistente' });
    expect(provider.chamadas).toBe(0);
  });

  it('registro carregado de OUTRA empresa é recusado mesmo com UUID válido', async () => {
    const provider = criarProvedorSimulado();
    const ambiente = criarAmbiente({ provider, conteudo: { ...CONTEUDO, empresaId: OUTRA_EMPRESA } });

    const resultado = await gerarCapaDeTreinamento(ENTRADA, ambiente.deps);
    expect(resultado).toEqual({ gerado: false, motivo: 'conteudo_inexistente' });
    expect(provider.chamadas).toBe(0);
  });

  it('entrada inválida não toca no banco nem no provedor', async () => {
    const ambiente = criarAmbiente();
    const carregar = vi.fn(ambiente.deps.carregarConteudo);
    ambiente.deps.carregarConteudo = carregar;

    const resultado = await gerarCapaDeTreinamento(
      { empresaId: '', contentType: 'course', contentId: CURSO },
      ambiente.deps
    );
    expect(resultado).toEqual({ gerado: false, motivo: 'conteudo_inexistente' });
    expect(carregar).not.toHaveBeenCalled();
  });
});

describe('falhas sem quebrar o cadastro', () => {
  it('provedor desativado marca failed imediatamente (sem linha pendente)', async () => {
    const provider: TrainingImageProvider = {
      id: 'desativado-teste',
      configured: false,
      generate: vi.fn(),
    };
    const ambiente = criarAmbiente({ provider });

    const resultado = await gerarCapaDeTreinamento(ENTRADA, ambiente.deps);

    expect(resultado).toEqual({ gerado: false, motivo: 'provedor_desativado' });
    expect(ambiente.linha.atual?.status).toBe('failed');
    expect(ambiente.linha.atual?.erro).toBe('provedor_desativado');
    expect(provider.generate).not.toHaveBeenCalled();
  });

  it('timeout NÃO é reenviado automaticamente (resultado pago desconhecido)', async () => {
    const provider = criarProvedorSimulado({ falha: 'timeout' });
    const ambiente = criarAmbiente({ provider });

    const resultado = await gerarCapaDeTreinamento(ENTRADA, ambiente.deps);

    expect(resultado).toMatchObject({ gerado: false, motivo: 'resultado_desconhecido' });
    expect(ambiente.linha.atual?.status).toBe('failed');
    expect(ambiente.linha.atual?.erro).toMatch(/^resultado_desconhecido: .*tempo limite/);
    expect(ambiente.linha.atual?.attempts).toBe(TENTATIVAS_MAX_PIPELINE);
    // O operationId também é registrado na falha (suporte/reconciliação).
    expect(ambiente.chamadas.operacoes[0]).toMatch(/^ti_[0-9a-f]{32}$/);

    // Segunda chamada NÃO reenvia: o resultado anterior pode ter sido cobrado.
    const segunda = await gerarCapaDeTreinamento(ENTRADA, ambiente.deps);
    expect(segunda).toEqual({ gerado: false, motivo: 'limite_de_tentativas' });
    expect(provider.chamadas).toBe(1);
  });

  it('429 (resultado conhecido) continua retentável e não esgota tentativas', async () => {
    const provider = criarProvedorSimulado({ falha: 'rate_limit' });
    const ambiente = criarAmbiente({ provider });

    const resultado = await gerarCapaDeTreinamento(ENTRADA, ambiente.deps);

    expect(resultado).toMatchObject({ gerado: false, motivo: 'falha_no_provedor' });
    expect(ambiente.linha.atual?.attempts).toBe(1);
    await gerarCapaDeTreinamento(ENTRADA, ambiente.deps);
    expect(provider.chamadas).toBe(2);
  });

  it('falha permanente do provedor esgota tentativas e não repete', async () => {
    const provider = criarProvedorSimulado({ falha: 'http_permanente' });
    const ambiente = criarAmbiente({ provider });

    await gerarCapaDeTreinamento(ENTRADA, ambiente.deps);
    expect(ambiente.linha.atual?.attempts).toBe(TENTATIVAS_MAX_PIPELINE);

    const segunda = await gerarCapaDeTreinamento(ENTRADA, ambiente.deps);
    expect(segunda).toEqual({ gerado: false, motivo: 'limite_de_tentativas' });
    expect(provider.chamadas).toBe(1);
  });

  it('imagem inválida (HTML no lugar da imagem) não sobe para o Storage', async () => {
    const provider = criarProvedorSimulado({ falha: 'imagem_invalida' });
    const ambiente = criarAmbiente({ provider });

    const resultado = await gerarCapaDeTreinamento(ENTRADA, ambiente.deps);

    expect(resultado).toMatchObject({ gerado: false, motivo: 'imagem_invalida' });
    expect(ambiente.chamadas.upload).toBe(0);
    expect(ambiente.linha.atual?.status).toBe('failed');
  });

  it('falha no upload mantém o registro como failed e não marca succeeded', async () => {
    const ambiente = criarAmbiente({ falhaUpload: true });

    const resultado = await gerarCapaDeTreinamento(ENTRADA, ambiente.deps);

    expect(resultado).toMatchObject({ gerado: false, motivo: 'falha_no_upload' });
    expect(ambiente.chamadas.sucesso).toBe(0);
    expect(ambiente.linha.atual?.status).toBe('failed');
  });

  it('falha no upload não gera nova cobrança: próxima tentativa é recusada', async () => {
    const provider = criarProvedorSimulado();
    const ambiente = criarAmbiente({ provider, falhaUpload: true });

    await gerarCapaDeTreinamento(ENTRADA, ambiente.deps);
    const segunda = await gerarCapaDeTreinamento(ENTRADA, ambiente.deps);

    expect(segunda).toEqual({ gerado: false, motivo: 'limite_de_tentativas' });
    expect(provider.chamadas).toBe(1);
  });

  it('falha ao gravar o sucesso devolve falha_no_registro', async () => {
    const ambiente = criarAmbiente({ falhaSucesso: true });

    const resultado = await gerarCapaDeTreinamento(ENTRADA, ambiente.deps);

    expect(resultado).toMatchObject({ gerado: false, motivo: 'falha_no_registro' });
    expect(ambiente.linha.atual?.status).toBe('failed');
  });
});
