/**
 * REGRESSÃO DA CONSOLIDAÇÃO — Admissões NÃO tem mais onboarding.
 *
 * Prova o critério de aceite principal: a aba "Onboarding" saiu da tablist do
 * módulo (Admissões termina no processo admissionAL) e o único vínculo que
 * sobrou é o ATALHO contextual do cabeçalho, que navega para a Jornada
 * (`/onboarding`) em vez de reproduzir o conteúdo aqui dentro.
 */
import { describe, it, expect, vi } from 'vitest';
import type { ComponentProps, ElementType, ReactNode } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

const { navigateSpy } = vi.hoisted(() => ({ navigateSpy: vi.fn() }));

vi.mock('react-router-dom', async () => {
  const atual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...atual, useNavigate: () => navigateSpy };
});

vi.mock('framer-motion', () => ({
  motion: {
    create:
      (Component: ElementType) =>
      ({ children, ...rest }: ComponentProps<'div'>) => <Component {...rest}>{children}</Component>,
    div: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    span: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  },
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
  useInView: () => true,
  useReducedMotion: () => false,
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/hooks/useAdmissoes', () => ({ useAdmissoes: () => ({ admissoes: [], isLoading: false }) }));
vi.mock('@/mocks/admissoesMock', () => ({ isMockId: () => false }));
vi.mock('@/services/contratacaoService', () => ({ contratacaoService: {} }));

// Filhas do módulo: fora de escopo aqui (cada uma tem o próprio teste / já é
// exercitada na Jornada). Só a CASCA da página importa para esta regressão.
vi.mock('@/components/PageTitle', () => ({ PageTitle: () => null }));
vi.mock('@/components/layout', () => ({
  PageLayout: ({ children, actions }: { children?: ReactNode; actions?: ReactNode }) => (
    <div>
      <div data-testid="page-actions">{actions}</div>
      {children}
    </div>
  ),
}));
vi.mock('@/components/admissoes/NovaAdmissaoDialog', () => ({ NovaAdmissaoDialog: () => null }));
vi.mock('@/components/admissoes/DetalhesAdmissaoDialog', () => ({ DetalhesAdmissaoDialog: () => null }));
vi.mock('@/components/admissoes/AdmissoesKanban', () => ({ AdmissoesKanban: () => null }));
vi.mock('@/components/admissoes/AdmissoesDashboard', () => ({ AdmissoesDashboard: () => null }));
vi.mock('@/components/admissoes/AuditoriaAdmissoesContent', () => ({ default: () => null }));
vi.mock('@/components/admissoes/GestaoCandidatos', () => ({ GestaoCandidatos: () => null }));

vi.mock('@/components/colaboradores/AnimatedDossieTabs', () => ({
  AnimatedDossieTabsList: ({ children }: { children?: ReactNode }) => <div role="tablist">{children}</div>,
  AnimatedDossieTabsTrigger: ({ children, value }: { children?: ReactNode; value?: string }) => (
    <button role="tab">{children}</button>
  ),
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children?: ReactNode }) => <div role="tablist">{children}</div>,
  TabsTrigger: ({ children }: { children?: ReactNode }) => <button role="tab">{children}</button>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children?: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children?: ReactNode }) => <h3>{children}</h3>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...rest }: ComponentProps<'button'>) => (
    <button onClick={onClick} {...rest}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/spinner', () => ({ Spinner: () => <span data-testid="spinner" /> }));
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children?: ReactNode }) => <>{children}</>,
  DropdownMenuTrigger: ({ children }: { children?: ReactNode }) => <>{children}</>,
  DropdownMenuContent: () => null,
  DropdownMenuItem: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children?: ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children?: ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children }: { children?: ReactNode }) => <td>{children}</td>,
  TableHead: ({ children }: { children?: ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children?: ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children?: ReactNode }) => <tr>{children}</tr>,
}));

// Mesmo shim de AuditoriaTab.test.tsx: a tablist não depende de sessão.
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, hasRole: () => false, isReady: true, loading: false }),
  AuthContext: { Provider: ({ children }: { children?: React.ReactNode }) => children },
}));

import AdmissoesPage from '@/pages/AdmissoesPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// A página passou a usar react-query depois da muri; sem o provider o render
// quebra antes de chegar na tablist que estes dois casos examinam.
function renderPagina() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AdmissoesPage />
    </QueryClientProvider>
  );
}

describe('Admissões — onboarding consolidado fora do módulo', () => {
  it('não exibe mais a aba "Onboarding" na tablist do módulo', () => {
    renderPagina();
    const abas = screen.getAllByRole('tab').map((aba) => aba.textContent?.trim() ?? '');
    expect(abas).toEqual(['Dashboard', 'Gestão de Candidatos', 'Kanban', 'Auditoria']);
    // Nenhuma aba é, sozinha, "Onboarding" (o texto do atalho é outra string).
    expect(abas).not.toContain('Onboarding');
  });

  it('o cabeçalho leva à Jornada de Onboarding em vez de reproduzir o conteúdo', () => {
    renderPagina();
    const atalho = screen.getByRole('button', { name: /Jornada de Onboarding/ });
    fireEvent.click(atalho);
    expect(navigateSpy).toHaveBeenCalledWith('/onboarding');
  });
});
