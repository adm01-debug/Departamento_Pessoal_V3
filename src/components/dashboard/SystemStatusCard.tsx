import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Activity, Database, Server, ShieldCheck, AlertTriangle,
  Bell, Zap, Trash2, Loader2, ChevronRight,
} from 'lucide-react';
import { useSystemHealth } from '@/hooks/useSystemHealth';
import { edgeFunctionsService } from '@/services/edgeFunctionsService';
import { safeErrorMessage } from '@/utils/safeError';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { dashboardTooltips } from '@/constants/tooltips';
// MOCK VISUAL — ver src/mocks/dashboardMockData.ts (só ativo em dev + VITE_DASHBOARD_MOCK=true).
import { isDashboardMockEnabled, mockSystemHealth } from '@/mocks/dashboardMockData';

/** Uma linha de indicador do card, com o ícone circular do padrão do dashboard. */
function StatusRow({ icon: Icon, label, value, tone = 'primary', tooltip }: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone?: 'primary' | 'warning' | 'destructive';
  tooltip?: string;
}) {
  const toneStyles = {
    primary: 'bg-primary/10 text-primary',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  } as const;
  // `tailwind-merge` (usado por `cn`) trata `text-overline` como parte do
  // grupo de conflito de cor de texto e descartava a classe ao combiná-la com
  // `text-warning`/`text-destructive` na mesma chamada — o valor caía para o
  // tamanho padrão do navegador (16px) em vez dos 10px do token. Construir a
  // classe como string simples (sem `cn`) evita o merge indevido.
  const valueToneText = {
    primary: 'text-foreground',
    warning: 'text-warning',
    destructive: 'text-destructive',
  } as const;

  return (
    <div className="flex flex-1 items-center justify-between gap-2 border-t border-border/30 py-1 first:border-t-0">
      <span className="flex min-w-0 items-center gap-2">
        <i className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full', toneStyles[tone])}>
          <Icon className="h-2.5 w-2.5" />
        </i>
        <span className="truncate text-overline font-body text-muted-foreground normal-case tracking-normal">{label}</span>
        {tooltip && <InfoTooltip content={tooltip} />}
      </span>
      <span className={`shrink-0 text-overline font-display font-medium tabular-nums ${valueToneText[tone]}`}>
        {value}
      </span>
    </div>
  );
}

/**
 * "Status do Sistema": leitura de saúde em tempo real + as rotinas de
 * manutenção (antes no rodapé do Painel de Comando, que virou um card compacto
 * de eventos). Nenhuma ação foi perdida na reorganização.
 *
 * Fonte: `useSystemHealth()` — hook já existente, também usado pelo Header.
 */
