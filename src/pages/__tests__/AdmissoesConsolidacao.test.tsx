/**
 * REGRESSÃO DA CONSOLIDAÇÃO — Admissões NÃO tem mais onboarding.
 *
 * Prova o critério de aceite principal: a aba "Onboarding" saiu da tablist do
 * módulo (Admissões termina no processo admissionAL) e o único vínculo que
 * sobrou é o ATALHO contextual do cabeçalho, que navega para a Jornada
 * (`/onboarding`) em vez de reproduzir o conteúdo aqui dentro.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const { navigateSpy } = vi.hoisted(() => ({ navigateSpy: vi.fn() }));

vi.mock('react-router-dom', async () => {
  const atual = await vi.importActual<any>('react-router-dom');
  return { ...atual, useNavigate: () => navigateSpy };
});

vi.mock('framer-motion', () => ({
  motion: {
    create:
      (Component: any) =>
      ({ children, ...rest }: any) => <Component {...rest}>{children}</Component>,
    div: ({ children }: any) => <div>{children}</div>,
    span: ({ children }: any) => <span>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
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
  PageLayout: ({ children, actions }: any) => (
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
  AnimatedDossieTabsList: ({ children }: any) => <div role="tablist">{children}</div>,
  AnimatedDossieTabsTrigger: ({ children, value }: any) => <button role="tab">{children}</button>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsContent: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div role="tablist">{children}</div>,
  TabsTrigger: ({ children }: any) => <button role="tab">{children}</button>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...rest }: any) => (
    <button onClick={onClick} {...rest}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/spinner', () => ({ Spinner: () => <span data-testid="spinner" /> }));
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <>{children}</>,
  DropdownMenuTrigger: ({ children }: any) => <>{children}</>,
  DropdownMenuContent: () => null,
  DropdownMenuItem: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableCell: ({ children }: any) => <td>{children}</td>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
}));

import AdmissoesPage from '@/pages/AdmissoesPage';

describe('Admissões — onboarding consolidado fora do módulo', () => {
  it('não exibe mais a aba "Onboarding" na tablist do módulo', () => {
    render(<AdmissoesPage />);
    const abas = screen.getAllByRole('tab').map((aba) => aba.textContent?.trim() ?? '');
    expect(abas).toEqual(['Dashboard', 'Gestão de Candidatos', 'Kanban', 'Auditoria']);
    // Nenhuma aba é, sozinha, "Onboarding" (o texto do atalho é outra string).
    expect(abas).not.toContain('Onboarding');
  });

  it('o cabeçalho leva à Jornada de Onboarding em vez de reproduzir o conteúdo', () => {
    render(<AdmissoesPage />);
    const atalho = screen.getByRole('button', { name: /Jornada de Onboarding/ });
    fireEvent.click(atalho);
    expect(navigateSpy).toHaveBeenCalledWith('/onboarding');
  });
});
