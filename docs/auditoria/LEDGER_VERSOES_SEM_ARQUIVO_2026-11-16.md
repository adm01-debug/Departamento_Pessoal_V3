# Versões no ledger sem arquivo no repositório — medição de 16/11/2026

## Por que este documento existe

O check `Supabase Preview` reprova **todo commit** da `main` com
`Remote migration versions not found in local migrations directory`. Isso cria
a impressão de que a esteira nunca fica verde e esconde o que é defeito de
verdade. A decisão pendente era "canonizar as versões faltantes". Este
documento registra o que foi **medido**, o que **não** foi possível verificar, e
a decisão que decorre disso.

> `Supabase Preview` **não** é um dos 10 checks obrigatórios do ruleset da
> `main` (ruleset `21934736`), portanto **não bloqueia merge**.

## Os números medidos

| medição no canônico `frjbfeamybqsejlvmqbl` | valor |
| --- | --- |
| versões no `supabase_migrations.schema_migrations` | **1079** |
| arquivos de migration distintos em `supabase/migrations/` | **807** |
| diferença líquida | **272** |
| versões em formato legado (não `YYYYMMDDHHMMSS`) | 58 |
| versões datadas avaliadas | 1007 |
| versões datadas com outra versão no mesmo minuto, a ≤ 10 s | 639 |
| **versões com `statements` NULL** | **978** |
| versões com `statements` array vazio | 40 |
| versões com `statements` preenchido | **61** |

## O fato que decide: o conteúdo não existe

**978 das 1079 versões do ledger têm `statements` NULL** e outras 40 têm array
vazio. Só **61** guardam o SQL que foi executado — provavelmente as que
passaram por `canonical-migrations.yml`, que grava `statements` no INSERT do
ledger.

Ou seja: para a esmagadora maioria das versões sem arquivo, **o SQL não está em
lugar nenhum** — nem no repositório, nem em nenhuma das 21 branches auditadas em
16/11/2026 (todas conferidas arquivo por arquivo, com normalização de CRLF),
nem na própria linha do ledger.

**É por isso que não se canoniza**: não por serem duplicatas, mas porque **não
existe fonte para o conteúdo**. Criar arquivo aqui seria inventar SQL e
registrá-lo como histórico oficial do banco, o que é pior do que a ausência —
o próximo agente leria aquilo como verdade (`AGENTS.md` §2.3).

## Hipótese dos pares — NÃO VERIFICADA

Há uma explicação plausível para a origem dos 272: a ferramenta que gerava as
migrations (arquivos com nome em UUID) registraria **duas linhas** no ledger por
alteração, salvando **um** arquivo. O que apoia:

- 639 das 1007 versões datadas têm outra versão no mesmo minuto, a ≤ 10 s;
- amostra conferida: `20260511141726` sem arquivo e `20260511141729` com
  (`..._301063c3-c283-49c8-8fb7-b716095c30fa.sql`); `20260512142102` sem e
  `20260512142106` com; `20260717174817` sem e `20260717174811` com.

**NÃO VERIFICADO, e o motivo:** proximidade de timestamp **não é** igualdade de
SQL, e os três pares provam apenas que existe arquivo para uma das duas versões
— não que as duas descrevem a mesma mudança. Verificar exigiria comparar o SQL
de cada versão sem arquivo, e esse SQL não está disponível (`statements` NULL em
978 de 1079). Portanto **não se pode afirmar** que nenhuma das 272 contém uma
alteração distinta; o que se pode afirmar é que o conteúdo delas é
**irrecuperável** a partir de qualquer fonte deste repositório ou do ledger.

## Lacuna real de detecção — leia antes de desconectar o `Supabase Preview`

O `Supabase Preview` **nunca** vai ficar verde aqui: ele exige paridade
1-para-1 entre ledger e arquivos, e as 272 tornam essa paridade inalcançável sem
fabricar arquivo.

