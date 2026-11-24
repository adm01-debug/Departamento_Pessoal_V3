import type { ComponentType, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { FileText, Paperclip, ShieldAlert, CalendarClock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { useDocumentosPessoais, useDocumentos, useMedidasDisciplinaresColaborador } from '@/hooks';
import { useConsentimentosColaborador } from '@/hooks/useComplianceColaborador';
import { cn } from '@/lib/utils';
import { DocumentosPessoaisCard } from './documentos/DocumentosPessoaisCard';
import { DocumentosDigitaisCard } from './documentos/DocumentosDigitaisCard';
import { StatusComplianceCard } from './documentos/StatusComplianceCard';
import { AnotacoesInternasCard } from './documentos/AnotacoesInternasCard';
import { PrazosAlertasCard } from './documentos/PrazosAlertasCard';

const MotionCard = motion.create(Card);
const DIAS_ALERTA_VALIDADE = 60;

function KpiCard({
  index, icon: Icon, iconClassName, titulo, valor, sub,
}: {
  index: number; icon: ComponentType<{ className?: string }>; iconClassName: string; titulo: string; valor: ReactNode; sub?: ReactNode;
}) {
  return (
    <MotionCard custom={index} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl shadow-elevated h-full">
      <CardContent className="px-3.5 py-3 h-full flex items-center gap-2.5">
        <div className={cn('h-11 w-11 rounded-full flex items-center justify-center shrink-0', iconClassName)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs leading-none text-muted-foreground truncate">{titulo}</p>
          <p className="text-lg font-semibold leading-tight mt-1">{valor}</p>
          {sub && <p className="text-xs leading-none text-muted-foreground mt-1 truncate">{sub}</p>}
        </div>
      </CardContent>
    </MotionCard>
  );
}

/** Faixa de 4 KPIs no topo — resumo executivo dos mesmos dados usados pelos
 * painéis abaixo (Documentos Pessoais, Documentos Digitais, Compliance,
 * Prazos), sem nenhuma métrica nova: contagens e cálculos derivados do que já
 * existe (mesma lógica de vencimento de PrazosAlertasCard). */
function DocumentosKpiRow({ colaboradorId }: { colaboradorId: string }) {
  const { data: docsPessoais, isLoading: isLoadingPessoais } = useDocumentosPessoais(colaboradorId);
  const { documentos: docsDigitais, isLoading: isLoadingDigitais } = useDocumentos(colaboradorId);
  const { data: medidas, isLoading: isLoadingMedidas } = useMedidasDisciplinaresColaborador(colaboradorId);
  const { data: consentimentos, isLoading: isLoadingConsentimentos } = useConsentimentosColaborador(colaboradorId);

  const isLoading = isLoadingPessoais || isLoadingDigitais || isLoadingMedidas || isLoadingConsentimentos;
  if (isLoading) return <div className="flex items-center justify-center h-20"><Spinner /></div>;

  const listaPessoais = (docsPessoais as any[] | undefined) ?? [];
  const listaDigitais = docsDigitais ?? [];
  const listaMedidas = (medidas as any[] | undefined) ?? [];
  const listaConsentimentos = (consentimentos as any[] | undefined) ?? [];

  const hoje = new Date();
  const diasAte = (validade: string) => Math.round((new Date(validade).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  const validadesTotais = [...listaPessoais, ...listaDigitais].filter((d: any) => d.data_validade);
  const validadesARevisar = validadesTotais.filter((d: any) => diasAte(d.data_validade) <= DIAS_ALERTA_VALIDADE).length;

  const medidasGraves = listaMedidas.filter((m: any) => m.gravidade === 'grave' || m.gravidade === 'media').length;
  const consentimentosPendentes = listaConsentimentos.filter((c: any) => !c.aceito).length;
  const pendenciasCompliance = medidasGraves + consentimentosPendentes;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
      <KpiCard
        index={0}
        icon={FileText}
        iconClassName="bg-primary/10 text-primary"
        titulo="Documentos pessoais"
        valor={listaPessoais.length}
        sub="RG, CPF e outros"
      />
      <KpiCard
        index={1}
        icon={Paperclip}
        iconClassName="bg-info/10 text-info"
        titulo="Arquivos digitais"
        valor={listaDigitais.length}
        sub="PDF, imagens e contratos"
      />
      <KpiCard
        index={2}
        icon={ShieldAlert}
        iconClassName={pendenciasCompliance > 0 ? 'bg-red-500/10 text-red-500' : 'bg-success/10 text-success'}
        titulo="Pendências de compliance"
        valor={pendenciasCompliance}
        sub={pendenciasCompliance > 0 ? 'Requer atenção' : 'Tudo em dia'}
      />
      <KpiCard
        index={3}
        icon={CalendarClock}
        iconClassName={validadesARevisar > 0 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}
        titulo="Validades a revisar"
        valor={validadesARevisar}
        sub={validadesARevisar > 0 ? 'Vencidas ou a vencer' : 'Tudo em dia'}
      />
    </div>
  );
}

/** Dashboard de "Documentos & Compliance" (sub-aba "Documentos Pessoais") —
 * reconstrói os antigos blocos empilhados full-width (DocumentosPessoaisTab +
 * ColaboradorDocuments) numa composição mais densa: faixa de 4 KPIs no topo
 * e grid principal de 2 colunas (esquerda maior: Documentos Pessoais +
 * Documentos Digitais; direita menor: Status de Compliance + Anotações
 * Internas + Prazos e Alertas). Mesmos dados/hooks/mutations de antes — só a
 * apresentação muda. As sub-abas (Anotações Internas/Dados Estagiário/
 * Compliance) continuam intactas; os atalhos "Ver detalhes"/"Ver histórico"
 * apenas abrem o popup "Ver todos" (mesma coreografia do popup de
 * Pendências) com o detalhe completo, sem duplicar a lógica dessas telas. */
export function DocumentosComplianceResumoTab({ colaboradorId }: { colaboradorId: string }) {
  return (
    <div className="space-y-4">
      <DocumentosKpiRow colaboradorId={colaboradorId} />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4 items-start">
        <div className="space-y-4">
          <DocumentosPessoaisCard colaboradorId={colaboradorId} />
          <DocumentosDigitaisCard colaboradorId={colaboradorId} />
        </div>
        <div className="flex flex-col gap-4">
          <StatusComplianceCard colaboradorId={colaboradorId} />
          <AnotacoesInternasCard colaboradorId={colaboradorId} />
          <PrazosAlertasCard colaboradorId={colaboradorId} />
        </div>
      </div>
    </div>
  );
}
