# Hooks, services e lib

A muri e um retrato do codigo de 30/07/2026 com seis meses de trabalho de layout/dossie em cima; a main avancou 582 commits depois disso e ganhou validacao Zod, tipagem estrita, guardas de isolamento por empresa e redacao de PII nos logs — coisas que a muri nunca teve. Por isso quase todo arquivo "modificado" da muri parece diferente mas e na verdade mais velho: substituir seria perder seguranca e tipagem. O ganho real da muri aqui esta em funcionalidade que a main nao tem: logout que nao apaga o trabalho local, recontratacao de ex-colaborador, edicao de contato/formacao e holerites no dossie, escala de trabalho por dia, kits de onboarding, permissoes por tela e cerca de 700 linhas de teste aproveitaveis.

| decisão             | esforço | arq. | grupo                                                                                                       |
| ------------------- | ------- | ---- | ----------------------------------------------------------------------------------------------------------- |
| RECUPERAR_COM_MERGE | baixo   | 4    | G1 — Logout nao-destrutivo e sessao sincronizada entre abas                                                 |
| RECUPERAR           | baixo   | 2    | G2 — Testes do Nine-Box sobre codigo byte-identico                                                          |
| RECUPERAR_COM_MERGE | medio   | 2    | G3 — Guardas de conta bancaria (tenant + conta principal unica)                                             |
| RECUPERAR_COM_MERGE | medio   | 6    | G4 — pageSize configuravel nos dropdowns e reset de pagina no CRUD generico                                 |
| RECUPERAR_COM_MERGE | alto    | 6    | G5 — Recontratacao de ex-colaborador e historico de vinculos                                                |
| RECUPERAR_COM_MERGE | medio   | 3    | G6 — Busca de colaborador por matricula/cargo/CPF formatado e dropdowns de filtro reais                     |
| RECUPERAR_COM_MERGE | medio   | 5    | G7 — Escala de trabalho por dia, saldo de banco de horas e ponto da semana no dossie                        |
| RECUPERAR_COM_MERGE | alto    | 5    | G8 — Dossie: editar contato de emergencia e formacao, ver holerites, ferias, lotacoes e campos customizados |
| RECUPERAR           | alto    | 16   | G9 — Dossie: timeline/historico, compliance, SST, desenvolvimento e proximos eventos                        |
| RECUPERAR           | medio   | 3    | G10 — Upload de documentos do colaborador para bucket privado                                               |
| RECUPERAR           | alto    | 4    | G11 — Kits de onboarding e jornada efetiva do colaborador                                                   |
| RECUPERAR           | medio   | 1    | G12 — Permissoes por recurso/acao lidas da matriz do banco                                                  |
| RECUPERAR_COM_MERGE | baixo   | 2    | G13 — Consentimentos LGPD filtrados por colaborador                                                         |
| RECUPERAR_COM_MERGE | alto    | 3    | G14 — Multiplas lotacoes por colaborador (exige DDL — decisao do dono)                                      |
| RECUPERAR_COM_MERGE | alto    | 16   | G15 — Modo demonstracao ligado aos hooks (dado ficticio ja existe na main, sem consumidor)                  |
| RECUPERAR           | baixo   | 1    | G16 — Cascata de entrada dos cards (polimento visual)                                                       |
| JA_EM_MAIN          | baixo   | 5    | G17 — Ja resolvido na main por outro caminho (descartar a versao da muri)                                   |
| OBSOLETO            | baixo   | 20   | G18 — Versao antiga da muri: descartar (traria regressao de seguranca, tipagem ou schema)                   |

## G1 — Logout nao-destrutivo e sessao sincronizada entre abas

`RECUPERAR_COM_MERGE` · esforço baixo · 4 arquivos

**Valor para o negócio.** Hoje, quando a sessao expira por inatividade (30 min) ou o monitor de seguranca derruba o usuario, o sistema apaga TUDO do navegador: a fila offline do ponto (`ponto_offline_queue`), rascunhos de formulario, tema e idioma. Batidas de ponto registradas offline podem ser perdidas antes de subir. A muri troca isso por limpeza cirurgica de token, e ainda impede que uma aba considere o usuario inativo enquanto ele trabalha em outra aba do mesmo sistema.

**Risco de regressão.** Baixo. useSessionTimeout.ts da main e identico ao merge-base, entao o arquivo da muri pode entrar quase inteiro. O unico cuidado: a muri remove a limpeza do IndexedDB `ponto-offline-db` e do Cache API — e esse e exatamente o ponto (preservar a fila offline), mas significa que dados do usuario anterior sobrevivem no mesmo navegador. Mitigar mantendo a limpeza do fingerprint de sessao (SESSION_FP_KEY), que a muri ja faz, e verificando que a troca de usuario revalida o escopo de empresa por JWT.

**Evidência.** main/src/hooks/useSessionTimeout.ts:32 `try { localStorage.clear(); } catch { /* private browsing */ }` e main/src/hooks/useSecurityMonitor.ts:26 `localStorage.clear();`. `git rev-parse 5ddbe25:src/hooks/useSessionTimeout.ts` == `origin/main:...` (MAIN_INTOCADA) — a main nunca mexeu nesse arquivo desde o merge-base, so a muri. muri/src/lib/sessaoLocal.ts define AUTH_STORAGE_KEY=/^sb-.+-auth-token(?:-user\|-code-verifier)?$/ e remove SO token/verifier/fingerprint.

**Plano.** 1) Criar src/lib/sessaoLocal.ts copiando literalmente de `git show origin/muri:src/lib/sessaoLocal.ts` (31 linhas, sem dependencias). 2) Substituir src/hooks/useSessionTimeout.ts pela versao da muri (`git show origin/muri:src/hooks/useSessionTimeout.ts`) — a main nao divergiu desse arquivo, nao ha o que preservar. 3) Em src/hooks/useSecurityMonitor.ts da MAIN (nao da muri — a main ganhou 43/28 linhas ali depois), aplicar apenas duas mudancas: remover a constante local `SESSION_FP_KEY` e importar `{ SESSION_FP_KEY, limparSessaoLocal }` de '@/lib/sessaoLocal'; trocar o bloco `localStorage.clear() / sessionStorage.clear() / indexedDB.deleteDatabase('ponto-offline-db') / caches.keys()...` por uma chamada a `limparSessaoLocal()`. Nao tocar no resto do useSecurityMonitor. 4) Copiar src/hooks/**tests**/useSessionTimeout.test.ts da muri (acrescenta 2 casos e os resets de localStorage/sessionStorage no beforeEach). 5) Verificar: `npx vitest run src/hooks/__tests__/useSessionTimeout.test.ts` e `npm run typecheck`. 6) Checar se src/contexts/AuthContext.tsx:298 da main tambem chama localStorage.clear() no logout manual — se sim, anotar em Proximos passos (fora deste escopo).

<details><summary>Arquivos (4)</summary>

- `src/lib/sessaoLocal.ts`
- `src/hooks/useSessionTimeout.ts`
- `src/hooks/__tests__/useSessionTimeout.test.ts`
- `src/hooks/useSecurityMonitor.ts`

</details>

## G2 — Testes do Nine-Box sobre codigo byte-identico

`RECUPERAR` · esforço baixo · 2 arquivos

**Valor para o negócio.** Protege a guarda de escrita do Nine-Box — o mecanismo que impede que avaliacoes de demonstracao sejam gravadas como reais e que aprovacoes de gestor sejam burladas. O codigo ja esta em producao na main; hoje ele nao tem esses testes no CI, ou seja, qualquer mexida futura no fluxo de avaliacao pode quebrar a aprovacao sem ninguem notar.

**Risco de regressão.** Nenhum para o runtime: sao apenas arquivos de teste, nada de producao muda. O unico risco e um teste nao passar de primeira por diferenca de ambiente de mock; nesse caso o diagnostico e local e barato.

**Evidência.** `git diff --stat origin/main origin/muri -- src/services/avaliacaoService.ts` nao imprime nada: o service e byte-identico (mesmo blob) nas duas pontas. Todas as dependencias dos dois testes existem na main: src/components/avaliacao/escritaOperacional.ts:79 `export class EscritaBloqueadaError`, src/components/avaliacao/nineBoxModo.ts, src/test/deepChain.ts e src/mocks/desempenhoMock.ts (todos MAIN_OK). 551 linhas de teste (239+312).

