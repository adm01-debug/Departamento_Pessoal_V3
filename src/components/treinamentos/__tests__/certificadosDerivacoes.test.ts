import { describe, expect, it } from 'vitest';
import {
  JANELA_A_VENCER_DIAS,
  classificarValidade,
  contarSituacoesCertificado,
  detalheValidade,
  filtrarCertificados,
  montarCertificados,
  opcoesCategoriaCertificado,
  ordenarCertificados,
  textoValidade,
  type CertificadoRegistro,
  type ColaboradorCertificado,
  type CursoCertificado,
} from '../certificadosDerivacoes';

const HOJE = new Date(2026, 9, 22); // 22/10/2026

const CURSOS: CursoCertificado[] = [
  {
    id: 'curso-1',
    nome: 'NR-17 Ergonomia',
    categoria: 'Segurança do Trabalho',
    carga_horaria: 4,
  },
  {
    id: 'curso-2',
    nome: 'Comunicação Assertiva',
    categoria: 'Desenvolvimento Pessoal',
    carga_horaria: 6,
  },
  { id: 'curso-3', nome: 'Curso sem categoria', categoria: null, carga_horaria: null },
];

const COLABORADORES: ColaboradorCertificado[] = [
  {
    id: 'col-1',
    nome_completo: 'Gustavo Henrique Alves',
    foto_url: 'https://example.test/gustavo.jpg',
    cargo: 'Vendedor Externo',
  },
  { id: 'col-2', nome_completo: 'Fernanda Costa Ribeiro', foto_url: null, cargo: null },
];

const REGISTROS: CertificadoRegistro[] = [
  {
    id: 'cert-valido',
    curso_id: 'curso-1',
    colaborador_id: 'col-1',
    data_emissao: '2026-01-20',
    data_validade: '2027-01-20',
    codigo_autenticacao: 'A1B2C3D4',
    arquivo_url: 'https://example.test/certificado.pdf',
  },
  {
    id: 'cert-a-vencer',
    curso_id: 'curso-2',
    colaborador_id: 'col-2',
    data_emissao: '2026-09-10',
    data_validade: '2026-11-05',
    codigo_autenticacao: 'E5F6A7B8',
  },
  {
    id: 'cert-vencido',
    curso_id: 'curso-1',
    colaborador_id: 'col-2',
    data_emissao: '2025-09-10',
    data_validade: '2026-09-10',
    codigo_autenticacao: '99AABBCC',
  },
  {
    id: 'cert-vitalicio',
    curso_id: 'curso-2',
    colaborador_id: 'col-1',
    data_emissao: '2025-06-15',
    data_validade: null,
    codigo_autenticacao: null,
  },
  {
    id: 'cert-sem-categoria',
    curso_id: 'curso-3',
    colaborador_id: 'col-2',
    data_emissao: '2026-04-20',
    data_validade: null,
    codigo_autenticacao: '55667788',
  },
];

const LISTA = montarCertificados(REGISTROS, CURSOS, COLABORADORES, HOJE);

describe('classificação de validade', () => {
  it('preserva a regra atual: data nula = vitalício', () => {
    expect(classificarValidade(null, HOJE)).toEqual({ situacao: 'vitalicio', dias: null });
    expect(classificarValidade('', HOJE).situacao).toBe('vitalicio');
    expect(textoValidade('vitalicio', null)).toBe('Vitalício');
  });

  it('não presume vitalício para data inválida', () => {
    expect(classificarValidade('data-invalida', HOJE)).toEqual({ situacao: 'sem_validade', dias: null });
    expect(textoValidade('sem_validade', null)).toBe('Validade não informada');
  });

  it('usa a janela de 30 dias já adotada pelo sistema', () => {
    expect(JANELA_A_VENCER_DIAS).toBe(30);
    expect(classificarValidade('2026-11-21', HOJE)).toEqual({ situacao: 'a_vencer', dias: 30 });
    expect(classificarValidade('2026-11-22', HOJE)).toEqual({ situacao: 'valido', dias: 31 });
    expect(classificarValidade('2026-10-22', HOJE)).toEqual({ situacao: 'a_vencer', dias: 0 });
    expect(classificarValidade('2026-10-21', HOJE)).toEqual({ situacao: 'vencido', dias: -1 });
  });

  it('descreve prazo com contagem real', () => {
    expect(detalheValidade('a_vencer', 0)).toBe('Vence hoje');
    expect(detalheValidade('a_vencer', 1)).toBe('Vence em 1 dia');
    expect(detalheValidade('a_vencer', 12)).toBe('Vence em 12 dias');
    expect(detalheValidade('vencido', -1)).toBe('Vencido há 1 dia');
    expect(detalheValidade('vencido', -12)).toBe('Vencido há 12 dias');
    expect(detalheValidade('valido', 60)).toBeNull();
    expect(detalheValidade('vitalicio', null)).toBeNull();
  });
});

