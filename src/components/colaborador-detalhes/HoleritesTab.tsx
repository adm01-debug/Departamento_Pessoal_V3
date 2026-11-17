import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useHoleritesColaborador } from '@/hooks/useColaboradorDetalhes';
import { formatCompetencia, formatCurrency } from '@/utils/format';
import { FalhaConsulta } from './FalhaConsulta';

/**
 * Sub-aba "Holerites" da aba Financeiro do dossiê: lista as últimas 12
 * competências já geradas para o colaborador. É SOMENTE LEITURA — a geração
 * continua em supabase/functions/gerar-holerite + folhaPagamentoService.
 *
 * Não exibe `colaborador_cpf`: o cabeçalho do dossiê já identifica a pessoa, e
 * repetir o CPF numa tabela de folha só amplia a superfície de PII (LGPD).
 */
export function HoleritesTab({ colaboradorId }: { colaboradorId: string }) {
  const { data, isLoading, isError } = useHoleritesColaborador(colaboradorId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Holerites</CardTitle>
        <p className="text-xs text-muted-foreground">Últimas 12 competências registradas.</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2" data-testid="holerites-skeleton">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : isError ? (
          // Lista vazia por falha de consulta não pode parecer "não há holerite":
          // o RH usaria a ausência como prova de que a folha não rodou.
          <FalhaConsulta o="os holerites" />
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">Nenhum holerite disponível para este colaborador.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competência</TableHead>
                <TableHead>Proventos</TableHead>
                <TableHead>Descontos</TableHead>
                <TableHead>Líquido</TableHead>
                <TableHead>Assinatura</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{formatCompetencia(h.competencia)}</TableCell>
                  <TableCell>{formatCurrency(h.total_proventos)}</TableCell>
                  <TableCell className="text-destructive">{formatCurrency(h.total_descontos)}</TableCell>
                  <TableCell className="font-semibold text-success">{formatCurrency(h.total_liquido)}</TableCell>
                  <TableCell>
                    {/* `assinado` nulo = a folha não registrou o status; dizer
                        "Pendente" seria inventar o estado da assinatura. */}
                    {h.assinado === null ? (
                      <span className="text-sm text-muted-foreground">Não informado</span>
                    ) : (
                      <Badge variant={h.assinado ? 'success' : 'secondary'}>
                        {h.assinado ? 'Assinado' : 'Pendente'}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
