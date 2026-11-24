/**
 * ============================================================================
 * /turnos — TURNOS & ESCALAS (painel de planejamento de jornadas).
 * ============================================================================
 *
 * A página é uma CASCA fina: `PageTitle` (título do documento) + `PageLayout`
 * sem `title`/`description`/`actions` — como em Horas Extras — porque o
 * cabeçalho desta área tem controles próprios (navegação de período, Hoje,
 * Semana/Mês/Lista e as duas ações) e é desenhado por `CabecalhoTurnos` dentro
 * do corpo, com a MESMA tipografia do cabeçalho padrão (`PageLayout`).
 *
 * Toda a tela vive em `components/turnos/TurnosConteudo.tsx`: estado do período,
 * visualização, filtros, KPIs, calendário, coluna lateral e as cinco janelas.
 * Nada de mock — os números saem de `turnos` e `escalas_trabalho`
 * (`services/turnoService.ts`), e as funcionalidades antigas continuam
 * acessíveis (criar/excluir turno agora em `DialogoTurno`/`DialogoGerenciarTurnos`).
 * ============================================================================
 */
import { PageTitle } from '@/components/PageTitle';
import { PageLayout } from '@/components/layout';
import { TurnosConteudo } from '@/components/turnos/TurnosConteudo';

export default function TurnosPage() {
  return (
    <>
      <PageTitle title="Turnos & Escalas" description="Planejamento de jornadas de trabalho da equipe" />
      <PageLayout>
        <TurnosConteudo />
      </PageLayout>
    </>
  );
}
