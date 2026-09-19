import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormField, FormSelect } from '@/components/forms';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { useCargos } from '@/hooks/useCargos';
import { useRecontratarColaborador } from '@/hooks/useVinculos';
import { Colaborador } from '@/types/entities';
import { todayLocalISO } from '@/utils/dateLocal';

interface RecontratarColaboradorDialogProps {
  colaborador: Colaborador;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Fluxo dedicado de recontratação — reaproveita FormField/FormSelect/
// CurrencyInput do próprio ColaboradorFormPage, mas NÃO é um formulário
// completo: só os campos que a recontratação realmente precisa (nova
// admissão, cargo, departamento, salário). Cria uma nova linha em `vinculos`
// e nunca sobrescreve/apaga o histórico anterior (ver colaboradorService.recontratar).
export function RecontratarColaboradorDialog({ colaborador, open, onOpenChange }: RecontratarColaboradorDialogProps) {
  const { departamentos } = useDepartamentos({ pageSize: 100 });
  const { cargos } = useCargos({ pageSize: 100 });
  const recontratar = useRecontratarColaborador();

  const [dataAdmissao, setDataAdmissao] = useState(todayLocalISO());
  const [cargo, setCargo] = useState(colaborador.cargo || '');
  const [departamento, setDepartamento] = useState(colaborador.departamento || '');
  const [salarioBase, setSalarioBase] = useState<number>(colaborador.salario_base || 0);

  const podeSalvar = !!dataAdmissao && !!cargo && !!departamento && salarioBase > 0;

  const handleConfirmar = async () => {
    if (!podeSalvar) return;
    await recontratar.mutateAsync({
      id: colaborador.id,
      dados: { data_admissao: dataAdmissao, cargo, departamento, salario_base: salarioBase },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recontratar {colaborador.nome_completo}</DialogTitle>
          <DialogDescription>
            Cria uma nova passagem para este colaborador, preservando todo o histórico de vínculos anterior.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <FormField
            label="Nova Data de Admissão"
            type="date"
            value={dataAdmissao}
            onChange={(e) => setDataAdmissao(e.target.value)}
          />

          <FormSelect
            label="Cargo"
            value={cargo}
            onChange={setCargo}
            options={cargos.map((c: any) => ({ value: c.nome, label: c.nome }))}
            placeholder="Selecione o cargo"
          />

          <FormSelect
            label="Departamento"
            value={departamento}
            onChange={setDepartamento}
            options={departamentos.map((d: any) => ({ value: d.nome, label: d.nome }))}
            placeholder="Selecione o departamento"
          />

          <div className="space-y-2">
            <label className="text-sm font-medium">Salário</label>
            <CurrencyInput value={salarioBase} onChange={setSalarioBase} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={recontratar.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmar} disabled={!podeSalvar || recontratar.isPending}>
            {recontratar.isPending ? 'Recontratando...' : 'Confirmar Recontratação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
