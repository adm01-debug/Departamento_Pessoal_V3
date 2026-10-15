import { useState } from 'react';
import { motion } from 'framer-motion';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CascadeDialogFrame } from '@/components/ui/cascade-dialog';
import { cascadeItemVariants } from '@/components/ui/cascade-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, Copy, Database, History, User } from 'lucide-react';
import { toast } from 'sonner';
import type { EventoDerivado } from './auditoriaComum';
import { cn } from '@/lib/utils';

/**
 * ============================================================================
 * AUDITORIA — DETALHES DO EVENTO.
 *
 * É aqui (e somente aqui) que o conteúdo técnico aparece: payload anterior/novo
 * completos, campos alterados, registro, IP e user-agent quando existirem. A
 * timeline mostra apenas texto legível — nenhum JSON bruto nas linhas.
 *
 * Nada é fabricado: cada bloco só é renderizado quando o registro tem o dado.
 *
 * O "Copiar ID do registro" (antes no menu de 3 pontos da linha, agora removido
 * por ser redundante com "Ver detalhes") vive AQUI: é a única ação daquele menu
 * que não existia na janela, então foi trazida para junto do próprio ID para
 * não perder acessibilidade.
 * ============================================================================
 */

/**
 * O bloco de JSON só existe quando há conteúdo real. A MESMA condição é usada
 * para contar quantos blocos a cascata do modal vai animar (ver `blocos`).
 */
function temJson(valor: unknown): boolean {
  if (valor === null || valor === undefined) return false;
  const texto = JSON.stringify(valor, null, 2);
  return Boolean(texto) && texto !== '{}' && texto !== 'null';
}

function BlocoJson({ titulo, valor }: { titulo: string; valor: unknown }) {
  if (!temJson(valor)) return null;
  const texto = JSON.stringify(valor, null, 2);
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{titulo}</p>
      <pre className="max-h-[220px] overflow-auto rounded-lg border border-border/40 bg-muted/30 p-3 text-[11px] leading-relaxed">
        {texto}
      </pre>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline gap-2 text-[12px]">
      <span className="w-[92px] shrink-0 text-muted-foreground">{rotulo}</span>
      <span className="min-w-0 break-all font-medium">{valor}</span>
    </div>
  );
}

/**
 * "Copiar ID do registro" — ação herdada do menu de 3 pontos da linha (removido
 * da timeline). Vive junto do próprio ID para continuar acessível; o ícone vira
 * um check por 1,5s como confirmação, além do toast.
 */
function BotaoCopiarId({ id }: { id: string }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = () => {
    void navigator.clipboard?.writeText(id);
    setCopiado(true);
    toast.success('ID do registro copiado');
    window.setTimeout(() => setCopiado(false), 1500);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Copiar ID do registro"
      onClick={copiar}
      className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
    >
      {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

interface AuditoriaDetalheDialogProps {
  derivado: EventoDerivado | null;
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
}

export function AuditoriaDetalheDialog({ derivado, aberto, onOpenChange }: AuditoriaDetalheDialogProps) {
  /**
   * O DADO só some quando não existe nenhum evento (primeira montagem). Quem
   * manda no `AnimatePresence` é `aberto`: a Timeline fecha o modal alternando
   * esse booleano e MANTÉM o evento em memória — sem isso o conteúdo
   * desmontaria no clique e a animação de SAÍDA (a mesma do modal de Pendências)
   * nunca rodaria.
   */
  if (!derivado) return null;
  const { evento, modulo, titulo, subtitulo, complemento, responsavel, rotuloAcao } = derivado;

  /**
   * Quantos blocos a cascata do modal anima (título + cada seção do corpo).
   * É esse número que define quando a caixa começa a encolher no fechamento —
   * a MESMA régua do modal de Pendências (`cascade-motion`).
   */
  const temAnteriores = temJson(evento.dadosAnteriores);
  const temNovos = temJson(evento.dadosNovos);
  const blocos =
    1 + // título
    1 + // linha de módulo / ação / data
    (subtitulo ? 1 : 0) +
    (complemento ? 1 : 0) +
    1 + // responsável
    1 + // registro
    (temAnteriores ? 1 : 0) +
    (temNovos ? 1 : 0);

  return (
    <CascadeDialogFrame
      open={aberto}
      onOpenChange={onOpenChange}
      blocks={blocos}
      className="max-w-2xl border-border rounded-none sm:rounded-lg"
      contentClassName="grid gap-3 p-5"
    >
      <motion.div variants={cascadeItemVariants}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <History className="h-4 w-4 text-primary" />
            {titulo}
          </DialogTitle>
        </DialogHeader>
      </motion.div>

      <div className="space-y-4">
        <motion.div variants={cascadeItemVariants} className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={cn('h-5 rounded-md px-1.5 text-[10px] font-medium', modulo.tinta)}>
            {modulo.rotulo}
          </Badge>
          <Badge
            variant="outline"
            className="h-5 rounded-md border-border/40 px-1.5 text-[10px] font-normal text-muted-foreground"
          >
            {rotuloAcao}
          </Badge>
          <span className="text-[11px] text-muted-foreground">
            {format(evento.criadoEm, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
          </span>
        </motion.div>

        {subtitulo && (
          <motion.p variants={cascadeItemVariants} className="text-[12px] text-muted-foreground">
            {subtitulo}
          </motion.p>
        )}
        {complemento && (
          <motion.p variants={cascadeItemVariants} className="text-[12px] text-muted-foreground">
            {complemento}
          </motion.p>
        )}

        <motion.div
          variants={cascadeItemVariants}
          className="space-y-2 rounded-lg border border-border/40 bg-background/40 p-3"
        >
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            Responsável
          </p>
          <Linha rotulo="Nome" valor={derivado.ehSistema ? 'Sistema / Automação' : responsavel} />
          {evento.ipAddress && <Linha rotulo="IP" valor={evento.ipAddress} />}
          {evento.userAgent && <Linha rotulo="Dispositivo" valor={evento.userAgent} />}
        </motion.div>

        <motion.div
          variants={cascadeItemVariants}
          className="space-y-2 rounded-lg border border-border/40 bg-background/40 p-3"
        >
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <Database className="h-3.5 w-3.5" />
            Registro
          </p>
          <Linha rotulo="Tabela" valor={evento.tabela || '—'} />
          <div className="flex items-center gap-2 text-[12px]">
            <span className="w-[92px] shrink-0 text-muted-foreground">ID</span>
            <span className="min-w-0 break-all font-medium">{evento.registroId ?? '—'}</span>
            {evento.registroId && <BotaoCopiarId id={evento.registroId} />}
          </div>
          <Linha
            rotulo="Campos"
            valor={evento.camposAlterados.length > 0 ? evento.camposAlterados.join(', ') : '—'}
          />
        </motion.div>

        {temAnteriores && (
          <motion.div variants={cascadeItemVariants}>
            <BlocoJson titulo="Dados anteriores" valor={evento.dadosAnteriores} />
          </motion.div>
        )}
        {temNovos && (
          <motion.div variants={cascadeItemVariants}>
            <BlocoJson titulo="Dados novos" valor={evento.dadosNovos} />
          </motion.div>
        )}
      </div>
    </CascadeDialogFrame>
  );
}
