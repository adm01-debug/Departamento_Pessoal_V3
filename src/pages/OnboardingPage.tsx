/**
 * JORNADA DE ONBOARDING — rota `/onboarding` (item "Onboarding" da sidebar).
 *
 * ⚠️ FONTE ÚNICA DO ONBOARDING (consolidação do módulo de Admissões). A aba
 * "Onboarding" de `AdmissoesPage` deixou de existir: aqui está a ÚNICA tela que
 * lista, filtra, detalha e opera a integração do colaborador. Admissões termina
 * no processo admissionAL (Solicitação → … → Concluída) e aponta para cá; o que
 * acontece DEPOIS da admissão formal é jornada, e jornada só existe aqui.
 *
 * MESMA FONTE DE DADOS das duas telas antigas — nada foi copiado entre bancos:
 * `admissoes` com `tarefas:tarefas_onboarding(*)` (mesma query, mesma chave
 * `['onboarding-list']`, mesmo mock). A régua de negócio (progresso, prazo,
 * risco, situação, marco) fica em `onboardingDerivacoes.ts`, lida UMA vez por
 * lista por `projetarOnboarding` — cards, contadores, filtros e chips leem a
 * MESMA projeção, então nada na tela discorda do card.
 *
 * O QUE VEIO DE ADMISSÕES NA CONSOLIDAÇÃO:
 *   • a leitura de situação por colaborador (`situacaoOnboarding`), que antes
 *     vivia implícita no pill do card;
 *   • os TOTAIS da jornada (em andamento / concluídos) — na consolidação
 *     apareciam num bloco de resumo isolado no topo; no redesenho de layout eles
 *     passaram a viver de forma CONTEXTUAL dentro dos próprios tabs
 *     ("Em andamento (n)" / "Concluídos (n)") e dos chips ("Em risco", etc.),
 *     sem área dedicada (ver `resumoGeralOnboarding`).
 *
 * O QUE JÁ ERA DAQUI: as abas "Em Andamento"/"Concluídos", a grade de cards
 * (`OnboardingCard`), o detalhe (`OnboardingDetalheDialog`) e "Gestão de Kits".
 *
 * GESTÃO DE KITS: deixou de ser uma aba do MESMO grupo de status e virou AÇÃO
 * INDEPENDENTE no cabeçalho — ela é ferramenta auxiliar da jornada
 * (equipamentos/kits), não um estado do colaborador. Continua fora de Admissões,
 * como sempre esteve.
 */

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Rocket,
  CheckCircle2,
  Clock,
  UserPlus,
  Package,
  Loader2,
  Search,
  SlidersHorizontal,
  RotateCcw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowLeft,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageTitle } from '@/components/PageTitle';
import { PageLayout } from '@/components/layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FilterChip } from '@/components/ui/filter-chip';
import { SlidingIndicator } from '@/components/ui/sliding-indicator';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { cn } from '@/lib/utils';
import { useEmpresas } from '@/hooks/useEmpresas';
// DOMÍNIO CANÔNICO: a página não fala mais com o Supabase direto — ver
// `src/services/onboardingJornadaService.ts` e `src/hooks/useJornadaOnboarding.ts`.
import {
  useJornadas,
  useKits,
  useConcluirTarefa,
  useCriarKit,
  useAtualizarKit,
  jornadaEmModoDemonstracao,
} from '@/hooks/useJornadaOnboarding';
import { OnboardingCard, type OnboardingAcoes } from '@/components/admissoes/OnboardingCard';
import { GestaoKits } from '@/components/admissoes/GestaoKits';
import { OnboardingDetalheDialog } from '@/components/admissoes/OnboardingDetalheDialog';
import { KitOnboardingDialog } from '@/components/admissoes/KitOnboardingDialog';
import { MARCOS_ONBOARDING } from '@/components/admissoes/onboardingComum';
import { DIA_MS, inicioDoDia } from '@/components/admissoes/admissoesDerivacoes';
import {
  projetarOnboarding,
  resumoGeralOnboarding,
  ordenarLinhas,
  ORDENS_ONBOARDING,
  ORDEM_ONBOARDING_PADRAO,
  type ColaboradorOnboarding,
  type LinhaOnboarding,
  type SituacaoOnboarding,
  type OrdemOnboarding,
} from '@/components/admissoes/onboardingDerivacoes';
import type { KitOnboarding, KitOnboardingInput } from '@/services/onboardingJornadaService';

/** Teto do `custom` da cascata (mesma trava das outras grades do produto). */
const MAX_STAGGER_INDEX = 5;

/**
 * SLOTS DA CASCATA DE ENTRADA (Jornada de Onboarding).
 *
 * A animação NÃO é recriada aqui: é a MESMA dos KPI Cards do Dashboard
 * Executivo — `cardVariants`, importado de `dashboard/MetricCard.tsx` (fade +
 * subida de 20px, 0.4s, `delay = slot × 0.08s`, easing
 * `cubic-bezier(0.25,0.46,0.45,0.94)`).
 *
 * A ORDEM é a que o olho encontra as FAIXAS da página — topo → base. Cada faixa
 * é um BLOCO (um slot): os itens de dentro dela entram juntos, como uma linha,
 * para a página não acumular ~20 slots e o conteúdo (a grade) não demorar mais
 * de um segundo para começar. A ÚNICA exceção é a grade de cards: cada card
 * continua a fila a partir de `cartoes` (como um KPI por card no Dashboard),
 * com o índice cortado no teto (`MAX_STAGGER_INDEX`) para o último não atrasar.
 *
 * Resultado: a página inteira assenta em ~1.1s e a grade começa já em 0.32s —
 * a mesma "sensação" da linha de KPIs, sem a demora de antes.
 */
