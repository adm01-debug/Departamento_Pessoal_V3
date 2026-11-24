import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Spinner } from '@/components/ui/spinner';
import { CalendarClock, FileCode2, History, Link2, MessageSquare, type LucideIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
// MOCK VISUAL — ver src/mocks/recrutamentoMock.ts.
import { getMockTimeline } from '@/mocks/recrutamentoMock';

/**
 * ============================================================================
 * HISTÓRICO DO PROCESSO SELETIVO — a área principal do dossiê do candidato
 *
 * Duas colunas por evento: o EIXO TEMPORAL à esquerda (data compacta + hora) e
 * o CARTÃO do evento à direita, ocupando toda a largura útil do modal. É o
 * desenho aprovado para a janela de detalhes; a leitura dos dados é a MESMA de
 * antes (entrevistas, testes e anotações mesclados e ordenados do mais recente
 * para o mais antigo), com o mock demonstrativo tendo prioridade.
 *
 * Nada é inventado: cada linha mostra somente o que o registro traz. Sem
 * `feedback`/`comentarios`/`anotacao`, o cartão fica com o tipo e o status; sem
 * `nota`, não aparece resultado; sem vínculo de usuário resolvido, não aparece
 * "responsável". A contagem do cabeçalho é derivada da própria lista.
 *
 * O componente é o MESMO usado pela página (não há uma segunda timeline): a
 * janela de detalhes apenas o posiciona dentro da faixa de conteúdo.
 * ============================================================================
 */

interface CandidatoTimelineProps {
  candidaturaId: string;
  className?: string;
}

/** Formato mínimo de um evento — o `select('*')` devolve os campos originais. */
interface EventoTimeline {
  id: string;
  created_at: string;
  type: 'entrevista' | 'teste' | 'anotacao' | string;
  status?: string | null;
  nota?: number | null;
  feedback?: string | null;
  anotacao?: string | null;
  nome_teste?: string | null;
  comentarios?: string | null;
  tipo?: string | null;
  local_link?: string | null;
  url_teste?: string | null;
}

/** Rótulo, ícone e tinta de cada tipo de ocorrência — só tokens do sistema. */
const META_EVENTO: Record<string, { rotulo: string; icone: LucideIcon; tinta: string }> = {
  entrevista: { rotulo: 'Entrevista', icone: CalendarClock, tinta: 'text-info' },
  teste: { rotulo: 'Avaliação Técnica', icone: FileCode2, tinta: 'text-[hsl(var(--chart-4))]' },
  anotacao: { rotulo: 'Anotação', icone: MessageSquare, tinta: 'text-muted-foreground' },
};

/** Tinta do selo de status — mesmos tokens usados no restante do sistema. */
function tomDoStatus(status: string): string {
  if (status === 'realizada' || status === 'entregue') return 'border-success/25 bg-success/10 text-success';
  if (status === 'agendada' || status === 'enviado') return 'border-info/25 bg-info/10 text-info';
  return 'border-border/40 bg-muted/30 text-muted-foreground';
}

/** Número no padrão pt-BR (`4,5`), sem alterar inteiros (`8`). */
function numeroPtBr(valor: number): string {
  return String(valor).replace('.', ',');
}

/** Número válido ou `null` (nada é exibido quando a nota não existe). */
function notaValida(nota: number | null | undefined): number | null {
  if (nota === null || nota === undefined) return null;
  const numero = Number(nota);
  return Number.isFinite(numero) ? numero : null;
}

function texto(valor: string | null | undefined): string | null {
  const limpo = (valor ?? '').trim();
  return limpo ? limpo : null;
}

/** Linha de apoio do cartão (link do encontro / entrega do teste), se existir. */
function LinhaLink({ texto: href }: { texto: string }) {
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1 text-[10.5px] text-muted-foreground">
      <Link2 className="h-3 w-3 shrink-0" aria-hidden />
      <span className="truncate" title={href}>
        {href}
      </span>
    </span>
  );
}

