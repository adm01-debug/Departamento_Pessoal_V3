import { describe, expect, it } from 'vitest';
import {
  FILTROS_EXTRATO_PADRAO,
  PERIODO_EXTRATO_PADRAO,
  barrasDeTotais,
  chaveCascataExtrato,
  colaboradoresNegativos,
  compararPeriodos,
  contarTiposExtrato,
  evolucaoSaldo,
  filtrarExtrato,
  formatarDataBR,
  formatarHorasBanco,
  formatarIntervaloBanco,
  horasComSinal,
  horasDoRegistro,
  lerIntervalo,
  linhasParaExportacao,
  miniBarras,
  ordenarExtrato,
  recortarPorPeriodo,
  registroComSaldoNegativo,
  resumirHoras,
  resumirSituacaoSaldos,
  saldosPorColaborador,
  temFiltroExtratoAtivo,
  tipoDoRegistro,
  type RegistroBancoHoras,
} from '@/components/banco-horas/bancoHorasComum';

/**
 * ============================================================================
 * Derivações do Banco de Horas.
 *
 * A tela inteira (KPI Cards, rosca, barras, alerta, evolução e extrato) lê
 * daqui, então o que se prova abaixo é a MATEMÁTICA que o usuário vê:
 *   • `interval` do Postgres como texto → horas decimais;
 *   • crédito soma, tudo o mais subtrai;
 *   • "saldo do período" = créditos − débitos (e é o último ponto da curva);
 *   • "saldo atual" = último `saldo_atual` de cada colaborador (foto da equipe);
 *   • escalas comparáveis nas barras de totais.
 * Nenhum teste depende do relógio da máquina: as datas são literais.
 * ============================================================================
 */

/** Lançamento cru, no formato que o PostgREST devolve. */
function registro(over: Partial<RegistroBancoHoras> = {}): RegistroBancoHoras {
  return {
    id: 'r1',
    colaborador_id: 'c1',
    data: '2026-03-02',
    horas: '02:00:00',
    tipo: 'credito',
    motivo: 'Compensação',
    saldo_anterior: '00:00:00',
    saldo_atual: '02:00:00',
    created_at: '2026-03-02T10:00:00.000Z',
    colaborador: { nome_completo: 'Maria Silva', departamento: 'Operações' },
    ...over,
  };
}

describe('leitura de um lançamento', () => {
  it('trata "credito" (com e sem acento) como crédito e todo o resto como débito', () => {
    expect(tipoDoRegistro(registro({ tipo: 'credito' }))).toBe('credito');
    expect(tipoDoRegistro(registro({ tipo: 'CRÉDITO' }))).toBe('credito');
    expect(tipoDoRegistro(registro({ tipo: 'debito' }))).toBe('debito');
    expect(tipoDoRegistro(registro({ tipo: 'ajuste manual' }))).toBe('debito');
    expect(tipoDoRegistro(registro({ tipo: null }))).toBe('debito');
  });

  it('converte o interval textual e aplica o sinal do tipo', () => {
    expect(horasDoRegistro(registro({ horas: '02:30:00' }))).toBe(2.5);
    expect(horasDoRegistro(registro({ horas: '1 day 02:00:00' }))).toBe(26);
    expect(horasDoRegistro(registro({ horas: '00:00' }))).toBe(0);
    expect(horasComSinal(registro({ tipo: 'credito', horas: '02:30:00' }))).toBe(2.5);
    expect(horasComSinal(registro({ tipo: 'debito', horas: '02:30:00' }))).toBe(-2.5);
  });

  it('distingue valor AUSENTE de valor ZERO', () => {
    expect(lerIntervalo(null)).toBeNull();
    expect(lerIntervalo('')).toBeNull();
    expect(lerIntervalo('00:00:00')).toBe(0);
    expect(formatarIntervaloBanco(null)).toBe('—');
    expect(formatarIntervaloBanco('00:00:00')).toBe('0h00');
  });

  it('formata horas no padrão da família de horas do sistema', () => {
    expect(formatarHorasBanco(2.5)).toBe('2h30');
    expect(formatarHorasBanco(-12.5)).toBe('-12h30');
    expect(formatarHorasBanco(0)).toBe('0h00');
    expect(formatarHorasBanco(null)).toBe('—');
  });
});

