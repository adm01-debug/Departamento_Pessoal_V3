import type { ReactNode } from 'react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const state = vi.hoisted(() => ({
  factorsData: { totp: [] as Array<{ id: string; status: string; created_at?: string }> },
  mfaRecord: null as { backup_codes?: string[] } | null,
  loading: false,
  refetch: vi.fn(),
  invalidateQueries: vi.fn(),
  upsert: vi.fn(async () => ({ error: null })),
  writeText: vi.fn(async () => undefined),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn((opts: { queryKey: string[] }) => {
    const key = opts.queryKey[0];
    if (key === 'mfa-factors') return { data: state.factorsData, isLoading: state.loading, refetch: state.refetch };
    return { data: state.mfaRecord, isLoading: false };
  }),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: state.invalidateQueries })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      mfa: {
        listFactors: vi.fn(),
        enroll: vi.fn(),
        challenge: vi.fn(),
        verify: vi.fn(),
        unenroll: vi.fn(),
      },
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      upsert: state.upsert,
    })),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-123' } })),
}));

vi.mock('@/utils/safeError', () => ({
  safeErrorMessage: vi.fn((e: unknown, d: string) => d),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children?: ReactNode; open?: boolean }) =>
    open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children?: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MFASetup } from '../settings/MFASetup';

const mfa = supabase.auth.mfa;
const verifiedFactor = { id: 'f1', status: 'verified', created_at: '2024-01-01T00:00:00Z', friendly_name: 'App' };
const enrollPayload = {
  data: { id: 'fac-9', totp: { qr_code: 'data:image/png;base64,QR', secret: 'SECRET123', uri: 'otpauth://x' } },
  error: null,
};

async function renderAndOpenEnroll() {
  vi.mocked(mfa.enroll).mockResolvedValue(enrollPayload as never);
  render(<MFASetup />);
  fireEvent.click(screen.getByRole('button', { name: /Ativar 2FA/i }));
  return await screen.findByRole('dialog');
}

