/**
 * `UiRecord` — registro genérico usado por estados de UI que guardam uma linha
 * de banco selecionada (drawer/dialog de detalhes) antes de existir um tipo
 * gerado específico para a query.
 *
 * Por que `any` no valor: as linhas vêm de selects dinâmicos (com joins e
 * aliases) cujo shape não é conhecido em tempo de compilação. Usar `unknown`
 * obrigaria um cast em cada leitura no JSX, sem ganho real de segurança —
 * a validação de fato acontece no banco (RLS) e nos schemas Zod.
 *
 * Regra: NÃO usar `UiRecord` em serviços, payloads de escrita ou cálculos.
 * Apenas em estado local de apresentação.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UiRecord = Record<string, any>;
