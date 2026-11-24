// Leitura de data dos eventos da Timeline, em UM lugar só: a linha que exibe,
// o filtro de ano e o agrupamento por ano precisam concordar.

/**
 * ISO (`yyyy-MM-dd` ou timestamp completo) → `Date` no fuso LOCAL.
 *
 * Data sem horário é lida como data local (`T00:00:00` sem zona), não como
 * meia-noite UTC: senão um registro de 01/01 apareceria em 31/12 em fuso
 * negativo. Timestamp completo já traz a zona e é lido como está.
 */
export function dataLocalDoEvento(iso: string): Date {
  return new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
}

/**
 * Ano LOCAL do evento — a mesma leitura que a linha da timeline exibe.
 *
 * Usar `iso.slice(0, 4)` divergia perto da virada do ano: em
 * America/Sao_Paulo, `2027-01-01T01:00:00+00:00` é exibido como 31/12/2026,
 * mas a string diz 2027 — selecionar 2026 no filtro esconderia um evento cuja
 * própria linha diz 2026, e o agrupamento o colocaria no ano errado.
 */
export function anoLocalDoEvento(iso: string): string {
  const date = dataLocalDoEvento(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', { year: 'numeric' }).format(date);
}
