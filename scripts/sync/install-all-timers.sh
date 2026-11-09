#!/usr/bin/env bash
# Instala (ou remove) os 2 timers systemd de USUÁRIO que aplicam a arquitetura a TODOS os repositórios de repos.conf:
#   dp-sync-all        hh:00  run-all.sh mirror      (espelho exato da main + fast-forward dos demais branches)
#   dp-autocommit-all  hh:30  run-all.sh autocommit  (commit automático + push da branch computador_local)
# Migra os timers antigos de um repositório só (dp-sync-github, dp-autocommit): são desativados e removidos, porque o
# Departamento_Pessoal_V3 passa a ser uma linha de repos.conf como os demais.
#
#   bash scripts/sync/install-all-timers.sh            # instala/atualiza
#   bash scripts/sync/install-all-timers.sh --remove   # remove os 2 timers (os scripts e o log ficam)
set -euo pipefail

DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
DEST="$HOME/.local/share/dp-sync"
CONF="${XDG_CONFIG_HOME:-$HOME/.config}/dp-sync/repos.conf"
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "${1:-}" = "--remove" ]; then
  for u in dp-sync-all dp-autocommit-all; do systemctl --user disable --now "$u.timer" 2>/dev/null || true; rm -f "$DIR/$u.service" "$DIR/$u.timer"; done
  systemctl --user daemon-reload; echo "removidos"; exit 0
fi

[ -f "$CONF" ] || { echo "falta a lista de repositórios: $CONF (veja repos.conf.example)" >&2; exit 2; }
mkdir -p "$DIR" "$DEST"
for f in mirror-github.sh sync-github.sh autocommit-local.sh run-all.sh; do install -m 755 "$SRC/$f" "$DEST/$f"; done

mk() { # mk <unidade> <descrição> <modo> <minuto>
  cat > "$DIR/$1.service" <<UNITEOF
[Unit]
Description=$2

[Service]
Type=oneshot
ExecStart=/bin/bash $DEST/run-all.sh $3
Nice=10
TimeoutStartSec=2h
UNITEOF
  cat > "$DIR/$1.timer" <<UNITEOF
[Unit]
Description=$2 (hh:$4)

[Timer]
OnCalendar=*-*-* *:$4:00
RandomizedDelaySec=60
Persistent=true

[Install]
WantedBy=timers.target
UNITEOF
}
mk dp-sync-all "Espelho exato da main e fast-forward em todos os repositórios" mirror 00
mk dp-autocommit-all "Commit automático da branch computador_local em todos os repositórios" autocommit 30

# migra os timers antigos de um repositório só
for old in dp-sync-github dp-autocommit; do
  systemctl --user disable --now "$old.timer" 2>/dev/null || true
  rm -f "$DIR/$old.service" "$DIR/$old.timer"
done
systemctl --user daemon-reload
systemctl --user enable --now dp-sync-all.timer dp-autocommit-all.timer
systemctl --user list-timers dp-sync-all.timer dp-autocommit-all.timer --no-pager
echo "ok — lista: $CONF — log: ~/.cache/dp-sync/sync.log"
