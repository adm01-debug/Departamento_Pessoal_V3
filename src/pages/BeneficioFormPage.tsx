import { PageTitle } from '@/components/PageTitle';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { PageLayout } from '@/components/layout';
import { FormField, FormSelect } from '@/components/forms';
import { FormSection, FormActions } from '@/components/forms/FormSection';
import { Button } from '@/components/ui/button';
import { useBeneficios } from '@/hooks/useBeneficios';
import { ArrowLeft, Save } from 'lucide-react';

interface BeneficioFormData {
  nome: string;
  tipo: string;
  valor: string;
  descricao: string;
  obrigatorio: boolean;
}

export default function BeneficioFormPage() {
  const navigate = useNavigate();
  const { criarBeneficio, tiposBeneficio } = useBeneficios();
  
  const { register, handleSubmit, control, formState: { errors } } = useForm<BeneficioFormData>({
    defaultValues: {
      tipo: 'alimentacao',
      obrigatorio: false
    }
  });

  const onSubmit = (data: BeneficioFormData) => {
    criarBeneficio.mutate({
      ...data,
      valor: parseFloat(data.valor) || 0,
      ativo: true
    }, {
      onSuccess: () => navigate('/beneficios')
    });
  };

  return (
    <>
    <PageTitle title="Novo Plano de Benefício" description="Configuração de novo pacote de benefícios" />
    <PageLayout 
      title="Novo Plano" 
      icon={<ArrowLeft className="h-5 w-5 cursor-pointer" onClick={() => navigate('/beneficios')} />}
    >
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
                  options={tiposBeneficio.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
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
               <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Elegibilidade</label>
               <div className="flex items-center gap-2">
                 <input type="checkbox" {...register('obrigatorio')} id="obrigatorio" className="rounded border-border" />
                 <label htmlFor="obrigatorio" className="text-sm">Benefício Obrigatório (Convenção Coletiva)</label>
               </div>
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
          <Button type="submit" disabled={criarBeneficio.isPending} className="rounded-xl gap-2 shadow-glow">
            {criarBeneficio.isPending ? 'Salvando...' : <><Save className="h-4 w-4" /> Salvar Plano</>}
          </Button>
        </FormActions>
      </form>
    </PageLayout>
    </>
  );
}
