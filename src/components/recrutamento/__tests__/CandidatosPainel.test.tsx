import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CandidatosPainel } from '../CandidatosPainel';
import { criarCandidatura, criarVaga } from './candidatosFixture';
import type { CandidaturaComRelacoes } from '@/types/recrutamento';

const VAGAS = [
  criarVaga(),
  criarVaga({ id: 'vaga-2', titulo: 'Analista de Dados', departamento: 'Tecnologia', modalidade: 'Remoto' }),
];

function lista(qtd = 10): CandidaturaComRelacoes[] {
  return Array.from({ length: qtd }, (_, i) => {
    const base = criarCandidatura();
    return criarCandidatura({
      id: `cand-${i + 1}`,
      vaga_id: i % 2 === 0 ? 'vaga-1' : 'vaga-2',
      status: i === 1 ? 'contratado' : i === 9 ? 'rejeitado' : 'em_andamento',
      etapa: i === 1 ? 'contratado' : ['triagem', 'entrevista', 'teste', 'proposta'][i % 4],
      nota_geral: i % 3 === 0 ? null : 4 + (i % 5) / 10,
      updated_at: `2026-08-${String(28 - i).padStart(2, '0')}T12:00:00Z`,
      candidato: {
        ...base.candidato!,
        id: `pessoa-${i + 1}`,
        nome: `Candidato ${String(i + 1).padStart(2, '0')}`,
        origem: ['LinkedIn', 'Indeed', 'Site', 'Gupy', 'Indicação'][i % 5],
        pretensao_salarial: i === 8 ? null : 8000 + i * 500,
        experiencia_anos: i === 7 ? null : i + 2,
      },
      vaga:
        i % 2 === 0
          ? { titulo: 'Desenvolvedor(a) Full Stack Sênior', departamento: 'Tecnologia' }
          : { titulo: 'Analista de Dados', departamento: 'Tecnologia' },
    });
  });
}

function renderizar(
  candidaturas: CandidaturaComRelacoes[] = lista(),
  extras: { erro?: boolean; retry?: () => void } = {}
) {
  const onVerPerfil = vi.fn();
  const onMoverEtapa = vi.fn();
  const utils = render(
    <CandidatosPainel
      candidaturas={candidaturas}
      vagas={VAGAS}
      onVerPerfil={onVerPerfil}
      onMoverEtapa={onMoverEtapa}
      erro={extras.erro}
      onTentarNovamente={extras.retry}
    />
  );
  return { ...utils, onVerPerfil, onMoverEtapa };
}

const tabela = (container: HTMLElement) => container.querySelector('table') as HTMLTableElement;
const linhas = (container: HTMLElement) => [...tabela(container).querySelectorAll('tbody tr')];

describe('CandidatosPainel — indicadores e tabela', () => {
  it('mostra as cinco contagens reais e oito linhas na primeira página', () => {
    const { container } = renderizar();
    expect(screen.getByRole('button', { name: /Todos\s*10/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Em processo\s*8/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Contratados\s*1/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reprovados\s*1/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Arquivados\s*0/ })).toBeInTheDocument();
    expect(linhas(container)).toHaveLength(8);
    expect(screen.getByText(/Mostrando/)).toHaveTextContent('1–8 de 10 candidatos');
  });

  it('usa os indicadores como filtros e não perde a sincronização', async () => {
    const { container } = renderizar();
    await userEvent.click(screen.getByRole('button', { name: /Contratados/ }));
    expect(linhas(container)).toHaveLength(1);
    expect(screen.getByRole('button', { name: /Contratados/ })).toHaveAttribute('aria-pressed', 'true');
    expect(within(linhas(container)[0]).getByText('Contratado')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Todos/ }));
    expect(linhas(container)).toHaveLength(8);
  });

  it('mostra avatar (iniciais), origem, vaga, etapa, experiência, pretensão e avaliação reais', () => {
    const { container } = renderizar();
    const primeira = linhas(container)[0];
    expect(within(primeira).getByText('Candidato 01')).toBeInTheDocument();
    expect(within(primeira).getByText('LinkedIn')).toBeInTheDocument();
    expect(within(primeira).getByText('Desenvolvedor(a) Full Stack Sênior')).toBeInTheDocument();
    expect(within(primeira).getByText('Tecnologia · Remoto')).toBeInTheDocument();
    expect(within(primeira).getByText('Triagem')).toBeInTheDocument();
    expect(within(primeira).getByText('2 anos')).toBeInTheDocument();
    expect(within(primeira).getByText(/8\.000,00/)).toBeInTheDocument();
    expect(within(primeira).getByText('Não avaliado')).toBeInTheDocument();
  });

  it('usa estados neutros quando o dado não existe (sem inventar)', () => {
    const { container } = renderizar([
      criarCandidatura({
        nota_geral: null,
        etapa: null,
        candidato: {
          ...criarCandidatura().candidato!,
          nome: 'Sem Dados',
          origem: null,
          pretensao_salarial: null,
          experiencia_anos: null,
        },
        vaga_id: 'vaga-inexistente',
        vaga: null,
      }),
    ]);
    const linha = linhas(container)[0];
    expect(within(linha).getAllByText('Não informado').length).toBeGreaterThanOrEqual(2); // pretensão + experiência
    expect(within(linha).getByText('Não avaliado')).toBeInTheDocument();
    expect(within(linha).getByText('Vaga não informada')).toBeInTheDocument();
    expect(within(linha).getAllByText('Não informada').length).toBeGreaterThanOrEqual(2); // origem + etapa
  });
});

