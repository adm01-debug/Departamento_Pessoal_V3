import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { supabase } from '@/integrations/supabase/client';
import { TrainingCover } from '../TrainingCover';
import { TurmaCard } from '../TurmaCard';
import { CertificadoCard } from '../CertificadoCard';
import { TreinamentoCursoCard } from '../TreinamentoCursoCard';
import { TrilhaBanner } from '../TrilhaBanner';
import { tomBannerTrilha } from '../TrilhaBanner';
import { montarTurmas, type CursoTurma } from '../turmasDerivacoes';
import type { CursoCatalogo } from '../treinamentosDerivacoes';
import type { Certificado } from '../certificadosDerivacoes';

/**
 * ============================================================================
 * CAPAS DAS QUATRO ÁREAS — comportamento visual sem OpenAI.
 *
 * Cada asserção corresponde a um requisito do plano:
 * curso/trilha sem imagem → fallback; turma herda o curso; certificado tem
 * miniatura própria; URL válida aparece; URL quebrada cai no fallback; nada
 * fica carregando; nada consulta outra empresa; nenhuma chamada externa.
 * ============================================================================
 */

const CURSO: CursoCatalogo = {
  id: 'curso-1',
  nome: 'Panificação Artesanal',
  descricao: 'Fermentação natural e modelagem.',
  categoria: 'Panificação',
  modalidade: 'presencial',
  carga_horaria: 8,
  obrigatorio: false,
  imagem_url: null,
};

const CURSOS_TURMA: CursoTurma[] = [
  {
    id: 'curso-nr17',
    nome: 'NR-17 Ergonomia',
    categoria: 'Segurança do Trabalho',
    modalidade: 'presencial',
    carga_horaria: 4,
    imagem_url: 'https://example.test/nr17.webp',
  },
];

function turma() {
  return montarTurmas(
    [
      {
        id: 'inst-1',
        curso_id: 'curso-nr17',
        data_inicio: '2026-09-01T12:00:00Z',
        status: 'em_curso',
        capacidade_maxima: 20,
        local_link: 'Sala 01',
      },
    ],
    CURSOS_TURMA
  )[0];
}

function certificado(extra: Partial<Certificado> = {}): Certificado {
  return {
    id: 'cert-1',
    cursoId: 'curso-nr17',
    cursoNome: 'NR-17 Ergonomia',
    categoria: 'Segurança do Trabalho',
    cargaHoraria: '4h',
    imagemUrl: null,
    colaboradorId: 'col-1',
    colaboradorNome: 'Mariana Oliveira',
    colaboradorFoto: null,
    colaboradorCargo: 'Analista de RH',
    dataEmissao: '2026-02-20T12:00:00Z',
    emissao: new Date('2026-02-20T12:00:00Z'),
    validade: new Date('2028-02-20T12:00:00Z'),
    validadeTexto: '20/02/2028',
    detalheValidade: null,
    codigo: 'CERT-ABC-123',
    situacao: 'valido',
    diasValidade: 300,
    ...extra,
  };
}

const SEM_IMAGEM = '[data-training-cover-estado="fallback"]';
const COM_IMAGEM = '[data-training-cover-estado="imagem"]';

