import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Gift } from 'lucide-react';
import { motion } from 'framer-motion';

interface PortalFinanceiroTabProps {
  holerites: any[];
  beneficios: any[];
}

export function PortalFinanceiroTab({ holerites, beneficios }: PortalFinanceiroTabProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-h3 font-display font-medium">Meus Holerites</h2>
      {holerites.length > 0 ? (
        <div className="grid gap-3">
          {holerites.map((h: any, i: number) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border border-border/30 rounded-xl">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-success to-success/70"><DollarSign className="h-4 w-4 text-primary-foreground" /></div>
                    <div>
                      <p className="font-display font-semibold text-sm">{h.competencia}</p>
                      <p className="text-xs text-muted-foreground font-body">Bruto: {(h.total_proventos || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-medium text-success">{(h.total_liquido || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    <p className="text-[10px] text-muted-foreground">Líquido</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="border border-border/30 rounded-xl"><CardContent className="py-8 text-center text-muted-foreground"><DollarSign className="mx-auto h-8 w-8 mb-2 opacity-40" />Nenhum holerite encontrado</CardContent></Card>
      )}

      <h2 className="text-h3 font-display font-medium mt-6">Meus Benefícios</h2>
      {beneficios.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {beneficios.map((b: any, i: number) => (
            <Card key={i} className="border border-border/30 rounded-xl">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-info to-info/70"><Gift className="h-4 w-4 text-primary-foreground" /></div>
                  <div>
                    <p className="font-display font-semibold text-sm">{b.nome}</p>
                    <Badge variant="outline" className="text-[10px]">{b.tipo || 'Geral'}</Badge>
                  </div>
                </div>
                <p className="font-display font-medium text-sm">{(b.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border border-border/30 rounded-xl"><CardContent className="py-8 text-center text-muted-foreground"><Gift className="mx-auto h-8 w-8 mb-2 opacity-40" />Nenhum benefício ativo</CardContent></Card>
      )}
    </div>
  );
}
