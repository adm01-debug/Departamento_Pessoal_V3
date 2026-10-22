import { describe, expect, it } from 'vitest';
import {
  agruparEventosAuditoria,
  contarCategoria,
  filtrarEventosAuditoria,
  inferirCategoriaAuditoria,
  intervaloPeriodo,
  janelaPaginacao,
  normalizarEventosAuditoria,
  rotuloGrupoData,
  temFiltrosAtivos,
  type FiltrosAuditoria,
} from '../premiacoes/auditoriaComum';
import type { AuditoriaHub, CampanhaHub, PagamentoHub } from '../premiacoes/premiacoesComum';

const AGORA = new Date('2026-10-07T12:00:00-03:00');
const HOJE = new Date('2026-10-07T09:04:00-03:00').toISOString();
const ONTEM = new Date('2026-10-06T21:04:00-03:00').toISOString();

const CAMPANHA: CampanhaHub = {
  id: 'camp-1',
  nome: 'Campanha de Vendas Q3 2026',
  data_inicio: '2026-07-01',
  data_fim: '2026-09-30',
  status: 'ativo',
  orcamento_estimado: 85000,
};

const PAGAMENTO: PagamentoHub = {
  id: 'pag-1',
  campanha_id: 'camp-1',
  valor_aprovado: 1250,
  status: 'aprovado_financeiro',
  status_conciliacao: 'divergente',
  colaborador: { nome_completo: 'Pedro Henrique Barbosa' },
  campanha: { nome: 'Campanha de Vendas Q3 2026' },
  historico_mudancas: [{ user: 'RH / Admin' }],
};

const AUDITORIA: AuditoriaHub[] = [
  {
    id: 'a-1',
    entidade_tipo: 'pagamento',
    entidade_id: 'pag-1',
    acao: 'alteracao',
    motivo: 'Divergência de R$ 70,00 identificada na conciliação (IRRF).',
    created_at: HOJE,
    dados_anteriores: { valor_aprovado: 400 },
    dados_novos: { valor_aprovado: 500 },
  },
  {
    id: 'a-2',
    entidade_tipo: 'campanha',
    entidade_id: 'camp-1',
    acao: 'criacao',
    motivo: 'Campanha criada com orçamento de R$ 85.000,00.',
    created_at: ONTEM,
  },
];

const FILTROS: FiltrosAuditoria = {
  busca: '',
  categoria: 'todas',
  tipo: 'todos',
  entidade: 'todas',
  usuario: 'todos',
  periodo: 'todos',
  ordem: 'recentes',
};

function eventos() {
  return normalizarEventosAuditoria(AUDITORIA, [PAGAMENTO], [CAMPANHA], { agora: AGORA });
}

describe('auditoriaComum — normalização fiel aos dados', () => {
  it('resolve valor anterior/posterior, entidade, colaborador e responsável', () => {
    const [divergencia] = eventos();
    expect(divergencia).toMatchObject({
      categoria: 'conciliacao',
      categoriaRotulo: 'Conciliação',
      valorAnterior: 400,
      valorPosterior: 500,
      valor: 500,
      entidade: {
        rotulo: 'Pagamento',
        nome: 'Pedro Henrique Barbosa',
        detalhe: 'Campanha de Vendas Q3 2026',
      },
      responsavel: { nome: 'RH / Admin' },
    });
  });

  it('lida com data/entidade/valor ausentes sem inventar informação', () => {
    const [evento] = normalizarEventosAuditoria(
      [
        {
          id: 'a-invalido',
          entidade_tipo: 'integracao',
          entidade_id: 'int-1',
          acao: 'update',
          motivo: '',
          created_at: 'data-invalida',
        },
      ],
      [],
      [],
      { agora: AGORA }
    );
    expect(evento.data).toBeNull();
    expect(evento.hora).toBe('—');
    expect(evento.valor).toBeNull();
    expect(evento.responsavel.nome).toBeNull();
    expect(evento.descricao).toBe('Sem descrição registrada.');
    expect(evento.acao).toBe('alteracao');
    expect(agruparEventosAuditoria([evento], AGORA)[0].rotulo).toBe('Data não informada');
  });

  it('não inventa valor quando não há campo nem citação monetária', () => {
    const [evento] = normalizarEventosAuditoria(
      [
        {
          id: 'a-sem-valor',
          entidade_tipo: 'regra',
          entidade_id: 'regra-1',
          acao: 'alteracao',
          motivo: 'Regra atualizada.',
          created_at: HOJE,
        },
      ],
      [],
      [],
      { agora: AGORA }
    );
    expect(evento.valor).toBeNull();
  });

  it('distingue aprovação, campanha, regra e conciliação', () => {
    expect(
      inferirCategoriaAuditoria({ entidadeTipo: 'pagamento', acao: 'aprovacao', motivo: '' })
    ).toBe('aprovacoes');
    expect(inferirCategoriaAuditoria({ entidadeTipo: 'campanha', acao: 'criacao', motivo: '' })).toBe(
      'campanhas'
    );
    expect(inferirCategoriaAuditoria({ entidadeTipo: 'regra', acao: 'criacao', motivo: '' })).toBe(
      'regras'
    );
    expect(
      inferirCategoriaAuditoria({
        entidadeTipo: 'pagamento',
        acao: 'alteracao',
        motivo: 'Divergência de R$ 70,00',
      })
    ).toBe('conciliacao');
  });
});

