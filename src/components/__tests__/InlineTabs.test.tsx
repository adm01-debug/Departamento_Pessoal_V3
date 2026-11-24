import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogTrigger: ({ children, asChild }: any) => asChild ? children : <div>{children}</div>,
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: [], isLoading: false }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

import {
  PreferenciasTab,
  NotificacoesTab,
  FolhaConfigTab,
  PontoConfigTab,
} from '../settings/InlineTabs';

describe('PreferenciasTab', () => {
  it('renders Preferências de Interface title', () => {
    render(<PreferenciasTab user={{ name: 'Ana Lima' }} />);
    expect(screen.getByText('Preferências de Interface')).toBeInTheDocument();
  });

  it('renders Modo Escuro switch label', () => {
    render(<PreferenciasTab user={null} />);
    expect(screen.getByText('Modo Escuro')).toBeInTheDocument();
  });

  it('renders Salvar Alterações button', () => {
    render(<PreferenciasTab user={null} />);
    expect(screen.getByRole('button', { name: 'Salvar Alterações' })).toBeInTheDocument();
  });

  it('Salvar Alterações grava o nome de exibição no Auth e em profiles.nome', async () => {
    const updateUser = vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null }));
    Object.assign(supabase.auth, { updateUser });
    const chain = makeChain({ data: null, error: null });
    fromMock.mockImplementation(() => chain);
    render(<PreferenciasTab user={{ name: 'Ana Lima' }} />);
    fireEvent.change(screen.getByLabelText('Nome de Exibição'), { target: { value: '  Ana Souza ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Preferências salvas!'));
    expect(updateUser).toHaveBeenCalledWith({ data: { name: 'Ana Souza' } });
    expect(fromMock).toHaveBeenCalledWith('profiles');
    expect(chain.update).toHaveBeenCalledWith({ nome: 'Ana Souza' });
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(captured.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['meu-perfil'] });
  });

  it('Salvar Alterações com erro ao gravar profiles mostra toast.error', async () => {
    Object.assign(supabase.auth, {
      updateUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
    });
    fromMock.mockImplementation(() => makeChain({ data: null, error: { message: 'rls' } }));
    render(<PreferenciasTab user={{ name: 'Ana Lima' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro ao salvar preferências.'));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('Salvar Alterações com erro do Auth mostra toast.error e não confirma', async () => {
    Object.assign(supabase.auth, { updateUser: vi.fn(async () => ({ data: {}, error: new Error('falhou') })) });
    render(<PreferenciasTab user={{ name: 'Ana Lima' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro ao salvar preferências.'));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('Modo Escuro reflete e altera o tema real', () => {
    captured.theme = 'dark';
    render(<PreferenciasTab user={null} />);
    const sw = screen.getByRole('switch');
    expect(sw).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(sw);
    expect(captured.setTheme).toHaveBeenCalledWith('light');
    captured.theme = 'light';
  });

  it('não exibe controles sem efeito (idioma, animações reduzidas)', () => {
    render(<PreferenciasTab user={null} />);
    expect(screen.queryByText('Idioma do Sistema')).not.toBeInTheDocument();
    expect(screen.queryByText('Animações Reduzidas')).not.toBeInTheDocument();
  });
});

describe('NotificacoesTab', () => {
  it('renders Central de Notificações title', () => {
    render(<NotificacoesTab />);
    expect(screen.getByText('Central de Notificações')).toBeInTheDocument();
  });

  it('informa que preferências por canal ainda não existem, sem switches nem botão de salvar', () => {
    render(<NotificacoesTab />);
    expect(screen.getByText(/ainda não está disponível/)).toBeInTheDocument();
    expect(screen.queryByText('Novas Admissões')).not.toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salvar Preferências' })).not.toBeInTheDocument();
  });
});

describe('FolhaConfigTab', () => {
  it('renders Parâmetros de Folha title', () => {
    render(<FolhaConfigTab />);
    expect(screen.getByText('Parâmetros de Folha')).toBeInTheDocument();
  });

  it('renders Dia de Fechamento field', () => {
    render(<FolhaConfigTab />);
    expect(screen.getByText('Dia de Fechamento')).toBeInTheDocument();
  });

  it('renders Cálculo Automático switch', () => {
    render(<FolhaConfigTab />);
    expect(screen.getByText('Cálculo Automático')).toBeInTheDocument();
  });
});

describe('PontoConfigTab', () => {
  it('sem papel supervisor/coordenador: Atualizar Regras desabilitado com aviso', () => {
    captured.roles = ['admin'];
    render(<PontoConfigTab />);
    expect(screen.getByText('Somente supervisor ou coordenador podem alterar as regras de ponto.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Atualizar Regras/ })).toBeDisabled();
    captured.roles = [];
  });

  it.each(['supervisor', 'coordenador'])('papel %s: Atualizar Regras habilitado', (papel) => {
    captured.roles = [papel];
    render(<PontoConfigTab />);
    expect(screen.queryByText('Somente supervisor ou coordenador podem alterar as regras de ponto.')).toBeNull();
    expect(screen.getByRole('button', { name: /Atualizar Regras/ })).toBeEnabled();
    captured.roles = [];
  });

  it('renders Compliance de Jornada title', () => {
    render(<PontoConfigTab />);
    expect(screen.getByText('Compliance de Jornada')).toBeInTheDocument();
  });

  it('renders Exigir Geolocalização switch', () => {
    render(<PontoConfigTab />);
    expect(screen.getByText('Exigir Geolocalização')).toBeInTheDocument();
  });

  it('renders Ponto Offline switch', () => {
    render(<PontoConfigTab />);
    expect(screen.getByText('Ponto Offline')).toBeInTheDocument();
  });
});
