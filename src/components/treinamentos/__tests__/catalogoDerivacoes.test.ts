import { describe, it, expect } from 'vitest';
import {
  agruparInscricoesPorCurso,
  chaveModalidade,
  filtrarCursos,
  opcoesCategoriaCurso,
  opcoesModalidadeCurso,
  ordenarCursos,
  rotuloModalidade,
  type CursoCatalogo,
} from '../treinamentosDerivacoes';

const CURSOS: CursoCatalogo[] = [
  {
    id: 'c1',
    nome: 'Integração e Cultura Organizacional',
    descricao: 'Trilha de integração para novos colaboradores.',
    categoria: 'Onboarding',
    modalidade: 'online',
    carga_horaria: 8,
    obrigatorio: true,
    created_at: '2026-01-10T09:00:00Z',
  },
  {
    id: 'c2',
    nome: 'NR-17 Ergonomia',
    descricao: 'Saúde e bem-estar no ambiente de trabalho.',
    categoria: 'Segurança do Trabalho',
    modalidade: 'presencial',
    carga_horaria: 4,
    obrigatorio: true,
    created_at: '2026-03-10T09:00:00Z',
  },
  {
    id: 'c3',
    nome: 'Comunicação Assertiva',
    descricao: 'Técnicas de comunicação e feedback.',
    categoria: 'Desenvolvimento Pessoal',
    modalidade: 'hibrido',
    carga_horaria: 6,
    obrigatorio: false,
    created_at: '2026-02-01T09:00:00Z',
  },
  { id: 'c4', nome: 'Curso sem metadados', categoria: null, modalidade: null, created_at: null },
];

describe('modalidade', () => {
  it('mapeia valores reais para o rótulo do sistema', () => {
    expect(rotuloModalidade('online')).toBe('Online');
    expect(rotuloModalidade('presencial')).toBe('Presencial');
    expect(rotuloModalidade('hibrido')).toBe('Híbrido');
    expect(rotuloModalidade('Híbrido')).toBe('Híbrido');
  });

  it('não inventa modalidade ausente e preserva texto desconhecido', () => {
    expect(rotuloModalidade(null)).toBe('Não informada');
    expect(rotuloModalidade('imersivo')).toBe('Imersivo');
    expect(chaveModalidade('Híbrido')).toBe('hibrido');
  });
});

describe('filtros do catálogo', () => {
  it('busca sem acento e sem caixa em nome, descrição e categoria', () => {
    expect(filtrarCursos(CURSOS, { busca: 'comunicacao' }).map((c) => c.id)).toEqual(['c3']);
    expect(filtrarCursos(CURSOS, { busca: 'SEGURANCA' }).map((c) => c.id)).toEqual(['c2']);
    expect(filtrarCursos(CURSOS, { busca: 'onboarding' }).map((c) => c.id)).toEqual(['c1']);
  });

  it('filtra por categoria, modalidade e obrigatoriedade', () => {
    expect(filtrarCursos(CURSOS, { categoria: 'segurança do trabalho' }).map((c) => c.id)).toEqual(['c2']);
    expect(filtrarCursos(CURSOS, { modalidade: 'hibrido' }).map((c) => c.id)).toEqual(['c3']);
    expect(filtrarCursos(CURSOS, { obrigatoriedade: 'obrigatorio' }).map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(filtrarCursos(CURSOS, { obrigatoriedade: 'opcional' }).map((c) => c.id)).toEqual(['c3', 'c4']);
  });

  it('combina filtros e devolve vazio quando nada casa', () => {
    expect(filtrarCursos(CURSOS, { categoria: 'onboarding', modalidade: 'presencial' })).toEqual([]);
    expect(filtrarCursos(CURSOS, { categoria: 'todas', modalidade: 'todas', obrigatoriedade: 'todas' })).toHaveLength(
      4
    );
  });
});

describe('opções derivadas dos dados', () => {
  it('lista categorias reais, sem duplicar e ordenadas por rótulo', () => {
    expect(opcoesCategoriaCurso(CURSOS)).toEqual([
      { value: 'desenvolvimento pessoal', label: 'Desenvolvimento Pessoal' },
      { value: 'onboarding', label: 'Onboarding' },
      { value: 'seguranca do trabalho', label: 'Segurança do Trabalho' },
    ]);
  });

  it('lista modalidades reais com rótulo humano', () => {
    expect(opcoesModalidadeCurso(CURSOS)).toEqual([
      { value: 'hibrido', label: 'Híbrido' },
      { value: 'online', label: 'Online' },
      { value: 'presencial', label: 'Presencial' },
    ]);
  });
});

describe('ordenação do catálogo', () => {
  it('ordena por nome sem mutar a lista original', () => {
    const original = [...CURSOS];
    expect(ordenarCursos(CURSOS, 'nome').map((c) => c.nome)).toEqual([
      'Comunicação Assertiva',
      'Curso sem metadados',
      'Integração e Cultura Organizacional',
      'NR-17 Ergonomia',
    ]);
    expect(CURSOS).toEqual(original);
  });

  it('ordena por mais recentes, maior carga e obrigatórios primeiro', () => {
    expect(ordenarCursos(CURSOS, 'recentes').map((c) => c.id)).toEqual(['c2', 'c3', 'c1', 'c4']);
    expect(ordenarCursos(CURSOS, 'carga').map((c) => c.id)).toEqual(['c1', 'c3', 'c2', 'c4']);
    expect(ordenarCursos(CURSOS, 'obrigatorios').map((c) => c.id)).toEqual(['c1', 'c2', 'c3', 'c4']);
  });
});

describe('participação por curso', () => {
  const colaboradores = [
    { id: 'col-1', nome_completo: 'Ana Souza', foto_url: 'https://exemplo/ana.jpg' },
    { id: 'col-2', nome_completo: 'Carlos Lima', foto_url: null },
  ];

  it('conta colaboradores únicos e usa o cadastro para nome/foto', () => {
    const mapa = agruparInscricoesPorCurso(
      [
        { curso_id: 'c1', colaborador_id: 'col-1', colaborador: { nome_completo: 'Nome antigo' } },
        { curso_id: 'c1', colaborador_id: 'col-1' },
        { curso_id: 'c1', colaborador_id: 'col-2' },
        { curso_id: 'c2', colaborador_id: 'col-2' },
      ],
      colaboradores
    );

    expect(mapa.c1.inscritos).toBe(2);
    expect(mapa.c1.colaboradores[0]).toEqual({
      id: 'col-1',
      nome: 'Ana Souza',
      fotoUrl: 'https://exemplo/ana.jpg',
    });
    expect(mapa.c2.inscritos).toBe(1);
  });

  it('ignora inscrição sem curso e não cria cursos vazios', () => {
    const mapa = agruparInscricoesPorCurso([{ colaborador_id: 'col-1' }], colaboradores);
    expect(mapa).toEqual({});
  });

  it('cai no embed quando o colaborador não está na lista', () => {
    const mapa = agruparInscricoesPorCurso(
      [{ curso_id: 'c9', colaborador_id: 'col-9', colaborador: { nome_completo: 'Pessoa do Embed' } }],
      colaboradores
    );
    expect(mapa.c9).toEqual({
      inscritos: 1,
      colaboradores: [{ id: 'col-9', nome: 'Pessoa do Embed', fotoUrl: null }],
    });
  });
});
