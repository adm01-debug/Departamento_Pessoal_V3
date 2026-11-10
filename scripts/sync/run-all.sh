#!/usr/bin/env bash
# Orquestrador: aplica a arquitetura "espelho + computador_local" a TODOS os repositórios listados em repos.conf.
#
#   run-all.sh mirror     [--only <nome>] [--dry-run]   espelho exato da main + fast-forward dos demais branches (hh:00)
#   run-all.sh autocommit [--only <nome>] [--dry-run]   commit automático + push da branch computador_local (hh:30)
#   (ambos aceitam --quiet-min N: quantos minutos sem edição antes de agir; 0 = agir já)
#
# Lista: ${XDG_CONFIG_HOME:-~/.config}/dp-sync/repos.conf — uma linha por repositório, campos separados por |
#   repo|worktree_dev|branch_padrao|mirror|pii[|push]
#     repo          caminho do checkout principal (o ESPELHO)
#     worktree_dev  caminho do worktree de desenvolvimento na branch computador_local (vazio = sem autocommit)
#     branch_padrao main
#     mirror        1 = este orquestrador espelha; ext = o repositório já tem espelho próprio (não toco); 0 = nenhum
#     pii           dados pessoais a barrar no autocommit (ex.: cpf,cnpj)
#     push          opcional: vazio ou 1 = commit + push da computador_local; 0 = só commit LOCAL (nada é enviado)
# Linhas começando com # e linhas vazias são ignoradas. Um repositório com problema NÃO impede os demais.
set -uo pipefail
# PATH explícito: sob o systemd o PATH não inclui ~/.local/bin (onde está o gitleaks) e as travas falham fechadas.
export PATH="$HOME/.local/bin:$HOME/.local/opt/node/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
# Operação sem supervisão: NUNCA roda hooks do repositório (ex.: reconstrução em segundo plano a cada troca de branch,
# husky). Vale para todos os `git` deste script e dos filhos.
_n="${GIT_CONFIG_COUNT:-0}"; export "GIT_CONFIG_KEY_$_n=core.hooksPath" "GIT_CONFIG_VALUE_$_n=/dev/null" GIT_CONFIG_COUNT=$((_n+1))   # acrescenta; não apaga a config do usuário via ambiente

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

ok=0; falha=0; pulado=0; atencao=0
trim() { local v="${1%$'\r'}"; v="${v#"${v%%[![:space:]]*}"}"; v="${v%"${v##*[![:space:]]}"}"; printf '%s' "$v"; }
# Resultado de um script: 0 = ok; 75 = "precisa de atenção" (rede/credencial fora do ar, push recusado, segredo barrado...): o script
# já falhou de forma SEGURA, mas não pode ficar invisível. Conta falhas consecutivas por repositório e por modo; a partir de
# 3 seguidas (3 horas) o serviço sai com erro e aparece em `systemctl --user --failed`. Qualquer outro código ≠ 0 = falha na hora.
resultado() { # resultado <nome> <rc>
  local f="$STATE/consec-$MODE-$1" c
  if [ "$2" -eq 0 ]; then rm -f "$f"; ok=$((ok+1)); return; fi
  if [ "$2" -eq 75 ]; then
    c=$(( $(cat "$f" 2>/dev/null || echo 0) + 1 )); printf '%s' "$c" > "$f"
    if [ "$c" -ge 3 ]; then echo "$(date '+%F %T') [$1] run-all $MODE: ATENÇÃO há $c execuções seguidas sem concluir (rede/credencial/push/segredo) — veja as linhas acima" >> "$LOG"; falha=$((falha+1)); else atencao=$((atencao+1)); fi
    return
  fi
  falha=$((falha+1))
}
while IFS='|' read -r repo wt branch mirror pii push || [ -n "${repo:-}" ]; do
  repo="$(trim "$repo")"; [ -z "$repo" ] && continue; case "$repo" in \#*) continue ;; esac
  wt="$(trim "${wt:-}")"; branch="$(trim "${branch:-}")"; mirror="$(trim "${mirror:-}")"; pii="${pii//[[:space:]]/}"; pii="${pii%$'\r'}"; push="${push//[[:space:]]/}"
  name="$(basename "$repo")"; [ -n "$ONLY" ] && [ "$ONLY" != "$name" ] && continue
  [ -d "$repo/.git" ] || [ -f "$repo/.git" ] || { echo "$(date '+%F %T') [$name] run-all: caminho não é um repositório ($repo)" >> "$LOG"; falha=$((falha+1)); continue; }
  case "$MODE" in
    mirror)
      case "$mirror" in
        1) timeout 25m nice -n 10 bash "$HERE/mirror-github.sh" --repo "$repo" --branch "${branch:-main}" --quiet "${QM[@]}" "${DRY[@]}" </dev/null; rc=$?
           if [ "$rc" -eq 0 ]; then timeout 25m nice -n 10 bash "$HERE/sync-github.sh" --repo "$repo" --quiet "${DRY[@]}" </dev/null; rc=$?; fi
           resultado "$name" "$rc" ;;
        ext) # espelho PRÓPRIO do repositório (não o reseto), mas a computador_local ainda precisa acompanhar a main: o sync só faz
             # fast-forward (nunca reset/merge/push), então é seguro rodá-lo aqui
             timeout 25m nice -n 10 bash "$HERE/sync-github.sh" --repo "$repo" --quiet "${DRY[@]}" </dev/null; resultado "$name" $? ;;
        *) pulado=$((pulado+1)) ;;   # 0: nenhum
      esac ;;
    autocommit)
      [ -n "$wt" ] || { pulado=$((pulado+1)); continue; }
      # push: valor desconhecido (ex.: "nao", "0|obs") NÃO vira push — num repositório público o engano custaria caro
      case "$push" in ''|1) NOPUSH=() ;; 0) NOPUSH=(--no-push) ;;
        *) echo "$(date '+%F %T') [$name] run-all: campo push inválido ('$push') em $CONF — use vazio, 1 ou 0; NADA foi feito neste repositório" >> "$LOG"; falha=$((falha+1)); continue ;;
      esac
      timeout 25m nice -n 10 bash "$HERE/autocommit-local.sh" --worktree "$wt" --branch computador_local ${pii:+--pii "$pii"} "${NOPUSH[@]}" --quiet "${QM[@]}" "${DRY[@]}" </dev/null; resultado "$name" $? ;;
  esac
done < "$CONF"
echo "$(date '+%F %T') run-all $MODE: $ok ok, $atencao com atenção (1ª/2ª vez), $falha com erro, $pulado pulado(s)" >> "$LOG"
# status 1 quando algum repositório falhou: aparece em `systemctl --user --failed`
[ "$falha" -gt 0 ] && exit 1
exit 0
