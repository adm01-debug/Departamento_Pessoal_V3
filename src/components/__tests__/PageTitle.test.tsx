import { describe, it, expect, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';

import { PageTitle } from '../PageTitle';

function renderWithHelmet(ui: React.ReactElement) {
  return render(<HelmetProvider>{ui}</HelmetProvider>);
}

afterEach(() => {
  document.title = '';
});

describe('PageTitle', () => {
  it('sets document title with suffix', () => {
    renderWithHelmet(<PageTitle title="Colaboradores" />);
    expect(document.title).toBe('Colaboradores | Sistema DP');
  });

  it('sets document title for Férias', () => {
    renderWithHelmet(<PageTitle title="Férias" />);
    expect(document.title).toBe('Férias | Sistema DP');
  });

  it('sets document title for Folha de Pagamento', () => {
    renderWithHelmet(<PageTitle title="Folha de Pagamento" />);
    expect(document.title).toBe('Folha de Pagamento | Sistema DP');
  });

  it('always contains Sistema DP in title', () => {
    renderWithHelmet(<PageTitle title="Qualquer Página" />);
    expect(document.title).toContain('Sistema DP');
  });

  it('sets meta description when provided', () => {
    renderWithHelmet(<PageTitle title="Folha" description="Cálculo mensal" />);
    const meta = document.querySelector('meta[name="description"]');
    expect(meta?.getAttribute('content')).toBe('Cálculo mensal');
  });

  it('does not set meta description when not provided', () => {
    renderWithHelmet(<PageTitle title="Folha" />);
    const meta = document.querySelector('meta[name="description"]');
    expect(meta).toBeNull();
  });

  it('handles empty title (still contains suffix)', () => {
    renderWithHelmet(<PageTitle title="" />);
    expect(document.title).toContain('Sistema DP');
  });

  it('sets title with pipe separator', () => {
    renderWithHelmet(<PageTitle title="Admin" />);
    expect(document.title).toContain('|');
  });
});
