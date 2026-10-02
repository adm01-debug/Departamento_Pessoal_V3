import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

vi.mock('@/hooks/useContratacaoDigital', () => ({
  useContratacaoDigital: vi.fn(() => ({
    validarDocumento: { mutate: vi.fn(), isPending: false },
  })),
}));

vi.mock('@/hooks/useAdmissaoWorkflow', () => ({
  useAdmissaoWorkflow: vi.fn(() => ({ workflow: { historico: [] } })),
}));

vi.mock('@/hooks/useESocial', () => ({
  useESocial: vi.fn(() => ({ enviarEvento: vi.fn(), isSending: false })),
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-1' } })),
}));

vi.mock('@/components/admissoes/NovaAdmissaoDialog', () => ({
  NovaAdmissaoDialog: () => null,
}));

vi.mock('@/services/admissaoService', () => ({
  admissaoService: { cancelar: vi.fn() },
}));

vi.mock('@/services/contratacaoService', () => ({
  contratacaoService: { enviarLinkCandidato: vi.fn() },
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <span>{children}</span>,
  AlertDialogDescription: ({ children }: any) => <span>{children}</span>,
  AlertDialogAction: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  AlertDialogCancel: ({ children }: any) => <button>{children}</button>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/components/ui/button', () => ({
  // `title` repassado: é por ele que o "Ir para ação" anuncia o destino
  // (o restante continua com o duble mínimo, que ignora variant/size).
  Button: ({ children, onClick, title }: any) => (
    <button onClick={onClick} title={title}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}));

import { DetalhesAdmissaoDialog } from '../admissoes/DetalhesAdmissaoDialog';
import { useAdmissaoWorkflow } from '@/hooks/useAdmissaoWorkflow';

/** Histórico do workflow controlado por teste (o mock global devolve vazio). */
const mockWorkflow = (historico: any[]) =>
  vi.mocked(useAdmissaoWorkflow).mockReturnValue({ workflow: { historico }, isLoading: false } as any);

/** 5 eventos — mais do que os 3 que o card mostrava antes do refino. */
const MOCK_HISTORICO = [
  {
    id: 'h1',
    acao: 'Workflow iniciado',
    observacoes: 'Workflow de admissão iniciado automaticamente.',
    created_at: '2026-07-01T09:10:00Z',
    responsavel: 'Bruno Cardoso',
  },
  {
    id: 'h2',
    acao: 'Link enviado ao candidato',
    observacoes: 'E-mail com o link seguro de documentos enviado.',
    created_at: '2026-07-02T10:20:00Z',
  },
  {
    id: 'h3',
    acao: 'Documentos recebidos',
    observacoes: 'Pacote recebido e encaminhado para conferência do Departamento Pessoal.',
    created_at: '2026-07-03T11:30:00Z',
  },
  {
    id: 'h4',
    acao: 'Validação concluída',
    observacoes: 'Todos os documentos obrigatórios conferidos e aprovados pelo RH.',
    created_at: '2026-07-04T12:40:00Z',
  },
  {
    id: 'h5',
    acao: 'ASO agendado',
    observacoes: 'Exame admissional agendado na clínica parceira para a próxima semana.',
    created_at: '2026-07-05T13:50:00Z',
  },
];

const MOCK_ADMISSAO = {
  id: 'adm-1',
  nome: 'Fernanda Silva',
  cargo: 'Analista',
  departamento: 'RH',
  etapa: 'documentos',
  data_prevista: '2026-08-01',
  salario_proposto: 5000,
  cpf: '123.456.789-00',
  email: 'fernanda@test.com',
  created_at: '2026-07-01T00:00:00Z',
  checklist_documentos_pessoais: false,
  checklist_comprovante_endereco: false,
  checklist_ctps: false,
  checklist_exame_admissional: false,
  checklist_contrato_assinado: false,
};

describe('DetalhesAdmissaoDialog', () => {
  it('returns null when admissao is null', () => {
    const { container } = render(<DetalhesAdmissaoDialog admissao={null} open={true} onOpenChange={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders colaborador name in the header', () => {
    render(<DetalhesAdmissaoDialog admissao={MOCK_ADMISSAO} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('Fernanda Silva')).toBeInTheDocument();
  });

  it('renders the etapa badge label', () => {
    render(<DetalhesAdmissaoDialog admissao={MOCK_ADMISSAO} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('Docs Pendentes')).toBeInTheDocument();
  });

  it('renders the consolidated sections (no tabs)', () => {
    render(<DetalhesAdmissaoDialog admissao={MOCK_ADMISSAO} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('Progresso da Admissão')).toBeInTheDocument();
    expect(screen.getByText('Próxima ação')).toBeInTheDocument();
    expect(screen.getByText('Dados da admissão')).toBeInTheDocument();
    expect(screen.getAllByText('Documentos').length).toBeGreaterThan(0);
    expect(screen.getAllByText('eSocial').length).toBeGreaterThan(0);
    expect(screen.getByText('Histórico')).toBeInTheDocument();
  });

  it('no longer renders the Geral/Documentos/Histórico tabs', () => {
    render(<DetalhesAdmissaoDialog admissao={MOCK_ADMISSAO} open={true} onOpenChange={vi.fn()} />);
    expect(screen.queryByRole('tab', { name: /Geral/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Histórico/i })).not.toBeInTheDocument();
  });

  it('renders the real footer actions', () => {
    render(<DetalhesAdmissaoDialog admissao={MOCK_ADMISSAO} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('Cancelar admissão')).toBeInTheDocument();
    // Dois "Fechar": o botão do rodapé e o rótulo acessível (`sr-only`) do X, que
    // agora é montado pelo PRÓPRIO modal — o mesmo par que o `DialogContent`
    // padrão produzia, e o que o mock de `ui/dialog` escondia.
    expect(screen.getAllByText('Fechar')).toHaveLength(2);
    expect(screen.getByText('Editar informações')).toBeInTheDocument();
  });

  it('renders Ver Portal button', () => {
    render(<DetalhesAdmissaoDialog admissao={MOCK_ADMISSAO} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText(/Ver Portal/i)).toBeInTheDocument();
  });

  // ─── "Ir para ação" (Próxima ação → seção real da própria Central) ────────
  // O botão antigo ("Ver detalhes") fechava a janela e trocava de aba — o RH não
  // via ONDE executar. Agora ele salta, DENTRO do modal, para a seção da etapa
  // (mapa por CHAVE de etapa, nunca por texto) e a destaca por ~1s; quando a
  // etapa não tem destino real, o botão simplesmente não existe.
  describe('Ir para ação', () => {
    beforeEach(() => {
      // jsdom não implementa rolagem: o handler chama `scrollTo` na viewport.
      Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
    });

    it('troca "Ver detalhes" pelo salto à seção da próxima ação', () => {
      // `MOCK_ADMISSAO.etapa` = 'documentos' → destino "Documentos".
      render(<DetalhesAdmissaoDialog admissao={MOCK_ADMISSAO} open={true} onOpenChange={vi.fn()} />);
      const botao = screen.getByText('Ir para ação').closest('button')!;
      expect(botao).toHaveAttribute('title', 'Ir para Documentos');
      // O "Ver detalhes" que sobra é o do card eSocial (leva para a rota real).
      expect(screen.getAllByText('Ver detalhes')).toHaveLength(1);
    });

    it('ao clicar, move a viewport e destaca a seção de destino', () => {
      render(<DetalhesAdmissaoDialog admissao={MOCK_ADMISSAO} open={true} onOpenChange={vi.fn()} />);
      const secao = document.querySelector('[data-secao="documentos"]')!;
      expect(secao).not.toHaveClass('border-primary/40');

      fireEvent.click(screen.getByText('Ir para ação').closest('button')!);

      expect(Element.prototype.scrollTo).toHaveBeenCalledTimes(1);
      expect(secao).toHaveClass('border-primary/40', 'bg-primary/5');
    });

    it('não renderiza o botão quando a etapa não tem destino', () => {
      // Estados terminais: nada a executar → nenhum botão morto.
      render(
        <DetalhesAdmissaoDialog
          admissao={{ ...MOCK_ADMISSAO, etapa: 'concluida' }}
          open={true}
          onOpenChange={vi.fn()}
        />
      );
      expect(screen.queryByText('Ir para ação')).not.toBeInTheDocument();
    });

    it('leva a eSocial para a própria seção, pela chave da etapa', () => {
      render(
        <DetalhesAdmissaoDialog admissao={{ ...MOCK_ADMISSAO, etapa: 'esocial' }} open={true} onOpenChange={vi.fn()} />
      );
      const botao = screen.getByText('Ir para ação').closest('button')!;
      expect(botao).toHaveAttribute('title', 'Ir para eSocial');
      fireEvent.click(botao);
      expect(document.querySelector('[data-secao="esocial"]')).toHaveClass('border-primary/40');
      expect(document.querySelector('[data-secao="documentos"]')).not.toHaveClass('border-primary/40');
    });

    it('leva solicitação para "Dados da admissão"', () => {
      render(
        <DetalhesAdmissaoDialog
          admissao={{ ...MOCK_ADMISSAO, etapa: 'solicitacao' }}
          open={true}
          onOpenChange={vi.fn()}
        />
      );
      const botao = screen.getByText('Ir para ação').closest('button')!;
      expect(botao).toHaveAttribute('title', 'Ir para Dados da admissão');
      fireEvent.click(botao);
      expect(document.querySelector('[data-secao="dados"]')).toHaveClass('border-primary/40');
    });
  });

  // ─── Documentos e Histórico DENTRO do card (sem janela sobre janela) ──────
  // O botão "Ver todos" abria um diálogo aninhado e a lista mostrava só 5 dos 6
  // documentos; o botão "Ver histórico" abria outra janela e o card mostrava só
  // os 3 eventos mais recentes. Agora os dois são consultados por inteiro aqui,
  // sem nenhum diálogo secundário — e SEM scroll próprio: quem rola é o corpo do
  // modal (ver o teste da viewport única).
  describe('Documentos e Histórico inline', () => {
    beforeEach(() => {
      // Cada teste começa com o histórico vazio (o mock global devolve `[]`).
      mockWorkflow([]);
    });

    it('não tem mais os botões "Ver todos" nem "Ver histórico"', () => {
      render(<DetalhesAdmissaoDialog admissao={MOCK_ADMISSAO} open={true} onOpenChange={vi.fn()} />);
      expect(screen.queryByText('Ver todos')).not.toBeInTheDocument();
      expect(screen.queryByText('Ver histórico')).not.toBeInTheDocument();
    });

    it('não monta nenhum diálogo aninhado de documentos/histórico', () => {
      mockWorkflow(MOCK_HISTORICO);
      render(<DetalhesAdmissaoDialog admissao={MOCK_ADMISSAO} open={true} onOpenChange={vi.fn()} />);
      // Títulos das duas janelas que foram eliminadas.
      expect(screen.queryByText('Documentos da admissão')).not.toBeInTheDocument();
      expect(screen.queryByText('Histórico da admissão')).not.toBeInTheDocument();
    });

    it('lista TODOS os 6 documentos do checklist dentro do card', () => {
      render(<DetalhesAdmissaoDialog admissao={MOCK_ADMISSAO} open={true} onOpenChange={vi.fn()} />);
      // Antes o card cortava em 5 (`slice(0, 5)`); o 6º só existia na janela.
      // Escopado à lista: "Contrato" também é um nó do stepper.
      const lista = within(document.querySelector('[data-secao="documentos"] ul') as HTMLElement);
      [
        'RG / CPF',
        'Comprovante de residência',
        'Foto 3x4',
        'CTPS / PIS',
        'Exame admissional (ASO)',
        'Contrato',
      ].forEach((nome) => expect(lista.getByText(nome)).toBeInTheDocument());
      expect(screen.getByText('(0/6)')).toBeInTheDocument();
    });

    it('expande os detalhes do documento na própria linha', () => {
      render(<DetalhesAdmissaoDialog admissao={MOCK_ADMISSAO} open={true} onOpenChange={vi.fn()} />);
      const linha = screen.getByText('RG / CPF').closest('button')!;
      expect(linha).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText('Obrigatório')).not.toBeInTheDocument();

      fireEvent.click(linha);
      expect(linha).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('Obrigatório')).toBeInTheDocument();

      // Fecha no segundo clique (nada de modal: só a linha recolhe).
      fireEvent.click(linha);
      expect(linha).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText('Obrigatório')).not.toBeInTheDocument();
    });

    it('mostra o histórico COMPLETO (5 eventos), não só os 3 recentes', () => {
      mockWorkflow(MOCK_HISTORICO);
      render(<DetalhesAdmissaoDialog admissao={MOCK_ADMISSAO} open={true} onOpenChange={vi.fn()} />);
      // O mais antigo é justamente o que era cortado pelo `slice(0, 3)`.
      expect(screen.getByText('Workflow iniciado')).toBeInTheDocument();
      expect(document.querySelectorAll('[data-secao="historico"] ol li')).toHaveLength(5);
      // Data/hora e o responsável do evento, quando o dado existe.
      expect(screen.getByText('Bruno Cardoso')).toBeInTheDocument();
    });

    it('abre a descrição longa do histórico na própria linha', () => {
      const longa = 'Registro detalhado do evento '.repeat(10).trim(); // 280 caracteres
      mockWorkflow([
        { id: 'x1', acao: 'Evento com detalhe extenso', observacoes: longa, created_at: '2026-07-01T09:10:00Z' },
      ]);
      render(<DetalhesAdmissaoDialog admissao={MOCK_ADMISSAO} open={true} onOpenChange={vi.fn()} />);

      const paragrafo = screen.getByText(longa);
      expect(paragrafo).toHaveClass('line-clamp-2');

      const verMais = screen.getByText('Ver mais').closest('button')!;
      expect(verMais).toHaveAttribute('aria-expanded', 'false');
      fireEvent.click(verMais);

      expect(screen.getByText(longa)).not.toHaveClass('line-clamp-2');
      expect(screen.getByText('Ver menos')).toBeInTheDocument();
    });

    it('não dá scroll próprio a card nenhum — a viewport de rolagem é só o corpo do modal', () => {
      mockWorkflow(MOCK_HISTORICO);
      render(<DetalhesAdmissaoDialog admissao={MOCK_ADMISSAO} open={true} onOpenChange={vi.fn()} />);

      // REGRESSÃO DA RODA DO MOUSE: com `overflow-y-auto` + `scroll-interno`
      // (`overscroll-behavior: contain`) nas duas listas, a roda morria sobre os
      // cards — o cursor em cima de "Documentos"/"Histórico" não movia o modal,
      // nem no fim do curso interno (o `contain` corta o scroll chaining). A
      // viewport interna era desnecessária: o casco do modal já é `max-h-[85vh]`
      // com `overflow-hidden`.
      expect(document.querySelectorAll('.scroll-interno')).toHaveLength(0);

      const docs = document.querySelector('[data-secao="documentos"] ul')!;
      const hist = document.querySelector('[data-secao="historico"] ol')!;
      [docs, hist].forEach((lista) => {
        expect(lista).not.toHaveClass('overflow-y-auto');
        expect(lista).not.toHaveClass('max-h-[200px]');
      });
      // As linhas continuam alinhadas à faixa do `-mx-2` (aparência intacta).
      expect(docs).toHaveClass('-mx-2');
      expect(hist).toHaveClass('-mx-2');

      // E o corpo do modal segue como a ÚNICA viewport: `min-h-0` + `flex-1` +
      // `overflow-y-auto` (sem `min-h-0` o item não encolheria e não rolaria).
      const corpo = document.querySelector('.overflow-y-auto') as HTMLElement;
      expect(corpo).not.toBeNull();
      expect(corpo).toHaveClass('min-h-0');
      expect(corpo).toHaveClass('flex-1');
      expect(document.querySelectorAll('.overflow-y-auto')).toHaveLength(1);
    });
  });
});
