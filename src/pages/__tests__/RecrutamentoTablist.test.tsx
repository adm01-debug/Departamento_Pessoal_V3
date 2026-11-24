/**
 * REGRESSÃO — TabList de Recrutamento & Seleção PADRONIZADA com a de Admissões.
 *
 * A padronização não é uma cópia de classes: a página consome o MESMO par
 * `AnimatedDossieTabsList`/`AnimatedDossieTabsTrigger` que Admissões (e o Dossiê
 * de Colaboradores), então altura, raio, fundo do container, cores de aba
 * ativa/inativa e o indicador deslizante são os da referência por construção.
 *
 * Este teste trava as três coisas que uma mudança futura poderia desfazer:
 *  1. a página continua usando a skin compartilhada — as classes do container e
 *     de cada trigger são IDÊNTICAS às de uma tablist de referência montada aqui
 *     com o mesmo componente e o mesmo `className="flex-1"` de Admissões;
 *  2. o visual antigo (linha Lime no topo, fundo esverdeado, container
 *     `bg-card/35 p-1.5` e grid 2×2) não volta;
 *  3. a navegação segue a do Radix `<Tabs>`: clicar numa aba troca o painel.
 *
 * O jsdom não faz layout — a paridade geométrica (altura real, posições e o
 * slide do indicador) é aferida no navegador, pela auditoria de
 * `/recrutamento` × `/admissoes`.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';

vi.mock('@/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks')>();
  return { ...actual, useEmpresas: () => ({ empresaAtual: null }) };
});

// MOCK VISUAL desligado: com `empresaAtual` nula as queries ficam `enabled:
// false`, então nenhuma função do mock de recrutamento é chamada — elas existem
// só para o módulo ter as mesmas exportações que a página importa.
vi.mock('@/mocks/recrutamentoMock', () => ({
  isRecrutamentoMockEnabled: () => false,
  getMockVagas: () => undefined,
  getMockCandidaturas: () => undefined,
  getMockCandidatos: () => undefined,
  avancarEtapaCandidaturaMock: () => undefined,
  excluirVagaMock: () => undefined,
  moverCandidaturaMock: () => undefined,
  publicarVagaMock: () => undefined,
  simularAcaoRecrutamento: () => undefined,
}));

vi.mock('@/services/recrutamentoService', () => ({ recrutamentoService: {} }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/PageTitle', () => ({ PageTitle: () => null }));
vi.mock('@/components/layout', () => ({
  PageLayout: ({ children, actions }: any) => (
    <div>
      <div data-testid="page-actions">{actions}</div>
      {children}
    </div>
  ),
}));

// Filhas do módulo: fora de escopo (cada uma tem o próprio teste). Só a CASCA da
// página importa aqui — a tablist e o conteúdo que ela troca.
vi.mock('@/components/recrutamento/PipelineBoard', () => ({ PipelineBoard: () => <p>CONTEUDO_PIPELINE</p> }));
vi.mock('@/components/recrutamento/VagasPainel', () => ({ VagasPainel: () => <p>CONTEUDO_VAGAS</p> }));
vi.mock('@/components/recrutamento/CandidatosPainel', () => ({
  CandidatosPainel: () => <p>CONTEUDO_CANDIDATOS</p>,
}));
vi.mock('@/components/recrutamento/AnalyticsRecrutamento', () => ({
  AnalyticsRecrutamento: () => <p>CONTEUDO_ANALYTICS</p>,
}));
vi.mock('@/components/recrutamento/CandidatoDetalhesDialog', () => ({ CandidatoDetalhesDialog: () => null }));

import RecrutamentoPage from '@/pages/RecrutamentoPage';
import { AnimatedDossieTabsList, AnimatedDossieTabsTrigger } from '@/components/colaboradores/AnimatedDossieTabs';

/** Os quatro rótulos, na ordem em que a página os declara (`TABS_PIPELINE`). */
const ABAS = ['Pipeline', 'Vagas', 'Candidatos', 'Analytics'];

function renderPagina() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <RecrutamentoPage />
    </QueryClientProvider>
  );
}

function tablist(container: HTMLElement): HTMLElement {
  const lista = container.querySelector<HTMLElement>('[role="tablist"]');
  if (!lista) throw new Error('tablist de Recrutamento não foi renderizada');
  return lista;
}

/**
 * Tablist de REFERÊNCIA — a composição exata de `AdmissoesPage.tsx`: mesmo par
 * de componentes, mesmo `listClassName` e mesmo `className="flex-1"` por aba.
 * Serve de régua para provar paridade de classes (não há layout no jsdom).
 */
