/**
 * GESTÃO DE KITS — grade de perfis de kit da Jornada de Onboarding.
 *
 * Redesenho de APRESENTAÇÃO da grade que antes vivia inline na `OnboardingPage`:
 * cards de kit mais informativos (área de imagem, status, itens detalhados),
 * cabeçalho com busca/filtro/ordenação e um resumo com contagens reais. É uma
 * EVOLUÇÃO da mesma tela — nenhuma regra de negócio nova, nenhuma navegação
 * falsa e NENHUM dado inventado.
 *
 * LIMITE HONESTO (sem tocar em backend/banco): o registro real
 * (`public.onboarding_kits`) tem apenas `nome`, `itens`, `ativo` e `created_at`.
 * NÃO existe coluna de imagem nem vínculo kit↔colaborador, então:
 *   • a área de imagem exibe a imagem do kit quando houver (imagem de SESSÃO,
 *     já que não há coluna persistida) ou o estado vazio "Sem imagem";
 *   • não há contagens de colaboradores/recebidos/pendentes nem progresso.
 * Essas informações dependem de mudança de schema (autorização separada) —
 * enquanto isso, nada fictício é exibido.
 *
 * TRÊS ESTADOS, distinguidos com honestidade (herdados da tela antiga):
 *   A) há kits           → grade + filtros;
 *   B) não há kits       → "nenhum perfil cadastrado";
 *   C) erro de leitura   → estado de ERRO explícito (NUNCA "nenhum kit").
 */
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  Camera,
  Code,
  Headphones,
  Laptop,
  LayoutGrid,
  Megaphone,
  Monitor,
  Package,
  Palette,
  Search,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { cn } from '@/lib/utils';
import type { KitOnboarding } from '@/services/onboardingJornadaService';

/** Mesmo teto de stagger das demais grades do produto. */
const MAX_STAGGER_INDEX = 5;

/**
 * SLOTS DA CASCATA DE ENTRADA — a animação é a MESMA dos KPI Cards do Dashboard
 * Executivo (`cardVariants`, importado de `dashboard/MetricCard.tsx`): fade +
 * subida de 20px, 0.4s, `delay = slot × 0.08s`, easing
 * `cubic-bezier(0.25,0.46,0.45,0.94)`.
 *
 * Cada FAIXA é um BLOCO (um slot), na ordem topo → base: os filtros de uma mesma
 * linha entram juntos e só a grade deixa cada card continuar a fila (como um KPI
 * por card no Dashboard). Assim o painel assenta rápido, sem acumular slots.
 *
 * `revealOffset` (prop) desloca a fila inteira quando o painel é hospedado
 * DEPOIS de um cabeçalho próprio — ver `OnboardingPage`, que passa a base para
 * as faixas entrarem depois de "Voltar"/título/"Novo Kit". Default 0: o
 * componente continua utilizável sozinho.
 */
const SLOT = {
  /** Faixa dos filtros — busca + os três selects entram juntos. */
  filtros: 0,
  resumo: 1,
  estadoVazio: 2,
  /** Grade de cards — cada card continua a fila a partir daqui. */
  cartoes: 3,
} as const;

/** Ordenações — todas derivadas de campos REAIS do perfil de kit. */
const ORDENS_KITS = [
  { value: 'recentes', label: 'Mais recentes' },
  { value: 'nome_az', label: 'Nome (A–Z)' },
  { value: 'nome_za', label: 'Nome (Z–A)' },
  { value: 'mais_itens', label: 'Mais itens' },
  { value: 'menos_itens', label: 'Menos itens' },
] as const;

type OrdemKit = (typeof ORDENS_KITS)[number]['value'];
type StatusKit = 'todos' | 'ativos' | 'inativos';