const REVELA = {
  /** Faixa do cabeçalho — os dois botões entram juntos. */
  acoesCabecalho: 0,
  abas: 1,
  /** Barra de busca + selects + ações ("Mais filtros"/"Limpar filtros"). */
  filtros: 2,
  /** Faixa de chips rápidos + "Ordenar por". */
  chips: 3,
  /** Grade de cards — cada card continua a fila a partir daqui. */
  cartoes: 4,
  paginacao: 10,
} as const;

/**
 * SLOTS DA CASCATA DA GESTÃO DE KITS (painel aberto pelo botão do cabeçalho).
 * Mesma animação/valores acima; `conteudo` é a base repassada ao `GestaoKits`,
 * para as faixas dele continuarem a fila DEPOIS do cabeçalho do painel.
 */
const REVELA_KITS = {
  voltar: 0,
  /** Título + descrição + "Novo Kit" (mesma linha). */
  cabecalho: 1,
  conteudo: 2,
} as const;

/**
 * Largura da página da lista (paginação frontend). A lista é curta (admissões
 * em integração), então a fatia é generosa e a navegação só aparece quando
 * existem mais itens que isso.
 */
const ITENS_POR_PAGINA = 12;

/** Sentinela dos selects com opção "todos" (o Radix proíbe `SelectItem value=""`). */
const VALOR_TODOS = '__todos__';

type ChipAtivo = SituacaoOnboarding | 'todos';
type ChipConcluido = 'todos' | 'mes' | 'no_prazo' | 'fora_prazo';
type PeriodoOnboarding = 'todos' | '7' | '30' | '90';

/** Chips rápidos da aba "Em Andamento" — o mapa de SITUAÇÃO da jornada. */
const CHIPS_ATIVOS: { value: ChipAtivo; label: string; ponto?: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'em_dia', label: 'Em dia', ponto: 'bg-primary' },
  { value: 'em_risco', label: 'Em risco', ponto: 'bg-warning' },
  { value: 'atrasado', label: 'Atrasados', ponto: 'bg-destructive-vivid' },
  { value: 'sem_proxima_acao', label: 'Sem próxima ação' },
];

/** Chips rápidos da aba "Concluídos" — prazo de fechamento e recência. */
const CHIPS_CONCLUIDOS: { value: ChipConcluido; label: string; ponto?: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'mes', label: 'Este mês', ponto: 'bg-primary' },
  { value: 'no_prazo', label: 'No prazo', ponto: 'bg-success' },
  { value: 'fora_prazo', label: 'Fora do prazo', ponto: 'bg-destructive-vivid' },
];

const PERIODOS_ONBOARDING: { value: PeriodoOnboarding; label: string }[] = [
  { value: 'todos', label: 'Qualquer período' },
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
];

/** Opções de "Etapa" — os MESMOS marcos que a régua do card desenha. */
const ETAPAS_ONBOARDING = MARCOS_ONBOARDING.map((label, indice) => ({ value: String(indice), label }));

/**
 * CAUSA do "Todos os..." nos filtros: o `SelectTrigger` compartilhado
 * (`components/ui/select.tsx`) carrega a classe `[&>span]:line-clamp-1`, que
 * aplica `-webkit-line-clamp` + `overflow: hidden` no `<span>` do
 * `SelectValue` — e é justamente esse span que guarda o rótulo. Qualquer
 * rótulo mais largo que o campo vira "Todos os...".
 *
 * Estes overrides neutralizam o corte SOMENTE nos selects desta página
 * (o componente global segue intacto para as demais telas):
 *   • `line-clamp-none`  → devolve `overflow`, `display` e `-webkit-line-clamp`
 *   • `whitespace-nowrap`→ rótulo em UMA única linha, sem quebra
 *   • `overflow-visible` → nada de recorte/elipse na caixa do span
 */
const LABEL_SELECT_INTEIRO = '[&>span]:line-clamp-none [&>span]:whitespace-nowrap [&>span]:overflow-visible';

/**
 * A linha casa com o chip rápido? `todos` é sempre verdadeiro (é o estado sem
 * destaque). Os chips de atraso/espera leem `situacao` — a régua única de status
 * — e os de concluídos leem prazo de fechamento e recência da última conclusão.
 */
function combinaChip(linha: LinhaOnboarding, chip: ChipAtivo | ChipConcluido): boolean {
  switch (chip) {
    case 'todos':
      return true;
    case 'mes': {
      if (linha.ultimaConclusaoEm == null) return false;
      const referencia = new Date(linha.ultimaConclusaoEm);
      const agora = new Date();
      return referencia.getMonth() === agora.getMonth() && referencia.getFullYear() === agora.getFullYear();
    }
    case 'no_prazo':
      return !linha.foraDoPrazo;
    case 'fora_prazo':
      return linha.foraDoPrazo;
    default:
      return linha.situacao === chip;
  }
}

/**
 * Grade de cards — UMA implementação para as duas abas. Mantém a cascata
 * `cardVariants` e o teto de stagger das outras grades do produto.
 *
 * JORNADA CANCELADA (PENDÊNCIA 5): o card CONTINUA aparecendo (histórico
 * preservado), mas fica SEM AÇÃO DE CONCLUSÃO — o card já esconde o botão quando
 * `onConcluirProxima` não é fornecido. Nada é apagado; o processo cancelado
 * apenas deixa de aceitar operação.
 */