**Plano.** 1) Copiar os dois arquivos como estao: `git show origin/muri:src/services/__tests__/avaliacaoAprovacaoService.test.ts` e `.../avaliacaoCriacaoSegura.test.ts`. 2) Rodar `npx vitest run src/services/__tests__/avaliacaoAprovacaoService.test.ts src/services/__tests__/avaliacaoCriacaoSegura.test.ts`. 3) Se algum caso falhar, NAO alterar avaliacaoService.ts (ele e identico nas duas pontas, logo a falha e do mock do teste): ajustar so o mock do teste e reportar o caso exato. 4) Rodar tambem src/services/**tests**/avaliacaoService.test.ts para garantir que nao houve colisao de vi.mock entre arquivos. Este grupo entra sozinho, em PR propria, antes dos demais — e o de menor risco e serve de aquecimento.

<details><summary>Arquivos (2)</summary>

- `src/services/__tests__/avaliacaoAprovacaoService.test.ts`
- `src/services/__tests__/avaliacaoCriacaoSegura.test.ts`

</details>

## G3 — Guardas de conta bancaria (tenant + conta principal unica)

`RECUPERAR_COM_MERGE` · esforço medio · 2 arquivos

**Valor para o negócio.** Conta bancaria errada e salario na conta errada. Hoje da para cadastrar duas contas 'principais' para o mesmo colaborador (qual delas a folha usa fica indefinido) e da para gravar uma conta sob o empresa_id que a tela mandar, sem conferir se aquele colaborador e daquela empresa.

**Risco de regressão.** A versao da muri NAO tem o `validateInput(contaBancariaSchema)` nem a tipagem `Insertable<'contas_bancarias'>` que a main ganhou — copiar o arquivo da muri inteiro perderia a validacao de schema. A assinatura tambem muda: muri usa `criarContaBancaria(conta, empresaId)`, main usa `criarContaBancaria(conta)`; todo chamador precisa passar o empresaId. Resto do arquivo da muri e regressao de tipagem (DataRecord/any no lugar de Tables<>) e nao deve entrar.

**Evidência.** main/src/services/tabelasReferenciaService.ts `criarContaBancaria(conta: Insertable<'contas_bancarias'>)` faz apenas `validateInput(contaBancariaSchema, ...)` + insert; `grep -n principal` nesse arquivo da main retorna um unico hit (linha 96, um `.order('principal')`) — nao existe checagem de conta principal duplicada nem conferencia de que o colaborador pertence a empresa, e o `empresa_id` vem do payload do chamador. A versao da muri confere `colaboradores.empresa_id === empresaId`, bloqueia a segunda conta `principal` por contagem e injeta `empresa_id: empresaId` no insert. O teste da muri traz 9 casos que a main nao tem (ex.: 'bloqueia a criacao de uma segunda conta principal para o mesmo colaborador', 'injeta empresa_id no insert e ignora qualquer empresa_id vindo do chamador', 'rejeita quando o colaborador pertence a outra empresa').

**Plano.** 1) Partir do arquivo da MAIN. 2) Mudar a assinatura para `criarContaBancaria(conta: Insertable<'contas_bancarias'>, empresaId: string)` e manter `validateInput(contaBancariaSchema, conta, 'criarContaBancaria')` como primeira linha. 3) Inserir, depois do validateInput e antes do insert, os tres blocos da muri (copiar de `git show origin/muri:src/services/tabelasReferenciaService.ts`, funcao criarContaBancaria): (a) `if (!empresaId) throw`; (b) exigir colaborador_id e conferir `colaboradores.empresa_id === empresaId`; (c) se `conta.principal`, contar `contas_bancarias` com colaborador_id+empresa_id+principal=true e lancar 'Este colaborador ja possui uma conta bancaria principal.' se count>0. 4) No insert, forcar `{ ...conta, empresa_id: empresaId }` DEPOIS do spread, mantendo o `validateTablePayload`. 5) `git grep -n criarContaBancaria -- src` e atualizar cada chamador para passar empresaId (hooks/useTabelasReferencia.ts e a aba ContasBancariasTab.tsx). 6) Copiar os 9 casos novos do teste da muri para dentro do src/services/**tests**/tabelasReferenciaService.test.ts da MAIN (nao substituir o arquivo: a main tem 1 caso que a muri nao tem). 7) Verificar: `npx vitest run src/services/__tests__/tabelasReferenciaService.test.ts` e `npm run typecheck`.

<details><summary>Arquivos (2)</summary>

- `src/services/tabelasReferenciaService.ts`
- `src/services/__tests__/tabelasReferenciaService.test.ts`

</details>

## G4 — pageSize configuravel nos dropdowns e reset de pagina no CRUD generico

`RECUPERAR_COM_MERGE` · esforço medio · 6 arquivos

**Valor para o negócio.** Dropdowns de filtro de Cargo, Departamento e Local de Trabalho hoje so veem a primeira pagina (15 e 10 itens) — empresa com 40 cargos tem filtro incompleto, e o usuario conclui que o cargo 'nao existe'. E ao mudar 'linhas por pagina' de 10 para 50 estando na pagina 4, o usuario cai numa pagina que nao existe mais e ve lista vazia.

**Risco de regressão.** ALTO se o arquivo da muri for copiado. O useGenericCrud da muri perde, em relacao a main: o guard `requireEmpresaId` que lanca erro quando falta empresaId em atualizar/excluir (isolamento de tenant), a injecao automatica de `empresa_id` no create via TABLE_COLUMNS, o `empresa_id` no auditLogger.log do delete, o reset de pagina feito durante o render (a muri usa useEffect, que dispara uma requisicao intermediaria com filtro novo e pagina velha) e os exports criarMutate/atualizarMutate/excluirMutate. Os tres hooks da muri tambem trocam tipos reais (`Cargo`, `Tables<'locais_trabalho'>`, `DesligamentoComColaborador`) por `any`/`unknown`, e useDepartamentos da muri REMOVE o `empresaId` do retorno (a main o devolve).

**Evidência.** main/src/hooks/useGenericCrud.ts nao tem a opcao `enabled` (`git show origin/main:src/hooks/useGenericCrud.ts \| grep -n enabled` nao retorna nada) e devolve `setPageSize` cru, sem reiniciar a pagina. A muri adiciona `enabled?: boolean` na interface de opcoes e `alterarPageSize` (`setPageSize(tamanho); setPage(1);`). Nos tres hooks a muri adiciona `options.pageSize ?? <default>` e os testes 'uses pageSize 15 by default' / 'allows overriding pageSize ... without changing the default'.

**Plano.** 1) Em src/hooks/useGenericCrud.ts da MAIN, fazer apenas duas adicoes cirurgicas: (a) acrescentar `enabled?: boolean;` na interface UseGenericCrudOptions, desestruturar `enabled = true` e passar `enabled` para o useQuery; (b) criar `const alterarPageSize = useCallback((tamanho: number) => { setPageSize(tamanho); setPage(1); }, []);` e no return trocar `setPageSize,` por `setPageSize: alterarPageSize,`. NAO remover requireEmpresaId, injectEmpresaIdOnCreate, TABLE_COLUMNS, os guards de empresaId, o `void` nas promises nem os *Mutate. 2) Em useCargos.ts / useDepartamentos.ts / useLocaisTrabalho.ts da MAIN, acrescentar a interface `UseXOptions { pageSize?: number }`, o parametro `options: UseXOptions = {}`, trocar `initialPageSize: 15` por `options.pageSize ?? 15` (10 em Departamentos e Locais) e, em useCargos/useDepartamentos, acrescentar `enabled: !!empresaId`. Manter os tipos da main (`type Cargo`, `Tables<'locais_trabalho'>`, `Record<string, unknown>` no criar) e manter o `empresaId` no retorno de useDepartamentos. 3) Acrescentar aos testes da main os 2 casos novos de cada arquivo (copiar de `git show origin/muri:src/hooks/__tests__/useCargos.test.ts`, final do describe). 4) Verificar: `npx vitest run src/hooks/__tests__/useCargos.test.ts src/hooks/__tests__/useDepartamentos.test.ts` e os testes de qualquer hook que use useGenericCrud; `npm run typecheck`. 5) O consumo do pageSize nos dropdowns esta nos componentes/paginas (area de componentes) — sem eles este grupo e so capacidade latente, nao codigo morto (os hooks continuam usados).

<details><summary>Arquivos (6)</summary>

- `src/hooks/useGenericCrud.ts`
- `src/hooks/useCargos.ts`
- `src/hooks/useDepartamentos.ts`
- `src/hooks/useLocaisTrabalho.ts`
- `src/hooks/__tests__/useCargos.test.ts`
- `src/hooks/__tests__/useDepartamentos.test.ts`

</details>

## G5 — Recontratacao de ex-colaborador e historico de vinculos

`RECUPERAR_COM_MERGE` · esforço alto · 6 arquivos

