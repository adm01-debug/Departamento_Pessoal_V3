import { describe, it, expect } from 'vitest';
import { render, within } from '@testing-library/react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AnalyticsBarraFiltros } from '../AnalyticsBarraFiltros';
import { FILTROS_PADRAO } from '../analyticsFiltros';

/**
 * "Exportar" (Recrutamento → Analytics) tem de animar EXATAMENTE como o
 * "Sincronizar" do Dashboard principal — e a fonte de verdade é a implementação
 * real, não uma cópia parecida. Por isso o teste renderiza os DOIS componentes
 * e compara classe por classe, em vez de fixar strings soltas:
 *
 *   • as classes de MOVIMENTO vêm de `ui/flow-hover-button.tsx` (o componente
 *     que o Sincronizar usa) — se alguém remover a onda, as duas pontas mudam
 *     juntas e o teste continua honesto;
 *   • a COR da onda e o contraste do conteúdo são do call site
 *     (`FLOW_BOTAO_ACAO`, copiado do `DashboardHeader`);
 *   • a IDENTIDADE (altura, raio, tipografia, espaçamento, superfície) é do
 *     `BOTAO_ACAO` e NÃO pode ter sido herdada do Sincronizar.
 *
 * O que o jsdom não vê (durações medidas, `::before` renderizado, alinhamento
 * na linha) foi auditado no navegador real em 1440×900, nos dois temas.
 */

/** Camada 1 — o movimento, vindo de `ui/flow-hover-button.tsx`. */
const MOVIMENTO_DO_FLOW = [
  'relative',
  'z-0',
  'overflow-hidden',
  'duration-slower',
  'before:absolute',
  'before:inset-0',
  'before:-z-10',
  'before:translate-x-[150%]',
  'before:translate-y-[150%]',
  'before:scale-[2.5]',
  'before:rounded-[100%]',
  'before:transition-transform',
  'before:duration-700',
  "before:content-['']",
  'hover:scale-[1.02]',
  'hover:before:translate-x-0',
  'hover:before:translate-y-0',
  'active:scale-[0.98]',
];

/** Camada 2 — a cor da onda e o contraste do conteúdo, do call site. */
const CORES_DA_ONDA = ['before:bg-primary', 'hover:text-primary-foreground', 'hover:bg-primary/5'];

/** Identidade do Exportar (`BOTAO_ACAO`) — o que o Sincronizar NÃO dita. */
const IDENTIDADE_DO_EXPORTAR = [
  'h-[35px]',
  'rounded-[12px]',
  'px-3',
  'gap-1.5',
  'text-[13px]',
  'font-medium',
  'leading-none',
  'bg-card',
  'border-border/60',
  'text-foreground/85',
  'transition-colors',
  'focus:outline-hidden',
  'focus:ring-2',
  'focus:ring-ring/50',
  'justify-center',
];

const classes = (elemento: HTMLElement) => elemento.className.split(/\s+/).filter(Boolean);

function renderizarAlvo() {
  const { container } = render(
    <AnalyticsBarraFiltros
      filtros={FILTROS_PADRAO}
      vagas={[{ id: 'vaga-1', titulo: 'Desenvolvedor(a) Full Stack Sênior' }]}
      onPeriodo={() => {}}
      onVaga={() => {}}
      onExportar={() => {}}
    />
  );
  const exportar = within(container).getByRole('button', { name: 'Exportar' });
  return { container, exportar };
}

function renderizarReferencia() {
  const { container } = render(
    <DashboardHeader greeting="Boa tarde" userName="Abner" isLoading={false} onRefresh={() => {}} />
  );
  const sincronizar = within(container).getByRole('button', { name: 'Sincronizar' });
  return { container, sincronizar };
}

describe('Exportar (Analytics) × Sincronizar (Dashboard)', () => {
  it('usa a mesma implementação de onda do Sincronizar', () => {
    const { exportar } = renderizarAlvo();
    const { sincronizar } = renderizarReferencia();

    // Os dois botões são o MESMO componente (`FlowHoverButton`), não um
    // `button` com classes parecidas.
    for (const classe of MOVIMENTO_DO_FLOW) {
      expect(classes(sincronizar)).toContain(classe);
      expect(classes(exportar)).toContain(classe);
    }
  });

  it('pinta a onda e inverte o conteúdo com as MESMAS classes do Sincronizar', () => {
    const { exportar } = renderizarAlvo();
    const { sincronizar } = renderizarReferencia();

    for (const classe of CORES_DA_ONDA) {
      expect(classes(sincronizar)).toContain(classe);
      expect(classes(exportar)).toContain(classe);
    }

    // O ícone do Exportar é `text-muted-foreground` em repouso (identidade), e
    // por isso não herda o `currentColor` que inverte no Sincronizar: quem faz a
    // inversão é o seletor de filho direto, na mesma duração do rótulo.
    expect(classes(exportar)).toEqual(
      expect.arrayContaining([
        '[&>svg]:transition-colors',
        '[&>svg]:duration-slower',
        'hover:[&>svg]:text-primary-foreground',
      ])
    );
    const icone = exportar.querySelector('svg');
    expect(icone).not.toBeNull();
    expect(icone?.getAttribute('class')).toContain('lucide-download');
    expect(icone?.getAttribute('class')).toContain('text-muted-foreground');
    expect(exportar.firstElementChild).toBe(icone); // ícone à ESQUERDA do texto
  });

  it('mantém a identidade do botão (e não herdou a do Sincronizar)', () => {
    const { exportar } = renderizarAlvo();
    const { sincronizar } = renderizarReferencia();

    for (const classe of IDENTIDADE_DO_EXPORTAR) {
      expect(classes(exportar)).toContain(classe);
    }

    // Do Sincronizar veio só o movimento: `h-8`, `rounded-xl` e o `font-body`
    // dele continuam sendo dele.
    for (const classe of ['h-8', 'rounded-xl', 'font-body', 'shadow-xs', 'bg-background']) {
      expect(classes(sincronizar)).toContain(classe);
      expect(classes(exportar)).not.toContain(classe);
    }

    // O hover antigo do `BOTAO_ACAO` foi SUBSTITUÍDO (e não somado): `cn()`
    // deixa uma regra por grupo, então a onda não disputa com o cinza.
    expect(classes(exportar)).not.toContain('hover:bg-muted/50');
    expect(classes(exportar)).not.toContain('hover:border-border');
    expect(classes(exportar)).toContain('hover:border-primary/30');
  });

  it('não desalinha a barra de recorte (Exportar é o último controle da linha)', () => {
    const { container, exportar } = renderizarAlvo();
    const linha = container.querySelector('[data-analytics-filtros]')!;
    const controles = Array.from(linha.querySelectorAll('button'));
    expect(controles).toHaveLength(3); // período · vaga · Exportar
    expect(controles[controles.length - 1]).toBe(exportar);
    // O botão continua sendo filho direto da barra: mesma linha flex, mesmos
    // filtros ao lado — nada de wrapper novo no caminho.
    expect(exportar.parentElement).toBe(linha);
    expect(linha.className).toContain('items-center');
  });
});
