#!/usr/bin/env bash
# Orquestrador: aplica a arquitetura "espelho + computador_local" a TODOS os repositórios listados em repos.conf.
#
#   run-all.sh mirror     [--only <nome>] [--dry-run]   espelho exato da main + fast-forward dos demais branches (hh:00)
#   run-all.sh autocommit [--only <nome>] [--dry-run]   commit automático + push da branch computador_local (hh:30)
#   (ambos aceitam --quiet-min N: quantos minutos sem edição antes de agir; 0 = agir já)
#
# Lista: ${XDG_CONFIG_HOME:-~/.config}/dp-sync/repos.conf — uma linha por repositório, campos separados por |
#   repo|worktree_dev|branch_padrao|mirror|pii
#     repo          caminho do checkout principal (o ESPELHO)
#     worktree_dev  caminho do worktree de desenvolvimento na branch computador_local (vazio = sem autocommit)
#     branch_padrao main
#     mirror        1 = este orquestrador espelha; ext = o repositório já tem espelho próprio (não toco); 0 = nenhum
#     pii           dados pessoais a barrar no autocommit (ex.: cpf,cnpj)
# Linhas começando com # e linhas vazias são ignoradas. Um repositório com problema NÃO impede os demais.
set -uo pipefail

MODE="${1:-}"; shift || true
ONLY=""; DRY=(); QM=()
while [ $# -gt 0 ]; do
  case "$1" in
    --only) ONLY="${2:-}"; shift 2 ;;
    --dry-run) DRY=(--dry-run); shift ;;
    --quiet-min) QM=(--quiet-min "${2:-}"); shift 2 ;;
    --conf) CONF="${2:-}"; shift 2 ;;
    *) echo "opção desconhecida: $1" >&2; exit 2 ;;
  esac
done
case "$MODE" in mirror|autocommit) ;; *) echo "uso: run-all.sh <mirror|autocommit> [--only nome] [--dry-run] [--conf arquivo]" >&2; exit 2 ;; esac

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONF="${CONF:-${XDG_CONFIG_HOME:-$HOME/.config}/dp-sync/repos.conf}"
STATE="${XDG_CACHE_HOME:-$HOME/.cache}/dp-sync"; mkdir -p "$STATE" && chmod 700 "$STATE"
LOG="$STATE/sync.log"
[ -f "$CONF" ] || { echo "$(date '+%F %T') run-all: lista $CONF não existe" >> "$LOG"; echo "lista $CONF não existe" >&2; exit 2; }

ok=0; falha=0; pulado=0
while IFS='|' read -r repo wt branch mirror pii; do
  repo="${repo//[[:space:]]/}"; [ -z "$repo" ] && continue; case "$repo" in \#*) continue ;; esac
  wt="${wt//[[:space:]]/}"; branch="${branch//[[:space:]]/}"; mirror="${mirror//[[:space:]]/}"; pii="${pii//[[:space:]]/}"
  name="$(basename "$repo")"; [ -n "$ONLY" ] && [ "$ONLY" != "$name" ] && continue
  [ -d "$repo/.git" ] || [ -f "$repo/.git" ] || { echo "$(date '+%F %T') [$name] run-all: caminho não é um repositório ($repo)" >> "$LOG"; falha=$((falha+1)); continue; }
  case "$MODE" in
    mirror)
      case "$mirror" in
        1) timeout 25m nice -n 10 bash "$HERE/mirror-github.sh" --repo "$repo" --branch "${branch:-main}" --quiet "${QM[@]}" "${DRY[@]}" \
             && timeout 25m nice -n 10 bash "$HERE/sync-github.sh" --repo "$repo" --quiet "${DRY[@]}" && ok=$((ok+1)) || falha=$((falha+1)) ;;
        *) pulado=$((pulado+1)) ;;   # ext/0: espelho próprio ou nenhum
      esac ;;
    autocommit)
      [ -n "$wt" ] || { pulado=$((pulado+1)); continue; }
      timeout 25m nice -n 10 bash "$HERE/autocommit-local.sh" --worktree "$wt" --branch computador_local ${pii:+--pii "$pii"} --quiet "${QM[@]}" "${DRY[@]}" && ok=$((ok+1)) || falha=$((falha+1)) ;;
  esac
done < "$CONF"
echo "$(date '+%F %T') run-all $MODE: $ok ok, $falha com erro, $pulado pulado(s)" >> "$LOG"
exit 0
