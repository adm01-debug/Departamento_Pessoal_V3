#!/usr/bin/env bash
# Instala (ou remove) o timer systemd de USUÁRIO que roda autocommit-local.sh de hora em hora (hh:30).
#
#   bash scripts/sync/install-autocommit-timer.sh --worktree <pasta> [--branch computador_local]
#   bash scripts/sync/install-autocommit-timer.sh --remove
set -euo pipefail

UNIT=dp-autocommit
DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
DEST="$HOME/.local/share/dp-sync"

if [ "${1:-}" = "--remove" ]; then
  systemctl --user disable --now "$UNIT.timer" 2>/dev/null || true
  rm -f "$DIR/$UNIT.service" "$DIR/$UNIT.timer"
  systemctl --user daemon-reload
  echo "removido (o script em $DEST e o log em ~/.cache/dp-sync foram mantidos)"
  exit 0
fi

WT=""; BRANCH="computador_local"
while [ $# -gt 0 ]; do
  case "$1" in
    --worktree) WT="$(cd "${2:?informe a pasta}" && pwd)"; shift 2 ;;
    --branch) BRANCH="${2:?informe a branch}"; shift 2 ;;
    *) echo "opção desconhecida: $1" >&2; exit 2 ;;
  esac
done
[ -n "$WT" ] || { echo "informe --worktree <pasta do worktree de desenvolvimento>" >&2; exit 2; }

mkdir -p "$DIR" "$DEST"
install -m 755 "$(dirname "${BASH_SOURCE[0]}")/autocommit-local.sh" "$DEST/autocommit-local.sh"

cat > "$DIR/$UNIT.service" <<UNITEOF
[Unit]
Description=Commit automático do trabalho local na branch $BRANCH e envio ao GitHub

[Service]
Type=oneshot
ExecStart=/bin/bash $DEST/autocommit-local.sh --worktree $WT --branch $BRANCH --quiet
Nice=10
TimeoutStartSec=15min
UNITEOF

cat > "$DIR/$UNIT.timer" <<UNITEOF
[Unit]
Description=Commit automático horário (hh:30)

[Timer]
OnCalendar=*-*-* *:30:00
RandomizedDelaySec=60
Persistent=true

[Install]
WantedBy=timers.target
UNITEOF

systemctl --user daemon-reload
systemctl --user enable --now "$UNIT.timer"
systemctl --user list-timers "$UNIT.timer" --no-pager
echo "ok — log em ~/.cache/dp-sync/sync.log"
