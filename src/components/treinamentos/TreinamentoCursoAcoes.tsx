import { useState } from 'react';
import { MoreVertical, Trash2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TreinamentosCascadeAlertDialog } from './TreinamentosCascadeAlertDialog';
import { TreinamentosCascadeItem } from './TreinamentosCascadeDialog';
import { cn } from '@/lib/utils';

/**
 * Menu de ações do CARD do Catálogo.
 *
 * Só expõe ação REAL do catálogo: excluir o curso (`excluirCurso` na página).
 * A confirmação é explícita e o fluxo de permissão/isolamento por empresa
 * continua no serviço (`catalogoCursoService.excluirCurso`). Mesmo componente
 * visual do menu da tabela de Treinamentos (`TreinamentoAcoes`), sem alterar o
 * comportamento daquela aba.
 */
export function TreinamentoCursoAcoes({
  nome,
  onExcluir,
  className,
}: {
  nome: string;
  onExcluir: () => void;
  className?: string;
}) {
  const [confirmar, setConfirmar] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <>
      <DropdownMenu open={menuAberto} onOpenChange={setMenuAberto}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Ações do curso ${nome}`}
            className={cn(
              'h-7 w-7 rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground',
              className
            )}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem
            className="gap-2 text-destructive focus:text-destructive"
            onSelect={() => {
              // Fecha o menu ANTES de abrir a confirmação: sem isso o menu
              // continuaria aberto (e prendendo o foco) atrás do AlertDialog.
              setMenuAberto(false);
              setConfirmar(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Excluir curso
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TreinamentosCascadeAlertDialog open={confirmar} onOpenChange={setConfirmar} blocks={2}>
        <TreinamentosCascadeItem>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir curso?</AlertDialogTitle>
            <AlertDialogDescription>
              O curso “{nome}” será removido permanentemente do catálogo. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </TreinamentosCascadeItem>
        <TreinamentosCascadeItem>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className={cn(buttonVariants({ variant: 'destructive' }))} onClick={() => onExcluir()}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </TreinamentosCascadeItem>
      </TreinamentosCascadeAlertDialog>
    </>
  );
}
