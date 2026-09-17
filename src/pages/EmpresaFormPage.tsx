import { PageTitle } from '@/components/PageTitle';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageLayout } from '@/components/layout';
import { FormField } from '@/components/forms';
import { CNPJInput } from '@/components/ui/cnpj-input';
import { CEPInput, type Address } from '@/components/ui/cep-input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { empresaService } from '@/services';
import { Empresa } from '@/types/entities';
import { empresaSchema, type EmpresaSchema, type EmpresaSchemaInput } from '@/schemas';

import { useNotification } from '@/contexts';
import { 
  Building2, MapPin, Phone, Mail, 
  ArrowLeft, Save, Loader2, Camera, ShieldCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useFormGuard } from '@/hooks/useFormGuard';
import { useServerValidation } from '@/hooks/useServerValidation';

export default function EmpresaFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { success, error: notifyError } = useNotification();
  const { handleServerError } = useServerValidation<EmpresaSchemaInput>();
  const [activeTab, setActiveTab] = useState('geral');
  const isEditing = !!id;

  const { data: empresa, isLoading } = useQuery<Empresa>({
    queryKey: ['empresa', id],
    queryFn: () => (empresaService as any).buscarPorId(id!),
    enabled: isEditing,
  });


  const { register, handleSubmit, setValue, reset, watch, setError, formState: { errors, isDirty } } = useForm<EmpresaSchemaInput, unknown, EmpresaSchema>({
    resolver: zodResolver(empresaSchema),
    defaultValues: { ativa: true },
  });

  // Proteção contra perda de dados
  useFormGuard(isDirty);

  useEffect(() => {
    if (empresa) {
      reset({
        razao_social: empresa.razao_social,
        nome_fantasia: empresa.nome_fantasia || '',
        cnpj: empresa.cnpj || '',
        inscricao_estadual: empresa.inscricao_estadual || '',
        email: empresa.email || '',
        telefone: empresa.telefone || '',
        cep: empresa.cep || '',
        logradouro: empresa.logradouro || '',
        numero: empresa.numero || '',
        bairro: empresa.bairro || '',
        cidade: empresa.cidade || '',
        uf: empresa.uf || '',
        ativa: empresa.ativa ?? true,
      });
    }
  }, [empresa, reset]);

  const mutation = useMutation({
    mutationFn: (data: EmpresaSchema) => isEditing ? empresaService.atualizar(id!, data as any) : empresaService.criar(data as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['empresas'] });
      success(isEditing ? 'Empresa atualizada!' : 'Empresa criada!');
      navigate('/empresas');
    },
    onError: (err: any) => handleServerError(err, setError),
  });

  const handleAddressFound = (addr: Address) => {
    setValue('logradouro', addr.logradouro);
    setValue('bairro', addr.bairro);
    setValue('cidade', addr.cidade);
    setValue('uf', addr.uf);
    setValue('cep', addr.cep);
  };

  if (isLoading) return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;

  const tabs = [
    { id: 'geral', label: 'Dados Cadastrais', icon: Building2 },
    { id: 'contato', label: 'Contato', icon: Phone },
    { id: 'endereco', label: 'Endereço', icon: MapPin },
  ];

  return (
    <>
      <PageTitle title={isEditing ? 'Editar Empresa' : 'Nova Empresa'} />
      <PageLayout
        title={isEditing ? empresa?.razao_social : 'Nova Empresa'}
        description={isEditing ? `CNPJ: ${empresa?.cnpj}` : 'Cadastre uma nova filial ou empresa parceira'}
        icon={<Building2 className="h-5 w-5 text-primary-foreground" />}
        gradient="from-primary to-primary-glow"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => navigate('/empresas')}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar
            </Button>
            <Button 
              size="sm" 
              className="rounded-xl bg-gradient-to-r from-primary to-primary-glow shadow-glow"
              onClick={handleSubmit((data) => mutation.mutate(data))}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
              {isEditing ? 'Salvar Alterações' : 'Cadastrar Empresa'}
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

          <TabsContent value="geral">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
                <CardHeader>
                  <CardTitle className="font-display">Dados Identificadores</CardTitle>
                  <CardDescription>Informações legais e fiscais da empresa</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-32 w-32 rounded-3xl bg-muted flex items-center justify-center border-2 border-dashed border-border/50 relative group cursor-pointer hover:bg-muted/80 transition-colors">
                        <Camera className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 rounded-3xl transition-opacity flex items-center justify-center">
                          <span className="text-[10px] font-medium uppercase text-primary">Logo Empresa</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="rounded-full">PNG / SVG</Badge>
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium flex items-center gap-1.5">
                            CNPJ <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-wide bg-muted px-1.5 rounded-md">Busca Automática</span>
                          </Label>
                          <CNPJInput
                            // eslint-disable-next-line react-hooks/incompatible-library
                            value={watch('cnpj')}
                            onChange={(v) => setValue('cnpj', v)}
                            onCompanyFound={(data) => {
                              setValue('razao_social', data.razao_social);
                              if (data.nome_fantasia) setValue('nome_fantasia', data.nome_fantasia);
                              if (data.email) setValue('email', data.email);
                              if (data.telefone) setValue('telefone', data.telefone);
                              if (data.cep) setValue('cep', data.cep);
                              if (data.logradouro) setValue('logradouro', data.logradouro);
                              if (data.numero) setValue('numero', data.numero);
                              if (data.bairro) setValue('bairro', data.bairro);
                              if (data.municipio) setValue('cidade', data.municipio);
                              if (data.uf) setValue('uf', data.uf);
                            }}
                          />
                          {errors.cnpj && <p className="text-xs text-destructive">{errors.cnpj.message}</p>}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label="Razão Social" {...register('razao_social')} error={errors.razao_social?.message} placeholder="Nome jurídico completo" />
                        <FormField label="Nome Fantasia" {...register('nome_fantasia')} placeholder="Nome comercial" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/20">
                    <FormField label="Inscrição Estadual" {...register('inscricao_estadual')} placeholder="Apenas números" />
                    <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/30">
                      <div className="space-y-0.5">
                        <Label className="font-display font-semibold">Empresa Ativa</Label>
                        <p className="text-[11px] text-muted-foreground">Define se a empresa aparece nos filtros e dashboards</p>
                      </div>
                      <ShieldCheck className={cn("h-6 w-6 transition-colors", watch('ativa') ? "text-success" : "text-muted-foreground/30")} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="contato">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
                <CardHeader>
                  <CardTitle className="font-display">Canais de Comunicação</CardTitle>
                  <CardDescription>Email e telefone para avisos do sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1">
                        <Mail className="h-4 w-4" /> Email Corporativo
                      </div>
                      <FormField label="Email" type="email" {...register('email')} placeholder="rh@empresa.com.br" />
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1">
                        <Phone className="h-4 w-4" /> Telefone Principal
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Número de Contato</Label>
                        <PhoneInput value={watch('telefone')} onChange={(v) => setValue('telefone', v)} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="endereco">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
                <CardHeader>
                  <CardTitle className="font-display">Sede / Endereço Fiscal</CardTitle>
                  <CardDescription>Localização física para o eSocial</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="max-w-xs space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      CEP <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-wide bg-muted px-1.5 rounded-md">Busca Automática</span>
                    </Label>
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
                    <FormField label="Cidade" {...register('cidade')} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField label="UF" {...register('uf')} maxLength={2} placeholder="SP" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-6 border-t border-border/20">
          <Button type="button" variant="outline" className="rounded-xl px-8" onClick={() => navigate('/empresas')}>
            Descartar Alterações
          </Button>
          <Button 
            className="rounded-xl bg-gradient-to-r from-primary to-primary-glow px-12 shadow-glow"
            onClick={handleSubmit((data) => mutation.mutate(data))}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Finalizar Cadastro
          </Button>
        </div>
      </PageLayout>
    </>
  );
}
