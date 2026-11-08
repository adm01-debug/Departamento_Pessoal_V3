#!/usr/bin/env node
/**
 * W91 / E51 — política de rotação de issue de alerta.
 *
 * Issues de bot acumulam comentários sem valor e ficam ilegíveis após ~20.
 * Esta função implementa a rotação: quando o limite é atingido, fecha a issue
 * com um comentário-resumo e abre uma nova com link para a anterior.
 *
 * Uso:
 *   import { abrirOuRotacionar } from './issue-rotativa.mjs';
 *   const num = await abrirOuRotacionar({ gh, owner, repo, label, title, body });
 *
 * `gh(method, path, body?)` deve ser a função que faz chamadas à API do GitHub,
 * com a mesma assinatura de github-settings-guard.mjs.
 */

export const LIMITE_COMENTARIOS = 20;

/**
 * Conta os comentários de uma issue via paginação (max 100/página).
 * Retorna o total real, não apenas os da primeira página.
 */
export async function contarComentarios(gh, owner, repo, issueNumber) {
  let total = 0;
  let page = 1;
  for (;;) {
    const lista = await gh('GET', `/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=100&page=${page}`);
    if (!Array.isArray(lista)) {
      // Resposta que não é array (erro de API/rate-limit) é diferente de "sem mais
      // comentários": tratar como vazio faria uma issue saturada nunca rotacionar.
      console.error(`::warning::issue-rotativa: resposta inesperada ao contar comentários da issue #${issueNumber} (página ${page})`);
      break;
    }
    if (lista.length === 0) break;
    total += lista.length;
    if (lista.length < 100) break;
    page += 1;
  }
  return total;
}

/**
 * Encontra a primeira issue aberta com o título e label dados.
 * Pagina até esgotar as issues abertas do label — sem paginar, uma issue fora
 * das 10 mais recentes do label nunca seria encontrada e cada rodada abriria
 * uma issue nova e duplicada em vez de reconhecer a existente.
 */
export async function encontrarIssue(gh, owner, repo, label, title) {
  let page = 1;
  for (;;) {
    const lista = await gh(
      'GET',
      `/repos/${owner}/${repo}/issues?labels=${encodeURIComponent(label)}&state=open&per_page=100&page=${page}`,
    );
    if (!Array.isArray(lista)) {
      console.error(`::warning::issue-rotativa: resposta inesperada ao listar issues do label '${label}' (página ${page})`);
      return null;
    }
    const achada = lista.find((i) => i.title === title);
    if (achada) return achada;
    if (lista.length < 100) return null;
    page += 1;
  }
}

/**
 * Garante que o label existe (ignora 422 se já existir).
 */
async function garantirLabel(gh, owner, repo, label) {
  await gh('POST', `/repos/${owner}/${repo}/labels`, {
    name: label,
    color: 'e11d48',
    description: 'Issue de alerta de guarda automático',
  }).catch(() => {});
}

/**
 * Abre, atualiza ou rotaciona a issue de alerta.
 *
 * - Se não existe: cria.
 * - Se existe e tem ≤ LIMITE_COMENTARIOS: adiciona comentário.
 * - Se existe e tem > LIMITE_COMENTARIOS: fecha com resumo, abre nova com link.
 *
 * Retorna o número da issue ativa (nova ou existente).
 */
export async function abrirOuRotacionar({ gh, owner, repo, label, title, body }) {
  const existing = await encontrarIssue(gh, owner, repo, label, title);

  if (existing) {
    const total = await contarComentarios(gh, owner, repo, existing.number);

    if (total > LIMITE_COMENTARIOS) {
      // Rotação: fecha a issue saturada com resumo e abre nova.
      await gh('POST', `/repos/${owner}/${repo}/issues/${existing.number}/comments`, {
        body: `⚠️ Esta issue atingiu ${total} comentários e está sendo rotacionada para manter legibilidade (política E51/W91).\n\nÚltimo alerta antes do fechamento:\n\n---\n\n${body}`,
      });
      await gh('PATCH', `/repos/${owner}/${repo}/issues/${existing.number}`, {
        state: 'closed',
        state_reason: 'completed',
      });
      await garantirLabel(gh, owner, repo, label);
      const nova = await gh('POST', `/repos/${owner}/${repo}/issues`, {
        title,
        body: `Continuação de #${existing.number} (fechada por atingir ${total} comentários — E51/W91).\n\n---\n\n${body}`,
        labels: [label],
      });
      console.log(`Issue #${existing.number} rotacionada → #${nova.number}`);
      return nova.number;
    }

    await gh('POST', `/repos/${owner}/${repo}/issues/${existing.number}/comments`, { body });
    console.log(`Issue #${existing.number} atualizada com novo comentário.`);
    return existing.number;
  }

  // Não existe: cria.
  await garantirLabel(gh, owner, repo, label);
  const nova = await gh('POST', `/repos/${owner}/${repo}/issues`, {
    title,
    body,
    labels: [label],
  });
  console.log(`Issue #${nova.number} aberta.`);
  return nova.number;
}

/**
 * Fecha a issue de alerta se estiver aberta (sem regressão detectada).
 */
export async function fecharSeAberta(gh, owner, repo, label, title, mensagem) {
  const existing = await encontrarIssue(gh, owner, repo, label, title);
  if (!existing) return;
  await gh('POST', `/repos/${owner}/${repo}/issues/${existing.number}/comments`, {
    body: mensagem ?? '✅ Perímetro/guarda verificado sem divergência — fechando automaticamente.',
  });
  await gh('PATCH', `/repos/${owner}/${repo}/issues/${existing.number}`, {
    state: 'closed',
    state_reason: 'completed',
  });
  console.log(`Issue #${existing.number} fechada.`);
}
