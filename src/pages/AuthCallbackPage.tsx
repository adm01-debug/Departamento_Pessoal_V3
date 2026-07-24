import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { safeErrorMessage } from '@/utils/safeError';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');

      window.history.replaceState(null, '', window.location.pathname);

      if (code && state) {
        try {
          const { data, error } = await supabase.functions.invoke('auth-gov-br', {
            body: { action: 'callback', code, state },
          });

          if (error) throw error;

          if (data?.success) {
            toast.success(`Autenticado com Gov.br! Nível: ${data.profile.nivel}`);
            navigate('/dashboard', { replace: true });
          }
        } catch (err: any) {
          toast.error(safeErrorMessage(err, 'Erro na autenticação Gov.br.'));
          navigate('/login', { replace: true });
        }
      } else {
        navigate('/dashboard', { replace: true });
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Spinner size="lg" className="mx-auto" />
        <p className="text-muted-foreground font-body">Finalizando autenticação segura...</p>
      </div>
    </div>
  );
}
