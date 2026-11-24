import { useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarClock,
  CalendarDays,
  Calculator,
  Check,
  Download,
  FileCheck2,
  FileText,
  FolderOpen,
  History,
  Info,
  RefreshCw,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/user-avatar';
import { StatusBadge, TipoBadge } from './DesligamentoStatusBadge';
import { DesligamentoChecklist } from './DesligamentoChecklist';
import { ETAPA_FLUXO, ETAPA_LABELS, TIPO_LABELS } from './desligamentosComum';
import { dataValida, indiceEtapa } from './desligamentosDerivacoes';
import { formatCPF, formatCurrency, formatDate, formatDateTime } from '@/utils/format';
import { desligamentoService } from '@/services/desligamentoService';
import { rescisaoService } from '@/services/rescisaoService';
import { gerarPDFRescisao } from '@/utils/rescisaoPDF';
import { safeErrorMessage } from '@/utils/safeError';
// MOCK VISUAL — ver src/mocks/desligamentosMock.ts.
import { bloquearEscritaDesligamento } from '@/mocks/desligamentosMock';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { entradaCard, EntradaPresenca } from './entradaCards';

/**
 * ============================================================================
 * Drawer de detalhes do Desligamento (3 abas: Detalhes / Checklist / Rescisão).
 *
 * O QUE É REAL x O QUE É VISUAL
 *   • Real (já existia e continua igual): calcular/recalcular a rescisão
 *     (`rescisaoService.calcularESalvar`), homologar (`rescisaoService.homologar`),
 *     exportar o TRCT (`gerarPDFRescisao`), abrir a Calculadora Avançada
 *     (`navigate('/calculadora-rescisao')`), marcar um item do checklist e
 *     concluir todas as pendências de uma vez (`desligamentoService.atualizar`).
 *   • Visual (leitura do MESMO registro, sem campo novo no banco): os cards de
 *     resumo do cabeçalho, o stepper de etapas, os blocos de
 *     proventos/descontos e a lista "Documentos vinculados" — cujo status é
 *     DERIVADO de campos reais (`valor_liquido`, `status`, `checklist_esocial`).
 *     Só o TRCT tem download, porque só ele tem gerador de PDF.
 *
 * Nenhum campo foi inventado: todos os valores saem do próprio registro
 * `desligamento` ou dos helpers compartilhados (`desligamentosComum`,
 * `desligamentosDerivacoes`, `@/utils/format`).
 * ============================================================================
 */

type Icone = ComponentType<{ className?: string }>;
type Tom = 'primary' | 'info' | 'success' | 'warning' | 'destructive';

const TOM_TEXTO: Record<Tom, string> = {
  primary: 'text-primary',
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive-vivid',
};

const TOM_BG: Record<Tom, string> = {
  primary: 'bg-primary/15 text-primary',
  info: 'bg-info/15 text-info',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  destructive: 'bg-destructive-vivid/15 text-destructive-vivid',
};

/**
 * ============================================================================
 * CASCATA DO DRAWER — a MESMA linguagem dos KPI do Dashboard Executivo
 * (`entradaCard` → `cardVariants`, de `dashboard/MetricCard.tsx`): fade +
 * subida de 20px, 0.4s, ease `[0.25, 0.46, 0.45, 0.94]`, um passo de 0.08s por
 * índice. Como no Dashboard Executivo (KPIs numerados 0..4 e os cards seguintes
 * em 5, 6, 7…), a numeração é uma SEQUÊNCIA ÚNICA na ordem de leitura — não
 * cascatas independentes começando do zero.
 * ============================================================================
 */
/** O bloco de identificação do cabeçalho ocupa 0 e os três cards de resumo 1–3;
 *  o conteúdo da aba continua a MESMA sequência a partir daqui. */
const BASE_CONTEUDO_ABA = 4;

/**
 * Ritmo da revelação progressiva do "Andamento do processo" — a MESMA família do
 * "Histórico Profissional" (`colaborador-detalhes/TrabalhoHierarquiaTab.tsx`):
 * a linha se DESENHA enquanto cada marcador surge escalonado e o rótulo
 * acompanha logo depois. Lá a leitura é da DIREITA para a esquerda; aqui é da
 * ESQUERDA para a direita (a ordem real das 6 etapas do desligamento), então o
 * atraso CRESCE com o índice — o espelho do histórico profissional.
 */
const ANDAMENTO_GAP = 0.22;
/** Espera a entrada externa do card (índice 5 ≈ 0.40s + 0.40s de duração) para
 *  a linha não terminar de se desenhar com o card ainda praticamente invisível. */
const ANDAMENTO_INICIO = 0.6;

interface DetailSheetProps {
  desligamento: any | null;
  open: boolean;
  onClose: () => void;
}

interface DocumentoProcesso {
  nome: string;
  descricao: string;
  disponivel: boolean;
  baixavel?: boolean;
}

export function DesligamentoDetailSheet({ desligamento, open, onClose }: DetailSheetProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [calculating, setCalculating] = useState(false);
  const [homologating, setHomologating] = useState(false);
  const [mostrarBaseCalculo, setMostrarBaseCalculo] = useState(false);
  const d = desligamento;

  if (!d) return null;

  /* ── Derivados de exibição (só leitura do registro) ───────────────────── */
  const nome = d.colaborador?.nome_completo || 'Colaborador';
  const cargo = d.colaborador?.cargo || 'Cargo não informado';
  const departamento = d.colaborador?.departamento || 'Departamento não informado';
  const admissao = d.colaborador?.data_admissao || d.data_admissao;
  const tempoEmpresa = tempoDeEmpresa(admissao, d.data_desligamento);
  const etapasConcluidas = d.etapa === 'finalizado' ? ETAPA_FLUXO.length : Math.max(0, indiceEtapa(d.etapa));

  /**
   * Documentos do processo. Nenhuma linha é um dado novo: o status de cada item
   * é DERIVADO do próprio registro (cálculo salvo, homologação concluída e
   * evento do eSocial transmitido). Só o TRCT tem `baixavel`, pois só ele possui
   * gerador de PDF (`gerarPDFRescisao`).
   */
  const documentos: DocumentoProcesso[] = [
    {
      nome: 'TRCT — Termo de Rescisão',
      descricao: 'PDF gerado a partir do cálculo salvo',
      disponivel: Boolean(d.valor_liquido),
      baixavel: true,
    },
    {
      nome: 'Termo de Homologação',
      descricao: 'Registro da homologação da rescisão',
      disponivel: d.status === 'homologado' || d.status === 'finalizado',
    },
    {
      nome: 'Comprovante eSocial (S-2299)',
      descricao: 'Transmissão do evento de desligamento',
      disponivel: d.checklist_esocial === true,
    },
  ];

  /* ── Ações (as mesmas de antes) ───────────────────────────────────────── */

  const handleChecklistToggle = async (key: string, value: boolean) => {
    try {
      // MOCK VISUAL — ver src/mocks/desligamentosMock.ts.
      if (bloquearEscritaDesligamento('Atualizar o checklist')) return;
      // Regras de transição de etapa baseadas no checklist
      const updates: any = { [key]: value };

      if (key === 'checklist_comunicacao' && value) {
        updates.etapa = 'documentacao';
        updates.status = 'comunicado';
      } else if (key === 'checklist_documentacao' && value) {
        // Se concluiu documentação, habilita etapa de cálculo
        if (d.etapa === 'documentacao') updates.etapa = 'calculo';
      }

      await desligamentoService.atualizar(d.id, updates, d.empresa_id);
      queryClient.invalidateQueries({ queryKey: ['desligamentos'] });
      toast.success('Checklist atualizado');
    } catch (err) {
      toast.error(safeErrorMessage(err, 'Erro ao atualizar checklist.'));
    }
  };

  /** Conclui todas as pendências numa única gravação (mesma rota do toggle). */
  const handleConcluirPendencias = async (keys: string[]) => {
    if (!keys.length) return;
    // MOCK VISUAL — ver src/mocks/desligamentosMock.ts.
    if (bloquearEscritaDesligamento('Concluir as pendências do checklist')) return;
    const updates: Record<string, unknown> = {};
    keys.forEach((k) => {
      updates[k] = true;
    });
    try {
      await desligamentoService.atualizar(d.id, updates, d.empresa_id);
      queryClient.invalidateQueries({ queryKey: ['desligamentos'] });
      toast.success('Pendências do checklist concluídas');
    } catch (err) {
      toast.error(safeErrorMessage(err, 'Erro ao concluir as pendências.'));
    }
  };

  const handleCalcular = async () => {
    if (!d.salario_base || !d.data_desligamento) {
      toast.error('Salário base e data de desligamento são obrigatórios para o cálculo');
      return;
    }
    // MOCK VISUAL — ver src/mocks/desligamentosMock.ts.
    if (bloquearEscritaDesligamento('Calcular a rescisão')) return;
    setCalculating(true);
    try {
      await rescisaoService.calcularESalvar(
        d.id,
        {
          salario_base: d.salario_base,
          data_admissao: admissao, // Fallback
          data_desligamento: d.data_desligamento,
          tipo: d.tipo || 'sem_justa_causa',
          aviso_trabalhado: (d as Record<string, unknown>).aviso_trabalhado ?? false,
          ferias_vencidas: (d as Record<string, unknown>).ferias_vencidas_check ?? false,
          saldo_fgts: (d as Record<string, unknown>).saldo_fgts ?? 0,
        },
        d.empresa_id
      );
      queryClient.invalidateQueries({ queryKey: ['desligamentos'] });
      toast.success('Rescisão calculada com sucesso');
    } catch (err) {
      toast.error(safeErrorMessage(err, 'Erro ao calcular rescisão.'));
    } finally {
      setCalculating(false);
    }
  };

  const handleHomologar = async () => {
    // MOCK VISUAL — ver src/mocks/desligamentosMock.ts.
    if (bloquearEscritaDesligamento('Homologar a rescisão')) return;
    setHomologating(true);
    try {
      await rescisaoService.homologar(d.id, d.empresa_id);
      queryClient.invalidateQueries({ queryKey: ['desligamentos'] });
      toast.success('Homologação concluída');
    } catch (err) {
      toast.error(safeErrorMessage(err, 'Erro ao homologar.'));
    } finally {
      setHomologating(false);
    }
  };

  const handleBaixarTRCT = () => {
    const form = {
      nomeColaborador: d.colaborador?.nome_completo,
      cpf: d.colaborador?.cpf,
      cargo: d.colaborador?.cargo,
      dataAdmissao: admissao,
      dataDesligamento: d.data_desligamento,
      tipo: d.tipo,
      ...d,
    };
    gerarPDFRescisao(form, d.detalhes_calculo || d);
  };


  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 font-body sm:max-w-xl">
        {/* ── Cabeçalho (fixo) ─────────────────────────────────────────── */}
        <SheetHeader className="shrink-0 space-y-0 border-b border-border/40 bg-card/30 px-5 pb-4 pr-12 pt-5 text-left">
          {/* Bloco de identificação — UM grupo animado (não cada label solto),
              primeiro na cascata. `EntradaPresenca` devolve o keyframe inicial
              que o `initial={false}` do `PageTransition` bloqueia. */}
          <EntradaPresenca>
            <motion.div {...entradaCard(0)} className="flex items-start gap-3">
              <UserAvatar name={nome} className="h-12 w-12 shrink-0 ring-2 ring-primary/20" />
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={d.status} />
                  <TipoBadge tipo={d.tipo} />
                </div>
                <SheetTitle className="truncate font-display text-base leading-tight text-foreground">
                  {nome}
                </SheetTitle>
                <p className="mt-1 flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
                  <Briefcase className="h-3 w-3 shrink-0" />
                  <span className="truncate">{cargo}</span>
                  <span className="shrink-0 text-border">•</span>
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">{departamento}</span>
                </p>
              </div>
            </motion.div>
          </EntradaPresenca>

          {/* Cards de resumo (leitura do registro) — continuam a cascata do
              cabeçalho (índices 1–3), com a abertura do drawer. */}
          <div className="grid grid-cols-3 gap-2 pt-3.5">
            <ResumoCard index={1} icon={CalendarDays} label="Desligamento" valor={formatDate(d.data_desligamento)} />
            <ResumoCard index={2} icon={CalendarClock} label="Aviso prévio" valor={formatDate(d.data_aviso_previo)} />
            <ResumoCard index={3} icon={Wallet} label="Salário-base" valor={formatCurrency(d.salario_base)} destaque />
          </div>
        </SheetHeader>

        <Tabs defaultValue="detalhes" className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 px-5 pt-4">
            <TabsList className="grid h-10 w-full grid-cols-3 gap-1 rounded-xl border border-border/40 bg-card/40 p-1">
              <TabsTrigger
                value="detalhes"
                className="rounded-lg font-body text-xs text-muted-foreground data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none"
              >
                Detalhes
              </TabsTrigger>
              <TabsTrigger
                value="checklist"
                className="rounded-lg font-body text-xs text-muted-foreground data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none"
              >
                Checklist
              </TabsTrigger>
              <TabsTrigger
                value="rescisao"
                className="rounded-lg font-body text-xs text-muted-foreground data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none"
              >
                Rescisão
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">

            {/* ══ Aba: Detalhes ═══════════════════════════════════════════
                Cada card da aba leva o seu `index` na cascata de entrada (a
                ORDEM em que aparecem na tela). O container da aba não anima:
                animar container + filhos somaria dois movimentos. */}
            <TabsContent value="detalhes" className="mt-0 space-y-3.5">
              <SecaoCard index={BASE_CONTEUDO_ABA + 0} titulo="Informações principais" icon={Info}>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <InfoPar label="Cargo" valor={cargo} />
                  <InfoPar label="Departamento" valor={departamento} />
                  <InfoPar label="Tipo de desligamento" valor={TIPO_LABELS[d.tipo] ?? d.tipo ?? '—'} />
                  <InfoPar label="Tempo de empresa" valor={tempoEmpresa} />
                  <InfoPar label="Data do desligamento" valor={formatDate(d.data_desligamento)} />
                  <InfoPar label="Data do aviso prévio" valor={formatDate(d.data_aviso_previo)} />
                  <InfoPar label="CPF" valor={formatCPF(d.colaborador?.cpf)} />
                  <InfoPar label="Salário-base" valor={formatCurrency(d.salario_base)} />
                </div>
              </SecaoCard>

              {d.etapa && (
                <SecaoCard
                  index={BASE_CONTEUDO_ABA + 1}
                  titulo="Andamento do processo"
                  icon={History}
                  aside={
                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                      {`${etapasConcluidas} de ${ETAPA_FLUXO.length} etapas`}
                    </span>
                  }
                >
                  <EtapaStepper etapa={d.etapa} />
                </SecaoCard>
              )}

              <SecaoCard index={BASE_CONTEUDO_ABA + 2} titulo="Observações" icon={FileText}>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {d.motivo || 'Nenhuma observação registrada para este desligamento.'}
                </p>
              </SecaoCard>

              <SecaoCard
                index={BASE_CONTEUDO_ABA + 3}
                titulo="Documentos vinculados"
                icon={FolderOpen}
                aside={
                  <span className="shrink-0 rounded-full bg-muted/60 px-1.5 text-[10px] tabular-nums text-muted-foreground">
                    {documentos.length}
                  </span>
                }
              >
                <DocumentosLista documentos={documentos} onBaixarTRCT={handleBaixarTRCT} />
              </SecaoCard>

              <div className="grid grid-cols-2 gap-2">
                <MetaCard index={BASE_CONTEUDO_ABA + 4} icon={CalendarDays} label="Criado em" valor={formatDate(d.created_at)} />
                <MetaCard index={BASE_CONTEUDO_ABA + 5} icon={RefreshCw} label="Atualizado em" valor={formatDate(d.updated_at)} />
              </div>
            </TabsContent>


            {/* ══ Aba: Checklist ══════════════════════════════════════════ */}
            <TabsContent value="checklist" className="mt-0">
              <DesligamentoChecklist
                desligamento={d}
                onToggle={handleChecklistToggle}
                onConcluirPendencias={handleConcluirPendencias}
              />
            </TabsContent>

            {/* ══ Aba: Rescisão ═══════════════════════════════════════════
                Mesma regra da aba Detalhes: o `index` de cada card segue a ORDEM
                de leitura da aba (cálculo → KPIs → blocos de verba → resumo →
                documentos), com cascata de 0.08s entre eles. */}
            <TabsContent value="rescisao" className="mt-0 space-y-3.5">
              <SecaoCard
                index={BASE_CONTEUDO_ABA + 0}
                titulo="Cálculo da Rescisão"
                icon={Calculator}
                aside={
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setMostrarBaseCalculo((v) => !v)}
                    className="h-7 shrink-0 gap-1 px-2 font-body text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    <Info className="h-3 w-3" />
                    {mostrarBaseCalculo ? 'Ocultar base' : 'Ver base de cálculo'}
                  </Button>
                }
              >
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-card/40 p-2.5">
                  <span className="flex min-w-0 items-center gap-1.5 text-[10px] text-muted-foreground">
                    <History className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {d.updated_at
                        ? `Última atualização em ${formatDateTime(d.updated_at)}`
                        : 'Cálculo ainda não executado'}
                    </span>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCalcular}
                    disabled={calculating || d.status === 'homologado' || d.status === 'finalizado'}
                    className="shrink-0 gap-1.5 font-body text-[11px]"
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5', calculating && 'animate-spin')} />
                    {d.valor_liquido ? 'Recalcular' : 'Calcular'}
                  </Button>
                </div>

                {mostrarBaseCalculo && (
                  <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-xl border border-border/40 bg-muted/20 p-3">
                    <InfoPar label="Salário-base" valor={formatCurrency(d.salario_base)} />
                    <InfoPar label="Tipo" valor={TIPO_LABELS[d.tipo] ?? d.tipo ?? '—'} />
                    <InfoPar label="Admissão" valor={formatDate(admissao)} />
                    <InfoPar label="Desligamento" valor={formatDate(d.data_desligamento)} />
                  </div>
                )}
              </SecaoCard>

              <div className="grid grid-cols-3 gap-2">
                <KpiCard index={BASE_CONTEUDO_ABA + 1} icon={TrendingUp} tom="success" rotulo="Proventos" valor={formatCurrency(d.total_proventos)} />
                <KpiCard index={BASE_CONTEUDO_ABA + 2} icon={TrendingDown} tom="destructive" rotulo="Descontos" valor={formatCurrency(d.total_descontos)} />
                <KpiCard index={BASE_CONTEUDO_ABA + 3} icon={Wallet} tom="primary" rotulo="Líquido" valor={formatCurrency(d.valor_liquido)} destaque />
              </div>

              <BlocoValores index={BASE_CONTEUDO_ABA + 4} titulo="Proventos" icon={TrendingUp} tom="success" total={formatCurrency(d.total_proventos)}>
                <LinhaValor rotulo="Saldo de salário" valor={d.saldo_salario} />
                <LinhaValor rotulo="13º proporcional" valor={d.decimo_terceiro} />
                <LinhaValor rotulo="Férias proporcionais" valor={d.ferias_proporcionais} />
                <LinhaValor rotulo="Férias vencidas" valor={d.ferias_vencidas} />
                <LinhaValor rotulo="1/3 constitucional" valor={d.terco_constitucional} />
                <LinhaValor rotulo="Aviso prévio indenizado" valor={d.aviso_previo} />
              </BlocoValores>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <BlocoValores index={BASE_CONTEUDO_ABA + 5} titulo="Descontos" icon={TrendingDown} tom="destructive" total={formatCurrency(d.total_descontos)}>
                  <LinhaValor rotulo="INSS" valor={d.inss} />
                  <LinhaValor rotulo="IRRF" valor={d.irrf} />
                </BlocoValores>

                <BlocoValores index={BASE_CONTEUDO_ABA + 6} titulo="Multas e depósitos" icon={ShieldAlert} tom="warning" total={formatCurrency(d.multa_fgts)}>
                  <LinhaValor rotulo="Multa FGTS (40%)" valor={d.multa_fgts} />
                </BlocoValores>
              </div>


              {/* Resumo final */}
              <EntradaPresenca>
              <motion.div
                {...entradaCard(BASE_CONTEUDO_ABA + 7)}
                className="rounded-2xl border border-primary/30 bg-primary/[0.07] p-3.5"
              >
                <div className="mb-2 flex items-center gap-1.5">
                  <FileCheck2 className="h-3.5 w-3.5 text-primary" />
                  <span className="font-display text-[11px] font-semibold uppercase tracking-wide text-primary">
                    Resumo final
                  </span>
                </div>
                <LinhaValor rotulo="Total de proventos" valor={d.total_proventos} />
                <LinhaValor rotulo="Total de descontos" valor={d.total_descontos} tom="negativo" />
                <LinhaValor rotulo="Multa FGTS" valor={d.multa_fgts} />
                <Separator className="my-2.5 bg-primary/20" />
                <div className="flex items-center justify-between gap-3">
                  <span className="font-display text-xs font-semibold text-foreground">Valor líquido a receber</span>
                  <span className="shrink-0 font-display text-lg font-semibold tabular-nums text-primary">
                    {formatCurrency(d.valor_liquido)}
                  </span>
                </div>
              </motion.div>
              </EntradaPresenca>

              <SecaoCard index={BASE_CONTEUDO_ABA + 8} titulo="Observações" icon={FileText}>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {d.motivo || 'Nenhuma observação registrada para este desligamento.'}
                </p>
              </SecaoCard>

              <SecaoCard index={BASE_CONTEUDO_ABA + 9} titulo="Documentos vinculados" icon={FolderOpen}>
                <DocumentosLista documentos={documentos} onBaixarTRCT={handleBaixarTRCT} />
              </SecaoCard>

              {/* Ações */}
              <div className="space-y-2 pb-1">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBaixarTRCT}
                    disabled={!d.valor_liquido}
                    className="gap-2 font-body text-xs"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Exportar cálculo (PDF)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/calculadora-rescisao')}
                    className="gap-2 font-body text-xs"
                  >
                    <Calculator className="h-3.5 w-3.5" />
                    Calculadora avançada
                  </Button>
                </div>
                <Button
                  type="button"
                  onClick={handleHomologar}
                  disabled={homologating || d.status === 'homologado' || d.status === 'finalizado' || !d.valor_liquido}
                  className="w-full gap-2 font-body text-xs"
                >
                  {homologating ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <BadgeCheck className="h-3.5 w-3.5" />
                  )}
                  Homologar rescisão
                </Button>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}


