import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Variants } from 'framer-motion';
import { ArrowRight, BookOpen, Clock, MoreVertical, Search, Trash2, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TreinamentosCascadeAlertDialog } from './TreinamentosCascadeAlertDialog';
import { TreinamentosCascadeItem } from './TreinamentosCascadeDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MotionCard } from '@/components/ui/entrada-cards';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { catalogoCursoService } from '@/services';
import { cn } from '@/lib/utils';
import { TrilhaBanner, tomBannerTrilha } from './TrilhaBanner';
import { TrilhaSequencia } from './TrilhaSequencia';
import {
  calcularMetricasTrilha,
  nivelTrilha,
  resumirInscritosTrilha,
  rotuloCursos,
  rotuloHoras,
  rotuloInscritos,
  statusTrilha,
  tituloTrilha,
  type ColaboradorTrilha,
  type InscricaoTrilha,
  type TrilhaCursoVinculo,
  type TrilhaRegistro,
} from './trilhasDerivacoes';

/**
 * ENTRADA DO CARD — o MESMO `cardVariants` dos KPI Cards do Dashboard Executivo
 * (fade + subida de 20 px, 0.4 s, ease `[0.25, 0.46, 0.45, 0.94]` e stagger de
 * 0.08 s por índice). O objeto é IMPORTADO da referência (não é uma cópia), então
 * qualquer ajuste no Dashboard move esta aba junto.
 *
 * O latch `animar` (ver `TreinamentosPage`) mantém a cascata só na entrada da
 * aba: filtro, paginação, hover e re-render não reiniciam a animação.
 */
/** Depois da primeira apresentação, o mesmo card usa um variant sem transição. */
// eslint-disable-next-line react-refresh/only-export-components
export const trilhaCardVariantsEstaticas: Variants = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0, transition: { duration: 0 } },
};

const CORES_AVATAR = [
  'bg-info/15 text-info',
  'bg-success/15 text-success',
  'bg-warning/15 text-warning',
  'bg-[hsl(var(--chart-4)/0.15)] text-[hsl(var(--chart-4))]',
];

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

function corAvatar(id: string): string {
  let soma = 0;
  for (let i = 0; i < id.length; i += 1) soma = (soma + id.charCodeAt(i)) % 997;
  return CORES_AVATAR[soma % CORES_AVATAR.length];
}

function AvatarInscrito({ colaborador }: { colaborador: ColaboradorTrilha }) {
  return (
    <Avatar className="h-7 w-7 border-2 border-card ring-1 ring-border/40" title={colaborador.nome}>
      {colaborador.fotoUrl && <AvatarImage src={colaborador.fotoUrl} alt={colaborador.nome} />}
      <AvatarFallback className={cn('text-[10px] font-semibold', corAvatar(colaborador.id))}>
        {iniciais(colaborador.nome)}
      </AvatarFallback>
    </Avatar>
  );
}

/** Métrica da faixa de indicadores — ícone pequeno + valor, sem virar KPI Card. */
function Metrica({ icone: Icone, valor, titulo }: { icone: typeof BookOpen; valor: string; titulo?: string }) {
  return (
    <span
      className="flex min-w-0 flex-1 items-center justify-center gap-1 text-[10.5px] text-muted-foreground"
      title={titulo}
    >
      <Icone className="h-3 w-3 shrink-0 text-muted-foreground/80" aria-hidden />
      <span className="truncate font-medium text-foreground/85">{valor}</span>
    </span>
  );
}

