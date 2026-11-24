/**
 * Central de Auditoria — derivações puras.
 *
 * O teste cobre o que a TELA afirma: normalização das duas gerações de linha de
 * `audit_log`, títulos legíveis, recortes combináveis, contagem dos KPIs,
 * variação contra o período anterior, paginação e — principalmente — o parecer
 * de integridade, que nunca pode dizer "Verificada" sem recalcular o SHA-256.
 */
import { describe, expect, it } from 'vitest';
import {
  TAMANHO_PAGINA_AUDITORIA,
  dataBR,
  digestDaBatida,
  entidadesDosEventos,
  evidenciaDoEvento,
  faixaExibidaAuditoria,
  filtrarEventos,
  intervaloAnteriorAuditoria,
  intervaloDoPeriodoAuditoria,
  normalizarEvento,
  normalizarEventos,
  operacoesDosEventos,
  paginasVisiveisAuditoria,
  paginarAuditoria,
  responsaveisDosEventos,
  resumoAuditoria,
  rotuloDoPeriodoAuditoria,
  tituloDoEvento,
  totalPaginasAuditoria,
  variacoesAuditoria,
  type EventoAuditoria,
  type LinhaAuditoriaCrua,
} from '../ponto/centralAuditoria';

const HOJE = '2026-11-05';

/** Linha legada de `audit_log` (colunas no topo). */
const LINHA_LEGADA: LinhaAuditoriaCrua = {
  id: 'log-1',
  tabela: 'registros_ponto',
  registro_id: 'rp-1',
  acao: 'UPDATE',
  user_email: 'ana.silva@empresa.com.br',
  dados_anteriores: { horas_extras: '00:00' },
  dados_novos: { horas_extras: '01:30' },
  campos_alterados: ['horas_extras'],
  created_at: '2026-11-04T13:20:00.000Z',
};

/** Linha nova (`audit_log_unified`): nomes em inglês + payload aninhado. */
const LINHA_NOVA: LinhaAuditoriaCrua = {
  id: 'log-2',
  entity: 'batidas_ponto',
  entity_id: 'bp-9',
  action: 'INSERT',
  occurred_at: '2026-11-03T09:10:00.000Z',
  payload: {
    user_email: 'william.cardoso@empresa.com.br',
    dados_novos: { colaborador_id: 'c1', data: '2026-11-03', hora: '09:10' },
  },
};

/** Batida com o digest REAL da receita do serviço. */
function linhaBatida(overrides: Partial<LinhaAuditoriaCrua> = {}): LinhaAuditoriaCrua {
  const dados = { colaborador_id: 'c1', data: '2026-11-03', hora: '09:10', dispositivo_id: 'web-browser' };
  return {
    id: 'log-batida',
    tabela: 'batidas_ponto',
    registro_id: 'bp-1',
    acao: 'INSERT',
    user_email: 'rh@empresa.com.br',
    dados_novos: { ...dados, hash_integridade: digestDaBatida('c1', '2026-11-03', '09:10', 'web') },
    created_at: '2026-11-03T09:10:00.000Z',
    ...overrides,
  };
}

/** Atalho: normaliza uma linha garantindo que ela exista. */
function evento(linha: LinhaAuditoriaCrua): EventoAuditoria {
  const normalizado = normalizarEvento(linha);
  if (!normalizado) throw new Error('linha deveria normalizar');
  return normalizado;
}

describe('normalização', () => {
  it('lê a linha legada (colunas no topo)', () => {
    const normalizado = evento(LINHA_LEGADA);
    expect(normalizado).toMatchObject({
      id: 'log-1',
      acao: 'UPDATE',
      operacao: 'UPDATE',
      tabela: 'registros_ponto',
      registroId: 'rp-1',
      userEmail: 'ana.silva@empresa.com.br',
    });
    expect(normalizado.camposAlterados).toEqual(['horas_extras']);
  });

  it('lê a linha nova (payload aninhado)', () => {
    const normalizado = evento(LINHA_NOVA);
    expect(normalizado).toMatchObject({
      tabela: 'batidas_ponto',
      operacao: 'INSERT',
      registroId: 'bp-9',
      userEmail: 'william.cardoso@empresa.com.br',
      criadoEm: '2026-11-03T09:10:00.000Z',
    });
    expect(normalizado.dadosNovos).toEqual({ colaborador_id: 'c1', data: '2026-11-03', hora: '09:10' });
  });

  it('descarta linha sem id ou sem data', () => {
    expect(normalizarEvento({ ...LINHA_LEGADA, id: null })).toBeNull();
    expect(normalizarEvento({ ...LINHA_LEGADA, created_at: null })).toBeNull();
    expect(normalizarEventos([LINHA_LEGADA, { ...LINHA_LEGADA, id: null }])).toHaveLength(1);
  });

  it('traduz operações desconhecidas para OUTRA', () => {
    expect(evento({ ...LINHA_LEGADA, acao: 'EXECUTE_CALC' }).operacao).toBe('OUTRA');
    expect(evento({ ...LINHA_LEGADA, acao: 'delete' }).operacao).toBe('DELETE');
  });
});

