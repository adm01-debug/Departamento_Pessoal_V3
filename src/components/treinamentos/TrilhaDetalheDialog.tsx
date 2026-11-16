import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Clock, Info, Route, Users } from 'lucide-react';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TreinamentosCascadeDialog, TreinamentosCascadeItem } from './TreinamentosCascadeDialog';
import { TrilhaCursosSection } from './TrilhaCursosSection';
import { catalogoCursoService } from '@/services';
import {
  calcularMetricasTrilha,
  nivelTrilha,
  resumirInscritosTrilha,
  rotuloCursos,
  rotuloHoras,
  tituloTrilha,
  type InscricaoTrilha,
  type TrilhaCursoVinculo,
  type TrilhaRegistro,
} from './trilhasDerivacoes';

/**
 * "Explorar trilha" — janela de detalhes da trilha.
 *
 * DADOS REAIS (nada é inventado):
 * - título/nível/descrição vêm de `trilhas_aprendizado`;
 * - cursos/horas vêm de `trilhas_cursos` + embed `catalogo_cursos`;
 * - a ordem é a de `trilhas_cursos.ordem` (ver `ordenarVinculos`);
 * - inscritos são colaboradores ÚNICOS com inscrição nos cursos da trilha;
 * - a categoria de cada curso vem do catálogo já carregado pela página, usada
 *   só para escolher o ícone/família cromática do Design System.
 *
 * A janela NÃO cria conclusão/progresso por etapa: o schema não registra isso.
 *
 * ANIMAÇÃO: `TreinamentosCascadeDialog` → `cascade-motion.ts`, a MESMA
 * coreografia do modal Pendências. Cada bloco semântico (cabeçalho,
 * indicadores, jornada + etapas, nota) é um item da cascata; as etapas são
 * `motion.li` com os mesmos variants dentro de `TrilhaSequencia`.
 */
export interface TrilhaDetalheDialogProps {
  trilha: TrilhaRegistro | null;
  cursos: {
    id: string;
    nome?: string | null;
    carga_horaria?: number | string | null;
    categoria?: string | null;
    modalidade?: string | null;
  }[];
  inscricoes: readonly InscricaoTrilha[];
  onClose: () => void;
}

export function TrilhaDetalheDialog({ trilha, cursos, inscricoes, onClose }: TrilhaDetalheDialogProps) {
  const [ultimaTrilha, setUltimaTrilha] = useState<TrilhaRegistro | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- guarda a última trilha para o shell concluir a saída
    if (trilha) setUltimaTrilha(trilha);
  }, [trilha]);
  const exibida = trilha ?? ultimaTrilha;

  const { data: vinculados = [] } = useQuery({
    queryKey: ['trilhas_cursos', exibida?.id ?? 'sem-trilha'],
    queryFn: () => catalogoCursoService.listarTrilhasCursos(exibida!.id),
    enabled: !!trilha?.id,
  });

  const categoriaPorCurso = useMemo(
    () => new Map(cursos.map((curso) => [curso.id, curso.categoria ?? null])),
    [cursos]
  );

  const vinculos = vinculados as TrilhaCursoVinculo[];
  const metricas = calcularMetricasTrilha(vinculos);
  const inscritos = resumirInscritosTrilha(vinculos, inscricoes);
  const titulo = exibida ? tituloTrilha(exibida) : '';

  if (!exibida) return null;

  const nivel = nivelTrilha(exibida.nivel);
  const descricao = exibida.descricao?.trim() || null;
  const subtitulo = [nivel !== '—' ? nivel : null, descricao].filter(Boolean).join(' · ') || 'Detalhes da trilha';
  const rotuloInscritosTrilha = inscritos.disponivel
    ? `${inscritos.total} ${inscritos.total === 1 ? 'inscrito' : 'inscritos'}`
    : 'Inscritos —';

  // Cabeçalho + indicadores + jornada + etapas (+ dica) + nota. O número é o
  // mesmo de blocos que recebem `cascadeItemVariants` — daí sai o atraso com que
  // a caixa começa a encolher no fechamento (ver `cascadeShellVariants`).
  const blocosCascata = 5 + vinculos.length;

  return (
    <TreinamentosCascadeDialog
      open={!!trilha}
      onOpenChange={(aberto) => !aberto && onClose()}
      blocks={blocosCascata}
      className="max-h-[90dvh] w-[calc(100vw_-_2rem)] max-w-[720px] overflow-y-auto p-5 sm:rounded-xl sm:p-6"
    >
      <TreinamentosCascadeItem>
        <DialogHeader className="pr-8 text-left">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--aqua)/0.25)] bg-[hsl(var(--aqua)/0.12)] text-[hsl(var(--aqua))]"
            >
              <Route className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="line-clamp-2 text-left text-[18px] font-semibold leading-snug sm:text-[19px]">
                {titulo}
              </DialogTitle>
              <DialogDescription className="mt-1 line-clamp-2 text-left text-[12.5px] leading-relaxed">
                {subtitulo}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
      </TreinamentosCascadeItem>

      <TreinamentosCascadeItem>
        <div className="flex flex-wrap items-center gap-2">
          <span
            title="Cursos vinculados a esta trilha"
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[hsl(var(--aqua)/0.25)] bg-[hsl(var(--aqua)/0.08)] px-3 text-[12px] font-medium text-[hsl(var(--aqua))]"
          >
            <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {rotuloCursos(metricas.cursos)}
          </span>
          <span
            title="Soma da carga horária dos cursos vinculados"
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-3 text-[12px] font-medium text-foreground/85"
          >
            <Clock className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            {rotuloHoras(metricas)}
          </span>
          <span
            title="Colaboradores únicos com inscrição em cursos desta trilha"
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-success/25 bg-success/[0.08] px-3 text-[12px] font-medium text-success"
          >
            <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {rotuloInscritosTrilha}
          </span>
        </div>
      </TreinamentosCascadeItem>

      <TrilhaCursosSection trilhaId={exibida.id} cursos={cursos} categoriaPorCurso={categoriaPorCurso} />

      <TreinamentosCascadeItem>
        <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" aria-hidden />
            <div className="min-w-0">
              <p className="text-[11.5px] font-medium text-foreground">Sobre a sequência</p>
              <p
                className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground"
                title="A sequência segue a ordem real dos vínculos (trilhas_cursos.ordem). A plataforma ainda não registra a conclusão individual de cada etapa, por isso nenhuma etapa é marcada como concluída."
              >
                A sequência segue a ordem cadastrada. A conclusão individual das etapas ainda não é registrada pela
                plataforma.
              </p>
            </div>
          </div>
        </div>
      </TreinamentosCascadeItem>
    </TreinamentosCascadeDialog>
  );
}
