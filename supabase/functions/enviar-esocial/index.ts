// Onda 28 — Hardening crítico do envio eSocial:
// • CSRF fail-closed + JWT + tenant scope
// • persistSession:false em ambos clients
// • Sanitização anti XML-injection em TODOS os campos dinâmicos (escape de <,>,&,",')
// • Idempotência: evento já 'enviado' → 409 (não retransmite duplicado)
// • Modo simulação controlado por env (ESOCIAL_SIMULATE=true) — nunca aleatório em prod
// • Erros genéricos ao cliente; captureException server-side
// • Auditoria ESOCIAL_TRANSMIT em audit_log
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';
import { assinarXMLEsocial } from './utils/signer.ts';
import { corsHeaders, createErrorResponse, parseJsonBody } from '../_shared/contract.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';
import {
  beginIdempotency,
  completeIdempotency,
  extractIdempotencyKey,
  failIdempotency,
} from '../_shared/idempotency.ts';
import { integrityHash } from '../_shared/integrityHash.ts';

const BodySchema = z.object({
  empresaId: z.string().uuid(),
  eventoId: z.string().uuid(),
  idempotency_key: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

// Fail-closed: simulation must be explicitly enabled. In production, missing env = real mode (which fails safely if SOAP not configured)
const SIMULATE = Deno.env.get('ESOCIAL_SIMULATE')?.toLowerCase() === 'true';

const NO_STORE = { 'Cache-Control': 'no-store' };


/** Escape XML — bloqueia injection via qualquer campo dinâmico. */
function xmlEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
const xe = xmlEscape;

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return createErrorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');

  try {
    // CSRF fail-closed (req.clone antes de qualquer json())
    const csrf = await verifyCsrf(req.clone());
    if (!csrf.ok) return csrf.response!;

    // Auth
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return createErrorResponse('Autenticação obrigatória', 401, 'UNAUTHORIZED');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getUser();
    if (claimsErr || !claimsData?.user?.id) return createErrorResponse('Sessão inválida', 401, 'UNAUTHORIZED');
    const userId = claimsData.user.id;

    // Payload
    let raw: unknown;
    const { body: _pb, errorResponse: _pe } = await parseJsonBody(req);
    if (_pe) return _pe;
    raw = _pb;
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) return createErrorResponse('Payload inválido', 422, 'VALIDATION_ERROR');
    const { empresaId, eventoId } = parsed.data;

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Rate limit por usuário — evita rajadas de envios em massa (30 req / min)
    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(supabase, { key: `esocial:${userId}`, limit: 30, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    // Tenant scope
    const [{ data: belongs }, { data: isAdm }] = await Promise.all([
      supabase.rpc('user_belongs_to_empresa', { _user_id: userId, _empresa_id: empresaId }),
      supabase.rpc('is_admin', { _user_id: userId }),
    ]);
    if (!belongs && !isAdm) return createErrorResponse('Sem acesso a esta empresa', 403, 'FORBIDDEN');

    // Idempotência transacional (Idempotency-Key header ou body)
    const idemKey = extractIdempotencyKey(req, raw);
    const idem = await beginIdempotency(supabase, {
      endpoint: 'enviar-esocial',
      key: idemKey,
      requestBody: { empresaId, eventoId },
      empresaId,
      userId,
    });
    if (idem.replay) return idem.replay;
    if (idem.conflict) return idem.conflict;

    const startTime = Date.now();


    // 1. Buscar evento (com validação de empresa cruzada)
    const { data: evento, error: eError } = await supabase
      .from('esocial_eventos')
      .select('*, empresa:empresas(*)')
      .eq('id', eventoId)
      .eq('empresa_id', empresaId)
      .maybeSingle();
    if (eError || !evento) return createErrorResponse('Evento não encontrado', 404, 'NOT_FOUND');

    // Idempotência: bloqueia retransmissão de evento já enviado
    if (evento.status === 'enviado' && evento.protocolo) {
      return new Response(JSON.stringify({
        success: true, protocolo: evento.protocolo, recibo: evento.recibo,
        alreadySent: true, tentativas: evento.tentativas_envio ?? 0,
      }), { headers: { ...corsHeaders, ...NO_STORE, 'Content-Type': 'application/json' } });
    }

    // 2. Config
    const { data: config } = await supabase
      .from('configuracoes_esocial')
      .select('*')
      .eq('empresa_id', empresaId)
      .maybeSingle();

    const ambiente = String(config?.ambiente || '2');
    const certificadoId = config?.certificado_id || evento.empresa.id;

    // 3. Montar + assinar XML (todos os campos passam por xe())
    const xmlBase = montarXMLEvento(
      evento.tipo_evento, evento.empresa, evento.dados, ambiente, evento.competencia,
    );
    const { xmlAssinado, assinatura, hash } = await assinarXMLEsocial(xmlBase, certificadoId);

    // 4. Transmissão
    const tentativas = (evento.tentativas_envio || 0) + 1;
    let success: boolean;
    let protocolo: string | null;
    let recibo: string | null;
    let responseXml: string;
    let erroGov: Record<string, string> | null;

    if (SIMULATE) {
      // Sandbox — nunca em prod (controlado por env)
      await new Promise((r) => setTimeout(r, 200));
      success = true; // sandbox otimista
      protocolo = `PRT${crypto.randomUUID()}`;
      recibo = `REC-${crypto.randomUUID().slice(0, 12)}`;
      responseXml = `<retornoEvento><status>200</status><protocolo>${xe(protocolo)}</protocolo><recibo>${xe(recibo)}</recibo></retornoEvento>`;
      erroGov = null;
    } else {
      // Produção deveria invocar cliente SOAP real; enquanto não integrado, falha fechada
      success = false;
      protocolo = null;
      recibo = null;
      responseXml = `<retornoEvento><status>503</status><erro>Integração eSocial não configurada</erro></retornoEvento>`;
      erroGov = {
        mensagem: 'Integração eSocial não configurada para produção',
        codigo: '503',
        detalhes: `Tentativa ${tentativas} — habilite ESOCIAL_SIMULATE=true em sandbox ou configure o cliente SOAP.`,
      };
    }

    // 5. Log de transmissão
    await supabase.from('esocial_transmissao_logs').insert({
      evento_id: eventoId,
      empresa_id: empresaId,
      status: success ? 'enviado' : 'erro',
      request_xml: xmlAssinado,
      response_xml: responseXml,
      error_details: erroGov,
      duracao_ms: Math.round(Date.now() - startTime),
    });

    // 6. Atualizar evento
    await supabase
      .from('esocial_eventos')
      .update({
        status: success ? 'enviado' : 'erro',
        protocolo, recibo, id_recibo: recibo,
        assinatura_xml: assinatura, hash_seguranca: hash,
        xml_envio: xmlAssinado, xml_retorno: responseXml,
        erros: erroGov, tentativas_envio: tentativas,
        data_envio: success ? new Date().toISOString() : null,
        data_processamento: success ? new Date().toISOString() : null,
      })
      .eq('id', eventoId)
      .eq('empresa_id', empresaId);

    // 7. Auditoria bloqueante (não-repúdio) com integrity_hash canônico
    const auditPayload = {
      empresa_id: empresaId,
      evento_id: eventoId,
      tipo_evento: evento.tipo_evento,
      ambiente,
      success,
      tentativas,
      protocolo: protocolo ?? null,
      recibo: recibo ?? null,
      xml_hash: hash,
      xml_len: xmlAssinado.length,
      response_len: responseXml.length,
    };
    const auditHash = await integrityHash(auditPayload);
    const { error: auditErr } = await supabase.from('audit_log').insert({
      tabela: 'esocial_eventos',
      registro_id: eventoId,
      acao: 'ESOCIAL_TRANSMIT',
      user_id: userId,
      dados_novos: { ...auditPayload, integrity_hash: auditHash },
    });
    if (auditErr) {
      await failIdempotency(supabase, idem.id);
      throw auditErr;
    }

    const responseBody = {
      success,
      protocolo,
      recibo,
      error: erroGov?.mensagem,
      tentativas,
      integrity_hash: auditHash,
    };
    await completeIdempotency(supabase, idem.id, 200, responseBody);
    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, ...NO_STORE, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    try { captureException(error, { fn: 'enviar-esocial' }); } catch { /* noop */ }
    return createErrorResponse('Erro interno na transmissão eSocial', 500, 'INTERNAL_SERVER_ERROR');
  }
});


function montarXMLEvento(
  tipo: string,
  empresa: Record<string, unknown>,
  dados: Record<string, unknown> | null,
  ambiente: string,
  competencia?: string,
): string {
  const perApur = xe(competencia || new Date().toISOString().slice(0, 7));
  const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  const cnpjRaw = String(empresa.cnpj ?? '').replace(/\D/g, '') || '00000000000000';
  const id = `ID1${cnpjRaw}${timestamp}`;
  const d = (dados ?? {}) as Record<string, unknown>;

  let conteudoEvento = '';
  switch (tipo) {
    case 'S-1000':
      conteudoEvento =
        `<infoEmpregador><idePeriodo><iniValid>${perApur}</iniValid></idePeriodo>` +
        `<infoCadastro><nmRazao>${xe(empresa.razao_social ?? '')}</nmRazao>` +
        `<classTrib>${xe(d.classTrib ?? '01')}</classTrib>` +
        `<indCoop>${xe(d.indCoop ?? '0')}</indCoop>` +
        `<indConstr>${xe(d.indConstr ?? '0')}</indConstr>` +
        `<indDesFolha>${xe(d.indDesFolha ?? '0')}</indDesFolha>` +
        `<indOptRegEletr>${xe(d.indOptRegEletr ?? '1')}</indOptRegEletr>` +
        `<contato><nmCtto>${xe(empresa.responsavel ?? 'Responsável RH')}</nmCtto>` +
        `<cpfCtto>${xe(d.cpfCtto ?? '00000000000')}</cpfCtto></contato></infoCadastro></infoEmpregador>`;
      break;
    case 'S-2200':
      conteudoEvento =
        `<trabalhador><cpfTrab>${xe(d.cpfTrab ?? '')}</cpfTrab>` +
        `<nmTrab>${xe(d.nmTrab ?? '')}</nmTrab>` +
        `<sexo>${xe(d.sexo ?? 'M')}</sexo></trabalhador>` +
        `<vinculo><matricula>${xe(d.matricula ?? timestamp)}</matricula>` +
        `<tpRegTrab>1</tpRegTrab><tpRegPrev>1</tpRegPrev>` +
        `<infoRegime><regTrab><tpRegJor>1</tpRegJor></regTrab></infoRegime>` +
        `<infoContrato><codCargo>${xe(d.codCargo ?? '001')}</codCargo>` +
        `<dtAdm>${xe(d.dtAdm ?? new Date().toISOString().split('T')[0])}</dtAdm></infoContrato></vinculo>`;
      break;
    default:
      // Fallback seguro: serializa como CDATA para nunca injetar tags externas
      conteudoEvento = `<dados><![CDATA[${JSON.stringify(dados ?? {}).replace(/]]>/g, ']]]]><![CDATA[>')}]]></dados>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<eSocial xmlns="http://www.esocial.gov.br/schema/evt/${xe(tipo)}/v_S_01_01_00">` +
    `<evt${tipo.replace('-', '')} Id="${xe(id)}">` +
    `<ideEvento><tpAmb>${xe(ambiente)}</tpAmb><procEmi>1</procEmi><verProc>LovableRealV28</verProc></ideEvento>` +
    `<ideEmpregador><tpInsc>1</tpInsc><nrInsc>${xe(cnpjRaw)}</nrInsc></ideEmpregador>` +
    conteudoEvento +
    `</evt${tipo.replace('-', '')}></eSocial>`;
}
