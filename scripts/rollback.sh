#!/bin/bash
# rollback script
# Departamento Pessoal

set -e

# Sem rotina implementada: falhar em vez de imprimir "Done!" sem ter feito nada.
echo "ERRO: scripts/rollback.sh não tem rotina de rollback implementada; nada foi executado." >&2
echo "Para reverter produção, promova o deploy anterior na Vercel ou reverta o merge na main." >&2
exit 1
