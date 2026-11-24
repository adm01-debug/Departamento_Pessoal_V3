import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  ClipboardList,
  Coins,
  FileText,
  Info,
  Laptop,
  Layers,
  ListChecks,
  MapPin,
  Minus,
  PencilLine,
  Plus,
  Send,
  Shuffle,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CascadeDialogFrame } from '@/components/ui/cascade-dialog';
import { cascadeItemVariants } from '@/components/ui/cascade-motion';
import { cn } from '@/lib/utils';
import {
  LIMITES,
  OPCOES_MODALIDADE,
  OPCOES_SENIORIDADE,
  OPCOES_TIPO_CONTRATO,
  RASCUNHO_VAZIO,
  adicionarNaLista,
  errosDaPublicacao,
  formatarFaixaSalarial,
  formatarMoedaDigitada,
  lerMoedaDigitada,
  podeSalvarRascunho,
  removerDaLista,
  temErros,
  validarEtapa,
  type CampoRascunho,
  type EtapaNovaVaga,
  type ErrosRascunho,
  type RascunhoVaga,
} from './novaVagaRascunho';

/**
 * ============================================================================
 * NOVA VAGA — “Anunciar nova vaga” em 3 etapas.
 *
 *  1. Informações básicas · 2. Descrição e requisitos · 3. Revisão e publicação
 *
 * Regras de convivência com o resto do módulo:
 *  • Nada de Supabase aqui: o diálogo só monta o rascunho e devolve por
 *    `onPublicar`/`onSalvarRascunho` — quem grava é `RecrutamentoPage`, pelo
 *    mesmo `recrutamentoService.criarVaga` (ou pelo mock em memória).
 *  • A moldura é a oficial (`CascadeDialogFrame`), então abertura/fechamento
 *    são exatamente os das outras janelas do sistema.
 *  • Todo token de cor vem do Design System (`primary`, `--chart-4`, `info`,
 *    `warning`, `success`) — nenhum hex escrito à mão.
 *  • O que a tabela `vagas` não tem coluna (senioridade, localização) continua
 *    na tela e na revisão, mas NÃO é enviado ao banco — ver
 *    `LIMITACOES_SCHEMA` em `./novaVagaRascunho`.
 * ============================================================================
 */

export interface NovaVagaDialogProps {
  open: boolean;
  onOpenChange: (aberto: boolean) => void;
  /** Departamentos já usados pelas vagas da empresa (sugestão, não catálogo). */
  departamentos: readonly string[];
  /** Mutação em andamento — trava os botões e mostra o spinner. */
  salvando: boolean;
  onPublicar: (rascunho: RascunhoVaga) => void;
  onSalvarRascunho: (rascunho: RascunhoVaga) => void;
}

/** Quantos blocos da janela entram na cascata (cabeçalho, etapas, corpo, rodapé). */
const BLOCOS_CASCATA = 4;

/** Sentinela do select de departamento: “não está na lista, vou digitar”. */
const DEPARTAMENTO_OUTRO = '__outro__';

type Tom = 'primary' | 'violeta' | 'ciano';

/**
 * Acentos por etapa. As classes são literais (o Tailwind precisa vê-las
 * escritas) e saem só de tokens do Design System: lime da marca, violeta
 * (`--chart-4`) e o azul informativo (`--info`).
 */
const TONS: Record<Tom, { texto: string; fundo: string; borda: string; linha: string }> = {
  primary: {
    texto: 'text-primary',
    fundo: 'bg-primary/12',
    borda: 'border-primary/45',
    linha: 'bg-primary/60',
  },
  violeta: {
    texto: 'text-[hsl(var(--chart-4))]',
    fundo: 'bg-[hsl(var(--chart-4)/0.12)]',
    borda: 'border-[hsl(var(--chart-4)/0.45)]',
    linha: 'bg-[hsl(var(--chart-4)/0.5)]',
  },
  ciano: {
    texto: 'text-info',
    fundo: 'bg-info/12',
    borda: 'border-info/45',
    linha: 'bg-info/50',
  },
};

const ETAPAS: { id: EtapaNovaVaga; titulo: string; resumo: string; tom: Tom; icone: LucideIcon }[] = [
  { id: 1, titulo: 'Informações básicas', resumo: 'Dados principais da vaga', tom: 'primary', icone: FileText },
  { id: 2, titulo: 'Descrição e requisitos', resumo: 'Detalhes da oportunidade', tom: 'violeta', icone: ListChecks },
  { id: 3, titulo: 'Revisão e publicação', resumo: 'Confira antes de publicar', tom: 'ciano', icone: CheckCircle2 },
];

/** Skin comum dos campos de texto (altura/padding/raio; cor herda do tema). */
const CAMPO = 'h-10 rounded-xl border-border/60 bg-background/60 text-control focus-visible:ring-primary/30';

/** Ícones de cada modalidade (o mesmo trio no seletor e na prévia). */
const ICONE_MODALIDADE: Record<string, LucideIcon> = {
  Presencial: Building2,
  Híbrido: Shuffle,
  Remoto: Laptop,
};

/** Rótulo de campo: caixa-alta discreta, com o `*` de obrigatório. */
function Rotulo({
  htmlFor,
  children,
  obrigatorio,
  dica,
}: {
  htmlFor?: string;
  children: ReactNode;
  obrigatorio?: boolean;
  dica?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor} className="text-[11px] font-semibold uppercase tracking-[0.07em] text-foreground/60">
        {children}
        {obrigatorio ? (
          <span aria-hidden className="ml-0.5 text-primary">
            *
          </span>
        ) : null}
      </Label>
      {obrigatorio ? <span className="sr-only">(obrigatório)</span> : null}
      {dica}
    </div>
  );
}

