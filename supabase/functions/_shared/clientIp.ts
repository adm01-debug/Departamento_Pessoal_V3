// Extração spoof-resistant do IP do cliente para rate limiting e auditoria.
//
// Em Supabase Edge Functions o gateway da plataforma ANEXA o IP do peer TCP
// como ÚLTIMO elemento de `x-forwarded-for`. O cliente pode injetar entradas
// arbitrárias no header — elas aparecem à ESQUERDA. Por isso:
//   - NUNCA confiar no primeiro elemento (x-forwarded-for[0]) — é forjável.
//   - NUNCA confiar em `cf-connecting-ip`/`x-real-ip` enviados pelo cliente —
//     só seriam confiáveis se a CDN/proxy respectivo os setasse; aqui quem
//     termina a TLS é o gateway do Supabase, e o cliente pode enviar esses
//     headers com qualquer valor.
//   - O último elemento de `x-forwarded-for` é o que a plataforma anexou —
//     o peer real, não falsificável via header.
//
// Sem `x-forwarded-for` não há IP confiável: retorna 'unknown' (bucket
// compartilhado no rate limit — fail-closed, não bypass).

/**
 * IP do cliente conforme visto pelo gateway da plataforma (rightmost de XFF).
 * Use para chaves de rate limit e campos de auditoria (ip_address,
 * ip_assinatura). NUNCA use `body.ipAddress` nem headers spoofable como
 * fonte primária.
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (!xff) return 'unknown';
  const last = xff.split(',').pop()?.trim();
  return last && last.length > 0 ? last : 'unknown';
}
