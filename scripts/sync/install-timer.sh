#!/usr/bin/env bash
# Instala (ou remove) um timer systemd de USUÁRIO que roda sync-github.sh de hora em hora.
# Não faz nada até você executar. Copia o script para um local estável (~/.local/share/dp-sync), para o
# timer continuar funcionando mesmo que o checkout esteja em outra branch.
#
#   bash scripts/sync/install-timer.sh [--repo <caminho>]     # instala (padrão: este repositório)
#   bash scripts/sync/install-timer.sh --remove               # remove
set -euo pipefail

UNIT=dp-sync-github
DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
DEST="$HOME/.local/share/dp-sync"

if [ "${1:-}" = "--remove" ]; then
  systemctl --user disable --now "$UNIT.timer" 2>/dev/null || true
  rm -f "$DIR/$UNIT.service" "$DIR/$UNIT.timer"
  systemctl --user daemon-reload
  echo "removido (o script copiado em $DEST e o log em ~/.cache/dp-sync foram mantidos)"
  exit 0
fi

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
[ "${1:-}" = "--repo" ] && REPO="$(cd "${2:?informe o caminho}" && pwd)"

mkdir -p "$DIR" "$DEST"
install -m 755 "$(dirname "${BASH_SOURCE[0]}")/sync-github.sh" "$DEST/sync-github.sh"

cat > "$DIR/$UNIT.service" <<UNITEOF
[Unit]
Description=Sincroniza o repositório local com o GitHub (somente fast-forward)

[Service]
Type=oneshot
ExecStart=/bin/bash $DEST/sync-github.sh --repo $REPO --quiet
Nice=10
TimeoutStartSec=15min
UNITEOF

cat > "$DIR/$UNIT.timer" <<UNITEOF
[Unit]
Description=Sincronização horária com o GitHub

[Timer]
OnCalendar=hourly
RandomizedDelaySec=120
Persistent=true

[Install]
WantedBy=timers.target
UNITEOF

systemctl --user daemon-reload
systemctl --user enable --now "$UNIT.timer"
systemctl --user list-timers "$UNIT.timer" --no-pager
echo "ok — log em ~/.cache/dp-sync/sync.log"
