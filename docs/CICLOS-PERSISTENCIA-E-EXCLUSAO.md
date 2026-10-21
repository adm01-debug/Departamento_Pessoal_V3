# Ciclos de avaliação — persistência real e exclusão segura

## Persistência

- `NovoCicloDialog` → mutation `criarCiclo` → `avaliacaoService.criarCiclo()`.
- A flag `VITE_DESEMPENHO_MOCK` é **somente visual**: não redireciona a criação
  de ciclo para `localStorage`.
- A gravação só é considerada concluída quando o Supabase devolve o registro
  inserido (`id` UUID). Sem confirmação, a interface mostra erro e não sucesso.
- O ciclo criado é selecionado no seletor e a query `ciclos_avaliacao` é
  invalidada; F5, logout/login e outra sessão leem o mesmo registro.
- O serviço confere `pode_gerir_avaliacoes()` antes de criar/excluir; a policy
  do banco também exige esse papel na migration nova.

## Separação entre real e demonstrativo

- A chave é o `id`: `mock-*`/`demo-*` são demonstrativos; UUID é real.
- Ciclos demonstrativos continuam existindo, mas aparecem com o sufixo
  `(demonstração)` e ficam depois dos reais na listagem.
- Nenhum ciclo é excluído automaticamente por nome repetido.

## Exclusão

- Ação “Excluir ciclo” exibida somente para `admin`/`rh`.
- Confirmação obrigatória (`AlertDialog`).
- Antes do DELETE, `contarDependenciasCiclo()` verifica feedbacks,
  consolidações, aprovações, validações de Potencial e metas.
- Com qualquer dependência, a exclusão é bloqueada, nada é apagado em cascata
  e a interface informa as contagens.
- Migration `20261026090000_ciclos_exclusao_autorizada.sql` (não aplicada)
  reforça no banco: policy de INSERT/DELETE por RH/admin e trigger
  `BEFORE DELETE` que recusa ciclos com dependências.

## Exclusão pelo seletor (lixeira)

- O seletor de ciclo (`Select` do topo) exibe uma lixeira discreta à direita de
  cada ciclo para usuários `admin`/`rh`.
- A lixeira aparece no hover da linha, recebe foco por `Tab` e abre a
  confirmação com `Enter`/`Espaço`. Clicar nela não seleciona o ciclo.
- Ciclos demonstrativos usam o mesmo controle para **ocultar** a linha da
  vitrine (`excluirRegistroDemo`), sem alterar os mocks originais.
- A confirmação mostra o nome do ciclo e reutiliza a mutation `excluirCiclo`.
- Após excluir/ocultar, a query é invalidada e o seletor é atualizado; a
  alteração sobrevive ao F5 e ao próximo login (banco para reais,
  `localStorage` para demonstrativos).
- Evidência: `tmp-integracao-ninebox/lixeira-seletor.png` e
  `tmp-integracao-ninebox/relatorio-lixeira.json`.

## Evidência executada

- `_tmp-validar-ciclos-persistencia.mjs` (Playwright + Supabase real,
  conta `admin@teste.local`): criação pela UI, INSERT confirmado, F5, nova
  sessão, exclusão vazia, bloqueio com meta, perfil não autorizado sem ação.
- Log: `tmp-integracao-ninebox/execucao-ciclos.log`
- Relatório: `tmp-integracao-ninebox/relatorio-ciclos.json`
- Os ciclos/metas criados pelo script são removidos no `finally`; nenhum
  registro existente é apagado.