**Valor para o negócio.** Recontratar alguem que ja trabalhou na empresa e rotina de DP. Hoje a unica saida e criar um colaborador novo — o que duplica CPF (e a main tem indice unico `colaboradores_empresa_cpf_key`, entao provavelmente falha) e perde o historico. Com os vinculos, o sistema passa a saber quantas passagens a pessoa teve, a primeira admissao e a admissao atual — informacao que a rescisao e o calculo de tempo de casa precisam.

**Risco de regressão.** vinculoService da muri estende BaseService com `requireEmpresaId: false` (a tabela `vinculos` nao tem empresa_id proprio; o isolamento vem da RLS por join com colaboradores) — e preciso CONFIRMAR na main que a policy `vinculos_tenant_all` existe antes de confiar nisso, senao abre vazamento entre empresas. rescisaoService.ts da muri e, no resto, versao antiga (a main ganhou 133/68 linhas): nao substituir. A muri usa `supabaseBase` em vez de `supabase` no BaseService, o que contorna o gateway external-db-bridge — NAO trazer isso. As telas que acionam a recontratacao (RecontratarColaboradorDialog.tsx, ColaboradorTable.tsx) sao exclusivas da muri; sem elas o metodo fica sem entrada na UI.

**Evidência.** `git grep -ln recontrat origin/main -- src` retorna somente src/mocks/colaboradoresMock.ts: a main nao tem fluxo de recontratacao. A tabela `vinculos` EXISTE em producao (confirmado em supabase_db_list_tables, 390 tabelas; `vinculos` presente) e esta em origin/main:src/integrations/supabase/types.ts:20724. muri/src/services/colaboradorService.ts `async recontratar(id, dados, empresaId)` reativa o colaborador (status='ativo', data_desligamento=null) e chama `vinculoService.criarVinculoInicial(id, data_admissao, 'Readmissao')`. Os 2 casos so-muri de rescisaoService.test.ts sao 'fecha o vinculo em aberto do colaborador apos confirmar o pagamento' e 'bloqueia o pagamento (e nao fecha vinculo) se a rescisao nao estiver assinada pelas duas partes'.

**Plano.** 1) Antes de codar, confirmar por leitura no banco que existe policy RLS em `public.vinculos` isolando por colaborador/empresa (supabase_db_list_policies, tabela vinculos). Se nao existir, PARAR e chamar o dono: sem a policy, `requireEmpresaId: false` vaza dados entre empresas. 2) Copiar src/services/vinculoService.ts da muri, trocando o import de `supabaseBase` por `supabase` (o cliente padrao da main, que passa pelo gateway) e trocando `BaseService<VinculoRow>` para usar os tipos gerados `Tables<'vinculos'>` quando existirem; manter os mocks (`mockOr(getMockVinculosPorColaborador(...))`) so se o grupo G15 tambem entrar, senao remover as 3 linhas de mock. 3) Copiar src/hooks/useVinculos.ts da muri. 4) No src/services/colaboradorService.ts da MAIN, acrescentar apenas o metodo `recontratar` (copiar de `git show origin/muri:src/services/colaboradorService.ts`, bloco `async recontratar`) e o import de vinculoService; nao tocar no resto. 5) No src/services/rescisaoService.ts da MAIN, acrescentar apenas a chamada de fechamento de vinculo apos a confirmacao de pagamento — localizar com `git diff 5ddbe258 origin/muri -- src/services/rescisaoService.ts` (sao 6 linhas adicionadas) e reaplicar sobre a versao da main, preservando as validacoes de assinatura que a main ja tem. 6) Copiar src/services/**tests**/vinculoService.test.ts e colaboradorService.recontratacao.test.ts da muri; acrescentar os 2 casos novos ao rescisaoService.test.ts da MAIN (a main tem 11 casos que a muri nao tem — nao substituir o arquivo). 7) Verificar: `npx vitest run src/services/__tests__/vinculoService.test.ts src/services/__tests__/colaboradorService.recontratacao.test.ts src/services/__tests__/rescisaoService.test.ts` e `npm run typecheck`. 8) Este grupo so vira funcionalidade visivel com o dialogo de recontratacao da area de componentes — combinar a ordem com esse agente.

<details><summary>Arquivos (6)</summary>

- `src/services/vinculoService.ts`
- `src/hooks/useVinculos.ts`
- `src/services/__tests__/vinculoService.test.ts`
- `src/services/__tests__/colaboradorService.recontratacao.test.ts`
- `src/services/rescisaoService.ts`
- `src/services/__tests__/rescisaoService.test.ts`

</details>

## G6 — Busca de colaborador por matricula/cargo/CPF formatado e dropdowns de filtro reais

`RECUPERAR_COM_MERGE` · esforço medio · 3 arquivos

**Valor para o negócio.** Buscar colaborador pela matricula (o jeito como o DP de fato identifica a pessoa) nao funciona hoje. Colar um CPF formatado com hifen tambem nao acha ninguem. E os filtros de Departamento/Cargo da lista de colaboradores, quando ligados as tabelas mestre, mostram opcoes que nao correspondem a nenhum colaborador (ou ficam vazios) porque essas colunas sao texto livre em `colaboradores`.

**Risco de regressão.** Nao copiar o arquivo da muri: a main ganhou `registrarAcessoPII('colaboradores','select',...)` (trilha LGPD art.37 da leitura de PII em lote), o tratamento dos erros de indice unico `colaboradores_empresa_cpf_key`/`colaboradores_empresa_matricula_key`, e tipagem `Colaborador` onde a muri usa `any`. A sanitizacao contra injecao no `or()` JA existe na main e e identica — nao e ganho. `listarOpcoesFiltro` da muri usa `supabaseBase`: trocar por `supabase`. Ampliar o `or()` para cargo/departamento aumenta o custo da query: confirmar que ha indice ou aceitar o custo com pageSize 25.

**Evidência.** main/src/services/colaboradorService.ts:25 seleciona `'id, nome_completo, cpf, email, status, data_admissao, empresa_id, matricula, foto_url, telefone'` (sem cargo/departamento) e a linha 35 busca so `nome_completo.ilike, cpf.ilike, email.ilike` sobre `s = search.replace(/[%_.,()]/g,'')` — o hifen nao e removido, logo buscar '123.456.789-00' gera `cpf.ilike.%123456789-00%` e nao casa com o CPF gravado so com digitos. A muri acrescenta `const cpfDigits = search.replace(/\D/g,'')`, inclui matricula/cargo/departamento no `or()` e seleciona as colunas cargo e departamento. `listarOpcoesFiltro` so existe na muri (muri/src/services/colaboradorService.ts:101). Os 9 casos so-muri do teste incluem 'normalizes a formatted CPF search (dots and dash) to digits only' e 'searches by matricula, cargo and departamento in addition to nome/email'.

**Plano.** 1) Partir do colaboradorService.ts da MAIN. No metodo `listar`, dentro do `if (search)`: manter `const s = search.replace(/[%_.,()]/g,'')`, acrescentar `const cpfDigits = search.replace(/\D/g,'')`, montar `orParts: string[]` com nome_completo/email/matricula/cargo/departamento usando `s` e com `cpf.ilike.%${cpfDigits}%` apenas quando cpfDigits for nao-vazio, e aplicar `query.or(orParts.join(','))` (copiar a forma exata de `git show origin/muri:src/services/colaboradorService.ts` linhas ~63-80). 2) Acrescentar `, cargo, departamento` a constante `columns` da linha 25. 3) Copiar o metodo `listarOpcoesFiltro` da muri para o service da main, trocando `supabaseBase` por `supabase` e removendo o ramo de mock se G15 nao entrar. 4) Em src/hooks/useColaboradores.ts da MAIN, acrescentar a useQuery `['colaboradores-opcoes-filtro', empresaId]` chamando `colaboradorService.listarOpcoesFiltro(empresaId!)` e expor `departamentosDisponiveis`/`cargosDisponiveis` no retorno; manter `empresaId` nas filters e o `criar` tipado com Record<string, unknown> da main. 5) Acrescentar os 9 casos novos ao src/services/**tests**/colaboradorService.test.ts da MAIN (a main tem 7 casos proprios — somar, nao substituir). 6) Verificar: `npx vitest run src/services/__tests__/colaboradorService.test.ts` e `npm run typecheck`. 7) ATENCAO DE ORDEM: este grupo e o G5 editam o mesmo arquivo (src/services/colaboradorService.ts). Fazer G6 primeiro e G5 depois, ou os dois na mesma PR.

<details><summary>Arquivos (3)</summary>

- `src/services/colaboradorService.ts`
- `src/hooks/useColaboradores.ts`
- `src/services/__tests__/colaboradorService.test.ts`

</details>

## G7 — Escala de trabalho por dia, saldo de banco de horas e ponto da semana no dossie

