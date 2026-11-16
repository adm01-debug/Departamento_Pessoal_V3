import { describe, expect, it } from 'vitest';
import {
  ORDENACAO_TURMA_PADRAO,
  abreviacaoDiaSemana,
  agruparTurmas,
  calcularOcupacaoTurma,
  contarTurmas,
  diasDaSemanaComTurmas,
  filtrarTurmas,
  formatarDataTurma,
  formatarDuracaoTurma,
  formatarHoraTurma,
  formatarIntervaloSemana,
  grupoDaTurma,
  indicesEntradaTurmas,
  inicioSemana,
  intervaloPeriodoTurma,
  lerDataTurma,
  montarTurmas,
  numeroDia,
  opcoesModalidadeTurma,
  opcoesStatusTurma,
  ordenarTurmas,
  referenciaTemporalTurma,
  semanaSugeridaAgenda,
  type CursoTurma,
  type TurmaRegistro,
} from '../turmasDerivacoes';

const CURSOS: CursoTurma[] = [
  {
    id: 'curso-1',
    nome: 'NR-17 Ergonomia',
    descricao: 'Ergonomia aplicada.',
    categoria: 'Segurança do Trabalho',
    modalidade: 'presencial',
    carga_horaria: 4,
  },
  {
    id: 'curso-2',
    nome: 'Liderança e Gestão de Equipes',
    descricao: 'Desenvolvimento de líderes.',
    categoria: 'Liderança',
    modalidade: 'hibrido',
    carga_horaria: 12,
  },
  {
    id: 'curso-3',
    nome: 'Comunicação Assertiva',
    categoria: 'Desenvolvimento Pessoal',
    modalidade: 'online',
    carga_horaria: 6,
  },
];

const COLABORADORES = [
  {
    id: 'col-1',
    nome_completo: 'Gustavo Henrique Alves',
    foto_url: 'https://example.test/gustavo.jpg',
    cargo: 'Especialista em SST',
  },
];

const INSTANCIAS: TurmaRegistro[] = [
  {
    id: 'inst-1',
    curso_id: 'curso-1',
    instrutor_id: 'col-1',
    data_inicio: '2026-09-01T12:00:00Z',
    local_link: 'Sala 01',
    capacidade_maxima: 20,
    status: 'planejado',
  },
  {
    id: 'inst-2',
    curso_id: 'curso-2',
    instrutor_id: 'col-1',
    data_inicio: '2026-08-01T12:00:00Z',
    local_link: null,
    capacidade_maxima: 0,
    status: 'em_curso',
  },
  {
    id: 'inst-3',
    curso_id: 'curso-3',
    instrutor_id: null,
    data_inicio: '2026-02-05T12:00:00Z',
    local_link: null,
    capacidade_maxima: 30,
    status: 'concluido',
  },
];

describe('turmasDerivacoes — datas', () => {
  it('lê YYYY-MM-DD no fuso local sem recuar um dia', () => {
    const data = lerDataTurma('2026-09-01');
    expect(data?.getFullYear()).toBe(2026);
    expect(data?.getMonth()).toBe(8);
    expect(data?.getDate()).toBe(1);
    expect(formatarDataTurma('2026-09-01')).toBe('01/09/2026');
  });

  it('expõe horário apenas quando o timestamp tem hora', () => {
    expect(formatarHoraTurma('2026-09-01T12:00:00Z')).toMatch(/^\d{2}:\d{2}$/);
    expect(formatarHoraTurma('2026-09-01')).toBeNull();
    expect(formatarHoraTurma(null)).toBeNull();
  });

  it('inicia a semana na segunda-feira e formata o intervalo', () => {
    const segunda = inicioSemana(new Date(2026, 8, 3, 15, 30)); // quinta 03/09
    expect(segunda.getDay()).toBe(1);
    expect(segunda.getDate()).toBe(31);
    expect(segunda.getMonth()).toBe(7);
    const intervalo = formatarIntervaloSemana(segunda);
    expect(intervalo).toContain('–');
    expect(intervalo).toContain('2026');
    expect(intervalo.startsWith('31')).toBe(true);
  });

  it('distribui as turmas nos sete dias da semana', () => {
    const turmas = montarTurmas(INSTANCIAS, CURSOS, COLABORADORES);
    const semana = inicioSemana(new Date(2026, 8, 3));
    const dias = diasDaSemanaComTurmas(turmas, semana);
    expect(dias).toHaveLength(7);
    expect(dias[0].data.getDate()).toBe(31);
    expect(dias[1].turmas.map((t) => t.id)).toEqual(['inst-1']);
    expect(dias[1].turmas[0].hora).toBeTruthy();
    expect(abreviacaoDiaSemana(dias[1].data)).toBe('TER');
    expect(numeroDia(dias[1].data)).toBe('01');
  });

  it('sugere a semana da turma mais próxima quando a semana atual está vazia', () => {
    const turmas = montarTurmas(INSTANCIAS, CURSOS, COLABORADORES);
    const semana = semanaSugeridaAgenda(turmas, new Date(2026, 7, 10));
    expect(semana?.getDate()).toBe(27); // segunda 27/07, semana da turma em 01/08
    expect(semana?.getMonth()).toBe(6);
    expect(semanaSugeridaAgenda([], new Date(2026, 7, 10))).toBeNull();
  });
});

