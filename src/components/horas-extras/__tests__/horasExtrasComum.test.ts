import { describe, it, expect } from 'vitest';
import {
  CLASSE_BOTAO_SECUNDARIO_INFO,
  CLASSE_CAMPO_BUSCA,
  CLASSE_CONTROLE_FILTRO,
  CLASSE_CONTROLE_SECAO,
  CLASSE_SELECT_PERIODO,
  FILTROS_PADRAO,
  MEDIDA_FILTRO_DEPARTAMENTO,
  MEDIDA_FILTRO_ORDEM,
  MEDIDA_FILTRO_STATUS,
  MEDIDA_SELECT_PERIODO,
  STATUS_FILTRO_OPCOES,
  classeBotaoLimpar,
  combinaBusca,
  dataDaRealizacao,
  dataDaSolicitacao,
  departamentoDoColaborador,
  departamentosDisponiveis,
  descricaoTaxaAprovacao,
  filtrarSolicitacoes,
  formatarHoras,
  nomeDoColaborador,
  recortarPorPeriodo,
  resolverPeriodo,
  resumoDecisoes,
  rotuloOpcaoPeriodo,
  rotuloPeriodo,
  rotuloStatus,
  rotuloTaxaAprovacao,
  seloStatus,
  somarHoras,
  statusDe,
  temFiltroAtivo,
  type FiltrosHistorico,
  type SolicitacaoHoraExtra,
} from '../horasExtrasComum';

/** Linha mínima da tela; cada teste sobrescreve só o que importa. */
function linha(over: Partial<SolicitacaoHoraExtra> = {}): SolicitacaoHoraExtra {
  return {
    id: 'sol-1',
    data: '2026-10-20',
    horas_solicitadas: 2.5,
    motivo: 'Fechamento de mês',
    status: 'pendente',
    created_at: '2026-10-18T12:00:00.000Z',
    colaborador: { nome_completo: 'Ana Souza', departamento: 'Financeiro' },
    ...over,
  };
}

/** Data fixa de referência: 30/10/2026 (sexta). */
const HOJE = new Date(2026, 9, 30);

describe('horasExtrasComum — horas', () => {
  it('formata horas decimais como h/min (2.5 → 2h30)', () => {
    expect(formatarHoras(2.5)).toBe('2h30');
    expect(formatarHoras(1.25)).toBe('1h15');
    expect(formatarHoras(4)).toBe('4h00');
    expect(formatarHoras(0)).toBe('0h00');
  });

  it('aceita string com vírgula (o formulário digita 3,5)', () => {
    expect(formatarHoras('3,5')).toBe('3h30');
    expect(formatarHoras('2')).toBe('2h00');
  });

  it('devolve travessão para valor ausente ou inválido', () => {
    expect(formatarHoras(null)).toBe('—');
    expect(formatarHoras(undefined)).toBe('—');
    expect(formatarHoras('')).toBe('—');
    expect(formatarHoras(Number.NaN)).toBe('—');
  });

  it('soma as horas ignorando valores inválidos', () => {
    const itens = [
      linha({ id: 'a', horas_solicitadas: 2.5 }),
      linha({ id: 'b', horas_solicitadas: '1' }),
      linha({ id: 'c', horas_solicitadas: null }),
      linha({ id: 'd', horas_solicitadas: undefined }),
    ];
    expect(somarHoras(itens)).toBe(3.5);
    expect(somarHoras([])).toBe(0);
  });
});