`RECUPERAR_COM_MERGE` · esforço medio · 5 arquivos

**Valor para o negócio.** Permite ver e corrigir a escala de um colaborador em um dia especifico — hoje o sistema so sabe criar escala, nao consultar nem alterar, o que deixa erro de escala sem conserto pela tela. `obterEscalaDoDia` e justamente o que decide entre UPDATE e INSERT ao salvar, evitando escalas duplicadas no mesmo dia. Os outros dois hooks expoem saldo de banco de horas e a semana de ponto do colaborador reaproveitando servico que a main ja tem (ganho sem codigo novo de banco).

**Risco de regressão.** Os tres metodos da muri usam `any` no retorno e no payload; na main (TS strict, tsconfig raiz = CI) isso reprova o lint/typecheck — precisam ser tipados com `Tables<'escalas_trabalho'>`. O resto do turnoService.ts da muri e versao antiga (a main ganhou 40/25 linhas): nao substituir o arquivo. useNovasTabelas.ts da muri tambem e versao antiga em relacao a main (a main ganhou 67/22): extrair so os 3 hooks.

**Evidência.** Comparando os metodos dos dois turnoService, so existem na muri: `buscarEscalaAtual`, `obterEscalaDoDia`, `atualizarEscala` (a main tem apenas criarEscala). As tabelas `escalas_trabalho` e `turnos` existem em producao (supabase_db_list_tables). Os 3 hooks novos de useNovasTabelas (`useEscalaAtual`, `useRegistrosPontoSemana`, `useSaldoBancoHoras`) chamam servicos que JA existem na main: origin/main:src/services/bancoHorasService.ts:24 `async getSaldo(colaboradorId, empresaId)` e origin/main:src/services/pontoService.ts:142 `async buscarRegistrosSemana(colaboradorId)`. O teste da muri traz 8 casos so-muri para turnoService ('filters by colaborador_id, empresa_id and the exact date', 'returns null when there is no escala for that date', 'updates only turno_id and returns the escala') e 3 para useNovasTabelas.

**Plano.** 1) No src/services/turnoService.ts da MAIN, acrescentar os tres metodos copiados de `git show origin/muri:src/services/turnoService.ts` (buscarEscalaAtual, obterEscalaDoDia, atualizarEscala), mantendo os `if (!empresaId) throw` que a muri ja traz e substituindo cada `any` pelos tipos gerados (`Tables<'escalas_trabalho'>`, `TablesUpdate<'escalas_trabalho'>`). Nao tocar nos metodos existentes. 2) No src/hooks/useNovasTabelas.ts da MAIN, acrescentar os 3 hooks novos: `useSaldoBancoHoras` (chama bancoHorasService.getSaldo), `useRegistrosPontoSemana` (pontoService.buscarRegistrosSemana) e `useEscalaAtual` (turnoService.buscarEscalaAtual) — copiar de `git show origin/muri:src/hooks/useNovasTabelas.ts`, removendo os ramos `mockOr(...)` se G15 nao entrar. 3) Em src/hooks/index.ts da MAIN, acrescentar `useSaldoBancoHoras, useRegistrosPontoSemana, useEscalaAtual` ao export de './useNovasTabelas' (o bloco de export ja existe; e so somar os 3 nomes). 4) Acrescentar os 8 casos so-muri ao src/services/**tests**/turnoService.test.ts da MAIN e os 3 ao src/hooks/**tests**/useNovasTabelas.test.ts da MAIN (a main tem 22 casos proprios nesse ultimo — somar, nunca substituir). 5) Verificar: `npx vitest run src/services/__tests__/turnoService.test.ts src/hooks/__tests__/useNovasTabelas.test.ts` e `npm run typecheck`. 6) As telas que consomem (JornadaPontoTab, EditarJornadaDialog) sao da muri — ver G11 e a area de componentes; os hooks em si nao ficam mortos pois entram pelo index de hooks.

<details><summary>Arquivos (5)</summary>

- `src/services/turnoService.ts`
- `src/services/__tests__/turnoService.test.ts`
- `src/hooks/useNovasTabelas.ts`
- `src/hooks/__tests__/useNovasTabelas.test.ts`
- `src/hooks/index.ts`

</details>

## G8 — Dossie: editar contato de emergencia e formacao, ver holerites, ferias, lotacoes e campos customizados

`RECUPERAR_COM_MERGE` · esforço alto · 5 arquivos

**Valor para o negócio.** O dossie do colaborador hoje esta pela metade nos termos da propria regra do projeto: cria contato de emergencia e formacao academica mas nao permite editar nem corrigir; nao mostra holerites, resumo de ferias nem lotacoes; e os campos customizados que a empresa define nao tem onde guardar valor por colaborador. Sao dados que o DP consulta e corrige todos os dias.

**Risco de regressão.** Alto se feito por substituicao. colaboradorDetalhesService.ts da main tem `validateInput` (que a muri nao tem) e tipagem `Insertable`/`Updatable`; useColaboradorDetalhes.ts da main ganhou 23/12 linhas e o teste da main tem 28 casos que a muri nao tem. Em src/types/entities.ts a muri REMOVE `user_id?: string \| null` da Colaborador (vinculo com auth.users, que a main usa) e ENCURTA o union de status de Ferias de 13 valores ('solicitada','programada','aprovado','em_gozo','gozando','em_andamento','concluida','vencida','paga'...) para 4 — copiar o arquivo quebraria tudo que depende desses status. A muri tambem tipa `status` de Colaborador como `Database['public']['Enums']['status_colaborador']`, o que e melhor que o union literal da main, mas precisa de verificacao de que o enum tem os 5 valores usados.

**Evidência.** Em origin/main:src/services/colaboradorDetalhesService.ts, `grep -c` retorna 0 para atualizarContatoEmergencia, atualizarFormacao, listarLotacoes, listarFeriasColaborador e listarHoleritesColaborador — todos existem na muri. Os hooks so-muri em useColaboradorDetalhes.ts sao: useAtualizarContatoEmergencia, useAtualizarFormacao, useFeriasResumoColaborador, useHoleritesColaborador, useLotacoes, useValoresCamposCustomizados, useSalvarValorCampoCustomizado. As tabelas necessarias existem em producao: `lotacoes`, `holerites`, `ferias`, `contatos_emergencia`, `campos_customizados`, `valores_campos_customizados` (supabase_db_list_tables). O teste da muri traz 10 casos so-muri ('updates contato scoped by id and colaboradorId', 'returns lotacoes for colaborador scoped by empresa', 'normalizes competencia from the joined folha and total_liquido from liquido') e 7 no teste do hook. Em src/types/entities.ts a muri acrescenta a Colaborador: cargo_id, cbo, centro_custo_id, centro_custo, local_trabalho_id, local_trabalho, time_id, jornada_semanal, horario_entrada, horario_saida, horario_intervalo.

**Plano.** 1) No src/services/colaboradorDetalhesService.ts da MAIN, acrescentar 5 funcoes copiadas de `git show origin/muri:src/services/colaboradorDetalhesService.ts`: atualizarContatoEmergencia(id, dados, colaboradorId), atualizarFormacao(colaboradorId, id, dados), listarLotacoes(colaboradorId, empresaId), listarFeriasColaborador(colaboradorId, empresaId), listarHoleritesColaborador(colaboradorId, limite=12). Em cada uma, trocar `any`/DataRecord pelos tipos `Updatable<...>`/`Tables<...>` da main e acrescentar `validateInput`/`validateTablePayload` nas de escrita, seguindo o padrao das funcoes vizinhas da main. 2) No src/hooks/useColaboradorDetalhes.ts da MAIN, acrescentar os 7 hooks novos (copiar os blocos `export function useAtualizarContatoEmergencia\|useAtualizarFormacao\|useFeriasResumoColaborador\|useHoleritesColaborador\|useLotacoes\|useValoresCamposCustomizados\|useSalvarValorCampoCustomizado` da muri), removendo os ramos `mockOr(...)` se G15 nao entrar, e trocando `Record<string, any>` por `Record<string, unknown>`. 3) Em src/hooks/index.ts, somar os nomes novos ao bloco de export de './useColaboradorDetalhes' (ja existe; a muri acrescenta useAtualizarFormacao, useLotacoes, useValoresCamposCustomizados, useSalvarValorCampoCustomizado, useFeriasResumoColaborador, useHoleritesColaborador). 4) Em src/types/entities.ts da MAIN, acrescentar SOMENTE os 11 campos novos da interface Colaborador listados na evidencia. NAO remover `user_id`. NAO tocar na interface Ferias. Avaliar separadamente a troca de `status` para o enum do banco. 5) Somar os 10 casos so-muri ao teste do service e os 7 ao teste do hook, ambos nos arquivos da MAIN. 6) Verificar: `npx vitest run src/services/__tests__/colaboradorDetalhesService.test.ts src/hooks/__tests__/useColaboradorDetalhes.test.ts` e `npm run typecheck`. 7) As abas que consomem (EmergenciaTab, FormacaoTab, TrabalhoHierarquiaTab) — EmergenciaTab e FormacaoTab EXISTEM na main e precisam ganhar o botao de editar; TrabalhoHierarquiaTab e exclusiva da muri. Coordenar com a area de componentes.

