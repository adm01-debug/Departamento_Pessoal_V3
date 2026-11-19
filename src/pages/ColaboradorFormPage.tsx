import { PageTitle } from '@/components/PageTitle';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { normalizarPayloadColaborador } from './colaboradorPayload';
import { colaboradorFormSchema, type ColaboradorFormData, type ColaboradorFormInput } from './colaboradorFormSchema';
import { useNotification } from '@/contexts';
import { User, MapPin, Landmark, Briefcase, FileText, Save, Loader2, Camera } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { useCargos } from '@/hooks/useCargos';
import { useFormGuard } from '@/hooks/useFormGuard';
import { useServerValidation } from '@/hooks/useServerValidation';
import { useEmpresas } from '@/hooks';
import { DefinirPinQuiosqueDialog } from '@/components/ponto/DefinirPinQuiosqueDialog';

type FormData = ColaboradorFormData;
type FormInput = ColaboradorFormInput;

export default function ColaboradorFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success } = useNotification();
  const { handleServerError } = useServerValidation<FormInput>();
  const [activeTab, setActiveTab] = useState('geral');
  const isEditing = !!id;

  // pageSize 100 (teto do BaseService): os selects do formulario precisam da
  // lista inteira da empresa, nao da primeira pagina da tela administrativa.
  const { departamentos } = useDepartamentos({ pageSize: 100 });
  const { cargos } = useCargos({ pageSize: 100 });
  const { empresaAtual } = useEmpresas();

  const { data: colaborador, isLoading } = useQuery({
    queryKey: ['colaborador', id, empresaAtual?.id],
    queryFn: () => colaboradorService.buscarPorId(id!, empresaAtual!.id),
    enabled: isEditing && !!empresaAtual?.id,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    reset,
    watch,
    setError,
  } = useForm<FormInput, unknown, FormData>({
    resolver: zodResolver(colaboradorFormSchema),
    defaultValues: {
      status: 'ativo',
      estado_civil: 'solteiro',
      tipo_contrato: 'clt',
      sexo: 'masculino',
    },
  });

  // Proteção contra perda de dados
  useFormGuard(isDirty);

  useEffect(() => {
    if (colaborador) {
      reset(colaborador as unknown as FormInput);
    }
  }, [colaborador, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      if (!empresaAtual?.id) throw new Error('Empresa atual não identificada');
      // Campo opcional em branco precisa virar NULL, não '' — ver
      // `colaboradorPayload.ts` (o índice único de `matricula` colide em '').
      const payload = normalizarPayloadColaborador(data);
      return isEditing
        ? colaboradorService.atualizar(id!, payload, empresaAtual.id)
        : colaboradorService.criar({ ...payload, empresa_id: empresaAtual.id });
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      // ['colaboradores'] (plural) NÃO casa com ['colaborador', id, empresaId]:
      // o React Query compara segmento a segmento e o primeiro já difere. Sem
      // esta linha, o dossiê do colaborador seguia mostrando o dado antigo por
      // até 5 minutos (staleTime) depois de uma edição.
      queryClient.invalidateQueries({ queryKey: ['colaborador'] });
      success(isEditing ? 'Colaborador atualizado!' : 'Colaborador criado!');
      navigate('/colaboradores');
    },
    onError: (err: unknown) => handleServerError(err, setError),
  });

  const handleAddressFound = (addr: Address) => {
    setValue('logradouro', addr.logradouro);
    setValue('bairro', addr.bairro);
    setValue('cidade', addr.cidade);
    setValue('uf', addr.uf);
    setValue('cep', addr.cep);
  };

  if (isLoading)
    return (
      <div className="flex justify-center p-12">
        <Spinner size="lg" />
      </div>
    );

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
        description={
          isEditing
            ? `Perfil profissional · Matrícula ${colaborador?.matricula || 'N/A'}`
            : 'Cadastre as informações essenciais para a integração do novo talento'
        }
        icon={<User className="h-5 w-5 text-primary-foreground" />}
        backTo="/colaboradores"
        actions={
          <div className="flex items-center gap-2">
            {isEditing && id && <DefinirPinQuiosqueDialog colaboradorId={id} />}
            <Button
              variant="outline"
              className="h-11 rounded-xl px-4 shadow-xs bg-card/50"
              onClick={() => navigate('/colaboradores')}
            >
              Cancelar
            </Button>
            <Button
              className="h-11 rounded-xl px-6 gap-2 bg-primary text-primary-foreground shadow-glow hover:shadow-glow-lg transition-all"
              onClick={handleSubmit((data) => mutation.mutate(data))}
              disabled={mutation.isPending || !empresaAtual?.id}
            >
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>{isEditing ? 'Salvar Alterações' : 'Cadastrar agora'}</span>
            </Button>
          </div>
        }
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50 rounded-xl p-1 border border-border/30 w-full justify-start overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
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
                      <Badge variant="outline" className="rounded-full">
                        Foto DP
                      </Badge>
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        label="Nome Completo"
                        {...register('nome_completo')}
                        error={errors.nome_completo?.message}
                        placeholder="Ex: João da Silva"
                      />
                      <FormField
                        label="Nome Social / Apelido"
                        {...register('nome_social')}
                        error={errors.nome_social?.message}
                        placeholder="Como o colaborador prefere ser chamado"
                      />

                      <div className="space-y-2">
                        <label className="text-sm font-medium">CPF</label>
                        {/* eslint-disable-next-line react-hooks/incompatible-library */}
                        <CPFInput value={watch('cpf')} onChange={(v) => setValue('cpf', v)} />
                        {errors.cpf && <p className="text-xs text-destructive">{errors.cpf.message}</p>}
                      </div>

                      <FormField
                        label="Data Nascimento"
                        type="date"
                        {...register('data_nascimento')}
                        error={errors.data_nascimento?.message}
                      />

                      <FormField
                        label="Email Pessoal"
                        type="email"
                        {...register('email')}
                        error={errors.email?.message}
                        placeholder="joao@exemplo.com"
                      />

                      {/* Dois campos independentes. Antes havia UM só, que
                          mostrava `celular || telefone` e gravava apenas em
                          `celular`: o telefone fixo do cadastro aparecia dentro
                          da caixa do celular e não tinha como ser corrigido nem
                          cadastrado pela tela — editar ali criava um celular e
                          deixava o fixo desatualizado para sempre. */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="colaborador-celular">
                          Celular (WhatsApp)
                        </label>
                        <PhoneInput
                          id="colaborador-celular"
                          value={watch('celular') ?? ''}
                          onChange={(v) => setValue('celular', v, { shouldDirty: true })}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="colaborador-telefone">
                          Telefone fixo
                        </label>
                        <PhoneInput
                          id="colaborador-telefone"
                          value={watch('telefone') ?? ''}
                          onChange={(v) => setValue('telefone', v, { shouldDirty: true })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border/20">
                    <FormSelect
                      label="Sexo"
                      value={watch('sexo')}
                      options={[
                        { value: 'masculino', label: 'Masculino' },
                        { value: 'feminino', label: 'Feminino' },
                      ]}
                      onChange={(v) => setValue('sexo', v as FormData['sexo'])}
                    />
                    <FormSelect
                      label="Estado Civil"
                      value={watch('estado_civil')}
                      options={[
                        { value: 'solteiro', label: 'Solteiro(a)' },
                        { value: 'casado', label: 'Casado(a)' },
                        { value: 'divorciado', label: 'Divorciado(a)' },
                        { value: 'viuvo', label: 'Viúvo(a)' },
                        { value: 'separado', label: 'Separado(a)' },
                        { value: 'uniao_estavel', label: 'União Estável' },
                      ]}
                      onChange={(v) => setValue('estado_civil', v as FormData['estado_civil'])}
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
                    <FormField
                      label="Data Admissão"
                      type="date"
                      {...register('data_admissao')}
                      error={errors.data_admissao?.message}
                    />
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Salário Base</label>
                      <CurrencyInput value={watch('salario_base')} onChange={(v) => setValue('salario_base', v)} />
                      {errors.salario_base && <p className="text-xs text-destructive">{errors.salario_base.message}</p>}
                    </div>
                    <FormSelect
                      label="Tipo de Contrato"
                      value={watch('tipo_contrato')}
                      options={[
                        { value: 'clt', label: 'CLT (Efetivo)' },
                        { value: 'pj', label: 'PJ (Prestador)' },
                        { value: 'estagiario', label: 'Estagiário' },
                        { value: 'temporario', label: 'Temporário' },
                        { value: 'intermitente', label: 'Intermitente' },
                        { value: 'aprendiz', label: 'Jovem Aprendiz' },
                      ]}
                      onChange={(v) => setValue('tipo_contrato', v as FormData['tipo_contrato'])}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormSelect
                      label="Cargo"
                      value={watch('cargo')}
                      options={cargos.map((c) => ({ value: c.nome, label: c.nome }))}
                      onChange={(v) => setValue('cargo', v)}
                      error={errors.cargo?.message}
                    />
                    <FormSelect
                      label="Departamento"
                      value={watch('departamento')}
                      options={departamentos.map((d) => ({ value: d.nome, label: d.nome }))}
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
                        // Era `inativo`, valor que NÃO existe no enum
                        // `status_colaborador` do banco (ativo | ferias |
                        // afastado | desligado | pendente): escolher
                        // "Desligado" aqui fazia o salvamento falhar com erro
                        // cru do Postgres.
                        { value: 'desligado', label: 'Desligado' },
                        { value: 'pendente', label: 'Pendente' },
                      ]}
                      onChange={(v) => setValue('status', v as FormData['status'])}
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
                  <CardDescription>
                    Local de moradia do colaborador para fins de benefícios e transporte
                  </CardDescription>
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
