import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { catalogoCursoService } from '@/services';
import { toast } from 'sonner';
import { Plus, Trash2, Link } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/database.types';
import { motion } from 'framer-motion';

export function TrilhaCursosSection({ trilhaId, cursos }: { trilhaId: string; cursos: Tables<'catalogo_cursos'>[] }) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [selCurso, setSelCurso] = useState('');

  const { data: vinculados = [] } = useQuery({
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
  });

  const cursosDisponiveis = cursos.filter((c) => !vinculados.some((v) => v.curso_id === c.id));

  return (
    <div className="mt-4 pt-4 border-t border-border/40">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold flex items-center gap-2">
          <Link className="h-3.5 w-3.5 text-primary" />
          Cursos na Trilha ({vinculados.length})
        </h4>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 rounded-lg">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Adicionar Curso
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Curso à Trilha</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Selecione o Curso</Label>
                <Select value={selCurso} onValueChange={setSelCurso}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Escolha um curso do catálogo" />
                  </SelectTrigger>
                  <SelectContent>
                    {cursosDisponiveis.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome} ({c.carga_horaria}h)
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
              <Button
                onClick={() => vincular.mutate()}
                disabled={!selCurso || vincular.isPending}
                className="rounded-xl w-full"
              >
                {vincular.isPending ? 'Vinculando...' : 'Vincular à Trilha'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {vinculados.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed rounded-2xl bg-muted/20">
          <p className="text-xs text-muted-foreground font-medium">Nenhum curso vinculado a esta trilha ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {vinculados.map((v, i: number) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between p-3 bg-white/50 border border-border/40 rounded-xl hover:shadow-xs transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold truncate max-w-[150px]">{v.curso?.nome || 'Curso'}</p>
                  <p className="text-[10px] text-muted-foreground">{v.curso?.carga_horaria || 0} horas de conteúdo</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Excluir"
                className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                onClick={() => desvincular.mutate(v.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
