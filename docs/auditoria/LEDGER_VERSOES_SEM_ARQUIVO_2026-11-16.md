# Versões no ledger sem arquivo no repositório — medição de 16/11/2026

## Por que este documento existe

O check `Supabase Preview` reprova **todo commit** da `main` com
`Remote migration versions not found in local migrations directory`. Isso cria
a impressão de que a esteira nunca fica verde e esconde o que é defeito de
verdade. A decisão pendente era "canonizar as versões faltantes". Este
documento registra a medição que mostra **por que canonizar está errado**, para
que ninguém tente de novo.

> Nota: `Supabase Preview` **não** é um dos 10 checks obrigatórios do ruleset da
> `main` (conferido no ruleset 21934736), portanto **não bloqueia merge**.

## Os números

| medição | valor |
| --- | --- |
| versões no `supabase_migrations.schema_migrations` do canônico | **1079** |
| versões distintas com arquivo em `supabase/migrations/` | **807** |
| diferença líquida | **272** |
| versões do ledger em formato legado (não `YYYYMMDDHHMMSS`) | 58 (`001`…`007`, `2025122813133501`, …) |
| versões datadas avaliadas | 1007 |
| **versões datadas que têm uma "irmã" no mesmo minuto, a ≤ 10 s** | **639** |
| versões datadas sozinhas no minuto | 368 |

## O que as versões faltantes são

**Não são DDL perdida.** São registros irmãos da mesma mudança: a ferramenta que
gerava as migrations (Studio/Lovable, arquivos com nome em UUID) registrava
**duas linhas** no ledger por alteração e salvava **um** arquivo.

Amostra conferida arquivo por arquivo:

| versão | tem arquivo? | arquivo |
| --- | --- | --- |
| `20260511141726` | **não** | — |
| `20260511141729` | sim | `20260511141729_301063c3-c283-49c8-8fb7-b716095c30fa.sql` |
| `20260512142102` | **não** | — |
| `20260512142106` | sim | `20260512142106_1f4ccc51-b612-41e0-960c-ac851d1c5f4f.sql` |
| `20260717174811` | sim | `20260717174811_1fedf63f-8379-4511-84f5-39441172d003.sql` |
| `20260717174817` | **não** | — |

O padrão se repete: pares separados por 3 a 6 segundos, com **um** arquivo para
os dois registros. Daí os 639 com irmã no mesmo minuto.

## Por que NÃO canonizar

Criar um arquivo para cada versão faltante significaria **inventar SQL que nunca
existiu** — o conteúdo dessas versões não está no repositório, nem em nenhuma
branch (as 21 branches foram auditadas em 16/11/2026), nem no `statements` do
ledger para a maioria delas. Um arquivo vazio ou com SQL reconstruído "de
memória" passaria a valer como histórico oficial do banco e seria pior do que a
ausência: o próximo agente leria aquilo como a verdade.

Isso contraria diretamente a regra do projeto de **verdade acima de validação**
(`AGENTS.md` §2.3): deixar o check vermelho e documentado é honesto; fabricar
807 → 1079 arquivos para pintar de verde não é.

## O que fazer com o `Supabase Preview`

Ele **nunca** vai ficar verde neste repositório, porque exige paridade
1-para-1 entre ledger e arquivos, e os 272 registros irmãos tornam essa
paridade inalcançável sem fabricar arquivo.

As duas saídas honestas, nas duas o merge continua protegido pelos 10 checks
obrigatórios e por `canonical-migrations.yml`:

1. **Desconectar a integração** do repositório (Settings → Integrations, ou no
   painel do Supabase). É clique do dono: não há API neste ambiente que remova
   instalação de GitHub App.
2. **Deixar como está**, sabendo ler: vermelho nele significa "paridade
   histórica imperfeita", não "esta PR está errada".

O que **não** se perde ao desconectar: o detector de drift que importa —
migration nova aplicada sem arquivo, ou arquivo sem aplicação — já é coberto
por `canonical-migrations.yml` (lista fechada + ledger + sidecars `.verify.sql`)
e pelo invariante `ledger_count` de `scripts/canonical-invariants.sql`.

## Como refazer esta medição

```sql
-- total no ledger e quantas estão em formato legado
SELECT count(*) AS total,
       count(*) FILTER (WHERE version !~ '^[0-9]{14}$') AS legado
  FROM supabase_migrations.schema_migrations;

-- versões datadas com "irmã" no mesmo minuto (a assinatura do par)
WITH t AS (
  SELECT version,
         substring(version,1,12) AS prefixo12,
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
       ) AS com_irma
  FROM t;
```

```sh
# versões distintas com arquivo no repositório
ls supabase/migrations/*.sql | grep -v '\.verify\.sql$' \
  | sed 's|.*/||; s|_.*||' | sort -u | wc -l
```
