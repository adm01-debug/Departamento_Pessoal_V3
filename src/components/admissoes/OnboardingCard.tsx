/**
 * Card COMPACTO de onboarding — o "mini painel" de um colaborador em integração.
 *
 * Substitui o card alto com checklist sempre aberto da versão anterior: agora é
 * um card de dashboard, denso em informação e escaneável de relance, na mesma
 * linguagem do resto da área.
 *
 * HIERARQUIA (a leitura de cima para baixo):
 *   1. cabeçalho  — avatar de iniciais + nome + `cargo • departamento`, com o
 *                   percentual no canto direito;
 *   2. barra      — progresso horizontal fino (cor muda com o estado);
 *   3. marcos     — régua de 4 pontos (Pré-onboarding → 30 dias);
 *   4. próxima ação (ou "Concluído" quando a jornada terminou) — TÍTULO em
 *                   largura total com quebra de linha livre, a `descricao` da
 *                   tarefa como legenda e o prazo + responsável numa faixa de
 *                   metadados própria. NENHUM texto daqui é truncado: o bloco
 *                   cresce em altura e o card acompanha;
 *   5. rodapé     — micro status pills (concluídas / pendentes / em risco) e as
 *                   ações ("Ver onboarding" + menu de 3 pontos).
 *
 * A LISTA COMPLETA DE TAREFAS NÃO MORA AQUI: ela foi para o detalhe
 * (`OnboardingDetalheDialog`), aberto por "Ver onboarding". O card só lê os
 * números via `onboardingDerivacoes.ts` — nenhuma regra de negócio é duplicada.
 *
 * Todo dado exibido vem do registro real (nome, cargo, departamento, tarefas);
 * o que o card calcula são só leituras desses dados (progresso, marco atual,
 * prazo da próxima tarefa, contadores). Nenhum texto é inventado.
 */
import { AlertTriangle, CalendarClock, CheckCircle2, Circle, Eye, Mail, MoreVertical, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { iniciais, inicioDoDia } from './admissoesDerivacoes';
import { MARCOS_ONBOARDING, TOM_PRAZO, TOM_PRAZO_VEU, corAvatar } from './onboardingComum';
import {
  estadosDosMarcos,
  formatarPrazo,
  prazoDaTarefa,
  progressoOnboarding,
  proximaTarefa,
  resumoOnboarding,
  ultimaConclusao,
  type ColaboradorOnboarding,
  type EstadoMarco,
  type TarefaOnboarding,
} from './onboardingDerivacoes';

/** Ações do card — todas reusam caminhos que a página já tem. */
export interface OnboardingAcoes {
  /** Abre o detalhe com a jornada completa (checklist). */
  onVerOnboarding: (colaborador: ColaboradorOnboarding) => void;
  /** Copia a mensagem de boas-vindas para a área de transferência (não há infra de e-mail: nada de "enviado"). */
  onCopiarMensagemBoasVindas: (colaborador: ColaboradorOnboarding) => void;
  /** Baixa a próxima tarefa pendente (mesma mutation de "Concluir"). */
  onConcluirProxima?: (tarefa: TarefaOnboarding) => void;
}

interface OnboardingCardProps {
  colaborador: ColaboradorOnboarding;
  acoes: OnboardingAcoes;
}

/** Classe do ponto de cada marco conforme o estado. */
const ESTADO_MARCO: Record<EstadoMarco, string> = {
  concluido: 'border-primary bg-primary',
  atual: 'border-primary bg-primary ring-2 ring-primary/25',
  pendente: 'border-border bg-card',
};

/** Avatar de iniciais — o fundo/tinta vêm de `corAvatar(nome)`. */
function AvatarIniciais({ nome, className }: { nome?: string | null; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-display font-semibold tracking-tight',
        className
      )}
    >
      {iniciais(nome)}
    </span>
  );
}

/**
 * Régua de marcos — trilho + pontos + rótulos, TODOS no MESMO grid de N colunas
 * iguais (o de `MARCOS_ONBOARDING`).
 *
 * GEOMETRIA (por que não vaza): o grid divide o container em N colunas iguais,
 * então o centro da 1ª coluna cai em `50/N %` e o da última em `100 - 50/N %`.
 * O trilho neutro é posicionado EXATAMENTE entre esses dois centros
 * (`left`/`right` = `50/N %`) e o preenchido começa no 1º centro e avança
 * `largura * fração`, parando no centro do ponto atual — nunca além do último
 * ponto, nunca para fora do card.
 *
 * CAMADAS (por que a linha não corta os pontos): os dois trilhos são
 * elementos ABSOLUTOS. Como um absoluto pinta por cima de irmãos em fluxo
 * normal (e o ponto vive no fluxo do grid), sem camada explícita o traço
 * apareceria POR CIMA das bolinhas. Por isso o empilhamento é explícito:
 * `z-0` nos trilhos e `relative z-10` nos pontos — a bolinha (opaca) sempre
 * encobre o traço, que termina sob o seu centro.
 */
