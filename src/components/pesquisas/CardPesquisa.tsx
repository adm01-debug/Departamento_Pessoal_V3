/**
 * ============================================================================
 * PESQUISAS DE CLIMA & eNPS — CARTÃO DA GRADE (ativa · encerrada · rascunho).
 *
 * Uma única peça desenha as TRÊS variantes do status, porque elas compartilham
 * a mesma moldura e mudam apenas o miolo:
 *
 *  ┌ topo ─────────────────────────────────────────────────────────────────┐
 *  │ tag do tipo · tag de status ···································· (…) │
 *  │ título (2 linhas)                                                     │
 *  │ descrição (2 linhas, truncada)                                         │
 *  │ calendário + período ···· anônima/identificada                        │
 *  ├ miolo ────────────────────────────────────────────────────────────────┤
 *  │ ativa/encerrada → barra de adesão + "154 de 215 respostas"            │
 *  │ rascunho        → bloco "Ainda sem respostas. Publique…"              │
 *  ├ rodapé ───────────────────────────────────────────────────────────────┤
 *  │ "Atualizado em 10 de jul. de 2026" ······ ação principal + (…)        │
 *  └───────────────────────────────────────────────────────────────────────┘
 *
 * `mt-auto` no miolo cola o rodapé na base: os cartões da MESMA linha (com
 * título de 1 ou 2 linhas) ficam com a barra e os botões alinhados, que é o
 * que faz a grade ler como grade — e não como cards de alturas diferentes.
 *
 * Nada aqui busca dado: os agregados chegam prontos de `pesquisasComum`
 * (`adesaoDe`, `formatarPeriodo`, `formatarAtualizacao`, `temaTipo`,
 * `temaStatus`), então nenhum cartão pode divergir do outro.
 * ============================================================================
 */
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Calendar,
  Flag,
  Info,
  MoreHorizontal,
  PencilLine,
  Play,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { entradaCard } from '@/components/ui/entrada-cards';
import { cn } from '@/lib/utils';
import { BarraAdesao } from './BarraAdesao';
import {
  adesaoDe,
  formatarAtualizacao,
  formatarPeriodo,
  temaStatus,
  temaTipo,
  type PesquisaListada,
} from './pesquisasComum';

export interface CardPesquisaProps {
  pesquisa: PesquisaListada;
  /** Índice na cascata de entrada da grade. */
  indice?: number;
  onResultados: (pesquisa: PesquisaListada) => void;
  onEditar: (pesquisa: PesquisaListada) => void;
  onPublicar: (pesquisa: PesquisaListada) => void;
  onEncerrar: (pesquisa: PesquisaListada) => void;
  onExcluir: (pesquisa: PesquisaListada) => void;
}

/** Tag do TIPO (tingida no tom da categoria, com o ícone do próprio tipo). */
function TagTipo({ tipo }: { tipo: string }) {
  const tema = temaTipo(tipo);
  const Icone = tema.icone;
  return (
    <span
      className={cn(
        'inline-flex min-w-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium leading-none',
        tema.tag
      )}
    >
      <Icone className="h-3 w-3 shrink-0" aria-hidden />
      <span className="truncate">{tema.rotulo}</span>
    </span>
  );
}

/** Tag oval de STATUS — ponto sólido + rótulo, no tom do status. */
function TagStatus({ status }: { status: string }) {
  const tema = temaStatus(status);
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-medium leading-none',
        tema.tag
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', tema.ponto)} aria-hidden />
      {tema.rotulo}
    </span>
  );
}

/**
 * Menu "…" — as ações RÁPIDAS do cartão, todas já existentes no serviço:
 * `pesquisaService.atualizar` (publicar / encerrar) e `excluir`. Os itens
 * mudam com o status porque cada estado permite um conjunto diferente.
 */
