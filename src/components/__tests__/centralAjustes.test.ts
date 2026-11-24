import { describe, it, expect } from 'vitest';
import {
  contextoDaJornada,
  contarAjustes,
  dataBR,
  dataCurtaBR,
  faixaExibida,
  filtrarAjustes,
  horaAjuste,
  metaTipoAjuste,
  minutosAjuste,
  paginarAjustes,
  resumoAjustes,
  riscoDoAjuste,
  riscoElevado,
  statusAjuste,
  totalPaginasAjustes,
  variacoesAjustes,
  type SolicitacaoAjustePonto,
} from '../ponto/centralAjustes';

/** Solicitação mínima: cada teste sobrescreve só o que importa. */
function ajuste(overrides: Partial<SolicitacaoAjustePonto> = {}): SolicitacaoAjustePonto {
  return {
    id: 'saj-1',
    colaborador_id: 'colab-1',
    colaborador: { nome_completo: 'Ana Beatriz Souza' },
    data_ponto: '2026-11-03',
    tipo_ponto: 'saida',
    hora_sugerida: '17:00',
    hora_original: null,
    motivo: 'Esqueci de registrar a saída.',
    status: 'pendente',
    relatorio_conformidade: null,
    ...overrides,
  };
}

describe('statusAjuste', () => {
  it('traduz os nomes gravados no banco para os três estados da tela', () => {
    expect(statusAjuste('pendente')).toBe('pendente');
    expect(statusAjuste('aprovado')).toBe('aprovado');
    expect(statusAjuste('recusado')).toBe('rejeitado');
    expect(statusAjuste('rejeitado')).toBe('rejeitado');
  });

  it('trata valores sem decisão como pendente', () => {
    expect(statusAjuste('enviado')).toBe('pendente');
    expect(statusAjuste('rascunho')).toBe('pendente');
    expect(statusAjuste(null)).toBe('pendente');
    expect(statusAjuste(undefined)).toBe('pendente');
  });
});

describe('riscoDoAjuste', () => {
  it('devolve o parecer gravado em ia_risco', () => {
    const risco = riscoDoAjuste(
      ajuste({ relatorio_conformidade: { ia_risco: { nivel: 'alto', resumo: 'Divergência relevante.' } } })
    );
    expect(risco).toEqual({ nivel: 'alto', resumo: 'Divergência relevante.' });
  });

  it('NÃO inventa nível quando o registro não tem análise', () => {
    expect(riscoDoAjuste(ajuste())).toBeNull();
    expect(riscoDoAjuste(ajuste({ relatorio_conformidade: { ia_risco: { nivel: 'x' as never } } }))).toBeNull();
  });

  it('marca risco elevado apenas no nível alto', () => {
    const alto = ajuste({ relatorio_conformidade: { ia_risco: { nivel: 'alto' } } });
    const medio = ajuste({ relatorio_conformidade: { ia_risco: { nivel: 'medio' } } });
    expect(riscoElevado(alto)).toBe(true);
    expect(riscoElevado(medio)).toBe(false);
    expect(riscoElevado(ajuste())).toBe(false);
  });
});

