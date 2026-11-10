import { useEffect, useCallback } from 'react';
import type { Location } from 'react-router-dom';
import { useBlocker } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UseNavigationGuardOptions {
  /** Whether the guard is active (e.g., form has unsaved changes) */
  enabled: boolean;
  /** Custom message shown in the dialog */
  message?: string;
}

/**
 * Hook that blocks navigation when there are unsaved changes.
 * Returns the blocker state and a confirmation dialog component.
 *
 * Usage:
 * ```tsx
 * const { NavigationGuardDialog } = useNavigationGuard({ enabled: isDirty });
 * return <>{NavigationGuardDialog}</>
 * ```
 */
export function useNavigationGuard({
  enabled,
  message = 'Você tem alterações não salvas. Deseja realmente sair?',
}: UseNavigationGuardOptions) {
  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }: { currentLocation: Location; nextLocation: Location }) =>
        enabled && currentLocation.pathname !== nextLocation.pathname,
      [enabled]
    )
  );

  // Handle browser back/refresh
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [enabled, message]);

  const NavigationGuardDialog =
    blocker.state === 'blocked' ? (
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription className="font-body">{message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => blocker.reset?.()}>Continuar editando</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => blocker.proceed?.()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sair sem salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    ) : null;

  return { NavigationGuardDialog, blocker };
}
