import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Gavel, FileCheck2, GraduationCap, HardHat, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useMedidasDisciplinaresColaborador, useTreinamentosColaborador, useEpisEntregasColaborador } from '@/hooks';
import { useConsentimentosColaborador } from '@/hooks/useComplianceColaborador';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { cn } from '@/lib/utils';
import { StatusComplianceDialog, type ComplianceSecao } from './StatusComplianceDialog';

const MotionCard = motion.create(Card);

function LinhaCompliance({
  icon: Icon, titulo, sub, badgeLabel, tone,
}: {
  icon: typeof ShieldCheck; titulo: string; sub: string; badgeLabel: string; tone: 'success' | 'warning' | 'destructive';
}) {
  return (
    <div className="flex items-center gap-2.5 py-2.5 border-b border-border/20 last:border-0">
      <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0', tone === 'success' ? 'bg-success/10 text-success' : tone === 'warning' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive')}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate">{titulo}</p>
        <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
      </div>
      <Badge variant={tone} size="sm" className="shrink-0">{badgeLabel}</Badge>
    </div>
  );
}

/** Painel "Status de Compliance" — resumo compacto de dados já existentes em
 * outras telas (useMedidasDisciplinaresColaborador + useConsentimentosColaborador,
 * mesmas query keys de ComplianceTab; useTreinamentosColaborador, mesma de
 * TreinamentosCard; useEpisEntregasColaborador, mesma de SSTResumoTab). Não
 * inventa regras de compliance: só reformata em linhas curtas dados reais que
 * já existem em outras partes do dossiê. "Ver todos" abre um popup (mesma
 * coreografia do popup de Pendências) detalhando cada registro individual —
 * o quê, quando e por que importa — sem duplicar a sub-aba "Compliance". */
