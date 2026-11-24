import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * RÉGUA GLOBAL DOS TOOLTIPS DE GRÁFICO — prova objetiva da correção.
 *
 * O defeito: o Recharts posiciona a tooltip por `transform: translate(x, y)` e,
 * com `isAnimationActive` (padrão `'auto'`), injeta `transition: transform
 * 400ms ease` no wrapper. Como a posição só existe depois da primeira medição,
 * a tooltip nascia na origem/anterior e DESLIZAVA até o ponto ativo — a cada
 * troca de ponto ("aparece na lateral e voa até o mouse").
 *
 * A régua (`ui/tooltipGrafico.tsx`) desliga a animação de POSIÇÃO
 * (`isAnimationActive={false}`: o `translate` final é aplicado direto) e deixa
 * só um fade de opacidade (`--transition-duration-tooltip`, 150ms), aplicado ao
 * bloco que monta quando o ponto fica ativo.
 *
 * Este teste trava: (1) as props que o componente compartilhado entrega ao
 * Recharts, (2) o conteúdo padrão com o fade e (3) a adesão de TODOS os
 * gráficos — nenhum pode voltar a usar o primitivo cru.
 */
vi.mock('recharts', () => ({
  Tooltip: ({ isAnimationActive, content, wrapperStyle, contentStyle }: any) => (
    <div
      data-testid="recharts-tooltip"
      data-animacao={String(isAnimationActive)}
      data-outline={String(wrapperStyle?.outline ?? '')}
      data-fonte={String(contentStyle?.fontSize ?? '')}
    >
      {content}
    </div>
  ),
  DefaultTooltipContent: ({ label }: any) => <div data-testid="conteudo-padrao">{String(label)}</div>,
}));

/** Gráficos do sistema (Recharts) e a quantidade de tooltips em cada um. */
const GRAFICOS: Record<string, number> = {
  'src/components/admin/telemetry/TelemetryCharts.tsx': 4,
  'src/components/admissoes/AdmissoesDashboard.tsx': 1,
  'src/components/beneficios/BeneficiosDashboard.tsx': 2,
  'src/components/dashboard/HeadcountOverviewCard.tsx': 1,
  'src/components/desligamentos/TurnoverChart.tsx': 1,
  'src/components/ferias/FeriasDashboard.tsx': 2,
  'src/components/folha/FolhaDashboard.tsx': 3,
  'src/components/metabase/MetabaseEmbed.tsx': 4,
  'src/components/ponto/GestaoPontoAnalytics.tsx': 1,
  'src/components/ponto/PontoCharts.tsx': 2,
  'src/components/premiacoes/RewardsSimulator.tsx': 2,
  'src/components/recrutamento/AnalyticsEvolucao.tsx': 1,
  'src/components/relatorios/RelatoriosAnalyticsTab.tsx': 4,
  'src/components/sst/SSTExamesTab.tsx': 2,
  'src/pages/AfastamentosPage.tsx': 1,
  'src/pages/DashboardExecutivoPage.tsx': 4,
  'src/pages/PassivoTrabalhistaPage.tsx': 2,
  'src/pages/ProvisoesPage.tsx': 1,
};

describe('tooltip dos gráficos — posição direta, entrada só por opacidade', () => {
  it('o componente compartilhado desliga a animação de posição do Recharts', () => {
    render(<TooltipGrafico contentStyle={{ fontSize: 12 }} />);
    expect(screen.getByTestId('recharts-tooltip')).toHaveAttribute('data-animacao', 'false');
  });

  it('as props do gráfico continuam chegando ao Recharts (nada é engolido)', () => {
    render(<TooltipGrafico contentStyle={{ fontSize: 11 }} />);
    const wrapper = screen.getByTestId('recharts-tooltip');
    expect(wrapper).toHaveAttribute('data-fonte', '11');
    // `outline: none` vem da régua (o wrapper do Recharts é focável).
    expect(wrapper).toHaveAttribute('data-outline', 'none');
  });

  it('conteúdo próprio do gráfico continua sendo usado, sem troca silenciosa', () => {
    render(<TooltipGrafico content={<div data-testid="conteudo-do-grafico" />} />);
    expect(screen.getByTestId('conteudo-do-grafico')).toBeInTheDocument();
    expect(screen.queryByTestId('conteudo-padrao')).not.toBeInTheDocument();
  });

  it('o conteúdo padrão só monta com ponto ativo (o fade roda na aparição)', () => {
    const { rerender } = render(<ConteudoTooltipGrafico active={false} payload={[]} />);
    expect(screen.queryByTestId('conteudo-padrao')).not.toBeInTheDocument();

    rerender(<ConteudoTooltipGrafico active label="Jul/26" payload={[{ value: 38 }] as any} />);
    const bloco = screen.getByTestId('conteudo-padrao').parentElement;
    expect(bloco).toHaveClass(CLASSE_ENTRADA_TOOLTIP);
    expect(screen.getByTestId('conteudo-padrao')).toHaveTextContent('Jul/26');
  });
});

