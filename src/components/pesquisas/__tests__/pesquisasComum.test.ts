import { describe, expect, it } from 'vitest';
import {
  adesaoDe,
  calcularMetricas,
  filtrarPesquisas,
  formatarAtualizacao,
  formatarPeriodo,
  ordenarPesquisas,
  TEMAS_STATUS,
  temaStatus,
  type FiltrosPesquisas,
  type PesquisaListada,
} from '../pesquisasComum';

/**
 * Trava a INTELIGÊNCIA da tela de Pesquisas (nada de snapshot de JSX): são as
 * funções puras de `pesquisasComum` que decidem o que cada cartão mostra —
 * período em pt-BR, adesão, indicadores, filtros e ordenação.
 *
 * As linhas abaixo são as mesmas da vitrine (`src/mocks/pesquisasClimaMock.ts`),
 * no formato mínimo lido pela tela. Se o mock mudar, este arquivo acompanha —
 * de propósito: os números da referência aprovada ficam registrados aqui.
 */
const PESQUISAS: PesquisaListada[] = [
  {
    id: '1',
    titulo: 'Pesquisa de Clima Organizacional Q3 2026',
    descricao: 'Avaliação do clima, engajamento e bem-estar dos colaboradores.',
    tipo: 'clima',
    status: 'ativa',
    anonima: true,
    data_inicio: '2026-07-01',
    data_fim: '2026-07-31',
    created_at: '2026-06-25T12:00:00Z',
    updated_at: '2026-07-10T12:00:00Z',
    total_convidados: 215,
    total_respostas: 154,
    enps: null,
  },
  {
    id: '2',
    titulo: 'eNPS Trimestral — Colaboradores',
    descricao: 'Mede a probabilidade de recomendação da empresa como local de trabalho.',
    tipo: 'enps',
    status: 'ativa',
    anonima: true,
    data_inicio: '2026-09-01',
    data_fim: '2026-09-30',
    created_at: '2026-08-28T12:00:00Z',
    updated_at: '2026-09-05T12:00:00Z',
    total_convidados: 200,
    total_respostas: 96,
    enps: 42,
  },
  {
    id: '3',
    titulo: 'Satisfação com Benefícios 2026',
    descricao: 'Percepção sobre o pacote de benefícios oferecido pela empresa.',
    tipo: 'satisfacao',
    status: 'encerrada',
    anonima: false,
    data_inicio: '2026-05-01',
    data_fim: '2026-05-20',
    created_at: '2026-04-25T12:00:00Z',
    updated_at: '2026-05-20T12:00:00Z',
    total_convidados: 200,
    total_respostas: 182,
    enps: null,
  },
  {
    id: '4',
    titulo: 'Onboarding — Feedback de Novos Colaboradores',
    descricao: 'Avaliação da experiência de integração dos últimos 3 meses.',
    tipo: 'custom',
    status: 'rascunho',
    anonima: true,
    data_inicio: null,
    data_fim: null,
    created_at: '2026-06-20T12:00:00Z',
    updated_at: '2026-06-28T12:00:00Z',
    total_convidados: null,
    total_respostas: null,
    enps: null,
  },
  {
    id: '5',
    titulo: 'Clima — Liderança e Comunicação',
    descricao: 'Avaliação específica dos líderes e dos canais de comunicação interna.',
    tipo: 'clima',
    status: 'rascunho',
    anonima: false,
    data_inicio: null,
    data_fim: null,
    created_at: '2026-06-10T12:00:00Z',
    updated_at: '2026-06-15T12:00:00Z',
    total_convidados: null,
    total_respostas: null,
    enps: null,
  },
];

const FILTROS_BASE: FiltrosPesquisas = {
  aba: 'todas',
  tipo: 'todos',
  status: 'todos',
  periodo: 'qualquer',
  busca: '',
  ordenacao: 'recentes',
};

const HOJE = new Date('2026-10-29T12:00:00');

describe('pesquisasComum · período e atualização em pt-BR', () => {
  it('formata o período no padrão da referência', () => {
    expect(formatarPeriodo('2026-07-01', '2026-07-31')).toBe('01 de jul. de 2026 → 31 de jul. de 2026');
  });

  it('usa "Início não definido" quando a pesquisa ainda não tem período', () => {
    expect(formatarPeriodo(null, null)).toBe('Início não definido');
  });

  it('formata updated_at (timestamptz) sem recuar um dia', () => {
    expect(formatarAtualizacao('2026-07-10T12:00:00Z')).toBe('Atualizado em 10 de jul. de 2026');
  });
});

describe('pesquisasComum · adesão', () => {
  it('calcula o percentual arredondado de respostas sobre convidados', () => {
    expect(adesaoDe(PESQUISAS[0])).toEqual({ respostas: 154, convidados: 215, percentual: 72, disponivel: true });
    expect(adesaoDe(PESQUISAS[1]).percentual).toBe(48);
    expect(adesaoDe(PESQUISAS[2]).percentual).toBe(91);
  });

  it('não inventa percentual quando o registro não tem agregados', () => {
    expect(adesaoDe(PESQUISAS[3])).toEqual({ respostas: 0, convidados: 0, percentual: 0, disponivel: false });
  });
});

