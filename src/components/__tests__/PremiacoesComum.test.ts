import { describe, expect, it } from 'vitest';
import {
  calcularMetricasCampanha,
  calcularVariacaoMensal,
  contarPorStatus,
  filtrarEOrdenarCampanhas,
  iniciaisDe,
  montarAcoesPendentes,
  montarAtividadeRecente,
  montarMetricas,
  normalizar,
  paginarCampanhas,
  rotuloEventoAuditoria,
  situacaoTemporal,
  tempoRelativo,
  ROTULO_STATUS_PAGAMENTO,
  type CampanhaHub,
  type PagamentoHub,
} from '@/components/premiacoes/premiacoesComum';

/**
 * ============================================================================
 * Derivações do Hub de Premiações.
 *
 * Toda data é fixa: os testes passam `hoje`/`agora` explícitos para não depender
 * do relógio da máquina (mesmo critério dos demais testes de derivação do repo).
 * ============================================================================
 */

const HOJE = new Date(2026, 9, 15); // 15/10/2026

function campanha(over: Partial<CampanhaHub> = {}): CampanhaHub {
  return {
    id: 'c1',
    nome: 'Campanha de Vendas Q3 2026',
    descricao: 'Aceleração de receita com bônus trimestral.',
    data_inicio: '2026-07-01',
    data_fim: '2026-09-30',
    status: 'ativo',
    orcamento_estimado: 85000,
    status_aprovacao: 'aprovado',
    created_at: '2026-07-01T10:00:00.000Z',
    updated_at: '2026-10-10T10:00:00.000Z',
    ...over,
  };
}

function pagamento(over: Partial<PagamentoHub> = {}): PagamentoHub {
  return {
    id: 'p1',
    campanha_id: 'c1',
    colaborador_id: 'col-1',
    valor_calculado: 1000,
    valor_aprovado: null,
    status: 'calculado',
    status_conciliacao: 'pendente',
    data_pagamento: null,
    updated_at: '2026-10-11T10:00:00.000Z',
    colaborador: { nome_completo: 'Ana Souza' },
    ...over,
  };
}

describe('métricas por campanha', () => {
  it('soma orçamento comprometido pelo aprovado e cai no calculado quando falta', () => {
    const metricas = calcularMetricasCampanha(
      campanha(),
      [
        pagamento({ id: 'p1', valor_calculado: 1000, valor_aprovado: 800 }),
        pagamento({ id: 'p2', valor_calculado: 400, valor_aprovado: null }),
      ],
      HOJE,
    );

    expect(metricas.valorCalculado).toBe(1400);
    expect(metricas.valorAprovado).toBe(800);
    expect(metricas.valorComprometido).toBe(1200);
    expect(metricas.pctOrcamento).toBeCloseTo((1200 / 85000) * 100, 5);
    expect(metricas.pctAprovado).toBeCloseTo((800 / 1400) * 100, 5);
  });

  it('conta participantes distintos e ignora repetição do mesmo colaborador', () => {
    const metricas = calcularMetricasCampanha(
      campanha(),
      [
        pagamento({ id: 'p1', colaborador_id: 'col-2', colaborador: { nome_completo: 'Bruno Lima' } }),
        pagamento({ id: 'p2', colaborador_id: 'col-2', colaborador: { nome_completo: 'Bruno Lima' } }),
        pagamento({ id: 'p3', colaborador_id: 'col-1', colaborador: { nome_completo: 'Ana Souza' } }),
      ],
      HOJE,
    );

    expect(metricas.participantes.total).toBe(2);
    expect(metricas.participantes.nomes).toEqual(['Ana Souza', 'Bruno Lima']);
  });

  it('devolve percentuais nulos (sem divisão inválida) quando não há orçamento nem cálculo', () => {
    const metricas = calcularMetricasCampanha(campanha({ orcamento_estimado: null }), [], HOJE);

    expect(metricas.orcamentoIndisponivel).toBe(true);
    expect(metricas.pctOrcamento).toBeNull();
    expect(metricas.pctAprovado).toBeNull();
  });

  it('conta pendências e divergências pelos status reais do fluxo', () => {
    const metricas = calcularMetricasCampanha(
      campanha(),
      [
        pagamento({ id: 'p1', status: 'calculado' }),
        pagamento({ id: 'p2', status: 'aprovado_rh' }),
        pagamento({ id: 'p3', status: 'pago', status_conciliacao: 'conciliado' }),
        pagamento({ id: 'p4', status: 'aprovado_financeiro', status_conciliacao: 'divergente' }),
        pagamento({ id: 'p5', status: 'rejeitado' }),
      ],
      HOJE,
    );

    expect(metricas.pagamentosPendentes).toBe(2);
    expect(metricas.divergencias).toBe(1);
  });
});