function TablistAdmissoes() {
  const [value, setValue] = React.useState('dashboard');
  return (
    <AnimatedDossieTabsList value={value} onValueChange={setValue} listClassName="flex w-full items-stretch">
      {['dashboard', 'gestao', 'kanban', 'auditoria'].map((aba) => (
        <AnimatedDossieTabsTrigger key={aba} value={aba} className="flex-1">
          {aba}
        </AnimatedDossieTabsTrigger>
      ))}
    </AnimatedDossieTabsList>
  );
}

describe('Recrutamento — TabList padronizada com a de Admissões', () => {
  it('preserva as quatro abas, na ordem, com um ícone por aba', () => {
    const { container } = renderPagina();
    const abas = screen.getAllByRole('tab');

    expect(abas.map((aba) => aba.textContent?.trim() ?? '')).toEqual(ABAS);
    // Ícones atuais de Recrutamento seguem no lugar (LayoutGrid, Briefcase,
    // Users, BarChart3) — um `svg` por aba, decorativo.
    for (const aba of abas) {
      expect(aba.querySelectorAll('svg')).toHaveLength(1);
    }
    expect(tablist(container)).toBeInTheDocument();
  });

  it('usa exatamente a mesma skin do container e do trigger da tablist de Admissões', () => {
    const { container } = renderPagina();
    const { container: referencia } = render(<TablistAdmissoes />);

    const listaPagina = tablist(container);
    const listaReferencia = tablist(referencia);

    // Container: mesma skin (`bg-muted/50 rounded-xl p-1 border border-border/30`).
    expect(listaPagina.parentElement?.className).toBe(listaReferencia.parentElement?.className);
    // `<div role="tablist">`: mesmo layout (`flex w-full items-stretch`).
    expect(listaPagina.className).toBe(listaReferencia.className);

    // Trigger: skin + `flex-1`, caractere por caractere. `within` porque as duas
    // tablists (página e referência) coexistem no documento neste teste.
    const classesPagina = within(container)
      .getAllByRole('tab')
      .map((aba) => aba.className);
    const classesReferencia = within(referencia)
      .getAllByRole('tab')
      .map((aba) => aba.className);

    expect(classesPagina).toHaveLength(4);
    expect(classesReferencia).toHaveLength(4);
    // Uma única string de classe para as oito abas: a da página é a da referência.
    expect(new Set([...classesPagina, ...classesReferencia]).size).toBe(1);
  });

  it('não tem mais o visual antigo (linha Lime no topo, fundo esverdeado, container em grid)', () => {
    const { container } = renderPagina();
    const lista = tablist(container);
    const abas = screen.getAllByRole('tab');
    const ativa = abas.find((aba) => aba.getAttribute('data-state') === 'active');

    expect(ativa?.textContent).toContain('Pipeline');
    // Nada de `bg-primary/10`, sombra interna Lime, `bg-card/35`, `p-1.5` ou
    // `grid-cols-*` — todos eram exclusivos desta área.
    expect(lista.parentElement?.className).toContain('bg-muted/50');
    expect(lista.parentElement?.className).toContain('rounded-xl');
    expect(lista.parentElement?.className).toContain('border-border/30');
    expect(lista.parentElement?.className).not.toContain('bg-card/35');
    expect(lista.parentElement?.className).not.toContain('p-1.5');
    expect(lista.className).not.toContain('grid-cols');
    for (const aba of abas) {
      expect(aba.className).not.toContain('bg-primary/10');
      expect(aba.className).not.toContain('shadow-[inset');
      expect(aba.className).toContain('data-[state=active]:bg-transparent');
      expect(aba.className).toContain('data-[state=active]:text-primary');
      // A linha Lime de 2px era um `<span>` absoluto dentro do trigger ativo.
      expect(aba.querySelector('[class*="bg-primary"]')).toBeNull();
    }
  });

  it('mantém um único indicador deslizante e troca de aba pelo `<Tabs>` do Radix', () => {
    const { container } = renderPagina();

    // O indicador persistente do `Highlight` (quem pinta a aba ativa) existe
    // desde a primeira pintura e é ÚNICO — não há um retângulo por aba.
    const indicadores = container.querySelectorAll('[data-slot="motion-highlight"]');
    expect(indicadores).toHaveLength(1);
    expect(indicadores[0].className).toContain('bg-background');

    expect(screen.getByText('CONTEUDO_PIPELINE')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Analytics/ }));

    // Navegação intacta: o `onValueChange` da tablist alimenta o mesmo estado do
    // `<Tabs>` e o painel da aba clicada entra.
    expect(screen.getByText('CONTEUDO_ANALYTICS')).toBeInTheDocument();
    const ativa = screen.getAllByRole('tab').find((aba) => aba.getAttribute('data-state') === 'active');
    expect(ativa?.textContent).toContain('Analytics');
    expect(container.querySelectorAll('[data-slot="motion-highlight"]')).toHaveLength(1);
  });
});