describe('pesquisasComum · indicadores', () => {
  it('conta por status e calcula a participação média PONDERADA', () => {
    const metricas = calcularMetricas(PESQUISAS);
    expect(metricas).toMatchObject({ total: 5, ativas: 2, encerradas: 1, rascunhos: 2 });
    // (154 + 96 + 182) ÷ (215 + 200 + 200) = 70,2% → 70
    expect(metricas.participacaoMedia).toBe(70);
  });

  it('usa o eNPS da pesquisa de eNPS mais recente', () => {
    expect(calcularMetricas(PESQUISAS).enps).toBe(42);
  });

  it('devolve null (indicador "—") quando não há dado para o indicador', () => {
    const semDados = PESQUISAS.map((pesquisa) => ({ ...pesquisa, enps: null, total_convidados: null }));
    const metricas = calcularMetricas(semDados);
    expect(metricas.enps).toBeNull();
    expect(metricas.participacaoMedia).toBeNull();
  });
});

describe('pesquisasComum · filtros', () => {
  it('a aba recorta por status', () => {
    expect(filtrarPesquisas(PESQUISAS, { ...FILTROS_BASE, aba: 'rascunho' }, HOJE)).toHaveLength(2);
    expect(filtrarPesquisas(PESQUISAS, { ...FILTROS_BASE, aba: 'encerrada' }, HOJE).map((p) => p.id)).toEqual(['3']);
  });

  it('o dropdown de tipo combina com a aba', () => {
    expect(filtrarPesquisas(PESQUISAS, { ...FILTROS_BASE, tipo: 'clima' }, HOJE)).toHaveLength(2);
    expect(filtrarPesquisas(PESQUISAS, { ...FILTROS_BASE, aba: 'ativa', tipo: 'clima' }, HOJE)).toHaveLength(1);
  });

  it('a busca ignora acento e caixa', () => {
    expect(filtrarPesquisas(PESQUISAS, { ...FILTROS_BASE, busca: 'beneficios' }, HOJE).map((p) => p.id)).toEqual(['3']);
  });

  it('o período usa a data de referência e descarta rascunho sem data', () => {
    expect(filtrarPesquisas(PESQUISAS, { ...FILTROS_BASE, periodo: '30d' }, HOJE).map((p) => p.id)).toEqual(['2']);
    expect(filtrarPesquisas(PESQUISAS, { ...FILTROS_BASE, periodo: 'qualquer' }, HOJE)).toHaveLength(5);
  });
});

describe('pesquisasComum · ordenação', () => {
  it('"mais recentes" ordena pela data de referência decrescente', () => {
    expect(ordenarPesquisas(PESQUISAS, 'recentes').map((p) => p.id)).toEqual(['2', '1', '4', '5', '3']);
  });

  it('"maior adesão" usa o percentual calculado', () => {
    expect(ordenarPesquisas(PESQUISAS, 'adesao')[0].id).toBe('3');
  });

  it('"título (A-Z)" respeita o alfabeto português', () => {
    expect(ordenarPesquisas(PESQUISAS, 'titulo')[0].titulo).toBe('Clima — Liderança e Comunicação');
  });
});

/**
 * TAG DE STATUS DO CARTÃO — cores.
 *
 * `ativa` (verde `--success`) e `rascunho` (âmbar `--warning`) continuam como
 * estavam; `encerrada` saiu do cinza (`bg-muted`/`text-muted-foreground`, que
 * lia como "desabilitado") e passou a usar o AZUL do sistema (`--info`) — a
 * MESMA família do chip "Encerradas" da barra de abas (`PALETAS_CHIP.blue`, em
 * `chipFiltroComum`). O desenho é o mesmo das outras duas: fundo em tint de
 * 10%, borda em 35% e texto na cor cheia; a bolinha, sólida, acompanha o texto.
 */
describe('pesquisasComum · cores da tag de status do cartão', () => {
  it('"Encerrada" passou a usar o azul de informação (`--info`)', () => {
    expect(TEMAS_STATUS.encerrada.tag).toBe('border-info/35 bg-info/10 text-info');
    expect(TEMAS_STATUS.encerrada.ponto).toBe('bg-info');
  });

  it('"Encerrada" não voltou ao cinza de "desabilitado"', () => {
    const { tag, ponto } = TEMAS_STATUS.encerrada;

    expect(tag).not.toContain('text-muted-foreground');
    expect(tag).not.toContain('bg-muted');
    expect(tag).not.toContain('border-border');
    expect(ponto).not.toContain('muted');
  });

  it('"Ativa" (verde) e "Rascunho" (âmbar) ficaram intactas', () => {
    expect(TEMAS_STATUS.ativa).toEqual({
      rotulo: 'Ativa',
      tag: 'border-success/35 bg-success/10 text-success',
      ponto: 'bg-success',
    });
    expect(TEMAS_STATUS.rascunho).toEqual({
      rotulo: 'Rascunho',
      tag: 'border-warning/35 bg-warning/10 text-warning',
      ponto: 'bg-warning',
    });
  });

  it('pílula e bolinha ficam sempre na MESMA família de cor', () => {
    for (const tema of Object.values(TEMAS_STATUS)) {
      const cor = tema.ponto.replace('bg-', '');
      expect(tema.tag).toContain(`text-${cor}`);
      expect(tema.tag).toContain(`bg-${cor}/10`);
    }
  });

  it('status desconhecido continua caindo em "Rascunho"', () => {
    expect(temaStatus('arquivada')).toBe(TEMAS_STATUS.rascunho);
  });
});
