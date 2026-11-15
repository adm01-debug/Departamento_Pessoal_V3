/**
 * ============================================================================
 * PAPÉIS DO USUÁRIO NO MÓDULO DE DESEMPENHO — UMA CONTA, VÁRIOS PAPÉIS.
 *
 * O banco mantém a tabela `user_roles` (uma LINHA por papel) e o RPC
 * `get_user_roles` devolve a LISTA completa — ex.: `['admin','gestor']`.
 *
 * ── O DEFEITO QUE ESTE MÓDULO CORRIGE ──────────────────────────────────────
 * O front reduzia a lista a UM papel por precedência (`admin` > `rh` > `gestor`)
 * e testava IGUALDADE nesse papel único. Resultado: a conta com `admin`+`gestor`
 * era tratada só como administrador —
 *   • a consulta de vínculo só rodava com `papel === 'gestor'`, então o
 *     "gestor responsável" nunca era provado e Aprovar/Devolver não apareciam
 *     em registro real;
 *   • a fila exigia `papel === 'gestor'` para oferecer Aprovar/Devolver.
 * Ter o papel `admin` NÃO pode anular o papel `gestor`: cada capacidade é
 * decidida pelo papel que a concede.
 *
 * ── FRONTEIRA (o que isto NÃO é) ───────────────────────────────────────────
 * Estas funções decidem apenas se a INTERFACE pode OFERECER um controle. A
 * autorização real continua no servidor (RLS + `pode_gestor`/`pode_aprovar_
 * colaborador`/`pode_validar_potencial` + revalidação nas RPCs). Nada aqui
 * libera escrita: `disponivel: true` só evita oferecer um controle que a RPC
 * recusaria.
 * ============================================================================
 */

/** Papel único (formato antigo, ainda aceito) ou a LISTA de papéis do usuário. */
export type PapelAvaliacao = string | null | undefined;
export type PapeisAvaliacao = readonly string[] | PapelAvaliacao;

/** Lista normalizada (`minúsculas`, sem espaços, sem vazios, sem repetições). */
export function normalizarPapeis(papeis: PapeisAvaliacao): string[] {
  const lista = Array.isArray(papeis) ? papeis : [papeis];
  const saida: string[] = [];
  lista.forEach((p) => {
    const valor = String(p ?? '')
      .trim()
      .toLowerCase();
    if (valor && !saida.includes(valor)) saida.push(valor);
  });
  return saida;
}

/**
 * O usuário tem ESTE papel? Aceita a lista completa (`['admin','gestor']`) ou um
 * papel único — os dois formatos continuam válidos para os chamadores antigos.
 */
export function temPapel(papeis: PapeisAvaliacao, papel: string): boolean {
  const alvo = String(papel ?? '')
    .trim()
    .toLowerCase();
  return !!alvo && normalizarPapeis(papeis).includes(alvo);
}

/**
 * Capacidades do fluxo derivadas dos papéis — espelha as funções do banco:
 *
 *  • `podeGerirAvaliacoes` (RH/admin) → enviar/reenviar ao gestor, reabrir e
 *    cancelar (`pode_gerir_avaliacoes()`);
 *  • `podeDecidirAprovacao` (`gestor`) → aprovar/devolver a avaliação do gestor
 *    responsável (`pode_aprovar_colaborador()` confere o vínculo no servidor);
 *  • `podeValidarPotencial` (`rh`, SEM admin) → validar o Potencial
 *    (`pode_validar_potencial()`).
 */
export interface CapacidadesAvaliacao {
  admin: boolean;
  rh: boolean;
  gestor: boolean;
  podeGerirAvaliacoes: boolean;
  podeDecidirAprovacao: boolean;
  podeValidarPotencial: boolean;
}

export function capacidadesAvaliacao(papeis: PapeisAvaliacao): CapacidadesAvaliacao {
  const admin = temPapel(papeis, 'admin');
  const rh = temPapel(papeis, 'rh');
  const gestor = temPapel(papeis, 'gestor');
  return {
    admin,
    rh,
    gestor,
    podeGerirAvaliacoes: admin || rh,
    podeDecidirAprovacao: gestor,
    podeValidarPotencial: rh,
  };
}
