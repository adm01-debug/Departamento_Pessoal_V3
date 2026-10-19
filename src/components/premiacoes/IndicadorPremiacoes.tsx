/**
 * ============================================================================
 * HUB DE PREMIAÇÕES — BLOCO DE INDICADOR (KPI Card do módulo).
 *
 * Extraído de `PremiacoesPage` para ser a FONTE ÚNICA do padrão dimensional dos
 * indicadores do hub: a aba Campanhas (5 indicadores) e a aba Pagamentos (4
 * indicadores financeiros) desenham o MESMO cartão — nenhuma cópia, nenhum
 * indicador com altura/padding diferente entre abas.
 *
 * Padrão (especificação §6), alinhado aos KPI Cards de Desligamentos
 * (`dashboard/MetricCard`, variante `dense`):
 *  · cartão com padding `p-3`, `gap-2.5` entre o ícone e o bloco de informações,
 *    contêiner de ícone 36×36 à ESQUERDA;
 *  · pilha de texto com 4px entre as linhas (título 11px · valor 24px com
 *    `leading-6`, a MESMA linha de 24px do `text-data` · complemento 10px);
 *  · título longo trunca (`truncate`) em vez de empurrar o valor para baixo;
 *  · `destaque` pinta o CARD INTEIRO com a tinta vermelho-escura translúcida
 *    (gradiente discreto) — é o que marca o indicador crítico (divergências);
 *  · a ENTRADA é a MESMA linguagem dos KPI Cards do Dashboard Executivo
 *    (`entradaCard`) com a cadência própria do hub (`premiacoesEntrada.ts`).
 * ============================================================================
 */
import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { entradaCard } from './premiacoesEntrada';

export interface IndicadorProps {
  titulo: string;
  valor: string;
  icone: LucideIcon;
  /** Classes do contêiner do ícone (tom semântico do indicador). */
  caixa: string;
  /** Texto secundário (sempre derivado de dados reais). */
  rodape?: React.ReactNode;
  rodapeClasse?: string;
  destaque?: boolean;
  /** Índice na cascata de entrada do grupo dos KPIs (ver `premiacoesComum`). */
  indice?: number;
}

export function Indicador({
  titulo,
  valor,
  icone: Icone,
  caixa,
  rodape,
  rodapeClasse,
  destaque,
  indice = 0,
}: IndicadorProps) {
  return (
    <motion.div
      {...entradaCard(indice)}
      className={cn(
        'flex min-w-0 items-center gap-2.5 rounded-[14px] border p-3',
        destaque
          ? // Alerta (§6.4): o CARD INTEIRO recebe a tinta vermelho-escura
            // TRANSLÚCIDA (não só a borda) — gradiente discreto no lugar do fundo
            // neutro e contorno de baixo contraste, como na referência.
            // `--destructive` é o token de perigo do tema (no noturno ele já é o
            // vermelho profundo), então o tom acompanha claro/escuro sozinho.
            'border-destructive/30 bg-gradient-to-br from-destructive/25 to-destructive/[0.15]'
          : 'border-border/50 bg-gradient-to-b from-card to-card/60',
      )}
    >
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', caixa)}>
        <Icone className="h-[18px] w-[18px]" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-[11px] font-medium leading-[17px] text-muted-foreground" title={titulo}>
          {titulo}
        </p>
        <p className="text-[24px] font-semibold leading-6 tracking-tight text-foreground">{valor}</p>
        {rodape && (
          // Linha de apoio com a MESMA estrutura do `MetricCard` de Desligamentos
          // (wrapper flex + span de 10px), o que reproduz também a altura exata da
          // linha e mantém todos os cards idênticos ao padrão de referência.
          <div className="flex min-w-0 flex-wrap items-center">
            <span className={cn('text-pretty text-[10px] font-normal', rodapeClasse ?? 'text-muted-foreground')}>
              {rodape}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
