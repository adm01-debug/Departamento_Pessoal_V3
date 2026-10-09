/**
 * ============================================================================
 * Calculadora de Rescisão — COLUNA DIREITA (resultado).
 *
 * Painel de leitura do `RescisaoResult` que o formulário acabou de calcular:
 * KPIs no topo, abas internas (Demonstrativo · Resumo · Base de cálculo ·
 * Histórico), resumo final com o líquido estimado e as duas ações do rodapé.
 *
 * Não calcula nada e não grava nada: recebe o resultado pronto e os handlers
 * da página (`onGerarPDF` = `gerarPDFRescisao`, `onSalvar` = `salvarHistorico`).
 * Sem resultado, mostra o estado de aguardo — nunca um card vazio.
 * ============================================================================
 */
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calculator,
  CheckCircle2,
  Download,
  FileText,
  History,
  Landmark,
  Loader2,
  Save,
  ScrollText,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { AnimatedTabsList, AnimatedTabsTrigger } from '@/components/ui/animated-tabs';
import { MotionCard, entradaCard, MAX_ENTRADA_INDEX } from '@/components/ui/entrada-cards';
import { AnimatedNumber } from '@/components/dashboard/AnimatedNumber';
import { cn } from '@/lib/utils';
import { fmt, type RescisaoResult } from '@/utils/rescisaoCalc';
import { motion } from 'framer-motion';
import {
  aliquotaEfetiva,
  labelTipoRescisao,
  montarBaseCalculo,
  montarDemonstrativo,
  montarResumo,
  type HistoricoCalculo,
  type MecanismoCalculo,
  type RescisaoFormState,
  type SecaoDemonstrativo,
  type TomResumo,
} from './rescisaoView';

export interface ResultadoRescisaoProps {
  result: RescisaoResult | null;
  form: RescisaoFormState;
  mecanismo: MecanismoCalculo;
  historico: HistoricoCalculo[];
  saving: boolean;
  onGerarPDF: () => void;
  onSalvar: () => void;
}

const ABAS = [
  { value: 'demonstrativo', label: 'Demonstrativo', icone: ScrollText },
  { value: 'resumo', label: 'Resumo', icone: FileText },
  { value: 'base', label: 'Base de cálculo', icone: Calculator },
  { value: 'historico', label: 'Histórico', icone: History },
];

/** Skin do indicador deslizante da tablist (mesmo mecanismo do Dossiê). */
const ABAS_CONTAINER =
  'w-full rounded-xl border border-border/40 bg-muted/20 p-1 text-muted-foreground inline-flex items-center h-auto';
/** Trigger: inativo = cinza secundário sobre o fundo escuro do container, com
 *  hover para uma tonalidade intermediária (`hover:text-foreground`); ativo =
 *  texto/ícone ESCUROS (`text-primary-foreground`) para ficarem legíveis sobre o
 *  preenchimento verde-lima do indicador. O ícone herda `currentColor` (nenhuma
 *  classe de cor própria), então acompanha o texto sozinho. */
const ABAS_TRIGGER =
  'relative z-10 inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 hover:text-foreground data-[state=active]:text-primary-foreground';
/** Indicador deslizante: o MESMO `motion.div` do `AnimatedTabsList` (a animação
 *  continua sendo a mola oficial) — só a SKIN muda. Verde-lima sólido vindo do
 *  token oficial do Design System (`bg-primary`, idêntico em claro/escuro), sem
 *  borda nem glow: só uma sombra discreta para destacar a pílula. */
const ABAS_HIGHLIGHT = 'rounded-lg bg-primary shadow-sm';

/** Cor de cada tom semântico do KPI/resumo (texto + ponto).
 *  O `chip` (fundo do quadrado do ícone) saiu junto com o quadrado: a cor do
 *  ícone do KPI passou a ser a própria cor do tom (`texto`). */
