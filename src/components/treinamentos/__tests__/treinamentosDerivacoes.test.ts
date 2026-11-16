import { describe, it, expect } from 'vitest';
import {
  agruparParticipantes,
  calcularIndicadoresTreinamentos,
  filtrarTreinamentos,
  formatarCargaHoraria,
  formatarDataTreinamento,
  normalizarTexto,
  opcoesCategoriaTreinamento,
  opcoesStatusTreinamento,
  paginarTreinamentos,
  parseDataTreinamento,
  resumirOcupacao,
  resumirOcupacoes,
  statusTreinamento,
  type TreinamentoRegistro,
} from '../treinamentosDerivacoes';

const REFERENCIA = new Date(2026, 9, 21); // 21/10/2026

const LISTA: TreinamentoRegistro[] = [
  { id: 't1', nome: 'Integração e Cultura', descricao: 'Onboarding', data: '2026-02-10', status: 'em_andamento' },
  {
    id: 't2',
    nome: 'NR-17 Ergonomia',
    descricao: 'Saúde no trabalho',
    data: '2026-08-20',
    status: 'aguardando_inicio',
  },
  { id: 't3', nome: 'Comunicação Assertiva', descricao: 'Feedback', data: '2026-04-15', status: 'concluido' },
  { id: 't4', nome: 'Liderança', descricao: 'Gestão de equipes', data: '2025-11-05', status: 'planejado' },
  { id: 't5', nome: 'Diversidade', descricao: undefined, data: null, status: null },
];

describe('texto, datas e horas', () => {
  it('normaliza acentos e caixa', () => {
    expect(normalizarTexto('Comunicação ASSERTIVA')).toBe('comunicacao assertiva');
  });

  it('formata YYYY-MM-DD sem recuo de fuso', () => {
    expect(formatarDataTreinamento('2026-02-10')).toBe('10/02/2026');
    expect(parseDataTreinamento('2026-02-10')?.getDate()).toBe(10);
  });

  it('devolve — para data ausente ou inválida', () => {
    expect(formatarDataTreinamento(null)).toBe('—');
    expect(formatarDataTreinamento('')).toBe('—');
  });

  it('formata carga horária real', () => {
    expect(formatarCargaHoraria(8)).toBe('8h');
    expect(formatarCargaHoraria('1.5')).toBe('1,5h');
    expect(formatarCargaHoraria(null)).toBe('—');
  });
});

describe('status', () => {
  it('mapeia códigos reais para rótulos semânticos', () => {
    expect(statusTreinamento('em_andamento')).toMatchObject({ label: 'Em andamento', tom: 'success' });
    expect(statusTreinamento('aguardando_inicio')).toMatchObject({ label: 'Aguardando início', tom: 'warning' });
    expect(statusTreinamento('planejado')).toMatchObject({ label: 'Planejado', tom: 'info' });
    expect(statusTreinamento('concluido')).toMatchObject({ label: 'Concluído', tom: 'teal' });
    expect(statusTreinamento('finalizado')).toMatchObject({ label: 'Concluído', tom: 'teal' });
    expect(statusTreinamento('realizado')).toMatchObject({ label: 'Concluído', tom: 'teal' });
  });

  it('não inventa status ausente ou desconhecido', () => {
    expect(statusTreinamento(null)).toMatchObject({ codigo: 'nao_informado', label: 'Não informado' });
    expect(statusTreinamento('status_novo')).toMatchObject({ codigo: 'status_novo', label: 'status_novo' });
  });
});

