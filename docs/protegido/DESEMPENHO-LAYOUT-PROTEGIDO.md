# Gestão de Desempenho — LAYOUT PROTEGIDO (CONGELADO)

> Área: **Gestão de Desempenho** · rota `/avaliacao`
> Congelada em: **16/10/2026**
> Regra permanente do agente: [`.clinerules`](../../.clinerules)

Este documento é o **inventário** da proteção. Ele responde "o que não pode mudar
sem autorização explícita do usuário" e "como isso é verificado".

---

## 1. O defeito corrigido (registro histórico)

Nos cards de Feedbacks, um **nome longo de avaliador** (ex.:
`HOMOLOG-NB Colaborador Descartavel`) ultrapassava a coluna **AVALIADO POR**
(216 px no desktop) e pintava **por cima** da coluna de nota/estrelas/badge.

**Causa exata** (medida no DOM real): a coluna (B) é um `flex-col` com
`lg:items-start`; o bloco interno (`.min-w-0.space-y-1.5`) era um flex item
**não esticado**, logo sua largura era a do **conteúdo** — com o nome longo ele
crescia para **277 px numa coluna de 216 px** e o `truncate` de dentro nunca
precisava cortar (o `<span class="block truncate …">` media 237 px de sobra:
`scrollWidth == clientWidth`). O `min-w-0` sozinho não resolve: ele remove o
piso mínimo, **não cria um teto**.

**Correção (mínima, sem redesenho):**

- `src/components/avaliacao/FeedbackCard.tsx` — bloco interno recebeu
  **`lg:w-full`** (passa a medir exatamente a coluna; no mobile o layout é
  `flex-row` e nada muda) e o nome ganhou **`title={item.avaliador}`** para
  preservar o acesso ao nome completo.
- `src/pages/AvaliacaoPage.tsx` — o `<SelectValue>` **não repassa `className`**
  para o `<span>` que renderiza o texto (ele sai sem classe e `display:inline`),
  então `max-w-full truncate` nele era *no-op* e um nome de ciclo longo quebrava
  em duas linhas dentro do trigger `h-11`, pintando texto fora da caixa, sobre a
  faixa de abas. O truncamento passou para um wrapper
  `<span className="w-full max-w-full truncate">` (item flex ⇒ precisa de
  `w-full`, pois o contêiner é `items-start`); o período recebeu o mesmo
  tratamento.

**Medições antes → depois** (viewport 1194 px, instrumentação no DOM real):

| Medida | Antes | Depois |
|---|---|---|
| Largura do bloco interno | 277 px (coluna de 216 px) | 195 px (216 − `pl-5`) |
| Largura do nome | 237 px (`scrollWidth == clientWidth` ⇒ sem reticências) | 155 px (`scrollWidth` 237 ⇒ **truncado**) |
| Invasão da coluna de nota | **+62 px** (nome invadia as estrelas) | **−20 px** (folga) |
| Seletor de ciclo (nome longo) | 2 linhas dentro de `h-11` ⇒ texto fora da caixa | 1 linha + reticências, `scrollHeight == clientHeight` |

---

## 2. Arquivos e trechos protegidos

As âncoras **exatas** (arquivo → lista de literais) estão em
[`desempenho-layout.baseline.json`](./desempenho-layout.baseline.json) e são a
fonte do verificador. Visão geral:

### 2.1 Feedbacks (cards, timeline, filtros, modais)

| Arquivo | O que congelou |
|---|---|
| `src/components/avaliacao/FeedbackCard.tsx` | Card raiz (`rounded-xl … lg:flex-row lg:items-stretch lg:gap-5`), as **três faixas** (A colaborador · B avaliador 216 px · C nota/ações 172 px), avatar 11×11, citação, chip de tipo, data, nota, `<EstrelasNota>`, badge da faixa, menu de três pontos e "Ver feedback" |
| `src/components/avaliacao/EstrelasNota.tsx` | 5 estrelas, `gap-0.5`, ícone `h-3.5 w-3.5` |
| `src/components/avaliacao/FeedbacksTimeline.tsx` | Trilho (`w-px bg-border/40`), ponto (`-left-4 top-5 ring-4`), marco do mês (altura fixa 18 px + vão 12 px = `DESLOCAMENTO_LATERAL` 30 px) |
| `src/components/avaliacao/FeedbacksTab.tsx` | Grid `xl:grid-cols-[minmax(0,1fr)_320px]` e o `xl:pt-[30px]` da coluna lateral |
| `src/components/avaliacao/FeedbacksFiltros.tsx` | Busca, dropdown de tipo (4 categorias oficiais), avaliador, ordem e chips |
| `src/components/avaliacao/FeedbacksResumo.tsx` | Widgets da coluna lateral |
| `src/components/avaliacao/FeedbacksFocoBanner.tsx` | Banner "Foco agora" |
| `src/components/avaliacao/FeedbackDetalheDialog.tsx` | **Modal Ver Feedback** |
| `src/components/avaliacao/NovoFeedbackDialog.tsx` | **Modal Novo Feedback** |
| `src/components/avaliacao/animacaoFeedbacks.ts` | Desenho e duração da entrada (0,9 s expansão · 0,6 s cascata · passo 0,2 s · `CASCATA_Y -48` · easing `[0.22,1,0.36,1]`) |

### 2.2 Demais layouts aprovados de Gestão de Desempenho

