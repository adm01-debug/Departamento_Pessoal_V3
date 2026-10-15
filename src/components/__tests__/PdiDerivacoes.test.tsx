import { describe, it, expect } from 'vitest';
import {
  CHIPS_PDI,
  CLASSE_STATUS,
  PROGRESSO_PDI_DISPONIVEL,
  TEMA_CHIP_PDI,
  categoriaPdi,
  colaboradoresDosPdis,
  competenciasDisponiveis,
  contarPorCategoria,
  correspondeBusca,
  derivarPdi,
  descricaoPrazo,
  diasAtePrazo,
  ordenarPdis,
  pdisEmAtencao,
  resumoAtencao,
  rotuloStatus,
  type ColaboradorPdi,
} from '@/components/avaliacao/pdiComum';

/**
 * ============================================================================
 * Prova das DERIVAÇÕES da aba PDI (dados/matemática, sem DOM).
 *
 * O que precisa ficar travado aqui:
 *   • a regra de ATRASO é a existente (`estaAtrasado`): prazo passado E plano
 *     não concluído — concluído com prazo passado NÃO é atraso;
 *   • progresso NÃO existe nesta tabela (`PROGRESSO_PDI_DISPONIVEL === false`),
 *     e nada aqui converte status em percentual;
 *   • os contadores das pílulas e o conjunto "em atenção" não repetem registro
 *     (um PDI vencido E pendente conta uma vez só);
 *   • a busca cobre exatamente o que o placeholder promete (colaborador, PDI,
 *     competência) + a ação de desenvolvimento, que é texto real do plano.
 * ============================================================================
 */

/** "Agora" fixo: nenhum teste depende do relógio da máquina. */
const AGORA = new Date('2026-06-15T12:00:00').getTime();

/** Data ISO a N dias de `AGORA` (negativo = passado). */
const emDias = (n: number) => new Date(AGORA + n * 86_400_000).toISOString().slice(0, 10);

/** PDI mínimo com os campos que a aba consome. */
function pdi(extra: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    empresa_id: 'e1',
    colaborador_id: 'c1',
    titulo: 'Trilha de Arquitetura',
    competencia_foco: 'Arquitetura de software',
    acao_desenvolvimento: 'Curso avançado + mentoria.',
    prazo: emDias(30),
    status: 'em_andamento',
    comentarios: 'Progresso semanal.',
    created_at: '2026-05-01T10:00:00',
    updated_at: '2026-06-01T10:00:00',
    colaborador: { nome_completo: 'Carlos Eduardo Lima' },
    ...extra,
  };
}

const COLABORADORES: ColaboradorPdi[] = [
  {
    id: 'c1',
    nome_completo: 'Carlos Eduardo Lima',
    cargo: 'Desenvolvedor Frontend',
    departamento: 'Tecnologia',
    foto_url: 'https://exemplo/foto.jpg',
  },
];

describe('pdiComum — categoria de status', () => {
  it('mapeia os status reais do banco', () => {
    expect(categoriaPdi('em_andamento')).toBe('em_andamento');
    expect(categoriaPdi('pendente')).toBe('pendente');
    expect(categoriaPdi('concluido')).toBe('concluido');
    expect(categoriaPdi('concluida')).toBe('concluido');
  });

  it('trata o status como texto livre (caixa/espaços/acento)', () => {
    expect(categoriaPdi(' Em_Andamento ')).toBe('em_andamento');
    expect(categoriaPdi('CONCLUÍDO')).toBe('concluido');
    expect(categoriaPdi('nao_iniciado')).toBe('pendente');
  });

  it('status vazio conta como pendente e desconhecido cai em andamento', () => {
    expect(categoriaPdi(null)).toBe('pendente');
    expect(categoriaPdi('')).toBe('pendente');
    expect(categoriaPdi('em_revisao')).toBe('em_andamento');
  });

  it('humaniza o rótulo do status cru', () => {
    expect(rotuloStatus('em_andamento')).toBe('Em Andamento');
    expect(rotuloStatus(null)).toBe('Sem status');
  });
});