<details><summary>Arquivos (5)</summary>

- `src/services/colaboradorDetalhesService.ts`
- `src/services/__tests__/colaboradorDetalhesService.test.ts`
- `src/hooks/useColaboradorDetalhes.ts`
- `src/hooks/__tests__/useColaboradorDetalhes.test.ts`
- `src/types/entities.ts`

</details>

## G9 — Dossie: timeline/historico, compliance, SST, desenvolvimento e proximos eventos

`RECUPERAR` · esforço alto · 16 arquivos

**Valor para o negócio.** E a historia funcional do colaborador em um lugar: promocoes, transferencias, mudancas de cargo, afastamentos e desligamento numa linha do tempo, mais os paineis de compliance (documentos/ASO vencendo), SST, desenvolvimento (metas, PDI, feedbacks, certificados, treinamentos) e 'proximos eventos' (ferias, aniversario de empresa, exame periodico). Hoje essa informacao existe espalhada em cinco tabelas e nao tem onde ser lida junta.

**Risco de regressão.** Nenhuma regressao sobre a main (sao arquivos novos), mas ATENCAO: trazido sozinho, este grupo e codigo morto — as 12 telas que consomem o timelineEvent, a HistoricoColaborador, a ComplianceTab e a SSTResumoTab sao exclusivas da muri. useDesenvolvimentoColaborador depende de onboardingJornadaService (G11) e useHistoricoColaborador depende de timelineService, vinculoService (G5) e onboardingJornadaService (G11).

**Evidência.** Nenhum desses arquivos existe na main (`git cat-file -e origin/main:<path>` falha para todos os 16). A main nao tem timeline de colaborador: `git grep -lni 'timelineevent\|timelineService\|HistoryTimeline' origin/main -- src` retorna apenas src/components/dashboard/EventTimeline.tsx (timeline do dashboard, outra coisa) e src/mocks/colaboradoresMock.ts. As tabelas que timelineService le existem todas em producao: afastamentos, desligamentos, historico_cargo, promocoes, transferencias. src/types/timelineEvent.ts tem 12 consumidores na muri, todos em src/components/colaborador-detalhes/historico/ — e NENHUM desses componentes existe na main (`git ls-tree origin/main -- src/components/colaborador-detalhes` lista 17 arquivos, nenhum em historico/).

**Plano.** 1) NAO executar este grupo isolado: ele so faz sentido junto com a area de componentes (src/components/colaborador-detalhes/historico/*, ComplianceTab, SSTResumoTab, ProximosEventosDialog) e depois de G5 (vinculoService) e G11 (onboardingJornadaService). Combinar a ordem com o agente da area de componentes antes de abrir PR. 2) Quando liberado: copiar os 16 arquivos de origin/muri sem alteracao de logica, em dois passos — primeiro os tipos e o service (src/types/timelineEvent.ts, src/services/timelineService.ts) com seu teste, depois os 5 hooks com seus 5 testes, depois os utilitarios de apresentacao (src/constants/tooltips.ts, src/lib/avatarTons.ts, src/lib/bankBrand.ts). 3) Em cada arquivo, trocar `supabaseBase` por `supabase` se aparecer, substituir `any` pelos tipos gerados e remover os ramos `mockOr(...)` se G15 nao entrar. 4) Acrescentar os nomes dos hooks de desenvolvimento ao export de src/hooks/index.ts (a muri exporta useMetasColaborador, usePDIsColaborador, useFeedbacksColaborador, useCertificadosColaborador, useTreinamentosColaborador, useOnboardingColaborador, useCompetenciasColaborador de './useDesenvolvimentoColaborador'). 5) Verificar: `npx vitest run src/hooks/__tests__/useHistoricoColaborador.test.ts src/hooks/__tests__/useProximosEventos.test.ts src/hooks/__tests__/useComplianceColaborador.test.ts src/hooks/__tests__/useSSTColaborador.test.ts src/hooks/__tests__/useDesenvolvimentoColaborador.test.ts src/services/__tests__/timelineService.test.ts`, `npm run typecheck` e `npm run lint:ci`.

<details><summary>Arquivos (16)</summary>

- `src/types/timelineEvent.ts`
- `src/services/timelineService.ts`
- `src/services/__tests__/timelineService.test.ts`
- `src/hooks/useHistoricoColaborador.ts`
- `src/hooks/__tests__/useHistoricoColaborador.test.ts`
- `src/hooks/useProximosEventos.ts`
- `src/hooks/__tests__/useProximosEventos.test.ts`
- `src/hooks/useComplianceColaborador.ts`
- `src/hooks/__tests__/useComplianceColaborador.test.ts`
- `src/hooks/useSSTColaborador.ts`
- `src/hooks/__tests__/useSSTColaborador.test.ts`
- `src/hooks/useDesenvolvimentoColaborador.ts`
- `src/hooks/__tests__/useDesenvolvimentoColaborador.test.ts`
- `src/constants/tooltips.ts`
- `src/lib/avatarTons.ts`
- `src/lib/bankBrand.ts`

</details>

## G10 — Upload de documentos do colaborador para bucket privado

`RECUPERAR` · esforço medio · 3 arquivos

**Valor para o negócio.** Hoje nao existe como anexar um documento ao dossie do colaborador — RG, CTPS, comprovante de residencia ficam fora do sistema. O service da muri resolve isso com isolamento de tenant no proprio caminho do arquivo (`empresaId/colaboradorId/categoria/uuid.ext`), nome de arquivo nao-adivinhavel, validacao de tamanho/tipo e rollback do upload quando o insert no banco falha.

**Risco de regressão.** Nenhuma sobre a main (arquivos novos). Mas o service precisa que o bucket privado exista no Storage e tenha policy de leitura por empresa — verificar antes. Trazido sem os componentes (FileUploadField, DocumentosPessoaisCard, DocumentosDigitaisCard, ColaboradorDocuments da muri) fica sem ponto de entrada; DocumentosPessoaisTab.tsx existe na main e e onde o botao de anexar deve nascer.

**Evidência.** Nenhum dos tres existe na main. `git grep -ln 'supabase.storage' origin/main -- src` nao lista NENHUM arquivo em src/components/colaborador-detalhes, e `git show origin/main:src/components/colaborador-detalhes/DocumentosPessoaisTab.tsx \| grep -n 'upload\|storage'` nao retorna nada (204 linhas, sem upload). As dependencias do service existem na main: src/utils/uploadValidation.ts (MAIN_OK, exporta validateUploadFile e sanitizeFileName).

**Plano.** 1) Verificar, por leitura (supabase_storage_list_buckets), qual bucket privado de documentos de colaborador existe no projeto frjbfeamybqsejlvmqbl e se tem policy por empresa. Se nao houver bucket, PARAR e chamar o dono (criar bucket + policy e item de banco/infra). 2) Copiar src/services/documentUploadService.ts e src/utils/documentFileType.ts de origin/muri sem alteracao (ambos sao autocontidos e ja usam o `supabase` padrao). 3) Copiar src/services/**tests**/documentUploadService.test.ts. 4) Verificar: `npx vitest run src/services/__tests__/documentUploadService.test.ts` e `npm run typecheck`. 5) Para nao ficar morto, ligar na mesma PR o botao de anexar em src/components/colaborador-detalhes/DocumentosPessoaisTab.tsx (que JA existe na main) chamando uploadDocumentFile + o criarDocumento de useDocumentos; src/utils/documentFileType.ts so e consumido pelo FileTypeIcon.tsx da muri, entao traze-lo faz sentido junto com esse componente (area de componentes).

<details><summary>Arquivos (3)</summary>

- `src/services/documentUploadService.ts`
- `src/services/__tests__/documentUploadService.test.ts`
- `src/utils/documentFileType.ts`

</details>

## G11 — Kits de onboarding e jornada efetiva do colaborador

`RECUPERAR` · esforço alto · 4 arquivos

