# Auditoria de drift e ensaio de recuperação — 31/08/2026

## Decisão executiva

O ledger remoto **não foi reparado** e `supabase db push` **não foi executado**.
Os gates demonstraram que a cadeia histórica não é restaurável e que o estado
canônico ainda reprova todos os auditores de segurança do repositório. Marcar
as migrations como aplicadas agora esconderia os dois problemas.

Projeto canônico validado: `frjbfeamybqsejlvmqbl`, PostgreSQL 17.6. O endpoint
MCP anteriormente fornecido não foi usado porque já havia sido comprovado que
apontava para PostgreSQL 15.8 e para outro ledger.

## 1. Backup e recuperação

O projeto hospedado reportou WAL-G ativo, PITR desativado e nenhuma cópia
gerenciada disponível na listagem da API. Foi produzido backup lógico pela CLI
oficial, preservado localmente em
`.local-backups/frjbfeamybqsejlvmqbl/20260831/` com diretório `0700` e arquivos
`0600`, explicitamente ignorado pelo Git.

| Artefato | Bytes | SHA-256 |
|---|---:|---|
| Schema | 1.372.134 | `8cf54a3f3baf1e5cbf112eeaf9d7823a404e11088885b560513282da81d76826` |
| Dados (Auth + public + Storage) | 1.936.936 | `88238b9dc1693d6d2baccbd486bcb26304b7d420779e712a4a29506e5c501fc6` |
| Roles | 616 | `3b63552c400c0186b06ad7d115a4c6254cee1b39c2c500f791a230464172300a` |
| Schema Auth | 46.591 | `384b9181a7fb38ee5e281967d62079e517d999149ac8c841d4adf2ddaa4780d4` |
| Schema Storage | 53.795 | `000a2a3b55cdb501b4232c021b967d77654da5814d7ad5118d6a6a47d5815d2f` |
| Dados Storage | 3.408 | `cae74e477c1d4bf7ebccaa5a827109391c0ead2201f399b1738acdd7b0312425` |
| Schema cron | 352 | `342ce5197f9875834127d99ed0ee2822bf8ba091e7af4bf4a4413901544c30ef` |
| Dados cron | 728 | `1aaeec35fe447927ae6ae42e1486bf5914390500cec0f57be792123f61327efd` |

O restore foi testado em Supabase local/PostgreSQL 17, na ordem roles → schema
principal → schema Storage canônico → dados → correções pós-restore de Auth/ACL.
Resultado:

- 390 blocos `COPY` restaurados;
- contagem exata de todas as 390 tabelas: diff zero;
- hash dos manifestos de contagem, antes/depois:
  `4aa2c96da56084dcc51dbd70baaa21799581da2a8edf3854f92dafe9b210b172`;
- 0 FKs não validadas;
- 362 tabelas/partições, 44 views/materialized views, 299 funções, 598
  policies e 398 triggers em `public`;
- 4 buckets privados, 10 policies tenant de Storage e 0 jobs `cron`;
- schema `public` restaurado semanticamente igual ao remoto: diff zero e hash
  normalizado idêntico
  `84563f9c2141fd71895a14da8c9b60150721c48615c455ef464e503a8a583da1`;
- schemas gerenciados Auth e Storage com diff semântico zero e hashes
  normalizados idênticos, respectivamente
  `04dccf47840f2089b4dc4e1b47e79a2a3d954088cbc2951ec24b8fe16ba0b97b`
  e `4270d69cade92c50a294d60a0cb20b5001eeb2a539d308c38d25177a7e6bf920`;
- scripts pós-restore de Auth/ACL executados repetidamente com sucesso,
  comprovando idempotência.

O Storage hospedado está uma revisão à frente da imagem local: faltavam no
staging `buckets.versioning_status`, três colunas de versionamento em `objects`
e as 10 policies tenant. O schema `storage` foi reconstruído **somente no
staging**, redumpado e comparado: diff semântico zero. O Auth local era
estruturalmente compatível, mas faltavam quatro índices presentes no canônico.

## 2. Replay das 644 migrations

O replay exato, sem editar arquivos, avançou até o ordinal 528. A primeira
falha ocorreu no ordinal 529:

`20260724100000_p3_054_mv_telemetry_dashboard.sql`

SQLSTATE `42703`: a materialized view usa `query_telemetry.bytes_sent`, coluna
que não existe naquele ponto da cadeia. A migration está transacionada e não
foi parcialmente confirmada.

Higiene do histórico:

- 644 arquivos locais;
- 33 versões remotas;
- interseção exata: somente 3 versões (`20260830000001..000003`);
- 30 versões existem apenas no ledger remoto;
- 641 arquivos locais não estão registrados remotamente;
- 4 versões duplicadas: `20260724120000`, `20260724130000`,
  `20260724140000` e `20260818000000`;
- 69 arquivos possuem timestamp não canônico ou data/hora inválida;
- 65 arquivos contêm `DROP`, `TRUNCATE` ou `DELETE` potencialmente destrutivo.