describe('pdiComum — derivação do registro', () => {
  it('resolve colaborador, cargo, departamento e foto pela lista da página', () => {
    const d = derivarPdi(pdi(), COLABORADORES, AGORA);
    expect(d.colaborador).toBe('Carlos Eduardo Lima');
    expect(d.cargo).toBe('Desenvolvedor Frontend');
    expect(d.departamento).toBe('Tecnologia');
    expect(d.foto).toBe('https://exemplo/foto.jpg');
    expect(d.competencia).toBe('Arquitetura de software');
    expect(d.acao).toBe('Curso avançado + mentoria.');
  });

  it('sem a lista de colaboradores, cargo/departamento/foto ficam nulos (nada inventado)', () => {
    const d = derivarPdi(pdi(), [], AGORA);
    expect(d.colaborador).toBe('Carlos Eduardo Lima');
    expect(d.cargo).toBeNull();
    expect(d.departamento).toBeNull();
    expect(d.foto).toBeNull();
  });

  it('usa o colaborador da própria relação quando a lista não traz o id', () => {
    const d = derivarPdi(pdi({ colaborador_id: 'c9' }), COLABORADORES, AGORA);
    expect(d.colaborador).toBe('Carlos Eduardo Lima');
    expect(d.colaboradorId).toBe('c9');
    expect(d.cargo).toBeNull();
  });

  it('não deixa título nem colaborador vazios na tela', () => {
    const d = derivarPdi({ id: 'x' }, [], AGORA);
    expect(d.titulo).toBe('PDI sem título');
    expect(d.colaborador).toBe('Sem colaborador');
  });
});

describe('pdiComum — prazo (regra existente de atraso)', () => {
  it('prazo futuro e plano aberto = em dia, com dias restantes', () => {
    const d = derivarPdi(pdi({ prazo: emDias(30) }), [], AGORA);
    expect(d.vencido).toBe(false);
    expect(d.situacao).toBe('em_dia');
    expect(d.dias).toBe(30);
    expect(d.prazoDescricao).toBe('30 dias restantes');
  });

  it('prazo passado e plano NÃO concluído = vencido (estaAtrasado)', () => {
    const d = derivarPdi(pdi({ prazo: emDias(-12) }), [], AGORA);
    expect(d.vencido).toBe(true);
    expect(d.situacao).toBe('vencido');
    expect(d.prazoDescricao).toBe('12 dias em atraso');
  });

  it('prazo passado com plano CONCLUÍDO não é atraso — é conclusão', () => {
    const d = derivarPdi(pdi({ prazo: emDias(-90), status: 'concluido' }), [], AGORA);
    expect(d.vencido).toBe(false);
    expect(d.situacao).toBe('concluido');
    expect(d.prazoDescricao).toBe('Plano concluído');
  });

  it('sem prazo: nem atraso nem contagem', () => {
    const d = derivarPdi(pdi({ prazo: null }), [], AGORA);
    expect(d.dias).toBeNull();
    expect(d.vencido).toBe(false);
    expect(d.prazoTexto).toBe('—');
    expect(d.prazoDescricao).toBe('Sem prazo definido');
  });

  it('cobre hoje/amanhã/1 dia de atraso e prazo inválido', () => {
    expect(diasAtePrazo(emDias(0), AGORA)).toBe(0);
    expect(descricaoPrazo(0, 'em_dia')).toBe('Vence hoje');
    expect(descricaoPrazo(1, 'em_dia')).toBe('Vence amanhã');
    expect(descricaoPrazo(-1, 'vencido')).toBe('1 dia em atraso');
    expect(diasAtePrazo('data-invalida', AGORA)).toBeNull();
  });
});

describe('pdiComum — progresso indisponível (nada de percentual falso)', () => {
  it('declara que a tabela consultada não tem progresso', () => {
    expect(PROGRESSO_PDI_DISPONIVEL).toBe(false);
  });

  it('ignora a coluna `progresso` da tabela legada mesmo quando ela aparece', () => {
    const d = derivarPdi(pdi({ progresso: 60 }), [], AGORA);
    expect(d).not.toHaveProperty('percentual');
    expect(Object.values(d)).not.toContain(60);
  });
});

/** Quatro planos cobrindo as quatro pílulas (um deles vencido E pendente). */
function conjunto() {
  return [
    derivarPdi(pdi({ id: 'a', status: 'pendente', prazo: emDias(-5) }), [], AGORA),
    derivarPdi(pdi({ id: 'b', status: 'em_andamento', prazo: emDias(20) }), [], AGORA),
    derivarPdi(pdi({ id: 'c', status: 'concluido', prazo: emDias(-40) }), [], AGORA),
    derivarPdi(pdi({ id: 'd', status: 'pendente', prazo: emDias(15) }), [], AGORA),
  ];
}

describe('pdiComum — contadores das pílulas', () => {
  it('conta cada plano em uma só categoria, com "Todos" = total', () => {
    expect(contarPorCategoria(conjunto())).toEqual({ todos: 4, em_andamento: 1, pendente: 2, concluido: 1 });
  });

  it('devolve as quatro chaves zeradas com a lista vazia', () => {
    expect(contarPorCategoria([])).toEqual({ todos: 0, em_andamento: 0, pendente: 0, concluido: 0 });
  });

  it('mantém as quatro pílulas na ordem da referência', () => {
    expect(CHIPS_PDI.map((c) => c.valor)).toEqual(['todos', 'em_andamento', 'pendente', 'concluido']);
    CHIPS_PDI.forEach((c) => {
      expect(TEMA_CHIP_PDI[c.valor].ponto).toBeTruthy();
      expect(CLASSE_STATUS[c.valor]).toBeTruthy();
    });
  });
});