/* ══════════════════════════════════════════════════════════════════════════
 * Peças internas do drawer (nenhuma delas inventa dado: só formatam/mostram o
 * que vem do registro `desligamento`).
 * ══════════════════════════════════════════════════════════════════════════ */

/** Tempo de empresa entre admissão e desligamento ("3 anos e 4 meses"). */
function tempoDeEmpresa(admissao?: string | null, desligamento?: string | null): string {
  const inicio = dataValida(admissao);
  const fim = dataValida(desligamento);
  if (!inicio || !fim || fim.getTime() < inicio.getTime()) return '—';

  let meses = (fim.getFullYear() - inicio.getFullYear()) * 12 + (fim.getMonth() - inicio.getMonth());
  if (fim.getDate() < inicio.getDate()) meses -= 1;
  if (meses < 0) meses = 0;

  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  const partes: string[] = [];
  if (anos > 0) partes.push(`${anos} ${anos === 1 ? 'ano' : 'anos'}`);
  if (resto > 0 || anos === 0) partes.push(`${resto} ${resto === 1 ? 'mês' : 'meses'}`);
  return partes.join(' e ');
}

/**
 * Card compacto de seção (título + ícone + slot de ação opcional).
 *
 * `index` = posição na cascata de entrada do painel/drawer (ver `entradaCard`,
 * que replica o variant dos KPI do Dashboard Executivo). O card continua sendo
 * `<section>` — só passou a ser um `<section>` animado, sem nó extra.
 */