A classificação linha a linha está em
`20260831-migration-classification.csv` (674 registros, além do cabeçalho: 644
arquivos + 30 versões remotas sem fonte):

| Classe | Total | Interpretação operacional |
|---|---:|---|
| `ja_aplicada` | 3 | versão exata confirmada no ledger remoto |
| `parcial` | 566 | replayável/ambígua, mas sem prova individual no ledger ou sem fonte local |
| `ausente` | 104 | ausente do ledger e não alcançada após a primeira falha |
| `obsoleta` | 1 | migration incompatível que interrompeu o replay |

“Parcial” é deliberadamente conservador: não afirma que todo DDL do arquivo
está vivo; afirma que o histórico/ledger e o schema físico não permitem essa
conclusão por arquivo sem prova adicional.

## 3. Diff físico: replay 528 versus canônico

O inventário determinístico inclui relações, colunas, constraints, extensões,
funções, índices, policies, triggers, tipos e ACLs.

| Métrica | Canônico restaurado | Replay 528 |
|---|---:|---:|
| Itens de catálogo | 9.024 | 9.885 |
| SHA-256 do inventário | `711c58a2…154811ad` | `3222c3e1…879cf0` |
| Itens canônicos ausentes no replay | 1.406 | — |
| Itens extras/divergentes no replay | — | 2.267 |
| Relações canônicas ausentes/divergentes | 27 | — |
| Relações extras/divergentes | — | 47 |

Por categoria: ACL 423/443, colunas 522/809, constraints 130/292,
extensões 2/1, funções 87/97, índices 117/252, policies 55/253,
relações 27/47, triggers 39/73 e tipos 4/0 (ausentes/extras).

O inventário força `search_path=''`. A repetição determinística manteve os
totais dos catálogos, mas eliminou 553 divergências artificiais de cada lado
causadas pela desqualificação textual de nomes em `pg_get_*def`.

Conclusão: mesmo o prefixo que executa não reconstrói o canônico. O schema
vivo não é resultado determinístico da cadeia versionada atual.

## 4. Gates de segurança no canônico restaurado

Todos foram realmente conectados ao `psql` do container; a execução anterior
sem `psql` no host retornava apenas aviso e código zero.

| Gate | Resultado |
|---|---:|
| `audit-db-search-path` | 27 funções reprovadas |
| `audit-rls-tenant-open` | 62 policies reprovadas |
| `audit-rls-pii` | 16 policies reprovadas |
| `audit-rls-least-privilege` | 50 policies reprovadas |
| `audit-secdef-authz` | 29 funções reprovadas |

Os três auditores RLS passaram a forçar `search_path=''`: isso corrigiu o falso
positivo confirmado em que `pg_get_expr` desqualificava `auth.uid()` para
`uid()` (os dois primeiros resultados caíram de 160/46 para 62/16). Os
resultados remanescentes ainda podem exigir triagem semântica individual, mas
há violações inequívocas (`USING (true)`, execução por `anon` e funções
`SECURITY DEFINER` sem autorização); todos os gates permanecem vermelhos.

Outros débitos físicos do canônico:

- 43 views selecionáveis por `anon`;
- 42 views sem `security_invoker=true`;
- 55 policies com `USING (true)`;
- 13 policies com `WITH CHECK (true)`;
- 13 CHECK constraints `NOT VALID` (12 de negócio e uma gerenciada);
- somente 4 buckets existem, embora a aplicação liste/consuma buckets
  adicionais; isso exige reconciliação funcional antes de promover o squash.

A suíte comportamental real de tenant/PII/Storage executou 28 asserts dentro
de transação com rollback: **27 passaram**. Falhou apenas
`T1.3 avatars preservado público`, porque o bucket `avatars` não existe. O
teste foi corrigido para respeitar as FKs reais de Auth/empresas, simular a
claim `sub` sem helper hospedado e reconhecer o bloqueio gerenciado de DELETE
direto do Storage. Ao fim, roles, usuários e tabelas sintéticas estavam ausentes.

## 5. Baseline candidato e decisão sobre o ledger

Foi criado `supabase/baseline/20260831_canonical/`, fora do diretório ativo de
migrations. O baseline restaura o canônico e contém checksums, verificação,
compatibilidade local de Storage e correção de ACL de restore.

Ele **não foi ativado** como migration porque faltam dois gates:

1. corrigir/justificar os gates de segurança e a lista de buckets;
2. repetir o restore e os smokes em um projeto Supabase hospedado de staging,
   separado do canônico.

Depois desses gates, a estratégia segura é manter 33 placeholders auditáveis
para as versões já presentes no ledger, mover os 644 arquivos legados para
arquivo histórico, ativar um único squash testado para novos bancos e marcar
**somente a versão do squash** como aplicada no canônico. Nenhuma das 641
versões ausentes deve ser marcada em massa.

## 6. Estado de produção ao encerrar

- schema/dados do canônico: não alterados nesta auditoria;
- ledger remoto: não alterado;
- `db push`: não executado;
- `migration repair`: não executado;
- endpoint MCP divergente: não utilizado.

Essa interrupção é o resultado correto dos gates, não uma execução incompleta.
