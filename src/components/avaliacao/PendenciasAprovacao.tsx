/**
 * ============================================================================
 * SUBABA "AGUARDANDO GESTOR" — fila de aprovação formal da avaliação.
 *
 * ONDE VIVE: dentro da aba **Feedbacks** (`FeedbacksTab`), como SEGUNDA
 * visualização interna — a primeira ("Avaliações") é a lista aprovada.
 *
 * O QUE MUDA COM A PADRONIZAÇÃO: os cards desta fila usam o MESMO componente
 * canônico da listagem (`CartaoFeedbackCanonico`) — mesmas quatro regiões,
 * mesmos controles, mesmas posições. A fila só acrescenta o que é próprio do
 * fluxo (justificativa da devolução e data de envio).
 *
 * CONTROLES (regra ÚNICA em `getFeedbackActions`, nunca duplicada aqui):
 *   • RH/admin: `Enviar`/`Reenviar ao gestor` (visível só para quem pode);
 *   • gestor:   `Devolver para correção` · `Aprovar avaliação`;
 *   • RH:       `Validar Potencial` (visível só para o papel `rh`);
 *   • todos:    `Ver avaliação`.
 * Devolver/Aprovar permanecem VISÍVEIS mesmo quando bloqueados — desabilitados
 * com o motivo no `title`. A decisão real é sempre do servidor.
 * ============================================================================
 */

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Users } from 'lucide-react';

import { entradaCard } from './entradaCards';
import { CartaoFeedbackCanonico } from './CartaoFeedbackCanonico';
import { DialogoDevolucao } from './DialogoDevolucao';
import { formatarData } from './desempenhoComum';
import { derivarFeedbacks } from './feedbacksComum';
import { normalizarFeedback, type FeedbackCanonico } from './feedbackCanonico';
import { type PendenciaAprovacao } from './aprovacaoGestor';
import { type PapeisAvaliacao } from './papeisAvaliacao';

interface PendenciasAprovacaoProps {
  /** Fila derivada por `derivarPendencias` (nenhuma consulta nova). */
  pendencias: PendenciaAprovacao[];
  /** Papel do usuário (`admin` | `rh` | `gestor` | `user` | null). */
  papel?: string | null;
  /**
   * LISTA completa de papéis da conta (`user_roles` → `['admin','gestor']`).
   * É a fonte das capacidades: ter `admin` NÃO anula `gestor`.
   */
  papeis?: readonly string[] | null;
  /**
   * `true` quando a escrita está liberada (modo real ou vitrine com persistência
   * local). Em demonstração sem gravação os controles ficam desabilitados com a
   * razão visível.
   */
  acoesHabilitadas?: boolean;
  /** Uma operação de aprovação em andamento (desabilita todos os controles). */
  salvando?: boolean;
  /**
   * Onde a decisão é persistida — muda só o TEXTO do aviso:
   *  • `real`: RPC oficial;
   *  • `demonstracao`: as decisões ficam salvas LOCALMENTE neste navegador.
   */
  modo?: 'real' | 'demonstracao';
  /** Índice inicial da cascata de entrada. */
  indiceBase?: number;
  onVerAvaliacao?: (p: PendenciaAprovacao) => void;
  onEnviar?: (p: PendenciaAprovacao) => void;
  onDecidir?: (p: PendenciaAprovacao, decisao: 'aprovado' | 'devolvido', justificativa?: string | null) => void;
  onValidarPotencial?: (p: PendenciaAprovacao) => void;
}

