/**
 * ============================================================================
 * CONSTANTES E CHAVES DE QUOTA — fonte única para geração manual e automática
 * ============================================================================
 * Mudar um limite aqui reflete nos dois caminhos (Edge Function de geração e
 * worker da fila), evitando divergência de contrato.
 * ============================================================================
 */

export const JANELA_QUOTA_SEG = 60 * 60;
export const LIMITE_EMPRESA_PADRAO = 20;
export const LIMITE_USUARIO_PADRAO = 5;

/** Janela de recuperação de trabalho em andamento (imagem/queue). */
export const STALE_AFTER_MS = 10 * 60 * 1000;

/**
 * Janela usada pelo worker para considerar um item de fila abandonado.
 * Maior que o wall clock máximo da plataforma (400 s) + timeout do provedor
 * (90 s): evita recuperar trabalho que ainda está efetivamente rodando.
 */
export const STALE_FILA_MINUTOS = 30;

export function chaveEmpresa(empresaId: string): string {
  return `training-image-generate:empresa:${empresaId}`;
}

export function chaveUsuario(usuarioId: string): string {
  return `training-image-generate:usuario:${usuarioId}`;
}

export function envNumero(nome: string, padrao: number): number {
  const valor = Number(Deno.env.get(nome));
  return Number.isFinite(valor) && valor > 0 ? valor : padrao;
}