Mas **desconectá-lo tem um custo que precisa ficar escrito**: hoje ele é o
**único** controle automático que compara o **conjunto completo** de versões do
ledger com o conjunto completo de arquivos do repositório. Os controles do
repositório **não** cobrem isso:

- `.github/workflows/canonical-migrations.yml` roda **só** por
  `workflow_dispatch`, prepara uma **lista explícita** e confere o ledger
  **daquele lote** — uma versão nova no banco fora do lote, ou um arquivo novo
  não listado, não aparece;
- `scripts/canonical-invariants.sql:2-4` conta apenas as versões **enumeradas**
  do lote corrente (hoje uma só) — não compara conjuntos;
- os sidecars `.verify.sql` provam o **efeito** de migrations específicas, não a
  paridade do histórico.

Então, nas duas saídas abaixo, essa comparação fica **sem detector automático**
até que alguém a implemente. É uma escolha consciente, não uma cobertura
equivalente:

1. **Desconectar a integração** (Settings → Integrations, ou no painel do
   Supabase; é clique do dono — não há API neste ambiente que remova instalação
   de GitHub App), aceitando a lacuna acima.
2. **Deixar como está**, sabendo ler: vermelho nele significa "paridade
   histórica imperfeita", não "esta PR está errada".

Enquanto não houver detector, a comparação completa pode ser feita à mão com as
consultas abaixo.

## Como refazer a medição

```sql
-- 1. total, formato legado e disponibilidade do SQL no ledger
SELECT count(*) AS total,
       count(*) FILTER (WHERE version !~ '^[0-9]{14}$')                       AS legado,
       count(*) FILTER (WHERE statements IS NULL)                             AS sem_sql,
       count(*) FILTER (WHERE statements IS NOT NULL
                          AND cardinality(statements) = 0)                    AS sql_vazio,
       count(*) FILTER (WHERE statements IS NOT NULL
                          AND cardinality(statements) > 0)                    AS com_sql
  FROM supabase_migrations.schema_migrations;

-- 2. versões datadas com outra no mesmo minuto (apoia a hipótese dos pares,
--    NÃO a prova)
WITH t AS (
  SELECT version,
         substring(version,1,12)      AS prefixo12,
         substring(version,13,2)::int AS seg
    FROM supabase_migrations.schema_migrations
   WHERE version ~ '^[0-9]{14}$'
     AND substring(version,13,2)::int < 60
     AND substring(version,11,2)::int < 60
)
SELECT count(*) FILTER (
         WHERE (SELECT count(*) FROM t b
                 WHERE b.prefixo12 = t.prefixo12
                   AND b.version <> t.version
                   AND abs(b.seg - t.seg) <= 10) > 0
       ) AS com_vizinha
  FROM t;
```

```sh
# 3. versões distintas com arquivo no repositório
ls supabase/migrations/*.sql | grep -v '\.verify\.sql$' \
  | sed 's|.*/||; s|_.*||' | sort -u > /tmp/vers_repo.txt
wc -l < /tmp/vers_repo.txt
```

```sh
# 4. comparação COMPLETA ledger x arquivos, nos dois sentidos — é esta que o
#    `Supabase Preview` faz e que nenhum controle do repositório faz hoje.
#    Gera o SQL a partir da lista do passo 3 e roda no canônico.
node -e '
const fs = require("fs"); const q = String.fromCharCode(39);
const vs = fs.readFileSync("/tmp/vers_repo.txt", "utf8").trim().split("\n");
const vals = vs.map((x) => "(" + q + x + q + ")").join(",");
console.log(`WITH repo(version) AS (VALUES ${vals})
SELECT (SELECT count(*) FROM supabase_migrations.schema_migrations m
          LEFT JOIN repo r ON r.version = m.version
         WHERE r.version IS NULL)                      AS ledger_sem_arquivo,
       (SELECT count(*) FROM repo r
          LEFT JOIN supabase_migrations.schema_migrations m ON m.version = r.version
         WHERE m.version IS NULL)                      AS arquivo_sem_ledger;`);
'
```
