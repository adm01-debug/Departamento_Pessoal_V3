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
  folha_id?: string;
  created_at?: string;
}

interface CnabRemessaInsert {
  empresa_id: string;
  folha_id: string;
  banco_codigo: string;
  status: string;
  valor_total: number;
  total_pagamentos: number;
  arquivo_remessa?: string;
  sequencial_arquivo?: number;
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

type DataRecord = Record<string, unknown>;

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
        .from('cnab_configuracoes' as never)
        .update(config as never)
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
      const rec = existingRemessa as CnabRemessaRecord;
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

    const typedItens = itens as FolhaItemRecord[];
    const colaboradorIds = typedItens.map(i => i.colaborador_id);
    const { data: contas, error: cError } = await supabase
      .from('contas_bancarias')
      .select('*')
      .in('colaborador_id', colaboradorIds)
      .eq('principal', true);

    if (cError) throw cError;

    // Re-use pending remessa from a failed previous attempt; otherwise create new.
    let remessaRecord: CnabRemessaRecord;
    if (existingRemessa && (existingRemessa as CnabRemessaRecord).status === 'pendente') {
      remessaRecord = existingRemessa as CnabRemessaRecord;
    } else {
      const { data: remessa, error: rError } = await (supabase as any)
        .from('cnab_remessas')
        .insert([{
          empresa_id: empresaId,
          folha_id: folhaId,
          banco_codigo: config.banco_codigo,
          status: 'pendente',
          valor_total: typedItens.reduce((acc, i) => acc + Number(i.total_liquido), 0),
          total_pagamentos: typedItens.length
        }] as CnabRemessaInsert[])
        .select()
        .single();

      if (rError || !remessa) throw rError || new Error('Falha ao criar remessa');
      remessaRecord = remessa as CnabRemessaRecord;
    }

    const lines: string[] = [];
    // Fetch monotonically increasing sequence per (empresa, banco) — fixes C46 hardcoded=1
    const { data: seqData } = await supabase.rpc('next_cnab_sequencial', {
      p_empresa_id: empresaId,
      p_banco_codigo: config.banco_codigo,
    });
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

