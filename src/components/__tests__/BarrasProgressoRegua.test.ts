import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  BARRA_PROGRESSO_ATRASO_S,
  BARRA_PROGRESSO_DURACAO_S,
  BARRA_PROGRESSO_EASE,
  BARRA_PROGRESSO_PASSO_CASCATA_S,
  propsPreenchimentoBarraCascata,
} from '../ui/progressMotion';

/**
 * RÉGUA GLOBAL DAS BARRAS DE PROGRESSO — prova objetiva de cobertura.
 *
 * As barras do sistema existem em TRÊS formas: o componente compartilhado
 * (`ui/progress.tsx`, Radix), barras `width` em CSS puro e barras `width` em
 * Framer Motion. Cada uma tinha o seu tempo (0,35 s / 0,5 s / 0,6 s / 0,8 s /
 * 1 s / 1,5 s / `duration-slow` / `duration-slower`), e por isso o preenchimento
 * passava rápido demais para ser percebido.
 *
 * Este teste trava a fonte única do ritmo:
 *   - CSS: token `--transition-duration-progresso` (1200ms) → classe
 *     `duration-progresso` + curva `ease-out` + marcador
 *     `barra-progresso-preenchimento` (gancho do `prefers-reduced-motion`);
 *   - JS: `BARRA_PROGRESSO_DURACAO_S` (1,2 s) / `BARRA_PROGRESSO_EASE`.
 *
 * A área protegida (`src/components/avaliacao/**`) NÃO entra na lista: a régua
 * dela é congelada e tem teste próprio (`DesempenhoBarrasProgresso.test.tsx`).
 */
const ler = (relativo: string) => readFileSync(path.resolve(process.cwd(), relativo), 'utf8');

/** Barras que preenchem por CSS (`width`/`transform` + transition). */
const BARRAS_CSS = [
  'src/components/admissao/AdmissaoChecklist.tsx',
  'src/components/admissoes/DetalhesAdmissaoDialog.tsx',
  'src/components/admissoes/KanbanCard.tsx',
  'src/components/admissoes/OnboardingCard.tsx',
  'src/components/admissoes/OnboardingDetalheDialog.tsx',
  'src/components/dashboard/ResumoOperacionalCard.tsx',
  'src/components/descontos/NewLoanDialog.tsx',
  'src/components/premiacoes/CampanhaTabela.tsx',
  // `AnalyticsFunil.tsx` saiu da lista: os cards de conversão da referência
  // aprovada mostram só percentual em destaque + rótulo (sem barra de
  // preenchimento), então não há mais barra CSS nesse arquivo para reger.
  //
  // `AnalyticsOrigens.tsx` e `AnalyticsVagas.tsx` também saíram: as duas barras
  // passaram a crescer por Framer Motion com a CASCATA da referência
  // (`barraProgressoAnalytics.tsx` → `propsPreenchimentoBarraCascata`), em vez
  // do `span` CSS que já nascia cheio. A verificação delas está no `it` da
  // cascata, logo abaixo.
  'src/components/treinamentos/TreinamentoParticipantes.tsx',
  'src/components/treinamentos/TurmaCard.tsx',
];

/** Barras que preenchem por Framer Motion (`width: 0 → X%`). */
const BARRAS_MOTION = [
  'src/components/admissoes/AdmissoesDashboard.tsx',
  'src/components/colaborador-detalhes/FeriasResumoTab.tsx',
  'src/components/colaborador-detalhes/desenvolvimento/DesenvolvimentoProfissionalCard.tsx',
  'src/components/dashboard/AnalyticsSection.tsx',
  'src/components/dashboard/analytics/widgets.tsx',
  'src/components/epis/EpiCategoryChart.tsx',
  'src/components/exames/ExameTipoChart.tsx',
  'src/components/folha/CalculoFolhaWizard.tsx',
  'src/components/folha/FolhaComposicao.tsx',
  'src/components/medidas-disciplinares/MedidasGravityScale.tsx',
  'src/components/onboarding/GuidedTour.tsx',
  'src/components/ponto/PontoTodayCard.tsx',
  'src/components/treinamentos/InscricoesPainel.tsx',
  'src/pages/DashboardExecutivoPage.tsx',
  'src/pages/PassivoTrabalhistaPage.tsx',
];

