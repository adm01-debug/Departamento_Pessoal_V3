import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));
vi.mock('@/services/loggerService', () => ({
  loggerService: { fatal: vi.fn() },
}));

import { RouteErrorBoundary } from '../RouteErrorBoundary';

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test render error');
  return <div>Normal content</div>;
}

describe('RouteErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error', () => {
    render(
      <RouteErrorBoundary>
        <div>Safe content</div>
      </RouteErrorBoundary>
    );
    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });

  it('shows error UI when child throws', () => {
    render(
      <RouteErrorBoundary>
        <ThrowingComponent shouldThrow />
      </RouteErrorBoundary>
    );
    expect(screen.getByText('Instabilidade Detectada')).toBeInTheDocument();
    expect(screen.getByText('Test render error')).toBeInTheDocument();
  });

  it('shows retry and home buttons on error', () => {
    render(
      <RouteErrorBoundary>
        <ThrowingComponent shouldThrow />
      </RouteErrorBoundary>
    );
    expect(screen.getByText('Tentar novamente')).toBeInTheDocument();
    expect(screen.getByText('Ir ao início')).toBeInTheDocument();
  });

  it('shows report button on error', () => {
    render(
      <RouteErrorBoundary>
        <ThrowingComponent shouldThrow />
      </RouteErrorBoundary>
    );
    expect(screen.getByText('Enviar relatório manual detalhado')).toBeInTheDocument();
  });
});