describe('auditoriaComum — agrupamento e filtros', () => {
  it('agrupa por data no fuso da aplicação e usa Hoje/Ontem', () => {
    const grupos = agruparEventosAuditoria(eventos(), AGORA);
    expect(grupos).toHaveLength(2);
    expect(grupos[0].rotulo).toMatch(/^Hoje · 7 de outubro de 2026$/);
    expect(grupos[1].rotulo).toMatch(/^Ontem · 6 de outubro de 2026$/);
    expect(rotuloGrupoData(null, AGORA)).toBe('Data não informada');
  });

  it('filtra busca, categoria, tipo, entidade e usuário', () => {
    const base = eventos();
    expect(filtrarEventosAuditoria(base, { ...FILTROS, categoria: 'campanhas' }, AGORA)).toHaveLength(1);
    expect(filtrarEventosAuditoria(base, { ...FILTROS, busca: 'IRRF' }, AGORA)).toHaveLength(1);
    expect(filtrarEventosAuditoria(base, { ...FILTROS, busca: 'inexistente' }, AGORA)).toHaveLength(0);
    expect(filtrarEventosAuditoria(base, { ...FILTROS, entidade: 'campanha' }, AGORA)).toHaveLength(1);
    expect(filtrarEventosAuditoria(base, { ...FILTROS, usuario: 'RH / Admin' }, AGORA)).toHaveLength(1);
    expect(contarCategoria(base, 'todas')).toBe(2);
  });

  it('ordena do mais recente para o mais antigo e respeita o período', () => {
    const base = eventos();
    const recentes = filtrarEventosAuditoria(base, FILTROS, AGORA);
    expect(recentes[0].id).toBe('a-1');
    const antigos = filtrarEventosAuditoria(base, { ...FILTROS, ordem: 'antigos' }, AGORA);
    expect(antigos[0].id).toBe('a-2');
    expect(intervaloPeriodo(base, 'todos', AGORA).inicio?.toISOString()).toBe(
      new Date(ONTEM).toISOString()
    );
  });

  it('deriva o destaque de limpar filtros de qualquer filtro real', () => {
    expect(temFiltrosAtivos(FILTROS)).toBe(false);
    expect(temFiltrosAtivos({ ...FILTROS, busca: 'IRRF' })).toBe(true);
    expect(temFiltrosAtivos({ ...FILTROS, categoria: 'campanhas' })).toBe(true);
    expect(temFiltrosAtivos({ ...FILTROS, tipo: 'criacao' })).toBe(true);
    expect(temFiltrosAtivos({ ...FILTROS, entidade: 'campanha' })).toBe(true);
    expect(temFiltrosAtivos({ ...FILTROS, usuario: 'RH / Admin' })).toBe(true);
    expect(temFiltrosAtivos({ ...FILTROS, periodo: '30d' })).toBe(true);
    expect(temFiltrosAtivos({ ...FILTROS, ordem: 'antigos' })).toBe(true);
    expect(temFiltrosAtivos({ ...FILTROS, busca: '   ' })).toBe(false);
  });

  it('gera uma janela de paginação sem páginas inexistentes', () => {
    expect(janelaPaginacao(1, 1)).toEqual([1]);
    expect(janelaPaginacao(3, 10)).toEqual([1, 2, 3, 4, '…', 10]);
  });
});
