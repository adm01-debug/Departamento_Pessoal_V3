# Reconciliação do `analise-prs/funcionalidades.csv` — 20/11/2026

## Motivo
O CSV foi criado na PR #333 (commit `fc04fb8e`) e nunca foi atualizado. Marcava 10
funcionalidades como `QUEBRADO`/`NAO_FUNCIONAL`/`NAO_VERIFICADO` e apontava para PRs
que **já foram todas merged** (31/10). Este commit reconcilia o artefato com o estado
real da `main` (`cca632bd`), sem perder o trabalho entregue desde então.

## PRs citadas no CSV antigo — status real
| PR | Título | Estado |
|----|--------|--------|
| #309 | S-2200 + e-mail pré-admissão | MERGED 31/10 |
| #313 | Modalidades rescisão + pagamento RPC | MERGED 31/10 |
| #315 | Bridge hardening, aal2 nas edges, cert via edge | MERGED 31/10 |
| #317 | Login gov.br anônimo + XML S-2299 | MERGED 31/10 |
| #209 | Rotinas agendadas | CLOSED |

## Evidências verificadas nesta sessão (main `cca632bd`)
- **F-04** — `src/services/folha/calculoLoteService.ts:92+` usa selects corrigidos com
  join em `pensoes` (fallback para `pensoes.empresa_id` ausente). Gap original resolvido.
- **F-06** — `src/utils/holeritePDF.ts` gera PDF local via jsPDF; sem refs a
  `storage.lovable.dev` no `src` (grep vazio). Edge `distribuir-holerites` presente.
- **F-15** — `supabase/functions/_shared/aal2.ts` aplicado em `backup`, `cnab-remessa`,
  `criptografia`, `enviar-esocial` (`requireAal2` no handler).
- **F-09/F-10** — `src/pages/FeriasPage.tsx`, `FeriasProgramacaoPage.tsx`,
  `AfastamentosPage.tsx` reais; `QA_FERIAS_V31.md` selo 10/10 nas regras CLT.
- **F-18/F-19** — `src/pages/AvaliacaoPage.tsx`, `NineBoxPreviewPage.tsx`;
  `docs/ninebox-homologacao-funcional.md` (roteiro). PR #764 merged (itens 8/13/14 da #571).

## Não verificados (dependentes de banco vivo/prod)
F-01/02/03/05/07/08/11/13/16/17/20 seguem `NAO_VERIFICADO_EM_PROD` — exigem query real no
canônico (dados/estado em produção), fora do escopo de código desta reconciliação.

## Pendências reais (fora do código)
- **F-18** Recrutamento: branch `muri` sem PR — decisão humana (não mergear).
- **F-19** Nine-Box: roteiro de homologação funcional pronto mas **nada executado** no canônico.
- **F-05** Fechamento de folha: confirmar status `calculada` vs `aberta` no banco vivo.