describe('horasExtrasComum — status', () => {
  it('normaliza status desconhecido para pendente', () => {
    expect(statusDe('aprovada')).toBe('aprovada');
    expect(statusDe('rejeitada')).toBe('rejeitada');
    expect(statusDe('pendente')).toBe('pendente');
    expect(statusDe(null)).toBe('pendente');
    expect(statusDe(undefined)).toBe('pendente');
    expect(statusDe('cancelada')).toBe('pendente');
  });

  it('mantém os rótulos e pinta o veredito como pill translúcido', () => {
    expect(rotuloStatus('pendente')).toBe('Pendente');
    expect(rotuloStatus('aprovada')).toBe('Aprovada');
    expect(rotuloStatus('rejeitada')).toBe('Rejeitada');

    // O veredito é VEREDITO: texto na cor vibrante, fundo com alfa e borda
    // sutil. Nada de fundo sólido (o lime da marca é cor de AÇÃO).
    expect(seloStatus('aprovada')).toContain('text-status-aprovada');
    expect(seloStatus('aprovada')).toContain('bg-status-aprovada/10');
    expect(seloStatus('rejeitada')).toContain('text-status-rejeitada');
    expect(seloStatus('rejeitada')).toContain('bg-status-rejeitada/12');
    // Status desconhecido cai em pendente, como `statusDe`.
    expect(seloStatus('cancelada')).toBe(seloStatus('pendente'));
  });

  it('pinta "Pendente" de ÂMBAR (atenção), nunca de cinza nem sólido', () => {
    const pendente = seloStatus('pendente');

    // `--warning` é a cor de atenção do sistema: `hsl(38 92% 50%)` = #F59E0B no
    // tema claro e `hsl(38 92% 52%)` = #F5A314 no escuro (o degrau que
    // `--success`/`--info` também dão para compensar o navy).
    expect(pendente).toContain('text-warning');
    // Mesma receita dos outros dois vereditos: fundo /12 e borda /30.
    expect(pendente).toContain('bg-warning/12');
    expect(pendente).toContain('border-warning/30');
    // Nada de fundo sólido e nada do cinza antigo (que lia como texto apagado).
    expect(pendente).not.toContain('bg-secondary');
    expect(pendente).not.toContain('text-secondary-foreground');
    // Lookahead em vez de alternativas: `bg-warning` só é sólido quando NÃO é
    // seguido de `/` (a opacidade do fundo) — sem misturar `$` com outro ramo.
    expect(pendente).not.toMatch(/\bbg-warning(?![/\w-])/);
    // O peso não muda: `font-semibold` alargaria o pill e mexeria no respiro
    // do cabeçalho do cartão (o pedido era só de cor).
    expect(pendente).toContain('font-medium');
  });
});

describe('horasExtrasComum — vínculo e datas', () => {
  it('lê o nome e o departamento do vínculo embutido', () => {
    expect(nomeDoColaborador(linha())).toBe('Ana Souza');
    expect(departamentoDoColaborador(linha())).toBe('Financeiro');
  });

  it('cai em textos neutros quando o vínculo não veio na consulta', () => {
    const semVinculo = linha({ colaborador: null });
    expect(nomeDoColaborador(semVinculo)).toBe('Colaborador não informado');
    expect(departamentoDoColaborador(semVinculo)).toBeNull();
    expect(departamentoDoColaborador(linha({ colaborador: { departamento: '   ' } }))).toBeNull();
  });

  it('mostra realização e solicitação em dd/mm/aaaa (sem shift de fuso)', () => {
    expect(dataDaRealizacao(linha())).toBe('20/10/2026');
    expect(dataDaSolicitacao(linha())).toBe('18/10/2026');
    expect(dataDaRealizacao(linha({ data: null }))).toBe('—');
    expect(dataDaSolicitacao(linha({ created_at: null }))).toBe('—');
  });
});

