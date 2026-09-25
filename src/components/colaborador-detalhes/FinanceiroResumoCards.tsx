import type { ComponentType, ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet, Gift, BarChart3, FileText, DollarSign, Download, MoreHorizontal,
  CheckCircle2, AlertTriangle, Info, Lightbulb, ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { useBeneficiosColaborador } from '@/hooks/useBeneficiosColaborador';
import { useHoleritesColaborador } from '@/hooks';
import { useContasBancarias } from '@/hooks/useTabelasReferencia';
import { formatCurrency } from '@/utils/format';
import { gerarPDFHolerite } from '@/utils/holeritePDF';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Colaborador } from '@/types/entities';

const MotionCard = motion.create(Card);

const MES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** Converte competência `YYYY-MM` em rótulo curto `Ago/2026` — mesmo critério
 * de abreviação de mês já usado em "Próximos Eventos" (ColaboradorDetalhesPage),
 * aplicado aqui a partir da string ISO vinda de `folhas_pagamento.competencia`. */
function formatCompetenciaAbrev(competencia?: string | null): string | undefined {
  if (!competencia) return undefined;
  const m = /^(\d{4})-(\d{2})/.exec(competencia);
  if (!m) return competencia;
  const idx = Number(m[2]) - 1;
  if (idx < 0 || idx > 11) return competencia;
  return `${MES_ABREV[idx]}/${m[1]}`;
}

interface BeneficioVinculo { id: string; valor: number | null; desconto: number | null; status_vinculo: string | null; }
interface HoleriteLite {
  id: string; competencia: string; total_liquido: number | null; total_proventos: number | null;
  total_descontos: number | null; assinado: boolean | null;
  colaborador_nome?: string | null; colaborador_cpf?: string | null; colaborador_cargo?: string | null;
  salario_base?: number | null; valor_inss?: number | null; valor_irrf?: number | null; valor_fgts?: number | null;
}
interface ContaBancariaLite { id: string; principal?: boolean; }

/** Agrega os 3 recortes de dado já usados nas abas Contas/Benefícios/Holerites
 * (mesmas query keys — o React Query dedupa a busca, nenhuma chamada extra à
 * rede) para alimentar o resumo cross-aba: KPIs, "Resumo da remuneração",
 * preview de holerites e "Pendências e alertas". */
function useFinanceiroAgregado(colaboradorId: string) {
  const { beneficios, isLoading: isLoadingBeneficios } = useBeneficiosColaborador(colaboradorId);
  const { data: holeritesData, isLoading: isLoadingHolerites } = useHoleritesColaborador(colaboradorId);
  const { data: contasData, isLoading: isLoadingContas } = useContasBancarias(colaboradorId);

  const listaBeneficios = (beneficios ?? []) as BeneficioVinculo[];
  const beneficiosAtivos = listaBeneficios.filter((b) => b.status_vinculo === 'ativo');
  const beneficiosComDesconto = beneficiosAtivos.filter((b) => Number(b.desconto) > 0);
  const valorTotalBeneficios = beneficiosAtivos.reduce((s, b) => s + Number(b.valor || 0), 0);
  const descontoTotalBeneficios = beneficiosAtivos.reduce((s, b) => s + Number(b.desconto || 0), 0);

  const holerites = (holeritesData ?? []) as HoleriteLite[];
  const ultimoHolerite = holerites[0];

  const contas = (contasData ?? []) as ContaBancariaLite[];
  const principalCount = contas.filter((c) => c.principal).length;

  return {
    isLoading: isLoadingBeneficios || isLoadingHolerites || isLoadingContas,
    listaBeneficios, beneficiosAtivos, beneficiosComDesconto, valorTotalBeneficios, descontoTotalBeneficios,
    holerites, ultimoHolerite,
    principalCount,
  };
}

/** Um dos 4 cards da faixa de resumo no topo — mesma linguagem visual do
 * indicador de resumo já usado em TrabalhoHierarquiaTab/FeriasResumoTab
 * (ícone circular + rótulo/valor/complemento), aqui compacto o bastante para
 * não sobrar espaço vazio (FASE 7 do redesign). */
