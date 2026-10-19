/**
 * ============================================================================
 * HUB DE PREMIAÇÕES — PAINEL GERENCIAL DE AUDITORIA & ROI v1.2.
 *
 * Implementação PRESERVADA, realocada: este painel nasceu dentro da aba
 * Pagamentos (como uma `<Card>` solta no fim do `TabsContent`) e agora mora na
 * aba AUDITORIA, que é o lugar dele — junto da trilha de auditoria. Nada foi
 * reescrito: mesmos três filtros (períodos/unidades/metas), mesmos botões de
 * exportação (CSV/PDF, via `onExportar` → `premiacoesService.exportarRelatorio`),
 * mesma tabela consolidada sobre os pagamentos reais (colaborador, campanha,
 * valor aprovado, folha real, status/conciliação e o atalho de histórico).
 *
 * POR QUE UM COMPONENTE (e não o JSX solto na página): o painel era o único
 * bloco de ~110 linhas preso a um `TabsContent`. Extrair mantém a implementação
 * ÚNICA (sem duplicar marcadores em duas abas) e permite que a aba Pagamentos
 * fique exclusivamente com a nova arquitetura aprovada.
 *
 * OS FILTROS SÃO CONTROLADOS PELA PÁGINA: o mesmo estado alimenta a exportação
 * (`handleExport`) também usada pela tabela de Campanhas — comportamento
 * idêntico ao de antes, sem estado novo.
 * ============================================================================
 */
import { Download, FileText, Filter, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/utils/format';
import type { PagamentoHub } from './premiacoesComum';

interface PainelAuditoriaRoiProps {
  pagamentos: PagamentoHub[];
  periodoFiltro: string;
  unidadeFiltro: string;
  faixaMetaFiltro: string;
  onPeriodoFiltroChange: (valor: string) => void;
  onUnidadeFiltroChange: (valor: string) => void;
  onFaixaMetaFiltroChange: (valor: string) => void;
  /** Exportação real (CSV/PDF) — o mesmo `handleExport` do módulo. */
  onExportar: (formato: 'csv' | 'pdf') => void;
}

export function PainelAuditoriaRoi({
  pagamentos,
  periodoFiltro,
  unidadeFiltro,
  faixaMetaFiltro,
  onPeriodoFiltroChange,
  onUnidadeFiltroChange,
  onFaixaMetaFiltroChange,
  onExportar,
}: PainelAuditoriaRoiProps) {
  return (
    <Card className="border-border/30 rounded-2xl overflow-hidden shadow-xs">
      <CardHeader className="bg-muted/30 border-b border-border/10 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Painel Gerencial de Auditoria & ROI v1.2
            </CardTitle>
            <CardDescription className="text-[10px] uppercase tracking-widest mt-1">Dados consolidados com snapshot de metas e conciliação</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-background border border-border/50 rounded-xl px-3 py-1.5">
              <Filter className="h-3 w-3 text-muted-foreground" />
              <select
                aria-label="Filtrar por período"
                className="bg-transparent text-[10px] font-medium outline-hidden border-none"
                value={periodoFiltro}
                onChange={(e) => onPeriodoFiltroChange(e.target.value)}
              >
                <option>Todos os Períodos</option>
                <option>Maio 2026</option>
                <option>Abril 2026</option>
              </select>
            </div>
            <div className="flex items-center gap-2 bg-background border border-border/50 rounded-xl px-3 py-1.5">
              <select
                aria-label="Filtrar por unidade"
                className="bg-transparent text-[10px] font-medium outline-hidden border-none"
                value={unidadeFiltro}
                onChange={(e) => onUnidadeFiltroChange(e.target.value)}
              >
                <option>Todas as Unidades</option>
                <option>Matriz</option>
                <option>Filial Sul</option>
              </select>
            </div>
            <div className="flex items-center gap-2 bg-background border border-border/50 rounded-xl px-3 py-1.5">
              <select
                aria-label="Filtrar por faixa de meta"
                className="bg-transparent text-[10px] font-medium outline-hidden border-none"
                value={faixaMetaFiltro}
                onChange={(e) => onFaixaMetaFiltroChange(e.target.value)}
              >
                <option>Todas as Metas</option>
                <option>Meta {'>'} 100%</option>
                <option>Meta {'>'} 120%</option>
              </select>
            </div>
            <Button variant="outline" size="sm" className="h-9 text-[10px] font-medium uppercase rounded-xl" onClick={() => onExportar('csv')}>
              <Download className="mr-1 h-3 w-3" /> CSV
            </Button>
            <Button variant="outline" size="sm" className="h-9 text-[10px] font-medium uppercase rounded-xl" onClick={() => onExportar('pdf')}>
              <FileText className="mr-1 h-3 w-3" /> PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/10 border-b border-border/5">
                <th className="text-left p-4 font-medium text-[10px] uppercase text-muted-foreground tracking-widest">Colaborador</th>
                <th className="text-left p-4 font-medium text-[10px] uppercase text-muted-foreground tracking-widest">Campanha</th>
                <th className="text-left p-4 font-medium text-[10px] uppercase text-muted-foreground tracking-widest">Valor Aprovado</th>
                <th className="text-left p-4 font-medium text-[10px] uppercase text-muted-foreground tracking-widest">Folha Real</th>
                <th className="text-left p-4 font-medium text-[10px] uppercase text-muted-foreground tracking-widest">Status / Justificativa</th>
                <th className="text-right p-4 font-medium text-[10px] uppercase text-muted-foreground tracking-widest">Auditoria</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/5">
              {pagamentos.map((p) => (
                <tr key={p.id} className="hover:bg-accent/5 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs">{p.colaborador?.nome_completo}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline" className="text-[9px] font-medium border-border/50">{p.campanha?.nome}</Badge>
                  </td>
                  <td className="p-4 font-mono font-medium text-xs">
                    {formatCurrency(Number(p.valor_aprovado || p.valor_calculado || 0))}
                  </td>
                  <td className="p-4 font-mono font-medium text-xs text-muted-foreground">
                    {p.valor_folha_real ? formatCurrency(Number(p.valor_folha_real)) : '—'}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <Badge className={`text-[9px] font-medium uppercase px-2 py-0.5 rounded-full w-fit ${
                        p.status_conciliacao === 'conciliado' ? 'bg-success/10 text-success' :
                        p.status_conciliacao === 'divergente' ? 'bg-amber-500/10 text-amber-500' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {p.status_conciliacao || 'pendente'}
                      </Badge>
                      {p.justificativa_divergencia && (
                        <span className="text-[9px] text-muted-foreground italic truncate max-w-[150px]" title={p.justificativa_divergencia}>
                          "{p.justificativa_divergencia}"
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <Button variant="ghost" size="icon" aria-label="Histórico" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                      <History className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