describe('turmasDerivacoes — modelo e agrupamento', () => {
  const turmas = montarTurmas(INSTANCIAS, CURSOS, COLABORADORES);

  it('junta curso e instrutor carregados e normaliza campos', () => {
    expect(turmas[0].cursoNome).toBe('NR-17 Ergonomia');
    expect(turmas[0].categoria).toBe('Segurança do Trabalho');
    expect(turmas[0].modalidadeRotulo).toBe('Presencial');
    expect(turmas[0].instrutorNome).toBe('Gustavo Henrique Alves');
    expect(turmas[0].instrutorFoto).toBe('https://example.test/gustavo.jpg');
    expect(turmas[0].instrutorCargo).toBe('Especialista em SST');
    expect(turmas[0].local).toBe('Sala 01');
    expect(turmas[0].capacidade).toBe(20);
    expect(turmas[1].capacidade).toBeNull(); // zero é inválido
    expect(turmas[2].instrutorNome).toBeNull();
    expect(turmas[2].ocupacao).toBeNull(); // sem inscritos não há percentual
  });

  it('agrupa pelo status REAL, preservando canceladas no histórico', () => {
    expect(grupoDaTurma('planejado')).toBe('proximas');
    expect(grupoDaTurma('em_curso')).toBe('andamento');
    expect(grupoDaTurma('concluido')).toBe('concluidas');
    expect(grupoDaTurma('cancelado')).toBe('concluidas');
    expect(grupoDaTurma('status_desconhecido')).toBe('proximas');

    const grupos = agruparTurmas(turmas);
    expect(contarTurmas(grupos)).toEqual({ proximas: 1, andamento: 1, concluidas: 1 });
  });

  it('calcula ocupação somente com capacidade e inscritos válidos', () => {
    expect(calcularOcupacaoTurma(12, 20)).toEqual({ inscritos: 12, capacidade: 20, percentual: 60 });
    expect(calcularOcupacaoTurma(25, 20)?.percentual).toBe(125);
    expect(calcularOcupacaoTurma(12, 0)).toBeNull();
    expect(calcularOcupacaoTurma(12, null)).toBeNull();
    expect(calcularOcupacaoTurma(undefined, 20)).toBeNull();
    expect(calcularOcupacaoTurma('invalido', 20)).toBeNull();
  });
});

describe('turmasDerivacoes — metadados complementares', () => {
  const REF = new Date(2026, 7, 25); // 25/08/2026

  it('formata a carga horária real como duração', () => {
    expect(formatarDuracaoTurma(4)).toBe('4 horas');
    expect(formatarDuracaoTurma(1)).toBe('1 hora');
    expect(formatarDuracaoTurma('1.5')).toBe('1,5 horas');
    expect(formatarDuracaoTurma(0)).toBeNull();
    expect(formatarDuracaoTurma('invalido')).toBeNull();
    expect(formatarDuracaoTurma(null)).toBeNull();
  });

  it('calcula o complemento temporal por situação, sem inventar datas', () => {
    expect(referenciaTemporalTurma(new Date(2026, 8, 1), 'proximas', null, REF)).toBe('Em 7 dias');
    expect(referenciaTemporalTurma(new Date(2026, 7, 26), 'proximas', null, REF)).toBe('Amanhã');
    expect(referenciaTemporalTurma(new Date(2026, 7, 25), 'proximas', null, REF)).toBe('Hoje');
    expect(referenciaTemporalTurma(new Date(2026, 7, 20), 'proximas', null, REF)).toBeNull();
    expect(referenciaTemporalTurma(new Date(2026, 7, 14), 'andamento', null, REF)).toBe('Iniciada há 11 dias');
    expect(referenciaTemporalTurma(new Date(2026, 1, 5), 'concluidas', '2026-02-20', REF)).toBe(
      'Concluída em 20/02'
    );
    expect(referenciaTemporalTurma(null, 'proximas', null, REF)).toBeNull();
  });

  it('expõe hora final e duração somente quando os dados existem', () => {
    const [comFim] = montarTurmas(
      [
        {
          id: 'inst-fim',
          curso_id: 'curso-1',
          data_inicio: '2026-09-01T11:00:00Z',
          data_fim: '2026-09-01T15:00:00Z',
          status: 'planejado',
          capacidade_maxima: 20,
        },
      ],
      CURSOS,
      [],
      REF
    );
    expect(comFim.hora).not.toBeNull();
    expect(comFim.horaFim).not.toBeNull();
    expect(comFim.duracao).toBe('4 horas');
    expect(comFim.referencia).toBe('Em 7 dias');

    const [semFim] = montarTurmas(
      [{ id: 'inst-sem-fim', curso_id: 'curso-1', data_inicio: '2026-09-01T11:00:00Z', status: 'planejado' }],
      CURSOS,
      [],
      REF
    );
    expect(semFim.horaFim).toBeNull();
  });
});