/** Mensagem de erro do campo — `role="alert"` para leitor de tela anunciar. */
function ErroCampo({ id, children }: { id: string; children?: string }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="flex items-start gap-1 text-[11px] font-medium leading-snug text-destructive">
      <AlertCircle className="mt-px h-3 w-3 shrink-0" aria-hidden />
      {children}
    </p>
  );
}
/**
 * Modalidade em botões (Presencial · Híbrido · Remoto). É um `radiogroup` de
 * verdade: setas movem a seleção e só o item marcado entra na tabulação.
 */
function SeletorModalidade({
  idBase,
  valor,
  aoMudar,
  erro,
}: {
  idBase: string;
  valor: string;
  aoMudar: (valor: string) => void;
  erro?: string;
}) {
  const botoes = useRef<(HTMLButtonElement | null)[]>([]);

  const navegar = (event: ReactKeyboardEvent<HTMLButtonElement>, indice: number) => {
    const passo =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (passo === 0) return;
    event.preventDefault();
    const proximo = (indice + passo + OPCOES_MODALIDADE.length) % OPCOES_MODALIDADE.length;
    aoMudar(OPCOES_MODALIDADE[proximo]);
    botoes.current[proximo]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-labelledby={`${idBase}-rotulo`}
      aria-invalid={erro ? true : undefined}
      className="grid grid-cols-3 gap-2"
    >
      {OPCOES_MODALIDADE.map((opcao, indice) => {
        const selecionada = valor === opcao;
        const Icone = ICONE_MODALIDADE[opcao] ?? Building2;
        return (
          <button
            key={opcao}
            ref={(elemento) => {
              botoes.current[indice] = elemento;
            }}
            type="button"
            role="radio"
            aria-checked={selecionada}
            tabIndex={selecionada || (!valor && indice === 0) ? 0 : -1}
            onClick={() => aoMudar(opcao)}
            onKeyDown={(event) => navegar(event, indice)}
            className={cn(
              'flex h-10 items-center justify-center gap-1.5 rounded-xl border text-[11.5px] font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset',
              selecionada
                ? 'border-primary/60 bg-primary/12 text-primary'
                : 'border-border/60 bg-background/50 text-foreground/65 hover:border-border hover:text-foreground',
              erro && !selecionada && 'border-destructive/50'
            )}
          >
            <Icone aria-hidden className="h-3.5 w-3.5" />
            {opcao}
            {selecionada ? <Check aria-hidden className="h-3 w-3" /> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Quantidade de vagas: campo numérico + os dois passos (− / +). */
function CampoQuantidade({
  idCampo,
  valor,
  aoMudar,
  erro,
}: {
  idCampo: string;
  valor: number;
  aoMudar: (valor: number) => void;
  erro?: string;
}) {
  const aplicar = (proximo: number) => aoMudar(Math.min(999, Math.max(1, proximo)));

  return (
    <div
      className={cn(
        'flex h-10 items-center gap-1 rounded-xl border bg-background/60 pl-2.5 pr-1',
        erro ? 'border-destructive/60' : 'border-border/60'
      )}
    >
      <Users aria-hidden className="h-4 w-4 shrink-0 text-info" />
      <input
        id={idCampo}
        value={String(valor)}
        onChange={(event) => aplicar(Number(event.target.value.replace(/\D/g, '')) || 1)}
        inputMode="numeric"
        autoComplete="off"
        aria-label="Quantidade de vagas"
        aria-invalid={erro ? true : undefined}
        className="h-full w-full min-w-0 bg-transparent px-1 text-control tabular-nums text-foreground outline-none"
      />
      <button
        type="button"
        onClick={() => aplicar(valor - 1)}
        disabled={valor <= 1}
        aria-label="Diminuir quantidade de vagas"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/60 text-foreground/70 transition-colors hover:bg-muted/60 disabled:opacity-40"
      >
        <Minus aria-hidden className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={() => aplicar(valor + 1)}
        disabled={valor >= 999}
        aria-label="Aumentar quantidade de vagas"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/60 text-foreground/70 transition-colors hover:bg-muted/60 disabled:opacity-40"
      >
        <Plus aria-hidden className="h-3 w-3" />
      </button>
    </div>
  );
}
/** Campo de dinheiro com máscara de centavos (mesma régua do `CurrencyInput`). */
function CampoMoeda({
  idCampo,
  valor,
  aoMudar,
  placeholder,
  rotulo,
  erro,
}: {
  idCampo: string;
  valor: number;
  aoMudar: (valor: number) => void;
  placeholder: string;
  rotulo: string;
  erro?: string;
}) {
  return (
    <div className="relative">
      <Coins
        aria-hidden
        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-warning"
      />
      <Input
        id={idCampo}
        value={formatarMoedaDigitada(valor)}
        onChange={(event) => aoMudar(lerMoedaDigitada(event.target.value))}
        placeholder={placeholder}
        inputMode="numeric"
        autoComplete="off"
        aria-label={rotulo}
        aria-invalid={erro ? true : undefined}
        className={cn(CAMPO, 'pl-8 text-[12px] tabular-nums', erro && 'border-destructive/60')}
      />
    </div>
  );
}

/**
 * Campo de pílulas (uma lista por seção). Enter e vírgula confirmam o item,
 * Backspace com o campo vazio remove o último — o mesmo comportamento dos
 * campos de tags do resto do sistema.
 */
function CampoLista({
  idCampo,
  rotulo,
  valores,
  aoAdicionar,
  aoRemover,
  placeholder,
  tom,
  erro,
}: {
  idCampo: string;
  rotulo: string;
  valores: readonly string[];
  aoAdicionar: (texto: string) => void;
  aoRemover: (texto: string) => void;
  placeholder: string;
  tom: Tom;
  erro?: string;
}) {
  const [texto, setTexto] = useState('');
  const limiteAtingido = valores.length >= LIMITES.lista.itens;

  const confirmar = () => {
    const limpo = texto.trim();
    if (!limpo) return;
    aoAdicionar(limpo);
    setTexto('');
  };

  return (
    <div
      className={cn(
        'rounded-xl border bg-background/60 px-2.5 py-2 transition-colors focus-within:ring-2 focus-within:ring-primary/25',
        erro ? 'border-destructive/60' : 'border-border/60'
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {valores.map((item) => (
          <span
            key={item}
            className={cn(
              'inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
              TONS[tom].borda,
              TONS[tom].fundo,
              TONS[tom].texto
            )}
          >
            <span className="truncate">{item}</span>
            <button
              type="button"
              onClick={() => aoRemover(item)}
              aria-label={`Remover ${item}`}
              className="rounded-full p-0.5 transition-colors hover:bg-foreground/10"
            >
              <X aria-hidden className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <input
          id={idCampo}
          value={texto}
          onChange={(event) => setTexto(event.target.value)}
          onBlur={confirmar}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              confirmar();
            } else if (event.key === 'Backspace' && !texto && valores.length > 0) {
              aoRemover(valores[valores.length - 1]);
            }
          }}
          placeholder={limiteAtingido ? `Limite de ${LIMITES.lista.itens} itens atingido` : placeholder}
          aria-label={rotulo}
          aria-invalid={erro ? true : undefined}
          disabled={limiteAtingido}
          maxLength={LIMITES.lista.item}
          autoComplete="off"
          className="h-6 min-w-[140px] flex-1 bg-transparent text-[12px] text-foreground outline-none placeholder:text-muted-foreground/70 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
}
/**
 * Trilha das três etapas. Cada etapa já visitada pode ser reaberta com um
 * clique (as futuras ficam travadas até “Continuar” validar a atual).
 */
function PassosAssistente({
  etapa,
  maiorEtapa,
  aoEscolher,
}: {
  etapa: EtapaNovaVaga;
  maiorEtapa: EtapaNovaVaga;
  aoEscolher: (destino: EtapaNovaVaga) => void;
}) {
  return (
    <ol className="flex items-stretch gap-3">
      {ETAPAS.map((passo) => {
        const ativa = passo.id === etapa;
        const concluida = passo.id < etapa;
        const liberada = passo.id <= maiorEtapa;
        const tom = TONS[passo.tom];
        const Icone = passo.icone;

        return (
          <li key={passo.id} className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => aoEscolher(passo.id)}
              disabled={!liberada || ativa}
              aria-current={ativa ? 'step' : undefined}
              className={cn(
                'flex w-full items-center gap-2.5 border-b-2 pb-2 text-left transition-colors',
                ativa ? 'border-primary' : concluida ? 'border-primary/40' : 'border-border/50 hover:border-border',
                !liberada && 'cursor-not-allowed opacity-70'
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
                  ativa
                    ? 'border-transparent bg-primary text-primary-foreground'
                    : concluida
                      ? 'border-primary/40 bg-primary/12 text-primary'
                      : cn('bg-background/60', tom.borda, tom.texto)
                )}
              >
                {concluida ? (
                  <Check aria-hidden className="h-3.5 w-3.5" />
                ) : (
                  <Icone aria-hidden className="h-3.5 w-3.5" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block truncate text-[11.5px] font-semibold',
                    ativa ? 'text-foreground' : 'text-foreground/70'
                  )}
                >
                  {passo.titulo}
                </span>
                <span className="hidden truncate text-[10.5px] text-muted-foreground sm:block">{passo.resumo}</span>
              </span>
              <span
                className={cn(
                  'hidden shrink-0 text-[10px] font-semibold uppercase tabular-nums tracking-[0.08em] sm:block',
                  ativa ? 'text-primary' : 'text-muted-foreground/60'
                )}
              >
                {passo.id}/3
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** Props comuns aos três passos. */
interface PropsPasso {
  rascunho: RascunhoVaga;
  erros: ErrosRascunho;
  setCampo: <C extends CampoRascunho>(campo: C, valor: RascunhoVaga[C]) => void;
}
/** ETAPA 1 — dados principais da vaga. */
function PassoInformacoes({
  rascunho,
  erros,
  setCampo,
  departamentos,
}: PropsPasso & { departamentos: readonly string[] }) {
  const [outroDepartamento, setOutroDepartamento] = useState(false);
  // Sugestão vem das vagas já cadastradas; quando o nome não está na lista (ou
  // a empresa ainda não tem vaga nenhuma) o campo vira texto livre.
  const mostrarCampoOutro =
    departamentos.length === 0 || (outroDepartamento && !departamentos.includes(rascunho.departamento));

  return (
    <div className="space-y-3.5">
      <div className="grid gap-1.5">
        <Rotulo htmlFor="vaga-titulo" obrigatorio>
          Título da vaga
        </Rotulo>
        <div className="relative">
          <Briefcase
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
          />
          <Input
            id="vaga-titulo"
            value={rascunho.titulo}
            onChange={(event) => setCampo('titulo', event.target.value)}
            placeholder="Ex.: Desenvolvedor(a) Sênior"
            maxLength={LIMITES.titulo.max}
            autoComplete="off"
            aria-invalid={erros.titulo ? true : undefined}
            aria-describedby={erros.titulo ? 'vaga-titulo-erro' : undefined}
            className={cn(CAMPO, 'pl-9', erros.titulo && 'border-destructive/60')}
          />
        </div>
        <ErroCampo id="vaga-titulo-erro">{erros.titulo}</ErroCampo>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Rotulo htmlFor="vaga-departamento" obrigatorio>
            Departamento
          </Rotulo>
          {departamentos.length === 0 ? (
            <div className="relative">
              <Layers
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-info"
              />
              <Input
                id="vaga-departamento"
                value={rascunho.departamento}
                onChange={(event) => setCampo('departamento', event.target.value)}
                placeholder="Ex.: Tecnologia"
                maxLength={LIMITES.departamento.max}
                autoComplete="off"
                aria-invalid={erros.departamento ? true : undefined}
                aria-describedby={erros.departamento ? 'vaga-departamento-erro' : undefined}
                className={cn(CAMPO, 'pl-9', erros.departamento && 'border-destructive/60')}
              />
            </div>
          ) : (
            <>
              <Select
                value={mostrarCampoOutro ? DEPARTAMENTO_OUTRO : rascunho.departamento || undefined}
                onValueChange={(valor) => {
                  if (valor === DEPARTAMENTO_OUTRO) {
                    setOutroDepartamento(true);
                    setCampo('departamento', '');
                    return;
                  }
                  setOutroDepartamento(false);
                  setCampo('departamento', valor);
                }}
              >
                <SelectTrigger
                  id="vaga-departamento"
                  aria-invalid={erros.departamento ? true : undefined}
                  aria-describedby={erros.departamento ? 'vaga-departamento-erro' : undefined}
                  className={cn(CAMPO, 'pl-3', erros.departamento && 'border-destructive/60')}
                >
                  <SelectValue placeholder="Selecione o departamento" />
                </SelectTrigger>
                <SelectContent>
                  {departamentos.map((departamento) => (
                    <SelectItem key={departamento} value={departamento}>
                      {departamento}
                    </SelectItem>
                  ))}
                  <SelectItem value={DEPARTAMENTO_OUTRO}>Outro departamento…</SelectItem>
                </SelectContent>
              </Select>
              {mostrarCampoOutro ? (
                <Input
                  value={rascunho.departamento}
                  onChange={(event) => setCampo('departamento', event.target.value)}
                  placeholder="Digite o nome do departamento"
                  maxLength={LIMITES.departamento.max}
                  autoComplete="off"
                  aria-label="Nome do novo departamento"
                  className={CAMPO}
                />
              ) : null}
            </>
          )}
          <ErroCampo id="vaga-departamento-erro">{erros.departamento}</ErroCampo>
        </div>

        <div className="grid gap-1.5">
          <Rotulo htmlFor="vaga-tipo-contrato" obrigatorio>
            Tipo de contratação
          </Rotulo>
          <Select value={rascunho.tipoContrato || undefined} onValueChange={(valor) => setCampo('tipoContrato', valor)}>
            <SelectTrigger
              id="vaga-tipo-contrato"
              aria-invalid={erros.tipoContrato ? true : undefined}
              aria-describedby={erros.tipoContrato ? 'vaga-tipo-contrato-erro' : undefined}
              className={cn(CAMPO, erros.tipoContrato && 'border-destructive/60')}
            >
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {OPCOES_TIPO_CONTRATO.map((opcao) => (
                <SelectItem key={opcao} value={opcao}>
                  {opcao}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ErroCampo id="vaga-tipo-contrato-erro">{erros.tipoContrato}</ErroCampo>
        </div>
      </div>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Rotulo
            htmlFor="vaga-senioridade"
            obrigatorio
            dica={<InfoTooltip content="Nível de experiência esperado para a posição." />}
          >
            Senioridade
          </Rotulo>
          <Select value={rascunho.senioridade || undefined} onValueChange={(valor) => setCampo('senioridade', valor)}>
            <SelectTrigger
              id="vaga-senioridade"
              aria-invalid={erros.senioridade ? true : undefined}
              aria-describedby={erros.senioridade ? 'vaga-senioridade-erro' : undefined}
              className={cn(CAMPO, erros.senioridade && 'border-destructive/60')}
            >
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {OPCOES_SENIORIDADE.map((opcao) => (
                <SelectItem key={opcao} value={opcao}>
                  {opcao}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ErroCampo id="vaga-senioridade-erro">{erros.senioridade}</ErroCampo>
        </div>

        <div className="grid gap-1.5">
          <Rotulo
            htmlFor="vaga-quantidade"
            obrigatorio
            dica={<InfoTooltip content="Quantas pessoas você pretende contratar para esta vaga." />}
          >
            Quantidade de vagas
          </Rotulo>
          <CampoQuantidade
            idCampo="vaga-quantidade"
            valor={rascunho.quantidade}
            aoMudar={(valor) => setCampo('quantidade', valor)}
            erro={erros.quantidade}
          />
          <ErroCampo id="vaga-quantidade-erro">{erros.quantidade}</ErroCampo>
        </div>
      </div>

      <div className="grid gap-1.5">
        <div className="flex items-center gap-1.5">
          <Label
            id="vaga-modalidade-rotulo"
            className="text-[11px] font-semibold uppercase tracking-[0.07em] text-foreground/60"
          >
            Modalidade
            <span aria-hidden className="ml-0.5 text-primary">
              *
            </span>
          </Label>
          <span className="sr-only">(obrigatório)</span>
          <InfoTooltip content="Presencial: no escritório. Híbrido: parte remoto, parte presencial. Remoto: 100% à distância." />
        </div>
        <SeletorModalidade
          idBase="vaga-modalidade"
          valor={rascunho.modalidade}
          aoMudar={(valor) => setCampo('modalidade', valor)}
          erro={erros.modalidade}
        />
        <ErroCampo id="vaga-modalidade-erro">{erros.modalidade}</ErroCampo>
      </div>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Rotulo htmlFor="vaga-localizacao">Localização</Rotulo>
          <div className="relative">
            <MapPin
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-info"
            />
            <Input
              id="vaga-localizacao"
              value={rascunho.localizacao}
              onChange={(event) => setCampo('localizacao', event.target.value)}
              placeholder="Ex.: São Paulo, SP"
              maxLength={LIMITES.localizacao.max}
              autoComplete="off"
              className={cn(CAMPO, 'pl-9 pr-9')}
            />
            {rascunho.localizacao ? (
              <button
                type="button"
                onClick={() => setCampo('localizacao', '')}
                aria-label="Limpar localização"
                className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                <X aria-hidden className="h-3 w-3" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-background/50 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <Label
              htmlFor="vaga-divulgar-faixa"
              className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-foreground/60"
            >
              Divulgar faixa salarial
              <InfoTooltip content="Com o botão desligado, a faixa não aparece no anúncio da vaga." />
            </Label>
            <Switch
              id="vaga-divulgar-faixa"
              checked={rascunho.divulgarFaixa}
              onCheckedChange={(valor) => setCampo('divulgarFaixa', valor)}
            />
          </div>
          <p className="mt-1 text-[10.5px] leading-snug text-muted-foreground">
            {rascunho.divulgarFaixa
              ? 'A faixa aparece no anúncio e ajuda a filtrar candidaturas.'
              : 'A faixa fica só com o time de recrutamento.'}
          </p>
        </div>
      </div>

      {rascunho.divulgarFaixa ? (
        <div className="rounded-xl border border-warning/35 bg-warning/[0.07] px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/75">
            <Coins aria-hidden className="h-3.5 w-3.5 text-warning" />
            Faixa salarial
            <span className="font-normal text-muted-foreground">(opcional)</span>
          </p>
          <div className="mt-2 flex items-center gap-2">
            <CampoMoeda
              idCampo="vaga-faixa-min"
              valor={rascunho.faixaMin}
              aoMudar={(valor) => setCampo('faixaMin', valor)}
              placeholder="Mínimo"
              rotulo="Faixa salarial mínima"
              erro={erros.faixaMin}
            />
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">até</span>
            <CampoMoeda
              idCampo="vaga-faixa-max"
              valor={rascunho.faixaMax}
              aoMudar={(valor) => setCampo('faixaMax', valor)}
              placeholder="Máximo"
              rotulo="Faixa salarial máxima"
              erro={erros.faixaMax}
            />
          </div>
          <ErroCampo id="vaga-faixa-max-erro">{erros.faixaMax}</ErroCampo>
        </div>
      ) : null}
    </div>
  );
}
/** ETAPA 2 — descrição e requisitos. */
function PassoDescricao({ rascunho, erros, setCampo }: PropsPasso) {
  const faltam = Math.max(0, LIMITES.descricao.min - rascunho.descricao.trim().length);

  return (
    <div className="space-y-3.5">
      <div className="grid gap-1.5">
        <Rotulo
          htmlFor="vaga-descricao"
          obrigatorio
          dica={
            <span className="ml-auto text-[10.5px] tabular-nums text-muted-foreground">
              {rascunho.descricao.length}/{LIMITES.descricao.max}
            </span>
          }
        >
          Descrição da vaga
        </Rotulo>
        <Textarea
          id="vaga-descricao"
          value={rascunho.descricao}
          onChange={(event) => setCampo('descricao', event.target.value)}
          maxLength={LIMITES.descricao.max}
          rows={5}
          placeholder="Resuma o desafio, o time e o dia a dia da posição..."
          aria-invalid={erros.descricao ? true : undefined}
          aria-describedby={erros.descricao ? 'vaga-descricao-erro' : undefined}
          className={cn(
            'min-h-[110px] resize-y rounded-xl border-border/60 bg-background/60 text-[12.5px] leading-relaxed focus-visible:ring-primary/25',
            erros.descricao && 'border-destructive/60'
          )}
        />
        <div className="flex items-center justify-between gap-2">
          <ErroCampo id="vaga-descricao-erro">{erros.descricao}</ErroCampo>
          {!erros.descricao && faltam > 0 ? (
            <p className="text-[10.5px] text-muted-foreground">
              Faltam {faltam} {faltam === 1 ? 'caractere' : 'caracteres'}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-1.5">
        <Rotulo htmlFor="vaga-requisitos" obrigatorio>
          Requisitos
        </Rotulo>
        <CampoLista
          idCampo="vaga-requisitos"
          rotulo="Requisitos da vaga"
          valores={rascunho.requisitos}
          aoAdicionar={(texto) => setCampo('requisitos', [...adicionarNaLista(rascunho.requisitos, texto)])}
          aoRemover={(texto) => setCampo('requisitos', removerDaLista(rascunho.requisitos, texto))}
          placeholder="Ex.: React (Enter para adicionar)"
          tom="primary"
          erro={erros.requisitos}
        />
        <ErroCampo id="vaga-requisitos-erro">{erros.requisitos}</ErroCampo>
        <p className="text-[10.5px] text-muted-foreground">
          Enter ou vírgula confirmam cada item. São os requisitos exibidos no card da vaga.
        </p>
      </div>

      <div className="grid gap-1.5">
        <Rotulo htmlFor="vaga-responsabilidades">Responsabilidades</Rotulo>
        <CampoLista
          idCampo="vaga-responsabilidades"
          rotulo="Responsabilidades da vaga"
          valores={rascunho.responsabilidades}
          aoAdicionar={(texto) =>
            setCampo('responsabilidades', [...adicionarNaLista(rascunho.responsabilidades, texto)])
          }
          aoRemover={(texto) => setCampo('responsabilidades', removerDaLista(rascunho.responsabilidades, texto))}
          placeholder="Ex.: Desenvolver e manter o produto (Enter para adicionar)"
          tom="ciano"
        />
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Rotulo htmlFor="vaga-diferenciais">Diferenciais</Rotulo>
          <CampoLista
            idCampo="vaga-diferenciais"
            rotulo="Diferenciais da vaga"
            valores={rascunho.diferenciais}
            aoAdicionar={(texto) => setCampo('diferenciais', [...adicionarNaLista(rascunho.diferenciais, texto)])}
            aoRemover={(texto) => setCampo('diferenciais', removerDaLista(rascunho.diferenciais, texto))}
            placeholder="Ex.: Inglês avançado"
            tom="violeta"
          />
        </div>

        <div className="grid gap-1.5">
          <Rotulo htmlFor="vaga-beneficios">Benefícios</Rotulo>
          <CampoLista
            idCampo="vaga-beneficios"
            rotulo="Benefícios da vaga"
            valores={rascunho.beneficios}
            aoAdicionar={(texto) => setCampo('beneficios', [...adicionarNaLista(rascunho.beneficios, texto)])}
            aoRemover={(texto) => setCampo('beneficios', removerDaLista(rascunho.beneficios, texto))}
            placeholder="Ex.: Plano de saúde"
            tom="violeta"
          />
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-info/30 bg-info/[0.06] px-3 py-2">
        <Info aria-hidden className="mt-px h-3.5 w-3.5 shrink-0 text-info" />
        <p className="text-[10.5px] leading-snug text-muted-foreground">
          Responsabilidades e diferenciais entram no texto do anúncio. Benefícios e requisitos são salvos nos campos
          próprios da vaga.
        </p>
      </div>
    </div>
  );
}
/** Linha “rótulo → valor” da revisão. */
function LinhaResumo({ rotulo, children }: { rotulo: string; children?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/30 py-1.5 last:border-0">
      <span className="shrink-0 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        {rotulo}
      </span>
      <span className="min-w-0 text-right text-[12px] font-medium text-foreground">
        {children || <span className="text-muted-foreground">—</span>}
      </span>
    </div>
  );
}

/** Cartão de seção da revisão, com o atalho “Editar” para a etapa de origem. */
function SecaoRevisao({
  titulo,
  icone: Icone,
  tom,
  aoEditar,
  children,
}: {
  titulo: string;
  icone: LucideIcon;
  tom: Tom;
  aoEditar: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/50 bg-background/40">
      <header className="flex items-center gap-2 border-b border-border/40 px-3.5 py-2.5">
        <span className={cn('flex h-6 w-6 items-center justify-center rounded-lg', TONS[tom].fundo, TONS[tom].texto)}>
          <Icone aria-hidden className="h-3.5 w-3.5" />
        </span>
        <h4 className="text-[12px] font-semibold text-foreground">{titulo}</h4>
        <button
          type="button"
          onClick={aoEditar}
          className="ml-auto inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[10.5px] font-semibold text-primary transition-colors hover:bg-primary/10"
        >
          <PencilLine aria-hidden className="h-3 w-3" />
          Editar
        </button>
      </header>
      <div className="px-3.5 py-2.5">{children}</div>
    </section>
  );
}

/** Lista de pílulas somente-leitura (revisão e prévia). */
function Pilulas({
  valores,
  tom,
  vazio = 'Nenhum item informado',
}: {
  valores: readonly string[];
  tom: Tom;
  vazio?: string;
}) {
  if (valores.length === 0) return <p className="text-[11px] italic text-muted-foreground">{vazio}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {valores.map((valor) => (
        <span
          key={valor}
          className={cn(
            'max-w-full truncate rounded-full border px-2 py-0.5 text-[11px] font-medium',
            TONS[tom].borda,
            TONS[tom].fundo,
            TONS[tom].texto
          )}
        >
          {valor}
        </span>
      ))}
    </div>
  );
}
/** ETAPA 3 — revisão antes de publicar. */
function PassoRevisao({ rascunho, aoEditar }: { rascunho: RascunhoVaga; aoEditar: (etapa: EtapaNovaVaga) => void }) {
  const faixa = !rascunho.divulgarFaixa
    ? 'Não divulgada'
    : (formatarFaixaSalarial(rascunho.faixaMin, rascunho.faixaMax) ?? 'A combinar');

  return (
    <div className="space-y-3">
      <SecaoRevisao titulo="Informações da vaga" icone={Briefcase} tom="primary" aoEditar={() => aoEditar(1)}>
        <LinhaResumo rotulo="Título">{rascunho.titulo}</LinhaResumo>
        <LinhaResumo rotulo="Departamento">{rascunho.departamento}</LinhaResumo>
        <LinhaResumo rotulo="Contratação">{rascunho.tipoContrato}</LinhaResumo>
        <LinhaResumo rotulo="Senioridade">{rascunho.senioridade}</LinhaResumo>
        <LinhaResumo rotulo="Modalidade">{rascunho.modalidade}</LinhaResumo>
        <LinhaResumo rotulo="Vagas">{rascunho.quantidade}</LinhaResumo>
        <LinhaResumo rotulo="Localização">{rascunho.localizacao}</LinhaResumo>
        <LinhaResumo rotulo="Faixa salarial">{faixa}</LinhaResumo>
      </SecaoRevisao>

      <SecaoRevisao titulo="Descrição" icone={FileText} tom="violeta" aoEditar={() => aoEditar(2)}>
        <p className="whitespace-pre-line text-[11.5px] leading-relaxed text-foreground/80">{rascunho.descricao}</p>
      </SecaoRevisao>

      <SecaoRevisao titulo="Requisitos" icone={ListChecks} tom="primary" aoEditar={() => aoEditar(2)}>
        <Pilulas valores={rascunho.requisitos} tom="primary" />
      </SecaoRevisao>

      <SecaoRevisao
        titulo="Responsabilidades e diferenciais"
        icone={ClipboardList}
        tom="ciano"
        aoEditar={() => aoEditar(2)}
      >
        <div className="space-y-2">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Responsabilidades
            </p>
            <Pilulas valores={rascunho.responsabilidades} tom="ciano" vazio="Nenhuma responsabilidade informada" />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Diferenciais
            </p>
            <Pilulas valores={rascunho.diferenciais} tom="violeta" vazio="Nenhum diferencial informado" />
          </div>
        </div>
      </SecaoRevisao>

      <SecaoRevisao titulo="Benefícios" icone={Sparkles} tom="violeta" aoEditar={() => aoEditar(2)}>
        <Pilulas valores={rascunho.beneficios} tom="violeta" vazio="Nenhum benefício informado" />
      </SecaoRevisao>

      <div className="rounded-xl border border-primary/30 bg-primary/[0.06] px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/80">
          <Send aria-hidden className="h-3.5 w-3.5 text-primary" />
          Pronto para publicar?
        </p>
        <p className="mt-1 text-[10.5px] leading-snug text-muted-foreground">
          A vaga entra como <strong className="font-semibold text-foreground/80">Aberta</strong> no painel e passa a
          receber candidaturas. Senioridade e localização ficam nesta revisão: o cadastro da vaga ainda não guarda esses
          dois campos.
        </p>
      </div>
    </div>
  );
}
/** Campos da etapa 1 — decidem para onde voltar quando a publicação falha. */
const CAMPOS_ETAPA_1: readonly CampoRascunho[] = [
  'titulo',
  'departamento',
  'tipoContrato',
  'senioridade',
  'modalidade',
  'quantidade',
  'faixaMin',
  'faixaMax',
];

export function NovaVagaDialog({
  open,
  onOpenChange,
  departamentos,
  salvando,
  onPublicar,
  onSalvarRascunho,
}: NovaVagaDialogProps) {
  const [etapa, setEtapa] = useState<EtapaNovaVaga>(1);
  const [maiorEtapa, setMaiorEtapa] = useState<EtapaNovaVaga>(1);
  const [rascunho, setRascunho] = useState<RascunhoVaga>(RASCUNHO_VAZIO);
  const [erros, setErros] = useState<ErrosRascunho>({});
  const [tentouAvancar, setTentouAvancar] = useState(false);

  // Cada abertura começa do zero: rascunho publicado ou descartado não volta.
  // O ajuste acontece na RENDERIZAÇÃO (padrão do React para reagir a uma prop),
  // não em `useEffect` — não há efeito colateral aqui, só o formulário voltando
  // ao estado inicial quando a janela reabre.
  const [estavaAberta, setEstavaAberta] = useState(open);
  if (open !== estavaAberta) {
    setEstavaAberta(open);
    if (open) {
      setEtapa(1);
      setMaiorEtapa(1);
      setRascunho(RASCUNHO_VAZIO);
      setErros({});
      setTentouAvancar(false);
    }
  }

  const atual = ETAPAS[etapa - 1];
  const IconeAtual = atual.icone;
  const mostrarAlerta = tentouAvancar && temErros(erros);

  /** Escreve um campo e apaga só o erro daquele campo (os outros ficam). */
  function setCampo<C extends CampoRascunho>(campo: C, valor: RascunhoVaga[C]) {
    setRascunho((anterior) => ({ ...anterior, [campo]: valor }));
    setErros((anteriores) => {
      if (!anteriores[campo]) return anteriores;
      const proximos: ErrosRascunho = { ...anteriores };
      delete proximos[campo];
      return proximos;
    });
  }

  /** Troca de etapa limpando os avisos (a validação acontece antes). */
  function irParaEtapa(destino: EtapaNovaVaga) {
    setEtapa(destino);
    setMaiorEtapa((maior) => (destino > maior ? destino : maior));
    setErros({});
    setTentouAvancar(false);
  }

  function avancar() {
    const encontrados = validarEtapa(etapa, rascunho);
    if (temErros(encontrados)) {
      setErros(encontrados);
      setTentouAvancar(true);
      return;
    }
    irParaEtapa(etapa === 3 ? 3 : ((etapa + 1) as EtapaNovaVaga));
  }

  function voltar() {
    if (etapa === 1) return;
    irParaEtapa((etapa - 1) as EtapaNovaVaga);
  }

  /**
   * Clique na trilha ou em “Editar” da revisão. Voltar é sempre livre; ir para
   * a frente revalida a etapa atual para o usuário não pular um campo inválido.
   */
  function irPara(destino: EtapaNovaVaga) {
    if (destino === etapa) return;
    if (destino > etapa) {
      const encontrados = validarEtapa(etapa, rascunho);
      if (temErros(encontrados)) {
        setErros(encontrados);
        setTentouAvancar(true);
        return;
      }
    }
    irParaEtapa(destino);
  }

  /** Publica: revalida 1 + 2 e, se faltar algo, volta para a etapa do erro. */
  function publicar() {
    const encontrados = errosDaPublicacao(rascunho);
    if (temErros(encontrados)) {
      const primeira: EtapaNovaVaga = CAMPOS_ETAPA_1.some((campo) => encontrados[campo]) ? 1 : 2;
      setEtapa(primeira);
      setMaiorEtapa((maior) => (primeira > maior ? primeira : maior));
      setErros(encontrados);
      setTentouAvancar(true);
      return;
    }
    setErros({});
    setTentouAvancar(false);
    onPublicar(rascunho);
  }

  /** Rascunho parcial: só o título é obrigatório (o resto pode ficar para depois). */
  function salvarRascunho() {
    if (!podeSalvarRascunho(rascunho)) {
      setEtapa(1);
      setErros({ titulo: 'Informe o título para salvar o rascunho.' });
      setTentouAvancar(true);
      return;
    }
    setErros({});
    setTentouAvancar(false);
    onSalvarRascunho(rascunho);
  }

  return (
    <CascadeDialogFrame
      open={open}
      onOpenChange={onOpenChange}
      blocks={BLOCOS_CASCATA}
      className="flex max-h-[88dvh] w-[calc(100vw-1.25rem)] max-w-[720px] flex-col rounded-3xl border-border/40 bg-card shadow-2xl"
      contentClassName="flex min-h-0 flex-col"
    >
      {/* 1 · CABEÇALHO — identidade da janela + etapa atual. */}
      <motion.div
        variants={cascadeItemVariants}
        className="shrink-0 border-b border-border/40 px-5 pb-3.5 pr-12 pt-4 sm:px-6 sm:pt-5"
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
              TONS[atual.tom].borda,
              TONS[atual.tom].fundo,
              TONS[atual.tom].texto
            )}
          >
            <IconeAtual className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <DialogPrimitive.Title className="truncate font-display text-[16px] font-semibold leading-tight tracking-tight text-foreground">
              Anunciar nova vaga
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-0.5 text-[11.5px] text-muted-foreground">
              Etapa {etapa} de {ETAPAS.length} · {atual.titulo}
            </DialogPrimitive.Description>
          </div>
        </div>
      </motion.div>

      {/* 2 · TRILHA das três etapas. */}
      <motion.div
        variants={cascadeItemVariants}
        className="shrink-0 border-b border-border/40 bg-muted/20 px-5 py-3 sm:px-6"
      >
        <PassosAssistente etapa={etapa} maiorEtapa={maiorEtapa} aoEscolher={irPara} />
      </motion.div>

      {/* 3 · CORPO — só a faixa do formulário rola; cabeçalho e rodapé ficam. */}
      <motion.div variants={cascadeItemVariants} className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
        {mostrarAlerta ? (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/[0.07] px-3 py-2">
            <AlertCircle aria-hidden className="mt-px h-3.5 w-3.5 shrink-0 text-destructive" />
            <p role="alert" className="text-[11px] font-medium leading-snug text-destructive">
              Confira os campos destacados abaixo para continuar.
            </p>
          </div>
        ) : null}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={etapa}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {etapa === 1 ? (
              <PassoInformacoes rascunho={rascunho} erros={erros} setCampo={setCampo} departamentos={departamentos} />
            ) : etapa === 2 ? (
              <PassoDescricao rascunho={rascunho} erros={erros} setCampo={setCampo} />
            ) : (
              <PassoRevisao rascunho={rascunho} aoEditar={irPara} />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* 4 · RODAPÉ — Voltar · Salvar rascunho · Continuar/Publicar. */}
      <motion.div
        variants={cascadeItemVariants}
        className="shrink-0 border-t border-border/40 bg-muted/20 px-5 py-3 sm:px-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={voltar}
            disabled={etapa === 1 || salvando}
            className="gap-1.5 rounded-xl text-[12px] font-semibold"
          >
            <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
            Voltar
          </Button>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={salvarRascunho}
              disabled={salvando}
              className="gap-1.5 rounded-xl text-[12px] font-semibold"
            >
              <FileText aria-hidden className="h-3.5 w-3.5" />
              Salvar rascunho
            </Button>

            {etapa < 3 ? (
              <Button
                type="button"
                size="sm"
                onClick={avancar}
                disabled={salvando}
                className="gap-1.5 rounded-xl text-[12px] font-semibold"
              >
                Continuar
                <ArrowRight aria-hidden className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={publicar}
                disabled={salvando}
                className="gap-1.5 rounded-xl text-[12px] font-semibold"
              >
                {salvando ? (
                  <Spinner size="sm" className="text-primary-foreground" />
                ) : (
                  <Send aria-hidden className="h-3.5 w-3.5" />
                )}
                {salvando ? 'Publicando…' : 'Publicar vaga'}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </CascadeDialogFrame>
  );
}
