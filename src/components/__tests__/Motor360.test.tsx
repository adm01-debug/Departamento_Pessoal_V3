import { describe, it, expect } from 'vitest';
import {
  CATEGORIAS_360,
  CONTRATO_VERSAO_AVALIACAO,
  METODOLOGIA_360,
  MOTIVO_NAO_CLASSIFICADO_360,
  PESOS_360,
  categoriasDisponiveis,
  consolidar360,
  pesosEfetivos,
  validacaoAplicavel,
  type ValidacaoPotencial,
} from '@/components/avaliacao/motorAvaliacao360';
import { QUADRANTE_POR_CHAVE } from '@/components/avaliacao/nineBoxComum';

/** Monta a versão canônica como o BANCO a produz (o front nunca a calcula). */
const versao = (id: string, updatedAt: string, potencial: number | string, status: string) =>
  `${id}|${updatedAt}|${potencial}|${status}`;

const VERSOES = { versaoGestor: versao('fb-gestor', '2026-09-20T10:00:00', 4, 'concluido') };

/**
 * ============================================================================
 * MOTOR 360° — prova da metodologia aprovada.
 *
 * Cobre: pesos fixos 60/25/10/5, redistribuição proporcional, gestor
 * obrigatório, potencial exclusivo do gestor com validação do RH vinculada à
 * versão da avaliação, e classificação nos nove quadrantes.
 * ============================================================================
 */

const EMPRESA = 'empresa-a';
const CICLO = 'ciclo-3';
const COLAB = 'col-1';
const RH = 'rh-user-1';

const validacao = (parcial: Partial<ValidacaoPotencial> = {}): ValidacaoPotencial => ({
  versaoAvaliacao: VERSOES.versaoGestor,
  validadoPor: RH,
  validadoEm: '2026-09-21T09:00:00',
  empresaId: EMPRESA,
  cicloId: CICLO,
  colaboradorId: COLAB,
  feedbackId: 'fb-gestor',
  ...parcial,
});

describe('360 · pesos aprovados', () => {
  it('são exatamente Gestor 60 · Pares 25 · Auto 10 · Subordinados 5', () => {
    expect(PESOS_360).toEqual({ gestor: 0.6, par: 0.25, auto: 0.1, subordinado: 0.05 });
    expect(METODOLOGIA_360.versao).toBe('360-v1');
    expect(METODOLOGIA_360.aprovada).toBe(true);
  });

  it('somam 100% e estão centralizados (nenhum número solto no motor)', () => {
    const soma = CATEGORIAS_360.reduce((t, c) => t + METODOLOGIA_360.pesos[c], 0);
    expect(soma).toBeCloseTo(1, 12);
  });
});

describe('360 · cálculo ponderado', () => {
  it('reproduz o exemplo do documento: 4,26', () => {
    const r = consolidar360({
      empresaId: EMPRESA,
      cicloId: CICLO,
      colaboradorId: COLAB,
      notas: { gestor: 4.5, par: 4.0, auto: 3.5, subordinado: 4.2 },
      status: { gestor: 'concluido', par: 'concluido', auto: 'concluido', subordinado: 'concluido' },
      potencialGestor: 4,
      validacaoPotencial: validacao(),
      ...VERSOES,
    });
    expect(r.classificavel).toBe(true);
    expect(r.desempenho).toBeCloseTo(4.26, 10);
    expect(r.categoriasUsadas).toEqual(['gestor', 'par', 'auto', 'subordinado']);
    expect(r.pesosEfetivos).toEqual({ gestor: 0.6, par: 0.25, auto: 0.1, subordinado: 0.05 });
  });

  it('redistribui proporcionalmente quando falta uma categoria (sem subordinados)', () => {
    const r = consolidar360({
      empresaId: EMPRESA,
      cicloId: CICLO,
      colaboradorId: COLAB,
      notas: { gestor: 4.5, par: 4.0, auto: 3.5 },
      status: { gestor: 'concluido', par: 'concluido', auto: 'concluido' },
      potencialGestor: 4,
      validacaoPotencial: validacao(),
      ...VERSOES,
    });
    // (4,5×60 + 4,0×25 + 3,5×10) / 95 — categoria ausente NÃO vira zero.
    expect(r.desempenho).toBeCloseTo(405 / 95, 11);
    expect(r.pesosEfetivos.gestor).toBeCloseTo(60 / 95, 11);
    expect(r.pesosEfetivos.par).toBeCloseTo(25 / 95, 11);
    expect(r.pesosEfetivos.auto).toBeCloseTo(10 / 95, 11);
    const somaEfetiva = Object.values(r.pesosEfetivos).reduce((t, v) => t + (v ?? 0), 0);
    expect(somaEfetiva).toBeCloseTo(1, 11);
  });

  it('com apenas o gestor, ele responde por 100% do desempenho', () => {
    const r = consolidar360({
      empresaId: EMPRESA,
      cicloId: CICLO,
      colaboradorId: COLAB,
      notas: { gestor: 3.6 },
      status: { gestor: 'concluido' },
      potencialGestor: 3.6,
      validacaoPotencial: validacao(),
      ...VERSOES,
    });
    expect(r.classificavel).toBe(true);
    expect(r.desempenho).toBeCloseTo(3.6, 12);
    expect(r.pesosEfetivos).toEqual({ gestor: 1 });
    expect(r.quadrante).toBe('3-3');
  });

  it('não arredonda durante o cálculo', () => {
    const r = consolidar360({
      empresaId: EMPRESA,
      cicloId: CICLO,
      colaboradorId: COLAB,
      notas: { gestor: 4.5, par: 4.0 },
      status: { gestor: 'concluido', par: 'concluido' },
      potencialGestor: 4,
      validacaoPotencial: validacao(),
      ...VERSOES,
    });
    expect(r.desempenho).toBeCloseTo(370 / 85, 12); // 4,35294117...
    expect(String(r.desempenho)).not.toBe('4.4');
  });
});

