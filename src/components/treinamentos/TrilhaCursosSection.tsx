import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Route, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cascadeItemVariants } from '@/components/ui/cascade-motion';
import { TreinamentosCascadeDialog, TreinamentosCascadeItem } from './TreinamentosCascadeDialog';
import { TrilhaSequencia } from './TrilhaSequencia';
import { catalogoCursoService } from '@/services';
import { bloquearEscritaTreinamentos } from '@/mocks/treinamentosMock';
import { ordenarVinculos } from './trilhasDerivacoes';

/**
 * Jornada de aprendizagem de UMA trilha (vincular / desvincular).
 *
 * Regras de negócio preservadas do componente original: mesma
 * `queryKey` (`['trilhas_cursos', trilhaId]`), mesma ordem de inserção
 * (`vinculados.length + 1`), mesmas mutations do `catalogoCursoService` e o
 * mesmo guard `bloquearEscritaTreinamentos` no modo demonstração.
 *
 * A apresentação passou a ser a timeline vertical numerada aprovada: o
 * cabeçalho da jornada e cada etapa são blocos de cascata do diálogo, então a
 * entrada usa os MESMOS `cascadeItemVariants` do modal Pendências.
 */
export function TrilhaCursosSection({
  trilhaId,
  cursos,
  categoriaPorCurso,
  className,
}: {
  trilhaId: string;
  cursos: { id: string; nome?: string | null; carga_horaria?: number | string | null }[];
  /** Categoria real do curso no catálogo → ícone/família do Design System. */
  categoriaPorCurso?: ReadonlyMap<string, string | null>;
  className?: string;
}) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const addCursoRef = useRef<HTMLButtonElement>(null);
  const [selCurso, setSelCurso] = useState('');

  const { data: vinculados = [], isLoading } = useQuery({
    queryKey: ['trilhas_cursos', trilhaId],
    queryFn: () => catalogoCursoService.listarTrilhasCursos(trilhaId),
    enabled: !!trilhaId,
  });

  const vincular = useMutation({
    mutationFn: () =>
      catalogoCursoService.vincularCursoTrilha({
        trilha_id: trilhaId,
        curso_id: selCurso,
        ordem: vinculados.length + 1,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trilhas_cursos', trilhaId] });
      setAddOpen(false);
      setSelCurso('');
      toast.success('Curso vinculado!');
    },
    onError: () => toast.error('Erro ao vincular'),
  });

  const desvincular = useMutation({
    mutationFn: (id: string) => catalogoCursoService.desvincularCursoTrilha(id, trilhaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trilhas_cursos', trilhaId] });
      toast.success('Curso desvinculado');
    },
    onError: () => toast.error('Erro ao desvincular curso'),
  });

  const vinculadosOrdenados = ordenarVinculos(vinculados as any[]);
  const cursosDisponiveis = cursos.filter((c) => !vinculados.some((v: any) => v.curso_id === c.id));

  return (
    <div className={className}>
      <motion.div variants={cascadeItemVariants}>
        <Separator className="mb-3.5 bg-border/50" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="flex items-center gap-2 text-[13.5px] font-semibold text-foreground">
            <Route className="h-4 w-4 shrink-0 text-[hsl(var(--aqua))]" aria-hidden />
            Jornada de aprendizagem
            {!isLoading && (
              <span className="text-[11.5px] font-normal tabular-nums text-muted-foreground">
                ({vinculadosOrdenados.length})
              </span>
            )}
          </h4>

          <Button
            ref={addCursoRef}
            variant="outline"
            size="sm"
            className="ml-auto h-9 gap-1.5 rounded-[9px] border-[hsl(var(--aqua)/0.3)] bg-muted/30 px-3.5 text-[12px] font-medium text-foreground hover:border-[hsl(var(--aqua)/0.5)] hover:bg-muted/50 hover:text-foreground"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar curso
          </Button>

          <TreinamentosCascadeDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            blocks={2}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              addCursoRef.current?.focus();
            }}
          >
            <TreinamentosCascadeItem>
              <DialogHeader>
                <DialogTitle>Adicionar curso à trilha</DialogTitle>
              </DialogHeader>
            </TreinamentosCascadeItem>
            <TreinamentosCascadeItem>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label>Selecione o Curso</Label>
                  <Select value={selCurso} onValueChange={setSelCurso}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um curso do catálogo" />
                    </SelectTrigger>
                    <SelectContent>
                      {cursosDisponiveis.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                          {c.carga_horaria ? ` (${c.carga_horaria}h)` : ''}
                        </SelectItem>
                      ))}
                      {cursosDisponiveis.length === 0 && (
                        <SelectItem value="none" disabled>
                          Nenhum curso disponível
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    className="rounded-lg px-4"
                    onClick={() => {
                      if (bloquearEscritaTreinamentos('Vincular curso à trilha')) return;
                      vincular.mutate();
                    }}
                    disabled={!selCurso || vincular.isPending}
                  >
                    {vincular.isPending ? 'Vinculando...' : 'Vincular à Trilha'}
                  </Button>
                </div>
              </div>
            </TreinamentosCascadeItem>
          </TreinamentosCascadeDialog>
        </div>
      </motion.div>

      <TrilhaSequencia
        vinculos={vinculadosOrdenados}
        carregando={isLoading}
        categoriaPorCurso={categoriaPorCurso}
        onRemover={(id) => {
          if (bloquearEscritaTreinamentos('Desvincular curso da trilha')) return;
          desvincular.mutate(id);
        }}
      />

      {!isLoading && vinculadosOrdenados.length > 0 && (
        <motion.p
          variants={cascadeItemVariants}
          className="mt-2 flex items-center gap-1 text-[10.5px] text-muted-foreground/70"
        >
          <Trash2 className="h-3 w-3 shrink-0" aria-hidden />
          Use o ícone de lixeira na etapa para desvincular o curso.
        </motion.p>
      )}
    </div>
  );
}
