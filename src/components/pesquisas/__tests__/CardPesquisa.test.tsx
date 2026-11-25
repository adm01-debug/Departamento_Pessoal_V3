import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ComponentType, ElementType, ReactNode } from 'react';

vi.mock('framer-motion', () => {
  /**
   * Expõe em `data-*` o que a Motion receberia de animação (mesma técnica de
   * `AuditoriaAnimacao.test.tsx`): assim o teste consegue ler
   * `initial`/`animate`/`transition` do preenchimento da barra sem animar nada
   * no jsdom — e sem que essas props (que não existem no DOM) virem atributos
   * inválidos.
   */
  type CapturarProps = Record<string, unknown> & {
    children?: ReactNode;
    initial?: unknown;
    animate?: unknown;
    transition?: unknown;
    variants?: unknown;
    custom?: unknown;
  };

  const capturar =
    (Tag: ElementType): ComponentType<CapturarProps> =>
    ({ children, initial, animate, transition, variants, custom, ...rest }: CapturarProps) => (
      <Tag
        {...rest}
        data-initial={JSON.stringify(initial)}
        data-animate={JSON.stringify(animate)}
        data-transition={JSON.stringify(transition)}
      >
        {children}
      </Tag>
    );

  return {
    motion: {
      div: capturar('div'),
      // `dropdown-menu.tsx` (menu "…" do cartão) usa `motion.span`.
      span: capturar('span'),
      // `entrada-cards.tsx` faz `motion.create(Card)` e a barra de adesão faz
      // `motion.create(Progress.Indicator)`; nos testes o wrapper é o próprio
      // componente, como em `IndicadorPesquisa.test.tsx`.
      create: (Componente: ElementType) => capturar(Componente),
    },
    // Sem animação nos testes: o conteúdo do dropdown não precisa do hook real.
    useReducedMotion: () => true,
  };
});

import { CardPesquisa } from '../CardPesquisa';
import type { PesquisaListada } from '../pesquisasComum';

/**
 * Guarda-corpo da BARRA DE ADESÃO do cartão de "Pesquisas de Clima & eNPS".
 *
 * O preenchimento deixou de ser chapado (`to-primary-glow`, que é lime→lime) e
 * passou a ser um degradê da esquerda para a direita do LIME do sistema
 * (`primary`) até o VERDE de sucesso (`success`) — o mesmo par já usado nas
 * barras de progresso do card de Desenvolvimento
 * (`DesenvolvimentoProfissionalCard`).
 *
 * O jsdom não pinta nada: o que se testa aqui é o CONTRATO de classes que
 * produz o degradê e a MÁSCARA (`rounded-full` no preenchimento + `overflow-
 * hidden`/`rounded-full` no trilho, herdados de `ui/progress.tsx`). A conferência
 * visual foi feita em Chromium, com o CSS compilado, em 0/48/72/100%: o
 * gradiente medido é `linear-gradient(to right, rgb(212,245,0), rgb(24,180,81))`,
 * o preenchimento tem a MESMA altura do trilho (7,5px, sangria 0 no topo/base) e
 * em 100% encosta na borda direita sem vazar (sangria 0).
 */

const CLASSES = (el: Element) => el.className.split(/\s+/).filter(Boolean);
const temClasse = (el: Element, classe: string) => CLASSES(el).includes(classe);

const PESQUISA: PesquisaListada = {
  id: 'pesquisa-1',
  titulo: 'eNPS Trimestral — Colaboradores',
  descricao: 'Mede a probabilidade de recomendação da empresa como local de trabalho.',
  tipo: 'enps',
  status: 'ativa',
  anonima: true,
  data_inicio: '2026-07-01',
  data_fim: '2026-09-30',
  updated_at: '2026-09-05T12:00:00.000Z',
  // 154 de 215 respostas → 72% de adesão na barra.
  total_respostas: 154,
  total_convidados: 215,
};

function renderCartao(pesquisa: Partial<PesquisaListada> = {}, indice = 0) {
  return render(
    <CardPesquisa
      pesquisa={{ ...PESQUISA, ...pesquisa }}
      indice={indice}
      onResultados={vi.fn()}
      onEditar={vi.fn()}
      onPublicar={vi.fn()}
      onEncerrar={vi.fn()}
      onExcluir={vi.fn()}
    />
  );
}