describe('TrainingCover — imagem real', () => {
  it('exibe a URL válida com enquadramento cover e overlays de CSS', () => {
    const { container } = render(
      <TrainingCover tipo="course" nome="NR-17 Ergonomia" imagemUrl="https://example.test/capa.webp" />
    );

    const capa = container.querySelector(COM_IMAGEM);
    expect(capa).not.toBeNull();
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://example.test/capa.webp');
    expect(img).toHaveClass('object-cover');
    expect(img).toHaveClass('h-full');
    expect(img).toHaveClass('w-full');
    // Os efeitos são spans de CSS, não pixels gravados na imagem.
    expect(capa?.querySelectorAll('span').length).toBeGreaterThanOrEqual(2);
  });

  it('URL indisponível cai no fallback e não deixa a capa vazia', () => {
    const { container } = render(
      <TrainingCover tipo="course" nome="NR-17 Ergonomia" imagemUrl="https://example.test/quebrada.webp" />
    );

    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    fireEvent.error(img as Element);

    expect(container.querySelector(COM_IMAGEM)).toBeNull();
    expect(container.querySelector(SEM_IMAGEM)).not.toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  it('não usa URL externa quando não recebe imagem', () => {
    const { container } = render(<TrainingCover tipo="course" nome="Curso sem capa" />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('img[src]')).toBeNull();
    expect(container.querySelector('[style*="url(http"]')).toBeNull();
  });
});

describe('Fallbacks das quatro áreas', () => {
  it('curso sem imagem mostra a capa provisória da categoria', () => {
    const { container } = render(<TreinamentoCursoCard curso={CURSO} onExcluir={vi.fn()} />);
    const capa = container.querySelector('[data-training-cover="course"]');
    expect(capa).toHaveAttribute('data-training-cover-estado', 'fallback');
    expect(within(capa as HTMLElement).getByText('Panificação')).toBeInTheDocument();
  });

  it('trilha sem imagem mantém o banner ilustrado aprovado', () => {
    const { container } = render(
      <TrilhaBanner
        tom={tomBannerTrilha('basico')}
        nivel="Básico"
        titulo="Jornada de Liderança"
        descricao="Do primeiro time à gestão de resultados."
      />
    );
    const capa = container.querySelector('[data-training-cover="learning_path"]');
    expect(capa).toHaveAttribute('data-training-cover-estado', 'fallback');
    expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Jornada de Liderança')).toBeInTheDocument();
  });

  it('trilha com imagem usa a capa real sem perder título e nível', () => {
    const { container } = render(
      <TrilhaBanner
        tom={tomBannerTrilha('avancado')}
        nivel="Avançado"
        titulo="Trilha de Tecnologia"
        imagemUrl="https://example.test/trilha.webp"
      />
    );
    expect(container.querySelector('[data-training-cover="learning_path"]')).toHaveAttribute(
      'data-training-cover-estado',
      'imagem'
    );
    expect(screen.getByText('Trilha de Tecnologia')).toBeInTheDocument();
    expect(screen.getByText('Avançado')).toBeInTheDocument();
  });

  it('turma herda a capa do curso correspondente', () => {
    const { container } = render(<TurmaCard turma={turma()} onAbrir={vi.fn()} />);
    const capa = container.querySelector('[data-training-cover="training_session"]');
    expect(capa).toHaveAttribute('data-training-cover-estado', 'imagem');
    expect(capa?.querySelector('img')).toHaveAttribute('src', 'https://example.test/nr17.webp');
    // Título/categoria continuam dentro do cabeçalho da imagem.
    expect(container.querySelector('[data-turma-header] [data-turma-titulo]')).not.toBeNull();
  });

  it('certificado apresenta miniatura estruturada (nunca documento oficial)', () => {
    const { container } = render(<CertificadoCard certificado={certificado()} onVisualizar={vi.fn()} />);
    const capa = container.querySelector('[data-training-cover="certificate"]');
    expect(capa).toHaveAttribute('data-training-cover-estado', 'fallback');
    expect(capa).toHaveAttribute('data-training-cover-formato', 'miniatura');
    expect(screen.getByText('Certificado')).toBeInTheDocument();
    expect(screen.getByText('Prévia')).toBeInTheDocument();
    // Miniatura é decorativa: sem `<img>` e sem dados do colaborador dentro dela.
    expect(capa?.querySelector('img')).toBeNull();
    expect(capa?.textContent).not.toContain('Mariana Oliveira');
    expect(capa?.textContent).not.toContain('CERT-ABC-123');
  });
});

describe('Consistência e ausência de efeitos colaterais', () => {
  const assuntos = [
    { nome: 'Panificação Artesanal', categoria: 'Panificação' },
    { nome: 'NR-35 Trabalho em Altura', categoria: 'Segurança do Trabalho' },
    { nome: 'Liderança e Gestão de Equipes', categoria: 'Liderança' },
    { nome: 'Fundamentos de Tecnologia', categoria: 'Tecnologia' },
    { nome: 'Primeiros Socorros', categoria: 'Primeiros Socorros' },
  ];

  it('assuntos diferentes geram fallbacks consistentes e estáveis', () => {
    for (const assunto of assuntos) {
      const { container, unmount } = render(
        <TrainingCover tipo="course" nome={assunto.nome} categoria={assunto.categoria} />
      );
      const capa = container.querySelector(SEM_IMAGEM);
      expect(capa).not.toBeNull();
      expect(capa?.querySelector('svg')).not.toBeNull();
      expect(container.querySelector('img')).toBeNull();
      unmount();
    }
  });

  it('nunca fica carregando: sem spinner, skeleton ou animação contínua', () => {
    const { container } = render(<TrainingCover tipo="course" nome="Curso sem capa" />);
    expect(container.querySelector('.animate-spin')).toBeNull();
    expect(container.querySelector('.animate-pulse')).toBeNull();
    expect(container.querySelector('[role="progressbar"]')).toBeNull();
    expect(container.textContent).not.toMatch(/carregando/i);
  });

  it('não consulta o banco nem dispara fetch ao renderizar as capas', () => {
    const fromSpy = vi.spyOn(supabase, 'from');
    const storageSpy = vi.spyOn(supabase.storage, 'from');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    render(
      <div>
        <TreinamentoCursoCard curso={CURSO} onExcluir={vi.fn()} />
        <TurmaCard turma={turma()} onAbrir={vi.fn()} />
        <CertificadoCard certificado={certificado()} onVisualizar={vi.fn()} />
      </div>
    );

    expect(fromSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('preserva as ações existentes dos cards', () => {
    render(<TreinamentoCursoCard curso={CURSO} onExcluir={vi.fn()} />);
    expect(screen.getByRole('button', { name: /ver curso panificação artesanal/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ações do curso panificação artesanal/i })).toBeInTheDocument();
  });

  it('a capa preenche o contêiner (sem largura fixa própria)', () => {
    const { container } = render(<TrainingCover tipo="course" nome="Curso" />);
    const capa = container.querySelector('[data-training-cover="course"]');
    expect(capa).toHaveClass('h-full');
    expect(capa).toHaveClass('w-full');
    expect(capa?.className).not.toMatch(/\bw-\[\d/);
  });
});

describe('Renovação da capa (sem reload)', () => {
  it('volta a tentar quando chega uma URL nova depois de uma falha', () => {
    const { container, rerender } = render(
      <TrainingCover tipo="course" nome="Curso" imagemUrl="https://example.test/antiga.webp" />
    );

    fireEvent.error(container.querySelector('img') as Element);
    expect(container.querySelector(SEM_IMAGEM)).not.toBeNull();

    rerender(<TrainingCover tipo="course" nome="Curso" imagemUrl="https://example.test/nova.webp" />);

    expect(container.querySelector(COM_IMAGEM)).not.toBeNull();
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.test/nova.webp');
  });

  it('a turma troca do fallback para a capa quando o curso recebe imagem', () => {
    const semCapa = montarTurmas(
      [
        {
          id: 'inst-1',
          curso_id: 'curso-sem-capa',
          data_inicio: '2026-09-01T12:00:00Z',
          status: 'em_curso',
          capacidade_maxima: 20,
        },
      ],
      [{ id: 'curso-sem-capa', nome: 'Liderança e Gestão de Equipes', categoria: 'Liderança' }]
    )[0];

    const { container, rerender } = render(<TurmaCard turma={semCapa} onAbrir={vi.fn()} />);
    expect(container.querySelector('[data-training-cover="training_session"]')).toHaveAttribute(
      'data-training-cover-estado',
      'fallback'
    );

    rerender(<TurmaCard turma={{ ...semCapa, imagemUrl: 'https://example.test/lideranca.webp' }} onAbrir={vi.fn()} />);

    expect(container.querySelector('[data-training-cover="training_session"]')).toHaveAttribute(
      'data-training-cover-estado',
      'imagem'
    );
  });
});
