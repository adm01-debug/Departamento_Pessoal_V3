import { proximaAcaoDesligamento, type DesligamentoLike } from './desligamentosDerivacoes';

const TOM_CLASSE = {
  destructive: 'text-destructive',
  warning: 'text-warning',
  muted: 'text-muted-foreground',
} as const;

/**
 * Mostra a próxima providência do processo e o prazo legal do art. 477 §6º
 * (data do desligamento + 10 dias para pagar as verbas).
 *
 * A conta vem de `proximaAcaoDesligamento`, que já existia em
 * `desligamentosDerivacoes.ts` com teste e NENHUM consumidor: o prazo era
 * calculado e nunca chegava a uma tela. O tom (vermelho/amarelo/neutro) também
 * é decidido lá, para a cor não contar uma história diferente do texto.
 */
export function ProximaAcaoCell({ desligamento, hojeMs }: { desligamento: DesligamentoLike; hojeMs: number }) {
  const { label, prazo, tom } = proximaAcaoDesligamento(desligamento, hojeMs);

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm font-body">{label}</span>
      {prazo ? <span className={`text-xs font-body font-medium ${TOM_CLASSE[tom]}`}>{prazo}</span> : null}
    </div>
  );
}
