import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { addDays, format, parseISO } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useColaboradores } from '@/hooks/useColaboradores';
import { useEmpresas } from '@/hooks/useEmpresas';
import { usePeriodosAquisitivos } from '@/hooks/usePeriodosAquisitivos';
import { colaboradorService } from '@/services/colaboradorService';
import { feriasSchema } from '@/schemas/ferias';
import { calculoFerias } from '@/utils/calculoFerias';
import type { Insertable } from '@/integrations/supabase/database.types';

interface FeriasFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Insertable<'ferias'>) => Promise<unknown>;
  isSubmitting?: boolean;
}

/** Último dia de gozo: início + (dias - 1). */
function calcularDataFimFerias(dataInicio: string, diasGozo: number): string {
  if (!dataInicio || !Number.isFinite(diasGozo) || diasGozo < 1) return '';
  return format(addDays(parseISO(dataInicio), diasGozo - 1), 'yyyy-MM-dd');
}

export function FeriasForm({ open, onOpenChange, onSubmit, isSubmitting = false }: FeriasFormProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">Solicitar férias</DialogTitle>
        </DialogHeader>
        {open && (
          <FeriasFormBody onCancel={() => onOpenChange(false)} onSubmit={onSubmit} isSubmitting={isSubmitting} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function FeriasFormBody({
  onCancel,
  onSubmit,
  isSubmitting,
}: {
  onCancel: () => void;
  onSubmit: FeriasFormProps['onSubmit'];
  isSubmitting: boolean;
}) {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;
  const { colaboradores, setSearch, search, isLoading: loadingColaboradores } = useColaboradores();
  const [colaboradorId, setColaboradorId] = useState('');
  const [periodoIdManual, setPeriodoIdManual] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [diasGozo, setDiasGozo] = useState('30');
  const [diasAbono, setDiasAbono] = useState('0');
  const [observacoes, setObservacoes] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const { periodos, isLoading: loadingPeriodos } = usePeriodosAquisitivos(colaboradorId || undefined);

  const colaboradorQuery = useQuery({
    queryKey: ['colaborador', colaboradorId, empresaId],
    queryFn: () => colaboradorService.buscarPorId(colaboradorId, empresaId!),
    enabled: !!colaboradorId && !!empresaId,
  });

  const periodoPadraoId = useMemo(() => {
    const disponivel = periodos.find((p) => p.status !== 'gozado' && !p.perdeu_direito);
    return disponivel?.id ?? '';
  }, [periodos]);
  const periodoId = periodoIdManual || periodoPadraoId;
  const periodo = periodos.find((p) => p.id === periodoId);

  const dias = Number.parseInt(diasGozo, 10);
  const abono = Number.parseInt(diasAbono, 10) || 0;
  const dataFim = calcularDataFimFerias(dataInicio, dias);

  const ativos = (colaboradores ?? []).filter((c) => c.status !== 'desligado');

  const handleSalvar = async () => {
    setErro(null);
    const base = {
      colaborador_id: colaboradorId,
      periodo_aquisitivo_id: periodoId || undefined,
      data_inicio: dataInicio,
      data_fim: dataFim,
      dias_gozo: Number.isFinite(dias) ? dias : 0,
      dias_abono: abono,
      observacoes: observacoes.trim() || undefined,
    };

    const parsed = feriasSchema.safeParse(base);
    if (!parsed.success) {
      setErro(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
      return;
    }
    if (!periodo) {
      setErro('Selecione o período aquisitivo.');
      return;
    }
    if (periodo.perdeu_direito) {
      setErro('O colaborador perdeu o direito a férias neste período aquisitivo.');
      return;
    }
    if (base.dias_gozo + abono > periodo.dias_direito) {
      setErro(`Dias de gozo + abono excedem o direito do período (${periodo.dias_direito} dias).`);
      return;
    }
    const salarioBase = Number(colaboradorQuery.data?.salario_base ?? 0);
    if (!(salarioBase > 0)) {
      setErro('Colaborador sem salário base cadastrado. Atualize o cadastro antes de solicitar férias.');
      return;
    }

    const calc = calculoFerias.calcular({ salarioBase, diasFerias: base.dias_gozo, diasAbono: abono });

    try {
      await onSubmit({
        colaborador_id: colaboradorId,
        periodo_aquisitivo_id: periodo.id,
        periodo_aquisitivo_inicio: periodo.data_inicio,
        periodo_aquisitivo_fim: periodo.data_fim,
        data_inicio: dataInicio,
        data_fim: dataFim,
        dias_gozo: base.dias_gozo,
        dias_abono: abono,
        abono_pecuniario: abono > 0,
        observacoes: base.observacoes ?? null,
        salario_base: salarioBase,
        valor_ferias: calc.valorFerias,
        valor_terco: calc.tercoConstitucional,
        valor_abono: calc.valorAbono,
        valor_terco_abono: calc.tercoAbono,
        valor_total: calc.bruto,
        descontos_inss: calc.inss,
        descontos_irrf: calc.irrf,
        valor_liquido: calc.liquido,
      });
      onCancel();
    } catch {
      // Toast de erro já exibido pela mutation (useFerias); mantém o formulário aberto.
    }
  };

  return (
    <>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="ferias-busca-colaborador">Colaborador</Label>
          <Input
            id="ferias-busca-colaborador"
            placeholder="Buscar por nome, CPF ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={colaboradorId}
            onValueChange={(id) => {
              setColaboradorId(id);
              setPeriodoIdManual('');
              setErro(null);
            }}
          >
            <SelectTrigger aria-label="Colaborador">
              <SelectValue placeholder={loadingColaboradores ? 'Carregando...' : 'Selecione...'} />
            </SelectTrigger>
            <SelectContent>
              {ativos.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome_completo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {colaboradorId && !loadingPeriodos && periodos.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum período aquisitivo cadastrado para este colaborador. Cadastre-o na aba Períodos Aquisitivos.
          </p>
        )}
        {periodos.length > 0 && (
          <div className="space-y-1.5">
            <Label>Período aquisitivo</Label>
            <Select value={periodoId} onValueChange={setPeriodoIdManual}>
              <SelectTrigger aria-label="Período aquisitivo">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {periodos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.data_inicio} — {p.data_fim} ({p.dias_direito} dias{p.status ? `, ${p.status}` : ''})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ferias-data-inicio">Início</Label>
            <Input
              id="ferias-data-inicio"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ferias-data-fim">Fim</Label>
            <Input id="ferias-data-fim" type="date" value={dataFim} readOnly disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ferias-dias-gozo">Dias de gozo</Label>
            <Input
              id="ferias-dias-gozo"
              type="number"
              min={5}
              max={30}
              value={diasGozo}
              onChange={(e) => setDiasGozo(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ferias-dias-abono">Dias de abono pecuniário</Label>
            <Input
              id="ferias-dias-abono"
              type="number"
              min={0}
              max={10}
              value={diasAbono}
              onChange={(e) => setDiasAbono(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ferias-observacoes">Observações</Label>
          <Textarea
            id="ferias-observacoes"
            rows={2}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
        </div>

        {colaboradorQuery.isError && (
          <p role="alert" className="text-sm text-destructive">
            Falha ao carregar os dados do colaborador.
          </p>
        )}
        {erro && (
          <p role="alert" className="text-sm text-destructive">
            {erro}
          </p>
        )}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          onClick={() => void handleSalvar()}
          disabled={!colaboradorId || !dataInicio || isSubmitting || colaboradorQuery.isLoading}
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {isSubmitting ? 'Enviando...' : 'Solicitar'}
        </Button>
      </DialogFooter>
    </>
  );
}
