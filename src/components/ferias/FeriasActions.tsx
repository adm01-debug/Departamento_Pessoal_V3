import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserCheck, Shield, Building2, X, Ban, FileDown, FileSignature, Gift } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { feriasPDF } from '@/utils/feriasPDF';
import { AssinarAvisoDialog } from './AssinarAvisoDialog';
import { useAssinarAvisoFerias } from '@/hooks/useAssinarAvisoFerias';
import { useSolicitarAdiantamento13 } from '@/hooks/ferias/useAdiantamento13';
import { supabase } from '@/integrations/supabase/client';
import { validateTablePayload } from '@/schemas/validate';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import type { Ferias } from '@/types/entities';

interface FeriasActionsProps {
  solicitacao: Ferias;
  onAprovarGestor: (id: string) => void;
  onAprovarRH: (id: string) => void;
  onEnviarContabilidade: (id: string) => void;
  onRejeitar: (id: string) => void;
  onCancelar: (id: string) => void;
}

export function FeriasActions(props: FeriasActionsProps) {
  const { solicitacao } = props;
  const [assinarOpen, setAssinarOpen] = useState(false);
  const { baixarAvisoAssinado } = useAssinarAvisoFerias();
  const solicitarAdiant13 = useSolicitarAdiantamento13();

  if (solicitacao.cancelado || solicitacao.status === 'rejeitada') return null;

  // Baixa o PDF e persiste o recibo em recibos_ferias (a tabela era órfã:
  // o recibo existia só no PDF client-side — §6.2).
  const baixarRecibo = async () => {
    feriasPDF.gerarRecibo(solicitacao);
    const { error } = await supabase.from('recibos_ferias').insert(
      validateTablePayload(
        'recibos_ferias',
        {
          colaborador_id: solicitacao.colaborador_id,
          empresa_id: solicitacao.empresa_id,
          descricao: `Recibo de férias ${solicitacao.data_inicio} a ${solicitacao.data_fim}`,
          data_inicio: solicitacao.data_inicio,
          data_fim: solicitacao.data_fim,
        },
        'FeriasActions:recibos_ferias'
      )
    );
    if (error) toast.error(safeErrorMessage(error, 'Recibo baixado, mas não foi gravado no servidor.'));
  };

  const podeAprovarGestor = !solicitacao.aprovado_gestor;
  const podeAssinarRH = solicitacao.aprovado_gestor && !solicitacao.aprovado_rh;
  const podeEnviarContab = solicitacao.aprovado_rh && !solicitacao.enviado_contabilidade;
  const podeRejeitar = !solicitacao.aprovado_gestor;
  const temAvisoAssinado = !!solicitacao.aviso_pdf_url;
  const podeSolicitar13 = !solicitacao.adiantamento_13o && !solicitacao.enviado_contabilidade;

  return (
    <TooltipProvider>
      <div className="flex gap-0.5">
        {podeAprovarGestor && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Aprovar (Gestor)"
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg hover:bg-success/10 text-success"
                onClick={() => props.onAprovarGestor(solicitacao.id)}
              >
                <UserCheck className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Aprovar (Gestor)</p>
            </TooltipContent>
          </Tooltip>
        )}

        {podeAssinarRH && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Assinar Aviso e Aprovar (RH)"
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg hover:bg-success/10 text-success"
                onClick={() => setAssinarOpen(true)}
              >
                <FileSignature className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Assinar Aviso e Aprovar (RH)</p>
            </TooltipContent>
          </Tooltip>
        )}

        {podeEnviarContab && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Enviar Contabilidade"
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg hover:bg-info/10 text-info"
                onClick={() => props.onEnviarContabilidade(solicitacao.id)}
              >
                <Building2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Enviar Contabilidade</p>
            </TooltipContent>
          </Tooltip>
        )}

        {podeRejeitar && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Rejeitar"
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg hover:bg-destructive/10 text-destructive"
                onClick={() => props.onRejeitar(solicitacao.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Rejeitar</p>
            </TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label="Baixar Recibo"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg hover:bg-primary/10 text-primary"
              onClick={() => void baixarRecibo()}
            >
              <FileDown className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Baixar Recibo</p>
          </TooltipContent>
        </Tooltip>

        {temAvisoAssinado && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Baixar Aviso Assinado"
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg hover:bg-success/10 text-success"
                onClick={() => baixarAvisoAssinado(solicitacao.empresa_id, solicitacao.id)}
              >
                <Shield className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Baixar Aviso Assinado</p>
            </TooltipContent>
          </Tooltip>
        )}

        {podeSolicitar13 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Solicitar adiantamento 13º (Lei 4.749/65)"
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg hover:bg-warning/10 text-warning"
                disabled={solicitarAdiant13.isPending}
                onClick={() => solicitarAdiant13.mutate({ feriasId: solicitacao.id })}
              >
                <Gift className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Solicitar adiantamento 13º (Lei 4.749/65)</p>
            </TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label="Cancelar"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg hover:bg-destructive/10 text-destructive"
              onClick={() => props.onCancelar(solicitacao.id)}
            >
              <Ban className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Cancelar</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <AssinarAvisoDialog open={assinarOpen} onOpenChange={setAssinarOpen} solicitacao={solicitacao} />
    </TooltipProvider>
  );
}
