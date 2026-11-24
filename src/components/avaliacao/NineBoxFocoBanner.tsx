import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { entradaCard } from './entradaCards';

/**
 * ============================================================================
 * BANNER "FOCO AGORA" — Nine-Box.
 *
 * Faixa compacta de atenção, no MESMO idioma visual dos banners já aprovados
 * no módulo (Metas críticas, Feedbacks, PDI): bordô translúcido, ícone em caixa
 * arredondada, leitura principal + resumo e UMA ação real à direita.
 *
 * ── OS NÚMEROS VÊM DO DADO ──────────────────────────────────────────────────
 * `total`/`emRisco`/`semPdi` chegam de `nineBoxComum.lerAtencao`, que só usa
 * critérios comprováveis:
 *   • quadrante de atenção (Sub-performer — leitura que o componente ANTERIOR
 *     desta aba já fazia com o rótulo "Atenção necessária");
 *   • colaborador classificado sem PDI vinculado (relação real por id).
 * A referência cita também "sem plano de sucesso": NÃO existe plano de sucesso
 * no banco (ver auditoria em `nineBoxComum`), então essa informação não aparece
 * aqui — em vez de ser inventada.
 *
 * Sem nenhum registro em atenção o componente devolve `null`: a cor de alerta
 * nunca é decorativa. `semClassificacao` (fora da matriz por falta de nota ou
 * potencial) entra apenas como AVISO, porque é ausência de dado, não risco.
 * ============================================================================
 */

interface NineBoxFocoBannerProps {
  total: number;
  /** Quantos estão em quadrante de atenção (Sub-performer). */
  emRisco: number;
  /** Quantos classificados estão sem PDI vinculado. */
  semPdi: number;
  /** Quantos ficaram fora da matriz por falta de nota/potencial. */
  semClassificacao?: number;
  /** Aprovados pelo gestor aguardando a validação do Potencial pelo RH. */
  aguardandoRh?: number;
  nomesAguardandoRh?: string[];
  /** Aprovação do gestor pendente/devolvida/invalidada. */
  aguardandoAprovacao?: number;
  nomesAguardandoAprovacao?: string[];
  /** Ciclo em foco — exibido junto das pendências (nome/ciclo corretos). */
  cicloNome?: string;
  /** Posição na cascata (a referência coloca o banner como 2º item). */
  indice?: number;
  /** True quando o filtro de atenção do banner já está aplicado. */
  ativo?: boolean;
  /** Aplica/remove o filtro de atenção — ação real da aba. */
  onVerDetalhes?: () => void;
}

/** Lista curta de nomes no MESMO parágrafo do banner (sem novo componente). */
function nomesCurto(nomes: string[] = []): string {
  const limpos = nomes.filter(Boolean);
  if (limpos.length === 0) return '';
  if (limpos.length <= 3) return limpos.join(', ');
  return `${limpos.slice(0, 3).join(', ')} e mais ${limpos.length - 3}`;
}

export function NineBoxFocoBanner({
  total,
  emRisco,
  semPdi,
  semClassificacao = 0,
  aguardandoRh = 0,
  nomesAguardandoRh = [],
  aguardandoAprovacao = 0,
  nomesAguardandoAprovacao = [],
  cicloNome = '',
  indice = 1,
  ativo = false,
  onVerDetalhes,
}: NineBoxFocoBannerProps) {
  const pendenciaDeFluxo = aguardandoRh > 0 || aguardandoAprovacao > 0;
  if (total <= 0 && !pendenciaDeFluxo && semClassificacao <= 0) return null;

  const resumo = [emRisco > 0 && `${emRisco} em quadrante de atenção`, semPdi > 0 && `${semPdi} sem PDI vinculado`]
    .filter(Boolean)
    .join('  •  ');
  const listaRh = nomesCurto(nomesAguardandoRh);
  const listaAprovacao = nomesCurto(nomesAguardandoAprovacao);

  return (
    <motion.div
      {...entradaCard(indice)}
      className="flex flex-col gap-3 rounded-xl border border-destructive-vivid/30 bg-destructive-vivid/10 px-4 py-3 shadow-[0_0_18px_-12px_hsl(var(--destructive-vivid))] lg:flex-row lg:items-center lg:gap-5"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive-vivid/15 text-destructive-vivid">
          <AlertTriangle className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wider text-destructive-vivid">Foco agora</p>
          <p className="text-[13px] font-medium leading-tight">
            {total > 0
              ? `${total} ${total === 1 ? 'talento precisa' : 'talentos precisam'} de atenção.`
              : 'Avaliações aguardando etapa obrigatória do fluxo.'}
          </p>
          {resumo && <p className="text-[11px] leading-tight text-muted-foreground">{resumo}</p>}
          {aguardandoRh > 0 && (
            <p className="text-[10px] leading-tight text-muted-foreground/70">
              <span className="font-medium text-foreground/80">{aguardandoRh}</span>{' '}
              {aguardandoRh === 1 ? 'aprovada pelo gestor aguardando' : 'aprovadas pelo gestor aguardando'} a validação
              do Potencial pelo RH
              {listaRh ? `: ${listaRh}.` : '.'}
              {cicloNome ? ` Ciclo: ${cicloNome}.` : ''}
            </p>
          )}
          {aguardandoAprovacao > 0 && (
            <p className="text-[10px] leading-tight text-muted-foreground/70">
              <span className="font-medium text-foreground/80">{aguardandoAprovacao}</span>{' '}
              {aguardandoAprovacao === 1 ? 'avaliação com' : 'avaliações com'} aprovação do gestor pendente, devolvida
              ou invalidada
              {listaAprovacao ? `: ${listaAprovacao}.` : '.'}
              {cicloNome ? ` Ciclo: ${cicloNome}.` : ''}
            </p>
          )}
          {semClassificacao > 0 && (
            <p className="text-[10px] leading-tight text-muted-foreground/70">
              {semClassificacao} {semClassificacao === 1 ? 'registro está' : 'registros estão'} fora da matriz por falta
              de nota ou potencial.
            </p>
          )}
        </div>
      </div>

      {total > 0 && onVerDetalhes && (
        <Button
          variant="outline"
          size="sm"
          onClick={onVerDetalhes}
          className="h-8 shrink-0 gap-1.5 self-start border-destructive-vivid/30 bg-transparent text-xs text-destructive-vivid transition-colors hover:bg-destructive-vivid/10 hover:text-destructive-vivid lg:self-auto"
        >
          {ativo ? 'Limpar atenção' : 'Ver detalhes'}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      )}
    </motion.div>
  );
}
