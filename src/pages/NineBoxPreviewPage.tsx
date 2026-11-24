/**
 * ============================================================================
 * PRÉVIA LOCAL · CONTROLES DO FEEDBACK (Nine-Box) — SOMENTE EM DESENVOLVIMENTO.
 *
 * Para que serve: conferir APARÊNCIA e RESPONSIVIDADE do rodapé operacional
 * (`FeedbackAcoesRodape`) e da sua integração no modal aprovado
 * (`FeedbackDetalheDialog`) SEM depender do banco.
 *
 * ── GARANTIAS ───────────────────────────────────────────────────────────────
 *  • A rota é registrada em `App.tsx` apenas quando `import.meta.env.DEV` — e
 *    esta página também devolve `null` fora de DEV (dupla trava; em produção o
 *    bloco é eliminado pelo empacotador).
 *  • NÃO usa `NINEBOX_MODO_REAL_ATIVO` (a flag continua `false` globalmente).
 *  • NÃO executa RPC e NÃO fala com o Supabase: tudo vem do serviço SIMULADO
 *    abaixo, que só registra as chamadas em memória para você conferir.
 *  • NÃO usa dado real: os registros são fictícios (`previa-*`).
 *  • NÃO altera nenhum comportamento da aplicação: o componente real só aceita
 *    injeção de prévia quando `import.meta.env.DEV` é verdadeiro.
 * ============================================================================
 */

import { useMemo, useState } from 'react';
import { FeedbackDetalheDialog } from '@/components/avaliacao/FeedbackDetalheDialog';
import { FeedbackAcoesRodape, type ServicoAcoes } from '@/components/avaliacao/FeedbackAcoesRodape';
import type { PapelApp } from '@/components/avaliacao/acoesFeedback';
import type { FeedbackDerivado } from '@/components/avaliacao/feedbacksComum';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/* ─── Cenários do selo de Potencial (dado simulado por empresa fictícia) ──── */

const CENARIOS_SELO = [
  { rotulo: 'Aguardando validação', empresa: 'previa-emp-aguardando', validacao: null, versao: 'h1' },
  { rotulo: 'Validado pelo RH', empresa: 'previa-emp-validado', validacao: 'h1', versao: 'h1' },
  { rotulo: 'Validação desatualizada', empresa: 'previa-emp-desatualizado', validacao: 'h1', versao: 'h2' },
] as const;

/** Item fictício no formato que o modal consome (`FeedbackDerivado`). */
function itemPrevia(over: Record<string, unknown> = {}, empresa = 'previa-emp-aguardando'): FeedbackDerivado {
  return {
    feedback: {
      id: 'previa-f1',
      empresa_id: empresa,
      ciclo_id: 'previa-ciclo-1',
      status: 'pendente',
      tipo: 'gestor',
      potencial: 4,
      nota_geral: 4.5,
      avaliado_id: 'previa-colab-1',
      avaliador_id: 'previa-colab-2',
      pontos_fortes: 'Entrega consistente e comunicação clara com o time.',
      pontos_melhoria: 'Delegação e priorização de demandas concorrentes.',
      comentarios: 'Ciclo fechado no prazo, com evolução visível no trimestre.',
      ...over,
    },
    avaliado: 'Ana Silva (fictícia)',
    avaliador: 'Bruno Souza (fictício)',
    tipoRotulo: 'Avaliação do gestor',
    data: '10/09/2026',
    prazo: '30/09/2026',
    nota: 4.5,
    notaFormatada: '4,5',
    cargo: 'Analista de RH',
    departamento: 'Departamento Pessoal',
    faixa: { nota: 4.5, rotulo: 'Excelente', tinta: 'text-success', badge: '', barra: '' },
  } as unknown as FeedbackDerivado;
}

/** Registro local de tudo que a prévia pediu (prova de que nada saiu do navegador). */
interface Chamada {
  metodo: string;
  detalhe: string;
  idOperacao?: string;
}

/* ─── Página (dupla trava de DEV) ─────────────────────────────────────────── */

export default function NineBoxPreviewPage() {
  if (!import.meta.env.DEV) return null;
  return <Previa />;
}