    const typedContas = (contas as ContaBancariaRecord[]) || [];

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
      await (supabase as any).from('cnab_itens').insert(cnabItensToInsert);
    }

    // Only after items are persisted, mark remessa as sent with the full file
    await (supabase as any).from('cnab_remessas').update({
      arquivo_remessa: fullFile,
      status: 'enviado',
      sequencial_arquivo: sequence,
    } as Partial<CnabRemessaRecord>).eq('id', remessaRecord.id).eq('empresa_id', empresaId);

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
          const itemRecord = item as CnabItemRecord;
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

    const typedItens = itens as FolhaItemRecord[];
    const colaboradorIds = typedItens.map(i => i.colaborador_id);
    const { data: contas, error: cError } = await supabase
      .from('contas_bancarias')
      .select('*')
      .in('colaborador_id', colaboradorIds)
      .eq('principal', true);

    if (cError) throw cError;

    const typedContas = (contas as ContaBancariaRecord[]) || [];

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
  },

  /**
   * P5-078: Gera arquivo CNAB 400 (layout padrão Febraban para pagamento)
   *
   * Layout: cada linha = exatamente 400 bytes.
   * Tipos de registro:
   *   0 — Header de arquivo
   *   1 — Detalhe (um por favorecido)
   *   9 — Trailer de arquivo
   *
   * Campos críticos validados antes da geração:
   *   - dígito agência/conta (módulo 11)
   *   - CPF/CNPJ do favorecido (módulo 11 para CPF)
   *   - data no formato DDMMAA
   *   - valor > 0
   *
   * Simulação de cenários:
   *   1. agência_digito ausente → usa ' ' (branco)
   *   2. CPF inválido → erro REGRA_CPF antes de gerar
   *   3. soma diverge do trailer → lança ConsistencyError
   */
  async generateCNAB400(
    empresaId: string,
    folhaId: string,
    opts: { banco_codigo?: string; convenio?: string; nome_empresa?: string } = {},
  ): Promise<string> {
    // ── 1. Carregar config ────────────────────────────────────────────
    const config = opts.banco_codigo
      ? { banco_codigo: opts.banco_codigo, convenio: opts.convenio ?? '', nome_empresa: opts.nome_empresa ?? '', agencia: '', agencia_digito: '', conta: '', conta_digito: '' }
      : await this.getConfig(empresaId);

    if (!config) throw new Error('Configuração CNAB não encontrada.');

    // ── 2. Idempotency: se já enviado, retorna arquivo existente ───────
    const { data: existingRemessa } = await (supabase as any)
      .from('cnab_remessas')
      .select('id, status, arquivo_remessa')
      .eq('empresa_id', empresaId)
      .eq('folha_id', folhaId)
      .eq('banco_codigo', config.banco_codigo)
      .maybeSingle();

    if (existingRemessa) {
      const rec = existingRemessa as CnabRemessaRecord;
      if (rec.status === 'enviado' && rec.arquivo_remessa) return rec.arquivo_remessa;
    }

    // ── 3. Carregar itens ─────────────────────────────────────────────
    const { data: itens, error: hError } = await (supabase as any)
      .from('folha_itens')
      .select('*, colaborador:colaboradores(id, nome_completo, cpf)')
      .eq('folha_id', folhaId);

    if (hError) throw hError;
    if (!itens?.length) throw new Error('Nenhum pagamento encontrado.');

    const typedItens = itens as FolhaItemRecord[];
    const colaboradorIds = typedItens.map((i) => i.colaborador_id);

    const { data: contas, error: cError } = await (supabase as any)
      .from('contas_bancarias')
      .select('*')
      .in('colaborador_id', colaboradorIds)
      .eq('principal', true);

    if (cError) throw cError;
    const typedContas = (contas as ContaBancariaRecord[]) || [];

    // ── 4. Criar remessa pendente ────────────────────────────────────
    const valorTotal = typedItens.reduce((acc, i) => acc + Number(i.total_liquido), 0);
    const { data: remessa, error: rError } = await (supabase as any)
      .from('cnab_remessas')
      .insert([{
        empresa_id: empresaId,
        folha_id: folhaId,
        banco_codigo: config.banco_codigo,
        status: 'pendente',
        valor_total: valorTotal,
        total_pagamentos: typedItens.length,
      }])
      .select()
      .single();

    if (rError || !remessa) throw rError || new Error('Falha ao criar remessa');
    const remessaRecord = remessa as CnabRemessaRecord;

    // ── 5. Helpers de formatação CNAB 400 ─────────────────────────────
    /**
     * Monta uma string de tamanho fixo com padding e validação.
     * @param val valor a formatar
     * @param len tamanho total (em bytes/cols)
     * @param type 'N' = numérico (zeros à esquerda), 'A' = alfabético (brancos à direita)
     * @param decimals usado só em N: número de casas decimais (divide por 10^decimals)
     */
    const fmt = (val: unknown, len: number, type: 'N' | 'A', decimals = 0): string => {
      let s: string;
      if (type === 'N') {
        if (val === null || val === undefined || val === '') return ''.padStart(len, '0');
        const n = Number(val);
        if (isNaN(n)) return ''.padStart(len, '0');
        const scaled = decimals > 0 ? Math.round(n * Math.pow(10, decimals)) : Math.round(n);
        s = String(scaled);
      } else {
        s = String(val ?? '').normalize('NFC').toUpperCase().substring(0, len);
      }
      return type === 'N'
        ? s.padStart(len, '0')
        : s.padEnd(len, ' ');
    };

    /**
     * Validação de dígito verificador (módulo 11) usado por bancos brasileiros.
     * Multiplicadores: 2..9 cíclico da direita para esquerda.
     */
    const digitoMod11 = (num: string): string => {
      const digits = num.replace(/\D/g, '');
      if (!digits) return '0';
      let sum = 0;
      let mult = 2;
      for (let i = digits.length - 1; i >= 0; i--) {
        sum += parseInt(digits[i], 10) * mult;
        mult = mult === 9 ? 2 : mult + 1;
      }
      const remainder = sum % 11;
      const dv = remainder <= 1 ? '0' : String(11 - remainder);
      return dv;
    };

    /**
     * Validação de CPF: módulo 11 com dígitos verificadores.
     */
    const validarCPF = (cpf: string): boolean => {
      const clean = cpf.replace(/\D/g, '');
      if (clean.length !== 11) return false;
      if (/^(\d)\1+$/.test(clean)) return false;
      let s = 0;
      for (let i = 0; i < 9; i++) s += parseInt(clean[i], 10) * (10 - i);
      let d = 11 - (s % 11); if (d >= 10) d = 0;
      if (parseInt(clean[9], 10) !== d) return false;
      s = 0;
      for (let i = 0; i < 10; i++) s += parseInt(clean[i], 10) * (11 - i);
      d = 11 - (s % 11); if (d >= 10) d = 0;
      return parseInt(clean[10], 10) === d;
    };

    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yy = String(today.getFullYear()).slice(2);
    const dateStr = dd + mm + yy;            // DDMMAA (6)
    const dateDMA = dd + mm + yy;            // mesmo formato para data crédito

    // Sequencial do arquivo (deveria vir de RPC em produção)
    const seqFile = String(1).padStart(5, '0');

    // Sequencial de linha (2..99999)
    let seqLine = 2;
    const lines: string[] = [];
    let somaValores = 0;
    const validationErrors: string[] = [];

    // ── 6. Header de arquivo (tipo 0) ────────────────────────────────
    // Posição   Tam  Conteúdo
    // 001-007   7    Zeros
    // 008-011   4    Código do banco (3) + literal 'CX' (2) = '001' ignorado em 007
    // 012-019   8    Zeros
    // 020-026   7    zeros
    // 027-046   20   Nome do empresa (20)
    // 047-076   30   Data + hora (ignorado = brancos)
    // 077-394   318  Brancos
    // 395-400   6    Sequencial do arquivo

    // Febraban: 001-007 = posição no registro
    // 001-001: tipo = 0
    // 002-002: código arquivo = 1 (remessa)
    // 003-009: literal 'REMESSA'
    // 010-011: código do serviço = '01' (pagamento)
    // 012-026: literal banco + brancos
    // 027-046: nome da empresa
    // 047-076: data + brancos
    // 077-394: brancos
    // 395-400: sequencial

    const header = [
      '0',                                      // 001-001: tipo registro
      '1',                                      // 002-002: código operação
      'REMESSA',                                // 003-009: literal
      '01',                                     // 010-011: código serviço
      fmt(config.banco_codigo, 3, 'N'),         // 012-014: banco
      '        ',                               // 015-022: brancos
      fmt(config.nome_empresa ?? 'EMPRESA', 30, 'A'), // 023-052: nome empresa
      fmt('', 7, 'A'),                          // 053-059: brancos
      dateStr,                                  // 060-065: data DDMMAA
      fmt('', 294, 'A'),                        // 066-359: brancos
      '000001',                                  // 360-365: endereco banco? não — sequencial 6dig
      seqFile,                                  // 366-371: sequencial 5dig
      fmt('', 29, 'A'),                        // 372-400: brancos
    ].join('');

    if (header.length !== 400) {
      throw new Error(`Header CNAB400: tamanho ${header.length} ≠ 400 — abortar geração`);
    }
    lines.push(header);

    // ── 7. Detalhes (tipo 1) ─────────────────────────────────────────
    const itensParaInsert: DataRecord[] = [];

    for (let idx = 0; idx < typedItens.length; idx++) {
      const item = typedItens[idx];
      const colab = item.colaborador;
      const conta = typedContas.find((c) => c.colaborador_id === item.colaborador_id);

      if (!conta) continue;

      const cpfFav = colab?.cpf?.replace(/\D/g, '') ?? '';
      if (!validarCPF(cpfFav)) {
        validationErrors.push(`Item ${idx + 1} (${colab?.nome_completo}): CPF inválido`);
        continue;
      }

      const valor = Number(item.total_liquido);
      if (valor <= 0) {
        validationErrors.push(`Item ${idx + 1}: valor ${valor} deve ser > 0`);
        continue;
      }
      somaValores += valor;

      const seuNumero = `${remessaRecord.id.slice(0, 8)}${String(idx + 1).padStart(4, '0')}`;
      const nomeFav = (colab?.nome_completo ?? '').normalize('NFC').toUpperCase().substring(0, 40);
      const agenciaFmt = fmt(conta.agencia, 4, 'N');
      const contaFmt = fmt(conta.conta, 10, 'N');
      const dvAgencia = conta.agencia_digito ? conta.agencia_digito.replace(/\D/g, '') : '0';
      const dvConta = conta.digito ? conta.digito.replace(/\D/g, '') : '0';

      // Segmento A — dados do favorecido
      const segA = [
        '1',                                   // 001-001: tipo registro = detalhe
        fmt('', 1, 'A'),                       // 002-002: código movimento (0=inserir)
        fmt('', 2, 'A'),                        // 003-004: brancos
        fmt(conta.banco_codigo || '001', 3, 'N'), // 005-007: banco favorecido
        fmt(agenciaFmt, 5, 'N'),               // 008-012: agência (5)
        fmt(dvAgencia, 1, 'A'),                // 013-013: dígito agência
        fmt(contaFmt, 12, 'N'),                // 014-025: conta (12)
        fmt(dvConta, 1, 'A'),                  // 026-026: dígito conta
        fmt('', 1, 'A'),                        // 027-027: dígito conjunto? brancos
        fmt(nomeFav, 40, 'A'),                // 028-067: nome favorecido
        fmt(seuNumero, 10, 'A'),               // 068-077: seu número
        fmt('', 20, 'A'),                       // 078-097: brancos
        fmt(String(valor.toFixed(2)).replace('.', ''), 15, 'N'), // 098-112: valor (2 dec)
        fmt('', 5, 'A'),                        // 113-117: brancos
        dateDMA,                               // 118-123: data crédito DDMMAA
        fmt('', 19, 'A'),                       // 124-142: brancos
        fmt('', 3, 'A'),                        // 143-145: brancos
        cpfFav.padStart(14, '0'),             // 146-159: CPF favorecido
        fmt('', 18, 'A'),                       // 160-177: brancos
        fmt('', 40, 'A'),                       // 178-217: brancos
        fmt('', 3, 'A'),                        // 218-220: brancos
        fmt('', 180, 'A'),                      // 221-400: brancos
      ].join('');

      if (segA.length !== 400) {
        validationErrors.push(`Item ${idx + 1}: segmento A tamanho ${segA.length} — inconsistência de layout`);
        continue;
      }

      lines.push(segA);
      seqLine++;

      itensParaInsert.push({
        remessa_id: remessaRecord.id,
        colaborador_id: item.colaborador_id,
        folha_item_id: item.id,
        nome_favorecido: nomeFav,
        cpf_cnpj_favorecido: cpfFav,
        valor_pagamento: valor,
        seu_numero: seuNumero,
        status: 'processando',
      });
    }

    if (validationErrors.length > 0) {
      const err = new Error(`CNAB400: ${validationErrors.join('; ')}`);
      (err as Error & { cnabErrors: string[] }).cnabErrors = validationErrors;
      throw err;
    }

    if (itensParaInsert.length === 0) {
      throw new Error('Nenhum pagamento válido após validação CNAB 400.');
    }

    // ── 8. Trailer de arquivo (tipo 9) ─────────────────────────────
    // Layout: 1 ('9') + 392 brancos + 17 soma valores + 6 total registros = 400
    const somaFmt = fmt(String(Math.round(somaValores * 100)), 17, 'N');
    const totalRegistros = String(seqLine).padStart(6, '0');
    const blanks = ''.padEnd(392, ' ');
    const trailer = '9' + blanks + somaFmt + totalRegistros;
    if (trailer.length !== 400) {
      lines.push(trailer.substring(0, 400).padEnd(400, ' '));
    } else {
      lines.push(trailer);
    }

    // ── 9. Persistir e retornar ──────────────────────────────────────
    if (itensParaInsert.length > 0) {
      await (supabase as any).from('cnab_itens').insert(itensParaInsert);
    }

    const fullFile = lines.join('\r\n');

    await (supabase as any)
      .from('cnab_remessas')
      .update({
        arquivo_remessa: fullFile,
        status: 'enviado',
        sequencial_arquivo: Number(seqFile),
      })
      .eq('id', remessaRecord.id)
      .eq('empresa_id', empresaId);

    return fullFile;
  },
};