function KpiCard({
  index, icon: Icon, iconClassName, titulo, valor, sub,
}: {
  index: number;
  icon: ComponentType<{ className?: string }>;
  iconClassName: string;
  titulo: string;
  valor: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <MotionCard custom={index} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl shadow-elevated h-full">
      <CardContent className="px-3.5 py-3 h-full flex items-center gap-2.5">
        <div className={cn('h-11 w-11 rounded-full flex items-center justify-center shrink-0', iconClassName)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs leading-none text-muted-foreground truncate">{titulo}</p>
          <div className="text-lg font-semibold leading-tight truncate mt-1 flex items-center gap-1.5">{valor}</div>
          {sub && <div className="text-xs leading-none text-muted-foreground mt-1 truncate">{sub}</div>}
        </div>
      </CardContent>
    </MotionCard>
  );
}

/** Faixa de 4 KPIs no topo da área "Financeiro & Benefícios" — visível
 * independente da sub-aba selecionada (Contas/Benefícios/Holerites), já que
 * resume as 3 ao mesmo tempo. Nenhum valor é inventado: tudo vem das mesmas
 * queries usadas nas abas de detalhe. */
export function FinanceiroKpiRow({ colaboradorId, colaborador }: { colaboradorId: string; colaborador?: Colaborador | null }) {
  const {
    isLoading, beneficiosAtivos, beneficiosComDesconto, valorTotalBeneficios, descontoTotalBeneficios, ultimoHolerite,
  } = useFinanceiroAgregado(colaboradorId);

  if (isLoading) return <div className="flex items-center justify-center h-20"><Spinner /></div>;

  const competencia = formatCompetenciaAbrev(ultimoHolerite?.competencia);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
      <KpiCard
        index={0}
        icon={Wallet}
        iconClassName="bg-primary/10 text-primary"
        titulo="Salário base"
        valor={colaborador?.salario_base != null ? formatCurrency(colaborador.salario_base) : '—'}
      />
      <KpiCard
        index={1}
        icon={Gift}
        iconClassName="bg-info/10 text-info"
        titulo="Benefícios ativos"
        valor={beneficiosAtivos.length}
        sub={beneficiosComDesconto.length > 0
          ? `${beneficiosComDesconto.length} com desconto`
          : (beneficiosAtivos.length > 0 ? 'Nenhum com desconto' : undefined)}
      />
      <KpiCard
        index={2}
        icon={BarChart3}
        iconClassName="bg-success/10 text-success"
        titulo="Valor total dos benefícios"
        valor={`${formatCurrency(valorTotalBeneficios)} / mês`}
        sub={descontoTotalBeneficios > 0 ? `${formatCurrency(descontoTotalBeneficios)} de desconto` : undefined}
      />
      <KpiCard
        index={3}
        icon={FileText}
        iconClassName="bg-warning/10 text-warning"
        titulo="Último holerite"
        valor={ultimoHolerite ? (
          <>
            <span className="truncate">{competencia}</span>
            <Badge variant={ultimoHolerite.assinado ? 'default' : 'secondary'} size="sm" className="shrink-0">
              {ultimoHolerite.assinado ? 'Assinado' : 'Pendente'}
            </Badge>
          </>
        ) : 'Nenhum holerite'}
        sub={ultimoHolerite ? `${formatCurrency(ultimoHolerite.total_liquido)} líquido` : undefined}
      />
    </div>
  );
}

function LinhaResumo({ label, valor, destaque }: { label: string; valor: ReactNode; destaque?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border/20 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('text-sm text-right', destaque ? 'font-semibold text-success' : 'font-medium')}>{valor}</span>
    </div>
  );
}

/** Card compacto emparelhado com "Dados bancários" (coluna menor da 2ª
 * fileira) — só os 4 valores que já existem nos dados do colaborador,
 * benefícios ativos e holerite mais recente. */
export function ResumoRemuneracaoCard({ colaboradorId, colaborador }: { colaboradorId: string; colaborador?: Colaborador | null }) {
  const { isLoading, valorTotalBeneficios, descontoTotalBeneficios, ultimoHolerite } = useFinanceiroAgregado(colaboradorId);
  const competencia = formatCompetenciaAbrev(ultimoHolerite?.competencia);

  return (
    <MotionCard custom={5} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl shadow-elevated">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 font-display font-medium text-sm mb-1">
          <BarChart3 className="h-5 w-5 text-primary" /> Resumo da remuneração
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-4"><Spinner /></div>
        ) : (
          <div>
            <LinhaResumo label="Salário base" valor={colaborador?.salario_base != null ? formatCurrency(colaborador.salario_base) : '—'} />
            <LinhaResumo label="Benefícios (valor bruto)" valor={formatCurrency(valorTotalBeneficios)} />
            <LinhaResumo label="Descontos de benefícios" valor={formatCurrency(descontoTotalBeneficios)} />
            <LinhaResumo
              label={competencia ? `Último salário líquido (${competencia})` : 'Último salário líquido'}
              valor={ultimoHolerite ? formatCurrency(ultimoHolerite.total_liquido) : '—'}
              destaque
            />
          </div>
        )}
      </CardContent>
    </MotionCard>
  );
}

