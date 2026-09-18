import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import {
  useCertificadosColaborador, useTreinamentosColaborador,
  useFeedbacksColaborador, usePDIsColaborador, useMetasColaborador,
  useOnboardingColaborador,
} from '@/hooks';

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

export function DesenvolvimentoResumoTab({ colaboradorId }: { colaboradorId: string }) {
  const { data: certificados, isLoading: isLoadingCert } = useCertificadosColaborador(colaboradorId);
  const { data: treinamentos, isLoading: isLoadingTrein } = useTreinamentosColaborador(colaboradorId);
  const { data: feedbacks, isLoading: isLoadingFeedback } = useFeedbacksColaborador(colaboradorId);
  const { data: pdis, isLoading: isLoadingPDI } = usePDIsColaborador(colaboradorId);
  const { data: metas, isLoading: isLoadingMetas } = useMetasColaborador(colaboradorId);
  const onboarding = useOnboardingColaborador(colaboradorId);

  return (
    <div className="space-y-6">
      <Secao titulo="Onboarding" isLoading={onboarding.isLoading} vazio={!onboarding.onboarding}>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>{onboarding.concluidas.length}/{onboarding.tarefas.length} tarefas concluídas</span>
            <span className="text-muted-foreground">{onboarding.progresso}%</span>
          </div>
          <Progress value={onboarding.progresso ?? 0} />
          {onboarding.atrasadas.length > 0 && (
            <p className="text-xs text-destructive">{onboarding.atrasadas.length} tarefa(s) atrasada(s)</p>
          )}
        </div>
      </Secao>

      <Secao titulo="Treinamentos" isLoading={isLoadingTrein} vazio={!treinamentos?.length}>
        <div className="flex flex-wrap gap-2">
          {(treinamentos as any[] || []).map(t => (
            <Badge key={t.id} variant={t.presente ? 'default' : 'secondary'} className="rounded-full">
              {t.treinamento?.nome ?? 'Treinamento'} {t.presente ? '✓' : '(pendente)'}
            </Badge>
          ))}
        </div>
      </Secao>

      <Secao titulo="Certificados" isLoading={isLoadingCert} vazio={!certificados?.length}>
        <div className="flex flex-wrap gap-2">
          {(certificados as any[] || []).map(c => (
            <Badge key={c.id} variant="outline" className="rounded-full">{c.curso?.nome ?? 'Curso'}</Badge>
          ))}
        </div>
      </Secao>

      <Secao titulo="Avaliação / Feedback 360" isLoading={isLoadingFeedback} vazio={!feedbacks?.length}>
        <div className="space-y-2">
          {(feedbacks as any[] || []).map(f => (
            <div key={f.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/20">
              <span>Ciclo — nota geral: {f.nota_geral ?? '—'}</span>
              <Badge variant="secondary">{f.performance ?? '—'}</Badge>
            </div>
          ))}
        </div>
      </Secao>

      <Secao titulo="PDI — Plano de Desenvolvimento Individual" isLoading={isLoadingPDI} vazio={!pdis?.length}>
        <div className="space-y-2">
          {(pdis as any[] || []).map(p => (
            <div key={p.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/20">
              <span>{p.titulo ?? p.acao_desenvolvimento}</span>
              <Badge variant="outline">{p.status}</Badge>
            </div>
          ))}
        </div>
      </Secao>

      <Secao titulo="Metas / OKRs" isLoading={isLoadingMetas} vazio={!metas?.length}>
        <div className="space-y-2">
          {(metas as any[] || []).map(m => (
            <div key={m.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/20">
              <span>{m.titulo}</span>
              <span className="text-muted-foreground">{m.progresso ?? 0}%</span>
            </div>
          ))}
        </div>
      </Secao>
    </div>
  );
}
