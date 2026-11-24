import { describe, it, expect } from 'vitest';
import { lerLogExecucao } from '../logExecucao';

describe('lerLogExecucao', () => {
  it('lê o formato gravado por trigger_workflow_automation', () => {
    const log = [
      {
        timestamp: '2026-05-09T12:00:00+00:00',
        event: 'automation_triggered',
        message: 'Engine de automação iniciou o processamento do workflow',
      },
    ];
    expect(lerLogExecucao(log)).toEqual([
      {
        timestamp: '2026-05-09T12:00:00+00:00',
        event: 'automation_triggered',
        titulo: 'Gatilho de automação acionado',
        message: 'Engine de automação iniciou o processamento do workflow',
      },
    ]);
  });

  it('retorna vazio para null, objeto ou valor inválido', () => {
    expect(lerLogExecucao(null)).toEqual([]);
    expect(lerLogExecucao({})).toEqual([]);
    expect(lerLogExecucao('x')).toEqual([]);
  });

  it('descarta entradas não-objeto, usa o event cru como título desconhecido e ordena por data', () => {
    const eventos = lerLogExecucao([
      'lixo',
      null,
      { timestamp: '2026-05-10T00:00:00Z', event: 'outro_evento' },
      { timestamp: '2026-05-09T00:00:00Z', event: 'automation_triggered', message: 'm' },
    ]);
    expect(eventos.map((e) => e.event)).toEqual(['automation_triggered', 'outro_evento']);
    expect(eventos[1]).toMatchObject({ titulo: 'outro_evento', message: null });
  });
});
