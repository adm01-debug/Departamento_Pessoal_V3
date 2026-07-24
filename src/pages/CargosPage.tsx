import { useCallback } from 'react';
import { useCargos } from '@/hooks/useCargos';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { Briefcase, Plus, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { EntityPageContainer } from '@/components/layout/EntityPageContainer';
import { Cargo } from '@/types/entities';

export default function CargosPage() {
  const { 
    cargos, 
    total, 
    isLoading, 
    isFetching,
    error,
    page,
    setPage,
    pageSize,
    search,
    setSearch,
    refetch,
    isRefreshing
  } = useCargos();

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    setPage(1);
  }, [setSearch, setPage]);

  const handlePageChange = useCallback((p: number) => {
    setPage(p);
  }, [setPage]);

  const formatCurrency = (v: number | null) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <EntityPageContainer<Cargo>
      pageTitle="Gestão de Cargos"
      pageDescription="Definição de funções e faixas salariais"
      title="Cargos"
      description="Gestão de estratégia de cargos, CBO e remuneração sincronizada"
      icon={<Briefcase className="h-5 w-5 text-primary-foreground" />}
      gradient="from-warning to-info"
      entityName="cargo"
      searchPlaceholder="Buscar por nome ou CBO..."
      items={cargos}
      total={total}
      isLoading={isLoading}
      isFetching={isFetching}
      error={error}
      page={page}
      pageSize={pageSize}
      search={search}
      onPageChange={handlePageChange}
      onSearchChange={handleSearchChange}
      onRefetch={refetch}
      isRefreshing={isRefreshing}
      onAdd={() => {}}
      addLabel="Novo Cargo"
      actions={
        <div className="flex gap-2">
          {/* Outras ações específicas se necessário */}
        </div>
      }
      stats={
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <Card className="border-border/30 rounded-2xl bg-card/50 shadow-xs">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Total Cargos</p>
              <h3 className="text-2xl font-display font-bold">{total}</h3>
            </CardContent>
          </Card>
        </div>
      }
      columns={[
        { header: 'Cargo', className: 'pl-6' },
        { header: 'CBO' },
        { header: 'Nível' },
        { header: 'Salário Base', className: 'text-right' },
        { header: 'Status' },
        { header: '', width: '80px' }
      ]}
      renderRow={(cargo) => (
        <TableRow key={cargo.id} className="hover:bg-accent/20 transition-colors group border-b border-border/10 last:border-0">
          <TableCell className="py-4 pl-6">
            <div className="flex flex-col">
              <span className="font-body font-bold text-sm text-foreground">{cargo.nome}</span>
              {cargo.descricao && <span className="text-[10px] text-muted-foreground truncate max-w-[250px]">{cargo.descricao}</span>}
            </div>
          </TableCell>
          <TableCell className="font-mono text-[11px] font-medium">{cargo.cbo || 'Não inf.'}</TableCell>
          <TableCell>
            <Badge variant="outline" className="text-[10px] font-bold border-border/50 bg-muted/30">Lvl {cargo.nivel_hierarquico || 1}</Badge>
          </TableCell>
          <TableCell className="font-body text-right text-sm font-bold text-success">
            {cargo.salario_base ? formatCurrency(cargo.salario_base) : '-'}
          </TableCell>
          <TableCell>
            <Badge className={cargo.ativo !== false ? 'bg-success/10 text-success border-0 text-[10px]' : 'bg-muted text-muted-foreground border-0 text-[10px]'}>
              {cargo.ativo !== false ? 'Ativo' : 'Inativo'}
            </Badge>
          </TableCell>
          <TableCell className="text-right pr-6">
            <Button variant="ghost" size="icon" aria-label="Informações" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
              <Info className="h-4 w-4" />
            </Button>
          </TableCell>
        </TableRow>
      )}
    />
  );
}
