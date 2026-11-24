import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import { z } from "https://esm.sh/zod@3.23.8";
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';
import { corsHeaders, parseJsonBody } from '../_shared/contract.ts';

const OSSchema = z.object({
  tipo: z.literal("os"),
  empresa_id: z.string().uuid(),
  escopo: z.enum(["cargo", "colaborador"]),
  cargo_id: z.string().uuid().optional(),
  colaborador_id: z.string().uuid().optional(),
  titulo: z.string().min(3).max(200),
  descricao_atividades: z.string().max(4000).optional().default(""),
  riscos: z.array(z.object({
    tipo: z.string(),
    descricao: z.string(),
    nivel: z.string().optional(),
  })).default([]),
  medidas_controle: z.array(z.string()).default([]),
  epis_obrigatorios: z.array(z.string()).default([]),
  procedimentos_emergencia: z.string().max(2000).optional().default(""),
  responsavel_nome: z.string().min(3).max(120),
  responsavel_cargo: z.string().max(120).optional().default(""),
  responsavel_registro: z.string().max(60).optional().default(""),
});

const LTCATSchema = z.object({
  tipo: z.literal("ltcat"),
  empresa_id: z.string().uuid(),
  titulo: z.string().min(3).max(200),
  data_validade: z.string().optional(),
  ghes_avaliados: z.array(z.object({
    nome: z.string(),
    setor: z.string().optional(),
    funcoes: z.array(z.string()).default([]),
  })).default([]),
  agentes_nocivos: z.array(z.object({
    agente: z.string(),
    tipo: z.enum(["fisico", "quimico", "biologico", "ergonomico"]).optional(),
    limite_tolerancia: z.string().optional(),
    medicao: z.string().optional(),
    tecnica_medicao: z.string().optional(),
  })).default([]),
  conclusao: z.string().max(4000),
  aposentadoria_especial: z.object({
    aplicavel: z.boolean().default(false),
    tempo_anos: z.number().nullable().optional(),
    justificativa: z.string().optional(),
  }).default({ aplicavel: false }),
  responsavel_tecnico_nome: z.string().min(3),
  responsavel_tecnico_registro: z.string().min(3),
  responsavel_tecnico_tipo: z.enum(["engenheiro", "medico"]),
});

