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

| medição no canônico `frjbfeamybqsejlvmqbl`                      | valor    |
| --------------------------------------------------------------- | -------- |
| versões no `supabase_migrations.schema_migrations`              | **1079** |
| arquivos de migration distintos em `supabase/migrations/`       | **807**  |
| diferença líquida                                               | **272**  |
| versões em formato legado (não `YYYYMMDDHHMMSS`)                | 58       |
| versões datadas avaliadas                                       | 1007     |
| versões datadas com outra versão no mesmo minuto, a ≤ 10 s      | 639      |
| versões com `statements` NULL (ledger inteiro)                  | 978      |
| versões com `statements` array vazio (ledger inteiro)           | 40       |
| versões com `statements` preenchido (ledger inteiro)            | 61       |
| **das 272 sem arquivo: com `statements` preenchido**            | **8**    |
| **das 272 sem arquivo: sem fonte (`statements` NULL ou vazio)** | **264**  |

## 8 são recuperáveis; 264 não têm fonte

A primeira versão deste documento media `statements` no ledger **inteiro** e
concluía que o conteúdo das 272 era irrecuperável. Isso estava errado: a
contagem global não diz nada sobre o subconjunto. Cruzando as duas listas
versão por versão:

- **8 das 272** têm o SQL autêntico gravado em `statements` — são
  **recuperáveis**, e o conteúdo vem do registro da própria execução, não de
  reconstrução;
- **264 das 272** têm `statements` NULL ou array vazio — para elas o SQL não
  está no repositório, não está em nenhuma das 21 branches auditadas em
  16/11/2026 (conferidas arquivo por arquivo, com normalização de CRLF) e não
  está na própria linha do ledger.

As 8 recuperáveis, todas de hardening P0/P1:

| versão           | `name` no ledger                     | bytes de SQL |
| ---------------- | ------------------------------------ | ------------ |
| versão           | `name`                               | bytes        | arquivo homônimo no repo | comparação do SQL                                                                                            |
| ---              | ---                                  | ---          | ---                      | ---                                                                                                          |
| `20260912142449` | `p0_hash_trigger_search_path`        | 2009         | `20260911190000_…`       | mesmas 13 funções `enforce_*_hash`, mesmo `search_path TO public, extensions, pg_catalog` — **mesmo efeito** |
| `20260912142506` | `p0_auth_lockout_contract`           | 4292         | `20260911191000_…`       | **md5 idêntico** sem comentários (3486 chars dos dois lados)                                                 |
| `20260912142520` | `p0_payroll_upsert_contract`         | 3225         | `20260911195000_…`       | **md5 idêntico** sem comentários (2609 chars dos dois lados)                                                 |
| `20260912143019` | `p0_views_revoke_public`             | 2415         | `20260911192000_…`       | mesmas 42 views, mesmo `security_invoker` + `REVOKE … FROM PUBLIC, anon` — **mesmo efeito**                  |
| `20260912143239` | `p0_secdef_search_path`              | 1969         | `20260912150000_…`       | mesmas 18 rotinas, mesmo `search_path = pg_catalog, public, extensions` — **mesmo efeito**                   |
| `20260912143344` | `p1_function_search_path`            | 1344         | `20260912151000_…`       | o arquivo do repo cobre as **mesmas 9 rotinas + `dp_mig_set_search_path`** — **superconjunto**               |
| `20260912144208` | `p0_pgcrypto_routine_search_path`    | 1719         | `20260912152000_…`       | o arquivo do repo cobre as **mesmas 14 rotinas + `dp_mig_set_search_path`** — **superconjunto**              |
| `20261107203000` | `fix_rls_insert_configuracoes_ponto` | 1117         | **nenhum**               | única sem homônimo, e **obsoleta** — ver abaixo                                                              |

**Conclusão, corrigida: nenhuma das 8 deve ser canonizada.** Ter `name` próprio e
SQL no ledger não prova conteúdo distinto — foi preciso comparar com as fontes
que já existem, e a comparação derruba a recomendação anterior:

- **7 das 8** têm arquivo de mesmo nome e outro timestamp em
  `supabase/migrations/`. Duas são md5-idênticas a menos de comentário; nas
  outras cinco a lista de objetos e o `search_path` alvo coincidem, e em duas o
  arquivo do repo cobre **uma rotina a mais** que a versão do ledger. Criar
  arquivo novo para elas acrescentaria uma **segunda execução da mesma mudança**
  ao histórico reproduzível, sem recuperar nada.
- **A 8ª (`20261107203000`) é a única sem homônimo, e canonizá-la seria uma
  regressão de acesso.** Ela faz
  `CREATE POLICY "configuracoes_ponto_tenant_manage" … FOR ALL TO authenticated`,
  e `20261112010000_configuracoes_ponto_corrige_policies_prod.sql:12` **dropa
  essa policy de propósito**, trocando-a pelo conjunto restrito
  (`pertence_a_empresa` para leitura, `pode_gerir_config_ponto` para
  inserir/alterar). Conferido no canônico: a policy `FOR ALL` **não existe**
  hoje; existem as 4 policies da migration posterior. Reaplicar a 8ª
  reintroduziria o `FOR ALL` que foi removido.

Ou seja: o trabalho destas 8 **não está perdido** — está na `main`, sob outro
timestamp, em 7 casos, e foi deliberadamente substituído no 8º.

Para as **264**, não se canoniza: **não existe fonte para o conteúdo**. Criar
arquivo aqui seria inventar SQL e registrá-lo como histórico oficial do banco,
o que é pior do que a ausência — o próximo agente leria aquilo como verdade
(`AGENTS.md` §2.3).

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
de cada versão sem arquivo, e esse SQL não está disponível para **264** delas.
Portanto **não se pode afirmar** que nenhuma das 272 contém uma alteração
distinta. O que se pode afirmar, versão por versão, é: 8 têm SQL autêntico no
ledger e são recuperáveis; 264 não têm fonte em nenhum lugar conhecido.

Sobre as 8 com `statements`: a comparação acima mostra que elas **não** são
alteração distinta — 7 já estão na `main` sob outro timestamp e a 8ª foi
substituída de propósito. Isso não confirma a hipótese dos pares para as outras
264 (que seguem sem fonte, e portanto sem como comparar), mas remove o único
contraexemplo que este documento achava ter.

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

```sql
-- 2b. as versões que TÊM o SQL gravado (lista curta, hoje 61). Cruzando esta
--     lista com os arquivos do repositório sai, sem mandar 807 valores ao
--     banco, quais das faltantes são recuperáveis.
SELECT string_agg(version, ',' ORDER BY version) AS versoes_com_sql
  FROM supabase_migrations.schema_migrations
 WHERE statements IS NOT NULL AND cardinality(statements) > 0;
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