describe('filtros', () => {
  it('busca sem acento em nome e descrição', () => {
    expect(filtrarTreinamentos(LISTA, { busca: 'comunicacao' }, REFERENCIA).map((t) => t.id)).toEqual(['t3']);
    expect(filtrarTreinamentos(LISTA, { busca: 'saude' }, REFERENCIA).map((t) => t.id)).toEqual(['t2']);
  });

  it('filtra por status normalizado', () => {
    expect(filtrarTreinamentos(LISTA, { status: 'em_andamento' }, REFERENCIA).map((t) => t.id)).toEqual(['t1']);
    expect(filtrarTreinamentos(LISTA, { status: 'nao_informado' }, REFERENCIA).map((t) => t.id)).toEqual(['t5']);
  });

  it('aplica período e exclui registros sem data', () => {
    const ultimos90 = filtrarTreinamentos(LISTA, { periodo: '90d' }, REFERENCIA).map((t) => t.id);
    expect(ultimos90).toEqual(['t2']);
    expect(filtrarTreinamentos(LISTA, { periodo: 'ano' }, REFERENCIA).map((t) => t.id)).toEqual(['t1', 't2', 't3']);
  });

  it('categoria ausente só aparece quando há categoria real', () => {
    const comCategoria = [{ ...LISTA[0], categoria: 'Onboarding' }];
    expect(filtrarTreinamentos(comCategoria, { categoria: '__sem_categoria__' }, REFERENCIA)).toHaveLength(0);
    expect(filtrarTreinamentos(LISTA, { categoria: '__sem_categoria__' }, REFERENCIA)).toHaveLength(5);
  });

  it('monta opções a partir dos dados', () => {
    expect(opcoesStatusTreinamento(LISTA).map((o) => o.label)).toEqual([
      'Em andamento',
      'Aguardando início',
      'Concluído',
      'Planejado',
      'Não informado',
    ]);
    expect(opcoesCategoriaTreinamento(LISTA)).toEqual([]);
    expect(opcoesCategoriaTreinamento([{ ...LISTA[0], categoria: 'Onboarding' }])).toEqual([
      { value: 'onboarding', label: 'Onboarding' },
    ]);
  });
});

describe('paginação', () => {
  const itens = Array.from({ length: 12 }, (_, i) => ({ id: `i${i + 1}` }));

  it('fatia a lista filtrada e informa os limites', () => {
    const pagina = paginarTreinamentos(itens, 2, 5);
    expect(pagina.itens.map((i) => i.id)).toEqual(['i6', 'i7', 'i8', 'i9', 'i10']);
    expect(pagina).toMatchObject({ pagina: 2, totalPaginas: 3, inicio: 6, fim: 10, total: 12 });
  });

  it('nunca devolve página inexistente nem linhas vazias', () => {
    expect(paginarTreinamentos(itens, 99, 5).pagina).toBe(3);
    expect(paginarTreinamentos([], 3, 10)).toMatchObject({
      itens: [],
      pagina: 1,
      totalPaginas: 1,
      inicio: 0,
      fim: 0,
      total: 0,
    });
  });
});

describe('participantes', () => {
  it('conta colaboradores únicos e presenças confirmadas', () => {
    const resumo = agruparParticipantes([
      {
        id: 'p1',
        treinamento_id: 't1',
        colaborador_id: 'c1',
        presente: false,
        colaborador: { nome_completo: 'Ana Souza' },
      },
      {
        id: 'p2',
        treinamento_id: 't1',
        colaborador_id: 'c1',
        presente: true,
        colaborador: { nome_completo: 'Ana Souza' },
      },
      {
        id: 'p3',
        treinamento_id: 't1',
        colaborador_id: 'c2',
        presente: true,
        colaborador: { nome_completo: 'Bruno Lima' },
      },
      {
        id: 'p4',
        treinamento_id: 't1',
        colaborador_id: 'c3',
        presente: false,
        colaborador: { nome_completo: 'Carla Dias' },
      },
    ]);

    expect(resumo.t1).toMatchObject({ total: 3, presentes: 2, percentual: 67 });
    expect(resumo.t1.colaboradores.map((c) => c.nome)).toEqual(['Ana Souza', 'Bruno Lima', 'Carla Dias']);
  });

  it('não cria resumo para treinamento sem registros', () => {
    expect(agruparParticipantes([])).toEqual({});
  });
});

