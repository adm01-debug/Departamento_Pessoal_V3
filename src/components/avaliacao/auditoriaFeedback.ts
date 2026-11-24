/**
 * ============================================================================
 * AUDITORIA — MONTAGEM PURA DO REGISTRO (`auditoriaFeedback`).
 *
 * Prepara o payload que vai para `public.audit_log`, SEM executar nada: este
 * arquivo não importa `supabase` e não grava em lugar nenhum. É a interface que
 * o backend vai usar quando o fluxo de finalização for autorizado.
 *
 * ── POR QUE ASSIM ──────────────────────────────────────────────────────────
 *  • `audit_log` é APPEND-ONLY no banco (trigger bloqueia UPDATE/DELETE), logo
 *    um payload errado é irreversível — por isso ele é montado e validado por
 *    função pura e testado antes de qualquer escrita;
 *  • a escrita NÃO pode ser feita pelo app separadamente do `UPDATE` de status:
 *    precisa ser a MESMA transação no servidor (`exigeBackend: true`), senão
 *    existe a janela em que o status muda e a trilha não;
 *  • `dados_anteriores`/`dados_novos` guardam só os CAMPOS QUE MUDARAM, para a
 *    trilha ficar legível e pequena.
 * ============================================================================
 */

/** Ações aceitas pela coluna `acao` de `audit_log` (CHECK no banco). */
export type AcaoAuditoria = 'INSERT' | 'UPDATE' | 'DELETE';

/** Linha de `audit_log` que a aplicação fornece (o resto é do banco). */
export interface RegistroAuditoria {
  tabela: string;
  registroId: string;
  acao: AcaoAuditoria;
  dadosAnteriores: Record<string, unknown> | null;
  dadosNovos: Record<string, unknown> | null;
  camposAlterados: string[];
  /** Contexto do operador (o backend sobrescreve com o usuário da sessão). */
  usuarioEmail?: string | null;
}

/** Campos que nunca entram na trilha (ruído ou redundância). */
export const CAMPOS_IGNORADOS_AUDITORIA: readonly string[] = ['updated_at'];

/**
 * Diff campo a campo entre dois estados do MESMO registro.
 * Campos listados em `CAMPOS_IGNORADOS_AUDITORIA` ficam de fora.
 */
export function calcularCamposAlterados(
  anteriores: Record<string, unknown> | null,
  novos: Record<string, unknown> | null,
  ignorados: readonly string[] = CAMPOS_IGNORADOS_AUDITORIA
): string[] {
  if (!anteriores || !novos) return [];
  const chaves = Array.from(new Set([...Object.keys(anteriores), ...Object.keys(novos)]));
  return chaves
    .filter((k) => !ignorados.includes(k))
    .filter((k) => JSON.stringify(anteriores[k] ?? null) !== JSON.stringify(novos[k] ?? null))
    .sort();
}

/**
 * Recorta apenas os campos que mudaram — é isso que vai para a trilha.
 */
export function recortarAlterados(
  campo: Record<string, unknown> | null,
  camposAlterados: readonly string[]
): Record<string, unknown> | null {
  if (!campo) return null;
  return camposAlterados.reduce<Record<string, unknown>>((acc, k) => ({ ...acc, [k]: campo[k] ?? null }), {});
}

/**
 * Monta o registro de auditoria de uma mudança de status — POUCO importa se é
 * `UPDATE` de status ou transição de estado: a forma é a mesma.
 *
 * `exigeBackend: true` sempre: a gravação precisa acontecer na MESMA transação
 * do `UPDATE` em `feedbacks_360`, do lado do servidor. O app não grava sozinho.
 */
export function montarRegistroAuditoria({
  registroId,
  anteriores,
  novos,
  usuarioEmail = null,
  tabela = 'feedbacks_360',
}: {
  registroId: string;
  anteriores: Record<string, unknown> | null;
  novos: Record<string, unknown> | null;
  usuarioEmail?: string | null;
  tabela?: string;
}): RegistroAuditoria & { exigeBackend: true } {
  const camposAlterados = calcularCamposAlterados(anteriores, novos);

  return {
    tabela,
    registroId,
    acao: 'UPDATE',
    dadosAnteriores: recortarAlterados(anteriores, camposAlterados),
    dadosNovos: recortarAlterados(novos, camposAlterados),
    camposAlterados,
    usuarioEmail,
    exigeBackend: true,
  };
}

export type ImpedimentoAuditoria =
  'registro_ausente' | 'tabela_ausente' | 'sem_campos_alterados' | 'campos_divergentes';

export interface ResultadoAuditoria {
  valido: boolean;
  impedimentos: ImpedimentoAuditoria[];
}

/**
 * Valida o registro ANTES de qualquer gravação (a tabela é append-only: erro
 * aqui é definitivo).
 */
export function validarRegistroAuditoria(registro: Partial<RegistroAuditoria>): ResultadoAuditoria {
  const impedimentos: ImpedimentoAuditoria[] = [];
  if (!String(registro.registroId ?? '').trim()) impedimentos.push('registro_ausente');
  if (!String(registro.tabela ?? '').trim()) impedimentos.push('tabela_ausente');

  const campos = registro.camposAlterados ?? [];
  if (campos.length === 0) impedimentos.push('sem_campos_alterados');

  // Todo campo declarado como alterado precisa existir no antes OU no depois.
  const divergentes = campos.filter(
    (c) =>
      !(registro.dadosAnteriores && c in registro.dadosAnteriores) && !(registro.dadosNovos && c in registro.dadosNovos)
  );
  if (divergentes.length > 0) impedimentos.push('campos_divergentes');

  return { valido: impedimentos.length === 0, impedimentos };
}
