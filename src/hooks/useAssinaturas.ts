import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface DocumentoAssinatura {
  id: string;
  titulo: string;
  tipo: string;
  colaborador: string;
  status: 'pendente' | 'assinado' | 'expirado' | 'recusado';
  criadoEm: string;
  assinadoEm?: string;
  admissaoId: string;
}

function mapTokenToDoc(token: any): DocumentoAssinatura {
  const now = new Date();
  const expira = new Date(token.data_expiracao);
  const assinado = !!token.contrato_assinado;
  const expirado = !assinado && expira < now;

  let status: DocumentoAssinatura['status'] = 'pendente';
  if (assinado) status = 'assinado';
  else if (expirado) status = 'expirado';

  const nomeColaborador =
    token.admissoes?.nome || token.email_candidato || 'Colaborador';

  const cargo = token.admissoes?.cargo || '';
  const titulo = cargo
    ? `Contrato de Trabalho - ${cargo}`
    : 'Contrato de Trabalho';

  return {
    id: token.id,
    titulo,
    tipo: 'Contrato Admissão',
    colaborador: nomeColaborador,
    status,
    criadoEm: token.created_at,
    assinadoEm: token.assinado_em || undefined,
    admissaoId: token.admissao_id,
  };
}

export function useAssinaturas() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['assinaturas-digitais'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admissao_tokens')
        .select('*, admissoes(nome, cargo, departamento)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(mapTokenToDoc);
    },
    enabled: !!user,
  });

  const docs = query.data || [];

  const stats = {
    total: docs.length,
    pendentes: docs.filter(d => d.status === 'pendente').length,
    assinados: docs.filter(d => d.status === 'assinado').length,
    expirados: docs.filter(d => d.status === 'expirado').length,
  };

  return {
    documentos: docs,
    stats,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
