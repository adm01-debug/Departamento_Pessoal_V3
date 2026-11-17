import { describe, expect, it } from 'vitest';
import {
  ETAPAS,
  contextoDaEtapa,
  estiloAvatar,
  filtrarCandidaturas,
  formatarDataCurta,
  formatarUltimaAtualizacao,
  habilidadesDaCandidatura,
  iniciaisDoNome,
  statusDoCard,
} from '../pipelineEtapas';
import type { CandidaturaComRelacoes } from '@/types/recrutamento';

function candidatura(overrides: Partial<CandidaturaComRelacoes> = {}): CandidaturaComRelacoes {
  return {
    id: 'candt-1',
    empresa_id: 'empresa-1',
    vaga_id: 'vaga-1',
    candidato_id: 'cand-1',
    etapa: 'triagem',
    status: 'em_andamento',
    nota_geral: null,
    feedback: null,
    entrevistador: null,
    data_entrevista: null,
    data_proxima_etapa: null,
    motivo_rejeicao: null,
    feedback_ia: null,
    historico_etapas: null,
    created_at: '2026-08-03T12:00:00Z',
    updated_at: '2026-08-03T12:00:00Z',
    candidato: {
      id: 'cand-1',
      empresa_id: 'empresa-1',
      nome: 'Mariana Alves Rodrigues',
      email: 'mariana.alves@email.com',
      telefone: '(11) 98811-2233',
      origem: 'LinkedIn',
      experiencia_anos: 7,
      pretensao_salarial: 15000,
      formacao: 'Ciência da Computação',
      linkedin: null,
      cpf: null,
      curriculo_url: null,
      observacoes: null,
      created_at: '2026-08-02T12:00:00Z',
      updated_at: '2026-08-02T12:00:00Z',
    },
    vaga: {
      titulo: 'Desenvolvedor(a) Full Stack Sênior',
      departamento: 'Tecnologia',
      requisitos: 'React, TypeScript, Node.js, AWS',
    },
    ...overrides,
  };
}

describe('pipelineEtapas — configuração e leitura do board', () => {
  it('define as cinco etapas na ordem do processo com tokens distintos', () => {
    expect(ETAPAS.map((etapa) => etapa.id)).toEqual(['triagem', 'entrevista', 'teste', 'proposta', 'contratado']);
    expect(new Set(ETAPAS.map((etapa) => etapa.token)).size).toBe(5);
    ETAPAS.forEach((etapa) => expect(etapa.descricao.length).toBeGreaterThan(8));
  });

  it('busca por nome, vaga, origem, formação e requisitos sem acentos', () => {
    const lista = [candidatura()];
    expect(filtrarCandidaturas(lista, 'mariana')).toHaveLength(1);
    expect(filtrarCandidaturas(lista, 'linkedin')).toHaveLength(1);
    expect(filtrarCandidaturas(lista, 'computacao')).toHaveLength(1);
    expect(filtrarCandidaturas(lista, 'typescript')).toHaveLength(1);
    expect(filtrarCandidaturas(lista, 'inexistente')).toHaveLength(0);
    expect(filtrarCandidaturas(lista, '')).toHaveLength(1);
  });

  it('usa os requisitos da vaga como habilidades e cai para formação/experiência', () => {
    expect(habilidadesDaCandidatura(candidatura())).toEqual(['React', 'TypeScript', 'Node.js', 'AWS']);
    expect(
      habilidadesDaCandidatura(candidatura({ vaga: { titulo: 'Vaga', departamento: null, requisitos: null } }))
    ).toEqual(['Ciência da Computação', '7 anos de exp.']);
  });

  it('deriva o status contextual de cada etapa', () => {
    expect(statusDoCard(candidatura()).label).toBe('Novo');
    expect(statusDoCard(candidatura({ etapa: 'entrevista' })).label).toBe('Em andamento');
    expect(statusDoCard(candidatura({ etapa: 'teste' })).label).toBe('Pendente');
    expect(statusDoCard(candidatura({ etapa: 'proposta' })).label).toBe('Em negociação');
    expect(statusDoCard(candidatura({ etapa: 'contratado', status: 'contratado' })).label).toBe('Contratado');
  });

  it('monta a próxima ação a partir das datas e do entrevistador reais', () => {
    const referencia = new Date(2026, 7, 18);
    expect(
      contextoDaEtapa(candidatura({ etapa: 'triagem', data_proxima_etapa: '2026-08-11' }), referencia).titulo
    ).toBe('Triagem inicial');
    expect(
      contextoDaEtapa(
        candidatura({
          etapa: 'entrevista',
          data_entrevista: '2026-08-18',
          entrevistador: 'Camila Prado (RH)',
        }),
        referencia
      )
    ).toMatchObject({ titulo: 'Entrevista hoje', detalhe: 'Camila Prado (RH)' });
    expect(
      contextoDaEtapa(candidatura({ etapa: 'teste', data_proxima_etapa: '2026-08-25' }), referencia)
    ).toMatchObject({
      titulo: 'Teste técnico',
      detalhe: 'Enviar instruções até 25/08',
    });
    expect(contextoDaEtapa(candidatura({ etapa: 'proposta' }), referencia).titulo).toBe('Proposta enviada');
    expect(contextoDaEtapa(candidatura({ etapa: 'contratado', status: 'contratado' }), referencia).detalhe).toBe(
      'Processo concluído'
    );
  });

  it('formata datas curtas e a última atualização', () => {
    expect(formatarDataCurta('2026-08-03')).toContain('03');
    const instante = new Date('2026-08-03T12:00:00Z');
    const horaLocal = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(instante);
    expect(formatarUltimaAtualizacao([candidatura()], instante)).toBe(`hoje às ${horaLocal}`);
    expect(formatarUltimaAtualizacao([], new Date(2026, 7, 3))).toBe('sem atualizações');
  });

  it('gera iniciais e avatar determinístico', () => {
    expect(iniciaisDoNome('Mariana Alves Rodrigues')).toBe('MR');
    expect(iniciaisDoNome('Ana')).toBe('AN');
    expect(iniciaisDoNome(null)).toBe('?');
    expect(estiloAvatar('Mariana Alves Rodrigues')).toEqual(estiloAvatar('Mariana Alves Rodrigues'));
  });
});
