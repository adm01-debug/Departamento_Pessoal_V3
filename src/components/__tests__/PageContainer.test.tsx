import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PageContainer } from '../layout/PageContainer';

describe('PageContainer', () => {
  it('renders children', () => {
    render(<PageContainer><p>Content</p></PageContainer>);
    expect(screen.getByText('Content')).toBeTruthy();
  });

  it('renders title when provided', () => {
    render(<PageContainer title="My Page"><span /></PageContainer>);
    expect(screen.getByText('My Page')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
  });

  it('does not render h1 when title is omitted', () => {
    render(<PageContainer><span /></PageContainer>);
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('renders description when provided', () => {
    render(<PageContainer title="T" description="Desc"><span /></PageContainer>);
    expect(screen.getByText('Desc')).toBeTruthy();
  });

  it('does not render description when omitted', () => {
    render(<PageContainer title="T"><span /></PageContainer>);
    expect(screen.queryByText('Desc')).toBeNull();
  });

  it('renders actions when provided', () => {
    render(<PageContainer title="T" actions={<button>Action</button>}><span /></PageContainer>);
    expect(screen.getByText('Action')).toBeTruthy();
  });

  it('renders breadcrumbs when provided', () => {
    render(<PageContainer breadcrumbs={<nav>Crumb</nav>}><span /></PageContainer>);
    expect(screen.getByText('Crumb')).toBeTruthy();
  });

  it('does not render breadcrumbs section when omitted', () => {
    const { container } = render(<PageContainer><span /></PageContainer>);
    // breadcrumbs wrapper has class mb-4, header wrapper has mb-6
    const mbFourDivs = container.querySelectorAll('.mb-4');
    expect(mbFourDivs).toHaveLength(0);
  });

  it('applies default maxWidth class (max-w-screen-2xl)', () => {
    const { container } = render(<PageContainer><span /></PageContainer>);
    expect(container.firstChild).toHaveProperty('className');
    expect((container.firstChild as HTMLElement).className).toContain('max-w-screen-2xl');
  });

  it('applies provided maxWidth class', () => {
    const { container } = render(<PageContainer maxWidth="lg"><span /></PageContainer>);
    expect((container.firstChild as HTMLElement).className).toContain('max-w-screen-lg');
  });

  it('applies default padding class (p-6)', () => {
    const { container } = render(<PageContainer><span /></PageContainer>);
    expect((container.firstChild as HTMLElement).className).toContain('p-6');
  });

  it('applies provided padding class', () => {
    const { container } = render(<PageContainer padding="lg"><span /></PageContainer>);
    expect((container.firstChild as HTMLElement).className).toContain('p-8');
  });

  it('applies custom className', () => {
    const { container } = render(<PageContainer className="custom-class"><span /></PageContainer>);
    expect((container.firstChild as HTMLElement).className).toContain('custom-class');
  });

  it('shows header section only when title or actions are provided', () => {
    const { container } = render(<PageContainer actions={<button>A</button>}><span /></PageContainer>);
    // header flex div exists
    expect(container.querySelector('.flex.flex-col.gap-4.mb-6')).toBeTruthy();
  });

  it('does not render header section when neither title nor actions', () => {
    const { container } = render(<PageContainer><span /></PageContainer>);
    expect(container.querySelector('.mb-6')).toBeNull();
  });
});
