import { PageTitle } from '@/components/PageTitle';
import { useQuery } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyList } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { UserCog } from 'lucide-react';
import { motion } from 'framer-motion';

export default function UsuariosPage() {
  // RLS de profiles só retorna a própria linha — a listagem admin sai por
  // RPC SECURITY DEFINER estreita (verifica is_admin dentro do banco).
  const { data: profiles, isLoading } = useQuery({
    queryKey: ['usuarios-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_list_profiles');
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <>
      <PageTitle title="Usuários" description="Gestão de usuários do sistema" />
      <PageLayout
        title="Usuários"
        description="Gestão de usuários do sistema"
        icon={<UserCog className="h-5 w-5 text-primary-foreground" />}
        gradient="from-primary to-primary-glow"
      >
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Spinner size="lg" />
          </div>
        ) : !profiles?.length ? (
          <EmptyList entityName="usuário" />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-border/30 overflow-hidden shadow-elevated"
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-display font-semibold">Nome</TableHead>
                  <TableHead className="font-display font-semibold">Telefone</TableHead>
                  <TableHead className="font-display font-semibold">Papel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((u) => (
                  <TableRow key={u.id} className="hover:bg-accent/30 transition-colors">
                    <TableCell className="font-body font-medium">{u.nome || 'Sem nome'}</TableCell>
                    <TableCell className="font-body">{u.telefone || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-primary/10 text-primary">
                        {u.role_display || 'Usuário'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </motion.div>
        )}
      </PageLayout>
    </>
  );
}
