// Edge Function: gerar-medida-disciplinar-pdf
// Gera documento HTML/PDF assinável de medida disciplinar (advertência/suspensão/justa causa)
// com hash SHA-256, upload ao bucket privado 'medidas-disciplinares' e signed URL retornada.
// Padrão idêntico ao usado em ferias-avisos.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import { corsHeaders, createErrorResponse, parseJsonBody, enforceOrigin, handlePreflight } from '../_shared/contract.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';
import { captureException } from '../_shared/sentry.ts';

const BodySchema = z.object({
  medida_id: z.string().uuid(),
});

const TIPO_LABELS: Record<string, string> = {
  advertencia_verbal: 'ADVERTÊNCIA VERBAL',
  advertencia_escrita: 'ADVERTÊNCIA ESCRITA',
  suspensao: 'SUSPENSÃO DISCIPLINAR',
  justa_causa: 'RESCISÃO POR JUSTA CAUSA',
};

const ARTIGOS_CLT: Record<string, string> = {
  art_482_a: 'Art. 482, a - Ato de improbidade',
  art_482_b: 'Art. 482, b - Incontinência de conduta ou mau procedimento',
  art_482_c: 'Art. 482, c - Negociação habitual por conta própria',
  art_482_d: 'Art. 482, d - Condenação criminal transitada em julgado',
  art_482_e: 'Art. 482, e - Desídia no desempenho das funções',
  art_482_f: 'Art. 482, f - Embriaguez habitual ou em serviço',
  art_482_g: 'Art. 482, g - Violação de segredo da empresa',
  art_482_h: 'Art. 482, h - Ato de indisciplina ou insubordinação',
  art_482_i: 'Art. 482, i - Abandono de emprego',
  art_482_j: 'Art. 482, j - Ofensas físicas ou morais',
  art_482_k: 'Art. 482, k - Prática constante de jogos de azar',
};

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function renderHTML(m: Record<string, unknown>, colaborador: Record<string, unknown>, empresa: Record<string, unknown>): string {
  const tipoLabel = TIPO_LABELS[m.tipo as string] ?? 'MEDIDA DISCIPLINAR';
  const artigoLabel = m.artigo_clt ? (ARTIGOS_CLT[m.artigo_clt as string] ?? m.artigo_clt) : '';
  const dataOcorrencia = new Date(m.data_ocorrencia as string).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const dataEmissao = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<title>${esc(tipoLabel)} — ${esc(colaborador.nome_completo as string)}</title>
<style>
@page { size: A4; margin: 2cm; }
body { font-family: Arial, sans-serif; font-size: 12pt; color: #000; line-height: 1.5; }
h1 { text-align: center; font-size: 16pt; margin-bottom: 4pt; }
.subtitle { text-align: center; font-size: 10pt; color: #444; margin-bottom: 24pt; }
.box { border: 1px solid #000; padding: 8pt 12pt; margin: 8pt 0; }
.row { display: flex; justify-content: space-between; margin: 4pt 0; }
.label { font-weight: bold; }
.section-title { font-weight: bold; margin-top: 16pt; margin-bottom: 6pt; border-bottom: 1px solid #000; padding-bottom: 2pt; }
.sign-area { margin-top: 40pt; display: flex; justify-content: space-between; gap: 24pt; }
.sign-box { flex: 1; text-align: center; border-top: 1px solid #000; padding-top: 4pt; font-size: 10pt; }
.footer { margin-top: 32pt; font-size: 8pt; color: #666; text-align: center; }
.recusa { background: #fff3cd; padding: 8pt; border-left: 4pt solid #f0ad4e; margin: 12pt 0; }
</style></head>
<body>
<h1>${esc(tipoLabel)}</h1>
<div class="subtitle">Documento emitido nos termos da CLT — Consolidação das Leis do Trabalho</div>

<div class="box">
  <div class="row"><span class="label">Empresa:</span><span>${esc(empresa.razao_social as string ?? empresa.nome as string)}</span></div>
  <div class="row"><span class="label">CNPJ:</span><span>${esc(empresa.cnpj as string)}</span></div>
</div>

<div class="section-title">DADOS DO COLABORADOR</div>
<div class="box">
  <div class="row"><span class="label">Nome:</span><span>${esc(colaborador.nome_completo as string)}</span></div>
  <div class="row"><span class="label">CPF:</span><span>${esc(colaborador.cpf as string)}</span></div>
  <div class="row"><span class="label">Cargo:</span><span>${esc((colaborador.cargo as string) ?? '—')}</span></div>
  <div class="row"><span class="label">Data de Admissão:</span><span>${colaborador.data_admissao ? new Date(colaborador.data_admissao as string).toLocaleDateString('pt-BR') : '—'}</span></div>
</div>

<div class="section-title">OCORRÊNCIA</div>
<div class="box">
  <div class="row"><span class="label">Data do Fato:</span><span>${esc(dataOcorrencia)}</span></div>
  ${artigoLabel ? `<div class="row"><span class="label">Enquadramento CLT:</span><span>${esc(artigoLabel)}</span></div>` : ''}
  ${m.tipo === 'suspensao' && m.dias_suspensao ? `<div class="row"><span class="label">Dias de Suspensão:</span><span>${m.dias_suspensao} dia(s) — CLT Art. 474</span></div>` : ''}
  ${m.gravidade ? `<div class="row"><span class="label">Gravidade:</span><span>${esc(String(m.gravidade).toUpperCase())}</span></div>` : ''}
  <p style="margin-top: 12pt;"><span class="label">Descrição:</span></p>
  <p style="text-align: justify; white-space: pre-wrap;">${esc(m.descricao as string)}</p>
</div>

${(m.testemunha_1_nome || m.testemunha_2_nome) ? `
<div class="section-title">TESTEMUNHAS</div>
<div class="box">
  ${m.testemunha_1_nome ? `<div class="row"><span>1. ${esc(m.testemunha_1_nome as string)}</span><span>CPF: ${esc((m.testemunha_1_cpf as string) ?? '—')}</span></div>` : ''}
  ${m.testemunha_2_nome ? `<div class="row"><span>2. ${esc(m.testemunha_2_nome as string)}</span><span>CPF: ${esc((m.testemunha_2_cpf as string) ?? '—')}</span></div>` : ''}
</div>` : ''}

${m.recusa_assinatura ? `
<div class="recusa">
  <strong>REGISTRO DE RECUSA DE ASSINATURA</strong><br/>
  O(a) colaborador(a) recusou-se a assinar o presente documento na data de emissão.<br/>
  ${m.motivo_recusa ? `<strong>Motivo:</strong> ${esc(m.motivo_recusa as string)}` : ''}
  <br/>A recusa foi presenciada pelas testemunhas acima identificadas.
</div>` : ''}

<div class="sign-area">
  <div class="sign-box">
    ${esc(colaborador.nome_completo as string)}<br/>
    Colaborador(a) — Ciência e recebimento
  </div>
  <div class="sign-box">
    ${esc(empresa.razao_social as string ?? empresa.nome as string)}<br/>
    Representante do Empregador
  </div>
</div>

<div class="footer">
  Documento gerado em ${esc(dataEmissao)} — Sistema de Departamento Pessoal<br/>
  ID: ${esc(m.id as string)}
</div>
</body></html>`;
}

serve(async (req: Request): Promise<Response> => {
  const pf = handlePreflight(req); if (pf) return pf;
  const og = enforceOrigin(req); if (og) return og;

  const csrf = await verifyCsrf(req.clone());
  if (!csrf.ok) return csrf.response!;

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return createErrorResponse('Autenticação obrigatória', 401, 'UNAUTHORIZED');
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return createErrorResponse('Sessão inválida', 401, 'UNAUTHORIZED');
  }
  const userId = userData.user.id;

  const { body, errorResponse } = await parseJsonBody(req);
  if (errorResponse) return errorResponse;
  const parsed = BodySchema.safeParse(body ?? {});
  if (!parsed.success) {
    return createErrorResponse('Parâmetros inválidos', 400, 'VALIDATION_ERROR');
  }
  const { medida_id } = parsed.data;

  try {
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const rl = await checkRateLimit(admin, { key: `gerar-medida-pdf:${userId}`, limit: 20, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    // Buscar medida disciplinar
    const { data: medida, error: mErr } = await admin
      .from('medidas_disciplinares')
      .select('*')
      .eq('id', medida_id)
      .maybeSingle();

    if (mErr || !medida) return createErrorResponse('Medida não encontrada', 404, 'NOT_FOUND');

    // Gate multi-tenant
    const { data: belongs } = await admin.rpc('user_belongs_to_empresa', {
      _user_id: userId, _empresa_id: medida.empresa_id,
    });
    if (!belongs) return createErrorResponse('Sem acesso a esta medida', 403, 'FORBIDDEN');

    // Buscar colaborador e empresa
    const [{ data: colaborador }, { data: empresa }] = await Promise.all([
      admin.from('colaboradores').select('nome_completo, cpf, cargo, data_admissao').eq('id', medida.colaborador_id).maybeSingle(),
      admin.from('empresas').select('razao_social, nome, cnpj').eq('id', medida.empresa_id).maybeSingle(),
    ]);

    if (!colaborador || !empresa) {
      return createErrorResponse('Dados de contexto ausentes', 404, 'NOT_FOUND');
    }

    const html = renderHTML(medida, colaborador, empresa);
    const hash = await sha256(html);
    const path = `${medida.empresa_id}/${medida_id}/documento-${Date.now()}.html`;

    const { error: upErr } = await admin.storage
      .from('medidas-disciplinares')
      .upload(path, new Blob([html], { type: 'text/html; charset=utf-8' }), {
        upsert: true, contentType: 'text/html; charset=utf-8',
      });

    if (upErr) {
      await captureException(upErr, { fn: 'gerar-medida-disciplinar-pdf', step: 'upload' });
      return createErrorResponse('Falha ao armazenar documento', 500, 'STORAGE_ERROR');
    }

    // Signed URL (60 min)
    const { data: signed } = await admin.storage
      .from('medidas-disciplinares')
      .createSignedUrl(path, 3600);

    // Atualizar medida com URL + hash
    await admin.from('medidas_disciplinares').update({
      pdf_url: path,
      pdf_hash_sha256: hash,
      pdf_gerado_em: new Date().toISOString(),
    }).eq('id', medida_id);

    // Audit trail
    await admin.from('audit_log').insert({
      tabela: 'medidas_disciplinares',
      registro_id: medida_id,
      acao: 'PDF_GERADO',
      user_id: userId,
      dados_novos: { path, hash, empresa_id: medida.empresa_id },
    });

    return new Response(
      JSON.stringify({ success: true, path, hash, signed_url: signed?.signedUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    await captureException(err, { fn: 'gerar-medida-disciplinar-pdf' });
    return createErrorResponse('Erro interno ao gerar documento', 500, 'INTERNAL_SERVER_ERROR');
  }
});
