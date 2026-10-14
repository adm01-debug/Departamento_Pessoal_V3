/**
 * ============================================================================
 * ⚠️ MOCK VISUAL DE PROGRESSO — PDI ⚠️  (TEMPORÁRIO)
 *
 * Este arquivo existe SOMENTE para avaliar como ficam as barrinhas de progresso
 * COLORIDAS dentro dos cards da aba PDI, antes de decidir a regra real.
 *
 * ── O QUE ESTE ARQUIVO NÃO FAZ ──────────────────────────────────────────────
 *  • não lê nem escreve nada no Supabase (nenhuma query, nenhuma mutation);
 *  • não cria migration, coluna, tabela nem regra de negócio;
 *  • não altera `PROGRESSO_PDI_DISPONIVEL` (que continua `false`: a tabela
 *    `pdi_plano_desenvolvimento` segue SEM progresso real);
 *  • não persiste nada: os valores vivem em memória, por render.
 *
 * ── COMO REMOVER (2 passos, nenhum toque em dado) ───────────────────────────
 *  1. apague este arquivo;
 *  2. em `PdiCard.tsx`, apague o import de `getMockPdiProgress` e o bloco
 *     marcado com "TEMPORÁRIO — MOCK VISUAL DE PROGRESSO" (o card volta sozinho
 *     para "Progresso não acompanhado", que é o estado honesto de hoje).
 * Nada mais no sistema depende deste arquivo.
 *
 * ── VALORES ────────────────────────────────────────────────────────────────
 * Tabela por TÍTULO do PDI (comparação normalizada: caixa, acentos e espaços
 * não importam). Título fora da tabela devolve `null` → o card volta à leitura
 * honesta, SEM número inventado em registro real.
 *
 * ── CORES ──────────────────────────────────────────────────────────────────
 * As três faixas usam EXATAMENTE os degradês já aprovados no módulo
 * (`desempenhoComum.gradienteProgresso` / `gradienteProgresso` → `BarraProgresso`),
 * apenas com os cortes pedidos para este teste (40 / 80):
 *   • 0–39 %  → âmbar   (`from-warning/60 to-warning`)
 *   • 40–79 % → lima    (`from-primary/70 to-primary`)
 *   • 80–100% → verde   (`from-success to-primary`)
 * Quando a regra real for definida, a fonte única volta a ser
 * `gradienteProgresso` — este mapa sai junto com o arquivo.
 * ============================================================================
 */

import type { PdiDerivado } from './pdiComum';

/** Interruptor único: `false` desliga o mock sem apagar nada. */
export const MOCK_PROGRESSO_PDI_ATIVO = true;

/** O que `getMockPdiProgress` devolve quando encontra o título. */
export interface ProgressoMock {
  /** 0–100, só para a barra. */
  percent: number;
  /** Texto principal (ex.: "75% concluído"). */
  label: string;
  /** Classes do PREENCHIMENTO da barra (degradê do módulo). */
  tone: string;
  /** Tinta do número ao lado da barra. */
  tinta: string;
  /** Texto secundário — deixa explícito que o valor é simulado. */
  hint: string;
}

/** Percentuais pedidos para a avaliação visual, por título do PDI. */
const PERCENTUAIS: Record<string, number> = {
  'certificacao tecnica': 100,
  'reciclagem em rotinas administrativas': 40,
  'comunicacao executiva de dados': 65,
  'trilha de arquitetura frontend': 75,
  'lideranca de projetos': 25,
};

/** Normaliza título para comparação (minúsculas, sem acento, espaços colapsados). */
function chave(titulo: unknown): string {
  return String(titulo ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Faixa de cor do percentual — cortes 40/80 (pedido deste teste). */
function faixa(percent: number): Pick<ProgressoMock, 'tone' | 'tinta'> {
  if (percent >= 80) return { tone: 'bg-gradient-to-r from-success to-primary', tinta: 'text-success' };
  if (percent >= 40) return { tone: 'bg-gradient-to-r from-primary/70 to-primary', tinta: 'text-primary' };
  return { tone: 'bg-gradient-to-r from-warning/60 to-warning', tinta: 'text-warning' };
}

/**
 * Progresso SIMULADO do card. `null` quando o mock está desligado ou o título
 * não está na tabela — nos dois casos o card volta ao estado honesto.
 */
export function getMockPdiProgress(pdi: PdiDerivado | null | undefined): ProgressoMock | null {
  if (!MOCK_PROGRESSO_PDI_ATIVO) return null;
  const percent = PERCENTUAIS[chave(pdi?.titulo)];
  if (percent === undefined) return null;

  return {
    percent,
    label: `${percent}% concluído`,
    // Secundário coerente com a faixa: em 100% "andamento" não faz sentido.
    hint: percent >= 80 ? 'conclusão simulada' : 'andamento simulado',
    ...faixa(percent),
  };
}
