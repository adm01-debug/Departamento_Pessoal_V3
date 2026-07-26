/**
 * P1-017: RPC error details no log do bridge
 *
 * PostgREST retorna erro de RPC com:
 *   error.message   → já logado
 *   error.details   → hint de índice, constraint, foreign key (NÃO retornar ao cliente)
 *   error.hint      → sugestões de correção
 *
 * Cenário de falha:
 *   - Função RPC com parâmetro inválido → PostgREST retorna 400 + details/hint
 *   - Sem logging, debugging é cego
 *   - details/hint podem conter nomes de colunas internas → sanitizar antes de log
 */

const error = rpcError;

// 1. Message (sempre logado — já existe)
console.error('[bridge] RPC_ERROR:', error.message);

// 2. Details + Hint — loga NO SERVIDOR, NUNCA retorna ao cliente
if (error.details) {
  // Sanitizar: remover eventuais valores de dados sensíveis
  const sanitized = String(error.details)
    .replace(/\b\d{11}\b/g, '***CPF***')          // CPF
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '***EMAIL***'); // email

  console.error('[bridge] RPC details:', sanitized);
  logger.info('[bridge] RPC_error_details', {
    rpc:        rpcName,
    userId:     user?.id,
    details:    sanitized,
    hint:       error.hint ?? null,
    statusCode: statusCode,
  });
}

if (error.hint) {
  console.error('[bridge] RPC hint:', error.hint);
}
