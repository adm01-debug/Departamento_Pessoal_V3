import { useState, useRef } from 'react';
import { PageTitle } from '@/components/PageTitle';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataAccessLog } from '@/hooks/useDataAccessLog';
import { useQuery } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { colaboradorService } from '@/services';
import { cargoService } from '@/services/cargoService';
import { localTrabalhoService } from '@/services/localTrabalhoService';
import { useProximosEventos } from '@/hooks/useProximosEventos';
import { useEmpresas } from '@/hooks/useEmpresas';
import {
  useSaldoBancoHoras, useFeriasResumoColaborador, useAfastamentosRecentes,
  useTimes, useASOs, useDocumentosPessoais, useOnboardingColaborador,
} from '@/hooks';
import { usePontoMelhorado } from '@/hooks/usePontoMelhorado';
import { todayLocalISO } from '@/utils/dateLocal';
import {
  Users, ShieldCheck, Briefcase, ArrowLeft, AlertTriangle, ChevronRight,
  Landmark, FileText, Info, Edit, MoreHorizontal, History as HistoryIcon,
  MapPin, Calendar, Stethoscope, User as UserIcon, GraduationCap, HeartPulse, Clock, UserPlus,
  Zap, ClipboardCheck, IdCard, Mail, BarChart3, ArrowLeftRight, Activity, DollarSign,
} from 'lucide-react';
import { RecontratarColaboradorDialog } from '@/components/colaboradores/RecontratarColaboradorDialog';
import { AnimatedDossieTabsList, AnimatedDossieTabsTrigger } from '@/components/colaboradores/AnimatedDossieTabs';
import {
  DadosPessoaisTab, HistoricoSalarialTab,
  AnotacoesTab,
  ContasBancariasTab, DocumentosPessoaisTab, EstagiarioTab, HistoricoContratosTab,
  ColaboradorHistory, BeneficiosTab, ColaboradorDocuments,
  TrabalhoHierarquiaTab, JornadaPontoTab, FeriasResumoTab, HoleritesTab,
  FinanceiroKpiRow, ResumoRemuneracaoCard, HoleritesPreviewCard, FinanceiroPendenciasCard,
  DesenvolvimentoResumoTab, ComplianceTab, TimelineFuncionalTab,
  PendenciasDialog, type PendenciaItem,
  ProximosEventosDialog, type EventoDetalhado,
} from '@/components/colaborador-detalhes';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatedCascadeDialog } from '@/components/ui/animated-cascade-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import { motion, useInView } from 'framer-motion';
import { cardVariants } from '@/components/dashboard/MetricCard';

// Mesma animação de entrada dos cards do Dashboard Executivo/dashboard
// principal — fade + slide-up com stagger por índice (ver MetricCard.tsx).
const MotionCard = motion.create(Card);

const TIPO_CONTRATO_LABEL: Record<string, string> = {
  clt: 'CLT',
  pj: 'PJ',
  estagio: 'Estágio',
  temporario: 'Temporário',
  intermitente: 'Intermitente',
  jovem_aprendiz: 'Jovem Aprendiz',
};

// Derivado da data de admissão real — nunca fixo/fictício.
function formatTempoCasa(dataAdmissao?: string | null): string | null {
  if (!dataAdmissao) return null;
  const inicio = new Date(dataAdmissao);
  if (Number.isNaN(inicio.getTime())) return null;
  const hoje = new Date();
  let anos = hoje.getFullYear() - inicio.getFullYear();
  let meses = hoje.getMonth() - inicio.getMonth();
  if (hoje.getDate() < inicio.getDate()) meses -= 1;
  if (meses < 0) { anos -= 1; meses += 12; }
  if (anos < 0) return null;
  const partes: string[] = [];
  if (anos > 0) partes.push(`${anos} ${anos === 1 ? 'ano' : 'anos'}`);
  if (meses > 0 || anos === 0) partes.push(`${meses} ${meses === 1 ? 'mês' : 'meses'}`);
  return partes.join(' e ');
}

// Usados nas descrições detalhadas do popup de Pendências — mesma
// formatação pt-BR já usada no resto da página, só reaproveitada aqui
// como helpers para não repetir `new Date(...).toLocaleDateString(...)`
// dentro de cada `.map()` das pendências.
function formatarDataBR(dataISO?: string | null): string {
  if (!dataISO) return '—';
  const data = new Date(dataISO);
  if (Number.isNaN(data.getTime())) return '—';
  return data.toLocaleDateString('pt-BR');
}