**Valor para o negócio.** Kit de onboarding e o checklist padrao que o DP aplica a cada nova admissao (crachá, notebook, treinamentos, documentos). Hoje as tarefas existem no banco mas nao ha como criar, editar ou desativar um kit pela tela — cada admissao e montada na mao. jornadaService acrescenta a leitura da jornada efetiva do colaborador (casando carga_horaria_semanal com jornada_semanal), que e o que a aba Jornada & Ponto precisa mostrar.

**Risco de regressão.** Arquivos novos, nenhuma regressao direta. jornadaService da muri usa `any` em todos os retornos — reprova o typecheck estrito da main e precisa de tipagem com `Tables<'jornadas'>`. useJornadaOnboarding so tem um consumidor (OnboardingPage da muri); a OnboardingPage da main e outra implementacao, entao trazer o hook sem reescrever a pagina deixa codigo morto. onboardingJornadaService e dependencia de G9 (useDesenvolvimentoColaborador e useHistoricoColaborador o importam).

**Evidência.** Os tres primeiros nao existem na main. origin/main:src/pages/OnboardingPage.tsx faz consultas inline (`.from('admissoes')` na linha 25, `.from('tarefas_onboarding')` na linha 42) e nao tem CRUD de kits; `git ls-tree origin/main -- src/components/admissoes` lista 5 arquivos, sem GestaoKits.tsx nem KitOnboardingDialog.tsx. onboardingJornadaService da muri exporta listarKits, criarKit, atualizarKit, definirAtivoKit, resolverResponsaveis, listarJornadas, concluirTarefa, eventosLegiveisDaJornada, buscarJornadaDoColaborador, listarTarefasDaAdmissao. As tabelas onboarding_kits, tarefas_onboarding, admissoes, profiles e jornadas existem em producao. A unica mudanca da muri em src/services/index.ts e `+export { jornadaService } from './jornadaService';`.

**Plano.** 1) Copiar src/services/onboardingJornadaService.ts de origin/muri (397 linhas), substituindo `any` pelos tipos gerados e `supabaseBase` por `supabase` onde aparecer; confirmar que cada consulta filtra por empresa_id ou por join com colaboradores/admissoes. 2) Copiar src/services/jornadaService.ts tipando os tres metodos com `Tables<'jornadas'>`/`TablesUpdate<'jornadas'>`. 3) Acrescentar `export { jornadaService } from './jornadaService';` a src/services/index.ts da MAIN (uma linha, apos a de turnoService). 4) Copiar src/hooks/useJornadaOnboarding.ts APENAS se a mesma PR tambem trouxer a OnboardingPage/GestaoKits da muri (area de componentes/paginas); senao deixar o hook de fora e trazer so os services, que G9 ja consome. 5) Nao existe teste da muri para esses services: escrever os casos minimos de listarKits/criarKit/definirAtivoKit com o padrao deepChain usado nos outros testes do repo. 6) Verificar: `npm run typecheck`, `npm run lint:ci` e os testes novos. 7) Combinar com a area de paginas antes de abrir PR — este grupo e o ponto de entrada de UI dos kits.

<details><summary>Arquivos (4)</summary>

- `src/services/onboardingJornadaService.ts`
- `src/services/jornadaService.ts`
- `src/hooks/useJornadaOnboarding.ts`
- `src/services/index.ts`

</details>

## G12 — Permissoes por recurso/acao lidas da matriz do banco

`RECUPERAR` · esforço medio · 1 arquivos

**Valor para o negócio.** Hoje o unico controle de acesso no frontend e 'e admin ou nao' (AdminRoute). A matriz papel->recurso->acao ja esta criada e semeada no banco e nunca foi lida pela aplicacao: telas e botoes que deveriam ser restritos por papel aparecem para todo mundo. Com o hook, a interface passa a respeitar a mesma matriz que o banco ja define.

**Risco de regressão.** Trazido sozinho o hook nao muda nada (ninguem o chama) — nao e regressao, mas tambem nao e funcionalidade: a entrada de UI (PermissionRoute.tsx e o uso em TreinamentosPage) e exclusiva da muri. E preciso confirmar que a RLS de `permissions` libera SELECT para usuario autenticado, senao o hook sempre erra e, sendo fail-closed, NEGA telas que hoje funcionam — essa e a regressao a evitar. Importa `useAuth` esperando `rolesStatus`/`rolesError`/`isReady`: conferir que o AuthContext da main expoe esses campos.

**Evidência.** src/hooks/usePermissions.ts nao existe na main; a unica mencao e um comentario em origin/main:src/components/avaliacao/statusFeedback.ts:14 ('`usePermissions()` do frontend nao e enforcement'), o que mostra que a main conhece o conceito mas nao tem o leitor. A tabela `permissions` EXISTE em producao (supabase_db_list_tables) e esta tipada em origin/main:src/integrations/supabase/types.ts:14708. `user_roles` tambem existe. O hook da muri e fail-closed por construcao: sem dado (erro, timeout, carregando, sem papel) `pode()` devolve false.

**Plano.** 1) Verificar por leitura (supabase_db_list_policies, tabela permissions) que ha policy de SELECT para `authenticated`. Se nao houver, PARAR: sem isso o hook nega acesso por omissao. 2) Verificar que origin/main:src/hooks/useAuth.ts (ou o AuthContext) expoe `user.roles`, `isAdmin`, `isReady`, `rolesStatus` e `rolesError`; se faltar algum, adaptar o hook a API real da main em vez de mexer no AuthContext. 3) Copiar src/hooks/usePermissions.ts de origin/muri. 4) NAO trocar nenhum AdminRoute existente por PermissionRoute nesta PR — entrar primeiro com o hook e um ponto de uso novo e de baixo impacto, e so depois migrar rotas, uma a uma, com o dono ciente (negar acesso indevidamente e pior que liberar demais aqui). 5) Escrever um teste minimo cobrindo os tres estados (loading/success/error) e o fail-closed. 6) Verificar: `npm run typecheck` e o teste novo. 7) A migracao de rotas para PermissionRoute e a mudanca de TreinamentosPage ficam para a area de componentes/paginas.

<details><summary>Arquivos (1)</summary>

- `src/hooks/usePermissions.ts`

</details>

## G13 — Consentimentos LGPD filtrados por colaborador

`RECUPERAR_COM_MERGE` · esforço baixo · 2 arquivos

**Valor para o negócio.** Permite mostrar na ficha de UM colaborador apenas os consentimentos LGPD dele. Hoje a consulta traz os consentimentos da empresa inteira, o que obriga a filtrar no navegador — ou seja, trafega dado de outras pessoas para a tela de uma so, o que e exatamente o que a LGPD pede para evitar.

**Risco de regressão.** Baixo, porque o parametro e opcional e o comportamento sem ele e identico. Nao copiar o arquivo da muri: a main tem os tipos `LgpdConsentimentoComColaborador`/`LgpdSolicitacaoComColaborador` e `validateTablePayload` que a muri nao tem (a muri usa `any`).

**Evidência.** origin/main:src/services/lgpdService.ts `listarConsentimentos(empresaId)` filtra so por empresa (`grep -n colaborador_id` no arquivo da main retorna 0 hits). A muri tem `listarConsentimentos(empresaId, colaboradorId?)` com `if (colaboradorId) q = q.eq('colaborador_id', colaboradorId)` (muri/src/services/lgpdService.ts:10) e dois testes so-muri: 'also filters by colaborador_id when provided (PARTE I)' e 'does not filter by colaborador_id when omitted'.

**Plano.** 1) No src/services/lgpdService.ts da MAIN, mudar a assinatura para `listarConsentimentos(empresaId: string, colaboradorId?: string)` e acrescentar, logo apos o `q = q.eq('empresa_id', empresaId)`, a linha `if (colaboradorId) q = q.eq('colaborador_id', colaboradorId);`. Nao mudar o tipo de retorno nem remover nada. 2) Acrescentar os 2 casos so-muri ao src/services/**tests**/lgpdService.test.ts da MAIN. 3) Verificar: `npx vitest run src/services/__tests__/lgpdService.test.ts` e `npm run typecheck`. 4) O consumo (aba LGPD do dossie) e da area de componentes; sem ele o parametro fica latente, mas a funcao continua usada pela pagina de LGPD atual, logo nao e codigo morto.

<details><summary>Arquivos (2)</summary>

- `src/services/lgpdService.ts`
- `src/services/__tests__/lgpdService.test.ts`

</details>

## G14 — Multiplas lotacoes por colaborador (exige DDL — decisao do dono)

`RECUPERAR_COM_MERGE` · esforço alto · 3 arquivos

**Valor para o negócio.** Permite que um colaborador tenha mais de uma lotacao (unidade/setor) com uma marcada como principal — situacao comum em empresa com varias filiais. Hoje o sistema so guarda uma lotacao em texto no proprio colaborador.

