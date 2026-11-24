import { supabase } from '@/integrations/supabase/client';

export type TipoContrato =
  | 'clt_indeterminado'
  | 'clt_experiencia'
  | 'clt_determinado'
  | 'estagio'
  | 'pj'
  | 'temporario'
  | 'intermitente'
  | 'jovem_aprendiz';

export const TIPO_CONTRATO_LABELS: Record<TipoContrato, string> = {
  clt_indeterminado: 'CLT — Prazo Indeterminado',
  clt_experiencia: 'CLT — Experiência (45+45)',
  clt_determinado: 'CLT — Prazo Determinado',
  estagio: 'Estágio (Lei 11.788/2008)',
  pj: 'Prestação de Serviços (PJ)',
  temporario: 'Temporário (Lei 6.019/74)',
  intermitente: 'Intermitente (CLT Art. 452-A)',
  jovem_aprendiz: 'Jovem Aprendiz (Lei 10.097/2000)',
};

export interface ContratoTemplate {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string | null;
  tipo_contrato: TipoContrato;
  cargo_id: string | null;
  departamento_id: string | null;
  versao: number;
  ativo: boolean;
  corpo_html: string;
  clausulas_condicionais: Array<{ if?: string; html: string }>;
  variaveis_schema: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ContratoGerado {
  id: string;
  empresa_id: string;
  admissao_id: string | null;
  colaborador_id: string | null;
  template_id: string;
  template_versao: number;
  storage_path: string | null;
  sha256: string | null;
  status: 'rascunho' | 'gerado' | 'enviado' | 'assinado' | 'cancelado';
  assinado_em: string | null;
  created_at: string;
}

export const contratoTemplateService = {
  async listar(empresaId: string): Promise<ContratoTemplate[]> {
    const { data, error } = await supabase
      .from('contrato_templates' as any)
      .select('*')
      .eq('empresa_id', empresaId)
      .order('tipo_contrato')
      .order('nome');
    if (error) throw error;
    return (data ?? []) as unknown as ContratoTemplate[];
  },

  async obter(id: string): Promise<ContratoTemplate | null> {
    const { data, error } = await supabase
      .from('contrato_templates' as any)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as unknown as ContratoTemplate | null;
  },

  async salvar(payload: Partial<ContratoTemplate> & { empresa_id: string; nome: string; tipo_contrato: TipoContrato; corpo_html: string }): Promise<ContratoTemplate> {
    const { id, ...rest } = payload;
    if (id) {
      const { data, error } = await supabase
        .from('contrato_templates' as any)
        .update(rest as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ContratoTemplate;
    }
    const { data, error } = await supabase
      .from('contrato_templates' as any)
      .insert(rest as any)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as ContratoTemplate;
  },

  async duplicarNovaVersao(id: string): Promise<ContratoTemplate> {
    const atual = await this.obter(id);
    if (!atual) throw new Error('Template não encontrado');
    await supabase.from('contrato_templates' as any).update({ ativo: false } as any).eq('id', id);
    const clone = { ...atual, versao: atual.versao + 1, ativo: true } as Partial<ContratoTemplate>;
    delete (clone as { id?: string }).id;
    delete (clone as { created_at?: string }).created_at;
    delete (clone as { updated_at?: string }).updated_at;
    return this.salvar(clone as any);
  },

  async excluir(id: string): Promise<void> {
    const { error } = await supabase.from('contrato_templates' as any).delete().eq('id', id);
    if (error) throw error;
  },

  async gerarPdf(admissao_id: string, template_id?: string) {
    const { data, error } = await supabase.functions.invoke('gerar-contrato-pdf', {
      body: { admissao_id, template_id },
    });
    if (error) throw error;
    return data as { contrato_id: string; template_id: string; template_nome: string; template_versao: number; path: string; hash: string; signed_url: string };
  },

  async listarGerados(empresaId: string, admissaoId?: string): Promise<ContratoGerado[]> {
    let q = supabase.from('contratos_gerados' as any).select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false });
    if (admissaoId) q = q.eq('admissao_id', admissaoId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as unknown as ContratoGerado[];
  },

  async downloadUrl(path: string): Promise<string> {
    const { data, error } = await supabase.storage.from('contratos-trabalho').createSignedUrl(path, 3600);
    if (error) throw error;
    return data.signedUrl;
  },

  async gerarTokenAssinatura(
    contratoId: string,
    opts: { email?: string; cpf?: string; validadeDias?: number } = {}
  ): Promise<{ token: string; url: string; expira_em: string }> {
    const { data, error } = await supabase.rpc('contrato_gerar_token_assinatura' as any, {
      p_contrato_id: contratoId,
      p_email: opts.email ?? null,
      p_cpf: opts.cpf ?? null,
      p_validade_dias: opts.validadeDias ?? 7,
    } as any);
    if (error) throw error;
    const row = Array.isArray(data) ? (data[0] as { token: string; expira_em: string }) : (data as { token: string; expira_em: string });
    const url = `${window.location.origin}/assinar-contrato/${row.token}`;
    return { token: row.token, url, expira_em: row.expira_em };
  },

  async revogarToken(tokenId: string, motivo?: string): Promise<void> {
    const { error } = await supabase.rpc('contrato_revogar_token' as any, {
      p_token_id: tokenId,
      p_motivo: motivo ?? null,
    } as any);
    if (error) throw error;
  },

  async estenderExpiracaoToken(
    tokenId: string,
    dias = 7
  ): Promise<{ id: string; expira_em: string }> {
    const { data, error } = await supabase.rpc('contrato_estender_expiracao' as any, {
      p_token_id: tokenId,
      p_dias: dias,
    } as any);
    if (error) throw error;
    const row = Array.isArray(data)
      ? (data[0] as { id: string; expira_em: string })
      : (data as { id: string; expira_em: string });
    return row;
  },

  async listarEventos(contratoId: string): Promise<Array<{
    id: string;
    evento: string;
    detalhes: Record<string, unknown> | null;
    ip: string | null;
    user_agent: string | null;
    created_at: string;
  }>> {
    const { data, error } = await supabase
      .from('contrato_token_eventos' as any)
      .select('id, evento, detalhes, ip, user_agent, created_at')
      .eq('contrato_id', contratoId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data ?? []) as any;
  },
};