/** Trilho da barra: o Root do Radix Progress (`role="progressbar"`). */
const trilho = () => screen.getByRole('progressbar');
/** Preenchimento: o único filho do trilho (o `Indicator` do Progress). */
const preenchimento = () => trilho().firstElementChild as HTMLElement;

describe('CardPesquisa — barra de adesão em degradê lime → verde', () => {
  it('pinta o preenchimento com `bg-gradient-to-r` do `primary` ao `success`', () => {
    renderCartao();
    const barra = preenchimento();

    expect(temClasse(barra, 'bg-gradient-to-r')).toBe(true);
    expect(temClasse(barra, 'from-primary')).toBe(true);
    expect(temClasse(barra, 'to-success')).toBe(true);
  });

  it('não voltou ao degradê chapado lime → lime (`to-primary-glow`)', () => {
    renderCartao();
    const barra = preenchimento();

    expect(temClasse(barra, 'to-primary-glow')).toBe(false);
    expect(CLASSES(barra).some((classe) => classe === 'bg-gradient-to-l')).toBe(false);
  });

  it('fecha o degradê no próprio raio da pílula (`rounded-full` no preenchimento)', () => {
    renderCartao();

    expect(temClasse(preenchimento(), 'rounded-full')).toBe(true);
  });

  it('mantém o trilho recortando o degradê: `overflow-hidden` + `rounded-full`', () => {
    renderCartao();
    const pista = trilho();

    expect(temClasse(pista, 'overflow-hidden')).toBe(true);
    expect(temClasse(pista, 'rounded-full')).toBe(true);
    // Altura fina e trilha neutra continuam como estavam.
    expect(temClasse(pista, 'h-1.5')).toBe(true);
    expect(temClasse(pista, 'bg-muted/50')).toBe(true);
  });

  it('preserva o valor real e o rótulo acessível da adesão', () => {
    renderCartao();

    expect(trilho()).toHaveAccessibleName('Adesão de 72%');
    expect(screen.getByText('72%')).toBeInTheDocument();
    expect(screen.getByText('154 de 215 respostas')).toBeInTheDocument();
  });

  it('aplica o mesmo degradê na pesquisa ENCERRADA', () => {
    renderCartao({ status: 'encerrada' });
    const barra = preenchimento();

    expect(temClasse(barra, 'bg-gradient-to-r')).toBe(true);
    expect(temClasse(barra, 'from-primary')).toBe(true);
    expect(temClasse(barra, 'to-success')).toBe(true);
    expect(temClasse(barra, 'rounded-full')).toBe(true);
  });

  it('não mexe no cartão em RASCUNHO: sem barra, aviso intacto', () => {
    renderCartao({ status: 'rascunho' });

    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByText('Ainda sem respostas.')).toBeInTheDocument();
    expect(screen.getByText('Publique a pesquisa para começar a receber respostas.')).toBeInTheDocument();
  });
});

/**
 * MOVIMENTO DA BARRA — o preenchimento herdou a animação do card "Amplitude de
 * Liderança" (`DashboardExecutivoPage`): cresce da esquerda para a direita a
 * partir do zero, 1,2 s, `easeOut`, com atraso de 0,15 s + índice × 0,1 s.
 *
 * Antes, o preenchimento era um `Progress` com `transition-all duration-
 * progresso` e o `translateX` final já no primeiro render: sem troca de valor
 * DEPOIS da montagem não existe transição para o navegador interpolar, então a
 * barra aparecia pronta ("carregamento linear/estático"). Agora o valor inicial
 * é explícito (`x: '-100%'`) e o final vem em `animate` — a barra sempre cresce.
 */
