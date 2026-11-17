/**
 * ============================================================================
 * ABA PAGAMENTOS — FLUXO DE PAGAMENTO (barra horizontal — referência aprovada).
 *
 * UMA barra e UMA linha: [título + subtítulo] → [① → ② → ③ → ④ → ⑤]. As cinco
 * etapas NÃO são cartões: cada uma é círculo numerado + nome + contador, separadas
 * por um chevron discreto. Sem valores monetários (os valores vivem nos KPI Cards e
 * na tabela) e sem a linha de "fora do fluxo" — esse acesso está no seletor de
 * etapa da tabela, sem perder o link nem a contagem.
 *
 * ── SEM ROLAGEM HORIZONTAL ──────────────────────────────────────────────────
 * A versão anterior estourava a largura por 13px e criava barra de rolagem. O
 * orçamento foi medido no DOM (viewport 1456): a região das etapas dispõe de 677px,
 * e o conteúdo necessário com os nomes INTEIROS é:
 *   nomes 365 + círculos 180 + setas 64 + círculo→nome (5×6) 30 + gaps (8×4) 32 = 671px.
 * Por isso: (a) as SETAS passaram a ser itens próprios da lista — ficam centradas
 * ENTRE as etapas, em vez de somarem 12px de gap dentro de cada item; (b) os gaps
 * internos ficaram enxutos (6px círculo→nome, 4px entre itens); (c) a faixa NÃO tem
 * `min-width` nem `overflow-x-auto` em nenhuma largura — a partir de 1400px ela
 * cabe em uma linha (sobra distribuída por `justify-between`) e abaixo disso QUEBRA
 * em linhas preservando a ordem, sem barra de rolagem, sem sobreposição e sem
 * truncar nomes.
 *
 * DESTAQUE: vem do estado real — `etapaAtual(etapas)` devolve a primeira etapa com
 * pagamentos aguardando algo; ela recebe o círculo preenchido e o contador na tinta
 * da etapa (as demais ficam contornadas, na progressão de cor da referência).
 * Clicar numa etapa aplica o filtro de etapa da tabela, e o mapeamento status →
 * etapa/contagem continua em `pagamentosComum` (nenhum critério foi alterado).
 *
 * RESPONSIVIDADE: em `lg`+ é obrigatoriamente uma única linha. Abaixo disso o
 * título fica em cima e a faixa das etapas rola por dentro (`overflow-x-auto`),
 * preservando círculos e nomes legíveis — nunca cinco cartões.
 *
 * ENTRADA: a MESMA régua do hub (`entradaCard` → cadência de `premiacoesEntrada`),
 * na ordem pedida — contêiner (índice 6) → título (7) → as cinco etapas (8, o teto
 * de `MAX_ENTRADA_INDEX`): as etapas dividem o ÚLTIMO degrau porque a régua limita
 * o atraso acumulado no 9º item, exatamente como já acontece no fim da tabela e
 * na cauda dos filtros.
 * ============================================================================
 */
import { Fragment } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { entradaCard } from './premiacoesEntrada';
import { indiceEntrada } from './premiacoesComum';
import { etapaAtual, ETAPAS_FLUXO, type EtapasContadas, type FiltroEtapaFluxo } from './pagamentosComum';

interface PagamentosFluxoProps {
  etapas: EtapasContadas;
  etapaSelecionada: FiltroEtapaFluxo;
  onSelecionar: (etapa: FiltroEtapaFluxo) => void;
}

export function PagamentosFluxo({ etapas, etapaSelecionada, onSelecionar }: PagamentosFluxoProps) {
  // Etapa "onde o processo está" — só vale como destaque quando nenhuma etapa está
  // filtrada (com filtro ativo, o destaque é a própria seleção).
  const atual = etapaAtual(etapas);

  return (
    <motion.section
      {...entradaCard(indiceEntrada('kpis', 4))}
      className="flex min-w-0 flex-col gap-2.5 rounded-xl border border-border/50 bg-card/60 px-4 py-[18px] lg:flex-row lg:items-center lg:gap-5"
    >
      {/* Região A — título e subtítulo, à esquerda e centrados verticalmente com as
          etapas (largura reservada de ~195px; o subtítulo fica em UMA linha, como na
          referência — com duas linhas a barra passaria da altura aprovada). */}
      <motion.div {...entradaCard(indiceEntrada('kpis', 5))} className="shrink-0 lg:w-[195px]">
        <h3 className="text-[13px] font-semibold leading-[18px]">Fluxo de Pagamento</h3>
        <p className="mt-1 whitespace-nowrap text-[10px] leading-4 text-muted-foreground">
          Acompanhe cada etapa do processo
        </p>
      </motion.div>

      {/* Região B — as cinco etapas com as setas ENTRE elas (itens próprios da lista,
          para ficarem centralizadas entre as etapas). Sem QUALQUER rolagem: a partir
          de 1400px a faixa cabe em uma única linha (orçamento medido em 671px para
          677px disponíveis); abaixo disso ela QUEBRA em linhas preservando a ordem —
          sem barra de rolagem, sem sobreposição e sem truncar nomes. */}
      <div className="min-w-0 flex-1">
        <ol className="flex flex-wrap items-center justify-between gap-x-0.5 gap-y-1.5 min-[1420px]:flex-nowrap">
          {ETAPAS_FLUXO.map((etapa, indice) => {
            const quantidade = etapas.porEtapa[etapa.valor];
            const filtrada = etapaSelecionada === etapa.valor;
            const destacada = filtrada || (etapaSelecionada === 'todas' && atual === etapa.valor);
            return (
              <Fragment key={etapa.valor}>
                <li {...entradaCard(indiceEntrada('kpis', 6 + indice))} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onSelecionar(filtrada ? 'todas' : etapa.valor)}
                    aria-pressed={filtrada}
                    title={`${etapa.label} · ${quantidade} pagamento${quantidade === 1 ? '' : 's'}`}
                    className="flex min-w-0 items-center gap-1 text-left transition-opacity hover:opacity-80"
                  >
                    <span
                      className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border-2 text-[13px] font-semibold tabular-nums ${
                        destacada ? etapa.circuloAtivo : etapa.circulo
                      }`}
                    >
                      {etapa.numero}
                    </span>
                    <span className="flex min-w-0 flex-col items-start gap-1">
                      <span className="truncate text-[12px] font-semibold leading-4">{etapa.label}</span>
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                          destacada ? etapa.contadorAtivo : etapa.contador
                        }`}
                      >
                        {quantidade}
                      </span>
                    </span>
                  </button>
                </li>
                {indice < ETAPAS_FLUXO.length - 1 && (
                  <li aria-hidden className="shrink-0">
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                  </li>
                )}
              </Fragment>
            );
          })}
        </ol>
      </div>
    </motion.section>
  );
}