**Risco de regressão.** Este grupo NAO pode ser executado sem antes criar a tabela `colaborador_lotacoes` em producao, com RLS ligada e policy por empresa_id. Isso e DDL em producao: item da regra 8 do fluxo Git — PR fica aberta e o dono decide; a migration vai pelo canonical-migrations.yml com sidecar .verify.sql, nunca por psql/MCP. Trazer o service antes da tabela quebra a tela em runtime (erro 42P01) e reprova o typecheck (tipo inexistente). Se o dono nao quiser a tabela, o grupo inteiro vira OBSOLETO e o campo de lotacao continua como esta.

**Evidência.** colaboradorLotacaoService da muri consulta `from('colaborador_lotacoes')` e `from('lotacoes')`. A tabela `colaborador_lotacoes` NAO EXISTE em producao: a listagem completa do schema public (390 tabelas, via supabase_db_list_tables no projeto frjbfeamybqsejlvmqbl) nao a contem, e ela tambem nao esta em origin/main:src/integrations/supabase/types.ts (0 hits) — aparece apenas em origin/muri:src/integrations/supabase/types.ts:12206. A tabela `lotacoes` existe. Consumidores na muri: TrabalhoHierarquiaTab.tsx (so-muri) e ColaboradorFormPage.tsx (existe na main).

**Plano.** 1) PRIMEIRO: apresentar ao dono a necessidade da tabela nova `colaborador_lotacoes` (colunas inferidas de origin/muri:src/integrations/supabase/types.ts:12206) e esperar decisao. Sem APROVADO, parar aqui. 2) Com aprovacao: escrever a migration em supabase/migrations/ com RLS ligada e policy por empresa_id (via join com colaboradores, se a tabela nao tiver empresa_id proprio) mais o sidecar `.verify.sql` que comprova a existencia da tabela, da RLS e das policies; aplicar por canonical-migrations.yml (validate -> apply -> verify), a partir da main. 3) Regerar src/integrations/supabase/types.ts. 4) Copiar src/services/colaboradorLotacaoService.ts e src/hooks/useColaboradorLotacao.ts de origin/muri, trocando `any` pelos tipos regenerados. 5) Acrescentar `useLotacoesCatalogo, useLotacaoPrincipal, useDefinirLotacaoPrincipal` ao src/hooks/index.ts. 6) Copiar src/services/**tests**/colaboradorLotacaoService.test.ts. 7) Verificar: `npx vitest run src/services/__tests__/colaboradorLotacaoService.test.ts`, `npm run typecheck`, e uma consulta real de leitura na tabela nova. 8) A entrada de UI fica em ColaboradorFormPage.tsx (existe na main) e TrabalhoHierarquiaTab.tsx (area de componentes).

<details><summary>Arquivos (3)</summary>

- `src/services/colaboradorLotacaoService.ts`
- `src/hooks/useColaboradorLotacao.ts`
- `src/services/__tests__/colaboradorLotacaoService.test.ts`

</details>

## G15 — Modo demonstracao ligado aos hooks (dado ficticio ja existe na main, sem consumidor)

`RECUPERAR_COM_MERGE` · esforço alto · 16 arquivos

**Valor para o negócio.** Hoje o modo demonstracao esta pela metade: o dataset ficticio foi escrito e esta na main, mas nenhuma tela o le — e dinheiro gasto e parado. Com a ligacao, o dono e quem apresenta o sistema conseguem abrir Colaboradores, Admissoes, Desligamentos e o dossie com dados realistas sem mexer em dado de cliente. Fora do modo demo (variavel de ambiente desligada, que e o default em producao) o comportamento e identico ao de hoje. O useAfastamentosRecentes e ganho independente: resumo de afastamentos do colaborador, reusando service que a main ja tem.

**Risco de regressão.** Risco concentrado em tres pontos: (1) os hooks da muri sao versoes antigas — a main ganhou validateTablePayload/validateInput/Insertable/Updatable em useDocumentos, useBeneficiosColaborador, useContratacaoDigital e useAfastamentos, e a muri troca isso por `any` + insert cru, o que removeria validacao de payload; (2) useBeneficiosColaborador da muri muda o join de `tipo_beneficio:tipos_beneficio(nome, codigo)` (atual na main, e `tipos_beneficio` existe em producao) para `beneficio:beneficios(nome, tipo)` — isso e schema antigo e NAO deve entrar; (3) useAfastamentos da muri perde o `injectEmpresaIdOnCreate: true`, o `empresa_id` no auditLogger e o `excluirDocumento(id, empresaAtual.id)` tipado, trocando-o por `(afastamentoService as any).excluir(id)`. Nada disso pode vir. A propria ligacao de mock precisa ser sempre 'so quando a consulta real nao trouxe nada' ou gated por env, nunca escondendo dado real.

**Evidência.** origin/main:src/mocks/colaboradoresMock.ts JA exporta mockOr (linha 85), getMockCargos (1283), getMockDepartamentos (1288), getMockLocalTrabalho (1712), getMockPontoHoje, getMockSaldoBancoHoras, getMockEscalaAtual, getMockOrganograma (1179) e dezenas de outros — e `git grep -ln <nome> origin/main -- src \| grep -v mocks/` retorna VAZIO para todos eles: o dado ficticio esta na main e nao tem um unico consumidor fora da propria pasta de mocks. A muri e quem liga: 14 hooks e 6 services com `mockOr(...)`. A muri tambem acrescenta `src/mocks/desligamentosMock.ts`, `src/mocks/admissoesMock.ts` e `src/mocks/layoutMock/gate.ts` (`isLayoutMockEnabled()` = DEV && MODE!=='test' && VITE_LAYOUT_MOCK==='true'), que nao existem na main. Alem do mock, a muri acrescenta `useAfastamentosRecentes(colaboradorId, dias=60)` reusando afastamentoService.listarHistoricoRecente, que existe na main (origin/main:src/services/afastamentoService.ts:61), com 3 testes.

**Plano.** 1) Decidir com o dono se o modo demonstracao entra — e feature de apresentacao, nao correcao; se a resposta for nao, deste grupo recuperar APENAS o item 5 (useAfastamentosRecentes). 2) Copiar de origin/muri os arquivos de mock que faltam: src/mocks/admissoesMock.ts, src/mocks/desligamentosMock.ts e src/mocks/layoutMock/ (dados.ts, gate.ts, index.ts, postgrest.ts). Sao arquivos novos, autocontidos e gated por import.meta.env. 3) Em CADA hook/service da lista, partir do arquivo da MAIN e aplicar SO o enxerto de mock: o import de '@/mocks/...' e o curto-circuito `const mock = mockOr(getMockX(id)); if (mock !== undefined) return mock;` como primeira linha do queryFn (ou `enabled: !ficticios` + retorno curto-circuitado, no padrao de useDesligamentos). Nao tocar em tipos, validacao, guards de empresa nem joins. 4) Proibicoes explicitas: nao mudar o join de useBeneficiosColaborador; nao remover validateTablePayload/validateInput de useDocumentos e useContratacaoDigital; nao mexer no excluirDocumento de useAfastamentos; nao trocar `supabase` por `supabaseBase` em lugar nenhum. 5) Acrescentar ao src/hooks/useAfastamentos.ts da MAIN a funcao `useAfastamentosRecentes(colaboradorId, dias = 60)` copiada da muri (chama afastamentoService.listarHistoricoRecente, que ja existe na main:61), tipando o retorno com AfastamentoRow, e acrescentar `useAfastamentosRecentes` ao export de './useAfastamentos' em src/hooks/index.ts; somar os 3 casos novos ao src/hooks/**tests**/useAfastamentos.test.ts da MAIN. 6) Verificar: `npm run typecheck`, `npm run lint:ci`, `npm run test` completo, e abrir o app com a variavel de demo DESLIGADA confirmando que nenhuma tela mudou de comportamento. 7) Fazer este grupo em PR separada e por ultimo: e o de maior superficie (16 arquivos) e o de menor urgencia.

<details><summary>Arquivos (16)</summary>

- `src/hooks/useAfastamentos.ts`
- `src/hooks/__tests__/useAfastamentos.test.ts`
- `src/hooks/useBeneficios.ts`
- `src/hooks/useBeneficiosColaborador.ts`
- `src/hooks/useDocumentos.ts`
- `src/hooks/useDesligamentos.ts`
- `src/hooks/useAdmissoes.ts`
- `src/hooks/useAdmissaoWorkflow.ts`
- `src/hooks/useESocial.ts`
- `src/hooks/useContratacaoDigital.ts`
- `src/hooks/useSystemHealth.ts`
- `src/hooks/useNotificacoes.ts`
- `src/hooks/usePonto.ts`
- `src/services/localTrabalhoService.ts`
- `src/services/afastamentoService.ts`
- `src/services/admissaoService.ts`