function formatarDataHoraBR(dataISO?: string | null): string {
  if (!dataISO) return '—';
  const data = new Date(dataISO);
  if (Number.isNaN(data.getTime())) return '—';
  return data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Dias corridos entre a data informada e hoje — usado para dizer "vencido
// há N dias" / "N dias de atraso" nas pendências.
function diasDesde(dataISO?: string | null): number | null {
  if (!dataISO) return null;
  const data = new Date(dataISO);
  if (Number.isNaN(data.getTime())) return null;
  const hoje = new Date();
  const msPorDia = 1000 * 60 * 60 * 24;
  return Math.max(0, Math.floor((hoje.setHours(0, 0, 0, 0) - data.setHours(0, 0, 0, 0)) / msPorDia));
}

// Inverso do anterior — dias entre hoje e uma data futura, usado no popup
// de Próximos Eventos ("em N dias"). `T00:00:00` evita o typo clássico de
// `new Date('YYYY-MM-DD')` cair um dia antes em fusos negativos (BRT).
function diasAte(dataISO?: string | null): number | null {
  if (!dataISO) return null;
  const data = new Date(`${dataISO}T00:00:00`);
  if (Number.isNaN(data.getTime())) return null;
  const hoje = new Date();
  const msPorDia = 1000 * 60 * 60 * 24;
  return Math.round((data.setHours(0, 0, 0, 0) - hoje.setHours(0, 0, 0, 0)) / msPorDia);
}

// Data por extenso (ex.: "Quinta-feira, 1 de outubro de 2026") — o popup
// de Próximos Eventos mostra a data completa, não só dia/mês como no
// card compacto.
function formatarDataExtensoBR(dataISO?: string | null): string {
  if (!dataISO) return '—';
  const data = new Date(`${dataISO}T00:00:00`);
  if (Number.isNaN(data.getTime())) return '—';
  const texto = data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// "Hoje" / "Amanhã" / "Em N dias" — mesmo texto usado pelo `countdownBadge`
// de useProximosEventos.ts, só que aqui sempre calculado (o badge, pra
// férias já programadas, mostra o status "Aprovado"/"Pendente" em vez da
// contagem, mas o popup quer as duas informações lado a lado).
function quandoLabel(dataISO: string): string {
  const dias = diasAte(dataISO);
  if (dias === null) return '';
  if (dias <= 0) return 'Hoje';
  if (dias === 1) return 'Amanhã';
  return `Em ${dias} dias`;
}

// Explica o que o evento significa e por que o prazo importa — texto
// específico por `tipo` (ver useProximosEventos.ts), no mesmo espírito do
// `contexto` das Pendências.
function contextoEvento(tipo: string, categoria: string, badgeLabel: string): string {
  switch (tipo) {
    case 'experiencia':
      return 'Data em que o período de experiência do colaborador termina. É preciso decidir e formalizar antes disso se haverá efetivação, uma prorrogação (dentro do limite legal de 90 dias no total) ou desligamento — sem isso, o contrato pode virar prazo indeterminado automaticamente.';
    case 'ferias_vencimento':
      return 'Prazo final (período concessivo) para o colaborador usufruir as férias do período aquisitivo já completo. Se não forem concedidas até essa data, a empresa fica obrigada a pagá-las em dobro (art. 137 da CLT).';
    case 'ferias_inicio':
      return `Data de início das férias já programadas para o colaborador (${categoria}). Status atual: ${badgeLabel}.`;
    case 'aso':
      return 'Data em que a validade do ASO/exame periódico atual expira. É preciso agendar o próximo exame ocupacional antes disso para manter a conformidade com o PCMSO (NR-7) e evitar que o colaborador fique com o ASO vencido.';
    case 'documento':
      return 'Data de validade do documento pessoal cadastrado. Deve ser atualizado antes do vencimento para não travar processos de compliance, benefícios ou auditorias.';
    case 'onboarding':
      return 'Prazo da tarefa do plano de integração (onboarding) do colaborador. Se não for concluída até essa data, ela passa a contar como tarefa atrasada.';
    default:
      return '';
  }
}

// Ícone por tipo de evento — mesma lógica visual usada nas Pendências,
// só que cobrindo os 6 tipos que useProximosEventos.ts pode gerar.
function iconeEvento(tipo: string): typeof Calendar {
  switch (tipo) {
    case 'experiencia':
    case 'onboarding':
      return GraduationCap;
    case 'aso':
      return HeartPulse;
    case 'documento':
      return FileText;
    default:
      return Calendar;
  }
}

// Informações integradas em grid — sem mini-card/borda por campo (só
// tipografia), como pede a referência.
function CampoResumo({ label, valor, icon: Icon }: { label: string; valor: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-32 shrink-0">{label}</span>
      <span className="font-semibold text-xs flex items-center gap-1 min-w-0">
        {Icon && <Icon className="h-3 w-3 text-muted-foreground shrink-0" />}
        <span className="truncate">{valor ?? '—'}</span>
      </span>
    </div>
  );
}

function GestorResumo({ gestor }: { gestor?: { nome_completo?: string; cargo?: string; foto_url?: string } | null }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-32 shrink-0">Gestor direto</span>
      {gestor ? (
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="h-6 w-6 rounded-full bg-muted overflow-hidden shrink-0 border border-border/30 flex items-center justify-center">
            {gestor.foto_url ? (
              <img src={gestor.foto_url} alt={gestor.nome_completo} className="h-full w-full object-cover" />
            ) : (
              <UserIcon className="h-3 w-3 text-muted-foreground/40" />
            )}
          </div>
          <div className="min-w-0 text-left">
            <p className="font-semibold text-xs truncate">{gestor.nome_completo}</p>
            <p className="text-[10px] text-muted-foreground truncate">{gestor.cargo}</p>
          </div>
        </div>
      ) : (
        <span className="font-semibold text-xs text-muted-foreground">Não definido</span>
      )}
    </div>
  );
}

function MiniStat({
  icon: Icon, label, value, sublabel, tone,
  labelSize = 'text-xs', valueSize = 'text-base', sublabelSize = 'text-[10px]',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  sublabel?: React.ReactNode;
  tone?: 'success' | 'destructive';
  /** Tamanhos tipográficos independentes por card — o próprio card (círculo
   * do ícone, paddings) NUNCA muda, só a tipografia interna de cada um. */
  labelSize?: string;
  valueSize?: string;
  sublabelSize?: string;
}) {
  const toneClass = tone === 'success' ? 'text-success' : tone === 'destructive' ? 'text-destructive' : 'text-info';
  // Textos de valor muito longos (ex.: tipo de afastamento) encolhem a fonte
  // o suficiente pra caber numa linha só, sem nunca cortar a informação nem
  // mudar a altura do card — os demais valores (curtos) não são afetados.
  const valueLength = typeof value === 'string' ? value.length : 0;
  const autoValueSize = valueLength > 24 ? 'text-[9px]' : valueLength > 16 ? 'text-[11px]' : valueSize;
  return (
    <div className="flex items-center gap-2 py-2 px-2.5 bg-background/70 rounded-xl border border-border/30">
      <div className={`h-8 w-8 rounded-full bg-current/10 flex items-center justify-center shrink-0 ${toneClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 text-left">
        <p className={`${labelSize} text-muted-foreground truncate`}>{label}</p>
        <p className={`font-display font-semibold leading-tight whitespace-nowrap ${autoValueSize} ${toneClass}`}>{value}</p>
        {sublabel && <p className={`${sublabelSize} text-muted-foreground truncate`}>{sublabel}</p>}
      </div>
    </div>
  );
}

/** Anel de progresso (donut) só com SVG — sem depender de lib de gráfico
 * pra um indicador de um valor só (% de cadastro preenchido). Traçado
 * progressivo do `strokeDasharray` (0 → valor final) via Framer Motion —
 * mesmo mecanismo do `DonutChart` do card "Departamentos" do dashboard. */
function DonutProgress({ value, size = 60, strokeWidth = 7 }: { value: number; size?: number; strokeWidth?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const isInView = useInView(ref, { once: true });
  const clamped = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressLength = (clamped / 100) * circumference;
  const dashArray = `${progressLength} ${circumference - progressLength}`;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg ref={ref} width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-border/40" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="stroke-success"
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: isInView ? dashArray : `0 ${circumference}` }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
        />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center font-display font-bold text-success ${size >= 70 ? 'text-base' : 'text-sm'}`}>
        {clamped}%
      </span>
    </div>
  );
}

export default function ColaboradorDetalhesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeMainTab, setActiveMainTab] = useState('geral');
  const [activeDocumentosTab, setActiveDocumentosTab] = useState('pessoais');
  const [activeTimelineTab, setActiveTimelineTab] = useState('funcional');
  const [recontratarOpen, setRecontratarOpen] = useState(false);
  const [pendenciasOpen, setPendenciasOpen] = useState(false);
  const [eventosOpen, setEventosOpen] = useState(false);
  // "Financeiro & Benefícios" é um dashboard único — Dados bancários, Resumo,
  // Benefícios, Holerites e Pendências ficam todos visíveis ao mesmo tempo,
  // sem sub-abas. "Ver todos" (no card "Holerites recentes") abre a lista
  // completa neste dialog.
  const [holeritesDialogOpen, setHoleritesDialogOpen] = useState(false);

  // colaboradorService.buscarPorId cai nos 12 colaboradores fictícios de
  // src/mocks/colaboradoresMock.ts quando VITE_COLABORADORES_MOCK=true (dev only).
  const { data: colaborador, isLoading } = useQuery({
    queryKey: ['colaborador', id],
    queryFn: () => (colaboradorService as any).buscarPorId(id!),
    enabled: !!id});

  useDataAccessLog('colaboradores', id, colaborador?.empresa_id);

  // Resumo: cargo (para CBO real via cargos.cbo) e local de trabalho —
  // só buscados quando o colaborador tiver de fato cargo_id/local_trabalho_id
  // preenchidos (nenhum formulário atual popula esses FKs ainda — ver PARTE 2/3).
  const { data: cargoDetalhe } = useQuery({
    queryKey: ['cargo-resumo', colaborador?.cargo_id],
    queryFn: () => cargoService.buscarPorId(colaborador.cargo_id, colaborador.empresa_id),
    enabled: !!colaborador?.cargo_id});

  const { data: localTrabalhoDetalhe } = useQuery({
    queryKey: ['local-trabalho-resumo', colaborador?.local_trabalho_id],
    queryFn: () => localTrabalhoService.buscarPorId(colaborador.local_trabalho_id, colaborador.empresa_id),
    enabled: !!colaborador?.local_trabalho_id});

  const { data: gestorDetalhe } = useQuery({
    queryKey: ['gestor-resumo', colaborador?.supervisor_id],
    queryFn: () => (colaboradorService as any).buscarPorId(colaborador.supervisor_id, colaborador.empresa_id),
    enabled: !!colaborador?.supervisor_id});

  const proximosEventos = useProximosEventos(id ?? '', colaborador?.empresa_id);

  // Versão rica dos Próximos Eventos pro popup "Ver todos" — mesmos eventos
  // do card compacto, com data por extenso, contagem de dias e uma
  // explicação do que é/por que o prazo importa por tipo de evento, além
  // de saber pra onde levar ao clicar (mesmo princípio das Pendências).
  const eventosDetalhados: EventoDetalhado[] = proximosEventos.map((evento) => ({
    icon: iconeEvento(evento.tipo),
    titulo: evento.titulo,
    categoria: evento.categoria,
    dataFormatada: formatarDataExtensoBR(evento.data),
    quandoLabel: quandoLabel(evento.data),
    badge: evento.badge,
    contexto: contextoEvento(evento.tipo, evento.categoria, evento.badge.label),
    onClick: () => {
      switch (evento.tipo) {
        case 'experiencia':
          setActiveMainTab('desenvolvimento');
          break;
        case 'ferias_vencimento':
          setActiveMainTab('ferias');
          break;
        case 'ferias_inicio':
          setActiveMainTab('ferias');
          break;
        case 'aso':
          navigate('/sst');
          break;
        case 'documento':
          setActiveMainTab('documentos');
          break;
        case 'onboarding':
          setActiveMainTab('desenvolvimento');
          break;
        default:
          setActiveMainTab('ferias');
      }
    },
  }));

  // "Situação Atual" / "Pendências" (Resumo) reaproveitam as mesmas query keys
  // das abas Jornada & Ponto / Férias & Afastamentos / Desenvolvimento / SST —
  // sem refetch ao trocar de aba.
  const { empresaAtual } = useEmpresas();
  const { data: saldoBancoHoras } = useSaldoBancoHoras(id ?? '');
  const { data: feriasResumo } = useFeriasResumoColaborador(id ?? '', empresaAtual?.id);
  const { data: afastamentosRecentes } = useAfastamentosRecentes(id ?? '', 365);
  const { data: times } = useTimes(colaborador?.empresa_id);
  const { data: asos } = useASOs(id ?? '');
  const { data: documentosPessoais } = useDocumentosPessoais(id ?? '');
  const { solicitacoes: ajustesPonto } = usePontoMelhorado(empresaAtual?.id, id ?? '');
  const onboarding = useOnboardingColaborador(id ?? '');

  const hoje = todayLocalISO();
  const proximaFerias = (feriasResumo || [])
    .filter((f: any) => ['pendente', 'aprovada'].includes(f.status) && f.data_inicio >= hoje)
    .sort((a: any, b: any) => a.data_inicio.localeCompare(b.data_inicio))[0];
  const afastamentoAtual = (afastamentosRecentes || []).find((a: any) => !a.data_fim_real);
  const timeDetalhe = (times as any[] | undefined)?.find((t) => t.id === colaborador?.time_id);

  const ajustesPontoPendentes = (ajustesPonto || []).filter((s: any) => s.status === 'enviado');
  const asosVencidos = (asos || []).filter((a: any) => a.data_validade && a.data_validade < hoje);
  const documentosVencidos = (documentosPessoais || []).filter((d: any) => d.data_validade && d.data_validade < hoje);

  // Somente sinais reais de "precisa de ação agora" (nada company-wide, nada
  // inventado): ajustes de ponto aguardando aprovação, tarefas de onboarding
  // atrasadas, ASOs e documentos pessoais já vencidos.
  // Cada pendência sabe pra onde levar ao ser clicada — abas internas do
  // dossiê (setActiveMainTab) ou, no caso de ASO, o módulo SST/Saúde
  // Ocupacional de verdade (rota própria em /sst — não existe mais aba
  // "SST" aqui dentro do dossiê do colaborador).
  // `contexto` explica o "porquê"/prazo de forma genérica pro tipo de
  // pendência; `itens` lista cada ocorrência específica (o quê, quando,
  // onde) pra dar informação suficiente pra resolver sem precisar abrir
  // mais nada — usado só no popup "Ver todas".
  const pendencias = [
    ajustesPontoPendentes.length > 0 && {
      icon: Clock,
      texto: `${ajustesPontoPendentes.length} ajuste${ajustesPontoPendentes.length > 1 ? 's' : ''} de ponto pendente${ajustesPontoPendentes.length > 1 ? 's' : ''}`,
      contexto: 'Correções de marcação de ponto enviadas pelo colaborador e que aguardam aprovação do gestor. Enquanto pendente, o registro original permanece divergente e pode atrasar o fechamento da folha do período.',
      itens: ajustesPontoPendentes.map((s: any) =>
        `${formatarDataBR(s.data_ponto)} — ${s.tipo_ponto === 'entrada' ? 'Entrada' : 'Saída'}: ${s.hora_original ?? '—'} → ${s.hora_sugerida}${s.motivo ? ` (motivo: ${s.motivo})` : ''}, enviado em ${formatarDataHoraBR(s.created_at)}`
      ),
      onClick: () => setActiveMainTab('jornada'),
      severidade: 'media' as const,
    },
    onboarding.atrasadas.length > 0 && {
      icon: GraduationCap,
      texto: `${onboarding.atrasadas.length} tarefa${onboarding.atrasadas.length > 1 ? 's' : ''} de onboarding atrasada${onboarding.atrasadas.length > 1 ? 's' : ''}`,
      contexto: 'Tarefas do plano de integração do colaborador que já passaram do prazo sem serem concluídas. O atraso pode travar a liberação de acessos, equipamentos ou benefícios previstos para o período de adaptação.',
      itens: onboarding.atrasadas.map((t: any) => {
        const dias = diasDesde(t.data_prazo);
        return `${t.titulo}${t.categoria ? ` (${t.categoria})` : ''} — prazo era ${formatarDataBR(t.data_prazo)}${dias !== null ? `, ${dias} dia${dias === 1 ? '' : 's'} de atraso` : ''}`;
      }),
      onClick: () => setActiveMainTab('desenvolvimento'),
      severidade: 'alta' as const,
    },
    asosVencidos.length > 0 && {
      icon: HeartPulse,
      texto: `${asosVencidos.length} ASO${asosVencidos.length > 1 ? 's' : ''} vencido${asosVencidos.length > 1 ? 's' : ''}`,
      contexto: 'Atestado de Saúde Ocupacional com validade expirada. Pela NR-7 (PCMSO), o colaborador não deve permanecer em atividade sem um ASO válido — é preciso agendar um novo exame ocupacional o quanto antes para regularizar e evitar risco trabalhista.',
      itens: asosVencidos.map((a: any) => {
        const dias = diasDesde(a.data_validade);
        return `${a.tipo} — validade venceu em ${formatarDataBR(a.data_validade)}${dias !== null ? ` (há ${dias} dia${dias === 1 ? '' : 's'})` : ''}, exame realizado em ${formatarDataBR(a.data_exame)}${a.medico_nome ? ` por ${a.medico_nome}` : ''}${a.clinica ? ` na ${a.clinica}` : ''}`;
      }),
      onClick: () => navigate('/sst'),
      severidade: 'alta' as const,
    },
    documentosVencidos.length > 0 && {
      icon: FileText,
      texto: `${documentosVencidos.length} documento${documentosVencidos.length > 1 ? 's' : ''} pessoal${documentosVencidos.length > 1 ? 'is' : ''} vencido${documentosVencidos.length > 1 ? 's' : ''}`,
      contexto: 'Documento pessoal cadastrado com validade expirada. Um documento vencido pode travar processos de compliance, geração de benefícios ou auditorias — vale pedir a atualização ao colaborador o quanto antes.',
      itens: documentosVencidos.map((d: any) => {
        const dias = diasDesde(d.data_validade);
        return `${d.tipo_documento}${d.numero ? ` nº ${d.numero}` : ''} — validade venceu em ${formatarDataBR(d.data_validade)}${dias !== null ? ` (há ${dias} dia${dias === 1 ? '' : 's'})` : ''}${d.orgao_emissor ? `, emitido por ${d.orgao_emissor}` : ''}`;
      }),
      onClick: () => setActiveMainTab('documentos'),
      severidade: 'media' as const,
    },
  ].filter(Boolean) as PendenciaItem[];

  // Cadastro do colaborador: nenhum % pronto existe no backend para
  // `colaboradores` — calculado só no frontend a partir de campos reais já
  // carregados nesta página (mesmo princípio do indicador de PortalOverviewTab,
  // adaptado aos campos deste registro).
  const camposCadastro: [string, unknown][] = [
    ['Foto', colaborador?.foto_url],
    ['E-mail', colaborador?.email],
    ['Telefone', colaborador?.telefone],
    ['Matrícula', colaborador?.matricula],
    ['Endereço', colaborador?.cidade && colaborador?.uf],
    ['Observações', colaborador?.observacoes],
  ];
  const camposPreenchidos = camposCadastro.filter(([, v]) => !!v);
  const cadastroCompletude = Math.round((camposPreenchidos.length / camposCadastro.length) * 100);
  const camposFaltantes = camposCadastro.length - camposPreenchidos.length;

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;
  if (!colaborador) return <div className="p-6">Colaborador não encontrado</div>;

  return (
    <>
      <PageTitle title="Dossiê do Colaborador" description="Visão 360º do colaborador" />
      <PageLayout>
        {/* Hero + tabs agrupados num único wrapper para controlar a distância
            entre eles diretamente (o space-y-6 do PageLayout, pensado para o
            espaçamento padrão entre seções, ficava grande demais aqui). */}
        <div className="space-y-3">
        {/* Hero — identidade completa (voltar, avatar, nome, status, cargo/depto,
            metadados, ações) em uma única faixa. O header global (topbar + seu
            próprio breadcrumb/voltar) continua intacto acima; este bloco NÃO
            duplica breadcrumb — só concentra a identidade do colaborador. */}
        <div className="pt-5 sm:pt-6 pb-5 sm:pb-6 pr-5 sm:pr-6 pl-2 sm:pl-3">
            {/* Duas faixas empilhadas até 'xl' (a sidebar já consome ~256px do
                viewport, então breakpoints de largura de tela ficam otimistas
                para o espaço real do conteúdo) — lado a lado só quando sobra
                espaço de verdade, para o bloco de identidade nunca ser
                espremido pelas ações à direita. */}
            <div className="flex flex-col xl:flex-row xl:items-center gap-5">
              <div className="flex items-start gap-5 flex-1 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(-1)}
                  className="h-10 w-10 rounded-xl border border-border/30 hover:border-primary/30 hover:bg-primary/5 shrink-0"
                  aria-label="Voltar"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>

                <motion.div
                  className="relative shrink-0"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                >
                  <div className="h-24 w-24 rounded-2xl bg-muted flex items-center justify-center border-2 border-border/30 overflow-hidden">
                    <UserIcon className="h-10 w-10 text-muted-foreground/30" />
                    {colaborador.foto_url && <img src={colaborador.foto_url} alt={colaborador.nome_completo} className="h-full w-full object-cover" />}
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-success border-2 border-card flex items-center justify-center">
                    <ShieldCheck className="h-3 w-3 text-white" />
                  </div>
                </motion.div>

                <div className="flex-1 min-w-0 space-y-2">
                  <motion.div
                    className="flex items-center gap-2.5 flex-wrap"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.25, ease: 'easeOut' }}
                  >
                    <h1 className="text-2xl font-display font-medium tracking-tight">{colaborador.nome_completo}</h1>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${colaborador.status === 'ativo' ? 'border-success/40 bg-success/10 text-success' : 'border-border text-muted-foreground'}`}>
                      <span className={`h-2 w-2 rounded-full ${colaborador.status === 'ativo' ? 'bg-success' : 'bg-muted-foreground'}`} />
                      {colaborador.status.charAt(0).toUpperCase() + colaborador.status.slice(1)}
                    </span>
                  </motion.div>
                  <motion.p
                    className="text-base text-muted-foreground font-body"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.5, ease: 'easeOut' }}
                  >
                    {colaborador.cargo}{colaborador.departamento ? ` | ${colaborador.departamento}` : ''}
                  </motion.p>
                  <motion.div
                    className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted-foreground"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.75, ease: 'easeOut' }}
                  >
                    {colaborador.matricula && (
                      <>
                        <span className="flex items-center gap-1.5 font-mono">
                          <IdCard className="h-3.5 w-3.5" /> {colaborador.matricula}
                        </span>
                        <span className="opacity-40">•</span>
                      </>
                    )}
                    {colaborador.tipo_contrato && (
                      <>
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="h-3.5 w-3.5" /> {TIPO_CONTRATO_LABEL[colaborador.tipo_contrato] ?? colaborador.tipo_contrato}
                        </span>
                        <span className="opacity-40">•</span>
                      </>
                    )}
                    {(localTrabalhoDetalhe?.nome ?? colaborador.local_trabalho) && (
                      <>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" /> {localTrabalhoDetalhe?.nome ?? colaborador.local_trabalho}
                        </span>
                        <span className="opacity-40">•</span>
                      </>
                    )}
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      Desde {colaborador.data_admissao ? new Date(colaborador.data_admissao).toLocaleDateString('pt-BR') : '—'}
                      {formatTempoCasa(colaborador.data_admissao) ? ` (${formatTempoCasa(colaborador.data_admissao)})` : ''}
                    </span>
                  </motion.div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-4 pl-[60px] xl:pl-0">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="rounded-xl border-primary/30 text-primary hover:bg-primary/5"
                    onClick={() => navigate(`/colaboradores/editar/${id}`)}
                  >
                    <Edit className="h-4 w-4 mr-1.5" /> Editar Perfil
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="rounded-xl">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem className="gap-2 cursor-pointer">
                        <FileText className="h-4 w-4" /> Exportar Ficha (PDF)
                      </DropdownMenuItem>
                      {colaborador?.status === 'desligado' && (
                        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setRecontratarOpen(true)}>
                          <UserPlus className="h-4 w-4" /> Recontratar Colaborador
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="gap-2 cursor-pointer text-destructive">
                        <MoreHorizontal className="h-4 w-4" /> Outras Ações
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
        </div>

        {/* Master Tabs — a linha de abas (List/Trigger) usa o mecanismo
            oficial do Animate UI (AnimatedDossieTabs, mode="parent") pro
            highlight deslizante; o Tabs/TabsContent do Radix por fora
            continua exatamente como estava, controlando o conteúdo das
            páginas sem nenhuma animação. */}
        <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="space-y-2">
          <AnimatedDossieTabsList value={activeMainTab} onValueChange={setActiveMainTab}>
            <AnimatedDossieTabsTrigger value="geral">
              <Info className="h-3.5 w-3.5" /> Resumo
            </AnimatedDossieTabsTrigger>
            <AnimatedDossieTabsTrigger value="pessoal">
              <Users className="h-3.5 w-3.5" /> Dados Pessoais
            </AnimatedDossieTabsTrigger>
            <AnimatedDossieTabsTrigger value="hierarquia">
              <Briefcase className="h-3.5 w-3.5" /> Trabalho &amp; Hierarquia
            </AnimatedDossieTabsTrigger>
            <AnimatedDossieTabsTrigger value="jornada">
              <Clock className="h-3.5 w-3.5" /> Jornada &amp; Ponto
            </AnimatedDossieTabsTrigger>
            <AnimatedDossieTabsTrigger value="ferias">
              <Calendar className="h-3.5 w-3.5" /> Férias &amp; Afastamentos
            </AnimatedDossieTabsTrigger>
            <AnimatedDossieTabsTrigger value="financeiro">
              <Landmark className="h-3.5 w-3.5" /> Financeiro &amp; Benefícios
            </AnimatedDossieTabsTrigger>
            <AnimatedDossieTabsTrigger value="desenvolvimento">
              <GraduationCap className="h-3.5 w-3.5" /> Desenvolvimento
            </AnimatedDossieTabsTrigger>
            <AnimatedDossieTabsTrigger value="documentos">
              <FileText className="h-3.5 w-3.5" /> Documentos &amp; Compliance
            </AnimatedDossieTabsTrigger>
            <AnimatedDossieTabsTrigger value="timeline">
              <HistoryIcon className="h-3.5 w-3.5" /> Timeline
            </AnimatedDossieTabsTrigger>
          </AnimatedDossieTabsList>

          <TabsContent value="geral">
            {activeMainTab === 'geral' && (
              <div className="space-y-5">
              {/* Primeira fileira — Informações Profissionais e Próximos Eventos
                  isolados num grid próprio (items-stretch) para terem sempre a
                  mesma altura, independente de qual tiver mais conteúdo. */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
                <div className="lg:col-span-2">
                  <MotionCard custom={0} initial="hidden" animate="visible" variants={cardVariants} className="h-full border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
                    <CardContent className="pt-3 px-4 pb-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-display font-medium">
                          <Users className="h-5 w-5 text-primary" /> Informações Profissionais
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-sm rounded-xl border-primary/40 bg-transparent text-primary hover:bg-primary/5 hover:text-primary"
                          onClick={() => navigate(`/colaboradores/editar/${id}`)}
                        >
                          <Edit className="h-3.5 w-3.5 mr-1" /> Editar
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                        <div className="space-y-4">
                          <CampoResumo label="Cargo" valor={cargoDetalhe?.nome ?? colaborador.cargo} />
                          <CampoResumo label="Departamento" valor={colaborador.departamento} />
                          <GestorResumo gestor={gestorDetalhe} />
                          <CampoResumo label="Time" valor={timeDetalhe?.nome} />
                        </div>
                        <div className="space-y-4">
                          <CampoResumo
                            icon={MapPin}
                            label="Local de trabalho"
                            valor={localTrabalhoDetalhe
                              ? `${localTrabalhoDetalhe.nome}${localTrabalhoDetalhe.cidade ? ` — ${localTrabalhoDetalhe.cidade}/${localTrabalhoDetalhe.uf}` : ''}`
                              : (colaborador.local_trabalho ?? 'Não definido')}
                          />
                          <CampoResumo label="Centro de custo" valor={colaborador.centro_custo} />
                          <CampoResumo icon={Mail} label="Email profissional" valor={colaborador.email || 'Não informado'} />
                          <CampoResumo label="CBO" valor={cargoDetalhe?.cbo ?? colaborador.cbo} />
                        </div>
                      </div>
                    </CardContent>
                  </MotionCard>
                </div>

                <div>
                  <MotionCard custom={1} initial="hidden" animate="visible" variants={cardVariants} className="h-full border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
                    <CardContent className="pt-4 px-5 pb-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-display font-medium">
                          <Calendar className="h-5 w-5 text-primary" /> Próximos Eventos
                        </div>
                        <button
                          type="button"
                          onClick={() => setEventosOpen(true)}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Ver todos
                        </button>
                      </div>
                      {/* max-height fixo + scroll interno — o card não cresce além
                          do tamanho original, mesmo com vários eventos. */}
                      <div className="space-y-2.5 max-h-[268px] overflow-y-scroll pr-1">
                        {proximosEventos.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Nenhum evento futuro identificado.</p>
                        ) : proximosEventos.slice(0, 6).map((evento, i) => {
                          const d = new Date(`${evento.data}T00:00:00`);
                          const dia = Number.isNaN(d.getTime()) ? '—' : String(d.getDate()).padStart(2, '0');
                          const mes = Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();
                          return (
                            <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-background/70 border border-border/30 hover:border-primary/20 hover:bg-muted/30 transition-colors">
                              <div className="h-11 w-11 rounded-lg bg-info/10 border border-info/20 flex flex-col items-center justify-center shrink-0 leading-none">
                                <span className="text-sm font-display font-semibold text-info">{dia}</span>
                                <span className="text-[9px] font-medium text-info/80">{mes}</span>
                              </div>
                              <div className="min-w-0 flex-1 space-y-1">
                                <p className="text-xs font-medium truncate">{evento.titulo}</p>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-muted-foreground truncate">{evento.categoria}</span>
                                  <Badge variant={evento.badge.tone} size="sm" className="shrink-0">{evento.badge.label}</Badge>
                                </div>
                              </div>
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </MotionCard>
                </div>
              </div>

              {/* Restante das colunas — resto do conteúdo auxiliar, fora do
                  grid da primeira fileira (que só existe pra igualar altura).
                  Situação Atual é um card independente, com altura própria —
                  não fica em nenhum grid items-stretch/h-full. */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-5">
                  <MotionCard custom={2} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
                    <CardContent className="pt-4 px-5 pb-5 space-y-3">
                      <div className="flex items-center gap-2 font-display font-medium">
                        <BarChart3 className="h-5 w-5 text-primary" /> Situação Atual
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <MiniStat
                          icon={Clock}
                          label="Jornada"
                          value={colaborador.jornada_semanal ? `${colaborador.jornada_semanal}h/semana` : '—'}
                          sublabel={colaborador.horario_entrada && colaborador.horario_saida
                            ? `${colaborador.horario_entrada.slice(0, 5)} – ${colaborador.horario_saida.slice(0, 5)}`
                            : 'Horário não definido'}
                        />
                        <MiniStat
                          icon={ArrowLeftRight}
                          label="Banco de horas"
                          value={saldoBancoHoras === undefined ? '—' : `${Number(saldoBancoHoras) >= 0 ? '+' : ''}${Number(saldoBancoHoras).toFixed(2)}h`}
                          sublabel={saldoBancoHoras === undefined ? 'Sem registros' : (Number(saldoBancoHoras) < 0 ? 'Saldo negativo' : 'Saldo positivo')}
                          tone={saldoBancoHoras !== undefined ? (Number(saldoBancoHoras) < 0 ? 'destructive' : 'success') : undefined}
                        />
                        <MiniStat
                          icon={Calendar}
                          label="Férias"
                          value={proximaFerias ? `${proximaFerias.dias_gozo} dias` : 'Nenhuma'}
                          sublabel={proximaFerias ? 'Programadas' : 'Sem programação'}
                        />
                        <MiniStat
                          icon={Activity}
                          label="Afastamento"
                          value={afastamentoAtual ? afastamentoAtual.tipo : 'Nenhum'}
                          sublabel={afastamentoAtual ? 'Ativo' : 'Nenhum registro'}
                          tone={afastamentoAtual ? 'destructive' : undefined}
                        />
                      </div>
                    </CardContent>
                  </MotionCard>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-5">
                  <MotionCard custom={3} initial="hidden" animate="visible" variants={cardVariants} className="sm:col-span-3 border border-border/30 rounded-2xl overflow-hidden shadow-elevated flex flex-col justify-center">
                    <CardContent className="pt-4 px-5 pb-5 space-y-3">
                      <div className="flex items-center gap-2 font-display font-medium text-sm">
                        <Briefcase className="h-5 w-5 text-primary" /> Resumo de Vínculo
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {colaborador.tipo_contrato && (
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Tipo de vínculo</p>
                            <p className="text-sm font-semibold mt-0.5 truncate">
                              {TIPO_CONTRATO_LABEL[colaborador.tipo_contrato] ?? colaborador.tipo_contrato}
                            </p>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Admissão</p>
                          <p className="text-sm font-semibold mt-0.5">
                            {colaborador.data_admissao ? new Date(colaborador.data_admissao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\.?\s*\bde\b\s*/gi, ' ').replace(/\s+/g, ' ').trim() : '—'}
                          </p>
                          {formatTempoCasa(colaborador.data_admissao) && (
                            <p className="text-xs text-muted-foreground mt-0.5">{formatTempoCasa(colaborador.data_admissao)}</p>
                          )}
                        </div>
                        {colaborador.jornada_semanal && (
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Jornada</p>
                            <p className="text-sm font-semibold mt-0.5">{colaborador.jornada_semanal}h semanais</p>
                            {colaborador.horario_entrada && colaborador.horario_saida && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {colaborador.horario_entrada.slice(0, 2)}h às {colaborador.horario_saida.slice(0, 2)}h
                              </p>
                            )}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Situação</p>
                          <p className={`text-sm font-semibold mt-0.5 flex items-center gap-1.5 ${colaborador.status === 'ativo' ? 'text-success' : 'text-muted-foreground'}`}>
                            <span className={`h-2 w-2 rounded-full shrink-0 ${colaborador.status === 'ativo' ? 'bg-success' : 'bg-muted-foreground'}`} />
                            {colaborador.status.charAt(0).toUpperCase() + colaborador.status.slice(1)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {colaborador.status === 'ativo' ? 'Em atividade' : 'Inativo'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </MotionCard>

                  <MotionCard custom={4} initial="hidden" animate="visible" variants={cardVariants} className="sm:col-span-2 border border-border/30 rounded-2xl overflow-hidden shadow-elevated flex flex-col justify-center">
                    <CardContent className="pt-4 px-5 pb-5 space-y-2">
                      <div className="flex items-center gap-2 font-display font-medium text-sm">
                        <ClipboardCheck className="h-5 w-5 text-primary" /> Cadastro do Colaborador
                      </div>
                      <div className="flex items-center gap-3">
                        <DonutProgress value={cadastroCompletude} size={60} strokeWidth={7} />
                        <div className="min-w-0">
                          <p className="text-base font-semibold">
                            {camposFaltantes > 0 ? 'Perfil incompleto' : 'Perfil completo'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {camposFaltantes > 0
                              ? `${camposFaltantes} informaç${camposFaltantes > 1 ? 'ões' : 'ão'} pendente${camposFaltantes > 1 ? 's' : ''}`
                              : 'Todas as informações preenchidas'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </MotionCard>
                  </div>
                </div>

                {/* Coluna direita — ~34%, auxiliar */}
                <div className="space-y-5">
                  {/* Altura fixa calibrada pra igualar a altura natural do card
                      "Situação Atual" ao lado — sem grid items-stretch/h-full
                      (não pode depender ou afetar aquele card). */}
                  <MotionCard custom={5} initial="hidden" animate="visible" variants={cardVariants} className="h-[140px] border border-border/30 rounded-2xl overflow-hidden shadow-elevated flex flex-col">
                    <CardContent className="pt-4 px-5 pb-5 flex-1 flex flex-col min-h-0 space-y-3">
                      <div className="flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2 font-display font-medium">
                          <AlertTriangle className="h-5 w-5 text-warning" /> Pendências
                        </div>
                        {pendencias.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setPendenciasOpen(true)}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            Ver todas
                          </button>
                        )}
                      </div>
                      {/* scroll interno — a lista nunca ultrapassa a altura fixa
                          do card, não importa quantas pendências existam. */}
                      <div className="space-y-2 flex-1 min-h-0 overflow-y-scroll pr-1">
                        {pendencias.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Nenhuma pendência identificada.</p>
                        ) : pendencias.map((p, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={p.onClick}
                            className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-border/30 hover:border-primary/20 hover:bg-muted/20 transition-colors text-left"
                          >
                            <p.icon className={`h-4 w-4 shrink-0 ${p.severidade === 'alta' ? 'text-destructive' : 'text-warning'}`} />
                            <span className="text-xs font-medium flex-1 min-w-0 truncate">{p.texto}</span>
                            <Badge variant={p.severidade === 'alta' ? 'destructive' : 'warning'} size="sm">
                              {p.severidade === 'alta' ? 'Alta' : 'Média'}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </MotionCard>

                  <MotionCard custom={6} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
                    <CardContent className="pt-4 px-5 pb-5 space-y-3">
                      <div className="flex items-center gap-2 font-display font-medium">
                        <Zap className="h-5 w-5 text-primary" /> Ações Rápidas
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveMainTab('jornada')}
                          className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-border/30 bg-background/70 hover:border-primary/20 hover:bg-muted/20 transition-colors"
                        >
                          <Clock className="h-4 w-4 text-primary" />
                          <span className="text-[10px] font-medium text-center leading-tight">Ver Ponto</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveMainTab('ferias')}
                          className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-border/30 bg-background/70 hover:border-primary/20 hover:bg-muted/20 transition-colors"
                        >
                          <Calendar className="h-4 w-4 text-primary" />
                          <span className="text-[10px] font-medium text-center leading-tight">Ver Férias</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveMainTab('documentos')}
                          className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-border/30 bg-background/70 hover:border-primary/20 hover:bg-muted/20 transition-colors"
                        >
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="text-[10px] font-medium text-center leading-tight">Documentos</span>
                        </button>
                      </div>
                    </CardContent>
                  </MotionCard>
                </div>
              </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pessoal">
            {activeMainTab === 'pessoal' && <DadosPessoaisTab colaboradorId={id!} colaborador={colaborador} />}
          </TabsContent>

          <TabsContent value="hierarquia">
            {activeMainTab === 'hierarquia' && <TrabalhoHierarquiaTab colaboradorId={id!} />}
          </TabsContent>

          <TabsContent value="jornada">
            {activeMainTab === 'jornada' && <JornadaPontoTab colaboradorId={id!} />}
          </TabsContent>

          <TabsContent value="ferias">
            <FeriasResumoTab
              colaboradorId={id!}
              onVerTodosMarcos={() => { setActiveMainTab('timeline'); setActiveTimelineTab('funcional'); }}
            />
          </TabsContent>

          <TabsContent value="financeiro">
            <div className="space-y-3">
              {/* Linha 1 — 4 KPIs, sempre visível. */}
              <FinanceiroKpiRow colaboradorId={id!} colaborador={colaborador} />

              {/* Linha 2 — Dados bancários + Resumo da remuneração lado a lado. */}
              <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3 items-start">
                <ContasBancariasTab colaboradorId={id!} />
                <ResumoRemuneracaoCard colaboradorId={id!} colaborador={colaborador} />
              </div>

              {/* Linha 3 — Benefícios + Holerites recentes lado a lado. */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_1fr] gap-3 items-start">
                <BeneficiosTab colaboradorId={id!} />
                <HoleritesPreviewCard colaboradorId={id!} onVerTodos={() => setHoleritesDialogOpen(true)} />
              </div>

              {/* Linha 4 — Pendências e alertas, largura total. */}
              <FinanceiroPendenciasCard colaboradorId={id!} />
            </div>

            {/* Lista completa de holerites — mesma coreografia de abertura/
                fechamento do "Ver todas" das Pendências (AnimatedCascadeDialog):
                a prévia (linha 3) mostra os mais recentes, o dialog mostra
                todos, sem precisar de um painel dedicado que escondesse as
                outras seções. */}
            <AnimatedCascadeDialog
              open={holeritesDialogOpen}
              onOpenChange={setHoleritesDialogOpen}
              title="Holerites"
              titleIcon={DollarSign}
              emptyMessage="Nenhum holerite encontrado para este colaborador."
              items={[<HoleritesTab key="holerites" colaboradorId={id!} hideHeader />]}
              className="max-w-[620px]"
            />
          </TabsContent>

          <TabsContent value="desenvolvimento">
            {activeMainTab === 'desenvolvimento' && <DesenvolvimentoResumoTab colaboradorId={id!} />}
          </TabsContent>

          <TabsContent value="documentos">
            <Tabs value={activeDocumentosTab} onValueChange={setActiveDocumentosTab} className="space-y-4">
              <TabsList className="bg-transparent h-auto p-0 gap-4 border-b border-border/20 rounded-none w-full justify-start">
                <TabsTrigger value="pessoais" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Documentos Pessoais</TabsTrigger>
                <TabsTrigger value="anotacoes" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Anotações Internas</TabsTrigger>
                <TabsTrigger value="estagiario" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Dados Estagiário</TabsTrigger>
                <TabsTrigger value="compliance" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Compliance</TabsTrigger>
              </TabsList>
              <TabsContent value="pessoais">
                {activeDocumentosTab === 'pessoais' && (
                  <div className="space-y-8">
                    <DocumentosPessoaisTab colaboradorId={id!} />
                    <ColaboradorDocuments colaboradorId={id!} />
                  </div>
                )}
              </TabsContent>
              <TabsContent value="anotacoes">{activeDocumentosTab === 'anotacoes' && <AnotacoesTab colaboradorId={id!} />}</TabsContent>
              <TabsContent value="estagiario">{activeDocumentosTab === 'estagiario' && <EstagiarioTab colaboradorId={id!} />}</TabsContent>
              <TabsContent value="compliance">{activeDocumentosTab === 'compliance' && <ComplianceTab colaboradorId={id!} />}</TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="timeline">
            <Tabs value={activeTimelineTab} onValueChange={setActiveTimelineTab} className="space-y-4">
              <TabsList className="bg-transparent h-auto p-0 gap-4 border-b border-border/20 rounded-none w-full justify-start overflow-x-auto no-scrollbar">
                <TabsTrigger value="funcional" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Timeline Funcional</TabsTrigger>
                <TabsTrigger value="historico-salarial" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Histórico Salarial</TabsTrigger>
                <TabsTrigger value="contratos" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Contratos</TabsTrigger>
                <TabsTrigger value="auditoria" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Auditoria</TabsTrigger>
              </TabsList>
              <TabsContent value="funcional">{activeTimelineTab === 'funcional' && <TimelineFuncionalTab colaboradorId={id!} />}</TabsContent>
              <TabsContent value="historico-salarial">{activeTimelineTab === 'historico-salarial' && <HistoricoSalarialTab colaboradorId={id!} />}</TabsContent>
              <TabsContent value="contratos">{activeTimelineTab === 'contratos' && <HistoricoContratosTab colaboradorId={id!} />}</TabsContent>
              <TabsContent value="auditoria">{activeTimelineTab === 'auditoria' && <ColaboradorHistory colaboradorId={id!} />}</TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
        </div>
      </PageLayout>
      {colaborador && (
        <RecontratarColaboradorDialog
          colaborador={colaborador}
          open={recontratarOpen}
          onOpenChange={setRecontratarOpen}
        />
      )}

      {/* "Ver todas" das Pendências abre aqui — em popup, não navega para
          nenhuma aba. Cada item continua clicável e leva ao lugar certo
          (aba interna do dossiê ou módulo externo, como SST), fechando o
          popup em seguida. Animação de abrir/fechar (quadrado → barra →
          caixa cheia, conteúdo em cascata, tudo espelhado ao fechar) mora
          em PendenciasDialog — ver esse arquivo pra detalhes da coreografia. */}
      <PendenciasDialog open={pendenciasOpen} onOpenChange={setPendenciasOpen} pendencias={pendencias} />

      {/* "Ver todos" dos Próximos Eventos — mesma coreografia de
          abertura/fechamento acima (AnimatedCascadeDialog compartilhado),
          agora com data por extenso, contagem de dias e explicação do
          porquê de cada prazo. */}
      <ProximosEventosDialog open={eventosOpen} onOpenChange={setEventosOpen} eventos={eventosDetalhados} />
    </>
  );
}
