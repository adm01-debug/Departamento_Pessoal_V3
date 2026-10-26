/**
 * ============================================================================
 * PIPELINE — IDENTIDADE VISUAL DAS CINCO ETAPAS
 *
 * Espelha o contrato de tons do Kanban de Admissão (`admissoes/kanbanComum.ts`):
 * a cor NUNCA pinta bloco cheio — ela aparece no chip do ícone da coluna, no
 * fundo radial/vertical do painel inteiro, no véu dos pills e no ícone do bloco
 * contextual. O fundo da coluna e do card continuam escuros.
 *
 * POR QUE UM ARQUIVO PRÓPRIO (e não importar `TOM_KANBAN`): Admissão não tem a
 * etapa "Proposta" no tom magenta (`--chart-5`); seus tons vivem no módulo dela.
 * Aqui cada etapa do recrutamento publica o SEU tom, com as mesmas classes e a
 * mesma fórmula de superfície — a linguagem visual é compartilhada, o contrato
 * de negócio não.
 * ============================================================================
 */
import type { EtapaPipelineId } from './pipelineEtapas';

export interface TomPipeline {
  /** Chip do ícone da coluna / avatar do card (tinta translúcida). */
  chip: string;
  /** Tinta pura — ícone do bloco contextual da etapa. */
  tinta: string;
  /** `background-image` do painel inteiro (brilho no topo + gradiente vertical). */
  fundo: string;
  /** Borda de identidade da coluna. */
  borda: string;
  /** Borda de acento no hover do card. */
  bordaHover: string;
  /** Véu translúcido — pills/avatars na cor da etapa. */
  veu: string;
}

/** Mesma fórmula de `superficieDaEtapa` do Kanban de Admissão. */
function superficieDaEtapa(variavel: string): string {
  return [
    `radial-gradient(130% 60% at 50% -10%, hsl(var(${variavel}) / 0.15), transparent 68%)`,
    `linear-gradient(180deg, hsl(var(${variavel}) / 0.08) 0%, hsl(var(${variavel}) / 0.03) 48%, hsl(var(${variavel}) / 0.01) 100%)`,
  ].join(', ');
}

export const TONS_PIPELINE: Record<EtapaPipelineId, TomPipeline> = {
  // Azul — `--info`.
  triagem: {
    chip: 'bg-info/12 text-info',
    tinta: 'text-info',
    fundo: superficieDaEtapa('--info'),
    borda: 'border-info/20',
    bordaHover: 'hover:border-info/45',
    veu: 'bg-info/12 text-info',
  },
  // Roxo — `--chart-4` (mesmo tom de "Exame" na Admissão).
  entrevista: {
    chip: 'bg-[hsl(var(--chart-4)/0.14)] text-[hsl(var(--chart-4))]',
    tinta: 'text-[hsl(var(--chart-4))]',
    fundo: superficieDaEtapa('--chart-4'),
    borda: 'border-[hsl(var(--chart-4)/0.22)]',
    bordaHover: 'hover:border-[hsl(var(--chart-4)/0.5)]',
    veu: 'bg-[hsl(var(--chart-4)/0.14)] text-[hsl(var(--chart-4))]',
  },
  // Âmbar — `--warning`.
  teste: {
    chip: 'bg-warning/12 text-warning',
    tinta: 'text-warning',
    fundo: superficieDaEtapa('--warning'),
    borda: 'border-warning/20',
    bordaHover: 'hover:border-warning/45',
    veu: 'bg-warning/12 text-warning',
  },
  // Rosa/magenta — `--chart-5`.
  proposta: {
    chip: 'bg-[hsl(var(--chart-5)/0.14)] text-[hsl(var(--chart-5))]',
    tinta: 'text-[hsl(var(--chart-5))]',
    fundo: superficieDaEtapa('--chart-5'),
    borda: 'border-[hsl(var(--chart-5)/0.22)]',
    bordaHover: 'hover:border-[hsl(var(--chart-5)/0.5)]',
    veu: 'bg-[hsl(var(--chart-5)/0.14)] text-[hsl(var(--chart-5))]',
  },
  // Verde — `--success`.
  contratado: {
    chip: 'bg-success/12 text-success',
    tinta: 'text-success',
    fundo: superficieDaEtapa('--success'),
    borda: 'border-success/20',
    bordaHover: 'hover:border-success/45',
    veu: 'bg-success/12 text-success',
  },
};

/** Rótulo do bloco contextual — um por etapa, como no Kanban de Admissão. */
export const ROTULO_CONTEXTO: Record<EtapaPipelineId, string> = {
  triagem: 'Próxima ação',
  entrevista: 'Entrevista',
  teste: 'Teste técnico',
  proposta: 'Proposta',
  contratado: 'Conclusão',
};
