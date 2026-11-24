// Parser AFDT/ACJEF/AEJ - Portaria MTP 671/2021 (ex-1510/2009)
// Recebe { conteudo: string, nome_arquivo: string, tipo?: 'AFDT'|'ACJEF'|'AEJ' }
// Retorna { importacao_id, total_linhas, total_registros, total_erros }
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';
import { corsHeaders, parseJsonBody } from '../_shared/contract.ts';

function err(msg: string, status = 400, code = 'BAD_REQUEST') {
  return new Response(JSON.stringify({ error: msg, code }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sha256(text: string) {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function parseData(ddmmaaaa: string): string | null {
  if (!/^\d{8}$/.test(ddmmaaaa)) return null;
  const d = ddmmaaaa.slice(0, 2);
  const m = ddmmaaaa.slice(2, 4);
  const y = ddmmaaaa.slice(4, 8);
  return `${y}-${m}-${d}`;
}

function parseHora(hhmm: string): string | null {
  if (!/^\d{4}$/.test(hhmm)) return null;
  return `${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}:00`;
}

interface ParsedRow {
  nsr: number | null;
  tipo_registro: string;
  linha_numero: number;
  data_hora_marcacao: string | null;
  cpf: string | null;
  pis: string | null;
  conteudo_original: string;
  erro: string | null;
}

// AFDT tipo 3 (marcação): NSR(9) + Tipo(1='3') + Data(8) + Hora(4) + PIS(12)
// Header tipo 1 e trailler tipo 9 são ignorados aqui, mas metadados extraídos.
function parseAFDT(text: string): { rows: ParsedRow[]; cnpj: string | null; dtIni: string | null; dtFim: string | null } {
  const rows: ParsedRow[] = [];
  let cnpj: string | null = null;
  let dtIni: string | null = null;
  let dtFim: string | null = null;

  const lines = text.split(/\r?\n/);
  lines.forEach((raw, idx) => {
    const line = raw.trim();
    if (!line) return;
    // NSR são os primeiros 9 dígitos
    const nsrStr = line.slice(0, 9);
    const tipo = line.slice(9, 10);
    const nsr = /^\d+$/.test(nsrStr) ? parseInt(nsrStr, 10) : null;

    if (tipo === '1') {
      // Header AFDT: NSR(9)+Tipo(1)+TipoIdent(1)+Ident(14)+Razao(150)+DtIni(8)+DtFim(8)+DtGer(8)+HrGer(4)
      const ident = line.slice(11, 25).replace(/\D/g, '');
      cnpj = ident || null;
      dtIni = parseData(line.slice(175, 183));
      dtFim = parseData(line.slice(183, 191));
      return;
    }
    if (tipo === '9') return; // trailler

    if (tipo === '3') {
      const dataStr = line.slice(10, 18);
      const horaStr = line.slice(18, 22);
      const pis = line.slice(22, 34).replace(/\D/g, '');
      const d = parseData(dataStr);
      const h = parseHora(horaStr);
      const isoTs = d && h ? `${d}T${h}-03:00` : null;
      rows.push({
        nsr,
        tipo_registro: '3',
        linha_numero: idx + 1,
        data_hora_marcacao: isoTs,
        cpf: null,
        pis: pis || null,
        conteudo_original: line,
        erro: isoTs && pis ? null : 'Data/hora/PIS inválidos',
      });
      return;
    }

    // Tipos 2/4/5/7 (inclusão/alteração/ajuste) — armazenados como raw para auditoria
    rows.push({
      nsr,
      tipo_registro: tipo,
      linha_numero: idx + 1,
      data_hora_marcacao: null,
      cpf: null,
      pis: null,
      conteudo_original: line,
      erro: null,
    });
  });

  return { rows, cnpj, dtIni, dtFim };
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const csrf = await verifyCsrf(req.clone());
  if (!csrf.ok) return csrf.response!;

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return err('Autenticação obrigatória', 401, 'UNAUTHORIZED');

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return err('Sessão inválida', 401, 'UNAUTHORIZED');
  const userId = u.user.id;

  const adminRL = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
  const rl = await checkRateLimit(adminRL, { key: `parse-afdt:${userId}`, limit: 10, windowSec: 60 });
  if (!rl.allowed) return rateLimitResponse(rl);

  let body: { conteudo?: string; nome_arquivo?: string; tipo?: string; empresa_id?: string };
  const { body: _pb, errorResponse: _pe } = await parseJsonBody(req);
  if (_pe) return _pe;
  body = _pb as typeof body;

  const conteudo = String(body.conteudo ?? '');
  const nomeArquivo = String(body.nome_arquivo ?? 'arquivo.txt').slice(0, 255);
  const tipo = ['AFDT', 'ACJEF', 'AEJ'].includes(String(body.tipo ?? '')) ? body.tipo! : 'AFDT';
  const empresaId = String(body.empresa_id ?? '').trim();

  if (!conteudo) return err('conteudo obrigatório');
  if (!empresaId) return err('empresa_id obrigatório');
  if (conteudo.length > 10 * 1024 * 1024) return err('Arquivo maior que 10MB', 413, 'TOO_LARGE');

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: vinc } = await admin
    .from('user_empresas').select('empresa_id').eq('user_id', userId).eq('empresa_id', empresaId).maybeSingle();
  if (!vinc) return err('Sem permissão nesta empresa', 403, 'FORBIDDEN');

  const hash = await sha256(conteudo);

  // idempotência: mesmo hash+empresa
  const { data: existente } = await admin
    .from('afdt_importacoes').select('id, status, total_registros, total_erros, total_linhas')
    .eq('empresa_id', empresaId).eq('hash_sha256', hash).maybeSingle();
  if (existente) {
    return new Response(JSON.stringify({ ok: true, reused: true, importacao: existente }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { rows, cnpj, dtIni, dtFim } = parseAFDT(conteudo);
  const totalLinhas = conteudo.split(/\r?\n/).filter((l) => l.trim()).length;
  const totalErros = rows.filter((r) => r.erro).length;

  const { data: imp, error: impErr } = await admin.from('afdt_importacoes').insert({
    empresa_id: empresaId,
    tipo,
    nome_arquivo: nomeArquivo,
    tamanho_bytes: conteudo.length,
    hash_sha256: hash,
    status: totalErros === 0 ? 'concluido' : 'parcial',
    total_linhas: totalLinhas,
    total_registros: rows.length,
    total_erros: totalErros,
    cnpj_empregador: cnpj,
    data_inicial: dtIni,
    data_final: dtFim,
    importado_por: userId,
  }).select('id').single();
  if (impErr || !imp) return err(impErr?.message ?? 'Falha ao registrar importação', 500, 'DB_ERROR');

  if (rows.length) {
    const inserts = rows.map((r) => ({ ...r, importacao_id: imp.id, empresa_id: empresaId }));
    // Insere em lotes de 500 para não estourar payload
    for (let i = 0; i < inserts.length; i += 500) {
      const slice = inserts.slice(i, i + 500);
      const { error: rawErr } = await admin.from('afdt_registros_raw').insert(slice);
      if (rawErr) {
        await admin.from('afdt_importacoes').update({ status: 'erro', mensagem_erro: rawErr.message }).eq('id', imp.id);
        return err(rawErr.message, 500, 'DB_ERROR');
      }
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      importacao_id: imp.id,
      total_linhas: totalLinhas,
      total_registros: rows.length,
      total_erros: totalErros,
      cnpj_empregador: cnpj,
      periodo: { inicio: dtIni, fim: dtFim },
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
