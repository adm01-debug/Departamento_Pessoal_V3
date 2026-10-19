import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  consolidarNineBox360,
  pontos360,
  TIPO_PARA_CATEGORIA,
  type ResultadoConsolidacao360,
} from '@/components/avaliacao/nineBox360';
import {
  NINEBOX_MODO_REAL_ATIVO,
  exigirModoReal,
  modoNineBox,
  ModoRealIndisponivelError,
} from '@/components/avaliacao/nineBoxModo';

/**
 * ============================================================================
 * FASE E — INTEGRAÇÃO LOCAL (modo real DESLIGADO por padrão).
 *
 * Prova: (1) a consolidação oficial 360° a partir de feedbacks persistidos usa a
 * metodologia aprovada; (2) o adaptador entrega a forma que a interface já
 * consome; (3) com o modo real desligado, NENHUMA operação de RPC é executada —
 * o serviço lança erro em vez de simular sucesso.
 *
 * Os testes de RPC usam resposta SIMULADA (`supabase.rpc` mockado) para conferir
 * o contrato de payload/erros — NÃO são homologação do Supabase.
 * ============================================================================
 */

const EMPRESA = 'empresa-a';
const CICLO = 'ciclo-3';
const COLAB = 'col-1';
const RH = 'rh-1';
const VERSAO_GESTOR = 'fb-gestor|2026-09-20T10:00:00|4|concluido';

const fb = (extra: Record<string, unknown> = {}) => ({
  id: 'fb-gestor',
  empresa_id: EMPRESA,
  ciclo_id: CICLO,
  avaliado_id: COLAB,
  avaliador_id: 'aval-1',
  tipo: 'gestor',
  status: 'concluido',
  nota_geral: 4.5,
  potencial: 4,
  created_at: '2026-09-20T10:00:00',
  updated_at: '2026-09-20T10:00:00',
  ...extra,
});

const validacao = {
  versaoAvaliacao: VERSAO_GESTOR,
  validadoPor: RH,
  validadoEm: '2026-09-21T09:00:00',
  empresaId: EMPRESA,
  cicloId: CICLO,
  colaboradorId: COLAB,
  feedbackId: 'fb-gestor',
};
const versoes = { 'fb-gestor': VERSAO_GESTOR };

const consolidar = (feedbacks: Record<string, unknown>[]) =>
  consolidarNineBox360({
    feedbacks,
    cicloId: CICLO,
    empresaId: EMPRESA,
    validacoes: [validacao],
    versoesPorFeedback: versoes,
  });