describe('situação temporal', () => {
  it('marca vigente, futura e encerrada a partir das datas reais', () => {
    expect(situacaoTemporal(campanha({ data_inicio: '2026-10-01', data_fim: '2026-12-31' }), HOJE)).toEqual({
      situacao: 'vigente',
      diasRestantes: 77,
    });
    expect(situacaoTemporal(campanha({ data_inicio: '2026-10-25', data_fim: '2026-12-31' }), HOJE)).toEqual({
      situacao: 'futura',
      diasRestantes: 10,
    });
    expect(situacaoTemporal(campanha({ data_inicio: '2026-03-01', data_fim: '2026-06-30' }), HOJE)).toEqual({
      situacao: 'encerrada',
      diasRestantes: null,
    });
  });

  it('não inventa contagem quando falta a data final', () => {
    const semFim = situacaoTemporal({ ...campanha(), data_fim: null as unknown as string }, HOJE);
    expect(semFim.diasRestantes).toBeNull();
    expect(semFim.situacao).toBe('vigente');
  });
});

describe('filtros, contadores e ordenação', () => {
  const metricas = montarMetricas(
    [
      campanha({ id: 'c1', nome: 'Campanha de Vendas Q3 2026', descricao: 'Aceleração de receita com bônus trimestral.', data_inicio: '2026-07-01', data_fim: '2026-09-30' }),
      campanha({
        id: 'c2',
        nome: 'Bônus por Meta de Produção',
        descricao: 'Incentivo por produtividade na operação logística.',
        data_inicio: '2026-08-01',
        data_fim: '2026-10-31',
        orcamento_estimado: 42000,
      }),
      campanha({
        id: 'c3',
        nome: 'Programa Indique um Amigo',
        descricao: 'Premiação por indicações convertidas.',
        status: 'finalizado',
        data_inicio: '2026-03-01',
        data_fim: '2026-06-30',
        orcamento_estimado: 18000,
      }),
      campanha({
        id: 'c4',
        nome: 'Premiação de Inovação',
        descricao: 'Reconhecimento de ideias com ganho de eficiência.',
        status: 'rascunho',
        status_aprovacao: 'revisando',
        data_inicio: '2026-10-01',
        data_fim: '2026-12-31',
        orcamento_estimado: 30000,
      }),
    ],
    [
      pagamento({ id: 'p1', campanha_id: 'c2', colaborador_id: 'col-1', valor_calculado: 500, valor_aprovado: 500 }),
      pagamento({ id: 'p2', campanha_id: 'c2', colaborador_id: 'col-2', valor_calculado: 500, valor_aprovado: null }),
    ],
    HOJE,
  );

  it('conta por status real e mantém o total', () => {
    expect(contarPorStatus(metricas)).toEqual({
      todos: 4,
      ativo: 2,
      finalizado: 1,
      rascunho: 1,
      suspenso: 0,
    });
  });

  it('busca por nome e por descrição, ignorando acento e caixa', () => {
    const porNome = filtrarEOrdenarCampanhas(metricas, { busca: 'BONUS producao', status: 'todos', periodo: 'todos', ordenacao: 'nome' }, HOJE);
    expect(porNome.map((m) => m.campanha.id)).toEqual(['c2']);

    const porDescricao = filtrarEOrdenarCampanhas(metricas, { busca: 'trimestral', status: 'todos', periodo: 'todos', ordenacao: 'nome' }, HOJE);
    expect(porDescricao.map((m) => m.campanha.id)).toEqual(['c1']);
  });

  it('combina status + período com as datas reais', () => {
    const ativasNoAno = filtrarEOrdenarCampanhas(
      metricas,
      { busca: '', status: 'ativo', periodo: 'ano_atual', ordenacao: 'inicio_recente' },
      HOJE,
    );
    expect(ativasNoAno.map((m) => m.campanha.id)).toEqual(['c2', 'c1']);

    // 90 dias antes de 15/10/2026 = 17/07/2026: c1 (01/07) fica de fora.
    const ultimos90 = filtrarEOrdenarCampanhas(
      metricas,
      { busca: '', status: 'todos', periodo: 'ultimos_90', ordenacao: 'inicio_recente' },
      HOJE,
    );
    expect(ultimos90.map((m) => m.campanha.id)).toEqual(['c4', 'c2']);

    const mesAtual = filtrarEOrdenarCampanhas(
      metricas,
      { busca: '', status: 'todos', periodo: 'mes_atual', ordenacao: 'inicio_recente' },
      HOJE,
    );
    expect(mesAtual.map((m) => m.campanha.id)).toEqual(['c4']);
  });

  it('ordena por período, nome, orçamento, participantes e % aprovado', () => {
    const ids = (ordenacao: Parameters<typeof filtrarEOrdenarCampanhas>[1]['ordenacao']) =>
      filtrarEOrdenarCampanhas(metricas, { busca: '', status: 'todos', periodo: 'todos', ordenacao }, HOJE).map(
        (m) => m.campanha.id,
      );

    expect(ids('inicio_antigo')).toEqual(['c3', 'c1', 'c2', 'c4']);
    expect(ids('nome')).toEqual(['c2', 'c1', 'c4', 'c3']);
    expect(ids('orcamento')).toEqual(['c1', 'c2', 'c4', 'c3']);
    // Só c2 tem participantes; o empate entre as demais é desfeito pelo nome.
    expect(ids('participantes')).toEqual(['c2', 'c1', 'c4', 'c3']);
    // c2 = 50% aprovado; as demais não têm base de cálculo (null) e vão para o fim.
    expect(ids('aprovacao')[0]).toBe('c2');
  });
});

