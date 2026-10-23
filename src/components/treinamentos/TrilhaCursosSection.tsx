import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TreinamentosCascadeDialog, TreinamentosCascadeItem } from './TreinamentosCascadeDialog';
import { catalogoCursoService } from '@/services';
import { bloquearEscritaTreinamentos } from '@/mocks/treinamentosMock';
import { TrilhaSequencia } from './TrilhaSequencia';
import { ordenarVinculos } from './trilhasDerivacoes';

/**
 * Gerenciamento dos cursos de UMA trilha (vincular / desvincular).
 *
 * Regras de negócio preservadas do componente original da página: mesma
 * `queryKey` (`['trilhas_cursos', trilhaId]`), mesma ordem de inserção
 * (`vinculados.length + 1`), mesmas mutations do `catalogoCursoService` e o
 * mesmo guard `bloquearEscritaTreinamentos` no modo demonstração.
 *
 * Só a APRESENTAÇÃO mudou: os blocos `bg-white/50` (fundo claro fixo, ilegível
 * no tema escuro) deram lugar à timeline numerada com tokens do tema.
 */
export function TrilhaCursosSection({
  trilhaId,
  cursos,
  className,
}: {
  trilhaId: string;
  cursos: { id: string; nome?: string | null; carga_horaria?: number | string | null }[];
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
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground">
          <Link className="h-3.5 w-3.5 text-primary" aria-hidden />
          Cursos da trilha
          <span className="font-normal tabular-nums text-muted-foreground">({vinculadosOrdenados.length})</span>
        </h4>

        <Button
          ref={addCursoRef}
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 rounded-lg px-2.5 text-[11.5px]"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar Curso
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
              <DialogTitle>Adicionar Curso à Trilha</DialogTitle>
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

      <div className="group">
        <TrilhaSequencia
          vinculos={vinculadosOrdenados}
          carregando={isLoading}
          onRemover={(id) => {
            if (bloquearEscritaTreinamentos('Desvincular curso da trilha')) return;
            desvincular.mutate(id);
          }}
        />
      </div>

      {vinculadosOrdenados.length > 0 && (
        <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground/70">
          <Trash2 className="h-3 w-3" aria-hidden />
          Passe o mouse sobre uma etapa para desvincular o curso.
        </p>
      )}
    </div>
  );
}
