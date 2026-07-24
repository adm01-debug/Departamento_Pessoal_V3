import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, ShieldCheck, ShieldAlert, Copy, Key, Smartphone, Loader2, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { safeErrorMessage } from '@/utils/safeError';

export function MFASetup() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [enrollData, setEnrollData] = useState<{ id: string; qr: string; secret: string; uri: string } | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  // Check MFA factors
  const { data: factors, isLoading, refetch } = useQuery({
    queryKey: ['mfa-factors', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      return data;
    },
  });

  // Get user_mfa record
  const { data: mfaRecord } = useQuery({
    queryKey: ['user-mfa-record', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from('user_mfa').select('*').eq('user_id', user!.id).maybeSingle();
      return data;
    },
  });

  const activeFactor = factors?.totp?.find(f => f.status === 'verified');
  const isEnabled = !!activeFactor;

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
      });
      if (error) throw error;
      setEnrollData({
        id: data.id,
        qr: data.totp.qr_code,
        secret: data.totp.secret,
        uri: data.totp.uri,
      });
      setShowEnrollDialog(true);
    } catch (e: any) {
      toast.error(safeErrorMessage(e, 'Erro ao iniciar configuração MFA.'));
    } finally {
      setEnrolling(false);
    }
  };

  const handleVerifyAndActivate = async () => {
    if (!enrollData || verifyCode.length !== 6) return;
    setEnrolling(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId: enrollData.id });
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId: enrollData.id,
        challengeId: challenge.data.id,
        code: verifyCode,
      });
      if (verify.error) throw verify.error;

      await supabase.from('user_mfa').upsert([{
        user_id: user!.id,
        mfa_enabled: true,
        mfa_type: 'totp',
        mfa_secret: null,
      }], { onConflict: 'user_id' });

      toast.success('Autenticação de dois fatores ativada com sucesso!');
      setShowEnrollDialog(false);
      setVerifyCode('');
      setEnrollData(null);
      refetch();
      qc.invalidateQueries({ queryKey: ['user-mfa-record'] });
    } catch (e: any) {
      toast.error(safeErrorMessage(e, 'Código inválido ou expirado.'));
    } finally {
      setEnrolling(false);
    }
  };

  const handleDisable = async () => {
    if (!activeFactor) return;
    setEnrolling(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: activeFactor.id });
      if (error) throw error;

      await supabase.from('user_mfa').upsert([{
        user_id: user!.id,
        mfa_enabled: false,
        mfa_type: null,
        mfa_secret: null,
      }], { onConflict: 'user_id' });

      toast.success('Autenticação de dois fatores desativada');
      setShowDisableDialog(false);
      refetch();
      qc.invalidateQueries({ queryKey: ['user-mfa-record'] });
    } catch (e: any) {
      toast.error(safeErrorMessage(e, 'Erro ao desativar MFA.'));
    } finally {
      setEnrolling(false);
    }
  };

  const copySecret = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  if (isLoading) {
    return (
      <Card className="border border-border/30 shadow-elevated rounded-2xl">
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Status Card */}
        <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden">
          <div className={`h-[2px] bg-gradient-to-r ${isEnabled ? 'from-success to-success/70' : 'from-warning to-destructive'}`} />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isEnabled ? (
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-success to-success/70 shadow-lg">
                    <ShieldCheck className="h-5 w-5 text-primary-foreground" />
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-warning to-destructive shadow-lg">
                    <ShieldAlert className="h-5 w-5 text-primary-foreground" />
                  </div>
                )}
                <div>
                  <CardTitle className="font-display">Autenticação de Dois Fatores (2FA)</CardTitle>
                  <CardDescription className="font-body">
                    Adicione uma camada extra de segurança à sua conta
                  </CardDescription>
                </div>
              </div>
              <Badge variant={isEnabled ? 'default' : 'destructive'} className={`${isEnabled ? 'bg-success/10 text-success border-success/30' : ''} rounded-lg`}>
                {isEnabled ? 'Ativado' : 'Desativado'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-muted/30 space-y-3">
              <div className="flex items-start gap-3">
                <Smartphone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-body text-sm font-medium">App Autenticador (TOTP)</p>
                  <p className="font-body text-sm text-muted-foreground">
                    Use um aplicativo como Google Authenticator, Authy ou 1Password para gerar códigos temporários de 6 dígitos.
                  </p>
                </div>
              </div>
            </div>

            {isEnabled ? (
              <div className="flex items-center justify-between p-4 rounded-xl border border-border/30">
                <div className="flex items-center gap-3">
                  <Key className="h-4 w-4 text-success" />
                  <div>
                    <p className="font-body text-sm font-medium">Authenticator App</p>
                    <p className="font-body text-xs text-muted-foreground">
                      Configurado em {activeFactor?.created_at ? new Date(activeFactor.created_at).toLocaleDateString('pt-BR') : '—'}
                    </p>
                  </div>
                </div>
                <Button variant="destructive" size="sm" className="rounded-xl" onClick={() => setShowDisableDialog(true)}>
                  <Trash2 className="h-4 w-4 mr-1" />Desativar
                </Button>
              </div>
            ) : (
              <Button onClick={handleEnroll} disabled={enrolling} className="rounded-xl bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 font-body">
                {enrolling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
                Ativar 2FA
              </Button>
            )}

            {mfaRecord?.backup_codes && mfaRecord.backup_codes.length > 0 && (
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setShowBackupCodes(true)}>
                <Eye className="h-4 w-4 mr-1" />Ver Códigos de Recuperação
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Security Tips */}
        <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden">
          <div className="h-[2px] bg-gradient-to-r from-info to-info/70" />
          <CardHeader>
            <CardTitle className="font-display text-base">Dicas de Segurança</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 font-body text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><span className="text-success mt-0.5">✓</span>Use senhas fortes com pelo menos 12 caracteres</li>
              <li className="flex items-start gap-2"><span className="text-success mt-0.5">✓</span>Ative a autenticação de dois fatores (2FA)</li>
              <li className="flex items-start gap-2"><span className="text-success mt-0.5">✓</span>Não reutilize senhas entre serviços</li>
              <li className="flex items-start gap-2"><span className="text-success mt-0.5">✓</span>Guarde seus códigos de recuperação em local seguro</li>
              <li className="flex items-start gap-2"><span className="text-success mt-0.5">✓</span>Revise as sessões ativas regularmente</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Enroll Dialog */}
      <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />Configurar 2FA
            </DialogTitle>
            <DialogDescription className="font-body">
              Escaneie o QR code abaixo com seu app autenticador
            </DialogDescription>
          </DialogHeader>

          {enrollData && (
            <div className="space-y-4">
              {/* QR Code */}
              <div className="flex justify-center p-4 bg-white rounded-xl">
                <img src={enrollData.qr} alt="QR Code MFA" className="w-48 h-48" />
              </div>

              {/* Manual Secret */}
              <div className="space-y-1">
                <Label className="font-body text-xs text-muted-foreground">Ou insira manualmente:</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted/50 rounded-lg text-xs font-mono break-all select-all">
                    {enrollData.secret}
                  </code>
                  <Button variant="ghost" size="icon" onClick={() => copySecret(enrollData.secret)} className="shrink-0" aria-label="Copiar chave secreta">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Verification Code */}
              <div className="space-y-2">
                <Label className="font-body">Código de verificação</Label>
                <Input
                  value={verifyCode}
                  onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="rounded-xl text-center text-2xl tracking-[0.5em] font-mono"
                  maxLength={6}
                  autoFocus
                />
                <p className="font-body text-xs text-muted-foreground">
                  Digite o código de 6 dígitos gerado pelo app
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEnrollDialog(false); setVerifyCode(''); }} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              onClick={handleVerifyAndActivate}
              disabled={verifyCode.length !== 6 || enrolling}
              className="rounded-xl bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
            >
              {enrolling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              Ativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-destructive flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />Desativar 2FA
            </DialogTitle>
            <DialogDescription className="font-body">
              Tem certeza? Sua conta ficará menos segura sem a autenticação de dois fatores.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisableDialog(false)} className="rounded-xl">Cancelar</Button>
            <Button variant="destructive" onClick={handleDisable} disabled={enrolling} className="rounded-xl">
              {enrolling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Desativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Backup Codes Dialog */}
      <Dialog open={showBackupCodes} onOpenChange={setShowBackupCodes}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Key className="h-5 w-5 text-warning" />Códigos de Recuperação
            </DialogTitle>
            <DialogDescription className="font-body">
              Guarde estes códigos em local seguro. Cada código pode ser usado apenas uma vez.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 p-3 bg-muted/30 rounded-xl">
            {mfaRecord?.backup_codes?.map((code: string, i: number) => (
              <code key={i} className="text-sm font-mono p-1.5 bg-card rounded-lg text-center">{code}</code>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBackupCodes(false)} className="rounded-xl">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
