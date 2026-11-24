import { supabase } from '@/integrations/supabase/client';

// PARTE K — Timeline Funcional do Dossiê. Cada função aqui faz um SELECT
// mínimo, direto pelas colunas reais confirmadas em types.ts.
//
// Não reusa `historicoCargoService.listar` (rhService.ts) porque ele ordena
// por uma coluna que não existe em `historico_cargo` (é `data_alteracao`,
// não `data_inicio` — bug pré-existente, fora do escopo desta tarefa).
// Não reusa a leitura de `transferencias` de `MovimentacoesPage.tsx` porque
// ela lê colunas que não existem nessa tabela (`origem`/`destino`/
// `data_efetivacao` — as reais são `data_vigencia`/`departamento_anterior_id`/
// `departamento_novo_id`).

// Sem empresa_id na tabela (confirmado em types.ts) — isolamento via RLS.
export async function listarHistoricoCargoTimeline(colaboradorId: string) {
  const { data, error } = await supabase
    .from('historico_cargo')
    .select('id, cargo_anterior, cargo_novo, data_alteracao, motivo')
    .eq('colaborador_id', colaboradorId)
    .order('data_alteracao', { ascending: false });
  if (error) throw error;
  return data || [];
}

// `promocoes` não tem coluna empresa_id — isolamento de tenant é via RLS
// (join com colaboradores.empresa_id), igual outras tabelas sem essa coluna.
export async function listarPromocoesTimeline(colaboradorId: string) {
  const { data, error } = await supabase
    .from('promocoes')
    .select('id, data_vigencia, motivo, salario_anterior, salario_novo')
    .eq('colaborador_id', colaboradorId)
    .order('data_vigencia', { ascending: false });
  if (error) throw error;
  return data || [];
}

// Sem empresa_id na tabela (confirmado em types.ts) — isolamento via RLS.
export async function listarTransferenciasTimeline(colaboradorId: string) {
  const { data, error } = await supabase
    .from('transferencias')
    .select('id, data_vigencia, motivo, departamento_anterior_id, departamento_novo_id')
    .eq('colaborador_id', colaboradorId)
    .order('data_vigencia', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function listarAfastamentosTimeline(colaboradorId: string, empresaId: string) {
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
  const { data, error } = await supabase
    .from('afastamentos')
    .select('id, tipo, data_inicio, data_fim_real, status')
    .eq('colaborador_id', colaboradorId)
    .eq('empresa_id', empresaId)
    .order('data_inicio', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function listarDesligamentoTimeline(colaboradorId: string, empresaId: string) {
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
  const { data, error } = await supabase
    .from('desligamentos')
    .select('id, data_desligamento, motivo, status')
    .eq('colaborador_id', colaboradorId)
    .eq('empresa_id', empresaId)
    .order('data_desligamento', { ascending: false });
  if (error) throw error;
  return data || [];
}
