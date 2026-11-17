import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useAfastamentosRecentes } from '@/hooks';
import { parseDateLocalISO } from '@/utils/dateLocal';

/**
 * Resgate da branch `muri`. A sub-aba da `main` chama-se "Férias &
 * Afastamentos" mas renderizava SÓ o resumo de férias — o rótulo prometia
 * afastamento e a tela não mostrava nenhum.
 *
 * PII / dado de saúde — restrição que mantenho da origem, agora com o motivo
 * explícito: a tabela `afastamentos` tem `cid_id`, `cid_descricao`,
 * `medico_nome` e `medico_crm` (ver `src/schemas/afastamento.ts`). Esta aba
 * mostra APENAS tipo, datas e status. Nada de CID, atestado, médico ou
 * perícia — são dados de saúde, e o tipo de afastamento já basta para o RH
 * saber o que precisa fazer.
 */

/** Só o que esta tela de fato lê — não o schema inteiro da tabela. */
interface LinhaAfastamento {
  id: string;
  tipo?: string | null;
  status?: string | null;
  data_inicio?: string | null;
  data_fim_prevista?: string | null;
  data_fim_real?: string | null;
}

function dataBR(iso?: string | null): string {
  // `parseDateLocalISO` em vez de `new Date(iso)`: as colunas são DATE e
  // `new Date('2026-03-05')` é lido como UTC, mostrando 04/03 em fuso
  // negativo. A origem imprimia o ISO cru ("2026-03-05") na tela.
  const d = parseDateLocalISO(iso);
  return d ? format(d, 'dd/MM/yyyy') : '—';
}

const DIAS_HISTORICO = 365;

export function AfastamentosTab({ colaboradorId }: { colaboradorId: string }) {
  const { data: afastamentos, isLoading, isError } = useAfastamentosRecentes(colaboradorId, DIAS_HISTORICO);

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // Erro não é "nenhum afastamento": sem esta distinção, uma consulta que
  // falhou apareceria como colaborador sem afastamento nenhum.
  if (isError) {
    return (
      <Card className="rounded-2xl border border-border/30 shadow-elevated">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Não foi possível carregar os afastamentos. Tente novamente.</p>
        </CardContent>
      </Card>
    );
  }

  const lista = (afastamentos ?? []) as LinhaAfastamento[];
  const atual = lista.find((a) => !a.data_fim_real);
  const historico = lista.filter((a) => a.data_fim_real);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-2xl border border-border/30 shadow-elevated">
        <CardContent className="p-6">
          <p className="mb-3 text-sm font-medium">Situação atual</p>
          {atual ? (
            <div className="space-y-1.5 text-sm">
              <p className="flex items-center gap-2">
                Tipo: <Badge variant="outline">{atual.tipo ?? 'não informado'}</Badge>
              </p>
              <p>Início: {dataBR(atual.data_inicio)}</p>
              <p>Previsão de retorno: {atual.data_fim_prevista ? dataBR(atual.data_fim_prevista) : 'não informada'}</p>
              <p className="flex items-center gap-2">
                Status: <Badge>{atual.status ?? 'não informado'}</Badge>
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum afastamento em andamento.</p>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border border-border/30 shadow-elevated">
        <CardContent className="space-y-3 p-6">
          <p className="text-sm font-medium">Histórico (últimos 12 meses)</p>
          {historico.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum afastamento concluído nos últimos 12 meses.</p>
          ) : (
            <div className="space-y-2">
              {historico.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted/20 p-2 text-sm">
                  <span className="min-w-0">
                    {a.tipo ?? 'Afastamento'} — {dataBR(a.data_inicio)} até {dataBR(a.data_fim_real)}
                  </span>
                  <Badge variant="secondary" className="shrink-0">
                    {a.status ?? '—'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
