import { BaseService, ListOptions, ListResponse } from './baseService';
import { supabase } from '@/integrations/supabase/client';
import { formatDateLocalISO } from '@/utils/dateLocal';
import { validateUploadFile } from '@/utils/uploadValidation';

class AfastamentoService extends BaseService<any> {
  constructor() {
    super('afastamentos', { 
      defaultOrderBy: 'data_inicio' 
    });
  }

  async listar(options: ListOptions = {}): Promise<ListResponse<any>> {
    const { filters, empresaId } = options as any;
    const empId = empresaId || (filters as any)?.empresa_id;
    if (!empId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    const selectStr = `
      *,
      colaborador:colaboradores!fk_afastamentos_colaborador(nome_completo, departamento)
    `;

    let query = this.getQuery().select(selectStr, { count: 'exact' });

    query = query.eq('empresa_id', empId);
    if (filters?.status) query = query.eq('status', filters.status);

    const { data, count, error } = await query.order('data_inicio', { ascending: false });
    if (error) throw error;
    return { data: data || [], total: count || 0 };
  }

  async listarHistoricoRecente(colaboradorId: string, empresaId: string, dias: number = 60): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - dias);

    const { data, error } = await this.getQuery()
      .select('*')
      .eq('colaborador_id', colaboradorId)
      .eq('empresa_id', empresaId)
      .gte('data_inicio', formatDateLocalISO(dataLimite))
      .order('data_inicio', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // CID-10 search
  async buscarCID(termo: string): Promise<any[]> {
    const safe = termo.replace(/[%_.,()]/g, '');
    if (!safe || safe.length < 2) return [];
    const { data, error } = await this.getQuery()
      .select('*')
      .or(`codigo.ilike.%${safe}%,descricao.ilike.%${safe}%`)
      .limit(10);

    if (error) throw error;
    return data || [];
  }

  async listarConfiguracoes(): Promise<any[]> {
    const { data, error } = await (supabase as any)
      .from('config_afastamentos')
      .select('*')
      .order('tipo');
    
    if (error) throw error;
    return data || [];
  }

  async listarDocumentos(afastamentoId: string): Promise<any[]> {
    const { data, error } = await (supabase as any)
      .from('documentos_afastamento')
      .select('*')
      .eq('afastamento_id', afastamentoId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async uploadDocumento(afastamentoId: string, file: File, tipo: string): Promise<any> {
    try {
      validateUploadFile(file);
      const fileExt = file.name.split('.').pop();
      const fileName = `${afastamentoId}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('afastamentos').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: signedUrlData } = await supabase.storage.from('afastamentos').createSignedUrl(fileName, 60 * 60 * 24 * 365);
      const fileUrl = signedUrlData?.signedUrl || fileName;

      const { data, error } = await (supabase as any)
        .from('documentos_afastamento')
        .insert({
          afastamento_id: afastamentoId,
          tipo,
          nome_arquivo: file.name,
          url: fileUrl,
          metadados: {
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            uploadedAt: new Date().toISOString()
          }
        })
        .select()
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (e: any) {
      throw new Error(e.message || 'Falha no upload do documento', { cause: e });
    }
  }

  async validarDocumento(id: string, validado: boolean, empresaId: string): Promise<any> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    // documentos_afastamento does not carry empresa_id directly; scope through parent — fail closed
    const { data: doc } = await (supabase as any).from('documentos_afastamento').select('afastamento_id').eq('id', id).maybeSingle();
    if (!doc?.afastamento_id) throw new Error('Documento não encontrado');
    const { data: af } = await this.getQuery().select('empresa_id').eq('id', doc.afastamento_id).maybeSingle();
    if (!af || af.empresa_id !== empresaId) throw new Error('Acesso negado: documento pertence a outro tenant');
    const { data, error } = await (supabase as any)
      .from('documentos_afastamento')
      .update({ validado } as any)
      .eq('id', id)
      .eq('afastamento_id', doc.afastamento_id)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async listarProrrogacoes(afastamentoId?: string, empresaId?: string): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    // !inner forces an INNER JOIN enabling empresa_id filter on the joined afastamentos row
    let query = (supabase as any)
      .from('prorrogacoes_afastamento')
      .select('*, afastamento:afastamentos!inner(*, colaborador:colaboradores(nome_completo))');

    if (afastamentoId) query = query.eq('afastamento_id', afastamentoId);
    query = query.eq('afastamento.empresa_id', empresaId);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async criarProrrogacao(d: any, empresaId: string): Promise<any> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    try {
      const { data, error } = await (supabase as any)
        .from('prorrogacoes_afastamento')
        .insert(d)
        .select()
        .maybeSingle();

      if (error) throw error;

      await this.atualizar(d.afastamento_id, {
        data_fim_prevista: d.data_fim_nova,
        status: 'prorrogado'
      }, empresaId);

      return data;
    } catch (e: any) {
      throw new Error('Falha ao criar prorrogação', { cause: e });
    }
  }

  calcularDias(inicio: string, fim: string): number {
    if (!inicio || !fim) return 0;
    const start = new Date(inicio);
    const end = new Date(fim);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diffMs = end.getTime() - start.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
    return days > 0 ? days : 0;
  }

  calcularDistribuicaoDias(diasTotais: number, tipo: string, configs: any[]) {
    const config = configs.find(c => c.tipo === tipo);
    const tiposComLimite = ['doenca', 'acidente_trabalho', 'acidente_trajeto'];
    const maxEmpresa = config?.dias_empresa_maximo ?? (tiposComLimite.includes(tipo) ? 15 : 0);
    if (maxEmpresa === 0) return { empresa: diasTotais, inss: 0 };
    if (diasTotais <= maxEmpresa) return { empresa: diasTotais, inss: 0 };
    return { empresa: maxEmpresa, inss: diasTotais - maxEmpresa };
  }

  async exportarRelatorio(empresaId: string, filtros?: any): Promise<any[]> {
    try {
      const { data } = await this.listar({ filters: { ...filtros, empresa_id: empresaId } });
      const headers = ["ID", "Colaborador", "Tipo", "CID", "Início", "Fim Previsto", "Dias Totais", "Empresa", "INSS", "Status"];
      const rows = data.map((af: any) => [
        af.id.split('-')[0],
        af.colaborador?.nome_completo || '-',
        af.tipo,
        af.cid?.codigo || '-',
        af.data_inicio,
        af.data_fim_prevista,
        af.dias_total,
        af.dias_empresa,
        af.dias_inss,
        af.status
      ]);

      const csvContent = [headers.join(","), ...rows.map((e: any) => e.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `afastamentos_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return data;
    } catch (e: any) {
      throw new Error('Falha ao exportar relatório', { cause: e });
    }
  }
}

export const afastamentoService = new AfastamentoService();