/** Baixa o PDF do holerite (mesma geração usada em HoleritesPage) a partir
 * dos campos já trazidos por listarHoleritesColaborador — sem chamada extra
 * à rede, os dados vêm da própria linha do holerite. */
function baixarHoleritePDF(h: HoleriteLite) {
  try {
    const bruto = Number(h.total_proventos ?? 0);
    const liquido = Number(h.total_liquido ?? 0);
    const descontos = h.total_descontos != null ? Number(h.total_descontos) : Math.max(0, bruto - liquido);
    gerarPDFHolerite({
      colaborador_nome: h.colaborador_nome || 'N/A',
      colaborador_cpf: h.colaborador_cpf || 'N/A',
      colaborador_cargo: h.colaborador_cargo || 'N/A',
      competencia: formatCompetenciaAbrev(h.competencia) ?? h.competencia,
      salario_base: Number(h.salario_base ?? 0),
      total_proventos: bruto,
      total_descontos: descontos,
      liquido,
      inss: Number(h.valor_inss ?? 0),
      irrf: Number(h.valor_irrf ?? 0),
      fgts: Number(h.valor_fgts ?? 0),
    });
    toast.success('Holerite gerado com sucesso!');
  } catch {
    toast.error('Erro ao gerar PDF do holerite.');
  }
}