function SecaoCard({
  titulo,
  icon: Icon,
  aside,
  children,
  index = 0,
}: {
  titulo: string;
  icon: Icone;
  aside?: ReactNode;
  children: ReactNode;
  index?: number;
}) {
  return (
    <EntradaPresenca>
    <motion.section
      {...entradaCard(index)}
      className="rounded-2xl border border-border/40 bg-card/40 p-3.5"
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate font-display text-[11px] font-semibold uppercase tracking-wide text-foreground">
            {titulo}
          </span>
        </span>
        {aside}
      </header>
      {children}
    </motion.section>
    </EntradaPresenca>
  );
}

/** Par rótulo/valor do grid de informações. */
function InfoPar({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-[11px] font-medium text-foreground" title={valor}>
        {valor}
      </p>
    </div>
  );
}

/** Card de resumo do cabeçalho (data/valor curto + rótulo). */
function ResumoCard({
  icon: Icon,
  label,
  valor,
  destaque,
  index = 0,
}: {
  icon: Icone;
  label: string;
  valor: string;
  destaque?: boolean;
  index?: number;
}) {
  return (
    <EntradaPresenca>
    <motion.div
      {...entradaCard(index)}
      className={cn(
        'min-w-0 rounded-xl border p-2.5',
        destaque ? 'border-primary/30 bg-primary/10' : 'border-border/40 bg-card/50'
      )}
    >
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className={cn('h-3 w-3 shrink-0', destaque && 'text-primary')} />
        <span className="truncate text-[9px] uppercase tracking-wide">{label}</span>
      </span>
      <p
        className={cn(
          'mt-1 truncate font-display text-[11px] font-semibold tabular-nums',
          destaque ? 'text-primary' : 'text-foreground'
        )}
        title={valor}
      >
        {valor}
      </p>
    </motion.div>
    </EntradaPresenca>
  );
}

