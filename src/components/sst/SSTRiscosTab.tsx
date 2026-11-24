import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, AlertTriangle, Flame, Users, Loader2 } from 'lucide-react';
import { Stethoscope } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts';

export function SSTRiscosTab() {
  const { empresaAtual } = useEmpresa();
  
  const { data: riscos = [], isLoading } = useQuery({
    queryKey: ['sst_riscos', empresaAtual?.id],
    enabled: !!empresaAtual?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sst_riscos_ambientais')
        .select('*, local:locais_trabalho(nome)')
        .eq('empresa_id', empresaAtual!.id);
      if (error) throw error;
      return data || [];
    }
  });

  const getCor = (categoria: string) => {
    switch (categoria) {
      case 'Físico': return 'from-info to-info/70';
      case 'Químico': return 'from-warning to-warning/70';
      case 'Biológico': return 'from-success to-success/70';
      case 'Ergonômico': return 'from-primary to-primary-glow';
      default: return 'from-destructive to-destructive/70';
    }
  };

  const getIcon = (categoria: string) => {
    switch (categoria) {
      case 'Físico': return Activity;
      case 'Químico': return Flame;
      case 'Biológico': return Stethoscope;
      case 'Ergonômico': return Users;
      default: return AlertTriangle;
    }
  };

  const riscosPorCategoria = [
    { categoria: 'Físico' },
    { categoria: 'Químico' },
    { categoria: 'Biológico' },
    { categoria: 'Ergonômico' },
    { categoria: 'Acidente' },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {isLoading ? (
        <div className="col-span-full flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : riscosPorCategoria.map(({ categoria }, i) => {
        const Icon = getIcon(categoria);
        const cor = getCor(categoria);
        const agentes = riscos.filter((r: any) => r.categoria === categoria);

        return (
          <motion.div key={categoria} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card className="border-border/30 rounded-2xl overflow-hidden">
              <div className={cn("h-[2px] bg-gradient-to-r", cor)} />
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn("p-2 rounded-xl bg-gradient-to-br text-primary-foreground", cor)}><Icon className="h-4 w-4" /></div>
                  <div>
                    <p className="font-display font-semibold text-sm">Risco {categoria}</p>
                    <p className="text-[10px] text-muted-foreground font-body">{agentes.length} agentes identificados</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {agentes.length > 0 ? (
                    agentes.map((r: any) => (
                      <Badge key={r.id} variant="outline" className="text-[10px] font-body">
                        {r.agente} {r.local?.nome ? `(${r.local.nome})` : ''}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-[10px] text-muted-foreground italic">Nenhum agente mapeado para esta categoria.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
