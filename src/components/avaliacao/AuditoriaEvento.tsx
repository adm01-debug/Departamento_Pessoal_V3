import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, CalendarDays, GraduationCap, History, LayoutGrid, Target, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EstrelasNota } from './EstrelasNota';
import type { EventoDerivado } from './auditoriaComum';
import { cn } from '@/lib/utils';

/**
 * ============================================================================
 * AUDITORIA — LINHA DE EVENTO (grade fixa da referência).
 *
 * Cada evento é UMA linha de grid com nove colunas na MESMA ordem, sempre:
 *   1 · trilho da timeline (linha vertical + ponto)
 *   2 · horário
 *   3 · ícone circular do módulo
 *   4 · bloco principal (título · subtítulo · informação complementar)
 *   5 · nota / estrelas (coluna reservada, mesmo sem nota)
 *   6 · tag do módulo
 *   7 · tag da ação
 *   8 · responsável (avatar + nome + subtítulo)
 *   9 · "Ver detalhes" — última coluna. O antigo menu de 3 pontos foi REMOVIDO
 *       por ser redundante: "Abrir detalhes" era o próprio botão e "Copiar ID"
 *       foi levado para a janela de detalhes (ver AuditoriaDetalheDialog).
 *
 * O que muda de uma linha para outra é só o CONTEÚDO da célula: a trilha, a
 * largura de cada coluna e o alinhamento vertical (centro) são idênticos em
 * TODOS os eventos — por isso os horários, tags, notas, responsáveis e botões
 * ficam empilhados na mesma coluna, sem "flutuar" conforme o texto da linha.
 *
 * O JSON bruto NÃO aparece aqui: a linha mostra texto legível derivado do payload
 * real e o conteúdo técnico fica em "Ver detalhes" (ver AuditoriaDetalheDialog).
 * ============================================================================
 */
const ICONES: Record<string, typeof Users> = {
  ciclos_avaliacao: CalendarDays,
  metas_okrs: Target,
  feedbacks_360: Users,
  pdis: GraduationCap,
  competencias_matriz: LayoutGrid,
};

export interface ResponsavelResolvido {
  nome: string;
  secundario: string | null;
  foto: string | null;
}

/** Iniciais a partir do e-mail real — nunca um nome inventado. */
function iniciaisDe(email: string): string {
  const local = email.split('@')[0] ?? email;
  const partes = local.split(/[._-]+/).filter(Boolean);
  const duas = partes.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '');
  return duas.join('') || local.slice(0, 2).toUpperCase();
}

/**
 * GRADE FIXA DA LINHA — as MESMAS colunas em todo evento (ver o doc do topo).
 *
 * Mobile: trilho · ícone · bloco principal · "Ver detalhes".
 * Tablet: entra o horário. Desktop (`xl+`): as nove colunas.
 *
 * DISTRIBUIÇÃO: o BLOCO PRINCIPAL é de longe a coluna mais larga (`2.9fr`) —
 * precisa caber título, descrição e complemento SEM corte. As colunas de apoio
 * ficam enxutas e proporcionais: nota (1) · tag do módulo (0.7) · ação (0.55) ·
 * responsável (1.45) · CTA (1). Sem a coluna do menu removido, a folga volta
 * para o conteúdo e para o botão. Como o template é idêntico linha a linha e
 * usa `minmax(0,*fr)`, cada coluna cresce/encolhe junto com o card sem estourar
 * a largura nem deslocar o alinhamento.
 */
const GRADE_LINHA =
  'group grid items-center gap-x-2.5 gap-y-1 px-3 py-2.5 transition-colors hover:bg-muted/20 ' +
  'grid-cols-[20px_32px_minmax(0,1fr)_minmax(0,120px)] ' +
  'md:grid-cols-[20px_40px_32px_minmax(0,1fr)_minmax(0,120px)] ' +
  'xl:grid-cols-[20px_40px_32px_minmax(0,2.9fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,0.55fr)_minmax(0,1.45fr)_minmax(0,1fr)] ' +
  'xl:gap-x-3';

/**
 * COLUNA SECUNDÁRIA — só existe a partir de `xl`, onde a grade completa cabe.
 * `hidden` no mobile/tablet e `flex` no desktop garante que ela seja (ou não)
 * um item do grid, mantendo os demais nas posições certas em cada template.
 */
const COLUNA_XL = 'hidden xl:flex';

