import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TIPOS_DIA_RELOGIO, vinculosRelogioService, type TipoDiaRelogio } from '@/services/relogio/vinculosService';

const SEM_EFEITO = 'sem_efeito';

const ROTULO_TIPO_DIA: Record<TipoDiaRelogio, string> = {
  normal: 'Normal (trabalhado)',
  feriado: 'Feriado',
  compensado: 'Compensado',
  folga: 'Folga',
  falta: 'Falta',
  atestado: 'Atestado',
  ferias: 'Férias',
  licenca: 'Licença',
};

function mensagemErro(err: unknown): string {
  return err instanceof Error ? err.message : 'Erro inesperado';
}

export function JustificativasRelogioTab({ empresaId }: { empresaId: string }) {
  const queryClient = useQueryClient();
  const chave = ['relogio', 'justificativas', empresaId] as const;

  const justificativasQuery = useQuery({
    queryKey: chave,
    queryFn: () => vinculosRelogioService.listarJustificativas(empresaId),
    enabled: Boolean(empresaId),
  });

  const salvar = useMutation({
    mutationFn: ({ id, tipoDia }: { id: string; tipoDia: TipoDiaRelogio | null }) =>
      vinculosRelogioService.definirTipoDia(id, tipoDia),
    onSuccess: () => {
      toast.success('Tipo de dia salvo.');
      void queryClient.invalidateQueries({ queryKey: chave });
    },
    onError: (err) => toast.error(`Não foi possível salvar: ${mensagemErro(err)}`),
  });

  if (justificativasQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground" role="status">
        <Spinner size="sm" /> Carregando justificativas do relógio...
      </div>
    );
  }

  if (justificativasQuery.isError) {
    return (
      <div className="space-y-2 p-6 text-sm" role="alert">
        <p className="text-destructive">
          Não foi possível carregar as justificativas: {mensagemErro(justificativasQuery.error)}
        </p>
        <Button size="sm" variant="outline" onClick={() => void justificativasQuery.refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  const justificativas = justificativasQuery.data ?? [];
  if (justificativas.length === 0) {
    return (
      <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma justificativa recebida do relógio ainda.</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Código</TableHead>
          <TableHead>Justificativa no relógio</TableHead>
          <TableHead>No relógio conta como</TableHead>
          <TableHead>Tipo de dia no DP</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {justificativas.map((j) => (
          <TableRow key={j.id}>
            <TableCell>{j.codigo}</TableCell>
            <TableCell>{j.nome}</TableCell>
            <TableCell>{j.consideraFalta ? 'Falta' : j.consideraNormal ? 'Dia normal' : '—'}</TableCell>
            <TableCell>
              <Select
                value={j.tipoDia ?? SEM_EFEITO}
                disabled={salvar.isPending}
                onValueChange={(valor) =>
                  salvar.mutate({ id: j.id, tipoDia: valor === SEM_EFEITO ? null : (valor as TipoDiaRelogio) })
                }
              >
                <SelectTrigger className="w-52" aria-label={`Tipo de dia para ${j.nome}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_EFEITO}>Sem efeito</SelectItem>
                  {TIPOS_DIA_RELOGIO.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ROTULO_TIPO_DIA[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