describe('CandidatosPainel — seleção, paginação e ações', () => {
  it('seleciona uma linha e mostra agregados reais; limpa a seleção', async () => {
    const { container } = renderizar();
    const segunda = linhas(container)[1];
    await userEvent.click(within(segunda).getByRole('checkbox'));
    expect(screen.getByText('1 selecionado')).toBeInTheDocument();
    expect(screen.getByText(/Avaliação média/)).toBeInTheDocument();
    expect(screen.getByText(/Pretensão média/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Limpar seleção/i }));
    expect(screen.queryByText('1 selecionado')).not.toBeInTheDocument();
  });

  it('seleciona todos apenas da página e reflete no cabeçalho', async () => {
    const { container } = renderizar();
    await userEvent.click(screen.getByRole('checkbox', { name: /Selecionar todos os candidatos da página/i }));
    expect(screen.getByText('8 selecionados')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Selecionar todos os candidatos da página/i })).toBeChecked();
    expect(linhas(container)).toHaveLength(8);
  });

  it('pagina sem duplicar registros e preserva as ações', async () => {
    const { container } = renderizar();
    await userEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(linhas(container)).toHaveLength(2);
    expect(screen.getByText(/Mostrando/)).toHaveTextContent('9–10 de 10 candidatos');
    expect(screen.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page');
  });

  it('abre o perfil pelo botão real da linha', async () => {
    const { container, onVerPerfil } = renderizar();
    await userEvent.click(within(linhas(container)[0]).getByRole('button', { name: /Ver perfil de Candidato 01/i }));
    expect(onVerPerfil).toHaveBeenCalledTimes(1);
  });

  it('oferece mover de etapa apenas para as outras etapas reais', async () => {
    const { container } = renderizar();
    const linha = linhas(container)[0]; // triagem
    await userEvent.click(within(linha).getByRole('button', { name: /Ações de Candidato 01/i }));
    expect(await screen.findByText('Mover para etapa')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Entrevista' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Triagem' })).not.toBeInTheDocument();
  });
});

describe('CandidatosPainel — estados', () => {
  it('explica ausência total de candidaturas', () => {
    renderizar([]);
    expect(screen.getByText('Nenhuma candidatura registrada')).toBeInTheDocument();
  });

  it('explica ausência de resultados após filtro', async () => {
    renderizar();
    await userEvent.click(screen.getByRole('button', { name: /Arquivados/ }));
    expect(screen.getByText('Nenhum candidato encontrado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Limpar filtros/i })).toBeInTheDocument();
  });

  it('não oculta erro de consulta e permite tentar novamente', async () => {
    const retry = vi.fn();
    renderizar([], { erro: true, retry });
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar os candidatos');
    await userEvent.click(screen.getByRole('button', { name: /Tentar novamente/i }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
