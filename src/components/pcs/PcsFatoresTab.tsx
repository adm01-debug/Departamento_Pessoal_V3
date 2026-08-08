import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Trash2, Scale } from 'lucide-react';
import { usePcsFatores } from '@/hooks/usePcs';
import { parseGraus } from '@/types/pcs';

/** Metodologia do plano: fatores, pesos e escala de graus. */
export function PcsFatoresTab({ planoId }: { planoId: string | null }) {
  const { fatores, isLoading, excluir } = usePcsFatores(planoId);

  if (!planoId) return <p className="p-6 text-sm text-muted-foreground">Selecione um plano para ver os fatores.</p>;
  if (isLoading) return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;

  const pontosMax = fatores.reduce((acc, f) => {
    const graus = parseGraus(f.graus);
    const maior = graus.reduce((m, g) => Math.max(m, g.pontos), 0);
    return acc + maior * Number(f.peso ?? 1);
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Scale className="h-4 w-4" />
        Pontuação máxima possível: <strong className="text-foreground">{pontosMax.toLocaleString('pt-BR')}</strong> pontos
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {fatores.map((fator) => {
          const graus = parseGraus(fator.graus);
          return (
            <Card key={fator.id} className="border-border/30 rounded-2xl bg-card/50">
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div>
                  <CardTitle className="text-base">{fator.nome}</CardTitle>
                  {fator.descricao && <p className="mt-1 text-xs text-muted-foreground">{fator.descricao}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">Peso {Number(fator.peso)}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover fator ${fator.nome}`}
                    className="h-8 w-8"
                    onClick={() => excluir.mutate(fator.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {graus.map((g) => (
                  <Badge key={g.grau} className="border-0 bg-muted text-[10px] text-muted-foreground">
                    {g.grau}. {g.rotulo} · {g.pontos}p
                  </Badge>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {fatores.length === 0 && (
        <p className="rounded-2xl border border-border/30 p-6 text-center text-sm text-muted-foreground">
          Nenhum fator cadastrado neste plano.
        </p>
      )}
    </div>
  );
}
