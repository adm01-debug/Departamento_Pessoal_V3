import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAfastamentos } from '@/hooks/useAfastamentos';
import { afastamentoService } from '@/services/afastamentoService';
import { useColaboradores } from '@/hooks/useColaboradores';
import { useEmpresas } from '@/hooks/useEmpresas';
import { Info, Calendar, Search, Stethoscope, AlertTriangle, Calendar as CalendarIcon, Zap, History as HistoryIcon } from 'lucide-react';
import { formatDate } from '@/utils/format';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { cn } from '@/lib/utils';
const schema = z.object({
  colaborador_id: z.string().min(1, 'Colaborador é obrigatório'),
  tipo: z.string().min(1, 'Tipo é obrigatório'),
  data_inicio: z.string().min(1, 'Data de início é obrigatória'),
  data_fim_prevista: z.string().min(1, 'Data de fim é obrigatória'),
  cid_id: z.string().optional(),
  nome_medico: z.string().optional(),
  crm_medico: z.string().optional(),
  observacoes: z.string().optional(),
  status: z.string().default('ativo'),
  data_pericia: z.string().optional().nullable(),
  local_pericia: z.string().optional().nullable(),
  protocolo_inss: z.string().optional().nullable(),
});

interface AfastamentoFormProps {
  onSuccess: () => void;
  initialData?: any;
}

