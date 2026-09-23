import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  Network, Briefcase, History, Edit, Building2, Users,
  User as UserIcon, Calendar, ArrowLeftRight, ArrowRight, Activity, Clock, Info, MapPin, IdCard,
} from 'lucide-react';
import { colaboradorService } from '@/services';
import { cargoService } from '@/services/cargoService';
import { localTrabalhoService } from '@/services/localTrabalhoService';
import { useCentrosCusto } from '@/hooks/useTabelasReferencia';
import { useTimes, useLotacoes } from '@/hooks/useColaboradorDetalhes';
import { useVinculosColaborador } from '@/hooks/useVinculos';
import { ColaboradorStatus } from '@/components/ui/status-badge';
import { cardVariants } from '@/components/dashboard/MetricCard';

// Mesma animação de entrada dos cards do Dashboard Executivo (fade + subida de
// 20px, stagger de 0.08s por índice) — reaproveitada via `cardVariants`
// importado de lá (não uma cópia) para nunca divergir da referência.
const MotionCard = motion.create(Card);

// Entrada em sequência (esquerda → direita) dos 5 elementos da linha
// "Gestor direto → Colaborador atual → Subordinados diretos" dentro do card
// "Hierarquia": só fade + leve deslocamento horizontal, sem o "y" de
// `cardVariants` (que é para os cards no nível da página, não elementos
// internos de um card já visível).
// eslint-disable-next-line react-refresh/only-export-components
export const hierarquiaItemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.18, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

// "Histórico Profissional": intervalo entre cada marcador sendo revelado
// pela linha que se desenha da direita pra esquerda — usado tanto no delay
// de cada `ItemHistorico` (revealDelay) quanto na duração total da linha,
// pra ficarem sincronizados.
const HISTORICO_REVEAL_GAP = 0.45;

// Mesmo mapeamento usado no card "Informações Profissionais" do Resumo
// (ColaboradorDetalhesPage.tsx) — não é o mesmo domínio de
// `TIPO_CONTRATO_LABELS` (contratoTemplateService), que descreve templates
// de contrato pra assinatura, não o campo `colaboradores.tipo_contrato`.
const TIPO_CONTRATO_LABEL: Record<string, string> = {
  clt: 'CLT',
  pj: 'PJ',
  estagio: 'Estágio',
  temporario: 'Temporário',
  intermitente: 'Intermitente',
  jovem_aprendiz: 'Jovem Aprendiz',
};

function formatData(data?: string | null) {
  if (!data) return '—';
  const [y, m, d] = data.split('-').map(Number);
  if (!y || !m || !d) return data;
  return format(new Date(y, m - 1, d), 'dd/MM/yyyy');
}

/** "X anos e Y meses" a partir de uma data `yyyy-mm-dd` até hoje — usado no
 * indicador "Tempo de cargo" da faixa de resumo. Sem a data (colaborador sem
 * vínculo/admissão registrada) retorna undefined em vez de inventar valor. */
function tempoDecorridoDesde(data?: string | null): string | undefined {
  if (!data) return undefined;
  const [y, m, d] = data.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  const inicio = new Date(y, m - 1, d);
  const hoje = new Date();
  let anos = hoje.getFullYear() - inicio.getFullYear();
  let meses = hoje.getMonth() - inicio.getMonth();
  if (hoje.getDate() < inicio.getDate()) meses -= 1;
  if (meses < 0) { anos -= 1; meses += 12; }
  if (anos <= 0 && meses <= 0) return 'Menos de 1 mês';
  const partes: string[] = [];
  if (anos > 0) partes.push(`${anos} ${anos === 1 ? 'ano' : 'anos'}`);
  if (meses > 0) partes.push(`${meses} ${meses === 1 ? 'mês' : 'meses'}`);
  return partes.join(' e ');
}

/** Cabeçalho padrão dos cards principais — ícone + título (+ subtítulo
 * opcional) à esquerda, "Editar" outline à direita levando pro formulário
 * completo do colaborador. Mesmo idioma visual usado em Dados Pessoais. */
