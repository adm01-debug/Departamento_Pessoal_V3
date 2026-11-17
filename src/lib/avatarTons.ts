/**
 * ============================================================================
 * PALETA ESTÁVEL DE AVATARES (iniciais)
 *
 * Cor de fundo/texto de quem não tem foto, derivada do NOME (soma dos códigos
 * dos caracteres): a mesma pessoa recebe sempre a mesma cor, em qualquer tela —
 * nada de aleatoriedade entre renderizações. É o padrão de "superfície colorida
 * discreta" do sistema: fundo translúcido (20%) na cor do token e texto na cor
 * cheia do MESMO token, legível sobre o navy.
 *
 * Fica em `lib/` (e não dentro do componente) porque é usado tanto pelo
 * `UserAvatar` quanto por outras representações de pessoa (a pilha de
 * participantes das campanhas) sem quebrar o fast-refresh do React.
 * ============================================================================
 */

export const TONS_AVATAR = [
  'bg-primary/20 text-primary',
  'bg-info/20 text-info',
  'bg-success/20 text-success',
  'bg-xp/20 text-xp',
  'bg-warning/20 text-warning',
] as const;

/** Tom determinístico de um nome (estável entre renderizações e telas). */
export function tomDoAvatar(nome: string): string {
  const hash = nome.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return TONS_AVATAR[hash % TONS_AVATAR.length];
}