const Schema = z.discriminatedUnion("tipo", [OSSchema, LTCATSchema]);

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function wrapText(text: string, maxLen: number): string[] {
  const words = (text || "").split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length > maxLen) {
      if (current) lines.push(current.trim());
      current = w;
    } else {
      current = (current + " " + w).trim();
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function generateOSPdf(input: z.infer<typeof OSSchema>, empresaNome: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 800;

  const write = (txt: string, opts: { size?: number; font?: any; color?: any } = {}) => {
    if (y < 60) { page = pdf.addPage([595, 842]); y = 800; }
    page.drawText(txt, { x: 50, y, size: opts.size ?? 10, font: opts.font ?? font, color: opts.color ?? rgb(0, 0, 0) });
    y -= (opts.size ?? 10) + 4;
  };

  write("ORDEM DE SERVIÇO DE SEGURANÇA E SAÚDE NO TRABALHO", { size: 14, font: bold });
  write("NR-01 — Disposições Gerais e Gerenciamento de Riscos Ocupacionais", { size: 9 });
  y -= 8;
  write(`Empresa: ${empresaNome}`, { font: bold });
  write(`Título: ${input.titulo}`);
  write(`Escopo: ${input.escopo === "cargo" ? "Aplicável ao Cargo" : "Aplicável ao Colaborador"}`);
  write(`Emitida em: ${new Date().toLocaleDateString("pt-BR")}`);
  y -= 6;

  write("1. DESCRIÇÃO DAS ATIVIDADES", { font: bold, size: 11 });
  wrapText(input.descricao_atividades, 90).forEach((l) => write(l));
  y -= 4;

  write("2. RISCOS OCUPACIONAIS IDENTIFICADOS", { font: bold, size: 11 });
  if (input.riscos.length === 0) write("Nenhum risco significativo identificado.");
  input.riscos.forEach((r, i) => {
    write(`${i + 1}. [${r.tipo}] ${r.descricao}${r.nivel ? ` — Nível: ${r.nivel}` : ""}`);
  });
  y -= 4;

  write("3. MEDIDAS DE CONTROLE", { font: bold, size: 11 });
  input.medidas_controle.forEach((m, i) => write(`${i + 1}. ${m}`));
  y -= 4;

  write("4. EPIs DE USO OBRIGATÓRIO", { font: bold, size: 11 });
  input.epis_obrigatorios.forEach((e) => write(`• ${e}`));
  y -= 4;

  write("5. PROCEDIMENTOS EM CASO DE EMERGÊNCIA", { font: bold, size: 11 });
  wrapText(input.procedimentos_emergencia, 90).forEach((l) => write(l));
  y -= 4;

  write("6. PENALIDADES PELO DESCUMPRIMENTO", { font: bold, size: 11 });
  write("O descumprimento das determinações desta OS sujeitará o colaborador");
  write("às penalidades previstas no art. 158 da CLT e regulamento interno.");
  y -= 10;

  write("7. RESPONSÁVEL TÉCNICO", { font: bold, size: 11 });
  write(`${input.responsavel_nome} — ${input.responsavel_cargo}`);
  if (input.responsavel_registro) write(`Registro: ${input.responsavel_registro}`);
  y -= 20;
  write("Ciência do Colaborador:", { font: bold });
  write("_______________________________________________");
  write("Nome / Assinatura / Data");

  return await pdf.save();
}

async function generateLTCATPdf(input: z.infer<typeof LTCATSchema>, empresaNome: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 800;

  const write = (txt: string, opts: { size?: number; font?: any } = {}) => {
    if (y < 60) { page = pdf.addPage([595, 842]); y = 800; }
    page.drawText(txt, { x: 50, y, size: opts.size ?? 10, font: opts.font ?? font });
    y -= (opts.size ?? 10) + 4;
  };

  write("LAUDO TÉCNICO DAS CONDIÇÕES AMBIENTAIS DO TRABALHO", { size: 13, font: bold });
  write("LTCAT — Lei 8.213/91 art. 58 § 1º", { size: 9 });
  y -= 8;
  write(`Empresa: ${empresaNome}`, { font: bold });
  write(`Título: ${input.titulo}`);
  write(`Data de emissão: ${new Date().toLocaleDateString("pt-BR")}`);
  if (input.data_validade) write(`Validade: ${new Date(input.data_validade).toLocaleDateString("pt-BR")}`);
  y -= 6;

  write("1. GRUPOS HOMOGÊNEOS DE EXPOSIÇÃO (GHE)", { font: bold, size: 11 });
  input.ghes_avaliados.forEach((g, i) => {
    write(`GHE ${i + 1}: ${g.nome}${g.setor ? ` (${g.setor})` : ""}`);
    if (g.funcoes.length) write(`  Funções: ${g.funcoes.join(", ")}`);
  });
  y -= 4;

  write("2. AGENTES NOCIVOS AVALIADOS", { font: bold, size: 11 });
  input.agentes_nocivos.forEach((a, i) => {
    write(`${i + 1}. ${a.agente}${a.tipo ? ` [${a.tipo}]` : ""}`);
    if (a.medicao) write(`   Medição: ${a.medicao}`);
    if (a.limite_tolerancia) write(`   Limite de tolerância: ${a.limite_tolerancia}`);
    if (a.tecnica_medicao) write(`   Técnica: ${a.tecnica_medicao}`);
  });
  y -= 4;

  write("3. CONCLUSÃO TÉCNICA", { font: bold, size: 11 });
  wrapText(input.conclusao, 90).forEach((l) => write(l));
  y -= 4;

  write("4. APOSENTADORIA ESPECIAL", { font: bold, size: 11 });
  if (input.aposentadoria_especial.aplicavel) {
    write(`Aplicável — ${input.aposentadoria_especial.tempo_anos ?? "?"} anos`);
    if (input.aposentadoria_especial.justificativa) {
      wrapText(input.aposentadoria_especial.justificativa, 90).forEach((l) => write(l));
    }
  } else {
    write("Não aplicável — atividades não enquadradas no Decreto 3.048/99 Anexo IV.");
  }
  y -= 20;

  write("RESPONSÁVEL TÉCNICO", { font: bold, size: 11 });
  write(`${input.responsavel_tecnico_nome}`);
  write(`Registro profissional: ${input.responsavel_tecnico_registro}`);
  write(`Categoria: ${input.responsavel_tecnico_tipo === "engenheiro" ? "Engenheiro de Segurança do Trabalho" : "Médico do Trabalho"}`);
  y -= 20;
  write("_______________________________________________");
  write("Assinatura / Data");

  return await pdf.save();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const csrf = await verifyCsrf(req.clone());
    if (!csrf.ok) return csrf.response!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "no_auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "invalid_auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const adminRL = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(adminRL, { key: `gerar-ltcat-os:${user.id}`, limit: 5, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    const { body: _pb, errorResponse: _pe } = await parseJsonBody(req);
    if (_pe) return _pe;
    const body = _pb;
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "validation", detail: parsed.error.flatten() }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const input = parsed.data;

    // Autorização por empresa
    const { data: vinculo } = await supabase.from("user_empresas").select("id").eq("user_id", user.id).eq("empresa_id", input.empresa_id).maybeSingle();
    if (!vinculo) return new Response(JSON.stringify({ error: "forbidden_empresa" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: empresa } = await supabase.from("empresas").select("razao_social, nome_fantasia").eq("id", input.empresa_id).maybeSingle();
    const empresaNome = empresa?.razao_social || empresa?.nome_fantasia || "Empresa";

    let pdfBytes: Uint8Array;
    let tableName: "sst_ordens_servico" | "sst_ltcat_laudos";
    let bucketPath: string;
    let insertPayload: Record<string, unknown>;

    if (input.tipo === "os") {
      pdfBytes = await generateOSPdf(input, empresaNome);
      tableName = "sst_ordens_servico";
      const hash = await sha256Hex(pdfBytes);
      bucketPath = `${input.empresa_id}/os/${Date.now()}-${hash.slice(0, 8)}.pdf`;

      // Arquiva versão anterior do mesmo escopo
      if (input.escopo === "cargo" && input.cargo_id) {
        await supabase.from("sst_ordens_servico").update({ status: "arquivada" }).eq("empresa_id", input.empresa_id).eq("cargo_id", input.cargo_id).eq("status", "ativa");
      } else if (input.escopo === "colaborador" && input.colaborador_id) {
        await supabase.from("sst_ordens_servico").update({ status: "arquivada" }).eq("empresa_id", input.empresa_id).eq("colaborador_id", input.colaborador_id).eq("status", "ativa");
      }

      insertPayload = {
        empresa_id: input.empresa_id,
        escopo: input.escopo,
        cargo_id: input.cargo_id ?? null,
        colaborador_id: input.colaborador_id ?? null,
        titulo: input.titulo,
        descricao_atividades: input.descricao_atividades,
        riscos: input.riscos,
        medidas_controle: input.medidas_controle,
        epis_obrigatorios: input.epis_obrigatorios,
        procedimentos_emergencia: input.procedimentos_emergencia,
        responsavel_nome: input.responsavel_nome,
        responsavel_cargo: input.responsavel_cargo,
        responsavel_registro: input.responsavel_registro,
        arquivo_path: bucketPath,
        hash_sha256: (await sha256Hex(pdfBytes)),
        status: "ativa",
        gerado_por: user.id,
      };
    } else {
      pdfBytes = await generateLTCATPdf(input, empresaNome);
      tableName = "sst_ltcat_laudos";
      const hash = await sha256Hex(pdfBytes);
      bucketPath = `${input.empresa_id}/ltcat/${Date.now()}-${hash.slice(0, 8)}.pdf`;

      await supabase.from("sst_ltcat_laudos").update({ status: "arquivado" }).eq("empresa_id", input.empresa_id).eq("status", "ativo");

      insertPayload = {
        empresa_id: input.empresa_id,
        titulo: input.titulo,
        data_validade: input.data_validade ?? null,
        ghes_avaliados: input.ghes_avaliados,
        agentes_nocivos: input.agentes_nocivos,
        conclusao: input.conclusao,
        aposentadoria_especial: input.aposentadoria_especial,
        responsavel_tecnico_nome: input.responsavel_tecnico_nome,
        responsavel_tecnico_registro: input.responsavel_tecnico_registro,
        responsavel_tecnico_tipo: input.responsavel_tecnico_tipo,
        arquivo_path: bucketPath,
        hash_sha256: (await sha256Hex(pdfBytes)),
        status: "ativo",
        gerado_por: user.id,
      };
    }

    const { error: upErr } = await supabase.storage.from("sst-programas").upload(bucketPath, pdfBytes, {
      contentType: "application/pdf",
      upsert: false,
    });
    if (upErr) throw upErr;

    const { data: inserted, error: insErr } = await supabase.from(tableName).insert(insertPayload).select("id, versao, hash_sha256").single();
    if (insErr) throw insErr;

    const { data: signed } = await supabase.storage.from("sst-programas").createSignedUrl(bucketPath, 300);

    return new Response(JSON.stringify({
      ok: true,
      id: inserted.id,
      versao: inserted.versao,
      hash: inserted.hash_sha256,
      signed_url: signed?.signedUrl,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    captureException(e);
    return new Response(JSON.stringify({ error: "internal" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
