import { Card, CardContent } from '@/components/ui/card';
import { AlertasRHWidget } from './analytics/widgets';
import { ProximasAtividadesCard } from './ProximasAtividadesCard';
import type { BriefingData } from './MorningBriefing';

/**
 * Funde "Alertas de RH" + "Próximas Atividades" numa única coluna — mesma
 * razão do `SaudeResumoCard`: reproduzir as 3 colunas da Linha 3 da
 * referência sem remover nenhum dos 4 widgets que já existiam. Um único
 * scroll compartilhado (não dois aninhados — lição da correção anterior).
 */
export function AlertasProximasCard({ briefing }: { briefing: BriefingData | undefined }) {
  return (
    <Card className="flex h-full min-h-[210px] flex-col overflow-hidden border border-border/60 rounded-xl">
      {/* Sem teto de altura artificial: um `max-h` pequeno cortava o conteúdo
          antes de a linha (esticada pelo Grid até a altura de "Atividade
          Recente") terminar — sobrava vazio visível abaixo do conteúdo
          cortado. Cresce com o conteúdo real; o teto generoso (600px) é só
          uma rede de segurança para uma lista anormalmente longa. */}
      <CardContent className="min-h-0 flex-1 max-h-[600px] overflow-y-auto custom-scrollbar p-4 space-y-3">
        <div>
          <p className="text-overline text-muted-foreground normal-case tracking-normal mb-2">Alertas de RH</p>
          <AlertasRHWidget maxItems={3} compact />
        </div>
        <div className="border-t border-border/40 pt-3">
          <ProximasAtividadesCard bare maxItems={3} briefing={briefing} />
        </div>
      </CardContent>
    </Card>
  );
}
