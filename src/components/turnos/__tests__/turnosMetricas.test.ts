import { describe, expect, it } from 'vitest';
import {
  agruparEscalasPorDia,
  calcularMetricasPainel,
  contarEscalasPorDia,
  contarFiltrosAvancados,
  departamentosDaEquipe,
  detectarConflitos,
  distribuicaoPorTurno,
  duracaoLiquidaMinutos,
  escalaEhFolga,
  faixaHoraria,
  FILTROS_ESCALAS_INICIAIS,
  filtrarEscalas,
  formatarDuracaoMinutos,
  formatarIntervaloMinutos,
  janelasSeSobrepoem,
  janelaDoTurno,
  minutosDoHorario,
  montarLinhasCalendario,
  normalizarTexto,
  proximasDatasComEscalas,
  statusDasEscalas,
  turnosCriadosAte,
  variacaoPercentual,
  type EscalaRegistro,
  type MembroEquipe,
  type TurnoRegistro,
} from '../turnosMetricas';

/**
 * Cálculos do painel de Turnos & Escalas.
 *
 * Regra de conflito coberta aqui: MESMO colaborador + MESMO dia + horários que
 * se sobrepõem. Nada de regra trabalhista — o teste garante exatamente o que o
 * sistema promete, e que turnos que apenas se encostam (08–14 e 14–22) e turnos
 * noturnos do dia seguinte não geram falso positivo.
 */
function turno(over: Partial<TurnoRegistro> & Pick<TurnoRegistro, 'id' | 'nome'>): TurnoRegistro {
  return {
    cor: '#22c55e',
    horario_inicio: '08:00',
    horario_fim: '17:00',
    intervalo_minutos: 60,
    ativo: true,
    created_at: '2026-01-05T10:00:00.000Z',
    ...over,
  };
}

function escala(
  over: Partial<EscalaRegistro> & Pick<EscalaRegistro, 'id' | 'colaborador_id' | 'turno_id' | 'data'>
): EscalaRegistro {
  return { status: 'agendado', ...over };
}

const TURNO_ADMIN = turno({ id: 't-admin', nome: 'Administrativo' });
const TURNO_MANHA = turno({
  id: 't-manha',
  nome: 'Manhã',
  horario_inicio: '06:00',
  horario_fim: '14:00',
  intervalo_minutos: 30,
});
const TURNO_TARDE = turno({
  id: 't-tarde',
  nome: 'Tarde',
  horario_inicio: '14:00',
  horario_fim: '22:00',
  intervalo_minutos: 30,
});
const TURNO_NOITE = turno({
  id: 't-noite',
  nome: 'Noturno',
  horario_inicio: '22:00',
  horario_fim: '06:00',
  intervalo_minutos: 45,
});

const EQUIPE: MembroEquipe[] = [
  { id: 'c1', nome_completo: 'Ana Souza', departamento: 'Logística' },
  { id: 'c2', nome_completo: 'José Lima', departamento: 'Financeiro' },
];

describe('turnosMetricas · horários', () => {
  it('converte HH:MM em minutos e rejeita valor inválido', () => {
    expect(minutosDoHorario('08:00')).toBe(480);
    expect(minutosDoHorario('17:30:00')).toBe(1050);
    expect(minutosDoHorario(null)).toBeNull();
    expect(minutosDoHorario('25:00')).toBeNull();
    expect(minutosDoHorario('08:99')).toBeNull();
  });

  it('faz o turno virar o dia quando a saída é menor que a entrada', () => {
    expect(janelaDoTurno(TURNO_NOITE)).toEqual({ inicio: 1320, fim: 1800 });
    expect(janelaDoTurno(TURNO_ADMIN)).toEqual({ inicio: 480, fim: 1020 });
    expect(janelaDoTurno(null)).toBeNull();
  });

  it('desconta o intervalo da duração líquida', () => {
    expect(duracaoLiquidaMinutos(TURNO_ADMIN)).toBe(480);
    expect(duracaoLiquidaMinutos(TURNO_NOITE)).toBe(435);
    expect(formatarDuracaoMinutos(480)).toBe('8h');
    expect(formatarDuracaoMinutos(435)).toBe('7h15');
    expect(formatarDuracaoMinutos(45)).toBe('45min');
    expect(formatarDuracaoMinutos(null)).toBe('—');
  });

  it('formata intervalo e faixa horária', () => {
    expect(formatarIntervaloMinutos(60)).toBe('60min');
    expect(formatarIntervaloMinutos(0)).toBe('Sem intervalo');
    expect(formatarIntervaloMinutos(null)).toBe('Sem intervalo');
    expect(faixaHoraria(TURNO_ADMIN)).toBe('08:00 – 17:00');
  });

  it('não considera sobreposição quando um turno começa quando o outro termina', () => {
    expect(janelasSeSobrepoem(janelaDoTurno(TURNO_MANHA), janelaDoTurno(TURNO_TARDE))).toBe(false);
    expect(janelasSeSobrepoem(janelaDoTurno(TURNO_ADMIN), janelaDoTurno(TURNO_MANHA))).toBe(true);
    // Noturno 22:00–06:00 não alcança a manhã do mesmo dia (06:00–14:00).
    expect(janelasSeSobrepoem(janelaDoTurno(TURNO_NOITE), janelaDoTurno(TURNO_MANHA))).toBe(false);
    expect(janelasSeSobrepoem(null, janelaDoTurno(TURNO_MANHA))).toBe(false);
  });
});

