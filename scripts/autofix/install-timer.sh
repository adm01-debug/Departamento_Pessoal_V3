#!/usr/bin/env bash
# Instala (ou remove) um timer systemd de USUÁRIO que roda o autofix todo dia de madrugada.
# Não roda nada por si só até você executar este script. Sem push: o resultado fica numa
# branch local autofix/<data> no worktree ~/projetos/_worktrees/Departamento_Pessoal_V3-autofix.
#
#   bash scripts/autofix/install-timer.sh            # instala (03:40 diário)
#   bash scripts/autofix/install-timer.sh --remove   # remove
set -euo pipefail

UNIT=dp-autofix
DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [ "${1:-}" = "--remove" ]; then
  systemctl --user disable --now "$UNIT.timer" 2>/dev/null || true
  rm -f "$DIR/$UNIT.service" "$DIR/$UNIT.timer"
  systemctl --user daemon-reload
  echo "removido"
  exit 0
fi

NODE="$(command -v node)" || { echo "node não encontrado no PATH; nada instalado" >&2; exit 1; }
mkdir -p "$DIR"

cat > "$DIR/$UNIT.service" <<EOF
[Unit]
Description=Autofix do Departamento_Pessoal_V3 (sem IA)

[Service]
Type=oneshot
WorkingDirectory=$REPO
Environment="PATH=$(dirname "$NODE"):/usr/local/bin:/usr/bin:/bin"
ExecStart="$NODE" "$REPO/scripts/autofix/run.mjs"
# Depois do autofix, confere as regras de negócio do origin/main (cálculo e dados). Falha aqui não derruba o serviço.
ExecStart=-"$NODE" "$REPO/scripts/autofix/regras/verificar.mjs" --cwd "$REPO" --ref origin/main
Nice=10
TimeoutStartSec=3h
EOF

cat > "$DIR/$UNIT.timer" <<EOF
[Unit]
Description=Autofix diário

[Timer]
OnCalendar=*-*-* 03:40:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now "$UNIT.timer"
systemctl --user list-timers "$UNIT.timer" --no-pager
echo "ok — relatórios em ~/.autofix-reports/Departamento_Pessoal_V3/ (regras/ULTIMO.md = gaps de negócio)"