describe('MFASetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.factorsData = { totp: [] };
    state.mfaRecord = null;
    state.loading = false;
    vi.mocked(mfa.enroll).mockResolvedValue(enrollPayload as never);
    vi.mocked(mfa.challenge).mockResolvedValue({ data: { id: 'ch-1' }, error: null } as never);
    vi.mocked(mfa.verify).mockResolvedValue({ data: {}, error: null } as never);
    vi.mocked(mfa.unenroll).mockResolvedValue({ data: {}, error: null } as never);
    state.upsert.mockResolvedValue({ error: null });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: state.writeText },
    });
  });

  it('shows loading spinner when loading', () => {
    state.loading = true;
    const { container } = render(<MFASetup />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders 2FA title', () => {
    render(<MFASetup />);
    expect(screen.getByText(/Autenticação de Dois Fatores/)).toBeInTheDocument();
  });

  it('shows Desativado badge when no factors', () => {
    render(<MFASetup />);
    expect(screen.getByText('Desativado')).toBeInTheDocument();
  });

  it('shows Ativar 2FA button when disabled', () => {
    render(<MFASetup />);
    expect(screen.getByText('Ativar 2FA')).toBeInTheDocument();
  });

  it('shows Ativado badge when factor is verified', () => {
    state.factorsData = { totp: [verifiedFactor] };
    render(<MFASetup />);
    expect(screen.getByText('Ativado')).toBeInTheDocument();
  });

  it('shows Desativar button when MFA is active', () => {
    state.factorsData = { totp: [verifiedFactor] };
    render(<MFASetup />);
    expect(screen.getByText('Desativar')).toBeInTheDocument();
  });

  it('renders Dicas de Segurança section', () => {
    render(<MFASetup />);
    expect(screen.getByText('Dicas de Segurança')).toBeInTheDocument();
  });

  it('renders App Autenticador description', () => {
    render(<MFASetup />);
    expect(screen.getByText('App Autenticador (TOTP)')).toBeInTheDocument();
  });

  it('clicar em "Ativar 2FA" chama mfa.enroll e abre o diálogo com QR e segredo', async () => {
    const dialog = await renderAndOpenEnroll();
    expect(mfa.enroll).toHaveBeenCalledWith({ factorType: 'totp', friendlyName: 'Authenticator App' });
    expect(within(dialog).getByText('Configurar 2FA')).toBeInTheDocument();
    expect(within(dialog).getByAltText('QR Code MFA')).toHaveAttribute('src', 'data:image/png;base64,QR');
    expect(within(dialog).getByText('SECRET123')).toBeInTheDocument();
  });

  it('erro no enroll mostra toast.error e não abre diálogo', async () => {
    vi.mocked(mfa.enroll).mockResolvedValue({ data: null, error: new Error('falha') } as never);
    render(<MFASetup />);
    fireEvent.click(screen.getByRole('button', { name: /Ativar 2FA/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro ao iniciar configuração MFA.'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('verificação com código de 6 dígitos chama challenge + verify + upsert e fecha o diálogo', async () => {
    const dialog = await renderAndOpenEnroll();
    fireEvent.change(within(dialog).getByPlaceholderText('000000'), { target: { value: '123456' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /^Ativar$/i }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Autenticação de dois fatores ativada com sucesso!')
    );
    expect(mfa.challenge).toHaveBeenCalledWith({ factorId: 'fac-9' });
    expect(mfa.verify).toHaveBeenCalledWith({ factorId: 'fac-9', challengeId: 'ch-1', code: '123456' });
    expect(state.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ user_id: 'user-123', mfa_enabled: true, mfa_type: 'totp' })]),
      { onConflict: 'user_id' }
    );
    expect(state.refetch).toHaveBeenCalled();
    expect(state.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['user-mfa-record'] });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('botão Ativar fica desabilitado com código incompleto', async () => {
    const dialog = await renderAndOpenEnroll();
    const ativarBtn = within(dialog).getByRole('button', { name: /^Ativar$/i });
    expect(ativarBtn).toBeDisabled();
    fireEvent.change(within(dialog).getByPlaceholderText('000000'), { target: { value: '12345' } });
    expect(ativarBtn).toBeDisabled();
  });

  it('input de código filtra caracteres não numéricos e limita a 6 dígitos', async () => {
    const dialog = await renderAndOpenEnroll();
    const input = within(dialog).getByPlaceholderText('000000');
    fireEvent.change(input, { target: { value: '12a3b4c56789' } });
    expect(input).toHaveValue('123456');
  });

  it('verify com erro mostra toast.error de código inválido', async () => {
    vi.mocked(mfa.verify).mockResolvedValue({ data: null, error: new Error('bad code') } as never);
    const dialog = await renderAndOpenEnroll();
    fireEvent.change(within(dialog).getByPlaceholderText('000000'), { target: { value: '123456' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /^Ativar$/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Código inválido ou expirado.'));
    expect(state.upsert).not.toHaveBeenCalled();
  });

  it('challenge com erro mostra toast.error e não chama verify', async () => {
    vi.mocked(mfa.challenge).mockResolvedValue({ data: null, error: new Error('no challenge') } as never);
    const dialog = await renderAndOpenEnroll();
    fireEvent.change(within(dialog).getByPlaceholderText('000000'), { target: { value: '123456' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /^Ativar$/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Código inválido ou expirado.'));
    expect(mfa.verify).not.toHaveBeenCalled();
  });

  it('copiar segredo chama clipboard e avisa "Copiado!"', async () => {
    const dialog = await renderAndOpenEnroll();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Copiar chave secreta' }));
    expect(state.writeText).toHaveBeenCalledWith('SECRET123');
    expect(toast.success).toHaveBeenCalledWith('Copiado!');
  });

  it('desativar 2FA chama unenroll + upsert mfa_enabled=false e recarrega', async () => {
    state.factorsData = { totp: [verifiedFactor] };
    render(<MFASetup />);
    fireEvent.click(screen.getAllByRole('button', { name: /Desativar/i })[0]);
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /^Desativar$/i }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Autenticação de dois fatores desativada'));
    expect(mfa.unenroll).toHaveBeenCalledWith({ factorId: 'f1' });
    expect(state.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ mfa_enabled: false, mfa_type: null })]),
      { onConflict: 'user_id' }
    );
    expect(state.refetch).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('erro no unenroll mostra toast.error', async () => {
    vi.mocked(mfa.unenroll).mockResolvedValue({ data: null, error: new Error('fail') } as never);
    state.factorsData = { totp: [verifiedFactor] };
    render(<MFASetup />);
    fireEvent.click(screen.getAllByRole('button', { name: /Desativar/i })[0]);
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /^Desativar$/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro ao desativar MFA.'));
    expect(state.upsert).not.toHaveBeenCalled();
  });

  it('cancelar no diálogo de desativação fecha sem chamar unenroll', async () => {
    state.factorsData = { totp: [verifiedFactor] };
    render(<MFASetup />);
    fireEvent.click(screen.getAllByRole('button', { name: /Desativar/i })[0]);
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Cancelar/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mfa.unenroll).not.toHaveBeenCalled();
  });

  it('"Ver Códigos de Recuperação" abre diálogo listando os códigos', async () => {
    state.mfaRecord = { backup_codes: ['AAAA-1111', 'BBBB-2222'] };
    render(<MFASetup />);
    fireEvent.click(screen.getByRole('button', { name: /Ver Códigos de Recuperação/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('AAAA-1111')).toBeInTheDocument();
    expect(within(dialog).getByText('BBBB-2222')).toBeInTheDocument();
  });
});
