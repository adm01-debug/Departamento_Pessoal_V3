import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyList } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { CalendarDays, Plus } from 'lucide-react';
import { useEmpresa } from '@/contexts';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function FeriadosPage() {
  const { empresaAtual } = useEmpresa();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [data, setData] = useState('');
  const [tipo, setTipo] = useState('nacional');

  const { data: feriados, isLoading } = useQuery({
    queryKey: ['feriados', empresaAtual?.id],
    queryFn: async () => {
      let query = supabase.from('feriados').select('*').order('data');
      if (empresaAtual?.id) query = query.or(`empresa_id.eq.${empresaAtual.id},empresa_id.is.null`);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const criarFeriado = useMutation({
    mutationFn: async () => {
      const insertData: any = {
        descricao: nome, data, tipo,
        empresa_id: tipo === 'empresa' ? empresaAtual?.id : null,
      };
      const { error } = await supabase.from('feriados').insert(insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feriados'] });
      toast.success('Feriado cadastrado!');
      setOpen(false);
      setNome(''); setData(''); setTipo('nacional');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao salvar feriado.')),
  });

  const tipoColor: Record<string, string> = {
    nacional: 'bg-primary/10 text-primary',
    estadual: 'bg-info/10 text-info',
    municipal: 'bg-warning/10 text-warning',
    empresa: 'bg-success/10 text-success',
  };

  return (
    <>
    <PageTitle title="Feriados" description="Calendário de feriados" />
    <PageLayout title="Feriados" description="Calendário de feriados" icon={<CalendarDays className="h-5 w-5 text-primary-foreground" />} gradient="from-primary-glow to-primary"
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-gradient-to-r from-primary-glow to-primary hover:opacity-90 shadow-lg font-body"><Plus className="h-4 w-4 mr-2" />Novo Feriado</Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle className="font-display">Cadastrar Feriado</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label className="font-body">Nome</Label><Input value={nome} onChange={e => setNome(e.target.value)} className="rounded-xl" /></div>
              <div><Label className="font-body">Data</Label><Input type="date" value={data} onChange={e => setData(e.target.value)} className="rounded-xl" /></div>
              <div><Label className="font-body">Tipo</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nacional">Nacional</SelectItem>
                    <SelectItem value="estadual">Estadual</SelectItem>
                    <SelectItem value="municipal">Municipal</SelectItem>
                    <SelectItem value="empresa">Empresa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => criarFeriado.mutate()} disabled={!nome || !data} className="w-full rounded-xl font-body">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      {isLoading ? (
        <div className="flex justify-center p-8"><Spinner size="lg" /></div>
      ) : !feriados?.length ? (
        <EmptyList entityName="feriado" onCreate={() => setOpen(true)} />
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border/30 overflow-hidden shadow-elevated">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-display font-semibold">Data</TableHead>
                <TableHead className="font-display font-semibold">Nome</TableHead>
                <TableHead className="font-display font-semibold">Tipo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feriados.map((f: any) => (
                <TableRow key={f.id} className="hover:bg-accent/30 transition-colors">
                  <TableCell className="font-body">{new Date(f.data + 'T12:00:00').toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className="font-body font-medium">{f.descricao}</TableCell>
                  <TableCell><Badge variant="outline" className={tipoColor[f.tipo] || ''}>{f.tipo}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </motion.div>
      )}
    </PageLayout>
    </>
  );
}
