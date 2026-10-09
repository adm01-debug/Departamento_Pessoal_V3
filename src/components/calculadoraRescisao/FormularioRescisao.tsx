/**
 * ============================================================================
 * Calculadora de Rescisão — COLUNA ESQUERDA (entrada de dados).
 *
 * Quatro seções numeradas + a ação principal, na mesma ordem da referência
 * visual: 1. Colaborador · 2. Dados contratuais · 3. Parâmetros adicionais ·
 * 4. Mecanismo de cálculo.
 *
 * Este componente é 100% APRESENTAÇÃO: não guarda estado próprio além do
 * popover de busca do colaborador, não calcula nada e não fala com o banco.
 * Todo dado vem do `CalculadoraRescisaoPage` (dono do formulário/consulta) por
 * props — é o mesmo estado e os mesmos handlers de antes do redesign.
 * ============================================================================
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { MotionCard, entradaCard } from '@/components/ui/entrada-cards';
import {
  Calculator,
  CalendarClock,
  Check,
  ChevronsUpDown,
  Cloud,
  Cog,
  FileText,
  Loader2,
  Monitor,
  Search,
  Sun,
  UserRound,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { UserAvatar } from '@/components/ui/user-avatar';
import { cn } from '@/lib/utils';
import {
  TIPOS_RESCISAO,
  type ColaboradorOpcao,
  type ColaboradorResumo,
  type MecanismoCalculo,
  type RescisaoFormState,
} from './rescisaoView';

export interface FormularioRescisaoProps {
  form: RescisaoFormState;
  /** Mesmo `set` do formulário da página (`onChange(campo, valor)`). */
  onChange: (campo: keyof RescisaoFormState, valor: string | boolean) => void;
  colaboradores: ColaboradorOpcao[];
  /** Resumo do colaborador importado; `null` quando nada foi selecionado. */
  colaborador: ColaboradorResumo | null;
  loadingColab: boolean;
  onSelectColaborador: (id: string) => void;
  onLimparColaborador: () => void;
  mecanismo: MecanismoCalculo;
  onMecanismoChange: (mecanismo: MecanismoCalculo) => void;
  onCalcular: () => void;
  calculando: boolean;
  /**
   * Nó opcional renderizado na MESMA linha da seção "1. Colaborador", na coluna
   * da direita. É o ESTADO INICIAL da Calculadora (painel de aguardo): com o
   * nó, o formulário vira um grid de duas colunas, a seção 1 e o painel são
   * igualados por `items-stretch` e as seções 2–4 seguem na coluna 1, logo
   * abaixo da seção 1.
   *
   * Sem o nó (visão COM resultado), a coluna de entrada mantém o `flex-col`
   * histórico — o painel completo é VIZINHO deste componente no grid da página.
   */
  painelTopo?: React.ReactNode;
}

/** Casca de seção: card com cabeçalho numerado (ícone + título + subtítulo). */
function Secao({
  indice,
  icone: Icone,
  titulo,
  subtitulo,
  children,
}: {
  indice: number;
  icone: React.ElementType;
  titulo: string;
  subtitulo: string;
  children: React.ReactNode;
}) {
  return (
    <MotionCard {...entradaCard(indice - 1)} className="rounded-2xl border-border/30 bg-card shadow-elevated">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          {/* Ícone do cabeçalho da seção: SEM o quadrado (fundo, borda, raio e
              glow) que existia — o glifo fica direto sobre o fundo do card, em
              24px, e o `-mt-1` centra os 24px na linha do título
              (13px/leading-tight). A cor (`text-primary`) é a mesma de antes. */}
          <Icone className="-mt-1 h-6 w-6 shrink-0 text-primary" />
          <div className="min-w-0">
            <h3 className="font-display text-[13px] font-semibold leading-tight">
              {indice}. {titulo}
            </h3>
            <p className="mt-0.5 text-pretty text-xs font-body leading-snug text-muted-foreground">{subtitulo}</p>
          </div>
        </div>
        {children}
      </CardContent>
    </MotionCard>
  );
}

