import { useState, useCallback } from 'react';
import { useLocaisTrabalho } from '@/hooks/useLocaisTrabalho';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';
import { Plus, Trash2, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EntityPageContainer } from '@/components/layout/EntityPageContainer';

export default function LocaisTrabalhoPage() {
  const { 
    locais, 
    total,
    isLoading, 
    isFetching,
    error,
    page,
    setPage,
    pageSize,
    search,
    setSearch,
    criar, 
    excluir,
    refetch
  } = useLocaisTrabalho();
  
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: '', endereco: '', cidade: '', uf: '', cep: '', telefone: '' });

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    setPage(1);
  }, [setSearch, setPage]);

  const handlePageChange = useCallback((p: number) => {
    setPage(p);
  }, [setPage]);

  const handleSubmit = async () => {
    if (!form.nome) return;
    await criar(form);
    setForm({ nome: '', endereco: '', cidade: '', uf: '', cep: '', telefone: '' });
    setShowForm(false);
  };

  return (
    <EntityPageContainer<any>
      pageTitle="Locais de Trabalho"
      pageDescription="Gestão de locais e endereços"
      title="Locais de Trabalho"
      description="Gestão de unidades físicas e pontos de presença"
      icon={<MapPin className="h-5 w-5 text-primary-foreground" />}
      gradient="from-primary to-primary-glow"
      entityName="local de trabalho"
      searchPlaceholder="Filtrar por nome..."
      items={locais}
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
      actions={
        <Button onClick={() => setShowForm(!showForm)} className="rounded-xl shadow-glow">
          <Plus className="mr-2 h-4 w-4" />{showForm ? 'Cancelar' : 'Novo Local'}
        </Button>
      }
      stats={
        <AnimatePresence>
          {showForm && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Card className="border-primary/20 bg-primary/5 rounded-2xl mb-6 shadow-xs">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Nome *</Label>
                      <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Matriz" />
                    </div>
                    <div className="space-y-2">
                      <Label>Endereço</Label>
                      <Input value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} placeholder="Rua..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Cidade</Label>
                      <Input value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} placeholder="São Paulo" />
                    </div>
                    <div className="space-y-2">
                      <Label>UF</Label>
                      <Input maxLength={2} value={form.uf} onChange={e => setForm(f => ({ ...f, uf: e.target.value.toUpperCase() }))} placeholder="SP" />
                    </div>
                    <div className="space-y-2">
                      <Label>CEP</Label>
                      <Input value={form.cep} onChange={e => setForm(f => ({ ...f, cep: e.target.value }))} placeholder="00000-000" />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(00) 0000-0000" />
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button onClick={handleSubmit} className="rounded-xl px-8 shadow-glow">Salvar Local</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      }
      columns={[
        { header: 'Nome', className: 'pl-6' },
        { header: 'Endereço' },
        { header: 'Cidade/UF' },
        { header: 'CEP' },
        { header: 'Status' },
        { header: 'Ações', className: 'text-right pr-6', width: '80px' }
      ]}
      renderRow={(l) => (
        <TableRow key={l.id} className="hover:bg-accent/10 transition-colors group">
          <TableCell className="font-medium pl-6">{l.nome}</TableCell>
          <TableCell className="text-sm">{l.endereco || '—'}</TableCell>
          <TableCell className="text-sm font-body">{[l.cidade, l.uf].filter(Boolean).join('/') || '—'}</TableCell>
          <TableCell className="text-sm font-mono">{l.cep || '—'}</TableCell>
          <TableCell>
            <Badge className={l.ativo !== false ? 'bg-success/10 text-success border-0 text-[10px]' : 'bg-muted text-muted-foreground border-0 text-[10px]'}>
              {l.ativo !== false ? 'Ativo' : 'Inativo'}
            </Badge>
          </TableCell>
          <TableCell className="text-right pr-6">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Excluir"
              onClick={() => excluir(l.id)}
              className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TableCell>
        </TableRow>
      )}
    />
  );
}