/** Rodapé informacional (auditoria leve do registro). */
function MetaCard({ icon: Icon, label, valor, index = 0 }: { icon: Icone; label: string; valor: string; index?: number }) {
  return (
    <EntradaPresenca>
    <motion.div
      {...entradaCard(index)}
      className="min-w-0 rounded-xl border border-border/40 bg-card/40 p-2.5"
    >
      <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3 shrink-0" />
        {label}
      </span>
      <p className="mt-1 truncate text-[11px] font-medium tabular-nums text-foreground">{valor}</p>
    </motion.div>
    </EntradaPresenca>
  );
}


/**
 * Stepper horizontal do fluxo real de desligamento (`ETAPA_FLUXO`).
 *
 * ANIMAÇÃO (reusa a lógica do "Histórico Profissional", Padrão B, de
 * `colaborador-detalhes/TrabalhoHierarquiaTab.tsx`): a conexão é revelada por
 * `scaleX` 0→1 (o "desenho" da linha) e cada marcador surge "de dentro para
 * fora" (`opacity` + `scale` com o MESMO ease de overshoot
 * `[0.34, 1.56, 0.64, 1]`), seguido do rótulo (`opacity` + `y`, ease
 * `[0.25, 0.46, 0.45, 0.94]`, atraso do marcador + 0.2s). Lá a leitura é da
 * direita para a esquerda; aqui é da ESQUERDA para a direita (ordem real das 6
 * etapas), então o atraso CRESCE com o índice.
 *
 * A geometria, os seis marcos, os textos e os ESTADOS (concluída / atual /
 * futura) são exatamente os de antes: a animação apenas REVELA o estado real,
 * sem inventar mudança de status. `ANDAMENTO_INICIO` espera a entrada externa
 * do card para a linha não terminar de se desenhar com o card ainda invisível.
 */
