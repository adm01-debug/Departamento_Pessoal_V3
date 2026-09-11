# Evidências de execução — 11/09/2026

> Registro operacional da execução do Plano de 50 Etapas. Este documento
> atualiza medições que variam no tempo; não reescreve os snapshots históricos
> da revisão de 10/09/2026.

## Escopo e proteção aplicada

- Projeto canônico auditado por MCP somente-leitura: `frjbfeamybqsejlvmqbl`.
- Nenhuma operação de escrita, `db push`, reset ou `migration repair` em massa
  foi executada.
- A massa foi declarada descartável, mas a promoção continua condicionada a
  staging isolado e a uma restauração verificável.
- Credenciais expostas anteriormente permanecem fora deste repositório. A
  rotação pelo painel do Supabase e a atualização dos secret managers são o
  bloqueio de E50-001; não há como revogá-las com uma conexão de banco
  somente-leitura.

## Inventário vivo (MCP, 11/09/2026)

| Item                          |  Medição |
| ----------------------------- | -------: |
| Migrações no ledger remoto    |      362 |
| Arquivos de migração locais   |      644 |
| Versões locais únicas         |      640 |
| Interseção exata local/remoto |       16 |
| Versões somente locais        |      624 |
| Versões somente remotas       |      346 |
| Tabelas públicas              |      356 |
| Views públicas                |       44 |
| Funções públicas              |      299 |
| Tabelas com RLS habilitado    |      363 |
| Policies                      |      612 |
| Triggers habilitados          |      396 |
| Buckets Storage               | 18 de 19 |

O ledger continua divergente e há quatro versões de migration duplicadas no
diretório local. Isto confirma que o replay histórico não é um caminho seguro
para promoção. A baseline/squash deve ser restaurada e validada em staging
antes de qualquer reconciliação de ledger.

## Exposições reproduzidas e artefato de correção

- 43 views públicas concedem `SELECT` a `anon`; somente `v_system_health` já
  declara `security_invoker=true`.
- 23 funções `SECURITY DEFINER` estão executáveis por `anon`, incluindo
  auxiliares internos de rate limit, auditoria e funções de acesso por token.
- 18 funções têm `search_path` fixado, mas o advisor ainda reporta 28 objetos
  que exigem classificação/ajuste de busca.
- O Storage tem 18 buckets: falta `backups`; diversos buckets existentes
  carecem de `file_size_limit` e/ou `allowed_mime_types`.

As remediações versionadas estão em `supabase/rebaseline/` e foram incorporadas
ao gerador de baseline nesta execução, na ordem abaixo:

1. autorização base;
2. correção de policies tautológicas de tenant;
3. autorização de funções `SECURITY DEFINER`;
4. `security_invoker` e revogação de `anon` em views;
5. catálogo e policies de Storage.

O teste `bun run test:rebaseline` bloqueia regressão: ele gera o artefato,
exige as cinco camadas na ordem especificada e recusa metacomandos `psql`,
`COPY` e inserção de dados em `auth`.

## Simulações concluídas nesta execução

| Verificação                          | Resultado                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------ |
| `bun run test`                       | 463 arquivos, 4.865 testes aprovados                                                       |
| `bun run test:migrations`            | aprovado; 28 asserções nas três migrations plano100                                        |
| `bun run test:db-audit-contract`     | 7 contratos de auditoria fail-closed aprovados                                             |
| `bun run test:rebaseline`            | aprovado; cinco camadas incluídas na ordem segura                                          |
| `bun run ci:verify`                  | aprovado localmente                                                                        |
| `bun run build`                      | aprovado; somente aviso de tamanho de chunks                                               |
| Playwright público contra o canônico | 19 cenários aprovados (API sem chave/JWT inválido, RLS anônimo, login e redirecionamentos) |

Os testes unitários emitem avisos de mocks incompletos, `act()` e APIs de
browser ausentes em jsdom. Não há falha funcional no conjunto, mas essa dívida
permanece no escopo E50-033/E50-041 e não deve ser escondida por supressão.

Durante a execução foi corrigido também o isolamento da suíte E2E: a porta
8080 local pertencia a outro serviço e permitia que Playwright validasse uma
aplicação errada. O Vite/E2E agora usam `127.0.0.1:4173` com porta estrita, e
as Edge Functions locais usam o proxy com a origem permitida. Falha de login
sem sessão também deixou de tentar gravar em RPC protegida; continua registrada
no logger estruturado localmente.

## Próxima promoção permitida

1. Rotacionar no Dashboard as credenciais administrativas expostas e atualizar
   exclusivamente os secret managers.
2. Criar ou indicar um Supabase de staging isolado, com escrita temporária.
3. Restaurar a baseline gerada nesse staging e executar inventário, auditorias
   RLS/ACL/SECURITY DEFINER, testes de Storage e jornadas E2E no mesmo SHA.
4. Comparar staging com o contrato canônico e somente então preparar a PR de
   promoção e a reconciliação mínima do ledger.

Enquanto esses quatro passos não ocorrerem, qualquer alteração direta no banco
canônico seria uma promoção sem rollback demonstrado e não atende aos
checkpoints C2--C4 do plano.
