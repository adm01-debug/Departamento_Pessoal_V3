import { PageTitle } from '@/components/PageTitle';
import { useQuery } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useState, useMemo } from 'react';
import { FileText, Search, Download, Filter, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { gerarPDFHolerite } from '@/utils/holeritePDF';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from '@/components/dashboard/AnimatedNumber';
import { toast } from 'sonner';
import { currentCompetenciaLocal } from '@/utils/dateLocal';
import { DistribuirHoleritesButton } from '@/components/folha/DistribuirHoleritesButton';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(value);
}

export default function HoleritesPage() {
  const [busca, setBusca] = useState('');
  const [mesFiltro, setMesFiltro] = useState(currentCompetenciaLocal());

  const { data: holerites, isLoading } = useQuery({
    queryKey: ['holerites', mesFiltro],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('folha_itens')
        .select(`
          *,
          folha:folhas_pagamento(competencia, tipo),
          colaborador:colaboradores(nome_completo, cpf, cargo)
        `)
        .filter('folha.competencia', 'eq', mesFiltro)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    return holerites?.filter(h => {
      const colab = h.colaborador as any;
      return (
        colab?.nome_completo?.toLowerCase().includes(busca.toLowerCase()) ||
        colab?.cpf?.includes(busca)
      );
    }) || [];
  }, [holerites, busca]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, h) => ({
        proventos: acc.proventos + (Number(h.total_proventos) || 0),
        descontos: acc.descontos + (Number(h.total_descontos) || 0),
        liquido: acc.liquido + (Number(h.total_liquido) || 0),
      }),
      { proventos: 0, descontos: 0, liquido: 0 }
    );
  }, [filtered]);

  const handleDownload = (h: any) => {
    try {
      const colab = h.colaborador as any;
      const folha = h.folha as any;
      
      gerarPDFHolerite({
        colaborador_nome: colab?.nome_completo || 'N/A',
        colaborador_cpf: colab?.cpf || 'N/A',
        colaborador_cargo: colab?.cargo || 'N/A',
        competencia: folha?.competencia || mesFiltro,
        salario_base: Number(h.salario_base),
        total_proventos: Number(h.total_proventos),
        total_descontos: Number(h.total_descontos),
        liquido: Number(h.total_liquido),
        inss: Number(h.inss_mes),
        irrf: Number(h.irrf_mes),
        fgts: Number(h.fgts_mes),
      });
      toast.success('Holerite gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar PDF do holerite.');
    }
  };

  return (
    <>
      <PageTitle title="Holerites Digitais" description="Consulta e emissão de demonstrativos de pagamento" />
      <PageLayout
        title="Holerites Digitais"
        description="Gestão de demonstrativos de pagamento por competência"
        icon={<FileText className="h-5 w-5 text-primary-foreground" />}
        gradient="from-blue-600 to-indigo-600"
        actions={<DistribuirHoleritesButton competencia={mesFiltro} />}
      >
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <Card className="lg:col-span-1 border-border/40 shadow-xs h-fit">
            <CardHeader className="pb-3 border-b border-border/5">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" /> Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Competência
                </label>
                <Input 
                  type="month" 
                  value={mesFiltro} 
                  onChange={(e) => setMesFiltro(e.target.value)}
                  className="rounded-xl h-11"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                  <Search className="w-3 h-3" /> Colaborador
                </label>
                <Input 
                  placeholder="Nome ou CPF..." 
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="rounded-xl h-11"
                />
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Summary KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Total Proventos', value: totals.proventos, gradient: 'from-emerald-500 to-teal-500' },
                { label: 'Total Descontos', value: totals.descontos, gradient: 'from-rose-500 to-red-500' },
                { label: 'Total Líquido', value: totals.liquido, gradient: 'from-blue-500 to-indigo-500' },
              ].map((kpi, i) => (
                <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                  <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all">
                    <div className={cn("h-1 bg-gradient-to-r", kpi.gradient)} />
                    <CardContent className="p-5">
                      <p className="text-xs text-muted-foreground font-medium mb-1">{kpi.label}</p>
                      <p className="text-2xl font-display font-bold tabular-nums">
                        <AnimatedNumber value={kpi.value} format={formatCurrency} />
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Holerites List */}
            <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated bg-card">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Spinner size="lg" className="text-primary" />
                    <p className="text-sm text-muted-foreground animate-pulse">Carregando demonstrativos...</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                    <div className="w-16 h-16 rounded-3xl bg-muted/30 flex items-center justify-center mb-4">
                      <FileText className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <h3 className="font-display font-bold text-lg">Nenhum registro encontrado</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mt-1">
                      Não encontramos holerites para os filtros aplicados nesta competência.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/10">
                          <TableHead className="font-display font-bold h-12">Colaborador</TableHead>
                          <TableHead className="font-display font-bold h-12 text-right">Proventos</TableHead>
                          <TableHead className="font-display font-bold h-12 text-right">Descontos</TableHead>
                          <TableHead className="font-display font-bold h-12 text-right">Líquido</TableHead>
                          <TableHead className="w-20 text-center font-display font-bold h-12">PDF</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {filtered.map((h, i) => {
                            const colab = h.colaborador as any;
                            return (
                              <motion.tr 
                                key={h.id} 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                transition={{ delay: i * 0.03 }}
                                className="hover:bg-primary/5 transition-colors border-b border-border/5 group"
                              >
                                <TableCell className="py-4">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-slate-800">{colab?.nome_completo || 'N/A'}</span>
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-tighter">
                                      {colab?.cargo || 'CARGO N/D'} • CPF: {colab?.cpf || '---'}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right text-emerald-600 font-medium tabular-nums">
                                  {formatCurrency(Number(h.total_proventos))}
                                </TableCell>
                                <TableCell className="text-right text-rose-600 font-medium tabular-nums">
                                  {formatCurrency(Number(h.total_descontos))}
                                </TableCell>
                                <TableCell className="text-right font-display font-bold text-primary tabular-nums">
                                  {formatCurrency(Number(h.total_liquido))}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label="Baixar"
                                    className="h-9 w-9 rounded-xl hover:bg-primary hover:text-white transition-all shadow-xs group-hover:scale-110"
                                    onClick={() => handleDownload(h)}
                                    title="Baixar Holerite PDF"
                                  >
                                    <Download className="h-4 h-4" />
                                  </Button>
                                </TableCell>
                              </motion.tr>
                            );
                          })}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageLayout>
    </>
  );
}
