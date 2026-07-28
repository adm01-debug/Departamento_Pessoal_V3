import { BaseService, ListOptions, ListResponse } from './baseService';
import { supabase } from '@/integrations/supabase/client';
import { formatDateLocalISO } from '@/utils/dateLocal';
import { validateUploadFile } from '@/utils/uploadValidation';
import type {
  AfastamentoRow,
  AfastamentoComColaborador,
  AfastamentoFiltros,
  Cid10Row,
  ConfigAfastamentoRow,
  DistribuicaoDias,
  DocumentoAfastamentoRow,
  ProrrogacaoAfastamentoInsert,
  ProrrogacaoAfastamentoRow,
  ProrrogacaoComAfastamento,
} from '@/types/afastamentos';

/** Evita que o supabase-js parseie a select string no nível de tipo. */
const sel = (s: string): string => s;

class AfastamentoService extends BaseService<AfastamentoRow> {
  constructor() {
    super('afastamentos', {
      defaultOrderBy: 'data_inicio',
    });
  }

  async listar(options: ListOptions = {}): Promise<ListResponse<AfastamentoComColaborador>> {
    const { empresaId } = options;
    const filters = (options.filters ?? {}) as AfastamentoFiltros;
    const empId = empresaId || filters.empresa_id;
    if (!empId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    let query = supabase.from('afastamentos').select(
      sel('*, colaborador:colaboradores!fk_afastamentos_colaborador(nome_completo, departamento)'),
      { count: 'exact' }
    );

    query = query.eq('empresa_id', empId);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.tipo) query = query.eq('tipo', filters.tipo);

    const { data, count, error } = await query
      .order('data_inicio', { ascending: false })
      .returns<AfastamentoComColaborador[]>();
    if (error) throw error;
    return { data: data || [], total: count || 0 };
  }

  async listarHistoricoRecente(
    colaboradorId: string,
    empresaId: string,
    dias: number = 60
  ): Promise<AfastamentoRow[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - dias);

    const { data, error } = await supabase
      .from('afastamentos')
      .select(sel('*'))
      .eq('colaborador_id', colaboradorId)
      .eq('empresa_id', empresaId)
      .gte('data_inicio', formatDateLocalISO(dataLimite))
      .order('data_inicio', { ascending: false })
      .returns<AfastamentoRow[]>();

