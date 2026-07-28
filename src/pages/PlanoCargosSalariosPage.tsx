import { useMemo, useState } from 'react';
import { PageTitle } from '@/components/PageTitle';
import { PageLayout } from '@/components/layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { TrendingUp } from 'lucide-react';
import { usePcsPlanos } from '@/hooks/usePcs';
import { PcsPlanoHeader } from '@/components/pcs/PcsPlanoHeader';
import { PcsFatoresTab } from '@/components/pcs/PcsFatoresTab';
import { PcsAvaliacaoTab } from '@/components/pcs/PcsAvaliacaoTab';
import { PcsGradesTab } from '@/components/pcs/PcsGradesTab';
import { PcsEquidadeTab } from '@/components/pcs/PcsEquidadeTab';
import { PcsBenchmarkTab } from '@/components/pcs/PcsBenchmarkTab';
import type { PcsStatus } from '@/types/pcs';

/**
 * Plano de Cargos e Salários — avaliação por pontos, matriz salarial,
 * equidade interna, benchmark de mercado e simulação de impacto na folha.
 */
export default function PlanoCargosSalariosPage() {
  const { planos, isLoading, criar, atualizar } = usePcsPlanos();
  const [selecionado, setSelecionado] = useState<string | null>(null);

  // Estado derivado: sem plano escolhido, assume o mais recente.
  const planoId = useMemo(() => {
    if (selecionado && planos.some((p) => p.id === selecionado)) return selecionado;
    return planos[0]?.id ?? null;
  }, [selecionado, planos]);

  return (
    <>
      <PageTitle title="Plano de Cargos e Salários" description="Estrutura salarial, equidade interna e impacto na folha" />
      <PageLayout
        title="Plano de Cargos e Salários"
        description="Avaliação por pontos, matriz salarial, equidade e simulação de impacto"
        icon={<TrendingUp className="h-5 w-5 text-primary-foreground" />}
      >
        {isLoading ? (
          <div className="flex justify-center p-12"><Spinner size="lg" /></div>
        ) : (
          <div className="space-y-6">
            <PcsPlanoHeader
              planos={planos}
              planoId={planoId}
              onSelect={setSelecionado}
              onCriar={(input) => criar.mutate(input)}
              onStatus={(status: PcsStatus) => planoId && atualizar.mutate({ id: planoId, patch: { status } })}
              isCriando={criar.isPending}
            />

            <Tabs defaultValue="fatores">
              <TabsList className="flex-wrap">
                <TabsTrigger value="fatores">Fatores</TabsTrigger>
                <TabsTrigger value="avaliacao">Avaliação de cargos</TabsTrigger>
                <TabsTrigger value="grades">Matriz salarial</TabsTrigger>
                <TabsTrigger value="equidade">Equidade & impacto</TabsTrigger>
                <TabsTrigger value="mercado">Mercado</TabsTrigger>
              </TabsList>

              <TabsContent value="fatores" className="mt-4"><PcsFatoresTab planoId={planoId} /></TabsContent>
              <TabsContent value="avaliacao" className="mt-4"><PcsAvaliacaoTab planoId={planoId} /></TabsContent>
              <TabsContent value="grades" className="mt-4"><PcsGradesTab planoId={planoId} /></TabsContent>
              <TabsContent value="equidade" className="mt-4"><PcsEquidadeTab planoId={planoId} /></TabsContent>
              <TabsContent value="mercado" className="mt-4"><PcsBenchmarkTab /></TabsContent>
            </Tabs>
          </div>
        )}
      </PageLayout>
    </>
  );
}