`NineBoxTab.tsx` (+ `NineBox*`), `PdiTab.tsx` (+ `Pdi*`), `MetasOKRsTab.tsx`
(+ `Metas*`, `MetaCard.tsx`), `CicloAtivoPanel.tsx`, `TodosCiclosTable.tsx`,
`NovoCicloDialog.tsx`, `Auditoria*`, `PerformanceDashboard.tsx`,
`AnaliticosDesempenho.tsx`, `AlertasDesempenho.tsx`, `IndicadorEvolucao.tsx`,
`ProgressoDonut.tsx` — todos com rotina/âncora registrada onde aplicável.

### 2.3 Mocks e fixtures demonstrativas

`src/mocks/desempenhoMock.ts`, `src/components/avaliacao/nineBoxMock.ts`,
`src/components/avaliacao/pdiProgressoMock.ts`. **Não desligar mocks**, não
remover registros fictícios e não alterar a apresentação dos dados fictícios.

### 2.4 Chrome da área

`src/pages/AvaliacaoPage.tsx` — linha de controles (`h-11`), faixa de abas
(6 colunas, `h-11`, indicador deslizante), classes das abas, seletor de ciclo
(`h-11 … sm:w-[230px]`) e a ação primária.

### 2.5 Subaba "Aguardando gestor" (alteração AUTORIZADA em 16/10/2026)

Única alteração visual aprovada depois do congelamento: a **segunda
visualização interna** da aba Feedbacks, com os controles do fluxo de aprovação.

| Arquivo | O que congelou |
|---|---|
| `src/components/avaliacao/FeedbacksTab.tsx` | Seletor das duas visualizações (chips `ColoredFilterChip`: `Avaliações` / `Aguardando gestor` com contador dinâmico) e a renderização condicional — a visualização "Avaliações" segue **byte a byte** a de antes |
| `src/components/avaliacao/PendenciasAprovacao.tsx` | Card da fila (mesma anatomia do card de feedback: identificação → gestor responsável → desempenho/potencial/badge/ações), botões `Enviar ao gestor`, `Reenviar ao gestor`, `Aprovar`, `Devolver`, `Validar Potencial`, `Ver avaliação` e o diálogo de devolução com justificativa obrigatória |
| `src/components/avaliacao/aprovacaoGestor.ts` | Status do fluxo, rótulos, tons, permissões por papel, mínimo de justificativa (10), `situacaoAprovacao` (espelho do SQL) e a derivação da fila |

**Não alterado:** a lista aprovada de feedbacks, os dois modais, os filtros, os
badges, o menu principal e as demais abas (provas: teste de navegador + âncoras).

---

## 3. Como a proteção funciona (e seus limites)

| Mecanismo | Comando | O que faz |
|---|---|---|
| Verificador de âncoras | `npm run verificar:layout` (ou `node scripts/verificar-layout-protegido.mjs`) | Mostra o `git diff` de cada arquivo protegido modificado e **falha (exit 1)** se uma âncora visual desaparecer/mudar |
| Referências visuais | `npm run capturar:referencias` | Regenera `docs/protegido/referencias/*.png` (layout atual + o caso de **nome longo** injetado no DOM) |
| Teste de navegador | `npm run test:e2e:layout` | Mede o DOM real: colunas de 216/172 px, nome truncado que não cruza para a nota, trigger de ciclo sem transbordo, abas/controles presentes |

### O que o verificador NÃO bloqueia (de propósito)

- **Lógica** em arquivos mistos TSX (Supabase, RPCs, hooks, validações): pode
  mudar — o verificador só olha os literais visuais declarados.
- Estado global, migrations, services, testes: fora do escopo das âncoras.

### Limitações (declaradas)

1. Âncoras são comparadas por **substring** — uma mudança visual que preserve
   todos os literais declarados (ex.: alterar um valor em `tailwind.config.js`)
   não é pega por elas; é pega pelo teste de navegador, que mede geometria.
2. O teste de navegador cobre as **invariantes de layout** medidas (larguras,
   overflow, sobreposição) — não é pixel-diff, então variação de rendering ou de
   dados não gera falso positivo.
3. As referências `.png` são para **revisão humana**; não há comparação
   automática de pixels (decisão deliberada: o repositório já sofre com ruído
   visual entre ambientes).
4. Nenhum controle impede alguém de editar os próprios arquivos de proteção — a
   barreira final é a **regra do `.clinerules`** + revisão do usuário.

---

## 4. Referências visuais

`docs/protegido/referencias/`

| Arquivo | Conteúdo |
|---|---|
| `feedbacks-1456.png` · `feedbacks-1194.png` | Aba Feedbacks como aprovada |
| `feedbacks-nome-longo-1456.png` · `feedbacks-nome-longo-1194.png` | Contrato de truncamento do nome do avaliador (`HOMOLOG-NB Colaboradora…` sem invadir as estrelas) |
| `ciclo-nome-longo-1456.png` · `ciclo-nome-longo-1194.png` | Contrato de truncamento do seletor de ciclo (1 linha + reticências, sem cobrir as abas) |
| `aguardando-gestor-1456.png` · `aguardando-gestor-1194.png` | Subaba "Aguardando gestor": contador dinâmico, fila com desempenho/potencial/status e as ações de aprovação |

---

## 5. O que continua valendo (funcionalidade preservada nesta tarefa)

Nenhuma destas foi alterada — são o motivo de a área continuar operando:

- Salvamento no Supabase (`criar_feedback_seguro`), RPCs e idempotência da
  criação de feedback;
- Conclusão/cancelamento de feedback e validação do RH;
- Fluxo de aprovação do gestor (Nine-Box) em desenvolvimento;
- Consultas, hooks e `mesclar(mock, real)` da `AvaliacaoPage` (mocks continuam
  visíveis e **nunca** são gravados — a guarda de ID fictício `mock-*` segue);
- Mocks/fixtures e flags de ambiente **inalterados**.