describe('turnosMetricas · conflitos', () => {
  it('acusa sobreposição do mesmo colaborador no mesmo dia', () => {
    const conflitos = detectarConflitos(
      [
        escala({ id: 'e1', colaborador_id: 'c1', turno_id: 't-admin', data: '2026-10-05' }),
        escala({ id: 'e2', colaborador_id: 'c1', turno_id: 't-manha', data: '2026-10-05' }),
      ],
      [TURNO_ADMIN, TURNO_MANHA],
      EQUIPE
    );

    expect(conflitos).toHaveLength(1);
    expect(conflitos[0]).toMatchObject({ colaboradorId: 'c1', colaboradorNome: 'Ana Souza', data: '2026-10-05' });
    expect(conflitos[0].escalas.map((e) => e.id).sort()).toEqual(['e1', 'e2']);
  });

  it('não acusa turnos que apenas se encostam nem colaboradores diferentes', () => {
    expect(
      detectarConflitos(
        [
          escala({ id: 'e1', colaborador_id: 'c1', turno_id: 't-manha', data: '2026-10-05' }),
          escala({ id: 'e2', colaborador_id: 'c1', turno_id: 't-tarde', data: '2026-10-05' }),
        ],
        [TURNO_MANHA, TURNO_TARDE],
        EQUIPE
      )
    ).toEqual([]);

    expect(
      detectarConflitos(
        [
          escala({ id: 'e1', colaborador_id: 'c1', turno_id: 't-admin', data: '2026-10-05' }),
          escala({ id: 'e2', colaborador_id: 'c2', turno_id: 't-admin', data: '2026-10-05' }),
        ],
        [TURNO_ADMIN],
        EQUIPE
      )
    ).toEqual([]);
  });

  it('acusa registro duplicado do mesmo turno no mesmo dia', () => {
    const conflitos = detectarConflitos(
      [
        escala({ id: 'e1', colaborador_id: 'c1', turno_id: 't-admin', data: '2026-10-05' }),
        escala({ id: 'e2', colaborador_id: 'c1', turno_id: 't-admin', data: '2026-10-05' }),
      ],
      [TURNO_ADMIN],
      EQUIPE
    );
    expect(conflitos).toHaveLength(1);
  });

  it('usa o turno embutido da escala quando o catálogo não tem o turno', () => {
    const conflitos = detectarConflitos(
      [
        escala({
          id: 'e1',
          colaborador_id: 'c1',
          turno_id: 't-fora',
          data: '2026-10-05',
          turno: { nome: 'Antigo', horario_inicio: '08:00', horario_fim: '17:00', cor: '#111111' },
        }),
        escala({
          id: 'e2',
          colaborador_id: 'c1',
          turno_id: 't-fora-2',
          data: '2026-10-05',
          turno: { nome: 'Antigo 2', horario_inicio: '12:00', horario_fim: '18:00', cor: '#222222' },
        }),
      ],
      [],
      EQUIPE
    );
    expect(conflitos).toHaveLength(1);
  });

  it('ordena os conflitos por data e depois por nome', () => {
    const conflitos = detectarConflitos(
      [
        escala({ id: 'e1', colaborador_id: 'c2', turno_id: 't-admin', data: '2026-10-06' }),
        escala({ id: 'e2', colaborador_id: 'c2', turno_id: 't-admin', data: '2026-10-06' }),
        escala({ id: 'e3', colaborador_id: 'c1', turno_id: 't-admin', data: '2026-10-05' }),
        escala({ id: 'e4', colaborador_id: 'c1', turno_id: 't-admin', data: '2026-10-05' }),
      ],
      [TURNO_ADMIN],
      EQUIPE
    );

    expect(conflitos.map((c) => `${c.data}|${c.colaboradorNome}`)).toEqual([
      '2026-10-05|Ana Souza',
      '2026-10-06|José Lima',
    ]);
  });
});

