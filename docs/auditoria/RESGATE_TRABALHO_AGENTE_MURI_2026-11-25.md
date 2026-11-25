# Resgate do trabalho do agente Muri — 2026-11-25

> Escopo: garantir que nenhum trabalho do agente Muri — nem das tentativas de integração feitas por outros agentes — se perca, e registrar a regra de resgate que impede regressão. **Nenhuma branch foi apagada.** Tudo o que existia apenas no disco local agora está no `origin`.

## 1. O risco que existia

O port do Muri vivia em 4 branches **locais** mais 1 entrada de `git stash` compartilhada pelos worktrees do repo. Nenhuma dessas refs existia no `origin`. Um `git reset --hard`, um `git clean -fdx` — ou a simples perda do disco/WSL — apagava o trabalho inteiro: 1.381 a 1.971 arquivos por estado.

## 2. O que foi preservado (todas agora no `origin`)

| Ref                                                  | SHA         | Conteúdo                                                          | Papel                                                                                              |
| ---------------------------------------------------- | ----------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `claude/feat-resgata-trabalho-muri-261124-1400`      | `296a01873` | 1.381 arquivos — 535 novos, 844 modificados, 2 removidos          | **port conservador**: só arquivos que não existem na main + os marcados `SO_MURI`. Base do resgate |
| `claude/feat-integracao-muri-3way-261125-0030`       | `fd7f3ccee` | 1.971 arquivos (merge Muri × main "preservando a lógica da main") | variante agressiva; fica para consulta arquivo a arquivo                                           |
| `claude/chore-preserva-stash-muri-261124`            | `22aef52b3` | `stash` de 1.381 arquivos (+114.009/−47.684)                      | 59 arquivos acima do `296a01873`: 58 docs + `src/assets/banks/SOURCES.md`                          |
| `claude/feat-integracao-trabalho-muri-261124-1501`   | `c1fc5a6cb` | 383 arquivos                                                      | snapshot de medição: docs, e2e NineBox/Premiações e ~60 `scripts/_tmp-*.mjs`                       |
| `claude/feat-resgata-ui-muri-261124-1246`            | `fbc3dc010` | 224 arquivos (198 novos em `src/`)                                | snapshot de UI; 135 dos 289 arquivos novos são importados por outro arquivo (não é código morto)   |
| `claude/chore-preserva-wip-medicao-muri-261124-1715` | `8ed98aaca` | 493 arquivos (+92.630/−31.313)                                    | commit órfão recuperado por `git fsck --unreachable`                                               |

## 3. Regra de resgate: o Muri **não** é mais novo em tudo

O material do Muri foi construído sobre outra base e sobre outro projeto Supabase. Em vários arquivos ele está **atrás** da main, porque agentes posteriores endureceram segurança aqui. Portar um arquivo modificado inteiro é, nesses casos, **regressão**.

Três casos medidos (`git diff --numstat main 296a01873`):

