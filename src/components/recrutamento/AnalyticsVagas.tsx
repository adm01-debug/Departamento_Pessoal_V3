import { useRef, useState } from 'react';
import { Briefcase, ChevronDown } from 'lucide-react';
import { formatarPercentual, type DesempenhoVaga, type DetalheVaga } from './analyticsComum';
import { AnalyticsPainel } from './AnalyticsPainel';
import { DesempenhoVagasDialog } from './DesempenhoVagasDialog';
import { PreenchimentoBarraAnalytics } from './barraProgressoAnalytics';
import {
  BOTAO_VER_TODOS_PRIMARIO,
  GRADIENTE_VAGA,
  SUPERFICIE_SUAVE,
  TRILHA_BARRA_VAGA,
  tokenDaConversao,
} from './analyticsVisual';
import { slotSequencial } from '@/components/ui/entradaGlobal';
import { useEntradaCardConcluida } from '@/hooks/useEntradaCardConcluida';
import { useMovimentoReduzido } from '@/lib/motionMode';
import { cn } from '@/lib/utils';

/**
 * DESEMPENHO POR VAGA — candidatos e conversão, do maior volume para o menor.
 *
 * A barra representa a CONVERSÃO da vaga (contratados ÷ candidaturas), a mesma
 * leitura do percentual à direita; o volume aparece em “N candidatos” na linha
 * de baixo. O ponto de status diferencia vaga aberta de fechada sem esconder
 * nenhuma delas.
 *
 * Os tokens saem daqui SEM o prefixo `--` (ele entra no `var(--${token})`):
 * com o prefixo na string o CSS virava `var(----info)` e a barra/percentual de
 * cada vaga ficavam sem cor.
 *
 * LISTA CURTA NO RESUMO, BASE COMPLETA NA JANELA: o card mostra SEMPRE as
 * quatro primeiras vagas (o mesmo recorte de antes) e o "Ver todas" do canto
 * superior direito abre `DesempenhoVagasDialog` — a mesma base enriquecida por
 * `construirDetalheVagas`, com KPIs, filtros, ordem e a tabela completa. O
 * resumo não cresce mais ao clicar (era um "Ver menos" que esticava o painel e
 * desalinhava os vizinhos da faixa); a leitura longa passou a ter uma janela só
 * dela. O botão é verde-lime (`BOTAO_VER_TODOS_PRIMARIO`) e o chevron herda a
 * cor por `currentColor`.
 *
 * BARRA: todas usam o MESMO gradiente azul → verde-água (`GRADIENTE_VAGA`) e a
 * coreografia do card "Amplitude de Liderança" (0 → conversão real, `easeOut`,
 * 1,2 s, cascata de 0,15 s + 0,1 s por linha, uma vez só na entrada do painel).
 * O que separa uma vaga da outra é o COMPRIMENTO da barra e o percentual ao
 * lado — a cor deixou de codificar faixas de conversão; o ponto de status e o
 * percentual (ainda por token, ver `tokenDaConversao`) é que carregam a leitura
 * semântica.
 */

/** Quantas vagas aparecem no resumo do card. */
const VAGAS_VISIVEIS = 4;

