// Gera AEJ (Arquivo Eletrônico de Jornada) conforme Portaria MTP 671/2021 - Anexo I.
// Layout MVP: Registro 1 (cabeçalho), 5 (colaboradores/vínculos), 3 (marcações), 9 (trailer).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { parseJsonBody } from '../_shared/contract.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';

const TZ = "America/Sao_Paulo";
const CRLF = "\r\n";
const LOTE_BATIDAS = 5000;

function pad(v: string | number, len: number, char = "0", left = true): string {
  const s = String(v ?? "");
  if (s.length >= len) return s.slice(0, len);
  return left ? s.padStart(len, char) : s.padEnd(len, char);
}

function onlyDigits(s: string | null | undefined): string {
  return (s ?? "").replace(/\D+/g, "");
}

function fmtDate(iso: string): string {
  // dd/MM/yyyy em America/Sao_Paulo
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric",
  }).formatToParts(d);
  const m = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${m.day}${m.month}${m.year}`;
}

function fmtTime(iso: string): string {
  // HHmm em America/Sao_Paulo
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const m = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${m.hour}${m.minute}`;
}

async function sha256Hex(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const csrf = await verifyCsrf(req.clone());
    if (!csrf.ok) return csrf.response!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userRes } = await supa.auth.getUser();
    const userId = userRes?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rlAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(rlAdmin, { key: `gerar-aej:${userId}`, limit: 5, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    const { body: _pb } = await parseJsonBody(req);
    const body = (_pb ?? {}) as Record<string, unknown>;
    const empresa_id: string | undefined = body.empresa_id as string | undefined;
    const periodo_inicio: string | undefined = body.periodo_inicio as string | undefined;
    const periodo_fim: string | undefined = body.periodo_fim as string | undefined;

    if (!empresa_id || !periodo_inicio || !periodo_fim) {
      return new Response(JSON.stringify({ error: "empresa_id, periodo_inicio, periodo_fim são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Autorização
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: role } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    let authorized = role === true;
    if (!authorized) {
      const { data: ue } = await admin
        .from("user_empresas").select("empresa_id").eq("user_id", userId).eq("empresa_id", empresa_id).maybeSingle();
      authorized = !!ue;
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Empresa
    const { data: empresa, error: eEmp } = await admin
      .from("empresas").select("id,cnpj,razao_social,cei").eq("id", empresa_id).maybeSingle();
    if (eEmp || !empresa) throw new Error("Empresa não encontrada");
    const cnpj = onlyDigits((empresa as any).cnpj);
    if (cnpj.length !== 14) throw new Error("CNPJ da empresa inválido");

    // Colaboradores ativos com PIS
    const { data: colabs } = await admin
      .from("colaboradores")
      .select("id,nome_completo,pis_pasep,cpf,data_admissao,matricula")
      .eq("empresa_id", empresa_id)
      .in("status", ["ativo", "afastado"]);

    const colabList = (colabs ?? []) as Array<{
      id: string; nome_completo: string; pis_pasep: string | null;
      cpf: string | null; data_admissao: string | null; matricula: string | null;
    }>;
    const colabById = new Map(colabList.map(c => [c.id, c]));
    const semPis = colabList.filter(c => onlyDigits(c.pis_pasep).length !== 11).length;
    const colabValidos = colabList.filter(c => onlyDigits(c.pis_pasep).length === 11);

    // Cabeçalho (Registro 1)
    const geracaoAgora = new Date().toISOString();
    const lines: string[] = [];
    let nsr = 1;

    // Reg 1: NSR(9) + tipo(1=1) + cnpj(14) + cei(12) + razao(150) + data_ini(8) + data_fim(8) + data_ger(8) + hora_ger(4) + tipo_id(1=1 CNPJ)
    lines.push(
      pad(nsr++, 9) + "1" + pad(cnpj, 14) + pad(onlyDigits((empresa as any).cei ?? ""), 12) +
      pad((empresa as any).razao_social ?? "", 150, " ", false) +
      pad(periodo_inicio.replaceAll("-", "").slice(6, 8) + periodo_inicio.replaceAll("-", "").slice(4, 6) + periodo_inicio.replaceAll("-", "").slice(0, 4), 8) +
      pad(periodo_fim.replaceAll("-", "").slice(6, 8) + periodo_fim.replaceAll("-", "").slice(4, 6) + periodo_fim.replaceAll("-", "").slice(0, 4), 8) +
      fmtDate(geracaoAgora) + fmtTime(geracaoAgora) + "1"
    );

    // Reg 5: Vínculo do colaborador. NSR(9) + tipo(5) + data_evento(8) + pis(12) + cpf(12) + nome(52) + data_adm(8) + matricula(30)
    for (const c of colabValidos) {
      const admDate = c.data_admissao ?? periodo_inicio;
      lines.push(
        pad(nsr++, 9) + "5" +
        pad(admDate.replaceAll("-", "").slice(6, 8) + admDate.replaceAll("-", "").slice(4, 6) + admDate.replaceAll("-", "").slice(0, 4), 8) +
        pad(onlyDigits(c.pis_pasep), 12) +
        pad(onlyDigits(c.cpf), 12) +
        pad((c.nome_completo ?? "").toUpperCase(), 52, " ", false) +
        pad(admDate.replaceAll("-", "").slice(6, 8) + admDate.replaceAll("-", "").slice(4, 6) + admDate.replaceAll("-", "").slice(0, 4), 8) +
        pad(c.matricula ?? c.id.slice(0, 8), 30, " ", false)
      );
    }

    // Reg 3: Marcações. NSR(9) + tipo(3) + data(8) + hora(4) + pis(12)
    let totalMarcacoes = 0;
    if (colabValidos.length > 0) {
      const colabIds = colabValidos.map(c => c.id);
      const startISO = `${periodo_inicio}T00:00:00-03:00`;
      const endISO = `${periodo_fim}T23:59:59-03:00`;

      let offset = 0;
      while (true) {
        const { data: batch, error } = await admin
          .from("batidas_ponto")
          .select("colaborador_id,data_hora")
          .eq("empresa_id", empresa_id)
          .in("colaborador_id", colabIds)
          .gte("data_hora", startISO)
          .lte("data_hora", endISO)
          .order("data_hora", { ascending: true })
          .range(offset, offset + LOTE_BATIDAS - 1);
        if (error) throw error;
        if (!batch || batch.length === 0) break;

        for (const b of batch) {
          const c = colabById.get((b as any).colaborador_id);
          if (!c) continue;
          const iso = (b as any).data_hora;
          lines.push(
            pad(nsr++, 9) + "3" + fmtDate(iso) + fmtTime(iso) + pad(onlyDigits(c.pis_pasep), 12)
          );
          totalMarcacoes++;
        }
        if (batch.length < LOTE_BATIDAS) break;
        offset += LOTE_BATIDAS;
      }
    }

    // Reg 9: Trailer. NSR(9) + tipo(9) + qtd_tipo2(9) + qtd_tipo3(9) + qtd_tipo4(9) + qtd_tipo5(9) + qtd_tipo6(9) + qtd_tipo7(9)
    lines.push(
      pad(nsr++, 9) + "9" + pad(0, 9) + pad(totalMarcacoes, 9) + pad(0, 9) +
      pad(colabValidos.length, 9) + pad(0, 9) + pad(0, 9)
    );

    const conteudo = lines.join(CRLF) + CRLF;
    const hash = await sha256Hex(conteudo);
    const bytes = new TextEncoder().encode(conteudo).length;

    // Persistir metadata (idempotência garantida por unique index)
    const { data: geracao, error: gerErr } = await admin
      .from("aej_geracoes")
      .upsert({
        empresa_id, periodo_inicio, periodo_fim,
        total_colaboradores: colabValidos.length,
        total_marcacoes: totalMarcacoes,
        colaboradores_sem_pis: semPis,
        tamanho_bytes: bytes,
        hash_sha256: hash,
        status: "gerado",
        gerado_por: userId,
      }, { onConflict: "empresa_id,periodo_inicio,periodo_fim,hash_sha256" })
      .select().maybeSingle();
    if (gerErr) throw gerErr;

    return new Response(JSON.stringify({
      ok: true,
      geracao_id: (geracao as any)?.id,
      hash_sha256: hash,
      tamanho_bytes: bytes,
      total_marcacoes: totalMarcacoes,
      total_colaboradores: colabValidos.length,
      colaboradores_sem_pis: semPis,
      conteudo, // TXT completo (base64 opcional em versões futuras)
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    captureException(e, { fn: 'gerar-aej' });
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
