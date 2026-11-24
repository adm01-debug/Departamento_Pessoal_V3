import { PageTitle } from '@/components/PageTitle';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { PageLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Mail,
  Save,
  Loader2,
  Camera,
  Phone,
  Briefcase,
  Building2,
  Lock,
  ShieldCheck,
  History,
  Bell,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { pushNotificationService } from '@/services/pushNotificationService';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { validateUploadFile } from '@/utils/uploadValidation';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { validateTablePayload } from '@/schemas/validate';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/authService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function PerfilPage() {
  const { user, session, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado real do MFA (mesma consulta de MFASetup): fator TOTP verificado = habilitado.
  const { data: mfaFactors, isLoading: mfaLoading } = useQuery({
    queryKey: ['mfa-factors', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      return data;
    },
  });
  const mfaHabilitado = !!mfaFactors?.totp?.some((f) => f.status === 'verified');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['meu-perfil', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cargo, setCargo] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [pushStatus, setPushStatus] = useState<'supported' | 'unsupported' | 'loading'>('loading');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [senhaDialogOpen, setSenhaDialogOpen] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [alterandoSenha, setAlterandoSenha] = useState(false);
  const ultimoAcesso = session?.user?.last_sign_in_at;

  useEffect(() => {
    async function checkPush() {
      const supported = await pushNotificationService.isSupported();
      if (!supported) {
        setPushStatus('unsupported');
        return;
      }
      setPushStatus('supported');
      setIsSubscribed(await pushNotificationService.hasDeliverableSubscription());
    }
    checkPush();
  }, []);

  const handleTogglePush = async () => {
    if (!user) return;
    try {
      if (isSubscribed) {
        await pushNotificationService.unsubscribeUser(user.id);
        setIsSubscribed(false);
        toast.info('Notificações push desativadas.');
      } else {
        await pushNotificationService.subscribeUser(user.id);
        setIsSubscribed(true);
        toast.success('Notificações push ativadas com sucesso!');
      }
    } catch (e: unknown) {
      toast.error(safeErrorMessage(e, 'Erro ao atualizar perfil.'));
    }
  };

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (profile) {
        setNome(profile.nome || '');
        setTelefone(profile.telefone || '');
        setCargo(profile.cargo || '');
        setDepartamento(profile.departamento || '');
      } else if (user?.name) {
        setNome(user.name);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [profile, user?.name]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.auth.updateUser({ data: { name: nome } });
      const updateData = { nome, telefone: telefone || null, cargo: cargo || null, departamento: departamento || null };
      if (profile) {
        const { error } = await supabase
          .from('profiles')
          .update(validateTablePayload('profiles', updateData, 'PerfilPage:profiles'))
          .eq('id', profile.id);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ['meu-perfil'] });
      toast.success('Perfil atualizado!');
    } catch (e: unknown) {
      toast.error(safeErrorMessage(e, 'Erro ao atualizar perfil.'));
    } finally {
      setSaving(false);
    }
  };

  const handleAlterarSenha = async () => {
    if (novaSenha !== confirmarSenha) {
      toast.error('As senhas não coincidem.');
      return;
    }
    setAlterandoSenha(true);
    try {
      const { warnings } = await authService.resetPassword(novaSenha);
      toast.success('Senha alterada com sucesso!');
      warnings?.forEach((w) => toast.warning(w));
      setSenhaDialogOpen(false);
      setNovaSenha('');
      setConfirmarSenha('');
    } catch (e: unknown) {
      toast.error(safeErrorMessage(e, 'Erro ao alterar senha.'));
    } finally {
      setAlterandoSenha(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !profile) return;

    try {
      validateUploadFile(file, { maxSizeMB: 2 });
    } catch (err: unknown) {
      toast.error(safeErrorMessage(err, 'Arquivo inválido.'));
      return;
    }
    const allowedAvatarTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedAvatarTypes.includes(file.type)) {
      toast.error('Avatar deve ser JPG, PNG ou WebP');
      return;
    }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(path);
      const { error: updateError } = await supabase
        .from('profiles')
        .update(validateTablePayload('profiles', { avatar_url: `${publicUrl}?t=${Date.now()}` }, 'PerfilPage:profiles'))
        .eq('id', profile.id);
      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['meu-perfil'] });
      toast.success('Avatar atualizado!');
    } catch (e: unknown) {
      toast.error(safeErrorMessage(e, 'Erro ao atualizar perfil.'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const initials = (nome || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <>
      <PageTitle title="Meu Perfil" description="Configurações do perfil do usuário" />
      <PageLayout
        title="Meu Perfil"
        description="Gerencie seus dados pessoais"
        icon={<User className="h-5 w-5 text-primary-foreground" />}
        gradient="from-primary to-primary-glow"
      >
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl space-y-6">
          <Card className="border border-border/30 rounded-2xl shadow-elevated">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notificações & Aplicativo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 font-body">
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/10">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-6 w-6 text-primary" />
                  <div>
                    <p className="font-bold text-sm">Notificações Push (Navegador)</p>
                    <p className="text-xs text-muted-foreground">
                      Receba alertas em tempo real sobre holerites e avisos.
                    </p>
                  </div>
                </div>
                {pushStatus === 'unsupported' ? (
                  <Badge variant="outline" className="text-muted-foreground">
                    Não Suportado
                  </Badge>
                ) : (
                  <Button
                    variant={isSubscribed ? 'outline' : 'default'}
                    size="sm"
                    className={cn(
                      'rounded-lg text-xs',
                      !isSubscribed && 'bg-primary text-primary-foreground shadow-glow'
                    )}
                    onClick={handleTogglePush}
                  >
                    {isSubscribed ? 'Desativar' : 'Ativar Agora'}
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/10">
                <div className="flex items-center gap-3">
                  <Monitor className="h-6 w-6 text-info" />
                  <div>
                    <p className="font-bold text-sm">Aplicativo Web (PWA)</p>
                    <p className="text-xs text-muted-foreground">
                      Instale o sistema como um aplicativo no seu celular ou desktop.
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-success border-success/30">
                  Pronto para Instalar
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/30 rounded-2xl shadow-elevated">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <User className="h-5 w-5" />
                Dados Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Avatar */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
                <div className="relative group">
                  <Avatar className="h-16 w-16 rounded-2xl border-2 border-primary/20">
                    <AvatarImage src={profile?.avatar_url || undefined} alt={nome} />
                    <AvatarFallback className="rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground font-display font-bold text-xl">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="h-5 w-5 text-primary-foreground animate-spin" />
                    ) : (
                      <Camera className="h-5 w-5 text-primary-foreground" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>
                <div>
                  <p className="font-display font-semibold text-lg">{nome || 'Usuário'}</p>
                  <p className="text-muted-foreground font-body text-sm flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {user?.email}
                  </p>
                </div>
              </div>

              {/* Form fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-body flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Nome
                  </Label>
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="font-body flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </Label>
                  <Input value={user?.email || ''} disabled className="rounded-xl bg-muted/30" />
                </div>
                <div className="space-y-2">
                  <Label className="font-body flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    Telefone
                  </Label>
                  <Input
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-body flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5" />
                    Cargo
                  </Label>
                  <Input
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    placeholder="E: Analista de DP"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="font-body flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    Departamento
                  </Label>
                  <Input
                    value={departamento}
                    onChange={(e) => setDepartamento(e.target.value)}
                    placeholder="E: Recursos Humanos"
                    className="rounded-xl"
                  />
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 font-body"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}Salvar
                Alterações
              </Button>
            </CardContent>
          </Card>
          <Card className="border border-border/30 rounded-2xl shadow-elevated">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Lock className="h-5 w-5 text-warning" />
                Segurança & Acesso
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 font-body">
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/10">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-6 w-6 text-success" />
                  <div>
                    <p className="font-bold text-sm">Autenticação de Dois Fatores (MFA)</p>
                    <p className="text-xs text-muted-foreground">
                      {mfaLoading
                        ? 'Verificando…'
                        : mfaHabilitado
                          ? 'Sua conta está protegida por MFA via aplicativo.'
                          : 'MFA ainda não configurado para sua conta.'}
                    </p>
                  </div>
                </div>
                {mfaLoading ? null : mfaHabilitado ? (
                  <Badge variant="outline" className="text-success border-success/30">
                    Habilitado
                  </Badge>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => navigate('/configuracoes?tab=seguranca')}>
                    Configurar
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/10">
                <div className="flex items-center gap-3">
                  <History className="h-6 w-6 text-info" />
                  <div>
                    <p className="font-bold text-sm">Último Acesso</p>
                    <p className="text-xs text-muted-foreground">
                      {ultimoAcesso ? new Date(ultimoAcesso).toLocaleString('pt-BR') : 'Não disponível'}
                    </p>
                  </div>
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-primary"
                    onClick={() => navigate('/auditoria')}
                  >
                    Ver Logs
                  </Button>
                )}
              </div>

              <Button
                variant="outline"
                className="w-full rounded-xl border-dashed"
                onClick={() => setSenhaDialogOpen(true)}
              >
                Alterar Senha de Acesso
              </Button>
              <Dialog
                open={senhaDialogOpen}
                onOpenChange={(open) => {
                  if (alterandoSenha) return;
                  setSenhaDialogOpen(open);
                  if (!open) {
                    setNovaSenha('');
                    setConfirmarSenha('');
                  }
                }}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Alterar Senha de Acesso</DialogTitle>
                    <DialogDescription>Informe e confirme a nova senha da sua conta.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nova-senha">Nova senha</Label>
                      <Input
                        id="nova-senha"
                        type="password"
                        autoComplete="new-password"
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmar-senha">Confirmar nova senha</Label>
                      <Input
                        id="confirmar-senha"
                        type="password"
                        autoComplete="new-password"
                        value={confirmarSenha}
                        onChange={(e) => setConfirmarSenha(e.target.value)}
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSenhaDialogOpen(false)} disabled={alterandoSenha}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAlterarSenha} disabled={alterandoSenha || !novaSenha || !confirmarSenha}>
                      {alterandoSenha && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Alterar Senha
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </motion.div>
      </PageLayout>
    </>
  );
}
