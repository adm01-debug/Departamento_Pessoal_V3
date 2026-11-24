/**
 * ============================================================================
 * MOCK VISUAL — TRILHA DE AUDITORIA DO PONTO (Central de Auditoria).
 *
 * Só para DEMONSTRAÇÃO em desenvolvimento. Segue a mesma trava dos demais mocks
 * do módulo (`pontoGeoMock`, `desligamentosMock`): `import.meta.env.DEV`, nunca
 * no Vitest (`MODE !== 'test'`) e só com o opt-in explícito
 * `VITE_PONTO_MOCK === 'true'`. Em produção/homologação a consulta real manda.
 *
 * ── POR QUE OS HASHS SÃO GERADOS, E NÃO INVENTADOS ─────────────────────────
 * As linhas de `batidas_ponto` trazem `hash_integridade` calculado com a receita
 * REAL do sistema (`SHA-256` de `colaborador_id|data|hora|dispositivo`, ver
 * `pontoService.registrarBatida`). Assim a tela executa a verificação de
 * verdade sobre o mock: o selo "Verificada" só aparece porque o digest confere,
 * e a linha corrompida (de propósito) aparece como "Divergente". Nada é forjado
 * para "ficar bonito".
 * ============================================================================
 */
import CryptoJS from 'crypto-js';
import { addDaysLocal, formatDateLocalISO } from '@/utils/dateLocal';
import type { LinhaAuditoriaCrua } from '@/components/ponto/centralAuditoria';

/** Ativa o mock apenas em dev e apenas com o opt-in explícito da env var. */
export function isPontoAuditoriaMockEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.MODE !== 'test' && import.meta.env.VITE_PONTO_MOCK === 'true';
}

/** Receita do digest das batidas — a MESMA de `pontoService.registrarBatida`. */
function digestBatida(colaboradorId: string, data: string, hora: string, dispositivo = 'web'): string {
  return CryptoJS.SHA256(`${colaboradorId}|${data}|${hora}|${dispositivo}`).toString();
}

/** Autores fictícios dos eventos demonstrativos. */
const RH = 'mariana.oliveira@promobrindes.com.br';
const GESTOR = 'william.cardoso@promobrindes.com.br';
const DP = 'ana.silva@promobrindes.com.br';
const SISTEMA = 'carlos.lima@promobrindes.com.br';

/** Colaboradores fictícios referenciados pelas batidas/registros. */
const COLAB_A = 'a7f2e1c4-1111-4a2b-8c3d-9e0f1a2b3c4d';
const COLAB_B = 'f3b9d2e1-2222-4c3d-9e4f-0a1b2c3d4e5f';

/** Uma linha do roteiro: o que aconteceu, quando e com que dados. */
interface Roteiro {
  tabela: string;
  acao: 'INSERT' | 'UPDATE' | 'DELETE';
  /** Dias atrás (0 = hoje). */
  dias: number;
  hora: string;
  autor: string | null;
  registroId: string;
  dados: Record<string, unknown>;
  anteriores?: Record<string, unknown>;
  campos?: string[];
}

/**
 * Roteiro de demonstração — 18 eventos nos últimos 30 dias e 4 no período
 * anterior (para os selos de variação dos KPIs terem base de comparação).
 */
