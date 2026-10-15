#!/usr/bin/env bash
# W47 (plano 100 workflows, Bloco E): roda apenas o subconjunto de scripts
# migrations-p*.sh atribuído a este shard, para paralelizar o job
# p0-database-migrations do ci.yml em N jobs de matrix.
#
# Distribuição: round-robin por índice sobre a mesma listagem ordenada que o
# job original usava (find scripts/tests -name 'migrations-p*.sh' | sort) —
# determinística, sem lista hardcoded (W46) e sem precisar medir a duração de
# cada script. Cada script já sobe seu próprio container Postgres descartável
# com nome único (sufixo $$), então shards nunca compartilham estado mesmo que
# rodem no mesmo runner; em matrix, cada shard roda num job/runner próprio.
#
# Uso: bash scripts/tests/run-shard.sh N/TOTAL   (ex.: 1/3, 2/3, 3/3)
set -euo pipefail

if [[ "$#" -ne 1 ]]; then
  echo "uso: $0 N/TOTAL (ex.: 1/3)" >&2
  exit 1
fi

ARG="$1"
case "$ARG" in
  */*) ;;
  *)
    echo "argumento inválido: '$ARG' — esperado N/TOTAL (ex.: 1/3)" >&2
    exit 1
    ;;
esac

SHARD="${ARG%%/*}"
TOTAL="${ARG##*/}"

if ! [[ "$SHARD" =~ ^[0-9]+$ ]] || ! [[ "$TOTAL" =~ ^[0-9]+$ ]]; then
  echo "argumento inválido: '$ARG' — N e TOTAL devem ser inteiros" >&2
  exit 1
fi
if [[ "$TOTAL" -lt 1 ]] || [[ "$SHARD" -lt 1 ]] || [[ "$SHARD" -gt "$TOTAL" ]]; then
  echo "argumento inválido: '$ARG' — esperado 1 <= N <= TOTAL" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

# W46: mesma descoberta automática do job original — elimina lista hardcoded
# (D27) e mantém a distribuição por shard determinística entre PRs.
mapfile -t ALL_SCRIPTS < <(find scripts/tests -name 'migrations-p*.sh' | sort)

if [[ "${#ALL_SCRIPTS[@]}" -eq 0 ]]; then
  echo "nenhum script migrations-p*.sh encontrado em scripts/tests" >&2
  exit 1
fi

SHARD_SCRIPTS=()
for i in "${!ALL_SCRIPTS[@]}"; do
  if [[ "$(( i % TOTAL ))" -eq "$(( SHARD - 1 ))" ]]; then
    SHARD_SCRIPTS+=("${ALL_SCRIPTS[$i]}")
  fi
done

echo "── Shard $SHARD/$TOTAL: ${#SHARD_SCRIPTS[@]} de ${#ALL_SCRIPTS[@]} script(s)"
for script in "${SHARD_SCRIPTS[@]}"; do
  echo "    - $script"
done

if [[ "${#SHARD_SCRIPTS[@]}" -eq 0 ]]; then
  echo "nenhum script atribuído a este shard (TOTAL maior que o nº de scripts?) — nada a rodar"
  exit 0
fi

for script in "${SHARD_SCRIPTS[@]}"; do
  echo "▶ $script"
  bash "$script"
done
