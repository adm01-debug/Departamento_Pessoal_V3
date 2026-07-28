import { PageTitle } from '@/components/PageTitle';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { PageLayout } from '@/components/layout';
import { FormField, FormSelect } from '@/components/forms';
import { CPFInput } from '@/components/ui/cpf-input';
import { PhoneInput } from '@/components/ui/phone-input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { CEPInput, type Address } from '@/components/ui/cep-input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { colaboradorService } from '@/services';
import { useNotification } from '@/contexts';
import { 
  User, MapPin, Landmark, Briefcase, 
  FileText, Save, Loader2, Camera
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { useCargos } from '@/hooks/useCargos';
import { useFormGuard } from '@/hooks/useFormGuard';
import { useServerValidation } from '@/hooks/useServerValidation';

const schema = z.object({
  // Geral
  nome_completo: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  nome_social: z.string().optional(),
  cpf: z.string().length(11, 'CPF inválido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefone: z.string().optional(),
  celular: z.string().optional(),
  data_nascimento: z.string().min(1, 'Data de nascimento obrigatória'),
  sexo: z.enum(['masculino', 'feminino', 'outro']).default('masculino'),
  estado_civil: z.enum(['solteiro', 'casado', 'divorciado', 'viuvo', 'uniao_estavel']).default('solteiro'),
  nome_mae: z.string().min(1, 'Nome da mãe obrigatório'),
  nome_pai: z.string().optional(),
  
  // Endereço
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().optional(),

  // Profissional
  data_admissao: z.string().min(1, 'Data obrigatória'),
  salario_base: z.number().positive('Salário deve ser positivo'),
  cargo: z.string().min(1, 'Cargo obrigatório'),
  departamento: z.string().min(1, 'Departamento obrigatório'),
  tipo_contrato: z.enum(['clt', 'pj', 'estagio', 'temporario', 'autonomo']).default('clt'),
  status: z.string().default('ativo'),
  matricula: z.string().optional(),

  // Bancário
  banco_codigo: z.string().optional(),
  agencia: z.string().optional(),
  conta: z.string().optional(),
  tipo_conta: z.string().optional(),
  pix_chave: z.string().optional(),

  // Documentos
  rg: z.string().optional(),
  rg_orgao_emissor: z.string().optional(),
  pis_pasep: z.string().optional(),
  ctps_numero: z.string().optional(),
  ctps_serie: z.string().optional()});

type FormData = z.infer<typeof schema>;
type FormInput = z.input<typeof schema>;

export default function ColaboradorFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error: notifyError } = useNotification();
  const { handleServerError } = useServerValidation<FormInput>();
  const [activeTab, setActiveTab] = useState('geral');
  const isEditing = !!id;

  const { departamentos } = useDepartamentos();
  const { cargos } = useCargos();

  const { data: colaborador, isLoading } = useQuery({
    queryKey: ['colaborador', id],
    queryFn: () => (colaboradorService as any).buscarPorId(id!),
    enabled: isEditing});


  const { register, handleSubmit, formState: { errors, isDirty }, setValue, reset, watch, setError } = useForm<FormInput, unknown, FormData>({
    resolver: zodResolver(schema),
    defaultValues: { 
      status: 'ativo', 
      estado_civil: 'solteiro', 
      tipo_contrato: 'clt',
      sexo: 'masculino'
    }});

  // Proteção contra perda de dados
  useFormGuard(isDirty);

  useEffect(() => {
    if (colaborador) {
      reset(colaborador as any);
    }
  }, [colaborador, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => isEditing ? (colaboradorService as any).atualizar(id!, data as any) : (colaboradorService as any).criar(data as any),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      success(isEditing ? 'Colaborador atualizado!' : 'Colaborador criado!');
      navigate('/colaboradores');
    },
    onError: (err: any) => handleServerError(err, setError)});

  const handleAddressFound = (addr: Address) => {
    setValue('logradouro', addr.logradouro);
    setValue('bairro', addr.bairro);
    setValue('cidade', addr.cidade);
    setValue('uf', addr.uf);
    setValue('cep', addr.cep);
  };

  if (isLoading) return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;

  const tabs = [
    { id: 'geral', label: 'Dados Gerais', icon: User },
    { id: 'profissional', label: 'Profissional', icon: Briefcase },
    { id: 'endereco', label: 'Endereço', icon: MapPin },
    { id: 'bancario', label: 'Financeiro', icon: Landmark },
    { id: 'documentos', label: 'Documentação', icon: FileText },
  ];

  return (
    <>
      <PageTitle title={isEditing ? colaborador?.nome_completo || 'Editar Colaborador' : 'Novo Colaborador'} />
      <PageLayout
        title={isEditing ? colaborador?.nome_completo : 'Novo Colaborador'}
        description={isEditing ? `Perfil profissional · Matrícula ${colaborador?.matricula || 'N/A'}` : 'Cadastre as informações essenciais para a integração do novo talento'}
        icon={<User className="h-5 w-5 text-primary-foreground" />}
        backTo="/colaboradores"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-11 rounded-xl px-4 shadow-xs bg-card/50" onClick={() => navigate('/colaboradores')}>
              Cancelar
            </Button>
            <Button 
              className="h-11 rounded-xl px-6 gap-2 bg-primary text-primary-foreground shadow-glow hover:shadow-glow-lg transition-all"
              onClick={handleSubmit((data) => mutation.mutate(data))}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>{isEditing ? 'Salvar Alterações' : 'Cadastrar agora'}</span>
            </Button>
          </div>
        }
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50 rounded-xl p-1 border border-border/30 w-full justify-start overflow-x-auto no-scrollbar">
            {tabs.map(tab => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id} 
                className="rounded-lg font-body data-[state=active]:bg-card data-[state=active]:shadow-xs px-6 gap-2"
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* TAB GERAL */}
          <TabsContent value="geral">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
                <CardHeader>
                  <CardTitle className="font-display">Informações Pessoais</CardTitle>
                  <CardDescription>Dados básicos de identificação e contato</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-32 w-32 rounded-3xl bg-muted flex items-center justify-center border-2 border-dashed border-border/50 relative group cursor-pointer hover:bg-muted/80 transition-colors">
                        <Camera className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 rounded-3xl transition-opacity flex items-center justify-center">
                          <span className="text-[10px] font-bold uppercase text-primary">Alterar Foto</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="rounded-full">Foto DP</Badge>
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField label="Nome Completo" {...register('nome_completo')} error={errors.nome_completo?.message} placeholder="Ex: João da Silva" />
                      <FormField label="Nome Social / Apelido" {...register('nome_social')} error={errors.nome_social?.message} placeholder="Como o colaborador prefere ser chamado" />
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">CPF</label>
                        {/* eslint-disable-next-line react-hooks/incompatible-library */}
                        <CPFInput value={watch('cpf')} onChange={(v) => setValue('cpf', v)} />
                        {errors.cpf && <p className="text-xs text-destructive">{errors.cpf.message}</p>}
                      </div>

                      <FormField label="Data Nascimento" type="date" {...register('data_nascimento')} error={errors.data_nascimento?.message} />
                      
                      <FormField label="Email Pessoal" type="email" {...register('email')} error={errors.email?.message} placeholder="joao@exemplo.com" />
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Celular (WhatsApp)</label>
                        <PhoneInput value={watch('celular') || watch('telefone')} onChange={(v) => setValue('celular', v)} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border/20">
                    <FormSelect 
                      label="Sexo" 
                      value={watch('sexo')}
                      options={[{ value: 'masculino', label: 'Masculino' }, { value: 'feminino', label: 'Feminino' }, { value: 'outro', label: 'Outro' }]} 
                      onChange={(v) => setValue('sexo', v as any)} 
                    />
                    <FormSelect 
                      label="Estado Civil" 
                      value={watch('estado_civil')}
                      options={[
                        { value: 'solteiro', label: 'Solteiro(a)' }, { value: 'casado', label: 'Casado(a)' },
                        { value: 'divorciado', label: 'Divorciado(a)' }, { value: 'viuvo', label: 'Viúvo(a)' },
                        { value: 'uniao_estavel', label: 'União Estável' },
                      ]} 
                      onChange={(v) => setValue('estado_civil', v as any)} 
                    />
                    <FormField label="Matrícula Interna" {...register('matricula')} placeholder="Ex: 0001" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Nome da Mãe" {...register('nome_mae')} error={errors.nome_mae?.message} />
                    <FormField label="Nome do Pai (Opcional)" {...register('nome_pai')} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* TAB PROFISSIONAL */}
          <TabsContent value="profissional">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
                <CardHeader>
                  <CardTitle className="font-display">Dados Profissionais</CardTitle>
                  <CardDescription>Cargo, departamento e remuneração</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField label="Data Admissão" type="date" {...register('data_admissao')} error={errors.data_admissao?.message} />
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Salário Base</label>
                      <CurrencyInput value={watch('salario_base')} onChange={(v) => setValue('salario_base', v)} />
                      {errors.salario_base && <p className="text-xs text-destructive">{errors.salario_base.message}</p>}
                    </div>
                    <FormSelect 
                      label="Tipo de Contrato" 
                      value={watch('tipo_contrato')}
                      options={[
                        { value: 'clt', label: 'CLT (Efetivo)' }, { value: 'pj', label: 'PJ (Prestador)' },
                        { value: 'estagio', label: 'Estágio' }, { value: 'temporario', label: 'Temporário' },
                      ]} 
                      onChange={(v) => setValue('tipo_contrato', v as any)} 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormSelect 
                      label="Cargo" 
                      value={watch('cargo')}
                      options={cargos.map(c => ({ value: c.nome, label: c.nome }))}
                      onChange={(v) => setValue('cargo', v)}
                      error={errors.cargo?.message}
                    />
                    <FormSelect 
                      label="Departamento" 
                      value={watch('departamento')}
                      options={departamentos.map(d => ({ value: d.nome, label: d.nome }))}
                      onChange={(v) => setValue('departamento', v)}
                      error={errors.departamento?.message}
                    />
                  </div>

                  <div className="pt-4 border-t border-border/20">
                    <FormSelect 
                      label="Status Atual" 
                      value={watch('status')}
                      options={[
                        { value: 'ativo', label: 'Ativo' }, 
                        { value: 'afastado', label: 'Afastado' },
                        { value: 'ferias', label: 'Em Férias' },
                        { value: 'inativo', label: 'Desligado' },
                      ]} 
                      onChange={(v) => setValue('status', v)} 
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* TAB ENDEREÇO */}
          <TabsContent value="endereco">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
                <CardHeader>
                  <CardTitle className="font-display">Endereço Residencial</CardTitle>
                  <CardDescription>Local de moradia do colaborador para fins de benefícios e transporte</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="max-w-xs space-y-2">
                    <label className="text-sm font-medium">CEP</label>
                    <CEPInput value={watch('cep')} onAddressFound={handleAddressFound} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <FormField label="Logradouro" {...register('logradouro')} placeholder="Rua, Avenida, etc" />
                    </div>
                    <FormField label="Número" {...register('numero')} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Bairro" {...register('bairro')} />
                    <FormField label="Complemento" {...register('complemento')} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <FormField label="Cidade" {...register('cidade')} />
                    </div>
                    <FormField label="UF" {...register('uf')} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* TAB FINANCEIRO */}
          <TabsContent value="bancario">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2">
                    <Landmark className="h-5 w-5 text-primary" />
                    Dados Bancários para Pagamento
                  </CardTitle>
                  <CardDescription>Configure como o colaborador receberá seus proventos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Código do Banco" {...register('banco_codigo')} placeholder="Ex: 001, 341, 033" />
                    <FormSelect 
                      label="Tipo de Conta" 
                      value={watch('tipo_conta')}
                      options={[
                        { value: 'corrente', label: 'Conta Corrente' }, 
                        { value: 'poupanca', label: 'Poupança' },
                      ]}
                      onChange={(v) => setValue('tipo_conta', v)}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField label="Agência" {...register('agencia')} />
                    <FormField label="Conta com DV" {...register('conta')} />
                    <FormField label="Chave PIX (Opcional)" {...register('pix_chave')} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* TAB DOCUMENTOS */}
          <TabsContent value="documentos">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Documentos Complementares (eSocial)
                  </CardTitle>
                  <CardDescription>Informações obrigatórias para o envio de eventos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="RG / Identidade" {...register('rg')} />
                    <FormField label="Órgão Emissor" {...register('rg_orgao_emissor')} placeholder="Ex: SSP/SP" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField label="PIS/PASEP" {...register('pis_pasep')} />
                    <FormField label="CTPS Número" {...register('ctps_numero')} />
                    <FormField label="CTPS Série" {...register('ctps_serie')} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </PageLayout>
    </>
  );
}