describe('títulos legíveis', () => {
  const casos: [string, string, string][] = [
    ['batidas_ponto', 'INSERT', 'Batida de ponto criada'],
    ['registros_ponto', 'UPDATE', 'Registro de jornada atualizado'],
    ['solicitacoes_ajuste_ponto', 'DELETE', 'Solicitação de ajuste excluída'],
  ];

  it.each(casos)('%s + %s → %s', (tabela, acao, esperado) => {
    expect(tituloDoEvento(evento({ ...LINHA_LEGADA, tabela, acao }))).toBe(esperado);
  });

  it('usa o nome técnico quando a tabela é desconhecida', () => {
    expect(tituloDoEvento(evento({ ...LINHA_LEGADA, tabela: 'tabela_x', acao: 'INSERT' }))).toBe(
      'Tabela_x criado'
    );
  });
});

/* ─── Integridade da evidência ─────────────────────────────────────────────── */

describe('integridade da evidência', () => {
  it('verifica de verdade a batida cujo digest confere', () => {
    const parecer = evidenciaDoEvento(evento(linhaBatida()));
    expect(parecer.estado).toBe('verificada');
    expect(parecer.rotulo).toBe('Verificada');
    expect(parecer.algoritmo).toBe('SHA-256');
    expect(parecer.hashCalculado).toBe(parecer.hashRegistrado);
  });

  it('aceita a batida em que o dispositivo gravado é o fallback "web-browser"', () => {
    // A coluna guarda 'web-browser', mas o digest foi calculado com 'web'.
    expect(evidenciaDoEvento(evento(linhaBatida())).estado).toBe('verificada');
  });

  it('acusa divergência quando o digest gravado não corresponde', () => {
    const corrompida = linhaBatida();
    const dados: Record<string, unknown> = { ...(corrompida.dados_novos ?? {}) };
    dados.hash_integridade = `0${String(dados.hash_integridade).slice(1)}`;
    const parecer = evidenciaDoEvento(evento({ ...corrompida, dados_novos: dados }));
    expect(parecer.estado).toBe('divergente');
    expect(parecer.hashCalculado).not.toBe(parecer.hashRegistrado);
  });

  it('NÃO marca como verificada só porque existe um hash de receita desconhecida', () => {
    const parecer = evidenciaDoEvento(
      evento({
        ...LINHA_LEGADA,
        dados_novos: { ...(LINHA_LEGADA.dados_novos ?? {}), hash_integridade: 'abc123' },
      })
    );
    expect(parecer.estado).toBe('sem_comprovacao');
    expect(parecer.rotulo).toBe('Não verificada');
    expect(parecer.descricao).toMatch(/não pode ser confirmada/i);
  });

  it('exclusão sem digest pede revisão', () => {
    const parecer = evidenciaDoEvento(
      evento({ ...LINHA_LEGADA, acao: 'DELETE', tabela: 'registros_ponto' })
    );
    expect(parecer.estado).toBe('revisao');
    expect(parecer.rotulo).toBe('Revisão recomendada');
  });

  it('batida sem os campos da receita cai em sem comprovação', () => {
    const parecer = evidenciaDoEvento(
      evento(linhaBatida({ dados_novos: { colaborador_id: 'c1', hash_integridade: 'xyz' } }))
    );
    expect(parecer.estado).toBe('sem_comprovacao');
  });
});

/* ─── Período ─────────────────────────────────────────────────────────────── */

describe('período', () => {
  it('calcula a janela dos atalhos', () => {
    expect(intervaloDoPeriodoAuditoria('7d', undefined, HOJE)).toEqual({
      inicio: '2026-10-30',
      fim: HOJE,
    });
    expect(intervaloDoPeriodoAuditoria('30d', undefined, HOJE)).toEqual({
      inicio: '2026-10-07',
      fim: HOJE,
    });
    expect(intervaloDoPeriodoAuditoria('90d', undefined, HOJE)).toEqual({
      inicio: '2026-08-08',
      fim: HOJE,
    });
  });

  it('ordena o recorte personalizado invertido', () => {
    expect(
      intervaloDoPeriodoAuditoria('personalizado', { de: '2026-11-04', ate: '2026-10-01' }, HOJE)
    ).toEqual({ inicio: '2026-10-01', fim: '2026-11-04' });
  });

  it('a janela anterior tem a mesma duração e termina no dia anterior', () => {
    expect(intervaloAnteriorAuditoria({ inicio: '2026-10-07', fim: HOJE })).toEqual({
      inicio: '2026-09-07',
      fim: '2026-10-06',
    });
  });

  it('o rótulo sai do recorte, não de um estado paralelo', () => {
    expect(rotuloDoPeriodoAuditoria('30d')).toBe('Últimos 30 dias');
    expect(rotuloDoPeriodoAuditoria('personalizado', { de: '2026-11-01', ate: '2026-11-05' })).toBe(
      '01/11/2026 – 05/11/2026'
    );
  });
});