describe('variação do total aprovado', () => {
  it('devolve null quando não há base no mês anterior', () => {
    const pagamentos = [
      pagamento({ id: 'p1', valor_aprovado: 1000, data_pagamento: '2026-10-05' }),
    ];
    expect(calcularVariacaoMensal(pagamentos, HOJE)).toBeNull();
  });

  it('compara o mês corrente com o anterior pelas datas reais', () => {
    const pagamentos = [
      pagamento({ id: 'p1', valor_aprovado: 1200, data_pagamento: '2026-10-05' }),
      pagamento({ id: 'p2', valor_aprovado: 1000, data_pagamento: '2026-09-05' }),
    ];
    const variacao = calcularVariacaoMensal(pagamentos, HOJE);

    expect(variacao?.atual).toBe(1200);
    expect(variacao?.anterior).toBe(1000);
    expect(variacao?.percentual).toBeCloseTo(20, 5);
  });

  it('usa updated_at quando o pagamento ainda não tem data de pagamento', () => {
    const pagamentos = [
      pagamento({ id: 'p1', valor_aprovado: 500, data_pagamento: null, updated_at: '2026-10-02T00:00:00.000Z' }),
      pagamento({ id: 'p2', valor_aprovado: 250, data_pagamento: null, updated_at: '2026-09-10T00:00:00.000Z' }),
    ];
    expect(calcularVariacaoMensal(pagamentos, HOJE)?.percentual).toBeCloseTo(100, 5);
  });
});