| Arquivo                     | main → Muri   | O que se perde portando o Muri                                                                                                                                                            |
| --------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/utils/piiMask.ts`      | +12 / **−48** | `maskPiiDeep` (mascaramento recursivo de PII em payloads de auditoria/export), `maskGeneric` e a regex `PII_KEY`. Consumidores atuais: `src/hooks/usePiiMask.ts`                          |
| `src/utils/safeUrl.ts`      | +8 / −3       | A allowlist da main aponta para o projeto canônico `frjbfeamybqsejlvmqbl.supabase.co`; a do Muri para `ciziytrrjjotlsjzshnm.supabase.co` (projeto dele) e abre `.supabase.co` como sufixo |
| `src/utils/sanitizeHtml.ts` | +20 / **−80** | A lista explícita de handlers `on*` cai de **77 para 12** atributos                                                                                                                       |

**Consequência prática:** só entra o que é **aditivo** (arquivo novo, ou função nova em arquivo existente) **e** tem consumidor na main. Arquivo modificado entra por recorte revisado, nunca "o arquivo do Muri por cima".

## 4. Comparação byte a byte Muri × main

Método: `git ls-tree -r --format='%(objectname) %(path)'` das duas árvores (hash do blob por caminho, independente de histórico) e junção por caminho. Muri: 5.320 entradas; main `252cc8071`: 4.085.

| Situação    | Arquivos |
| ----------- | -------- |
| Idênticos   | 1.203    |
| Divergentes | 1.574    |
| Só no Muri  | 2.543    |
| Só na main  | 1.308    |

Divergentes por pasta: 713 `src/components`, 163 `src/services`, 137 `src/hooks`, 114 `src/pages`, 104 `supabase/migrations`, 90 `supabase/functions`.

## 5. Resgatado até aqui

- **#870** — "Ver todos" dos Talentos em destaque abre a janela completa (aba Nine-Box). 11 arquivos: `NineBoxTalentosDialog` novo, `onVerTodos` no card, perfis de saída (`CASCADE_SAIDA_RAPIDA`) no `cascade-motion`, 4 arquivos de teste novos. Verificado: `tsc --noEmit` 0 erros, 322 testes em 18 arquivos verdes, `audit:ratchet-any-tests` e `audit:ratchet-warnings` sem regressão.
- **#873** — **Banco de Horas** completo: `BancoHorasPage` reescrita (filtros de período, 5 KPIs, extrato paginado com busca/ordenação/tipo, cascata de detalhe, rosca de situação, barras de totais, alerta de saldo negativo, evolução do saldo e CSV) + 21 módulos do fecho transitivo que não existiam na main (11 `components/banco-horas`, `horasExtrasComum`, `FiltroSelectConteudo`, `tooltipGrafico`, `revelacaoGrafico`, `entradaGlobal`, `progressMotion`, `donutMotion`, `estruturaAnimacoes`, `linha-tabela-hover`, `useEntradaCardConcluida`) + `bancoHorasService.listarDaEmpresa` tipado. Verificado: `tsc 0`, `typecheck:tests 0`, eslint/prettier limpos, ratchets verdes, 60 testes vitest, build ok e `css_total_kb 359 ≤ 362` / `js_total_kb 7999 ≤ 8000`.

## 6. Fila de resgate (valor × risco)

1. **Ponto / geofencing** — `src/utils/pontoGeofencing.ts`, `src/hooks/usePontoGeofencing.ts`, `PontoGeofencingPainel`, `PontoGeoMapa`, `PontoGeoRegistros` + testes. Entra junto com os consumidores; isolado vira código morto.
2. **Turnos** — `src/components/turnos/*` (30 arquivos novos) + `turnoService`, grade semanal e seletor de cor.
3. **~~Banco de horas~~ — RESGATADO na #873.** `src/components/banco-horas/*` (11 arquivos) + `exportarBancoHoras` + os primitivos de UI do port que a página consome (`tooltipGrafico`, `revelacaoGrafico`, `entradaGlobal`, `progressMotion`, `donutMotion`, `estruturaAnimacoes`, `linha-tabela-hover`, `useEntradaCardConcluida`, `horasExtrasComum`, `FiltroSelectConteudo`).
4. **Horas extras** — refatora `HorasExtrasPage` em componentes (`horas-extras/*`, 19 arquivos com 14 testes). Exige revisar a página modificada, não substituí-la.
5. **104 `supabase/migrations` divergentes** — DDL: exige autorização explícita antes de qualquer `apply` (as 316 versões do ledger sem fonte local já têm placeholder no-op desde a #865).

## 7. Auditoria das refs remotas

- `origin/pr/304` … `origin/pr/321` (9 refs): **todas as PRs estão `MERGED`**. O conteúdo está na main via _squash-merge_, por isso `git merge-base --is-ancestor` dá falso negativo. Provas por `git log origin/main --grep='(#N)'`: 304→`e8febd257`, 315→`57054a5ff`, 316→`231cdb74b`, 320→`a90a4feaf`, 321→`529a8d6c5`, 319→`e1a18efd7` (squash de #309+#313+#317+#319).
- `origin/automation/inventario-estado`: 1 commit de bot, só `inventario/estado/*.json`.
- `origin/contexto`: artefatos de bot (`chore(contexto): N fonte(s) regerada(s)`), sem código de aplicação.

## 8. Fecho transitivo — o método que fechou a conta

Contar arquivos e procurar consumidores por `grep` não responde "isto está vivo?". A pergunta certa é: **este arquivo é alcançável a partir de `src/main.tsx`?** Se não for, ele nunca é carregado em produção, por mais bem escrito que esteja.

Método (`/tmp/fecho5.py`): BFS nos imports a partir de `src/main.tsx`, lendo `from '...'` e `import('...')`, resolvendo `@/` → `src/` e caminhos relativos (`base`, `base.ts`, `base.tsx`, `base/index.*`), e comparando cada arquivo alcançado com `git ls-tree -r --name-only origin/main`.

Resultados:

| Árvore                            | Alcançáveis                       | Observação                                     |
| --------------------------------- | --------------------------------- | ---------------------------------------------- |
| `origin/main`                     | 1031 de 1892                      | baseline saudável                              |
| Port do Muri (`296a01873`)        | 1145 de 2047                      | 73 dos 170 arquivos da fila **estão vivos lá** |
| #872 (119 arquivos novos)         | 0 dos 119                         | tudo órfão na árvore da main                   |
| Fecho da `BancoHorasPage` na #873 | 261 no total, 21 ausentes na main | 21 portados, todos vivos                       |

Conclusão que mudou a estratégia: o Muri **reescreveu as páginas** (M, com remoções) para montar os componentes novos. Portar a fila isolada criaria código morto (foi o que a #872 fazia); portar as páginas inteiras, sem comparar, removia comportamento da main. O caminho correto é **portar por feature viva**: pegar a página que consome o conjunto, calcular o fecho transitivo dela e trazer exatamente os módulos que faltam na main — foi o que a #873 fez com Banco de Horas.

A #872 foi **fechada sem merge e sem apagar a branch**: os 119 arquivos ficam preservados no remoto (`8bdf70d5e`) para resgate incremental, um por feature. Nenhuma página de produção do port é superconjunto puro da main (todas têm deleções), então cada resgate restante exige comparação funcional — não substituição cega.
