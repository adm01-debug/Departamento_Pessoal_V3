/**
 * Aliases ergonômicos para linhas do banco.
 *
 * Objetivo: eliminar `useState<any>` em componentes que armazenam registros
 * do Supabase, restaurando type-safety sem exigir refatoração de cada consumo.
 *
 * Uso:
 *   const [selecionado, setSelecionado] = useState<Row<'admissoes'> | null>(null);
 *   const [linhas, setLinhas] = useState<Row<'colaboradores'>[]>([]);
 *
 * Fallback conservador quando o shape é genuinamente dinâmico
 * (ex.: agregação, JSON opaco):
 *   const [payload, setPayload] = useState<UnknownRecord | null>(null);
 */
import type { Database } from '@/integrations/supabase/types';

export type TableName = keyof Database['public']['Tables'];

/** Linha (SELECT) de uma tabela do schema `public`. */
export type Row<T extends TableName> = Database['public']['Tables'][T]['Row'];

/** Payload de INSERT de uma tabela do schema `public`. */
export type Insert<T extends TableName> = Database['public']['Tables'][T]['Insert'];

/** Payload de UPDATE de uma tabela do schema `public`. */
export type Update<T extends TableName> = Database['public']['Tables'][T]['Update'];

/**
 * Registro de shape dinâmico. Preferível a `any` porque força o consumidor
 * a fazer narrowing explícito (`if ('foo' in x)` ou cast `as Row<'x'>`)
 * antes de ler propriedades — impede o típico `obj.foo.bar` que quebra
 * silenciosamente quando a API responde em outro formato.
 */
export type UnknownRecord = Record<string, unknown>;

/**
 * Variante permissiva de `Row<T>` para casos onde:
 *   - O SELECT no Supabase é parcial (`.select('id, nome_completo')`)
 *   - A query inclui joins com aliases não modelados no schema gerado
 *     (ex.: `candidato:candidatos(*)`).
 *
 * Preserva autocomplete dos campos conhecidos mas aceita chaves extras.
 * Use quando `Row<T>` estrito quebrar consumidores legítimos — não como
 * atalho para evitar tipar corretamente.
 */
export type LooseRow<T extends TableName> = Partial<Row<T>> & Record<string, unknown>;

