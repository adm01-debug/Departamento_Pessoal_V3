import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/utils', () => ({ cn: (...c: any[]) => c.filter(Boolean).join(' ') }));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, id, className }: any) => (
    <div data-testid="card" id={id} className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: any) => (
    <div data-testid="card-header" className={className}>{children}</div>
  ),
  CardTitle: ({ children }: any) => <h3 data-testid="card-title">{children}</h3>,
  CardDescription: ({ children }: any) => <p data-testid="card-desc">{children}</p>,
  CardContent: ({ children, className }: any) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
}));

import { Row } from '../layout/Row';
import { Column } from '../layout/Column';
import { Grid } from '../layout/Grid';
import { Section } from '../layout/Section';

// ─── Row ──────────────────────────────────────────────────────────────────────

describe('Row', () => {
  it('renders children', () => {
    render(<Row><span>item-a</span><span>item-b</span></Row>);
    expect(screen.getByText('item-a')).toBeTruthy();
    expect(screen.getByText('item-b')).toBeTruthy();
  });

  it('has flex class', () => {
    const { container } = render(<Row>x</Row>);
    expect((container.firstChild as HTMLElement).className).toContain('flex');
  });

  it('applies flex-wrap when wrap=true', () => {
    const { container } = render(<Row wrap>x</Row>);
    expect((container.firstChild as HTMLElement).className).toContain('flex-wrap');
  });

  it('applies flex-row-reverse when reverse=true', () => {
    const { container } = render(<Row reverse>x</Row>);
    expect((container.firstChild as HTMLElement).className).toContain('flex-row-reverse');
  });

  it('does not apply flex-row-reverse by default', () => {
    const { container } = render(<Row>x</Row>);
    expect((container.firstChild as HTMLElement).className).not.toContain('flex-row-reverse');
  });

  it('applies custom className', () => {
    const { container } = render(<Row className="my-row">x</Row>);
    expect((container.firstChild as HTMLElement).className).toContain('my-row');
  });

  it('applies gap-8 for gap=xl', () => {
    const { container } = render(<Row gap="xl">x</Row>);
    expect((container.firstChild as HTMLElement).className).toContain('gap-8');
  });

  it('applies gap-0 for gap=none', () => {
    const { container } = render(<Row gap="none">x</Row>);
    expect((container.firstChild as HTMLElement).className).toContain('gap-0');
  });

  it('applies justify-between for justify=between', () => {
    const { container } = render(<Row justify="between">x</Row>);
    expect((container.firstChild as HTMLElement).className).toContain('justify-between');
  });
});

// ─── Column ───────────────────────────────────────────────────────────────────

describe('Column', () => {
  it('renders children', () => {
    render(<Column>col content</Column>);
    expect(screen.getByText('col content')).toBeTruthy();
  });

  it('has flex flex-col classes', () => {
    const { container } = render(<Column>x</Column>);
    const cls = (container.firstChild as HTMLElement).className;
    expect(cls).toContain('flex');
    expect(cls).toContain('flex-col');
  });

  it('applies col-span-6 for span=6', () => {
    const { container } = render(<Column span={6}>x</Column>);
    expect((container.firstChild as HTMLElement).className).toContain('col-span-6');
  });

  it('applies col-span-12 for span=12', () => {
    const { container } = render(<Column span={12}>x</Column>);
    expect((container.firstChild as HTMLElement).className).toContain('col-span-12');
  });

  it('does not apply col-span when span omitted', () => {
    const { container } = render(<Column>x</Column>);
    expect((container.firstChild as HTMLElement).className).not.toContain('col-span');
  });

  it('applies custom className', () => {
    const { container } = render(<Column className="my-col">x</Column>);
    expect((container.firstChild as HTMLElement).className).toContain('my-col');
  });

  it('applies gap-6 for gap=lg', () => {
    const { container } = render(<Column gap="lg">x</Column>);
    expect((container.firstChild as HTMLElement).className).toContain('gap-6');
  });
});

// ─── Grid ─────────────────────────────────────────────────────────────────────