</details>

## G16 — Cascata de entrada dos cards (polimento visual)

`RECUPERAR` · esforço baixo · 1 arquivos

**Valor para o negócio.** Polimento: faz os cards de cada tela entrarem em cascata em vez de todos de uma vez, agrupando pelo ancestral comum mais proximo (resolve o caso de wrapper intermediario, que a abordagem obvia por parentElement nao cobre) e com teto no 9o card para listas longas nao demorarem segundos. Respeita prefers-reduced-motion. Nao muda nenhum dado nem regra.

**Risco de regressão.** Baixo tecnicamente, mas o hook e ativado globalmente em App.tsx na muri e mexe no DOM de todas as telas (atributo data-stagger-applied + delays). Trazido sem o App.tsx fica inerte, e com ele muda a sensacao de toda a aplicacao. Alem disso a main ganhou src/lib/motionMode.ts e src/components/ui/entrada-cards.tsx depois, com sua propria regua de animacao — pode haver sobreposicao de efeitos (card animando duas vezes).

**Evidência.** O arquivo nao existe na main (`git ls-tree origin/main src/hooks/ \| grep stagger` vazio), mas a main tem DUAS referencias orfas a ele em comentario: origin/main:src/components/ui/entrada-cards.tsx:71 ('regua do `use-stagger-cards` global') e origin/main:src/lib/motionMode.ts:72 ('ex.: `use-stagger-cards` e `KanbanColumn`'). Nao sao imports, logo a main nao esta quebrada — os comentarios ficaram descrevendo um arquivo que nunca chegou. Na muri o hook e consumido por src/App.tsx.

**Plano.** 1) Antes de copiar, ler origin/main:src/components/ui/entrada-cards.tsx e src/lib/motionMode.ts e decidir se a cascata global do use-stagger-cards se soma ou CONFLITA com a animacao que a main ja aplica. Se conflitar, nao trazer e so corrigir os dois comentarios orfaos. 2) Se nao conflitar: copiar src/hooks/use-stagger-cards.ts de origin/muri sem alteracao. 3) Ligar em src/App.tsx (uma chamada do hook no componente raiz) na mesma PR, senao e codigo morto. 4) Verificar visualmente em duas telas com layout diferente (DashboardPage e uma lista) e com prefers-reduced-motion ligado no navegador. 5) Esforco baixo, prioridade baixa: este grupo entra por ultimo e pode ser descartado sem perda funcional.

<details><summary>Arquivos (1)</summary>

- `src/hooks/use-stagger-cards.ts`

</details>

## Descartado nesta área

- **G17 — Ja resolvido na main por outro caminho (descartar a versao da muri)** (`JA_EM_MAIN`) — (1) maskPixKey: a muri acrescenta a funcao e 3 testes, mas a main JA mascara a chave Pix por outro caminho — origin/main:src/hooks/usePiiMask.ts:21 define `pix: (tipo, chave) => ...` e origin/main:src/components/colaborador-detalhes/ContasBancariasTab.tsx:192 a usa (`${c.pix_tipo}: ${pii.pix(c.pix_tipo, c.pix_chave)}`). Trazer maskPixKey criaria uma segunda funcao de mascara sem consumidor. (2) useOrganograma: o unico ganho funcional da muri era acrescentar `cargo` ao select, e origin/main:src/hooks/useOrganograma.ts:33 ja seleciona `'id, nome_completo, departamento, email, foto_url, cargo'`; o resto do arquivo da muri troca `enabled: !!empresaId` por `enabled: true` e `.eq('empresa_id', empresaId)` por `empresaId!`, o que e pior. (3) avaliacaoService.ts e byte-identico nas duas pontas (git diff vazio) e avaliacaoService.test.ts tem 0 casos exclusivos de cada lado.
- **G18 — Versao antiga da muri: descartar (traria regressao de seguranca, tipagem ou schema)** (`OBSOLETO`) — baseService.ts: a muri REMOVE `validateInput`/`validateTablePayload` do criar/atualizar, o tipo `EmpresaIdArg<RequireEmpresa>` que exige empresaId em tempo de compilacao, e troca `supabase` por `supabaseBase` (contorna o gateway external-db-bridge, controle citado em AGENTS.md secao 6); seu unico acrescimo, `semMock?: boolean` em ListOptions, ja esta resolvido na main de outra forma (origin/main:src/services/colaboradorService.ts:144 `async list(empresaId: string, _semMock = false)`). loggerService.ts: a muri remove TODA a camada de redacao de PII que a main tem (redactLogText, redactLogContext, SENSITIVE_CONTEXT_KEY, EMAIL/CPF/CNPJ/JWT/BEARER patterns, sanitizeLogUrl) e volta a logar `window.location.href` completo e `navigator.userAgent`; seu acrescimo (filtro de BRIDGE_CORS_ERROR) foi superado pela checagem de sessao antes da RPC que a main faz. useEmpresas.ts: a muri troca as RPCs `get_my_user_empresas`, `admin_associar_usuario_empresa` e `set_own_default_empresa` por escrita direta em `user_empresas`/`empresas` via supabaseBase, REMOVE os guards `if (!isAdmin) throw` de criar/atualizar/associar, remove `validateTablePayload` e remove o `user?.id` da queryKey (cache sensivel a identidade — reusar a chave entre logins vaza a lista da sessao anterior); tambem apaga os campos simples_anexo, aliquota_encargos_folha e exigir_pin_quiosque da interface Empresa. rhService.ts: a muri remove validateInput e os tipos Tables<> de todas as operacoes e muda `config_afastamentos` para filtrar por `empresa_id` (a main documenta que essa tabela e global, sem coluna empresa_id). useDataAccessLog.ts: a muri troca `client.base` por `client` e acrescenta `as never`, revertendo a decisao da main de nao escrever direto em audit_log. dateLocal.ts: a muri REMOVE `datetimeLocalToISO` (que a main acrescentou para converter datetime-local em ISO UTC) e so reescreve um comentario. useExecutiveDashboard.ts e usePontoMelhorado.ts: a muri troca `supabase` por `supabaseBase` em todas as consultas; muda a metrica de faltas de batidas_ponto/horas_falta (main:94-98) para `faltas`+tipo='injustificada' sem evidencia de que a da main esteja errada (NAO VERIFICADO qual e a correta — as duas tabelas existem em producao). assistenteIAService.ts + functionsUrl.ts: a main ja resolve a base das edge functions inline com VITE_SUPABASE_FUNCTIONS_BASE; functionsUrl.ts so compensaria se client.ts e AuthContext.tsx da muri vierem junto (area de infra), e o ganho e organizacao, nao funcao. catalogoCursoService, contratacaoService (a main tem enviarEmailLinkCandidato, a muri nao), desligamentoService, useTabelasReferencia, useHistoricoContratos: em todos a main avancou mais (ex.: catalogoCursoService 174/49 na main contra 152/17 na muri) e nao ha metodo exclusivo da muri. Os testes correspondentes da muri testam a API antiga com cadeias `as any` e a main tem mais casos nos mesmos arquivos (rhService.test 18 so-main, useTabelasReferencia.test 21 so-main, desligamentoService.test 0 so-muri). types/recrutamento.ts: a muri acrescenta `requisitos?: string \| null` a VagaResumo, mas `git grep -n requisitos origin/main -- src/services/recrutamentoService.ts` nao retorna nada — o campo nao e selecionado por nenhuma consulta da main, entao entraria como tipo sem dado por tras.

## Perda se a área for descartada inteira

Perde-se: (1) o logout por inatividade continua rodando localStorage.clear() e apagando a fila offline do ponto e rascunhos do usuario (main/src/hooks/useSessionTimeout.ts:32 e useSecurityMonitor.ts:26); (2) nao existe recontratacao de ex-colaborador na main (zero ocorrencias de "recontrat" fora de mocks) nem historico de vinculos, embora a tabela `vinculos` exista em producao; (3) o dossie do colaborador fica pela metade — cria contato de emergencia e formacao mas nao edita, nao mostra holerites, ferias nem lotacoes, e nao permite anexar documento nenhum (nenhum supabase.storage em src/components/colaborador-detalhes da main); (4) a conta bancaria aceita um segundo "principal" e nao confere se o colaborador e da empresa; (5) a matriz `public.permissions`, que ja existe e esta tipada na main, continua sem leitor no frontend; (6) kits de onboarding nao tem CRUD; (7) ~700 linhas de teste ja escritas, inclusive duas suites (551 linhas) que testam codigo byte-identico nas duas pontas, ficam fora do CI.
