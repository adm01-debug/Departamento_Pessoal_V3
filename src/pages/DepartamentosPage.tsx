import { useState, useCallback } from 'react';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { Building2, GitBranch, ArrowRight, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NovoDepartamentoDialog } from '@/components/departamentos/NovoDepartamentoDialog';
import { EntityPageContainer } from '@/components/layout/EntityPageContainer';
import { Departamento } from '@/types/entities';
import type { LooseRow } from '@/types/db';
export default function DepartamentosPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<LooseRow<'departamentos'> | null>(null);
  const { 
    departamentos, 
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
  } = useDepartamentos();

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    setPage(1);
  }, [setSearch, setPage]);

  const handlePageChange = useCallback((p: number) => {
    setPage(p);
  }, [setPage]);
  const navigate = useNavigate();

  const abrirNovo = () => { setEditando(null); setDialogOpen(true); };
  const abrirEditar = (d: any) => { setEditando(d); setDialogOpen(true); };

  return (
    <>
      <EntityPageContainer<Departamento>
        pageTitle="Unidades & Departamentos"
        pageDescription="Gestão da estrutura organizacional"
        title="Departamentos"
        description="Gestão de unidades de negócio e centros de custo sincronizados"
        icon={<Building2 className="h-5 w-5 text-primary-foreground" />}
        gradient="from-info to-primary"
        entityName="departamento"
        searchPlaceholder="Buscar departamento por nome..."
        items={departamentos}
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
        onAdd={abrirNovo}
        addLabel="Novo Departamento"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="h-11 rounded-xl font-bold bg-card/50 shadow-xs" onClick={() => navigate('/organograma')}>
              <GitBranch className="h-4 w-4 mr-2" />Ver Organograma
            </Button>
          </div>
        }
        columns={[
          { header: 'Departamento' },
          { header: 'C. Custo' },
          { header: 'Estrutura' },
          { header: 'Status' },
          { header: '', width: '100px' }
        ]}
        renderRow={(dept) => (
          <TableRow key={dept.id} className="hover:bg-accent/20 transition-colors group">
            <TableCell>
              <div className="flex flex-col">
                <span className="font-body font-bold text-sm text-foreground">{dept.nome}</span>
                {dept.id && (
                  <span className="text-[9px] text-muted-foreground uppercase font-mono tracking-tighter opacity-50">
                    ID: {dept.id.slice(0,8)}
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-muted-foreground bg-muted/40 px-2 py-1 rounded-lg w-fit">
                <Wallet className="h-3 w-3" />
                {dept.codigo_centro_custo || 'GERAL'}
              </div>
            </TableCell>
            <TableCell>
              {dept.departamento_pai_id ? (
                <div className="flex items-center gap-1 text-[10px] text-info font-bold">
                  <GitBranch className="h-3 w-3" /> SUB-DEPTO
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[10px] text-success font-bold">
                  <Building2 className="h-3 w-3" /> UNIDADE RAIZ
                </div>
              )}
            </TableCell>
            <TableCell>
              <Badge className={dept.ativo !== false ? 'bg-success/10 text-success border-0 text-[10px]' : 'bg-muted text-muted-foreground border-0 text-[10px]'}>
                {dept.ativo !== false ? 'Ativo' : 'Inativo'}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button 
                onClick={() => abrirEditar(dept)} 
                variant="ghost" 
                size="sm" 
                className="h-7 text-[10px] font-bold gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                DETALHES <ArrowRight className="h-3 w-3" />
              </Button>
            </TableCell>
          </TableRow>
        )}
      />
      <NovoDepartamentoDialog open={dialogOpen} onOpenChange={setDialogOpen} departamento={editando} />
    </>
  );
}
