# Vercel — Configuração e URLs

> Última revisão: 15/10/2026

## URL Canônica de Produção

⚠️ Há discrepância entre APP_URL e a homepage do repositório:

| Campo                       | Valor                                |
| --------------------------- | ------------------------------------ |
| Variable `APP_URL` (GitHub) | `departamento-pessoal-v3.vercel.app` |
| Homepage do repositório     | `visao-v2-mmp4.vercel.app`           |

**Ação necessária (W90):** Confirmar qual é a URL canônica real de produção na dashboard
Vercel e alinhar `APP_URL` com a homepage do repositório.

## Projeto Vercel

- Integration: GitHub App conectado ao repositório
- Deploy automático: push na main → Vercel build
- Preview deploys: habilitado em PRs via integração Git

## Healthcheck

O workflow `healthcheck.yml` usa `APP_URL` para verificar disponibilidade.
Se `APP_URL` estiver incorreto, o healthcheck pode retornar falso-positivo/negativo.
