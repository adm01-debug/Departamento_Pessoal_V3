import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateRequest, corsHeaders, createErrorResponse, enforceOrigin, handlePreflight } from '../_shared/contract.ts';
import { holeriteSchema } from '../_shared/schemas/common.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';
import { requireSelfOrRh } from '../_shared/authz.ts';
import { calcularInssEmpregado } from './inss.ts';
import { calcIRRF } from '../_shared/irrf.ts';

serve(async (req: Request): Promise<Response> => {
  const __pf = handlePreflight(req); if (__pf) return __pf;
  const __og = enforceOrigin(req); if (__og) return __og;

  const csrf = await verifyCsrf(req.clone());
  if (!csrf.ok) return csrf.response!;

  // Auth obrigatório — holerite contém PII (CPF, banco, agência, conta)
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

  const { data, errorResponse } = await validateRequest(req, holeriteSchema);
  if (errorResponse) return errorResponse;

  const { colaboradorId, competencia } = data!;

  try {
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Buscar dados do colaborador (com empresa_id para gate de tenant)
    const { data: colaborador, error: colError } = await supabase
      .from('colaboradores')
      .select('nome_completo, cpf, cargo, departamento, salario_base, data_admissao, banco_nome, agencia, conta, empresa_id, user_id')
      .eq('id', colaboradorId)
      .maybeSingle();

    if (colError || !colaborador) {
      return createErrorResponse('Colaborador não encontrado', 404, 'NOT_FOUND');
    }

    // Autorização: o titular do holerite, ou RH/admin da empresa.
    //
    // A regra anterior aceitava `user_belongs_to_empresa`, que é verdadeiro
    // para QUALQUER colega — bastava o id do colaborador para obter salário,
    // CPF, banco, agência e conta de outra pessoa. Pertencer à empresa é
    // pré-requisito, não permissão.
    const authz = await requireSelfOrRh(supabase, userId, colaborador.user_id, colaborador.empresa_id, req);
    if (authz.denied) return authz.denied;

    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(supabase, { key: `gerar-holerite:${userId}`, limit: 30, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl, req);

    // Audit log — leitura de PII sensível
    await supabase.from('audit_log').insert({
      tabela: 'holerite', registro_id: colaboradorId, acao: 'VISUALIZACAO',
      user_id: userId,
      dados_novos: { competencia, empresa_id: colaborador.empresa_id },
    });


    // Buscar registros de ponto do mês
    const [ano, mes] = competencia.split('-').map(Number);
    const primeiroDia = `${competencia}-01`;
    const ultimoDia = new Date(ano, mes, 0).toISOString().split('T')[0];

    const { data: registrosPonto } = await supabase
      .from('registros_ponto')
      .select('*')
      .eq('colaborador_id', colaboradorId)
      .gte('data', primeiroDia)
      .lte('data', ultimoDia);

    // Buscar benefícios ativos
    const { data: beneficios } = await supabase
      .from('beneficios_colaborador')
      .select('*, tipo:tipo_beneficio_id(nome, codigo)')
      .eq('colaborador_id', colaboradorId)
      .eq('ativo', true);

    // Dependentes para IRRF (para_irrf) — mesmo critério do motor canônico.
    const { count: dependentes } = await supabase
      .from('dependentes')
      .select('id', { count: 'exact', head: true })
      .eq('colaborador_id', colaboradorId)
      .eq('para_irrf', true);

    // Proventos: salário-base integral — mesmo tratamento do motor canônico
    // (lote/edge), sem proporcionalidade por dias de registro de ponto.
    const salarioBase = colaborador.salario_base;
    const diasTrabalhados = registrosPonto?.length || 30;

    // Descontos canônicos: INSS progressivo por competência + IRRF com
    // deduções legais x desconto simplificado e Lei 15.270 (_shared/irrf.ts).
    const inss = calcularInssEmpregado(salarioBase, competencia);
    const irrf = calcIRRF(salarioBase, dependentes ?? 0, competencia);
    const fgts = Number((salarioBase * 0.08).toFixed(2));

    // Descontos de benefícios — regra do canônico: VT limitado a 6% do
    // salário-base; demais benefícios valem o campo `desconto`.
    const beneficioDesconto = (b: any): number => {
      if (b.tipo?.codigo === 'VT') return Math.min(Number(b.valor ?? 0), salarioBase * 0.06);
      return Number(b.desconto ?? 0);
    };
    const totalDescontosBeneficios = (beneficios || []).reduce((acc: number, b: any) => acc + beneficioDesconto(b), 0);

    const totalProventos = salarioBase;
    const totalDescontos = Number((inss + irrf + totalDescontosBeneficios).toFixed(2));
    const liquido = Number((totalProventos - totalDescontos).toFixed(2));

    const holerite = {
      colaborador: {
        nome: colaborador.nome_completo,
        cpf: colaborador.cpf,
        cargo: colaborador.cargo,
        departamento: colaborador.departamento,
        dataAdmissao: colaborador.data_admissao,
        banco: colaborador.banco_nome,
        agencia: colaborador.agencia,
        conta: colaborador.conta,
      },
      competencia,
      proventos: [
        { codigo: '001', descricao: 'Salário Base', referencia: diasTrabalhados, valor: salarioBase },
      ],
      descontos: [
        { codigo: '101', descricao: 'INSS', referencia: null, valor: inss },
        { codigo: '102', descricao: 'IRRF', referencia: null, valor: irrf },
        ...(beneficios || []).map((b: any) => ({ b, valor: beneficioDesconto(b) }))
          .filter((x) => x.valor > 0)
          .map((x, i: number) => ({
            codigo: `1${10 + i}`, descricao: x.b.tipo?.nome || 'Benefício', referencia: null, valor: x.valor,
          })),
      ],
      totais: {
        totalProventos,
        totalDescontos,
        liquido,
        fgts,
        baseINSS: salarioBase,
        baseIRRF: Number((salarioBase - inss).toFixed(2)),
        baseFGTS: salarioBase,
      },
      geradoEm: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify({ success: true, holerite }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    try { captureException(error, { fn: 'gerar-holerite' }); } catch { /* noop */ }
    // Erro genérico — nunca vazar mensagem/stack ao cliente (PII sensível)
    return createErrorResponse('Erro interno ao gerar holerite', 500, 'INTERNAL_SERVER_ERROR');
  }
});