describe('fase E · consolidação 360 dos feedbacks persistidos', () => {
  it('agrupa por categoria e aplica os pesos aprovados (4,26)', () => {
    const [r] = consolidar([
      fb({ id: 'fb-gestor' }),
      fb({ id: 'fb-par', tipo: 'par', nota_geral: 4.0, potencial: null, updated_at: '2026-09-19T10:00:00' }),
      fb({ id: 'fb-auto', tipo: 'auto', nota_geral: 3.5, potencial: null }),
      fb({ id: 'fb-sub', tipo: 'subordinado', nota_geral: 4.2, potencial: null }),
    ]);
    expect(r.classificavel).toBe(true);
    expect(r.desempenho).toBeCloseTo(4.26, 10);
    expect(r.categoriasUsadas).toEqual(['gestor', 'par', 'auto', 'subordinado']);
    expect(r.categorias.map((c) => c.categoria)).toEqual(['gestor', 'par', 'auto', 'subordinado']);
  });

  it('mapeia os tipos para as quatro categorias (inclui variações)', () => {
    expect(TIPO_PARA_CATEGORIA.autoavaliacao).toBe('auto');
    expect(TIPO_PARA_CATEGORIA.pares).toBe('par');
    expect(TIPO_PARA_CATEGORIA.subordinados).toBe('subordinado');
  });

  it('sem gestor não classifica, mesmo com as demais categorias presentes', () => {
    const [r] = consolidar([fb({ id: 'fb-par', tipo: 'par', nota_geral: 5 })]);
    expect(r.classificavel).toBe(false);
    expect(r.motivo).toBe('sem_gestor');
  });

  it('feedback pendente não entra como gestor concluído', () => {
    const [r] = consolidar([fb({ id: 'fb-gestor', status: 'pendente' })]);
    expect(r.motivo).toBe('gestor_pendente');
    expect(r.desempenho).toBeNull();
    expect(r.classificavel).toBe(false);
  });

  it('substituição dentro da categoria é sinalizada e o mais recente prevalece', () => {
    const [r] = consolidar([
      fb({ id: 'fb-gestor', nota_geral: 3, updated_at: '2026-09-01T10:00:00' }),
      fb({ id: 'fb-gestor-2', nota_geral: 5, updated_at: '2026-09-25T10:00:00' }),
    ]);
    const gestor = r.categorias.find((c) => c.categoria === 'gestor')!;
    expect(gestor.registrosElegiveis).toBe(2);
    expect(gestor.substituicaoDeConcluida).toBe(true);
    expect(r.substituicaoDeConcluida).toBe(true);
    expect(gestor.feedbackId).toBe('fb-gestor-2');
  });

  it('sem validação do RH o colaborador fica pendente de validação', () => {
    const [r] = consolidarNineBox360({
      feedbacks: [fb()],
      cicloId: CICLO,
      empresaId: EMPRESA,
      versoesPorFeedback: versoes,
    });
    expect(r.motivo).toBe('potencial_sem_validacao');
  });

  it('classifica com a validação do RH na forma CRUA do banco (snake_case)', () => {
    // Regressão: o serviço entrega a LINHA CRUA de `feedbacks_360_validacoes_potencial`
    // (colaborador_id / versao_avaliacao / validado_por / …). Sem a adaptação, o motor
    // não reconhecia a aprovação e o colaborador caía em `potencial_sem_validacao`.
    const validacaoCrua = {
      id: 'val-1',
      empresa_id: EMPRESA,
      ciclo_id: CICLO,
      colaborador_id: COLAB,
      feedback_id: 'fb-gestor',
      versao_avaliacao: VERSAO_GESTOR,
      potencial_validado: 4,
      validado_por: RH,
      validado_em: '2026-09-21T09:00:00',
      observacao: 'HOMOLOG-NB',
    };
    const [r] = consolidarNineBox360({
      feedbacks: [fb()],
      cicloId: CICLO,
      empresaId: EMPRESA,
      validacoes: [validacaoCrua as never],
      versoesPorFeedback: versoes,
    });
    expect(r.classificavel).toBe(true);
    expect(r.motivo).toBeNull();
    expect(r.quadrante).not.toBeNull();
  });

  it('validação de OUTRA versão não classifica (aprovação desatualizada)', () => {
    const validacaoCrua = {
      empresa_id: EMPRESA,
      ciclo_id: CICLO,
      colaborador_id: COLAB,
      feedback_id: 'fb-gestor',
      versao_avaliacao: 'versao-antiga',
      validado_por: RH,
      validado_em: '2026-09-21T09:00:00',
    };
    const [r] = consolidarNineBox360({
      feedbacks: [fb()],
      cicloId: CICLO,
      empresaId: EMPRESA,
      validacoes: [validacaoCrua as never],
      versoesPorFeedback: versoes,
    });
    expect(r.classificavel).toBe(false);
    expect(r.motivo).toBe('potencial_sem_validacao');
  });

  it('aprovado SEM validação: motivo do RH e indicador de pendência (não some da aba)', () => {
    const [r] = consolidarNineBox360({
      feedbacks: [fb()],
      cicloId: CICLO,
      empresaId: EMPRESA,
      versoesPorFeedback: versoes,
      aprovacoes: [{ ciclo_id: CICLO, colaborador_id: COLAB, decisao: 'aprovado', versao_avaliacao: 'v-grupo' }],
      consolidacoes: [{ ciclo_id: CICLO, colaborador_id: COLAB, versao_consolidada: 'v-grupo' }],
    });
    expect(r.classificavel).toBe(false);
    expect(r.motivo).toBe('potencial_sem_validacao');
    expect(r.quadrante).toBeNull();
    const [ponto] = pontos360([r]);
    expect(ponto).toMatchObject({
      quadrante: null,
      aguardandoValidacaoRh: true,
      aguardandoAprovacao: false,
      motivoNaoClassificado: 'potencial_sem_validacao',
      motivoNaoClassificadoTexto: 'Potencial aguardando validação do RH.',
    });
  });

  it('aprovado + validação vigente: classifica no quadrante (flags desligadas)', () => {
    const [r] = consolidarNineBox360({
      feedbacks: [fb()],
      cicloId: CICLO,
      empresaId: EMPRESA,
      validacoes: [validacao],
      versoesPorFeedback: versoes,
      aprovacoes: [{ ciclo_id: CICLO, colaborador_id: COLAB, decisao: 'aprovado', versao_avaliacao: 'v-grupo' }],
      consolidacoes: [{ ciclo_id: CICLO, colaborador_id: COLAB, versao_consolidada: 'v-grupo' }],
    });
    expect(r.classificavel).toBe(true);
    expect(r.motivo).toBeNull();
    const [ponto] = pontos360([r]);
    expect(ponto.quadrante).not.toBeNull();
    expect(ponto.aguardandoValidacaoRh).toBe(false);
    expect(ponto.aguardandoAprovacao).toBe(false);
  });

  it('decisão de versão ANTIGA não vale: aprovacao_pendente, sem quadrante', () => {
    const [r] = consolidarNineBox360({
      feedbacks: [fb()],
      cicloId: CICLO,
      empresaId: EMPRESA,
      validacoes: [validacao],
      versoesPorFeedback: versoes,
      aprovacoes: [{ ciclo_id: CICLO, colaborador_id: COLAB, decisao: 'aprovado', versao_avaliacao: 'v-antiga' }],
      consolidacoes: [{ ciclo_id: CICLO, colaborador_id: COLAB, versao_consolidada: 'v-grupo' }],
    });
    expect(r.classificavel).toBe(false);
    expect(r.motivo).toBe('aprovacao_pendente');
    expect(r.quadrante).toBeNull();
  });

  it('devolvida pelo gestor: aprovacao_devolvida (não entra mesmo com validação antiga)', () => {
    const [r] = consolidarNineBox360({
      feedbacks: [fb()],
      cicloId: CICLO,
      empresaId: EMPRESA,
      validacoes: [validacao],
      versoesPorFeedback: versoes,
      aprovacoes: [{ ciclo_id: CICLO, colaborador_id: COLAB, decisao: 'devolvido', versao_avaliacao: 'v-grupo' }],
      consolidacoes: [{ ciclo_id: CICLO, colaborador_id: COLAB, versao_consolidada: 'v-grupo' }],
    });
    expect(r.motivo).toBe('aprovacao_devolvida');
    expect(r.quadrante).toBeNull();
  });

  it('sem aprovação informada no fluxo: aprovacao_pendente (validação não substitui)', () => {
    const [r] = consolidarNineBox360({
      feedbacks: [fb()],
      cicloId: CICLO,
      empresaId: EMPRESA,
      validacoes: [validacao],
      versoesPorFeedback: versoes,
      aprovacoes: [],
      consolidacoes: [],
    });
    expect(r.motivo).toBe('aprovacao_pendente');
    expect(r.classificavel).toBe(false);
  });

  it('o adaptador entrega a forma da interface (quadrante + motivo preservados)', () => {
    const [r] = consolidar([fb({ nota_geral: 4, potencial: 4 })]);
    const [ponto] = pontos360(
      [r],
      [{ id: COLAB, nome_completo: 'Ana Souza', cargo: 'Analista', departamento: 'RH', foto_url: null } as never]
    );
    expect(ponto).toMatchObject({
      colaboradorId: COLAB,
      nome: 'Ana Souza',
      cargo: 'Analista',
      departamento: 'RH',
      quadrante: '3-3',
      nomeQuadrante: 'Estrela',
      motivoNaoClassificado: null,
    });
    expect(ponto.pontuacao).toBeCloseTo((r.desempenho ?? 0) + (r.potencial ?? 0), 10);
  });

  it('sem classificação, o adaptador expõe o motivo (nada de quadrante inventado)', () => {
    const [r] = consolidar([fb({ id: 'fb-par', tipo: 'par' })]);
    const [ponto] = pontos360([r] as ResultadoConsolidacao360[]);
    expect(ponto.quadrante).toBeNull();
    expect(ponto.motivoNaoClassificado).toBe('sem_gestor');
  });
});

