import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feriasService, colaboradorService } from '@/services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, AlertTriangle, CheckCircle2, Clock, Plus, Trash2, Edit2, Loader2, User, Search } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useState, useMemo } from 'react';
import { useEmpresas } from '@/hooks/useEmpresas';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
interface GerenciamentoPeriodosProps {
  colaboradorId?: string;
}

export function GerenciamentoPeriodos({ colaboradorId: initialColaboradorId }: GerenciamentoPeriodosProps) {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [selectedColabId, setSelectedColabId] = useState(initialColaboradorId || '');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPeriodo, setEditingPeriodo] = useState<Record<string, any> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    data_inicio: '',
    data_fim: '',
    dias_direito: '30',
    status: 'aberto',
    numero_periodo: '1'
  });

  const { data: colaboradores } = useQuery({
    queryKey: ['colaboradores-ferias', empresaAtual?.id],
    queryFn: () => colaboradorService.list(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });

  const { data: periodos, isLoading } = useQuery({
    queryKey: ['periodos-aquisitivos', selectedColabId, empresaAtual?.id],
    queryFn: () => feriasService.listPeriodosAquisitivos(selectedColabId, empresaAtual!.id),
    enabled: !!selectedColabId && !!empresaAtual?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => feriasService.criarPeriodoAquisitivo(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['periodos-aquisitivos', selectedColabId] });
      toast.success('Período aquisitivo criado');
      setIsDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => feriasService.atualizarPeriodoAquisitivo(id, data, empresaAtual!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['periodos-aquisitivos', selectedColabId] });
      toast.success('Período aquisitivo atualizado');
      setIsDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => feriasService.excluirPeriodoAquisitivo(id, empresaAtual!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['periodos-aquisitivos', selectedColabId] });
      toast.success('Período aquisitivo excluído');
    },
  });

  const handleSave = () => {
    const data = {
      ...form,
      colaborador_id: selectedColabId,
      dias_direito: parseInt(form.dias_direito),
      numero_periodo: parseInt(form.numero_periodo),
    };

    if (editingPeriodo) {
      updateMutation.mutate({ id: editingPeriodo.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openCreate = () => {
    setEditingPeriodo(null);
    setForm({
      data_inicio: '',
      data_fim: '',
      dias_direito: '30',
      status: 'aberto',
      numero_periodo: ((periodos?.length || 0) + 1).toString()
    });
    setIsDialogOpen(true);
  };

  const openEdit = (p: any) => {
    setEditingPeriodo(p);
    setForm({
      data_inicio: p.data_inicio,
      data_fim: p.data_fim,
      dias_direito: p.dias_direito.toString(),
      status: p.status,
      numero_periodo: p.numero_periodo.toString()
    });
    setIsDialogOpen(true);
  };


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aberto':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Aberto</Badge>;
      case 'vencido':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Vencido</Badge>;
      case 'concluido':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600 gap-1"><CheckCircle2 className="h-3 w-3" />Concluído</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredColaboradores = useMemo(() => {
    if (!colaboradores) return [];
    return colaboradores.filter(c => 
      c.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cpf?.includes(searchTerm)
    );
  }, [colaboradores, searchTerm]);

  return (
    <div className="space-y-6">
      <Card className="border-border/40 shadow-xs rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row items-stretch border-b border-border/40">
            <div className="flex-1 p-4 border-b md:border-b-0 md:border-r border-border/40 bg-muted/10">
              <div className="space-y-3">
                <Label className="font-display text-xs text-muted-foreground uppercase tracking-wider">Colaborador</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar por nome ou CPF..." 
                      className="pl-9 rounded-xl bg-background border-border/40 focus:ring-primary/20"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={selectedColabId} onValueChange={setSelectedColabId}>
                    <SelectTrigger className="w-[200px] rounded-xl border-border/40">
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {filteredColaboradores.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={(c as any).foto_url} />
                              <AvatarFallback className="text-[8px]">{c.nome_completo[0]}</AvatarFallback>
                            </Avatar>
                            <span className="truncate">{c.nome_completo}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="p-4 flex items-end justify-center bg-muted/5">
              <Button 
                onClick={openCreate} 
                disabled={!selectedColabId}
                className="rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 gap-2 font-display py-6 px-8"
              >
                <Plus className="h-5 w-5" /> Novo Período
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40 shadow-xs rounded-2xl overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Períodos Aquisitivos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/40">
                <TableHead className="font-display">Período</TableHead>
                <TableHead className="font-display">Início</TableHead>
                <TableHead className="font-display">Fim</TableHead>
                <TableHead className="font-display">Direito</TableHead>
                <TableHead className="font-display">Status</TableHead>
                <TableHead className="font-display text-right w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : !selectedColabId ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground font-body">
                    Selecione um colaborador para ver seus períodos.
                  </TableCell>
                </TableRow>
              ) : !periodos?.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground font-body">
                    Nenhum período aquisitivo encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                periodos.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/20 border-border/40 transition-colors group">
                    <TableCell className="font-body font-medium">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">#{p.numero_periodo}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {differenceInDays(new Date(p.data_fim), new Date(p.data_inicio)) + 1} dias corridos
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-body text-sm">{format(new Date(p.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                    <TableCell className="font-body text-sm">{format(new Date(p.data_fim), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                    <TableCell className="font-body">
                      <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary font-bold">
                        {p.dias_direito} dias
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(p.status || '')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => openEdit(p)} className="h-8 w-8">
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Excluir"
                          onClick={() => deleteMutation.mutate(p.id)}
                          className="h-8 w-8 text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingPeriodo ? 'Editar Período' : 'Novo Período'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Número Período</Label>
              <Input 
                type="number" 
                value={form.numero_periodo} 
                onChange={e => setForm(p => ({ ...p, numero_periodo: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input 
                type="date" 
                value={form.data_inicio} 
                onChange={e => setForm(p => ({ ...p, data_inicio: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input 
                type="date" 
                value={form.data_fim} 
                onChange={e => setForm(p => ({ ...p, data_fim: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Dias de Direito</Label>
              <Input 
                type="number" 
                value={form.dias_direito} 
                onChange={e => setForm(p => ({ ...p, dias_direito: e.target.value }))}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button 
              onClick={handleSave} 
              disabled={createMutation.isPending || updateMutation.isPending}
              className="rounded-xl"
            >
              {createMutation.isPending || updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