export function AfastamentoForm({ onSuccess, initialData }: AfastamentoFormProps) {
  const { criar, atualizar, configs, isCriando, isAtualizando } = useAfastamentos();
  const { colaboradores } = useColaboradores();
  const { empresaAtual } = useEmpresas();
  const [diasInfo, setDiasInfo] = useState({ total: 0, empresa: 0, inss: 0 });
  const [cidSearch, setCidSearch] = useState('');
  const [cidResults, setCidResults] = useState<any[]>([]);
  const [selectedCid, setSelectedCid] = useState<any>(initialData?.cid || null);
  const [historicoRecente, setHistoricoRecente] = useState<any[]>([]);

  const [isVerificandoHistorico, setIsVerificandoHistorico] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialData || {
      status: 'ativo',
      tipo: 'doenca'
    }
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const watchInicio = watch('data_inicio');
  const watchFim = watch('data_fim_prevista');
  const watchTipo = watch('tipo');
  const watchColaboradorId = watch('colaborador_id');

  useEffect(() => {
    const carregarHistorico = async () => {
      if (watchColaboradorId && empresaAtual?.id) {
        setIsVerificandoHistorico(true);
        try {
          const res = await afastamentoService.listarHistoricoRecente(watchColaboradorId, empresaAtual.id);
          setHistoricoRecente(res);
        } catch (e) {

          console.error('Erro ao carregar histórico:', e);
        } finally {
          setIsVerificandoHistorico(false);
        }
      }
    };
    carregarHistorico();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchColaboradorId]);

  useEffect(() => {
    if (watchInicio && watchFim) {
      const total = afastamentoService.calcularDias(watchInicio, watchFim);
      const distribuicao = afastamentoService.calcularDistribuicaoDias(total, watchTipo, configs);
      setDiasInfo({ total, ...distribuicao });
    }
  }, [watchInicio, watchFim, watchTipo, configs]);

  useEffect(() => {
    const searchCID = async () => {
      if (cidSearch.length > 2) {
        const res = await afastamentoService.buscarCID(cidSearch);
        setCidResults(res);
      }
    };

    const timer = setTimeout(searchCID, 300);
    return () => clearTimeout(timer);
  }, [cidSearch]);

  const onSubmit = async (data: any) => {
    try {
      const payload = {
        ...data,
        cid_id: selectedCid?.id,
        dias_empresa: diasInfo.empresa,
        dias_inss: diasInfo.inss,
      };

      if (initialData?.id) {
        await atualizar({ id: initialData.id, data: payload });
      } else {
        await criar(payload);
      }
      onSuccess();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Colaborador</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between"
              >
                {(() => {
                  const currentId = watch('colaborador_id');
                  return currentId && Array.isArray(colaboradores)
                    ? (colaboradores as any[]).find((c: any) => c.id === currentId)?.nome_completo 
                    : "Selecionar colaborador...";
                })()}

                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Buscar colaborador..." />
                <CommandList>
                  <CommandEmpty>Nenhum colaborador encontrado.</CommandEmpty>
                  <CommandGroup>
                    {Array.isArray(colaboradores) && (colaboradores as any[]).map((c: any) => (
                      <CommandItem
                        key={c.id}
                        onSelect={() => setValue('colaborador_id', c.id)}
                      >
                        {c.nome_completo}
                      </CommandItem>
                    ))}

                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {errors.colaborador_id && <p className="text-xs text-destructive">{errors.colaborador_id.message as string}</p>}
          
          {historicoRecente.length > 0 && (
            <div className="mt-2 p-3 bg-blue-50/50 border border-blue-100 rounded-lg animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center gap-2 mb-2 text-blue-700">
                <HistoryIcon className="h-3 w-3" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Afastamentos Recentes (60 dias)</span>
              </div>
              <div className="space-y-1.5">
                {historicoRecente.map(h => (
                  <div key={h.id} className="text-[11px] flex justify-between items-center text-blue-800">
                    <span>{formatDate(h.data_inicio)} - {h.dias_total} dias</span>
                    <Badge variant="outline" className="h-4 text-[9px] bg-white/50 border-blue-200">CID: {h.cid?.codigo || 'N/A'}</Badge>
                  </div>
                ))}
                <p className="text-[9px] text-muted-foreground italic mt-2">
                  *Atenção: Mesma doença (CID) em 60 dias soma-se para o limite de 15 dias.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Motivo do Afastamento</Label>
          <Select 
            defaultValue={initialData?.tipo || 'doenca'}
            onValueChange={(val) => setValue('tipo', val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o motivo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="doenca">Doença</SelectItem>
              <SelectItem value="acidente_trabalho">Acidente de Trabalho</SelectItem>
              <SelectItem value="acidente_trajeto">Acidente de Trajeto</SelectItem>
              <SelectItem value="licenca_maternidade">Licença Maternidade</SelectItem>
              <SelectItem value="licenca_paternidade">Licença Paternidade</SelectItem>
              <SelectItem value="licenca_casamento">Licença Casamento</SelectItem>
              <SelectItem value="licenca_obito">Licença Óbito</SelectItem>
              <SelectItem value="licenca_nao_remunerada">Licença Não Remunerada</SelectItem>
              <SelectItem value="servico_militar">Serviço Militar</SelectItem>
              <SelectItem value="mandato_sindical">Mandato Sindical</SelectItem>
              <SelectItem value="suspensao_disciplinar">Suspensão Disciplinar</SelectItem>
              <SelectItem value="outros">Outros</SelectItem>
            </SelectContent>
          </Select>
          {errors.tipo && <p className="text-xs text-destructive">{errors.tipo.message as string}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Data de Início</Label>
          <Input type="date" {...register('data_inicio')} />
          {errors.data_inicio && <p className="text-xs text-destructive">{errors.data_inicio.message as string}</p>}
        </div>

        <div className="space-y-2">
          <Label>Data de Fim Prevista</Label>
          <Input type="date" {...register('data_fim_prevista')} />
          {errors.data_fim_prevista && <p className="text-xs text-destructive">{errors.data_fim_prevista.message as string}</p>}
        </div>
      </div>

      {diasInfo.total > 0 && (
        <Card className={cn("border-l-4", diasInfo.inss > 0 ? "border-l-warning bg-warning/5" : "border-l-primary bg-primary/5")}>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Resumo de Pagamento</p>
                <p className="text-sm">
                  <span className="font-bold">{diasInfo.total} dias</span> de afastamento no total.
                </p>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Empresa</p>
                  <p className="text-lg font-bold">{diasInfo.empresa}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">INSS</p>
                  <p className="text-lg font-bold text-warning">{diasInfo.inss}</p>
                </div>
              </div>
            </div>
            {diasInfo.inss > 0 && (
              <div className="mt-3 flex items-start gap-2 text-xs text-warning-foreground font-medium">
                <AlertTriangle className="h-3 w-3 mt-0.5" />
                <span>Excede 15 dias: Requer perícia e encaminhamento ao INSS.</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center gap-2 mb-2">
          <Stethoscope className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Dados Médicos</h3>
        </div>
        
        <div className="space-y-2">
          <Label>CID-10</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between font-normal h-auto py-2.5">
                {selectedCid ? (
                  <div className="flex flex-col items-start">
                    <span className="font-bold text-primary">{selectedCid.codigo}</span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[300px]">{selectedCid.descricao}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Buscar CID por código ou descrição...</span>
                )}
                <Search className="h-4 w-4 opacity-50 shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[450px] p-0 shadow-2xl" align="start">
              <Command shouldFilter={false}>
                <CommandInput 
                  placeholder="Pesquisar CID (ex: Z76)..." 
                  value={cidSearch} 
                  onValueChange={setCidSearch}
                />
                <CommandList>
                  {cidResults.length === 0 && cidSearch.length > 2 && <CommandEmpty>Nenhum CID encontrado para "{cidSearch}".</CommandEmpty>}
                  
                  {cidSearch.length <= 2 && (
                    <CommandGroup heading="CIDs Frequentes">
                      {[
                        { id: '1', codigo: 'Z76.0', descricao: 'Emissão de receita de repetição' },
                        { id: '2', codigo: 'R51', descricao: 'Cefaléia' },
                        { id: '3', codigo: 'J06.9', descricao: 'Infecção respiratória aguda' },
                        { id: '4', codigo: 'Z02.7', descricao: 'Exame para fins de atestado médico' },
                      ].map(c => (
                        <CommandItem key={c.codigo} onSelect={() => { setSelectedCid(c); setCidSearch(''); }}>
                          <Zap className="mr-2 h-3 w-3 text-amber-500" />
                          <span className="font-bold mr-2">{c.codigo}</span>
                          <span className="text-xs truncate">{c.descricao}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {cidResults.length > 0 && (
                    <>
                      <CommandSeparator />
                      <CommandGroup heading="Resultados da Busca">
                        {cidResults.map((c) => (
                          <CommandItem
                            key={c.id}
                            onSelect={() => {
                              setSelectedCid(c);
                              setCidSearch('');
                            }}
                          >
                            <span className="font-bold mr-2 text-primary">{c.codigo}</span>
                            <span className="text-xs truncate">{c.descricao}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome do Médico</Label>
            <Input placeholder="Dr(a)..." {...register('nome_medico')} />
          </div>
          <div className="space-y-2">
            <Label>CRM / UF</Label>
            <Input placeholder="000000/UF" {...register('crm_medico')} />
          </div>
        </div>
      </div>

      {diasInfo.inss > 0 && (
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center gap-2 mb-2">
            <CalendarIcon className="h-4 w-4 text-warning" />
            <h3 className="text-sm font-semibold">Agendamento de Perícia (INSS)</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data da Perícia</Label>
              <Input type="datetime-local" {...register('data_pericia')} />
            </div>
            <div className="space-y-2">
              <Label>Protocolo INSS</Label>
              <Input placeholder="Número do benefício/protocolo" {...register('protocolo_inss')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Local da Perícia</Label>
            <Input placeholder="Endereço da agência da Previdência" {...register('local_pericia')} />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Observações Internas</Label>
        <Textarea placeholder="Histórico, observações importantes..." {...register('observacoes')} />
      </div>

      <div className="sticky bottom-0 bg-background pt-2 border-t">
        <Button type="submit" className="w-full" disabled={isCriando || isAtualizando}>
          {isCriando || isAtualizando ? 'Processando...' : (initialData ? 'Salvar Alterações' : 'Concluir Registro')}
        </Button>
      </div>
    </form>
  );
}