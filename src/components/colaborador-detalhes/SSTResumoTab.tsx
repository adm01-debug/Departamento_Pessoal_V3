import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useCatColaborador,
  useIncidentesColaborador,
  useRiscosColaborador,
  type CatSSTColaborador,
  type IncidenteSSTColaborador,
  type RiscoSSTColaborador,
} from '@/hooks/useSSTColaborador';
import { formatDate, formatDateTime } from '@/utils/format';
import { FalhaConsulta } from './FalhaConsulta';

/**
 * `sst_incidentes.gravidade` é INTEIRO no banco (`number | null` nos tipos
 * gerados), não texto: é a escala 1–5 que SSTPage.tsx grava no formulário de
 * incidente (RISCO_LEVELS, src/pages/SSTPage.tsx:31). Fora dessa faixa não
 * inventamos rótulo — mostramos o valor cru.
 */
const GRAVIDADE_LABEL: Record<number, string> = {
  1: 'Trivial',
  2: 'Tolerável',
  3: 'Moderado',
  4: 'Substancial',
  5: 'Intolerável',
};

function rotuloGravidade(gravidade: number | null): string | null {
  if (gravidade === null) return null;
  const label = GRAVIDADE_LABEL[gravidade];
  return label ? `${gravidade} — ${label}` : String(gravidade);
}

function toneGravidade(gravidade: number | null): 'destructive' | 'warning' | 'secondary' | 'outline' {
  if (gravidade === null) return 'outline';
  if (gravidade >= 4) return 'destructive';
  if (gravidade === 3) return 'warning';
  if (gravidade >= 1) return 'secondary';
  return 'outline';
}

/**
 * Consulta que ainda NÃO respondeu. `isLoading` sozinho não cobre o caso real
 * desta tela: os hooks ficam com `enabled: false` até `empresaAtual` resolver
 * (useSSTColaborador.ts:92/103) e o React Query v5 devolve então
 * isLoading=false, isError=false e data=undefined. Ler isso como lista vazia
 * afirma "nenhum registro de SST" sem ter consultado o banco.
 */
function pendente(q: { isLoading: boolean; isError: boolean; data?: unknown[] }): boolean {
  return q.isLoading || (!q.isError && q.data === undefined);
}

/**
 * Uma seção do painel. Cada consulta tem estado próprio: falha de UMA não pode
 * apagar o que as outras trouxeram, e falha nenhuma pode virar "não há
 * registro" (mesmo critério de FalhaConsulta.tsx).
 */
function Secao({
  titulo,
  isLoading,
  isError,
  oQueFalhou,
  vazio,
  mensagemVazio,
  children,
}: {
  titulo: string;
  isLoading: boolean;
  isError: boolean;
  oQueFalhou: string;
  vazio: boolean;
  mensagemVazio: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">{titulo}</h3>
      {isLoading ? (
        <Skeleton className="h-10 w-full" />
      ) : isError ? (
        <FalhaConsulta o={oQueFalhou} />
      ) : vazio ? (
        <p className="text-sm text-muted-foreground">{mensagemVazio}</p>
      ) : (
        children
      )}
    </section>
  );
}

function LinhaIncidente({ incidente }: { incidente: IncidenteSSTColaborador }) {
  const gravidade = rotuloGravidade(incidente.gravidade);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/20 p-2 text-sm">
      <span className="min-w-0">
        {incidente.tipo} — {formatDateTime(incidente.data_hora)}
      </span>
      <span className="flex items-center gap-2">
        {/* `gravidade` nula = o registro não informou a escala; "Trivial" seria
            invenção. */}
        <Badge variant={toneGravidade(incidente.gravidade)}>
          {gravidade === null ? 'Gravidade não informada' : `Gravidade ${gravidade}`}
        </Badge>
        {incidente.status !== null && <Badge variant="outline">{incidente.status}</Badge>}
      </span>
    </div>
  );
}

function LinhaCat({ cat }: { cat: CatSSTColaborador }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/20 p-2 text-sm">
      <span className="min-w-0">
        {cat.tipo_acidente} — {formatDate(cat.data_acidente)}
      </span>
      <span className="flex items-center gap-2">
        <Badge variant="secondary">CAT {cat.tipo_cat}</Badge>
        {/* `status_esocial` nulo não é "pendente": é ausência de registro. */}
        <Badge variant="outline">{cat.status_esocial ?? 'Situação no eSocial não informada'}</Badge>
      </span>
    </div>
  );
}