describe('CardPesquisa — preenchimento animado (régua de "Amplitude de Liderança")', () => {
  it('parte do zero e anima até a adesão real (154/215 = 72%)', () => {
    renderCartao();
    const barra = preenchimento();

    expect(barra.getAttribute('data-initial')).toBe(JSON.stringify({ x: '-100%' }));
    expect(barra.getAttribute('data-animate')).toBe(JSON.stringify({ x: '-28%' }));
  });

  it('usa a duração, a curva e o atraso da referência', () => {
    renderCartao();

    expect(JSON.parse(preenchimento().getAttribute('data-transition') ?? 'null')).toEqual({
      duration: 1.2,
      delay: 0.15,
      ease: 'easeOut',
    });
  });

  it('entra em cascata pelo índice do cartão na grade', () => {
    renderCartao({}, 3);

    expect(JSON.parse(preenchimento().getAttribute('data-transition') ?? 'null').delay).toBeCloseTo(0.45, 5);
  });

  it('não mantém a transição CSS que deixava a barra no valor final de imediato', () => {
    renderCartao();
    const barra = preenchimento();

    expect(temClasse(barra, 'duration-progresso')).toBe(false);
    expect(temClasse(barra, 'transition-all')).toBe(false);
    // O marcador da barra do sistema continua no preenchimento.
    expect(temClasse(barra, 'progress-indicator')).toBe(true);
  });
});

/**
 * TOPO DO CARTÃO — "tag do tipo · tag de status" lado a lado.
 *
 * A pílula de status vivia num `<span className="mx-auto">`: o `mx-auto` a
 * empurrava para o MEIO do cartão, abrindo um vão largo dos dois lados e
 * desfazendo a leitura em grupo com a tag de tipo. Agora o topo é um flex SEM
 * `gap` — o respiro é da própria pílula (`ml-3` = 0,75rem = 15px nesta base de
 * 125%) — e o menu "…" fica no extremo direito por `ml-auto`: o espaço livre é
 * dele, não do status.
 *
 * O jsdom não calcula layout, então o que se trava aqui é o CONTRATO de classes
 * (quem é vizinho de quem, quem tem `ml-3`/`ml-auto`). A conferência geométrica
 * foi feita no navegador com o CSS compilado: 15px entre as duas tags, as duas
 * pílulas no MESMO centro vertical (0px de diferença) e o "…" encostado na
 * borda direita do cartão.
 */
