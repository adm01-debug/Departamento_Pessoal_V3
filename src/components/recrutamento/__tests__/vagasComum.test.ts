import { describe, expect, it } from 'vitest';
import type { CandidaturaComRelacoes, VagaRow } from '@/types/recrutamento';
import {
  contarVagas,
  dataDaVaga,
  filtrarVagas,
  montarVagasResumo,
  normalizarVaga,
  opcoesDepartamento,
  opcoesModalidade,
  type FiltrosVaga,
} from '../vagasComum';

const BASE: VagaRow = {
  id: 'vaga-1',
  empresa_id: 'empresa-1',
  titulo: 'Desenvolvedor(a) Full Stack Sênior',
  cargo: 'Desenvolvedor Full Stack',
  departamento: 'Tecnologia',
  modalidade: 'Remoto',
  tipo_contrato: 'CLT',
  descricao: null,
  requisitos: 'React, TypeScript, Node.js, SQL, AWS',
  status: 'aberta',
  quantidade: 2,
  faixa_salarial_min: null,
  faixa_salarial_max: null,
  data_abertura: '2026-09-01',
  data_encerramento: null,
  beneficios_oferecidos: null,
  responsavel_id: null,
  created_at: '2026-09-01T12:00:00Z',
  updated_at: '2026-09-01T12:00:00Z',
};

function vaga(override: Partial<VagaRow> = {}): VagaRow {
  return { ...BASE, ...override } as VagaRow;
}

function candidatura(
  vagaId: string,
  etapa: string,
  createdAt = '2026-09-10T12:00:00Z',
  id = `${vagaId}-${etapa}-${createdAt}`
): CandidaturaComRelacoes {
  return {
    id,
    empresa_id: 'empresa-1',
    vaga_id: vagaId,
    candidato_id: `cand-${id}`,
    etapa,
    status: 'em_andamento',
    nota_geral: null,
    feedback: null,
    entrevistador: null,
    data_entrevista: null,
    data_proxima_etapa: null,
    motivo_rejeicao: null,
    feedback_ia: null,
    historico_etapas: null,
    created_at: createdAt,
    updated_at: createdAt,
    candidato: null,
    vaga: null,
  } as unknown as CandidaturaComRelacoes;
}

const REF = new Date(2026, 8, 11); // 11/09/2026

describe('vagasComum — contadores, identidade e datas', () => {
  it('conta todas/abertas/fechadas pelos status reais', () => {
    expect(
      contarVagas([
        vaga({ id: '1' }),
        vaga({ id: '2', status: 'aberto' }),
        vaga({ id: '3', status: 'fechada' }),
        vaga({ id: '4', status: 'encerrada' }),
        vaga({ id: '5', status: 'pausada' }),
      ])
    ).toEqual({ todas: 5, abertas: 2, fechadas: 2 });
  });

  it('resolve a identidade por departamento e especialidade de dados', () => {
    const resumos = montarVagasResumo(
      [
        vaga({ id: 'dev', departamento: 'Tecnologia', titulo: 'Desenvolvedor', cargo: 'Dev' }),
        vaga({ id: 'dados', departamento: 'Tecnologia', titulo: 'Analista de Dados', cargo: 'Dados' }),
        vaga({ id: 'rh', departamento: 'Recursos Humanos', titulo: 'Analista de RH', cargo: 'RH' }),
        vaga({ id: 'adm', departamento: 'Administrativo', titulo: 'Assistente', cargo: 'Assistente' }),
        vaga({ id: 'com', departamento: 'Comercial', titulo: 'Vendedor', cargo: 'Vendas' }),
      ],
      [],
      REF
    );
    expect(resumos.map((r) => [r.vaga.id, r.identidade.token])).toEqual([
      ['dev', 'info'],
      ['dados', 'aqua'],
      ['rh', 'chart-4'],
      ['adm', 'warning'],
      ['com', 'success'],
    ]);
  });

  it('preserva YYYY-MM-DD no fuso local e retorna null para data inválida', () => {
    const data = dataDaVaga('2026-09-01');
    expect(data?.getFullYear()).toBe(2026);
    expect(data?.getMonth()).toBe(8);
    expect(data?.getDate()).toBe(1);
    expect(dataDaVaga('')).toBeNull();
    expect(dataDaVaga('não é data')).toBeNull();
    expect(normalizarVaga('Recursos Humanos')).toBe('recursos humanos');
  });

  it('calcula funil por etapa, total e última candidatura a partir das candidaturas reais', () => {
    const resumo = montarVagasResumo(
      [vaga()],
      [
        candidatura('vaga-1', 'triagem', '2026-09-02T12:00:00Z'),
        candidatura('vaga-1', 'entrevista', '2026-09-05T12:00:00Z'),
        candidatura('vaga-1', 'teste', '2026-09-06T12:00:00Z'),
        candidatura('vaga-1', 'proposta', '2026-09-09T12:00:00Z'),
        candidatura('vaga-1', 'contratado', '2026-09-10T12:00:00Z'),
      ],
      REF
    )[0];

    expect(resumo.totalCandidatos).toBe(5);
    expect(resumo.candidatosPorEtapa).toEqual({
      triagem: 1,
      entrevista: 1,
      teste: 1,
      proposta: 1,
      contratado: 1,
    });
    expect(resumo.temporal).toBe('Aberta há 10 dias');
    expect(resumo.atividade).toBe('Último candidato há 1 dia');
  });

  it('usa a data de encerramento real em vaga fechada e não inventa data ausente', () => {
    const fechada = montarVagasResumo(
      [vaga({ id: 'fechada', status: 'fechada', data_encerramento: '2026-09-05' })],
      [candidatura('fechada', 'proposta')],
      REF
    )[0];
    expect(fechada.temporal).toBe('Fechada há 6 dias');
    expect(fechada.atividade).toBe('Processo finalizado em 05/09/2026');

    const semDatas = montarVagasResumo(
      [vaga({ id: 'sem', status: 'fechada', data_encerramento: null, data_abertura: null })],
      [],
      REF
    )[0];
    expect(semDatas.temporal).toBeNull();
    expect(semDatas.atividade).toBe('Vaga encerrada');
  });

  it('mantém “Nenhum candidato ainda” quando não há candidaturas', () => {
    const resumo = montarVagasResumo([vaga()], [], REF)[0];
    expect(resumo.totalCandidatos).toBe(0);
    expect(resumo.atividade).toBe('Nenhum candidato ainda');
  });
});

