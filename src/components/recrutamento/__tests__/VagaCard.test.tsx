import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CandidaturaComRelacoes, VagaRow } from '@/types/recrutamento';
import { VagaCard } from '../VagaCard';
import { montarVagasResumo } from '../vagasComum';

const REF = new Date(2026, 8, 11);

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

function candidatura(etapa: string, data = '2026-09-05T12:00:00Z'): CandidaturaComRelacoes {
  return {
    id: `cand-${etapa}`,
    empresa_id: 'empresa-1',
    vaga_id: 'vaga-1',
    candidato_id: `pessoa-${etapa}`,
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
    created_at: data,
    updated_at: data,
    candidato: null,
    vaga: null,
  } as unknown as CandidaturaComRelacoes;
}

function resumo(override: Partial<VagaRow> = {}, candidaturas: CandidaturaComRelacoes[] = []) {
  return montarVagasResumo([{ ...BASE, ...override }], candidaturas, REF)[0];
}

const CINCO = ['triagem', 'entrevista', 'teste', 'proposta', 'contratado'].map((etapa, indice) =>
  candidatura(etapa, `2026-09-0${indice + 2}T12:00:00Z`)
);

describe('VagaCard — identidade, funil e ações reais', () => {
  it('mostra título, departamento, modalidade, competências e o funil completo', () => {
    render(
      <VagaCard
        resumo={resumo({}, CINCO)}
        indice={0}
        onGerenciar={vi.fn()}
        onEditar={vi.fn()}
        onVerAnalises={vi.fn()}
        onExcluir={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: BASE.titulo })).toBeInTheDocument();
    expect(screen.getByText('Tecnologia')).toBeInTheDocument();
    expect(screen.getByText('Remoto')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('+2')).toHaveAttribute('title', 'Mais 2: SQL, AWS');

    const funil = document.querySelector('[data-vaga-funil]') as HTMLElement;
    expect(funil).toHaveTextContent(/5\s*candidatos/);
    for (const etapa of ['Triagem', 'Entrevista', 'Teste Técnico', 'Proposta', 'Contratado']) {
      expect(within(funil).getByText(etapa)).toBeInTheDocument();
    }
    expect(funil.textContent).toContain('Triagem1');
    expect(funil.textContent).toContain('Contratado1');
  });

  it('abre o Pipeline pelo botão Gerenciar Vaga', async () => {
    const onGerenciar = vi.fn();
    render(
      <VagaCard
        resumo={resumo()}
        indice={0}
        onGerenciar={onGerenciar}
        onEditar={vi.fn()}
        onVerAnalises={vi.fn()}
        onExcluir={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /Gerenciar vaga/i }));
    expect(onGerenciar).toHaveBeenCalledWith(expect.objectContaining({ id: 'vaga-1' }));
  });

  it('mantém apenas ações reais e não duplica Gerenciar no menu', async () => {
    const onVerAnalises = vi.fn();
    render(
      <VagaCard
        resumo={resumo()}
        indice={0}
        onGerenciar={vi.fn()}
        onEditar={vi.fn()}
        onVerAnalises={onVerAnalises}
        onExcluir={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /Ações da vaga/i }));
    const itens = await screen.findAllByRole('menuitem');
    expect(itens.map((item) => item.textContent?.trim())).toEqual(['Editar vaga', 'Ver análises', 'Excluir vaga']);
    expect(within(document.body).queryByRole('menuitem', { name: /Gerenciar/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('menuitem', { name: /Ver análises/i }));
    expect(onVerAnalises).toHaveBeenCalledTimes(1);
  });

  it('abre a edição da vaga pelo menu', async () => {
    const onEditar = vi.fn();
    render(
      <VagaCard
        resumo={resumo()}
        indice={0}
        onGerenciar={vi.fn()}
        onEditar={onEditar}
        onVerAnalises={vi.fn()}
        onExcluir={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /Ações da vaga/i }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /Editar vaga/i }));
    expect(onEditar).toHaveBeenCalledWith(expect.objectContaining({ id: 'vaga-1' }));
  });

  it('apenas NOTIFICA a exclusão: a confirmação é o AlertDialog da página', async () => {
    const onExcluir = vi.fn();
    render(
      <VagaCard
        resumo={resumo()}
        indice={0}
        onGerenciar={vi.fn()}
        onEditar={vi.fn()}
        onVerAnalises={vi.fn()}
        onExcluir={onExcluir}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /Ações da vaga/i }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /Excluir vaga/i }));

    expect(onExcluir).toHaveBeenCalledWith(expect.objectContaining({ id: 'vaga-1' }));
    // Nenhum segundo diálogo no card: quem confirma é a página.
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('mantém vaga fechada com data real de encerramento e funil histórico', () => {
    render(
      <VagaCard
        resumo={resumo({ status: 'fechada', data_encerramento: '2026-09-05' }, [candidatura('proposta')])}
        indice={0}
        onGerenciar={vi.fn()}
        onEditar={vi.fn()}
        onVerAnalises={vi.fn()}
        onExcluir={vi.fn()}
      />
    );

    expect(screen.getByText('Fechada')).toBeInTheDocument();
    expect(screen.getByText('Fechada há 6 dias')).toBeInTheDocument();
    expect(screen.getByText('Processo finalizado em 05/09/2026')).toBeInTheDocument();
    expect(document.querySelector('[data-vaga-funil]')).toHaveTextContent(/1\s*candidato/);
  });

  it('declara as candidaturas fora das etapas monitoradas em vez de sumir com elas', () => {
    render(
      <VagaCard
        resumo={resumo({}, [candidatura('teste_tecnico'), candidatura('em_banco_de_talentos')])}
        indice={0}
        onGerenciar={vi.fn()}
        onEditar={vi.fn()}
        onVerAnalises={vi.fn()}
        onExcluir={vi.fn()}
      />
    );

    const funil = document.querySelector('[data-vaga-funil]') as HTMLElement;
    expect(funil).toHaveTextContent(/2\s*candidatos/);
    // `teste_tecnico` cai na coluna Teste Técnico; o resto é declarado.
    expect(funil.textContent).toContain('Teste Técnico1');
    expect(within(funil).getByText('1 candidatura fora das etapas monitoradas')).toBeInTheDocument();
  });

  it('não inventa candidatos quando o funil está vazio', () => {
    render(
      <VagaCard
        resumo={resumo()}
        indice={0}
        onGerenciar={vi.fn()}
        onEditar={vi.fn()}
        onVerAnalises={vi.fn()}
        onExcluir={vi.fn()}
      />
    );

    expect(document.querySelector('[data-vaga-funil]')).toHaveTextContent(/0\s*candidatos/);
    expect(screen.getByText('Nenhum candidato ainda')).toBeInTheDocument();
  });
});