describe('360 · gestor obrigatório (sem redistribuir os 60%)', () => {
  const semGestor = (notas: Record<string, number | null>, status: Record<string, string> = {}) =>
    consolidar360({
      empresaId: EMPRESA,
      cicloId: CICLO,
      colaboradorId: COLAB,
      notas,
      status,
      potencialGestor: 4,
      validacaoPotencial: validacao(),
      ...VERSOES,
    });

  it('ausência do gestor impede a classificação mesmo com todas as outras notas', () => {
    const r = semGestor({ gestor: null, par: 5, auto: 5, subordinado: 5 });
    expect(r.classificavel).toBe(false);
    expect(r.motivo).toBe('sem_gestor');
    expect(r.desempenho).toBeNull();
    expect(r.quadrante).toBeNull();
    expect(r.categoriasUsadas).toEqual([]);
  });

  it('gestor pendente não classifica', () => {
    const r = semGestor({ gestor: 4, par: 4 }, { gestor: 'pendente', par: 'concluido' });
    expect(r.motivo).toBe('gestor_pendente');
  });

  it('gestor cancelado não classifica', () => {
    const r = semGestor({ gestor: 4 }, { gestor: 'cancelado' });
    expect(r.motivo).toBe('gestor_pendente');
  });

  it('nota do gestor fora da escala não classifica', () => {
    expect(semGestor({ gestor: 7 }).motivo).toBe('sem_gestor');
    expect(semGestor({ gestor: 0 }).motivo).toBe('sem_gestor');
  });

  it('sem colaborador e sem ciclo a classificação é recusada', () => {
    expect(consolidar360({ empresaId: EMPRESA, cicloId: CICLO, colaboradorId: '', notas: { gestor: 4 } }).motivo).toBe(
      'sem_colaborador'
    );
    expect(
      consolidar360({ empresaId: EMPRESA, cicloId: null, colaboradorId: COLAB, notas: { gestor: 4 } }).motivo
    ).toBe('sem_ciclo');
  });
});

