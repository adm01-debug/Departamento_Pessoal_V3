import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { supabase } from '@/integrations/supabase/client';
import { Shield, ShieldAlert, ShieldCheck, Users, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { auditLogger } from '@/utils/auditLogger';
import { safeErrorMessage } from '@/utils/safeError';

export function UserRolesTab() {
  const qc = useQueryClient();
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['user-roles-list'],
    queryFn: async () => {
      // user_roles está na TABLE_DENYLIST do bridge — leitura direta retorna
      // 403 mesmo para admins. Único caminho é esta RPC. Ver
      // 20260718230000_admin_role_management_rpc.sql (achado R1 da auditoria).
      const { data, error } = await supabase.rpc('admin_list_user_roles', {});
      if (error) throw error;
      return data || [];
    },
  });

  const upgradeToAdmin = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc('admin_set_user_role', {
        _target_user_id: userId,
        _role: 'admin',
      });
      if (error) throw error;
    },
    onSuccess: (_, userId) => {
      qc.invalidateQueries({ queryKey: ['user-roles-list'] });
      toast.success('Perfil atualizado para Administrador');
      void auditLogger.log({
        tabela: 'user_roles',
        registro_id: userId,
        acao: 'UPDATE',
        dados_novos: { role: 'admin', user_id: userId },
      });
    },
    onError: (err: any) => toast.error(safeErrorMessage(err, 'Erro ao atualizar perfil do usuário.')),
  });

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
                {roles.map((r: any) => (
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
                      {r.role !== 'admin' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => upgradeToAdmin.mutate(r.user_id)}
                          className="rounded-lg h-8 text-primary hover:text-primary hover:bg-primary/5"
                        >
                          Tornar Admin
                        </Button>
                      )}
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
