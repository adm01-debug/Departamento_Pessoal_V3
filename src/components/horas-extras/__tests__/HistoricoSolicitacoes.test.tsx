import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { AprovacoesPendentes } from '../AprovacoesPendentes';
import { HistoricoSolicitacoes } from '../HistoricoSolicitacoes';
import type { PeriodoId, SolicitacaoHoraExtra } from '../horasExtrasComum';

function linha(over: Partial<SolicitacaoHoraExtra> = {}): SolicitacaoHoraExtra {
  return {
    id: 'sol-1',
    data: '2026-10-20',
    horas_solicitadas: 2.5,
    motivo: 'Fechamento de mês',
    status: 'pendente',
    created_at: '2026-10-18T12:00:00.000Z',
    colaborador: { nome_completo: 'Ana Souza', departamento: 'Financeiro' },
    ...over,
  };
}

/**
 * Handlers da TABELA. A linha conhece só três coisas: ver detalhes, excluir e
 * abrir o formulário de nova solicitação — aprovar/rejeitar não são da tabela
 * (moram nos cartões da fila e no diálogo "Ver detalhes").
 */
const handlers = () => ({
  onVerDetalhes: vi.fn(),
  onExcluir: vi.fn(),
  onNova: vi.fn(),
});

/**
 * Props da fila de aprovação: além dos handlers da tabela, ela recebe a DECISÃO
 * (aprovar/rejeitar) e o PERÍODO, que é estado da página — o componente só o
 * desenha no cabeçalho e devolve a escolha, então o teste injeta o valor atual
 * e espiona o callback.
 */
const fila = () => ({
  ...handlers(),
  onAprovar: vi.fn(),
  onRejeitar: vi.fn(),
  periodo: 'todos' as PeriodoId,
  onPeriodoChange: vi.fn(),
});

/**
 * Troca o filtro de status para a opção cujo texto começa com `prefixo`.
 *
 * O caminho é o de TECLADO porque é o que o `Select` do Radix expõe de forma
 * completa no jsdom: `pointerdown` abre o menu, mas a seleção do item mora no
 * `pointerup` com `pointerType: 'mouse'` — e o jsdom não constrói
 * `PointerEvent`, então o `pointerType` se perde no caminho. Com o teclado:
 * Enter abre, o typeahead do Radix destaca a opção pelo texto e o segundo
 * Enter aplica.
 */
/**
 * O `Select` do Radix chama `scrollIntoView` na opção ativa ao abrir o menu, e
 * o jsdom não implementa essa API: sem o stub, a abertura lança
 * `candidate?.scrollIntoView is not a function` e o foco nunca chega ao item.
 */
Element.prototype.scrollIntoView = () => {};

const escolherStatus = async (user: UserEvent, prefixo: string) => {
  screen.getByLabelText('Filtrar por status').focus();
  await user.keyboard(`{Enter}${prefixo}{Enter}`);
};