describe('360 · potencial exclusivo do gestor + validação do RH', () => {
  const base = {
    empresaId: EMPRESA,
    cicloId: CICLO,
    colaboradorId: COLAB,
    notas: { gestor: 4, par: 5, auto: 5 },
    status: { gestor: 'concluido', par: 'concluido', auto: 'concluido' },
  };

  it('potencial ausente bloqueia (as outras categorias não o substituem)', () => {
    const r = consolidar360({ ...base, potencialGestor: null, validacaoPotencial: validacao(), ...VERSOES });
    expect(r.motivo).toBe('gestor_sem_potencial');
    expect(r.desempenho).not.toBeNull(); // o desempenho pode ser calculado…
    expect(r.classificavel).toBe(false); // …mas não há classificação oficial
  });

  it('potencial válido classifica SEM validação posterior do RH', () => {
    const r = consolidar360({ ...base, potencialGestor: 4, validacaoPotencial: null, ...VERSOES });
    expect(r.motivo).toBeNull();
    expect(r.potencial).toBe(4);
    expect(r.classificavel).toBe(true);
  });

  it('snapshot aprovado é a fonte oficial e não exige feedback de gestor', () => {
    const r = consolidar360({
      empresaId: EMPRESA,
      cicloId: CICLO,
      colaboradorId: COLAB,
      notas: {},
      status: {},
      aprovado: true,
      desempenhoAprovado: 4.25,
      potencialAprovado: 4,
    });
    expect(r.classificavel).toBe(true);
    expect(r.desempenho).toBe(4.25);
    expect(r.quadrante).toBe('3-3');
  });

  it('snapshot aprovado inválido bloqueia com motivo explícito', () => {
    const r = consolidar360({
      empresaId: EMPRESA,
      cicloId: CICLO,
      colaboradorId: COLAB,
      notas: {},
      status: {},
      aprovado: true,
      desempenhoAprovado: null,
      potencialAprovado: 4,
    });
    expect(r.motivo).toBe('aprovacao_sem_valores');
    expect(r.classificavel).toBe(false);
  });

  it('validação de outra empresa, ciclo ou colaborador não vale (isolamento)', () => {
    const atual = {
      versaoAvaliacao: VERSOES.versaoGestor,
      empresaId: EMPRESA,
      cicloId: CICLO,
      colaboradorId: COLAB,
    };
    expect(validacaoAplicavel(validacao(), atual)).toBe(true);
    expect(validacaoAplicavel(validacao({ empresaId: 'empresa-b' }), atual)).toBe(false);
    expect(validacaoAplicavel(validacao({ cicloId: 'outro-ciclo' }), atual)).toBe(false);
    expect(validacaoAplicavel(validacao({ colaboradorId: 'outro' }), atual)).toBe(false);
    expect(validacaoAplicavel(validacao({ validadoPor: '' }), atual)).toBe(false);
    expect(validacaoAplicavel(null, atual)).toBe(false);
  });

  it('potencial validado classifica e guarda quem validou', () => {
    const r = consolidar360({ ...base, potencialGestor: 4, validacaoPotencial: validacao(), ...VERSOES });
    expect(r.classificavel).toBe(true);
    expect(r.validacaoPotencial).toEqual({ validadoPor: RH, validadoEm: '2026-09-21T09:00:00' });
    expect(r.substituicaoDeConcluida).toBe(false);
  });

  it('a versão canônica vem do BANCO — o front apenas compara', () => {
    expect(CONTRATO_VERSAO_AVALIACAO.autoridade).toBe('banco');
    expect(CONTRATO_VERSAO_AVALIACAO.view).toBe('public.vw_feedbacks_360_versao');
    expect(CONTRATO_VERSAO_AVALIACAO.funcao).toBe('public.versao_avaliacao_feedback(uuid)');
    const atual = {
      versaoAvaliacao: VERSOES.versaoGestor,
      empresaId: EMPRESA,
      cicloId: CICLO,
      colaboradorId: COLAB,
    };
    expect(validacaoAplicavel(validacao(), atual)).toBe(true);
  });

  it('mudança de versão (nota, updated_at ou REABERTURA) invalida a aprovação anterior', () => {
    const versoesInvalidantes = [
      versao('fb-gestor', '2026-09-20T10:00:00', 5, 'concluido'), // potencial mudou
      versao('fb-gestor', '2026-09-25T08:00:00', 4, 'concluido'), // atualização posterior
      versao('fb-gestor', '2026-09-20T10:00:00', 4, 'pendente'), // reaberta
      versao('fb-gestor', '2026-09-20T10:00:00', 4, 'cancelado'), // cancelada
    ];
    versoesInvalidantes.forEach((v) => {
      const atual = {
        versaoAvaliacao: v,
        empresaId: EMPRESA,
        cicloId: CICLO,
        colaboradorId: COLAB,
      };
      expect(validacaoAplicavel(validacao(), atual)).toBe(false);
    });
  });

  it('reabertura é barrada pelo gate de aprovação, não pelo motor', () => {
    const r = consolidar360({
      ...base,
      potencialGestor: 4,
      validacaoPotencial: validacao(),
      versaoGestor: versao('fb-gestor', '2026-09-20T10:00:00', 4, 'pendente'),
    });
    expect(r.classificavel).toBe(true); // motor calcula; o gate da decisão barra
  });

  it('versão vazia (banco não devolveu) nunca autoriza', () => {
    const semVersao = { versaoAvaliacao: '', empresaId: EMPRESA, cicloId: CICLO, colaboradorId: COLAB };
    expect(validacaoAplicavel(validacao({ versaoAvaliacao: '' }), semVersao)).toBe(false);
    expect(validacaoAplicavel(validacao({ versaoAvaliacao: VERSOES.versaoGestor }), semVersao)).toBe(false);
  });

  it('aprovação repetida da MESMA versão continua válida (idempotência por versão)', () => {
    const atual = {
      versaoAvaliacao: VERSOES.versaoGestor,
      empresaId: EMPRESA,
      cicloId: CICLO,
      colaboradorId: COLAB,
    };
    expect(validacaoAplicavel(validacao(), atual)).toBe(true);
    expect(validacaoAplicavel(validacao({ validadoEm: '2026-09-21T10:30:00' }), atual)).toBe(true);
  });
});

