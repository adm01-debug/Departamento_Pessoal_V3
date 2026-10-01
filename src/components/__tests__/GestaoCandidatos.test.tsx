import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { formatCurrency } from '@/utils/format';

/**
 * A tela reaproveita `MetricCard` (Dashboard de Admissões), que usa
 * `motion.create`, `useInView` e o `MiniSparkline` (SVG animado). O mock de
 * `framer-motion` é o MESMO de `OnboardingDashboard.test.tsx` — os elementos só
 * rendem `children`, sem repassar props de animação ao DOM.
 */
vi.mock('framer-motion', () => ({
  motion: {
    create:
      (Component: any) =>
      ({ children, ...rest }: any) => <Component {...rest}>{children}</Component>,
    div: ({ children }: any) => <div>{children}</div>,
    span: ({ children }: any) => <span>{children}</span>,
    circle: () => <circle />,
    polygon: () => <polygon />,
    polyline: () => <polyline />,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useInView: () => true,
  useReducedMotion: () => false,
}));

// O `MiniSparkline` é mockado (com testid) só para provar que os KPI Cards
// desta tela NÃO o renderizam: o card aprovado é de área única (ícone + bloco
// textual), sem coluna lateral decorativa.
vi.mock('@/components/dashboard/MiniSparkline', () => ({
  MiniSparkline: () => <svg data-testid="mini-sparkline" />,
}));

import { GestaoCandidatos } from '../admissoes/GestaoCandidatos';

const base = (over: Record<string, unknown>) => ({
  status: 'em_andamento',
  salario_proposto: 3000,
  metadata: { responsavel: 'Bruno Cardoso' },
  created_at: '2026-01-15T00:00:00.000Z',
  ...over,
});

const ADMISSOES = [
  base({
    id: 'adm-1',
    nome: 'Ana Silva',
    cargo: 'Analista de RH',
    departamento: 'RH',
    etapa: 'solicitacao',
    data_prevista: '2030-01-10',
  }),
  base({
    id: 'adm-2',
    nome: 'Carlos Souza',
    cargo: 'Motorista',
    departamento: 'Operações',
    etapa: 'esocial',
    data_prevista: '2026-06-15',
    status: 'concluido',
    metadata: { responsavel: 'Diego Martins' },
  }),
  base({
    id: 'adm-3',
    nome: 'Débora Lima',
    cargo: 'Contadora',
    departamento: 'Financeiro',
    etapa: 'concluida',
    data_prevista: '2026-02-01',
    metadata: { responsavel: 'Elaine Prado' },
  }),
  base({
    id: 'adm-4',
    nome: 'Eduardo Reis',
    cargo: 'Técnico de Suporte',
    departamento: 'TI',
    etapa: 'cancelada',
    data_prevista: null,
    status: 'cancelado',
    metadata: { responsavel: 'Renata Alves' },
  }),
];

/* 40 candidatos (todos na mesma etapa/pasta) — é o tamanho que torna visível a
   diferença de paginação entre os modos: 10/10/10/10 na Tabela e 12/12/12/4 nos
   Cards. Nada aqui é "dado novo": são os MESMOS campos dos 4 mocks acima. */
const MUITOS = Array.from({ length: 40 }, (_, i) =>
  base({
    id: `adm-muitos-${i + 1}`,
    nome: `Candidato ${String(i + 1).padStart(2, '0')}`,
    cargo: 'Analista de RH',
    departamento: 'RH',
    etapa: 'solicitacao',
    data_prevista: '2030-01-10',
  })
);

/** Faixa do rodapé, normalizada: "Exibindo 1–12 de 40 candidatos". */
const faixaExibida = (container: HTMLElement) =>
  container.textContent?.replace(/\s+/g, ' ').match(/Exibindo \d+–\d+ de \d+ candidatos/)?.[0];

/** O rodapé de paginação é o ÚNICO bloco que contém "Exibindo …", logo o único
 *  `combobox` dentro dele é o Select de quantidade por página (os demais
 *  comboboxes da tela são os filtros do topo). */
const seletorPorPagina = () => {
  const rodape = screen.getByText(/Exibindo/).closest('div') as HTMLElement;
  return within(rodape).getByRole('combobox');
};

/** Abre um Select do Radix no jsdom: `pointerdown` (o `click` sozinho não abre)
 *  + o stub da Pointer Capture API que o jsdom não implementa — mesmo padrão já
 *  usado pelos testes de filtro/ordenação deste arquivo. */
const abrirSelect = (alvo: HTMLElement) => {
  alvo.hasPointerCapture = () => false;
  fireEvent.pointerDown(alvo, { button: 0, ctrlKey: false, pointerType: 'mouse' });
  return document.querySelector<HTMLElement>('[data-radix-popper-content-wrapper] > [data-side]');
};

/** Rótulos das opções do menu aberto. */
const opcoesAbertas = (conteudo: HTMLElement) =>
  within(conteudo)
    .getAllByRole('option')
    .map((o) => o.textContent);

/** A grade da visão Cards: o ÚNICO nó da tela com `xl:grid-cols-3` (os KPIs do
 *  topo usam `xl:grid-cols-4`). Selecionar por essa classe é a forma estável de
 *  achar o container dos cards sem depender do wrapper da animação. */
const gradeCards = (container: HTMLElement) => container.querySelector<HTMLElement>('[class*="xl:grid-cols-3"]');

const montar = (props: Record<string, unknown> = {}) =>
  render(
    <GestaoCandidatos
      admissoes={ADMISSOES as any}
      isLoading={false}
      sendingLink={null}
      onEnviarLink={vi.fn()}
      onEnviarWhatsApp={vi.fn()}
      onOpenDetalhes={vi.fn()}
      {...props}
    />
  );

describe('GestaoCandidatos', () => {
  it('renderiza os quatro KPIs sem mini gráfico lateral', () => {
    montar();
    expect(screen.getByText('Total de Candidatos')).toBeInTheDocument();
    expect(screen.getByText('Em Andamento')).toBeInTheDocument();
    expect(screen.getByText('Finalizados')).toBeInTheDocument();
    expect(screen.getByText('Cancelados')).toBeInTheDocument();
    // Nenhum dos quatro cards desenha o micro gráfico do canto direito.
    expect(screen.queryAllByTestId('mini-sparkline')).toHaveLength(0);
  });

  it('abre na visão de TABELA (padrão) com o cabeçalho completo', () => {
    const { container } = montar();
    expect(container.querySelector('table')).not.toBeNull();
    ['Candidato', 'Cargo', 'Etapa Atual', 'Progresso', 'Prazo', 'Responsável', 'Ações'].forEach((titulo) => {
      expect(container.textContent).toContain(titulo);
    });
    expect(screen.getByRole('button', { name: /Tabela/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('lista os candidatos com nome, cargo e o selo de etapa', () => {
    montar();
    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
    expect(screen.getByText('Analista de RH')).toBeInTheDocument();
    // O selo "eSocial" da linha do Carlos (a pill homônima é um botão).
    expect(screen.getByRole('button', { name: /eSocial/ })).toBeInTheDocument();
  });

  it('mostra a faixa de etapas com as pills da referência e a ativa por padrão', () => {
    const { container } = montar();
    ['Aguardando Exame', 'Contrato Gerado', 'Cancelada'].forEach((rotulo) => {
      expect(container.textContent).toContain(rotulo);
    });
    expect(screen.getByRole('button', { name: /^Todos/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('filtrar por etapa reduz a listagem', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: /^Concluída/ }));
    expect(screen.getByText('Débora Lima')).toBeInTheDocument();
    expect(screen.queryByText('Ana Silva')).not.toBeInTheDocument();
  });

  it('a busca textual filtra por nome, cargo ou departamento', () => {
    montar();
    fireEvent.change(screen.getByLabelText('Buscar candidatos'), { target: { value: 'Motorista' } });
    expect(screen.getByText('Carlos Souza')).toBeInTheDocument();
    expect(screen.queryByText('Ana Silva')).not.toBeInTheDocument();
  });

  it('alternar para Cards troca a tabela por uma grade', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: /Cards/ }));
    expect(screen.queryByText('Etapa Atual')).not.toBeInTheDocument();
    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cards/ })).toHaveAttribute('aria-pressed', 'true');
  });

  /* ─── Contrato de diagramação do CARD (visão Cards) ──────────────────────
     A ficha da referência é DENSA e HORIZONTAL, em QUATRO faixas: no topo
     `[avatar] Nome ... [Status] [⋮]`, com o CARGO completo na linha de baixo
     (alinhado sob o nome); o progresso logo depois, em uma linha baixa; as três
     informações LADO A LADO (Departamento / Admissão prevista / Salário), uma
     por terço do card; e o rodapé com o responsável à esquerda e as ações
     ("Enviar Link" / "Detalhes") à direita.
     Só o LAYOUT mudou: os números continuam vindo das MESMAS derivações
     (`progressoValor`/`salarioDe`) e o salário só aparece quando existe
     (`salario_proposto`), formatado em BRL por `formatCurrency` — nunca um
     valor inventado quando o dado não está na base. */
  it('monta o card da referência: 3 infos lado a lado, salário em BRL e ações no rodapé', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: /Cards/ }));

    // INFORMAÇÕES — "Admissão prevista" e "Salário" só existem nos cards (4 mocks).
    expect(screen.getAllByText('Admissão prevista')).toHaveLength(4);
    expect(screen.getAllByText('Salário')).toHaveLength(4);
    // O valor sai de `salario_proposto` (3000 em todos os mocks), em BRL. O
    // normalizador do testing-library troca o NBSP do Intl por espaço comum,
    // então normalizamos o esperado do MESMO jeito antes de comparar.
    const salarioBRL = formatCurrency(3000).replace(/\u00a0/g, ' ');
    expect(screen.getAllByText(salarioBRL)).toHaveLength(4);

    // TOPO — o menu ⋮ convive com o selo de etapa; RODAPÉ — ações à direita.
    expect(screen.getByLabelText('Mais ações de Ana Silva')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Enviar Link/ })).toHaveLength(4);
    expect(screen.getByLabelText('Ver detalhes de Ana Silva')).toBeInTheDocument();
  });
  /* A grade da visão Cards é EXPLÍCITA e de 3 colunas no desktop LARGO
     (`grid-cols-1 sm:grid-cols-2 xl:grid-cols-3`), ocupando 100% da largura do
     container, com gap uniforme. O `repeat(auto-fit, minmax(min(260px,100%),1fr))`
     anterior abria 4+ colunas em desktop largo e espremia cada card a ≈266px —
     era esse aperto que forçava nome, cargo, departamento, data, salário e
     responsável a sair com "…". Agora o piso é a própria coluna de 1/3.
     O breakpoint é `xl` (1280px), não `lg`: com a sidebar `w-64` aberta sobram
     ≈794px de conteúdo a 1100px, e 3 colunas ali dariam cards de ≈243px (213px
     úteis) — menos do que o PRÓPRIO nome precisa em uma linha ao lado do avatar
     ("Débora Figueiredo Antunes" = 183px + 40px de avatar + 10px de gap), então
     o texto vazava para fora do card. Na faixa `lg` ficam 2 colunas (cards de
     ≈389px, tudo completo) e o desktop largo — 1280px para cima, o mesmo corte
     da grade de KPIs desta tela — recebe exatamente 3, nunca 4. */
  it('usa grade de 1/2/3 colunas na listagem de Cards — sem auto-fit, 3 só no desktop largo', () => {
    const { container } = montar();
    fireEvent.click(screen.getByRole('button', { name: /Cards/ }));

    const grade = gradeCards(container);
    expect(grade).not.toBeNull();
    const classes = grade!.className;
    // Mobile 1 coluna, tablet 2, desktop largo 3.
    expect(classes).toContain('grid-cols-1');
    expect(classes).toContain('sm:grid-cols-2');
    expect(classes).toContain('xl:grid-cols-3');
    // 3 colunas só a partir do desktop largo — a faixa `lg` fica com 2.
    expect(classes).not.toContain('lg:grid-cols-3');
    // Gap uniforme (mesmo valor nos dois eixos) e o container com 100% da largura.
    expect(classes).toContain('gap-4');
    // Nada de colunas fluídas por largura — o defeito das 4+ colunas.
    expect(classes).not.toContain('auto-fit');
    expect(classes).not.toContain('minmax(');
  });

  /* Contrato de LEGIBILIDADE do card: nenhum campo é cortado por reticências
     (`truncate`/`text-ellipsis`/`line-clamp`). NOME, VALORES e RESPONSÁVEL saem
     COMPLETOS, cada um em UMA linha (`whitespace-nowrap`).
     Dois textos quebram ENTRE PALAVRAS, nunca com "…":
       • o CARGO é texto livre — com o recuo fixo (`pl-[50px]`) ele saía para
         fora do card ("Analista de Departamento Pessoal" mede 245px contra
         213px úteis a 1100px);
       • os RÓTULOS das três infos — como os blocos ficam LADO A LADO, cada um
         tem 1/3 do card (≈86px a 1280px) e "Admissão prevista" com o ícone mede
         ≈103px; em `whitespace-nowrap` invadiria o bloco vizinho (o `gap-x-2`
         do trilho tem só 8px). Quebrar em duas linhas custa 12,5px e preserva o
         contrato da visão: os três blocos SEMPRE na mesma horizontal.
     Os VALORES das infos ficam em `whitespace-nowrap`: o maior dado real
     ("R$ 11.200,00", ≈74px medidos) cabe nos ≈86px da coluna mais estreita. */
  it('entrega nome, valores e responsável em UMA linha — só cargo e rótulos podem quebrar', () => {
    const { container } = montar();
    fireEvent.click(screen.getByRole('button', { name: /Cards/ }));

    const cards = [...gradeCards(container)!.children] as HTMLElement[];
    expect(cards).toHaveLength(4);

    /** Os cargos dos mocks — os únicos parágrafos que podem ocupar 2 linhas. */
    const cargos = ['Analista de RH', 'Motorista', 'Contadora', 'Técnico de Suporte'];

    cards.forEach((card) => {
      // Nenhum nó do card corta texto por reticências (o "…" da referência proibido).
      expect(card.innerHTML).not.toMatch(/truncate|text-ellipsis|line-clamp/);
      // Todos os parágrafos de DADO (nome, valores das infos e responsável) ficam
      // em UMA linha. EXCEÇÕES — as duas documentadas no comentário do teste: o
      // CARGO (texto livre) e os RÓTULOS das infos (que quebram entre palavras
      // para não invadir o vizinho); mais o rótulo fixo "Responsável" (palavra
      // única, sem risco de quebra).
      const excecoes = ['Responsável', 'Departamento', 'Admissão prevista', 'Salário', ...cargos];
      [...card.querySelectorAll('p')]
        .filter((p) => !excecoes.includes(p.textContent ?? ''))
        .forEach((p) => expect(p).toHaveClass('whitespace-nowrap'));

      // O CARGO mora no bloco de identidade, logo abaixo do nome (2º `p` do
      // topo), alinhado ao início do nome pelo vizinho avatar — sem recuo fixo.
      const topo = card.children[0];
      const paragrafosTopo = [...topo.querySelectorAll('p')];
      expect(paragrafosTopo).toHaveLength(2);
      expect(paragrafosTopo[0]).toHaveClass('whitespace-nowrap');
      expect(paragrafosTopo[1]).toHaveClass('break-words');
      expect(paragrafosTopo[1].className).not.toMatch(/pl-\[/);

      // As três informações ficam LADO A LADO — um bloco por terço do card
      // (`flex-1` + `min-w-0`), nunca empilhadas: era o empilhamento (um bloco
      // por linha, ~64px por coluna a 1280px) que empurrava "Admissão prevista"
      // sobre o vizinho.
      const trilhoInfos = [...card.querySelectorAll('p')]
        .find((p) => p.textContent === 'Departamento')
        ?.closest<HTMLElement>('div.flex.items-start');
      expect(trilhoInfos).toBeTruthy();
      const blocosInfo = [...trilhoInfos!.children] as HTMLElement[];
      expect(blocosInfo).toHaveLength(3);
      blocosInfo.forEach((bloco) => expect(bloco).toHaveClass('flex-1', 'min-w-0'));
      // Nada de grade de colunas dentro do card (o defeito da coluna de ~64px).
      expect(card.querySelector('[class*="grid-cols-"]')).toBeNull();
    });
  });

  it('mostra a faixa exibida e a paginação', () => {
    const { container } = montar();
    expect(container.textContent).toContain('Exibindo');
    expect(container.textContent).toContain('de 4 candidatos');
  });

  /* ─── Paginação POR MODO ──────────────────────────────────────────────────
     Defeito corrigido: a paginação era única (10/20/50) para as duas visões.
     Nos Cards isso deixava a última linha da grade pela metade (com 3 colunas:
     3 + 3 + 3 + 1), abrindo um "buraco" à direita. Agora cada modo tem o SEU
     tamanho de página — a Tabela segue em 10 (e o seletor com 10/20/50), os
     Cards passam a 12 (múltiplo de 3 ⇒ 4 linhas CHEIAS de 3 no desktop), com o
     seletor em 12/24/36. Alternar de modo aplica o padrão do modo de destino e
     volta para a 1ª página, então nunca sobra "página inválida". */
  it('modo Tabela mantém 10 por página e o seletor com 10/20/50', () => {
    const { container } = montar({ admissoes: MUITOS });

    expect(faixaExibida(container)).toBe('Exibindo 1–10 de 40 candidatos');
    expect(seletorPorPagina()).toHaveTextContent('10 por página');

    const conteudo = abrirSelect(seletorPorPagina() as HTMLElement);
    expect(conteudo).not.toBeNull();
    // Nada mudou na Tabela: as MESMAS três opções de sempre.
    expect(opcoesAbertas(conteudo!)).toEqual(['10 por página', '20 por página', '50 por página']);
  });

  it('modo Cards pagina de 12 em 12 (grade cheia) e o seletor vira 12/24/36', () => {
    const { container } = montar({ admissoes: MUITOS });
    fireEvent.click(screen.getByRole('button', { name: /Cards/ }));

    // 1ª página CHEIA: 12 cards = 4 linhas completas de 3 no desktop.
    expect(faixaExibida(container)).toBe('Exibindo 1–12 de 40 candidatos');
    expect(gradeCards(container)!.children).toHaveLength(12);
    expect(seletorPorPagina()).toHaveTextContent('12 por página');
    // 40 itens ÷ 12 = 4 páginas (12 + 12 + 12 + 4).
    expect(screen.getAllByLabelText(/^Página \d+$/).map((b) => b.textContent)).toEqual(['1', '2', '3', '4']);

    const conteudo = abrirSelect(seletorPorPagina() as HTMLElement);
    expect(conteudo).not.toBeNull();
    // O seletor reflete o modo: só quantidades múltiplas de 3.
    expect(opcoesAbertas(conteudo!)).toEqual(['12 por página', '24 por página', '36 por página']);
  });

  it('alternar Tabela↔Cards volta à 1ª página e adota o tamanho do modo', () => {
    const { container } = montar({ admissoes: MUITOS });

    // Tabela, pág. 3 (10 por página) …
    fireEvent.click(screen.getByLabelText('Página 3'));
    expect(faixaExibida(container)).toBe('Exibindo 21–30 de 40 candidatos');

    // … e ao entrar em Cards o modo passa a 12 por página E volta à 1ª página
    // (seguir na "pág. 3 da Tabela" seria uma página inválida com 12 itens).
    fireEvent.click(screen.getByRole('button', { name: /Cards/ }));
    expect(faixaExibida(container)).toBe('Exibindo 1–12 de 40 candidatos');
    expect(seletorPorPagina()).toHaveTextContent('12 por página');
    expect(gradeCards(container)!.children).toHaveLength(12);

    // Da pág. 3 dos Cards de volta para a Tabela: 1ª página + 10 por página.
    fireEvent.click(screen.getByLabelText('Página 3'));
    expect(faixaExibida(container)).toBe('Exibindo 25–36 de 40 candidatos');
    fireEvent.click(screen.getByRole('button', { name: /Tabela/ }));
    expect(faixaExibida(container)).toBe('Exibindo 1–10 de 40 candidatos');
    expect(seletorPorPagina()).toHaveTextContent('10 por página');
    expect(gradeCards(container)).toBeNull();
  });

  it('aciona a abertura do detalhe do candidato', () => {
    const onOpenDetalhes = vi.fn();
    montar({ onOpenDetalhes });
    fireEvent.click(screen.getByLabelText('Ver detalhes de Ana Silva'));
    expect(onOpenDetalhes).toHaveBeenCalledWith(expect.objectContaining({ id: 'adm-1' }));
  });

  it('exibe o estado vazio quando não há candidatos', () => {
    montar({ admissoes: [] });
    expect(screen.getByText(/Nenhum candidato encontrado/i)).toBeInTheDocument();
  });

  /* ─── Contrato de diagramação das faixas de filtros ──────────────────────
     Dois defeitos corrigidos — os dois presos pelos testes abaixo:

     1) com `flex-wrap` + larguras fixas, a soma da linha 1 passava da coluna
        de conteúdo (~1136px numa tela de 1440 com a sidebar `w-64` aberta e
        `p-page` = 24px) e "Limpar filtros" caía sozinho na 2ª linha;
     2) o VALOR do select "Período" ("Todo o período" = 94px medidos no
        navegador real) quebrava em DUAS linhas dentro do trigger de 124px.
        O `@radix-ui/react-select` (2.3.7) desestrutura o `className` do
        `SelectValue` e NUNCA o repassa ao `<span>` que ele mesmo renderiza,
        então `truncate`/`text-xs` no `SelectValue` são letra morta: o corte
        tem de vir do PAI do valor (`[&>span:last-child]:truncate`). Os 136px
        atuais saem da medição do maior valor (94px + padding 24px + chevron
        14px + folga) — nenhum rótulo/valor corta. */

  it('mantém busca, filtros e ações numa ÚNICA linha — sem "Limpar filtros" órfão', () => {
    montar();
    const busca = screen.getByLabelText('Buscar candidatos');
    const faixa = busca.parentElement!.parentElement!;

    // `flex-nowrap` SEM prefixo: a linha NÃO quebra em viewport nenhum. Quem
    // absorve a sobra é só a busca (`flex-1`); se o espaço faltar, o
    // `overflow-auto` do `<main>` rola na horizontal — encolher/rolar, nunca
    // empilhar.
    expect(faixa).toHaveClass('flex', 'flex-nowrap', 'items-center', 'gap-2');
    expect(faixa).not.toHaveClass('flex-wrap');

    // Linha 1 da referência = busca + os 5 filtros + o bloco de ações, todos
    // irmãos DENTRO da mesma faixa (5 comboboxes = Departamento..Período).
    const filtros = within(faixa).getAllByRole('combobox');
    expect(filtros).toHaveLength(5);

    const mais = within(faixa).getByRole('button', { name: /Mais filtros/ });
    const limpar = within(faixa).getByRole('button', { name: /Limpar filtros/ });

    // Grupo atômico: os dois botões têm o MESMO pai (`shrink-0` + `ml-auto`,
    // na extrema direita). Nenhum refactor futuro consegue separá-los em
    // linhas diferentes sem quebrar este teste.
    expect(mais.parentElement).toBe(limpar.parentElement);
    expect(mais.parentElement).toHaveClass('ml-auto', 'shrink-0');
    expect(limpar.parentElement!.parentElement).toBe(faixa);
  });

  it('dá largura dominante à busca e corta valor/rótulo dos filtros em UMA linha', () => {
    montar();
    const busca = screen.getByLabelText('Buscar candidatos');
    const moldura = busca.parentElement!;
    const faixa = moldura.parentElement!;

    // Busca: ÚNICO item elástico da linha (`flex-1` = basis 0 + grow 1) e com
    // piso de `min-w-[180px]` — é sempre o maior elemento da faixa.
    expect(moldura).toHaveClass('relative', 'min-w-[180px]', 'flex-1');
    // Mesma altura dos filtros (`h-10`) e padding que livra o ícone de busca.
    expect(busca).toHaveClass('h-10', 'pl-9');

    // Filtros: largura fixa e IDÊNTICA (`w-[136px]`) + o mesmo `min-w` —
    // ritmo uniforme. O `min-w-[100px]` é o que deixa encolher quando a
    // coluna aperta (aí sim o valor corta com "…", nunca quebra em 2 linhas).
    const filtros = within(faixa).getAllByRole('combobox');
    filtros.forEach((filtro) => {
      expect(filtro).toHaveClass('h-10', 'w-[136px]', 'min-w-[100px]');
    });

    // O valor é o ÚLTIMO span do wrapper (o 1º é o rótulo) e o Radix descarta
    // o `className` do `SelectValue`: `w-full` + `truncate` TÊM de estar no
    // PAI. Sem essas duas classes, "Todo o período" volta a quebrar em duas
    // linhas e a linha de filtros ganha altura.
    filtros.forEach((filtro) => {
      const wrapper = filtro.firstElementChild as HTMLElement;
      expect(wrapper).toHaveClass('[&>span:last-child]:w-full', '[&>span:last-child]:truncate');
      expect(wrapper.querySelectorAll(':scope > span')).toHaveLength(2);
    });

    // Casos extremos que a medição real apontou: o rótulo mais longo
    // ("Departamento") e o valor mais longo ("Todo o período", 94px) chegam
    // inteiros ao trigger — é o que os 136px garantem.
    expect(filtros[0].textContent).toContain('Departamento');
    expect(filtros[4].textContent).toContain('Todo o período');

    // As ações compartilham a altura dos filtros = alinhamento vertical perfeito.
    expect(within(faixa).getByRole('button', { name: /Mais filtros/ })).toHaveClass('h-10');
    expect(within(faixa).getByRole('button', { name: /Limpar filtros/ })).toHaveClass('h-10');
  });

  it('organiza as 10 pills de etapa numa faixa única, sem esmagar nem quebrar rótulo', () => {
    montar();
    const todos = screen.getByRole('button', { name: /^Todos/ });
    const faixa = todos.parentElement!;

    // Mesmo espírito da linha 1: UMA faixa contínua (`flex-nowrap`, sem
    // `flex-wrap`) com gap uniforme de 6px — o mesmo ritmo do gap interno da
    // pílula, então os chips formam uma régua só.
    expect(faixa).toHaveClass('flex', 'flex-nowrap', 'gap-1.5', 'overflow-x-auto');
    expect(faixa).not.toHaveClass('flex-wrap');

    // As 10 etapas da referência, na ordem, na MESMA faixa (a última é a
    // "Cancelada" — ela quebrava de forma estranha quando o pill esmagava).
    const pills = Array.from(faixa.children);
    expect(pills).toHaveLength(10);
    expect(pills[0]).toBe(todos);
    expect(pills[9].textContent).toContain('Cancelada');

    pills.forEach((pill) => {
      // `flex-1` (= `flex: 1 1 0%`) + `whitespace-nowrap`: as 10 pills DIVIDEM a
      // largura da coluna, então a faixa termina exatamente na borda direita.
      // O defeito anterior era `shrink-0`: a faixa parava na largura natural das
      // pills e sobrava um vazio à direita que CRESCIA com a tela (medido no
      // navegador real, da última pill até a borda útil: 0px em 1440, 109px em
      // 1536 e 276px em 1920).
      expect(pill).toHaveClass('flex-1', 'whitespace-nowrap');
      expect(pill).not.toHaveClass('shrink-0');
      // `flex-1` NÃO esmaga nem quebra rótulo: o piso implícito `min-width: auto`
      // do flex mantém cada pill no próprio `min-content` (o rótulo inteiro) e,
      // quando a coluna fica mais estreita que a soma das 10 (1123px de pills
      // contra 1062px de coluna em 1366px com a sidebar `w-64` aberta), quem
      // responde é o `overflow-x-auto` da faixa: rola na horizontal, nunca
      // empilha. Badge numérico estável (`tabular-nums`) e que não se esmaga.
      expect(pill.querySelector('span')).toHaveClass('tabular-nums', 'shrink-0', 'min-w-[16px]');
    });
  });

  /* ─── Contrato de UMA linha nos selos de "Etapa Atual" ───────────────────
     Defeito corrigido: o `Badge` é um `inline-flex` SEM `whitespace-nowrap`, e
     "Etapa Atual" é a única coluna sem largura declarada — era ela que cedia
     espaço primeiro, então o rótulo abria em DUAS linhas ("Docs Pendentes",
     "Em Validação", "Aguardando Exame", "Contrato Gerado"). Medido em Chromium
     real, 1366x900 com a sidebar `w-64` aberta (coluna de conteúdo = 1062px):
     o selo quebrado media 83x37px contra 123x21px do rótulo inteiro, e a
     coluna ficava com 114px contra os 154px necessários (123px do rótulo mais
     longo + 32px do padding da célula).

     Contrato agora: `whitespace-nowrap` eleva o `min-content` do selo ao
     rótulo completo — a coluna (automática, sem `w-[..]`) cresce só o
     necessário e o que não couber sai por `overflow-auto` (rolagem horizontal
     da tabela), como já é a régua das pills de etapa desta tela. Nunca 2ª
     linha, nunca corte: `shrink-0` é o mesmo contrato na visão Cards, onde o
     selo divide um `flex` com o bloco do nome (`min-w-0`). */

  it('mantém os selos de etapa em UMA linha — coluna automática, sem largura fixa', () => {
    const { container } = montar();

    // A coluna segue AUTOMÁTICA: nenhum `w-[..]`/`max-w-[..]` no cabeçalho, o
    // piso da largura é o próprio rótulo do selo.
    const titulo = [...container.querySelectorAll('table thead th')].find(
      (th) => th.textContent?.trim() === 'Etapa Atual'
    ) as HTMLElement;
    expect(titulo).toBeTruthy();
    expect(titulo.className).not.toMatch(/\b(max-)?w-\[/);

    const selos = [...container.querySelectorAll('table tbody tr')].map(
      (tr) => tr.children[4].firstElementChild as HTMLElement
    );
    expect(selos).toHaveLength(4);
    selos.forEach((selo) => {
      expect(selo).toHaveClass('whitespace-nowrap', 'shrink-0');
      // Nada de largura apertada nem de corte por reticências: só o rótulo.
      expect(selo.className).not.toMatch(/\b(max-)?w-\[|truncate|text-ellipsis/);
    });
  });

  it('entrega os 9 rótulos de etapa inteiros e sem quebra', () => {
    const etapas = [
      'solicitacao',
      'documentos',
      'validacao',
      'exame',
      'contrato',
      'assinatura',
      'esocial',
      'concluida',
      'cancelada',
    ];
    const rotulos = [
      'Solicitação',
      'Docs Pendentes',
      'Em Validação',
      'Aguardando Exame',
      'Contrato Gerado',
      'Assinatura',
      'eSocial',
      'Concluída',
      'Cancelada',
    ];
    const { container } = montar({
      admissoes: etapas.map((etapa, i) =>
        base({
          id: `adm-etapa-${i}`,
          nome: `Candidato ${i}`,
          cargo: 'Analista de RH',
          departamento: 'RH',
          etapa,
          data_prevista: '2030-01-10',
        })
      ),
    });

    const selos = [...container.querySelectorAll('table tbody tr')].map(
      (tr) => tr.children[4].firstElementChild as HTMLElement
    );
    expect(selos).toHaveLength(9);
    // Texto COMPLETO (sem reticências) e o MESMO contrato de uma linha.
    expect(selos.map((s) => s.textContent).sort()).toEqual([...rotulos].sort());
    selos.forEach((selo) => expect(selo).toHaveClass('whitespace-nowrap', 'shrink-0'));
  });

  /* ─── Contrato de abertura dos dropdowns de filtro ───────────────────────
     Defeito corrigido: com o padrão do Radix/Floating UI, o popup TROCA de lado
     quando não cabe abaixo do trigger (middleware `flip`). Na página real —
     header + tablist acima da faixa de filtros — o dropdown abria PARA CIMA e
     passava por cima dos KPI cards (medido em Chromium real, 1366x700 com a
     sidebar `w-64` aberta: "Departamento", 10 opções, e "Cargo", 39 opções).
     Contrato agora: `side="bottom"` + `align="start"` + `avoidCollisions={false}`
     — popup SEMPRE abaixo do trigger, alinhado à esquerda dele — com o `max-h`
     pela altura disponível do popper como contrapeso: o middleware `size` do
     Radix continua ativo mesmo com `avoidCollisions={false}` e escreve
     `--radix-popper-available-height`, então o menu assume o espaço real e ROLA
     por dentro dele (nada de opção inalcançável fora da janela). */

  it('abre o dropdown SEMPRE para baixo (bottom-start), rolando por dentro do espaço', () => {
    montar();
    const faixa = screen.getByLabelText('Buscar candidatos').parentElement!.parentElement!;
    // Departamento = 1º combobox (5 opções: "Todos" + os 4 departamentos dos dados).
    const departamento = within(faixa).getAllByRole('combobox')[0];

    // `pointerdown` é o gatilho real do `SelectTrigger` (o `click` sozinho não
    // abre) e `pointerType: 'mouse'` é o que o próprio Radix exige nesse mesmo
    // handler. Só que o jsdom não implementa a Pointer Capture API que ele chama
    // antes (`target.hasPointerCapture`) — sem o stub, o Radix lança `TypeError`
    // e o popup nunca monta. O `ResizeObserver` que o Popper exige já está no
    // `src/setupTests.ts`.
    const alvo = departamento as HTMLElement;
    alvo.hasPointerCapture = () => false;
    fireEvent.pointerDown(alvo, { button: 0, ctrlKey: false, pointerType: 'mouse' });

    // O Radix monta o popup num Portal, dentro do wrapper do Popper; é no Content
    // (filho direto do wrapper) que ele escreve `data-side`/`data-align`.
    const conteudo = document.querySelector<HTMLElement>('[data-radix-popper-content-wrapper] > [data-side]');
    expect(conteudo).not.toBeNull();

    // `bottom-start` congelado: sem `flip`, o menu não sobe sobre os KPIs.
    expect(conteudo).toHaveAttribute('data-side', 'bottom');
    expect(conteudo).toHaveAttribute('data-align', 'start');

    // Contrapeso obrigatório do lado fixo: o menu se limita à altura disponível
    // abaixo do trigger e rola por dentro dela.
    expect(conteudo).toHaveClass('max-h-[var(--radix-select-content-available-height)]');

    // As opções seguem TODAS no DOM (o scroll é interno ao viewport do menu).
    expect(within(conteudo!).getAllByRole('option')).toHaveLength(5);
  });

  /* ─── Contrato de diagramação do seletor de ordenação ────────────────────
     Dois defeitos corrigidos nesta peça:
       1) o "Mais recentes" nasceu com `h-9 w-[176px]` — mais alto e mais largo
          que o grupo `[Tabela | Cards]` ao lado, o que o fazia ler como um card
          grande no meio do cabeçalho;
       2) ao ganhar um grupo interno, o ícone `ArrowUpDown` passou a cair ACIMA
          do texto, em vez de ao lado dele.
     Causa raiz do (2): o `SelectTrigger` base (select.tsx) carrega
     `[&>span]:line-clamp-1`, cujo `> span` casa qualquer filho DIRETO `span`
     com especificidade (0,1,1) — acima do `.flex` (0,1,0) — impondo
     `display: -webkit-box` + `-webkit-box-orient: vertical`, que empilha ícone
     e rótulo. Por isso o grupo interno é um `<div>` (o variante só casa
     `> span`), o mesmo recurso que o `FiltroSelect` usa.
     Contrato agora:
       • altura EXTERNA igual à MOLDURA do grupo (`h-[42px]` = `p-1` 4px +
         `border` 1px + `h-8` 32px + `border` 1px + `p-1` 4px) — nivelar pela
         moldura, e não pelos 32px dos botões internos, é o que dá o mesmo
         centro Y aos DOIS BLOCOS (são irmãos de um `items-center`);
       • largura fixa e curta (`w-[150px]`; o rótulo mais longo, "Mais
         recentes", mede 85,1px na fonte do app) — não encolhe ao trocar a
         ordenação (Etapa/Maior prazo são bem mais curtos);
       • UMA linha `[↕ Mais recentes ˅]`: grupo `flex flex-row items-center
         gap-2 min-w-0` com o ícone `shrink-0` à ESQUERDA do rótulo e o chevron
         herdado no extremo DIREITO.
     Cores, tipografia, ícones, opções, posição do grupo e Tabela/Cards:
     intocados. */

  it('nivela o "Mais recentes" com o grupo Tabela/Cards e mantém ícone e texto na MESMA linha', () => {
    montar();

    // A tríade do cabeçalho é irmã: o toggle é o container dos dois botões e o
    // seletor de ordenação é o único combobox DENTRO dele.
    const grupo = screen.getByRole('button', { name: /Tabela/ }).parentElement!;
    const cabecalho = grupo.parentElement!;
    const ordenacao = within(cabecalho).getByRole('combobox');

    // ── Altura EXTERNA = a moldura do grupo, não a dos botões internos. ──
    expect(ordenacao).toHaveClass('h-[42px]', 'rounded-lg', 'border-border/40');
    // ...e NÃO o volume antigo (`h-9`/`w-[176px]`) nem a altura só dos botões.
    expect(ordenacao).not.toHaveClass('h-9', 'h-8', 'w-[176px]');
    // Largura reduzida, fixa e curta: o controle não encolhe ao trocar a ordem.
    expect(ordenacao).toHaveClass('w-[150px]');
    // Padding enxuto nos dois eixos.
    expect(ordenacao).toHaveClass('px-2.5', 'py-0');
    expect(ordenacao).not.toHaveClass('px-3', 'py-1.5');
    // Linha única com os itens distribuídos na horizontal: grupo à ESQUERDA,
    // chevron à DIREITA, tudo centrado no eixo Y do próprio trigger.
    expect(ordenacao).toHaveClass('flex', 'flex-row', 'items-center', 'justify-between', 'whitespace-nowrap');

    // O grupo do toggle mantém a moldura de sempre (p-1 + rounded-xl + border)…
    within(grupo)
      .getAllByRole('button')
      .forEach((botao) => expect(botao).toHaveClass('h-8'));
    expect(grupo).toHaveClass('rounded-xl', 'border', 'border-border/40', 'p-1');
    // …e 42px é exatamente essa moldura (4 + 1 + 32 + 1 + 4): os DOIS blocos têm
    // a mesma altura externa e, como o pai é `items-center`, o mesmo centro Y.
    expect(ordenacao).toHaveClass('h-[42px]');

    // ── UMA linha: [↕ Mais recentes ˅]. ──
    // O grupo interno precisa ser `div`: um `span` seria esmagado pelo
    // `[&>span]:line-clamp-1` da base do trigger (display: -webkit-box +
    // orient vertical = ícone ACIMA do texto, o defeito relatado).
    const grupoInterno = ordenacao.firstElementChild as HTMLElement;
    expect(grupoInterno.tagName.toLowerCase()).toBe('div');
    expect(grupoInterno).toHaveClass('flex', 'flex-row', 'items-center', 'gap-2', 'min-w-0');
    expect(grupoInterno).not.toHaveClass('flex-col');
    expect(grupoInterno).toHaveClass('[&>span]:whitespace-nowrap');

    // Ícone à ESQUERDA (1º filho) e rótulo logo ao lado (2º filho) — mesmo eixo Y,
    // porque o grupo é `flex-row items-center` e o SVG é `shrink-0`.
    const [icone, rotulo] = [...grupoInterno.children] as HTMLElement[];
    expect(icone.tagName.toLowerCase()).toBe('svg');
    expect(icone).toHaveClass('shrink-0');
    expect(rotulo.tagName.toLowerCase()).toBe('span');
    expect(rotulo.textContent).toContain('Mais recentes');
    // Um único SVG no grupo: nada de ícone duplicado ou jogado para outra linha.
    expect(grupoInterno.querySelectorAll('svg')).toHaveLength(1);

    const chevron = ordenacao.lastElementChild as HTMLElement;
    expect(chevron.tagName.toLowerCase()).toBe('svg');
    expect(chevron).toHaveClass('h-3.5', 'w-3.5');
    expect(chevron).not.toBe(icone);

    // Lógica intocada: o rótulo ativo é o mesmo "Mais recentes".
    expect(ordenacao.textContent).toContain('Mais recentes');
  });

  it('abre o dropdown de ordenação para BAIXO, encostado à direita do trigger', () => {
    montar();
    const grupo = screen.getByRole('button', { name: /Tabela/ }).parentElement!;
    const ordenacao = within(grupo.parentElement!).getByRole('combobox');

    // Mesmos requisitos do Radix já documentados no teste dos filtros (Pointer
    // Capture ausente no jsdom + `pointerType: 'mouse'`).
    const alvo = ordenacao as HTMLElement;
    alvo.hasPointerCapture = () => false;
    fireEvent.pointerDown(alvo, { button: 0, ctrlKey: false, pointerType: 'mouse' });

    const conteudo = document.querySelector<HTMLElement>('[data-radix-popper-content-wrapper] > [data-side]');
    expect(conteudo).not.toBeNull();

    // `bottom-end` congelado: abre para baixo (nunca sobre os KPIs) e alinhado à
    // borda direita do trigger, que é o último item da linha.
    expect(conteudo).toHaveAttribute('data-side', 'bottom');
    expect(conteudo).toHaveAttribute('data-align', 'end');
    expect(conteudo).toHaveClass('max-h-[var(--radix-select-content-available-height)]');

    // As 6 ordenações continuam lá — nem a lista nem a máquina de ordenar mudaram.
    expect(within(conteudo!).getAllByRole('option')).toHaveLength(6);
    expect(within(conteudo!).getByRole('option', { name: 'Mais recentes' })).toBeInTheDocument();
  });

  /* ─── Contrato de destaque do "Limpar filtros" ───────────────────────────
     Defeito corrigido: `variant="ghost"` puro herdava `text-muted-foreground`
     sem fundo nem borda — o botão lia como texto "apagado" ao lado do
     "Mais filtros" (`variant="outline"` com `bg-card`). Agora a cor diz qual
     estado está ativo, sem mexer em tamanho, padding, tipografia nem posição:
       • NENHUM filtro ativo → neutro (fundo/borda neutros + texto
         `foreground`) e desabilitado;
       • QUALQUER filtro ativo → lime do sistema (`bg-primary` +
         `text-primary-foreground`, a MESMA dupla da pill de etapa ativa) e
         habilitado.
     `temFiltros` é o único critério e cobre os 5 selects, as pills de etapa, a
     busca textual e os 2 campos do "Mais filtros". O painel "Mais filtros"
     ABERTO não conta: é disclosure de UI e `limparFiltros` não o fecha — se
     contasse, o botão não voltaria ao neutro ao limpar. */

  it('sem filtro fica neutro; com QUALQUER filtro fica lime e volta ao neutro ao limpar', () => {
    montar();
    const botao = () => screen.getByRole('button', { name: /Limpar filtros/ });

    // ── Nenhum filtro ativo: o estilo neutro de sempre, desabilitado. ──
    expect(botao()).toHaveClass('h-10', 'gap-2', 'rounded-lg', 'border', 'text-xs', 'shadow-xs');
    expect(botao()).toHaveClass('border-border/60', 'bg-muted/60', 'text-foreground');
    expect(botao()).toHaveClass('hover:bg-muted', 'hover:border-border');
    expect(botao()).toHaveClass('disabled:bg-muted/30', 'disabled:border-border/30');
    expect(botao()).not.toHaveClass('bg-primary');
    expect(botao()).toBeDisabled();

    // ── Qualquer filtro ativo: lime com texto/ícone escuros, mesmo shape. ──
    // Uma pill de etapa basta (as pills contam em `temFiltros` como os selects).
    fireEvent.click(screen.getByRole('button', { name: /^Solicitação/ }));
    expect(botao()).toHaveClass('bg-primary', 'text-primary-foreground', 'border-primary');
    // Hover = `bg-primary/90` (variação de lime, sem glow) e o neutro sai de cena.
    expect(botao()).toHaveClass('hover:bg-primary/90');
    expect(botao()).not.toHaveClass('bg-muted/60');
    // Tamanho/padding/tipografia/posição: as MESMAS classes do estado neutro.
    expect(botao()).toHaveClass('h-10', 'gap-2', 'rounded-lg', 'border', 'text-xs', 'shadow-xs');
    expect(botao()).toBeEnabled();

    // O ícone não carrega cor própria (só tamanho): herda `currentColor` do
    // botão, logo vem escuro junto com o texto — nada de `text-*` no SVG.
    const icone = botao().querySelector('svg')!;
    expect(icone).toHaveClass('h-3.5', 'w-3.5');
    expect(icone.getAttribute('class')).not.toMatch(/\btext-/);

    // ── Limpar filtros: tudo volta ao padrão e o botão volta ao neutro. ──
    fireEvent.click(botao());
    expect(botao()).toHaveClass('bg-muted/60');
    expect(botao()).not.toHaveClass('bg-primary');
    expect(botao()).toBeDisabled();

    // A busca textual também é filtro: digitar já acende o lime.
    fireEvent.change(screen.getByLabelText('Buscar candidatos'), { target: { value: 'Ana' } });
    expect(botao()).toHaveClass('bg-primary');
    expect(botao()).toBeEnabled();

    // ── "Mais filtros": o painel ABERTO não é filtro; os CAMPOS dele são. ──
    fireEvent.click(botao());
    expect(botao()).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Mais filtros/ }));
    expect(botao()).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Salário mínimo'), { target: { value: '4000' } });
    expect(botao()).toHaveClass('bg-primary');
    expect(botao()).toBeEnabled();
  });

  /* ─── Contrato de cor da coluna "Ações" ──────────────────────────────────
     Defeito corrigido: o olho de "Ver detalhes" nascia em
     `text-muted-foreground` (cinza) e só ganhava azul no hover — o único
     ícone do sistema que não usava o azul onde o sistema usa azul.
     Agora ele repousa no azul do design system (`text-info`), o MESMO par já
     usado nos botões de "Ver perfil"/"Visualizar" do projeto
     (`ColaboradorTable` / `ColaboradorDirectoryGrid`: `h-8 w-8 rounded-lg
     hover:bg-info/10 text-info`). Só a COR muda: nada de tamanho, posição,
     espaçamento, glow ou fundo de linha — e o trigger de três pontos, que
     abre menu em vez de navegar, permanece neutro. */
  it('mostra o olho de "Ações" no azul do sistema e mantém o três pontos neutro', () => {
    montar();

    const olho = screen.getByLabelText('Ver detalhes de Ana Silva');
    // Azul do sistema no estado de REPOUSO (era cinza).
    expect(olho).toHaveClass('text-info');
    expect(olho).not.toHaveClass('text-muted-foreground');
    // Tamanho/posição/arredondamento: exatamente como antes.
    expect(olho).toHaveClass('h-8', 'w-8', 'rounded-lg');
    // Hover preservado (tinta azul no fundo do PRÓPRIO botão) e sem glow.
    expect(olho).toHaveClass('hover:bg-info/10', 'hover:text-info');
    expect(olho.getAttribute('class')).not.toMatch(/\b(?:drop-)?shadow-/);
    // O ícone em si não carrega cor: herda `currentColor` do botão.
    const icone = olho.querySelector('svg')!;
    expect(icone).toHaveClass('h-4', 'w-4');
    expect(icone.getAttribute('class')).not.toMatch(/\btext-/);

    // A outra ação da coluna segue neutra — o "restante" fica igual.
    const tresPontos = screen.getByLabelText('Mais ações de Ana Silva');
    expect(tresPontos).toHaveClass('text-muted-foreground');
    expect(tresPontos).not.toHaveClass('text-info');
  });
});