describe('pdiComum — conjunto "precisa de atenção"', () => {
  it('junta vencidos e pendentes SEM repetir (vencido+pendente conta uma vez)', () => {
    const c = conjunto();
    expect(pdisEmAtencao(c).map((i) => i.id)).toEqual(['a', 'd']);
    expect(resumoAtencao(c)).toEqual({ total: 2, vencidos: 1, pendentes: 1 });
  });

  it('concluído com prazo vencido NÃO entra em atenção', () => {
    const c = conjunto();
    expect(pdisEmAtencao(c).map((i) => i.id)).not.toContain('c');
  });

  it('sem um único critério, o resumo é zero (o banner não aparece)', () => {
    const tranquilos = [derivarPdi(pdi({ id: 'ok', status: 'em_andamento', prazo: emDias(10) }), [], AGORA)];
    expect(resumoAtencao(tranquilos)).toEqual({ total: 0, vencidos: 0, pendentes: 0 });
  });
});

describe('pdiComum — facetas dos filtros', () => {
  it('competências: únicas, sem vazios, em ordem alfabética', () => {
    const lista = [
      pdi({ id: '1', competencia_foco: 'Liderança' }),
      pdi({ id: '2', competencia_foco: 'Comunicação' }),
      pdi({ id: '3', competencia_foco: 'Liderança' }),
      pdi({ id: '4', competencia_foco: '' }),
      pdi({ id: '5', competencia_foco: null }),
    ];
    expect(competenciasDisponiveis(lista)).toEqual(['Comunicação', 'Liderança']);
  });

  it('colaboradores: únicos por id, ordenados por nome', () => {
    const itens = [
      derivarPdi(pdi({ id: '1', colaborador_id: 'c2', colaborador: { nome_completo: 'Bruno Lima' } }), [], AGORA),
      derivarPdi(pdi({ id: '2', colaborador_id: 'c1', colaborador: { nome_completo: 'Ana Souza' } }), [], AGORA),
      derivarPdi(pdi({ id: '3', colaborador_id: 'c1', colaborador: { nome_completo: 'Ana Souza' } }), [], AGORA),
      derivarPdi(pdi({ id: '4', colaborador_id: null }), [], AGORA),
    ];
    expect(colaboradoresDosPdis(itens)).toEqual([
      { id: 'c1', nome: 'Ana Souza' },
      { id: 'c2', nome: 'Bruno Lima' },
    ]);
  });
});

describe('pdiComum — ordenação', () => {
  it('por prazo: menor primeiro (sem prazo vai para o fim)', () => {
    const itens = [
      derivarPdi(pdi({ id: 'longe', prazo: emDias(60) }), [], AGORA),
      derivarPdi(pdi({ id: 'sem', prazo: null }), [], AGORA),
      derivarPdi(pdi({ id: 'perto', prazo: emDias(5) }), [], AGORA),
    ];
    expect(ordenarPdis(itens, 'prazo').map((i) => i.id)).toEqual(['perto', 'longe', 'sem']);
    expect(ordenarPdis(itens, 'prazo_desc')[0].id).toBe('longe');
  });

  it('por data de criação: mais recentes e mais antigos', () => {
    const itens = [
      derivarPdi(pdi({ id: 'novo', created_at: '2026-06-10T10:00:00' }), [], AGORA),
      derivarPdi(pdi({ id: 'velho', created_at: '2026-01-10T10:00:00' }), [], AGORA),
    ];
    expect(ordenarPdis(itens, 'recentes').map((i) => i.id)).toEqual(['novo', 'velho']);
    expect(ordenarPdis(itens, 'antigos').map((i) => i.id)).toEqual(['velho', 'novo']);
  });
});

describe('pdiComum — busca', () => {
  it('acha por título, por colaborador e por competência', () => {
    const item = derivarPdi(pdi(), COLABORADORES, AGORA);
    expect(correspondeBusca(item, 'arquitetura')).toBe(true);
    expect(correspondeBusca(item, 'carlos eduardo')).toBe(true);
    expect(correspondeBusca(item, 'ARQUITETURA DE SOFTWARE')).toBe(true);
  });

  it('acha pela ação de desenvolvimento e pelos comentários', () => {
    const item = derivarPdi(pdi(), COLABORADORES, AGORA);
    expect(correspondeBusca(item, 'mentoria')).toBe(true);
    expect(correspondeBusca(item, 'progresso semanal')).toBe(true);
    expect(correspondeBusca(item, 'inexistente')).toBe(false);
  });

  it('termo vazio ou só espaços não recorta nada', () => {
    const item = derivarPdi(pdi(), [], AGORA);
    expect(correspondeBusca(item, '')).toBe(true);
    expect(correspondeBusca(item, '   ')).toBe(true);
  });
});


