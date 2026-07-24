import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks/useEmpresas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileSignature, Download, Loader2, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  useGerarComunicadoColetivas,
  baixarComunicadoColetivas,
} from '@/hooks/ferias/useGerarComunicadoColetivas';
import { toast } from 'sonner';

type Coletiva = {
  id: string;
  data_inicio: string;
  data_fim: string;
  dias: number;
  status: string | null;
  departamentos: string[] | null;
  comunicado_mte_path: string | null;
  comunicado_mte_hash: string | null;
  comunicado_sindicato_path: string | null;
  comunicado_sindicato_hash: string | null;
  comunicado_sindicato_nome: string | null;
  comunicado_gerado_em: string | null;
};

export function FeriasColetivasTab() {
  const { empresaAtual } = useEmpresas();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selecionada, setSelecionada] = useState<Coletiva | null>(null);
  const [sindicato, setSindicato] = useState({ nome: '', endereco: '', cnpj: '' });

  const gerar = useGerarComunicadoColetivas();

  const { data: coletivas, isLoading, refetch } = useQuery({
    queryKey: ['ferias_coletivas', empresaAtual?.id],
    queryFn: async () => {
      if (!empresaAtual?.id) return [] as Coletiva[];
      const { data, error } = await supabase
        .from('ferias_coletivas')
        .select('*')
        .eq('empresa_id', empresaAtual.id)
        .order('data_inicio', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Coletiva[];
    },
    enabled: !!empresaAtual?.id,
  });

  const abrirDialog = (c: Coletiva) => {
    setSelecionada(c);
    setSindicato({
      nome: c.comunicado_sindicato_nome ?? '',
      endereco: '',
      cnpj: '',
    });
    setDialogOpen(true);
  };

  const confirmar = async () => {
    if (!selecionada || !empresaAtual?.id) return;
    if (!sindicato.nome.trim()) {
      toast.error('Informe o nome do sindicato');
      return;
    }
    try {
      await gerar.mutateAsync({
        coletivaId: selecionada.id,
        empresaId: empresaAtual.id,
        sindicato: {
          nome: sindicato.nome.trim(),
          endereco: sindicato.endereco.trim() || undefined,
          cnpj: sindicato.cnpj.trim() || undefined,
        },
      });
      setDialogOpen(false);
      refetch();
    } catch {
      /* toast já emitido no hook */
    }
  };

  const baixar = async (path: string) => {
    try {
      const url = await baixarComunicadoColetivas(path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      toast.error(`Não foi possível baixar: ${e.message ?? e}`);
    }
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <ShieldCheck className="h-5 w-5" /> Férias Coletivas — Comunicados MTE & Sindicato
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !coletivas?.length ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhuma férias coletiva cadastrada para esta empresa.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>Dias</TableHead>
                <TableHead>Setores</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Comunicados</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coletivas.map((c) => {
                const emitido = !!c.comunicado_gerado_em;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(c.data_inicio), 'dd/MM/yy', { locale: ptBR })} →{' '}
                      {format(new Date(c.data_fim), 'dd/MM/yy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>{c.dias}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.departamentos?.length ? c.departamentos.join(', ') : 'Todos'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.status ?? 'planejada'}</Badge>
                    </TableCell>
                    <TableCell>
                      {emitido ? (
                        <div className="flex flex-col gap-1">
                          <Badge className="w-fit bg-emerald-600/15 text-emerald-600 border-emerald-600/30">
                            Emitido em {format(new Date(c.comunicado_gerado_em!), 'dd/MM/yy HH:mm')}
                          </Badge>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            MTE: {c.comunicado_mte_hash?.slice(0, 12)}…
                          </span>
                        </div>
                      ) : (
                        <Badge variant="secondary">Pendente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {emitido && c.comunicado_mte_path && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => baixar(c.comunicado_mte_path!)}
                          title="Baixar comunicado MTE"
                        >
                          <Download className="h-4 w-4" /> MTE
                        </Button>
                      )}
                      {emitido && c.comunicado_sindicato_path && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => baixar(c.comunicado_sindicato_path!)}
                          title="Baixar comunicado Sindicato"
                        >
                          <Download className="h-4 w-4" /> Sindicato
                        </Button>
                      )}
                      <Button size="sm" onClick={() => abrirDialog(c)} className="rounded-xl gap-1">
                        <FileSignature className="h-4 w-4" />
                        {emitido ? 'Reemitir' : 'Gerar comunicados'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Gerar comunicados de férias coletivas</DialogTitle>
            <DialogDescription className="text-xs">
              Serão gerados 2 PDFs (MTE/SRTE e Sindicato) conforme CLT art. 139 §2º, com hash
              SHA-256 e armazenamento em bucket privado. A comunicação deve ocorrer com
              antecedência mínima de 15 dias do início do gozo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Sindicato representativo *</Label>
              <Input
                placeholder="Ex.: Sindicato dos Comerciários de São Paulo"
                value={sindicato.nome}
                onChange={(e) => setSindicato((s) => ({ ...s, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Endereço do sindicato</Label>
              <Input
                placeholder="Rua, número, cidade/UF"
                value={sindicato.endereco}
                onChange={(e) => setSindicato((s) => ({ ...s, endereco: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>CNPJ do sindicato</Label>
              <Input
                placeholder="00.000.000/0000-00"
                value={sindicato.cnpj}
                onChange={(e) => setSindicato((s) => ({ ...s, cnpj: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmar} disabled={gerar.isPending} className="gap-1.5">
              {gerar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Gerar e arquivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