export function SystemStatusCard() {
  const realHealth = useSystemHealth();
  // MOCK VISUAL — substitui o resultado já resolvido do hook real acima;
  // nenhuma chamada extra é feita. Remover esta linha desativa o mock aqui.
  const { latency, status, metrics } = isDashboardMockEnabled() ? mockSystemHealth : realHealth;
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAction = async (id: string, fn: () => Promise<unknown>, successMsg: string) => {
    setRunningAction(id);
    try {
      await fn();
      toast.success(successMsg);
    } catch (err) {
      toast.error(safeErrorMessage(err, 'Erro ao executar ação.'));
    } finally {
      setRunningAction(null);
    }
  };

  const statusBadge =
    status === 'online' ? { label: 'Normal', tone: 'primary' as const } :
    status === 'slow' ? { label: 'Lento', tone: 'warning' as const } :
    { label: 'Offline', tone: 'destructive' as const };
  const statusBadgeStyles = {
    primary: 'bg-primary/10 text-primary',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  } as const;

  const acoes = [
    { id: 'alertas', icon: Bell, label: 'Alertas DP', run: () => edgeFunctionsService.dispararAlertasDP(), msg: 'Alertas DP disparados!', tooltip: dashboardTooltips.systemStatus.acoes.alertasDp },
    { id: 'cache', icon: Zap, label: 'Limpar Cache', run: () => edgeFunctionsService.cache({ action: 'invalidate' }), msg: 'Cache limpo!', tooltip: dashboardTooltips.systemStatus.acoes.limparCache },
    { id: 'limpeza', icon: Trash2, label: 'Limpeza', run: () => edgeFunctionsService.limpezaDados(), msg: 'Limpeza concluída!', tooltip: dashboardTooltips.systemStatus.acoes.limpeza },
    { id: 'health', icon: Database, label: 'Saúde', run: () => edgeFunctionsService.healthcheck(), msg: 'Sistema saudável!', tooltip: dashboardTooltips.systemStatus.acoes.saude },
  ];

  return (
    <Card className="flex h-full min-h-[110px] flex-col overflow-hidden border border-border/60 rounded-xl">
      <CardHeader className="p-3 pb-1.5 space-y-0">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-1.5 whitespace-nowrap text-base">
            <Activity className={cn('h-3.5 w-3.5 shrink-0',
              status === 'online' ? 'text-primary' : status === 'slow' ? 'text-warning' : 'text-destructive')} />
            Status do Sistema
            <InfoTooltip content="Saúde da infraestrutura em tempo real: tempo de resposta do banco e da API, taxa de sucesso das chamadas e falhas recentes." />
          </CardTitle>
          {/* Sem `cn()`: combinado com a classe de cor (bg + text) na mesma
              chamada, o tailwind-merge derrubava `text-overline` (mesmo bug
              corrigido no valor de StatusRow). */}
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-overline font-medium normal-case tracking-normal ${statusBadgeStyles[statusBadge.tone]}`}>
            {statusBadge.label}
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col p-3 pt-0">
        {/* `flex flex-1 flex-col`: as 4 linhas dividem igualmente o espaço
            vertical disponível (cada `StatusRow` também ganhou `flex-1`),
            em vez de empilharem compactas no topo e sobrar um vão vazio
            antes da barra de ações. */}
        <div className="flex min-h-0 flex-1 flex-col">
          <StatusRow
            icon={Database}
            label="Banco de Dados"
            value={latency !== null ? `${latency}ms` : '—'}
            tone={status === 'offline' ? 'destructive' : status === 'slow' ? 'warning' : 'primary'}
            tooltip={dashboardTooltips.systemStatus.bancoDeDados}
          />
          <StatusRow
            icon={Server}
            label="API"
            value={metrics ? `${Math.round(metrics.avg_latency)}ms` : '—'}
            tooltip={dashboardTooltips.systemStatus.api}
          />
          <StatusRow
            icon={ShieldCheck}
            label="Taxa de sucesso"
            value={metrics ? `${metrics.success_rate}%` : '—'}
            tone={metrics && metrics.success_rate < 90 ? 'warning' : 'primary'}
            tooltip={dashboardTooltips.systemStatus.taxaSucesso}
          />
          <StatusRow
            icon={AlertTriangle}
            label="Falhas recentes"
            value={metrics ? String(metrics.recent_failures) : '—'}
            tone={metrics && metrics.recent_failures > 0 ? 'destructive' : 'primary'}
            tooltip={dashboardTooltips.systemStatus.falhasRecentes}
          />
        </div>

        {/* `mt-auto`: mantém a barra de ações colada no rodapé do card —
            redundante com o `flex-1` das 4 linhas acima (que já consomem
            toda a folga), mas serve de rede de segurança. */}
        <div className="mt-auto flex shrink-0 items-center gap-1 border-t border-border/30 pt-1.5">
          {acoes.map((a) => (
            <InfoTooltip key={a.id} content={a.tooltip}>
              <Button
                variant="ghost"
                size="icon"
                aria-label={a.label}
                disabled={!!runningAction}
                onClick={() => handleAction(a.id, a.run, a.msg)}
                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary"
              >
                {runningAction === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <a.icon className="h-3.5 w-3.5" />}
              </Button>
            </InfoTooltip>
          ))}
          <button
            onClick={() => navigate('/admin/telemetria')}
            className="ml-auto flex items-center gap-0.5 text-overline text-info hover:underline normal-case tracking-normal"
          >
            Ver detalhes
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