import {
  CLASSE_ENTRADA_TOOLTIP,
  ConteudoTooltipGrafico,
  ConteudoTooltipRosca,
  TooltipGrafico,
} from '../ui/tooltipGrafico';

const ler = (relativo: string) => readFileSync(path.resolve(process.cwd(), relativo), 'utf8');

describe('régua CSS e adesão de todos os gráficos', () => {
  it('o fade é só opacidade: 150ms, ease-out, sem transform', () => {
    const css = ler('src/index.css');
    expect(css).toContain('--transition-duration-tooltip: 150ms;');
    expect(css).toMatch(
      /@keyframes tooltipGraficoFade\s*\{\s*from\s*\{\s*opacity: 0;\s*\}\s*to\s*\{\s*opacity: 1;\s*\}\s*\}/
    );
    expect(css).toMatch(
      /\.tooltip-grafico-entrada\s*\{\s*animation: tooltipGraficoFade var\(--transition-duration-tooltip\) ease-out both;\s*\}/
    );
    // Nenhum `translate`/`scale` na entrada do tooltip de gráfico.
    const inicio = css.indexOf('.tooltip-grafico-entrada {');
    const regra = css.slice(inicio, css.indexOf('}', inicio));
    expect(regra).not.toMatch(/translate|scale|transform/);
  });

  it('prefers-reduced-motion desliga o fade do tooltip de gráfico', () => {
    const css = ler('src/index.css');
    expect(css).toMatch(/\.tooltip-grafico-entrada \{\s*\n\s*animation: none;\s*\n\s*\}/);
  });

  it('todos os gráficos usam a régua (38 tooltips, nenhum primitivo cru)', () => {
    let total = 0;
    for (const [arquivo, quantidade] of Object.entries(GRAFICOS)) {
      const fonte = ler(arquivo);
      const usos = [...fonte.matchAll(/<TooltipGrafico(?=[\s/>])/g)].length;
      total += usos;
      expect(usos, `${arquivo}: usa a régua em todos os tooltips`).toBe(quantidade);
      expect(fonte, `${arquivo}: importa a régua`).toContain("from '@/components/ui/tooltipGrafico'");
      // O primitivo cru do Recharts não pode voltar (nem com alias). Exceção:
      // telas que também usam o tooltip de UI (`<Tooltip>` do Radix).
      if (!fonte.includes("from '@/components/ui/tooltip'")) {
        expect(fonte, `${arquivo}: ainda usa <Tooltip> do Recharts`).not.toMatch(/^\s*<Tooltip(?=[\s/>])/m);
      }
      expect(fonte, `${arquivo}: ainda usa <RechartsTooltip>`).not.toMatch(/^\s*<RechartsTooltip(?=[\s/>])/m);
      const importRecharts = fonte.match(/import\s*\{([\s\S]*?)\}\s*from\s*['"]recharts['"]/);
      expect(importRecharts, `${arquivo}: import do Recharts não encontrado`).not.toBeNull();
      expect(importRecharts![1], `${arquivo}: importa Tooltip do Recharts`).not.toMatch(/\bTooltip\b/);
    }
    expect(total).toBe(38);
  });

  it('quem usa conteúdo próprio declara a mesma entrada (só opacidade)', () => {
    const comConteudoProprio = [
      'src/components/desligamentos/TurnoverChart.tsx',
      'src/components/premiacoes/RewardsSimulator.tsx',
      'src/components/recrutamento/AnalyticsEvolucao.tsx',
      'src/pages/DashboardExecutivoPage.tsx',
      'src/pages/PassivoTrabalhistaPage.tsx',
    ];
    for (const arquivo of comConteudoProprio) {
      const fonte = ler(arquivo);
      expect(fonte, `${arquivo}: sem CLASSE_ENTRADA_TOOLTIP no conteúdo`).toContain('CLASSE_ENTRADA_TOOLTIP');
      // A entrada antiga do Passivo (fade + zoom) saiu: escala não é permitida.
      expect(fonte, `${arquivo}: ainda anima zoom na tooltip`).not.toContain('zoom-in-95 duration-fast');
    }
  });
});

/**
 * ROSCA — um único conteúdo para todas as roscas do sistema.
 *
 * O card "Composição do Passivo" tinha o conteúdo escrito dentro da página; o
 * donut "Distribuição de Status" (Ponto → Gestão da Equipe → Visão Geral) usava
 * `<TooltipGrafico />` sem `content` e caía no `DefaultTooltipContent` do
 * Recharts — caixa BRANCA (`#fff`, borda `#ccc`, cantos retos) sobre o card
 * escuro. Os dois passaram a usar o mesmo componente (`ConteudoTooltipRosca`):
 * este teste trava o visual (caixa do DS + linha `categoria : valor` na cor da
 * fatia), a entrada só por opacidade e a adesão das duas telas.
 */
describe('conteúdo de rosca compartilhado (Composição do Passivo + Distribuição de Status)', () => {
  const FATIA = { name: 'No Horário', value: 5, color: 'rgb(16, 185, 129)' };

  it('mostra `categoria : valor` na cor da fatia, dentro da caixa do Design System', () => {
    render(<ConteudoTooltipRosca active payload={[FATIA]} />);
    const linha = screen.getByText('No Horário : 5');
    const caixa = linha.parentElement!;
    // Caixa da referência: bg-card + borda discreta + cantos + sombra + padding compacto.
    expect(caixa).toHaveClass('rounded-lg', 'border', 'border-border', 'bg-card', 'px-2.5', 'py-1.5', 'shadow-md');
    // Entrada da régua (só opacidade) e tipografia da referência.
    expect(caixa).toHaveClass(CLASSE_ENTRADA_TOOLTIP);
    expect(linha).toHaveClass('text-[11px]');
    expect(linha).toHaveClass('font-bold');
    expect(linha.style.color).toBe('rgb(16, 185, 129)');
  });

  it('sem ponto ativo não renderiza nada (a caixa monta na aparição, sem reanimar)', () => {
    const { container, rerender } = render(<ConteudoTooltipRosca />);
    expect(container).toBeEmptyDOMElement();
    rerender(<ConteudoTooltipRosca active={false} payload={[FATIA]} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<ConteudoTooltipRosca active payload={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('formata o valor por tela: quantidade (pt-BR) por padrão, moeda na referência', () => {
    const { rerender } = render(<ConteudoTooltipRosca active payload={[FATIA]} />);
    expect(screen.getByText('No Horário : 5')).toBeInTheDocument();

    rerender(
      <ConteudoTooltipRosca
        active
        payload={[{ name: 'Multa FGTS (40%)', value: 3100, color: '#EF4D4D' }]}
        formatarValor={(valor) => `R$ ${valor.toFixed(2)}`}
      />
    );
    expect(screen.getByText('Multa FGTS (40%) : R$ 3100.00')).toBeInTheDocument();
  });

  it('valor inválido não quebra a caixa (cai em 0)', () => {
    render(<ConteudoTooltipRosca active payload={[{ name: 'Faltas', value: undefined }]} />);
    expect(screen.getByText('Faltas : 0')).toBeInTheDocument();
  });

  it('as duas roscas usam o MESMO conteúdo (nenhuma volta ao tooltip branco do Recharts)', () => {
    for (const arquivo of ['src/pages/PassivoTrabalhistaPage.tsx', 'src/components/ponto/GestaoPontoAnalytics.tsx']) {
      const fonte = ler(arquivo);
      expect(fonte, `${arquivo}: importa o conteúdo de rosca compartilhado`).toContain('ConteudoTooltipRosca');
      expect(fonte, `${arquivo}: passa o conteúdo ao TooltipGrafico`).toMatch(
        /<TooltipGrafico[^>]*content=\{<ConteudoTooltipRosca/
      );
    }
    // A cópia local da página do Passivo não pode voltar.
    expect(ler('src/pages/PassivoTrabalhistaPage.tsx')).not.toContain('PieTooltipContent');
    // E o donut do Ponto não pode voltar a usar o tooltip sem conteúdo.
    expect(ler('src/components/ponto/GestaoPontoAnalytics.tsx')).not.toMatch(/<TooltipGrafico\s*\/>/);
  });
});