const TONS: Record<TomResumo, { texto: string; ponto: string }> = {
  success: { texto: 'text-success', ponto: 'bg-success' },
  destructive: { texto: 'text-destructive-vivid', ponto: 'bg-destructive-vivid' },
  info: { texto: 'text-info', ponto: 'bg-info' },
  primary: { texto: 'text-primary', ponto: 'bg-primary' },
};

const TONS_SECAO: Record<SecaoDemonstrativo['id'], { cabecalho: string; valor: string; icone: React.ElementType }> = {
  proventos: { cabecalho: 'bg-success/10 text-success', valor: 'text-success', icone: ArrowUpRight },
  descontos: {
    cabecalho: 'bg-destructive-vivid/10 text-destructive-vivid',
    valor: 'text-destructive-vivid',
    icone: ArrowDownRight,
  },
  fgts: { cabecalho: 'bg-info/10 text-info', valor: 'text-info', icone: Landmark },
};

/**
 * Superfície padrão dos SUBCARDS internos do painel de resultado (KPIs, blocos do
 * demonstrativo, mini-cards do resumo, tabelas e estados vazios das quatro abas).
 *
 * O problema original: o card principal é `bg-card` (hsl 214 42% 12%) e os blocos
 * internos usavam ou nenhum fundo (transparente — herdavam o próprio `bg-card`) ou
 * `bg-muted/10`, que soma só ~2% de luminosidade ao card. Resultado: os subcards
 * liam como o MESMO plano do container e a página não tinha hierarquia.
 *
 * Aqui cada bloco desce UM degrau na escada de superfícies: `bg-background/50`
 * (`--background`: hsl 216 48% 8%, mais ESCURO/fechado que o `--card`) composto
 * sobre o card. É o mesmo tratamento já usado em `DetalhesAdmissaoDialog`
 * (`CARD_PANEL`) e no `FormularioRescisao` desta feature — subcard embutido, não
 * "caixa clara" flutuando. A separação vem da:
 *   • superfície um degrau abaixo (`bg-background/50`);
 *   • borda sutil de baixa opacidade (`border-border/40`);
 *   • sombra curta de 1px, apenas para assentar o bloco (`0 1px 2px rgba(0,0,0,.35)`);
 *   • cantos `rounded-xl` (mesma régua do design system para blocos internos).
 * Nada de gradiente, glow ou realce claro: o destaque vem da superfície e do
 * CONTEÚDO, mantendo o navy premium e o contraste refinado do sistema.
 */
const SUBCARD_INTERNO = 'rounded-xl border border-border/40 bg-background/50 shadow-[0_1px_2px_rgba(0,0,0,0.35)]';

/** KPI de topo do painel (Proventos · Descontos · Valor líquido). */
function KpiResultado({
  icone: Icone,
  rotulo,
  valor,
  tom,
  indice,
}: {
  icone: React.ElementType;
  rotulo: string;
  valor: number;
  tom: TomResumo;
  indice: number;
}) {
  const cores = TONS[tom];
  return (
    <MotionCard {...entradaCard(indice)} className={SUBCARD_INTERNO}>
      <CardContent className="flex items-center gap-2.5 p-3">
        {/* Ícone de destaque do KPI: 26px direto no fundo do card, na cor do tom
            (verde · vermelho · primary) — sem o chip quadrado que existia. */}
        <Icone className={cn('h-[26px] w-[26px] shrink-0', cores.texto)} />
        {/* `min-w-0 flex-1`: o bloco de texto ocupa TODA a largura restante ao
            lado do ícone. Antes ele não crescia (`min-w-0` sozinho) e o valor —
            com `truncate` — era cortado em `...`. Sem `truncate` e com `flex-1`
            o número aparece inteiro; `break-words` só age no último recurso
            (tela muito estreita), trocando o corte por uma quebra visível. */}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-body text-muted-foreground">{rotulo}</p>
          <p className={cn('break-words font-display text-base font-semibold leading-tight tabular-nums', cores.texto)}>
            R$ <AnimatedNumber value={valor} format={fmt} decimals={2} />
          </p>
        </div>
      </CardContent>
    </MotionCard>
  );
}

