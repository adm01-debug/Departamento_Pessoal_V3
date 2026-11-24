import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { mockUseAuth, mockUsePermissions, mockPode, mockGetAAL, mockListFactors } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUsePermissions: vi.fn(),
  mockPode: vi.fn(),
  mockGetAAL: vi.fn(),
  mockListFactors: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({ useAuth: mockUseAuth }));
// A matriz de permissões real vive no banco (`public.permissions`): aqui o hook
// é substituído para exercitar SÓ a regra da guarda.
vi.mock('@/hooks/usePermissions', () => ({ usePermissions: mockUsePermissions }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      mfa: {
        getAuthenticatorAssuranceLevel: mockGetAAL,
        listFactors: mockListFactors,
        challengeAndVerify: vi.fn(),
      },
    },
  },
}));

import { PermissionRoute } from '../PermissionRoute';

const ROTA = (
  <PermissionRoute permission="auditoria.read">
    <div>conteudo de auditoria</div>
  </PermissionRoute>
);

function renderRota() {
  return render(<MemoryRouter>{ROTA}</MemoryRouter>);
}

describe('PermissionRoute', () => {
  beforeEach(() => {
    mockPode.mockReset().mockReturnValue(false);
    // Estado "feliz" por padrão: verificação concluída com sucesso (sem loading/erro).
    mockUsePermissions.mockReset().mockReturnValue({
      pode: mockPode,
      carregando: false,
      estado: 'success',
      erro: null,
      linhas: [],
      consultaAtiva: true,
      roles: [],
      rolesStatus: 'success',
    });
    mockGetAAL.mockReset().mockResolvedValue({ data: { currentLevel: 'aal2', nextLevel: 'aal2' }, error: null });
    mockListFactors.mockReset().mockResolvedValue({ data: { totp: [] }, error: null });
  });

  it('sem usuário: não renderiza o conteúdo (vai para /login)', () => {
    mockUseAuth.mockReturnValue({ user: null, isReady: true, loading: false, isAdmin: false });
    renderRota();
    expect(screen.queryByText('conteudo de auditoria')).toBeNull();
  });

  it('usuário SEM a permissão continua vendo "Acesso Restrito"', () => {
    mockPode.mockReturnValue(false);
    mockUseAuth.mockReturnValue({ user: { id: '1' }, isReady: true, loading: false, isAdmin: false });
    renderRota();
    expect(screen.queryByText('conteudo de auditoria')).toBeNull();
    expect(screen.getByText('Acesso Restrito')).toBeInTheDocument();
    // A permissão perguntada é exatamente a da matriz: resource + action
    expect(mockPode).toHaveBeenCalledWith('auditoria', 'read');
  });

  it('usuário COM a permissão entra (sessão em aal2)', async () => {
    mockPode.mockReturnValue(true);
    mockUseAuth.mockReturnValue({ user: { id: '1' }, isReady: true, loading: false, isAdmin: false });
    renderRota();
    expect(await screen.findByText('conteudo de auditoria')).toBeInTheDocument();
  });

  it('ADMIN entra mesmo quando a matriz não responde', async () => {
    mockPode.mockReturnValue(false);
    mockUseAuth.mockReturnValue({ user: { id: '1' }, isReady: true, loading: false, isAdmin: true });
    renderRota();
    expect(await screen.findByText('conteudo de auditoria')).toBeInTheDocument();
  });

  it('PRESERVA o MFA: com TOTP inscrito e sessão em aal1, exige o desafio', async () => {
    mockPode.mockReturnValue(true);
    mockGetAAL.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal2' }, error: null });
    mockListFactors.mockResolvedValue({ data: { totp: [{ id: 'f1', status: 'verified' }] }, error: null });
    mockUseAuth.mockReturnValue({ user: { id: '1' }, isReady: true, loading: false, isAdmin: false });
    renderRota();
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByText('conteudo de auditoria')).toBeNull();
    expect(screen.getByText('Verificação em Dois Fatores')).toBeInTheDocument();
  });

  it('fail-closed: bloqueia quando a verificação de MFA falha', async () => {
    mockPode.mockReturnValue(true);
    mockGetAAL.mockRejectedValue(new Error('network'));
    mockUseAuth.mockReturnValue({ user: { id: '1' }, isReady: true, loading: false, isAdmin: false });
    renderRota();
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByText('conteudo de auditoria')).toBeNull();
  });

  it('CARREGANDO: com estado "loading" mostra "Verificando privilégios..." e NÃO decide', () => {
    mockPode.mockReturnValue(false);
    mockUsePermissions.mockReturnValue({
      pode: mockPode,
      carregando: true,
      estado: 'loading',
      erro: null,
      linhas: [],
      consultaAtiva: true,
      roles: ['rh'],
      rolesStatus: 'loading',
    });
    mockUseAuth.mockReturnValue({
      user: { id: '1' },
      isReady: true,
      loading: false,
      isAdmin: false,
      rolesStatus: 'loading',
    });
    renderRota();
    expect(screen.getByText('Verificando privilégios...')).toBeInTheDocument();
    expect(screen.queryByText('Acesso Restrito')).toBeNull();
  });

  it('FALHA DE VERIFICAÇÃO (papéis em erro) NÃO é tratada como "Acesso Restrito"', () => {
    mockPode.mockReturnValue(false);
    mockUseAuth.mockReturnValue({
      user: { id: '1' },
      isReady: true,
      loading: false,
      isAdmin: false,
      rolesStatus: 'error',
      rolesError: '[42501] permission denied for table user_roles',
    });
    renderRota();
    expect(screen.queryByText('conteudo de auditoria')).toBeNull();
    expect(screen.queryByText('Acesso Restrito')).toBeNull();
    expect(screen.getByText('Não foi possível verificar sua autorização')).toBeInTheDocument();
  });

  it('FALHA DE VERIFICAÇÃO (consulta à matriz em erro) também NÃO vira "Acesso Restrito"', () => {
    mockPode.mockReturnValue(false);
    mockUsePermissions.mockReturnValue({
      pode: mockPode,
      carregando: false,
      estado: 'error',
      erro: '[42501] permission denied for table permissions',
      linhas: [],
      consultaAtiva: true,
      roles: ['rh'],
      rolesStatus: 'success',
    });
    mockUseAuth.mockReturnValue({
      user: { id: '1' },
      isReady: true,
      loading: false,
      isAdmin: false,
      rolesStatus: 'success',
    });
    renderRota();
    expect(screen.getByText('Não foi possível verificar sua autorização')).toBeInTheDocument();
    expect(screen.queryByText('Acesso Restrito')).toBeNull();
  });

  /* ─── TEMPORARY DEVELOPMENT ACCESS: bypass de MFA p/ ti@promobrindes.com.br ─── */

  it('bypass temporário: ti@promobrindes.com.br entra em aal1 (sem MFA)', async () => {
    mockPode.mockReturnValue(true);
    mockGetAAL.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null });
    mockListFactors.mockResolvedValue({ data: { totp: [] }, error: null });
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'ti@promobrindes.com.br' },
      isReady: true,
      loading: false,
      isAdmin: false,
      rolesStatus: 'success',
    });
    renderRota();
    expect(await screen.findByText('conteudo de auditoria')).toBeInTheDocument();
  });

  it('bypass temporário é case-insensitive (TI@Promobrindes.com.BR)', async () => {
    mockPode.mockReturnValue(true);
    mockGetAAL.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null });
    mockListFactors.mockResolvedValue({ data: { totp: [] }, error: null });
    mockUseAuth.mockReturnValue({
      user: { id: '2', email: 'TI@Promobrindes.com.BR' },
      isReady: true,
      loading: false,
      isAdmin: false,
      rolesStatus: 'success',
    });
    renderRota();
    expect(await screen.findByText('conteudo de auditoria')).toBeInTheDocument();
  });

  it('SEM bypass: outro usuário em aal1 continua na exigência de MFA', async () => {
    mockPode.mockReturnValue(true);
    mockGetAAL.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null });
    mockListFactors.mockResolvedValue({ data: { totp: [] }, error: null });
    mockUseAuth.mockReturnValue({
      user: { id: '3', email: 'outro@empresa.com' },
      isReady: true,
      loading: false,
      isAdmin: false,
      rolesStatus: 'success',
    });
    renderRota();
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByText('conteudo de auditoria')).toBeNull();
    expect(screen.getByText('Autenticação de Dois Fatores Obrigatória')).toBeInTheDocument();
  });
});
