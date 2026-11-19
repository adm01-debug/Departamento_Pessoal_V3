import { PageTitle } from '@/components/PageTitle';
import { useState, useCallback } from 'react';
import { PageLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Calculator, Check, ChevronsUpDown, Download, History, Save, Shield, Loader2, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { aliquotaEfetiva, calcularRescisao, fmt, type RescisaoResult } from '@/utils/rescisaoCalc';
import { LABEL_ORIGEM_CALCULO, formatarMomentoCalculo, gerarPDFRescisao } from '@/utils/rescisaoPDF';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresas } from '@/hooks/useEmpresas';
import { edgeFunctionsService } from '@/services/edgeFunctionsService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDataAccessLog } from '@/hooks/useDataAccessLog';
import { registrarAcessoPII } from '@/services/piiAccessLogService';
import type { Json, Database } from '@/integrations/supabase/types';
import { validateTablePayload } from '@/schemas/validate';

// O enum `tipo_desligamento` do banco usa nomes distintos dos tipos do motor
// (e não cobre culpa_reciproca — esse tipo fica só no histórico).
function mapTipoDesligamentoDB(tipo: string): Database['public']['Enums']['tipo_desligamento'] | null {
  switch (tipo) {
    case 'sem_justa_causa':
      return 'sem_justa_causa';
    case 'justa_causa':
      return 'justa_causa';
    case 'pedido_demissao':
      return 'pedido_demissao';
    case 'acordo_mutuo':
      return 'acordo';
    case 'termino_contrato':
      return 'fim_contrato';
    case 'falecimento':
      return 'falecimento';
    default:
      return null;
  }
}

