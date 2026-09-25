import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BookOpen, Calendar, CheckCircle2, ChevronRight, Clock, MoreHorizontal, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { AnimatedCascadeDialog } from '@/components/ui/animated-cascade-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { useTreinamentosColaborador, useEmpresas } from '@/hooks';
import { catalogoCursoService } from '@/services';
import { formatDate } from '@/utils/format';
import { toast } from 'sonner';
import { mockOr, getMockCursos } from '@/mocks/colaboradoresMock';

const MotionCard = motion.create(Card);

function TreinamentoLinha({ t }: { t: any }) {
  const nome = t.treinamento?.nome ?? 'Treinamento';
  const descricao = t.treinamento?.descricao;
  const cargaHoraria = t.treinamento?.carga_horaria;
  const data = t.treinamento?.data ?? t.created_at;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_28px_96px_100px_24px] items-center gap-2.5 rounded-xl border-2 border-border/80 p-3 mb-2 last:mb-0">
      <div className="min-w-0">
        <p className="text-[11px] font-medium leading-tight">{nome}</p>
        {descricao && <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{descricao}</p>}
      </div>
      <span className="text-[11px] text-muted-foreground">{cargaHoraria != null ? `${cargaHoraria}h` : ''}</span>
      <span className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
        <Calendar className="h-3 w-3 shrink-0" /> {t.presente ? formatDate(data) : 'Em andamento'}
      </span>
      <Badge variant={t.presente ? 'success' : 'warning'} size="sm" className="gap-1 justify-self-start">
        {t.presente ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
        {t.presente ? 'Concluído' : 'Pendente'}
      </Badge>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg justify-self-end" aria-label="Mais ações">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled>Nenhuma ação disponível</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function AdicionarTreinamentoDialog({
  open, onOpenChange, colaboradorId,
}: { open: boolean; onOpenChange: (v: boolean) => void; colaboradorId: string }) {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [form, setForm] = useState({ curso_id: '', data_inicio: '' });

  const { data: cursos = [] } = useQuery({
    queryKey: ['catalogo_cursos', empresaAtual?.id],
    queryFn: async () => mockOr(getMockCursos()) ?? catalogoCursoService.listarCursos(empresaAtual!.id),
    enabled: !!empresaAtual?.id && open,
  });

  const criarInsc = useMutation({
    mutationFn: () => catalogoCursoService.criarInscricao({
      colaborador_id: colaboradorId, curso_id: form.curso_id, data_inicio: form.data_inicio || null,
      empresa_id: empresaAtual?.id, status: 'inscrito',
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treinamentos-colaborador', colaboradorId] });
      toast.success('Inscrição realizada!');
      setForm({ curso_id: '', data_inicio: '' });
      onOpenChange(false);
    },
    onError: () => toast.error('Erro ao inscrever em treinamento'),
  });

  return (
    <AnimatedCascadeDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Adicionar Treinamento"
      titleIcon={Plus}
      emptyMessage=""
      className="max-w-md"
      items={[
        <div key="form" className="space-y-3">
          <div>
            <Label>Curso</Label>
            <Select value={form.curso_id} onValueChange={v => setForm(f => ({ ...f, curso_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione o curso" /></SelectTrigger>
              <SelectContent>{(cursos as any[]).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data de início</Label>
            <Input type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} />
          </div>
          <Button className="w-full" onClick={() => criarInsc.mutate()} disabled={!form.curso_id || criarInsc.isPending}>
            {criarInsc.isPending ? 'Salvando...' : 'Inscrever'}
          </Button>
        </div>,
      ]}
    />
  );
}

/** Card "Treinamentos" — mesmos dados de useTreinamentosColaborador (já usados
 * no antigo bloco de badges de DesenvolvimentoResumoTab), agora em rows
 * compactas seguindo a ordem nome/subtítulo → carga horária → calendário+data
 * → status → menu de ações (mesmo padrão visual de "..." já usado em
 * HoleritesPreviewCard). O menu fica desabilitado: não existe hoje nenhuma
 * ação de edição/exclusão para inscrição em treinamento nesta tela. */
export function TreinamentosCard({ colaboradorId }: { colaboradorId: string }) {
  const { data: treinamentos, isLoading } = useTreinamentosColaborador(colaboradorId);
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <MotionCard custom={1} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl shadow-elevated">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <BookOpen className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-display font-medium">Treinamentos</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Treinamentos realizados e em andamento</p>
            </div>
          </div>
          <Button size="sm" className="h-7 px-3 text-[11px] shrink-0" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-3 w-3" />Adicionar
          </Button>
        </div>

        {isLoading ? <div className="flex justify-center py-4"><Spinner /></div> : !treinamentos?.length ? (
          <p className="text-xs text-muted-foreground py-1">Nenhum treinamento registrado.</p>
        ) : (
          <div className="max-h-[200px] overflow-y-auto pr-1 -mr-1">
            {(treinamentos as any[]).map((t) => <TreinamentoLinha key={t.id} t={t} />)}
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate('/treinamentos')}
          className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline mt-3"
        >
          Ver mais treinamentos <ChevronRight className="h-3 w-3" />
        </button>
      </CardContent>

      <AdicionarTreinamentoDialog open={dialogOpen} onOpenChange={setDialogOpen} colaboradorId={colaboradorId} />
    </MotionCard>
  );
}