function GradeOnboarding({ linhas, acoes }: { linhas: LinhaOnboarding[]; acoes: OnboardingAcoes }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {linhas.map((linha, index) => (
        <motion.div
          key={String(linha.colaborador.id)}
          custom={REVELA.cartoes + Math.min(index, MAX_STAGGER_INDEX)}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="h-full"
        >
          <OnboardingCard
            colaborador={linha.colaborador}
            acoes={linha.cancelada ? { ...acoes, onConcluirProxima: undefined } : acoes}
          />
        </motion.div>
      ))}
    </div>
  );
}

/** Estado vazio padrão da jornada (mesma moldura nas duas abas). */
function EstadoVazioJornada({
  icone: Icone,
  titulo,
  descricao,
  tomIcone,
}: {
  icone: typeof Rocket;
  titulo: string;
  descricao: string;
  tomIcone?: string;
}) {
  return (
    <motion.div custom={REVELA.cartoes} variants={cardVariants} initial="hidden" animate="visible">
      <Card className="rounded-2xl border-2 border-dashed border-border/50 p-12 text-center text-muted-foreground">
        <Icone className={cn('mx-auto mb-4 h-12 w-12 opacity-20', tomIcone)} />
        <p className="font-display font-medium">{titulo}</p>
        <p className="text-sm">{descricao}</p>
      </Card>
    </motion.div>
  );
}