function HoleriteLinhaPreview({ h, onVerDetalhes }: { h: HoleriteLite; onVerDetalhes?: () => void }) {
  const bruto = Number(h.total_proventos ?? 0);
  const liquido = Number(h.total_liquido ?? 0);
  const descontos = h.total_descontos != null ? Number(h.total_descontos) : Math.max(0, bruto - liquido);
  return (
    <TableRow className="hover:bg-background/70 transition-colors">
      <TableCell className="px-3 py-2.5 text-[11px] font-medium">{formatCompetenciaAbrev(h.competencia) ?? h.competencia}</TableCell>
      <TableCell className="px-3 py-2.5 text-[11px] text-center">{formatCurrency(bruto)}</TableCell>
      <TableCell className="px-3 py-2.5 text-[11px] text-destructive text-center">{formatCurrency(descontos)}</TableCell>
      <TableCell className="px-3 py-2.5 text-[11px] text-success font-semibold text-center">{formatCurrency(liquido)}</TableCell>
      <TableCell className="px-3 py-2.5 text-center">
        <Badge variant={h.assinado ? 'success' : 'destructive'} size="sm" className="text-[9px] px-1.5 py-0 h-3.5">
          {h.assinado ? 'Assinado' : 'Pendente'}
        </Badge>
      </TableCell>
      <TableCell className="px-3 py-2.5">
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost" size="icon" className="h-5 w-5 rounded-lg"
            aria-label="Baixar holerite" title="Baixar PDF"
            onClick={() => baixarHoleritePDF(h)}
          >
            <Download className="h-2.5 w-2.5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-5 w-5 rounded-lg" aria-label="Mais ações">
                <MoreHorizontal className="h-2.5 w-2.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="cursor-pointer" onClick={() => baixarHoleritePDF(h)}>
                <Download className="h-3.5 w-3.5 mr-2" /> Baixar PDF
              </DropdownMenuItem>
              {onVerDetalhes && (
                <DropdownMenuItem className="cursor-pointer" onClick={onVerDetalhes}>
                  <FileText className="h-3.5 w-3.5 mr-2" /> Ver detalhes
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}

/** Card compacto emparelhado com "Benefícios" (coluna menor da 3ª fileira) —
 * prévia dos últimos holerites, com atalho pra sub-aba "Holerites" completa. */
export function HoleritesPreviewCard({ colaboradorId, onVerTodos }: { colaboradorId: string; onVerTodos?: () => void }) {
  const { isLoading, holerites } = useFinanceiroAgregado(colaboradorId);
  const recentes = holerites.slice(0, 6);

  return (
    <MotionCard custom={6} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl shadow-elevated">
      <CardContent className="p-3 flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 font-display font-medium text-sm">
            <DollarSign className="h-5 w-5 text-primary" /> Holerites recentes
          </div>
          {onVerTodos && recentes.length > 0 && (
            <button
              type="button"
              onClick={onVerTodos}
              className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline shrink-0"
            >
              Ver todos <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-4"><Spinner /></div>
        ) : !recentes.length ? (
          <p className="text-sm text-muted-foreground">Nenhum holerite encontrado.</p>
        ) : (
          <div className="max-h-[240px] -mx-1 overflow-x-auto overflow-y-scroll">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-6 px-3 text-[10px]">Competência</TableHead>
                  <TableHead className="h-6 px-3 text-[10px] text-center">Bruto</TableHead>
                  <TableHead className="h-6 px-3 text-[10px] text-center">Descontos</TableHead>
                  <TableHead className="h-6 px-3 text-[10px] text-center">Líquido</TableHead>
                  <TableHead className="h-6 px-3 text-[10px] text-center">Status</TableHead>
                  <TableHead className="h-6 px-3 text-[10px] text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentes.map((h) => <HoleriteLinhaPreview key={h.id} h={h} onVerDetalhes={onVerTodos} />)}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </MotionCard>
  );
}

interface ItemPendencia {
  icon: ComponentType<{ className?: string }>;
  titulo: string;
  sub: string;
  tone: 'success' | 'warning' | 'destructive' | 'info';
}

const TONE_CLASSES: Record<ItemPendencia['tone'], string> = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  info: 'bg-info/10 text-info',
};

function ItemPendenciaCard({ item }: { item: ItemPendencia }) {
  const Icon = item.icon;
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border/30 bg-background/70 p-3 min-w-0">
      <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0', TONE_CLASSES[item.tone])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium">{item.titulo}</p>
        <p className="text-xs text-muted-foreground">{item.sub}</p>
      </div>
    </div>
  );
}

/** Card full-width no rodapé da área "Financeiro & Benefícios" — reorganiza
 * sinais que já existiam (alerta de conta principal da ContasBancariasTab,
 * status ativo/inativo dos benefícios, assinatura do holerite mais recente)
 * num só lugar; não introduz nenhuma regra de pendência nova. */
export function FinanceiroPendenciasCard({ colaboradorId }: { colaboradorId: string }) {
  const {
    isLoading, principalCount, listaBeneficios, beneficiosAtivos, ultimoHolerite,
  } = useFinanceiroAgregado(colaboradorId);

  if (isLoading) return null;

  const itens: ItemPendencia[] = [];

  itens.push(
    principalCount === 0
      ? { icon: AlertTriangle, titulo: 'Dados bancários', sub: 'Nenhuma conta principal definida', tone: 'warning' }
      : principalCount > 1
        ? { icon: AlertTriangle, titulo: 'Dados bancários', sub: 'Mais de uma conta principal', tone: 'destructive' }
        : { icon: CheckCircle2, titulo: 'Dados bancários', sub: 'Tudo certo', tone: 'success' }
  );

  itens.push(
    listaBeneficios.length === 0
      ? { icon: Info, titulo: 'Benefícios', sub: 'Nenhum benefício vinculado', tone: 'info' }
      : beneficiosAtivos.length === listaBeneficios.length
        ? { icon: CheckCircle2, titulo: 'Benefícios', sub: 'Todos ativos', tone: 'success' }
        : { icon: AlertTriangle, titulo: 'Benefícios', sub: `${listaBeneficios.length - beneficiosAtivos.length} inativo(s)`, tone: 'warning' }
  );

  const competenciaHolerite = formatCompetenciaAbrev(ultimoHolerite?.competencia);
  itens.push(
    !ultimoHolerite
      ? { icon: Info, titulo: 'Holerites', sub: 'Nenhum holerite emitido', tone: 'info' }
      : ultimoHolerite.assinado
        ? { icon: CheckCircle2, titulo: `Holerite de ${competenciaHolerite}`, sub: 'Assinado', tone: 'success' }
        : { icon: AlertTriangle, titulo: `Holerite de ${competenciaHolerite}`, sub: 'Pendente de assinatura', tone: 'warning' }
  );

  const semPendencias = itens.every((i) => i.tone === 'success');
  itens.push(
    semPendencias
      ? { icon: Info, titulo: 'Nenhuma pendência financeira', sub: 'Situação regular', tone: 'info' }
      : { icon: AlertTriangle, titulo: 'Atenção necessária', sub: 'Revise os itens sinalizados acima', tone: 'warning' }
  );

  return (
    <MotionCard custom={7} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl shadow-elevated">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 font-display font-medium text-sm mb-3">
          <CheckCircle2 className="h-4 w-4 text-primary" /> Pendências e alertas
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {itens.map((item, i) => <ItemPendenciaCard key={i} item={item} />)}
          <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-border/40 bg-background/70 p-3 min-w-0">
            <Lightbulb className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">Alterações nesta área ficam registradas no histórico de auditoria do sistema.</p>
          </div>
        </div>
      </CardContent>
    </MotionCard>
  );
}
