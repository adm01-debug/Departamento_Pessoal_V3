import { describe, expect, it } from 'vitest';
import { ehEtapaDoPipeline, podeArrastarCandidatura } from '../pipelineDragDrop';

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