describe('próximas ações', () => {
  const metricas = montarMetricas(
    [
      campanha({ id: 'c1', nome: 'Vendas Q3', data_inicio: '2026-07-01', data_fim: '2026-09-30' }),
      campanha({
        id: 'c4',
        nome: 'Premiação de Inovação',
        status: 'rascunho',
        status_aprovacao: 'revisando',
        updated_at: '2026-10-12T09:00:00.000Z',
      }),
    ],
    [],
    HOJE,
  );

  const pagamentos = [
    pagamento({ id: 'p1', campanha_id: 'c1', status: 'calculado', updated_at: '2026-10-11T09:00:00.000Z' }),
    pagamento({ id: 'p2', campanha_id: 'c1', status: 'revisando', updated_at: '2026-10-05T09:00:00.000Z' }),
    pagamento({ id: 'p3', campanha_id: 'c1', status: 'aprovado_financeiro', status_conciliacao: 'divergente', updated_at: '2026-10-14T09:00:00.000Z' }),
  ];

  it('deriva pendências apenas de fatos reais e ordena pelas mais antigas', () => {
    const acoes = montarAcoesPendentes(metricas, pagamentos);

    expect(acoes.map((a) => a.tipo)).toEqual(['aprovacao', 'configuracao', 'conciliacao']);
    // "Aprovar 2 pagamentos" espera desde 05/10 (mais antigo) — vem primeiro.
    expect(acoes[0].titulo).toBe('Aprovar 2 pagamentos');
    expect(acoes[0].desde).toBe('2026-10-05T09:00:00.000Z');
    expect(acoes[0].destino).toBe('pagamentos');
    expect(acoes[1].titulo).toBe('Revisar aprovação');
    expect(acoes[1].destino).toBe('campanhas');
    expect(acoes[2].titulo).toBe('Reconciliar divergência');
  });

  it('não cria pendência quando não há rascunho, pagamento pendente ou divergência', () => {
    const vazio = montarAcoesPendentes(
      montarMetricas([campanha({ id: 'c9', status: 'ativo', status_aprovacao: 'aprovado' })], [], HOJE),
      [],
    );
    expect(vazio).toEqual([]);
  });
});

describe('atividade recente', () => {
  const campanhas = [campanha({ id: 'c1', nome: 'Vendas Q3' })];
  const pagamentos = [
    pagamento({
      id: 'p1',
      campanha_id: 'c1',
      historico_mudancas: [{ status: 'aprovado_rh', comentario: 'ok', user: 'RH / Admin' }],
    }),
  ];

  it('ordena do mais recente para o mais antigo, resolve o objeto e o responsável', () => {
    const eventos = montarAtividadeRecente(
      [
        { id: 'a1', entidade_tipo: 'campanha', entidade_id: 'c1', acao: 'criacao', motivo: 'Campanha criada', created_at: '2026-08-01T10:00:00.000Z' },
        { id: 'a2', entidade_tipo: 'pagamento', entidade_id: 'p1', acao: 'aprovacao', motivo: 'Pagamento aprovado', created_at: '2026-10-14T10:00:00.000Z' },
      ],
      campanhas,
      pagamentos,
      4,
    );

    expect(eventos.map((e) => e.id)).toEqual(['a2', 'a1']);
    expect(eventos[0].titulo).toBe('Pagamento aprovado');
    expect(eventos[0].objeto).toBe('Vendas Q3');
    expect(eventos[0].responsavel).toBe('RH / Admin');
    expect(eventos[1].titulo).toBe('Campanha criada');
  });

  it('respeita o limite e ignora eventos sem data', () => {
    const eventos = montarAtividadeRecente(
      [
        { id: 'a1', entidade_tipo: 'campanha', entidade_id: 'c1', acao: 'criacao', motivo: 'x', created_at: '2026-08-01T10:00:00.000Z' },
        { id: 'a2', entidade_tipo: 'campanha', entidade_id: 'c1', acao: 'alteracao', motivo: 'y', created_at: '2026-10-01T10:00:00.000Z' },
        { id: 'a3', entidade_tipo: 'campanha', entidade_id: 'c1', acao: 'alteracao', motivo: 'z', created_at: '' },
      ],
      campanhas,
      pagamentos,
      1,
    );

    expect(eventos).toHaveLength(1);
    expect(eventos[0].id).toBe('a2');
  });
});

