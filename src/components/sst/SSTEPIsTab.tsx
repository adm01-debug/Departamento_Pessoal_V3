import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { HardHat } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Tables } from '@/integrations/supabase/types';

export type EpiResumo = Pick<Tables<'epis'>, 'id' | 'nome' | 'ca' | 'categoria' | 'ca_validade'>;

type EpiEntrega = Pick<Tables<'epis_entregas'>, 'id' | 'data_entrega' | 'quantidade'> & {
  colaborador?: { nome_completo: string | null } | null;
  epi?: { nome: string | null; ca: string | null } | null;
};

interface SSTEPIsTabProps {
  epis: EpiResumo[];
  entregas: EpiEntrega[];
}

function mesesRestantes(dataIso: string | null): number | null {
  if (!dataIso) return null;
  const ms = new Date(dataIso).getTime() - Date.now();
  return Math.max(0, ms / (1000 * 60 * 60 * 24 * 30.4));
}

export function SSTEPIsTab({ epis, entregas }: SSTEPIsTabProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {epis.length === 0 ? (
          <Card className="col-span-full rounded-2xl border-border/30">
            <CardContent className="py-12 text-center text-muted-foreground font-body">
              <HardHat className="mx-auto h-12 w-12 mb-4 opacity-30" />
              <p>Nenhum EPI cadastrado</p>
            </CardContent>
          </Card>
        ) : (
          epis.map((epi, i) => (
            <motion.div
              key={epi.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="border-border/30 rounded-2xl hover:shadow-elevated transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <HardHat className="h-5 w-5 text-info" />
                      <div>
                        <p className="font-display font-semibold text-sm">{epi.nome}</p>
                        <p className="text-[10px] text-muted-foreground font-body">CA: {epi.ca || '—'}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-body">
                      {epi.categoria}
                    </Badge>
                  </div>
                  {epi.ca_validade && (
                    <div className="mt-2">
                      <p className="text-[10px] text-muted-foreground font-body">
                        Validade CA: {new Date(epi.ca_validade).toLocaleDateString('pt-BR')}
                      </p>
                      <Progress
                        value={Math.min(100, ((mesesRestantes(epi.ca_validade) ?? 0) / 12) * 100)}
                        className="h-1.5 mt-1"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {entregas.length > 0 && (
        <Card className="rounded-2xl border-border/30 overflow-hidden mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display">Últimas Entregas</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-display">Colaborador</TableHead>
                <TableHead className="font-display">EPI</TableHead>
                <TableHead className="font-display">CA</TableHead>
                <TableHead className="font-display">Data</TableHead>
                <TableHead className="font-display">Qtd</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entregas.slice(0, 20).map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-body text-sm">{e.colaborador?.nome_completo || '—'}</TableCell>
                  <TableCell className="font-body text-sm">{e.epi?.nome || '—'}</TableCell>
                  <TableCell className="font-body text-xs text-muted-foreground">{e.epi?.ca || '—'}</TableCell>
                  <TableCell className="font-body text-sm">
                    {e.data_entrega ? new Date(e.data_entrega).toLocaleDateString('pt-BR') : '—'}
                  </TableCell>
                  <TableCell className="font-body text-sm">{e.quantidade || 1}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
