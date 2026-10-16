/**
 * ============================================================================
 * HUB DE PREMIAÇÕES — DETALHE DA CAMPANHA (somente leitura).
 *
 * Destino real do botão principal de cada linha da tabela ("Ver campanha",
 * "Ver resultados", "Revisar campanha"): abre um diálogo com os dados da
 * campanha e a lista dos SEUS pagamentos — só o que a tela já carregou, sem
 * consulta nova, sem rota nova e sem formulário de escrita.
 *
 * O rodapé leva à aba Pagamentos, que é onde as aprovações e a conciliação
 * acontecem de verdade (`RewardsApprovalHub`).
 * ============================================================================
 */
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowRight, CalendarDays, DollarSign, Target, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/utils/format';
import {
  APARENCIA_CONCILIACAO,
  ROTULO_APROVACAO,
  ROTULO_STATUS_PAGAMENTO,
  aparenciaStatus,
  numero,
  type MetricasCampanha,
  type PagamentoHub,
} from './premiacoesComum';

interface CampanhaDetalhesDialogProps {
  linha: MetricasCampanha | null;
  /** Pagamentos já carregados pela página (os da campanha são filtrados aqui). */
  pagamentos: PagamentoHub[];
  onClose: () => void;
  onVerPagamentos: () => void;
}

/** Percentual no padrão pt-BR com uma casa. */
function percentual(valor: number | null): string {
  if (valor === null) return '—';
  return `${valor.toFixed(1).replace('.', ',')}%`;
}

/** Bloco rótulo/valor do resumo (ícone + título + conteúdo). */
function Bloco({
  icone: Icone,
  label,
  children,
}: {
  icone: typeof Target;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border/40 bg-muted/10 p-2.5">
      <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icone className="h-3 w-3" /> {label}
      </span>
      {children}
    </div>
  );
}

export function CampanhaDetalhesDialog({ linha, pagamentos, onClose, onVerPagamentos }: CampanhaDetalhesDialogProps) {
  const daCampanha = linha ? pagamentos.filter((p) => p.campanha_id === linha.campanha.id) : [];
  const aparencia = aparenciaStatus(linha?.campanha.status);

  return (
    <Dialog open={Boolean(linha)} onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[720px]">
        {linha && (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
                {linha.campanha.nome}
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
                    aparencia.badge,
                  )}
                >
                  {aparencia.label}
                </span>
                {linha.campanha.status_aprovacao && (
                  <span className="text-[10px] font-normal text-muted-foreground">
                    Aprovação: {ROTULO_APROVACAO[linha.campanha.status_aprovacao] ?? linha.campanha.status_aprovacao}
                  </span>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {linha.campanha.descricao || 'Sem descrição cadastrada'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-2 sm:grid-cols-2">
              <Bloco icone={CalendarDays} label="Período">
                <span className="text-xs font-medium tabular-nums">
                  {formatDate(linha.campanha.data_inicio)} – {formatDate(linha.campanha.data_fim)}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {linha.situacaoTemporal === 'encerrada'
                    ? 'Encerrada'
                    : linha.diasRestantes === null
                      ? 'Sem contagem disponível'
                      : linha.situacaoTemporal === 'vigente'
                        ? `${linha.diasRestantes} dias restantes`
                        : `Inicia em ${linha.diasRestantes} dias`}
                </span>
              </Bloco>

              <Bloco icone={DollarSign} label="Orçamento">
                <span className="text-xs font-medium">
                  {linha.orcamentoIndisponivel
                    ? 'Não cadastrado'
                    : `${formatCurrency(linha.valorComprometido)} de ${formatCurrency(linha.orcamentoTotal)}`}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {linha.pctOrcamento === null ? 'Sem percentual' : `${percentual(linha.pctOrcamento)} utilizado`}
                </span>
              </Bloco>

              <Bloco icone={Target} label="Desempenho (liquidação do cálculo)">
                <span className="text-xs font-medium">
                  {linha.pctAprovado === null ? '—' : `${percentual(linha.pctAprovado)} aprovado`}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatCurrency(linha.valorAprovado)} / {formatCurrency(linha.valorCalculado)}
                </span>
              </Bloco>

              <Bloco icone={Users} label="Participantes">
                <span className="text-xs font-medium">{linha.participantes.total}</span>
                <span className="text-[10px] text-muted-foreground">
                  {linha.participantes.total === 0
                    ? 'Sem pagamentos lançados'
                    : `${linha.pagamentosPendentes} pendentes · ${linha.divergencias} divergentes`}
                </span>
              </Bloco>
            </div>

            {/* Pagamentos já carregados pela página — somente leitura. */}
            <div className="overflow-hidden rounded-lg border border-border/40">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/20 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-semibold">Colaborador</th>
                    <th className="px-3 py-2 font-semibold">Valor</th>
                    <th className="px-3 py-2 font-semibold">Estágio</th>
                    <th className="px-3 py-2 font-semibold">Conciliação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/25">
                  {daCampanha.map((p) => (
                    <tr key={p.id}>
                      <td className="px-3 py-2">{p.colaborador?.nome_completo ?? '—'}</td>
                      <td className="px-3 py-2 tabular-nums">
                        {formatCurrency(numero(p.valor_aprovado) || numero(p.valor_calculado))}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {ROTULO_STATUS_PAGAMENTO[p.status] ?? p.status}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
                            APARENCIA_CONCILIACAO[p.status_conciliacao ?? 'pendente'] ?? APARENCIA_CONCILIACAO.pendente,
                          )}
                        >
                          {p.status_conciliacao ?? 'pendente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {daCampanha.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                        Nenhum pagamento lançado nesta campanha.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" className="rounded-xl" onClick={onClose}>
                Fechar
              </Button>
              <Button className="gap-2 rounded-xl" onClick={onVerPagamentos}>
                Aprovar e conciliar na aba Pagamentos <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