function MarcosOnboarding({ estados }: { estados: EstadoMarco[] }) {
  const total = estados.length || 1;
  const concluidos = estados.filter((e) => e === 'concluido').length;
  // % do centro da 1ª/última coluna (e, portanto, do 1º/último ponto).
  const centro = 50 / total;
  const larguraTrilho = 100 - 2 * centro;
  // Cada marco concluído avança um passo do trilho; nunca passa do último ponto.
  const fracao = total > 1 ? Math.min(1, concluidos / (total - 1)) : 0;

  return (
    <div className="relative grid" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
      {/* trilho neutro — só o vão entre o 1º e o último ponto (camada de trás) */}
      <span
        aria-hidden
        data-testid="onboarding-timeline-track"
        className="absolute top-[5px] z-0 h-px bg-border/70"
        style={{ left: `${centro}%`, right: `${centro}%` }}
      />
      {/* trilho preenchido — para no centro do ponto atual (mesma camada de trás) */}
      {fracao > 0 && (
        <span
          aria-hidden
          data-testid="onboarding-timeline-fill"
          className="absolute top-[5px] z-0 h-px bg-primary"
          style={{ left: `${centro}%`, width: `${larguraTrilho * fracao}%` }}
        />
      )}

      {estados.map((estado, i) => (
        <div key={i} className="flex min-w-0 flex-col items-center gap-1.5">
          {/* ponto — `relative z-10` garante que fica SEMPRE acima dos trilhos */}
          <span
            data-testid="onboarding-timeline-dot"
            className={cn('relative z-10 h-2.5 w-2.5 shrink-0 rounded-full border-2', ESTADO_MARCO[estado])}
          />
          <span
            className={cn(
              'whitespace-nowrap text-[9px] font-medium leading-none tracking-tight',
              estados[i] === 'pendente' ? 'text-muted-foreground/60' : 'text-muted-foreground'
            )}
          >
            {MARCOS_ONBOARDING[i]}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Micro status pill do rodapé (concluídas / pendentes / em risco). */
function StatusPill({ icon: Icon, texto, cor }: { icon: typeof CheckCircle2; texto: string; cor: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 whitespace-nowrap text-[10.5px] font-medium leading-none', cor)}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {texto}
    </span>
  );
}
/** Menu de 3 pontos — ações extras do colaborador. */
function MenuAcoes({
  colaborador,
  acoes,
  temProxima,
}: {
  colaborador: ColaboradorOnboarding;
  acoes: OnboardingAcoes;
  temProxima: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={`Ações de ${colaborador.nome ?? 'colaborador'}`}
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem className="gap-2 text-xs" onSelect={() => acoes.onVerOnboarding(colaborador)}>
          <Eye className="h-3.5 w-3.5" /> Ver onboarding
        </DropdownMenuItem>
        {temProxima && acoes.onConcluirProxima && (
          <DropdownMenuItem
            className="gap-2 text-xs"
            onSelect={() => {
              const tarefa = proximaTarefa(colaborador.tarefas);
              if (tarefa) acoes.onConcluirProxima?.(tarefa);
            }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Concluir próxima tarefa
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 text-xs" onSelect={() => acoes.onCopiarMensagemBoasVindas(colaborador)}>
          <Mail className="h-3.5 w-3.5" /> Copiar mensagem de boas-vindas
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function OnboardingCard({ colaborador, acoes }: OnboardingCardProps) {
  const tarefas = colaborador.tarefas ?? [];
  const progresso = progressoOnboarding(tarefas);
  const hoje = inicioDoDia(new Date());
  const resumo = resumoOnboarding(tarefas, hoje);
  const estados = estadosDosMarcos(progresso.valor, MARCOS_ONBOARDING.length);

  const proxima = proximaTarefa(tarefas);
  const prazo = proxima ? formatarPrazo(prazoDaTarefa(proxima), hoje) : null;
  const responsavelTarefa = proxima?.responsavel_nome || colaborador.metadata?.responsavel || 'Não atribuído';

  const concluido = progresso.total > 0 && progresso.valor >= 100;
  const emRisco = resumo.atrasadas > 0;
  const corBarra = concluido ? 'bg-success' : emRisco ? 'bg-destructive-vivid' : 'bg-primary';
  const cargoDepartamento = [colaborador.cargo, colaborador.departamento].filter(Boolean).join(' • ');

  return (
    <Card
      className={cn(
        'group flex h-full flex-col rounded-2xl border border-border/50 bg-card p-3.5 shadow-sm shadow-black/20 transition-all',
        'hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md'
      )}
    >
      {/* 1. CABEÇALHO — avatar + nome + cargo • departamento + % (com micro barra) */}
      <div className="flex items-start gap-3">
        <AvatarIniciais nome={colaborador.nome} className={cn('h-9 w-9 text-[11px]', corAvatar(colaborador.nome))} />
        <div className="min-w-0 flex-1">
          <p
            title={colaborador.nome ?? undefined}
            className="truncate font-display text-sm font-semibold leading-tight text-foreground"
          >
            {colaborador.nome || 'Candidato sem nome'}
          </p>
          {cargoDepartamento && (
            <p title={cargoDepartamento} className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">
              {cargoDepartamento}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 pl-2">
          <span className="font-display text-sm font-semibold leading-none tabular-nums text-foreground">
            {progresso.valor}%
          </span>
          {/* Micro barra de progresso: detalhe do canto superior direito, abaixo
              da porcentagem. Largura fixa e curta (`w-16`) — não atravessa o
              card, não empurra nada e não compete com a régua de marcos. */}
          <span
            className="block h-1 w-16 overflow-hidden rounded-full bg-muted/60"
            role="progressbar"
            aria-valuenow={progresso.valor}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progresso do onboarding: ${progresso.valor}%`}
          >
            <span
              className={cn('block h-full rounded-full transition-[width] duration-500', corBarra)}
              style={{ width: `${progresso.valor}%` }}
            />
          </span>
        </div>
      </div>

      {/* 2. RÉGUA DE MARCOS */}
      <div className="mt-2.5">
        <MarcosOnboarding estados={estados} />
      </div>

      {/* 3. PRÓXIMA AÇÃO (ou estado concluído) */}
      <div className="mt-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          {concluido ? 'Status' : 'Próxima ação'}
        </p>

        {concluido ? (
          <div className="mt-1 min-w-0 space-y-1.5">
            <p className="inline-flex items-center gap-1.5 text-[12.5px] font-medium leading-snug text-success">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> Concluído
            </p>
            {/* Metadados em linha PRÓPRIA e com `flex-wrap`: nada é escondido
                (`hidden`) nem cortado (`truncate`/`max-w`) — se não couber ao
                lado, quebra para a linha de baixo. */}
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {ultimaConclusao(tarefas) && (
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3 w-3 shrink-0" />
                  {formatarPrazo(ultimaConclusao(tarefas), hoje)?.texto ?? '—'}
                </span>
              )}
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <AvatarIniciais
                  nome={responsavelTarefa}
                  className="h-4 w-4 shrink-0 bg-muted/70 text-[8px] text-muted-foreground"
                />
                <span className="min-w-0 break-words whitespace-normal">{responsavelTarefa}</span>
              </span>
            </div>
          </div>
        ) : (
          <div data-testid="onboarding-proxima-acao" className="mt-1 min-w-0 space-y-1.5">
            {/* AÇÃO PRINCIPAL — ocupa a LARGURA TOTAL do card e quebra linha
                naturalmente. Sem `truncate`, sem `line-clamp`, sem `nowrap`:
                o texto aparece SEMPRE por inteiro, e o card cresce se precisar. */}
            <p
              data-testid="onboarding-proxima-titulo"
              className="min-w-0 break-words whitespace-normal text-[12.5px] font-medium leading-snug text-foreground"
            >
              {proxima?.titulo || 'Definir a próxima tarefa'}
            </p>

            {/* LEGENDA (texto auxiliar) — `descricao` da tarefa, a MESMA fonte
                que o detalhe (`OnboardingDetalheDialog`) exibe. Aparece completa
                e quebra em quantas linhas forem necessárias. */}
            {proxima?.descricao && (
              <p
                data-testid="onboarding-proxima-descricao"
                className="min-w-0 break-words whitespace-normal text-[11px] leading-snug text-muted-foreground"
              >
                {proxima.descricao}
              </p>
            )}

            {/* METADADOS LATERAIS — prazo e responsável desceram para uma linha
                própria (antes disputavam largura com o título, em
                `justify-between`, e era isso que espremia o texto). Com
                `flex-wrap` eles quebram juntos, sem cortar nem escondem nada. */}
            <div
              data-testid="onboarding-proxima-meta"
              className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground"
            >
              {prazo && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10.5px] font-medium tabular-nums leading-tight',
                    TOM_PRAZO_VEU[prazo.tom],
                    TOM_PRAZO[prazo.tom]
                  )}
                >
                  <CalendarClock className="h-3 w-3 shrink-0" /> {prazo.texto}
                </span>
              )}
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <AvatarIniciais
                  nome={responsavelTarefa}
                  className="h-4 w-4 shrink-0 bg-muted/70 text-[8px] text-muted-foreground"
                />
                <span className="min-w-0 break-words whitespace-normal">{responsavelTarefa}</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 4. RODAPÉ — status pills + ações */}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/40 pt-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
          <StatusPill
            icon={CheckCircle2}
            texto={`${resumo.concluidas} concluída${resumo.concluidas === 1 ? '' : 's'}`}
            cor="text-success"
          />
          <StatusPill
            icon={Circle}
            texto={`${resumo.pendentes} pendente${resumo.pendentes === 1 ? '' : 's'}`}
            cor="text-muted-foreground"
          />
          {emRisco && (
            <StatusPill icon={AlertTriangle} texto={`${resumo.atrasadas} em risco`} cor="text-destructive-vivid" />
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 rounded-lg px-2.5 text-[11px]"
            onClick={() => acoes.onVerOnboarding(colaborador)}
          >
            <Zap className="h-3.5 w-3.5" /> Ver onboarding
          </Button>
          <MenuAcoes colaborador={colaborador} acoes={acoes} temProxima={!!proxima} />
        </div>
      </div>
    </Card>
  );
}

/** Data da última conclusão registrada — vive em `onboardingDerivacoes.ts`. */
