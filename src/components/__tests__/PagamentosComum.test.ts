import { describe, expect, it } from 'vitest';
import {
  acaoPrincipalPagamento,
  contarEtapasPagamento,
  divergenciaDoPagamento,
  etapaAtual,
  etapaDoPagamento,
  filtrarEOrdenarPagamentos,
  FILTROS_PAGAMENTO_INICIAIS,
  montarAcoesPagamentos,
  montarKpisPagamentos,
  montarResumoFinanceiro,
  opcoesCampanha,
  opcoesPeriodo,
  opcoesStatus,
  paginarPagamentos,
  podeConciliarPagamento,
  podeRejeitarPagamento,
  proximoStatusPagamento,
  rotuloPeriodo,
  rotuloStatusPagamento,
  valorDoPagamento,
  ETAPAS_FLUXO,
  STATUS_REINICIO_PAGAMENTO,
  type FiltrosPagamento,
} from '@/components/premiacoes/pagamentosComum';
import type { PagamentoHub } from '@/components/premiacoes/premiacoesComum';

/**
 * ============================================================================
 * Derivações da aba Pagamentos.
 *
 * Os testes fixam o CONTRATO que a tela usa: o mapa status → etapa (nenhum
 * estado real pode ficar fora das cinco etapas nem aparecer em duas), a cadeia
 * de aprovação (o MESMO `nextStageMap` do quadro antigo), os valores dos quatro
 * indicadores, os filtros/ordenação/paginação e as opções derivadas dos dados.
 * Datas sempre explícitas — nenhum teste depende do relógio da máquina.
 * ============================================================================
 */

function pagamento(over: Partial<PagamentoHub> = {}): PagamentoHub {
  return {
    id: 'p1',
    campanha_id: 'c1',
    colaborador_id: 'col-1',
    valor_calculado: 1000,
    valor_aprovado: null,
    valor_folha_real: null,
    justificativa_divergencia: null,
    observacoes: null,
    status: 'calculado',
    status_conciliacao: 'pendente',
    data_pagamento: null,
    created_at: '2026-06-10T10:00:00.000Z',
    updated_at: '2026-06-10T10:00:00.000Z',
    historico_mudancas: [],
    colaborador: { nome_completo: 'Ana Souza' },
    campanha: { nome: 'Campanha de Vendas Q3 2026' },
    ...over,
  };
}

describe('mapa status → etapa do fluxo', () => {
  const STATUS_REAIS = [
    'calculado',
    'revisando',
    'aprovado_gestor',
    'aprovado_rh',
    'aprovado_financeiro',
    'pago',
    'divergente_em_revisao',
    'rejeitado',
  ];

  it('coloca cada status real em NO MÁXIMO uma das cinco etapas', () => {
    for (const status of STATUS_REAIS) {
      const etapas = ETAPAS_FLUXO.filter((e) => e.status.includes(status));
      expect(etapas.length, `status ${status} aparece em ${etapas.length} etapas`).toBeLessThanOrEqual(1);
    }
  });

  it('mapeia a cadeia de aprovação como o quadro antigo (e deixa auditoria fora)', () => {
    expect(etapaDoPagamento('calculado')).toBe('calculado');
    expect(etapaDoPagamento('revisando')).toBe('em_aprovacao');
    expect(etapaDoPagamento('aprovado_gestor')).toBe('em_aprovacao');
    expect(etapaDoPagamento('aprovado_rh')).toBe('aprovado');
    expect(etapaDoPagamento('aprovado_financeiro')).toBe('enviado_folha');
    expect(etapaDoPagamento('pago')).toBe('conciliado');
    // Fora do fluxo: exigem auditoria/conciliação, nunca somem da tela.
    expect(etapaDoPagamento('rejeitado')).toBeNull();
    expect(etapaDoPagamento('divergente_em_revisao')).toBeNull();
    expect(etapaDoPagamento(null)).toBeNull();
  });

  it('conta as etapas e fecha o total com o que está fora do fluxo', () => {
    const contagem = contarEtapasPagamento([
      pagamento({ id: 'a', status: 'calculado' }),
      pagamento({ id: 'b', status: 'revisando' }),
      pagamento({ id: 'c', status: 'aprovado_gestor' }),
      pagamento({ id: 'd', status: 'aprovado_rh', valor_aprovado: 800 }),
      pagamento({ id: 'e', status: 'aprovado_financeiro', valor_aprovado: 700 }),
      pagamento({ id: 'f', status: 'pago', valor_folha_real: 900 }),
      pagamento({ id: 'g', status: 'rejeitado' }),
      pagamento({ id: 'h', status: 'divergente_em_revisao' }),
    ]);

    expect(contagem.porEtapa.calculado).toBe(1);
    expect(contagem.porEtapa.em_aprovacao).toBe(2);
    expect(contagem.porEtapa.aprovado).toBe(1);
    expect(contagem.porEtapa.enviado_folha).toBe(1);
    expect(contagem.porEtapa.conciliado).toBe(1);
    expect(contagem.foraDoFluxo).toBe(2);
    const somaEtapas = Object.values(contagem.porEtapa).reduce((a, b) => a + b, 0);
    expect(somaEtapas + contagem.foraDoFluxo).toBe(contagem.total);
    expect(contagem.total).toBe(8);
  });
});

