import { PageTitle } from '@/components/PageTitle';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { FormField, FormSelect } from '@/components/forms';
import { FormSection, FormActions } from '@/components/forms/FormSection';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useBeneficios } from '@/hooks/useBeneficios';
import { useEmpresas } from '@/hooks/useEmpresas';
import { beneficioService } from '@/services/beneficioService';
import { ArrowLeft, Save } from 'lucide-react';

interface BeneficioFormData {
  nome: string;
  tipo: string;
  valor: string;
  descricao: string;
  obrigatorio_por_lei: boolean;
  ativo: boolean;
}

export default function BeneficioFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const qc = useQueryClient();
  const { empresaAtual } = useEmpresas();
  const { criarBeneficio, atualizarBeneficio, tiposBeneficio } = useBeneficios();

  const { data: beneficioAtual, isPending: carregando } = useQuery({
    queryKey: ['beneficio', id, empresaAtual?.id],
    queryFn: () => beneficioService.buscarPorId(id!, empresaAtual!.id),
    enabled: isEdit && !!empresaAtual?.id,
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<BeneficioFormData>({
    defaultValues: {
      tipo: 'alimentacao',
      obrigatorio_por_lei: false,
      ativo: true,
    },
  });

  useEffect(() => {
    if (!beneficioAtual) return;
    reset({
      nome: beneficioAtual.nome,
      tipo: beneficioAtual.tipo ?? 'alimentacao',
      valor: beneficioAtual.valor != null ? String(beneficioAtual.valor) : '',
      descricao: beneficioAtual.descricao ?? '',
      obrigatorio_por_lei: !!beneficioAtual.obrigatorio_por_lei,
      ativo: beneficioAtual.ativo !== false,
    });
  }, [beneficioAtual, reset]);

  const isPending = isEdit ? atualizarBeneficio.isPending : criarBeneficio.isPending;

  const onSubmit = async (data: BeneficioFormData) => {
    if (isEdit) {
      try {
        await atualizarBeneficio.mutateAsync({
          id: id!,
          dados: { ...data, valor: parseFloat(data.valor) || 0 },
        });
      } catch {
        // erro já notificado via toast em useGenericCrud
        return;
      }
      void qc.invalidateQueries({ queryKey: ['beneficios-full'] });
      void qc.invalidateQueries({ queryKey: ['beneficio', id] });
      navigate('/beneficios');
      return;
    }
    criarBeneficio.mutate(
      {
        ...data,
        valor: parseFloat(data.valor) || 0,
        ativo: true,
      },
      {
        onSuccess: () => navigate('/beneficios'),
      }
    );
  };

  return (
    <>
      <PageTitle
        title={isEdit ? 'Editar Plano de Benefício' : 'Novo Plano de Benefício'}
        description="Configuração de novo pacote de benefícios"
      />
      <PageLayout
        title={isEdit ? 'Editar Plano' : 'Novo Plano'}
        icon={<ArrowLeft className="h-5 w-5 cursor-pointer" onClick={() => navigate('/beneficios')} />}
      >
        {isEdit && carregando ? (
          <div className="flex justify-center p-12">
            <Spinner size="lg" />
          </div>
        ) : isEdit && !beneficioAtual ? (
          <p className="text-center text-muted-foreground p-12">Benefício não encontrado.</p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl mx-auto">
            <FormSection title="Definição do Plano" description="Informações básicas do benefício para a empresa">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  label="Nome do Plano"
                  placeholder="Ex: Vale Refeição Flex"
                  {...register('nome', { required: 'Nome é obrigatório' })}
                  error={errors.nome?.message}
                />

                <Controller
                  name="tipo"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <FormSelect
                      label="Tipo de Benefício"
                      options={tiposBeneficio.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />

                <FormField
                  label="Valor de Referência (R$)"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  {...register('valor', { required: 'Valor é obrigatório' })}
                  error={errors.valor?.message}
                />

                <div className="flex flex-col gap-2 pt-8">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Elegibilidade
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      {...register('obrigatorio_por_lei')}
                      id="obrigatorio_por_lei"
                      className="rounded border-border"
                    />
                    <label htmlFor="obrigatorio_por_lei" className="text-sm">
                      Benefício Obrigatório (Convenção Coletiva)
                    </label>
                  </div>
                  {isEdit && (
                    <div className="flex items-center gap-2">
                      <input type="checkbox" {...register('ativo')} id="ativo" className="rounded border-border" />
                      <label htmlFor="ativo" className="text-sm">
                        Benefício ativo
                      </label>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <FormField
                    label="Descrição / Observações"
                    placeholder="Detalhes sobre a operadora, regras de uso..."
                    {...register('descricao')}
                  />
                </div>
              </div>
            </FormSection>

            <FormActions>
              <Button type="button" variant="outline" onClick={() => navigate('/beneficios')} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} className="rounded-xl gap-2 shadow-glow">
                {isPending ? (
                  'Salvando...'
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Salvar Plano
                  </>
                )}
              </Button>
            </FormActions>
          </form>
        )}
      </PageLayout>
    </>
  );
}
