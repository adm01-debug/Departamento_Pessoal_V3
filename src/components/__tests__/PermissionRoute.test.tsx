import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Resgate da branch `muri`. O que estes casos travam:
//  - falha TECNICA de verificacao NAO vira "Acesso Restrito" (o usuario
//    legitimo pensaria que perdeu permissao);
//  - negativa real vira "Acesso Restrito";
//  - enquanto carrega, nem libera nem nega (sem piscar negativa para quem tem).
const estadoAuth = {
  user: null as { id: string; email: string; roles: string[] } | null,
  isAdmin: false,
  isReady: true,
  loading: false,
  rolesStatus: 'success' as 'loading' | 'success' | 'error',
  rolesError: null as string | null,
};
const estadoPerm = {
  pode: (_r: string, _a: string) => false,
  carregando: false,
  estado: 'success' as 'loading' | 'success' | 'error',
  erro: null as string | null,
};

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => estadoAuth }));
vi.mock('@/hooks/usePermissions', () => ({ usePermissions: () => estadoPerm }));
// O portao de MFA tem maquina de estados propria (ja coberta por AdminRoute.test):
// aqui o foco e a decisao de PERMISSAO, entao o portao e substituido.
vi.mock('@/components/MfaGate', async (original) => {
  const real = (await original()) as Record<string, unknown>;
  return { ...real, MfaGate: ({ children }: { children: React.ReactNode }) => <>{children}</> };
});

import { PermissionRoute } from '../PermissionRoute';

function montar() {
  return render(
    <MemoryRouter>
      <PermissionRoute permission="auditoria.read">
        <div>conteudo protegido</div>
      </PermissionRoute>
    </MemoryRouter>
  );
}

describe('PermissionRoute', () => {
  beforeEach(() => {
    estadoAuth.user = { id: 'u1', email: 'u@x', roles: ['gestor'] };
    estadoAuth.isAdmin = false;
    estadoAuth.isReady = true;
    estadoAuth.loading = false;
    estadoAuth.rolesStatus = 'success';
    estadoAuth.rolesError = null;
    estadoPerm.pode = () => false;
    estadoPerm.carregando = false;
    estadoPerm.estado = 'success';
    estadoPerm.erro = null;
  });

  it('com a permissao concedida, mostra o conteudo', () => {
    estadoPerm.pode = (r, a) => r === 'auditoria' && a === 'read';
    montar();
    expect(screen.getByText('conteudo protegido')).toBeInTheDocument();
  });

  it('admin entra mesmo sem linha na matriz', () => {
    estadoAuth.isAdmin = true;
    montar();
    expect(screen.getByText('conteudo protegido')).toBeInTheDocument();
  });

  it('sem a permissao, mostra Acesso Restrito', () => {
    montar();
    expect(screen.getByText('Acesso Restrito')).toBeInTheDocument();
    expect(screen.queryByText('conteudo protegido')).not.toBeInTheDocument();
  });

  it('falha ao consultar a matriz NAO vira Acesso Restrito', () => {
    estadoPerm.estado = 'error';
    estadoPerm.erro = '[42501] permission denied';
    montar();
    expect(screen.getByText(/Não foi possível verificar seu acesso/)).toBeInTheDocument();
    expect(screen.queryByText('Acesso Restrito')).not.toBeInTheDocument();
  });

  it('falha ao ler os papeis NAO vira Acesso Restrito', () => {
    estadoAuth.rolesStatus = 'error';
    estadoAuth.rolesError = 'Tempo esgotado ao verificar as permissões do usuário.';
    montar();
    expect(screen.getByText(/Não foi possível verificar seu acesso/)).toBeInTheDocument();
  });

  it('enquanto a matriz carrega, nem libera nem nega', () => {
    estadoPerm.carregando = true;
    estadoPerm.estado = 'loading';
    montar();
    expect(screen.getByText(/Verificando privilégios/)).toBeInTheDocument();
    expect(screen.queryByText('Acesso Restrito')).not.toBeInTheDocument();
    expect(screen.queryByText('conteudo protegido')).not.toBeInTheDocument();
  });

  it('sem usuario, redireciona para o login', () => {
    estadoAuth.user = null;
    const { container } = montar();
    expect(container.textContent).not.toContain('conteudo protegido');
    expect(container.textContent).not.toContain('Acesso Restrito');
  });

  // A tela de negacao nao pode expor diagnostico de PII (a versao da `muri`
  // imprimia id, e-mail e as linhas da matriz).
  it('a negativa nao imprime id nem e-mail do usuario', () => {
    const { container } = montar();
    expect(container.textContent).not.toContain('u1');
    expect(container.textContent).not.toContain('u@x');
  });
});