describe('etapa atual (destaque do fluxo)', () => {
  it('aponta a primeira etapa com pagamentos aguardando algo', () => {
    expect(etapaAtual(contarEtapasPagamento([pagamento({ status: 'calculado' }), pagamento({ status: 'pago' })]))).toBe(
      'calculado',
    );
    expect(etapaAtual(contarEtapasPagamento([pagamento({ status: 'aprovado_rh' })]))).toBe('aprovado');
  });

  it('sem nada em andamento, destaca a última etapa com pagamentos', () => {
    expect(etapaAtual(contarEtapasPagamento([pagamento({ status: 'pago' })]))).toBe('conciliado');
    expect(etapaAtual(contarEtapasPagamento([]))).toBeNull();
  });
});

describe('valor do pagamento', () => {
  it('prefere o valor da folha, depois o aprovado e por fim o calculado', () => {
    expect(valorDoPagamento(pagamento({ valor_calculado: 100, valor_aprovado: 200, valor_folha_real: 300 }))).toBe(300);
    expect(valorDoPagamento(pagamento({ valor_calculado: 100, valor_aprovado: 200 }))).toBe(200);
    expect(valorDoPagamento(pagamento({ valor_calculado: 100 }))).toBe(100);
    expect(valorDoPagamento(pagamento({ valor_calculado: null }))).toBe(0);
  });

  it('calcula a diferença só quando a conciliação divergiu', () => {
    const divergente = pagamento({ status_conciliacao: 'divergente', valor_aprovado: 1610, valor_folha_real: 1680 });
    expect(divergenciaDoPagamento(divergente)).toBe(70);
    const conciliado = pagamento({ status_conciliacao: 'conciliado', valor_aprovado: 1000, valor_folha_real: 1000 });
    expect(divergenciaDoPagamento(conciliado)).toBe(0);
  });
});

describe('os quatro indicadores', () => {
  const pagamentos = [
    pagamento({ id: 'p1', status: 'calculado', valor_calculado: 1250 }),
    pagamento({ id: 'p2', status: 'revisando', valor_calculado: 1400 }),
    pagamento({ id: 'p3', status: 'aprovado_rh', valor_calculado: 1100, valor_aprovado: 1100 }),
    pagamento({
      id: 'p4',
      status: 'divergente_em_revisao',
      valor_calculado: 1680,
      valor_aprovado: 1610,
      valor_folha_real: 1680,
      status_conciliacao: 'divergente',
    }),
    pagamento({
      id: 'p5',
      status: 'pago',
      valor_aprovado: 1300,
      valor_folha_real: 1300,
      status_conciliacao: 'conciliado',
    }),
  ];

  it('soma valores e conta pagamentos de cada indicador', () => {
    const kpis = montarKpisPagamentos(pagamentos);
    expect(kpis.aprovado.valor).toBe(4010); // 1100 + 1610 + 1300
    expect(kpis.aprovado.quantidade).toBe(3);
    expect(kpis.aguardando.valor).toBe(3750); // 1250 + 1400 + 1100 (aprovado_rh ainda aguarda o financeiro)
    expect(kpis.aguardando.quantidade).toBe(3);
    expect(kpis.divergencias.valor).toBe(70); // |1680 - 1610|
    expect(kpis.divergencias.quantidade).toBe(1);
    expect(kpis.pago.valor).toBe(1300);
    expect(kpis.pago.quantidade).toBe(1);
    expect(kpis.total).toBe(5);
  });

  it('não conta o mesmo pagamento em dois segmentos (sem dupla contagem no total)', () => {
    const resumo = montarResumoFinanceiro([
      pagamento({ id: 'a', status: 'calculado', valor_calculado: 1000 }),
      pagamento({ id: 'b', status: 'aprovado_financeiro', valor_calculado: 2000, valor_aprovado: 2000 }),
      pagamento({ id: 'c', status: 'pago', valor_calculado: 3000, valor_aprovado: 3000, valor_folha_real: 3000 }),
      pagamento({
        id: 'd',
        status: 'divergente_em_revisao',
        valor_aprovado: 1000,
        valor_folha_real: 1070,
        status_conciliacao: 'divergente',
      }),
    ]);

    const porLabel = Object.fromEntries(resumo.segmentos.map((s) => [s.label, s.value]));
    expect(porLabel).toEqual({ Aprovados: 2000, Pendentes: 1000, Pagos: 3000, Divergências: 70 });
    // O pagamento JÁ PAGO (3000) não é contado também em "Aprovados".
    expect(resumo.total).toBe(6070);
  });

  it('resume o dinheiro em segmentos (sem fatia zerada) e fecha o total', () => {
    const resumo = montarResumoFinanceiro(pagamentos);
    expect(resumo.segmentos.every((s) => s.value > 0)).toBe(true);
    expect(resumo.total).toBe(resumo.segmentos.reduce((a, s) => a + s.value, 0));
    expect(montarResumoFinanceiro([]).segmentos).toEqual([]);
  });
});

