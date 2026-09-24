# Auditoria de identidade visual dos bancos

Pesquisa e verificação feitas em **2026-09-24**. `BancoLogo` (em
`ContasBancariasTab.tsx`) só renderiza um asset real quando a entrada em
`BANK_CATALOG` (`src/lib/bankBrand.ts`) tem `verified: true` — sem isso, cai
no fallback de sigla + cor, nunca numa logo não confirmada.

Critério de aprovação: o asset precisa ser um **símbolo/monograma/app icon
oficial compacto** (sem o nome do banco escrito por extenso ao lado),
baixado diretamente do domínio oficial do banco ou de uma conta de
desenvolvedor oficial confirmada na Play Store, e comparado visualmente
contra a identidade visual atual da marca antes de entrar no catálogo.

## Em uso (verificado)

| Banco | Código | Asset | Tipo | Fonte | URL de origem | Motivo da aprovação |
|---|---|---|---|---|---|---|
| Banco do Brasil | 001 | 001.png | app-icon | Play Store (dev. "Banco do Brasil SA") | play.google.com/store/apps/details?id=br.com.bb.android | Ícone do app oficial (quadrado amarelo, losango azul) — mesmo símbolo do favicon de bb.com.br, agora em alta resolução |
| Santander | 033 | 033.png | app-icon | Play Store (dev. "Banco Santander (Brasil) S.A.") | play.google.com/store/apps/details?id=com.santander.app | Ícone do app "Santander Brasil" (chama branca sobre vermelho, com tarja verde/amarela BR) — confere com favicon do próprio domínio |
| Caixa Econômica Federal | 104 | 104.png | app-icon | Play Store (dev. "Caixa Econômica Federal") | play.google.com/store/apps/details?id=br.com.gabba.Caixa | Ícone do app "CAIXA" oficial — símbolo "X" isolado (mesma forma usada dentro do wordmark "CAIXA") |
| Bradesco | 237 | 237.png | symbol | favicon do domínio oficial banco.bradesco | banco.bradesco/favicon.ico | Símbolo da árvore/tronco isolado, sem "bradesco" escrito — mesmo ícone usado na aba do navegador do site institucional |
| Itaú Unibanco | 341 | 341.svg | app-icon | Wikimedia Commons (conferido contra o infobox atual de pt.wikipedia.org/wiki/Itaú_Unibanco) | commons.wikimedia.org/wiki/File:Itaú_Unibanco_logo_2023.svg | App icon oficial: praça laranja arredondada com "itaú" — mantido da auditoria anterior, já correto |
| Nubank | 260 | 260.png | app-icon | Play Store (dev. "Nu") | play.google.com/store/apps/details?id=com.nu.production | Ícone "nu" branco sobre roxo sólido — substituiu 2x: primeiro o SVG (só letras, sem fundo), depois o favicon do próprio domínio (que tinha ~10% de margem preta opaca nos cantos, um defeito de exportação do gerador de favicon, não do app real). Auditoria de pixel confirmou o app icon da Play Store é um quadrado 100% roxo sólido, sem nenhum canto preto |
| C6 Bank | 336 | 336.png | app-icon | Play Store (dev. "C6 Bank") | play.google.com/store/apps/details?id=com.c6bank.app | Ícone do app oficial — monograma "C6" branco sobre quadrado escuro |
| Banrisul | 041 | 041.png | app-icon | Play Store (dev. "Banrisul S.A.") | play.google.com/store/apps/details?id=br.com.banrisul | Ícone do app oficial — 3 hexágonos coloridos entrelaçados sobre azul-marinho, mesmo símbolo do topo do lockup "banrisul" |
| Sicredi | 748 | 748.png | app-icon | Play Store (dev. "Sicredi", app "Sicredi X") | play.google.com/store/apps/details?id=br.com.sicredi.app | Ícone do app oficial — catavento branco sobre verde vibrante; substituiu o favicon 16×16 (baixa resolução) do site por uma versão 512×512 com melhor contraste |
| Sicoob | 756 | 756.png | symbol | apple-touch-icon do domínio oficial sicoob.com.br | sicoob.com.br/o/sicoob-theme/images/favicon/apple-icon-152x152.png | Símbolo dos triângulos isolado, sem "SICOOB" escrito — mesmo ícone da aba do navegador |
| Banco Votorantim (BV) | 655 | 655.svg | monogram | Wikimedia Commons (conferido contra o favicon oficial de bv.com.br, mesmo desenho) | commons.wikimedia.org/wiki/File:Banco_BV_Logo.svg | Monograma "BV" estilizado — mantido da auditoria anterior, confirmado idêntico ao favicon atual do domínio oficial |
| Banco Safra | 422 | 422.png | symbol | apple-touch-icon do domínio oficial safra.com.br | safra.com.br/.../assets/img/fav/apple-touch-icon-152x152.png | Brasão/monograma "JS" oficial da marca — cor azul-marinho sem contraste contra o fundo escuro do app, por isso usa `logoBg: 'light'` |
| Banco Inter | 077 | 077.svg | symbol | favicon.svg do domínio oficial bancointer.com.br | bancointer.com.br/favicon.svg | Símbolo dos raios de sol isolado, sem "inter" escrito — mesmo ícone da aba do navegador do site institucional |

## Fallback (nenhum símbolo compacto confirmado)

### Banco Original (212)

Nenhum símbolo/app icon compacto pôde ser confirmado. Fontes pesquisadas e
o que se encontrou:

- **original.com.br**: `favicon.svg`, `favicon.ico`, `apple-touch-icon.png` e
  os caminhos listados no próprio `site.webmanifest` do domínio
  (`/android-chrome-192x192.png`, `/android-chrome-512x512.png`) devolveram
  o HTML de fallback do app (SPA), não o arquivo de imagem — apesar do
  `site.webmanifest` em si ter respondido com JSON válido referenciando
  esses ícones.
- **Google Play**: o pacote esperado (`br.com.original.bank`, encontrado via
  busca) retornou 404 no momento da checagem.
- **Apple App Store / iTunes Search API**: busca pelo nome do app
  ("Original Instantâneo e Digital") e pela conta de desenvolvedor
  ("Banco Original S/A", id954995032) não retornou resultado com ícone
  extraível via `itunes.apple.com/search` nem `itunes.apple.com/lookup`.

Mantém o fallback de sigla ("Orig") + cor em `BANK_CATALOG['212']` até
alguém confirmar manualmente um link de asset que funcione.

## Adicionar um novo banco / atualizar um existente

1. Confirme que o asset é um **símbolo/monograma/app icon compacto** (sem o
   nome escrito por extenso ao lado) — priorize, nesta ordem: site oficial
   (favicon/apple-touch-icon/manifest), Play Store/App Store da conta de
   desenvolvedor oficial, Wikimedia Commons (só se conferir contra a
   identidade atual). Evite agregadores de logo de terceiros.
2. Baixe o arquivo para `src/assets/banks/<código COMPE>.(png|svg)`.
3. Importe e adicione/atualize a entrada em `BANK_CATALOG`
   (`src/lib/bankBrand.ts`) com `logoSrc`, `logoType`, `verified: true`,
   `sourceType`, `sourceUrl` e `verifiedAt` (data de hoje).
4. Amostre as cores do asset contra o fundo do app (`#111C2A`) — só use
   `logoBg: 'light'` se a cor não tiver contraste suficiente sozinha.
5. Atualize a tabela acima.

Nenhum outro arquivo precisa mudar — `BancoLogo` já resolve `logoSrc`
automaticamente via `resolveBankBrand`, e só renderiza quando
`verified: true`.
