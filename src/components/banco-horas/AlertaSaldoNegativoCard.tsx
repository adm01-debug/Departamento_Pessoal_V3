/**
 * ============================================================================
 * CARD "SALDOS NEGATIVOS" — o alerta da área, com nome e número.
 *
 *   ┌───────────────────────────────────────────────┐
 *   │ (⚠) Saldos negativos                          │
 *   │     12h30 em dívida com 2 colaboradores       │
 *   ├───────────────────────────────────────────────┤
 *   │ (MS) Maria Silva                     -6h00    │
 *   │      Operações                                │
 *   │ (JS) João Souza                      -6h30    │
 *   │      Logística                                │
 *   │ + 2 outros colaboradores          Ver todos   │
 *   └───────────────────────────────────────────────┘
 *
 * ── SEM FAIXA DE RESUMO (e por quê) ─────────────────────────────────────────
 * Até a revisão de layout havia uma faixa âmbar com o mesmo valor do subtítulo
 * ("12h30 em dívida com 2 colaboradores"). Ela custava ~55 px numa coluna que
 * precisa fechar na mesma altura do extrato, e repetia o que já estava logo
 * abaixo do título. O valor e a contagem continuam no subtítulo; o ícone de
 * alerta continua no cabeçalho.
 *
 * ── QUANDO APARECE ──────────────────────────────────────────────────────────
 * Só quando existe pelo menos um colaborador com saldo atual NEGATIVO: um card
 * permanente de "0 colaboradores no vermelho" gastaria a atenção da tela com
 * uma não-notícia. Sem negativos, o componente devolve `null` e a coluna da
 * direita simplesmente segue com os outros cards.
 *
 * ── DE ONDE VEM O NÚMERO ────────────────────────────────────────────────────
 * `colaboradoresNegativos(saldosPorColaborador(...))` — a FOTO do saldo atual,
 * a mesma fonte dos KPI Cards 1 e 5 e da rosca. Não tem relação com o período
 * filtrado no extrato: dívida é dívida hoje, não "no recorte de março".
 *
 * A lista mostra no máximo `LIMITE_VISIVEL` nomes (o card não pode crescer até
 * empurrar o gráfico de evolução para fora da tela) e resume o resto numa linha
 * discreta "+ N outros colaboradores" com o atalho **Ver todos**, que abre o
 * diálogo com a lista completa — o card continua curto, a informação não some.
 * Três nomes (era quatro) é o que cabe na altura da coluna sem esticar o card
 * além do extrato; o resto continua inteiro no diálogo.
 * ============================================================================
 */
import { motion } from 'framer-motion';
import { TriangleAlert } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { VINCULO_LEGENDA, atrasoLegenda } from '@/components/dashboard/estruturaAnimacoes';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useMovimentoReduzido } from '@/lib/motionMode';
import { colaboradoresNegativos, formatarHorasBanco, type SaldoDoColaborador } from './bancoHorasComum';
import { CartaoSecaoBancoHoras } from './CartaoSecaoBancoHoras';

/** Quantos nomes cabem no card antes de virar lista infinita (o diálogo tem todos). */
const LIMITE_VISIVEL = 3;

export interface AlertaSaldoNegativoCardProps {
  /** Saldos por colaborador (a ordem já vem do mais negativo ao mais positivo). */
  saldos: readonly SaldoDoColaborador[];
  /** Posição na BANDA DE CONTEÚDO da fila única de entrada. */
  index?: number;
}