describe('ações do fluxo', () => {
  it('avança exatamente um passo da cadeia real', () => {
    expect(proximoStatusPagamento('calculado')).toBe('revisando');
    expect(proximoStatusPagamento('revisando')).toBe('aprovado_gestor');
    expect(proximoStatusPagamento('aprovado_gestor')).toBe('aprovado_rh');
    expect(proximoStatusPagamento('aprovado_rh')).toBe('aprovado_financeiro');
    expect(proximoStatusPagamento('aprovado_financeiro')).toBeNull();
    expect(proximoStatusPagamento('pago')).toBeNull();
    expect(proximoStatusPagamento('rejeitado')).toBeNull();
  });

  it('rotula o botão com a AÇÃO real de cada status', () => {
    expect(acaoPrincipalPagamento('calculado')).toEqual({ tipo: 'avancar', label: 'Revisar' });
    expect(acaoPrincipalPagamento('revisando')).toEqual({ tipo: 'avancar', label: 'Aprovar' });
    expect(acaoPrincipalPagamento('aprovado_rh')).toEqual({ tipo: 'avancar', label: 'Aprovar' });
    expect(acaoPrincipalPagamento('aprovado_financeiro')).toEqual({ tipo: 'conciliar', label: 'Conciliar' });
    expect(acaoPrincipalPagamento('divergente_em_revisao')).toEqual({ tipo: 'conciliar', label: 'Resolver' });
    expect(acaoPrincipalPagamento('pago')).toEqual({ tipo: 'detalhes', label: 'Ver detalhes' });
    expect(acaoPrincipalPagamento('rejeitado')).toEqual({ tipo: 'reiniciar', label: 'Reiniciar fluxo' });
  });

  it('libera rejeição e reinício nos limites certos', () => {
    expect(podeRejeitarPagamento('calculado')).toBe(true);
    expect(podeRejeitarPagamento('pago')).toBe(false);
    expect(podeRejeitarPagamento('rejeitado')).toBe(false);
    expect(podeConciliarPagamento('aprovado_financeiro')).toBe(true);
    expect(podeConciliarPagamento('divergente_em_revisao')).toBe(true);
    expect(podeConciliarPagamento('aprovado_rh')).toBe(false);
    expect(STATUS_REINICIO_PAGAMENTO).toBe('calculado');
    expect(rotuloStatusPagamento('aprovado_rh')).toBe('Aguardando financeiro');
    expect(rotuloStatusPagamento('desconhecido')).toBe('desconhecido');
  });
});