interface AuditoriaEventoProps {
  derivado: EventoDerivado;
  /** Resolução do responsável a partir da lista real de colaboradores da página. */
  responsavel?: ResponsavelResolvido;
  onDetalhes: () => void;
}

export function AuditoriaEvento({ derivado, responsavel, onDetalhes }: AuditoriaEventoProps) {
  const { evento, modulo, titulo, subtitulo, complemento, nota, responsavel: identificacao, ehSistema } = derivado;
  const Icone = ICONES[evento.tabela] ?? History;
  // Sem correspondência em `colaboradores`, o nome exibido é a PARTE LOCAL do
  // e-mail real (nunca um nome inventado) e a linha secundária segue com o
  // e-mail completo, para a identificação não se perder.
  const parteLocal = identificacao.includes('@') ? identificacao.split('@')[0] : identificacao;
  const nomeExibido = ehSistema ? 'Sistema' : (responsavel?.nome ?? parteLocal);
  const secundario = ehSistema ? 'Automação' : (responsavel?.secundario ?? identificacao);

  return (
    <div className={GRADE_LINHA}>
      {/* 1 · TRILHO — linha vertical contínua + ponto centrado no item */}
      <div className="relative flex self-stretch items-center justify-center">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/40"
        />
        <span aria-hidden className={cn('relative z-10 h-2.5 w-2.5 rounded-full ring-4 ring-card', modulo.marcador)} />
      </div>

      {/* 2 · HORÁRIO */}
      <span className="hidden text-[11px] tabular-nums text-muted-foreground md:block">
        {format(evento.criadoEm, 'HH:mm', { locale: ptBR })}
      </span>

      {/* 3 · ÍCONE DO MÓDULO */}
      <span
        className={cn('flex h-8 w-8 items-center justify-center justify-self-center rounded-full border', modulo.tinta)}
      >
        <Icone className="h-3.5 w-3.5" />
      </span>

      {/* 4 · BLOCO PRINCIPAL — título · subtítulo · informação complementar */}
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold leading-tight">{titulo}</p>
        {subtitulo && <p className="truncate text-[11px] leading-snug text-muted-foreground">{subtitulo}</p>}
        {complemento && <p className="truncate text-[11px] leading-snug text-muted-foreground/80">{complemento}</p>}
      </div>

      {/* 5 · NOTA / ESTRELAS — coluna reservada em toda linha (vazia sem nota) */}
      <div className={cn(COLUNA_XL, 'min-w-0 items-center gap-1.5')}>
        {nota !== null && (
          <>
            <EstrelasNota nota={nota} tinta="text-warning" />
            <span className="text-[11px] tabular-nums text-muted-foreground">{nota.toFixed(1)}</span>
          </>
        )}
      </div>

      {/* 6 · TAG DO MÓDULO */}
      <div className={cn(COLUNA_XL, 'min-w-0')}>
        <Badge
          variant="outline"
          className={cn('h-5 max-w-full rounded-md px-1.5 text-[10px] font-medium', modulo.tinta)}
        >
          <span className="truncate">{modulo.rotulo}</span>
        </Badge>
      </div>

      {/* 7 · TAG DA AÇÃO */}
      <span className="hidden min-w-0 truncate text-[11px] text-muted-foreground xl:block">{derivado.rotuloAcao}</span>

      {/* 8 · RESPONSÁVEL — avatar + nome + subtítulo */}
      <div className={cn(COLUNA_XL, 'min-w-0 items-center gap-2')}>
        <Avatar className="h-7 w-7 shrink-0">
          {responsavel?.foto ? <AvatarImage src={responsavel.foto} alt={nomeExibido} /> : null}
          <AvatarFallback className="bg-muted text-[10px] font-medium">
            {ehSistema ? 'SYS' : iniciaisDe(identificacao)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-[12px] font-medium leading-tight">{nomeExibido}</p>
          <p className="truncate text-[10px] leading-tight text-muted-foreground">{secundario}</p>
        </div>
      </div>

      {/* 9 · VER DETALHES — ÚLTIMA coluna da linha: superfície + borda próprias,
          largura cheia da coluna (igual em todo evento) e hover com o lime. */}
      <div className="flex min-w-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDetalhes}
          className="group/cta h-8 w-full gap-1.5 rounded-lg border-border/70 bg-muted/60 px-3 text-[11px] font-medium text-foreground shadow-xs transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
        >
          Ver detalhes
          <ArrowRight className="h-3 w-3 shrink-0 transition-transform group-hover/cta:translate-x-0.5" />
        </Button>
      </div>
    </div>
  );
}