function EtapaStepper({ etapa }: { etapa: string }) {
  const atual = indiceEtapa(etapa);
  const ultimo = ETAPA_FLUXO.length - 1;

  return (
    <div className="flex items-start pt-0.5">
      {ETAPA_FLUXO.map((e, i) => {
        const concluida = i < atual;
        const emAndamento = i === atual;
        /** Cada etapa entra um passo depois da anterior (esquerda → direita). */
        const atraso = ANDAMENTO_INICIO + i * ANDAMENTO_GAP;
        return (
          <div key={e} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <div className="flex w-full items-center">
              {/* Conexão da esquerda: "desenhada" da esquerda para a direita,
                  chegando um pouco antes do marcador desta etapa. */}
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: atraso - ANDAMENTO_GAP * 0.5, duration: ANDAMENTO_GAP, ease: 'easeInOut' }}
                style={{ transformOrigin: 'left' }}
                className={cn(
                  'h-[2px] flex-1 rounded-full',
                  i === 0 ? 'bg-transparent' : i <= atual ? 'bg-primary' : 'bg-border/50'
                )}
              />
              {/* Marcador: "de dentro para fora", no instante em que a linha o
                  alcança (mesmo ease de overshoot do Histórico Profissional). */}
              <motion.span
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: atraso, duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-medium transition-colors',
                  concluida
                    ? 'border-primary bg-primary text-primary-foreground'
                    : emAndamento
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-border/50 bg-muted/40 text-muted-foreground'
                )}
              >
                {concluida ? <Check className="h-3 w-3" /> : i + 1}
              </motion.span>
              {/* Conexão da direita: continua o traçado até a etapa seguinte. */}
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: atraso, duration: ANDAMENTO_GAP, ease: 'easeInOut' }}
                style={{ transformOrigin: 'left' }}
                className={cn(
                  'h-[2px] flex-1 rounded-full',
                  i === ultimo ? 'bg-transparent' : i < atual ? 'bg-primary' : 'bg-border/50'
                )}
              />
            </div>
            {/* Rótulo: acompanha o marcador (mesmo `+0.2s` do Histórico). */}
            <motion.span
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: atraso + 0.2, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className={cn(
                'w-full truncate px-0.5 text-center text-[9px] leading-tight',
                emAndamento ? 'font-medium text-primary' : concluida ? 'text-foreground/80' : 'text-muted-foreground'
              )}
            >
              {ETAPA_LABELS[e] ?? e}
            </motion.span>
          </div>
        );
      })}
    </div>
  );
}