describe('paginação local', () => {
  const metricas = montarMetricas(
    Array.from({ length: 9 }, (_, i) =>
      campanha({ id: `c${i + 1}`, nome: `Campanha ${i + 1}`, data_inicio: `2026-0${(i % 9) + 1}-01` }),
    ),
    [],
    HOJE,
  );

  it('recorta a página pedida e informa o total de páginas', () => {
    const segunda = paginarCampanhas(metricas, 2, 4);
    expect(segunda.pagina).toBe(2);
    expect(segunda.totalPaginas).toBe(3);
    expect(segunda.linhas).toHaveLength(4);

    const ultima = paginarCampanhas(metricas, 3, 4);
    expect(ultima.pagina).toBe(3);
    expect(ultima.linhas).toHaveLength(1);
  });

  it('nunca devolve página inexistente nem página vazia por falta de registros', () => {
    const foraDaFaixa = paginarCampanhas(metricas, 99, 4);
    expect(foraDaFaixa.pagina).toBe(3);
    expect(foraDaFaixa.linhas).toHaveLength(1);

    const semRegistros = paginarCampanhas([], 4, 4);
    expect(semRegistros).toEqual({ pagina: 1, totalPaginas: 1, linhas: [] });
  });

  it('trata página ou tamanho inválidos sem quebrar', () => {
    expect(paginarCampanhas(metricas, 0, 4).pagina).toBe(1);
    // Tamanho 0 é tratado como 1 linha por página (nunca `NaN`/página vazia).
    const tamanhoZero = paginarCampanhas(metricas, 1, 0);
    expect(tamanhoZero.totalPaginas).toBe(9);
    expect(tamanhoZero.linhas).toHaveLength(1);
  });
});

describe('utilitários', () => {
  it('formata tempo relativo em horas, dias e meses', () => {
    const agora = new Date(2026, 9, 15, 12, 0, 0);
    expect(tempoRelativo(new Date(2026, 9, 15, 10, 0, 0), agora)).toBe('há 2 h');
    expect(tempoRelativo(new Date(2026, 9, 14, 12, 0, 0), agora)).toBe('há 1 dia');
    expect(tempoRelativo(new Date(2026, 9, 10, 12, 0, 0), agora)).toBe('há 5 dias');
    expect(tempoRelativo(new Date(2026, 8, 15, 12, 0, 0), agora)).toBe('há 1 mês');
    expect(tempoRelativo(null, agora)).toBeNull();
  });

  it('gera iniciais do nome real do colaborador', () => {
    expect(iniciaisDe('Ana Souza')).toBe('AS');
    expect(iniciaisDe('Bruno')).toBe('BR');
    expect(iniciaisDe('  ')).toBe('?');
  });

  it('normaliza texto para busca', () => {
    expect(normalizar('Bônus por Meta')).toBe('bonus por meta');
  });

  it('rotula o evento da trilha pela entidade e ação reais', () => {
    expect(rotuloEventoAuditoria('campanha', 'criacao')).toBe('Campanha criada');
    expect(rotuloEventoAuditoria('pagamento', 'aprovacao')).toBe('Pagamento aprovado');
    expect(rotuloEventoAuditoria('regra', 'alteracao')).toBe('Regra alterada');
    expect(rotuloEventoAuditoria('outro', 'acao')).toBe('outro · acao');
  });

  it('conhece os estágios reais do pagamento', () => {
    expect(ROTULO_STATUS_PAGAMENTO.aprovado_financeiro).toBe('Em conciliação');
    expect(ROTULO_STATUS_PAGAMENTO.pago).toBe('Pago');
  });
});

