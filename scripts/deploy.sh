#!/bin/bash
# deploy script
# Departamento Pessoal

set -e

# Sem rotina implementada: falhar em vez de imprimir "Done!" sem ter feito nada.
echo "ERRO: scripts/deploy.sh não tem rotina de deploy implementada; nada foi executado." >&2
echo "O deploy de produção é automático na Vercel a cada merge na main (AGENTS.md, seção 6)." >&2
exit 1