interface GestaoKitsProps {
  kits: KitOnboarding[];
  /** Erro de leitura dos kits (`useKits().isError`) — distinto de "lista vazia". */
  isError: boolean;
  /**
   * Opções REAIS de departamento (derivadas dos colaboradores da empresa pela
   * própria tela). Nunca inventadas aqui.
   */
  departamentos: string[];
  onEditar: (kit: KitOnboarding) => void;
  /**
   * Slot inicial da cascata de entrada (ver `SLOT`). Quem hospeda o painel
   * passa a base para filtros/grade continuarem a fila depois do próprio
   * cabeçalho; default 0 mantém o componente utilizável sozinho.
   */
  revealOffset?: number;
}

/** Valor do item "todos" nos selects (mesma convenção do resto do produto). */
const TODOS_DEPARTAMENTOS = 'todos';

/** Perfil ativo a menos que explicitamente inativo (convenção do serviço). */
const estaAtivo = (kit: KitOnboarding) => kit.ativo !== false;

/**
 * ÍCONE + COR DO KIT — marcadores **visuais**, não dados.
 *
 * `onboarding_kits` não tem coluna de ícone/categoria, então o glifo é derivado
 * do que o kit JÁ TEM de verdade: palavras do `nome` e, na falta delas, palavras
 * dos `itens`. É determinístico (mesmo kit → mesmo ícone E mesma cor), usa apenas
 * ícones que já existem no produto e cai em `Package` (o ícone histórico de kit)
 * quando nenhum termo casa. Nada aqui é persistido nem apresentado como informação.
 *
 * COR: nenhuma cor nova. Cada tema recebe um tom que JÁ existe no design system —
 * a MESMA paleta de `PALETA_AVATAR`/`TOM_*` (`onboardingComum.ts`): o lime
 * `--primary`, o `--info`, o `--success` (verde de "concluído"), o `--warning` e os
 * tokens de gráfico `--chart-4` (violeta) / `--chart-5` (magenta), todos consumidos
 * pelo resto da área. Convenção idêntica à dos chips: tint a 15% + tinta cheia +
 * filete a 25%. Escolhidos por serem DISTINTOS tanto no tema claro quanto no escuro
 * (evita pares como `--chart-2`/`--success`, que são o mesmo verde no claro). Sem
 * tema conhecido, o tom é `primary`.
 */
type TomChip = 'primary' | 'info' | 'success' | 'warning' | 'violeta' | 'magenta';

const CHIP_POR_TOM: Record<TomChip, string> = {
  primary: 'bg-primary/15 text-primary ring-primary/25',
  info: 'bg-info/15 text-info ring-info/25',
  success: 'bg-success/15 text-success ring-success/25',
  warning: 'bg-warning/15 text-warning ring-warning/25',
  violeta: 'bg-[hsl(var(--chart-4)/0.15)] text-[hsl(var(--chart-4))] ring-[hsl(var(--chart-4)/0.25)]',
  magenta: 'bg-[hsl(var(--chart-5)/0.15)] text-[hsl(var(--chart-5))] ring-[hsl(var(--chart-5)/0.25)]',
};

const ICONES_POR_NOME: { termos: string[]; Icone: LucideIcon; tom: TomChip }[] = [
  { termos: ['desenvolv', 'developer', 'engenharia', 'software', 'ti', 'tecnolog'], Icone: Code, tom: 'violeta' },
  { termos: ['marketing', 'comercial', 'vendas', 'growth'], Icone: Megaphone, tom: 'warning' },
  { termos: ['financ', 'contab', 'fiscal', 'tesouraria'], Icone: Wallet, tom: 'success' },
  { termos: ['rh', 'pessoas', 'gente', 'recursos'], Icone: Users, tom: 'info' },
  { termos: ['design', 'criativ', 'produto'], Icone: Palette, tom: 'magenta' },
  { termos: ['suporte', 'atendimento', 'logistica', 'operacoes'], Icone: Headphones, tom: 'primary' },
];