export function CandidatoTimeline({ candidaturaId, className }: CandidatoTimelineProps) {
  const { data: timeline, isLoading } = useQuery<EventoTimeline[]>({
    queryKey: ['candidato-timeline', candidaturaId],
    queryFn: async (): Promise<EventoTimeline[]> => {
      // MOCK VISUAL — ver src/mocks/recrutamentoMock.ts.
      const mock = getMockTimeline(candidaturaId);
      if (mock) return mock as EventoTimeline[];
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
        ...(entrevistas.data || []).map((i) => ({ ...i, type: 'entrevista' })),
        ...(testes.data || []).map((i) => ({ ...i, type: 'teste' })),
        ...(anotacoes.data || []).map((i) => ({ ...i, type: 'anotacao' })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return items as EventoTimeline[];
    },
    enabled: !!candidaturaId,
  });

  const registros = timeline?.length ?? 0;

  return (
    <section aria-label="Histórico do processo" className={cn('min-w-0', className)}>
      {/* CABEÇALHO DA SEÇÃO — título + contagem DERIVADA dos eventos carregados. */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="inline-flex min-w-0 items-center gap-2 font-display text-[13px] font-semibold leading-none text-foreground">
          <History className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          Histórico do processo
        </h3>
        {!isLoading && (
          <span className="shrink-0 rounded-full border border-border/40 bg-muted/30 px-2 py-0.5 text-[10px] font-medium leading-none tabular-nums text-muted-foreground">
            {registros} {registros === 1 ? 'registro' : 'registros'}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 rounded-xl border border-border/30 bg-background/40 px-3.5 py-3 text-[12px] text-muted-foreground">
          <Spinner size="sm" />
          Carregando histórico...
        </div>
      ) : registros === 0 ? (
        /* ESTADO VAZIO COMPACTO — uma faixa, não uma área em branco. */
        <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-border/40 bg-background/30 px-3.5 py-3">
          <History className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden />
          <p className="text-[12px] leading-snug text-muted-foreground">
            Inicie o processo para ver o histórico aqui.
          </p>
        </div>
      ) : (
        <ol className="space-y-2.5">
          {(timeline ?? []).map((item) => {
            const meta = META_EVENTO[item.type] ?? META_EVENTO.anotacao;
            const Icone = meta.icone;
            const data = new Date(item.created_at);
            const status = texto(item.status);
            const descricao =
              item.type === 'anotacao'
                ? texto(item.anotacao)
                : item.type === 'teste'
                  ? texto(item.comentarios)
                  : texto(item.feedback);
            const nota = notaValida(item.nota);
            const link = item.type === 'teste' ? texto(item.url_teste) : texto(item.local_link);

            return (
              <li
                key={item.id}
                className="grid grid-cols-[52px_minmax(0,1fr)] items-start gap-2.5 sm:grid-cols-[68px_minmax(0,1fr)] sm:gap-3.5"
              >
                {/* EIXO TEMPORAL — data em cima, hora embaixo; largura fixa e curta. */}
                <time dateTime={item.created_at} className="select-none pt-0.5 text-left tabular-nums">
                  <span className="block whitespace-nowrap text-[11px] font-semibold uppercase leading-tight tracking-wide text-foreground/80">
                    {format(data, 'dd MMM', { locale: ptBR })}
                  </span>
                  <span className="mt-0.5 block whitespace-nowrap text-[10.5px] leading-tight text-muted-foreground">
                    {format(data, 'HH:mm', { locale: ptBR })}
                  </span>
                </time>

                {/* CARTÃO DO EVENTO — ocupa toda a largura restante. */}
                <div className="min-w-0 rounded-xl border border-border/40 bg-background/50 px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.25)] sm:rounded-2xl sm:px-3.5 sm:py-3">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={cn('inline-flex min-w-0 items-center gap-1.5', meta.tinta)}>
                      <Icone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="truncate text-[10px] font-semibold uppercase tracking-widest">
                        {meta.rotulo}
                      </span>
                    </span>
                    {status && (
                      <span
                        className={cn(
                          'inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase leading-none',
                          tomDoStatus(status)
                        )}
                      >
                        {status.replace('_', ' ')}
                      </span>
                    )}
                    {nota !== null && (
                      <span className="ml-auto shrink-0 text-[10.5px] font-semibold tabular-nums text-warning">
                        {item.type === 'teste' ? `Resultado: ${numeroPtBr(nota)}` : `Nota ${numeroPtBr(nota)}/5`}
                      </span>
                    )}
                  </div>

                  {item.type === 'teste' && texto(item.nome_teste) && (
                    <p className="mt-1.5 text-[12.5px] font-medium leading-snug text-foreground">
                      {texto(item.nome_teste)}
                    </p>
                  )}

                  {descricao && (
                    <p
                      className={cn(
                        'mt-1 text-[12px] leading-relaxed text-foreground/80',
                        item.type === 'anotacao' && 'italic'
                      )}
                    >
                      {descricao}
                    </p>
                  )}

                  {link && (
                    <div className="mt-1.5">
                      <LinhaLink texto={link} />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