describe('fase E · portão do modo real (padrão desligado)', () => {
  it('o modo é demonstração por padrão', () => {
    expect(NINEBOX_MODO_REAL_ATIVO).toBe(false);
    expect(modoNineBox()).toBe('demonstracao');
  });

  it('operações de banco lançam erro claro em vez de simular sucesso', () => {
    expect(() => exigirModoReal('Finalizar avaliação')).toThrow(ModoRealIndisponivelError);
    try {
      exigirModoReal('Validar potencial');
    } catch (e) {
      expect((e as Error).message).toContain('DESATIVADO');
      expect((e as Error).message).toContain('Nenhuma gravação foi simulada');
    }
  });
});

describe('fase E · contrato das RPCs (respostas SIMULADAS — não é homologação)', () => {
  const rpc = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.doMock('@/integrations/supabase/client', () => ({ supabase: { rpc, from: vi.fn() } }));
    rpc.mockReset();
  });
  afterEach(() => vi.doUnmock('@/integrations/supabase/client'));

  it('ID FICTÍCIO nunca chega à RPC (mesmo com a área em demonstração)', async () => {
    const { avaliacaoService } = await import('@/services/avaliacaoService');
    // Comparamos pelo NOME do erro: o módulo é reimportado e a identidade da
    // classe muda entre instâncias do registry.
    await expect(
      avaliacaoService.finalizarFeedback({ feedbackId: 'mock-fb-1', acao: 'concluir', idOperacao: 'op-1' })
    ).rejects.toMatchObject({ name: 'EscritaBloqueadaError' });
    expect(rpc).not.toHaveBeenCalled();
  });
});