/** Segunda tentativa: o que os ITENS reais do kit sugerem (ex.: notebooks). */
const ICONES_POR_ITEM: { termos: string[]; Icone: LucideIcon; tom: TomChip }[] = [
  { termos: ['notebook', 'laptop', 'macbook', 'computador', 'desktop', 'ramal'], Icone: Laptop, tom: 'info' },
  { termos: ['monitor', 'display'], Icone: Monitor, tom: 'violeta' },
  { termos: ['headset', 'fone', 'auricular'], Icone: Headphones, tom: 'primary' },
  { termos: ['camera', 'webcam'], Icone: Camera, tom: 'magenta' },
];

/**
 * Casa o termo por PALAVRA (prefixo), não por substring solta — senão "ti"
 * (de TI) casaria dentro de "marketing" e o ícone sairia errado.
 */
function contemTermo(texto: string, termos: string[]): boolean {
  const palavras = texto.toLowerCase().split(/[^0-9a-z\u00e0-\u00ff]+/);
  return termos.some((termo) => palavras.some((palavra) => palavra.startsWith(termo)));
}

/**
 * Tema do kit: ícone + tom do chip (ver `ICONES_POR_NOME`). Nunca lança;
 * `Package`/`primary` é o fallback.
 */
function temaDoKit(kit: KitOnboarding): { Icone: LucideIcon; tom: TomChip } {
  const porNome = ICONES_POR_NOME.find(({ termos }) => contemTermo(kit.nome, termos));
  if (porNome) return porNome;
  const porItem = ICONES_POR_ITEM.find(({ termos }) => kit.itens.some((item) => contemTermo(item, termos)));
  return porItem ?? { Icone: Package, tom: 'primary' };
}

/**
 * Glifo do kit — componente PURO de apresentação que recebe o ícone por prop
 * (mesma convenção de `FilterChip`/`SectionHeader`/`EmptyState`: o componente
 * nunca é recriado dentro do render de quem o consome).
 */
function IconeDoKit({ icone: Icone, className }: { icone: LucideIcon; className?: string }) {
  return <Icone className={className} aria-hidden="true" />;
}

/**
 * Departamento REAL do kit — `onboarding_kits` não tem coluna de departamento,
 * então usa-se a MESMA inferência pelo nome que o filtro da grade já aplica
 * (`kit.nome.includes(departamento)`), contra a lista real de departamentos da
 * empresa. Sem correspondência, devolve `null` (nunca um departamento inventado).
 */
function departamentoDoKit(nome: string, departamentos: readonly string[]): string | null {
  const alvo = nome.toLowerCase();
  return departamentos.find((opcao) => opcao.length > 0 && alvo.includes(opcao.toLowerCase())) ?? null;
}

/** Data REAL de criação do perfil (`created_at`), quando o banco devolver uma. */
function dataDeCriacao(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? null : `Criado em ${data.toLocaleDateString('pt-BR')}`;
}

