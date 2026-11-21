#!/usr/bin/env node
/**
 * Auditoria continua das funcionalidades F-01..F-20 contra o estado real do canonico.
 * Reaproveita os artefatos ja regerados do banco canonico (role ci_auditor, somente leitura):
 *   inventario/estado/banco.json  -> tabelas (existe + rls + policies) e edges
 *   inventario/estado/edges.json  -> edge functions do repo (codigo presente)
 * Cada F exige um conjunto de tabelas (presentes com RLS e pelo menos 1 policy) e/ou edges.
 * Saida: inventario/estado/funcionalidades.json com status por F + resumo; exit 1 se regressou.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BANCO = path.join(RAIZ, 'inventario/estado/banco.json');
const EDGES = path.join(RAIZ, 'inventario/estado/edges.json');
const SAIDA = path.join(RAIZ, 'inventario/estado/funcionalidades.json');

// Mapeamento F -> evidencia minima no canonico. tabelas: tem que existir + RLS + policy.
// edges: tem que existir em edges.json (codigo no repo). Para F-17 (cron) o ci_auditor nao
// ve pg_cron, entao a evidencia e por edges; o numero de jobs fica na descricao.
const FUNCIONALIDADES = [
  { id: 'F-01', nome: 'Admissao de Funcionario', tabelas: ['admissoes', 'notificacoes_admissao'], edges: ['admissao-publica', 'enviar-email-admissao'] },
  { id: 'F-02', nome: 'Email Pre-Admissao', tabelas: ['notificacoes_admissao'], edges: ['enviar-email-admissao'] },
  { id: 'F-03', nome: 'Rescisao de Contrato', tabelas: ['historico_rescisoes', 'verbas_rescisorias', 'homologacoes_rescisao'], edges: ['calcular-rescisao', 'pagar-desligamento'] },
  { id: 'F-04', nome: 'Calculo de Folha', tabelas: ['folhas_pagamento', 'itens_folha'], edges: ['calcular-folha', 'fechar-folha'] },
  { id: 'F-05', nome: 'Fechamento de Folha', tabelas: ['folhas_pagamento', 'itens_folha'], edges: ['fechar-folha'] },
  { id: 'F-06', nome: 'Emissao de Holerite PDF', tabelas: ['holerites', 'holerite_distribuicoes'], edges: ['gerar-holerite', 'distribuir-holerites'] },
  { id: 'F-07', nome: 'Envio de Eventos eSocial', tabelas: ['esocial_eventos', 'esocial_lotes'], edges: ['enviar-esocial'] },
  { id: 'F-08', nome: 'Login Gov.BR', tabelas: ['auth_gov_br_sessions'], edges: ['auth-gov-br'] },
  { id: 'F-09', nome: 'Ferias', tabelas: ['ferias', 'periodos_aquisitivos'], edges: ['calcular-ferias'] },
  { id: 'F-10', nome: 'Afastamentos', tabelas: ['afastamentos', 'config_afastamentos', 'motivos_afastamento'], edges: [] },
  { id: 'F-11', nome: 'CNAB/Remessa PIX', tabelas: ['cnab_remessas', 'cnab_itens', 'cnab_configuracoes'], edges: ['cnab-remessa', 'pix-lote'] },
  { id: 'F-12', nome: 'Backup de Dados', tabelas: [], edges: ['backup', 'backup-automatico'] },
  { id: 'F-13', nome: 'Tabelas Fiscais INSS/IRRF', tabelas: ['faixas_inss', 'faixas_irrf', 'guias_inss'], edges: ['gerar-guias', 'dctfweb'] },
  { id: 'F-14', nome: 'External DB Bridge', tabelas: [], edges: ['external-db-bridge'] },
  { id: 'F-15', nome: 'AAL2 MFA Enforcement', tabelas: ['user_mfa'], edges: [] },
  { id: 'F-16', nome: 'Upload de Certificado Digital', tabelas: ['certificados_digitais'], edges: ['upload-certificado', 'criptografia'] },
  { id: 'F-17', nome: 'Rotinas Agendadas', tabelas: [], edges: ['processar-agendamentos', 'backup-automatico'] },
  { id: 'F-18', nome: 'Recrutamento e Selecao', tabelas: ['vagas', 'candidatos', 'candidaturas', 'vaga_etapas'], edges: [] },
  { id: 'F-19', nome: 'Nine-Box / Desempenho', tabelas: ['ciclos_avaliacao', 'feedbacks_360', 'feedbacks_360_consolidacoes', 'feedbacks_360_aprovacoes_gestor'], edges: [] },
  { id: 'F-20', nome: 'Exportacao de Dados', tabelas: [], edges: ['exportacao'] },
];

function lerJSON(caminho) {
  return JSON.parse(fs.readFileSync(caminho, 'utf8'));
}

export function validar(banco, edges) {
  const porNome = new Map((banco.tabelas || []).map((t) => [t.nome, t]));
  const edgesMap = edges.edge_functions || {};
  const resultados = FUNCIONALIDADES.map((f) => {
    const faltasTabela = [];
    const semRls = [];
    for (const nome of f.tabelas || []) {
      const t = porNome.get(nome);
      if (!t) { faltasTabela.push(nome); continue; }
      if (!t.rls || !(t.policies > 0)) semRls.push(nome);
    }
    const faltasEdge = (f.edges || []).filter((e) => !(e in edgesMap));
    const ok = faltasTabela.length === 0 && semRls.length === 0 && faltasEdge.length === 0;
    return {
      id: f.id, nome: f.nome, status: ok ? 'VERIFICADO' : 'REGRESSAO',
      faltas_tabela: faltasTabela, tabelas_sem_rls: semRls, faltas_edge: faltasEdge,
    };
  });
  const regressoes = resultados.filter((r) => r.status === 'REGRESSAO');
  return {
    gerado_em: new Date().toISOString(),
    total: resultados.length,
    verificados: resultados.filter((r) => r.status === 'VERIFICADO').length,
    regressoes: regressoes.length,
    resultado: regressoes.length === 0 ? 'OK' : 'REGRESSAO',
    funcionalidades: resultados,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const banco = lerJSON(BANCO);
  const edges = lerJSON(EDGES);
  const out = validar(banco, edges);
  fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
  fs.writeFileSync(SAIDA, JSON.stringify(out, null, 2) + '\n');
  console.log(`funcionalidades: ${out.verificados}/${out.total} verificados, ${out.regressoes} regressao(oes).`);
  if (out.regressoes > 0) {
    for (const r of out.funcionalidades.filter((x) => x.status === 'REGRESSAO')) {
      console.log(`  REGRESSAO ${r.id} ${r.nome}: tabela_faltando=${r.faltas_tabela.join(',')} sem_rls=${r.tabelas_sem_rls.join(',')} edge_faltando=${r.faltas_edge.join(',')}`);
    }
    process.exitCode = 1;
  }
}