/** Menu do banner: só ações realmente suportadas (explorar + excluir). */
function MenuTrilha({ nome, onExplorar, onExcluir }: { nome: string; onExplorar: () => void; onExcluir: () => void }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  return (
    <>
      <DropdownMenu open={menuAberto} onOpenChange={setMenuAberto}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Ações de ${nome}`}
            className="h-7 w-7 shrink-0 rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem className="gap-2" onSelect={() => onExplorar()}>
            <Search className="h-4 w-4" />
            Explorar trilha
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2 text-destructive focus:text-destructive"
            onSelect={() => {
              // Fecha o menu antes da confirmação (mesmo padrão de TreinamentoAcoes).
              setMenuAberto(false);
              setConfirmar(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Excluir trilha
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TreinamentosCascadeAlertDialog open={confirmar} onOpenChange={setConfirmar} blocks={2}>
        <TreinamentosCascadeItem>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir trilha?</AlertDialogTitle>
            <AlertDialogDescription>
              A trilha “{nome}” será removida permanentemente, junto com os vínculos de cursos. Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </TreinamentosCascadeItem>
        <TreinamentosCascadeItem>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className={cn(buttonVariants({ variant: 'destructive' }))} onClick={() => onExcluir()}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </TreinamentosCascadeItem>
      </TreinamentosCascadeAlertDialog>
    </>
  );
}

export interface TrilhaCardProps {
  trilha: TrilhaRegistro;
  index: number;
  /** `false` depois da primeira apresentação — a cascata não reinicia. */
  animar: boolean;
  inscricoes: readonly InscricaoTrilha[];
  onExplorar: () => void;
  onExcluir: () => void;
}

/**
 * Card compacto da trilha: banner ilustrado → faixa de indicadores → sequência
 * de aprendizagem → participantes + ação. Altura uniforme por linha vem do
 * `h-full` + grid `items-stretch`; o rodapé fica ancorado com `mt-auto`.
 */
export function TrilhaCard({ trilha, index, animar, inscricoes, onExplorar, onExcluir }: TrilhaCardProps) {
  const titulo = tituloTrilha(trilha);
  const tom = tomBannerTrilha(trilha.nivel);

  const { data: vinculados = [], isLoading } = useQuery({
    queryKey: ['trilhas_cursos', trilha.id],
    queryFn: () => catalogoCursoService.listarTrilhasCursos(trilha.id),
    enabled: !!trilha.id,
  });

  const vinculos = vinculados as TrilhaCursoVinculo[];
  const metricas = calcularMetricasTrilha(vinculos);
  const inscritos = resumirInscritosTrilha(vinculos, inscricoes);
  const visiveis = inscritos.colaboradores.slice(0, 3);
  const excedente = Math.max(0, inscritos.total - visiveis.length);
  const status = statusTrilha(trilha);

  return (
    <MotionCard
      custom={index}
      variants={animar ? cardVariants : trilhaCardVariantsEstaticas}
      initial="hidden"
      animate="visible"
      className={cn(
        'group/card flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-0 shadow-sm',
        'transition-colors duration-300 hover:border-primary/35'
      )}
    >
      <TrilhaBanner
        tom={tom}
        nivel={nivelTrilha(trilha.nivel)}
        titulo={titulo}
        descricao={trilha.descricao}
        imagemUrl={trilha.imagem_url}
        acoes={<MenuTrilha nome={titulo} onExplorar={onExplorar} onExcluir={onExcluir} />}
      />

      <div className="flex items-center gap-0.5 border-b border-border/50 px-2 py-2.5">
        <Metrica icone={BookOpen} valor={rotuloCursos(metricas.cursos)} titulo="Cursos vinculados à trilha" />
        <Metrica
          icone={Clock}
          valor={rotuloHoras(metricas)}
          titulo={
            metricas.horasDisponiveis
              ? metricas.horasCompletas
                ? 'Soma da carga horária dos cursos vinculados'
                : 'Soma das cargas horárias informadas (há curso sem duração)'
              : 'Nenhum curso vinculado tem carga horária informada'
          }
        />
        <Metrica
          icone={Users}
          valor={inscritos.disponivel ? `${inscritos.total} ${inscritos.total === 1 ? 'inscrito' : 'inscritos'}` : '—'}
          titulo={
            inscritos.disponivel
              ? 'Colaboradores únicos com inscrição em cursos desta trilha'
              : 'Vincule cursos à trilha para calcular os inscritos'
          }
        />
      </div>

      <div className="flex flex-1 flex-col px-3.5 pb-3 pt-3">
        <p className="mb-2.5 text-[11px] font-medium text-muted-foreground">Sequência de aprendizagem</p>
        <TrilhaSequencia vinculos={vinculos} carregando={isLoading} />
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/50 px-3.5 py-3">
        <div className="min-w-0">
          {inscritos.disponivel && inscritos.total > 0 ? (
            <div className="flex items-center">
              <div className="flex -space-x-2">
                {visiveis.map((colaborador) => (
                  <AvatarInscrito key={colaborador.id} colaborador={colaborador} />
                ))}
              </div>
              {excedente > 0 && (
                <span className="ml-1.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-border/60 bg-muted/50 px-1 text-[10px] font-semibold tabular-nums text-muted-foreground">
                  +{excedente}
                </span>
              )}
            </div>
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-border/70 text-muted-foreground/70">
              <Users className="h-3.5 w-3.5" aria-hidden />
            </span>
          )}

          <p className="mt-1.5 truncate text-[10.5px] leading-none text-muted-foreground">
            {inscritos.disponivel
              ? rotuloInscritos(inscritos.total)
              : status === 'inativa'
                ? 'Trilha inativa'
                : 'Sem dados de inscrição'}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onExplorar}
          className="h-8 shrink-0 gap-1.5 rounded-lg border-border/70 px-3 text-[11.5px] font-medium hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
        >
          Explorar trilha
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </div>
    </MotionCard>
  );
}