describe('horasExtrasComum — período', () => {
  it('resolve os presets em intervalos fechados (referência 30/10/2026)', () => {
    expect(resolverPeriodo('todos', HOJE)).toBeNull();

    expect(resolverPeriodo('7d', HOJE)).toEqual({ de: '2026-10-24', ate: '2026-10-30' });
    expect(resolverPeriodo('30d', HOJE)).toEqual({ de: '2026-10-01', ate: '2026-10-30' });
    expect(resolverPeriodo('mesAtual', HOJE)).toEqual({ de: '2026-10-01', ate: '2026-10-31' });
    expect(resolverPeriodo('mesAnterior', HOJE)).toEqual({ de: '2026-09-01', ate: '2026-09-30' });
  });

  it('rotula o período pela faixa de datas (ou "Todo o período")', () => {
    expect(rotuloPeriodo('mesAtual', HOJE)).toBe('01/10/2026 – 31/10/2026');
    expect(rotuloPeriodo('mesAnterior', HOJE)).toBe('01/09/2026 – 30/09/2026');
    expect(rotuloPeriodo('todos', HOJE)).toBe('Todo o período');
  });

  it('recorta pela data de realização, com fallback para created_at', () => {
    const dentro = linha({ id: 'dentro', data: '2026-10-05' });
    const fora = linha({ id: 'fora', data: '2026-09-15' });
    const semData = linha({ id: 'sem-data', data: null, created_at: '2026-10-10T12:00:00.000Z' });
    const semNada = linha({ id: 'sem-nada', data: null, created_at: null });

    const recorte = recortarPorPeriodo([dentro, fora, semData, semNada], 'mesAtual', HOJE);

    expect(recorte.map((s) => s.id)).toEqual(['dentro', 'sem-data']);
  });

  it('inclui as duas pontas do intervalo', () => {
    const inicio = linha({ id: 'inicio', data: '2026-10-01' });
    const fim = linha({ id: 'fim', data: '2026-10-31' });
    const antes = linha({ id: 'antes', data: '2026-09-30' });
    const depois = linha({ id: 'depois', data: '2026-11-01' });

    const recorte = recortarPorPeriodo([antes, inicio, fim, depois], 'mesAtual', HOJE);

    expect(recorte.map((s) => s.id)).toEqual(['inicio', 'fim']);
  });

  it('sem recorte devolve tudo, mas em uma NOVA lista (não muta a origem)', () => {
    const itens = [linha({ id: 'a' }), linha({ id: 'b' })];
    const recorte = recortarPorPeriodo(itens, 'todos', HOJE);

    expect(recorte).toHaveLength(2);
    expect(recorte).not.toBe(itens);
  });
});

describe('horasExtrasComum — busca textual', () => {
  it('encontra por nome, departamento, motivo e rótulo de status', () => {
    const s = linha({ status: 'aprovada' });

    expect(combinaBusca(s, 'ana')).toBe(true); // nome, insensível a caixa
    expect(combinaBusca(s, 'FINANCEIRO')).toBe(true);
    expect(combinaBusca(s, 'fechamento')).toBe(true);
    expect(combinaBusca(s, 'aprovada')).toBe(true);
  });

  it('termo vazio combina com tudo; termo inexistente não combina', () => {
    const s = linha();

    expect(combinaBusca(s, '')).toBe(true);
    expect(combinaBusca(s, '   ')).toBe(true);
    expect(combinaBusca(s, 'colaborador-inexistente')).toBe(false);
  });

  it('não quebra quando a linha não tem motivo nem vínculo', () => {
    const s = linha({ motivo: null, colaborador: null });

    expect(combinaBusca(s, 'colaborador não informado')).toBe(true);
    expect(combinaBusca(s, 'xyz')).toBe(false);
    expect(rotuloStatus(s.status)).toBe('Pendente');
  });
});

