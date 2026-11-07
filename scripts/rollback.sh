#!/usr/bin/env bash
set -euo pipefail

echo "ERRO: rollback.sh não possui rotina de reversão configurada; nenhuma alteração foi aplicada." >&2
exit 1