export default function CalculadoraRescisaoPage() {
  const { user } = useAuth();
  const { empresaAtual } = useEmpresas();
  const [loadingColab, setLoadingColab] = useState(false);
  const [selectedColabId, setSelectedColabId] = useState<string | undefined>(undefined);
  const [seletorAberto, setSeletorAberto] = useState(false);

  useDataAccessLog('colaboradores', selectedColabId, empresaAtual?.id);

  const [form, setForm] = useState({
    nomeColaborador: '',
    cpf: '',
    cargo: '',
    salario: '',
    dataAdmissao: '',
    dataDesligamento: '',
    tipo: 'sem_justa_causa',
    avisoTrabalhado: false,
    feriasVencidas: false,
    saldoFGTS: '',
    diasAvisoNaoCumpridos: '',
    dataFimContrato: '',
    terminoIniciativa: 'empregador' as 'empregador' | 'empregado' | 'natural',
    indenizacaoArt480Prejuizo: '',
    dataPagamento: '',
    motivoDesligamento: '',
    observacoes: '',
  });
  const [result, setResult] = useState<RescisaoResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [calcServidor, setCalcServidor] = useState(false);
  // Qual motor produziu o `result` em cena. Os dois botões escrevem no mesmo
  // estado, e sem isto a tela e o TRCT não dizem de onde veio o número — uma
  // homologação feita com a regra "errada" não deixava rastro.
  const [origemCalculo, setOrigemCalculo] = useState<'local' | 'servidor' | null>(null);

  /**
   * Desfaz um import errado: limpa só o que o import preencheu e zera o
   * resultado em cena, pela mesma razão do `set` — mostrar o cálculo velho ao
   * lado de dados novos já causou homologação errada.
   */
  const limparColaboradorImportado = () => {
    setSelectedColabId(undefined);
    setResult(null);
    setOrigemCalculo(null);
    setForm((p) => ({ ...p, nomeColaborador: '', cpf: '', cargo: '', salario: '', dataAdmissao: '' }));
  };

  const handleSelectColaborador = async (id: string) => {
    if (!id) return;
    setLoadingColab(true);
    try {
      const { data, error } = await supabase.from('colaboradores').select('*').eq('id', id).single();
      if (error) throw error;
      // O id entra DEPOIS da consulta dar certo, junto com os dados. Marcá-lo
      // antes deixava id e formulário apontando para pessoas diferentes quando
      // a consulta falhava: com dois homônimos, o desligamento ia para o id da
      // importação que falhou, carregando os dados da anterior.
      setSelectedColabId(id);
      setForm((p) => ({
        ...p,
        nomeColaborador: data.nome_completo,
        cpf: data.cpf || '',
        cargo: data.cargo || '',
        salario: data.salario_base?.toString() || '',
        dataAdmissao: data.data_admissao || '',
      }));
      toast.success('Dados do colaborador importados!');
    } catch (err) {
      toast.error('Erro ao buscar colaborador');
    } finally {
      setLoadingColab(false);
    }
  };

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores-select', empresaAtual?.id],
    queryFn: async () => {
      if (!empresaAtual?.id) return [];
      const { data, error } = await supabase
        .from('colaboradores')
        // `cpf_last4` e não `cpf`: a busca precisa desambiguar homônimos, não
        // expor o CPF inteiro de toda a empresa no navegador. O log de acesso a
        // PII desta tela é por colaborador selecionado (useDataAccessLog acima),
        // então carregar a lista completa de CPFs seria leitura em massa sem
        // registro — a coluna `cpf_last4` existe no banco exatamente para isso.
        .select('id, nome_completo, matricula, cpf_last4')
        .eq('empresa_id', empresaAtual.id)
        .eq('status', 'ativo')
        .order('nome_completo');
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const colaboradorSelecionado = colaboradores.find((c) => c.id === selectedColabId);

  const queryClient = useQueryClient();

  /**
   * A tela GRAVAVA em `historico_rescisoes` (ver `salvarHistorico`) e NUNCA lia:
   * o botão "Salvar" mandava o cálculo para uma tabela que nenhuma tela exibia.
   * Fluxo pela metade (AGENTS.md, seção 3). Aqui ele fecha.
   */
  const { data: historico = [], isLoading: carregandoHistorico } = useQuery({
    queryKey: ['historico-rescisoes', empresaAtual?.id],
    queryFn: async () => {
      if (!empresaAtual?.id) return [];
      const { data, error } = await supabase
        .from('historico_rescisoes')
        .select('id, created_at, nome_colaborador, cargo, tipo_rescisao, data_desligamento, total_liquido')
        .eq('empresa_id', empresaAtual.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      // Trilha LGPD: a lista traz nome e cargo de quem foi desligado.
      if ((data?.length ?? 0) > 0) {
        void registrarAcessoPII('historico_rescisoes', 'select', {
          empresaId: empresaAtual.id,
          registroCount: data?.length ?? 0,
        });
      }
      return data || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const validarForm = useCallback(() => {
    if (!form.salario || !form.dataAdmissao || !form.dataDesligamento) {
      toast.error('Preencha salário, data de admissão e desligamento');
      return false;
    }
    if (form.tipo === 'termino_contrato' && form.terminoIniciativa !== 'natural' && !form.dataFimContrato) {
      toast.error('Informe a data prevista de fim do contrato (arts. 479/480)');
      return false;
    }
    return true;
  }, [form]);

  const handleCalcServidor = async () => {
    if (!validarForm()) return;
    setCalcServidor(true);
    try {
      const result = await edgeFunctionsService.calcularRescisao({
        salario_base: Number(form.salario),
        data_admissao: form.dataAdmissao,
        data_desligamento: form.dataDesligamento,
        tipo_rescisao: form.tipo,
        aviso_previo: form.avisoTrabalhado ? 'trabalhado' : 'indenizado',
        saldo_fgts: Number(form.saldoFGTS || 0),
        ferias_vencidas: form.feriasVencidas,
        dependentes_irrf: 0,
        dias_aviso_nao_cumpridos: form.diasAvisoNaoCumpridos ? Number(form.diasAvisoNaoCumpridos) : undefined,
        data_fim_contrato: form.dataFimContrato || undefined,
        termino_iniciativa: form.tipo === 'termino_contrato' ? form.terminoIniciativa : undefined,
        data_pagamento: form.dataPagamento || undefined,
        indenizacao_art_480_prejuizo: form.indenizacaoArt480Prejuizo
          ? Number(form.indenizacaoArt480Prejuizo)
          : undefined,
      });

      const data = result;
      if (data?.resultado) {
        setResult(data.resultado);
        setOrigemCalculo('servidor');
        toast.success('Rescisão calculada no servidor!');
      } else {
        toast.error('Servidor não retornou um resultado válido');
      }
    } catch (err) {
      toast.error(safeErrorMessage(err, 'Erro ao calcular rescisão.'));
    } finally {
      setCalcServidor(false);
    }
  };

  const handleCalc = useCallback(async () => {
    if (!validarForm()) return;

    const result = await calcularRescisao({
      salario: Number(form.salario),
      dataAdmissao: form.dataAdmissao,
      dataDesligamento: form.dataDesligamento,
      tipo: form.tipo,
      avisoTrabalhado: form.avisoTrabalhado,
      feriasVencidas: form.feriasVencidas,
      saldoFGTS: Number(form.saldoFGTS || 0),
      diasAvisoNaoCumpridos: form.diasAvisoNaoCumpridos ? Number(form.diasAvisoNaoCumpridos) : undefined,
      dataFimContrato: form.dataFimContrato || undefined,
      terminoIniciativa: form.tipo === 'termino_contrato' ? form.terminoIniciativa : undefined,
      dataPagamento: form.dataPagamento || undefined,
      indenizacaoArt480Prejuizo: form.indenizacaoArt480Prejuizo ? Number(form.indenizacaoArt480Prejuizo) : undefined,
    });

    setResult(result);
    setOrigemCalculo('local');
    toast.success('Rescisão calculada com sucesso!');
  }, [form, validarForm]);

  const salvarHistorico = useCallback(async () => {
    if (!result || !user || !empresaAtual) return;
    setSaving(true);
    try {
      // 1. Save to History
      const { error: histError } = await supabase
        .from('historico_rescisoes')
        .insert(
          validateTablePayload(
            'historico_rescisoes',
            {
              empresa_id: empresaAtual.id,
              created_by: user.id,
              nome_colaborador: form.nomeColaborador || null,
              cpf: form.cpf || null,
              cargo: form.cargo || null,
              salario: Number(form.salario),
              data_admissao: form.dataAdmissao,
              data_desligamento: form.dataDesligamento,
              tipo_rescisao: form.tipo,
              aviso_trabalhado: form.avisoTrabalhado,
              ferias_vencidas: form.feriasVencidas,
              saldo_fgts: Number(form.saldoFGTS || 0),
              total_proventos: result.totalProventos,
              total_descontos: result.totalDescontos,
              total_liquido: result.totalLiquido,
              resultado: result as unknown as Json,
            },
            'CalculadoraRescisaoPage:historico_rescisoes'
          )
        )
        .select()
        .single();

      if (histError) throw histError;

      // 2. Integration with Desligamentos Table
      // Casar por NOME aqui registrava o desligamento na PESSOA ERRADA quando
      // existem homônimos: `find` devolve o primeiro da lista, não o que o RH
      // escolheu. Usa o id importado, e só cai no nome quando ele é único —
      // nunca adivinha entre homônimos.
      // O nome ainda tem de bater com o do colaborador importado: se o RH
      // importou alguém e depois EDITOU o campo de nome, o id em memória já não
      // corresponde a quem está na tela.
      const colabPorId =
        colaboradorSelecionado && colaboradorSelecionado.nome_completo === form.nomeColaborador
          ? colaboradorSelecionado
          : undefined;
      const homonimos = colaboradores.filter((c) => c.nome_completo === form.nomeColaborador);
      const colabDesl = colabPorId ?? (homonimos.length === 1 ? homonimos[0] : undefined);

      if (form.dataDesligamento && !colabDesl && homonimos.length > 1 && mapTipoDesligamentoDB(form.tipo)) {
        toast.info(
          `Há ${homonimos.length} colaboradores com este nome. Importe a pessoa pelo seletor para registrar o desligamento.`
        );
      }

      if (form.dataDesligamento && colabDesl && mapTipoDesligamentoDB(form.tipo)) {
        const { error: deslError } = await supabase.from('desligamentos').insert(
          validateTablePayload(
            'desligamentos',
            {
              empresa_id: empresaAtual.id,
              colaborador_id: colabDesl.id,
              data_desligamento: form.dataDesligamento,
              // Enum do banco tem nomes diferentes do motor
              // (acordo/fim_contrato); culpa_reciproca não tem equivalente
              // e não é persistida aqui.
              tipo: mapTipoDesligamentoDB(form.tipo)!,
              motivo: form.tipo.replace(/_/g, ' '),
              valor_liquido: result.totalLiquido,
              status: 'pendente',
              created_by: user.id,
            },
            'CalculadoraRescisaoPage:desligamentos'
          )
        );

        if (!deslError) {
          toast.success('Desligamento registrado no módulo de Pessoas!');
        }
      }

      // Sem isto o cálculo recém-salvo não aparece na lista abaixo até a tela
      // ser recarregada.
      void queryClient.invalidateQueries({ queryKey: ['historico-rescisoes', empresaAtual.id] });
      toast.success('Cálculo salvo no histórico!');
    } catch (err) {
      toast.error(safeErrorMessage(err, 'Erro ao salvar cálculo.'));
    } finally {
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, form, user, colaboradorSelecionado, colaboradores]);
  const set = (k: keyof typeof form, v: string | boolean) => {
    // Qualquer edição nos inputs invalida o resultado exibido — mostrar o
    // cálculo velho ao lado dos dados novos já causou homologação errada.
    setResult(null);
    setOrigemCalculo(null);
    setForm((p) => ({ ...p, [k]: v }));
  };

  return (
    <>
      <PageTitle title="Calculadora de Rescisão" description="Cálculo rescisório trabalhista" />
      <PageLayout
        title="Calculadora de Rescisão"
        description="Cálculo completo de verbas rescisórias com geração de TRCT"
        icon={<Calculator className="h-5 w-5 text-primary-foreground" />}
        gradient="from-warning to-destructive"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <Card className="border-border/30 rounded-2xl shadow-elevated">
            <CardHeader>
              <CardTitle className="text-base font-display">Dados da Rescisão</CardTitle>
              <CardDescription className="font-body text-xs">
                Preencha os dados para calcular as verbas rescisórias
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="font-body text-xs">Importar Colaborador Ativo</Label>
                {/* Combobox com busca digitável, resgatado da PR #546
                    (FormularioRescisao.tsx:274-335). Com muitos ativos, o
                    `Select` simples obrigava a rolar a lista inteira. O `X`
                    desfaz um import errado, que antes não tinha como desfazer. */}
                <div className="flex items-center gap-2">
                  <Popover open={seletorAberto} onOpenChange={setSeletorAberto}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={seletorAberto}
                        disabled={loadingColab}
                        className="flex-1 justify-between rounded-xl font-body font-normal"
                      >
                        <span className="truncate">
                          {colaboradorSelecionado?.nome_completo ?? 'Selecione para preencher automaticamente'}
                        </span>
                        {loadingColab ? (
                          <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin" />
                        ) : (
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar por nome, matrícula ou 4 últimos do CPF..." />
                        <CommandList>
                          <CommandEmpty>Nenhum colaborador ativo encontrado.</CommandEmpty>
                          <CommandGroup>
                            {colaboradores.map((c) => (
                              <CommandItem
                                key={c.id}
                                // O `value` é o texto que o cmdk usa para filtrar. Com
                                // homônimos ("José Silva" duas vezes) o nome não
                                // desambigua, e errar a pessoa numa tela de rescisão
                                // gera homologação errada — então matrícula e os 4
                                // últimos dígitos do CPF também entram no filtro. Só no
                                // filtro: o CPF inteiro nunca é carregado.
                                value={[c.nome_completo, c.matricula ?? '', c.cpf_last4 ?? ''].join(' ')}
                                onSelect={() => {
                                  setSeletorAberto(false);
                                  void handleSelectColaborador(c.id);
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${c.id === selectedColabId ? 'opacity-100' : 'opacity-0'}`}
                                />
                                <span className="truncate">{c.nome_completo}</span>
                                {c.matricula && (
                                  <span className="ml-auto shrink-0 pl-2 text-[11px] text-muted-foreground">
                                    {c.matricula}
                                  </span>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {selectedColabId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remover colaborador importado"
                      onClick={limparColaboradorImportado}
                      className="rounded-xl"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-body text-xs">Nome do Colaborador</Label>
                  <Input
                    value={form.nomeColaborador}
                    onChange={(e) => set('nomeColaborador', e.target.value)}
                    className="rounded-xl"
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <Label className="font-body text-xs">CPF</Label>
                  <Input
                    value={form.cpf}
                    onChange={(e) => set('cpf', e.target.value)}
                    className="rounded-xl"
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-body text-xs">Cargo</Label>
                  <Input value={form.cargo} onChange={(e) => set('cargo', e.target.value)} className="rounded-xl" />
                </div>
                <div>
                  <Label className="font-body text-xs">Salário Base (R$)</Label>
                  <CurrencyInput
                    value={form.salario ? Number(form.salario) : undefined}
                    onChange={(v) => set('salario', v ? String(v) : '')}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-body text-xs">Data Admissão</Label>
                  <Input
                    type="date"
                    aria-label="Data Admissão"
                    value={form.dataAdmissao}
                    onChange={(e) => set('dataAdmissao', e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label className="font-body text-xs">Data Desligamento</Label>
                  <Input
                    type="date"
                    aria-label="Data Desligamento"
                    value={form.dataDesligamento}
                    onChange={(e) => set('dataDesligamento', e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div>
                <Label className="font-body text-xs">Tipo de Rescisão</Label>
                <Select value={form.tipo} onValueChange={(v) => set('tipo', v)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sem_justa_causa">Sem Justa Causa</SelectItem>
                    <SelectItem value="justa_causa">Justa Causa</SelectItem>
                    <SelectItem value="pedido_demissao">Pedido de Demissão</SelectItem>
                    <SelectItem value="acordo_mutuo">Acordo Mútuo (Art. 484-A)</SelectItem>
                    <SelectItem value="culpa_reciproca">Culpa Recíproca</SelectItem>
                    <SelectItem value="termino_contrato">Término de Contrato a Prazo</SelectItem>
                    <SelectItem value="falecimento">Falecimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.tipo === 'termino_contrato' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="font-body text-xs">
                      Fim previsto do contrato{form.terminoIniciativa !== 'natural' ? ' *' : ''}
                    </Label>
                    <Input
                      type="date"
                      value={form.dataFimContrato}
                      onChange={(e) => set('dataFimContrato', e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="font-body text-xs">Quem antecipou o término?</Label>
                    <Select value={form.terminoIniciativa} onValueChange={(v) => set('terminoIniciativa', v)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="empregador">Empregador (Art. 479)</SelectItem>
                        <SelectItem value="empregado">Empregado (Art. 480)</SelectItem>
                        <SelectItem value="natural">Término natural (no prazo)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              {form.tipo === 'termino_contrato' && form.terminoIniciativa === 'empregado' && (
                <div>
                  <Label className="font-body text-xs">Perdas apuradas do empregador — Art. 480 (opcional)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.indenizacaoArt480Prejuizo}
                    onChange={(e) => set('indenizacaoArt480Prejuizo', e.target.value)}
                    className="rounded-xl"
                    placeholder="Em branco: teto legal (50% dos dias restantes)"
                  />
                </div>
              )}
              {form.tipo === 'pedido_demissao' && !form.avisoTrabalhado && (
                <div>
                  <Label className="font-body text-xs">Dias de aviso não cumpridos (Art. 487 §2º)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    value={form.diasAvisoNaoCumpridos}
                    onChange={(e) => set('diasAvisoNaoCumpridos', e.target.value)}
                    className="rounded-xl"
                    placeholder="30"
                  />
                </div>
              )}
              <div>
                <Label className="font-body text-xs">Data do pagamento das verbas (opcional)</Label>
                <Input
                  type="date"
                  value={form.dataPagamento}
                  onChange={(e) => set('dataPagamento', e.target.value)}
                  className="rounded-xl"
                />
                <p className="text-[11px] text-muted-foreground font-body">
                  Após 10 dias corridos do desligamento aplica-se a multa do art. 477 §8º (1 salário).
                </p>
              </div>
              <div>
                <Label className="font-body text-xs">Saldo FGTS (R$)</Label>
                <CurrencyInput
                  value={form.saldoFGTS ? Number(form.saldoFGTS) : undefined}
                  onChange={(v) => set('saldoFGTS', v ? String(v) : '')}
                  className="rounded-xl"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="font-body text-xs">Aviso prévio trabalhado?</Label>
                <Switch checked={form.avisoTrabalhado} onCheckedChange={(v) => set('avisoTrabalhado', v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="font-body text-xs">Possui férias vencidas?</Label>
                <Switch checked={form.feriasVencidas} onCheckedChange={(v) => set('feriasVencidas', v)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleCalc}
                  className="rounded-xl bg-gradient-to-r from-warning to-destructive font-body"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Calcular Local
                </Button>
                <Button
                  onClick={handleCalcServidor}
                  disabled={calcServidor}
                  variant="outline"
                  className="rounded-xl font-body"
                >
                  {calcServidor ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4 mr-2" />
                  )}
                  Calcular Servidor
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Result */}
          <div className="space-y-4">
            {result ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-border/30 rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-display">Resultado da Rescisão</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <p className="text-xs font-display font-semibold text-success">PROVENTOS</p>
                      {(
                        [
                          ['Saldo de Salário', `${result.diasTrabalhados} dias`, result.saldoSalario],
                          ['Aviso Prévio Indenizado', `${result.diasAviso} dias`, result.avisoIndenizado],
                          ['Férias Vencidas', '', result.feriasVencidas],
                          ['Férias Proporcionais', `${result.mesesFerias}/12`, result.feriasProporcionais],
                          ['1/3 Constitucional', '', result.tercoFerias],
                          ['13º Proporcional', `${result.meses13}/12`, result.decimoTerceiro],
                          ['Indenização Art. 479 (contrato a prazo)', '', result.indenizacaoArt479],
                          ['Multa Art. 477 §8º (pagamento em atraso)', '', result.multa477],
                        ] as [string, string, number][]
                      ).map(([label, ref, val]) => (
                        <div key={label} className="flex justify-between text-xs font-body">
                          <span>{label}</span>
                          <span className="text-muted-foreground">{ref}</span>
                          <span className="font-medium">R$ {fmt(val)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-xs font-display font-bold border-t border-border/30 pt-1">
                        <span>Total Proventos</span>
                        <span className="text-success">R$ {fmt(result.totalProventos)}</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <p className="text-xs font-display font-semibold text-destructive">DESCONTOS</p>
                      {(
                        [
                          ['INSS', result.inss],
                          ['IRRF', result.irrf],
                          ['Aviso prévio não cumprido (Art. 487 §2º)', result.descontoAvisoPrevio],
                          ['Indenização Art. 480 (contrato a prazo)', result.indenizacaoArt480],
                        ] as [string, number][]
                      ).map(([label, val]) => (
                        <div key={label} className="flex justify-between text-xs font-body">
                          <span>{label}</span>
                          <span className="font-medium text-destructive">R$ {fmt(val)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-xs font-display font-bold border-t border-border/30 pt-1">
                        <span>Total Descontos</span>
                        <span className="text-destructive">R$ {fmt(result.totalDescontos)}</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <p className="text-xs font-display font-semibold text-info">FGTS</p>
                      <div className="flex justify-between text-xs font-body">
                        <span>FGTS sobre Rescisão</span>
                        <span>R$ {fmt(result.fgtsRescisao)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-body">
                        <span>Multa FGTS (GRRF — fora do líquido)</span>
                        <span className="font-medium text-info">R$ {fmt(result.multaFGTS)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-body">
                        <span>Saque FGTS permitido</span>
                        <span>{Math.round(result.fgtsSaquePercentual * 100)}%</span>
                      </div>
                    </div>

                    {/* Memória de cálculo: sobre quanto cada encargo incidiu e
                        qual foi a alíquota EFETIVA. Vem pronta do motor
                        (`rescisaoCalc.ts`), nunca derivada aqui — INSS e IRRF
                        incidem em duas parcelas separadas e a multa do FGTS
                        soma o FGTS da rescisão ao saldo informado. Ausente em
                        rescisão gravada antes dessa memória existir. */}
                    {result.basesCalculo?.length ? (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <p className="text-xs font-display font-semibold text-muted-foreground">BASE DE CÁLCULO</p>
                          {result.basesCalculo.map((linha) => (
                            <div key={linha.descricao} className="flex justify-between gap-2 text-xs font-body">
                              <span className="text-muted-foreground">{linha.descricao}</span>
                              <span className="text-numeric whitespace-nowrap">
                                R$ {fmt(linha.base)} → R$ {fmt(linha.encargo)}
                                <span className="ml-1 text-muted-foreground">({fmt(aliquotaEfetiva(linha))}%)</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : null}

                    <Separator />

                    <div className="space-y-2">
                      <p className="text-xs font-display font-semibold text-info">SEGURO-DESEMPREGO (informativo)</p>
                      <div className="flex justify-between text-xs font-body">
                        <span>Elegível</span>
                        <span>{result.seguroDesemprego.elegivel ? 'Sim' : 'Não'}</span>
                      </div>
                      {result.seguroDesemprego.elegivel && (
                        <div className="flex justify-between text-xs font-body">
                          <span>Parcelas estimadas</span>
                          <span>
                            {result.seguroDesemprego.parcelas} × R$ {fmt(result.seguroDesemprego.valorParcela)}
                          </span>
                        </div>
                      )}
                      {result.seguroDesemprego.observacao && (
                        <p className="text-[11px] text-muted-foreground font-body">
                          {result.seguroDesemprego.observacao}
                        </p>
                      )}
                    </div>

                    <Separator />

                    {result.saldoDevedor > 0 && (
                      <div className="flex justify-between text-xs font-body text-destructive">
                        <span>Saldo devedor do empregado (Art. 480)</span>
                        <span className="font-medium">R$ {fmt(result.saldoDevedor)}</span>
                      </div>
                    )}

                    <div className="bg-primary/5 rounded-xl p-3">
                      <div className="flex justify-between font-display font-bold">
                        <span>VALOR LÍQUIDO</span>
                        <span className="text-lg text-primary">R$ {fmt(result.totalLiquido)}</span>
                      </div>
                    </div>

                    {/* Procedência do número em cena. O motor já produz
                        `timestamp` e `assinaturaDigital` (rescisaoCalc.ts) e a
                        tela os descartava: o usuário gerava o TRCT sem saber de
                        quando era o cálculo nem se ele estava assinado. */}
                    <div className="space-y-1 rounded-xl border border-border/40 p-3">
                      <p className="text-xs font-display font-semibold text-muted-foreground">PROCEDÊNCIA</p>
                      <div className="flex justify-between text-xs font-body">
                        <span className="text-muted-foreground">Calculado em</span>
                        <span className="text-numeric">{formatarMomentoCalculo(result.timestamp)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-body">
                        <span className="text-muted-foreground">Motor</span>
                        <span>{origemCalculo ? LABEL_ORIGEM_CALCULO[origemCalculo] : 'não registrado'}</span>
                      </div>
                      <div className="flex justify-between text-xs font-body">
                        <span className="text-muted-foreground">Assinatura digital</span>
                        <span className={result.assinaturaDigital ? 'text-numeric' : 'text-destructive font-medium'}>
                          {result.assinaturaDigital ? `${result.assinaturaDigital.slice(0, 16)}…` : 'ausente'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          gerarPDFRescisao(form, result, undefined, origemCalculo ?? undefined);
                          // Trilha LGPD — o TRCT carrega dados rescisórios do colaborador.
                          void registrarAcessoPII('rescisoes', 'export', {
                            empresaId: empresaAtual?.id,
                            registroId: selectedColabId ?? null,
                          });
                        }}
                        className="flex-1 rounded-xl bg-gradient-to-r from-primary to-primary-glow font-body"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Gerar TRCT (PDF)
                      </Button>
                      <Button
                        onClick={salvarHistorico}
                        disabled={saving}
                        variant="outline"
                        className="rounded-xl font-body"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Salvando...' : 'Salvar'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <Card className="border-border/30 rounded-2xl">
                <CardContent className="py-16 text-center">
                  <Calculator className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground font-body">Preencha os dados e clique em Calcular</p>
                  <p className="text-xs text-muted-foreground/60 font-body mt-1">
                    Cálculos baseados nas tabelas INSS/IRRF 2026
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Histórico — a contraparte de leitura do botão "Salvar". */}
        <Card className="mt-6 border-border/30 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-display">
              <History className="h-4 w-4 text-primary" />
              Últimos cálculos salvos
            </CardTitle>
            <CardDescription className="font-body">
              Os 10 mais recentes desta empresa. Cada linha é um clique no botão "Salvar" acima.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {carregandoHistorico ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : historico.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm font-body text-muted-foreground">Nenhum cálculo salvo ainda.</p>
                <p className="mt-1 text-xs font-body text-muted-foreground/60">
                  Calcule uma rescisão e clique em "Salvar" para guardar aqui.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/30 bg-muted/30">
                      <th className="px-4 py-3 text-left text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
                        Colaborador
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
                        Tipo
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
                        Desligamento
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
                        Líquido
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
                        Salvo em
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {historico.map((h) => (
                      <tr key={h.id} className="border-b border-border/20">
                        <td className="px-4 py-3">
                          <p className="text-sm font-body font-medium">{h.nome_colaborador || '—'}</p>
                          <p className="text-[11px] font-body text-muted-foreground">{h.cargo || '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-sm font-body text-muted-foreground">
                          {(h.tipo_rescisao || '—').replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3 text-sm font-body tabular-nums text-muted-foreground">
                          {h.data_desligamento
                            ? new Date(`${h.data_desligamento}T12:00:00`).toLocaleDateString('pt-BR')
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-body font-medium tabular-nums">
                          {typeof h.total_liquido === 'number' ? fmt(h.total_liquido) : '—'}
                        </td>
                        <td className="px-4 py-3 text-[11px] font-body tabular-nums text-muted-foreground">
                          {h.created_at ? new Date(h.created_at).toLocaleString('pt-BR') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </PageLayout>
    </>
  );
}