describe('CardPesquisa — topo: tipo · status lado a lado', () => {
  /** Pílula do tipo (`eNPS`): o rótulo mora no `span.truncate` interno. */
  const pilulaTipo = () => screen.getByText('eNPS').parentElement as HTMLElement;
  /** Pílula de status pelo rótulo ("Ativa", "Encerrada", "Rascunho"). */
  const pilulaStatus = (rotulo: string) => screen.getByText(rotulo) as HTMLElement;
  /** `<span>` que embrulha a pílula de status — é ele que carrega o respiro. */
  const apoioStatus = (rotulo: string) => pilulaStatus(rotulo).parentElement as HTMLElement;
  /** Container do topo: o `<div>` mais próximo acima da pílula de status. */
  const topo = (rotulo: string) => pilulaStatus(rotulo).closest('div') as HTMLElement;
  /** Botão "…" do TOPO (o rodapé tem um segundo, com o mesmo `aria-label`). */
  const menuTopo = () => screen.getAllByRole('button', { name: /Ações da pesquisa/i })[0];

  it('encosta o status na tag de tipo com o respiro de `ml-3`', () => {
    renderCartao();
    const apoio = apoioStatus('Ativa');

    expect(temClasse(apoio, 'ml-3')).toBe(true);
    // `flex` no apoio: sem ele o `<span>` de linha estica pelo line-height e a
    // pílula cai ~3px abaixo da tag de tipo no navegador.
    expect(temClasse(apoio, 'flex')).toBe(true);
    // Vizinhas diretas: não há nada entre as duas tags.
    expect(apoio.previousElementSibling).toBe(pilulaTipo());
    expect(apoio.firstElementChild).toBe(pilulaStatus('Ativa'));
  });

  it('não centra mais a pílula (`mx-auto` saiu) nem usa `justify-*`/`gap`', () => {
    renderCartao();

    expect(temClasse(apoioStatus('Ativa'), 'mx-auto')).toBe(false);
    expect(apoioStatus('Ativa').className).not.toContain('mx-auto');

    const container = topo('Ativa');
    expect(temClasse(container, 'flex')).toBe(true);
    expect(temClasse(container, 'items-center')).toBe(true);
    expect(temClasse(container, 'justify-between')).toBe(false);
    expect(temClasse(container, 'justify-center')).toBe(false);
    expect(temClasse(container, 'gap-2')).toBe(false);
  });

  it('mantém o menu "…" ancorado no extremo direito (`ml-auto`)', () => {
    renderCartao();
    const menu = menuTopo();

    expect(temClasse(menu, 'ml-auto')).toBe(true);
    expect(menu.parentElement).toBe(topo('Ativa'));
  });

  it('a pesquisa ENCERRADA segue o mesmo topo (status ao lado do tipo)', () => {
    renderCartao({ status: 'encerrada', tipo: 'satisfacao' });
    const apoio = apoioStatus('Encerrada');

    expect(temClasse(apoio, 'ml-3')).toBe(true);
    expect(apoio.previousElementSibling).toBe(screen.getByText('Satisfação').parentElement);
    expect(temClasse(topo('Encerrada'), 'justify-between')).toBe(false);
  });

  it('o RASCUNHO segue o mesmo topo (sem barra de adesão no miolo)', () => {
    renderCartao({ status: 'rascunho' });
    const apoio = apoioStatus('Rascunho');

    expect(temClasse(apoio, 'ml-3')).toBe(true);
    expect(apoio.previousElementSibling).toBe(pilulaTipo());
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});

/**
 * COR DA PÍLULA DE STATUS — só o "Encerrada" mudou.
 *
 * Ele deixou o cinza (`bg-muted/40` + `text-muted-foreground`, que lia como
 * "desabilitado") e assumiu o AZUL do sistema (`--info`, o mesmo do chip
 * "Encerradas" da barra de abas): fundo em tint de 10%, borda em 35%, texto na
 * cor cheia e bolinha sólida acompanhando o texto. "Ativa" (verde) e
 * "Rascunho" (âmbar) permanecem exatamente como estão.
 */
describe('CardPesquisa — cor da pílula de status', () => {
  const pilulaStatus = (rotulo: string) => screen.getByText(rotulo) as HTMLElement;
  /** Bolinha: primeiro filho da pílula (o texto vem depois, como nó solto). */
  const bolinha = (rotulo: string) => pilulaStatus(rotulo).firstElementChild as HTMLElement;

  it('"Encerrada" pinta fundo, borda e texto com o azul de informação', () => {
    renderCartao({ status: 'encerrada' });
    const pilula = pilulaStatus('Encerrada');

    expect(temClasse(pilula, 'bg-info/10')).toBe(true);
    expect(temClasse(pilula, 'border-info/35')).toBe(true);
    expect(temClasse(pilula, 'text-info')).toBe(true);
  });

  it('"Encerrada" não ficou mais no cinza de "desabilitado"', () => {
    renderCartao({ status: 'encerrada' });
    const pilula = pilulaStatus('Encerrada');

    expect(temClasse(pilula, 'bg-muted/40')).toBe(false);
    expect(temClasse(pilula, 'text-muted-foreground')).toBe(false);
    expect(temClasse(pilula, 'border-border/60')).toBe(false);
  });

  it('a bolinha do "Encerrada" acompanha o texto (`bg-info`)', () => {
    renderCartao({ status: 'encerrada' });

    expect(temClasse(bolinha('Encerrada'), 'bg-info')).toBe(true);
    expect(temClasse(bolinha('Encerrada'), 'bg-muted-foreground')).toBe(false);
  });

  it('"Ativa" continua verde (`--success`)', () => {
    renderCartao({ status: 'ativa' });
    const pilula = pilulaStatus('Ativa');

    expect(temClasse(pilula, 'bg-success/10')).toBe(true);
    expect(temClasse(pilula, 'border-success/35')).toBe(true);
    expect(temClasse(pilula, 'text-success')).toBe(true);
    expect(temClasse(bolinha('Ativa'), 'bg-success')).toBe(true);
  });

  it('"Rascunho" continua âmbar (`--warning`)', () => {
    renderCartao({ status: 'rascunho' });
    const pilula = pilulaStatus('Rascunho');

    expect(temClasse(pilula, 'bg-warning/10')).toBe(true);
    expect(temClasse(pilula, 'border-warning/35')).toBe(true);
    expect(temClasse(pilula, 'text-warning')).toBe(true);
    expect(temClasse(bolinha('Rascunho'), 'bg-warning')).toBe(true);
  });
});
