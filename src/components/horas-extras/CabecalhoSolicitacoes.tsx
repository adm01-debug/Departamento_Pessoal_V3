/**
 * ============================================================================
 * CABEÇALHO DA PÁGINA — faixa compacta, SEM cartão externo.
 *
 * A versão anterior envolvia o cabeçalho inteiro num `MotionCard` grande: a
 * página abria com um bloco arredondado cercando ícone + título + botão, o que
 * empurrava a faixa de indicadores para baixo e destoava da referência. Agora
 * o cabeçalho vive DIRETO sobre o fundo da página, na escala dos demais
 * módulos: bloco do ícone de 34 px (42,5 px) e botão de 31 px (38,75 px) — px
 * de classe × 1,25 = px na base rem de 20 px do Design System.
 *
 * TIPOGRAFIA = A DO CABEÇALHO PADRÃO DO SISTEMA (`PageLayout`). O título desta
 * página era o único que destoava do cabeçalho de referência ("Controle de
 * Ponto"): estava em `text-[21px] font-semibold`, enquanto o `PageLayout` — que
 * desenha o `<h1>` de praticamente todas as telas, inclusive a de Ponto — usa
 * `text-2xl font-display font-medium tracking-tight`. Em vez de cravar valores
 * aproximados, as MESMAS classes foram repetidas aqui (família, tamanho, peso,
 * line-height do `text-2xl`, `tracking-tight` e cor herdada do `body`), então
 * título e subtítulo acompanham qualquer ajuste feito no cabeçalho padrão. O
 * subtítulo mantém a aparência compacta que já tinha (`text-muted-foreground`,
 * 11 px), coerente com o restante da página.
 *
 *   [ ícone do módulo ]  Solicitações de Hora Extra
 *                        Gerencie as solicitações…        [ + Nova Solicitação ]
 *
 * Nada além de apresentação mora aqui: o botão apenas chama `onNova`, que é o
 * MESMO `setNovaAberta(true)` que abria o formulário antes — rota, modal e
 * formulário seguem intocados. O `PageLayout` (compartilhado por dezenas de
 * telas) continua sem `title`/`description`/`actions` nesta página e NÃO foi
 * alterado.
 * ============================================================================
 */
import { motion } from 'framer-motion';
import { Plus, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EntradaPresenca, entradaCard } from '@/components/ui/entrada-cards';

export interface CabecalhoSolicitacoesProps {
  /** Abre o formulário de nova solicitação (ação já existente na página). */
  onNova: () => void;
  /**
   * Posição do bloco na fila SIMPLES de entrada (o cabeçalho da página é o
   * slot 0 — o mesmo instante do 1º KPI Card, como no Dashboard Executivo).
   */
  index?: number;
}

export function CabecalhoSolicitacoes({ onNova, index = 0 }: CabecalhoSolicitacoesProps) {
  return (
    <EntradaPresenca>
      <motion.header
        {...entradaCard(index)}
        className="flex min-h-[38px] flex-wrap items-center justify-between gap-x-[14px] gap-y-[8px] py-[2px]"
      >
        <div className="flex min-w-0 items-start gap-[12px] sm:items-center">
          {/* Ícone do módulo — o mesmo `Timer` que a navegação lateral usa para
              "Horas Extras", no bloco de 34 px (42,5 px renderizados). */}
          <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[11px] bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-glow-sm">
            <Timer className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <div className="min-w-0">
            {/* MESMA receita do `<h1>` do `PageLayout` (cabeçalho padrão do
                sistema, usado por "Controle de Ponto"): `text-2xl` +
                `font-display` (Plus Jakarta Sans) + `font-medium` +
                `tracking-tight`, cor herdada do `body`. Nenhum valor
                aproximado aqui — é a classe compartilhada, copiada. */}
            <h1 className="text-2xl font-display font-medium tracking-tight">Solicitações de Hora Extra</h1>
            <p className="mt-[2px] text-[11px] leading-snug text-muted-foreground">
              Gerencie as solicitações de horas extras, aprove ou rejeite e acompanhe o histórico.
            </p>
          </div>
        </div>

        <Button
          onClick={onNova}
          className="h-[31px] shrink-0 gap-[7px] rounded-[10px] px-[14px] text-[11px] font-semibold"
        >
          <Plus className="h-[14px] w-[14px]" aria-hidden />
          Nova Solicitação
        </Button>
      </motion.header>
    </EntradaPresenca>
  );
}
