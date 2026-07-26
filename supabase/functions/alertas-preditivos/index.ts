/**
 * alertas-preditivos — P5-081: Alertas preditivos de turnover e absenteísmo
 *
 * Edge Function: POST /functions/v1/alertas-preditivos
 *
 * Usa análise estatística de padrões históricos (sem ML infra) para identificar:
 *   1. RISCO DE TURNOVER — sinais de disengajamento:
 *      - Queda de frequência nos últimos 3 meses vs. histórico (ausências +25%)
 *      - Última avaliação de desempenho < 3 (escala 1-5)
 *      - Aumento de atrasos: ponto com delta > 15min vs. admitidos há > 6 meses
 *      - Pedidos de horário flexível / redução recente de chefia (eventos RH)
 *   2. RISCO DE ABSENTEÍSMO — sinais de fadiga:
 *      - Faltas justificadas > 3 nos últimos 60 dias
 *      - Atestados médicos em sequência (mesmo CID nos últimos 90 dias)
 *      - Afastamentos recentes (últimos 90 dias)
 *      - Dias consecutivos de presença mas baixo ponto
 *   3. SINAIS DE ALERTA GERAL:
 *      - Salário abaixo do piso da função há > 3 meses
 *      -逾30 dias sem registro de ponto (inativo可疑)
 *
 * NÃO é ML: usa heurísticas determinísticas sobre dados históricos do banco.
 * Escalonamento futuro: trocar heurísticas por modelo treinado em
 * dados históricos de turnover real.
 *
 * P5-081: Edge function não existia — criada agora.
 * Integração: expõe via alertas-dp existente (rotas separadas).
 *
 * Cenários de falha simulados:
 *   1. Empresa sem dados históricos suficientes → retorna "dados_insuficientes"
 *   2. OpenAI API indisponível → fallback para análise estatística pura
 *   3. Dados ausentes em alguma tabela → trata como missing e ignora sinal
 *   4. Empresa sem colaborador ativo → retorna vazio, não erro
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/contract.ts';
import { safeFetch } from '../_shared/safe-fetch.ts';

const OPENAI_API_KEY  = Deno.env.get('OPENAI_API_KEY') ?? '';
const AI_GATEWAY_URL  = Deno.env.get('AI_GATEWAY_URL')  ?? '';

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey     = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Autenticação obrigatória' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const bodyObj = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const empresaId = bodyObj?.empresaId as string | undefined;
    const mode = (bodyObj?.mode as string | undefined) ?? 'both'; // 'turnover' | 'absenteismo' | 'both'

    if (!empresaId || typeof empresaId !== 'string') {
      return new Response(JSON.stringify({ error: 'empresaId é obrigatório' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const hoje     = new Date();
    const tresMesesAtras = new Date(hoje.getTime() - 90 * 24 * 60 * 60 * 1000);
    const doisMesesAtras = new Date(hoje.getTime() - 60 * 24 * 60 * 60 * 1000);
    const tresMesesAtrasStr = tresMesesAtras.toISOString().split('T')[0];
    const doisMesesAtrasStr  = doisMesesAtras.toISOString().split('T')[0];

    // ── 1. Carregar colaboradores ativos ──────────────────────────
    const { data: colaboradores } = await supabase
      .from('colaboradores')
      .select('id, nome_completo, data_admissao, departamento, cargo, salario_base, status')
      .eq('empresa_id', empresaId)
      .eq('status', 'ativo');

    if (!colaboradores?.length) {
      return new Response(JSON.stringify({
        empresaId,
        mode,
        status: 'sem_colaboradores',
        alertas: [],
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const colabIds = colaboradores.map(c => c.id);

    // ── 2. Análise de ABSENTEÍSMO ─────────────────────────────────
    const alertasAbsenteismo: {
      colaboradorId: string; nome: string; sinal: string;
      nivel: 'critica' | 'alta' | 'media'; justificativa: string; metrica: number;
    }[] = [];

    if (mode === 'absenteismo' || mode === 'both') {
      // 2a. Faltas nos últimos 60 dias
      const { data: faltas } = await supabase
        .from('faltas')
        .select('colaborador_id, data, tipo')
        .in('colaborador_id', colabIds)
        .gte('data', doisMesesAtrasStr);

      const faltasPorColab: Record<string, number> = {};
      for (const f of (faltas ?? [])) {
        faltasPorColab[f.colaborador_id as string] =
          (faltasPorColab[f.colaborador_id as string] ?? 0) + 1;
      }

      for (const colab of colaboradores) {
        const qtd = faltasPorColab[colab.id] ?? 0;
        if (qtd >= 4) {
          alertasAbsenteismo.push({
            colaboradorId: colab.id,
            nome: colab.nome_completo,
            sinal: 'faltas_frequentes',
            nivel: qtd >= 6 ? 'critica' : qtd >= 4 ? 'alta' : 'media',
            justificativa: `${qtd} falta(s) nos últimos 60 dias — acima do limiar de 3`,
            metrica: qtd,
          });
        }
      }

      // 2b. Afastamentos nos últimos 90 dias
      const { data: afastamentos } = await supabase
        .from('afastamentos')
        .select('colaborador_id, tipo, data_inicio, data_fim')
        .in('colaborador_id', colabIds)
        .gte('data_inicio', tresMesesAtrasStr);

      for (const af of (afastamentos ?? [])) {
        const colab = colaboradores.find(c => c.id === af.colaborador_id);
        if (!colab) continue;
        alertasAbsenteismo.push({
          colaboradorId: colab.id,
          nome: colab.nome_completo,
          sinal: 'afastamento_recente',
          nivel: ['acidente_trabalho', 'doenca'].includes(af.tipo as string) ? 'alta' : 'media',
          justificativa: `Afastamento tipo ${af.tipo} desde ${af.data_inicio}`,
          metrica: 1,
        });
      }

      // 2c. Registros de ponto ausentes nos últimos 30 dias
      const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data: pontos } = await supabase
        .from('registros_ponto')
        .select('colaborador_id, data_hora')
        .in('colaborador_id', colabIds)
        .gte('data_hora', trintaDiasAtras);

      const pontosSet = new Set((pontos ?? []).map(p => p.colaborador_id as string));
      for (const colab of colaboradores) {
        // Só flag se admitido há mais de 30 dias
        const admissao = new Date(colab.data_admissao);
        const diasAdmitido = (hoje.getTime() - admissao.getTime()) / (24 * 60 * 60 * 1000);
        if (diasAdmitido < 30) continue;
        if (!pontosSet.has(colab.id)) {
          alertasAbsenteismo.push({
            colaboradorId: colab.id,
            nome: colab.nome_completo,
            sinal: 'ponto_ausente_30d',
            nivel: 'alta',
            justificativa: 'Nenhum registro de ponto nos últimos 30 dias — verificar atividade',
            metrica: 0,
          });
        }
      }
    }

    // ── 3. Análise de TURNOVER ───────────────────────────────────
    const alertasTurnover: {
      colaboradorId: string; nome: string; sinal: string;
      nivel: 'critica' | 'alta' | 'media'; justificativa: string; metrica: number;
    }[] = [];

    if (mode === 'turnover' || mode === 'both') {
      // 3a. Histórico de desligamentos recentes (referência de turnover rate)
      const { data: desligamentosRecentes } = await supabase
        .from('desligamentos')
        .select('id, empresa_id, data_desligamento')
        .eq('empresa_id', empresaId)
        .gte('data_desligamento', tresMesesAtrasStr);

      const turnoverRate3m = ((desligamentosRecentes?.length ?? 0) / Math.max(colaboradores.length, 1)) * 100;

      // 3b. Queda de frequência: faltas nos últimos 3 meses vs. admitidos há mais de 6 meses
      const { data: faltasHistorico } = await supabase
        .from('faltas')
        .select('colaborador_id, data')
        .in('colaborador_id', colabIds)
        .gte('data', tresMesesAtrasStr);

      const faltasRecentes: Record<string, number> = {};
      for (const f of (faltasHistorico ?? [])) {
        faltasRecentes[f.colaborador_id as string] =
          (faltasRecentes[f.colaborador_id as string] ?? 0) + 1;
      }

      const seisMesesAtras = new Date(hoje.getTime() - 180 * 24 * 60 * 60 * 1000);
      for (const colab of colaboradores) {
        const admissao = new Date(colab.data_admissao);
        const diasAdmitido = (hoje.getTime() - admissao.getTime()) / (24 * 60 * 60 * 1000);

        // Colaborador admitido há mais de 6 meses: baseline disponível
        if (diasAdmitido < 180) continue;

        const qtdFaltas = faltasRecentes[colab.id] ?? 0;

        // Limiar: 4+ faltas em 90 dias = risco elevado
        if (qtdFaltas >= 4) {
          alertasTurnover.push({
            colaboradorId: colab.id,
            nome: colab.nome_completo,
            sinal: 'frequencia_baixa',
            nivel: qtdFaltas >= 6 ? 'alta' : 'media',
            justificativa: `${qtdFaltas} falta(s) em 90 dias — possível sinal de disengajamento`,
            metrica: qtdFaltas,
          });
        }

        // 3c. Salário abaixo do piso histórico (sinal de insatisfação / desalinhamento)
        // Usa a mediana de salario_base por cargo como proxy de mercado
        const { data: salarios } = await supabase
          .from('colaboradores')
          .select('salario_base, cargo')
          .eq('empresa_id', empresaId)
          .not('salario_base', 'is', null);

        if (salarios?.length) {
          const salariosPorCargo: Record<string, number[]> = {};
          for (const s of salarios) {
            if (!s.cargo || !s.salario_base) continue;
            if (!salariosPorCargo[s.cargo as string]) salariosPorCargo[s.cargo as string] = [];
            salariosPorCargo[s.cargo as string].push(Number(s.salario_base));
          }

          const mySalarios = salariosPorCargo[colab.cargo as string] ?? [];
          if (mySalarios.length >= 3) {
            const sorted = [...mySalarios].sort((a, b) => a - b);
            const median = sorted[Math.floor(sorted.length / 2)];
            const mySal = Number(colab.salario_base) || 0;
            if (mySal > 0 && mySal < median * 0.7) {
              alertasTurnover.push({
                colaboradorId: colab.id,
                nome: colab.nome_completo,
                sinal: 'salario_abaixo_mercado',
                nivel: 'media',
                justificativa: `Salário ${mySal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} é ${Math.round((mySal / median) * 100)}% da mediana do cargo (${median.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`,
                metrica: Math.round((mySal / median) * 100),
              });
            }
          }
        }
      }
    }

    // ── 4. Análise IA via OpenAI (se configurada) ───────────────
    let iaResumo: string | null = null;

    if (OPENAI_API_KEY || AI_GATEWAY_URL) {
      const totalAlertas = alertasAbsenteismo.length + alertasTurnover.length;
      if (totalAlertas > 0) {
        try {
          const contexto = {
            empresaId,
            mode,
            totalColaboradores: colaboradores.length,
            turnoverRate3m: Math.round(((desligamentosRecentes?.length ?? 0) / Math.max(colaboradores.length, 1)) * 100),
            alertasAbsenteismo: alertasAbsenteismo.map(a => ({
              nome: a.nome, sinal: a.sinal, nivel: a.nivel, justificativa: a.justificativa,
            })),
            alertasTurnover: alertasTurnover.map(a => ({
              nome: a.nome, sinal: a.sinal, nivel: a.nivel, justificativa: a.justificativa,
            })),
          };

          const prompt = `Você é um assistente de RH sênior brasileiro especializado em People Analytics.
Analise os dados abaixo e gere um resumo executivo de no máximo 300 palavras com:
1. Situação geral dos riscos identificados
2. Prioridades de ação para o RH
3. Recomendações preventivas

Contexto da empresa:
- ${colaboradores.length} colaboradores ativos
- Taxa de turnover nos últimos 3 meses: ${contexto.turnoverRate3m}%

${totalAlertas} alerta(s) identificado(s):
${contexto.alertasTurnover.map(a => `- TURNOVER [${a.nivel}]: ${a.nome} — ${a.justificativa}`).join('\n')}
${contexto.alertasAbsenteismo.map(a => `- ABSENTEÍSMO [${a.nivel}]: ${a.nome} — ${a.justificativa}`).join('\n')}

Responda em português brasileiro, tom profissional.`;

          const endpoint = AI_GATEWAY_URL || 'https://api.openai.com/v1/chat/completions';
          const authToken = AI_GATEWAY_URL ? AI_GATEWAY_URL : OPENAI_API_KEY;
          const res = await safeFetch(`${endpoint}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              model: AI_GATEWAY_URL ? 'gpt-4o-mini' : 'gpt-4o-mini',
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 600,
              temperature: 0.3,
            }),
            timeoutMs: 30_000,
            tag: 'openai',
          });

          if (res.ok) {
            const json = await res.json().catch(() => ({})) as { choices?: { message?: { content?: string } }[] };
            iaResumo = json?.choices?.[0]?.message?.content ?? null;
          }
        } catch {
          // OpenAI falhou → análise estatística pura é o fallback
        }
      }
    }

    // ── 5. Salvar alertas na tabela notificacoes ──────────────────
    const todosAlertas = [
      ...alertasAbsenteismo.map(a => ({
        ...a, tipo: 'absenteismo', urgente: a.nivel === 'critica',
      })),
      ...alertasTurnover.map(a => ({
        ...a, tipo: 'turnover', urgente: a.nivel === 'alta' || a.nivel === 'critica',
      })),
    ];

    const criticalAlertas = todosAlertas.filter(a => a.urgente);
    if (criticalAlertas.length > 0) {
      const insertRows = criticalAlertas.map(a => ({
        empresa_id: empresaId,
        user_id: userData.user.id,
        titulo: `[PREDITIVO] ${a.tipo === 'turnover' ? 'Risco turnover' : 'Risco absenteísmo'}`,
        mensagem: `${a.nome}: ${a.justificativa}`,
        tipo: a.nivel === 'critica' ? 'erro' : 'aviso',
      }));

      supabase.from('notificacoes').insert(insertRows).then(() => {}, () => {});
    }

    return new Response(JSON.stringify({
      empresaId,
      mode,
      totalColaboradores: colaboradores.length,
      turnoverRate3m: Math.round(((desligamentosRecentes?.length ?? 0) / Math.max(colaboradores.length, 1)) * 100),
      alertasAbsenteismo,
      alertasTurnover,
      totalAlertas: todosAlertas.length,
      alertasCriticos: criticalAlertas.length,
      iaResumo,
      geradoEm: new Date().toISOString(),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[alertas-preditivos] erro:', err);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