/**
 * Um bloco do demonstrativo (PROVENTOS · DESCONTOS · FGTS): cabeçalho colorido
 * com o total da seção à direita e a tabela Descrição | Referência | Valor.
 */
/**
 * Um bloco do demonstrativo (PROVENTOS · DESCONTOS · FGTS): cabeçalho colorido
 * com o total da seção à direita e a tabela Descrição | Referência | Valor.
 *
 * O bloco é o CARD desta seção do demonstrativo e por isso carrega a entrada de
 * referência (`entradaCard`) com o próprio índice na cascata da aba. O alvo é um
 * `motion.div` — espelho 1:1 do `div` que já existia (`motion.div` e `div`
 * produzem o MESMO nó, com as MESMAS classes): assim nada muda de cor, sombra,
 * raio ou espaçamento. `Card`/`MotionCard` fica reservado aos blocos que JÁ eram
 * `Card`, porque ele carrega as classes-base do design system (`bg-card`,
 * `shadow-card`, `animate-squash`).
 */
function BlocoDemonstrativo({ secao, indice }: { secao: SecaoDemonstrativo; indice: number }) {
  const skin = TONS_SECAO[secao.id];
  const Icone = skin.icone;

  return (
    <motion.div {...entradaCard(indice)} className={cn(SUBCARD_INTERNO, 'overflow-hidden')}>
      <div className={cn('flex items-center justify-between gap-3 px-3 py-2', skin.cabecalho)}>
        {/* Ícone da seção (PROVENTOS · DESCONTOS · FGTS): 22px direto na faixa
            colorida do bloco — nunca houve quadrado aqui, e a cor herdada da
            faixa (`text-success` · `text-destructive-vivid` · `text-info`) é a
            mesma. `gap-3` mantém os ~12px até o rótulo da seção. */}
        <span className="flex items-center gap-3 font-display text-[11px] font-semibold uppercase tracking-wider">
          <Icone className="h-[22px] w-[22px] shrink-0" />
          {secao.titulo}
        </span>
        <span className="font-display text-sm font-semibold tabular-nums">
          R$ <AnimatedNumber value={secao.total} format={fmt} decimals={2} />
        </span>
      </div>
      <table className="w-full border-collapse text-xs font-body">
        <thead>
          <tr className="border-b border-border/30 bg-muted/20 text-[10px] uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="px-3 py-2 text-left font-medium">
              Descrição
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Referência
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Valor (R$)
            </th>
          </tr>
        </thead>
        <tbody>
          {secao.linhas.map((linha) => (
            <tr
              key={linha.descricao}
              className="border-b border-border/20 transition-colors last:border-0 hover:bg-muted/20"
            >
              <td className="px-3 py-3 text-foreground/90">{linha.descricao}</td>
              <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{linha.referencia}</td>
              <td
                className={cn(
                  'px-3 py-3 text-right font-medium tabular-nums',
                  linha.valor ? skin.valor : 'text-muted-foreground'
                )}
              >
                R$ {fmt(linha.valor)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}

/**
 * Estado de aguardo — o que o painel mostra ANTES do primeiro cálculo. Não é
 * um card vazio: explica o que vai aparecer e com que tabelas o cálculo é
 * feito, mantendo a estrutura do painel de resultado.
 */
function PainelAguardando() {
  // Cada promessa carrega a própria TINTA semântica (ícone + título) e o realce
  // de borda do hover. `--chart-4` (violeta) não está registrado no tema do
  // Tailwind — é consumido como valor arbitrário, mesma convenção de
  // `organograma/OrganogramaStats.tsx` e `admissoes/kanbanComum.ts`.
  const promessas = [
    {
      icone: ScrollText,
      titulo: 'Demonstrativo',
      descricao: 'Cada verba, desconto e o FGTS linha a linha',
      tinta: 'text-info',
      bordaHover: 'hover:border-info/45',
    },
    {
      icone: FileText,
      titulo: 'Resumo e bases',
      descricao: 'Totais, memória de cálculo e alíquotas efetivas',
      tinta: 'text-[hsl(var(--chart-4))]',
      bordaHover: 'hover:border-[hsl(var(--chart-4)/0.45)]',
    },
    {
      icone: Download,
      titulo: 'TRCT em PDF',
      descricao: 'Documento pronto para conferência e assinatura',
      tinta: 'text-success',
      bordaHover: 'hover:border-success/45',
    },
  ];

  return (
    <MotionCard
      {...entradaCard(4)}
      // SEM `self-start`: no estado inicial este card é o item da MESMA linha do
      // grid que hospeda a seção "1. Colaborador" (ver `FormularioRescisao`), e o
      // `items-stretch` daquele grid o iguala EXATAMENTE à altura da seção 1.
      // Se a seção 1 crescer (colaborador selecionado), o card a acompanha — o
      // conteúdo permanece no topo e o excedente fica na base, nunca um card
      // tracejado gigante com o miolo flutuando.
      className="overflow-hidden rounded-2xl border-dashed border-border/50 bg-card/60"
    >
      <CardContent className="p-5">
        <div className="flex flex-col items-center text-center">
          {/* O estado de aguardo não tem cabeçalho: o ícone é a ilustração do
              placeholder e segue a mesma regra — sem o quadrado de 56px, 36px
              direto no fundo do card. Cor muted segue igual; os espaçamentos
              verticais foram compactados (`p-5`, `mt-3`) para o conteúdo caber
              na régua da seção 1 sem inflar a linha. */}
          <Calculator className="h-9 w-9 text-muted-foreground" />
          <h3 className="mt-3 font-display text-[15px] font-semibold">Preencha os dados e clique em calcular</h3>
          <p className="mt-1 max-w-md text-pretty text-xs font-body leading-relaxed text-muted-foreground">
            O resultado aparece aqui com o demonstrativo completo das verbas rescisórias, descontos legais e o valor
            líquido estimado.
          </p>
        </div>

        {/* Cards informativos: cada um é uma superfície INTERNA — um degrau mais
            escuro que o `bg-card/60` do estado de aguardo (usa o mesmo navy
            profundo da página, `bg-background`), com borda azul-acinzentada
            discreta. O ícone e o TÍTULO recebem a tinta semântica do item; a
            descrição permanece em cinza secundário. Hover discreto (200ms):
            borda levemente iluminada pela cor do item e fundo um pouco mais
            claro. Seguem sendo `div` informativas — nenhuma vira botão. */}
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {promessas.map((item) => (
            <div
              key={item.titulo}
              className={cn(
                'rounded-xl border border-border/60 bg-background p-3 transition-colors duration-200 hover:bg-background/70',
                item.bordaHover
              )}
            >
              <item.icone className={cn('h-[22px] w-[22px]', item.tinta)} />
              <p className={cn('mt-2 font-display text-xs font-semibold', item.tinta)}>{item.titulo}</p>
              <p className="mt-0.5 text-pretty text-[11px] font-body leading-snug text-muted-foreground">
                {item.descricao}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-3 text-center text-[11px] font-body text-muted-foreground/80">
          Cálculos baseados nas tabelas INSS/IRRF 2026
        </p>
      </CardContent>
    </MotionCard>
  );
}

export function ResultadoRescisao({
  result,
  form,
  mecanismo,
  historico,
  saving,
  onGerarPDF,
  onSalvar,
}: ResultadoRescisaoProps) {
  const [aba, setAba] = useState('demonstrativo');

  // Sem resultado, o painel mostra o estado de aguardo (mesma casca visual).
  if (!result) return <PainelAguardando />;

  const secoes = montarDemonstrativo(result);
  const resumo = montarResumo(result, form.tipo, mecanismo);
  const bases = montarBaseCalculo(result, Number(form.saldoFGTS || 0));
  const momento = new Date(result.timestamp);
  const dataCalculo = format(momento, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  const assinatura = result.assinaturaDigital?.slice(0, 10);

  return (
    <MotionCard
      {...entradaCard(4)}
      // `h-full + flex flex-col`: o painel ESTICA até a altura da coluna de
      // entrada (grid `items-stretch`) e passa a distribuir o próprio conteúdo
      // na vertical. O excedente NÃO fica preso no rodapé: o `CardContent` e a
      // `Tabs` são `flex-1`, e a região do demonstrativo (aba ativa) é a que
      // cresce e reparte a sobra entre os seus blocos. Assim o painel termina na
      // MESMA régua da coluna esquerda e os botões finais alinham com "Calcular
      // rescisão" — sem vão interno único.
      className="flex h-full flex-col overflow-hidden rounded-2xl border-border/30 bg-card shadow-elevated"
    >
      {/* ── Cabeçalho do painel ────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 border-b border-border/30 p-5 pb-4">
        <div className="flex items-start gap-3">
          {/* Ícone do cabeçalho do painel: sem o quadrado de 32px (fundo, borda
              e raio) — 24px direto no fundo do card, com o `-mt-1` centrando os
              24px na linha do título. Cor `text-primary` preservada. */}
          <BarChart3 className="-mt-1 h-6 w-6 shrink-0 text-primary" />
          <div className="min-w-0">
            <h3 className="font-display text-[13px] font-semibold leading-tight">Resultado da Rescisão</h3>
            <p className="mt-0.5 text-pretty text-xs font-body leading-snug text-muted-foreground">
              Demonstrativo das verbas rescisórias, descontos e valor líquido estimado.
            </p>
          </div>
        </div>
        <Badge variant="success" size="sm" className="shrink-0 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Cálculo concluído
        </Badge>
      </div>

      {/* `flex-1`: o conteúdo ocupa TODA a altura restante do painel esticado.
          Cabeçalho, KPIs, líquido e botões têm altura natural; quem absorve a
          sobra é a `Tabs` (abaixo), que também é `flex-1`. */}
      <CardContent className="flex flex-1 flex-col gap-4 p-5">
        {/* ── KPIs superiores ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiResultado
            icone={ArrowUpRight}
            rotulo="Proventos"
            valor={result.totalProventos}
            tom="success"
            indice={5}
          />
          <KpiResultado
            icone={ArrowDownRight}
            rotulo="Descontos"
            valor={result.totalDescontos}
            tom="destructive"
            indice={6}
          />
          <KpiResultado icone={Wallet} rotulo="Valor líquido" valor={result.totalLiquido} tom="primary" indice={7} />
        </div>

        {/* ── Abas internas ─────────────────────────────────────────────── */}
        {/* `flex-1`: a área das abas é a REGIÃO PRINCIPAL que cresce para
            absorver a sobra de altura do painel. A tablist fica natural; o
            conteúdo ativo decide como usar o espaço extra (o demonstrativo
            distribui entre os blocos; as demais abas preservam a altura
            natural do próprio conteúdo). */}
        <Tabs value={aba} onValueChange={setAba} className="flex flex-1 flex-col gap-3">
          <AnimatedTabsList
            value={aba}
            onValueChange={setAba}
            containerClassName={ABAS_CONTAINER}
            highlightClassName={ABAS_HIGHLIGHT}
            listClassName="relative flex w-full items-center gap-1"
          >
            {ABAS.map((item) => (
              <AnimatedTabsTrigger key={item.value} value={item.value} className={ABAS_TRIGGER}>
                <item.icone className="h-3.5 w-3.5" />
                {item.label}
              </AnimatedTabsTrigger>
            ))}
          </AnimatedTabsList>

          {/* Região D (Demonstrativo): `flex-1` + `justify-between` faz a sobra
              de altura ser REPARTIDA igualmente entre os três blocos (proventos
              · descontos · FGTS) — nenhum vão único, nenhum bloco esticado até
              uma altura absurda. `gap-3` mantém o mínimo de ~12px entre blocos
              mesmo quando não há sobra. */}
          <TabsContent value="demonstrativo" className="mt-0 flex flex-1 flex-col justify-between gap-3">
            {/* Cascata LOCAL da aba: o índice aqui é a ordem de leitura DESTA
                apresentação (bloco 0, 1, 2…), como em toda lista do sistema —
                cada bloco é um card e recebe um único controle de entrada. */}
            {secoes.map((secao, i) => (
              <BlocoDemonstrativo key={secao.id} secao={secao} indice={i} />
            ))}
          </TabsContent>

          <TabsContent value="resumo" className="mt-0 space-y-3">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {resumo.itens.map((item, i) => (
                <motion.div key={item.rotulo} {...entradaCard(i)} className={cn(SUBCARD_INTERNO, 'p-3')}>
                  <p className="flex items-center gap-1.5 text-[11px] font-body text-muted-foreground">
                    <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', TONS[item.tom].ponto)} />
                    {item.rotulo}
                  </p>
                  <p className={cn('mt-1 font-display text-base font-semibold tabular-nums', TONS[item.tom].texto)}>
                    R$ <AnimatedNumber value={item.valor} format={fmt} decimals={2} />
                  </p>
                  <p className="mt-0.5 text-[11px] font-body leading-snug text-muted-foreground">{item.detalhe}</p>
                </motion.div>
              ))}
            </div>

            <motion.div {...entradaCard(resumo.itens.length)} className={cn(SUBCARD_INTERNO, 'overflow-hidden')}>
              <p className="border-b border-border/30 bg-muted/20 px-3 py-2 font-display text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Memória de cálculo
              </p>
              <dl className="divide-y divide-border/20">
                {resumo.memoria.map((linha) => (
                  <div
                    key={linha.rotulo}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-xs font-body"
                  >
                    <dt className="text-muted-foreground">{linha.rotulo}</dt>
                    <dd className="font-medium tabular-nums">{linha.valor}</dd>
                  </div>
                ))}
              </dl>
            </motion.div>
          </TabsContent>

          <TabsContent value="base" className="mt-0 space-y-2">
            <motion.div {...entradaCard(0)} className={cn(SUBCARD_INTERNO, 'overflow-hidden')}>
              <table className="w-full border-collapse text-xs font-body">
                <thead>
                  <tr className="border-b border-border/30 bg-muted/20 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="px-3 py-1.5 text-left font-medium">
                      Base
                    </th>
                    <th scope="col" className="px-3 py-1.5 text-right font-medium">
                      Base (R$)
                    </th>
                    <th scope="col" className="px-3 py-1.5 text-right font-medium">
                      Encargo (R$)
                    </th>
                    <th scope="col" className="px-3 py-1.5 text-right font-medium">
                      Alíquota efetiva
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bases.map((linha) => (
                    <tr
                      key={linha.descricao}
                      className="border-b border-border/20 transition-colors last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-3 py-1.5 text-foreground/90">{linha.descricao}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                        R$ {fmt(linha.base)}
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium tabular-nums">R$ {fmt(linha.encargo)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                        {fmt(aliquotaEfetiva(linha))}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
            <div className={cn(SUBCARD_INTERNO, 'px-3 py-2.5')}>
              <p className="text-[11px] font-body leading-snug text-muted-foreground">
                Bases derivadas das mesmas verbas do demonstrativo. INSS e IRRF são progressivos, por isso a última
                coluna mostra a alíquota efetiva (encargo ÷ base) e não uma alíquota nominal.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="historico" className="mt-0">
            {historico.length === 0 ? (
              <motion.div {...entradaCard(0)} className={cn(SUBCARD_INTERNO, 'border-dashed px-4 py-6 text-center')}>
                <History className="mx-auto h-5 w-5 text-muted-foreground/60" />
                <p className="mt-2 text-xs font-body text-muted-foreground">
                  Nenhum cálculo nesta sessão ainda. Cada simulação aparece aqui com o líquido apurado.
                </p>
              </motion.div>
            ) : (
              <motion.div {...entradaCard(0)} className={cn(SUBCARD_INTERNO, 'overflow-hidden')}>
                <table className="w-full border-collapse text-xs font-body">
                  <thead>
                    <tr className="border-b border-border/30 bg-muted/20 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <th scope="col" className="px-3 py-1.5 text-left font-medium">
                        Colaborador
                      </th>
                      <th scope="col" className="px-3 py-1.5 text-left font-medium">
                        Tipo
                      </th>
                      <th scope="col" className="px-3 py-1.5 text-right font-medium">
                        Líquido (R$)
                      </th>
                      <th scope="col" className="px-3 py-1.5 text-right font-medium">
                        Quando
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {historico.map((item) => (
                      <tr key={item.id} className="border-b border-border/20 last:border-0 hover:bg-muted/20">
                        <td className="max-w-[10rem] truncate px-3 py-1.5 text-foreground/90">
                          {item.nome || 'Sem colaborador'}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">{labelTipoRescisao(item.tipo)}</td>
                        <td className="px-3 py-1.5 text-right font-medium tabular-nums text-primary">
                          R$ <AnimatedNumber value={item.totalLiquido} format={fmt} decimals={2} />
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                          {format(new Date(item.timestamp), 'HH:mm', { locale: ptBR })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>

        {/* ── Resumo final + ações ──────────────────────────────────────── */}
        {/* Sem `mt-auto`: o agrupamento (líquido estimado + botões) é apenas o
            PRÓXIMO bloco da coluna, logo abaixo do demonstrativo. A margem
            automática era o que prendia este bloco ao rodapé e abria o vão entre
            o FGTS e o "Valor líquido estimado". O espaçamento entre os blocos
            agora é só o `gap-4` do `CardContent` — contínuo e uniforme. */}
        <Separator className="bg-border/40" />

        {/* Fecho da leitura: o resumo do líquido e o par de ações entram como os
            ÚLTIMOS blocos da cascata do painel. São `motion.div` (espelho 1:1
            dos `div` que já existiam, mesmas classes) e os botões mantêm
            hover/foco/disabled intactos — animação de apresentação, não de
            estado. */}
        <motion.div
          {...entradaCard(MAX_ENTRADA_INDEX)}
          className="rounded-xl border border-primary/25 bg-primary/5 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Subcard "Valor líquido estimado": o mesmo tratamento dos KPIs —
                  sem o quadrado de 40px (`bg-primary/15`), ícone de 26px na cor
                  do tom (`text-primary`), direto no fundo do card. */}
              <Wallet className="h-[26px] w-[26px] shrink-0 text-primary" />
              <div>
                <p className="text-[11px] font-body text-muted-foreground">Valor líquido estimado</p>
                <p className="font-display text-2xl font-semibold leading-tight tabular-nums text-primary">
                  R$ <AnimatedNumber value={result.totalLiquido} format={fmt} decimals={2} />
                </p>
              </div>
            </div>
            <div className="flex min-w-0 items-start gap-2 sm:max-w-[20rem]">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <p className="text-pretty text-[11px] font-body leading-snug text-muted-foreground">
                Cálculo realizado com base nos dados informados ({labelTipoRescisao(form.tipo)}). Confira as informações
                antes de gerar o TRCT.
                <span className="mt-0.5 block text-muted-foreground/80">
                  {dataCalculo}
                  {assinatura && ` · ${assinatura}`}
                </span>
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div {...entradaCard(MAX_ENTRADA_INDEX)} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            onClick={onSalvar}
            disabled={saving}
            className="h-11 rounded-xl font-display text-sm"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar simulação
          </Button>
          <Button
            type="button"
            onClick={onGerarPDF}
            className="h-11 rounded-xl bg-primary font-display text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:bg-primary/90"
          >
            <Download className="mr-2 h-4 w-4" />
            Gerar TRCT (PDF)
          </Button>
        </motion.div>
      </CardContent>
    </MotionCard>
  );
}