    if (error) throw error;
    return data || [];
  }

  /**
   * Busca no catálogo CID-10.
   *
   * Correção: antes consultava `this.getQuery()` (tabela `afastamentos`), que não
   * possui as colunas `codigo`/`descricao` — a busca sempre falhava silenciosamente.
   */
  async buscarCID(termo: string): Promise<Cid10Row[]> {
    const safe = termo.replace(/[%_.,()]/g, '');
    if (!safe || safe.length < 2) return [];
    const { data, error } = await supabase
      .from('cid10')
      .select(sel('*'))
      .or(`codigo.ilike.%${safe}%,descricao.ilike.%${safe}%`)
      .limit(10)
      .returns<Cid10Row[]>();

    if (error) throw error;
    return data || [];
  }

  async listarConfiguracoes(): Promise<ConfigAfastamentoRow[]> {
    const { data, error } = await supabase
      .from('config_afastamentos')
      .select(sel('*'))
      .order('tipo')
      .returns<ConfigAfastamentoRow[]>();

    if (error) throw error;
    return data || [];
  }

  async listarDocumentos(afastamentoId: string): Promise<DocumentoAfastamentoRow[]> {
    const { data, error } = await supabase
      .from('documentos_afastamento')
      .select(sel('*'))
      .eq('afastamento_id', afastamentoId)
      .order('created_at', { ascending: false })
      .returns<DocumentoAfastamentoRow[]>();

    if (error) throw error;
    return data || [];
  }

  async uploadDocumento(
    afastamentoId: string,
    file: File,
    tipo: string
  ): Promise<DocumentoAfastamentoRow | null> {
    try {
      validateUploadFile(file);
      const fileExt = file.name.split('.').pop();
      const fileName = `${afastamentoId}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('afastamentos')
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: signedUrlData } = await supabase.storage
        .from('afastamentos')
        .createSignedUrl(fileName, 60 * 60 * 24 * 365);
      const fileUrl = signedUrlData?.signedUrl || fileName;

      const { data, error } = await supabase
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
            uploadedAt: new Date().toISOString(),
          },
        })
        .select()
        .maybeSingle<DocumentoAfastamentoRow>();

      if (error) throw error;
      return data;
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : 'Falha no upload do documento', { cause: e });
    }
  }

  async validarDocumento(
    id: string,
    validado: boolean,
    empresaId: string
  ): Promise<DocumentoAfastamentoRow | null> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    // documentos_afastamento não carrega empresa_id: escopamos pelo pai — fail closed.
    const { data: doc } = await supabase
      .from('documentos_afastamento')
      .select(sel('afastamento_id'))
      .eq('id', id)
      .maybeSingle<{ afastamento_id: string }>();
    if (!doc?.afastamento_id) throw new Error('Documento não encontrado');

    const { data: af } = await supabase
      .from('afastamentos')
      .select(sel('empresa_id'))
      .eq('id', doc.afastamento_id)
      .maybeSingle<{ empresa_id: string | null }>();
    if (!af || af.empresa_id !== empresaId) {
      throw new Error('Acesso negado: documento pertence a outro tenant');
    }

    const { data, error } = await supabase
      .from('documentos_afastamento')
      .update({ validado })
      .eq('id', id)
      .eq('afastamento_id', doc.afastamento_id)
      .select()
      .maybeSingle<DocumentoAfastamentoRow>();

    if (error) throw error;
    return data;
  }

  async listarProrrogacoes(
    afastamentoId?: string,
    empresaId?: string
  ): Promise<ProrrogacaoComAfastamento[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    // !inner força INNER JOIN, habilitando o filtro por empresa_id no pai.
    let query = supabase
      .from('prorrogacoes_afastamento')
      .select(sel('*, afastamento:afastamentos!inner(*, colaborador:colaboradores(nome_completo))'));

    if (afastamentoId) query = query.eq('afastamento_id', afastamentoId);
    query = query.eq('afastamento.empresa_id', empresaId);

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .returns<ProrrogacaoComAfastamento[]>();
    if (error) throw error;
    return data || [];
  }

  async criarProrrogacao(
    d: ProrrogacaoAfastamentoInsert,
    empresaId: string
  ): Promise<ProrrogacaoAfastamentoRow | null> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    try {
      const { data, error } = await supabase
        .from('prorrogacoes_afastamento')
        .insert(d)
        .select()
        .maybeSingle<ProrrogacaoAfastamentoRow>();

      if (error) throw error;

      await this.atualizar(
        d.afastamento_id,
        {
          data_fim_prevista: d.data_fim_nova,
          status: 'prorrogado',
        },
        empresaId
      );

      return data;
    } catch (e) {
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

  calcularDistribuicaoDias(
    diasTotais: number,
    tipo: string,
    configs: ConfigAfastamentoRow[]
  ): DistribuicaoDias {
    const config = configs.find(c => c.tipo === tipo);
    const tiposComLimite = ['doenca', 'acidente_trabalho', 'acidente_trajeto'];
    const maxEmpresa = config?.dias_empresa_maximo ?? (tiposComLimite.includes(tipo) ? 15 : 0);
    if (maxEmpresa === 0) return { empresa: diasTotais, inss: 0 };
    if (diasTotais <= maxEmpresa) return { empresa: diasTotais, inss: 0 };
    return { empresa: maxEmpresa, inss: diasTotais - maxEmpresa };
  }

  async exportarRelatorio(
    empresaId: string,
    filtros?: AfastamentoFiltros
  ): Promise<AfastamentoComColaborador[]> {
    try {
      const { data } = await this.listar({ filters: { ...filtros, empresa_id: empresaId } });
      const headers = [
        'ID',
        'Colaborador',
        'Tipo',
        'CID',
        'Início',
        'Fim Previsto',
        'Dias Totais',
        'Empresa',
        'INSS',
        'Status',
      ];
      const rows = data.map(af => [
        af.id.split('-')[0],
        af.colaborador?.nome_completo || '-',
        af.tipo,
        af.cid || '-',
        af.data_inicio,
        af.data_fim_prevista,
        af.dias_total,
        af.dias_empresa,
        af.dias_inss,
        af.status,
      ]);

      const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `afastamentos_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return data;
    } catch (e) {
      throw new Error('Falha ao exportar relatório', { cause: e });
    }
  }
}

export const afastamentoService = new AfastamentoService();