describe('filtros, ordenação e paginação', () => {
  const pagamentos = [
    pagamento({
      id: 'p1',
      status: 'calculado',
      valor_calculado: 1250,
      data_pagamento: '2026-06-01',
      colaborador: { nome_completo: 'Carlos Eduardo Lima' },
      campanha: { nome: 'Campanha de Vendas Q3 2026' },
    }),
    pagamento({
      id: 'p2',
      status: 'pago',
      valor_calculado: 720,
      valor_aprovado: 720,
      valor_folha_real: 720,
      data_pagamento: '2026-05-20',
      status_conciliacao: 'conciliado',
      colaborador: { nome_completo: 'Ana Beatriz Souza' },
      campanha: { nome: 'Premiação de Inovação' },
    }),
    pagamento({
      id: 'p3',
      status: 'rejeitado',
      valor_calculado: 900,
      data_pagamento: '2026-06-15',
      colaborador: { nome_completo: 'William Nunes Cardoso' },
      campanha: { nome: 'Bônus por Meta de Produção' },
    }),
  ];

  const filtrar = (patch: Partial<FiltrosPagamento>) =>
    filtrarEOrdenarPagamentos(pagamentos, { ...FILTROS_PAGAMENTO_INICIAIS, ...patch });

  it('filtra por etapa do fluxo e por "fora do fluxo"', () => {
    expect(filtrar({ etapa: 'conciliado' }).map((p) => p.id)).toEqual(['p2']);
    expect(filtrar({ etapa: 'fora' }).map((p) => p.id)).toEqual(['p3']);
    expect(filtrar({ etapa: 'todas' })).toHaveLength(3);
  });

  it('filtra por campanha, status, período e busca', () => {
    expect(filtrar({ campanha: 'Premiação de Inovação' }).map((p) => p.id)).toEqual(['p2']);
    expect(filtrar({ status: 'rejeitado' }).map((p) => p.id)).toEqual(['p3']);
    expect(filtrar({ periodo: '2026-05' }).map((p) => p.id)).toEqual(['p2']);
    expect(filtrar({ busca: 'william' }).map((p) => p.id)).toEqual(['p3']);
    expect(filtrar({ busca: 'ana' }).map((p) => p.id)).toEqual(['p2']);
  });

  it('ordena por data e por valor', () => {
    expect(filtrar({ ordenacao: 'recentes' }).map((p) => p.id)).toEqual(['p3', 'p1', 'p2']);
    expect(filtrar({ ordenacao: 'antigos' }).map((p) => p.id)).toEqual(['p2', 'p1', 'p3']);
    expect(filtrar({ ordenacao: 'valor_desc' }).map((p) => p.id)).toEqual(['p1', 'p3', 'p2']);
    expect(filtrar({ ordenacao: 'valor_asc' }).map((p) => p.id)).toEqual(['p2', 'p3', 'p1']);
  });

  it('deriva as opções de período/campanha/status dos dados reais', () => {
    expect(opcoesPeriodo(pagamentos).map((o) => o.valor)).toEqual(['2026-06', '2026-05']);
    expect(rotuloPeriodo('2026-06')).toBe('Jun/2026');
    expect(opcoesCampanha(pagamentos)).toEqual([
      'Bônus por Meta de Produção',
      'Campanha de Vendas Q3 2026',
      'Premiação de Inovação',
    ]);
    expect(opcoesStatus(pagamentos).map((o) => o.valor)).toEqual(['calculado', 'pago', 'rejeitado']);
  });

  it('pagina sem devolver página vazia ou inexistente', () => {
    const segunda = paginarPagamentos(pagamentos, 2, 2);
    expect(segunda.pagina).toBe(2);
    expect(segunda.totalPaginas).toBe(2);
    expect(segunda.linhas).toHaveLength(1);
    const fora = paginarPagamentos(pagamentos, 99, 2);
    expect(fora.pagina).toBe(2);
    expect(paginarPagamentos([], 3, 10)).toEqual({ pagina: 1, totalPaginas: 1, linhas: [] });
  });
});

describe('próximas ações', () => {
  it('só cria pendência quando existe pagamento no estado correspondente', () => {
    expect(montarAcoesPagamentos([])).toEqual([]);
    expect(montarAcoesPagamentos([pagamento({ status: 'pago' })])).toEqual([]);
  });

  it('prioriza aprovação, depois divergência e depois o que aguarda conciliação', () => {
    const acoes = montarAcoesPagamentos([
      pagamento({ id: 'a', status: 'calculado', valor_calculado: 1000 }),
      pagamento({
        id: 'b',
        status: 'divergente_em_revisao',
        valor_aprovado: 1610,
        valor_folha_real: 1680,
        status_conciliacao: 'divergente',
      }),
      pagamento({ id: 'c', status: 'aprovado_financeiro', valor_aprovado: 500 }),
    ]);

    expect(acoes.map((a) => a.id)).toEqual(['aguardando-aprovacao', 'divergencias', 'enviados-folha']);
    expect(acoes[0]).toMatchObject({ destino: 'pendentes', quantidade: 1, valor: 1000 });
    expect(acoes[1]).toMatchObject({ destino: 'enviado_folha', quantidade: 1, valor: 70 });
    expect(acoes[2]).toMatchObject({ destino: 'enviado_folha', quantidade: 1, valor: 500 });
  });
});
