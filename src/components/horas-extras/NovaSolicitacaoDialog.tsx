/**
 * ============================================================================
 * DIÁLOGO "NOVA SOLICITAÇÃO" — o formulário que antes vivia solto na página.
 *
 * ANIMAÇÃO — a MESMA janela do popup "Pendências" do sistema (a referência
 * pedida): `PendenciasDialog` abre por `AnimatedCascadeDialog`, cuja moldura é
 * `CascadeDialogFrame` (`ui/cascade-dialog.tsx`). Aqui a moldura é usada
 * DIRETAMENTE, porque este formulário tem layout próprio (cabeçalho + corpo),
 * exatamente como fazem as outras janelas grandes do sistema (Nova Vaga,
 * Detalhe do Evento da Auditoria, Novo Desligamento). Nada de animação nova: o
 * véu (`cascadeOverlayVariants`), a casca que abre "de dentro para fora"
 * (`cascadeShellVariants`) e a cascata dos blocos (`cascadeItemVariants`) vêm
 * de `ui/cascade-motion.ts`.
 *
 *   • Abertura: véu escurecendo + caixa crescendo de 0 até o tamanho final
 *     (0,9 s, `easeInOut`) e, SÓ DEPOIS que ela termina, os blocos entram de
 *     baixo (`y: 8`) — cabeçalho primeiro, formulário em seguida.
 *   • Fechamento: a cascata some de trás para frente e a caixa só então
 *     encolhe (altura, depois largura). O conteúdo permanece MONTADO até o fim
 *     da transição (`forceMount` + `AnimatePresence` da moldura), então não há
 *     piscada nem salto — é por isso que o rascunho não é limpo no fechamento.
 *
 * CAMPOS, VALIDAÇÕES E DIMENSÕES são OS MESMOS de antes: colaborador
 * (`colaborador_id`), data (`data`), horas (`horas_solicitadas`, passo de meia
 * hora) e motivo (`motivo`). O `className` repõe a geometria original da janela
 * (`max-w-[460px]`, `sm:max-w-[520px]`, `sm:rounded-lg`) sobre a casca padrão, e
 * o `contentClassName` mantém o `grid gap-3 p-5` do antigo `DialogContent`. Quem
 * grava continua sendo `criarSolicitacao` do `useHorasExtras` — o diálogo só
 * monta o objeto e aguarda; nenhuma chamada ao Supabase nasce aqui.
 * ============================================================================
 */
import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CascadeDialogFrame } from '@/components/ui/cascade-dialog';
import { cascadeItemVariants } from '@/components/ui/cascade-motion';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatarHoras } from './horasExtrasComum';

export interface NovaSolicitacaoDados {
  colaborador_id: string;
  data: string;
  horas_solicitadas: number;
  motivo: string;
}

export interface NovaSolicitacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Colaboradores disponíveis para o vínculo (vem de `useColaboradores`). */
  colaboradores: readonly { id: string; nome_completo: string }[];
  /** Persiste a solicitação; rejeita em caso de erro (o hook já avisa). */
  onCriar: (dados: NovaSolicitacaoDados) => Promise<void>;
}

const RASCUNHO_VAZIO = { colaborador_id: '', data: '', horas_solicitadas: '', motivo: '' };

/**
 * Blocos que cascateiam na abertura/fechamento: o cabeçalho (título +
 * descrição) e o formulário. É a contagem que define quando a casca começa a
 * encolher na saída — a mesma mecânica do popup de Pendências.
 */
const BLOCOS_CASCATA = 2;

