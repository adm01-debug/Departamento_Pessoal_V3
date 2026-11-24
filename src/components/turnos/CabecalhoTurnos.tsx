/**
 * ============================================================================
 * TURNOS & ESCALAS — CABEÇALHO DO PAINEL.
 * ============================================================================
 *
 * Faixa única sobre o fundo da página (sem cartão em volta), na mesma escala do
 * cabeçalho de referência do sistema:
 *
 *   [ícone do módulo]  Turnos & Escalas                      ‹ 05 – 11 de outubro de 2026 ›
 *                      Planejamento de jornadas…             [Hoje][Semana|Mês|Lista] [+ Nova Escala][+ Novo Turno]
 *
 * TIPOGRAFIA: o `<h1>` repete, classe por classe, a receita do cabeçalho padrão
 * (`PageLayout` → `text-2xl font-display font-medium tracking-tight`), a MESMA
 * usada por "Controle de Ponto" e pela faixa de Horas Extras. Nada de tamanho
 * aproximado — se o padrão mudar, esta linha muda junto por ser a mesma classe.
 *
 * Só apresentação: cada controle chama o callback que a página já tinha
 * (`onAnterior`, `onProximo`, `onHoje`, `onVisualizacao`, `onNovaEscala`,
 * `onNovoTurno`). As ações de escrita só aparecem quando `podeGerenciar`.
 * ============================================================================
 */
import { motion } from 'framer-motion';
import { CalendarClock, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EntradaPresenca, entradaCard } from '@/components/ui/entrada-cards';
import { SlidingIndicator } from '@/components/ui/sliding-indicator';
import { cn } from '@/lib/utils';
import type { VisualizacaoTurnos } from './turnosCalendario';

const VISUALIZACOES: { valor: VisualizacaoTurnos; rotulo: string }[] = [
  { valor: 'semana', rotulo: 'Semana' },
  { valor: 'mes', rotulo: 'Mês' },
  { valor: 'lista', rotulo: 'Lista' },
];

export interface CabecalhoTurnosProps {
  /** Intervalo já formatado (`05 – 11 de outubro de 2026`). */
  rotuloPeriodo: string;
  visualizacao: VisualizacaoTurnos;
  onVisualizacao: (visualizacao: VisualizacaoTurnos) => void;
  onAnterior: () => void;
  onProximo: () => void;
  onHoje: () => void;
  onNovaEscala: () => void;
  onNovoTurno: () => void;
  /** Permissão de escrita (criar/editar turnos e escalas). */
  podeGerenciar: boolean;
}

export function CabecalhoTurnos({
  rotuloPeriodo,
  visualizacao,
  onVisualizacao,
  onAnterior,
  onProximo,
  onHoje,
  onNovaEscala,
  onNovoTurno,
  podeGerenciar,
}: CabecalhoTurnosProps) {
  const indiceAtivo = Math.max(
    0,
    VISUALIZACOES.findIndex((item) => item.valor === visualizacao)
  );

  return (
    <EntradaPresenca>
      <motion.header
        {...entradaCard(0)}
        className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-glow-sm">
            <CalendarClock className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-display font-medium tracking-tight">Turnos &amp; Escalas</h1>
            <p className="mt-0.5 font-body text-muted-foreground">Planejamento de jornadas de trabalho da equipe.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 2xl:justify-end">
          {/* NAVEGAÇÃO POR PERÍODO ‹ intervalo ›
              Grupo com superfície própria (`bg-secondary/40` + borda mais
              visível): antes ele era quase invisível ao lado dos botões. Os
              setas têm 35 px de alvo (h-7 w-7) dentro de um p-1, então o grupo
              inteiro fecha nos 45 px dos demais controles. */}
          <div className="flex h-9 items-center gap-1 rounded-xl border border-border/70 bg-secondary/40 p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
              onClick={onAnterior}
              aria-label="Período anterior"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Button>
            <span className="px-1.5 text-[11px] font-medium tabular-nums whitespace-nowrap text-foreground/90">
              {rotuloPeriodo}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
              onClick={onProximo}
              aria-label="Próximo período"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>

          <Button
            variant="outline"
            className="h-9 rounded-lg border-border/70 bg-secondary/40 px-3 text-[11px] font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-secondary/70"
            onClick={onHoje}
          >
            Hoje
          </Button>

          {/* Semana | Mês | Lista — indicador deslizante do Design System.
              Ativo em lime (texto) com o contorno lime do indicador; inativo com
              contraste suficiente (`muted-foreground` → `foreground` no hover)
              e `transition-colors` para a troca não "piscar". */}
          <div className="relative grid h-9 grid-cols-3 rounded-xl border border-border/70 bg-secondary/40 p-1">
            <SlidingIndicator atual={indiceAtivo} total={VISUALIZACOES.length} />
            {VISUALIZACOES.map((item) => {
              const ativo = item.valor === visualizacao;
              return (
                <button
                  key={item.valor}
                  type="button"
                  onClick={() => onVisualizacao(item.valor)}
                  aria-pressed={ativo}
                  className={cn(
                    'relative z-10 h-7 rounded-lg px-2.5 text-[11px] font-medium transition-colors duration-200',
                    ativo ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {item.rotulo}
                </button>
              );
            })}
          </div>

          {podeGerenciar && (
            <>
              {/* AÇÃO PRIMÁRIA — lime sólido, texto escuro, hover luminoso. */}
              <Button
                className="h-9 gap-2 rounded-lg px-3.5 text-[11px] font-semibold shadow-glow-sm transition-all duration-200 hover:shadow-glow"
                onClick={onNovaEscala}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Nova Escala
              </Button>
              {/* AÇÃO SECUNDÁRIA — dark levemente elevado, borda mais visível,
                  texto claro e, no hover, borda lime + glow lime discreto. NÃO
                  é um segundo botão lime: o lime aqui só acende o contorno. */}
              <Button
                variant="outline"
                className="group h-9 gap-2 rounded-lg border-border/80 bg-secondary/50 px-3 text-[11px] font-medium text-foreground shadow-xs transition-all duration-200 hover:border-primary/50 hover:bg-secondary/80 hover:text-foreground hover:shadow-glow"
                onClick={onNovoTurno}
              >
                <Plus
                  className="h-3.5 w-3.5 text-muted-foreground transition-colors duration-200 group-hover:text-primary"
                  aria-hidden
                />
                Novo Turno
              </Button>
            </>
          )}
        </div>
      </motion.header>
    </EntradaPresenca>
  );
}