describe('horasExtrasComum — filtros da lista', () => {
  const pendente = linha({ id: 'p', status: 'pendente', created_at: '2026-10-01T12:00:00.000Z' });
  const aprovada = linha({
    id: 'a',
    status: 'aprovada',
    horas_solicitadas: 4,
    created_at: '2026-10-05T12:00:00.000Z',
    colaborador: { nome_completo: 'Bruno Lima', departamento: 'Operações' },
  });
  const rejeitada = linha({
    id: 'r',
    status: 'rejeitada',
    horas_solicitadas: 1,
    created_at: '2026-10-03T12:00:00.000Z',
    colaborador: { nome_completo: 'Carla Dias', departamento: 'Financeiro' },
  });
  const itens = [pendente, aprovada, rejeitada];

  const comFiltro = (over: Partial<FiltrosHistorico> = {}): FiltrosHistorico => ({
    ...FILTROS_PADRAO,
    ...over,
  });

  it('o padrão esconde as pendentes; "todas" devolve o conjunto completo na MESMA lista', () => {
    expect(filtrarSolicitacoes(itens, FILTROS_PADRAO).map((s) => s.id)).toEqual(['a', 'r']);
    expect(filtrarSolicitacoes(itens, comFiltro({ status: 'todas' })).map((s) => s.id)).toEqual(['a', 'r', 'p']);
  });

  it('as cinco opções de status estão no menu, sem perder o padrão da tela', () => {
    expect(STATUS_FILTRO_OPCOES.map((o) => o.value)).toEqual([
      'todas',
      'pendente',
      'aprovada',
      'rejeitada',
      'aprovadasRejeitadas',
    ]);
    // O padrão continua sendo "aprovadas e rejeitadas" e ele é uma das opções.
    expect(FILTROS_PADRAO.status).toBe('aprovadasRejeitadas');
    expect(STATUS_FILTRO_OPCOES.some((o) => o.value === FILTROS_PADRAO.status)).toBe(true);
  });

  it('filtra por status e por departamento', () => {
    expect(filtrarSolicitacoes(itens, comFiltro({ status: 'pendente' })).map((s) => s.id)).toEqual(['p']);
    expect(filtrarSolicitacoes(itens, comFiltro({ departamento: 'Financeiro' })).map((s) => s.id)).toEqual(['r']);
    expect(
      filtrarSolicitacoes(itens, comFiltro({ departamento: 'Operações', status: 'aprovada' })).map((s) => s.id)
    ).toEqual(['a']);
  });

  it('combina busca textual com os demais filtros', () => {
    expect(filtrarSolicitacoes(itens, comFiltro({ busca: 'bruno' })).map((s) => s.id)).toEqual(['a']);
    expect(filtrarSolicitacoes(itens, comFiltro({ busca: 'bruno', status: 'rejeitada' }))).toEqual([]);
  });

  it('ordena por data, nome e horas sem alterar o array recebido', () => {
    expect(filtrarSolicitacoes(itens, comFiltro({ ordem: 'antigas' })).map((s) => s.id)).toEqual(['r', 'a']);
    expect(filtrarSolicitacoes(itens, comFiltro({ ordem: 'nome', status: 'todas' })).map((s) => s.id)).toEqual([
      'p',
      'a',
      'r',
    ]);
    expect(filtrarSolicitacoes(itens, comFiltro({ ordem: 'horas' })).map((s) => s.id)).toEqual(['a', 'r']);
    expect(itens.map((s) => s.id)).toEqual(['p', 'a', 'r']);
  });

  it('ordenação NÃO conta como filtro ativo (mas busca, departamento e status contam)', () => {
    expect(temFiltroAtivo(FILTROS_PADRAO)).toBe(false);
    expect(temFiltroAtivo(comFiltro({ ordem: 'horas' }))).toBe(false);
    expect(temFiltroAtivo(comFiltro({ busca: '   ' }))).toBe(false);
    expect(temFiltroAtivo(comFiltro({ busca: 'ana' }))).toBe(true);
    expect(temFiltroAtivo(comFiltro({ departamento: 'Financeiro' }))).toBe(true);
    expect(temFiltroAtivo(comFiltro({ status: 'todas' }))).toBe(true);
  });

  it('o "Limpar" só recebe o lime quando há filtro ativo', () => {
    expect(classeBotaoLimpar(FILTROS_PADRAO)).not.toContain('text-primary');
    expect(classeBotaoLimpar(comFiltro({ ordem: 'nome' }))).not.toContain('text-primary');
    expect(classeBotaoLimpar(comFiltro({ busca: 'ana' }))).toContain('text-primary');
  });

  it('lista os departamentos presentes, sem vazio e em ordem alfabética', () => {
    expect(departamentosDisponiveis([...itens, linha({ colaborador: { departamento: null } })])).toEqual([
      'Financeiro',
      'Operações',
    ]);
  });
});

/**
 * A barra de filtros foi medida NO NAVEGADOR (Playwright, fonte do sistema):
 * cada select gastava 87 px com ícone + respiro + seta e o valor cedia ao
 * `truncate` porque o grid distribuía colunas fracionárias iguais. Estes testes
 * travam o CONTRATO da correção — régua dos formulários mantida e largura vinda
 * do conteúdo — sem repetir a classe inteira (que muda de detalhe visual).
 */