describe('régua global do preenchimento das barras de progresso', () => {
  it('o token CSS é 1200ms e a curva é ease-out', () => {
    const css = ler('src/index.css');
    expect(css).toContain('--transition-duration-progresso: 1200ms;');
    // `ease-out` é o atalho de `cubic-bezier(0, 0, 0.2, 1)` usado pelas barras.
    expect(css).toMatch(/--ease-standard:/);
  });

  it('o componente compartilhado (Radix) usa a régua', () => {
    const progresso = ler('src/components/ui/progress.tsx');
    expect(progresso).toContain('duration-progresso');
    expect(progresso).toContain('ease-out');
    expect(progresso).toContain('progress-indicator');
    // O valor continua vindo do `value` real, por `translateX` (nada simulado).
    expect(progresso).toContain('translateX(-${100 - (value || 0)}%)');
  });

  it('as barras em CSS usam `duration-progresso` + `ease-out` + marcador', () => {
    // O ritmo pode chegar de duas formas legítimas: classe literal no próprio
    // arquivo OU a constante compartilhada `PREENCHIMENTO_BARRA`
    // (`analyticsVisual.ts`), que já reúne token, curva e marcador. Nos dois
    // caminhos a barra está na régua — o que NÃO pode é ficar sem nenhum deles.
    const visual = ler('src/components/recrutamento/analyticsVisual.ts');
    expect(visual, 'PREENCHIMENTO_BARRA sem duration-progresso').toContain('duration-progresso');
    expect(visual, 'PREENCHIMENTO_BARRA sem ease-out').toContain('ease-out');
    expect(visual, 'PREENCHIMENTO_BARRA sem marcador').toContain('barra-progresso-preenchimento');

    for (const arquivo of BARRAS_CSS) {
      const fonte = ler(arquivo);
      const naRegua = fonte.includes('duration-progresso') || fonte.includes('PREENCHIMENTO_BARRA');
      expect(naRegua, `${arquivo} sem duration-progresso nem PREENCHIMENTO_BARRA`).toBe(true);
      const comCurva = fonte.includes('ease-out') || fonte.includes('PREENCHIMENTO_BARRA');
      expect(comCurva, `${arquivo} sem ease-out nem PREENCHIMENTO_BARRA`).toBe(true);
    }
  });

  it('as barras em Framer Motion usam a constante da régua', () => {
    for (const arquivo of BARRAS_MOTION) {
      expect(ler(arquivo), `${arquivo} fora da régua`).toContain('BARRA_PROGRESSO_DURACAO_S');
    }
  });

  /**
   * CASCATA DA REFERÊNCIA — as barras de "Principais origens" e "Desempenho por
   * vaga" (Analytics de Recrutamento) crescem com a coreografia aprovada do card
   * "Amplitude de Liderança". Os números são conferidos no FONTE daquele card —
   * não em cópias —, então mexer num dos lados derruba este teste.
   */
  it('as barras de origens e vagas usam a cascata do card de referência', () => {
    const referencia = ler('src/pages/DashboardExecutivoPage.tsx');
    const cascata = referencia.match(/delay: ([\d.]+) \+ i \* ([\d.]+), ease: '([\w]+)' \}\}/);
    expect(cascata, 'cascata de "Amplitude de Liderança" não encontrada').not.toBeNull();
    const [, atraso, passo, ease] = cascata as RegExpMatchArray;
    expect(Number(atraso), 'atraso da 1ª barra').toBe(BARRA_PROGRESSO_ATRASO_S);
    expect(Number(passo), 'passo da cascata').toBe(BARRA_PROGRESSO_PASSO_CASCATA_S);
    expect(ease).toBe(BARRA_PROGRESSO_EASE);

    // O preenchimento dos DOIS painéis é UM componente — e ele não digita tempo
    // nem curva: consome a régua global (`propsPreenchimentoBarraCascata`).
    const barra = ler('src/components/recrutamento/barraProgressoAnalytics.tsx');
    expect(barra, 'preenchimento fora da régua').toContain('propsPreenchimentoBarraCascata');
    expect(barra, 'preenchimento com duração literal').not.toMatch(/duration: 1[.,]\d/);

    for (const arquivo of [
      'src/components/recrutamento/AnalyticsOrigens.tsx',
      'src/components/recrutamento/AnalyticsVagas.tsx',
    ]) {
      const fonte = ler(arquivo);
      expect(fonte, `${arquivo} sem o preenchimento compartilhado`).toContain('PreenchimentoBarraAnalytics');
      expect(fonte, `${arquivo} ainda pinta a barra já cheia por CSS`).not.toContain('PREENCHIMENTO_BARRA');
    }
  });

  it('a cascata é 0,15 s + 0,1 s por índice e não arredonda o percentual', () => {
    const largura = (percentual: number) => {
      const alvo = propsPreenchimentoBarraCascata(percentual).animate as { width?: string };
      return alvo.width;
    };

    expect(propsPreenchimentoBarraCascata(27.8, 0)).toEqual({
      initial: { width: 0 },
      animate: { width: '27.8%' },
      transition: { duration: BARRA_PROGRESSO_DURACAO_S, delay: 0.15, ease: 'easeOut' },
    });

    const quarta = propsPreenchimentoBarraCascata(100, 3);
    expect((quarta.transition as { delay?: number }).delay).toBeCloseTo(0.45, 5);

    // Movimento reduzido: monta no comprimento final, sem keyframe de partida.
    expect(propsPreenchimentoBarraCascata(42, 2, { reduzir: true })).toEqual({
      initial: false,
      animate: { width: '42%' },
    });

    // Fora da faixa 0–100 e valor inválido não quebram a barra.
    expect(largura(-10)).toBe('0%');
    expect(largura(Number.NaN)).toBe('0%');
    expect(largura(180)).toBe('100%');
  });

  it('nenhuma barra ficou com as durações antigas', () => {
    // Padrão de barra: `animate={{ width … }}` seguido, na linha de baixo, do
    // `transition={{ … duration: X … }}` literal.
    const transicaoDeBarra =
      /animate=\{\{\s*width[^\n]*\n\s*transition=\{\{[^}]*duration: (0\.35|0\.5|0\.6|0\.8|1|1\.5)\b/g;

    for (const arquivo of BARRAS_MOTION) {
      const fonte = ler(arquivo);
      const antigas = [...fonte.matchAll(transicaoDeBarra)];
      expect(antigas.length, `${arquivo} ainda usa duração literal de barra`).toBe(0);
    }

    // A barra do card "Amplitude de Liderança" (referência da Gestão de
    // Desempenho) usa a MESMA constante — e o módulo protegido a reexporta,
    // então as duas continuam idênticas (paridade provada em
    // `DesempenhoBarrasProgresso.test.tsx`).
    expect(ler('src/pages/DashboardExecutivoPage.tsx')).toMatch(
      /animate=\{\{ width: `\$\{faixa\.pct\}%` \}\}\s*\n\s*transition=\{\{ duration: BARRA_PROGRESSO_DURACAO_S, delay: 0\.15 \+ i \* 0\.1, ease: 'easeOut' \}\}/
    );
    expect(ler('src/components/avaliacao/barraProgressoAnim.ts')).toContain(
      'export const BARRA_DURACAO_S = BARRA_PROGRESSO_DURACAO_S;'
    );
  });

  it('as constantes em JS são as mesmas do token CSS (1200ms, ease-out)', () => {
    expect(BARRA_PROGRESSO_DURACAO_S).toBe(1.2);
    expect(BARRA_PROGRESSO_EASE).toBe('easeOut');
  });

  it('prefers-reduced-motion zera o preenchimento das barras CSS', () => {
    const css = ler('src/index.css');
    expect(css).toMatch(
      /\.progress-indicator,\s*\n\s*\.barra-progresso-preenchimento\s*\{\s*\n\s*transition-duration: 0\.01ms;/
    );
  });
});