describe('ocupação (mock visual)', () => {
  const colaboradores = [
    { id: 'c1', nome: 'Ana Souza', fotoUrl: null },
    { id: 'c2', nome: 'Bruno Lima', fotoUrl: null },
    { id: 'c3', nome: 'Carla Dias', fotoUrl: null },
  ];

  it('usa inscritos de capacidade como "X de Y" e o percentual da barra', () => {
    const resumo = resumirOcupacao({ inscritos: 18, capacidade: 30, excedente: 12, colaboradores });
    expect(resumo).toMatchObject({ total: 30, presentes: 18, percentual: 60, excedente: 12 });
    expect(resumo.colaboradores).toHaveLength(3);
  });

  it('respeita o excedente informado pela referência', () => {
    expect(resumirOcupacao({ inscritos: 20, capacidade: 30, excedente: 15, colaboradores }).excedente).toBe(15);
  });

  it('sem excedente explícito, deriva dos avatares exibidos', () => {
    expect(resumirOcupacao({ inscritos: 10, capacidade: 25, colaboradores }).excedente).toBe(7);
  });

  it('cheia a 100% e não passa da capacidade', () => {
    const cheio = resumirOcupacao({ inscritos: 28, capacidade: 28, colaboradores });
    expect(cheio.percentual).toBe(100);
    expect(cheio.presentes).toBe(28);

    const excedido = resumirOcupacao({ inscritos: 40, capacidade: 30, colaboradores });
    expect(excedido.presentes).toBe(30);
    expect(excedido.percentual).toBe(100);
  });

  it('capacidade zero não divide por zero nem inventa progresso', () => {
    expect(resumirOcupacao({ inscritos: 5, capacidade: 0, colaboradores })).toMatchObject({
      total: 0,
      presentes: 0,
      percentual: 0,
    });
  });

  it('aplica o resumo a todas as linhas do mapa', () => {
    const mapa = resumirOcupacoes({
      t1: { inscritos: 8, capacidade: 20, excedente: 6, colaboradores },
      t2: { inscritos: 12, capacidade: 25, excedente: 8, colaboradores },
    });

    expect(Object.keys(mapa)).toEqual(['t1', 't2']);
    expect(mapa.t1).toMatchObject({ presentes: 8, total: 20, percentual: 40 });
    expect(mapa.t2).toMatchObject({ presentes: 12, total: 25, percentual: 48 });
  });
});

describe('indicadores', () => {
  const cursos = [
    { id: 'curso-1', obrigatorio: true },
    { id: 'curso-2', obrigatorio: true },
    { id: 'curso-3', obrigatorio: false },
  ];
  const inscricoes = [
    { colaborador_id: 'c1', curso_id: 'curso-1', status: 'em_andamento' },
    { colaborador_id: 'c1', curso_id: 'curso-2', status: 'concluido' },
    { colaborador_id: 'c2', curso_id: 'curso-1', status: 'inscrito' },
    { colaborador_id: 'c3', curso_id: 'curso-2', status: 'concluido' },
    { colaborador_id: 'c4', curso_id: 'curso-3', status: 'cancelado' },
  ];
  const certificados = [
    { data_emissao: '2026-01-20T12:00:00Z' },
    { data_emissao: '2026-03-10T12:00:00Z' },
    { data_emissao: '2025-08-28T12:00:00Z' },
    { data_emissao: '2025-06-15T12:00:00Z' },
    { data_emissao: null },
  ];

  it('calcula colaboradores únicos, taxa e pendências de obrigatórios', () => {
    const kpi = calcularIndicadoresTreinamentos({
      inscricoes,
      cursos,
      certificados,
      referencia: REFERENCIA,
    });

    // c1 e c2 têm inscrição ativa/inscrita; c1 repete e conta uma vez.
    expect(kpi.participacaoAtiva).toBe(2);
    // Cancelada fica fora do denominador: 4 inscrições, 2 concluídas.
    expect(kpi.inscricoesConsideradas).toBe(4);
    expect(kpi.conclusoes).toBe(2);
    expect(kpi.conclusaoPercentual).toBe(50);
    // c1 (curso-1 em andamento) e c2 (curso-1 inscrito) estão pendentes.
    expect(kpi.pendenciasObrigatorias).toBe(2);
    expect(kpi.certificadosAno).toBe(2);
    expect(kpi.variacaoCertificados).toBe(0);
    expect(kpi.conclusaoDisponivel).toBe(true);
    expect(kpi.pendenciasDisponiveis).toBe(true);
  });

  it('devolve indicador nulo quando não há base de cálculo', () => {
    const kpi = calcularIndicadoresTreinamentos({
      inscricoes: [],
      cursos: [],
      certificados: [],
      referencia: REFERENCIA,
    });

    expect(kpi.conclusaoPercentual).toBeNull();
    expect(kpi.variacaoCertificados).toBeNull();
    expect(kpi.participacaoDisponivel).toBe(false);
    expect(kpi.conclusaoDisponivel).toBe(false);
    expect(kpi.pendenciasDisponiveis).toBe(false);
    expect(kpi.certificadosDisponiveis).toBe(false);
  });
});