function Previa() {
  const [papel, setPapel] = useState<PapelApp>('rh');
  const [falhar, setFalhar] = useState(false);
  const [chamadas, setChamadas] = useState<Chamada[]>([]);
  const [detalhe, setDetalhe] = useState<FeedbackDerivado | null>(null);
  const [aberto, setAberto] = useState(false);
  const [itemSelo, setItemSelo] = useState(0);

  /** Serviço SIMULADO: em memória, com atraso, sem Supabase e sem RPC. */
  const servicoSimulado = useMemo<ServicoAcoes>(() => {
    const registrar = (metodo: string, texto: string, idOperacao?: string) =>
      setChamadas((atual) => [{ metodo, detalhe: texto, idOperacao }, ...atual].slice(0, 12));
    const espera = () => new Promise((r) => setTimeout(r, 450));

    return {
      /** Vínculos: a prévia não lê o banco e não simula vínculo — quem simula a
       *  RESPONSABILIDADE do gestor é o flag `responsavel` do `previa`. */
      listarVinculos: async () => [],
      /** Decisão da aprovação: a prévia NUNCA simula aprovação real — devolve
       *  recusa explícita, para não confundir demonstração com gravação. */
      decidirAprovacaoGestor: async () => {
        await espera();
        throw new Error('Prévia local: a decisão da aprovação não é executada aqui — nenhuma RPC foi chamada.');
      },
      listarValidacoesPotencial: async (empresaId: string) => {
        const c = CENARIOS_SELO.find((x) => x.empresa === empresaId);
        return c?.validacao ? [{ feedback_id: 'previa-f1', versao_avaliacao: c.validacao, potencial_validado: 4 }] : [];
      },
      listarVersoesAvaliacao: async (empresaId: string) => {
        const c = CENARIOS_SELO.find((x) => x.empresa === empresaId);
        return [{ feedback_id: 'previa-f1', versao_avaliacao: c?.versao ?? 'h1' }];
      },
      finalizarFeedback: async (p) => {
        await espera();
        registrar(`finalizarFeedback(${p.acao})`, String(p.motivo ?? 'sem justificativa'), p.idOperacao);
        if (falhar) throw new Error('ERRO simulado pela prévia — nenhuma RPC foi executada.');
        return {
          ok: true,
          status_anterior: 'pendente',
          status_novo: p.acao === 'cancelar' ? 'cancelado' : p.acao === 'concluir' ? 'concluido' : 'pendente',
          auditoria_id: 'previa-aud-1',
          idempotente: false,
        };
      },
      validarPotencialAvaliacao: async (p) => {
        await espera();
        registrar('validarPotencialAvaliacao', 'Potencial 4/5', p.idOperacao);
        if (falhar) throw new Error('ERRO simulado pela prévia — nenhuma RPC foi executada.');
        return {
          ok: true,
          validacao_id: 'previa-v1',
          versao_avaliacao: 'h1',
          potencial_validado: 4,
          idempotente: false,
        };
      },
    };
  }, [falhar]);

  const cenarios = useMemo(
    () => [
      {
        id: 'pendente',
        titulo: '1 · Pendente',
        texto: 'Concluir habilitado; Cancelar disponível; Reabrir bloqueado com o motivo real.',
        item: itemPrevia(),
      },
      {
        id: 'concluida',
        titulo: '2 · Concluída',
        texto: 'Concluir bloqueado; Cancelar exige reabrir antes; Reabrir disponível.',
        item: itemPrevia({ status: 'concluido' }),
      },
      {
        id: 'cancelamento',
        titulo: '3 · Cancelamento com justificativa',
        texto: 'Em “Cancelar avaliação”: diálogo com motivo obrigatório (mínimo 3 caracteres).',
        item: itemPrevia(),
      },
      {
        id: 'potencial',
        titulo: '4 · Validação de Potencial (RH)',
        texto: 'Gestor + concluído + Potencial válido + sem validação ⇒ botão “Validar Potencial”.',
        item: itemPrevia({ status: 'concluido' }),
      },
    ],
    []
  );

  const papeis: { valor: PapelApp; rotulo: string }[] = [
    { valor: 'rh', rotulo: 'RH' },
    { valor: 'admin', rotulo: 'admin' },
    { valor: 'gestor', rotulo: 'gestor' },
    { valor: 'user', rotulo: 'avaliador' },
  ];

  const abrir = (item: FeedbackDerivado) => {
    setDetalhe(item);
    setAberto(true);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
              Somente DEV
            </Badge>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
              Dados fictícios
            </Badge>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
              RPCs reais executadas: 0
            </Badge>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
              Modo real: desligado
            </Badge>
          </div>
          <h1 className="font-display text-xl font-semibold">Prévia · Controles do feedback (Nine-Box)</h1>
          <p className="max-w-3xl text-[12px] leading-relaxed text-muted-foreground">
            Rota registrada apenas em desenvolvimento (<code>/dev/ninebox-preview</code>). Usa os componentes REAIS (o
            modal aprovado e o rodapé operacional) com um serviço simulado em memória: nenhuma RPC, nenhuma escrita,
            nenhum dado real. A flag do modo real continua desligada.
          </p>
        </header>

        <section className="flex flex-wrap items-end gap-4 rounded-xl border border-border/50 bg-card/50 p-3">
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Papel simulado</p>
            <div className="flex flex-wrap gap-1.5">
              {papeis.map((p) => (
                <Button
                  key={String(p.valor)}
                  size="sm"
                  variant={papel === p.valor ? 'default' : 'outline'}
                  className="h-8 text-xs"
                  onClick={() => setPapel(p.valor)}
                >
                  {p.rotulo}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Cenário de falha</p>
            <Button
              size="sm"
              variant={falhar ? 'destructive' : 'outline'}
              className="h-8 text-xs"
              onClick={() => setFalhar((v) => !v)}
            >
              {falhar ? 'Erro da RPC simulado' : 'Simular erro da RPC'}
            </Button>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          {cenarios.map((c) => (
            <div key={c.id} className="space-y-2 rounded-xl border border-border/50 bg-card/50 p-4">
              <p className="font-display text-sm font-semibold">{c.titulo}</p>
              <p className="text-[11px] leading-relaxed text-muted-foreground">{c.texto}</p>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => abrir(c.item)}>
                Abrir modal
              </Button>
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-sm font-semibold">
            5 · Selos de situação do Potencial (visíveis para o RH)
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {CENARIOS_SELO.map((c, indice) => (
              <div key={c.empresa} className="space-y-2 rounded-xl border border-border/50 bg-card/50 p-3">
                <p className="text-[11px] font-medium text-muted-foreground">{c.rotulo}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => {
                    setItemSelo(indice);
                    abrir(itemPrevia({ status: 'concluido' }, c.empresa));
                  }}
                >
                  Abrir no modal
                </Button>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-sm font-semibold">Responsividade do rodapé (360 / 560 / 820 px)</h2>
          <div className="flex flex-wrap gap-4">
            {[360, 560, 820].map((largura) => (
              <div key={largura} className="min-w-0 max-w-full space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{largura}px</p>
                {/* `max-w-full` + rolagem DENTRO da caixa: a demonstração estreita
                    não pode empurrar a página inteira (era o único ponto em que a
                    prévia criava rolagem horizontal em telas pequenas). */}
                <div className="max-w-full overflow-x-auto rounded-xl border border-border/50 bg-card/50 p-3">
                  <div style={{ width: largura }} className="max-w-full">
                    <FeedbackAcoesRodape
                      item={itemPrevia({ status: 'concluido' }, CENARIOS_SELO[itemSelo].empresa)}
                      previa={{ servico: servicoSimulado, papel, responsavel: papel === 'gestor' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-sm font-semibold">Chamadas recebidas pelo serviço SIMULADO</h2>
          <div className="rounded-xl border border-border/50 bg-card/50 p-3">
            {chamadas.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                Nenhuma ação executada ainda — e nada aqui sai do navegador.
              </p>
            ) : (
              <ul className="space-y-1">
                {chamadas.map((c, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="font-medium">{c.metodo}</span>
                    <span className="text-muted-foreground">{c.detalhe}</span>
                    <code className="rounded bg-muted/50 px-1 text-[10px]">{c.idOperacao}</code>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <FeedbackDetalheDialog
        item={detalhe}
        aberto={aberto}
        onOpenChange={setAberto}
        previa={{ servico: servicoSimulado, papel, responsavel: papel === 'gestor' }}
      />
    </div>
  );
}