describe('turmasDerivacoes — filtros e ordenação', () => {
  const turmas = montarTurmas(INSTANCIAS, CURSOS, COLABORADORES);
  const referencia = new Date(2026, 8, 3);

  it('busca por curso, instrutor, categoria, local e id', () => {
    expect(filtrarTurmas(turmas, { busca: 'ergonomia' }, referencia).map((t) => t.id)).toEqual(['inst-1']);
    expect(filtrarTurmas(turmas, { busca: 'gustavo' }, referencia)).toHaveLength(2);
    expect(filtrarTurmas(turmas, { busca: 'segurança' }, referencia)).toHaveLength(1);
    expect(filtrarTurmas(turmas, { busca: 'inst-3' }, referencia).map((t) => t.id)).toEqual(['inst-3']);
  });

  it('combina status + modalidade', () => {
    expect(
      filtrarTurmas(turmas, { status: 'planejado', modalidade: 'presencial' }, referencia).map((t) => t.id)
    ).toEqual(['inst-1']);
    expect(filtrarTurmas(turmas, { status: 'planejado', modalidade: 'online' }, referencia)).toEqual([]);
  });

  it('aplica período com base em data_inicio', () => {
    expect(intervaloPeriodoTurma('todas', referencia)).toBeNull();
    const setembro = intervaloPeriodoTurma('mes', referencia);
    expect(setembro?.inicio.getDate()).toBe(1);
    expect(setembro?.fim.getDate()).toBe(30);
    expect(filtrarTurmas(turmas, { periodo: 'mes' }, referencia).map((t) => t.id)).toEqual(['inst-1']);
    expect(filtrarTurmas(turmas, { periodo: 'proximas30' }, referencia)).toEqual([]);
  });

  it('ordena por data (nulos ao final), curso e capacidade', () => {
    const semData = [
      ...turmas,
      ...montarTurmas([{ id: 'sem-data', curso_id: 'curso-1', data_inicio: null, status: 'planejado' }], CURSOS),
    ];
    expect(ordenarTurmas(semData, 'data_asc').at(-1)?.id).toBe('sem-data');
    expect(ordenarTurmas(semData, 'data_desc').at(-1)?.id).toBe('sem-data');
    expect(ordenarTurmas(turmas, 'curso')[0].id).toBe('inst-3');
    expect(ordenarTurmas(turmas, 'capacidade')[0].id).toBe('inst-3');
    expect(ORDENACAO_TURMA_PADRAO).toBe('data_asc');
  });

  it('deriva opções de status e modalidade dos dados reais', () => {
    expect(opcoesStatusTurma(turmas).map((o) => o.value)).toEqual(['concluido', 'em_curso', 'planejado']);
    expect(opcoesModalidadeTurma(turmas).map((o) => o.label)).toEqual(['Híbrido', 'Online', 'Presencial']);
  });

  it('intercala a entrada: 1º de cada coluna, depois o 2º', () => {
    const grupos = agruparTurmas(
      montarTurmas(
        [
          ...INSTANCIAS,
          { id: 'inst-4', curso_id: 'curso-1', data_inicio: '2026-10-01T12:00:00Z', status: 'planejado' },
        ],
        CURSOS
      )
    );
    const indices = indicesEntradaTurmas(grupos);
    expect(indices.get('inst-1')).toBe(0);
    expect(indices.get('inst-2')).toBe(1);
    expect(indices.get('inst-3')).toBe(2);
    expect(indices.get('inst-4')).toBe(3);
  });
});