function CabecalhoCard({
  icon: Icon, titulo, subtitulo, colaboradorId,
}: {
  icon: React.ComponentType<{ className?: string }>;
  titulo: string;
  subtitulo?: string;
  colaboradorId: string;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex items-start justify-between mb-4 gap-3">
      <div>
        <div className="flex items-center gap-2 font-display font-medium text-sm">
          <Icon className="h-5.5 w-5.5 text-primary" /> {titulo}
        </div>
        {subtitulo && <p className="text-xs text-muted-foreground mt-0.5">{subtitulo}</p>}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-7 px-3 text-[11px] rounded-xl border-primary/40 bg-transparent text-primary hover:bg-primary/5 hover:text-primary shrink-0"
        onClick={() => navigate(`/colaboradores/editar/${colaboradorId}`)}
      >
        <Edit className="h-3 w-3 mr-1" /> Editar
      </Button>
    </div>
  );
}

/** Um dos 4 cards independentes da faixa de resumo no topo da página —
 * ícone circular à esquerda, rótulo/valor/complemento à direita. */
function IndicadorResumo({
  icon: Icon, label, valor, sub, corIcone = 'bg-primary/10 text-primary', index = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  valor: React.ReactNode;
  sub?: React.ReactNode;
  corIcone?: string;
  index?: number;
}) {
  return (
    <MotionCard custom={index} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl shadow-elevated">
      <CardContent className="flex items-center gap-3 px-5 py-3.5 min-w-0">
        <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${corIcone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-sm font-semibold truncate">{valor}</p>
          {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
        </div>
      </CardContent>
    </MotionCard>
  );
}

/** Linha ícone + rótulo (coluna fixa) + valor (numa linha só, sem quebra)
 * usada nas colunas "Vínculo"/"Alocação" — mesma diagramação horizontal da
 * referência (rótulo e valor lado a lado, não empilhados). */
function LinhaVinculo({
  icon: Icon, label, valor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  valor?: React.ReactNode;
}) {
  const vazio = valor === undefined || valor === null || valor === '';
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground/60 shrink-0" />
      <span className="text-xs text-muted-foreground w-[124px] shrink-0 leading-tight whitespace-nowrap">{label}</span>
      <span className={`text-sm whitespace-nowrap ${vazio ? 'text-muted-foreground font-normal' : 'font-semibold'}`}>
        {vazio ? 'Não informado' : valor}
      </span>
    </div>
  );
}

/** Ícone + rótulo/valor empilhados (rótulo em cima, valor embaixo) — usada
 * na coluna "Vínculo", igual à referência. */
function CampoVinculo({
  icon: Icon, label, valor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  valor?: React.ReactNode;
}) {
  const vazio = valor === undefined || valor === null || valor === '';
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-muted-foreground/60 shrink-0 mt-0.5" />
      <div className="min-w-0 space-y-0.5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm whitespace-nowrap ${vazio ? 'text-muted-foreground font-normal' : 'font-semibold'}`}>
          {vazio ? 'Não informado' : valor}
        </p>
      </div>
    </div>
  );
}

