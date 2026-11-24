import type { ReactNode } from 'react';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: { children?: ReactNode; [key: string]: unknown }) => <div {...rest}>{children}</div>,
  },
}));

import { ESocialConciliacao } from '../esocial/ESocialConciliacao';

const raiz = resolve(__dirname, '../../..');
const fonte = (rel: string) => readFileSync(resolve(raiz, rel), 'utf8');

// Regressão: a aba de conciliação e o card de insights do eSocial exibiam números,
// nomes e ações inventados. Estes testes impedem que dados fictícios voltem à tela.
describe('eSocial sem dados fictícios', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('conciliação não exibe valores monetários', () => {
    const { container } = render(<ESocialConciliacao />);
    expect(container.textContent ?? '').not.toMatch(/R\$\s?\d/);
    expect(container.textContent ?? '').not.toMatch(/\d{1,3}(\.\d{3})*,\d{2}/);
  });

  it('conciliação não renderiza tabela de rubricas', () => {
    const { container } = render(<ESocialConciliacao />);
    expect(container.querySelector('table')).toBeNull();
  });

  it('conciliação não agenda timers ao montar (sem atualização simulada)', () => {
    vi.useFakeTimers();
    render(<ESocialConciliacao />);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('conciliação mantém a descrição do comparativo sistema × governo', () => {
    render(<ESocialConciliacao />);
    expect(screen.getByText('Comparativo entre cálculos do sistema e retornos do Governo')).toBeInTheDocument();
  });

  it('conciliação não menciona colaborador ou provedor de IA fictícios', () => {
    const { container } = render(<ESocialConciliacao />);
    expect(container.textContent ?? '').not.toMatch(/João Silva|Lovable/);
  });

  it('conciliação mostra o ícone do estado vazio', () => {
    const { container } = render(<ESocialConciliacao />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('o componente de conciliação não contém dados fixos de rubricas', () => {
    const src = fonte('src/components/esocial/ESocialConciliacao.tsx');
    expect(src).not.toMatch(/mockConciliacao|14830|14825/);
  });

  it('o componente de conciliação não simula sucesso com setTimeout/toast', () => {
    const src = fonte('src/components/esocial/ESocialConciliacao.tsx');
    expect(src).not.toMatch(/setTimeout|toast\.success/);
  });

  it('a página do eSocial não importa mais o card de insights fictícios', () => {
    const src = fonte('src/pages/ESocialPage.tsx');
    expect(src).not.toMatch(/ESocialAIInsights/);
  });

  it('a página do eSocial não exibe o título "Insights da IA"', () => {
    const src = fonte('src/pages/ESocialPage.tsx');
    expect(src).not.toMatch(/Insights da IA/);
  });

  it('o componente de insights fictícios foi removido do código', () => {
    expect(existsSync(resolve(raiz, 'src/components/esocial/ESocialAIInsights.tsx'))).toBe(false);
  });
});