describe('horasExtrasComum — medidas da barra de filtros', () => {
  /** Piso/teto em px de CLASSE declarados no token (0 quando o token não tem). */
  const pxDe = (token: string, tipo: 'min-w' | 'max-w') => {
    const achado = token.match(new RegExp(`${tipo}-\\[(\\d+)px\\]`));
    return achado ? Number(achado[1]) : 0;
  };

  it('os controles mantêm a régua dos formulários (38 px de altura, raio 10)', () => {
    for (const classe of [CLASSE_CONTROLE_FILTRO, CLASSE_CAMPO_BUSCA]) {
      expect(classe).toContain('h-[38px]');
      expect(classe).toContain('rounded-[10px]');
    }
  });

  it('o select é dimensionado pelo CONTEÚDO, nunca por largura fixa', () => {
    expect(CLASSE_CONTROLE_FILTRO).toContain('w-full'); // empilhado no mobile
    expect(CLASSE_CONTROLE_FILTRO).toContain('sm:w-auto'); // largura natural no desktop
    expect(CLASSE_CONTROLE_FILTRO).toContain('sm:grow'); // divide a sobra com os irmãos
    expect(CLASSE_CONTROLE_FILTRO).not.toMatch(/(^|\s)w-\[/); // nenhuma largura fixa
    expect(CLASSE_CONTROLE_FILTRO).toContain('[&>svg]:shrink-0'); // a seta não é esmagada
  });

  it('cada filtro tem piso; só os de conteúdo conhecido têm teto', () => {
    // 194 px de classe = 242,5 renderizados ≥ 237 medidos para o maior status.
    expect(pxDe(MEDIDA_FILTRO_STATUS, 'min-w')).toBeGreaterThanOrEqual(194);
    // 170 px de classe = 212,5 renderizados ≥ 208 medidos para "Colaborador (A–Z)".
    expect(pxDe(MEDIDA_FILTRO_ORDEM, 'min-w')).toBeGreaterThanOrEqual(170);
    // O status é o que precisa de mais espaço (era ele o corte do padrão).
    expect(pxDe(MEDIDA_FILTRO_STATUS, 'min-w')).toBeGreaterThan(pxDe(MEDIDA_FILTRO_ORDEM, 'min-w'));
    // Teto só nos menus finitos — e sempre acima do próprio piso.
    expect(pxDe(MEDIDA_FILTRO_STATUS, 'max-w')).toBeGreaterThan(pxDe(MEDIDA_FILTRO_STATUS, 'min-w'));
    expect(pxDe(MEDIDA_FILTRO_ORDEM, 'max-w')).toBeGreaterThan(pxDe(MEDIDA_FILTRO_ORDEM, 'min-w'));
    // Departamento vem do banco: cresce até caber, sem teto que o corte.
    expect(pxDe(MEDIDA_FILTRO_DEPARTAMENTO, 'min-w')).toBeGreaterThan(0);
    expect(pxDe(MEDIDA_FILTRO_DEPARTAMENTO, 'max-w')).toBe(0);
  });
});

/**
 * KPI "Taxa de aprovação" — a regra que a tela usa precisa ser a MESMA do
 * teste: pendente é fila (não entra no denominador), aprovada/rejeitada é
 * decisão, e sem nenhuma decisão não existe taxa (nada de `0%` inventado).
 */
describe('resumoDecisoes — taxa de aprovação', () => {
  it('divide aprovadas pelo total DECIDIDO (pendente não conta)', () => {
    const r = resumoDecisoes([
      linha({ id: 'a1', status: 'aprovada' }),
      linha({ id: 'a2', status: 'aprovada' }),
      linha({ id: 'a3', status: 'aprovada' }),
      linha({ id: 'a4', status: 'aprovada' }),
      linha({ id: 'a5', status: 'aprovada' }),
      linha({ id: 'a6', status: 'aprovada' }),
      linha({ id: 'r1', status: 'rejeitada' }),
      linha({ id: 'p1', status: 'pendente' }),
      linha({ id: 'p2', status: 'pendente' }),
    ]);

    expect(r).toEqual({ aprovadas: 6, rejeitadas: 1, decididas: 7, taxa: 86 });
  });

  it('arredonda a porcentagem e devolve `null` sem decisão', () => {
    expect(resumoDecisoes([linha({ status: 'aprovada' }), linha({ id: 'b', status: 'rejeitada' })]).taxa).toBe(50);
    // 2 de 3 = 66,67 → 67
    expect(
      resumoDecisoes([
        linha({ id: 'a', status: 'aprovada' }),
        linha({ id: 'b', status: 'aprovada' }),
        linha({ id: 'c', status: 'rejeitada' }),
      ]).taxa
    ).toBe(67);

    const soPendentes = resumoDecisoes([linha(), linha({ id: 'sol-2' })]);
    expect(soPendentes).toEqual({ aprovadas: 0, rejeitadas: 0, decididas: 0, taxa: null });
    expect(resumoDecisoes([]).taxa).toBeNull();
  });

  it('formata o valor do card: porcentagem inteira ou travessão', () => {
    expect(rotuloTaxaAprovacao(86)).toBe('86%');
    expect(rotuloTaxaAprovacao(100)).toBe('100%');
    expect(rotuloTaxaAprovacao(0)).toBe('0%');
    expect(rotuloTaxaAprovacao(null)).toBe('—');
  });

  it('descreve "X de Y" e troca a frase quando não houve decisão', () => {
    expect(descricaoTaxaAprovacao({ aprovadas: 6, rejeitadas: 1, decididas: 7, taxa: 86 })).toBe(
      '6 de 7 solicitações decididas'
    );
    expect(descricaoTaxaAprovacao({ aprovadas: 1, rejeitadas: 0, decididas: 1, taxa: 100 })).toBe(
      '1 de 1 solicitação decidida'
    );
    expect(descricaoTaxaAprovacao({ aprovadas: 0, rejeitadas: 0, decididas: 0, taxa: null })).toBe(
      'Nenhuma decisão no período'
    );
  });

  it('o rótulo do preset é o do menu (e nunca uma data solta)', () => {
    expect(rotuloOpcaoPeriodo('todos')).toBe('Todo o período');
    expect(rotuloOpcaoPeriodo('30d')).toBe('Últimos 30 dias');
    expect(rotuloOpcaoPeriodo('mesAtual')).toBe('Este mês');
  });
});

/**
 * Controles do cabeçalho da seção "Aprovações pendentes": o filtro de período
 * saiu da faixa de KPIs e divide a linha com o "Ver todas (N)". Ambos precisam
 * da MESMA régua — altura igual, respiro e raio iguais — senão um fica "mais
 * alto" que o outro na mesma faixa.
 */
describe('horasExtrasComum — controles do cabeçalho da seção', () => {
  it('período e "Ver todas" herdam a mesma régua (altura, respiro, raio)', () => {
    for (const classe of [CLASSE_CONTROLE_SECAO, CLASSE_SELECT_PERIODO, CLASSE_BOTAO_SECUNDARIO_INFO]) {
      expect(classe).toContain('h-[30px]'); // 37,5 px renderizados
      expect(classe).toContain('px-[11px]'); // 13,75 px renderizados
      expect(classe).toContain('rounded-[9px]');
      expect(classe).toContain('text-[11px]'); // 13,75 px — a fonte dos filtros
    }
  });

  it('o período é dimensionado pelo conteúdo, com piso para o rótulo não pular', () => {
    expect(CLASSE_SELECT_PERIODO).toContain('w-auto');
    expect(CLASSE_SELECT_PERIODO).not.toMatch(/(^|\s)h-9(\s|$)/); // vence o `h-9` do trigger
    const piso = Number(MEDIDA_SELECT_PERIODO.match(/min-w-\[(\d+)px\]/)?.[1] ?? 0);
    expect(piso).toBeGreaterThanOrEqual(132); // 132 × 1,25 = 165 px renderizados
    expect(MEDIDA_SELECT_PERIODO).not.toContain('max-w'); // rótulo curto: nunca precisa cortar
  });

  it('o período usa superfície neutra — lime fica para ação/estado ativo', () => {
    expect(CLASSE_SELECT_PERIODO).toContain('bg-secondary/40');
    expect(CLASSE_SELECT_PERIODO).not.toContain('primary/10');
    expect(CLASSE_SELECT_PERIODO).not.toContain('bg-primary');
  });
});
