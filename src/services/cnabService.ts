import { supabase } from '@/integrations/supabase/client';
import { formatDateLocalISO } from '@/utils/dateLocal';

export interface CNABConfig {
  banco_codigo: string;
  agencia: string;
  agencia_digito?: string;
  conta: string;
  conta_digito: string;
  convenio: string;
  codigo_empresa?: string;
  nome_empresa?: string;
}

interface CnabConfigRecord {
  id: string;
  empresa_id: string;
  banco_codigo: string;
  agencia: string;
  agencia_digito?: string;
  conta: string;
  conta_digito: string;
  convenio: string;
  codigo_empresa?: string;
  nome_empresa?: string;
}

interface CnabRemessaRecord {
  id: string;
  empresa_id: string;
  banco_codigo: string;
  status: string;
  valor_total: number;
  total_pagamentos: number;
  arquivo_remessa?: string;
  created_at?: string;
}

interface ContaBancariaRecord {
  id: string;
  colaborador_id: string;
  banco_codigo: string;
  agencia: string;
  agencia_digito?: string;
  conta: string;
  digito?: string;
  tipo_conta?: string;
  pix_chave?: string;
  pix_tipo?: string;
  principal?: boolean;
}

interface CnabItemRecord {
  id: string;
  remessa_id: string;
  colaborador_id: string;
  folha_item_id?: string;
  nome_favorecido: string;
  cpf_cnpj_favorecido: string;
  valor_pagamento: number;
  seu_numero: string;
  status: string;
  codigo_ocorrencia?: string;
  mensagem_ocorrencia?: string;
}

interface FolhaItemRecord {
  id: string;
  colaborador_id: string;
  folha_id: string;
  total_liquido: number;
  colaborador?: { id: string; nome_completo: string; cpf: string };
}

type DataRecord = any;

