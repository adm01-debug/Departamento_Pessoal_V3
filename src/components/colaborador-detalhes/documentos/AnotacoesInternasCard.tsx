import { useState } from 'react';
import { motion } from 'framer-motion';
import { NotebookText, ChevronRight, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnimatedCascadeDialog } from '@/components/ui/animated-cascade-dialog';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { useAnotacoes, useCriarAnotacao } from '@/hooks';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { AnotacoesInternasDialog } from './AnotacoesInternasDialog';

const MotionCard = motion.create(Card);

const TIPOS = [
  { value: 'elogio', label: 'Elogio' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'geral', label: 'Geral' },
  { value: 'advertencia', label: 'Advertência' },
];

/** Painel "Anotações Internas" — prévia compacta das anotações mais recentes
 * (useAnotacoes, mesma query key de AnotacoesTab). "Nova anotação" cria um
 * registro (useCriarAnotacao, mesma mutation de AnotacoesTab) classificado
 * em uma das 4 categorias do popup de detalhe (elogio/feedback/geral/
 * advertência). "Ver todos" abre um popup (mesma coreografia do popup de
 * Pendências) com TODAS as anotações e conteúdo completo — sem dado
 * fictício: se não houver anotações, mostra o mesmo estado vazio da aba. */
export function AnotacoesInternasCard({ colaboradorId }: { colaboradorId: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ titulo: '', tipo: 'geral', conteudo: '' });
  const { data, isLoading } = useAnotacoes(colaboradorId);
  const criarAnotacao = useCriarAnotacao();
  const todas = (data as any[] | undefined) ?? [];
  const recentes = todas.slice(0, 8);

  const handleSubmit = async () => {
    if (!form.titulo.trim()) { toast.error('Título é obrigatório'); return; }
    try {
      await criarAnotacao.mutateAsync({ ...form, colaborador_id: colaboradorId });
      toast.success('Anotação adicionada');
      setFormOpen(false);
      setForm({ titulo: '', tipo: 'geral', conteudo: '' });
    } catch { toast.error('Erro ao adicionar anotação'); }
  };

  return (
    <MotionCard custom={3} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl shadow-elevated shrink-0 h-[190px] flex flex-col">
      <CardContent className="p-4 flex-1 flex flex-col min-h-0">
        <div className="flex items-start justify-between gap-2 mb-1 shrink-0">
          <div className="flex items-center gap-2.5">
            <NotebookText className="h-5 w-5 text-success" />
            <div>
              <p className="text-sm font-display font-medium">Anotações Internas</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Observações do RH sobre o colaborador.</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button size="icon" variant="outline" className="h-7 w-7" aria-label="Nova anotação" onClick={() => setFormOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <button type="button" onClick={() => setDialogOpen(true)} className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline">
              Ver todos <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        <AnimatedCascadeDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          title="Nova Anotação"
          titleIcon={NotebookText}
          titleIconClassName="h-4 w-4 text-success"
          emptyMessage=""
          items={[
            <div key="titulo" className="space-y-1">
              <Label>Título *</Label>
              <Input placeholder="Ex: Feedback de desempenho" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
            </div>,
            <div key="tipo" className="space-y-1">
              <Label>Classificação</Label>
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>,
            <div key="conteudo" className="space-y-1">
              <Label>Anotação</Label>
              <Textarea rows={4} placeholder="Descreva a observação..." value={form.conteudo} onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))} />
            </div>,
            <div key="salvar" className="flex justify-end pt-1">
              <Button size="sm" className="rounded-lg px-4" onClick={handleSubmit} disabled={criarAnotacao.isPending}>
                {criarAnotacao.isPending && <Spinner className="mr-1.5 h-3.5 w-3.5" />}
                Salvar
              </Button>
            </div>,
          ]}
        />

        {isLoading ? <div className="flex justify-center py-4"><Spinner /></div> : !recentes.length ? (
          <p className="text-xs text-muted-foreground py-1 mt-2">Nenhuma anotação registrada.</p>
        ) : (
          <div className="mt-2 space-y-2.5 flex-1 min-h-0 overflow-y-auto pr-1 -mr-1">
            {recentes.map((a: any) => (
              <div key={a.id} className="flex items-start gap-2.5 rounded-xl border border-border/30 bg-background/70 p-2.5">
                <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-medium shrink-0">
                  {a.titulo?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="text-xs font-medium truncate">{a.titulo}</p>
                    <Badge variant="outline" size="sm" className="shrink-0">{a.tipo}</Badge>
                  </div>
                  {a.conteudo && <p className="text-[11px] text-muted-foreground line-clamp-2">{a.conteudo}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">{a.data}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <AnotacoesInternasDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        anotacoes={todas.map((a: any) => ({
          id: a.id,
          titulo: a.titulo,
          tipo: a.tipo,
          conteudo: a.conteudo,
          dataFormatada: new Date(a.data).toLocaleDateString('pt-BR'),
        }))}
      />
    </MotionCard>
  );
}