/** Lista "Documentos vinculados" — status derivado de campos reais. */
function DocumentosLista({
  documentos,
  onBaixarTRCT,
}: {
  documentos: DocumentoProcesso[];
  onBaixarTRCT?: () => void;
}) {
  return (
    <div className="space-y-2">
      {documentos.map((doc) => {
        const podeBaixar = doc.disponivel && doc.baixavel && Boolean(onBaixarTRCT);
        return (
          <div
            key={doc.nome}
            className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/40 p-2.5"
          >
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                doc.disponivel ? 'bg-primary/10 text-primary' : 'bg-muted/40 text-muted-foreground'
              )}
            >
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium text-foreground">{doc.nome}</p>
              <p className="truncate text-[10px] text-muted-foreground">{doc.descricao}</p>
            </div>
            {podeBaixar ? (
              <button
                type="button"
                onClick={onBaixarTRCT}
                title="Baixar documento"
                aria-label={`Baixar ${doc.nome}`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/40 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            ) : (
              <span
                className={cn(
                  'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                  doc.disponivel
                    ? 'border-success/30 bg-success/10 text-success'
                    : 'border-border/50 bg-muted/40 text-muted-foreground'
                )}
              >
                {doc.disponivel ? 'Disponível' : 'Pendente'}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}


/** Card de KPI do cálculo (proventos / descontos / líquido). */
function KpiCard({
  icon: Icon,
  rotulo,
  valor,
  tom,
  destaque,
  index = 0,
}: {
  icon: Icone;
  rotulo: string;
  valor: string;
  tom: Tom;
  destaque?: boolean;
  index?: number;
}) {
  return (
    <EntradaPresenca>
    <motion.div
      {...entradaCard(index)}
      className={cn(
        'min-w-0 rounded-2xl border p-2.5',
        destaque ? 'border-primary/30 bg-primary/10' : 'border-border/40 bg-card/40'
      )}
    >
      <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', TOM_BG[tom])}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <p
        className={cn(
          'mt-2 truncate font-display text-xs font-semibold tabular-nums',
          destaque ? 'text-primary' : 'text-foreground'
        )}
        title={valor}
      >
        {valor}
      </p>
      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{rotulo}</p>
    </motion.div>
    </EntradaPresenca>
  );
}

/** Bloco de verbas com total no cabeçalho (proventos, descontos, multas). */
function BlocoValores({
  titulo,
  icon: Icon,
  tom,
  total,
  children,
  index = 0,
}: {
  titulo: string;
  icon: Icone;
  tom: Tom;
  total?: string;
  children: ReactNode;
  index?: number;
}) {
  return (
    <EntradaPresenca>
    <motion.section
      {...entradaCard(index)}
      className="rounded-2xl border border-border/40 bg-card/40 p-3.5"
    >
      <header className="mb-2.5 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <Icon className={cn('h-3.5 w-3.5 shrink-0', TOM_TEXTO[tom])} />
          <span className="truncate font-display text-[11px] font-semibold uppercase tracking-wide text-foreground">
            {titulo}
          </span>
        </span>
        {total && (
          <span className={cn('shrink-0 font-display text-[11px] font-semibold tabular-nums', TOM_TEXTO[tom])}>
            {total}
          </span>
        )}
      </header>
      <div className="space-y-1.5">{children}</div>
    </motion.section>
    </EntradaPresenca>
  );
}

/** Linha rótulo/valor das verbas (`formatCurrency` trata nulo como "—"). */
function LinhaValor({ rotulo, valor, tom }: { rotulo: string; valor?: number | null; tom?: 'negativo' }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[11px]">
      <span className="min-w-0 truncate text-muted-foreground">{rotulo}</span>
      <span
        className={cn(
          'shrink-0 font-medium tabular-nums',
          tom === 'negativo' ? 'text-destructive-vivid' : 'text-foreground'
        )}
      >
        {formatCurrency(valor ?? null)}
      </span>
    </div>
  );
}

