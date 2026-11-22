import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import { createErrorResponse, createValidationErrorResponse, parseJsonBody, securityHeaders } from '../_shared/contract.ts';
import { captureException } from '../_shared/sentry.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';
import { getClientIp } from '../_shared/clientIp.ts';
import { type ColaboradorChave, diasAlterados, envioSchema, sha256Hex, tokenPlausivel, vincular } from './logica.ts';

/**
 * ingest-ponto-rep — recebe o envio do coletor do Ponto AtecSoft (um por
 * unidade) e grava no staging ponto_rep_*.
 *
 * Chamada máquina-a-máquina: não há navegador, sessão nem JWT de usuário, por
 * isso verify_jwt = false (config.toml) e sem CSRF/CORS. A autenticação é o
 * token do coletor no cabeçalho x-coletor-token, comparado por SHA-256 com
 * ponto_rep_dispositivos.token_hash. A empresa vem SEMPRE do dispositivo
 * autenticado; o corpo não tem (e o contrato recusa) empresa_id.
 *
 * Esta versão só guarda e vincula. Transformar os dias em batidas_ponto é a
 * etapa 41 do plano e depende de dados reais do AtecSoft.
 */
const MAX_BYTES = 4 * 1024 * 1024;
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...securityHeaders, 'Content-Type': 'application/json' } });
const negar = () => createErrorResponse('Não autorizado', 401, 'UNAUTHORIZED');

serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return createErrorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  try {
    // Freio por IP antes de tocar no token: torna adivinhação de token inviável.
    const porIp = await checkRateLimit(admin, { key: `ingest-ponto-rep:ip:${getClientIp(req)}`, limit: 120, windowSec: 60 });
    if (!porIp.allowed) return rateLimitResponse(porIp, req);

    const token = req.headers.get('x-coletor-token');
    if (!tokenPlausivel(token)) return negar();
    const { data: dispositivo, error: erroDisp } = await admin
      .from('ponto_rep_dispositivos')
      .select('id, empresa_id, ativo, revogado_em')
      .eq('token_hash', await sha256Hex(token))
      .maybeSingle();
    if (erroDisp) throw new Error(`dispositivo: ${erroDisp.code ?? 'erro'}`);
    if (!dispositivo || !dispositivo.ativo || dispositivo.revogado_em) return negar();

    const porDispositivo = await checkRateLimit(admin, { key: `ingest-ponto-rep:disp:${dispositivo.id}`, limit: 60, windowSec: 60 });
    if (!porDispositivo.allowed) return rateLimitResponse(porDispositivo, req);

    const { body, errorResponse } = await parseJsonBody(req, MAX_BYTES);
    if (errorResponse) return errorResponse;
    const validado = envioSchema.safeParse(body);
    if (!validado.success) return createValidationErrorResponse(validado.error);
    const envio = validado.data;

    const agora = new Date().toISOString();
    const dispositivoId = dispositivo.id as string;
    const empresaId = dispositivo.empresa_id as string;

    const { data: lote, error: erroLote } = await admin.from('ponto_rep_lotes').insert({
      dispositivo_id: dispositivoId,
      empresa_id: empresaId,
      periodo_inicio: envio.periodo.inicio,
      periodo_fim: envio.periodo.fim,
      total_funcionarios: envio.funcionarios.length,
      total_dias: envio.dias.length,
    }).select('id').single();
    if (erroLote || !lote) throw new Error(`lote: ${erroLote?.code ?? 'sem id'}`);

    // Erros de banco viram "<etapa>: <código Postgres>": a mensagem completa do
    // Postgres pode citar a linha que falhou, e a linha tem CPF e PIS.
    try {
      // Cadastro: só as colunas vindas do AtecSoft. colaborador_id e o método de
      // vínculo não entram no upsert, então um vínculo existente é preservado.
      if (envio.funcionarios.length) {
        const { error } = await admin.from('ponto_rep_funcionarios').upsert(
          envio.funcionarios.map((f) => ({ ...f, dispositivo_id: dispositivoId, empresa_id: empresaId, updated_at: agora })),
          { onConflict: 'dispositivo_id,codigo' },
        );
        if (error) throw new Error(`funcionarios: ${error.code ?? 'erro'}`);
      }

      // tipo_dia (o de-para para o DP) não entra no upsert: é decisão humana.
      if (envio.justificativas.length) {
        const { error } = await admin.from('ponto_rep_justificativas').upsert(
          envio.justificativas.map((j) => ({ ...j, dispositivo_id: dispositivoId, empresa_id: empresaId, updated_at: agora })),
          { onConflict: 'dispositivo_id,codigo' },
        );
        if (error) throw new Error(`justificativas: ${error.code ?? 'erro'}`);
      }

      // Vínculo automático só de quem ainda não tem.
      const { data: semVinculo, error: erroSem } = await admin.from('ponto_rep_funcionarios')
        .select('id, codigo, nome, matricula, cpf, pis, situacao, empresa_codigo, horario_codigo, data_admissao, data_desligamento')
        .eq('dispositivo_id', dispositivoId).is('colaborador_id', null);
      if (erroSem) throw new Error(`pendentes: ${erroSem.code ?? 'erro'}`);
      let pendentesVinculo = semVinculo?.length ?? 0;
      if (pendentesVinculo > 0) {
        const { data: colaboradores, error: erroColab } = await admin.from('colaboradores')
          .select('id, cpf, pis_pasep, matricula').eq('empresa_id', empresaId);
        if (erroColab) throw new Error(`colaboradores: ${erroColab.code ?? 'erro'}`);
        for (const { id, ...func } of semVinculo ?? []) {
          const achado = vincular(func, (colaboradores ?? []) as ColaboradorChave[]);
          if (!achado) continue;
          const { error } = await admin.from('ponto_rep_funcionarios')
            .update({ colaborador_id: achado.colaborador_id, vinculo_metodo: achado.metodo, vinculado_em: agora })
            .eq('id', id).is('colaborador_id', null);
          // 23505 = colaborador já vinculado a outro funcionario_codigo
          // (ux_ponto_rep_funcionarios_colaborador_por_empresa, dentro do
          // próprio lote ou de um anterior): fica pendente, não aborta o
          // lote -- é ambiguidade real (código reaproveitado), não erro.
          if (error && error.code === '23505') continue;
          if (error) throw new Error(`vinculo: ${error.code ?? 'erro'}`);
          pendentesVinculo -= 1;
        }
      }

      // Dias: só grava o que mudou. Dia alterado volta a ficar pendente de processamento.
      let alterados = envio.dias;
      if (envio.dias.length) {
        const datas = envio.dias.map((d) => d.data).sort();
        const { data: gravados, error: erroGrav } = await admin.from('ponto_rep_dias')
          .select('funcionario_codigo, data, hash_conteudo')
          .eq('dispositivo_id', dispositivoId)
          .gte('data', datas[0]).lte('data', datas[datas.length - 1])
          .limit(20000);
        if (erroGrav) throw new Error(`dias gravados: ${erroGrav.code ?? 'erro'}`);
        alterados = diasAlterados(envio.dias, gravados ?? []);
      }
      if (alterados.length) {
        const { error } = await admin.from('ponto_rep_dias').upsert(
          alterados.map(({ hash, ...d }) => ({
            ...d,
            hash_conteudo: hash,
            dispositivo_id: dispositivoId,
            empresa_id: empresaId,
            lote_id: lote.id,
            processado_em: null,
            erro_processamento: null,
            updated_at: agora,
          })),
          { onConflict: 'dispositivo_id,funcionario_codigo,data' },
        );
        if (error) throw new Error(`dias: ${error.code ?? 'erro'}`);
      }

      const { error: erroFim } = await admin.from('ponto_rep_lotes')
        .update({ status: 'processado', dias_alterados: alterados.length }).eq('id', lote.id);
      if (erroFim) throw new Error(`fechar lote: ${erroFim.code ?? 'erro'}`);

      // Sinal de vida: só depois de tudo gravado.
      const { error: erroVivo } = await admin.from('ponto_rep_dispositivos')
        .update({ ultimo_contato_em: agora, versao_coletor: envio.versao_coletor, updated_at: agora })
        .eq('id', dispositivoId);
      if (erroVivo) throw new Error(`sinal de vida: ${erroVivo.code ?? 'erro'}`);

      // Auditoria do lote: contagens só, sem CPF/PIS.
      await admin.from('audit_log').insert({
        tabela: 'ponto_rep_lotes',
        registro_id: lote.id,
        acao: 'INSERT',
        empresa_id: empresaId,
        dados_novos: {
          dispositivo_id: dispositivoId,
          dias_recebidos: envio.dias.length,
          dias_alterados: alterados.length,
          pendentes_vinculo: pendentesVinculo,
        },
      });

      return json({
        ok: true,
        lote_id: lote.id,
        dias_recebidos: envio.dias.length,
        dias_alterados: alterados.length,
        pendentes_vinculo: pendentesVinculo,
      });
    } catch (falha) {
      const mensagem = falha instanceof Error ? falha.message : String(falha);
      await admin.from('ponto_rep_lotes').update({ status: 'erro', mensagem_erro: mensagem.slice(0, 500) }).eq('id', lote.id);
      throw falha;
    }
  } catch (erro) {
    await captureException(erro, { function: 'ingest-ponto-rep' });
    return createErrorResponse('Falha ao gravar o envio', 500, 'INTERNAL_ERROR');
  }
});