describe('turnosMetricas · agregações', () => {
  const escalas = [
    escala({ id: 'e1', colaborador_id: 'c1', turno_id: 't-admin', data: '2026-10-05' }),
    escala({ id: 'e2', colaborador_id: 'c2', turno_id: 't-manha', data: '2026-10-05' }),
    escala({ id: 'e3', colaborador_id: 'c1', turno_id: 't-admin', data: '2026-10-07' }),
  ];

  it('conta escalas por dia do período', () => {
    expect(contarEscalasPorDia(escalas, ['2026-10-05', '2026-10-06', '2026-10-07'])).toEqual([
      { chave: '2026-10-05', total: 2 },
      { chave: '2026-10-06', total: 0 },
      { chave: '2026-10-07', total: 1 },
    ]);
  });

  it('distribui por turno em ordem decrescente', () => {
    const fatias = distribuicaoPorTurno(escalas, [TURNO_ADMIN, TURNO_MANHA, TURNO_TARDE]);
    expect(fatias.map((f) => [f.nome, f.total])).toEqual([
      ['Administrativo', 2],
      ['Manhã', 1],
    ]);
  });

  it('inclui escala de turno fora do catálogo sem perder o total', () => {
    const fatias = distribuicaoPorTurno(
      [
        escala({
          id: 'e9',
          colaborador_id: 'c1',
          turno_id: 't-fora',
          data: '2026-10-05',
          turno: { nome: 'Removido', cor: '#333333' },
        }),
      ],
      []
    );
    expect(fatias).toHaveLength(1);
    expect(fatias[0]).toMatchObject({ nome: 'Removido', cor: '#333333', total: 1 });
  });

  it('lista próximas datas a partir de hoje, ordenadas e limitadas', () => {
    const proximas = proximasDatasComEscalas(
      [
        escala({ id: 'e1', colaborador_id: 'c1', turno_id: 't-admin', data: '2026-10-04' }),
        escala({ id: 'e2', colaborador_id: 'c1', turno_id: 't-admin', data: '2026-10-09' }),
        escala({ id: 'e3', colaborador_id: 'c2', turno_id: 't-admin', data: '2026-10-09' }),
        escala({ id: 'e4', colaborador_id: 'c1', turno_id: 't-admin', data: '2026-10-06' }),
      ],
      '2026-10-05',
      2
    );

    expect(proximas).toEqual([
      { chave: '2026-10-06', total: 1 },
      { chave: '2026-10-09', total: 2 },
    ]);
  });

  it('calcula variação percentual só quando há base', () => {
    expect(variacaoPercentual(12, 10)).toBeCloseTo(20);
    expect(variacaoPercentual(5, 10)).toBeCloseTo(-50);
    expect(variacaoPercentual(5, 0)).toBeNull();
  });

  it('conta turnos existentes até uma data', () => {
    const turnos = [
      turno({ id: 't1', nome: 'A', created_at: '2026-01-10T00:00:00.000Z' }),
      turno({ id: 't2', nome: 'B', created_at: '2026-03-10T00:00:00.000Z' }),
      turno({ id: 't3', nome: 'C', created_at: null }),
    ];
    expect(turnosCriadosAte(turnos, '2026-02-01')).toBe(1);
    expect(turnosCriadosAte(turnos, '2026-12-31')).toBe(2);
  });
});