export const cnabService = {
  async getConfig(empresaId: string): Promise<CNABConfig | null> {
    const { data, error } = await supabase
      .from('cnab_configuracoes')
      .select('*')
      .eq('empresa_id', empresaId)
      .maybeSingle();
    
    if (error) throw error;
    return (data as CnabConfigRecord | null) as CNABConfig | null;
  },

  async saveConfig(empresaId: string, config: CNABConfig) {
    const { data: existing } = await supabase
      .from('cnab_configuracoes')
      .select('id')
      .eq('empresa_id', empresaId)
      .maybeSingle();

    if (existing) {
      const existingRecord = existing as DataRecord;
      const { error } = await supabase
        .from('cnab_configuracoes')
        .update(config as DataRecord)
        .eq('id', String(existingRecord.id))
        .eq('empresa_id', empresaId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('cnab_configuracoes')
        .insert([{ empresa_id: empresaId, ...config }]);
      if (error) throw error;
    }
  },

  async listRemessas(empresaId: string) {
    const { data, error } = await supabase
      .from('cnab_remessas')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async listPixLotes(empresaId: string) {
    const { data, error } = await supabase
      .from('pix_lotes')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async generateCNAB240(empresaId: string, folhaId: string): Promise<string> {
    const config = await this.getConfig(empresaId);
    if (!config) throw new Error('Configuração CNAB não encontrada para esta empresa.');

    // Idempotency guard (C46/C47): reject if a remessa already exists in 'enviado'
    // status for this folha to prevent double-payment. Allow recovery if 'pendente'
    // (previous attempt failed before sending).
    const { data: existingRemessa } = await (supabase as any)
      .from('cnab_remessas')
      .select('id, status, arquivo_remessa')
      .eq('empresa_id', empresaId)
      .eq('folha_id', folhaId)
      .maybeSingle();

    if (existingRemessa) {
      const rec = existingRemessa as unknown as CnabRemessaRecord & { folha_id?: string; arquivo_remessa?: string };
      if (rec.status === 'enviado' && rec.arquivo_remessa) {
        return rec.arquivo_remessa;
      }
    }

    const { data: itens, error: hError } = await supabase
      .from('folha_itens')
      .select(`
        *,
        colaborador:colaboradores(id, nome_completo, cpf)
      `)
      .eq('folha_id', folhaId);

    if (hError) throw hError;
    if (!itens?.length) throw new Error('Nenhum pagamento encontrado para gerar CNAB.');

    const typedItens = itens as unknown as FolhaItemRecord[];
    const colaboradorIds = typedItens.map(i => i.colaborador_id);
    const { data: contas, error: cError } = await supabase
      .from('contas_bancarias')
      .select('*')
      .in('colaborador_id', colaboradorIds)
      .eq('principal', true);

    if (cError) throw cError;

    // Re-use pending remessa from a failed previous attempt; otherwise create new.
    let remessaRecord: CnabRemessaRecord;
    if (existingRemessa && (existingRemessa as unknown as CnabRemessaRecord).status === 'pendente') {
      remessaRecord = existingRemessa as unknown as CnabRemessaRecord;
    } else {
      const { data: remessa, error: rError } = await supabase
        .from('cnab_remessas')
        .insert([{
          empresa_id: empresaId,
          folha_id: folhaId,
          banco_codigo: config.banco_codigo,
          status: 'pendente',
          valor_total: typedItens.reduce((acc, i) => acc + Number(i.total_liquido), 0),
          total_pagamentos: typedItens.length
        }] as any)
        .select()
        .single();

      if (rError || !remessa) throw rError || new Error('Falha ao criar remessa');
      remessaRecord = remessa as unknown as CnabRemessaRecord;
    }

    const lines: string[] = [];
    // Fetch monotonically increasing sequence per (empresa, banco) — fixes C46 hardcoded=1
    const { data: seqData } = await supabase.rpc('next_cnab_sequencial', {
      p_empresa_id: empresaId,
      p_banco_codigo: config.banco_codigo,
    } as any);
    const sequence = (seqData as number) || 1;

    const pad = (val: unknown, len: number, char = ' ', side: 'left' | 'right' = 'right') => {
      const s = String(val || '').substring(0, len);
      return side === 'right' ? s.padEnd(len, char) : s.padStart(len, char);
    };

    const formatAmount = (val: number) => pad(Math.trunc(val * 100), 15, '0', 'left');

    const today = new Date();
    const dateStr = formatDateLocalISO(today).replace(/-/g, '');
    const timeStr = today.toTimeString().slice(0, 8).replace(/:/g, '');

    const header = pad(config.banco_codigo, 3, '0', 'left') + '00000' + pad('', 9) + '2' + pad('', 14, '0') + pad(config.convenio, 20) + pad(config.agencia, 5, '0', 'left') + pad(config.agencia_digito || '', 1) + pad(config.conta, 12, '0', 'left') + pad(config.conta_digito, 1) + ' ' + pad(config.nome_empresa || 'EMPRESA', 30) + pad('BANCO', 30) + pad('', 10) + '1' + dateStr + timeStr + pad(sequence, 6, '0', 'left') + '081' + '00000' + pad('', 69);
    lines.push(header.padEnd(240, ' '));

    let detailSequence = 1;
    let totalValue = 0;
    const cnabItensToInsert: DataRecord[] = [];

    // Header de Lote (Tipo 1)
    const lotHeader = pad(config.banco_codigo, 3, '0', 'left') + '00011' + 'C' + '30' + '01' + ' ' + '040' + pad(config.agencia, 5, '0', 'left') + pad(config.agencia_digito || '', 1) + pad(config.conta, 12, '0', 'left') + pad(config.conta_digito, 1) + ' ' + pad(config.nome_empresa || 'EMPRESA', 30) + pad('', 40) + pad('', 30) + pad('', 10) + dateStr + pad('', 8, '0') + pad('', 33);
    lines.push(lotHeader.padEnd(240, ' '));

    const typedContas = (contas as unknown as ContaBancariaRecord[]) || [];

    for (const item of typedItens) {
      const colab = item.colaborador;
      const conta = typedContas.find(c => c.colaborador_id === item.colaborador_id);
      if (!conta) continue;

      const valor = Number(item.total_liquido);
      totalValue += valor;
      const seuNumero = `${remessaRecord.id.substring(0, 8)}-${detailSequence}`;

      cnabItensToInsert.push({
        remessa_id: remessaRecord.id,
        colaborador_id: item.colaborador_id,
        folha_item_id: item.id,
        nome_favorecido: colab?.nome_completo ?? '',
        cpf_cnpj_favorecido: colab?.cpf ?? '',
        valor_pagamento: valor,
        seu_numero: seuNumero,
        status: 'processando'
      });

      // Segmento A (Crédito em Conta)
      const segA = pad(config.banco_codigo, 3, '0', 'left') + '00013' + pad(detailSequence++, 5, '0', 'left') + 'A' + '000' + '000' + pad(conta.banco_codigo || '000', 3, '0', 'left') + pad(conta.agencia || '', 5, '0', 'left') + pad(conta.agencia_digito || '', 1) + pad(conta.conta || '', 12, '0', 'left') + pad(conta.digito || '', 1) + ' ' + pad(colab?.nome_completo || '', 30) + pad(seuNumero, 20) + dateStr + 'BRL' + pad('', 15, '0') + formatAmount(valor) + pad('', 20) + pad('', 8, '0') + pad('', 15, '0') + pad('', 40) + '00' + pad('', 10);
      lines.push(segA.padEnd(240, ' '));

      // Se tiver chave PIX, adiciona Segmento B (PIX)
      if (conta.pix_chave) {
        const segB = pad(config.banco_codigo, 3, '0', 'left') + '00013' + pad(detailSequence++, 5, '0', 'left') + 'B' + pad('', 3) + '2' + pad(colab?.cpf || '', 14, '0', 'left') + pad('', 30) + pad('', 30) + pad('', 30) + pad('', 30) + pad(conta.pix_chave, 60) + pad('', 25);
        lines.push(segB.padEnd(240, ' '));
      }
    }

    // Trailer de Lote (Tipo 5)
    const lotTrailer = pad(config.banco_codigo, 3, '0', 'left') + '00015' + pad('', 9) + pad(detailSequence + 1, 6, '0', 'left') + formatAmount(totalValue) + pad('', 18, '0') + pad('', 183);
    lines.push(lotTrailer.padEnd(240, ' '));

    // Trailer de Arquivo (Tipo 9)
    const trailer = pad(config.banco_codigo, 3, '0', 'left') + '99999' + pad('', 9) + '000001' + pad(lines.length + 1, 6, '0', 'left') + pad('', 6, '0') + pad('', 205);
    lines.push(trailer.padEnd(240, ' '));

    const fullFile = lines.join('\r\n');

    // Insert cnab_itens BEFORE marking remessa as 'enviado' (fixes C47):
    // if we crash after updating status but before inserting items, the remessa
    // would appear sent but have no payment records. Insert items first so the
    // DB is always consistent — a pending remessa with items is recoverable.
    if (cnabItensToInsert.length > 0) {
      await supabase.from('cnab_itens').insert(cnabItensToInsert);
    }

    // Only after items are persisted, mark remessa as sent with the full file
    await supabase.from('cnab_remessas').update({
      arquivo_remessa: fullFile,
      status: 'enviado',
      sequencial_arquivo: sequence,
    } as any).eq('id', remessaRecord.id).eq('empresa_id', empresaId);

    return fullFile;
  },

  async parseRetornoCNAB(empresaId: string, fileContent: string) {
    const lines = fileContent.split(/\r?\n/);
    const results = {
      sucesso: 0,
      erro: 0,
      detalhes: [] as Array<{ nome: string; status: string; ocorrencia: string }>
    };

    for (const line of lines) {
      if (line.length < 240) continue;
      
      const tipoRegistro = line.substring(7, 8);
      const segmento = line.substring(13, 14);

      if (tipoRegistro === '3' && segmento === 'A') {
        const seuNumero = line.substring(73, 93).trim();
        const codigoOcorrencia = line.substring(230, 232);
        
        const { data: item } = await (supabase as any)
          .from('cnab_itens')
          .select('id, folha_item_id, nome_favorecido')
          .eq('seu_numero', seuNumero)
          .eq('empresa_id', empresaId)
          .maybeSingle();

        if (item) {
          const itemRecord = item as unknown as CnabItemRecord;
          const isSuccess = ['00', '02'].includes(codigoOcorrencia);
          const status = isSuccess ? 'pago' : 'erro';

          await (supabase as any)
            .from('cnab_itens')
            .update({
              status,
              codigo_ocorrencia: codigoOcorrencia,
              mensagem_ocorrencia: isSuccess ? 'Confirmado' : 'Rejeitado pelo banco'
            })
            .eq('id', itemRecord.id)
            .eq('empresa_id', empresaId);

          if (isSuccess && itemRecord.folha_item_id) {
            await (supabase as any)
              .from('folha_itens')
              .update({ status_pagamento: 'pago' })
              .eq('id', itemRecord.folha_item_id)
              .eq('empresa_id', empresaId);
            results.sucesso++;
          } else {
            results.erro++;
          }

          results.detalhes.push({
            nome: itemRecord.nome_favorecido,
            status,
            ocorrencia: codigoOcorrencia
          });
        }
      }
    }
    return results;
  },

  async generatePIXBatch(empresaId: string, folhaId: string): Promise<string> {
    const { data: itens, error: hError } = await supabase
      .from('folha_itens')
      .select(`
        *, 
        colaborador:colaboradores(id, nome_completo, cpf)
      `)
      .eq('folha_id', folhaId);
    
    if (hError) throw hError;
    if (!itens?.length) throw new Error('Nenhum pagamento encontrado para gerar lote PIX.');

    const typedItens = itens as unknown as FolhaItemRecord[];
    const colaboradorIds = typedItens.map(i => i.colaborador_id);
    const { data: contas, error: cError } = await supabase
      .from('contas_bancarias')
      .select('*')
      .in('colaborador_id', colaboradorIds)
      .eq('principal', true);

    if (cError) throw cError;

    const typedContas = (contas as unknown as ContaBancariaRecord[]) || [];

    const csvLines = ['Nome;CPF/CNPJ;Chave Pix;Tipo Chave;Valor;Descricao;ID_Folha_Item'];
    for (const item of typedItens) {
      const colab = item.colaborador;
      const conta = typedContas.find(c => c.colaborador_id === item.colaborador_id);
      if (!conta || !conta.pix_chave) continue;
      const valor = Number(item.total_liquido);
      csvLines.push(`${colab?.nome_completo ?? ''};${colab?.cpf || ''};${conta.pix_chave};${conta.pix_tipo || 'CPF'};${valor.toFixed(2).replace('.', ',')};Pagamento Salarial;${item.id}`);
    }

    if (csvLines.length === 1) throw new Error('Nenhum colaborador com chave PIX cadastrada nesta folha.');
    return csvLines.join('\n');
  }
};