describe('AprovacoesPendentes', () => {
  it('mostra quem pediu, o que pediu e o selo de status', () => {
    const h = fila();
    render(<AprovacoesPendentes solicitacoes={[linha()]} {...h} />);

    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByText('Financeiro')).toBeInTheDocument();
    expect(screen.getByText('20/10/2026')).toBeInTheDocument();
    expect(screen.getByText('2h30')).toBeInTheDocument();
    expect(screen.getByText('Fechamento de mês')).toBeInTheDocument();
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });

  it('conta as solicitações no cabeçalho da fila', () => {
    const h = fila();
    render(<AprovacoesPendentes solicitacoes={[linha()]} {...h} />);
    expect(screen.getByText('1 solicitação')).toBeInTheDocument();

    render(<AprovacoesPendentes solicitacoes={[linha(), linha({ id: 'sol-2' })]} {...h} />);
    expect(screen.getByText('2 solicitações')).toBeInTheDocument();
  });

  it('mostra o PERÍODO no cabeçalho da seção e devolve a escolha à página', async () => {
    const user = userEvent.setup();
    const h = fila();
    render(<AprovacoesPendentes solicitacoes={[linha()]} {...h} />);

    // O filtro de período saiu da faixa de KPIs e mora aqui: é o MESMO estado
    // da página, então o componente só o desenha e repassa a mudança.
    const gatilho = screen.getByLabelText('Período');
    expect(gatilho).toHaveTextContent('Todo o período');

    gatilho.focus();
    await user.keyboard('{Enter}Este{Enter}');

    expect(h.onPeriodoChange).toHaveBeenCalledWith('mesAtual');
  });

  it('desenha o rótulo do preset selecionado (não corta nem inventa)', () => {
    const h = fila();
    render(<AprovacoesPendentes solicitacoes={[linha()]} {...h} periodo="30d" />);

    expect(screen.getByLabelText('Período')).toHaveTextContent('Últimos 30 dias');
  });

  it('repassa o registro aos três botões do cartão (nenhuma escrita mora no card)', async () => {
    const user = userEvent.setup();
    const h = fila();
    const s = linha();
    render(<AprovacoesPendentes solicitacoes={[s]} {...h} />);

    await user.click(screen.getByRole('button', { name: 'Ver detalhes' }));
    await user.click(screen.getByRole('button', { name: 'Aprovar' }));
    await user.click(screen.getByRole('button', { name: 'Rejeitar' }));

    expect(h.onVerDetalhes).toHaveBeenCalledWith(s);
    expect(h.onAprovar).toHaveBeenCalledWith(s);
    expect(h.onRejeitar).toHaveBeenCalledWith(s);
  });

  it('explica o vazio em vez de sumir da tela', () => {
    const h = fila();
    render(<AprovacoesPendentes solicitacoes={[]} {...h} />);

    expect(screen.getByText('Nenhuma aprovação pendente')).toBeInTheDocument();
    expect(screen.getByText(/aguardando decisão no período selecionado/i)).toBeInTheDocument();
  });
});