describe('turnosMetricas · filtros e linhas do calendário', () => {
  const escalas = [
    escala({
      id: 'e1',
      colaborador_id: 'c1',
      turno_id: 't-admin',
      data: '2026-10-05',
      colaborador: { nome_completo: 'Ana Souza', departamento: 'Logística' },
    }),
    escala({
      id: 'e2',
      colaborador_id: 'c2',
      turno_id: 't-manha',
      data: '2026-10-06',
      status: 'confirmado',
      colaborador: { nome_completo: 'José Lima', departamento: 'Financeiro' },
    }),
  ];

  it('normaliza texto para busca sem acento e sem caixa', () => {
    expect(normalizarTexto('  José  ')).toBe('jose');
  });

  it('combina busca, turno, status e departamento', () => {
    expect(filtrarEscalas(escalas, FILTROS_ESCALAS_INICIAIS)).toHaveLength(2);
    expect(filtrarEscalas(escalas, { ...FILTROS_ESCALAS_INICIAIS, busca: 'jose' })).toHaveLength(1);
    expect(filtrarEscalas(escalas, { ...FILTROS_ESCALAS_INICIAIS, turnoId: 't-admin' })).toHaveLength(1);
    expect(filtrarEscalas(escalas, { ...FILTROS_ESCALAS_INICIAIS, status: 'confirmado' })).toHaveLength(1);
    expect(filtrarEscalas(escalas, { ...FILTROS_ESCALAS_INICIAIS, departamento: 'Logística' })).toHaveLength(1);
    expect(
      filtrarEscalas(escalas, { ...FILTROS_ESCALAS_INICIAIS, departamento: 'Logística', turnoId: 't-manha' })
    ).toHaveLength(0);
  });

  it('lista departamentos e status existentes', () => {
    expect(departamentosDaEquipe(EQUIPE)).toEqual(['Financeiro', 'Logística']);
    expect(statusDasEscalas(escalas)).toEqual(['agendado', 'confirmado']);
  });

  it('monta as linhas com escala por dia e quem tem escala primeiro', () => {
    const linhas = montarLinhasCalendario({ equipe: EQUIPE, escalas, filtros: FILTROS_ESCALAS_INICIAIS });

    expect(linhas).toHaveLength(2);
    // Empate em 1 escala cada: desempate alfabético.
    expect(linhas.map((linha) => linha.colaborador.nome_completo)).toEqual(['Ana Souza', 'José Lima']);
    expect(linhas[0].escalasPorDia.get('2026-10-05')?.map((e) => e.id)).toEqual(['e1']);
    expect(linhas[0].escalasPorDia.get('2026-10-06')).toBeUndefined();
  });

  it('esconde quem não tem escala quando o filtro pede', () => {
    const linhas = montarLinhasCalendario({
      equipe: EQUIPE,
      escalas,
      filtros: { ...FILTROS_ESCALAS_INICIAIS, somenteComEscala: true },
    });
    expect(linhas).toHaveLength(2);

    const semEscala = montarLinhasCalendario({
      equipe: [...EQUIPE, { id: 'c3', nome_completo: 'Carla Dias', departamento: 'RH' }],
      escalas,
      filtros: { ...FILTROS_ESCALAS_INICIAIS, somenteComEscala: true },
    });
    expect(semEscala.map((linha) => linha.colaborador.id)).not.toContain('c3');
  });

  it('conta os filtros avançados ativos', () => {
    expect(contarFiltrosAvancados(FILTROS_ESCALAS_INICIAIS)).toBe(0);
    expect(
      contarFiltrosAvancados({
        ...FILTROS_ESCALAS_INICIAIS,
        departamento: 'RH',
        turnoId: 't1',
        status: 'agendado',
        somenteComEscala: true,
      })
    ).toBe(4);
  });

  it('reconhece folga explícita', () => {
    expect(escalaEhFolga({ status: 'folga' })).toBe(true);
    expect(escalaEhFolga({ status: 'FOLGA' })).toBe(true);
    expect(escalaEhFolga({ status: 'agendado' })).toBe(false);
    expect(escalaEhFolga({})).toBe(false);
  });
});