/* ─── Filtros, resumo e paginação ──────────────────────────────────────────── */

describe('filtros, resumo e variação', () => {
  const eventos = normalizarEventos([
    linhaBatida({ id: 'e1', created_at: '2026-11-04T09:00:00.000Z' }),
    linhaBatida({ id: 'e2', acao: 'UPDATE', created_at: '2026-11-03T09:00:00.000Z' }),
    { ...LINHA_LEGADA, id: 'e3', created_at: '2026-10-01T09:00:00.000Z', user_email: 'outro@empresa.com.br' },
    { ...LINHA_LEGADA, id: 'e4', acao: 'DELETE', created_at: '2026-11-02T09:00:00.000Z' },
  ]);

  it('recorta pelo intervalo (dia local)', () => {
    const recorte = filtrarEventos(eventos, { intervalo: { inicio: '2026-11-01', fim: HOJE } });
    expect(recorte.map((item) => item.id)).toEqual(['e1', 'e2', 'e4']);
  });

  it('combina operação, entidade, responsável e busca', () => {
    expect(filtrarEventos(eventos, { operacao: 'UPDATE' }).map((item) => item.id)).toEqual(['e2', 'e3']);
    expect(filtrarEventos(eventos, { entidade: 'batidas_ponto' })).toHaveLength(2);
    expect(
      filtrarEventos(eventos, { responsavel: 'ana.silva@empresa.com.br' }).map((item) => item.id)
    ).toEqual(['e4']);
    // A busca cobre id do registro, entidade e json.
    expect(filtrarEventos(eventos, { busca: 'rp-1' }).length).toBeGreaterThan(0);
    expect(filtrarEventos(eventos, { busca: 'horas_extras' }).map((item) => item.id)).toEqual([
      'e3',
      'e4',
    ]);
  });

  it('conta os KPIs e os eventos de atenção', () => {
    const resumo = resumoAuditoria(eventos);
    expect(resumo).toEqual({ total: 4, criados: 1, alterados: 2, excluidos: 1, atencao: 1 });
  });

  it('sem base de comparação a variação é nula', () => {
    const variacoes = variacoesAuditoria(resumoAuditoria(eventos), resumoAuditoria([]));
    expect(variacoes.total).toBeNull();
    expect(variacoes.atencao).toBeNull();
  });

  it('com base de comparação devolve o percentual arredondado', () => {
    const anterior = { total: 2, criados: 1, alterados: 1, excluidos: 0, atencao: 0 };
    const variacoes = variacoesAuditoria(resumoAuditoria(eventos), anterior);
    expect(variacoes.total).toBe(100);
    expect(variacoes.atencao).toBeNull();
  });

  it('lista as opções dos três selects a partir dos eventos', () => {
    expect(entidadesDosEventos(eventos)).toEqual(['batidas_ponto', 'registros_ponto']);
    expect(operacoesDosEventos(eventos)).toEqual(['INSERT', 'UPDATE', 'DELETE']);
    expect(responsaveisDosEventos(eventos)).toContain('outro@empresa.com.br');
  });

  it('formata a data sem passar por fuso', () => {
    expect(dataBR('2026-11-05')).toBe('05/11/2026');
    expect(dataBR(null)).toBe('—');
  });
});

describe('paginação', () => {
  const lista = Array.from({ length: 12 }, (_, indice) => indice + 1);

  it('recorta a página e mantém a página dentro dos limites', () => {
    expect(TAMANHO_PAGINA_AUDITORIA).toBe(5);
    expect(paginarAuditoria(lista, 1)).toEqual([1, 2, 3, 4, 5]);
    expect(paginarAuditoria(lista, 3)).toEqual([11, 12]);
    expect(paginarAuditoria(lista, 99)).toEqual([11, 12]);
    expect(totalPaginasAuditoria(12)).toBe(3);
    expect(totalPaginasAuditoria(0)).toBe(1);
  });

  it('descreve a faixa exibida', () => {
    expect(faixaExibidaAuditoria(1, 5, 12)).toEqual({ inicio: 1, fim: 5 });
    expect(faixaExibidaAuditoria(3, 5, 12)).toEqual({ inicio: 11, fim: 12 });
    expect(faixaExibidaAuditoria(1, 5, 0)).toEqual({ inicio: 0, fim: 0 });
  });

  it('mostra no máximo cinco botões, com reticências nos vãos', () => {
    expect(paginasVisiveisAuditoria(1, 4)).toEqual([1, 2, 3, 4]);
    expect(paginasVisiveisAuditoria(1, 20)).toEqual([1, 2, 3, 4, null, 20]);
    expect(paginasVisiveisAuditoria(10, 20)).toEqual([1, null, 9, 10, 11, null, 20]);
    expect(paginasVisiveisAuditoria(20, 20)).toEqual([1, null, 17, 18, 19, 20]);
  });
});

