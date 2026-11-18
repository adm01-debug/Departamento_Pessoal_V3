/**
 * Normalização do payload do cadastro de colaborador.
 *
 * POR QUE EXISTE (achado da reauditoria dos descartes, 18/11/2026):
 * `ColaboradorFormPage` enviava o retorno do formulário cru para
 * `colaboradorService`, e nada no caminho (service, `validateTablePayload`,
 * gateway) converte string vazia em `null`. Campo opcional deixado em branco
 * chegava ao banco como `''`.
 *
 * Isso não é só cosmético: `public.colaboradores` tem índice ÚNICO em
 * `matricula` SOZINHA (`colaboradores_matricula_key`) e também em
 * `(empresa_id, matricula)`, ambos SEM cláusula parcial. Com `''`, o PRIMEIRO
 * colaborador salvo sem matrícula ocupa o valor e o SEGUNDO falha com violação
 * de unicidade (23505) — o RH não consegue cadastrar. Com `NULL` não há
 * conflito, porque nulos não colidem em índice único.
 *
 * Conferido em produção em 18/11/2026: 16 colaboradores, 0 com `''` e 4 com
 * `matricula` nula — ou seja, o defeito ainda não tinha sido disparado por esta
 * tela, e passa a não poder ser.
 *
 * A correção vem da branch `muri` (PR #546, fechada sem merge), onde existia
 * como `normalizarPayloadColaborador`. Aqui ela foi reduzida aos campos que o
 * formulário da main realmente tem, e mora em módulo próprio para o
 * `react-refresh/only-export-components` continuar valendo na página.
 */

/**
 * Colunas TEXT **nullable** de `public.colaboradores` que este formulário
 * coleta (conferidas em `information_schema.columns`). Fora da lista de
 * propósito: `cargo`, `departamento` e `nome_mae`, que são NOT NULL no banco, e
 * os campos obrigatórios/enum/numéricos, que nunca chegam vazios.
 */
export const NULLABLE_TEXT_FIELDS = [
  'nome_social',
  'telefone',
  'celular',
  'nome_pai',
  'cep',
  'logradouro',
  'numero',
  'complemento',
  'bairro',
  'cidade',
  'uf',
  'matricula',
  'banco_codigo',
  'agencia',
  'conta',
  'pix_chave',
  'rg',
  'rg_orgao_emissor',
  'pis_pasep',
  'ctps_numero',
  'ctps_serie',
] as const;

export type CampoNormalizado = (typeof NULLABLE_TEXT_FIELDS)[number];

/**
 * Devolve uma CÓPIA do payload com `''` virando `null` nos campos acima.
 * Só mexe em string vazia (inclusive quando o usuário digitou apenas espaços):
 * valor preenchido, `0`, `false` e `undefined` passam intactos.
 */
export function normalizarPayloadColaborador<T extends Record<string, unknown>>(data: T): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...data };
  for (const campo of NULLABLE_TEXT_FIELDS) {
    const valor = payload[campo];
    if (typeof valor === 'string' && valor.trim() === '') payload[campo] = null;
  }
  return payload;
}
