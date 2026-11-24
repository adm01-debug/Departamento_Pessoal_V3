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
 * Menu de ações da linha de treinamento.
 *
 * Só expõe ação REAL: excluir (a página já possui `excluirTrein`). "Ver
 * detalhes"/"Editar" não existem no módulo, então não aparecem aqui.
 * A exclusão passa por confirmação explícita (AlertDialog) antes de disparar a
 * mutation — a página mantém as permissões, o isolamento por empresa e o
 * feedback de sucesso/erro.
 */
export function TreinamentoAcoes({
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
            aria-label={`Ações de ${nome}`}
            className={cn(
              'h-8 w-8 rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground',
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
            Excluir treinamento
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TreinamentosCascadeAlertDialog open={confirmar} onOpenChange={setConfirmar} blocks={2}>
        <TreinamentosCascadeItem>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir treinamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O treinamento “{nome}” será removido permanentemente. Esta ação não pode ser desfeita.
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
