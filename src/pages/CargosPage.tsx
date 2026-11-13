import { useCallback, useState } from 'react';
import { useCargos } from '@/hooks/useCargos';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { Briefcase, Pencil, Power } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { EntityPageContainer } from '@/components/layout/EntityPageContainer';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { Cargo } from '@/types/entities';
import { parseMoedaBR } from '@/utils/format';

interface CargoForm {
  nome: string;
  cbo: string;
  descricao: string;
  nivel_hierarquico: string;
  salario_base: string;
  ativo: boolean;
}

const EMPTY_FORM: CargoForm = {
  nome: '',
  cbo: '',
  descricao: '',
  nivel_hierarquico: '',
  salario_base: '',
  ativo: true,
};

function toForm(cargo: Cargo): CargoForm {
  return {
    nome: cargo.nome ?? '',
    cbo: cargo.cbo ?? '',
    descricao: cargo.descricao ?? '',
    nivel_hierarquico: cargo.nivel_hierarquico != null ? String(cargo.nivel_hierarquico) : '',
    salario_base: cargo.salario_base != null ? String(cargo.salario_base) : '',
    ativo: cargo.ativo !== false,
  };
}

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
    isRefreshing,
    criar,
    atualizar,
    isCreating,
    isUpdating,
  } = useCargos();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Cargo | null>(null);
  const [form, setForm] = useState<CargoForm>(EMPTY_FORM);

  const openNovo = useCallback(() => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }, []);

  const openEditar = useCallback((cargo: Cargo) => {
    setEditing(cargo);
    setForm(toForm(cargo));
    setDialogOpen(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nome = form.nome.trim();
    if (nome.length < 2) {
      toast.error('Informe o nome do cargo (mínimo 2 caracteres).');
      return;
    }
    const salarioTxt = form.salario_base.trim();
    const salario = salarioTxt ? parseMoedaBR(salarioTxt) : undefined;
    if (salario !== undefined && (!Number.isFinite(salario) || salario < 0)) {
      toast.error('Salário base inválido.');
      return;
    }
    const nivelTxt = form.nivel_hierarquico.trim();
    const nivel = nivelTxt ? Number(nivelTxt) : null;
    if (nivel !== null && (!Number.isInteger(nivel) || nivel < 1)) {
      toast.error('Nível hierárquico deve ser um número inteiro maior que zero.');
      return;
    }
    const cbo = form.cbo.trim();
    const payload: Record<string, unknown> = {
      nome,
      descricao: form.descricao.trim() || null,
      nivel_hierarquico: nivel,
      ativo: form.ativo,
    };
    // cbo/salario_base: o cargoSchema não aceita null; vazio no cadastro é omitido.
    if (cbo || editing?.cbo) payload.cbo = cbo;
    if (salario !== undefined) payload.salario_base = salario;
    try {
      if (editing) {
        await atualizar({ id: editing.id, data: payload });
      } else {
        await criar(payload);
      }
      setDialogOpen(false);
    } catch {
      // erro já notificado via toast pelo useGenericCrud; mantém o diálogo aberto
    }
  };

  const handleToggleAtivo = async (cargo: Cargo) => {
    try {
      await atualizar({ id: cargo.id, data: { ativo: cargo.ativo === false } });
    } catch {
      // erro já notificado via toast pelo useGenericCrud
    }
  };

  const isSaving = isCreating || isUpdating;

  const handleSearchChange = useCallback(
    (val: string) => {
      setSearch(val);
      setPage(1);
    },
    [setSearch, setPage]
  );

  const handlePageChange = useCallback(
    (p: number) => {
      setPage(p);
    },
    [setPage]
  );

  const formatCurrency = (v: number | null) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <>
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
        onAdd={openNovo}
        addLabel="Novo Cargo"
        actions={<div className="flex gap-2">{/* Outras ações específicas se necessário */}</div>}
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
          { header: '', width: '80px' },
        ]}
        renderRow={(cargo) => (
          <TableRow
            key={cargo.id}
            className="hover:bg-accent/20 transition-colors group border-b border-border/10 last:border-0"
          >
            <TableCell className="py-4 pl-6">
              <div className="flex flex-col">
                <span className="font-body font-bold text-sm text-foreground">{cargo.nome}</span>
                {cargo.descricao && (
                  <span className="text-[10px] text-muted-foreground truncate max-w-[250px]">{cargo.descricao}</span>
                )}
              </div>
            </TableCell>
            <TableCell className="font-mono text-[11px] font-medium">{cargo.cbo || 'Não inf.'}</TableCell>
            <TableCell>
              <Badge variant="outline" className="text-[10px] font-bold border-border/50 bg-muted/30">
                Lvl {cargo.nivel_hierarquico || 1}
              </Badge>
            </TableCell>
            <TableCell className="font-body text-right text-sm font-bold text-success">
              {cargo.salario_base ? formatCurrency(cargo.salario_base) : '-'}
            </TableCell>
            <TableCell>
              <Badge
                className={
                  cargo.ativo !== false
                    ? 'bg-success/10 text-success border-0 text-[10px]'
                    : 'bg-muted text-muted-foreground border-0 text-[10px]'
                }
              >
                {cargo.ativo !== false ? 'Ativo' : 'Inativo'}
              </Badge>
            </TableCell>
            <TableCell className="text-right pr-6">
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Editar cargo"
                  title="Editar"
                  onClick={() => openEditar(cargo)}
                  className="h-8 w-8 rounded-lg"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={cargo.ativo !== false ? 'Inativar cargo' : 'Ativar cargo'}
                  title={cargo.ativo !== false ? 'Inativar' : 'Ativar'}
                  disabled={isUpdating}
                  onClick={() => void handleToggleAtivo(cargo)}
                  className="h-8 w-8 rounded-lg"
                >
                  <Power className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        )}
      />
      <Dialog open={dialogOpen} onOpenChange={(o) => !isSaving && setDialogOpen(o)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Cargo' : 'Novo Cargo'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cargo-nome">Nome *</Label>
              <Input
                id="cargo-nome"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cargo-cbo">CBO</Label>
                <Input
                  id="cargo-cbo"
                  value={form.cbo}
                  onChange={(e) => setForm((f) => ({ ...f, cbo: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cargo-nivel">Nível hierárquico</Label>
                <Input
                  id="cargo-nivel"
                  type="number"
                  min={1}
                  step={1}
                  value={form.nivel_hierarquico}
                  onChange={(e) => setForm((f) => ({ ...f, nivel_hierarquico: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cargo-salario">Salário base (R$)</Label>
              <Input
                id="cargo-salario"
                inputMode="decimal"
                value={form.salario_base}
                onChange={(e) => setForm((f) => ({ ...f, salario_base: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cargo-descricao">Descrição</Label>
              <Textarea
                id="cargo-descricao"
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="cargo-ativo"
                checked={form.ativo}
                onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
              />
              <Label htmlFor="cargo-ativo">Ativo</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={isSaving} onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