export function PendenciasAprovacao({
  pendencias,
  papel,
  papeis,
  acoesHabilitadas = false,
  modo = 'real',
  salvando = false,
  indiceBase = 3,
  onVerAvaliacao,
  onEnviar,
  onDecidir,
  onValidarPotencial,
}: PendenciasAprovacaoProps) {
  /** Devolução em curso (o diálogo exige justificativa ≥ MIN caracteres). */
  const [devolvendo, setDevolvendo] = useState<PendenciaAprovacao | null>(null);

  /* Capacidades da CONTA (lista de papéis): ter `admin` não anula `gestor`. */
  const papeisEfetivos: PapeisAvaliacao = papeis ?? papel;

  /**
   * MODELO CANÔNICO de cada linha — o MESMO que a listagem usa. A derivação lê
   * só o que a pendência já traz (`feedback`, nomes, cargo/departamento) e passa
   * a própria linha como fonte do gestor responsável e da situação da aprovação.
   */
  const itens = useMemo(() => {
    return pendencias
      .map((p) => {
        const derivado = derivarFeedbacks([p.feedback ?? {}], {
          colaboradores: [
            {
              id: p.colaboradorId,
              nome_completo: p.colaborador,
              cargo: p.cargo,
              departamento: p.departamento,
            },
          ],
          ciclos: p.cicloId ? [{ id: p.cicloId, nome: p.cicloNome }] : [],
        })[0];
        if (!derivado) return null;
        const item: FeedbackCanonico = normalizarFeedback(derivado, {
          cicloNome: p.cicloNome,
          pendencia: p,
          gestorResponsavel: p.gestorResponsavel,
          papeis: papeisEfetivos,
          acoesHabilitadas,
          podeVerColaborador: false,
        });
        return { p, item };
      })
      .filter((x): x is { p: PendenciaAprovacao; item: FeedbackCanonico } => x !== null);
  }, [pendencias, papeisEfetivos, acoesHabilitadas]);

  if (pendencias.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/40 px-6 py-12 text-center">
        <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
        <p className="text-[13px] font-medium">Nenhuma avaliação na fila de aprovação</p>
        <p className="max-w-md text-[11px] text-muted-foreground">
          Quando o RH enviar uma avaliação consolidada, ela aparece aqui para o gestor aprovar ou devolver.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {itens.map(({ p, item }, i) => (
          <motion.div key={p.id} {...entradaCard(indiceBase + i)}>
            <CartaoFeedbackCanonico
              item={item}
              contexto="fila"
              acoes={['ver', 'enviar', 'devolver', 'aprovar', 'validarPotencial']}
              previaTextos
              justificativa={p.justificativa}
              enviadoEm={p.enviadoEm ? formatarData(p.enviadoEm) : null}
              quadrante={p.quadrante}
              salvando={salvando}
              titulo={p.motivoNaoClassificado ?? undefined}
              onVer={() => onVerAvaliacao?.(p)}
              onEnviar={() => onEnviar?.(p)}
              onDevolver={() => setDevolvendo(p)}
              onAprovar={() => onDecidir?.(p, 'aprovado', null)}
              onValidarPotencial={() => onValidarPotencial?.(p)}
            />
          </motion.div>
        ))}
      </div>

      {!acoesHabilitadas && (
        <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Users className="h-3 w-3 shrink-0" />
          Em demonstração a fila é somente de leitura: os registros fictícios nunca são gravados. Os controles de
          aprovação são liberados no modo real.
        </p>
      )}

      {acoesHabilitadas && modo === 'demonstracao' && (
        <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Users className="h-3 w-3 shrink-0" />
          Demonstração: as decisões ficam salvas LOCALMENTE neste navegador e não são enviadas ao banco — os mocks
          permanecem intactos.
        </p>
      )}

      {/* Devolução exige justificativa (mínimo de 10 caracteres, igual à RPC).
          A JANELA é a compartilhada (`DialogoDevolucao`) — a mesma do card/modal
          da listagem, com a mesma animação e a mesma regra. */}
      <DialogoDevolucao
        pendencia={devolvendo}
        aberto={devolvendo !== null}
        salvando={salvando}
        onOpenChange={(aberto) => !aberto && setDevolvendo(null)}
        onConfirmar={(justificativa) => {
          if (!devolvendo) return;
          onDecidir?.(devolvendo, 'devolvido', justificativa);
          setDevolvendo(null);
        }}
      />
    </>
  );
}