describe('Grid', () => {
  it('renders children', () => {
    render(<Grid><div>child-1</div><div>child-2</div></Grid>);
    expect(screen.getByText('child-1')).toBeTruthy();
    expect(screen.getByText('child-2')).toBeTruthy();
  });

  it('has grid class', () => {
    const { container } = render(<Grid>x</Grid>);
    expect((container.firstChild as HTMLElement).className).toContain('grid');
  });

  it('applies grid-cols-1 for cols=1', () => {
    const { container } = render(<Grid cols={1}>x</Grid>);
    expect((container.firstChild as HTMLElement).className).toContain('grid-cols-1');
  });

  it('applies grid-cols-12 for cols=12 (default)', () => {
    const { container } = render(<Grid>x</Grid>);
    expect((container.firstChild as HTMLElement).className).toContain('grid-cols-12');
  });

  it('applies gap-0 for gap=none', () => {
    const { container } = render(<Grid gap="none">x</Grid>);
    expect((container.firstChild as HTMLElement).className).toContain('gap-0');
  });

  it('applies gap-8 for gap=xl', () => {
    const { container } = render(<Grid gap="xl">x</Grid>);
    expect((container.firstChild as HTMLElement).className).toContain('gap-8');
  });

  it('applies custom className', () => {
    const { container } = render(<Grid className="my-grid">x</Grid>);
    expect((container.firstChild as HTMLElement).className).toContain('my-grid');
  });

  it('applies items-center for align=center', () => {
    const { container } = render(<Grid align="center">x</Grid>);
    expect((container.firstChild as HTMLElement).className).toContain('items-center');
  });
});

// ─── Section ──────────────────────────────────────────────────────────────────

describe('Section', () => {
  it('renders children', () => {
    render(<Section>section child</Section>);
    expect(screen.getByText('section child')).toBeTruthy();
  });

  it('renders as <section> element by default', () => {
    const { container } = render(<Section>x</Section>);
    expect(container.querySelector('section')).toBeTruthy();
  });

  it('renders title in section mode', () => {
    render(<Section title="My Section">x</Section>);
    expect(screen.getByText('My Section')).toBeTruthy();
  });

  it('renders description in section mode', () => {
    render(<Section title="T" description="A helpful description">x</Section>);
    expect(screen.getByText('A helpful description')).toBeTruthy();
  });

  it('renders actions in section mode', () => {
    render(<Section title="T" actions={<button>Action</button>}>x</Section>);
    expect(screen.getByText('Action')).toBeTruthy();
  });

  it('renders icon in section mode', () => {
    render(<Section title="T" icon={<span data-testid="icon">★</span>}>x</Section>);
    expect(screen.getByTestId('icon')).toBeTruthy();
  });

  it('applies id prop in section mode', () => {
    const { container } = render(<Section id="target-section">x</Section>);
    expect(container.querySelector('#target-section')).toBeTruthy();
  });

  it('applies border class when bordered=true', () => {
    const { container } = render(<Section bordered>x</Section>);
    expect((container.firstChild as HTMLElement).className).toContain('border');
  });

  it('renders as Card when asCard=true', () => {
    render(<Section asCard title="Card Section">content</Section>);
    expect(screen.getByTestId('card')).toBeTruthy();
    expect(screen.getByTestId('card-title')).toBeTruthy();
    expect(screen.getByText('Card Section')).toBeTruthy();
  });

  it('renders CardContent in card mode', () => {
    render(<Section asCard>card content</Section>);
    expect(screen.getByTestId('card-content')).toBeTruthy();
  });

  it('renders card description when provided in card mode', () => {
    render(<Section asCard title="T" description="Card desc">x</Section>);
    expect(screen.getByTestId('card-desc')).toBeTruthy();
    expect(screen.getByText('Card desc')).toBeTruthy();
  });

  it('renders card actions when provided in card mode', () => {
    render(<Section asCard title="T" actions={<button>Card Act</button>}>x</Section>);
    expect(screen.getByText('Card Act')).toBeTruthy();
  });

  it('renders card icon when provided in card mode', () => {
    render(<Section asCard title="T" icon={<span data-testid="card-icon">◆</span>}>x</Section>);
    expect(screen.getByTestId('card-icon')).toBeTruthy();
  });

  it('applies id prop in card mode', () => {
    render(<Section asCard id="card-anchor">x</Section>);
    expect(screen.getByTestId('card').id).toBe('card-anchor');
  });

  it('no header rendered when no title/description/actions', () => {
    const { container } = render(<Section>only children</Section>);
    expect(container.querySelector('.flex.flex-col.gap-1')).toBeNull();
  });
});
