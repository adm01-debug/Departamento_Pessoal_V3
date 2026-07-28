import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet } from 'lucide-react';
import { buildTabularWorkbook, downloadWorkbook } from '@/utils/importacao/excelDownload';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePcsEquidade } from '@/hooks/usePcs';
import { PCS_SITUACAO_LABEL, type PcsEnquadramentoRow, type PcsSituacao } from '@/types/pcs';

const COLUNAS_EXPORT = [
  'Colaborador', 'Cargo', 'Departamento', 'Grade', 'Salário atual',
  'Mínimo', 'Médio', 'Máximo', 'Comparatio', 'Ajuste necessário', 'Situação',
] as const;

/** Linhas do comitê de remuneração: números crus, para o Excel formatar/somar. */
function linhasExport(linhas: PcsEnquadramentoRow[]): unknown[][] {
  return linhas.map((l) => [
    l.colaborador_nome,
    l.cargo_nome,
    l.departamento ?? '',
    l.grade_nome,
    Number(l.salario_atual),
    Number(l.salario_min),
    Number(l.salario_medio),
    Number(l.salario_max),
    Number(l.comparatio),
    Number(l.ajuste_necessario),
    PCS_SITUACAO_LABEL[situacaoDe(l.situacao)],
  ]);
}

const brl = (v: number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const SITUACAO_CLASS: Record<PcsSituacao, string> = {
  abaixo_faixa: 'bg-destructive/10 text-destructive',
  dentro_faixa: 'bg-success/10 text-success',
  acima_faixa: 'bg-warning/10 text-warning',
};

/** Narrowing do texto vindo do banco para a união conhecida. */
function situacaoDe(valor: string): PcsSituacao {
  return valor === 'abaixo_faixa' || valor === 'acima_faixa' ? valor : 'dentro_faixa';
}

/** Equidade interna + simulação do impacto financeiro do enquadramento. */
export function PcsEquidadeTab({ planoId }: { planoId: string | null }) {
  const [encargos, setEncargos] = useState('68');
  const encargosPct = Number.isFinite(Number(encargos)) ? Number(encargos) : 0;
  const { linhas, impacto, isLoading } = usePcsEquidade(planoId, encargosPct);

  const exportar = async () => {
    if (linhas.length === 0) {
      toast.error('Nada a exportar — gere a matriz salarial primeiro.');
      return;
    }
    try {
      const wb = buildTabularWorkbook('Enquadramento', [...COLUNAS_EXPORT], linhasExport(linhas));
      const data = new Date().toISOString().slice(0, 10);
      await downloadWorkbook(wb, `enquadramento-pcs-${data}.xlsx`);
      toast.success('Enquadramento exportado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível gerar o Excel');
    }
  };

  if (!planoId) return <p className="p-6 text-sm text-muted-foreground">Selecione um plano para simular o enquadramento.</p>;
  if (isLoading) return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-4">
      <Card className="border-border/30 rounded-2xl bg-card/50">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="pcs-encargos">Encargos sobre a folha (%)</Label>
            <Input id="pcs-encargos" type="number" min={0} max={200} value={encargos} onChange={(e) => setEncargos(e.target.value)} className="md:w-40" />
          </div>
          <p className="pb-2 text-xs text-muted-foreground">
            Inclui INSS patronal, RAT, terceiros, FGTS e provisões de férias/13º.
          </p>
          <Button variant="outline" className="md:ml-auto" onClick={exportar} disabled={linhas.length === 0}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Exportar XLSX
          </Button>
        </CardContent>
      </Card>

      {impacto && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Stat titulo="Ajuste mensal" valor={brl(impacto.ajuste_mensal)} destaque />
          <Stat titulo="Com encargos" valor={brl(impacto.ajuste_com_encargos)} />
          <Stat titulo="Impacto anual" valor={brl(impacto.impacto_anual)} />
          <Stat
            titulo="% sobre a folha"
            valor={impacto.impacto_pct_folha === null ? '—' : `${impacto.impacto_pct_folha.toLocaleString('pt-BR')}%`}
          />
          <Stat titulo="Abaixo da faixa" valor={String(impacto.abaixo_faixa)} />
          <Stat titulo="Dentro da faixa" valor={String(impacto.dentro_faixa)} />
          <Stat titulo="Acima da faixa" valor={String(impacto.acima_faixa)} />
          <Stat
            titulo="Comparatio médio"
            valor={impacto.comparatio_medio === null ? '—' : impacto.comparatio_medio.toLocaleString('pt-BR')}
          />
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border/30">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Colaborador</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead className="text-right">Salário atual</TableHead>
              <TableHead className="text-right">Faixa</TableHead>
              <TableHead className="text-right">Comparatio</TableHead>
              <TableHead className="text-right">Ajuste</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((l) => {
              const situacao = situacaoDe(l.situacao);
              return (
                <TableRow key={l.colaborador_id} className="border-b border-border/10 last:border-0">
                  <TableCell className="py-3 pl-6 text-sm font-bold">{l.colaborador_nome}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.cargo_nome}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{l.grade_nome}</Badge></TableCell>
                  <TableCell className="text-right text-sm">{brl(l.salario_atual)}</TableCell>
                  <TableCell className="text-right font-mono text-[11px] text-muted-foreground">
                    {brl(l.salario_min)} – {brl(l.salario_max)}
                  </TableCell>
                  <TableCell className="text-right text-sm">{Number(l.comparatio).toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="text-right text-sm font-bold">
                    {Number(l.ajuste_necessario) > 0 ? brl(l.ajuste_necessario) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge className={`border-0 text-[10px] ${SITUACAO_CLASS[situacao]}`}>{PCS_SITUACAO_LABEL[situacao]}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {linhas.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  Sem enquadramento. Gere a matriz salarial e confira se os nomes dos cargos batem com o cadastro dos colaboradores.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Stat({ titulo, valor, destaque = false }: { titulo: string; valor: string; destaque?: boolean }) {
  return (
    <Card className="border-border/30 rounded-2xl bg-card/50">
      <CardContent className="p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{titulo}</p>
        <h3 className={`font-display text-xl font-bold ${destaque ? 'text-primary' : ''}`}>{valor}</h3>
      </CardContent>
    </Card>
  );
}
