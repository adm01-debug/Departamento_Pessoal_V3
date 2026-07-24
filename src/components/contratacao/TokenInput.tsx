import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import govbrLogo from '@/assets/govbr-logo.svg';

export function TokenInput({ onValidToken }: { onValidToken: (token: string) => void }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      // Lookup via RPC (não leitura direta da tabela): a função exige o
      // token exato como argumento, então não há como listar/enumerar
      // tokens sem já conhecer um — ver 20260718220000_rls_remediacao_auditoria.sql.
      const { data, error: err } = await supabase.rpc('get_admissao_por_token', { _token: token });
      const row = Array.isArray(data) ? data[0] : data;

      if (err || !row?.token_row) {
        setError('Código inválido ou expirado.');
      } else if (new Date(row.token_row.data_expiracao) < new Date()) {
        setError('Este link expirou. Solicite um novo ao RH.');
      } else {
        onValidToken(token);
      }
    } catch {
      setError('Erro ao validar código. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="w-full max-w-md shadow-2xl border-0 rounded-3xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary via-primary-glow to-primary" />
          <CardHeader className="text-center pt-8">
            <div className="mx-auto w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 shadow-inner">
              <ShieldCheck className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="text-3xl font-display font-bold">Portal do Candidato</CardTitle>
            <CardDescription className="text-base px-4">
              Use o código de acesso enviado pelo RH para iniciar seu processo de admissão digital.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-8 pb-8">
            <div className="space-y-3">
              <Label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                Código de Acesso
              </Label>
              <Input
                placeholder="Insira seu código aqui..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                className="h-14 text-center text-xl font-mono tracking-widest rounded-2xl border-2 focus-visible:ring-primary"
              />
              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-destructive flex items-center justify-center gap-1 font-medium"
                >
                  <AlertCircle className="w-4 h-4" /> {error}
                </motion.p>
              )}
            </div>
            <Button
              className="w-full h-14 rounded-2xl text-lg font-bold shadow-glow hover:scale-[1.02] transition-all"
              onClick={handleSubmit}
              disabled={!token || loading}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              Acessar Portal
            </Button>

            <div className="pt-4 flex items-center justify-center gap-2">
              <img
                src={govbrLogo}
                alt="Gov.br"
                className="h-6 opacity-50 grayscale hover:grayscale-0 transition-all cursor-not-allowed"
                title="Em breve: Acesso via Gov.br"
              />
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                Powered by Lovable Cloud
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