export function StatusComplianceCard({ colaboradorId }: { colaboradorId: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: medidas, isLoading: isLoadingMedidas } = useMedidasDisciplinaresColaborador(colaboradorId);
  const { data: consentimentos, isLoading: isLoadingConsentimentos } = useConsentimentosColaborador(colaboradorId);
  const { data: treinamentos, isLoading: isLoadingTreinamentos } = useTreinamentosColaborador(colaboradorId);
  const { data: episEntregas, isLoading: isLoadingEpis } = useEpisEntregasColaborador(colaboradorId);

  const isLoading = isLoadingMedidas || isLoadingConsentimentos || isLoadingTreinamentos || isLoadingEpis;
  const listaMedidas = (medidas as any[] | undefined) ?? [];
  const listaConsentimentos = (consentimentos as any[] | undefined) ?? [];
  const listaTreinamentos = (treinamentos as any[] | undefined) ?? [];
  const listaEpis = (episEntregas as any[] | undefined) ?? [];
  const medidasGraves = listaMedidas.filter(m => m.gravidade === 'grave' || m.gravidade === 'media').length;
  const consentimentosAceitos = listaConsentimentos.filter(c => c.aceito).length;
  const treinamentosConcluidos = listaTreinamentos.filter(t => t.presente).length;
  const episAtivos = listaEpis.filter(e => !e.data_devolucao).length;

  const formatarData = (data: string) => new Date(data).toLocaleDateString('pt-BR');

  const GRAVIDADE_LABEL: Record<string, string> = { leve: 'Leve', media: 'Média', grave: 'Grave' };
  const GRAVIDADE_TONE: Record<string, 'success' | 'warning' | 'destructive'> = { leve: 'success', media: 'warning', grave: 'destructive' };

  const secoes: ComplianceSecao[] = [
    {
      icon: Gavel,
      titulo: 'Medidas disciplinares',
      explicacao: 'Registros formais de ocorrências disciplinares (orientações, advertências, suspensões). Servem de histórico para decisões de RH — casos graves ou recorrentes podem embasar uma rescisão por justa causa.',
      itens: listaMedidas.map(m => ({
        label: m.tipo,
        detalhe: `Ocorrência em ${formatarData(m.data_ocorrencia)}`,
        tone: GRAVIDADE_TONE[m.gravidade] ?? 'warning',
        badgeLabel: GRAVIDADE_LABEL[m.gravidade] ?? m.gravidade,
      })),
    },
    {
      icon: FileCheck2,
      titulo: 'Consentimentos LGPD',
      explicacao: 'Termos e políticas de tratamento de dados pessoais que o colaborador precisa aceitar (Lei 13.709/2018). Consentimentos pendentes expõem a empresa a risco em caso de auditoria ou fiscalização.',
      itens: listaConsentimentos.map(c => ({
        label: `${c.tipo}${c.versao ? ` (v${c.versao})` : ''}`,
        detalhe: c.aceito ? 'Aceito pelo colaborador' : 'Ainda não aceito — pendente de confirmação',
        tone: c.aceito ? 'success' : 'warning',
        badgeLabel: c.aceito ? 'Aceito' : 'Pendente',
      })),
    },
    {
      icon: GraduationCap,
      titulo: 'Treinamentos',
      explicacao: 'Capacitações vinculadas ao colaborador. Treinamentos obrigatórios de segurança (Normas Regulamentadoras) têm exigência legal — presença não registrada pode gerar autuação em fiscalização.',
      itens: listaTreinamentos.map(t => ({
        label: t.treinamento?.nome ?? 'Treinamento',
        detalhe: `${formatarData(t.created_at)}${t.treinamento?.carga_horaria ? ` · ${t.treinamento.carga_horaria}h` : ''} — ${t.presente ? 'presença confirmada' : 'colaborador faltou'}`,
        tone: t.presente ? 'success' : 'warning',
        badgeLabel: t.presente ? 'Concluído' : 'Faltou',
      })),
    },
    {
      icon: HardHat,
      titulo: 'EPIs entregues',
      explicacao: 'Equipamentos de Proteção Individual entregues ao colaborador, conforme a NR-6. A ficha de entrega/devolução é documento obrigatório em fiscalização e essencial em caso de acidente de trabalho.',
      itens: listaEpis.map(e => ({
        label: e.epi?.nome ?? 'EPI',
        detalhe: e.data_devolucao ? `Devolvido em ${formatarData(e.data_devolucao)}` : 'Em posse do colaborador (sem devolução registrada)',
        tone: 'success' as const,
        badgeLabel: e.data_devolucao ? 'Devolvido' : 'Em posse',
      })),
    },
  ];

  return (
    <MotionCard custom={2} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl shadow-elevated shrink-0 h-[220px] flex flex-col">
      <CardContent className="p-4 flex-1 flex flex-col min-h-0">
        <div className="flex items-start justify-between gap-2 mb-1 shrink-0">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-display font-medium">Status de Compliance</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Acompanhe a conformidade e obrigações do colaborador.</p>
            </div>
          </div>
          <button type="button" onClick={() => setDialogOpen(true)} className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline shrink-0">
            Ver todos <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {isLoading ? <div className="flex justify-center py-4"><Spinner /></div> : (
          <div className="mt-2 flex-1 min-h-0 overflow-y-auto">
            <LinhaCompliance
              icon={Gavel}
              titulo="Medidas disciplinares"
              sub={listaMedidas.length ? `${listaMedidas.length} registro(s)` : 'Nenhum registro'}
              badgeLabel={medidasGraves > 0 ? `${medidasGraves} grave(s)` : 'Conforme'}
              tone={medidasGraves > 0 ? 'destructive' : 'success'}
            />
            <LinhaCompliance
              icon={FileCheck2}
              titulo="Consentimentos LGPD"
              sub={`${consentimentosAceitos} de ${listaConsentimentos.length} aceitos`}
              badgeLabel={listaConsentimentos.length > 0 && consentimentosAceitos === listaConsentimentos.length ? 'Conforme' : listaConsentimentos.length === 0 ? 'Sem registro' : 'Pendente'}
              tone={listaConsentimentos.length > 0 && consentimentosAceitos === listaConsentimentos.length ? 'success' : 'warning'}
            />
            <LinhaCompliance
              icon={GraduationCap}
              titulo="Treinamentos"
              sub={listaTreinamentos.length ? `${treinamentosConcluidos} de ${listaTreinamentos.length} concluídos` : 'Nenhum treinamento'}
              badgeLabel={listaTreinamentos.length > 0 && treinamentosConcluidos === listaTreinamentos.length ? 'Conforme' : listaTreinamentos.length === 0 ? 'Sem registro' : 'Pendente'}
              tone={listaTreinamentos.length > 0 && treinamentosConcluidos === listaTreinamentos.length ? 'success' : 'warning'}
            />
            <LinhaCompliance
              icon={HardHat}
              titulo="EPIs entregues"
              sub={listaEpis.length ? `${episAtivos} de ${listaEpis.length} em posse` : 'Nenhum EPI registrado'}
              badgeLabel={listaEpis.length === 0 ? 'Sem registro' : 'Conforme'}
              tone={listaEpis.length === 0 ? 'warning' : 'success'}
            />
          </div>
        )}
      </CardContent>
      <StatusComplianceDialog open={dialogOpen} onOpenChange={setDialogOpen} secoes={secoes} />
    </MotionCard>
  );
}