export function AlertaSaldoNegativoCard({ saldos, index = 0 }: AlertaSaldoNegativoCardProps) {
  const movimentoReduzido = useMovimentoReduzido();
  const negativos = colaboradoresNegativos(saldos);

  // Sem ninguém no vermelho não há alerta (ver "QUANDO APARECE" acima).
  if (negativos.length === 0) return null;

  const exibidos = negativos.slice(0, LIMITE_VISIVEL);
  const restantes = negativos.length - exibidos.length;
  const horasEmDivida = negativos.reduce((soma, item) => soma + Math.abs(item.saldo), 0);

  return (
    <CartaoSecaoBancoHoras
      id="banco-horas-alerta"
      icone={TriangleAlert}
      tom="bg-warning/15 text-warning"
      titulo="Saldos negativos"
      /*
        O TAMANHO DA DÍVIDA VIVE NO SUBTÍTULO — a faixa âmbar que repetia o
        mesmo número ("12h30 em dívida com 4 colaboradores") custava ~55 px de
        altura numa coluna que precisa fechar junto com o extrato. O texto, os
        valores e o ícone de alerta continuam os mesmos; o que saiu foi a caixa
        em volta. É também o desenho da referência: título, uma linha de
        contexto e a lista.
      */
      subtitulo={
        <>
          <span className="font-semibold tabular-nums text-foreground">{formatarHorasBanco(horasEmDivida)}</span> em
          dívida com {negativos.length === 1 ? '1 colaborador' : `${negativos.length} colaboradores`}
        </>
      }
      /* A frase ocupa duas linhas: cortar com "…" esconderia o número de pessoas. */
      subtituloMultilinha
      index={index}
      /*
        O SELO COM A CONTAGEM SAIU DO CABEÇALHO — ele repetia "3" enquanto o
        subtítulo já diz "3 colaboradores", e os 30 px do selo empurravam o
        subtítulo para o corte (aparecia "… com 3 colabor…"). O número continua
        no texto, com o valor da dívida.
      */
    >
      <ul className="flex flex-col">
        {exibidos.map((colaborador, indice) => (
          <motion.li
            key={colaborador.id}
            initial={movimentoReduzido ? false : { opacity: 0, x: VINCULO_LEGENDA.deslocamentoX }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: movimentoReduzido ? 0 : VINCULO_LEGENDA.duracaoS,
              delay: movimentoReduzido ? 0 : atrasoLegenda(indice),
              ease: VINCULO_LEGENDA.curva,
            }}
            className="flex min-w-0 items-center gap-[7px] py-[4px] first:pt-0"
          >
            <UserAvatar name={colaborador.nome} size="sm" className="h-[22px] w-[22px] shrink-0 text-[10px]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium leading-tight text-foreground" title={colaborador.nome}>
                {colaborador.nome}
              </p>
              <p
                className="mt-[1px] truncate text-[10px] leading-tight text-muted-foreground"
                title={colaborador.departamento}
              >
                {colaborador.departamento}
              </p>
            </div>
            <span className="shrink-0 text-[11px] font-semibold tabular-nums text-destructive">
              {formatarHorasBanco(colaborador.saldo)}
            </span>
          </motion.li>
        ))}
      </ul>

      {restantes > 0 && (
        <div className="mt-[7px] flex items-center justify-between gap-[8px] border-t border-border/40 pt-[6px]">
          <p className="text-[10px] text-muted-foreground">
            + {restantes} {restantes === 1 ? 'outro colaborador' : 'outros colaboradores'}
          </p>

          {/* A lista do card para em `LIMITE_VISIVEL`; o diálogo é o "resto da
              história" — todos os nomes, com o mesmo par nome/departamento. */}
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="shrink-0 rounded-[7px] text-[10.5px] font-medium text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Ver todos
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-[380px]">
              <DialogHeader>
                <DialogTitle>Saldos negativos</DialogTitle>
                <DialogDescription>
                  {formatarHorasBanco(horasEmDivida)} em dívida com{' '}
                  {negativos.length === 1 ? '1 colaborador' : `${negativos.length} colaboradores`}.
                </DialogDescription>
              </DialogHeader>
              <ul className="-mr-[4px] max-h-[300px] overflow-y-auto pr-[4px]">
                {negativos.map((colaborador) => (
                  <li
                    key={colaborador.id}
                    className="flex min-w-0 items-center gap-[8px] border-b border-border/40 py-[6px] last:border-0"
                  >
                    <UserAvatar name={colaborador.nome} size="sm" className="h-[24px] w-[24px] shrink-0 text-[10px]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-medium leading-tight text-foreground">
                        {colaborador.nome}
                      </p>
                      <p className="mt-[1px] truncate text-[10px] leading-tight text-muted-foreground">
                        {colaborador.departamento}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] font-semibold tabular-nums text-destructive">
                      {formatarHorasBanco(colaborador.saldo)}
                    </span>
                  </li>
                ))}
              </ul>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </CartaoSecaoBancoHoras>
  );
}
