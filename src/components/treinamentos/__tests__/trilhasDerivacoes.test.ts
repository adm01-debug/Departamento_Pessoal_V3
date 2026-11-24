import { describe, it, expect } from 'vitest';
import {
  calcularMetricasTrilha,
  filtrarTrilhas,
  metaEtapa,
  nivelTrilha,
  opcoesStatusTrilha,
  ordenarVinculos,
  resumirInscritosTrilha,
  rotuloCursos,
  rotuloHoras,
  rotuloInscritos,
  statusTrilha,
  tituloTrilha,
  type InscricaoTrilha,
  type TrilhaCursoVinculo,
  type TrilhaRegistro,
} from '../trilhasDerivacoes';

const TRILHAS: TrilhaRegistro[] = [
  {
    id: 't1',
    titulo: 'Integração de Novos Colaboradores',
    descricao: 'Jornada de onboarding',
    nivel: 'basico',
    ativo: true,
  },
  { id: 't2', nome: 'Liderança e Alta Performance', descricao: 'Para gestores', nivel: 'intermediario', ativo: false },
  { id: 't3', titulo: 'Especialista Técnico', descricao: null, nivel: 'avancado' },
];

const VINCULOS: TrilhaCursoVinculo[] = [
  {
    id: 'v2',
    curso_id: 'c2',
    ordem: 2,
    obrigatorio: true,
    curso: { nome: 'LGPD', carga_horaria: 4, modalidade: 'online' },
  },
  {
    id: 'v1',
    curso_id: 'c1',
    ordem: 1,
    obrigatorio: false,
    curso: { nome: 'Integração', carga_horaria: '8', modalidade: 'presencial' },
  },
  // Vínculo repetido do mesmo curso: não pode inflar a contagem.
  { id: 'v3', curso_id: 'c2', ordem: 3, obrigatorio: true, curso: { nome: 'LGPD', carga_horaria: 4 } },
];

const INSCRICOES: InscricaoTrilha[] = [
  { colaborador_id: 'a', curso_id: 'c1', colaborador: { nome_completo: 'Ana Souza', foto_url: 'foto-a' } },
  { colaborador_id: 'a', curso_id: 'c2', colaborador: { nome_completo: 'Ana Souza' } },
  { colaborador_id: 'b', curso_id: 'c2', colaborador: { nome_completo: 'Bruno Lima' } },
  { colaborador_id: 'c', curso_id: 'fora', colaborador: { nome_completo: 'Fora da trilha' } },
];

describe('título, nível e status', () => {
  it('lê titulo ou nome (as duas colunas existentes)', () => {
    expect(tituloTrilha(TRILHAS[0])).toBe('Integração de Novos Colaboradores');
    expect(tituloTrilha(TRILHAS[1])).toBe('Liderança e Alta Performance');
    expect(tituloTrilha({ id: 'x' })).toBe('Trilha sem título');
  });

  it('traduz os três níveis reais e nunca inventa', () => {
    expect(nivelTrilha('basico')).toBe('Básico');
    expect(nivelTrilha('intermediario')).toBe('Intermediário');
    expect(nivelTrilha('avancado')).toBe('Avançado');
    expect(nivelTrilha('expert')).toBe('—');
    expect(nivelTrilha(null)).toBe('—');
  });

  it('distingue ativo=false de ativo ausente', () => {
    expect(statusTrilha(TRILHAS[0])).toBe('ativa');
    expect(statusTrilha(TRILHAS[1])).toBe('inativa');
    expect(statusTrilha(TRILHAS[2])).toBe('indefinido');
  });

  it('só oferece o filtro de status quando a coluna ativo existe', () => {
    expect(opcoesStatusTrilha(TRILHAS)).toHaveLength(2);
    expect(opcoesStatusTrilha([{ id: 'x' }])).toHaveLength(0);
  });
});

describe('filtrarTrilhas', () => {
  it('busca sem acento e sem caixa em título e descrição', () => {
    expect(filtrarTrilhas(TRILHAS, { busca: 'integracao' }).map((t) => t.id)).toEqual(['t1']);
    expect(filtrarTrilhas(TRILHAS, { busca: 'GESTORES' }).map((t) => t.id)).toEqual(['t2']);
  });

  it('filtra por nível e por status', () => {
    expect(filtrarTrilhas(TRILHAS, { nivel: 'avancado' }).map((t) => t.id)).toEqual(['t3']);
    expect(filtrarTrilhas(TRILHAS, { status: 'inativa' }).map((t) => t.id)).toEqual(['t2']);
    expect(filtrarTrilhas(TRILHAS, { nivel: 'todos', status: 'todos' })).toHaveLength(3);
  });

  it('devolve lista vazia quando nada casa (sem inventar registros)', () => {
    expect(filtrarTrilhas(TRILHAS, { busca: 'inexistente' })).toEqual([]);
  });
});