describe('turnosMetricas · KPI cards', () => {
  it('consolida os quatro indicadores a partir dos dados', () => {
    const escalasPeriodo = [
      escala({ id: 'e1', colaborador_id: 'c1', turno_id: 't-admin', data: '2026-10-05' }),
      escala({ id: 'e2', colaborador_id: 'c1', turno_id: 't-admin', data: '2026-10-06' }),
      escala({ id: 'e3', colaborador_id: 'c2', turno_id: 't-manha', data: '2026-10-06' }),
    ];
    const conflitos = detectarConflitos(
      [
        escala({ id: 'x1', colaborador_id: 'c1', turno_id: 't-admin', data: '2026-10-05' }),
        escala({ id: 'x2', colaborador_id: 'c1', turno_id: 't-manha', data: '2026-10-05' }),
      ],
      [TURNO_ADMIN, TURNO_MANHA],
      EQUIPE
    );

    const metricas = calcularMetricasPainel({
      turnos: [TURNO_ADMIN, TURNO_MANHA, { ...TURNO_TARDE, ativo: false }],
      escalasPeriodo,
      escalasPeriodoAnterior: [escala({ id: 'p1', colaborador_id: 'c1', turno_id: 't-admin', data: '2026-09-28' })],
      fimPeriodoAnterior: '2026-10-04',
      equipe: EQUIPE,
      dias: ['2026-10-05', '2026-10-06', '2026-10-07'],
      conflitos,
    });

    expect(metricas.totalTurnos).toBe(3);
    expect(metricas.turnosAtivos).toBe(2);
    expect(metricas.escalasNoPeriodo).toBe(3);
    expect(metricas.variacaoEscalas).toBeCloseTo(200);
    expect(metricas.colaboradoresEscalados).toBe(2);
    expect(metricas.percentualEquipe).toBe(100);
    expect(metricas.conflitos).toHaveLength(1);
    expect(metricas.serieDiaria.map((ponto) => ponto.total)).toEqual([1, 2, 0]);
    expect(metricas.distribuicao.map((fatia) => fatia.nome)).toEqual(['Administrativo', 'Manhã']);
  });

  it('devolve percentual nulo quando não há equipe carregada', () => {
    const metricas = calcularMetricasPainel({
      turnos: [],
      escalasPeriodo: [],
      escalasPeriodoAnterior: [],
      fimPeriodoAnterior: '2026-10-04',
      equipe: [],
      dias: [],
    });

    expect(metricas.percentualEquipe).toBeNull();
    expect(metricas.variacaoEscalas).toBeNull();
    expect(metricas.variacaoTurnos).toBeNull();
    expect(metricas.serieDiaria).toEqual([]);
  });

  /**
   * Regressão do "122% da equipe": as escalas do período são de TODA a empresa,
   * então podem incluir gente fora da equipe ATIVA (desligado/inativado). O
   * percentual passa a contar só quem é elegível e nunca passa de 100.
   */
  it('conta só colaboradores da equipe no percentual e nunca passa de 100%', () => {
    const equipeCurta: MembroEquipe[] = [{ id: 'c1', nome_completo: 'Ana Souza', departamento: 'Logística' }];
    const escalasPeriodo = [
      escala({ id: 'e1', colaborador_id: 'c1', turno_id: 't-admin', data: '2026-10-05' }),
      // Fora da equipe carregada (inativo/desligado): aparece no calendário, mas
      // não infla a razão escalados / equipe.
      escala({ id: 'e2', colaborador_id: 'c9', turno_id: 't-admin', data: '2026-10-05' }),
      escala({ id: 'e3', colaborador_id: 'c9', turno_id: 't-manha', data: '2026-10-06' }),
    ];

    const metricas = calcularMetricasPainel({
      turnos: [TURNO_ADMIN, TURNO_MANHA],
      escalasPeriodo,
      escalasPeriodoAnterior: [],
      fimPeriodoAnterior: '2026-10-04',
      equipe: equipeCurta,
      dias: ['2026-10-05', '2026-10-06'],
    });

    expect(metricas.tamanhoEquipe).toBe(1);
    expect(metricas.colaboradoresEscalados).toBe(1);
    expect(metricas.percentualEquipe).toBe(100);
  });
});

/**
 * Agrupamento por dia do modal "Próximas escalas": mesma base do card, porém
 * com os REGISTROS de cada data (o card só tem `{ chave, total }`).
 */
describe('turnosMetricas · agrupamento por dia', () => {
  const escalas = [
    escala({
      id: 'e1',
      colaborador_id: 'c2',
      turno_id: 't-manha',
      data: '2026-10-06',
      colaborador: { nome_completo: 'Bruno Lima', departamento: 'RH' },
    }),
    escala({
      id: 'e2',
      colaborador_id: 'c1',
      turno_id: 't-admin',
      data: '2026-10-06',
      colaborador: { nome_completo: 'Ana Souza', departamento: 'Logística' },
    }),
    escala({
      id: 'e3',
      colaborador_id: 'c1',
      turno_id: 't-admin',
      data: '2026-10-05',
      colaborador: { nome_completo: 'Ana Souza', departamento: 'Logística' },
    }),
  ];

  it('agrupa por data em ordem crescente e por nome dentro do dia', () => {
    const grupos = agruparEscalasPorDia(escalas);

    expect(grupos.map((grupo) => grupo.chave)).toEqual(['2026-10-05', '2026-10-06']);
    expect(grupos.map((grupo) => grupo.total)).toEqual([1, 2]);
    expect(grupos[1].escalas.map((item) => item.id)).toEqual(['e2', 'e1']);
  });

  it('descarta o que está antes da data de corte', () => {
    const grupos = agruparEscalasPorDia(escalas, '2026-10-06');

    expect(grupos.map((grupo) => grupo.chave)).toEqual(['2026-10-06']);
    expect(grupos[0].total).toBe(2);
  });

  it('devolve lista vazia quando não há escalas', () => {
    expect(agruparEscalasPorDia([])).toEqual([]);
  });
});
