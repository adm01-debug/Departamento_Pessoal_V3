import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks/useEmpresas';
import { usePcsAvaliacoes, usePcsFatores } from '@/hooks/usePcs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { parseGraus, parsePontuacoes, type PcsPontuacoes } from '@/types/pcs';

interface CargoLite {
  id: string;
  nome: string;
  cbo: string | null;
}

/** Avaliação de cargos por pontos — a pontuação total é recalculada no banco. */
export function PcsAvaliacaoTab({ planoId }: { planoId: string | null }) {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;
  const { fatores, isLoading: loadingFatores } = usePcsFatores(planoId);
  const { avaliacoes, isLoading: loadingAval, salvar } = usePcsAvaliacoes(planoId);
  const [cargoAtivo, setCargoAtivo] = useState<CargoLite | null>(null);
  const [rascunho, setRascunho] = useState<PcsPontuacoes>({});

  const { data: cargos, isLoading: loadingCargos } = useQuery({
    queryKey: ['pcs', 'cargos', empresaId],
    queryFn: async (): Promise<CargoLite[]> => {
      const { data, error } = await supabase
        .from('cargos')
        .select('id, nome, cbo')
        .eq('empresa_id', empresaId!)
        .order('nome')
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!empresaId,
  });

  const porCargo = useMemo(() => new Map(avaliacoes.map((a) => [a.cargo_id, a])), [avaliacoes]);

  if (!planoId) return <p className="p-6 text-sm text-muted-foreground">Selecione um plano para avaliar os cargos.</p>;
  if (loadingFatores || loadingAval || loadingCargos) return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;

  const abrir = (cargo: CargoLite) => {
    setCargoAtivo(cargo);
    setRascunho(parsePontuacoes(porCargo.get(cargo.id)?.pontuacoes));
  };

  const salvarAvaliacao = () => {
    if (!cargoAtivo) return;
    salvar.mutate({ cargoId: cargoAtivo.id, pontuacoes: rascunho }, { onSuccess: () => setCargoAtivo(null) });
  };

  const previa = fatores.reduce((acc, f) => acc + (rascunho[f.id] ?? 0) * Number(f.peso ?? 1), 0);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-border/30">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Cargo</TableHead>
              <TableHead>CBO</TableHead>
              <TableHead className="text-right">Pontos</TableHead>
              <TableHead className="w-[140px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(cargos ?? []).map((cargo) => {
              const aval = porCargo.get(cargo.id);
              return (
                <TableRow key={cargo.id} className="border-b border-border/10 last:border-0">
                  <TableCell className="py-3 pl-6 text-sm font-bold">{cargo.nome}</TableCell>
                  <TableCell className="font-mono text-[11px]">{cargo.cbo || '—'}</TableCell>
                  <TableCell className="text-right">
                    {aval ? (
                      <Badge className="border-0 bg-success/10 text-[10px] text-success">
                        {Number(aval.pontos_total).toLocaleString('pt-BR')} pts
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Não avaliado</Badge>
                    )}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <Button variant="outline" size="sm" onClick={() => abrir(cargo)}>
                      {aval ? 'Revisar' : 'Avaliar'}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {(cargos ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum cargo cadastrado para esta empresa.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!cargoAtivo} onOpenChange={(o) => !o && setCargoAtivo(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Avaliar: {cargoAtivo?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {fatores.map((fator) => {
              const graus = parseGraus(fator.graus);
              const atual = rascunho[fator.id];
              return (
                <div key={fator.id} className="space-y-1.5">
                  <Label>
                    {fator.nome} <span className="text-muted-foreground">(peso {Number(fator.peso)})</span>
                  </Label>
                  <Select
                    value={atual !== undefined ? String(atual) : ''}
                    onValueChange={(v) => setRascunho((prev) => ({ ...prev, [fator.id]: Number(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o grau" />
                    </SelectTrigger>
                    <SelectContent>
                      {graus.map((g) => (
                        <SelectItem key={g.grau} value={String(g.pontos)}>
                          {g.grau}. {g.rotulo} · {g.pontos} pts
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
            <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Prévia ponderada</span>
              <strong>{previa.toLocaleString('pt-BR')} pts</strong>
            </div>
            <Button className="w-full" onClick={salvarAvaliacao} disabled={salvar.isPending}>
              Salvar avaliação
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