describe('recorte e filtros do extrato', () => {
  const registros = [
    registro({ id: 'a', data: '2026-03-01' }),
    registro({ id: 'b', data: '2026-03-02' }),
    registro({ id: 'c', data: '2026-03-05' }),
    registro({ id: 'd', data: null }),
  ];

  it('recorta pelas duas pontas, deixando as pontas vazias abertas', () => {
    expect(recortarPorPeriodo(registros, { de: '', ate: '' }).map((r) => r.id)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
    expect(recortarPorPeriodo(registros, { de: '2026-03-02', ate: '2026-03-05' }).map((r) => r.id)).toEqual(
      ['b', 'c']
    );
    expect(recortarPorPeriodo(registros, { de: '2026-03-02', ate: '' }).map((r) => r.id)).toEqual([
      'b',
      'c',
    ]);
    // Registro sem data sai do recorte quando existe QUALQUER ponta.
    expect(recortarPorPeriodo(registros, { de: '', ate: '2026-03-05' }).map((r) => r.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('busca sem acento e sem caixa em colaborador, departamento e motivo', () => {
    const base = [
      registro({ id: 'a', colaborador: { nome_completo: 'José Álvares', departamento: 'Logística' } }),
      registro({ id: 'b', colaborador: { nome_completo: 'Maria Silva', departamento: 'Operações' }, motivo: 'Banco de horas' }),
    ];
    expect(filtrarExtrato(base, { ...FILTROS_EXTRATO_PADRAO, busca: 'jose' }).map((r) => r.id)).toEqual(['a']);
    expect(filtrarExtrato(base, { ...FILTROS_EXTRATO_PADRAO, busca: 'logistica' }).map((r) => r.id)).toEqual(['a']);
    expect(filtrarExtrato(base, { ...FILTROS_EXTRATO_PADRAO, busca: 'banco de horas' }).map((r) => r.id)).toEqual(['b']);
  });

  it('filtra por tipo sem perder os lançamentos do outro tipo', () => {
    const base = [registro({ id: 'a', tipo: 'credito' }), registro({ id: 'b', tipo: 'debito' })];
    expect(filtrarExtrato(base, { busca: '', tipo: 'credito' }).map((r) => r.id)).toEqual(['a']);
    expect(filtrarExtrato(base, { busca: '', tipo: 'debito' }).map((r) => r.id)).toEqual(['b']);
    expect(filtrarExtrato(base, { busca: '', tipo: 'todos' })).toHaveLength(2);
  });
});


describe('resumo do período (créditos − débitos)', () => {
  const registros = [
    registro({ id: 'a', colaborador_id: 'c1', tipo: 'credito', horas: '08:00:00' }),
    registro({ id: 'b', colaborador_id: 'c1', tipo: 'credito', horas: '02:30:00' }),
    registro({ id: 'c', colaborador_id: 'c2', tipo: 'debito', horas: '03:00:00' }),
  ];

  it('soma cada tipo e devolve o saldo do período', () => {
    const resumo = resumirHoras(registros);
    expect(resumo.creditos).toBe(10.5);
    expect(resumo.debitos).toBe(3);
    expect(resumo.saldo).toBe(7.5);
    expect(resumo.registros).toBe(3);
    expect(resumo.lancamentosCredito).toBe(2);
    expect(resumo.lancamentosDebito).toBe(1);
    expect(resumo.colaboradores).toBe(2);
  });

  it('zera tudo numa base vazia (sem NaN e sem divisão por zero)', () => {
    const resumo = resumirHoras([]);
    expect(resumo).toEqual({
      creditos: 0,
      debitos: 0,
      saldo: 0,
      registros: 0,
      lancamentosCredito: 0,
      lancamentosDebito: 0,
      colaboradores: 0,
    });
    expect(barrasDeTotais(resumo).map((barra) => barra.percentual)).toEqual([0, 0]);
  });

  it('coloca as duas barras na MESMA escala', () => {
    const barras = barrasDeTotais(resumirHoras(registros));
    const credito = barras.find((barra) => barra.chave === 'credito');
    const debito = barras.find((barra) => barra.chave === 'debito');
    expect(credito?.percentual).toBe(100);
    // 3h de débito sobre 10h30 de crédito → proporção real, não barra cheia.
    expect(debito?.percentual).toBeCloseTo((3 / 10.5) * 100, 6);
    expect(debito?.lancamentos).toBe(1);
  });
});

describe('foto dos saldos atuais', () => {
  const registros = [
    registro({
      id: 'a',
      colaborador_id: 'c1',
      data: '2026-03-01',
      tipo: 'credito',
      horas: '05:00:00',
      saldo_atual: '05:00:00',
    }),
    registro({
      id: 'b',
      colaborador_id: 'c1',
      data: '2026-03-04',
      tipo: 'debito',
      horas: '07:30:00',
      saldo_atual: '-02:30:00',
    }),
    registro({
      id: 'c',
      colaborador_id: 'c2',
      data: '2026-03-04',
      tipo: 'credito',
      horas: '04:00:00',
      saldo_atual: null,
    }),
    registro({
      id: 'd',
      colaborador_id: 'c3',
      data: '2026-03-04',
      tipo: 'credito',
      horas: '02:00:00',
      saldo_atual: '00:00:00',
    }),
  ];

  it('usa o saldo_atual do lançamento mais recente de cada colaborador', () => {
    const saldos = saldosPorColaborador(registros);
    expect(saldos.map((item) => item.id)).toEqual(['c1', 'c3', 'c2']);
    expect(saldos[0]).toMatchObject({ saldo: -2.5, data: '2026-03-04', registros: 2 });
  });

  it('cai no líquido do colaborador quando o último lançamento não traz saldo', () => {
    const semSaldo = saldosPorColaborador(registros).find((item) => item.id === 'c2');
    expect(semSaldo?.saldo).toBe(4);
  });

  it('resume positivos, negativos, zerados, total e o rombo', () => {
    const situacao = resumirSituacaoSaldos(saldosPorColaborador(registros));
    expect(situacao).toEqual({
      positivos: 1,
      negativos: 1,
      zerados: 1,
      total: 3,
      saldoTotal: 1.5,
      horasNegativas: 2.5,
    });
    expect(colaboradoresNegativos(saldosPorColaborador(registros)).map((item) => item.id)).toEqual(['c1']);
  });

  it('ordena do mais negativo para o mais positivo', () => {
    const saldos = saldosPorColaborador([
      registro({ id: 'a', colaborador_id: 'positivo', saldo_atual: '10:00:00' }),
      registro({ id: 'b', colaborador_id: 'negativo', saldo_atual: '-20:00:00' }),
      registro({ id: 'c', colaborador_id: 'meio', saldo_atual: '-01:00:00' }),
    ]);
    expect(saldos.map((item) => item.id)).toEqual(['negativo', 'meio', 'positivo']);
  });
});

describe('evolução do saldo', () => {
  it('acumula dia a dia e fecha exatamente no saldo do período', () => {
    const registros = [
      registro({ id: 'a', data: '2026-03-01', tipo: 'credito', horas: '08:00:00' }),
      registro({ id: 'b', data: '2026-03-03', tipo: 'debito', horas: '02:00:00' }),
      registro({ id: 'c', data: '2026-03-03', tipo: 'debito', horas: '01:00:00' }),
      registro({ id: 'd', data: '2026-03-05', tipo: 'credito', horas: '04:00:00' }),
    ];
    const pontos = evolucaoSaldo(registros);
    expect(pontos).toEqual([
      { data: '2026-03-01', eixo: '01/03', saldo: 8, variacao: 8 },
      { data: '2026-03-03', eixo: '03/03', saldo: 5, variacao: -3 },
      { data: '2026-03-05', eixo: '05/03', saldo: 9, variacao: 4 },
    ]);
    expect(pontos[pontos.length - 1].saldo).toBe(resumirHoras(registros).saldo);
  });

  it('ignora lançamentos sem data e devolve série vazia quando não há base', () => {
    expect(evolucaoSaldo([registro({ data: null })])).toEqual([]);
    expect(evolucaoSaldo([])).toEqual([]);
  });
});

describe('data curta do extrato', () => {
  it('converte YYYY-MM-DD em dd/mm/aaaa sem passar por Date', () => {
    expect(formatarDataBR('2026-03-02')).toBe('02/03/2026');
    expect(formatarDataBR('2026-03-02T09:00:00.000Z')).toBe('02/03/2026');
    expect(formatarDataBR(null)).toBe('—');
    expect(formatarDataBR('')).toBe('—');
    expect(formatarDataBR('02/03/2026')).toBe('—');
  });
});

describe('recortes do extrato (tipo negativo, contagem e ordem)', () => {
  const BASE = [
    registro({ id: 'a', data: '2026-03-01', tipo: 'debito', horas: '04:00:00', saldo_atual: '-04:00:00' }),
    registro({ id: 'b', data: '2026-03-03', tipo: 'credito', horas: '06:00:00', saldo_atual: '06:00:00' }),
    registro({ id: 'c', data: '2026-03-04', tipo: 'debito', horas: '02:00:00', saldo_atual: '-02:00:00' }),
  ];

  it('trata saldo ausente como "não sei", nunca como negativo', () => {
    expect(registroComSaldoNegativo(registro({ saldo_atual: null }))).toBe(false);
    expect(registroComSaldoNegativo(registro({ saldo_atual: '-01:00:00' }))).toBe(true);
    expect(registroComSaldoNegativo(registro({ saldo_atual: '01:00:00' }))).toBe(false);
    expect(registroComSaldoNegativo(registro({ saldo_atual: '00:00:00' }))).toBe(false);
  });

  it('filtra só quem ficou no vermelho e ainda aceita a busca', () => {
    expect(filtrarExtrato(BASE, { busca: '', tipo: 'negativos' }).map((r) => r.id)).toEqual([
      'a',
      'c',
    ]);
    expect(filtrarExtrato(BASE, { busca: 'operações', tipo: 'negativos' })).toHaveLength(2);
    expect(filtrarExtrato(BASE, { busca: 'joão', tipo: 'negativos' })).toHaveLength(0);
    // O recorte por tipo continua valendo: negativo não engole crédito.
    expect(filtrarExtrato(BASE, { busca: '', tipo: 'credito' }).map((r) => r.id)).toEqual(['b']);
  });

  it('conta os quatro recortes sobre a MESMA lista', () => {
    expect(contarTiposExtrato(BASE)).toEqual({ todos: 3, credito: 1, debito: 2, negativos: 2 });
    expect(contarTiposExtrato([])).toEqual({ todos: 0, credito: 0, debito: 0, negativos: 0 });
  });

  it('ordena por data nos dois sentidos sem mexer na lista original', () => {
    expect(ordenarExtrato(BASE, 'recentes').map((r) => r.id)).toEqual(['c', 'b', 'a']);
    expect(ordenarExtrato(BASE, 'antigos').map((r) => r.id)).toEqual(['a', 'b', 'c']);
    expect(BASE.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('acende o "Limpar" só quando existe filtro de verdade', () => {
    expect(temFiltroExtratoAtivo(FILTROS_EXTRATO_PADRAO, PERIODO_EXTRATO_PADRAO)).toBe(false);
    expect(temFiltroExtratoAtivo({ busca: 'maria', tipo: 'todos' }, PERIODO_EXTRATO_PADRAO)).toBe(
      true
    );
    // Busca só com espaços não é filtro.
    expect(temFiltroExtratoAtivo({ busca: '   ', tipo: 'todos' }, PERIODO_EXTRATO_PADRAO)).toBe(
      false
    );
    expect(temFiltroExtratoAtivo({ busca: '', tipo: 'negativos' }, PERIODO_EXTRATO_PADRAO)).toBe(
      true
    );
    expect(temFiltroExtratoAtivo(FILTROS_EXTRATO_PADRAO, { de: '2026-03-01', ate: '' })).toBe(true);
  });

  it('remonta a cascata quando muda página, por-página, tipo ou ordem — não na busca', () => {
    const base = chaveCascataExtrato(FILTROS_EXTRATO_PADRAO, 1, 8);
    expect(chaveCascataExtrato({ ...FILTROS_EXTRATO_PADRAO, busca: 'maria' }, 1, 8)).toBe(base);
    expect(chaveCascataExtrato(FILTROS_EXTRATO_PADRAO, 2, 8)).not.toBe(base);
    expect(chaveCascataExtrato({ ...FILTROS_EXTRATO_PADRAO, tipo: 'credito' }, 1, 8)).not.toBe(base);
    expect(chaveCascataExtrato(FILTROS_EXTRATO_PADRAO, 1, 8, 'antigos')).not.toBe(base);
  });
});

describe('comparativo com a janela anterior', () => {
  const BASE = [
    registro({ id: 'ant1', data: '2026-03-01', tipo: 'credito', horas: '02:00:00', saldo_atual: '02:00:00' }),
    registro({ id: 'ant2', data: '2026-03-02', tipo: 'debito', horas: '01:00:00', saldo_atual: '-01:00:00' }),
    registro({ id: 'at1', data: '2026-03-03', tipo: 'credito', horas: '04:00:00', saldo_atual: '04:00:00' }),
    registro({ id: 'at2', data: '2026-03-04', tipo: 'credito', horas: '03:00:00', saldo_atual: '07:00:00' }),
  ];

  it('usa a janela IMEDIATAMENTE anterior com o mesmo número de dias', () => {
    const comparativo = compararPeriodos(BASE, { de: '2026-03-03', ate: '2026-03-04' });

    expect(comparativo.janela).toEqual({
      atual: { de: '2026-03-03', ate: '2026-03-04' },
      anterior: { de: '2026-03-01', ate: '2026-03-02' },
      dias: 2,
    });
    expect(comparativo.atual.creditos).toBe(7);
    expect(comparativo.anterior.creditos).toBe(2);
    expect(comparativo.creditos.rotulo).toBe('+250%');
    expect(comparativo.creditos.direcao).toBe('aumento');
    // Mesmo número de lançamentos dos dois lados: selo honesto de estabilidade.
    expect(comparativo.movimentacoes.percentual).toBe(0);
    expect(comparativo.movimentacoes.direcao).toBe('estavel');
    // Débito caiu de 1h para 0h.
    expect(comparativo.debitos.percentual).toBe(-100);
    expect(comparativo.debitos.direcao).toBe('queda');
    expect(comparativo.rotuloJanela).toBe('vs. período anterior');
  });

  it('não inventa percentual quando a janela anterior está vazia', () => {
    const comparativo = compararPeriodos(BASE, { de: '2026-03-01', ate: '2026-03-02' });

    expect(comparativo.anterior.registros).toBe(0);
    expect(comparativo.saldo.percentual).toBeNull();
    expect(comparativo.saldo.direcao).toBe('sem-base');
    expect(comparativo.saldo.rotulo).toBe('—');
    expect(comparativo.rotuloJanela).toBe('sem base anterior');
  });

  it('devolve comparativo zerado (sem NaN) numa base vazia', () => {
    const comparativo = compararPeriodos([], PERIODO_EXTRATO_PADRAO);

    expect(comparativo.janela).toBeNull();
    expect(comparativo.atual.saldo).toBe(0);
    expect(comparativo.saldo.percentual).toBeNull();
    expect(Number.isNaN(comparativo.saldo.percentual as number)).toBe(false);
    expect(comparativo.rotuloJanela).toBe('sem base anterior');
  });
});

describe('micro-séries dos KPI Cards', () => {
  const BASE = [
    registro({ id: 'ant1', data: '2026-03-01', tipo: 'credito', horas: '02:00:00' }),
    registro({ id: 'ant2', data: '2026-03-02', tipo: 'debito', horas: '01:00:00' }),
    registro({ id: 'at1', data: '2026-03-03', tipo: 'credito', horas: '04:00:00' }),
    registro({ id: 'at2', data: '2026-03-04', tipo: 'credito', horas: '03:00:00' }),
  ];

  it('conta movimentações por dia, em ordem cronológica', () => {
    expect(miniBarras(BASE, 'movimentacoes')).toEqual([1, 1, 1, 1]);
    expect(miniBarras(BASE, 'movimentacoes', 2)).toEqual([1, 1]);
  });

  it('soma horas de cada tipo e pula os dias sem aquele tipo', () => {
    // 02/03 foi débito: não vira uma barra zerada no meio do desenho.
    expect(miniBarras(BASE, 'credito')).toEqual([2, 4, 3]);
    expect(miniBarras(BASE, 'debito')).toEqual([1]);
    expect(miniBarras([], 'credito')).toEqual([]);
    expect(miniBarras([registro({ data: null })], 'credito')).toEqual([]);
  });
});

describe('exportação do extrato', () => {
  it('entrega colaborador/data obrigatórios e horas no formato da tela', () => {
    const [linha] = linhasParaExportacao([
      registro({ tipo: 'debito', horas: '02:30:00', saldo_anterior: null, saldo_atual: null }),
    ]);
    expect(linha.colaborador).toBe('Maria Silva');
    expect(linha.data).toBe('02/03/2026');
    expect(linha.tipo).toBe('Débito');
    expect(linha.horas).toBe('2h30');
    expect(linha.saldo_anterior).toBe('—');
    expect(linha.saldo_atual).toBe('—');
  });
});