describe('360 · nove quadrantes, limiares e rastreabilidade', () => {
  const classificar = (desempenho: number, potencial: number) =>
    consolidar360({
      empresaId: EMPRESA,
      cicloId: CICLO,
      colaboradorId: COLAB,
      notas: { gestor: desempenho },
      status: { gestor: 'concluido' },
      potencialGestor: potencial,
      validacaoPotencial: validacao(),
      ...VERSOES,
    });

  it('cobre os nove quadrantes preservando a nomenclatura aprovada', () => {
    // Notas reais que caem em cada faixa: 1,5 → faixa 1 · 3,0 → faixa 2 · 4,0 → faixa 3.
    const casos: [number, number, string][] = [
      [1.5, 1.5, '1-1'],
      [1.5, 3.0, '1-2'],
      [1.5, 4.0, '1-3'],
      [3.0, 1.5, '2-1'],
      [3.0, 3.0, '2-2'],
      [3.0, 4.0, '2-3'],
      [4.0, 1.5, '3-1'],
      [4.0, 3.0, '3-2'],
      [4.0, 4.0, '3-3'],
    ];
    casos.forEach(([desempenho, potencial, esperado]) => {
      const r = classificar(desempenho, potencial);
      expect(r.quadrante).toBe(esperado);
      expect(QUADRANTE_POR_CHAVE[esperado as keyof typeof QUADRANTE_POR_CHAVE].nome).toBeTruthy();
    });
  });

  it('preserva os limiares atuais (1,5 / 3,5) nas fronteiras', () => {
    expect(classificar(1.5, 3).quadrante?.startsWith('1')).toBe(true);
    expect(classificar(1.6, 3).quadrante?.startsWith('2')).toBe(true);
    expect(classificar(3.5, 3).quadrante?.startsWith('2')).toBe(true);
    expect(classificar(3.6, 3).quadrante?.startsWith('3')).toBe(true);
  });

  it('a classificação é determinística (mesma entrada, mesmo resultado)', () => {
    const a = classificar(4.26, 4);
    const b = classificar(4.26, 4);
    expect(a.quadrante).toBe(b.quadrante);
    expect(a.desempenho).toBe(b.desempenho);
  });

  it('leva a metodologia usada junto do resultado (histórico explicável)', () => {
    const r = classificar(4, 4);
    expect(r.metodologia.versao).toBe('360-v1');
    expect(r.metodologia.pesos.gestor).toBe(0.6);
  });

  it('propaga o sinal de substituição de avaliação concluída (não silenciosa)', () => {
    const r = consolidar360({
      empresaId: EMPRESA,
      cicloId: CICLO,
      colaboradorId: COLAB,
      notas: { gestor: 4 },
      status: { gestor: 'concluido' },
      potencialGestor: 4,
      validacaoPotencial: validacao(),
      substituicaoDeConcluida: true,
      ...VERSOES,
    });
    expect(r.substituicaoDeConcluida).toBe(true);
  });

  it('categoriasDisponiveis descarta fora da escala e status não concluído', () => {
    expect(
      categoriasDisponiveis(
        { gestor: 4, par: 7, auto: null, subordinado: 3 },
        { gestor: 'concluido', par: 'concluido', auto: 'concluido', subordinado: 'cancelado' }
      )
    ).toEqual(['gestor']);
    expect(categoriasDisponiveis({ gestor: 4 }, { gestor: 'pendente' })).toEqual([]);
  });

  it('pesosEfetivos devolve null sem categorias disponíveis (nada de nota fictícia)', () => {
    expect(pesosEfetivos([])).toBeNull();
  });

  it('todo motivo de não classificação tem texto de pendência', () => {
    Object.values(MOTIVO_NAO_CLASSIFICADO_360).forEach((t) => expect(t.length).toBeGreaterThan(10));
  });
});