export default function OnboardingPage() {
  const [activeTab, setActiveTab] = useState('ativos');
  // MODO DEMONSTRAÇÃO — ver src/mocks/admissoesMock.ts (dev + VITE_ADMISSOES_MOCK=true).
  const emDemonstracao = jornadaEmModoDemonstracao();
  const { empresaAtual } = useEmpresas();
  // Deep link `/onboarding?colaborador=<id>` — o atalho contextual de Admissões
  // chega aqui já focado no colaborador certo.
  const [parametros] = useSearchParams();
  const colaboradorDoLink = parametros.get('colaborador');
  // CTA "Iniciar Onboarding": não existe uma função de criação de jornada aqui
  // (a jornada nasce da ADMISSÃO, pelo trigger do banco). A ação REAL e
  // correspondente é criar uma nova admissão, que vive em `/admissoes` — o CTA
  // leva o usuário até lá em vez de ser um botão morto.
  const navigate = useNavigate();

  const [colaboradorDetalhe, setColaboradorDetalhe] = useState<ColaboradorOnboarding | null>(null);
  const [tarefaConcluindo, setTarefaConcluindo] = useState<string | null>(null);
  // "Gestão de Kits" é AÇÃO DO CABEÇALHO: abre/fecha a visão de perfis, fora do
  // grupo de tabs de status (ver comentário do topo do arquivo).
  const [kitsAbertos, setKitsAbertos] = useState(false);
  // Formulário de perfil de kit: `null` = fechado; `{kit: null}` = criar.
  const [kitEmEdicao, setKitEmEdicao] = useState<{ kit: KitOnboarding | null } | null>(null);
  // IMAGEM DO KIT — overlay de SESSÃO (id do kit → URL da imagem). Não é
  // persistido: `onboarding_kits` ainda não tem coluna de imagem, então a imagem
  // vive apenas enquanto a página estiver montada (nada é gravado no banco).
  const [imagensKit, setImagensKit] = useState<Record<string, string>>({});

  // ── FILTROS combináveis (busca/selects/painel) ────────────────────────────
  const [termo, setTermo] = useState('');
  const [departamento, setDepartamento] = useState(VALOR_TODOS);
  const [responsavel, setResponsavel] = useState(VALOR_TODOS);
  const [etapa, setEtapa] = useState(VALOR_TODOS);
  const [periodo, setPeriodo] = useState<PeriodoOnboarding>('todos');
  const [painelAberto, setPainelAberto] = useState(false);
  // Chip rápido (SITUAÇÃO em Andamento / recência-prazo em Concluídos): é o
  // mesmo conceito do antigo filtro de status, apresentado como faixa de chips.
  const [chip, setChip] = useState<ChipAtivo | ChipConcluido>('todos');
  // ORDENAÇÃO (FASE 15) e PAGINAÇÃO (FASE 16) — estado próprio, sempre aplicados
  // ANTES da fatia da página.
  const [ordem, setOrdem] = useState<OrdemOnboarding>(ORDEM_ONBOARDING_PADRAO);
  const [pagina, setPagina] = useState(1);

  const { data: onboarding = [], isLoading } = useJornadas();
  const { data: kits = [], isError: kitsComErro } = useKits();
  const concluirTarefa = useConcluirTarefa(() => setTarefaConcluindo(null));
  const criarKit = useCriarKit();
  const atualizarKit = useAtualizarKit();

  /**
   * KITS EXIBIDOS NA GRADE — os perfis do banco + o overlay de imagem da SESSÃO
   * (ver `imagensKit`). Nenhum dado fictício: o que vem do banco permanece como
   * está; só a imagem (que ainda não tem coluna) é acrescentada em memória.
   */
  const kitsComImagem = useMemo(
    () => kits.map((kit) => ({ ...kit, imagem_url: imagensKit[kit.id] ?? kit.imagem_url ?? null })),
    [kits, imagensKit]
  );

  /**
   * GESTÃO DE KITS — a leitura (ativa/erro) vem do `useKits()` (domínio
   * canônico → `onboarding_kits`). A tela distingue TRÊS situações, e um erro
   * NUNCA é apresentado como "nenhum kit": ver `EstadoErroKits` na grade.
   */
  const concluir = (tarefaId: string) => {
    setTarefaConcluindo(tarefaId);
    concluirTarefa.mutate(tarefaId);
  };

  /**
   * COMUNICAÇÃO COM O COLABORADOR — HONESTIDADE (correção da auditoria).
   *
   * Não existe NENHUMA infraestrutura de e-mail no projeto (nenhuma edge
   * function de envio, nenhum provider/Resend/SMTP — auditado). Então a ação
   * NÃO pode dizer "enviado": ela copia a mensagem de boas-vindas para a área de
   * transferência, o que é uma ação REAL e verificável pelo usuário, e informa
   * exatamente o que aconteceu.
   */
  const copiarMensagemBoasVindas = async (colaborador: ColaboradorOnboarding) => {
    const nome = colaborador.nome ?? 'colaborador';
    const texto = `Boas-vindas, ${nome}! Estamos felizes em ter você no time.`;
    try {
      await navigator.clipboard.writeText(texto);
      toast.success(`Mensagem de boas-vindas de ${nome} copiada — cole no seu e-mail.`);
    } catch {
      // Clipboard bloqueado pelo navegador: informa sem mentir sobre envio.
      toast.info(`Mensagem de boas-vindas de ${nome} preparada: "${texto}"`);
    }
  };

  const acoes: OnboardingAcoes = {
    onVerOnboarding: (colaborador) => setColaboradorDetalhe(colaborador),
    onCopiarMensagemBoasVindas: (colaborador) => void copiarMensagemBoasVindas(colaborador),
    onConcluirProxima: (tarefa) => {
      if (tarefa.id != null) concluir(String(tarefa.id));
    },
  };

  const hoje = useMemo(() => inicioDoDia(new Date()), []);
  const listaLimpa = onboarding as ColaboradorOnboarding[];
  /** FONTE ÚNICA de leitura: uma projeção por lista (ver doc do topo). */
  const linhas = useMemo(() => projetarOnboarding(listaLimpa, hoje), [listaLimpa, hoje]);
  const resumo = useMemo(() => resumoGeralOnboarding(linhas), [linhas]);
  const emAndamento = useMemo(() => linhas.filter((l) => !l.concluido), [linhas]);
  const concluidos = useMemo(() => linhas.filter((l) => l.concluido), [linhas]);

  /** Filtros combináveis — tudo MENOS o chip rápido (o chip é a última camada). */
  const passaFiltros = (linha: LinhaOnboarding): boolean => {
    // Deep link `?colaborador=<id>`: foca UM colaborador (o atalho de Admissões).
    if (colaboradorDoLink && String(linha.colaborador.id ?? '') !== colaboradorDoLink) return false;
    if (termoNormalizado) {
      const alvo = [linha.colaborador.nome, linha.colaborador.cargo, linha.colaborador.departamento, linha.responsavel]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!alvo.includes(termoNormalizado)) return false;
    }
    if (departamento !== VALOR_TODOS && linha.colaborador.departamento !== departamento) return false;
    if (responsavel !== VALOR_TODOS && linha.responsavel !== responsavel) return false;
    if (etapa !== VALOR_TODOS && String(linha.marco) !== etapa) return false;
    if (periodo !== 'todos') {
      if (linha.inicioEm == null || linha.inicioEm < hoje - Number(periodo) * DIA_MS) return false;
    }
    return true;
  };

  /**
   * ORDEM DE EXECUÇÃO da coleção derivada (uma só coleção, um só caminho):
   *   base da aba → filtros → chip → ORDENAÇÃO → PAGINAÇÃO.
   * A ordenação vem ANTES da fatia (a página 1 sempre tem os mais críticos) e as
   * contagens dos chips saem da base FILTRADA (nunca da página).
   */
  const baseDaAba = activeTab === 'ativos' ? emAndamento : concluidos;
  const chips: { value: ChipAtivo | ChipConcluido; label: string; ponto?: string }[] =
    activeTab === 'ativos' ? CHIPS_ATIVOS : CHIPS_CONCLUIDOS;

  const termoNormalizado = termo.trim().toLowerCase();

  const baseFiltrada = baseDaAba.filter(passaFiltros);
  const listaOrdenada = ordenarLinhas(
    baseFiltrada.filter((l) => combinaChip(l, chip)),
    ordem
  );

  /** PAGINAÇÃO (frontend): fatia a lista JÁ ordenada; a página nunca estoura. */
  const totalPaginas = Math.max(1, Math.ceil(listaOrdenada.length / ITENS_POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const listaExibida = listaOrdenada.slice((paginaAtual - 1) * ITENS_POR_PAGINA, paginaAtual * ITENS_POR_PAGINA);

  /** Contagem real de cada chip sobre a MESMA base filtrada (sem o chip). */
  const totalDoChip = (valor: ChipAtivo | ChipConcluido) => baseFiltrada.filter((l) => combinaChip(l, valor)).length;

  const opcoesDepartamento = useMemo(
    () => [...new Set(linhas.map((l) => l.colaborador.departamento).filter((v): v is string => !!v))].sort(),
    [linhas]
  );
  const opcoesResponsavel = useMemo(
    () => [...new Set(linhas.map((l) => l.responsavel).filter((v): v is string => !!v))].sort(),
    [linhas]
  );

  const temFiltro =
    termo !== '' ||
    departamento !== VALOR_TODOS ||
    responsavel !== VALOR_TODOS ||
    etapa !== VALOR_TODOS ||
    periodo !== 'todos' ||
    chip !== 'todos';

  const limparFiltros = () => {
    setTermo('');
    setDepartamento(VALOR_TODOS);
    setResponsavel(VALOR_TODOS);
    setEtapa(VALOR_TODOS);
    setPeriodo('todos');
    setChip('todos');
    setPagina(1); // filtro mudou → volta para a primeira página
  };

  /** Trocar de aba reinicia o chip: cada aba tem o SEU conjunto de chips. */
  const trocarAba = (aba: string) => {
    setActiveTab(aba);
    setChip('todos');
    setPagina(1);
  };

  /** Qualquer troca de critério reinicia a paginação (página 1). */
  const alterarOrdenacao = (valor: string) => {
    setOrdem(valor as OrdemOnboarding);
    setPagina(1);
  };

  const alterarChip = (valor: ChipAtivo | ChipConcluido) => {
    setChip(valor);
    setPagina(1);
  };

  /**
   * REGISTRA A IMAGEM DO KIT NA SESSÃO — `onboarding_kits` ainda NÃO tem coluna
   * de imagem, então NADA é gravado: guardamos a URL (imagem de sessão) em
   * memória apenas para a grade exibir o kit com imagem. Ao recarregar a página
   * a imagem some — o que é a verdade, não uma persistência fingida.
   */
  const registrarImagemSessao = (id: string, imagemUrl: string | null) => {
    setImagensKit((atual) => {
      const copia = { ...atual };
      if (imagemUrl) copia[id] = imagemUrl;
      else delete copia[id];
      return copia;
    });
  };

  /**
   * SALVAR PERFIL DE KIT (criar/editar) — o diálogo devolve o payload e a
   * gravação vai para o serviço canônico (via mutation do hook).
   *
   * Em MODO DEMONSTRAÇÃO a gravação acontece no estado em memória do mock: o kit
   * entra na grade até a página recarregar (e o toast diz isso). Antes a escrita
   * era BLOQUEADA aqui, o que impedia testar o formulário e a imagem.
   *
   * A IMAGEM não é gravada (não existe coluna): ela é mantida só na SESSÃO, com
   * aviso explícito — nada de persistência fingida.
   */
  const salvarKit = (entrada: KitOnboardingInput) => {
    // Em demonstração não há empresa real a exigir; no modo real ela é pré-requisito.
    if (!emDemonstracao && !empresaAtual?.id) {
      toast.error('Selecione uma empresa antes de salvar o perfil de kit.');
      return;
    }
    /** Aviso honesto do que ACABOU de acontecer (demo × imagem de sessão). */
    const avisarExtras = () => {
      if (emDemonstracao) {
        toast.info('Modo demonstração: o perfil aparece na grade só nesta sessão — nada foi gravado no banco.');
      }
      if (entrada.imagem_url !== undefined) {
        toast.info('Imagem exibida nesta sessão: a gravação permanente depende de autorização para a coluna no banco.');
      }
    };
    if (kitEmEdicao?.kit) {
      const id = kitEmEdicao.kit.id;
      atualizarKit.mutate(
        { id, entrada },
        {
          onSuccess: () => {
            registrarImagemSessao(id, entrada.imagem_url ?? null);
            toast.success('Perfil de kit atualizado.');
            avisarExtras();
            setKitEmEdicao(null);
          },
          onError: () => toast.error('Não foi possível atualizar o perfil de kit.'),
        }
      );
      return;
    }
    criarKit.mutate(
      { empresaId: empresaAtual?.id ?? '', entrada },
      {
        onSuccess: (novoKit) => {
          registrarImagemSessao(novoKit.id, entrada.imagem_url ?? null);
          toast.success('Perfil de kit criado.');
          avisarExtras();
          setKitEmEdicao(null);
        },
        onError: () => toast.error('Não foi possível criar o perfil de kit.'),
      }
    );
  };

  return (
    <>
      <PageTitle title="Onboarding" description="Acompanhamento de novos colaboradores" />
      <PageLayout
        title={kitsAbertos ? undefined : 'Jornada de Onboarding'}
        description={
          kitsAbertos ? undefined : 'Acompanhe a integração, acessos, equipamentos e adaptação dos colaboradores.'
        }
        icon={kitsAbertos ? undefined : <Rocket className="h-5 w-5 text-primary-foreground" />}
        gradient="from-indigo-600 to-purple-600"
        className="max-w-[1600px]"
        actions={
          kitsAbertos ? undefined : (
            // `AnimatePresence` LOCAL: o app renderiza as rotas dentro de
            // `<AnimatePresence initial={false}>` (PageTransition.tsx) e esse
            // contexto suprime o keyframe inicial de qualquer `motion.*`
            // descendente; um contexto novo aqui devolve a entrada em cascata
            // (`cardVariants`). Cada botão leva um wrapper `motion.div` sem cor,
            // borda ou tamanho — o botão e os estados dele seguem idênticos.
            <AnimatePresence>
              {/* AÇÃO AUXILIAR do cabeçalho — violeta (chart-4), fora do grupo de
                  abas de status: kit é ferramenta da jornada, não estado do
                  colaborador. */}
              <motion.div
                key="acao-kits"
                custom={REVELA.acoesCabecalho}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="flex shrink-0"
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setKitsAbertos(true)}
                  className="h-10 shrink-0 gap-1.5 rounded-xl border-[hsl(var(--chart-4))]/60 bg-[hsl(var(--chart-4))]/10 px-3 text-xs text-[hsl(var(--chart-4))] transition-colors hover:border-[hsl(var(--chart-4))] hover:bg-[hsl(var(--chart-4))]/20"
                >
                  <Package className="h-3.5 w-3.5" />
                  Gestão de Kits
                </Button>
              </motion.div>
              {/* CTA PRINCIPAL — lime. Leva ao processo REAL que inicia a jornada
                  (nova admissão em `/admissoes`); não é um botão morto. */}
              <motion.div
                key="acao-onboarding"
                custom={REVELA.acoesCabecalho}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="flex shrink-0"
              >
                <Button
                  size="sm"
                  onClick={() => navigate('/admissoes')}
                  className="h-10 shrink-0 gap-1.5 rounded-xl bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Iniciar Onboarding
                </Button>
              </motion.div>
            </AnimatePresence>
          )
        }
      >
        <div className="space-y-4">
          {kitsAbertos ? (
            <AnimatePresence>
              {/* HEADER DA GESTÃO DE KITS — composição PRÓPRIA (o `PageLayout` não
                  é alterado, pois é compartilhado por todo o produto). Segue a
                  referência: "Voltar" ACIMA do título → linha do título (ícone +
                  título + descrição) com "Novo Kit" à direita → divisória; os
                  filtros entram logo abaixo, dentro de `GestaoKits`.

                  `AnimatePresence` local: o painel monta no clique do botão do
                  cabeçalho e cada bloco entra com a MESMA animação dos KPI Cards
                  (`cardVariants`), na ordem declarada em `REVELA_KITS`. */}
              <div key="kits-cabecalho" className="space-y-3">
                <motion.div
                  custom={REVELA_KITS.voltar}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  className="flex"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setKitsAbertos(false)}
                    className="h-9 shrink-0 gap-1.5 rounded-xl px-3 text-xs"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Voltar para Jornada
                  </Button>
                </motion.div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <motion.div
                    custom={REVELA_KITS.cabecalho}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex items-start gap-3"
                  >
                    <div className="shrink-0 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 p-2.5 shadow-lg">
                      <Package className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <h1 className="font-display text-2xl font-medium tracking-tight">Gestão de Kits</h1>
                      <p className="font-body mt-0.5 text-muted-foreground">
                        Configure os equipamentos, acessos e recursos entregues aos colaboradores durante o onboarding.
                      </p>
                    </div>
                  </motion.div>

                  {/* ÚNICO ponto de criação de kit (o card "Novo Kit" da grade foi
                      removido); abre o MESMO formulário de sempre. Alinhado ao
                      bloco do título (topo), não ao botão "Voltar". */}
                  <motion.div
                    custom={REVELA_KITS.cabecalho}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex shrink-0"
                  >
                    <Button
                      size="sm"
                      onClick={() => setKitEmEdicao({ kit: null })}
                      aria-label="Novo Kit"
                      className="h-10 shrink-0 gap-1.5 rounded-xl bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Novo Kit
                    </Button>
                  </motion.div>
                </div>

                <div className="border-t border-border/40" />
              </div>

              {/* GESTÃO DE KITS — grade redesenhada em `GestaoKits`: busca, filtro
                  de status, ordenação e resumo com contagens reais. Os três
                  estados (grade / nenhum perfil / erro de leitura) vivem dentro
                  do componente. */}
              <GestaoKits
                key="kits-grade"
                kits={kitsComImagem}
                isError={kitsComErro}
                departamentos={opcoesDepartamento}
                revealOffset={REVELA_KITS.conteudo}
                onEditar={(kit) => setKitEmEdicao({ kit })}
              />
            </AnimatePresence>
          ) : (
            <AnimatePresence>
              <Tabs key="jornada" value={activeTab} onValueChange={trocarAba} className="w-full space-y-3">
                <motion.div custom={REVELA.abas} variants={cardVariants} initial="hidden" animate="visible">
                  <TabsList className="relative inline-grid h-auto grid-cols-2 gap-0 rounded-xl border border-border/40 bg-muted/40 p-1">
                    {/* MESMA animação do toggle "Tabela/Cards" (GestaoCandidatos):
                    um indicador único que desliza por `transform` (CSS puro/GPU)
                    em vez de trocar a borda estática. `SlidingIndicator` é a peça
                    COMPARTILHADA entre as duas telas. */}
                    <SlidingIndicator atual={activeTab === 'concluidos' ? 1 : 0} />
                    <TabsTrigger
                      value="ativos"
                      className="relative z-10 gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-xs data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                    >
                      <Clock className="h-3.5 w-3.5" /> Em andamento ({resumo.emAndamento})
                    </TabsTrigger>
                    <TabsTrigger
                      value="concluidos"
                      className="relative z-10 gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-xs data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Concluídos ({resumo.concluidos})
                    </TabsTrigger>
                  </TabsList>
                </motion.div>

                {/* 2. BUSCA E FILTROS — uma ÚNICA linha compacta no desktop: busca
                  expansível, selects de largura controlada e as ações fixas no
                  fim. Em telas estreitas a faixa rola na horizontal. */}
                <div className="space-y-3 rounded-2xl border border-border/40 bg-card p-2.5 shadow-sm">
                  <div className="overflow-x-auto">
                    <div className="flex items-center gap-2">
                      <motion.div
                        custom={REVELA.filtros}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        className="relative min-w-[220px] flex-1"
                      >
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={termo}
                            onChange={(e) => setTermo(e.target.value)}
                            placeholder="Buscar por nome, cargo ou departamento..."
                            aria-label="Buscar na jornada de onboarding"
                            className="h-10 w-full rounded-xl border-border/40 bg-background/70 pl-9 text-sm"
                          />
                        </div>
                      </motion.div>

                      {[
                        {
                          valor: departamento,
                          set: setDepartamento,
                          placeholder: 'Departamento',
                          aria: 'Filtrar por departamento',
                          todos: 'Todos os departamentos',
                          opcoes: opcoesDepartamento,
                          largura: 'w-[190px]',
                        },
                        {
                          valor: responsavel,
                          set: setResponsavel,
                          placeholder: 'Responsável',
                          aria: 'Filtrar por responsável',
                          todos: 'Todos os responsáveis',
                          opcoes: opcoesResponsavel,
                          largura: 'w-[180px]',
                        },
                      ].map((campo) => (
                        <motion.div
                          key={campo.placeholder}
                          custom={REVELA.filtros}
                          variants={cardVariants}
                          initial="hidden"
                          animate="visible"
                          className={cn('flex shrink-0', campo.largura)}
                        >
                          <Select value={campo.valor} onValueChange={campo.set}>
                            <SelectTrigger
                              aria-label={campo.aria}
                              className={cn(
                                'h-10 w-full rounded-xl border-border/40 bg-background/70 text-xs',
                                LABEL_SELECT_INTEIRO
                              )}
                            >
                              <SelectValue placeholder={campo.placeholder} />
                            </SelectTrigger>
                            <SelectContent
                              position="popper"
                              side="bottom"
                              align="start"
                              avoidCollisions={false}
                              sideOffset={4}
                            >
                              <SelectItem value={VALOR_TODOS}>{campo.todos}</SelectItem>
                              {campo.opcoes.map((nome) => (
                                <SelectItem key={nome} value={nome}>
                                  {nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </motion.div>
                      ))}

                      <motion.div
                        custom={REVELA.filtros}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex w-[160px] shrink-0"
                      >
                        <Select value={etapa} onValueChange={setEtapa}>
                          <SelectTrigger
                            aria-label="Filtrar por etapa"
                            className={cn(
                              'h-10 w-full rounded-xl border-border/40 bg-background/70 text-xs',
                              LABEL_SELECT_INTEIRO
                            )}
                          >
                            <SelectValue placeholder="Etapa" />
                          </SelectTrigger>
                          <SelectContent
                            position="popper"
                            side="bottom"
                            align="start"
                            avoidCollisions={false}
                            sideOffset={4}
                          >
                            <SelectItem value={VALOR_TODOS}>Todas as etapas</SelectItem>
                            {ETAPAS_ONBOARDING.map((opcao) => (
                              <SelectItem key={opcao.value} value={opcao.value}>
                                {opcao.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </motion.div>

                      <div className="flex shrink-0 items-center gap-2">
                        <motion.div
                          custom={REVELA.filtros}
                          variants={cardVariants}
                          initial="hidden"
                          animate="visible"
                          className="flex shrink-0"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            aria-expanded={painelAberto}
                            onClick={() => setPainelAberto((aberto) => !aberto)}
                            className="h-10 min-w-[136px] shrink-0 gap-1.5 whitespace-nowrap rounded-xl border-border/40 px-3 text-xs"
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5" /> Mais filtros
                            <ChevronDown className={cn('h-3 w-3 transition-transform', painelAberto && 'rotate-180')} />
                          </Button>
                        </motion.div>
                        <motion.div
                          custom={REVELA.filtros}
                          variants={cardVariants}
                          initial="hidden"
                          animate="visible"
                          className="flex shrink-0"
                        >
                          <Button
                            variant={temFiltro ? 'default' : 'outline'}
                            size="sm"
                            disabled={!temFiltro}
                            onClick={limparFiltros}
                            className={cn(
                              'h-10 min-w-[146px] shrink-0 gap-1.5 whitespace-nowrap rounded-xl border px-3 text-xs',
                              temFiltro ? 'cursor-pointer border-transparent' : 'border-border/40 text-muted-foreground'
                            )}
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Limpar filtros
                          </Button>
                        </motion.div>
                      </div>
                    </div>
                  </div>

                  {/* Painel avançado — monta só quando "Mais filtros" está aberto */}
                  {painelAberto && (
                    <div className="flex flex-wrap items-end gap-2 border-t border-border/40 pt-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Início da jornada
                        </span>
                        <Select
                          value={periodo}
                          onValueChange={(v) => {
                            setPeriodo(v as PeriodoOnboarding);
                            setPagina(1);
                          }}
                        >
                          <SelectTrigger
                            aria-label="Filtrar por período de início"
                            className={cn(
                              'h-10 w-[214px] rounded-xl border-border/40 bg-background/60 text-[12px]',
                              LABEL_SELECT_INTEIRO
                            )}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PERIODOS_ONBOARDING.map((opcao) => (
                              <SelectItem key={opcao.value} value={opcao.value}>
                                {opcao.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. CHIPS + ORDENAÇÃO — filtros rápidos à esquerda e "Ordenar por"
                  à direita, na MESMA faixa horizontal (o select de ordenação saiu
                  da barra de filtros e veio para cá). Em telas estreitas só a
                  faixa de chips rola; a ordenação fica ancorada à direita. */}
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1 overflow-x-auto py-0.5">
                    <div className="flex items-center gap-2">
                      {chips.map((opcao) => (
                        <motion.div
                          key={opcao.value}
                          custom={REVELA.chips}
                          variants={cardVariants}
                          initial="hidden"
                          animate="visible"
                          className="flex min-w-fit"
                        >
                          <FilterChip
                            label={opcao.label}
                            total={totalDoChip(opcao.value)}
                            ativo={chip === opcao.value}
                            ponto={opcao.ponto}
                            onClick={() => alterarChip(opcao.value)}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="hidden text-[11px] text-muted-foreground sm:inline">Ordenar por</span>
                    <Select value={ordem} onValueChange={alterarOrdenacao}>
                      <SelectTrigger
                        aria-label="Ordenar a jornada"
                        className="h-9 w-[170px] gap-1.5 rounded-xl border-border/40 bg-background/70 text-xs"
                      >
                        <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <SelectValue placeholder="Ordenar" />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDENS_ONBOARDING.map((opcao) => (
                          <SelectItem key={opcao.value} value={opcao.value}>
                            {opcao.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 4. CONTEÚDO — `AnimatePresence` LOCAL (mesmo escudo da aba antiga
                  de Admissões): a rota já vem de um
                  `<AnimatePresence initial={false}>` (`PageTransition.tsx`) e esse
                  `initial={false}` é lido por CONTEXTO por todo `motion.*`
                  descendente, suprimindo o keyframe `hidden`. Aberto aqui, o
                  contexto novo devolve a entrada em cascata (`cardVariants`). */}
                <AnimatePresence>
                  <TabsContent key="aba-ativos" value="ativos">
                    {isLoading ? (
                      <div className="flex justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : baseDaAba.length === 0 ? (
                      <EstadoVazioJornada
                        icone={Rocket}
                        titulo="Nenhum onboarding ativo"
                        descricao="Inicie uma nova admissão para ver a jornada aqui."
                      />
                    ) : listaOrdenada.length === 0 ? (
                      <EstadoVazioJornada
                        icone={Search}
                        titulo="Nenhum colaborador com os filtros atuais"
                        descricao="Ajuste a busca ou limpe os filtros para ver a jornada completa."
                      />
                    ) : (
                      <GradeOnboarding linhas={listaExibida} acoes={acoes} />
                    )}
                  </TabsContent>

                  <TabsContent key="aba-concluidos" value="concluidos">
                    {concluidos.length === 0 ? (
                      <EstadoVazioJornada
                        icone={CheckCircle2}
                        titulo="Histórico de Integrações Concluídas"
                        descricao="Todos os colaboradores recentes já estão 100% integrados."
                        tomIcone="text-success"
                      />
                    ) : listaOrdenada.length === 0 ? (
                      <EstadoVazioJornada
                        icone={Search}
                        titulo="Nenhum colaborador com os filtros atuais"
                        descricao="Ajuste a busca ou limpe os filtros para ver o histórico completo."
                      />
                    ) : (
                      <GradeOnboarding linhas={listaExibida} acoes={acoes} />
                    )}
                  </TabsContent>
                </AnimatePresence>

                {/* 5. PAGINAÇÃO — a fatia acontece DEPOIS da ordenação; o contador
                  usa a lista ORDENADA/FILTRADA (não a página). Só aparece quando
                  há mais de uma página. */}
                {totalPaginas > 1 && (
                  <AnimatePresence>
                    <motion.div
                      key="paginacao"
                      custom={REVELA.paginacao}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      className="flex flex-wrap items-center justify-between gap-3 pt-1"
                    >
                      <p className="text-[11px] text-muted-foreground" data-testid="onboarding-contador">
                        Exibindo {(paginaAtual - 1) * ITENS_POR_PAGINA + 1}–
                        {(paginaAtual - 1) * ITENS_POR_PAGINA + listaExibida.length} de {listaOrdenada.length}{' '}
                        colaborador
                        {listaOrdenada.length === 1 ? '' : 'es'}
                      </p>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-xl"
                          disabled={paginaAtual <= 1}
                          onClick={() => setPagina(Math.max(1, paginaAtual - 1))}
                          aria-label="Página anterior"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((numero) => (
                          <Button
                            key={numero}
                            variant="outline"
                            size="icon"
                            onClick={() => setPagina(numero)}
                            aria-current={numero === paginaAtual ? 'page' : undefined}
                            className={cn(
                              'h-8 w-8 rounded-xl text-xs tabular-nums',
                              numero === paginaAtual && 'border-primary/60 text-primary'
                            )}
                          >
                            {numero}
                          </Button>
                        ))}
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-xl"
                          disabled={paginaAtual >= totalPaginas}
                          onClick={() => setPagina(Math.min(totalPaginas, paginaAtual + 1))}
                          aria-label="Próxima página"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )}
              </Tabs>
            </AnimatePresence>
          )}
        </div>
      </PageLayout>

      <OnboardingDetalheDialog
        colaborador={colaboradorDetalhe}
        open={!!colaboradorDetalhe}
        onOpenChange={(aberto) => !aberto && setColaboradorDetalhe(null)}
        onConcluirTarefa={concluir}
        tarefaConcluindo={tarefaConcluindo}
        onCopiarMensagemBoasVindas={acoes.onCopiarMensagemBoasVindas}
      />
      {/* CRUD de perfil de kit (nome + itens + ativo) sobre `onboarding_kits`. */}
      <KitOnboardingDialog
        open={kitEmEdicao !== null}
        onOpenChange={(aberto) => !aberto && setKitEmEdicao(null)}
        kit={kitEmEdicao?.kit ?? null}
        salvando={criarKit.isPending || atualizarKit.isPending}
        onSalvar={salvarKit}
      />
    </>
  );
}