function MenuAcoes({
  pesquisa,
  onResultados,
  onEditar,
  onPublicar,
  onEncerrar,
  onExcluir,
  className,
}: Pick<CardPesquisaProps, 'onResultados' | 'onEditar' | 'onPublicar' | 'onEncerrar' | 'onExcluir'> & {
  pesquisa: PesquisaListada;
  className?: string;
}) {
  const rascunho = pesquisa.status === 'rascunho';
  const encerrada = pesquisa.status === 'encerrada';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-7 w-7 shrink-0 rounded-lg text-muted-foreground hover:text-foreground', className)}
          aria-label={`Ações da pesquisa ${pesquisa.titulo}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">
          Ações da pesquisa
        </DropdownMenuLabel>
        {rascunho ? (
          <>
            <DropdownMenuItem onClick={() => onEditar(pesquisa)} className="gap-2 text-[12px]">
              <PencilLine className="h-3.5 w-3.5" /> Continuar edição
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onPublicar(pesquisa)} className="gap-2 text-[12px]">
              <Play className="h-3.5 w-3.5" /> Publicar pesquisa
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem onClick={() => onResultados(pesquisa)} className="gap-2 text-[12px]">
            <BarChart3 className="h-3.5 w-3.5" /> Ver resultados
          </DropdownMenuItem>
        )}
        {!rascunho && !encerrada && (
          <DropdownMenuItem onClick={() => onEncerrar(pesquisa)} className="gap-2 text-[12px]">
            <Flag className="h-3.5 w-3.5" /> Encerrar pesquisa
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onExcluir(pesquisa)}
          className="gap-2 text-[12px] text-destructive focus:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" /> Excluir pesquisa
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Linha de metadados: período (calendário) + identificação (escudo/pessoa). */
function Metadados({ pesquisa }: { pesquisa: PesquisaListada }) {
  const identificacao = pesquisa.anonima ? 'Anônima' : 'Identificada';
  const IconeIdentificacao = pesquisa.anonima ? ShieldCheck : UserRound;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate" title={formatarPeriodo(pesquisa.data_inicio, pesquisa.data_fim)}>
          {formatarPeriodo(pesquisa.data_inicio, pesquisa.data_fim)}
        </span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1.5">
        <IconeIdentificacao className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {identificacao}
      </span>
    </div>
  );
}

export function CardPesquisa({
  pesquisa,
  indice = 0,
  onResultados,
  onEditar,
  onPublicar,
  onEncerrar,
  onExcluir,
}: CardPesquisaProps) {
  const rascunho = pesquisa.status === 'rascunho';
  const encerrada = pesquisa.status === 'encerrada';
  const adesao = adesaoDe(pesquisa);

  // Ação principal do rodapé — muda com o status, como na referência:
  // ativa → "Acompanhar", encerrada → "Ver resultados", rascunho → "Continuar edição".
  const acaoPrincipal = rascunho
    ? { rotulo: 'Continuar edição', onClick: () => onEditar(pesquisa) }
    : encerrada
      ? { rotulo: 'Ver resultados', onClick: () => onResultados(pesquisa) }
      : { rotulo: 'Acompanhar', onClick: () => onResultados(pesquisa) };

  return (
    <motion.div
      {...entradaCard(indice)}
      className="flex h-full min-w-0 flex-col gap-2.5 rounded-[14px] border border-border/50 bg-gradient-to-b from-card to-card/60 p-4 transition-colors hover:border-border"
    >
      {/* TOPO: tipo · status AGRUPADOS à esquerda — a tag de status perdeu o
          `mx-auto` (que a jogava para o centro, abrindo um vão largo dos dois
          lados) e ganhou `ml-3` = 0,75rem = 15px nesta base de 125%
          (`html { font-size: 125% }` em `index.css`), então lê como "par" da tag
          de tipo sem ficar colada nela. O menu "…" continua no extremo direito,
          agora por `ml-auto`: o espaço livre é todo dele, não do status.
          O `flex` no apoio do status não é decoração: sem ele o `<span>` de
          linha herda o line-height do texto e a pílula fica ~3px abaixo da tag
          de tipo (medido no Chromium); como flex container, o apoio tem a
          altura exata da pílula e `items-center` centraliza as duas. */}
      <div className="flex min-w-0 items-center">
        <TagTipo tipo={pesquisa.tipo} />
        <span className="ml-3 flex">
          <TagStatus status={pesquisa.status} />
        </span>
        <MenuAcoes
          pesquisa={pesquisa}
          onResultados={onResultados}
          onEditar={onEditar}
          onPublicar={onPublicar}
          onEncerrar={onEncerrar}
          onExcluir={onExcluir}
          className="ml-auto"
        />
      </div>

      <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground" title={pesquisa.titulo}>
        {pesquisa.titulo}
      </h3>

      {pesquisa.descricao && (
        <p className="line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">{pesquisa.descricao}</p>
      )}

      <Metadados pesquisa={pesquisa} />

      {rascunho ? (
        // RASCUNHO: não há adesão para medir — o miolo é o aviso do próximo passo.
        <div className="mt-auto flex items-start gap-2 rounded-[10px] border border-warning/25 bg-warning/10 px-2.5 py-2">
          <Info className="mt-px h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold leading-tight text-foreground">Ainda sem respostas.</p>
            <p className="text-[10px] leading-snug text-muted-foreground">
              Publique a pesquisa para começar a receber respostas.
            </p>
          </div>
        </div>
      ) : (
        // ATIVA / ENCERRADA: adesão real (respostas ÷ convidados) na barra.
        <div className="mt-auto flex flex-col gap-1">
          {adesao.disponivel ? (
            <>
              <div className="flex items-center gap-2">
                {/* Preenchimento em degradê LIMA → VERDE: `from-primary` (o lime
                    do sistema) na ponta esquerda e `to-success` (verde de
                    sucesso) na direita — o mesmo par das barras de progresso do
                    card de Desenvolvimento (`DesenvolvimentoProfissionalCard`),
                    em vez do antigo `to-primary-glow` (lime → lime), que lia
                    como cor chapada.

                    MÁSCARA: `rounded-full` no PRÓPRIO preenchimento faz a cabeça
                    da barra seguir o raio do trilho; o `overflow-hidden` +
                    `rounded-full` do Root (`ui/progress.tsx`) recortam o degradê
                    dentro da pílula, então nada escapa das bordas arredondadas.
                    O preenchimento é `w-full` e anda por `translateX(-N%)`: em 0%
                    ele fica inteiro fora da área visível (trilha vazia), em 100%
                    encosta nas duas bordas — e a rampa do degradê acompanha o
                    TRILHO, não a fração preenchida (barra curta lê mais lime,
                    barra cheia lê lime → verde inteiro).

                    MOVIMENTO: quem escreve esse `translateX` é a `BarraAdesao`
                    (`./BarraAdesao`), com a MESMA régua do card "Amplitude de
                    Liderança" (`./barraAdesaoAnim` → 1,2 s · `easeOut` · atraso
                    de 0,15 s + índice × 0,1 s): o preenchimento parte do zero no
                    commit em que o cartão monta (a grade só existe com
                    `isLoading === false`) e cresce até o percentual real, em vez
                    de aparecer pronto. Cor, altura, trilho e textos intactos. */}
                <BarraAdesao
                  value={adesao.percentual}
                  indice={indice}
                  aria-label={`Adesão de ${adesao.percentual}%`}
                  className="h-1.5 bg-muted/50"
                  indicatorClassName="rounded-full bg-gradient-to-r from-primary to-success"
                />
                <span className="shrink-0 text-[11px] font-semibold tabular-nums text-foreground">
                  {adesao.percentual}%
                </span>
              </div>
              <p className="text-[10px] leading-tight text-muted-foreground">
                {adesao.respostas} de {adesao.convidados} respostas
              </p>
            </>
          ) : (
            <p className="text-[10px] leading-tight text-muted-foreground">Participação ainda não calculada</p>
          )}
        </div>
      )}

      <div className="mt-1 flex min-w-0 items-center justify-between gap-2 border-t border-border/40 pt-2.5">
        <span className="truncate text-[10px] text-muted-foreground" title={formatarAtualizacao(pesquisa.updated_at)}>
          {formatarAtualizacao(pesquisa.updated_at)}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={acaoPrincipal.onClick}
            className="h-7 gap-1 rounded-lg border-border/60 bg-background/40 px-2.5 text-[11px] font-medium"
          >
            {acaoPrincipal.rotulo}
            <ArrowRight className="h-3 w-3" aria-hidden />
          </Button>
          <MenuAcoes
            pesquisa={pesquisa}
            onResultados={onResultados}
            onEditar={onEditar}
            onPublicar={onPublicar}
            onEncerrar={onEncerrar}
            onExcluir={onExcluir}
          />
        </div>
      </div>
    </motion.div>
  );
}
