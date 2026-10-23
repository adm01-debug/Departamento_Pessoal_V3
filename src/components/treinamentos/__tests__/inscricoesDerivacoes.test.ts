import { describe, expect, it } from 'vitest';
import {
  contarSegmentosInscricao,
  filtrarInscricoes,
  montarInscricoes,
  opcoesCursoInscricao,
  opcoesDepartamentoInscricao,
  opcoesStatusInscricao,
  paginarInscricoes,
  statusInscricao,
  type ColaboradorInscricao,
  type CursoInscricao,
  type InscricaoRegistro,
} from '../inscricoesDerivacoes';
import type { Certificado } from '../certificadosDerivacoes';

const CURSOS: CursoInscricao[] = [
  { id: 'curso-1', nome: 'Integração e Cultura Organizacional', categoria: 'Onboarding' },
  { id: 'curso-2', nome: 'Comunicação Assertiva', categoria: 'Desenvolvimento Pessoal' },
];

const COLABORADORES: ColaboradorInscricao[] = [
  {
    id: 'col-1',
    nome_completo: 'Carlos Eduardo Lima',
    foto_url: 'foto-1',
    cargo: 'Desenvolvedor',
    departamento: 'Tecnologia',
  },
  {
    id: 'col-2',
    nome_completo: 'Fernanda Costa Ribeiro',
    foto_url: null,
    cargo: 'Coordenadora',
    departamento: 'Financeiro',
  },
  { id: 'col-3', nome_completo: 'Ana Beatriz Souza', foto_url: null, cargo: 'Analista', departamento: 'Tecnologia' },
];

const REGISTROS: InscricaoRegistro[] = [
  {
    id: 'insc-1',
    colaborador_id: 'col-1',
    curso_id: 'curso-1',
    status: 'concluido',
    data_inicio: '2026-01-15',
    data_conclusao: '2026-01-20',
  },
  { id: 'insc-2', colaborador_id: 'col-2', curso_id: 'curso-2', status: 'em_andamento', data_inicio: '2026-08-01' },
  { id: 'insc-3', colaborador_id: 'col-3', curso_id: 'curso-1', status: 'inscrito', data_inicio: '2025-06-10' },
  { id: 'insc-4', colaborador_id: 'col-2', curso_id: 'curso-2', status: 'finalizado', data_inicio: '2026-10-01' },
];

const CERTIFICADO = {
  id: 'cert-1',
  colaboradorId: 'col-1',
  cursoId: 'curso-1',
  cursoNome: 'Integração e Cultura Organizacional',
  colaboradorNome: 'Carlos Eduardo Lima',
} as Certificado;

describe('montarInscricoes', () => {
  it('faz join de colaborador, curso e certificado sem inventar dados', () => {
    const [inscricao] = montarInscricoes([REGISTROS[0]], CURSOS, COLABORADORES, [CERTIFICADO]);
    expect(inscricao).toMatchObject({
      colaboradorNome: 'Carlos Eduardo Lima',
      colaboradorFoto: 'foto-1',
      colaboradorCargo: 'Desenvolvedor',
      colaboradorDepartamento: 'Tecnologia',
      cursoNome: 'Integração e Cultura Organizacional',
      categoria: 'Onboarding',
      dataInicioTexto: '15/01/2026',
      dataConclusaoTexto: '20/01/2026',
    });
    expect(inscricao.certificado?.id).toBe('cert-1');
  });

  it('preserva o status original e não exibe underscore no rótulo', () => {
    const [andamento] = montarInscricoes([REGISTROS[1]], CURSOS, COLABORADORES);
    expect(andamento.statusOriginal).toBe('em_andamento');
    expect(andamento.statusLabel).toBe('Em andamento');
    expect(andamento.statusLabel).not.toMatch(/_/);
    expect(statusInscricao('concluido').tom).toBe('sucesso');
    expect(statusInscricao('evento_personalizado')).toMatchObject({
      codigo: 'evento_personalizado',
      label: 'evento personalizado',
      tom: 'neutro',
    });
  });

  it('usa Não informado quando datas não existem e nunca transforma status em progresso', () => {
    const [inscricao] = montarInscricoes([REGISTROS[2]], CURSOS, COLABORADORES);
    expect(inscricao.dataConclusaoTexto).toBe('Não informado');
    expect(inscricao.progresso).toBeNull();
  });

  it('só aceita progresso explícito entre 0 e 100', () => {
    const registros: InscricaoRegistro[] = [
      { ...REGISTROS[0], id: 'p0', progresso: 0 },
      { ...REGISTROS[0], id: 'p100', progresso: '100' },
      { ...REGISTROS[0], id: 'p65', progresso: 65.4 },
      { ...REGISTROS[0], id: 'pneg', progresso: -1 },
      { ...REGISTROS[0], id: 'p101', progresso: 101 },
    ];
    expect(montarInscricoes(registros, CURSOS, COLABORADORES).map((i) => i.progresso)).toEqual([
      0,
      100,
      65,
      null,
      null,
    ]);
  });

  it('não associa certificado de outro colaborador ou curso', () => {
    const [inscricao] = montarInscricoes([REGISTROS[1]], CURSOS, COLABORADORES, [CERTIFICADO]);
    expect(inscricao.certificado).toBeNull();
  });
});

