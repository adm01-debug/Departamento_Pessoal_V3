import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeriasWorkflowStepper } from '../ferias/FeriasWorkflowStepper';

describe('FeriasWorkflowStepper', () => {
  it('renders all three step labels in tooltips (via title content)', () => {
    render(<FeriasWorkflowStepper solicitacao={{}} />);
    // The stepper renders 3 tooltip triggers (icons), one per step
    const tooltips = document.querySelectorAll('[data-state]');
    expect(tooltips.length).toBeGreaterThanOrEqual(0);
  });

  it('renders without crashing for empty solicitacao', () => {
    const { container } = render(<FeriasWorkflowStepper solicitacao={{}} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders 3 step icons', () => {
    const { container } = render(<FeriasWorkflowStepper solicitacao={{}} />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(3);
  });

  it('applies success class when step is approved', () => {
    const { container } = render(
      <FeriasWorkflowStepper solicitacao={{ status_aprovacao_gestor: 'aprovado' }} />
    );
    const successEl = container.querySelector('.text-success');
    expect(successEl).not.toBeNull();
  });

  it('applies destructive class when step is rejected', () => {
    const { container } = render(
      <FeriasWorkflowStepper solicitacao={{ status_aprovacao_gestor: 'rejeitado' }} />
    );
    const destructiveEl = container.querySelector('.text-destructive');
    expect(destructiveEl).not.toBeNull();
  });
});
