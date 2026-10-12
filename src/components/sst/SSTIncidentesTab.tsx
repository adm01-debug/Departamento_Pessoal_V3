import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts';
import { exportPontoCSV } from '@/services/exportService';
import { registrarAcessoPII } from '@/services/piiAccessLogService';
import { formatDateLocalISO } from '@/utils/dateLocal';

export function SSTIncidentesTab() {
  const { empresaAtual } = useEmpresa();

  const { data: incidentes = [], isLoading } = useQuery({
    queryKey: ['sst_incidentes', empresaAtual?.id],
    enabled: !!empresaAtual?.id,
    queryFn: async () => {
      // O bridge limita cada leitura a 100 linhas — pagina até esgotar,
      // senão KPIs e export truncam silenciosamente em empresas grandes.
      const PAGE = 1000;
      const fetchPage = (offset: number) =>
        supabase
          .from('sst_incidentes')
          .select('*')
          .eq('empresa_id', empresaAtual!.id)
          .order('data_hora', { ascending: false })
          .range(offset, offset + PAGE - 1);
      type Page = Awaited<ReturnType<typeof fetchPage>>;
      const rows: NonNullable<Page['data']> = [];
      for (let offset = 0; ; offset += PAGE) {
        const { data, error } = await fetchPage(offset);
        if (error) throw error;
        if (data) rows.push(...data);
        if (!data || data.length < PAGE) break;
      }
      return rows;
    },
  });

  const exportarOcorrencias = () => {
    if (!incidentes.length) {
      toast.info('Nenhuma ocorrência para exportar');
      return;
    }
    const linhas = incidentes.map((i) => ({
      data: formatDateLocalISO(new Date(i.data_hora)),
      tipo: i.tipo,
      local: i.local,
      descricao: i.descricao,
      gravidade: i.gravidade ?? '',
      status: i.status ?? '',
      medidas_tomadas: i.medidas_tomadas ?? '',
    }));
    exportPontoCSV(linhas, `sst-ocorrencias-${formatDateLocalISO(hoje)}.csv`);
    void registrarAcessoPII('sst_incidentes', 'export', {
      empresaId: empresaAtual?.id,
      registroCount: linhas.length,
    });
    toast.success(`${linhas.length} ocorrência(s) exportada(s)`);
  };

  const hoje = new Date();
  const acidentes = incidentes.filter((i) => i.tipo === 'acidente_leve' || i.tipo === 'acidente_grave');
  const incidentesMes = incidentes.filter((i) => {
    const d = new Date(i.data_hora);
    return d.getFullYear() === hoje.getFullYear() && d.getMonth() === hoje.getMonth();
  }).length;
  // Lista vem ordenada desc por data_hora — o primeiro acidente é o mais recente
  const ultimoAcidente = acidentes.length ? new Date(acidentes[0].data_hora) : null;
  const diasSemAcidente = ultimoAcidente
    ? Math.max(0, Math.floor((hoje.getTime() - ultimoAcidente.getTime()) / 86_400_000))
    : null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'em_investigacao':
        return <Badge className="bg-warning/15 text-warning border-0">Investigando</Badge>;
      case 'concluido':
        return <Badge className="bg-success/15 text-success border-0">Concluído</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'quase_acidente':
        return (
          <Badge variant="outline" className="border-info/30 text-info">
            Quase Acidente
          </Badge>
        );
      case 'acidente_leve':
        return (
          <Badge variant="outline" className="border-warning/30 text-warning">
            Acidente Leve
          </Badge>
        );
      case 'acidente_grave':
        return (
          <Badge variant="outline" className="border-destructive/30 text-destructive font-bold">
            Acidente Grave
          </Badge>
        );
      default:
        return <Badge variant="outline">{tipo}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            valor: acidentes.length,
            rotulo: 'Acidentes Registrados',
            Icone: ShieldAlert,
            classeIcone: 'bg-destructive/10 text-destructive',
            destaque: true,
          },
          {
            valor: incidentesMes,
            rotulo: 'Incidentes este mês',
            Icone: AlertCircle,
            classeIcone: 'bg-warning/10 text-warning',
            destaque: false,
          },
          {
            valor: diasSemAcidente ?? '—',
            rotulo: 'Dias sem acidentes',
            Icone: CheckCircle2,
            classeIcone: 'bg-success/10 text-success',
            destaque: false,
          },
        ].map(({ valor, rotulo, Icone, classeIcone, destaque }) => (
          <Card
            key={rotulo}
            className={`rounded-2xl border-border/30 ${destaque ? 'bg-gradient-to-br from-card to-accent/5' : ''}`}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${classeIcone}`}>
                <Icone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{valor}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{rotulo}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl border-border/30 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-display">Histórico de Ocorrências</CardTitle>
          <Button size="sm" variant="ghost" className="text-xs h-8" onClick={exportarOcorrencias}>
            Exportar CSV
          </Button>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-display">Data</TableHead>
              <TableHead className="font-display">Tipo</TableHead>
              <TableHead className="font-display">Local</TableHead>
              <TableHead className="font-display">Descrição</TableHead>
              <TableHead className="font-display">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidentes.map((inc, i) => (
              <motion.tr
                key={inc.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="hover:bg-accent/30 transition-colors"
              >
                <TableCell className="font-body text-xs">
                  {new Date(inc.data_hora).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>{getTipoBadge(inc.tipo)}</TableCell>
                <TableCell className="font-body text-xs">{inc.local}</TableCell>
                <TableCell className="font-body text-xs max-w-[200px] truncate">{inc.descricao}</TableCell>
                <TableCell>{getStatusBadge(inc.status ?? '')}</TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
