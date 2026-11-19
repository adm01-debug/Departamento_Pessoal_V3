import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Calendar, Clock, MessageSquare, Video, Phone, MapPin, CheckCircle2, History } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CandidatoTimelineProps {
  candidaturaId: string;
}

export function CandidatoTimeline({ candidaturaId }: CandidatoTimelineProps) {
  const { data: timeline, isLoading } = useQuery({
    queryKey: ['candidato-timeline', candidaturaId],
    queryFn: async () => {
      const [entrevistas, testes, anotacoes] = await Promise.all([
        supabase
          .from('recrutamento_entrevistas')
          .select('*')
          .eq('candidatura_id', candidaturaId)
          .order('created_at', { ascending: false }),
        supabase
          .from('recrutamento_testes')
          .select('*')
          .eq('candidatura_id', candidaturaId)
          .order('created_at', { ascending: false }),
        supabase
          .from('recrutamento_anotacoes')
          .select('*')
          .eq('candidatura_id', candidaturaId)
          .order('created_at', { ascending: false }),
      ]);

      const items = [
        ...(entrevistas.data || []).map((i) => ({ ...i, type: 'entrevista' as const })),
        ...(testes.data || []).map((i) => ({ ...i, type: 'teste' as const })),
        ...(anotacoes.data || []).map((i) => ({ ...i, type: 'anotacao' as const })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return items;
    },
    enabled: !!candidaturaId,
  });

  if (isLoading)
    return (
      <div className="p-8 flex justify-center">
        <Spinner />
      </div>
    );

  const temEventos = (timeline?.length ?? 0) > 0;

  return (
    <section aria-label="Histórico do processo" className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="inline-flex min-w-0 items-center gap-2 font-display text-[13px] font-semibold leading-none text-foreground">
          <History className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          Histórico do processo
        </h3>
        <span className="shrink-0 rounded-full border border-border/40 bg-muted/30 px-2 py-0.5 text-[10px] font-medium leading-none tabular-nums text-muted-foreground">
          {temEventos ? timeline!.length : 0} {temEventos && timeline!.length === 1 ? 'registro' : 'registros'}
        </span>
      </div>
      <div
        className={cn(
          'space-y-6 relative',
          temEventos && 'before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-muted'
        )}
      >
        {temEventos ? (
          (timeline ?? []).map((item) => (
            <div key={item.id} className="relative pl-10">
              <div
                className={cn(
                  'absolute left-0 top-1 w-9 h-9 rounded-full bg-background border-2 flex items-center justify-center z-10 shadow-xs',
                  item.type === 'entrevista'
                    ? 'border-blue-400 text-blue-500'
                    : item.type === 'teste'
                      ? 'border-purple-400 text-purple-500'
                      : 'border-slate-400 text-slate-500'
                )}
              >
                {item.type === 'entrevista' &&
                  (item.tipo === 'remoto' ? (
                    <Video className="h-4 w-4" />
                  ) : item.tipo === 'telefone' ? (
                    <Phone className="h-4 w-4" />
                  ) : (
                    <MapPin className="h-4 w-4" />
                  ))}
                {item.type === 'teste' && <Clock className="h-4 w-4" />}
                {item.type === 'anotacao' && <MessageSquare className="h-4 w-4" />}
              </div>

              <Card className="border-border/40 shadow-xs overflow-hidden bg-card/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {item.type === 'entrevista'
                          ? 'Entrevista'
                          : item.type === 'teste'
                            ? 'Avaliação Técnica'
                            : 'Anotação'}
                      </span>
                      {'status' in item && item.status && (
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[9px] h-4 px-1.5 font-bold uppercase',
                            item.status === 'realizada' || item.status === 'entregue'
                              ? 'bg-success/10 text-success border-success/20'
                              : item.status === 'agendada' || item.status === 'enviado'
                                ? 'bg-blue-50 text-blue-500 border-blue-200'
                                : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {item.status.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(item.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {item.type === 'entrevista' && (
                      <>
                        <p className="text-sm font-semibold">{item.feedback || 'Aguardando realização...'}</p>
                        {/* Só o que o registro traz: sem nota, a linha não existe. */}
                        {item.nota ? (
                          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1 font-bold text-warning">
                              <CheckCircle2 className="h-3 w-3" /> Nota {item.nota}/5
                            </span>
                          </div>
                        ) : null}
                      </>
                    )}

                    {item.type === 'teste' && (
                      <>
                        <p className="text-sm font-semibold">{item.nome_teste}</p>
                        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                          {item.nota && (
                            <span className="flex items-center gap-1 font-bold text-primary">
                              Resultado: {item.nota}
                            </span>
                          )}
                          {item.comentarios && <p className="text-[10px] italic">"{item.comentarios}"</p>}
                        </div>
                      </>
                    )}

                    {item.type === 'anotacao' && (
                      <p className="text-sm italic text-foreground/80 leading-relaxed">"{item.anotacao}"</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))
        ) : (
          <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-border/40 bg-background/30 px-3.5 py-3">
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden />
            <p className="text-[12px] leading-snug text-muted-foreground">
              Inicie o processo para ver o histórico aqui.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
