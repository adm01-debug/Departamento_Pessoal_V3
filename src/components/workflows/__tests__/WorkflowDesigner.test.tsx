import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkflowDesigner, type WfNode } from '../WorkflowDesigner';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), warning: vi.fn(), success: vi.fn() } }));

const node = (id: string, type: WfNode['type'], x: number): WfNode => ({
  id,
  type,
  x,
  y: 100,
  label: id,
  config: {},
});

const ports = (container: HTMLElement) => Array.from(container.querySelectorAll('circle.cursor-crosshair'));

describe('WorkflowDesigner — conexões', () => {
  it('porta de entrada do nó Fim recebe conexão e o fluxo salva', () => {
    const onSave = vi.fn();
    const { container } = render(
      <WorkflowDesigner initialNodes={[node('S', 'start', 0), node('E', 'end', 300)]} onSave={onSave} />
    );
    const [startOut, endIn] = ports(container);
    fireEvent.pointerDown(startOut);
    fireEvent.pointerDown(endIn);
    fireEvent.click(screen.getByText('Salvar Workflow'));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][1]).toEqual([expect.objectContaining({ from: 'S', to: 'E' })]);
  });

  it('porta de entrada de aprovador recebe conexão (Start → Aprovador → Fim)', () => {
    const onSave = vi.fn();
    const { container } = render(
      <WorkflowDesigner
        initialNodes={[node('S', 'start', 0), node('A', 'aprovador', 200), node('E', 'end', 500)]}
        onSave={onSave}
      />
    );
    const [startOut, aIn, aOut, endIn] = ports(container);
    fireEvent.pointerDown(startOut);
    fireEvent.pointerDown(aIn);
    fireEvent.pointerDown(aOut);
    fireEvent.pointerDown(endIn);
    fireEvent.click(screen.getByText('Salvar Workflow'));
    expect(onSave).toHaveBeenCalledTimes(1);
    const conns = onSave.mock.calls[0][1] as Array<{ from: string; to: string }>;
    expect(conns.map((c) => `${c.from}->${c.to}`)).toEqual(['S->A', 'A->E']);
  });

  it('Limpar com conexão pendente não derruba o canvas', () => {
    const { container } = render(
      <WorkflowDesigner initialNodes={[node('S', 'start', 0), node('E', 'end', 300)]} onSave={vi.fn()} />
    );
    fireEvent.pointerDown(ports(container)[0]);
    fireEvent.click(screen.getByText('Limpar'));
    fireEvent.pointerMove(container.querySelector('svg') as SVGSVGElement, { clientX: 50, clientY: 50 });
    expect(ports(container)).toHaveLength(0);
  });
});
