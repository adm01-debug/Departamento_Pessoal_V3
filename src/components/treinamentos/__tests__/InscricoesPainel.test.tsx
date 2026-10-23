import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InscricoesPainel } from '../InscricoesPainel';
import type { Certificado } from '../certificadosDerivacoes';
import type { InscricaoRegistro } from '../inscricoesDerivacoes';

const CURSOS = [
  { id: 'curso-1', nome: 'Integração e Cultura Organizacional', categoria: 'Onboarding' },
  { id: 'curso-2', nome: 'Comunicação Assertiva', categoria: 'Desenvolvimento Pessoal' },
];

const COLABORADORES = [
  {
    id: 'col-1',
    nome_completo: 'Carlos Eduardo Lima',
    foto_url: null,
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
];

const INSCRICOES: InscricaoRegistro[] = [
  {
    id: 'i1',
    colaborador_id: 'col-1',
    curso_id: 'curso-1',
    status: 'concluido',
    data_inicio: '2026-01-15',
    data_conclusao: '2026-01-20',
  },
  { id: 'i2', colaborador_id: 'col-2', curso_id: 'curso-2', status: 'em_andamento', data_inicio: '2026-08-01' },
  { id: 'i3', colaborador_id: 'col-1', curso_id: 'curso-2', status: 'inscrito', data_inicio: '2026-09-01' },
  { id: 'i4', colaborador_id: 'col-2', curso_id: 'curso-1', status: 'em_andamento', data_inicio: '2026-08-10' },
  {
    id: 'i5',
    colaborador_id: 'col-1',
    curso_id: 'curso-1',
    status: 'concluido',
    data_inicio: '2025-06-10',
    data_conclusao: '2025-06-15',
  },
  { id: 'i6', colaborador_id: 'col-2', curso_id: 'curso-2', status: 'inscrito', data_inicio: '2026-09-15' },
  {
    id: 'i7',
    colaborador_id: 'col-1',
    curso_id: 'curso-2',
    status: 'concluido',
    data_inicio: '2025-08-25',
    data_conclusao: '2025-08-28',
  },
  {
    id: 'i8',
    colaborador_id: 'col-2',
    curso_id: 'curso-1',
    status: 'concluido',
    data_inicio: '2025-06-10',
    data_conclusao: '2025-06-15',
  },
];

const CERTIFICADOS = [
  { id: 'cert-1', colaboradorId: 'col-1', cursoId: 'curso-1' },
  { id: 'cert-2', colaboradorId: 'col-2', cursoId: 'curso-2' },
] as Certificado[];

function renderizar(inscricoes: InscricaoRegistro[] = INSCRICOES, onVerCertificado = vi.fn()) {
  const resultado = render(
    <InscricoesPainel
      inscricoes={inscricoes}
      cursos={CURSOS}
      colaboradores={COLABORADORES}
      certificados={CERTIFICADOS}
      onVerCertificado={onVerCertificado}
    />
  );
  return { ...resultado, onVerCertificado };
}

describe('InscricoesPainel', () => {
  it('renderiza as oito inscrições, com nomes, cursos, departamentos e categorias', () => {
    const { container } = renderizar();
    expect(container.querySelectorAll('[data-inscricao-row]')).toHaveLength(8);
    expect(screen.getAllByText('Carlos Eduardo Lima').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Integração e Cultura Organizacional').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tecnologia · Desenvolvedor').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Onboarding').length).toBeGreaterThan(0);
    expect(screen.getByText('Mostrando 1–8 de 8 inscrições')).toBeInTheDocument();
  });

  it('mostra status humano e não exibe o código técnico', () => {
    renderizar();
    expect(screen.getAllByText('Em andamento').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Concluído').length).toBeGreaterThan(0);
    expect(screen.queryByText('em_andamento')).not.toBeInTheDocument();
    expect(screen.queryByText('concluido')).not.toBeInTheDocument();
  });

  it('mostra Não informado quando não existe progresso real', () => {
    renderizar();
    expect(screen.getAllByText('Não informado').length).toBeGreaterThan(0);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('filtra pela badge e mantém o dropdown de status sincronizado', async () => {
    const { container } = renderizar();
    const badge = container.querySelector('[data-segmento="em_andamento"]') as HTMLElement;
    await userEvent.click(badge);
    expect(container.querySelectorAll('[data-inscricao-row]')).toHaveLength(2);
    expect(within(screen.getByLabelText('Status')).getByText('Em andamento')).toBeInTheDocument();
    expect(badge).toHaveAttribute('aria-pressed', 'true');
  });

  it('busca por colaborador/curso e oferece o estado vazio com limpeza', async () => {
    const { container } = renderizar();
    const busca = screen.getByLabelText('Buscar inscrições por colaborador ou curso');
    await userEvent.type(busca, 'fernanda');
    expect(container.querySelectorAll('[data-inscricao-row]')).toHaveLength(4);
    await userEvent.clear(busca);
    await userEvent.type(busca, 'curso inexistente');
    expect(screen.getByText('Nenhuma inscrição encontrada')).toBeInTheDocument();
    expect(screen.getByText('Ajuste os filtros para visualizar outras inscrições.')).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Limpar filtros' }).at(-1) as HTMLElement);
    expect(container.querySelectorAll('[data-inscricao-row]')).toHaveLength(8);
  });

  it('aciona o certificado existente e não cria botão para quem não tem certificado', async () => {
    const { container, onVerCertificado } = renderizar();
    const linhas = container.querySelectorAll('[data-inscricao-row]');
    const comCertificado = linhas[0] as HTMLElement;
    const semCertificado = linhas[2] as HTMLElement;
    await userEvent.click(within(comCertificado).getByRole('button', { name: /certificado/i }));
    expect(onVerCertificado).toHaveBeenCalledWith(expect.objectContaining({ id: 'cert-1' }));
    expect(within(semCertificado).queryByRole('button', { name: /certificado/i })).not.toBeInTheDocument();
  });

  it('pagina em 10 itens e não exibe página inexistente', async () => {
    const muitas = Array.from({ length: 12 }, (_, indice) => ({
      ...INSCRICOES[indice % INSCRICOES.length],
      id: `pagina-${indice}`,
    }));
    const { container } = renderizar(muitas);
    expect(container.querySelectorAll('[data-inscricao-row]')).toHaveLength(10);
    await userEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(container.querySelectorAll('[data-inscricao-row]')).toHaveLength(2);
    expect(screen.getByText('Mostrando 11–12 de 12 inscrições')).toBeInTheDocument();
  });
});