const ROTEIRO: Roteiro[] = [
  {
    tabela: 'batidas_ponto', acao: 'INSERT', dias: 0, hora: '09:10', autor: RH,
    registroId: '8412f3a9-6c1e-4f0a-9f7d-2d5b1c8e4a10',
    dados: { colaborador_id: COLAB_A, data: '', hora: '09:10', tipo: 'entrada', origem: 'biometria' },
  },
  {
    tabela: 'batidas_ponto', acao: 'UPDATE', dias: 0, hora: '10:12', autor: GESTOR,
    registroId: '8412f3a9-6c1e-4f0a-9f7d-2d5b1c8e4a10',
    dados: { colaborador_id: COLAB_A, data: '', hora: '10:12', tipo: 'entrada', origem: 'ajuste_manual' },
    anteriores: { status: 'rejeitado', hora: '08:00' }, campos: ['hora', 'origem'],
  },
  {
    tabela: 'solicitacoes_ajuste_ponto', acao: 'INSERT', dias: 1, hora: '14:22', autor: DP,
    registroId: 'b21c9d77-3f4e-4a58-9d61-7c8b5a2e1345',
    dados: { colaborador_id: COLAB_A, data_ponto: '', tipo_ponto: 'entrada', status: 'pendente' },
  },
  {
    tabela: 'registros_ponto', acao: 'DELETE', dias: 2, hora: '18:03', autor: null,
    registroId: 'c55d1a20-8b6f-4c3a-9e21-4f7a6b8c9d01',
    dados: { colaborador_id: COLAB_A, data: '', motivo: 'duplicidade' },
  },
  {
    tabela: 'solicitacoes_ajuste_ponto', acao: 'UPDATE', dias: 3, hora: '17:45', autor: SISTEMA,
    registroId: 'b21c9d77-3f4e-4a58-9d61-7c8b5a2e1345',
    dados: { status: 'aprovado', observacoes_gestor: 'Ajuste validado com o comprovante enviado.' },
    anteriores: { status: 'pendente', observacoes_gestor: null }, campos: ['status', 'observacoes_gestor'],
  },
  {
    tabela: 'batidas_ponto', acao: 'INSERT', dias: 4, hora: '08:02', autor: RH,
    registroId: 'd91a4f33-2c7b-4e19-8a05-6b3c9d1e2f46',
    dados: { colaborador_id: COLAB_B, data: '', hora: '08:02', tipo: 'entrada', origem: 'biometria' },
  },
  {
    tabela: 'registros_ponto', acao: 'UPDATE', dias: 5, hora: '19:30', autor: GESTOR,
    registroId: 'e07b6c11-4d8a-4f27-9b3c-1e5d7a9c2b88',
    dados: { horas_extras: '01:30', horas_falta: '00:00' },
    anteriores: { horas_extras: '00:00', horas_falta: '00:00' }, campos: ['horas_extras'],
  },
  {
    tabela: 'batidas_ponto', acao: 'INSERT', dias: 6, hora: '12:05', autor: DP,
    registroId: 'a13c7e55-9b2d-4c61-8f0a-3d6b9e2c4a70',
    dados: { colaborador_id: COLAB_A, data: '', hora: '12:05', tipo: 'saida', origem: 'biometria' },
  },
  {
    tabela: 'solicitacoes_ajuste_ponto', acao: 'INSERT', dias: 8, hora: '09:58', autor: RH,
    registroId: 'f4d2b8a1-7c3e-4a90-9d12-5b8c7e1f3a26',
    dados: { colaborador_id: COLAB_B, data_ponto: '', tipo_ponto: 'saida', status: 'pendente' },
  },
  {
    tabela: 'registros_ponto', acao: 'INSERT', dias: 9, hora: '07:55', autor: null,
    registroId: 'b8f1c4d2-6a9e-4b37-8c05-2d7e1f6a9c34',
    dados: { colaborador_id: COLAB_B, data: '', entrada_1: '07:55' },
  },
  // Índice 10 — nasce com o digest corrompido: é o caso "Divergente" da tela.
  {
    tabela: 'batidas_ponto', acao: 'UPDATE', dias: 11, hora: '16:40', autor: GESTOR,
    registroId: 'c62e9f18-3d5b-4a72-9e41-8b1c7d2f4a59',
    dados: { colaborador_id: COLAB_A, data: '', hora: '16:40', tipo: 'saida', origem: 'web' },
    anteriores: { hora: '16:20' }, campos: ['hora'],
  },
  {
    tabela: 'registros_ponto', acao: 'UPDATE', dias: 13, hora: '20:11', autor: DP,
    registroId: 'd43a1b77-8e2c-4f95-8a36-1c9d5b7e2f08',
    dados: { horas_falta: '00:35', horas_extras: '00:00' },
    anteriores: { horas_falta: '00:00' }, campos: ['horas_falta'],
  },
  {
    tabela: 'batidas_ponto', acao: 'INSERT', dias: 15, hora: '08:00', autor: RH,
    registroId: 'e18f5c90-2b7d-4a63-9c48-6d1e3f9b2a71',
    dados: { colaborador_id: COLAB_A, data: '', hora: '08:00', tipo: 'entrada', origem: 'biometria' },
  },
  {
    tabela: 'solicitacoes_ajuste_ponto', acao: 'UPDATE', dias: 18, hora: '11:26', autor: SISTEMA,
    registroId: 'f4d2b8a1-7c3e-4a90-9d12-5b8c7e1f3a26',
    dados: { status: 'recusado', observacoes_gestor: 'Sem comprovante anexado.' },
    anteriores: { status: 'pendente' }, campos: ['status', 'observacoes_gestor'],
  },
  {
    tabela: 'registros_ponto', acao: 'DELETE', dias: 21, hora: '15:04', autor: GESTOR,
    registroId: 'a91b7e34-5c8f-4d2a-9b16-3e7f5a1c9d28',
    dados: { colaborador_id: COLAB_B, data: '', motivo: 'lançamento em duplicidade' },
  },
  {
    tabela: 'batidas_ponto', acao: 'INSERT', dias: 24, hora: '13:33', autor: DP,
    registroId: 'b27c4d91-6f3e-4a85-9d02-7c1b8e5a3f64',
    dados: { colaborador_id: COLAB_B, data: '', hora: '13:33', tipo: 'entrada', origem: 'biometria' },
  },
  {
    tabela: 'registros_ponto', acao: 'INSERT', dias: 27, hora: '07:48', autor: null,
    registroId: 'c14d8a62-9e5b-4f37-8a21-6b3c9d7e1f05',
    dados: { colaborador_id: COLAB_A, data: '', entrada_1: '07:48' },
  },
  // ── Período anterior (base da variação dos KPIs) ──────────────────────────
  {
    tabela: 'batidas_ponto', acao: 'INSERT', dias: 34, hora: '08:07', autor: RH,
    registroId: 'd77b1e29-3a6c-4f08-9b51-2e9d6c4a7f13',
    dados: { colaborador_id: COLAB_A, data: '', hora: '08:07', tipo: 'entrada', origem: 'biometria' },
  },
  {
    tabela: 'registros_ponto', acao: 'UPDATE', dias: 38, hora: '18:52', autor: GESTOR,
    registroId: 'e55a9c47-1d8b-4a26-8f93-5c7e2b4d9a61',
    dados: { horas_extras: '00:45' }, anteriores: { horas_extras: '00:00' }, campos: ['horas_extras'],
  },
  {
    tabela: 'solicitacoes_ajuste_ponto', acao: 'INSERT', dias: 43, hora: '10:15', autor: DP,
    registroId: 'f93c2a18-7b4d-4e61-9c08-1a5f3d7b2e94',
    dados: { colaborador_id: COLAB_B, tipo_ponto: 'saida', status: 'pendente' },
  },
  {
    tabela: 'batidas_ponto', acao: 'DELETE', dias: 51, hora: '16:29', autor: null,
    registroId: 'a37e5b91-4c2f-4d08-9a67-3b1e8c5f7d20',
    dados: { colaborador_id: COLAB_A, data: '', motivo: 'batida duplicada' },
  },
];


