import { describe, expect, it } from 'vitest';
import {
  FILTROS_CANDIDATOS_PADRAO,
  badgeEtapa,
  contarFiltrosExtras,
  contarSituacoes,
  dadosVagaDaCandidatura,
  estiloOrigem,
  filtrarCandidaturas,
  ordenarCandidaturas,
  origensDisponiveis,
  paginarCandidaturas,
  paginasVisiveis,
  resumoSelecao,
  situacaoDaCandidatura,
  temFiltrosAtivos,
  ultimaAtividade,
  vagasComCandidaturas,
} from '../candidatosComum';
import { criarCandidatura, criarVaga } from './candidatosFixture';

const LISTA = [
  criarCandidatura({ id: '1', status: 'em_andamento', etapa: 'triagem', nota_geral: 4.2 }),
  criarCandidatura({
    id: '2',
    status: 'contratado',
    etapa: 'contratado',
    nota_geral: 5,
    candidato: { ...criarCandidatura().candidato!, id: 'p2', nome: 'Bruno Lima', pretensao_salarial: 13000 },
  }),
  criarCandidatura({
    id: '3',
    status: 'rejeitado',
    etapa: 'entrevista',
    nota_geral: 3.5,
    candidato: { ...criarCandidatura().candidato!, id: 'p3', nome: 'Carla Dias', origem: 'Gupy' },
  }),
  criarCandidatura({
    id: '4',
    status: 'arquivado',
    etapa: 'triagem',
    nota_geral: null,
    candidato: { ...criarCandidatura().candidato!, id: 'p4', nome: 'Diego Alves', origem: 'Site' },
  }),
  criarCandidatura({
    id: '5',
    etapa: 'teste',
    status: null,
    nota_geral: null,
    candidato: { ...criarCandidatura().candidato!, id: 'p5', nome: 'Elisa Prado', pretensao_salarial: null },
  }),
];

describe('candidatosComum — situações e contagens', () => {
  it('classifica status finais e em processo sem confundir etapa com situação', () => {
    expect(situacaoDaCandidatura(LISTA[0])).toBe('em_processo');
    expect(situacaoDaCandidatura(LISTA[1])).toBe('contratados');
    expect(situacaoDaCandidatura(LISTA[2])).toBe('reprovados');
    expect(situacaoDaCandidatura(LISTA[3])).toBe('arquivados');
    expect(situacaoDaCandidatura(LISTA[4])).toBe('em_processo');
  });

  it('conta todas as situações sobre o escopo recebido (não só a página)', () => {
    expect(contarSituacoes(LISTA)).toEqual({
      todas: 5,
      em_processo: 2,
      contratados: 1,
      reprovados: 1,
      arquivados: 1,
    });
  });

  it('badge de etapa usa o status final quando existir e a etapa real nos demais', () => {
    expect(badgeEtapa(LISTA[1])).toMatchObject({ label: 'Contratado', etapaId: null });
    expect(badgeEtapa(LISTA[2])).toMatchObject({ label: 'Reprovado', etapaId: null });
    expect(badgeEtapa(LISTA[3])).toMatchObject({ label: 'Arquivado', etapaId: null });
    expect(badgeEtapa(LISTA[0])).toMatchObject({ label: 'Triagem', etapaId: 'triagem' });
  });
});

