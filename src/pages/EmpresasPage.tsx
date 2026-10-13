import { useCallback } from 'react';
import { Building2, Edit, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTodasEmpresas } from '@/hooks/useTodasEmpresas';
import { EntityGridPageContainer } from '@/components/layout/EntityGridPageContainer';
import { Empresa } from '@/types/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function EmpresasPage() {
  const navigate = useNavigate();
  const { 
    empresas, 
    total, 
    isLoading, 
    isFetching,
    error,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    refetch,
    isRefreshing
  } = useTodasEmpresas();

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    setPage(1);
  }, [setSearch, setPage]);

  const handlePageChange = useCallback((p: number) => {
    setPage(p);
  }, [setPage]);

  return (
    <EntityGridPageContainer<Empresa>
      pageTitle="Empresas"
      pageDescription="Gestão de empresas"
      title="Empresas"
      description="Gestão de unidades de negócio e grupos econômicos"
      icon={<Building2 className="h-5 w-5 text-primary-foreground" />}
      gradient="from-primary/80 to-primary"
      entityName="empresa"
      searchPlaceholder="Buscar por razão social, fantasia ou CNPJ..."
      items={empresas}
      total={total}
      isLoading={isLoading}
      isFetching={isFetching}
      error={error}
      page={page}
      pageSize={pageSize}
      search={search}
      onPageChange={handlePageChange}
      onPageSizeChange={setPageSize}
      onSearchChange={handleSearchChange}
      onRefetch={refetch}
      isRefreshing={isRefreshing}
      onAdd={() => navigate('/empresas/novo')}
      addLabel="Nova Empresa"
      actions={
        <div className="flex gap-2">
          {/* Outras ações se necessário */}
        </div>
      }
      renderItem={(empresa, i) => (
        <motion.div
          key={empresa.id}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Card className="group border border-border/30 hover:border-border/60 shadow-elevated hover:shadow-glow transition-all duration-300 rounded-2xl overflow-hidden bg-card">
            <div className="h-[2px] bg-gradient-to-r from-primary/80 to-primary opacity-60 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/80 to-primary shadow-lg group-hover:scale-110 transition-transform">
                <Building2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base font-display truncate">{empresa.nome_fantasia || empresa.razao_social}</CardTitle>
                <p className="text-sm text-muted-foreground font-body">{empresa.cnpj || 'CNPJ não informado'}</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-body">
                  <Users className="h-4 w-4" />
                  <span>Status: {empresa.ativa !== false ? 'Ativa' : 'Inativa'}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate(`/empresas/editar/${empresa.id}`)} className="rounded-xl hover:bg-primary/10 font-body">
                  <Edit className="h-4 w-4 mr-1" />Editar
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    />
  );
}
