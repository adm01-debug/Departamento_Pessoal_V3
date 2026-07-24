import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { DataTableToolbar } from '@/components/ui/data-table-toolbar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyList } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { beneficioService } from '@/services';
import { useEmpresas } from '@/hooks/useEmpresas';
import { Edit, Gift, LayoutDashboard, List, History, Settings, TrendingUp, ArrowRight } from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BeneficiosDashboard } from '@/components/beneficios/BeneficiosDashboard';
import { BeneficioHistorico } from '@/components/beneficios/BeneficioHistorico';


export default function BeneficiosPage() {
  const [search, setSearch] = useState('');
  const { empresaAtual } = useEmpresas();
  const navigate = useNavigate();

  const { data: beneficios = [], isLoading } = useQuery({
    queryKey: ['beneficios-full', empresaAtual?.id],
    queryFn: () => beneficioService.listComAdesao(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });

  const filtered = beneficios.filter(b => !search || b.nome.toLowerCase().includes(search.toLowerCase()));
  const formatCurrency = (v: number | null) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <>
    <PageTitle title="Benefícios Inteligentes" description="Gestão estratégica de benefícios e adesões" />
    <PageLayout
      title="Benefícios"
      description="Gestão estratégica e análise de custos de benefícios"
      icon={<Gift className="h-5 w-5 text-primary-foreground" />}
      gradient="from-xp to-store"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-xl gap-2 font-body" onClick={() => navigate('/configuracoes/beneficios')}>
            <Settings className="h-4 w-4" /> Regras
          </Button>
          <Button onClick={() => navigate('/beneficios/novo')} size="sm" className="rounded-xl bg-gradient-to-r from-xp to-store hover:opacity-90 shadow-lg font-body">
            Novo Benefício
          </Button>
        </div>
      }
    >
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="dashboard" className="rounded-lg gap-2">
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="gestao" className="rounded-lg gap-2">
            <List className="h-4 w-4" /> Gestão de Planos
          </TabsTrigger>
          <TabsTrigger value="auditoria" className="rounded-lg gap-2">
            <History className="h-4 w-4" /> Auditoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center p-12"><Spinner size="lg" /></div>
          ) : (
            <BeneficiosDashboard beneficios={beneficios} />
          )}
        </TabsContent>

        <TabsContent value="gestao" className="space-y-6">
          <DataTableToolbar search={search} onSearchChange={setSearch} searchPlaceholder="Buscar benefício..." />

          {isLoading ? (
            <div className="flex justify-center p-8"><Spinner size="lg" /></div>
          ) : !filtered.length ? (
            <EmptyList entityName="benefício" onCreate={() => navigate('/beneficios/novo')} />
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border/30 overflow-hidden shadow-elevated bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-display font-semibold">Nome</TableHead>
                    <TableHead className="font-display font-semibold">Tipo</TableHead>
                    <TableHead className="font-display font-semibold text-right">Valor Unitário</TableHead>
                    <TableHead className="font-display font-semibold text-center">Adesões</TableHead>
                    <TableHead className="font-display font-semibold text-right">Custo Total</TableHead>
                    <TableHead className="font-display font-semibold">Status</TableHead>
                    <TableHead className="w-[80px] font-display font-semibold text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((b) => {
                    const adesoes = (b as any).beneficios_colaborador?.[0]?.count || 0;
                    return (
                      <TableRow key={b.id} className="hover:bg-accent/30 transition-colors group">
                        <TableCell className="font-body font-medium">{b.nome}</TableCell>
                        <TableCell className="font-body capitalize text-xs text-muted-foreground">{b.tipo || '-'}</TableCell>
                        <TableCell className="font-body text-right text-xs">{formatCurrency(b.valor)}</TableCell>
                        <TableCell className="font-body text-center">
                          <Badge variant="outline" className="rounded-full bg-primary/5 text-primary border-primary/20">
                            {adesoes} colab.
                          </Badge>
                        </TableCell>
                        <TableCell className="font-body text-right text-sm font-bold text-success">
                          {formatCurrency((b.valor || 0) * adesoes)}
                        </TableCell>
                        <TableCell>
                          <Badge className={b.ativo ? 'bg-success/15 text-success border-0 text-[10px] rounded-full' : 'bg-muted text-muted-foreground border-0 text-[10px] rounded-full'}>
                            {b.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" aria-label="Editar" className="h-8 w-8 rounded-xl hover:bg-primary/10 transition-colors" title="Editar">
                              <Edit className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" aria-label="Insights" className="h-8 w-8 rounded-xl hover:bg-info/10 transition-colors" title="Insights">
                              <TrendingUp className="h-4 w-4 text-muted-foreground group-hover:text-info" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="auditoria" className="space-y-6">
           <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-xs">
             <CardHeader className="bg-muted/30 pb-4">
               <CardTitle className="text-sm font-display flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <History className="h-4 w-4 text-primary" /> Histórico de Movimentações de Benefícios
                 </div>
                 <Button variant="ghost" size="sm" className="text-[10px] h-7 gap-1" onClick={() => navigate('/configuracoes/logs')}>
                   Auditoria Global <ArrowRight className="h-3 w-3" />
                 </Button>
               </CardTitle>
             </CardHeader>
             <CardContent className="pt-6">
                <BeneficioHistorico />
             </CardContent>
           </Card>
        </TabsContent>
      </Tabs>
    </PageLayout>
    </>
  );
}
