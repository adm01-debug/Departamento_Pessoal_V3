// Mapeia os RAISE da RPC pagar_desligamento para HTTP. As mensagens de
// regra de negócio (check_violation) são seguras para o usuário; o resto
// vira erro genérico.
export function erroDaRpc(err: { code?: string; message?: string }): { status: number; code: string; message: string } {
  switch (err.code) {
    case '23514': // check_violation — homologação/assinaturas pendentes
      return { status: 409, code: 'PAGAMENTO_BLOQUEADO', message: err.message ?? 'Pagamento bloqueado' };
    case 'P0002':
      return { status: 404, code: 'NOT_FOUND', message: 'Desligamento não encontrado' };
    case '42501':
      return { status: 403, code: 'FORBIDDEN', message: 'Sem permissão para registrar pagamento de rescisão' };
    default:
      return { status: 500, code: 'INTERNAL_SERVER_ERROR', message: 'Erro interno' };
  }
}
