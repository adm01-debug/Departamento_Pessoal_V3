import { PageTitle } from '@/components/PageTitle';
import { PageLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useOrganograma } from '@/hooks/useOrganograma';
import { OrganogramaNode } from '@/components/organograma/OrganogramaNode';
import { Network, Users, Building2, TrendingUp, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SyncErrorState } from '@/components/ui/sync-error-state';
import { useState, useMemo } from 'react';

export default function OrganogramaPage() {
  const { dados, isLoading, error, refetch } = useOrganograma();
  const [search, setSearch] = useState('');

  const stats = useMemo(() => {
    let totalColabs = 0;
    let totalDeptos = 0;

    const count = (nodes: any[]) => {
      nodes.forEach(n => {
        totalDeptos++;
        totalColabs += n.colaboradores?.length || 0;
        if (n.sub_departamentos) count(n.sub_departamentos);
      });
    };

    count(dados || []);
    return { totalColabs, totalDeptos };
  }, [dados]);

  return (
    <>
      <PageTitle title="Estrutura Organizacional" description="Visualize a hierarquia da empresa" />
      <PageLayout
        title="Organograma 10/10"
        description="Gestão visual de departamentos e hierarquia"
        icon={<Network className="h-5 w-5 text-primary-foreground" />}
        gradient="from-primary to-primary-glow"
      >
        {/* Dashboard de Estrutura */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-border/30 rounded-3xl shadow-xs bg-card/50 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Building2 className="h-16 w-16" />
            </div>
            <CardContent className="p-6">
              <p className="text-[10px] uppercase font-medium text-muted-foreground tracking-widest mb-1">Total de Departamentos</p>
              <h3 className="text-3xl font-display font-medium">{stats.totalDeptos}</h3>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-success" /> Estrutura ativa
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/30 rounded-3xl shadow-xs bg-card/50 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Users className="h-16 w-16" />
            </div>
            <CardContent className="p-6">
              <p className="text-[10px] uppercase font-medium text-muted-foreground tracking-widest mb-1">Colaboradores Ativos</p>
              <h3 className="text-3xl font-display font-medium">{stats.totalColabs}</h3>
              <p className="text-xs text-muted-foreground mt-2">Distribuídos na hierarquia</p>
            </CardContent>
          </Card>

          <Card className="border-border/30 rounded-3xl shadow-xs bg-card/50 p-6 flex flex-col justify-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Filtrar por nome ou depto..." 
                className="pl-10 rounded-2xl border-border/40 focus:ring-primary/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </Card>
        </div>

        {/* Visualização da Árvore */}
        {error ? (
          <SyncErrorState error={error} onRetry={refetch} entityName="organograma" />
        ) : isLoading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : dados.length > 0 ? (
          <div className="space-y-4 max-w-4xl mx-auto">
            {dados.map((node: any) => (
              <OrganogramaNode key={node.id} node={node} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border-2 border-dashed border-border/40 rounded-3xl opacity-40">
            <Building2 className="h-12 w-12 mx-auto mb-4" />
            <p className="font-display font-medium">Nenhuma estrutura definida</p>
            <p className="text-sm">Cadastre departamentos e defina seus relacionamentos hierárquicos.</p>
          </div>
        )}
      </PageLayout>
    </>
  );
}
