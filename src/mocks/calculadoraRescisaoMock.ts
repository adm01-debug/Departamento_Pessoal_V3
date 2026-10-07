/**
 * ============================================================================
 * MOCK VISUAL — Calculadora de Rescisão (rota `/calculadora-rescisao`).
 *
 * ESCOPO: percorrer o LAYOUT/fluxo da tela sem backend — o select "Importar
 * Colaborador Ativo" fica populado e preenche o formulário automaticamente. O
 * cálculo em si NÃO precisa de mock: `Calcular Local` já é 100% local
 * (`@/utils/rescisaoCalc`), então o painel de resultado é real.
 *
 * ⚠️ SOMENTE LEITURA. O botão "Salvar" grava em DUAS tabelas reais
 * (`historico_rescisoes` e `desligamentos`) usando a empresa ativa; por isso ele
 * fica BLOQUEADO enquanto este mock estiver ligado — ver
 * `bloquearEscritaCalculadora()`.
 *
 * GATE (mesmo padrão de src/mocks/desligamentosMock.ts, auditoriaMock.ts,
 * admissoesMock.ts e colaboradoresMock.ts): liga somente com as DUAS condições
 * abaixo — logo, nunca em produção:
 *   1. `import.meta.env.DEV` (build de desenvolvimento);
 *   2. `VITE_CALCULADORA_MOCK=true` no `.env`/`.env.local`.
 * A guarda `MODE !== 'test'` é essencial: o Vitest carrega o mesmo `.env.local`
 * do `vite dev` — sem ela os testes receberiam estes dados fictícios em vez do
 * que cada teste configura.
 *
 * PARA DESATIVAR: defina `VITE_CALCULADORA_MOCK=false` no `.env.local` e
 * reinicie o `vite dev`.
 * PARA REMOVER DE VEZ: apague este arquivo e os trechos marcados com
 * "MOCK VISUAL — ver src/mocks/calculadoraRescisaoMock.ts" em:
 *   - src/pages/CalculadoraRescisaoPage.tsx
 * ============================================================================
 */
import { toast } from 'sonner';
import { MOCK_COLABORADORES } from './colaboradoresMock';
import { parseDateLocalISO } from '@/utils/dateLocal';

/** Ativa o mock apenas em dev e apenas com o opt-in explícito da env var. */
export function isCalculadoraMockEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.MODE !== 'test' && import.meta.env.VITE_CALCULADORA_MOCK === 'true';
}

/** Opção do select "Importar Colaborador Ativo" (a consulta real lê só estes campos). */
export interface ColaboradorDoSelectMock {
  id: string;
  nome_completo: string;
}

/**
 * Registro completo entregue ao formulário ao escolher um colaborador — espelha
 * o `select('*')` que a tela faz em `colaboradores`.
 */
export interface ColaboradorParaRescisaoMock {
  id: string;
  nome_completo: string;
  cpf: string;
  cargo: string;
  salario_base: number;
  data_admissao: string;
  saldo_fgts_estimado: number;
}

/**
 * FGTS acumulado estimado: 8% do salário por mês trabalhado — a mesma regra do
 * depósito mensal real. É o valor que a tela joga no campo "Saldo FGTS (R$)".
 */
function fgtsEstimado(salarioBase: number, dataAdmissao: string): number {
  const admissao = parseDateLocalISO(dataAdmissao);
  if (!admissao) return 0;
  const hoje = new Date();
  const meses = Math.max(
    0,
    (hoje.getFullYear() - admissao.getFullYear()) * 12 + (hoje.getMonth() - admissao.getMonth())
  );
  return Math.trunc(salarioBase * 0.08 * meses * 100) / 100;
}

/** Colaboradores ATIVOS da base fictícia (mesmo filtro da consulta: `status=ativo`). */
function ativosParaRescisao(): ColaboradorParaRescisaoMock[] {
  return MOCK_COLABORADORES.filter((colaborador) => colaborador.status === 'ativo').map((colaborador) => ({
    id: colaborador.id,
    nome_completo: colaborador.nome_completo,
    cpf: colaborador.cpf,
    cargo: colaborador.cargo,
    salario_base: colaborador.salario_base,
    data_admissao: colaborador.data_admissao,
    saldo_fgts_estimado: fgtsEstimado(colaborador.salario_base, colaborador.data_admissao),
  }));
}

/** Opções do select, em ordem alfabética — `undefined` quando o mock está desligado. */
export function getMockColaboradoresParaRescisao(): ColaboradorDoSelectMock[] | undefined {
  if (!isCalculadoraMockEnabled()) return undefined;
  return ativosParaRescisao()
    .map(({ id, nome_completo }) => ({ id, nome_completo }))
    .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));
}

/**
 * Registro do colaborador escolhido.
 *
 * Devolve `undefined` quando o mock está desligado **ou** quando o id não é de um
 * colaborador fictício — nos dois casos o chamador segue para a consulta real.
 */
export function getMockColaboradorParaRescisao(id?: string | null): ColaboradorParaRescisaoMock | undefined {
  if (!isCalculadoraMockEnabled() || !id) return undefined;
  return ativosParaRescisao().find((colaborador) => colaborador.id === id);
}

/**
 * O id pertence a um colaborador FICTÍCIO?
 *
 * Usado pela tela para NÃO registrar trilha de auditoria: o RPC
 * `registrar_auditoria` GRAVA de verdade, e um id fictício viraria log no banco.
 */
export function ehColaboradorFicticio(id?: string | null): boolean {
  if (!isCalculadoraMockEnabled() || !id) return false;
  return ativosParaRescisao().some((colaborador) => colaborador.id === id);
}

/**
 * Bloqueia o "Salvar" enquanto o mock estiver ligado.
 *
 * O cálculo é real, mas o colaborador é fictício: o botão gravaria em
 * `historico_rescisoes` E em `desligamentos` na empresa ativa, deixando
 * histórico órfão. Devolve `true` quando a ação deve ser ABORTADA, então o
 * chamador só precisa de `if (bloquearEscritaCalculadora('...')) return;`.
 */
export function bloquearEscritaCalculadora(acao: string): boolean {
  if (!isCalculadoraMockEnabled()) return false;
  toast.info(`Modo demonstração: "${acao}" não é gravado — o colaborador escolhido é fictício.`);
  return true;
}
