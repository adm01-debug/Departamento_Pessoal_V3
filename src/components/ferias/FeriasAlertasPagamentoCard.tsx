/**
 * FeriasAlertasPagamentoCard — painel Art. 145 CLT.
 *
 * Exibe ao RH as férias com risco de descumprimento do prazo legal de
 * pagamento (2 dias antes do início). Cada linha permite confirmar o
 * pagamento com valor e caminho opcional do comprovante — a RPC
 * server-side registra usuário, timestamp e antecedência para trilha
 * probatória.
 */
import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAlertasPagamentoD2,
  useConfirmarPagamentoFerias,
  type AlertaPagamentoD2,
  type SeveridadePagamento,
} from '@/hooks/ferias/useAlertasPagamentoD2';

const severidadeMeta: Record<SeveridadePagamento, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; Icon: typeof AlertTriangle }> = {
  ok: { label: 'OK', variant: 'secondary', Icon: CheckCircle2 },
  atencao: { label: 'Atenção (≤5d)', variant: 'outline', Icon: Clock },
  critico: { label: 'Crítico — Art. 145', variant: 'destructive', Icon: AlertTriangle },
  violacao_grave: { label: 'Violação Grave', variant: 'destructive', Icon: ShieldAlert },
};

export function FeriasAlertasPagamentoCard() {
  const { data, isLoading } = useAlertasPagamentoD2();
  const [alvo, setAlvo] = useState<AlertaPagamentoD2 | null>(null);
  const [valor, setValor] = useState<string>('');
  const [comprovante, setComprovante] = useState<string>('');
  const confirmar = useConfirmarPagamentoFerias();

  const submit = async () => {
    if (!alvo) return;
    const v = Number(valor);
    if (!Number.isFinite(v) || v <= 0) return;
    await confirmar.mutateAsync({
      feriasId: alvo.id,
      valor: v,
      comprovantePath: comprovante || null,
    });
    setAlvo(null);
    setValor('');
    setComprovante('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-destructive" aria-hidden />
          Pagamento de Férias — Art. 145 CLT
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma pendência de pagamento no prazo legal.</p>
        ) : (
          <ul className="divide-y">
            {data.map((row) => {
              const meta = severidadeMeta[row.severidade];
              return (
                <li key={row.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <meta.Icon className="w-4 h-4" aria-hidden />
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                      <span className="text-sm text-muted-foreground">
                        Início {new Date(row.data_inicio).toLocaleDateString('pt-BR')} — {row.dias_ate_inicio} dia(s)
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      Colaborador: {row.colaborador_id}
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setAlvo(row)}>
                    Confirmar pagamento
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={!!alvo} onOpenChange={(open) => !open && setAlvo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar pagamento de férias</DialogTitle>
            <DialogDescription>
              Registra o pagamento com trilha probatória (usuário, timestamp, antecedência).
              Após confirmado, a férias pode entrar em gozo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="valor">Valor pago (R$)</Label>
              <Input
                id="valor" type="number" step="0.01" min="0.01"
                value={valor} onChange={(e) => setValor(e.target.value)}
                placeholder="Ex.: 3540.50"
              />
            </div>
            <div>
              <Label htmlFor="comprovante">Caminho do comprovante (opcional)</Label>
              <Input
                id="comprovante" type="text"
                value={comprovante} onChange={(e) => setComprovante(e.target.value)}
                placeholder="storage://ferias-avisos/..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAlvo(null)}>Cancelar</Button>
            <Button onClick={submit} disabled={confirmar.isPending || !valor}>
              {confirmar.isPending ? 'Confirmando…' : 'Confirmar pagamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
