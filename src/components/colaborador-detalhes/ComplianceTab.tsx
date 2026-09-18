import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useMedidasDisciplinaresColaborador } from '@/hooks';
import { useConsentimentosColaborador } from '@/hooks/useComplianceColaborador';

function Secao({ titulo, isLoading, vazio, children }: { titulo: string; isLoading: boolean; vazio: boolean; children: React.ReactNode }) {
  return (
    <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
      <CardContent className="p-6 space-y-3">
        <p className="text-sm font-medium">{titulo}</p>
        {isLoading ? <Spinner /> : vazio ? (
          <p className="text-sm text-muted-foreground">Nenhum registro encontrado.</p>
        ) : children}
      </CardContent>
    </Card>
  );
}

// PARTE I: medidas disciplinares são informação restrita (Fase 15), mas hoje
// não há nenhuma checagem de permissão nem no Kanban administrativo nem na
// rota `medidas-disciplinares` (sem <AdminRoute>) — esta aba expõe exatamente
// o mesmo nível de detalhe já acessível hoje, sem adicionar nem remover gate.
export function ComplianceTab({ colaboradorId }: { colaboradorId: string }) {
  const { data: medidas, isLoading: isLoadingMedidas } = useMedidasDisciplinaresColaborador(colaboradorId);
  const { data: consentimentos, isLoading: isLoadingConsentimentos } = useConsentimentosColaborador(colaboradorId);

  return (
    <div className="space-y-6">
      <Secao titulo="Medidas Disciplinares" isLoading={isLoadingMedidas} vazio={!medidas?.length}>
        <div className="space-y-2">
          {(medidas as any[] || []).map(m => (
            <div key={m.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/20">
              <span>{m.tipo} — {m.data_ocorrencia}</span>
              <Badge variant={m.gravidade === 'grave' ? 'destructive' : 'secondary'}>{m.gravidade}</Badge>
            </div>
          ))}
        </div>
      </Secao>

      <Secao titulo="Consentimentos LGPD" isLoading={isLoadingConsentimentos} vazio={!consentimentos?.length}>
        <div className="space-y-2">
          {(consentimentos as any[] || []).map(c => (
            <div key={c.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/20">
              <span>{c.tipo} (v{c.versao})</span>
              <Badge variant={c.aceito ? 'default' : 'secondary'}>{c.aceito ? 'Aceito' : 'Revogado/pendente'}</Badge>
            </div>
          ))}
        </div>
      </Secao>

      <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
        <CardContent className="p-6">
          <p className="text-sm font-medium mb-1">Eventos eSocial</p>
          <p className="text-sm text-muted-foreground">
            Não é possível listar aqui os eventos eSocial deste colaborador: a tabela `esocial_eventos` não
            tem uma coluna `colaborador_id` filtrável — a referência ao colaborador fica dentro de um campo
            `Json` livre. Trazer isso exigiria escanear todos os eventos da empresa no cliente, o que viola
            a diretriz de performance do Dossiê. Consulte o módulo de eSocial da empresa para esses dados.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
