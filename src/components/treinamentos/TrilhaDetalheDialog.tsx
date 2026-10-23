import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Clock, Users } from 'lucide-react';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TreinamentosCascadeDialog, TreinamentosCascadeItem } from './TreinamentosCascadeDialog';
import { catalogoCursoService } from '@/services';
import { TrilhaCursosSection } from './TrilhaCursosSection';
import {
  calcularMetricasTrilha,
  nivelTrilha,
  resumirInscritosTrilha,
  rotuloCursos,
  rotuloHoras,
  rotuloInscritos,
  tituloTrilha,
  type InscricaoTrilha,
  type TrilhaCursoVinculo,
  type TrilhaRegistro,
} from './trilhasDerivacoes';

/**
 * "Explorar trilha" — detalhe da trilha em modal.
 *
 * Não cria rota nem serviço novo: reaproveita a listagem real de
 * `trilhas_cursos` (mesma `queryKey` do card, então não há consulta extra) e o
 * `TrilhaCursosSection`, que mantém vincular/desvincular curso funcionando como
 * antes. Não há botão "Em breve".
 */
export function TrilhaDetalheDialog({
  trilha,
  cursos,
  inscricoes,
  onClose,
}: {
  trilha: TrilhaRegistro | null;
  cursos: { id: string; nome?: string | null; carga_horaria?: number | string | null }[];
  inscricoes: readonly InscricaoTrilha[];
  onClose: () => void;
}) {
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

  const vinculos = vinculados as TrilhaCursoVinculo[];
  const metricas = calcularMetricasTrilha(vinculos);
  const inscritos = resumirInscritosTrilha(vinculos, inscricoes);
  const titulo = exibida ? tituloTrilha(exibida) : '';

  if (!exibida) return null;

  return (
    <TreinamentosCascadeDialog
      open={!!trilha}
      onOpenChange={(aberto) => !aberto && onClose()}
      blocks={4}
      className="max-h-[85vh] max-w-2xl overflow-y-auto"
    >
      <>
        <TreinamentosCascadeItem>
          <DialogHeader>
            <DialogTitle className="pr-6 text-base leading-tight">{titulo}</DialogTitle>
            <DialogDescription>
              {nivelTrilha(exibida.nivel)}
              {exibida.descricao?.trim() ? ` · ${exibida.descricao.trim()}` : ''}
            </DialogDescription>
          </DialogHeader>
        </TreinamentosCascadeItem>

        <TreinamentosCascadeItem>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border/60 bg-muted/10 px-3.5 py-2.5 text-[11.5px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" aria-hidden />
              {rotuloCursos(metricas.cursos)}
            </span>
            <span className="flex items-center gap-1.5" title="Soma da carga horária dos cursos vinculados">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {rotuloHoras(metricas)}
            </span>
            <span
              className="flex items-center gap-1.5"
              title="Colaboradores únicos com inscrição em cursos desta trilha"
            >
              <Users className="h-3.5 w-3.5" aria-hidden />
              {inscritos.disponivel ? rotuloInscritos(inscritos.total) : 'Sem dados de inscrição'}
            </span>
          </div>
        </TreinamentosCascadeItem>

        <TreinamentosCascadeItem>
          <TrilhaCursosSection trilhaId={exibida.id} cursos={cursos} />
        </TreinamentosCascadeItem>

        <TreinamentosCascadeItem>
          <p className="text-[10.5px] leading-snug text-muted-foreground/80">
            A sequência segue a ordem real dos vínculos (trilhas_cursos.ordem). A plataforma ainda não registra a
            conclusão individual de cada etapa, por isso nenhuma etapa é marcada como concluída.
          </p>
        </TreinamentosCascadeItem>
      </>
    </TreinamentosCascadeDialog>
  );
}
