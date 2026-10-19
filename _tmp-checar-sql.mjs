/**
 * Checagem estrutural dos arquivos SQL (sem executar): blocos `$$` fechados,
 * begin/commit balanceados e presença das operações obrigatórias.
 */
import { readFileSync } from 'node:fs';

const arquivos = [
  'supabase/migrations/20261017090000_ninebox_aprovacao_gestor.sql',
  'supabase/rollback/20261017090000_ninebox_aprovacao_gestor_rollback.sql',
];

for (const arquivo of arquivos) {
  const s = readFileSync(arquivo, 'utf8');
  const dolares = s.split('$$').length - 1;
  const abre = (s.match(/\$\$/g) ?? []).length;
  const fecha = (s.match(/\$\$;/g) ?? []).length;
  const begin = (s.match(/^\s*begin;\s*$/gm) ?? []).length;
  const commit = (s.match(/^\s*commit;\s*$/gm) ?? []).length;
  console.log(arquivo);
  console.log({
    dolares,
    par: dolares % 2 === 0,
    abre,
    fecha,
    begin,
    commit,
  });
}

const mig = readFileSync(arquivos[0], 'utf8');
const obrigatorios = [
  'colaborador_id_do_usuario',
  'pode_aprovar_colaborador',
  'feedbacks_360_consolidacoes',
  'feedbacks_360_aprovacoes_gestor',
  'enviar_avaliacao_ao_gestor',
  'situacao_aprovacao',
  'decidir_aprovacao_gestor',
  'versao_consolidada_avaliacao',
  'sincronizar_consolidacao_avaliacao',
  'trg_feedbacks_360_consolidacao',
  'validar_potencial_avaliacao',
  'aprovacao_do_gestor_ausente',
  'pode_validar_potencial',
  'audit_log',
  'idempotencia',
];
console.log(
  '\nobrigatórios:',
  obrigatorios.map((t) => `${t}:${mig.includes(t) ? 'ok' : 'FALTA'}`).join(' | ')
);
