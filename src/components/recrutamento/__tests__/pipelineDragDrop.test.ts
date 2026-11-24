import { describe, expect, it } from 'vitest';
import { ehEtapaDoPipeline, normalizarEtapa, podeArrastarCandidatura } from '../pipelineDragDrop';

describe('normalizarEtapa', () => {
  it('aceita somente as cinco etapas do pipeline', () => {
    expect(normalizarEtapa('entrevista')).toBe('entrevista');
    expect(normalizarEtapa('contratado')).toBe('contratado');
  });

  it('cai em triagem para nulo, vazio ou valor desconhecido', () => {
    expect(normalizarEtapa(null)).toBe('triagem');
    expect(normalizarEtapa(undefined)).toBe('triagem');
    expect(normalizarEtapa('')).toBe('triagem');
    expect(normalizarEtapa('arquivado')).toBe('triagem');
  });
});

describe('ehEtapaDoPipeline', () => {
  it('reconhece apenas ids de etapa (o alvo do drop vem da coluna)', () => {
    expect(ehEtapaDoPipeline('triagem')).toBe(true);
    expect(ehEtapaDoPipeline('proposta')).toBe(true);
    expect(ehEtapaDoPipeline('coluna-x')).toBe(false);
    expect(ehEtapaDoPipeline(null)).toBe(false);
  });
});

describe('podeArrastarCandidatura', () => {
  it('libera candidaturas em andamento e contratadas', () => {
    expect(podeArrastarCandidatura('em_andamento')).toBe(true);
    expect(podeArrastarCandidatura('contratado')).toBe(true);
    expect(podeArrastarCandidatura(null)).toBe(true);
  });

  it('bloqueia estados fora do fluxo (arquivada, rejeitada, cancelada)', () => {
    for (const status of ['arquivado', 'Arquivada', 'rejeitado', 'rejeitada', 'cancelado', 'cancelada']) {
      expect(podeArrastarCandidatura(status)).toBe(false);
    }
  });
});