export function NovaSolicitacaoDialog({ open, onOpenChange, colaboradores, onCriar }: NovaSolicitacaoDialogProps) {
  const [rascunho, setRascunho] = useState(RASCUNHO_VAZIO);
  const [salvando, setSalvando] = useState(false);

  /**
   * CADA ABERTURA COMEÇA DO ZERO — e o descarte acontece na ABERTURA, não no
   * fechamento.
   *
   * Antes a limpeza rodava ao fechar; com a saída animada isso apareceria na
   * tela: a janela continua montada durante a transição (é o que garante a
   * animação de saída) e o formulário seria visto se esvaziando. Limpando ao
   * abrir, o usuário fecha com os dados dele à vista e reabre com a janela
   * limpa — nenhum rascunho antigo volta, e o fechamento fica fluido.
   *
   * O ajuste é feito na RENDERIZAÇÃO (padrão do React para reagir a uma prop,
   * o mesmo de `NovaVagaDialog`), não em `useEffect`: não há efeito colateral
   * aqui, só o formulário voltando ao estado inicial quando a janela reabre.
   */
  const [estavaAberta, setEstavaAberta] = useState(open);
  if (open !== estavaAberta) {
    setEstavaAberta(open);
    if (open) {
      setRascunho(RASCUNHO_VAZIO);
      setSalvando(false);
    }
  }

  const horas = Number(rascunho.horas_solicitadas.replace(',', '.'));
  const preenchido =
    rascunho.colaborador_id !== '' &&
    rascunho.data !== '' &&
    rascunho.motivo.trim() !== '' &&
    Number.isFinite(horas) &&
    horas > 0;

  const handleSubmit = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!preenchido || salvando) return;
    setSalvando(true);
    try {
      await onCriar({
        colaborador_id: rascunho.colaborador_id,
        data: rascunho.data,
        horas_solicitadas: horas,
        motivo: rascunho.motivo.trim(),
      });
      onOpenChange(false);
    } catch {
      /* O toast de erro é do hook; o diálogo segue aberto com o rascunho. */
    } finally {
      setSalvando(false);
    }
  };

  return (
    <CascadeDialogFrame
      open={open}
      onOpenChange={onOpenChange}
      blocks={BLOCOS_CASCATA}
      // Geometria da janela PRESERVADA sobre a casca compartilhada: a base
      // (`max-w-[460px]`) é a mesma do antigo `DialogContent`, `sm:max-w-[520px]`
      // é o ajuste que esta modal já tinha e o raio continua o original
      // (`rounded-none` no mobile, `sm:rounded-lg` daí para cima). A cor da
      // borda também é a de antes, e não a do véu padrão.
      className="border-border sm:max-w-[520px] rounded-none sm:rounded-lg"
      // Mesmo corpo do `DialogContent`: coluna de 3 (12 px) com 5 (20 px) de respiro.
      contentClassName="grid gap-3 p-5"
    >
      {/*
        BLOCO 1 — cabeçalho. Os componentes são os mesmos de antes
        (`DialogHeader`/`DialogTitle`/`DialogDescription`), então o Radix
        continua ligando `aria-labelledby`/`aria-describedby` ao conteúdo: a
        animação entra por fora, sem trocar a semântica da janela.
      */}
      <motion.div variants={cascadeItemVariants}>
        <DialogHeader>
          <DialogTitle>Nova solicitação de hora extra</DialogTitle>
          <DialogDescription>
            Registre a hora extra de um colaborador. A solicitação entra como pendente e aguarda aprovação.
          </DialogDescription>
        </DialogHeader>
      </motion.div>

      {/*
        BLOCO 2 — o formulário. Entra logo depois do cabeçalho na abertura e é o
        primeiro a sair no fechamento. Os campos, a ordem, as validações e o
        rodapé continuam exatamente os mesmos.
      */}
      <motion.div variants={cascadeItemVariants}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="he-colaborador">Colaborador *</Label>
            <Select
              value={rascunho.colaborador_id}
              onValueChange={(v) => setRascunho((r) => ({ ...r, colaborador_id: v }))}
            >
              <SelectTrigger id="he-colaborador">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {colaboradores.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome_completo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="he-data">Data *</Label>
              <Input
                id="he-data"
                type="date"
                value={rascunho.data}
                onChange={(e) => setRascunho((r) => ({ ...r, data: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="he-horas">Horas *</Label>
              <Input
                id="he-horas"
                type="number"
                inputMode="decimal"
                step="0.5"
                min="0.5"
                placeholder="2.5"
                value={rascunho.horas_solicitadas}
                onChange={(e) => setRascunho((r) => ({ ...r, horas_solicitadas: e.target.value }))}
              />
              <p className="text-[11px] text-muted-foreground">
                {horas > 0 ? `Equivale a ${formatarHoras(horas)}` : 'Passo de meia hora (ex.: 2.5 = 2h30)'}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="he-motivo">Motivo *</Label>
            <Input
              id="he-motivo"
              placeholder="Ex.: fechamento mensal"
              value={rascunho.motivo}
              onChange={(e) => setRascunho((r) => ({ ...r, motivo: e.target.value }))}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!preenchido || salvando}>
              {salvando ? 'Criando…' : 'Criar solicitação'}
            </Button>
          </DialogFooter>
        </form>
      </motion.div>
    </CascadeDialogFrame>
  );
}
