import type { ReactNode } from 'react';

/**
 * Par label/valor empilhado (label em cima, valor embaixo com peso maior)
 * usado nos cards de leitura do dashboard de Dados Pessoais — mesma
 * hierarquia tipográfica do resto da ficha do colaborador.
 *
 * `compact`: fonte menor e sem `truncate` (quebra em várias linhas em vez
 * de cortar com "...") — usado nas caixas estreitas "PCD"/"Estrangeiro" do
 * card combinado, onde o valor precisa ficar sempre visível por inteiro.
 */
export function CampoInfo({ label, valor, compact = false }: { label: string; valor?: ReactNode; compact?: boolean }) {
  const vazio = valor === undefined || valor === null || valor === '';
  return (
    <div className="min-w-0 space-y-0.5">
      <p className={compact ? 'text-[10px] leading-tight text-muted-foreground' : 'text-xs text-muted-foreground'}>{label}</p>
      <p className={`${compact ? 'text-xs leading-snug break-words' : 'text-sm truncate'} ${vazio ? 'text-muted-foreground font-normal' : 'font-semibold'}`}>
        {vazio ? 'Não informado' : valor}
      </p>
    </div>
  );
}
