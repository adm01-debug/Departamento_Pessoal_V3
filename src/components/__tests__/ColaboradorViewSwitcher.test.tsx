import { readFileSync } from 'node:fs';
import path from 'node:path';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColaboradorViewSwitcher, type ColaboradorViewMode } from '../colaboradores/ColaboradorViewSwitcher';

/**
 * ============================================================================
 * SELETOR "TABELA / DIRETÓRIO" — PÍLULA DESLIZANTE (layoutId + mola).
 *
 * O destaque do modo ativo NÃO é mais um par de classes estáticas aplicado
 * condicionalmente ao botão: é um elemento dedicado (`motion.span` com
 * `layoutId`) renderizado só na opção ativa, que o Framer Motion desliza de
 * uma opção para a outra. Aqui travamos:
 *
 *   • rótulos, ícones e semântica (`aria-pressed`) originais;
 *   • uma única pílula, sempre dentro da opção ativa;
 *   • a ordem de camadas (pílula por baixo do texto; botão inativo acima da
 *     pílula que atravessa);
 *   • a lógica de alternância (o `onChange` continua sendo a única saída);
 *   • os parâmetros da mola e o respeito ao movimento reduzido — que não são
 *     observáveis no DOM, então são checados na FONTE do componente.
 * ============================================================================
 */

function Harness({ inicial = 'tabela' }: { inicial?: ColaboradorViewMode }) {
  const [modo, setModo] = useState<ColaboradorViewMode>(inicial);

  return (
    <>
      <ColaboradorViewSwitcher value={modo} onChange={setModo} />
      <span data-testid="modo-atual">{modo}</span>
    </>
  );
}

const pilulasEm = (raiz: HTMLElement) => raiz.querySelectorAll('[data-pilula-visualizacao]');

/** Span de conteúdo (ícone + rótulo) — o que fica acima da pílula. */
const caminhoDoConteudo = (botao: HTMLElement) => botao.querySelector('span.inline-flex') as HTMLElement;