/** Campo rotulado: label pequena em cima, controle embaixo. */
function Campo({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="font-body text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

/** Linha de interruptor com ícone + explicação (Parâmetros adicionais). */
function LinhaSwitch({
  icone: Icone,
  titulo,
  descricao,
  tinta,
  tintaBorda,
  checked,
  onChange,
}: {
  icone: React.ElementType;
  titulo: string;
  descricao: string;
  /** Tinta semântica do ÍCONE e do TÍTULO (ex.: `text-warning`). A descrição
   *  permanece em `text-muted-foreground` — a cor identifica a linha, nunca o
   *  parágrafo inteiro. */
  tinta: string;
  /** Realce da borda no hover, na mesma cor semântica da linha. */
  tintaBorda: string;
  checked: boolean;
  onChange: (valor: boolean) => void;
}) {
  return (
    // Superfície INTERNA: a linha repousa dentro do `bg-card` da seção e desce um
    // degrau na escada de superfícies (`bg-background` — o mesmo navy profundo da
    // página), com borda azul-acinzentada discreta. Hover sutil de 200ms:
    // fundo um pouco mais claro e borda tingida pela cor da linha. Geometria,
    // espaçamentos e o `Switch` (lime quando ligado) ficam intactos.
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background px-3 py-2.5 transition-colors duration-200 hover:bg-background/70',
        tintaBorda
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        {/* Ícone auxiliar da linha: sobe de 16 para 18px (o `-mt-px` o centra na
            linha de 12px do título). A caixa da linha NÃO muda — ela é o
            controle que hospeda o interruptor, não um quadrado do ícone. A cor
            semântica (`tinta`) é a diferença cromática pedida. */}
        <Icone className={cn('-mt-px h-[18px] w-[18px] shrink-0', tinta)} />
        <div className="min-w-0">
          <p className={cn('text-xs font-body font-medium', tinta)}>{titulo}</p>
          <p className="text-[11px] font-body leading-snug text-muted-foreground">{descricao}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={titulo} />
    </div>
  );
}

const MECANISMOS: { value: MecanismoCalculo; label: string; descricao: string; icone: React.ElementType }[] = [
  { value: 'servidor', label: 'Servidor', descricao: 'Utiliza as regras oficiais da empresa.', icone: Cloud },
  { value: 'local', label: 'Local', descricao: 'Processa o cálculo no seu navegador.', icone: Monitor },
];

/**
 * Estilo de foco do campo de busca do combobox de colaborador (Popover + Command
 * do cmdk) aplicado ao WRAPPER — não ao `<input>` interno.
 *
 * O `CommandInput` compartilhado (`ui/command.tsx`) monta o wrapper como
 * `flex items-center border-b px-3`, com a LUPA e o `<input>` como IRMÃOS. O anel
 * de foco global (`:focus-visible` → `ring-2 ring-ring` lime, em `src/index.css`)
 * incidia só no `<input>`, então a borda verde-lima começava DEPOIS da lupa. Aqui
 * o foco passa a pertencer ao wrapper INTEIRO (lupa + input = uma única caixa).
 *
 * Como `ui/command.tsx` é COMPARTILHADO (o mesmo combobox de Afastamentos), o
 * ajuste fica NO CALL SITE, sem tocar no componente global, via variantes
 * arbitrárias do Tailwind que atingem o `[cmdk-input-wrapper]` renderizado:
 *   • `m-2` — respiro para o anel não ser CORTADO pelo `Command` (que é
 *     `overflow-hidden`/`rounded-md);
 *   • `rounded-lg border border-border/50` — o wrapper vira um campo de verdade
 *     (borda discreta em repouso), com o MESMO raio do gatilho do Popover;
 *   • `[&_[cmdk-input-wrapper]:focus-within]:border-primary|ring-1|ring-primary`
 *     — ao focar (input ou lupa), o contorno verde-lima envolve o conjunto todo.
 *
 * O `<input>` cancela o próprio `:focus-visible` (`focus-visible:ring-0`): o
 * indicador de foco continua VISÍVEL para acessibilidade, só que no wrapper.
 * Busca, filtro, seleção, navegação por teclado e itens da lista não mudam.
 */
const CAMPO_BUSCA_COLABORADOR =
  '[&_[cmdk-input-wrapper]]:m-2 [&_[cmdk-input-wrapper]]:rounded-lg ' +
  '[&_[cmdk-input-wrapper]]:border [&_[cmdk-input-wrapper]]:border-border/50 ' +
  '[&_[cmdk-input-wrapper]]:px-3 [&_[cmdk-input-wrapper]]:transition-colors ' +
  '[&_[cmdk-input-wrapper]:focus-within]:border-primary ' +
  '[&_[cmdk-input-wrapper]:focus-within]:ring-1 [&_[cmdk-input-wrapper]:focus-within]:ring-primary';

export function FormularioRescisao({
  form,
  onChange,
  colaboradores,
  colaborador,
  loadingColab,
  onSelectColaborador,
  onLimparColaborador,
  mecanismo,
  onMecanismoChange,
  onCalcular,
  calculando,
  painelTopo,
}: FormularioRescisaoProps) {
  const [buscaAberta, setBuscaAberta] = useState(false);
  // Os campos monetários guardam string no formulário; o `CurrencyInput` trabalha
  // com número. `''` vira `undefined` para o campo continuar VAZIO (com o
  // placeholder) em vez de exibir "R$ 0,00" — é a mesma validação de
  // obrigatoriedade que a página já faz (`if (!form.salario)`).
  const salarioNumerico = form.salario === '' ? undefined : Number(form.salario);
  const fgtsNumerico = form.saldoFGTS === '' ? undefined : Number(form.saldoFGTS);

  return (
    // Coluna de ENTRADA — dois regimes:
    //
    // • SEM `painelTopo` (visão COM resultado): `flex flex-col` (em vez do antigo
    //   `space-y-4`) para poder empurrar a ação principal ao rodapé com `mt-auto`.
    //   Com o grid da PÁGINA em `items-stretch`, a coluna recebe a altura da linha;
    //   se — em alguma largura — ela for a MENOR das duas, o `mt-auto` garante que
    //   "Calcular rescisão" termine na MESMA régua dos botões do painel direito.
    //   Quando ela é a mais alta (caso normal), `mt-auto` não tem efeito algum.
    //
    // • COM `painelTopo` (estado inicial): vira um GRID de duas colunas. A seção
    //   "1. Colaborador" e o painel caem na MESMA linha e são igualados por
    //   `items-stretch` (bordas superior/inferior na mesma régua, ±0px); as seções
    //   2–4 continuam na coluna 1, abaixo da seção 1. As larguras de coluna são as
    //   MESMAS do grid da página (`lg:grid-cols-2` /
    //   `xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]`), então a composição lado a
    //   lado não muda. `lg:gap-x-6` = o `gap-6` horizontal que a página usava;
    //   `gap-y-4` mantém os 16px históricos entre as seções. `xl:grid-cols-…` e o
    //   `lg:grid-cols-2` compartilham a régua do grid da página.
    //
    // `lg:pb-5` (nos dois regimes): espelha o padding inferior (`p-5`) do
    // `CardContent` do painel direito, para que a borda inferior de "Calcular
    // rescisão" coincida com a dos botões "Salvar simulação"/"Gerar TRCT" na visão
    // lado a lado (alvo ~2px). Só a partir de `lg`, onde as colunas ficam lado a
    // lado.
    <div
      className={cn(
        'gap-4 lg:pb-5',
        painelTopo
          ? 'grid grid-cols-1 items-stretch lg:grid-cols-2 lg:gap-x-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]'
          : 'flex flex-col'
      )}
    >
      {/* ── 1. Colaborador ─────────────────────────────────────────────── */}
      <Secao
        indice={1}
        icone={UserRound}
        titulo="Colaborador"
        subtitulo="Selecione um colaborador ativo ou preencha os dados manualmente."
      >
        <Campo label="Importar colaborador ativo">
          <Popover open={buscaAberta} onOpenChange={setBuscaAberta}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={buscaAberta}
                disabled={loadingColab}
                className="h-9 w-full justify-between gap-2 rounded-lg border-input bg-background px-3 text-[13px] font-normal hover:bg-background"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {loadingColab ? (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin opacity-60" />
                  ) : (
                    <Search className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  )}
                  <span className="truncate text-muted-foreground">Busque por nome, CPF ou matrícula...</span>
                </span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command className={CAMPO_BUSCA_COLABORADOR}>
                {/* Foco do campo de busca do combobox.
                    O destaque verde-lima NÃO fica mais no `<input>`: o wrapper
                    `[cmdk-input-wrapper]` (lupa + input) recebe borda e anel de
                    foco via `CAMPO_BUSCA_COLABORADOR` (ver o doc do constante
                    acima) — uma única caixa arredondada ao redor de
                    [ lupa + "Buscar colaborador ativo..." ]. O input interno
                    apenas cancela o próprio `:focus-visible` (`focus-visible:ring-0`)
                    para não desenhar um SEGUNDO contorno começando depois da lupa.
                    Sizing (`h-9 py-1.5 text-[13px]`) espelha o `Input` do design
                    system e a busca/seleção continuam idênticas. */}
                <CommandInput
                  placeholder="Buscar colaborador ativo..."
                  className="h-9 rounded-lg py-1.5 text-[13px] focus-visible:ring-0 focus-visible:outline-hidden"
                />
                <CommandList>
                  <CommandEmpty>Nenhum colaborador ativo encontrado.</CommandEmpty>
                  <CommandGroup>
                    {colaboradores.map((c) => (
                      <CommandItem
                        key={c.id}
                        // O `value` é o texto que o cmdk usa para filtrar: nome + CPF
                        // + matrícula, para a busca aceitar qualquer um dos três.
                        value={`${c.nome_completo} ${c.cpf ?? ''} ${c.matricula ?? ''}`}
                        onSelect={() => {
                          onSelectColaborador(c.id);
                          setBuscaAberta(false);
                        }}
                      >
                        <span className="truncate">{c.nome_completo}</span>
                        {c.matricula && (
                          <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{c.matricula}</span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </Campo>

        {colaborador && (
          <div className="flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 p-3">
            <UserAvatar name={colaborador.nome} imageUrl={colaborador.fotoUrl} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[13px] font-semibold leading-tight">{colaborador.nome}</p>
              <p className="mt-0.5 truncate text-[11px] font-body text-muted-foreground">
                {[
                  colaborador.matricula && `Matrícula ${colaborador.matricula}`,
                  colaborador.cargo,
                  colaborador.departamento,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onLimparColaborador}
              aria-label="Remover colaborador selecionado"
              className="h-7 w-7 shrink-0 rounded-lg text-muted-foreground hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Nome do colaborador">
            <Input
              value={form.nomeColaborador}
              onChange={(e) => onChange('nomeColaborador', e.target.value)}
              className="rounded-lg"
              placeholder="Nome completo"
            />
          </Campo>
          <Campo label="CPF">
            <Input
              value={form.cpf}
              onChange={(e) => onChange('cpf', e.target.value)}
              className="rounded-lg"
              placeholder="000.000.000-00"
            />
          </Campo>
          <Campo label="Cargo">
            <Input
              value={form.cargo}
              onChange={(e) => onChange('cargo', e.target.value)}
              className="rounded-lg"
              placeholder="Cargo do colaborador"
            />
          </Campo>
          <Campo label="Departamento">
            <Input
              value={form.departamento}
              onChange={(e) => onChange('departamento', e.target.value)}
              className="rounded-lg"
              placeholder="Departamento"
            />
          </Campo>
        </div>
      </Secao>

      {/* Estado inicial: o painel de aguardo divide a LINHA com a seção 1. O
          wrapper é um grid de UMA célula: ele é o item do grid do formulário e o
          card lá dentro o preenche por `align-items: stretch` do próprio wrapper
          — a igualdade de altura sai do layout, sem `h-full` escrito à mão. Em
          `lg` ele é fixado na coluna 2/linha 1 e as seções 2–4 descem na coluna 1;
          abaixo de `lg` não há colunas, e o `order-last` empurra o painel para o
          fim da pilha (ordem histórica: formulário inteiro e, depois, o painel). */}
      {painelTopo ? (
        <div className="grid order-last lg:col-start-2 lg:row-start-1 lg:order-none">{painelTopo}</div>
      ) : null}

      {/* Coluna 1 (a partir da linha 2 no modo grid; a própria coluna no modo
          flex): seções 2–4 + ação principal. Espaçamento interno idêntico ao
          `gap-4` histórico. */}
      <div className="flex flex-col gap-4">
        {/* ── 2. Dados contratuais ───────────────────────────────────────── */}
        <Secao
          indice={2}
          icone={FileText}
          titulo="Dados contratuais"
          subtitulo="Informe os dados do vínculo e a modalidade de rescisão."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Data de admissão">
              <Input
                type="date"
                value={form.dataAdmissao}
                onChange={(e) => onChange('dataAdmissao', e.target.value)}
                className="rounded-lg"
              />
            </Campo>
            <Campo label="Data de desligamento">
              <Input
                type="date"
                value={form.dataDesligamento}
                onChange={(e) => onChange('dataDesligamento', e.target.value)}
                className="rounded-lg"
              />
            </Campo>
            <Campo label="Salário base (R$)">
              <CurrencyInput
                value={salarioNumerico}
                onChange={(valor) => onChange('salario', String(valor))}
                showPrefix
                inputMode="numeric"
                className="rounded-lg"
              />
            </Campo>
            <Campo label="Tipo de rescisão">
              <Select value={form.tipo} onValueChange={(valor) => onChange('tipo', valor)}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_RESCISAO.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
          </div>
        </Secao>

        {/* ── 3. Parâmetros adicionais ───────────────────────────────────── */}
        <Secao
          indice={3}
          icone={Cog}
          titulo="Parâmetros adicionais"
          subtitulo="Informe os dados complementares para o cálculo."
        >
          {/* Composição em DUAS colunas (45% FGTS · 55% switches), na ordem de
            leitura da referência: o saldo do FGTS à esquerda, CENTRADO na
            vertical do conjunto, e os dois interruptores empilhados à direita.
            `minmax(0, Nfr)` — em vez do `Nfr` puro — mantém a proporção pedida
            sem deixar a largura INTRÍNSECA do `<input>` (o `size` padrão do
            controle de formulário) esticar a coluna do FGTS por cima da dos
            switches.
            `@container` + `@max-[400px]:grid-cols-1`: o card vive dentro da
            metade esquerda da página (`lg:grid-cols-2`) — ali, entre 1024 e
            ~1200px de viewport, sobram ~306px reais para o conteúdo (o mesmo
            tamanho do card no mobile) e as duas colunas não têm largura para os
            rótulos: a altura quase dobra. A guarda devolve o card para uma
            coluna SOMENTE nessa faixa (com 400px+ de conteúdo — de 1280px de
            viewport em diante — a composição de referência em duas colunas
            volta a valer). Basta remover a classe para exigir duas colunas a
            partir de `md`.
            No mobile a grade também cai para uma coluna — FGTS acima e os dois
            switches abaixo. Nenhum estado, validação ou cálculo muda: `Campo`,
            `CurrencyInput` e `LinhaSwitch` são exatamente os mesmos. */}
          <div className="@container">
            <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[minmax(0,45fr)_minmax(0,55fr)] @max-[400px]:grid-cols-1">
              <div className="min-w-0">
                <Campo label="Saldo FGTS (R$)">
                  <CurrencyInput
                    value={fgtsNumerico}
                    onChange={(valor) => onChange('saldoFGTS', String(valor))}
                    showPrefix
                    inputMode="numeric"
                    className="rounded-lg"
                  />
                </Campo>
              </div>

              <div className="flex min-w-0 flex-col gap-3">
                <LinhaSwitch
                  icone={CalendarClock}
                  titulo="Aviso prévio trabalhado?"
                  descricao="O colaborador cumpriu o aviso prévio."
                  tinta="text-warning"
                  tintaBorda="hover:border-warning/45"
                  checked={form.avisoTrabalhado}
                  onChange={(valor) => onChange('avisoTrabalhado', valor)}
                />
                <LinhaSwitch
                  icone={Sun}
                  titulo="Possui férias vencidas?"
                  descricao="Há férias vencidas a serem pagas."
                  tinta="text-info"
                  tintaBorda="hover:border-info/45"
                  checked={form.feriasVencidas}
                  onChange={(valor) => onChange('feriasVencidas', valor)}
                />
              </div>
            </div>
          </div>
        </Secao>

        {/* ── 4. Mecanismo de cálculo ────────────────────────────────────── */}
        <Secao
          indice={4}
          icone={Calculator}
          titulo="Mecanismo de cálculo"
          subtitulo="Selecione como o cálculo será processado."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {MECANISMOS.map((mecanismoOpcao) => {
              const ativo = mecanismoOpcao.value === mecanismo;
              const Icone = mecanismoOpcao.icone;
              return (
                <button
                  key={mecanismoOpcao.value}
                  type="button"
                  onClick={() => onMecanismoChange(mecanismoOpcao.value)}
                  aria-pressed={ativo}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border p-3 text-left transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                    // Selecionado: preserva a borda verde-lima e o brilho curto de
                    // destaque, com fundo lime translúcido BEM sutil (nada de
                    // preenchimento sólido). Não selecionado: desce um degrau na
                    // escada de superfícies (`bg-background`, o mesmo navy profundo
                    // da página) com borda azul-acinzentada discreta.
                    ativo
                      ? 'border-primary/50 bg-primary/5 shadow-[0_0_20px_-10px_hsl(var(--primary)/0.6)]'
                      : 'border-border/60 bg-background hover:border-primary/25 hover:bg-background/70'
                  )}
                >
                  <span
                    className={cn(
                      'grid h-8 w-8 shrink-0 place-items-center rounded-lg',
                      ativo ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Icone className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 font-display text-[13px] font-semibold leading-tight">
                      {mecanismoOpcao.label}
                      {ativo && <Check className="h-3.5 w-3.5 text-primary" />}
                    </span>
                    <span className="mt-0.5 block text-pretty text-[11px] font-body leading-snug text-muted-foreground">
                      {mecanismoOpcao.descricao}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </Secao>

        {/* ── Ação principal ─────────────────────────────────────────────── */}
        {/* Bloco de ação: entra como ÚLTIMO item da cascata da coluna (seções
          0–3, ação 4). O `motion.div` não muda a geometria (o botão é
          `w-full` dentro do wrapper) e o botão preserva hover/foco/disabled
          exatamente como antes — a animação é de apresentação, não de estado.
          `mt-auto`: se sobrar altura na coluna (só no caso em que ela é a MENOR
          das duas), a sobra vai TODA para cima deste bloco, e o botão termina
          junto com os botões do painel direito. Alinhamento por flex, nunca
          por margens negativas/posição absoluta. */}
        <motion.div {...entradaCard(4)} className="mt-auto">
          <Button
            type="button"
            onClick={onCalcular}
            disabled={calculando}
            className="h-11 w-full rounded-xl bg-primary font-display text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:bg-primary/90"
          >
            {calculando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
            Calcular rescisão
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