function ItemHistorico({
  icon: Icon, label, valor, sub, corIcone = 'bg-primary/10 text-primary', revealDelay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  valor: React.ReactNode;
  sub?: React.ReactNode;
  corIcone?: string;
  /** Atraso (s) sincronizado com a linha sendo "desenhada" da direita pra
   * esquerda — o marcador mais à direita (Situação atual) tem delay 0 e
   * "pisca" primeiro; os demais entram na sequência em que a linha os
   * alcança, terminando no mais à esquerda (Admissão inicial). */
  revealDelay?: number;
}) {
  return (
    <div className="relative flex items-start gap-3 sm:flex-col sm:items-start sm:gap-2 sm:text-left">
      <div className="relative h-9 w-9 shrink-0">
        {/* Respiro opaco (cor sólida do card) por trás do ícone — some com
            a linha bem embaixo dele também, não só ao redor, já que o
            preenchimento do ícone é translúcido e deixaria a linha
            transparecer se só a "rosca" ao redor fosse coberta. */}
        <div className="hidden sm:block absolute -inset-2 rounded-full bg-card" />
        {/* "De dentro para fora": escala de 0 → 1 a partir do centro, no
            instante em que a linha (desenhada da direita pra esquerda)
            alcança este marcador. */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: revealDelay, duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
          className={`relative z-10 h-9 w-9 rounded-full flex items-center justify-center ${corIcone}`}
        >
          <Icon className="h-4.5 w-4.5" />
        </motion.div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: revealDelay + 0.2, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="min-w-0 sm:max-w-[12rem]"
      >
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <div className="text-sm font-semibold mt-0.5 break-words">{valor}</div>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </motion.div>
    </div>
  );
}

export function TrabalhoHierarquiaTab({ colaboradorId }: { colaboradorId: string }) {
  // Mesma query key usada no Resumo (ColaboradorDetalhesPage) — reaproveita o cache,
  // sem refetch se o usuário já visitou o Resumo.
  const { data: colaborador, isLoading: isLoadingColaborador } = useQuery({
    queryKey: ['colaborador', colaboradorId],
    queryFn: () => colaboradorService.buscarPorId(colaboradorId),
    enabled: !!colaboradorId,
  });

  const empresaId = colaborador?.empresa_id;
  // `supervisor_id`/`tipo_contrato` não fazem parte da interface `Colaborador`
  // enxuta (ver types/entities.ts) mas existem na tabela — mesmo acesso `any`
  // já usado em ColaboradorDetalhesPage.tsx pro card "Informações Profissionais".
  const supervisorId = (colaborador as any)?.supervisor_id as string | undefined;
  const tipoContrato = (colaborador as any)?.tipo_contrato as string | undefined;

  const { data: cargoDetalhe } = useQuery({
    queryKey: ['cargo-resumo', colaborador?.cargo_id],
    queryFn: () => cargoService.buscarPorId(colaborador!.cargo_id!, empresaId ?? undefined),
    enabled: !!colaborador?.cargo_id,
  });

  const { data: localTrabalhoDetalhe } = useQuery({
    queryKey: ['local-trabalho-resumo', colaborador?.local_trabalho_id],
    queryFn: () => localTrabalhoService.buscarPorId(colaborador!.local_trabalho_id!, empresaId ?? undefined),
    enabled: !!colaborador?.local_trabalho_id,
  });

  const { data: centrosCusto } = useCentrosCusto(empresaId);
  const centroCustoDetalhe = (centrosCusto as any[] | undefined)?.find(c => c.id === colaborador?.centro_custo_id);

  const { data: times } = useTimes(empresaId);
  const timeDetalhe = (times as any[] | undefined)?.find(t => t.id === colaborador?.time_id);

  const { data: lotacoes, isLoading: isLoadingLotacoes } = useLotacoes(colaboradorId, empresaId);
  const lotacaoPrincipal = (lotacoes as any[] | undefined)?.find(l => l.ativa !== false) ?? (lotacoes as any[] | undefined)?.[0];

  // Mesma query key usada no Resumo (ColaboradorDetalhesPage) pro card
  // "Informações Profissionais" — reaproveita o cache do gestor direto.
  const { data: gestorDetalhe } = useQuery({
    queryKey: ['gestor-resumo', supervisorId],
    queryFn: () => colaboradorService.buscarPorId(supervisorId!, empresaId),
    enabled: !!supervisorId,
  });

  // Mesma query key usada nas demais páginas de listagem (Movimentações,
  // Avaliação, Controle de Acesso, ...) — reaproveita o cache da empresa
  // inteira só pra filtrar quem tem `supervisor_id` = este colaborador.
  const { data: todosColaboradores } = useQuery({
    queryKey: ['colaboradores', empresaId],
    queryFn: () => colaboradorService.list(empresaId!),
    enabled: !!empresaId,
  });
  const subordinadosReais = (todosColaboradores as any[] | undefined)?.filter(c => c.supervisor_id === colaboradorId);
  // TEMP: 10 mocks só pra pré-visualizar o layout do card "Subordinados diretos" com vários — remover depois.
  const subordinados = subordinadosReais?.length ? subordinadosReais : [
    { id: 'mock-1', nome_completo: 'Carlos Eduardo Lima' },
    { id: 'mock-2', nome_completo: 'Fernanda Alves Santos' },
    { id: 'mock-3', nome_completo: 'Rodrigo Martins Pereira' },
    { id: 'mock-4', nome_completo: 'Juliana Costa Ferreira' },
    { id: 'mock-5', nome_completo: 'Bruno Henrique Almeida' },
    { id: 'mock-6', nome_completo: 'Patrícia Gomes Ribeiro' },
    { id: 'mock-7', nome_completo: 'Thiago Souza Barbosa' },
    { id: 'mock-8', nome_completo: 'Camila Rodrigues Nunes' },
    { id: 'mock-9', nome_completo: 'Diego Fernandes Cardoso' },
    { id: 'mock-10', nome_completo: 'Larissa Monteiro Dias' },
  ];

  const { data: vinculos, isLoading: isLoadingVinculos } = useVinculosColaborador(colaboradorId);

  if (isLoadingColaborador) return <div className="flex items-center justify-center h-32"><Spinner /></div>;

  // Numeração cronológica (1ª = mais antiga) — mesma lógica que já existia
  // no card "Histórico de Vínculos", agora alimentando a timeline.
  const lista = vinculos || [];
  const cronologica = [...lista].sort((a, b) => String(a.data_inicio).localeCompare(String(b.data_inicio)));
  const numeroPorId = new Map(cronologica.map((v, i) => [v.id, i + 1]));
  const admissaoInicial = cronologica[0];
  const vinculoAtual = lista.find(v => !v.data_fim) ?? cronologica[cronologica.length - 1];
  const passagemAnterior = cronologica.length > 1 ? cronologica[cronologica.length - 2] : undefined;

  const dataBaseTempoCargo = admissaoInicial?.data_inicio ?? colaborador?.data_admissao;
  const tempoCargo = tempoDecorridoDesde(dataBaseTempoCargo);
  const qtdSubordinados = subordinados?.length ?? 0;

  return (
    <div className="space-y-5">
      {/* Faixa de resumo — 4 indicadores calculados a partir dos mesmos dados
          usados no restante da página (nenhum valor fixo/inventado), cada um
          em seu próprio card independente. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <IndicadorResumo
          index={0}
          icon={Clock}
          label="Tempo de cargo"
          valor={tempoCargo ?? '—'}
          sub={dataBaseTempoCargo ? `Desde ${formatData(dataBaseTempoCargo)}` : undefined}
          corIcone="bg-blue-500/10 text-blue-500"
        />
        <IndicadorResumo
          index={1}
          icon={ArrowLeftRight}
          label="Passagem"
          valor={vinculoAtual ? `${numeroPorId.get(vinculoAtual.id)}ª passagem` : '—'}
          sub="Nesta empresa"
          corIcone="bg-violet-500/10 text-violet-500"
        />
        <IndicadorResumo
          index={2}
          icon={MapPin}
          label="Lotação atual"
          valor={lotacaoPrincipal?.nome ?? 'Não definida'}
          sub={lotacaoPrincipal ? 'Unidade principal' : undefined}
          corIcone="bg-emerald-500/10 text-emerald-500"
        />
        <IndicadorResumo
          index={3}
          icon={Users}
          label="Subordinados diretos"
          valor={`${qtdSubordinados} ${qtdSubordinados === 1 ? 'colaborador' : 'colaboradores'}`}
          sub={qtdSubordinados === 0 ? 'Não lidera pessoas' : `${qtdSubordinados === 1 ? '1 pessoa' : `${qtdSubordinados} pessoas`} reportando`}
          corIcone="bg-violet-500/10 text-violet-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.9fr] gap-5 items-stretch">
        <MotionCard custom={4} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
          <CardContent className="pt-4 px-5 pb-5">
            <CabecalhoCard
              icon={Network}
              titulo="Hierarquia"
              subtitulo="Posição na estrutura organizacional."
              colaboradorId={colaboradorId}
            />
            <div className="mt-7 flex flex-col sm:flex-row items-stretch gap-3">
              <motion.div custom={0} initial="hidden" animate="visible" variants={hierarquiaItemVariants} className="sm:flex-1 rounded-xl border border-border/30 bg-background/70 p-3 min-w-0">
                <p className="text-[11px] text-muted-foreground mb-2">Gestor direto</p>
                {gestorDetalhe ? (
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-full bg-muted overflow-hidden shrink-0 border border-border/30 flex items-center justify-center">
                      {gestorDetalhe.foto_url ? (
                        <img src={gestorDetalhe.foto_url} alt={gestorDetalhe.nome_completo} className="h-full w-full object-cover" />
                      ) : (
                        <UserIcon className="h-5 w-5 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{gestorDetalhe.nome_completo}</p>
                      <p className="text-xs text-muted-foreground">{gestorDetalhe.cargo}</p>
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Não definido</span>
                )}
              </motion.div>

              <motion.div custom={1} initial="hidden" animate="visible" variants={hierarquiaItemVariants} className="hidden sm:flex items-center justify-center shrink-0">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </motion.div>

              <motion.div custom={2} initial="hidden" animate="visible" variants={hierarquiaItemVariants} className="sm:flex-1 rounded-xl border border-violet-500/40 bg-violet-500/5 p-3 min-w-0">
                <p className="text-[11px] text-violet-400 mb-2">Colaborador atual</p>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-11 w-11 rounded-full bg-violet-500/15 overflow-hidden shrink-0 border border-violet-500/30 flex items-center justify-center">
                    {colaborador?.foto_url ? (
                      <img src={colaborador.foto_url} alt={colaborador.nome_completo} className="h-full w-full object-cover" />
                    ) : (
                      <UserIcon className="h-5 w-5 text-violet-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{colaborador?.nome_completo}</p>
                    <p className="text-xs text-muted-foreground">{cargoDetalhe?.nome ?? colaborador?.cargo}</p>
                  </div>
                </div>
                {colaborador?.departamento && (
                  <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                    <Building2 className="h-3 w-3 shrink-0" /> {colaborador.departamento}
                  </p>
                )}
              </motion.div>

              <motion.div custom={3} initial="hidden" animate="visible" variants={hierarquiaItemVariants} className="hidden sm:flex items-center justify-center shrink-0">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </motion.div>

              <motion.div custom={4} initial="hidden" animate="visible" variants={hierarquiaItemVariants} className="sm:flex-1 rounded-xl border border-border/30 bg-background/70 p-3 min-w-0 flex flex-col items-center text-center">
                <p className="text-[11px] text-muted-foreground mb-2">Subordinados diretos</p>
                {qtdSubordinados === 0 ? (
                  <div className="flex flex-col items-center gap-1.5 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border/30">
                      <Users className="h-4 w-4 text-muted-foreground/60" />
                    </div>
                    <p className="text-sm font-semibold break-words">Nenhum colaborador</p>
                    <p className="text-xs text-muted-foreground">Não lidera pessoas</p>
                  </div>
                ) : (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex flex-col items-center gap-1.5 min-w-0 w-full rounded-lg -m-1 p-1 hover:bg-muted/40 transition-colors"
                      >
                        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border/30">
                          <Users className="h-4 w-4 text-muted-foreground/60" />
                        </div>
                        <p className="text-sm font-semibold break-words">
                          {qtdSubordinados === 1 ? subordinados![0].nome_completo : `${qtdSubordinados} colaboradores`}
                        </p>
                        <p className="text-xs text-primary">Ver lista</p>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="center" className="w-64 p-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-2 pb-2">
                        {qtdSubordinados} {qtdSubordinados === 1 ? 'subordinado direto' : 'subordinados diretos'}
                      </p>
                      <div className="space-y-1 max-h-64 overflow-y-auto">
                        {subordinados!.map((s: any) => (
                          <div key={s.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/40">
                            <div className="h-8 w-8 rounded-full bg-muted overflow-hidden shrink-0 border border-border/30 flex items-center justify-center">
                              {s.foto_url ? (
                                <img src={s.foto_url} alt={s.nome_completo} className="h-full w-full object-cover" />
                              ) : (
                                <UserIcon className="h-4 w-4 text-muted-foreground/40" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{s.nome_completo}</p>
                              {s.cargo && <p className="text-xs text-muted-foreground truncate">{s.cargo}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </motion.div>
            </div>
          </CardContent>
        </MotionCard>

        <MotionCard custom={5} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
          <CardContent className="pt-4 px-5 pb-5">
            <CabecalhoCard
              icon={Briefcase}
              titulo="Vínculo & Alocação"
              subtitulo="Informações contratuais e estruturais da locação atual."
              colaboradorId={colaboradorId}
            />
            <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-x-6">
              <div className="space-y-2.5 sm:pr-6 sm:border-r sm:border-border/20">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground pb-1 border-b border-border/20">Vínculo</p>
                <CampoVinculo icon={UserIcon} label="Tipo de vínculo" valor={tipoContrato ? (TIPO_CONTRATO_LABEL[tipoContrato] ?? tipoContrato) : undefined} />
                <CampoVinculo icon={IdCard} label="Matrícula" valor={colaborador?.matricula} />
              </div>
              <div className="space-y-2.5 mt-3 sm:mt-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground pb-1 border-b border-border/20">Alocação</p>
                <LinhaVinculo icon={Building2} label="Centro de custo" valor={centroCustoDetalhe?.nome ?? colaborador?.centro_custo} />
                <LinhaVinculo icon={MapPin} label="Local de trabalho" valor={localTrabalhoDetalhe?.nome ?? colaborador?.local_trabalho} />
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground/60 shrink-0 mt-0.5" />
                  <span className="text-xs text-muted-foreground w-[124px] shrink-0 leading-tight">Unidade / Locação principal</span>
                  {isLoadingLotacoes ? (
                    <Spinner />
                  ) : !lotacoes?.length ? (
                    <span className="text-xs text-muted-foreground">Nenhuma lotação cadastrada</span>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(lotacoes as any[]).map(l => (
                        <span key={l.id} className="inline-flex items-center gap-1.5">
                          <Badge size="sm" variant={l.ativa === false ? 'secondary' : 'default'} className="rounded-full whitespace-nowrap">
                            {l.nome}{l.ativa === false ? ' (inativa)' : ''}
                          </Badge>
                          {l.id === lotacaoPrincipal?.id && (
                            <Badge size="sm" variant="outline" className="rounded-full whitespace-nowrap border-primary/40 text-primary">Principal</Badge>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <LinhaVinculo icon={Users} label="Time" valor={timeDetalhe?.nome} />
              </div>
            </div>
          </CardContent>
        </MotionCard>
      </div>

      <MotionCard custom={6} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
        <CardContent className="pt-4 px-5 pb-5">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <div className="flex items-center gap-2 font-display font-medium text-sm">
                <History className="h-5.5 w-5.5 text-primary" /> Histórico Profissional
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Principais marcos da sua trajetória na empresa.</p>
            </div>
            {!isLoadingVinculos && lista.length > 0 && !passagemAnterior && (
              <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-transparent px-3 py-1.5 text-xs text-blue-400 shrink-0">
                <Info className="h-3.5 w-3.5 shrink-0" /> Nenhuma movimentação funcional registrada desde a admissão.
              </div>
            )}
          </div>
          {isLoadingVinculos ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : lista.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum vínculo registrado para este colaborador.</p>
          ) : (
            <div className="relative">
              {/* Uma única linha contínua atravessando a faixa inteira — os
                  respiros em volta de cada ícone (dentro de ItemHistorico)
                  é que "recortam" essa linha, não pedaços separados dela.
                  "Desenhada" da direita pra esquerda (scaleX 0→1 ancorado
                  na direita) — o mesmo ritmo (HISTORICO_REVEAL_GAP) que
                  sincroniza o revealDelay de cada marcador abaixo. */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: HISTORICO_REVEAL_GAP * 3 + 0.4, ease: 'easeInOut' }}
                style={{ transformOrigin: 'right' }}
                className="hidden sm:block absolute top-4 left-4 right-4 h-1 bg-border"
              />
              <div className="flex flex-col gap-5 sm:flex-row sm:justify-between sm:gap-2">
                <ItemHistorico
                  icon={Calendar}
                  label="Admissão inicial"
                  valor={formatData(admissaoInicial?.data_inicio)}
                  sub="Ingresso na empresa"
                  corIcone="bg-blue-500/10 text-blue-500"
                  revealDelay={HISTORICO_REVEAL_GAP * 3}
                />
                <ItemHistorico
                  icon={ArrowLeftRight}
                  label="Passagem atual"
                  valor={`${numeroPorId.get(vinculoAtual?.id ?? '')}ª passagem`}
                  sub={passagemAnterior
                    ? `${numeroPorId.get(passagemAnterior.id)}ª encerrada em ${formatData(passagemAnterior.data_fim)}`
                    : 'Desde a admissão'}
                  corIcone="bg-violet-500/10 text-violet-500"
                  revealDelay={HISTORICO_REVEAL_GAP * 2}
                />
                <ItemHistorico
                  icon={MapPin}
                  label="Lotação atual"
                  valor={lotacaoPrincipal?.nome ?? 'Não definida'}
                  sub={lotacaoPrincipal ? 'Unidade principal' : undefined}
                  corIcone="bg-emerald-500/10 text-emerald-500"
                  revealDelay={HISTORICO_REVEAL_GAP * 1}
                />
                <ItemHistorico
                  icon={Activity}
                  label="Situação atual"
                  valor={colaborador?.status ? <ColaboradorStatus status={colaborador.status} /> : '—'}
                  sub={lista.length > 1
                    ? `${lista.length} passagens registradas desde a admissão.`
                    : 'Sem mudanças de unidade ou vínculo desde a admissão.'}
                  corIcone="bg-amber-500/10 text-amber-500"
                  revealDelay={0}
                />
              </div>
            </div>
          )}
        </CardContent>
      </MotionCard>
    </div>
  );
}