describe('montagem do modelo', () => {
  it('junta curso e colaborador já carregados', () => {
    const certificado = LISTA[0];
    expect(certificado.cursoNome).toBe('NR-17 Ergonomia');
    expect(certificado.categoria).toBe('Segurança do Trabalho');
    expect(certificado.cargaHoraria).toBe('4h');
    expect(certificado.colaboradorNome).toBe('Gustavo Henrique Alves');
    expect(certificado.colaboradorFoto).toBe('https://example.test/gustavo.jpg');
    expect(certificado.colaboradorCargo).toBe('Vendedor Externo');
    expect(certificado.situacao).toBe('valido');
  });

  it('preserva o código original e ignora PDF como miniatura', () => {
    expect(LISTA[0].codigo).toBe('A1B2C3D4');
    expect(LISTA[0].imagemUrl).toBeNull();
    expect(LISTA[3].codigo).toBeNull();
  });

  it('mantém situações reais derivadas das datas', () => {
    expect(LISTA.map((c) => c.situacao)).toEqual(['valido', 'a_vencer', 'vencido', 'vitalicio', 'vitalicio']);
    expect(LISTA[1].detalheValidade).toBe('Vence em 14 dias');
    expect(LISTA[2].detalheValidade).toBe('Vencido há 42 dias');
  });
});

describe('busca e filtros', () => {
  it('busca por colaborador, curso e código', () => {
    expect(filtrarCertificados(LISTA, { busca: 'gustavo' }, HOJE).map((c) => c.id)).toEqual([
      'cert-valido',
      'cert-vitalicio',
    ]);
    expect(filtrarCertificados(LISTA, { busca: 'comunicação' }, HOJE).map((c) => c.id)).toEqual([
      'cert-a-vencer',
      'cert-vitalicio',
    ]);
    expect(filtrarCertificados(LISTA, { busca: 'a1b2c3d4' }, HOJE).map((c) => c.id)).toEqual(['cert-valido']);
  });

  it('filtra por situação real', () => {
    expect(filtrarCertificados(LISTA, { situacao: 'a_vencer' }, HOJE).map((c) => c.id)).toEqual(['cert-a-vencer']);
    expect(filtrarCertificados(LISTA, { situacao: 'vencido' }, HOJE).map((c) => c.id)).toEqual(['cert-vencido']);
    expect(filtrarCertificados(LISTA, { situacao: 'vitalicio' }, HOJE).map((c) => c.id)).toEqual([
      'cert-vitalicio',
      'cert-sem-categoria',
    ]);
    expect(filtrarCertificados(LISTA, { situacao: 'todos' }, HOJE)).toHaveLength(5);
  });

  it('combina situação + categoria', () => {
    expect(
      filtrarCertificados(LISTA, { situacao: 'vencido', categoria: 'seguranca do trabalho' }, HOJE).map((c) => c.id)
    ).toEqual(['cert-vencido']);
    expect(filtrarCertificados(LISTA, { situacao: 'valido', categoria: 'cultura' }, HOJE)).toEqual([]);
  });

  it('filtra pelo período de EMISSÃO, não de validade', () => {
    expect(filtrarCertificados(LISTA, { periodo: '30d' }, HOJE)).toEqual([]);
    expect(filtrarCertificados(LISTA, { periodo: '90d' }, HOJE).map((c) => c.id)).toEqual(['cert-a-vencer']);
    expect(filtrarCertificados(LISTA, { periodo: 'ano' }, HOJE).map((c) => c.id)).toEqual([
      'cert-valido',
      'cert-a-vencer',
      'cert-sem-categoria',
    ]);
    expect(filtrarCertificados(LISTA, { periodo: 'mes' }, HOJE)).toEqual([]);
  });

  it('conta as facetas ignorando a própria situação', () => {
    const contagens = contarSituacoesCertificado(LISTA);
    expect(contagens).toEqual({ todos: 5, valido: 1, a_vencer: 1, vencido: 1, vitalicio: 2 });

    const comOutrosFiltros = contarSituacoesCertificado(
      filtrarCertificados(LISTA, { categoria: 'seguranca do trabalho' }, HOJE)
    );
    expect(comOutrosFiltros).toEqual({ todos: 2, valido: 1, a_vencer: 0, vencido: 1, vitalicio: 0 });
  });
});

describe('ordenação e opções', () => {
  it('ordena por emissão, validade, curso e colaborador', () => {
    expect(ordenarCertificados(LISTA, 'recentes').map((c) => c.id)).toEqual([
      'cert-a-vencer',
      'cert-sem-categoria',
      'cert-valido',
      'cert-vencido',
      'cert-vitalicio',
    ]);
    expect(ordenarCertificados(LISTA, 'antigos')[0].id).toBe('cert-vitalicio');
    expect(ordenarCertificados(LISTA, 'validade')[0].id).toBe('cert-vencido');
    expect(ordenarCertificados(LISTA, 'validade').at(-1)?.id).toBe('cert-vitalicio');
    expect(ordenarCertificados(LISTA, 'curso')[0].cursoNome.localeCompare('Comunicação Assertiva', 'pt-BR')).toBe(0);
    expect(ordenarCertificados(LISTA, 'colaborador')[0].colaboradorNome).toBe('Fernanda Costa Ribeiro');
  });

  it('deriva categorias reais e inclui “Sem categoria”', () => {
    expect(opcoesCategoriaCertificado(LISTA)).toEqual([
      { value: 'desenvolvimento pessoal', label: 'Desenvolvimento Pessoal' },
      { value: 'seguranca do trabalho', label: 'Segurança do Trabalho' },
      { value: '__sem_categoria__', label: 'Sem categoria' },
    ]);
  });
});
