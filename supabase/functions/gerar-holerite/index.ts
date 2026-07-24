import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateRequest, corsHeaders, createErrorResponse, enforceOrigin, handlePreflight } from '../_shared/contract.ts';
import { holeriteSchema } from '../_shared/schemas/common.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';

// Tabelas INSS 2026
const calcularINSS = (base: number): number => {
  let inss = 0;
  if (base <= 1518) inss = base * 0.075;
  else if (base <= 2793.88) inss = 113.85 + (base - 1518) * 0.09;
  else if (base <= 4190.83) inss = 228.68 + (base - 2793.88) * 0.12;
  else inss = 396.31 + (Math.min(base, 8157.41) - 4190.83) * 0.14;
  return Number(Math.min(inss, 951.63).toFixed(2));
};

const calcularIRRF = (base: number, dependentes: number = 0): number => {
  const baseCalculo = base - (dependentes * 189.59);
  if (baseCalculo <= 2259.20) return 0;
  if (baseCalculo <= 2826.65) return Number(Math.max(0, baseCalculo * 0.075 - 169.44).toFixed(2));
  if (baseCalculo <= 3751.05) return Number(Math.max(0, baseCalculo * 0.15 - 381.44).toFixed(2));
  if (baseCalculo <= 4664.68) return Number(Math.max(0, baseCalculo * 0.225 - 662.77).toFixed(2));
  return Number(Math.max(0, baseCalculo * 0.275 - 896.00).toFixed(2));
};

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

    // Tenant scope: usuário deve ser dono do holerite, admin, OU pertencer à empresa
    const { data: belongs } = await supabase.rpc('user_belongs_to_empresa', {
      _user_id: userId, _empresa_id: colaborador.empresa_id,
    });
    const { data: isAdm } = await supabase.rpc('is_admin', { _user_id: userId });
    const isOwner = colaborador.user_id === userId;
    if (!isOwner && !belongs && !isAdm) {
      return createErrorResponse('Sem acesso a este holerite', 403, 'FORBIDDEN');
    }

    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(supabase, { key: `gerar-holerite:${userId}`, limit: 30, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    // Audit log — leitura de PII sensível
    await supabase.from('audit_log').insert({
      tabela: 'holerite', registro_id: colaboradorId, acao: 'READ_HOLERITE',
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
      .select('*, tipo:tipo_beneficio_id(nome)')
      .eq('colaborador_id', colaboradorId)
      .eq('ativo', true);

    // Calcular proventos
    const salarioBase = colaborador.salario_base;
    const diasTrabalhados = registrosPonto?.length || 30;
    const salarioProporcional = Number(((salarioBase / 30) * diasTrabalhados).toFixed(2));

    // Calcular descontos
    const inss = calcularINSS(salarioProporcional);
    const irrf = calcularIRRF(salarioProporcional - inss);
    const fgts = Number((salarioProporcional * 0.08).toFixed(2));

    // Descontos de benefícios
    const totalDescontosBeneficios = (beneficios || []).reduce((acc: number, b: any) => acc + (b.desconto || 0), 0);

    const totalProventos = salarioProporcional;
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
        { codigo: '001', descricao: 'Salário Base', referencia: diasTrabalhados, valor: salarioProporcional },
      ],
      descontos: [
        { codigo: '101', descricao: 'INSS', referencia: null, valor: inss },
        { codigo: '102', descricao: 'IRRF', referencia: null, valor: irrf },
        ...(beneficios || []).filter((b: any) => b.desconto > 0).map((b: any, i: number) => ({
          codigo: `1${10 + i}`, descricao: b.tipo?.nome || 'Benefício', referencia: null, valor: b.desconto,
        })),
      ],
      totais: {
        totalProventos,
        totalDescontos,
        liquido,
        fgts,
        baseINSS: salarioProporcional,
        baseIRRF: Number((salarioProporcional - inss).toFixed(2)),
        baseFGTS: salarioProporcional,
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