function LinhaRisco({ risco }: { risco: RiscoSSTColaborador }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/20 p-2 text-sm">
      <span className="min-w-0">
        Agente nocivo {risco.agente_nocivo_codigo ?? 'não informado'} · desde {formatDate(risco.data_inicio_exposicao)}
        {risco.data_fim_exposicao === null
          ? ' · sem término registrado'
          : ` até ${formatDate(risco.data_fim_exposicao)}`}
      </span>
      <span className="flex items-center gap-2">
        {/* `epi_eficaz` nulo: ninguém avaliou a eficácia. Mostrar "EPI eficaz"
            aqui seria afirmar que o colaborador está protegido. */}
        {risco.epi_eficaz === null ? (
          <Badge variant="outline">Eficácia do EPI não avaliada</Badge>
        ) : (
          <Badge variant={risco.epi_eficaz ? 'success' : 'destructive'}>
            {risco.epi_eficaz ? 'EPI eficaz' : 'EPI não eficaz'}
          </Badge>
        )}
        {risco.status_esocial !== null && <Badge variant="outline">{risco.status_esocial}</Badge>}
      </span>
    </div>
  );
}

/**
 * Painel de SST do colaborador: incidentes, CAT emitida e riscos a que está
 * exposto, hoje espalhados por SSTPage/AdminCatPage e sem leitura por pessoa.
 *
 * SOMENTE LEITURA e só status/data/tipo — os hooks de `useSSTColaborador.ts`
 * já não selecionam CID (`sst_cat.cid_principal`), descrição narrativa nem
 * medidas tomadas, então não há PII de saúde nesta tela para mascarar.
 */
export function SSTResumoTab({ colaboradorId }: { colaboradorId: string }) {
  const incidentes = useIncidentesColaborador(colaboradorId);
  const cats = useCatColaborador(colaboradorId);
  const riscos = useRiscosColaborador(colaboradorId);

  const carregando = pendente(incidentes) || pendente(cats) || pendente(riscos);
  const algumaFalha = incidentes.isError || cats.isError || riscos.isError;
  const tudoVazio =
    !carregando && !algumaFalha && !incidentes.data?.length && !cats.data?.length && !riscos.data?.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">SST — Segurança e Saúde no Trabalho</CardTitle>
        <p className="text-xs text-muted-foreground">
          Incidentes, CAT e exposição a riscos deste colaborador. Registro e edição seguem na tela de SST.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {carregando ? (
          <div className="space-y-2" data-testid="sst-skeleton">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : tudoVazio ? (
          // Ausência de registro NÃO é atestado de conformidade: nada aqui
          // afirma que o colaborador não corre risco, só que não há registro.
          <p className="text-sm text-muted-foreground">Nenhum registro de SST para este colaborador.</p>
        ) : (
          <>
            <Secao
              titulo="Incidentes registrados"
              isLoading={incidentes.isLoading}
              isError={incidentes.isError}
              oQueFalhou="os incidentes"
              vazio={!incidentes.data?.length}
              mensagemVazio="Nenhum incidente registrado para este colaborador."
            >
              <div className="space-y-2">
                {incidentes.data?.map((i) => (
                  <LinhaIncidente key={i.id} incidente={i} />
                ))}
              </div>
            </Secao>

            <Secao
              titulo="CAT — Comunicação de Acidente de Trabalho"
              isLoading={cats.isLoading}
              isError={cats.isError}
              oQueFalhou="as CAT"
              vazio={!cats.data?.length}
              mensagemVazio="Nenhuma CAT emitida para este colaborador."
            >
              <div className="space-y-2">
                {cats.data?.map((c) => (
                  <LinhaCat key={c.id} cat={c} />
                ))}
              </div>
            </Secao>

            <Secao
              titulo="Exposição a riscos ocupacionais"
              isLoading={riscos.isLoading}
              isError={riscos.isError}
              oQueFalhou="a exposição a riscos"
              vazio={!riscos.data?.length}
              mensagemVazio="Nenhuma exposição a risco registrada para este colaborador."
            >
              <div className="space-y-2">
                {riscos.data?.map((r) => (
                  <LinhaRisco key={r.id} risco={r} />
                ))}
              </div>
            </Secao>
          </>
        )}
      </CardContent>
    </Card>
  );
}
