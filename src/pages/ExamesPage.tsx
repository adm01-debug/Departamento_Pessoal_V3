import { PageTitle } from '@/components/PageTitle';
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { DataTableToolbar } from '@/components/ui/data-table-toolbar';
import { TableSkeleton } from '@/components/ui/module-skeleton';
import { ExameKPIs, ExameTable, ExameFormDialog, ExameTipoChart } from '@/components/exames';
import { supabase } from '@/integrations/supabase/client';
import { colaboradorService } from '@/services';
import { useEmpresas } from '@/hooks';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { Stethoscope } from 'lucide-react';

const tipoOptions = [
  { value: 'admissional', label: 'Admissional' },
  { value: 'periodico', label: 'Periódico' },
  { value: 'retorno_trabalho', label: 'Retorno ao Trabalho' },
  { value: 'mudanca_funcao', label: 'Mudança de Função' },
  { value: 'demissional', label: 'Demissional' },
];

const resultadoOptions = [
  { value: 'apto', label: 'Apto' },
  { value: 'inapto', label: 'Inapto' },
  { value: 'apto_restricao', label: 'Apto c/ Restrição' },
];

export default function ExamesPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [resultadoFilter, setResultadoFilter] = useState('');

  const { data: exames = [], isLoading } = useQuery({
    queryKey: ['exames'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exames')
        .select('*, colaborador:colaboradores(nome_completo)')
        .order('data_exame', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores', empresaAtual?.id],
    queryFn: () => colaboradorService.list(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });

  const criar = useMutation({
    mutationFn: async (d: any) => {
      const { error } = await supabase.from('exames').insert({
        colaborador_id: d.colaborador_id,
        tipo: d.tipo,
        data_exame: d.data_exame || null,
        data_validade: d.data_validade || null,
        medico: d.medico || null,
        crm: d.crm || null,
        resultado: d.resultado || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exames'] });
      toast.success('Exame registrado com sucesso!');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao salvar exame.')),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exames').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exames'] });
      toast.success('Exame excluído!');
    },
  });

  const filtered = useMemo(() => exames.filter((e: any) => {
    if (tipoFilter && tipoFilter !== 'all' && e.tipo !== tipoFilter) return false;
    if (resultadoFilter && resultadoFilter !== 'all' && e.resultado !== resultadoFilter) return false;
    if (search) {
      const nome = (e.colaborador?.nome_completo || '').toLowerCase();
      const medico = (e.medico || '').toLowerCase();
      const q = search.toLowerCase();
      if (!nome.includes(q) && !medico.includes(q)) return false;
    }
    return true;
  }), [exames, tipoFilter, resultadoFilter, search]);

  return (
    <>
    <PageTitle title="Exames / ASOs" description="Controle de exames ocupacionais" />
    <PageLayout
      title="Exames Ocupacionais"
      description="Controle de exames médicos obrigatórios — NR-7 / PCMSO"
      icon={<Stethoscope className="h-5 w-5 text-primary-foreground" />}
      gradient="from-primary to-accent"
    >
      <ExameKPIs data={exames} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por colaborador ou médico..."
              filters={[
                { key: 'tipo', label: 'Tipo', options: tipoOptions, value: tipoFilter, onChange: setTipoFilter },
                { key: 'resultado', label: 'Resultado', options: resultadoOptions, value: resultadoFilter, onChange: setResultadoFilter },
              ]}
              onClearFilters={() => { setSearch(''); setTipoFilter(''); setResultadoFilter(''); }}
            />
            <ExameFormDialog
              colaboradores={colaboradores}
              onSubmit={(form) => criar.mutate(form)}
              isPending={criar.isPending}
            />
          </div>

          {isLoading ? (
            <TableSkeleton rows={5} columns={7} />
          ) : (
            <ExameTable data={filtered} onExcluir={(id) => excluir.mutate(id)} />
          )}
        </div>

        <div>
          <ExameTipoChart data={exames} />
        </div>
      </div>
    </PageLayout>
    </>
  );
}
