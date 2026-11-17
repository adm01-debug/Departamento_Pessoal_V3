/**
 * Contrato visual da JORNADA DE ONBOARDING (rota `/onboarding`): rótulos dos
 * marcos, paleta do avatar e tints dos micro status.
 *
 * Mesma separação de `admissoesComum.ts`: aqui só mora o que é APRESENTAÇÃO
 * (texto de marco, classe de cor, tint de prazo). A matemática fica em
 * `onboardingDerivacoes.ts`. Quem consome: o card, o detalhe e a página da
 * Jornada (que lê `MARCOS_ONBOARDING` para montar o filtro de etapa) — mudar um
 * valor aqui não afeta o Dashboard, o Kanban nem os modais de admissão.
 *
 * COR: nenhuma cor nova. A régua horizontal e a barra de progresso usam o
 * `--primary` (o lime da identidade); o verde de "concluído" é o `--success`; o
 * vermelho de atraso é o `--destructive-vivid` (o `--destructive` do tema some
 * no navy). Esse token NÃO está declarado em `tailwind.config.js`, então aqui
 * ele é escrito como valor arbitrário (`text-[hsl(var(--destructive-vivid))]`);
 * a forma curta `text-destructive-vivid` não gera CSS nenhum. Azul e violeta do
 * avatar saem de `--info`/`--chart-4`, já usados no Assistente IA.
 */
import type { TomPrazo } from './onboardingDerivacoes';

/** Marcos da jornada de integração (a régua horizontal do card). */
export const MARCOS_ONBOARDING = ['Pré-onboarding', '1º dia', '1ª semana', '30 dias'] as const;

/**
 * Paleta determinística do avatar de iniciais. Só tints translúcidos + tinta
 * vibrante, no mesmo padrão dos chips da área (tint a 15% + tinta cheia).
 */
export const PALETA_AVATAR = [
  'bg-primary/15 text-primary',
  'bg-info/15 text-info',
  'bg-[hsl(var(--chart-4)/0.15)] text-[hsl(var(--chart-4))]',
  'bg-[hsl(var(--chart-2)/0.15)] text-[hsl(var(--chart-2))]',
  'bg-warning/15 text-warning',
] as const;

/**
 * Cor do avatar a partir do nome: hash simples e estável — o MESMO colaborador
 * recebe sempre a MESMA cor, sem depender da ordem da lista (um filtro que
 * reordena não deve repintar os avatares).
 */
export function corAvatar(nome?: string | null): string {
  const texto = (nome ?? '').trim();
  let soma = 0;
  for (let i = 0; i < texto.length; i += 1) soma = (soma + texto.charCodeAt(i) * (i + 1)) % 9973;
  return PALETA_AVATAR[soma % PALETA_AVATAR.length];
}

/** Tinta do rótulo de prazo por tom (`TomPrazo`). */
export const TOM_PRAZO: Record<TomPrazo, string> = {
  atraso: 'text-[hsl(var(--destructive-vivid))]',
  hoje: 'text-warning',
  proximo: 'text-info',
  neutro: 'text-muted-foreground',
};

/** Fundo do selo de prazo por tom (véu translúcido curto). */
export const TOM_PRAZO_VEU: Record<TomPrazo, string> = {
  atraso: 'bg-[hsl(var(--destructive-vivid)/0.1)]',
  hoje: 'bg-warning/10',
  proximo: 'bg-info/10',
  neutro: 'bg-muted/40',
};
