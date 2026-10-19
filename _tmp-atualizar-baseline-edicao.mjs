/**
 * Baseline — contrato de 19/10/2026: lista só Editar; fila com prévia de texto.
 * Uso: node _tmp-atualizar-baseline-edicao.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const p = 'docs/protegido/desempenho-layout.baseline.json';
const b = JSON.parse(readFileSync(p, 'utf8'));

const trocarAncoras = (caminho, ancoras) => {
  const alvo = b.arquivos.find((a) => a.caminho === caminho);
  if (alvo) alvo.ancoras = ancoras;
};

trocarAncoras('src/components/avaliacao/FeedbackCard.tsx', [
  { id: 'adaptador-canonico', trecho: 'export function FeedbackCard({' },
  { id: 'delega-ao-canonico', trecho: '<CartaoFeedbackCanonico' },
  { id: 'contexto-lista', trecho: 'contexto="lista"' },
  { id: 'somente-edicao', trecho: "acoes={['editar']}" },
  { id: 'acao-editar', trecho: 'onEditar={() => onEditar?.(item)}' },
]);

const modal = b.arquivos.find((a) => a.caminho === 'src/components/avaliacao/NovoFeedbackDialog.tsx');
if (modal) {
  const a = modal.ancoras.find((x) => x.id === 'titulo-dialog');
  if (a) a.trecho = '<DialogTitle className="font-display text-base">';
  if (!modal.ancoras.some((x) => x.id === 'modo-edicao')) {
    modal.ancoras.push({ id: 'modo-edicao', trecho: "{emEdicao ? 'Editar feedback' : 'Novo feedback'}" });
  }
}

const card = b.arquivos.find((a) => a.caminho.endsWith('CartaoFeedbackCanonico.tsx'));
if (card) {
  const set = (id, trecho) => {
    const an = card.ancoras.find((x) => x.id === id);
    if (an) an.trecho = trecho;
    else card.ancoras.push({ id, trecho });
  };
  set('acoes-por-superficie', 'acoes: acoesPedidas = ORDEM_FILA');
  set('previa-de-textos', '<PreviaTextos item={item} />');
}

b.padronizadoEm = '2026-10-19';
writeFileSync(p, `${JSON.stringify(b, null, 2)}\n`);
console.log('baseline atualizado');
