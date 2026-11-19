import { describe, it, expect, vi } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mockFrom } }));

import {
  mapearEvento,
  statusDoEvento,
  detalheDoEvento,
  listarTrilhaAdmissoes,
  TABELAS_TRILHA_ADMISSAO,
} from '../auditoriaAdmissoesService';

/**
 * A trilha de auditoria NÃO tem coluna de status: ela registra o que aconteceu.
 * O status que a aba mostra é o ESTADO da admissão no instante do evento,
 * derivado de `status_esocial` e `etapa` da própria linha auditada. Estes casos
 * travam essa derivação — é a única parte com regra de negócio de verdade.
 */
describe('statusDoEvento', () => {
  it('eSocial recusado é falha, porque exige ação', () => {
    expect(statusDoEvento({ status_esocial: 'erro' })).toBe('falha');
    expect(statusDoEvento({ status_esocial: 'rejeitado' })).toBe('falha');
    expect(statusDoEvento({ status_esocial: 'ERRO DE SCHEMA' })).toBe('falha');
  });

  it('admissão cancelada é falha', () => {
    expect(statusDoEvento({ etapa: 'cancelada' })).toBe('falha');
  });

  it('etapa concluída é sucesso', () => {
    expect(statusDoEvento({ etapa: 'concluida', status_esocial: 'pendente' })).toBe('sucesso');
  });

  it('etapa em curso com eSocial pendente é pendência de processo', () => {
    expect(statusDoEvento({ etapa: 'documentos', status_esocial: 'pendente' })).toBe('pendente');
    expect(statusDoEvento({ etapa: 'contrato' })).toBe('pendente');
  });

  it('eSocial transmitido é sucesso mesmo com etapa em curso', () => {
    expect(statusDoEvento({ etapa: 'esocial', status_esocial: 'transmitido' })).toBe('sucesso');
  });

  it('linha sem etapa e sem eSocial (onboarding) é sucesso: o evento aconteceu', () => {
    expect(statusDoEvento({ nome_completo: 'Ana' })).toBe('sucesso');
    expect(statusDoEvento(null)).toBe('sucesso');
  });
});

describe('detalheDoEvento', () => {
  const base = {
    id: 'a1',
    tabela: 'admissoes',
    registro_id: 'r1',
    acao: 'UPDATE',
    dados_anteriores: null,
    dados_novos: null,
    campos_alterados: null,
    user_email: null,
    created_at: '2026-11-19T10:00:00Z',
  };

  it('diz quais campos mudaram, ignorando updated_at', () => {
    expect(detalheDoEvento({ ...base, campos_alterados: ['etapa', 'updated_at'] })).toBe('Campos alterados: etapa.');
  });

  it('update que só tocou updated_at é dito como tal, não inventa mudança', () => {
    expect(detalheDoEvento({ ...base, campos_alterados: ['updated_at'] })).toBe(
      'Atualização sem mudança de campo de negócio.'
    );
  });

  it('INSERT e DELETE têm texto próprio', () => {
    expect(detalheDoEvento({ ...base, acao: 'INSERT' })).toContain('criado');
    expect(detalheDoEvento({ ...base, acao: 'DELETE' })).toContain('removido');
  });
});

describe('mapearEvento', () => {
  it('monta o evento a partir de dados_novos de uma admissão', () => {
    const evento = mapearEvento({
      id: 'log-1',
      tabela: 'admissoes',
      registro_id: 'adm-1',
      acao: 'UPDATE',
      dados_anteriores: { etapa: 'documentos' },
      dados_novos: {
        nome: 'Ana Lima',
        cargo: 'Analista',
        departamento: 'TI',
        etapa: 'esocial',
        status_esocial: 'transmitido',
        protocolo_esocial: '1.2.3',
      },
      campos_alterados: ['etapa', 'status_esocial'],
      user_email: 'rh@empresa.com',
      created_at: '2026-11-19T10:00:00Z',
    });

    expect(evento).toMatchObject({
      id: 'log-1',
      candidato: 'Ana Lima',
      cargo: 'Analista',
      departamento: 'TI',
      etapa: 'esocial',
      acao: 'Admissão atualizada',
      evento_esocial: 'transmitido',
      protocolo: '1.2.3',
      status: 'sucesso',
      responsavel: 'rh@empresa.com',
    });
  });

  it('no DELETE lê o estado de dados_anteriores, não de dados_novos', () => {
    const evento = mapearEvento({
      id: 'log-2',
      tabela: 'admissoes',
      registro_id: 'adm-2',
      acao: 'DELETE',
      dados_anteriores: { nome: 'Bruno Costa', etapa: 'contrato' },
      dados_novos: null,
      campos_alterados: null,
      user_email: null,
      created_at: '2026-11-19T11:00:00Z',
    });
    expect(evento.candidato).toBe('Bruno Costa');
    expect(evento.etapa).toBe('contrato');
    // sem user_email a trilha foi gravada por processo do próprio banco
    expect(evento.responsavel).toBe('Sistema');
  });

  it('tabela de onboarding usa nome_completo e não finge ter etapa', () => {
    const evento = mapearEvento({
      id: 'log-3',
      tabela: 'onboarding_tarefas',
      registro_id: 'tar-1',
      acao: 'INSERT',
      dados_anteriores: null,
      dados_novos: { nome_completo: 'Carla Dias', concluida: false },
      campos_alterados: null,
      user_email: 'rh@empresa.com',
      created_at: '2026-11-19T12:00:00Z',
    });
    expect(evento.candidato).toBe('Carla Dias');
    expect(evento.acao).toBe('Tarefa de onboarding criada');
    expect(evento.evento_esocial).toBeNull();
    expect(evento.protocolo).toBeNull();
    // valor neutro do enum: a linha não tem etapa, e a aba não pode inventar uma
    expect(evento.etapa).toBe('pendente');
  });

  it('campo ausente vira travessão, nunca texto inventado', () => {
    const evento = mapearEvento({
      id: 'log-4',
      tabela: 'admissoes',
      registro_id: 'adm-4',
      acao: 'UPDATE',
      dados_anteriores: null,
      dados_novos: {},
      campos_alterados: [],
      user_email: null,
      created_at: '2026-11-19T13:00:00Z',
    });
    expect(evento.candidato).toBe('—');
    expect(evento.cargo).toBe('—');
    expect(evento.departamento).toBe('—');
  });
});

describe('listarTrilhaAdmissoes', () => {
  it('filtra por empresa e pelas 3 tabelas do processo admissional', async () => {
    const chamadas: Record<string, unknown[]> = {};
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'in', 'order', 'limit']) {
      chain[m] = vi.fn((...args: unknown[]) => {
        chamadas[m] = args;
        return chain;
      });
    }
    chain.then = (fn: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(fn);
    mockFrom.mockReturnValue(chain);

    await listarTrilhaAdmissoes('emp-1', 50);

    expect(mockFrom).toHaveBeenCalledWith('audit_log');
    // isolamento de empresa explícito, além da RLS
    expect(chamadas.eq).toEqual(['empresa_id', 'emp-1']);
    expect(chamadas.in?.[0]).toBe('tabela');
    expect(chamadas.in?.[1]).toEqual([...TABELAS_TRILHA_ADMISSAO]);
    expect(chamadas.limit).toEqual([50]);
    // a consulta NÃO pede dados_anteriores/novos sem necessidade? ela pede: a
    // trilha guarda o estado ali, e é de onde o evento é montado
    expect(String(chamadas.select?.[0])).toContain('dados_novos');
  });
});
