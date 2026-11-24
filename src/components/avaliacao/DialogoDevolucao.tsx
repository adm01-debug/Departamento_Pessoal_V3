import { useState } from 'react';
import { motion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CascadeDialogFrame } from '@/components/ui/cascade-dialog';
import { cascadeItemVariants } from '@/components/ui/cascade-motion';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import {
  MIN_CARACTERES_JUSTIFICATIVA_DEVOLUCAO,
  validarJustificativaDevolucao,
  type PendenciaAprovacao,
} from './aprovacaoGestor';

/**
 * ============================================================================
 * DIÁLOGO "DEVOLVER PARA CORREÇÃO" — UM componente, dois pontos de entrada.
 *
 * A devolução nasce na fila "Aguardando gestor" e também no card/modal da
 * listagem. Em vez de duplicar texto, validação e animação em cada superfície,
 * o diálogo vive aqui e as duas telas abrem a MESMA janela.
 *
 * A validação local (mínimo de caracteres) é a mesma da RPC; a gravação é
 * decidida pelo chamador (real × demonstração).
 * ============================================================================
 */

export interface DialogoDevolucaoProps {
  pendencia: PendenciaAprovacao | null;
  aberto: boolean;
  salvando?: boolean;
  onOpenChange: (aberto: boolean) => void;
  onConfirmar: (justificativa: string) => void;
}

export function DialogoDevolucao({
  pendencia,
  aberto,
  salvando = false,
  onOpenChange,
  onConfirmar,
}: DialogoDevolucaoProps) {
  const [justificativa, setJustificativa] = useState('');
  const minimoNaoAtingido = !validarJustificativaDevolucao(justificativa).pode;

  const fechar = () => {
    setJustificativa('');
    onOpenChange(false);
  };

  const confirmar = () => {
    if (minimoNaoAtingido) return;
    onConfirmar(justificativa.trim());
    setJustificativa('');
  };

  return (
    <CascadeDialogFrame
      open={aberto}
      onOpenChange={(valor) => !valor && fechar()}
      blocks={3}
      className="max-w-md border-border rounded-none sm:rounded-lg"
      contentClassName="grid gap-3 p-5"
    >
      <motion.div variants={cascadeItemVariants}>
        <DialogHeader>
          <DialogTitle className="font-display text-base">Devolver para correção</DialogTitle>
          <DialogDescription className="text-[11px]">
            {pendencia?.colaborador} · {pendencia?.cicloNome} · {pendencia?.gestorResponsavel}
          </DialogDescription>
        </DialogHeader>
      </motion.div>

      <motion.div variants={cascadeItemVariants} className="space-y-1.5">
        <Label
          htmlFor="justificativa-devolucao"
          className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
        >
          Justificativa obrigatória
        </Label>
        <Textarea
          id="justificativa-devolucao"
          value={justificativa}
          rows={3}
          disabled={salvando}
          onChange={(e) => setJustificativa(e.target.value)}
          placeholder="Explique o que precisa ser corrigido antes da aprovação"
        />
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          A avaliação volta para o RH corrigir e reenviar (mínimo de {MIN_CARACTERES_JUSTIFICATIVA_DEVOLUCAO}{' '}
          caracteres). O histórico é preservado.
        </p>
      </motion.div>

      <motion.div variants={cascadeItemVariants}>
        <DialogFooter className="items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" disabled={salvando} onClick={fechar}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="h-8 text-xs"
            disabled={salvando || minimoNaoAtingido}
            onClick={confirmar}
          >
            {salvando ? 'Enviando…' : 'Confirmar devolução'}
          </Button>
        </DialogFooter>
      </motion.div>
    </CascadeDialogFrame>
  );
}