describe('vagasComum — filtros e ordenação', () => {
  const resumos = montarVagasResumo(
    [
      vaga({ id: 'a', titulo: 'A', departamento: 'Tecnologia', modalidade: 'Remoto', data_abertura: '2026-09-01' }),
      vaga({
        id: 'b',
        titulo: 'B',
        departamento: 'Tecnologia',
        modalidade: 'Híbrido',
        status: 'fechada',
        data_abertura: '2026-08-01',
      }),
      vaga({ id: 'c', titulo: 'C', departamento: 'Comercial', modalidade: 'Híbrido', data_abertura: '2026-07-01' }),
    ],
    [candidatura('a', 'triagem'), candidatura('a', 'entrevista'), candidatura('b', 'proposta')],
    REF
  );
  const base: FiltrosVaga = { status: 'todas', departamento: 'todos', modalidade: 'todas', ordenacao: 'recentes' };

  it('combina status, departamento e modalidade', () => {
    expect(filtrarVagas(resumos, { ...base, status: 'aberta' }).map((r) => r.vaga.id)).toEqual(['a', 'c']);
    expect(filtrarVagas(resumos, { ...base, departamento: 'Tecnologia' }).map((r) => r.vaga.id)).toEqual(['a', 'b']);
    expect(filtrarVagas(resumos, { ...base, modalidade: 'Híbrido' }).map((r) => r.vaga.id)).toEqual(['b', 'c']);
    expect(
      filtrarVagas(resumos, { ...base, status: 'fechada', departamento: 'Tecnologia' }).map((r) => r.vaga.id)
    ).toEqual(['b']);
  });

  it('ordena por recentes, antigas, candidatos e título', () => {
    expect(filtrarVagas(resumos, { ...base, ordenacao: 'recentes' }).map((r) => r.vaga.id)).toEqual(['a', 'b', 'c']);
    expect(filtrarVagas(resumos, { ...base, ordenacao: 'antigas' }).map((r) => r.vaga.id)).toEqual(['c', 'b', 'a']);
    expect(filtrarVagas(resumos, { ...base, ordenacao: 'candidatos' }).map((r) => r.vaga.id)).toEqual(['a', 'b', 'c']);
    expect(filtrarVagas(resumos, { ...base, ordenacao: 'titulo' }).map((r) => r.vaga.id)).toEqual(['a', 'b', 'c']);
  });

  it('lista departamentos e modalidades reais em ordem alfabética', () => {
    const lista = [
      vaga({ departamento: 'Tecnologia', modalidade: 'Remoto' }),
      vaga({ departamento: 'Comercial', modalidade: 'Híbrido' }),
    ];
    expect(opcoesDepartamento(lista)).toEqual(['Comercial', 'Tecnologia']);
    expect(opcoesModalidade(lista)).toEqual(['Híbrido', 'Remoto']);
  });
});