export function AnalyticsVagas({
  vagas,
  detalhes = [],
  index,
}: {
  vagas: DesempenhoVaga[];
  /**
   * Mesma base do card, enriquecida para a janela "Ver todas"
   * (`construirDetalheVagas`). Opcional para o resumo continuar renderizável
   * sozinho (é o caso dos testes de barra): omitida, a janela abre sem linhas —
   * o card nunca depende dela.
   */
  detalhes?: DetalheVaga[];
  index: number;
}) {
  const [janelaAberta, setJanelaAberta] = useState(false);
  /** Onde o foco volta ao fechar a janela (o botão não é um `Dialog.Trigger`). */
  const botaoVerTodas = useRef<HTMLButtonElement>(null);

  /**
   * BARRAS — o mesmo gatilho dos painéis de origens e da evolução: só depois de
   * a entrada do card terminar (`useEntradaCardConcluida`, alimentado pelo
   * `onAnimationComplete` do `MotionCard`), uma única vez e sem voltar atrás.
   * Hover, refetch ou abrir/fechar a janela não reiniciam a varredura.
   */
  const reduzirMovimento = useMovimentoReduzido();
  const { entradaConcluida, aoConcluirEntrada } = useEntradaCardConcluida(index, slotSequencial);
  const animar = reduzirMovimento || entradaConcluida;

  const podeExpandir = vagas.length > VAGAS_VISIVEIS;
  /** O resumo é sempre o mesmo recorte de quatro vagas (não cresce mais). */
  const visiveis = vagas.slice(0, VAGAS_VISIVEIS);

  /* "Ver todas" mora no canto superior direito, como na referência, e SEM a
     contagem no rótulo visível (o "Ver todas (5)" custava ~30px e com o título
     em 15px o cabeçalho estourava em containers de ~1060px). A contagem
     continua na acessibilidade (`aria-label`) e no rodapé da janela. O botão só
     existe quando há mais vagas do que o resumo mostra — com quatro ou menos,
     tudo já está na tela (mesma regra de antes). */
  const acaoLista = podeExpandir ? (
    <button
      ref={botaoVerTodas}
      type="button"
      aria-haspopup="dialog"
      aria-label={`Ver todas (${vagas.length})`}
      onClick={() => setJanelaAberta(true)}
      className={cn(BOTAO_VER_TODOS_PRIMARIO, 'shrink-0')}
    >
      Ver todas
      <ChevronDown className="h-3 w-3" aria-hidden />
    </button>
  ) : undefined;

  return (
    <>
      <AnalyticsPainel
        icon={Briefcase}
        title="Desempenho por vaga"
        subtitle="Candidatos e conversão"
        tom="success"
        index={index}
        action={acaoLista}
        aoConcluirEntrada={aoConcluirEntrada}
        /* Mesmo par de cabeçalho do painel de atenção (15/12, 4px entre eles —
         aqui o vão é 4px porque o subtítulo não tem ícone ao lado). Os outros
         cinco painéis da aba continuam no padrão do casco (13/10). */
        titleClassName="text-[15px] leading-[1.3]"
        subtitleClassName="mt-1 text-[12px] leading-[1.4]"
        /* 10px até a lista (somados aos 8px do cabeçalho = 18px de projeto entre
         cabeçalho e primeira vaga) e 14px até a borda inferior. */
        contentClassName="flex flex-col px-4 pb-3.5 pt-2.5"
      >
        {vagas.length === 0 ? (
          <div
            className={`flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-[7px] px-4 py-4 text-center ${SUPERFICIE_SUAVE}`}
          >
            <Briefcase className="h-5 w-5 text-muted-foreground/40" aria-hidden />
            <p className="text-[12.5px] font-medium text-foreground/80">Nenhuma vaga cadastrada</p>
            <p className="max-w-[210px] text-[11.5px] leading-[1.4] text-muted-foreground">
              Publique uma vaga para acompanhar o desempenho por processo.
            </p>
          </div>
        ) : (
          /* Cada vaga é uma linha independente e `flex-1`: sem o resumo do rodapé,
           a lista é quem ocupa TODA a altura do corpo do painel, e as linhas
           dividem essa altura por igual — os fios (`divide-y`) caem em
           intervalos regulares, sem folga morta no pé e sem linha mais alta que
           a vizinha. `min-h-[26px]` (32,5px reais) + `py-1` só entram em cena
           quando o painel fica mais baixo que as quatro linhas: aí as linhas param de encolher e o painel acompanha os vizinhos da faixa. O fio entre elas é discreto
           (`divide-border/25`), para não competir com as barras. */
          <ul className="flex flex-1 flex-col divide-y divide-border/25" aria-label="Desempenho por vaga">
            {visiveis.map((vaga, indice) => {
              const token = tokenDaConversao(vaga.conversao);
              const aberta = vaga.status === 'aberta';
              return (
                <li
                  key={vaga.id}
                  className="grid min-h-[26px] min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(40px,50px)_28px] items-center gap-x-2 py-1"
                  title={`${vaga.titulo}: ${vaga.contratados} contratados de ${vaga.candidatos} candidaturas`}
                >
                  {/* Coluna 1 — status + nome da vaga, em UMA linha com reticências.
                    As quatro áreas da linha (nome · volume · barra · %) são
                    COLUNAS do grid, iguais em todas as linhas: por isso os nomes
                    começam no mesmo x, as barras começam no mesmo x e os
                    percentuais formam uma coluna alinhada à direita.
                    LARGURAS: o volume é `auto` (a coluna mede o texto mais largo
                    entre as linhas, "5 candidatos"), e não mais 68px fixos — o
                    valor fixo ficava 1–2px abaixo do necessário e TODO volume
                    caía em reticências ("5 candidat…", "2 candidat…"). Com `auto`
                    o volume aparece inteiro sempre; quem absorve a sobra é a
                    coluna do nome (`minmax(0,1fr)`), que é a única que pode
                    truncar sem perder informação (o texto completo está no
                    `title`). Resto da calibragem: 40–50px de barra, 28px de
                    percentual e 10px de vão. */}
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden
                      className={cn('h-2 w-2 shrink-0 rounded-full', aberta ? 'bg-success' : 'bg-muted-foreground/40')}
                      title={aberta ? 'Vaga aberta' : 'Vaga fechada'}
                    />
                    <p className="min-w-0 truncate text-[12.5px] leading-[1.35] text-foreground/85" title={vaga.titulo}>
                      {vaga.titulo}
                    </p>
                  </div>
                  {/* Coluna 2 — volume, à direita (coluna `auto`: largura do texto
                    mais largo da lista, para nenhum volume cair em reticências). */}
                  <p className="whitespace-nowrap text-right text-[11.5px] leading-[1.35] tabular-nums text-muted-foreground">
                    {vaga.candidatos} {vaga.candidatos === 1 ? 'candidato' : 'candidatos'}
                  </p>
                  {/* Coluna 3 — barra de 8px de projeto (10px reais), na mesma faixa
                    de x em todas as linhas: é o comprimento que se compara, não a
                    posição. O gradiente é o MESMO em todas as vagas e o
                    preenchimento segue a coreografia da referência (ver o doc do
                    componente). O piso de 6% e o "0 para quem não converteu"
                    continuam valendo. */}
                  <span aria-hidden className={TRILHA_BARRA_VAGA}>
                    <PreenchimentoBarraAnalytics
                      percentual={vaga.conversao > 0 ? Math.max(6, Math.min(100, vaga.conversao)) : 0}
                      indice={indice}
                      gradiente={GRADIENTE_VAGA}
                      animar={animar}
                      reduzirMovimento={reduzirMovimento}
                    />
                  </span>
                  {/* Coluna 4 — percentual à direita, coluna vertical. */}
                  <span
                    className="text-right text-[12.5px] font-semibold leading-[1.35] tabular-nums"
                    style={{ color: `hsl(var(--${token}))` }}
                  >
                    {formatarPercentual(vaga.conversao, 0)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </AnalyticsPainel>

      {/* A janela lê a base COMPLETA do recorte (não só as quatro do resumo) e
          devolve o foco ao botão "Ver todas" no fechamento — X, Escape, clique
          no véu ou o botão Fechar do rodapé passam todos por `onClose`. */}
      <DesempenhoVagasDialog
        open={janelaAberta}
        detalhes={detalhes}
        onClose={() => setJanelaAberta(false)}
        onCloseAutoFocus={(evento) => {
          evento.preventDefault();
          botaoVerTodas.current?.focus();
        }}
      />
    </>
  );
}