describe('ColaboradorViewSwitcher — pílula deslizante', () => {
  it('preserva os rótulos e a semântica das duas opções', () => {
    render(<Harness />);

    const tabela = screen.getByRole('button', { name: 'Tabela' });
    const diretorio = screen.getByRole('button', { name: 'Diretório' });

    expect(tabela).toHaveAttribute('aria-pressed', 'true');
    expect(diretorio).toHaveAttribute('aria-pressed', 'false');
    // Ícones originais preservados (Table2 / LayoutGrid renderizam um `svg` cada).
    expect(tabela.querySelectorAll('svg')).toHaveLength(1);
    expect(diretorio.querySelectorAll('svg')).toHaveLength(1);
  });

  it('renderiza UMA pílula animada, só na opção ativa, cobrindo o botão inteiro', () => {
    const { container } = render(<Harness />);

    const pilulas = pilulasEm(container);
    expect(pilulas).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Tabela' }).contains(pilulas[0])).toBe(true);
    expect(screen.getByRole('button', { name: 'Diretório' }).contains(pilulas[0])).toBe(false);

    expect(pilulas[0]).toHaveAttribute('aria-hidden', 'true');
    expect(pilulas[0]).toHaveClass(
      'absolute',
      '-inset-px',
      'z-0',
      'rounded-lg',
      'border',
      'border-primary',
      'bg-primary/10',
      'pointer-events-none'
    );
  });

  it('a pílula é um elemento dedicado: o botão ativo não carrega mais a borda estática', () => {
    render(<Harness />);
    const tabela = screen.getByRole('button', { name: 'Tabela' });

    // Borda/fundo do destaque vivem na pílula, não no botão.
    expect(tabela).not.toHaveClass('border-primary');
    expect(tabela).not.toHaveClass('bg-primary/10');
    expect(tabela).toHaveClass('relative', 'border', 'border-transparent');
    // Nada de `overflow-hidden`: cortaria a pílula no meio do trajeto.
    expect(tabela.className).not.toMatch(/overflow-hidden/);

    // Cor do conteúdo no span que fica acima da pílula.
    const conteudo = caminhoDoConteudo(tabela);
    expect(conteudo).toHaveClass('relative', 'z-10', 'text-primary');
    expect(conteudo).toHaveClass('transition-colors', 'duration-300', 'ease-out');
    expect(conteudo.textContent).toBe('Tabela');
  });

  it('mantém a pílula por baixo dos rótulos (camadas por z-index)', () => {
    render(<Harness inicial="diretorio" />);

    const tabela = screen.getByRole('button', { name: 'Tabela' });
    const diretorio = screen.getByRole('button', { name: 'Diretório' });

    // Ativo em z-0 (dono da pílula); inativo em z-10 (passa por cima dela).
    expect(diretorio).toHaveClass('z-0');
    expect(tabela).toHaveClass('z-10');
    expect(caminhoDoConteudo(tabela)).toHaveClass('relative', 'z-10', 'text-muted-foreground');
    expect(caminhoDoConteudo(diretorio)).toHaveClass('relative', 'z-10', 'text-primary');
  });

  it('desliza a pílula para a outra opção sem alterar a lógica de alternância', async () => {
    const { container } = render(<Harness />);

    await userEvent.click(screen.getByRole('button', { name: 'Diretório' }));

    expect(screen.getByTestId('modo-atual')).toHaveTextContent('diretorio');
    expect(screen.getByRole('button', { name: 'Diretório' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Tabela' })).toHaveAttribute('aria-pressed', 'false');

    const pilulas = pilulasEm(container);
    expect(pilulas).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Diretório' }).contains(pilulas[0])).toBe(true);
    expect(caminhoDoConteudo(screen.getByRole('button', { name: 'Diretório' }))).toHaveClass('text-primary');
    expect(caminhoDoConteudo(screen.getByRole('button', { name: 'Tabela' }))).toHaveClass('text-muted-foreground');

    await userEvent.click(screen.getByRole('button', { name: 'Tabela' }));
    expect(screen.getByTestId('modo-atual')).toHaveTextContent('tabela');
    expect(caminhoDoConteudo(screen.getByRole('button', { name: 'Tabela' }))).toHaveClass('text-primary');
  });

  it('emite a mudança pelo onChange (único caminho de saída)', async () => {
    const onChange = vi.fn();
    render(<ColaboradorViewSwitcher value="tabela" onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Diretório' }));
    expect(onChange).toHaveBeenCalledWith('diretorio');

    await userEvent.click(screen.getByRole('button', { name: 'Tabela' }));
    expect(onChange).toHaveBeenCalledWith('tabela');
  });
});

describe('ColaboradorViewSwitcher — mola e movimento reduzido (fonte)', () => {
  const FONTE = readFileSync(
    path.resolve(process.cwd(), 'src/components/colaboradores/ColaboradorViewSwitcher.tsx'),
    'utf8'
  );
  /** Código sem comentários: a documentação cita os parâmetros, o código os aplica. */
  const CODIGO = FONTE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

  it('usa layoutId compartilhado no elemento de fundo, escopado por instância', () => {
    expect(CODIGO).toMatch(/import\s*\{[^}]*\bmotion\b[^}]*\}\s*from\s*'framer-motion'/);
    expect(CODIGO).toMatch(/const layoutId = `visualizacaoAtiva-\$\{escopo\}`;/);
    expect(CODIGO).toMatch(/layoutId=\{layoutId\}/);
    // Escopo por instância: o grupo acompanha o sufixo de `useId()`.
    expect(CODIGO).toMatch(/<LayoutGroup id=\{`grupo-visualizacao-\$\{escopo\}`\}>/);
    expect(CODIGO).toMatch(/<motion\.span[\s\S]*?layoutId=/);
  });

  it('usa exatamente a mola aprovada (spring 380 / 30 / 0,8)', () => {
    expect(CODIGO).toMatch(/type:\s*'spring',\s*stiffness:\s*380,\s*damping:\s*30,\s*mass:\s*0\.8/);
  });

  it('zera o deslizamento quando o usuário pede movimento reduzido', () => {
    expect(CODIGO).toMatch(/import\s*\{\s*useMovimentoReduzido\s*\}\s*from\s*'@\/lib\/motionMode'/);
    expect(CODIGO).toMatch(/movimentoReduzido\s*\?\s*TRANSICAO_REDUZIDA\s*:\s*MOLA_VISUALIZACAO/);
    // A pílula recebe a transição escolhida (nunca a mola fixa).
    expect(CODIGO).toMatch(/<motion\.span[\s\S]*?transition=\{transition\}/);
    expect(CODIGO).not.toMatch(/transition=\{MOLA_VISUALIZACAO\}/);
  });
});
