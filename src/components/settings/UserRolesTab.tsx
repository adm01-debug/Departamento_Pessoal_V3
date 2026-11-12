import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { supabase } from '@/integrations/supabase/client';
import { Shield, ShieldAlert, ShieldCheck, Users, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { auditLogger } from '@/utils/auditLogger';
import { safeErrorMessage } from '@/utils/safeError';
import type { Enums } from '@/integrations/supabase/database.types';

interface UserRoleRow {
  id: string;
  user_id: string;
  role: Enums<'app_role'>;
  created_at: string;
}

// Perfis que a tela pode atribuir além de admin. supervisor/coordenador são
// os únicos que alteram a configuração de ponto (20261112010000).
const PERFIS_ATRIBUIVEIS: { value: Enums<'app_role'>; label: string }[] = [
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'coordenador', label: 'Coordenador' },
  { value: 'gestor', label: 'Gestor' },
  { value: 'rh', label: 'RH' },
];

export function UserRolesTab() {
  const qc = useQueryClient();
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['user-roles-list'],
    queryFn: async (): Promise<UserRoleRow[]> => {
      // user_roles está na TABLE_DENYLIST do bridge — leitura direta retorna
      // 403 mesmo para admins. Único caminho é esta RPC. Ver
      // 20260718230000_admin_role_management_rpc.sql (achado R1 da auditoria).
      const { data, error } = await supabase.rpc('admin_list_user_roles', {});
      if (error) throw error;
      return (data as UserRoleRow[]) || [];
    },
  });

  const atribuirPerfil = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Enums<'app_role'> }) => {
      const { error } = await supabase.rpc('admin_set_user_role', {
        _target_user_id: userId,
        _role: role,
      });
      if (error) throw error;
    },
    onSuccess: (_, { userId, role }) => {
      qc.invalidateQueries({ queryKey: ['user-roles-list'] });
      toast.success(role === 'admin' ? 'Perfil atualizado para Administrador' : `Perfil ${role} atribuído`);
      void auditLogger.log({
        tabela: 'user_roles',
        registro_id: userId,
        acao: 'UPDATE',
        dados_novos: { role, user_id: userId },
      });
    },
    onError: (err: unknown) => toast.error(safeErrorMessage(err, 'Erro ao atualizar perfil do usuário.')),
  });

  // Um usuário pode ter várias linhas (uma por perfil); o seletor só oferece
  // perfis que ele ainda não tem.
  const perfisDoUsuario = (userId: string) => new Set(roles.filter((x) => x.user_id === userId).map((x) => x.role));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden">
        <div className="h-[2px] bg-gradient-to-r from-primary to-primary-glow" />
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Shield className="h-5 w-5" /> Perfis de Usuário
          </CardTitle>
          <CardDescription className="font-body">
            Gerencie as permissões e níveis de acesso dos usuários do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 flex justify-center">
              <Spinner />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Usuário</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Data Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-[10px]">{r.user_id}</TableCell>
                    <TableCell>
                      <Badge
                        variant={r.role === 'admin' ? 'default' : 'secondary'}
                        className="gap-1 rounded-full uppercase text-[10px] font-bold tracking-tight"
                      >
                        {r.role === 'admin' ? <ShieldCheck className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                        {r.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground font-body">
                      {new Date(r.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(() => {
                          const atuais = perfisDoUsuario(r.user_id);
                          const opcoes = PERFIS_ATRIBUIVEIS.filter((o) => !atuais.has(o.value));
                          return opcoes.length > 0 ? (
                            <Select
                              value=""
                              onValueChange={(v) =>
                                atribuirPerfil.mutate({ userId: r.user_id, role: v as Enums<'app_role'> })
                              }
                              disabled={atribuirPerfil.isPending}
                            >
                              <SelectTrigger className="h-8 w-[170px] rounded-lg text-xs" aria-label="Adicionar perfil">
                                <SelectValue placeholder="Adicionar perfil" />
                              </SelectTrigger>
                              <SelectContent>
                                {opcoes.map((o) => (
                                  <SelectItem key={o.value} value={o.value}>
                                    {o.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : null;
                        })()}
                        {r.role !== 'admin' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => atribuirPerfil.mutate({ userId: r.user_id, role: 'admin' })}
                            disabled={atribuirPerfil.isPending}
                            className="rounded-lg h-8 text-primary hover:text-primary hover:bg-primary/5"
                          >
                            Tornar Admin
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {roles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-12 font-body">
                      <div className="flex flex-col items-center gap-2">
                        <Info className="h-8 w-8 opacity-20" />
                        <p>Nenhum perfil customizado configurado.</p>
                        <p className="text-xs">Os usuários usam o perfil padrão de 'user'.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border/30 bg-muted/20">
        <CardContent className="p-4 flex gap-3">
          <ShieldAlert className="h-5 w-5 text-warning shrink-0" />
          <div className="text-xs space-y-1 font-body">
            <p className="font-semibold">Informação de Segurança</p>
            <p className="text-muted-foreground leading-relaxed">
              Administradores possuem acesso total a todos os módulos, incluindo auditoria, telemetria e configurações
              sensíveis do sistema. Atribua este perfil apenas a usuários de extrema confiança.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
