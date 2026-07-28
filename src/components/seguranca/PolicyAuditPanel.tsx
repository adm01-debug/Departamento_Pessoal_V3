import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Resultado da RPC `sec_audit_policies` — detecção contínua de políticas RLS
 * que não correlacionam o acesso com o usuário/empresa autenticados.
 *
 * A RPC é `SECURITY DEFINER` e restrita a admin no servidor: um usuário comum
 * recebe erro de permissão em vez de uma lista vazia, e o componente distingue
 * os dois casos para não dar falsa sensação de segurança.
 */
export interface PolicyAuditRow {
  tabela: string;
  policy_name: string;
  cmd: string;
  motivo: string;
}

async function fetchPolicyAudit(): Promise<PolicyAuditRow[]> {
  const { data, error } = await supabase.rpc('sec_audit_policies');
  if (error) throw error;
  return (data ?? []) as PolicyAuditRow[];
}

function severidade(motivo: string): 'destructive' | 'warning' {
  // Predicado sempre-verdadeiro ou subconsulta sem correlação = exposição real.
  return /sem tenant|true|sem correla/i.test(motivo) ? 'destructive' : 'warning';
}

export function PolicyAuditPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['sec_audit_policies'],
    queryFn: fetchPolicyAudit,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (isLoading) {
    return (
      <Card className="border-border/30">
        <CardContent className="py-12 flex justify-center">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-border/30">
        <CardContent className="py-12 text-center text-sm text-muted-foreground italic">
          Auditoria de políticas disponível apenas para administradores.
        </CardContent>
      </Card>
    );
  }

  const rows = data ?? [];

  return (
    <Card className="border-border/30">
      <CardHeader>
        <CardTitle className="text-lg font-display flex items-center gap-2">
          {rows.length === 0 ? (
            <ShieldCheck className="h-5 w-5 text-success" />
          ) : (
            <ShieldAlert className="h-5 w-5 text-destructive" />
          )}
          Auditoria de Políticas RLS
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Varredura contínua em busca de regras de acesso sem vínculo com a empresa do
          usuário — a rede de proteção contra regressões de isolamento entre clientes.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-medium text-success">
              Nenhuma política sem escopo de empresa detectada
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Todas as regras com dados sensíveis correlacionam o acesso ao usuário autenticado.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Tabela</TableHead>
                <TableHead>Política</TableHead>
                <TableHead className="w-[100px]">Operação</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.tabela}:${row.policy_name}:${row.cmd}`}>
                  <TableCell className="font-mono text-xs font-semibold">{row.tabela}</TableCell>
                  <TableCell className="text-xs">{row.policy_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold">
                      {row.cmd}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={severidade(row.motivo)} className="text-[10px]">
                      {row.motivo}
                    </Badge>
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

export default PolicyAuditPanel;
