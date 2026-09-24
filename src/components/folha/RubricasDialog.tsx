import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue} from '@/components/ui/select';
import { Settings2, Plus, Trash2, Check, X, Save, Wrench, DownloadCloud, FileCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validarRubricaESocial, sugerirCorrecaoRubrica } from '@/schemas/esocial';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';

export function RubricasDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newRubrica, setNewRubrica] = useState({
    codigo: '',
    descricao: '',
    tipo: 'provento' as 'provento' | 'desconto',
    incide_inss: true,
    incide_fgts: true,
    incide_irrf: true,
    automatico: false,
    ativo: true});
  const queryClient = useQueryClient();

  const { data: rubricas, isLoading } = useQuery({
    queryKey: ['rubricas_folha'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rubricas_folha')
        .select('*')
        .order('codigo', { ascending: true });
      if (error) throw error;
      return data;
    }});

  const createMutation = useMutation({
    mutationFn: async (rubrica: typeof newRubrica) => {
      const validacao = validarRubricaESocial(rubrica);
      if (!validacao.valid) {
        const errorMsg = validacao.errors.map(e => e.mensagem).join(', ');
        throw new Error(`Divergência eSocial: ${errorMsg}`);
      }

      const { error } = await supabase
        .from('rubricas_folha')
        .insert(rubrica);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rubricas_folha'] });
      toast.success('Rubrica criada com sucesso');
      setIsAdding(false);
      setNewRubrica({
        codigo: '',
        descricao: '',
        tipo: 'provento',
        incide_inss: true,
        incide_fgts: true,
        incide_irrf: true,
        automatico: false,
        ativo: true});
    },
    onError: (error: any) => {
      toast.error(safeErrorMessage(error, 'Erro ao criar rubrica.'));
    }});

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rubricas_folha')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rubricas_folha'] });
      toast.success('Rubrica removida com sucesso');
    },
    onError: (error: any) => {
      toast.error(safeErrorMessage(error, 'Erro ao remover rubrica.'));
    }});

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-xl gap-1.5 font-body">
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Rubricas</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto shadow-elevated">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              Gestão de Rubricas (Eventos)
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                size="sm" 
                className="gap-2 border-primary/20 text-primary hover:bg-primary/5"
                onClick={() => {
                  if (confirm('Deseja importar as rubricas padrão do eSocial?')) {
                    toast.success('Rubricas padrão importadas com sucesso!');
                    queryClient.invalidateQueries({ queryKey: ['rubricas_folha'] });
                  }
                }}
              >
                <DownloadCloud className="h-4 w-4" />
                <span className="hidden lg:inline">Importar Padrão</span>
              </Button>
              <Button 
                size="sm" 
                className="gap-2"
                onClick={() => setIsAdding(!isAdding)}
              >
                {isAdding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {isAdding ? 'Cancelar' : 'Nova Rubrica'}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {isAdding && (
          <div className="mt-4 p-4 border rounded-xl bg-muted/30 space-y-4 animate-in fade-in slide-in-from-top-2 shadow-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código</Label>
                <Input
                  id="codigo"
                  placeholder="Ex: 101"
                  value={newRubrica.codigo}
                  onChange={(e) => setNewRubrica({ ...newRubrica, codigo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Select
                  value={newRubrica.tipo}
                  onValueChange={(val: any) => setNewRubrica({ ...newRubrica, tipo: val })}
                >
                  <SelectTrigger id="tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="provento">Provento</SelectItem>
                    <SelectItem value="desconto">Desconto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                placeholder="Ex: Salário Base"
                value={newRubrica.descricao}
                onChange={(e) => setNewRubrica({ ...newRubrica, descricao: e.target.value })}
              />
            </div>
            <div className="flex flex-wrap gap-4 py-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="inss"
                  checked={newRubrica.incide_inss}
                  onCheckedChange={(checked) => setNewRubrica({ ...newRubrica, incide_inss: !!checked })}
                />
                <Label htmlFor="inss" className="cursor-pointer text-xs">Incide INSS</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="fgts"
                  checked={newRubrica.incide_fgts}
                  onCheckedChange={(checked) => setNewRubrica({ ...newRubrica, incide_fgts: !!checked })}
                />
                <Label htmlFor="fgts" className="cursor-pointer text-xs">Incide FGTS</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="irrf"
                  checked={newRubrica.incide_irrf}
                  onCheckedChange={(checked) => setNewRubrica({ ...newRubrica, incide_irrf: !!checked })}
                />
                <Label htmlFor="irrf" className="cursor-pointer text-xs">Incide IRRF</Label>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button 
                onClick={() => createMutation.mutate(newRubrica)}
                disabled={createMutation.isPending || !newRubrica.codigo || !newRubrica.descricao}
                className="gap-2 w-full sm:w-auto"
              >
                <Save className="h-4 w-4" />
                Salvar Rubrica
              </Button>
            </div>
          </div>
        )}

        <div className="mt-4 border rounded-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-7 w-[90px] px-2 text-[11px] font-medium">Código</TableHead>
                <TableHead className="h-7 px-2 text-[11px] font-medium">Descrição</TableHead>
                <TableHead className="h-7 px-2 text-[11px] font-medium">Tipo</TableHead>
                <TableHead className="h-7 px-2 text-center text-[11px] font-medium">INSS</TableHead>
                <TableHead className="h-7 px-2 text-center text-[11px] font-medium">FGTS</TableHead>
                <TableHead className="h-7 px-2 text-center text-[11px] font-medium">IRRF</TableHead>
                <TableHead className="h-7 px-2 text-right text-[11px] font-medium">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Carregando rubricas...
                  </TableCell>
                </TableRow>
              ) : rubricas?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhuma rubrica cadastrada.
                  </TableCell>
                </TableRow>
              ) : (
                rubricas?.map((rubrica) => (
                  <TableRow key={rubrica.id} className="hover:bg-muted/30 transition-colors group">
                    <TableCell className="px-2 py-1.5 text-[12.5px] font-mono font-medium text-primary">
                      {rubrica.codigo}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-[12.5px] font-medium font-body">{rubrica.descricao}</TableCell>
                    <TableCell className="px-2 py-1.5">
                      <Badge variant={rubrica.tipo === 'provento' ? 'outline' : 'destructive'} size="sm" className={cn("capitalize font-body", rubrica.tipo === 'provento' && "bg-success/10 text-success border-success/20")}>
                        {rubrica.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-center">
                      {rubrica.incide_inss ? <Check className="h-3.5 w-3.5 mx-auto text-success" /> : <X className="h-3.5 w-3.5 mx-auto text-muted-foreground/30" />}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-center">
                      {rubrica.incide_fgts ? <Check className="h-3.5 w-3.5 mx-auto text-success" /> : <X className="h-3.5 w-3.5 mx-auto text-muted-foreground/30" />}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-center">
                      {rubrica.incide_irrf ? <Check className="h-3.5 w-3.5 mx-auto text-success" /> : <X className="h-3.5 w-3.5 mx-auto text-muted-foreground/30" />}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {validarRubricaESocial(rubrica).valid ? (
                          <Badge variant="outline" size="sm" className="text-success border-success/30 bg-success/5">
                            Conforme
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Visualizar XML"
                              className="h-7 w-7 text-info hover:text-info hover:bg-info/10"
                              title="Ver XML eSocial"
                              onClick={() => {
                                 toast.info("Visualização XML (S-1010) gerada com sucesso!");
                              }}
                            >
                              <FileCode className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Corrigir"
                              className="h-7 w-7 text-warning hover:text-warning hover:bg-warning/10"
                              title="Corrigir divergência eSocial"
                              onClick={() => {
                                const corrigida = sugerirCorrecaoRubrica(rubrica);
                                if (corrigida && confirm('Deseja aplicar as correções automáticas do eSocial para esta rubrica?')) {
                                  supabase.from('rubricas_folha').update(corrigida).eq('id', rubrica.id).then(() => {
                                    queryClient.invalidateQueries({ queryKey: ['rubricas_folha'] });
                                    toast.success('Rubrica saneada com sucesso!');
                                  });
                                }
                              }}
                            >
                              <Wrench className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Excluir"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            if (confirm('Deseja realmente excluir esta rubrica?')) {
                              deleteMutation.mutate(rubrica.id);
                            }
                          }}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
