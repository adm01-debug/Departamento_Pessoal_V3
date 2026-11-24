import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useEpisEntregasColaborador } from '@/hooks';
import { useIncidentesColaborador, useCatColaborador, useRiscosColaborador } from '@/hooks/useSSTColaborador';

function Secao({ titulo, isLoading, vazio, children }: { titulo: string; isLoading: boolean; vazio: boolean; children: React.ReactNode }) {
  return (
    <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
      <CardContent className="p-6 space-y-3">
        <p className="text-sm font-medium">{titulo}</p>
        {isLoading ? <Spinner /> : vazio ? (
          <p className="text-sm text-muted-foreground">Nenhum registro encontrado.</p>
        ) : children}
      </CardContent>
    </Card>
  );
}

// PARTE H/20: só status/data/tipo — nunca CID, descrição narrativa, laudo
// médico ou detalhe de acidente, mesmo sem checagem de permissão hoje.
export function SSTResumoTab({ colaboradorId }: { colaboradorId: string }) {
  const { data: episEntregas, isLoading: isLoadingEpis } = useEpisEntregasColaborador(colaboradorId);
  const { data: incidentes, isLoading: isLoadingIncidentes } = useIncidentesColaborador(colaboradorId);
  const { data: cats, isLoading: isLoadingCat } = useCatColaborador(colaboradorId);
  const { data: riscos, isLoading: isLoadingRiscos } = useRiscosColaborador(colaboradorId);

  const episAtivos = (episEntregas as any[] || []).filter(e => !e.data_devolucao);

  return (
    <div className="space-y-6">
      <Secao titulo="EPIs Entregues" isLoading={isLoadingEpis} vazio={!episEntregas?.length}>
        <div className="flex flex-wrap gap-2">
          {(episEntregas as any[] || []).map(e => (
            <Badge key={e.id} variant={e.data_devolucao ? 'secondary' : 'default'} className="rounded-full">
              {e.epi?.nome ?? 'EPI'} {e.data_devolucao ? '(devolvido)' : '(ativo)'}
            </Badge>
          ))}
        </div>
        {episAtivos.length > 0 && <p className="text-xs text-muted-foreground">{episAtivos.length} EPI(s) ativo(s) hoje.</p>}
      </Secao>

      <Secao titulo="Riscos Ocupacionais" isLoading={isLoadingRiscos} vazio={!riscos?.length}>
        <div className="space-y-2">
          {(riscos as any[] || []).map(r => (
            <div key={r.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/20">
              <span>Agente: {r.agente_nocivo_codigo ?? '—'}</span>
              <Badge variant={r.epi_eficaz ? 'default' : 'destructive'}>{r.epi_eficaz ? 'EPI eficaz' : 'EPI não eficaz'}</Badge>
            </div>
          ))}
        </div>
      </Secao>

      <Secao titulo="Incidentes Registrados" isLoading={isLoadingIncidentes} vazio={!incidentes?.length}>
        <div className="space-y-2">
          {(incidentes as any[] || []).map(i => (
            <div key={i.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/20">
              <span>{i.tipo} — {i.data_hora}</span>
              <Badge variant="outline">{i.status}</Badge>
            </div>
          ))}
        </div>
      </Secao>

      <Secao titulo="CAT — Comunicação de Acidente de Trabalho" isLoading={isLoadingCat} vazio={!cats?.length}>
        <div className="space-y-2">
          {(cats as any[] || []).map(c => (
            <div key={c.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/20">
              <span>{c.tipo_acidente} — {c.data_acidente}</span>
              <Badge variant="outline">{c.status_esocial ?? 'pendente eSocial'}</Badge>
            </div>
          ))}
        </div>
      </Secao>
    </div>
  );
}