export function GestaoKits({ kits, isError, departamentos, onEditar, revealOffset = 0 }: GestaoKitsProps) {
  const [busca, setBusca] = useState('');
  const [departamento, setDepartamento] = useState(TODOS_DEPARTAMENTOS);
  const [status, setStatus] = useState<StatusKit>('todos');
  const [ordem, setOrdem] = useState<OrdemKit>('recentes');

  const kitsFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const filtrados = kits.filter((kit) => {
      if (status === 'ativos' && !estaAtivo(kit)) return false;
      if (status === 'inativos' && estaAtivo(kit)) return false;
      // DEPARTAMENTO: `onboarding_kits` NÃO tem coluna de departamento, então o
      // vínculo é inferido pelo NOME do kit (ex.: "Kit Marketing" → Marketing)
      // usando apenas dados reais (nome do kit + departamentos reais da empresa).
      if (departamento !== TODOS_DEPARTAMENTOS && !kit.nome.toLowerCase().includes(departamento.toLowerCase())) {
        return false;
      }
      if (!termo) return true;
      return [kit.nome, ...kit.itens].join(' ').toLowerCase().includes(termo);
    });
    return [...filtrados].sort((a, b) => {
      switch (ordem) {
        case 'nome_az':
          return a.nome.localeCompare(b.nome, 'pt-BR');
        case 'nome_za':
          return b.nome.localeCompare(a.nome, 'pt-BR');
        case 'mais_itens':
          return b.itens.length - a.itens.length || a.nome.localeCompare(b.nome, 'pt-BR');
        case 'menos_itens':
          return a.itens.length - b.itens.length || a.nome.localeCompare(b.nome, 'pt-BR');
        case 'recentes':
        default:
          return (b.created_at ?? '').localeCompare(a.created_at ?? '');
      }
    });
  }, [kits, busca, departamento, status, ordem]);

  const ativos = useMemo(() => kits.filter(estaAtivo).length, [kits]);
  const totalItens = useMemo(() => kits.reduce((soma, kit) => soma + kit.itens.length, 0), [kits]);

  // ── ESTADO C: erro de leitura ≠ "nenhum kit" ──────────────────────────────
  if (isError) {
    return (
      <AnimatePresence>
        <motion.div custom={revealOffset + SLOT.estadoVazio} variants={cardVariants} initial="hidden" animate="visible">
          <Card
            data-testid="kits-erro"
            className="rounded-2xl border-2 border-dashed border-destructive-vivid/50 p-12 text-center text-muted-foreground"
          >
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive-vivid opacity-60" />
            <p className="font-display font-medium text-foreground">Não foi possível carregar os perfis de kit</p>
            <p className="text-sm">
              Falha de permissão ou de conexão na leitura de <code>onboarding_kits</code>. Isso NÃO significa que não
              existam perfis cadastrados.
            </p>
          </Card>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── ESTADO B: nenhum perfil cadastrado ────────────────────────────────────
  if (kits.length === 0) {
    return (
      <AnimatePresence>
        <motion.div custom={revealOffset + SLOT.estadoVazio} variants={cardVariants} initial="hidden" animate="visible">
          <Card className="rounded-2xl border-2 border-dashed border-border/50 p-12 text-center text-muted-foreground">
            <Package className="mx-auto mb-4 h-12 w-12 opacity-20" />
            <p className="font-display font-medium">Nenhum perfil de kit cadastrado</p>
            <p className="text-sm">Use “Novo Kit” para criar o primeiro — ele passa a aparecer aqui.</p>
          </Card>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── ESTADO A: busca/filtros + resumo + grade ──────────────────────────────
  return (
    <AnimatePresence>
      <div className="space-y-4">
        {/* FILTROS — diretamente na página, SEM card. Em desktop os QUATRO controles
          ficam na MESMA linha, com a BUSCA ocupando a maior largura. */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <motion.div
            custom={revealOffset + SLOT.filtros}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="relative flex-1"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar kit por nome, departamento ou item…"
              aria-label="Buscar kit por nome, departamento ou item"
              className="h-10 rounded-xl border-border/40 bg-background/70 pl-9 text-sm"
            />
          </motion.div>

          <motion.div
            custom={revealOffset + SLOT.filtros}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="flex w-full lg:w-[220px]"
          >
            <Select value={departamento} onValueChange={setDepartamento}>
              <SelectTrigger
                aria-label="Filtrar kits por departamento"
                className="h-10 w-full rounded-xl border-border/40 bg-background/70 text-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS_DEPARTAMENTOS}>Todos os departamentos</SelectItem>
                {departamentos.map((opcao) => (
                  <SelectItem key={opcao} value={opcao}>
                    {opcao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>

          <motion.div
            custom={revealOffset + SLOT.filtros}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="flex w-full lg:w-[180px]"
          >
            <Select value={status} onValueChange={(valor) => setStatus(valor as StatusKit)}>
              <SelectTrigger
                aria-label="Filtrar kits por status"
                className="h-10 w-full gap-1.5 rounded-xl border-border/40 bg-background/70 text-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="ativos">Somente ativos</SelectItem>
                <SelectItem value="inativos">Somente inativos</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>

          <motion.div
            custom={revealOffset + SLOT.filtros}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="flex w-full lg:w-[220px]"
          >
            <Select value={ordem} onValueChange={(valor) => setOrdem(valor as OrdemKit)}>
              <SelectTrigger
                aria-label="Ordenar kits"
                className="h-10 w-full gap-1.5 rounded-xl border-border/40 bg-background/70 text-xs"
              >
                <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDENS_KITS.map((opcao) => (
                  <SelectItem key={opcao.value} value={opcao.value}>
                    {opcao.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>
        </div>

        {/* ESTATÍSTICAS — contagens REAIS, na própria página (sem card). */}
        <motion.div
          custom={revealOffset + SLOT.resumo}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground"
        >
          <span className="inline-flex items-center gap-1.5">
            <LayoutGrid className="h-3.5 w-3.5" />
            <strong className="font-semibold text-foreground">{kits.length}</strong>
            {kits.length === 1 ? 'kit cadastrado' : 'kits cadastrados'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            {ativos} {ativos === 1 ? 'ativo' : 'ativos'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" />
            {totalItens} {totalItens === 1 ? 'item' : 'itens'} no total
          </span>
        </motion.div>

        {kitsFiltrados.length === 0 ? (
          <motion.div
            custom={revealOffset + SLOT.estadoVazio}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <Card className="rounded-2xl border-2 border-dashed border-border/50 p-12 text-center text-muted-foreground">
              <Search className="mx-auto mb-4 h-12 w-12 opacity-20" />
              <p className="font-display font-medium">Nenhum kit com os filtros atuais</p>
              <p className="text-sm">Ajuste a busca ou limpe os filtros para ver todos os perfis.</p>
            </Card>
          </motion.div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {kitsFiltrados.map((kit, index) => (
              <motion.div
                key={kit.id}
                custom={revealOffset + SLOT.cartoes + Math.min(index, MAX_STAGGER_INDEX)}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="h-full"
              >
                <KitOnboardingCard kit={kit} departamentos={departamentos} onEditar={onEditar} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}

/**
 * Card individual de um perfil de kit.
 *
 * ESTRUTURA (fiel à referência de redesign):
 *
 *   CARD (flex-col, h-full)
 *   ├── CARD-CONTENT            → grid `26% | 1fr`, gap 20px, padding 16px
 *   │   ├── KIT-IMAGE           → RETRATO (aspect 77/100), à esquerda, topo alinhado
 *   │   └── KIT-INFO
 *   │       ├── KIT-HEADER      → ícone do kit + nome · subtítulo, status à direita
 *   │       ├── KIT-ITEM-COUNT  → "5 itens" (ÚNICA aparição da contagem)
 *   │       └── ITEMS-LIST      → itens reais em DUAS colunas
 *   └── CARD-FOOTER             → divisória + "Gerenciar kit →" + menu ⋮
 *
 * DADOS: só o que existe de verdade. O subtítulo usa o departamento REAL
 * inferido pelo nome (mesma regra do filtro) ou, na falta dele, a data real de
 * criação; sem nenhum dos dois, a linha simplesmente não aparece. `onboarding_kits`
 * não tem vínculo kit↔colaborador, então NÃO há contador de colaboradores nem
 * barra de progresso (nada inventado). A imagem é a real quando houver; senão,
 * o estado vazio "Sem imagem" — na MESMA proporção retrato.
 */
function KitOnboardingCard({
  kit,
  departamentos,
  onEditar,
}: {
  kit: KitOnboarding;
  departamentos: readonly string[];
  onEditar: (kit: KitOnboarding) => void;
}) {
  const ativo = estaAtivo(kit);
  const totalItens = kit.itens.length;
  // ÍCONE + COR do chip, derivados do MESMO tema (determinístico por kit).
  const { Icone, tom } = temaDoKit(kit);
  // Subtítulo: SOMENTE dado real (departamento inferido pelo nome ou data de
  // criação). Sem dado real disponível, a linha não é renderizada.
  const subtitulo = departamentoDoKit(kit.nome, departamentos) ?? dataDeCriacao(kit.created_at);

  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-2xl border-border/40 bg-card/50 transition-colors hover:border-border/70">
      {/* CARD-CONTENT — duas colunas (grid): imagem retrato (esquerda) | informações (direita).
          `28.5%` da ÁREA DE CONTEÚDO (já descontado o padding de 16px) = ~26% da
          largura TOTAL do card, exatamente a proporção da referência (136/519). */}
      <div className="grid grid-cols-[28.5%_minmax(0,1fr)] items-start gap-5 p-4">
        {/* KIT-IMAGE — RETRATO: proporção própria (`aspect-[77/100]`), nunca
            herdada do conteúdo (`items-start`, sem `items-stretch`), para não
            esticar nem espremer a foto. */}
        <div className="relative aspect-[77/100] w-full overflow-hidden rounded-xl border border-border/40 bg-muted/30">
          {kit.imagem_url ? (
            <img src={kit.imagem_url} alt={`Imagem do kit ${kit.nome}`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1">
              <Package className="h-7 w-7 text-muted-foreground/45" />
              <span className="text-[9px] uppercase tracking-wide text-muted-foreground/60">Sem imagem</span>
            </div>
          )}
        </div>

        {/* KIT-INFO — ícone + nome/subtítulo e status no topo; contagem e lista. */}
        <div className="flex min-w-0 flex-col">
          {/* KIT-HEADER — ícone (esquerda) · nome na FRENTE do ícone · status no
              CANTO SUPERIOR DIREITO. O selo fica EXATAMENTE onde estava (topo-
              direita): `float-right` preserva a posição, mas — ao contrário de um
              item flex que espremeria a linha inteira — só "encurta" a PRIMEIRA
              linha do nome. Se o nome for longo, ele quebra na fronteira da
              palavra e a linha SEGUINTE usa a largura TOTAL da coluna: nunca corta
              a palavra ao meio e nunca passa por baixo do selo. */}
          <div className="flex items-start gap-2.5">
            <span
              className={cn(
                'grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ring-inset',
                CHIP_POR_TOM[tom]
              )}
            >
              <IconeDoKit icone={Icone} className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <Badge
                variant={ativo ? 'success' : 'secondary'}
                size="sm"
                className="float-right ml-2 gap-1 whitespace-nowrap"
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', ativo ? 'bg-success' : 'bg-muted-foreground')} />
                {ativo ? 'Ativo' : 'Inativo'}
              </Badge>
              <h3 className="break-words font-display text-[18px] font-semibold leading-tight text-foreground">
                {kit.nome}
              </h3>
              {subtitulo && (
                <p className="clear-right mt-0.5 truncate text-[12px] text-muted-foreground">{subtitulo}</p>
              )}
            </div>
          </div>

          {/* KIT-ITEM-COUNT — quantidade REAL de itens (ÚNICA aparição no card). */}
          <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Package className="h-3.5 w-3.5 shrink-0" />
            {totalItens} {totalItens === 1 ? 'item' : 'itens'}
          </p>

          {/* ITEMS-LIST — itens REAIS em DUAS colunas: sem teto artificial de
              itens e sem "+N mais…" (só o texto individual é que trunca, se
              realmente não couber). */}
          {totalItens > 0 ? (
            <ul className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1">
              {kit.itens.map((item) => (
                <li
                  key={item}
                  className="flex min-w-0 items-center gap-1.5 text-[12.5px] leading-snug text-foreground/90"
                >
                  <span className="h-1 w-1 shrink-0 rounded-full bg-primary/60" />
                  <span className="truncate">{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[12.5px] italic text-muted-foreground/70">Sem itens cadastrados</p>
          )}
        </div>
      </div>

      {/* CARD-FOOTER — divisória fina + ação principal ("Gerenciar kit →").
          É a ÚNICA ação do card; o antigo menu ⋮ foi removido por duplicar
          exatamente esta mesma edição. */}
      <div className="mt-auto flex items-center justify-end border-t border-border/40 px-3 py-3">
        <Button
          variant="default"
          size="sm"
          className="h-8 gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium"
          onClick={() => onEditar(kit)}
        >
          Gerenciar kit
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}