/**
 * Trilha demonstrativa no MESMO formato de `audit_log` (linha legada), com
 * datas relativas a "hoje" para a tela sempre ter atividade recente.
 */
export function trilhaAuditoriaDemonstrativa(agora: Date = new Date()): LinhaAuditoriaCrua[] {
  return ROTEIRO.map((linha, indice) => {
    const dia = formatDateLocalISO(addDaysLocal(agora, -linha.dias));
    const criadoEm = new Date(`${dia}T${linha.hora}:00`).toISOString();

    const dados: Record<string, unknown> = { ...linha.dados };
    if (dados.data === '') dados.data = dia;
    if (dados.data_ponto === '') dados.data_ponto = dia;

    // Batidas recebem o digest REAL da receita (a tela verifica de verdade).
    if (linha.tabela === 'batidas_ponto') {
      const colaboradorId = String(dados.colaborador_id ?? '');
      const horaBatida = String(dados.hora ?? '08:00');
      dados.dispositivo_id = 'web-browser';
      const digest = digestBatida(colaboradorId, dia, horaBatida);
      // Índice 10 nasce com o digest corrompido — é o caso "Divergente".
      //
      // A troca do primeiro caractere NÃO pode ser cega: o SHA-256 hex começa em
      // '0' em ~1 a cada 16 digests, e aí `'0' + digest.slice(1)` devolveria o
      // próprio digest válido — a demonstração perdia a única linha divergente e
      // o selo saía "Verificada" numa linha que deveria acusar a fraude.
      dados.hash_integridade =
        indice === 10 ? `${digest[0] === '0' ? '1' : '0'}${digest.slice(1)}` : digest;
    }

    return {
      id: `mock-aud-${String(indice + 1).padStart(3, '0')}`,
      tabela: linha.tabela,
      registro_id: linha.registroId,
      acao: linha.acao,
      user_id: null,
      user_email: linha.autor,
      ip_address: '187.45.12.9',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/141.0.0.0 Safari/537.36',
      dados_anteriores: linha.anteriores ?? null,
      dados_novos: dados,
      campos_alterados: linha.campos ?? null,
      created_at: criadoEm,
    } satisfies LinhaAuditoriaCrua;
  });
}