describe('ordenarVinculos', () => {
  it('respeita trilhas_cursos.ordem, não a ordem alfabética', () => {
    expect(ordenarVinculos(VINCULOS).map((v) => v.id)).toEqual(['v1', 'v2', 'v3']);
  });

  it('joga ordem ausente para o fim', () => {
    const semOrdem: TrilhaCursoVinculo[] = [
      { id: 'b', curso_id: 'cb', curso: { nome: 'B' } },
      { id: 'a', curso_id: 'ca', ordem: 1, curso: { nome: 'Z' } },
    ];
    expect(ordenarVinculos(semOrdem).map((v) => v.id)).toEqual(['a', 'b']);
  });
});

describe('métricas do card', () => {
  it('conta cursos únicos e soma a carga horária real', () => {
    const metricas = calcularMetricasTrilha(VINCULOS);
    expect(metricas.cursos).toBe(2);
    expect(metricas.horas).toBe(12);
    expect(metricas.horasCompletas).toBe(true);
    expect(rotuloCursos(metricas.cursos)).toBe('2 cursos');
    expect(rotuloHoras(metricas)).toBe('12 horas');
  });

  it('marca a soma como incompleta quando falta duração', () => {
    const metricas = calcularMetricasTrilha([
      { id: 'v1', curso_id: 'c1', curso: { carga_horaria: 8 } },
      { id: 'v2', curso_id: 'c2', curso: { carga_horaria: null } },
    ]);
    expect(metricas.horas).toBe(8);
    expect(metricas.horasCompletas).toBe(false);
    expect(rotuloHoras(metricas)).toBe('8 horas+');
  });

  it('devolve — quando nenhum curso tem carga horária', () => {
    const metricas = calcularMetricasTrilha([{ id: 'v1', curso_id: 'c1', curso: { carga_horaria: 0 } }]);
    expect(metricas.horasDisponiveis).toBe(false);
    expect(rotuloHoras(metricas)).toBe('—');
    expect(rotuloCursos(1)).toBe('1 curso');
  });

  it('sem vínculos: zero cursos e nenhuma hora', () => {
    const metricas = calcularMetricasTrilha([]);
    expect(metricas).toMatchObject({ cursos: 0, horas: 0, horasDisponiveis: false, horasCompletas: false });
  });
});

describe('inscritos da trilha', () => {
  it('conta colaboradores únicos dos cursos da trilha', () => {
    const resumo = resumirInscritosTrilha(VINCULOS, INSCRICOES);
    expect(resumo.total).toBe(2);
    expect(resumo.disponivel).toBe(true);
    expect(resumo.colaboradores.map((c) => c.nome)).toEqual(['Ana Souza', 'Bruno Lima']);
    expect(rotuloInscritos(resumo.total)).toBe('2 colaboradores inscritos');
  });

  it('preserva a foto apenas quando a origem traz foto_url', () => {
    const resumo = resumirInscritosTrilha(VINCULOS, INSCRICOES);
    expect(resumo.colaboradores[0].fotoUrl).toBe('foto-a');
    expect(resumo.colaboradores[1].fotoUrl).toBeNull();
  });

  it('sem cursos vinculados não afirma inscritos', () => {
    const resumo = resumirInscritosTrilha([], INSCRICOES);
    expect(resumo).toEqual({ total: 0, colaboradores: [], disponivel: false });
  });
});

describe('meta da etapa', () => {
  it('monta só as informações que existem', () => {
    expect(metaEtapa(VINCULOS[1])).toBe('8h · Presencial · Opcional');
    expect(metaEtapa(VINCULOS[0])).toBe('4h · Online · Obrigatório');
  });

  it('omite campos ausentes sem inventar', () => {
    expect(metaEtapa({ id: 'v', curso_id: 'c', curso: { nome: 'X' } })).toBe('Sem detalhes do curso');
  });
});
