import { describe, it, expect, vi } from 'vitest';

const { mockListarTrilha } = vi.hoisted(() => ({ mockListarTrilha: vi.fn() }));
vi.mock('../auditoriaService', () => ({ auditoriaService: { listarTrilha: mockListarTrilha } }));

import type { TrilhaAuditoriaRegistro } from '../auditoriaService';
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

/** Linha da trilha com os campos que a RPC sempre devolve, para encurtar os casos. */
function linha(parcial: Partial<TrilhaAuditoriaRegistro> = {}): TrilhaAuditoriaRegistro {
  return {
    id: 'a1',
    created_at: '2026-11-19T10:00:00Z',
    tabela: 'admissoes',
    registro_id: 'r1',
    acao: 'UPDATE',
    user_id: null,
    user_email: null,
    user_nome: null,
    status_anterior: null,
    status_novo: null,
    empresa_id: 'emp-1',
    dados_anteriores: null,
    dados_novos: null,
    campos_alterados: null,
    ...parcial,
  };
}

describe('detalheDoEvento', () => {
  it('diz quais campos mudaram, ignorando updated_at', () => {
    expect(detalheDoEvento(linha({ campos_alterados: ['etapa', 'updated_at'] }))).toBe('Campos alterados: etapa.');
  });

  it('update que só tocou updated_at é dito como tal, não inventa mudança', () => {
    expect(detalheDoEvento(linha({ campos_alterados: ['updated_at'] }))).toBe(
      'Atualização sem mudança de campo de negócio.'
    );
  });

  it('INSERT e DELETE têm texto próprio', () => {
    expect(detalheDoEvento(linha({ acao: 'INSERT' }))).toContain('criado');
    expect(detalheDoEvento(linha({ acao: 'DELETE' }))).toContain('removido');
  });
});

describe('mapearEvento', () => {
  it('monta o evento a partir de dados_novos de uma admissão', () => {
    const evento = mapearEvento(
      linha({
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
      })
    );

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
    const evento = mapearEvento(
      linha({
        id: 'log-2',
        tabela: 'admissoes',
        registro_id: 'adm-2',
        acao: 'DELETE',
        dados_anteriores: { nome: 'Bruno Costa', etapa: 'contrato' },
        dados_novos: null,
        campos_alterados: null,
        user_email: null,
        created_at: '2026-11-19T11:00:00Z',
      })
    );
    expect(evento.candidato).toBe('Bruno Costa');
    expect(evento.etapa).toBe('contrato');
    // sem user_email a trilha foi gravada por processo do próprio banco
    expect(evento.responsavel).toBe('Sistema');
  });

  it('tabela de onboarding usa nome_completo e não finge ter etapa', () => {
    const evento = mapearEvento(
      linha({
        id: 'log-3',
        tabela: 'onboarding_tarefas',
        registro_id: 'tar-1',
        acao: 'INSERT',
        dados_anteriores: null,
        dados_novos: { nome_completo: 'Carla Dias', concluida: false },
        campos_alterados: null,
        user_email: 'rh@empresa.com',
        created_at: '2026-11-19T12:00:00Z',
      })
    );
    expect(evento.candidato).toBe('Carla Dias');
    expect(evento.acao).toBe('Tarefa de onboarding criada');
    expect(evento.evento_esocial).toBeNull();
    expect(evento.protocolo).toBeNull();
    // valor neutro do enum: a linha não tem etapa, e a aba não pode inventar uma
    expect(evento.etapa).toBe('pendente');
  });

  it('campo ausente vira travessão, nunca texto inventado', () => {
    const evento = mapearEvento(
      linha({
        id: 'log-4',
        tabela: 'admissoes',
        registro_id: 'adm-4',
        acao: 'UPDATE',
        dados_anteriores: null,
        dados_novos: {},
        campos_alterados: [],
        user_email: null,
        created_at: '2026-11-19T13:00:00Z',
      })
    );
    expect(evento.candidato).toBe('—');
    expect(evento.cargo).toBe('—');
    expect(evento.departamento).toBe('—');
  });
});

describe('listarTrilhaAdmissoes', () => {
  it('lê pela RPC tenant-scoped, com as 3 tabelas do processo admissional', async () => {
    mockListarTrilha.mockResolvedValue([]);

    await listarTrilhaAdmissoes('emp-1', 50);

    // `audit_log` é tabela sensível: o front NÃO a lê direto (contrato em
    // scripts/audit-bridge-frontend-contract.mjs). O caminho é a RPC
    // `get_audit_trail`, que `auditoriaService.listarTrilha` chama.
    expect(mockListarTrilha).toHaveBeenCalledWith({
      empresa_id: 'emp-1',
      tabelas: ['admissoes', 'onboarding_colaborador', 'onboarding_tarefas'],
      limite: 50,
    });
    expect([...TABELAS_TRILHA_ADMISSAO]).toEqual(['admissoes', 'onboarding_colaborador', 'onboarding_tarefas']);
  });

  it('converte cada linha da trilha em evento da aba', async () => {
    mockListarTrilha.mockResolvedValue([
      {
        id: 'log-9',
        created_at: '2026-11-19T10:00:00Z',
        tabela: 'admissoes',
        registro_id: 'adm-9',
        acao: 'INSERT',
        user_id: null,
        user_email: 'rh@empresa.com',
        user_nome: 'Renata',
        status_anterior: null,
        status_novo: null,
        empresa_id: 'emp-1',
        dados_anteriores: null,
        dados_novos: { nome: 'Ana', etapa: 'documentos' },
        campos_alterados: null,
      },
    ]);

    const eventos = await listarTrilhaAdmissoes('emp-1');

    expect(eventos).toHaveLength(1);
    expect(eventos[0].candidato).toBe('Ana');
    // a RPC devolve o NOME de quem fez; a coluna deixa de mostrar e-mail
    expect(eventos[0].responsavel).toBe('Renata');
  });
});