describe('HistoricoSolicitacoes', () => {
  const pendente = linha({ id: 'p', status: 'pendente' });
  const aprovada = linha({ id: 'a', status: 'aprovada', colaborador: { nome_completo: 'Bruno Lima' } });

  it('abre em "aprovadas e rejeitadas": pendentes ficam na fila de cima', () => {
    const h = handlers();
    render(<HistoricoSolicitacoes solicitacoes={[pendente, aprovada]} isLoading={false} {...h} />);

    expect(screen.getByText('Bruno Lima')).toBeInTheDocument();
    expect(screen.queryByText('Ana Souza')).not.toBeInTheDocument();
    expect(screen.getByText('Mostrando 1–1 de 1')).toBeInTheDocument();
  });

  it('o cabeçalho mostra um contador de registros — não um botão para outra vista', () => {
    const h = handlers();
    render(<HistoricoSolicitacoes solicitacoes={[pendente, aprovada]} isLoading={false} {...h} />);

    // A segunda interface de consulta não existe mais: nem botão, nem painel.
    expect(screen.queryByRole('button', { name: /ver todas/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // O contador é do PERÍODO e mostra o recorte: 1 linha visível de 2 registros.
    expect(screen.getByText('1 de 2 registros')).toBeInTheDocument();
    expect(screen.getByText('Mostrando 1–1 de 1')).toBeInTheDocument();
  });

  it('o contador respeita os filtros ativos (mostra o recorte e o total)', () => {
    const h = handlers();
    render(<HistoricoSolicitacoes solicitacoes={[pendente, aprovada]} isLoading={false} {...h} />);

    fireEvent.change(screen.getByLabelText('Buscar solicitações'), { target: { value: 'bruno' } });

    expect(screen.getByText('1 de 2 registros')).toBeInTheDocument();
    expect(screen.getByText('Mostrando 1–1 de 1')).toBeInTheDocument();
  });

  it('o filtro de status traz as pendentes para a tabela (consulta única e completa)', async () => {
    const user = userEvent.setup();
    const h = handlers();
    render(<HistoricoSolicitacoes solicitacoes={[pendente, aprovada]} isLoading={false} {...h} />);

    // Padrão: a pendente fica fora da tabela (ela está na fila de cima).
    expect(screen.queryByText('Ana Souza')).not.toBeInTheDocument();

    await escolherStatus(user, 'Todas as solicitações');

    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument();
    expect(screen.getByText('Mostrando 1–2 de 2')).toBeInTheDocument();
    // Nada foi descartado: o contador continua no total, sem "2 de 2".
    expect(screen.getByText('2 registros')).toBeInTheDocument();
  });

  it('"Limpar" nasce desabilitado e sem destaque (nada para limpar)', () => {
    const h = handlers();
    render(<HistoricoSolicitacoes solicitacoes={[aprovada]} isLoading={false} {...h} />);

    const limpar = screen.getByRole('button', { name: 'Limpar' });
    expect(limpar).toBeDisabled();
    expect(limpar).not.toHaveClass('text-primary');
  });

  it('"Limpar" acende no lime com filtro ativo e restaura a listagem ao clicar', () => {
    const h = handlers();
    render(<HistoricoSolicitacoes solicitacoes={[pendente, aprovada]} isLoading={false} {...h} />);

    const busca = screen.getByLabelText('Buscar solicitações');
    fireEvent.change(busca, { target: { value: 'bruno' } });

    const limpar = screen.getByRole('button', { name: 'Limpar' });
    expect(limpar).toBeEnabled();
    expect(limpar).toHaveClass('text-primary');
    expect(limpar).toHaveClass('bg-primary/10');

    fireEvent.click(limpar);

    expect(busca).toHaveValue('');
    expect(limpar).toBeDisabled();
    expect(screen.getByText('Mostrando 1–1 de 1')).toBeInTheDocument();
  });

  it('busca textual filtra por colaborador', () => {
    const h = handlers();
    render(<HistoricoSolicitacoes solicitacoes={[pendente, aprovada]} isLoading={false} {...h} />);

    fireEvent.change(screen.getByLabelText('Buscar solicitações'), { target: { value: 'bruno' } });
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Buscar solicitações'), { target: { value: 'zzz' } });
    expect(screen.getByText(/Nenhum resultado encontrado/i)).toBeInTheDocument();
  });

  it('ações da linha: olho e lixeira repassam o registro e não há menu de três pontos', async () => {
    const user = userEvent.setup();
    const h = handlers();
    render(<HistoricoSolicitacoes solicitacoes={[pendente]} isLoading={false} {...h} />);

    // A pendente só entra nesta tabela em "Todas as solicitações" — no padrão
    // ("Aprovadas e rejeitadas") ela está na fila de cima. Mesma tabela, mesma
    // linha, mesmos handlers.
    await escolherStatus(user, 'Todas as solicitações');

    // "Ver detalhes" é o ícone de olho (mesma ação, mesmo handler).
    await user.click(screen.getByRole('button', { name: 'Ver detalhes da solicitação' }));
    expect(h.onVerDetalhes).toHaveBeenCalledWith(pendente);

    // A decisão saiu da LINHA (mora nos cartões da fila de pendentes e no
    // diálogo "Ver detalhes", que o olho abre): nem menu, nem item de decisão.
    expect(screen.queryByRole('button', { name: 'Mais ações' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Aprovar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Rejeitar' })).not.toBeInTheDocument();

    // A lixeira mantém a CONFIRMAÇÃO antes de repassar a ação.
    await user.click(screen.getByRole('button', { name: 'Excluir solicitação' }));
    expect(await screen.findByText('Excluir solicitação')).toBeInTheDocument();
    expect(h.onExcluir).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(h.onExcluir).toHaveBeenCalledWith(pendente);
  });

  it('a coluna AÇÕES é idêntica em TODA linha: [ visualizar, excluir ] e mais nada', async () => {
    const user = userEvent.setup();
    const h = handlers();
    render(<HistoricoSolicitacoes solicitacoes={[pendente, aprovada]} isLoading={false} {...h} />);

    // Pendente (Ana) e aprovada (Bruno) lado a lado — o status não pode mudar a
    // composição da coluna: é exatamente aí que a tabela desalinhava.
    await escolherStatus(user, 'Todas as solicitações');
    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument();

    const linhas = screen.getAllByRole('row').slice(1); // sem o <tr> do cabeçalho
    expect(linhas).toHaveLength(2);

    linhas.forEach((linhaTabela) => {
      const botoes = within(linhaTabela).getAllByRole('button');

      // Mesma quantidade, mesma ordem e mesmos rótulos em qualquer status.
      expect(botoes.map((b) => b.getAttribute('aria-label'))).toEqual([
        'Ver detalhes da solicitação',
        'Excluir solicitação',
      ]);

      // Mesmas dimensões declaradas nos dois botões (29 × 29).
      botoes.forEach((botao) => expect(botao).toHaveClass('h-[29px]', 'w-[29px]'));

      // O PAR tem largura fixa e alinhamento à direita: o conjunto cai sempre na
      // mesma posição horizontal, com o mesmo vão de 6 px entre os botões.
      const par = botoes[0].parentElement as HTMLElement;
      expect(par).toHaveClass('w-[64px]', 'justify-end', 'items-center', 'gap-[6px]');
    });

    // Nenhuma linha ganhou o terceiro controle (menu de três pontos).
    expect(screen.queryByRole('button', { name: 'Mais ações' })).not.toBeInTheDocument();
  });

  it('linha já decidida mostra só olho e lixeira (nenhuma decisão a tomar)', async () => {
    const user = userEvent.setup();
    const h = handlers();
    render(<HistoricoSolicitacoes solicitacoes={[aprovada]} isLoading={false} {...h} />);

    expect(screen.getByRole('button', { name: 'Ver detalhes da solicitação' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excluir solicitação' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mais ações' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ver detalhes da solicitação' }));
    expect(h.onVerDetalhes).toHaveBeenCalledWith(aprovada);
  });

  it('a linha inteira escurece no hover — e SÓ o fundo muda', () => {
    const h = handlers();
    render(<HistoricoSolicitacoes solicitacoes={[pendente, aprovada]} isLoading={false} {...h} />);

    // O efeito mora no <tr>: um único bloco de pintura cobre a largura inteira
    // (colunas, vãos e a área dos botões), sem repetir fundo célula a célula.
    const linhaTabela = screen.getByText('Bruno Lima').closest('tr') as HTMLTableRowElement;
    expect(linhaTabela).toHaveClass('hover:bg-background/60');
    expect(linhaTabela).toHaveClass('transition-colors');
    expect(linhaTabela).toHaveClass('duration-200');

    // Nenhum outro efeito no hover: nada de opacidade, sombra, borda, cor de
    // texto, escala ou deslocamento — a caixa da linha não muda de tamanho.
    expect(linhaTabela.className).not.toMatch(/hover:(opacity|shadow|border|brightness|scale|translate|text)-/);
    expect(linhaTabela.className).not.toMatch(/\b(scale|translate|shadow|opacity)-/);

    // As células continuam transparentes: se uma delas pintasse o próprio
    // fundo, o hover deixaria de ser uniforme entre as colunas.
    for (const celula of Array.from(linhaTabela.querySelectorAll('td'))) {
      expect(celula.className).not.toMatch(/\bbg-/);
    }

    // O cabeçalho fica de fora (o realce é do registro sob o cursor).
    const cabecalho = screen.getByRole('columnheader', { name: /colaborador/i }).closest('tr')!;
    expect(cabecalho).toHaveClass('hover:bg-transparent');
  });

  it('lista vazia chama o cadastro em vez de ficar em branco', () => {
    const h = handlers();
    render(<HistoricoSolicitacoes solicitacoes={[]} isLoading={false} {...h} />);

    expect(screen.getByText(/Nenhum registro de hora extra encontrado/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Criar registro de hora extra/i }));
    expect(h.onNova).toHaveBeenCalled();
  });

  it('mostra o carregamento enquanto a consulta não chega', () => {
    const h = handlers();
    render(<HistoricoSolicitacoes solicitacoes={[]} isLoading {...h} />);

    expect(screen.getByText('Carregando solicitações…')).toBeInTheDocument();
  });
});