describe('filtrarAjustes', () => {
  const lista = [
    ajuste({
      id: 'a',
      colaborador: { nome_completo: 'Ana Beatriz Souza' },
      status: 'pendente',
      data_ponto: '2026-11-03',
    }),
    ajuste({ id: 'b', colaborador: { nome_completo: 'Márcio Nunes' }, status: 'aprovado', data_ponto: '2026-10-30' }),
    ajuste({ id: 'c', colaborador: { nome_completo: 'Bruno Lima' }, status: 'recusado', data_ponto: '2026-10-01' }),
  ];

  it('sem filtro devolve a lista inteira, na mesma ordem', () => {
    expect(filtrarAjustes(lista).map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('busca por nome ignorando acento e caixa', () => {
    expect(filtrarAjustes(lista, { busca: 'marcio' }).map((s) => s.id)).toEqual(['b']);
    expect(filtrarAjustes(lista, { busca: 'ANA' }).map((s) => s.id)).toEqual(['a']);
  });

  it('filtra pelo estado da tela (recusado conta como rejeitado)', () => {
    expect(filtrarAjustes(lista, { status: 'rejeitado' }).map((s) => s.id)).toEqual(['c']);
    expect(filtrarAjustes(lista, { status: 'aprovado' }).map((s) => s.id)).toEqual(['b']);
    expect(filtrarAjustes(lista, { status: 'todos' })).toHaveLength(3);
  });

  it('recorta a janela de datas nas duas pontas', () => {
    const filtrado = filtrarAjustes(lista, { intervalo: { inicio: '2026-10-02', fim: '2026-11-03' } });
    expect(filtrado.map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('combina busca, status e intervalo', () => {
    expect(
      filtrarAjustes(lista, {
        busca: 'lima',
        status: 'rejeitado',
        intervalo: { inicio: '2026-09-01', fim: '2026-11-30' },
      })
    ).toHaveLength(1);
  });
});

describe('contarAjustes / resumoAjustes', () => {
  const lista = [
    ajuste({ id: 'a', status: 'pendente' }),
    ajuste({ id: 'b', status: 'pendente' }),
    ajuste({ id: 'c', status: 'aprovado' }),
    ajuste({ id: 'd', status: 'recusado' }),
    ajuste({ id: 'e', status: 'pendente', relatorio_conformidade: { ia_risco: { nivel: 'alto' } } }),
  ];

  it('conta por estado e soma risco elevado', () => {
    expect(contarAjustes(lista)).toEqual({ todos: 5, pendentes: 3, aprovadas: 1, rejeitadas: 1 });
    expect(resumoAjustes(lista)).toEqual({ todos: 5, pendentes: 3, aprovadas: 1, rejeitadas: 1, riscoElevado: 1 });
  });

  it('lista vazia devolve zeros (sem NaN e sem percentual)', () => {
    expect(resumoAjustes([])).toEqual({ todos: 0, pendentes: 0, aprovadas: 0, rejeitadas: 0, riscoElevado: 0 });
  });
});

describe('variacoesAjustes', () => {
  const base = { todos: 10, pendentes: 6, aprovadas: 3, rejeitadas: 1, riscoElevado: 2 };

  it('calcula a variação contra o período anterior', () => {
    const anterior = { todos: 6, pendentes: 5, aprovadas: 2, rejeitadas: 1, riscoElevado: 1 };
    expect(variacoesAjustes(base, anterior)).toEqual({
      pendentes: 20,
      aprovadas: 50,
      rejeitadas: 0,
      riscoElevado: 100,
    });
  });

  it('sem base de comparação não existe percentual (null), nunca 0%', () => {
    const vazio = { todos: 0, pendentes: 0, aprovadas: 0, rejeitadas: 0, riscoElevado: 0 };
    expect(variacoesAjustes(base, vazio)).toEqual({
      pendentes: null,
      aprovadas: null,
      rejeitadas: null,
      riscoElevado: null,
    });
  });

  it('queda vira número negativo (a seta do card inverte)', () => {
    const anterior = { todos: 12, pendentes: 8, aprovadas: 6, rejeitadas: 2, riscoElevado: 4 };
    const variacoes = variacoesAjustes(base, anterior);
    expect(variacoes.pendentes).toBe(-25);
    expect(variacoes.aprovadas).toBe(-50);
    expect(variacoes.rejeitadas).toBe(-50);
    expect(variacoes.riscoElevado).toBe(-50);
  });
});

describe('paginação', () => {
  const lista = Array.from({ length: 7 }, (_, i) => ajuste({ id: `s${i + 1}` }));

  it('nunca devolve página zero e limita a última', () => {
    expect(totalPaginasAjustes(7, 6)).toBe(2);
    expect(totalPaginasAjustes(0, 6)).toBe(1);
    expect(paginarAjustes(lista, 1, 6)).toHaveLength(6);
    expect(paginarAjustes(lista, 2, 6).map((s) => s.id)).toEqual(['s7']);
    expect(paginarAjustes(lista, 99, 6).map((s) => s.id)).toEqual(['s7']);
    expect(paginarAjustes(lista, 0, 6)).toHaveLength(6);
  });

  it('descreve a faixa exibida no rodapé', () => {
    expect(faixaExibida(1, 6, 7)).toEqual({ inicio: 1, fim: 6 });
    expect(faixaExibida(2, 6, 7)).toEqual({ inicio: 7, fim: 7 });
    expect(faixaExibida(1, 6, 0)).toEqual({ inicio: 0, fim: 0 });
  });
});

describe('contextoDaJornada', () => {
  const registros = [
    { data: '2026-11-04', entrada_1: '08:00', saida_1: '12:00', saida_2: '17:10' },
    { data: '2026-11-01', entrada_1: '08:05', saida_1: '17:02' },
    { data: '2026-10-30', entrada_1: '08:00', saida_1: '17:00' },
  ];

  it('pega o registro imediatamente anterior e a última batida do dia', () => {
    const contexto = contextoDaJornada(registros, '2026-11-03');
    expect(contexto.anterior).toEqual({ data: '2026-11-01', hora: '17:02' });
    expect(contexto.proximo).toEqual({ data: '2026-11-04' });
  });

  it('sem registro anterior/posterior devolve null nos dois lados', () => {
    expect(contextoDaJornada([], '2026-11-03')).toEqual({ anterior: null, proximo: null });
    const soDepois = contextoDaJornada([{ data: '2026-11-04', entrada_1: '08:00' }], '2026-11-03');
    expect(soDepois.anterior).toBeNull();
    expect(soDepois.proximo).toEqual({ data: '2026-11-04' });
  });

  it('registro anterior sem batida nenhuma mostra hora vazia', () => {
    const contexto = contextoDaJornada([{ data: '2026-11-01' }], '2026-11-03');
    expect(contexto.anterior).toEqual({ data: '2026-11-01', hora: '--:--' });
  });
});

describe('rótulos', () => {
  it('formata data e hora sem depender de fuso', () => {
    expect(dataBR('2026-11-03')).toBe('03/11/2026');
    expect(dataCurtaBR('2026-11-03')).toBe('03/11');
    expect(dataBR(null)).toBe('—');
    expect(horaAjuste('08:12:00')).toBe('08:12');
    expect(horaAjuste(null)).toBe('--:--');
  });

  it('descreve o tipo de batida com o nome do módulo', () => {
    // O intervalo vem entre parênteses: a coluna "Tipo de ajuste" precisa ser
    // legível sozinha ("Saída (almoço)" e não "Saída almoço", que lia como uma
    // terceira batida).
    expect(metaTipoAjuste('saida_almoco').rotulo).toBe('Saída (almoço)');
    expect(metaTipoAjuste('retorno_almoco').rotulo).toBe('Retorno (almoço)');
    expect(metaTipoAjuste('entrada').rotulo).toBe('Entrada');
    expect(metaTipoAjuste('entrada_2').rotulo).toBe('Entrada 2');
    expect(metaTipoAjuste(null).rotulo).toBe('Batida');
    // Toda batida conhecida traz a cor do ÍCONE (só tinta), usada na tabela e no
    // painel sem a caixa colorida.
    expect(metaTipoAjuste('saida').cor).toBe('text-primary');
  });

  it('descreve a divergência em minutos/horas', () => {
    expect(minutosAjuste(0)).toBe('Sem divergência');
    expect(minutosAjuste(undefined)).toBe('Sem divergência');
    expect(minutosAjuste(12)).toBe('12 min');
    expect(minutosAjuste(65)).toBe('1 h 05');
  });
});
