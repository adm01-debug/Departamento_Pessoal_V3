import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Home } from 'lucide-react';
import { PageContainer } from '../layout/PageContainer';
import { NavItem } from '../layout/NavItem';
import { Flex } from '../layout/Flex';
import { Stack } from '../layout/Stack';
import { Footer } from '../layout/Footer';

describe('PageContainer', () => {
  it('renders children', () => {
    render(<PageContainer><span>Page Content</span></PageContainer>);
    expect(screen.getByText('Page Content')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(<PageContainer title="Colaboradores"><div /></PageContainer>);
    expect(screen.getByText('Colaboradores')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<PageContainer title="Folha" description="Gestão mensal"><div /></PageContainer>);
    expect(screen.getByText('Gestão mensal')).toBeInTheDocument();
  });

  it('does not render description header when no title', () => {
    render(<PageContainer><span>hello</span></PageContainer>);
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('renders actions slot', () => {
    render(<PageContainer title="Cargos" actions={<button>Novo</button>}><div /></PageContainer>);
    expect(screen.getByText('Novo')).toBeInTheDocument();
  });
});

describe('NavItem', () => {
  it('renders children text', () => {
    render(<NavItem>Dashboard</NavItem>);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders as anchor when href provided', () => {
    render(<NavItem href="/dashboard">Dashboard</NavItem>);
    expect(screen.getByRole('link')).toBeInTheDocument();
  });

  it('renders as button when no href', () => {
    render(<NavItem>Dashboard</NavItem>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders badge when badge prop provided', () => {
    render(<NavItem badge={5}>Alertas</NavItem>);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<NavItem onClick={onClick}>Item</NavItem>);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});

describe('Flex', () => {
  it('renders children', () => {
    render(<Flex><span>A</span><span>B</span></Flex>);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });
});

describe('Stack', () => {
  it('renders children', () => {
    render(<Stack><span>First</span><span>Second</span></Stack>);
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });
});

describe('Footer', () => {
  it('renders copyright text', () => {
    render(<Footer />);
    expect(screen.getByText(/Sistema DP/)).toBeInTheDocument();
  });

  it('renders current year', () => {
    render(<Footer />);
    expect(screen.getByText(new RegExp(new Date().getFullYear().toString()))).toBeInTheDocument();
  });
});