describe('candidatosComum — filtros combináveis', () => {
  const filtrar = (patch: Partial<typeof FILTROS_CANDIDATOS_PADRAO> = {}) =>
    filtrarCandidaturas(LISTA, { ...FILTROS_CANDIDATOS_PADRAO, ...patch }).map((c) => c.id);

  it('filtra por situação, vaga, etapa e origem', () => {
    expect(filtrar({ situacao: 'contratados' })).toEqual(['2']);
    expect(filtrar({ etapa: 'teste' })).toEqual(['5']);
    expect(filtrar({ origem: 'Gupy' })).toEqual(['3']);
    expect(filtrar({ vagaId: 'vaga-1' })).toHaveLength(5);
  });

  it('combina busca, avaliação e pretensão sem inventar dados', () => {
    expect(filtrar({ busca: 'bruno' })).toEqual(['2']);
    expect(filtrar({ apenasAvaliados: true })).toEqual(['1', '2', '3']);
    expect(filtrar({ apenasComPretensao: true })).toEqual(['1', '2', '3', '4']);
    expect(filtrar({ busca: 'zzz' })).toEqual([]);
  });

  it('ordena por nota, pretensão, nome e data real', () => {
    expect(ordenarCandidaturas(LISTA, 'avaliacao').map((c) => c.id)).toEqual(['2', '1', '3', '4', '5']);
    expect(ordenarCandidaturas(LISTA, 'pretensao').map((c) => c.id)[0]).toBe('1');
    expect(ordenarCandidaturas(LISTA, 'nome').map((c) => c.id)).toEqual(['1', '2', '3', '4', '5']);
    expect(ordenarCandidaturas(LISTA, 'recentes')).toHaveLength(5);
  });

  it('lista somente origens e vagas reais', () => {
    expect(origensDisponiveis(LISTA)).toEqual(['Gupy', 'LinkedIn', 'Site']);
    expect(vagasComCandidaturas(LISTA, [criarVaga()])).toEqual([
      { id: 'vaga-1', titulo: 'Desenvolvedor(a) Full Stack Sênior' },
    ]);
  });

  it('detecta filtros ativos e extras', () => {
    expect(temFiltrosAtivos(FILTROS_CANDIDATOS_PADRAO)).toBe(false);
    expect(temFiltrosAtivos({ ...FILTROS_CANDIDATOS_PADRAO, apenasAvaliados: true })).toBe(true);
    expect(contarFiltrosExtras({ ...FILTROS_CANDIDATOS_PADRAO, busca: 'x', apenasComPretensao: true })).toBe(2);
  });
});

describe('candidatosComum — vaga, atividade, seleção e paginação', () => {
  it('monta vaga + departamento · modalidade com fallbacks honestos', () => {
    expect(dadosVagaDaCandidatura(LISTA[0], criarVaga())).toEqual({
      titulo: 'Desenvolvedor(a) Full Stack Sênior',
      detalhe: 'Tecnologia · Remoto',
    });
    expect(dadosVagaDaCandidatura(criarCandidatura({ vaga: null }))).toEqual({
      titulo: 'Vaga não informada',
      detalhe: 'Sem informações do processo',
    });
  });

  it('deriva a última atividade da candidatura e não inventa evento', () => {
    const referencia = new Date('2026-09-01T12:00:00Z');
    expect(ultimaAtividade(LISTA[1], referencia)).toEqual({
      data: '03 de ago.',
      descricao: 'Contratação concluída',
    });
    expect(ultimaAtividade(LISTA[2], referencia).descricao).toBe('Candidatura reprovada');
    expect(ultimaAtividade(LISTA[3], referencia).descricao).toBe('Candidatura arquivada');
    expect(ultimaAtividade(LISTA[0], referencia).descricao).toBe('Processo atualizado');
    expect(ultimaAtividade(criarCandidatura({ updated_at: 'inválida' }), referencia)).toEqual({
      data: null,
      descricao: 'Sem atividade registrada',
    });
  });

  it('agrega apenas os selecionados reais', () => {
    expect(resumoSelecao(LISTA, new Set(['1', '2']))).toEqual({
      total: 2,
      mediaAvaliacao: 4.6,
      mediaPretensao: 14000,
    });
    expect(resumoSelecao(LISTA, new Set(['4']))).toEqual({
      total: 1,
      mediaAvaliacao: null,
      mediaPretensao: 15000,
    });
  });

  it('pagina e calcula páginas com reticências', () => {
    const pagina = paginarCandidaturas(LISTA, 1, 2);
    expect(pagina).toMatchObject({ total: 5, totalPaginas: 3, paginaAtual: 1, inicio: 1, fim: 2 });
    expect(paginarCandidaturas(LISTA, 3, 2).itens).toHaveLength(1);
    expect(paginasVisiveis(3, 1)).toEqual([1, 2, 3]);
    expect(paginasVisiveis(10, 5)).toEqual([1, 'gap', 4, 5, 6, 'gap', 10]);
  });

  it('estilo de origem é determinístico e neutro no desconhecido', () => {
    expect(estiloOrigem('LinkedIn')).toBe(estiloOrigem('linkedin'));
    expect(estiloOrigem('Origem Inédita')).toContain('text-muted-foreground');
  });
});
