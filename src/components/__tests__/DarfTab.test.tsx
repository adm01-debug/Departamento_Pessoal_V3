import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DarfTab } from '../obrigacoes/DarfTab';

describe('DarfTab', () => {
  it('renders DARF title', () => {
    render(<DarfTab totalFgts={1000} totalInss={2000} />);
    expect(screen.getAllByText(/DARF/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders IRRF label', () => {
    render(<DarfTab totalFgts={0} totalInss={0} />);
    expect(screen.getByText(/IRRF/)).toBeInTheDocument();
  });

  it('renders PIS/COFINS label', () => {
    render(<DarfTab totalFgts={0} totalInss={0} />);
    expect(screen.getByText(/PIS\/COFINS/)).toBeInTheDocument();
  });

  it('renders CSLL label', () => {
    render(<DarfTab totalFgts={0} totalInss={0} />);
    expect(screen.getByText(/CSLL/)).toBeInTheDocument();
  });

  it('renders estimated values disclaimer', () => {
    render(<DarfTab totalFgts={0} totalInss={0} />);
    expect(screen.getByText(/valores de DARF são estimativas/)).toBeInTheDocument();
  });

  it('renders vencimento labels', () => {
    render(<DarfTab totalFgts={0} totalInss={0} />);
    expect(screen.getByText(/Venc\. dia 20/)).toBeInTheDocument();
    expect(screen.getByText(/Venc\. dia 25/)).toBeInTheDocument();
  });

  it('computes IRRF as 15% of totalInss', () => {
    render(<DarfTab totalFgts={0} totalInss={2000} />);
    expect(screen.getByText(/300/)).toBeInTheDocument();
  });

  it('computes CSLL as 9% of totalInss', () => {
    render(<DarfTab totalFgts={0} totalInss={2000} />);
    expect(screen.getByText(/180/)).toBeInTheDocument();
  });
});
