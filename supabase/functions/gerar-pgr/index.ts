// Edge Function: gerar-pgr
// Gera PGR (NR-01) em PDF, armazena em bucket privado, versionamento + hash SHA-256 legal
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';
import { corsHeaders, parseJsonBody } from '../_shared/contract.ts';

interface Risco {
  categoria: string;
  agente: string;
  intensidade_concentracao: string | null;
  limite_tolerancia: string | null;
  tecnica_utilizada: string | null;
  locais_trabalho?: { descricao: string | null } | null;
}

interface Empresa {
  razao_social: string;
  cnpj: string;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const csrf = await verifyCsrf(req.clone());
    if (!csrf.ok) return csrf.response!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Não autenticado' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Não autenticado' }, 401);

    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(admin, { key: `gerar-pgr:${user.id}`, limit: 5, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    const { body: _pb, errorResponse: _pe } = await parseJsonBody(req);
    if (_pe) return _pe;
    const { empresa_id, responsavel_tecnico, registro_profissional } = _pb as Record<string, unknown>;
    if (!empresa_id) return json({ error: 'empresa_id é obrigatório' }, 400);

    // Autorização via vínculo empresa + role
    const { data: vinculo } = await admin
      .from('user_empresas')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('empresa_id', empresa_id)
      .maybeSingle();
    if (!vinculo) return json({ error: 'Sem acesso a essa empresa' }, 403);

    // Buscar dados
    const { data: empresa, error: empErr } = await admin
      .from('empresas')
      .select('razao_social, cnpj, endereco, cidade, uf')
      .eq('id', empresa_id)
      .single();
    if (empErr || !empresa) return json({ error: 'Empresa não encontrada' }, 404);

    const { data: riscos } = await admin
      .from('sst_riscos_ambientais')
      .select('categoria, agente, intensidade_concentracao, limite_tolerancia, tecnica_utilizada, locais_trabalho(descricao)')
      .eq('empresa_id', empresa_id)
      .order('categoria');

    // Próxima versão
    const { data: ultimaVersao } = await admin
      .from('sst_programas')
      .select('versao')
      .eq('empresa_id', empresa_id)
      .eq('tipo', 'PGR')
      .order('versao', { ascending: false })
      .limit(1)
      .maybeSingle();
    const versao = (ultimaVersao?.versao ?? 0) + 1;

    // Gerar PDF
    const pdfBytes = await gerarPdfPgr(empresa as Empresa, (riscos ?? []) as Risco[], {
      versao,
      responsavel_tecnico: responsavel_tecnico ?? '—',
      registro_profissional: registro_profissional ?? '—',
    });

    // Hash SHA-256 para integridade
    const hashBuf = await crypto.subtle.digest('SHA-256', pdfBytes);
    const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

    // Upload
    const dataEmissao = new Date();
    const validadeAno = new Date(dataEmissao);
    validadeAno.setFullYear(validadeAno.getFullYear() + 1);
    const path = `${empresa_id}/PGR/v${versao}-${dataEmissao.toISOString().slice(0, 10)}.pdf`;

    const { error: upErr } = await admin.storage
      .from('sst-programas')
      .upload(path, pdfBytes, { contentType: 'application/pdf', upsert: false });
    if (upErr) { console.error('[gerar-pgr] upload error:', upErr.message); return json({ error: 'Falha no upload do documento' }, 500); }

    // Arquivar versão anterior e inserir a nova como ativa (transação lógica)
    await admin
      .from('sst_programas')
      .update({ status: 'arquivado' })
      .eq('empresa_id', empresa_id)
      .eq('tipo', 'PGR')
      .eq('status', 'ativo');

    const { data: programa, error: insErr } = await admin
      .from('sst_programas')
      .insert({
        empresa_id,
        tipo: 'PGR',
        titulo: `Programa de Gerenciamento de Riscos — v${versao}`,
        data_emissao: dataEmissao.toISOString().slice(0, 10),
        data_validade: validadeAno.toISOString().slice(0, 10),
        responsavel_tecnico,
        registro_profissional,
        arquivo_url: path,
        status: 'ativo',
        hash_sha256: hashHex,
        versao,
        gerado_por: user.id,
        metadata: { qtd_riscos: riscos?.length ?? 0 },
      })
      .select()
      .single();
    if (insErr) { console.error('[gerar-pgr] insert error:', insErr.message); return json({ error: 'Falha ao registrar programa' }, 500); }

    // URL assinada 5 min
    const { data: signed } = await admin.storage
      .from('sst-programas')
      .createSignedUrl(path, 300);

    return json({
      success: true,
      programa,
      hash_sha256: hashHex,
      versao,
      signed_url: signed?.signedUrl,
    });
  } catch (e) {
    captureException(e, { fn: 'gerar-pgr' });
    return json({ error: 'Erro interno' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function gerarPdfPgr(
  empresa: Empresa,
  riscos: Risco[],
  meta: { versao: number; responsavel_tecnico: string; registro_profissional: string },
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const marginX = 50;
  const width = 595; // A4
  const height = 842;
  let page = pdf.addPage([width, height]);
  let y = height - 60;

  const write = (text: string, opts: { bold?: boolean; size?: number; color?: [number, number, number] } = {}) => {
    const size = opts.size ?? 11;
    const useFont = opts.bold ? fontBold : font;
    const clean = text.normalize('NFC');
    if (y < 60) {
      page = pdf.addPage([width, height]);
      y = height - 60;
    }
    page.drawText(clean, {
      x: marginX,
      y,
      size,
      font: useFont,
      color: rgb(...(opts.color ?? [0, 0, 0])),
    });
    y -= size + 6;
  };

  const line = () => {
    page.drawLine({
      start: { x: marginX, y: y + 3 },
      end: { x: width - marginX, y: y + 3 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    y -= 8;
  };

  // Cabeçalho
  write('PROGRAMA DE GERENCIAMENTO DE RISCOS (PGR)', { bold: true, size: 16 });
  write('Nos termos da NR-01 — Portaria SEPRT nº 6.730/2020', { size: 9, color: [0.4, 0.4, 0.4] });
  y -= 4;
  line();

  write('IDENTIFICAÇÃO DA EMPRESA', { bold: true, size: 12 });
  write(`Razão Social: ${empresa.razao_social}`);
  write(`CNPJ: ${empresa.cnpj}`);
  write(`Endereço: ${empresa.endereco ?? '—'}`);
  write(`Município/UF: ${empresa.cidade ?? '—'} / ${empresa.uf ?? '—'}`);
  y -= 4;
  line();

  write('RESPONSÁVEL TÉCNICO', { bold: true, size: 12 });
  write(`Nome: ${meta.responsavel_tecnico}`);
  write(`Registro Profissional: ${meta.registro_profissional}`);
  y -= 4;
  line();

  write('1. OBJETIVO', { bold: true, size: 12 });
  write('Este Programa tem por objetivo estabelecer as diretrizes para o gerenciamento');
  write('dos riscos ocupacionais, promovendo ambiente de trabalho seguro e saudável,');
  write('em conformidade com a NR-01 e demais normas regulamentadoras aplicáveis.');
  y -= 4;

  write('2. INVENTÁRIO DE RISCOS AMBIENTAIS', { bold: true, size: 12 });
  if (riscos.length === 0) {
    write('Nenhum risco ambiental cadastrado até a presente data.', { color: [0.5, 0.5, 0.5] });
  } else {
    riscos.forEach((r, i) => {
      write(`${i + 1}. [${r.categoria.toUpperCase()}] ${r.agente}`, { bold: true });
      if (r.locais_trabalho?.descricao) write(`   Local: ${r.locais_trabalho.descricao}`, { size: 10 });
      if (r.intensidade_concentracao) write(`   Intensidade/Concentração: ${r.intensidade_concentracao}`, { size: 10 });
      if (r.limite_tolerancia) write(`   Limite de Tolerância: ${r.limite_tolerancia}`, { size: 10 });
      if (r.tecnica_utilizada) write(`   Técnica utilizada: ${r.tecnica_utilizada}`, { size: 10 });
      y -= 2;
    });
  }
  y -= 4;

  write('3. PLANO DE AÇÃO', { bold: true, size: 12 });
  write('Medidas de prevenção conforme hierarquia da NR-01: eliminação do risco,');
  write('minimização, controle coletivo, controle administrativo e EPI.');
  y -= 4;

  write('4. VALIDADE E REVISÃO', { bold: true, size: 12 });
  write('Este PGR possui validade de 12 meses ou sempre que houver alteração nos');
  write('processos, ambientes ou identificação de novos riscos.');
  y -= 4;

  line();
  write(`Versão: ${meta.versao} | Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, { size: 9, color: [0.4, 0.4, 0.4] });
  write('Documento gerado eletronicamente. Integridade validada por hash SHA-256.', { size: 8, color: [0.4, 0.4, 0.4] });

  return await pdf.save();
}
