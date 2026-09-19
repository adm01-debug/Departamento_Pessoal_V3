import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useVinculosColaborador } from '@/hooks/useVinculos';
import { format } from 'date-fns';

function formatData(data?: string | null) {
  if (!data) return '—';
  const [y, m, d] = data.split('-').map(Number);
  if (!y || !m || !d) return data;
  return format(new Date(y, m - 1, d), 'dd/MM/yyyy');
}

// Histórico de Vínculos — cada linha é uma passagem real registrada em
// `vinculos` (nunca inventa período: só mostra o que a tabela tem). Cargo/
// departamento/tipo de contrato por período NÃO são gravados em `vinculos`
// hoje — por isso só exibimos tipo/categoria/matrícula quando presentes.
export function HistoricoVinculosCard({ colaboradorId }: { colaboradorId: string }) {
  const { data: vinculos, isLoading } = useVinculosColaborador(colaboradorId);

  if (isLoading) {
    return (
      <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
        <CardContent className="p-6 flex justify-center"><Spinner /></CardContent>
      </Card>
    );
  }

  const lista = vinculos || [];
  if (lista.length === 0) return null;

  // Numeração cronológica (1ª = mais antiga), exibição do mais recente pro mais antigo.
  const cronologica = [...lista].sort((a, b) => String(a.data_inicio).localeCompare(String(b.data_inicio)));
  const numeroPorId = new Map(cronologica.map((v, i) => [v.id, i + 1]));
  const exibicao = [...lista].sort((a, b) => String(b.data_inicio).localeCompare(String(a.data_inicio)));

  return (
    <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
      <CardContent className="p-6 space-y-4">
        <p className="text-sm font-medium">Histórico de Vínculos</p>
        <div className="space-y-3">
          {exibicao.map((v) => (
            <div key={v.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/20">
              <div>
                <p className="text-sm font-medium">
                  {formatData(v.data_inicio)} — {v.data_fim ? formatData(v.data_fim) : 'atual'}
                </p>
                {(v.tipo || v.categoria || v.matricula) && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {[v.tipo, v.categoria, v.matricula ? `Matrícula ${v.matricula}` : null].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {numeroPorId.get(v.id)}ª passagem
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