describe('filtrarInscricoes', () => {
  const todas = montarInscricoes(REGISTROS, CURSOS, COLABORADORES);
  const referencia = new Date(2026, 9, 22);

  it('busca por nome, curso, departamento e cargo, tolerando acentos', () => {
    expect(filtrarInscricoes(todas, { busca: 'comunicacao' })).toHaveLength(2);
    expect(filtrarInscricoes(todas, { busca: 'fernanda' })).toHaveLength(2);
    expect(filtrarInscricoes(todas, { busca: 'tecnologia' })).toHaveLength(2);
    expect(filtrarInscricoes(todas, { busca: 'Coordenadora' })).toHaveLength(2);
  });

  it('filtra por status canônico, curso e departamento', () => {
    expect(filtrarInscricoes(todas, { status: 'concluido' }).map((i) => i.id)).toEqual(['insc-1', 'insc-4']);
    expect(filtrarInscricoes(todas, { cursoId: 'curso-1' }).map((i) => i.id)).toEqual(['insc-1', 'insc-3']);
    expect(filtrarInscricoes(todas, { departamento: 'Tecnologia' }).map((i) => i.id)).toEqual(['insc-1', 'insc-3']);
  });

  it('filtra o período pela data de início e exclui registros sem data', () => {
    expect(filtrarInscricoes(todas, { periodo: '30d' }, referencia).map((i) => i.id)).toEqual(['insc-4']);
  });

  it('retorna vazio quando a combinação não existe', () => {
    expect(filtrarInscricoes(todas, { busca: 'inexistente' })).toEqual([]);
  });
});

describe('contadores, opções e paginação', () => {
  const todas = montarInscricoes(REGISTROS, CURSOS, COLABORADORES);

  it('conta badges com dados reais e desabilita Atrasados sem status real', () => {
    expect(contarSegmentosInscricao(todas)).toEqual({
      todos: 4,
      em_andamento: 1,
      concluidos: 2,
      inscritos: 1,
      atrasados: null,
    });
    const comAtraso = montarInscricoes(
      [{ ...REGISTROS[0], id: 'atrasada', status: 'atrasado' }],
      CURSOS,
      COLABORADORES
    );
    expect(contarSegmentosInscricao(comAtraso).atrasados).toBe(1);
  });

  it('gera opções de status/curso/departamento a partir dos dados', () => {
    expect(opcoesStatusInscricao(todas).map((opcao) => opcao.label)).toEqual([
      'Todos',
      'Em andamento',
      'Concluído',
      'Inscrito',
    ]);
    expect(opcoesCursoInscricao(CURSOS).map((opcao) => opcao.label)).toEqual([
      'Todos',
      'Comunicação Assertiva',
      'Integração e Cultura Organizacional',
    ]);
    expect(opcoesDepartamentoInscricao(todas).map((opcao) => opcao.value)).toEqual([
      'todos',
      'Financeiro',
      'Tecnologia',
    ]);
  });

  it('pagina sem página inexistente e calcula o intervalo exibido', () => {
    const muitas = Array.from({ length: 25 }, (_, indice) => ({ ...REGISTROS[0], id: `insc-${indice}` }));
    const pagina = paginarInscricoes(montarInscricoes(muitas, CURSOS, COLABORADORES), 3, 10);
    expect(pagina).toMatchObject({ paginaAtual: 3, totalPaginas: 3, total: 25, inicio: 21, fim: 25 });
    expect(pagina.itens).toHaveLength(5);
    expect(paginarInscricoes(pagina.itens, 99, 10).paginaAtual).toBe(1);
  });
});
