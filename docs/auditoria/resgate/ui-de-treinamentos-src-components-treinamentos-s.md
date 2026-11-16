# UI de treinamentos (src/components/treinamentos, src/pages/TreinamentosPage.tsx) — exceto trainingImages

A main tem uma única página monolítica de 936 linhas com 6 abas em tabelas cruas, e foi ela que recebeu as correções funcionais de outubro/novembro: validação Zod nas gravações, certificado em PDF de verdade, log de acesso a dado pessoal e, em 13/11, o seletor de status da inscrição e o botão Editar do curso. A muri reescreveu a mesma tela em 66 arquivos (400 KB de componentes + 139 KB de testes) com KPIs calculados, filtros, paginação, estados de erro com "tentar novamente", cards e uma aba Turmas completa com agenda semanal, calendário e criação de turma — mas parou em 23/10 e por isso não tem nenhuma das correções da main. Adotar a página da muri inteira apagaria quatro funcionalidades que hoje funcionam em produção; o caminho é trazer o layout da muri e reenxertar as ações da main dentro dele.

| decisão             | esforço | arq. | grupo                                                                                                                |
| ------------------- | ------- | ---- | -------------------------------------------------------------------------------------------------------------------- |
| RECUPERAR           | medio   | 12   | G0 — Núcleo compartilhado da área (derivações, badges, abas, KPIs, shell de cascata)                                 |
| RECUPERAR_COM_MERGE | alto    | 4    | G1 — Página TreinamentosPage + aba Treinamentos (o ponto onde as correções da main têm de ser reenxertadas)          |
| RECUPERAR_COM_MERGE | medio   | 5    | G2 — Aba Catálogo (grid de cards de curso)                                                                           |
| RECUPERAR_COM_MERGE | medio   | 7    | G3 — Aba Inscrições                                                                                                  |
| RECUPERAR_COM_MERGE | medio   | 9    | G4 — Aba Certificados                                                                                                |
| RECUPERAR_COM_MERGE | medio   | 9    | G5 — Aba Trilhas + TrilhaCursosSection (único arquivo da pasta que existe nas duas pontas)                           |
| RECUPERAR           | medio   | 20   | G6 — Aba Turmas / Instâncias completa (agenda, calendário, criar turma) — ganho puro, sem nada a reenxertar          |
| RECUPERAR_COM_MERGE | baixo   | 2    | G7 — TrainingCover (capa dos cards) — acoplamento com trainingImages é só de tipo                                    |
| RECUPERAR_COM_MERGE | baixo   | 2    | G8 — Mock de demonstração + override de lint (habilitadores, sem os quais o G1 e o G5 não compilam nem passam no CI) |
| OBSOLETO            | baixo   | 1    | G9 — catalogoCursoService da muri                                                                                    |
| RECUPERAR           | baixo   | 1    | G10 — TreinamentosCard do detalhe do colaborador (não pertence a esta área; morto sozinho)                           |

## G0 — Núcleo compartilhado da área (derivações, badges, abas, KPIs, shell de cascata)

`RECUPERAR` · esforço medio · 12 arquivos

**Valor para o negócio.** É a base sem a qual nenhum outro grupo compila. Entrega sozinho os 4 KPIs calculados (participação ativa, conclusão no período, pendências obrigatórias, certificados emitidos) com tooltip honesto quando não há dado — hoje a main mostra 6 contagens cruas (main-TreinamentosPage.tsx:326-367).

**Risco de regressão.** Baixo e contido: são arquivos NOVOS, nenhum sobrescreve código da main. O único risco é de CI, não de produto: a main roda `lint:ci --max-warnings=1` com `@typescript-eslint/no-explicit-any: warn` (eslint.config.js:45 e package.json:40) — ver G8. Perda pequena e deliberada: as contagens brutas de cursos/trilhas/turmas saem do topo da tela (ficam visíveis no rótulo de paginação de cada aba).

**Evidência.** Mapa de dependências intra-pasta (saída de comando): todos os 40 componentes da muri importam `./treinamentosDerivacoes` direta ou transitivamente; TreinamentoBadges.tsx -> treinamentosDerivacoes; TreinamentosKpis.tsx -> treinamentosDerivacoes + @/components/dashboard/AnimatedNumber. Infra já presente e IDÊNTICA na main: `git diff --stat origin/main origin/muri -- src/components/ui/cascade-motion.ts src/lib/motionMode.ts src/components/ui/entrada-cards.tsx src/components/ui/app-pagination.tsx` não retorna nada. `git show origin/main:src/components/ui/cascade-motion.ts \| grep ^export` mostra cascadeItemVariants:36, cascadeShellVariants:75. `src/components/premiacoes/premiacoesEntrada.ts` só existe na muri (4304 bytes) e sua única dependência é MAX_ENTRADA_INDEX, presente na main em src/components/ui/entrada-cards.tsx:75.

**Plano.** 1) Copiar os 12 arquivos de origin/muri para a main sem edição, exceto premiacoesEntrada.ts que vai para src/components/premiacoes/premiacoesEntrada.ts. 2) Conferir que nenhum deles importa @/mocks (nenhum importa: só TrilhaCursosSection.tsx importa, ver G5). 3) Rodar `npx vitest run src/components/treinamentos` — os 3 testes deste grupo só importam módulos relativos e vitest, sem rede nem Supabase. 4) Aplicar o override de lint do G8 ANTES de abrir PR. Este grupo não altera nenhuma tela: sem o G1 ele é código novo não importado, portanto G0 e G1 vão na MESMA PR.

<details><summary>Arquivos (12)</summary>

- `src/components/treinamentos/treinamentosDerivacoes.ts`
- `src/components/treinamentos/treinamentosFiltrosComum.tsx`
- `src/components/treinamentos/TreinamentoBadges.tsx`
- `src/components/treinamentos/TreinamentoParticipantes.tsx`
- `src/components/treinamentos/TreinamentosCascadeDialog.tsx`
- `src/components/treinamentos/TreinamentosCascadeAlertDialog.tsx`
- `src/components/treinamentos/TreinamentosTabsList.tsx`
- `src/components/treinamentos/TreinamentosKpis.tsx`
- `src/components/treinamentos/__tests__/treinamentosDerivacoes.test.ts`
- `src/components/treinamentos/__tests__/catalogoDerivacoes.test.ts`
- `src/components/treinamentos/__tests__/TreinamentosTabsList.test.tsx`
- `src/components/premiacoes/premiacoesEntrada.ts`

</details>

## G1 — Página TreinamentosPage + aba Treinamentos (o ponto onde as correções da main têm de ser reenxertadas)

`RECUPERAR_COM_MERGE` · esforço alto · 4 arquivos

**Valor para o negócio.** É a tela que o RH abre. Entrega filtros, busca, KPIs, paginação, confirmação de exclusão e estados de erro/vazio nas 6 abas, SEM perder criar/editar/excluir que já funcionam hoje.

**Risco de regressão.** ALTÍSSIMO se copiada inteira. A main perderia, nominalmente: (a) alterar o status da inscrição — inscrito/em andamento/concluído/reprovado/cancelado, com gravação de data_conclusao e recarga dos certificados gerados pelo trigger tr_auto_generate_certificate (main:294-311, PR #492 de 13/11); (b) editar curso do catálogo (main:216-249 e :677-679); (c) certificado em PDF real + abertura de arquivo_url com guarda contra URL `javascript:` (main:123-137); (d) log de acesso a dado pessoal no download do certificado (main:133-136, LGPD); (e) validação Zod no insert de treinamentos (main:59). Itens (c), (d) e (e) entraram na main em 05/10 (#169) e 12/10 (#214), DEPOIS do merge-base de 30/07 e sem nunca chegar à muri — a muri simplesmente nunca os viu.

**Evidência.** A página da muri (1129 linhas) não contém NENHUMA das funcionalidades da main: `grep -cE 'atualizarInscricao\|atualizarCurso\|cursoEditId\|validateTablePayload\|registrarAcessoPII\|jsPDF' muri-TreinamentosPage.tsx` = 0 em todos; na main existem em TreinamentosPage.tsx:296 (atualizarInscricao), :225 (atualizarCurso), :238 (editarCurso), :59 (validateTablePayload), :133 (registrarAcessoPII), :123-137 (abrirCertificado com jsPDF). Lista de mutations: main tem criarTrein/excluirTrein/criarCurso/excluirCurso/criarTrilha/excluirTrilha/criarInsc/atualizarInsc; muri tem as mesmas MENOS atualizarInsc e MAIS criarTurma. Regressão de validação concreta: main TreinamentosPage.tsx:57-59 `.insert(validateTablePayload('treinamentos', d, 'TreinamentosPage:treinamentos'))` contra muri linha 108 `.insert(d)`. A main também não trata erro de query: `grep -c isError main-TreinamentosPage.tsx` = 0, contra muri linhas 163-164 e 180-181 (isError + refetch).

**Plano.** Partir do arquivo da muri e reaplicar, um a um, os 5 itens da main. Passos: 1) `git show origin/muri:src/pages/TreinamentosPage.tsx > src/pages/TreinamentosPage.tsx`. 2) Restaurar a validação: no treinamentosService local, trocar `.insert(d)` por `.insert(validateTablePayload('treinamentos', d, 'TreinamentosPage:treinamentos'))` e adicionar `import { validateTablePayload } from '@/schemas/validate'`. 3) Copiar de origin/main:src/pages/TreinamentosPage.tsx as linhas 70-137 (função `gerarCertificadoPdf` + handler `abrirCertificado`) e os imports `jsPDF`, `registrarAcessoPII`, `format` de date-fns; passar `onVer={abrirCertificado}` ao CertificadosPainel (G4). 4) Copiar a mutation `atualizarInsc` (main:294-311) e passá-la ao InscricoesPainel como `onAlterarStatus` (G3). 5) Copiar o estado `cursoEditId`/`cursoFormVazio` e a função `editarCurso` (main:205-249), ajustar a mutation criarCurso da muri para o ramo `cursoEditId ? atualizarCurso : criarCurso`, e passar `onEditar={editarCurso}` ao TreinamentosCatalogo (G2). 6) Manter `criarTurma` da muri (muri:515-517) — é ganho puro, ver G6. 7) NÃO trazer o catalogoCursoService da muri (G9): manter o da main, que já exporta os tipos InscricaoComJoins/CertificadoComJoins que a página usa. 8) Verificar: `npm run typecheck && npm run lint:ci && npx vitest run src/components/treinamentos && npm run build`. 9) Teste manual obrigatório na Vercel após merge: trocar o status de uma inscrição para concluído e ver o certificado aparecer; editar um curso; clicar Ver num certificado sem arquivo_url e conferir que baixa o PDF. Só depende de G0; precisa de G2..G7 no mesmo PR porque a página importa todos os painéis.

<details><summary>Arquivos (4)</summary>

- `src/pages/TreinamentosPage.tsx`
- `src/components/treinamentos/TreinamentosFiltros.tsx`
- `src/components/treinamentos/TreinamentosTabela.tsx`
- `src/components/treinamentos/TreinamentoAcoes.tsx`

</details>

## G2 — Aba Catálogo (grid de cards de curso)

`RECUPERAR_COM_MERGE` · esforço medio · 5 arquivos

**Valor para o negócio.** Catálogo com busca, filtro por categoria/modalidade/obrigatoriedade, ordenação, paginação e contagem de participantes por curso — hoje é uma tabela sem nenhum filtro. A exclusão passa a pedir confirmação em vez de apagar no clique.

**Risco de regressão.** Perde o botão Editar do curso (PR #492, 13/11) se entrar como está. A edição de curso é a única edição que existe na área — o próprio PR #492 registra que treinamentos e trilhas ficaram de fora por falta de método no serviço.

**Evidência.** `origin/muri:src/components/treinamentos/TreinamentosCatalogo.tsx:90-95` — a interface de props só tem `cursos`, `participantesPorCurso`, `carregando`, `onExcluir`; não existe `onEditar`. `origin/muri:src/components/treinamentos/TreinamentoCursoAcoes.tsx:24-28` (comentário do próprio arquivo): "Só expõe ação REAL do catálogo: excluir o curso" — o DropdownMenuContent tem um único DropdownMenuItem, "Excluir curso". Na main, o botão Editar existe em src/pages/TreinamentosPage.tsx:677-679 com `aria-label="Editar"` e `onClick={() => editarCurso(c)}`.

**Plano.** 1) Copiar os 5 arquivos de origin/muri. 2) Em TreinamentoCursoAcoes.tsx, adicionar prop `onEditar: () => void` e um `DropdownMenuItem` com ícone Pencil e texto "Editar curso" ACIMA do item de exclusão, chamando `setMenuAberto(false); onEditar();`. 3) Em TreinamentoCursoCard.tsx, repassar `onEditar` para TreinamentoCursoAcoes. 4) Em TreinamentosCatalogo.tsx, adicionar `onEditar: (curso: CursoCatalogo) => void` em TreinamentosCatalogoProps (linha 90) e repassar no map de cards (linha ~204, onde hoje passa `onExcluir`). 5) Na página (G1), ligar `onEditar={(c) => editarCurso(c as Tables<'catalogo_cursos'>)}` usando a função copiada da main. 6) Verificar abrindo o diálogo em modo edição e salvando: o título precisa virar "Editar Curso" (main:569) e o toast "Curso atualizado!" (main:233). Depende de G0 e entra junto com G1.

<details><summary>Arquivos (5)</summary>

- `src/components/treinamentos/TreinamentosCatalogo.tsx`
- `src/components/treinamentos/TreinamentosCatalogoFiltros.tsx`
- `src/components/treinamentos/TreinamentoCursoCard.tsx`
- `src/components/treinamentos/TreinamentoCursoAcoes.tsx`
- `src/components/treinamentos/__tests__/TreinamentoCursoCard.test.tsx`

</details>

## G3 — Aba Inscrições

`RECUPERAR_COM_MERGE` · esforço medio · 7 arquivos

**Valor para o negócio.** Painel com barra de progresso por inscrição, segmentos por status, filtros, paginação e — depois do merge — a mudança de status que gera o certificado. O painel da muri também já traz a prévia contextual do certificado dentro da linha da inscrição, que a main não tem.

**Risco de regressão.** Se entrar como está, a área volta ao estado anterior a 13/11: nenhuma inscrição pode sair de 'inscrito', nenhum certificado é gerado pelo trigger tr_auto_generate_certificate, e `catalogoCursoService.atualizarInscricao` volta a ser serviço sem chamador. Esta é a regressão mais cara da área inteira.

**Evidência.** `origin/muri:src/components/treinamentos/InscricoesPainel.tsx:225-258` — o componente `AcaoInscricao` é SOMENTE LEITURA: se não houver certificado devolve um `<span>` com title "Nenhuma ação disponível nos dados atuais desta inscrição."; se houver, um botão que só abre a prévia. A coluna "Ações" existe (linha 631) mas não tem seletor de status. A interface InscricoesPainelProps (linhas 33-41) não aceita nenhum callback de escrita. Na main, src/pages/TreinamentosPage.tsx:294-311 é a mutation `atualizarInsc` e :871-889 renderiza o seletor por linha. Mensagem do PR #492: "a tabela de inscrições não tinha ação nenhuma e toda inscrição ficava presa em 'inscrito' (catalogoCursoService.atualizarInscricao sem chamador)".

**Plano.** 1) Copiar os 7 arquivos de origin/muri. 2) Em InscricoesPainelProps (InscricoesPainel.tsx:33-41) adicionar `onAlterarStatus?: (inscricao: InscricaoRegistro, status: string) => void` e `salvandoStatus?: boolean`. 3) Em `AcaoInscricao` (linha 225), ANTES do early-return do `—`, renderizar o Select de status da main com as 5 opções exatas (inscrito, em_andamento, concluido, reprovado, cancelado) chamando `onAlterarStatus`, travado quando `inscricao.statusCodigo === 'concluido'` (a main trava após concluído para não duplicar certificado — ver mensagem do PR #492). 4) ATENÇÃO: o painel renderiza a lista DUAS vezes — tabela acima de 1180px (linha ~636, `LinhaTabela`) e cards abaixo (linha ~658, `CartaoInscricao`); o prop tem de ser repassado nos dois, senão o seletor desaparece no mobile. 5) Na página (G1), passar `onAlterarStatus={(insc, status) => atualizarInsc.mutate({ insc: insc as InscricaoComJoins, status })}`. 6) Verificar: mudar um status para concluído e confirmar que a aba Certificados ganha a linha (a mutation invalida a queryKey ['treinamento_certificados'], main:306). Depende de G0 e G4 (usa certificadosDerivacoes) e entra junto com G1.

<details><summary>Arquivos (7)</summary>

- `src/components/treinamentos/InscricoesPainel.tsx`
- `src/components/treinamentos/InscricoesFiltros.tsx`
- `src/components/treinamentos/InscricoesSegmentos.tsx`
- `src/components/treinamentos/InscricaoStatusBadge.tsx`
- `src/components/treinamentos/inscricoesDerivacoes.ts`
- `src/components/treinamentos/__tests__/InscricoesPainel.test.tsx`
- `src/components/treinamentos/__tests__/inscricoesDerivacoes.test.ts`

</details>

## G4 — Aba Certificados

`RECUPERAR_COM_MERGE` · esforço medio · 9 arquivos

**Valor para o negócio.** Painel de certificados com cards, status de validade (vigente/vencendo/vencido), filtros, segmentos, paginação e cópia do código de autenticação — a main mostra uma tabela crua sem filtro.

**Risco de regressão.** Se entrar como está, o certificado deixa de ter PDF e deixa de abrir o arquivo digitalizado quando existe, e o download para de ser registrado no log de acesso a dado pessoal. Além da perda funcional, o diálogo passa a MENTIR para o usuário dizendo que o arquivo oficial não existe — exatamente o que o PR #214 corrigiu.

**Evidência.** ESTE É O FALSO POSITIVO CLÁSSICO DA ÁREA. `origin/muri:src/components/treinamentos/CertificadoDetalheDialog.tsx:18-19` afirma: "O módulo NÃO possui PDF, download, rota pública de verificação ou arquivo oficial acessível; a ação antiga 'Ver' era apenas um toast", e a linha 168 diz ao usuário "O arquivo oficial do certificado não está [disponível]". Isso era VERDADE no merge-base: `git show 5ddbe25:src/pages/TreinamentosPage.tsx` linha 306 = `onClick={() => toast.info('Impressão em breve')}`. Mas deixou de ser verdade na main em 12/10: `git log -S'gerarCertificadoPdf' origin/main -- src/pages/TreinamentosPage.tsx` = c0e06c1e1 2026-10-12 (#214 "telas honestas"), e hoje main:123-137 abre arquivo_url (só http/https, com guarda explícita contra `javascript:`) ou gera o PDF com jsPDF e registra registrarAcessoPII('treinamento_certificados','download'). A muri escreveu o texto em 23/10 sem nunca ter puxado a main.

**Plano.** 1) Copiar os 9 arquivos de origin/muri. 2) Em CertificadosPainelProps (CertificadosPainel.tsx:48-54) adicionar `onVer?: (certificado: CertificadoRegistro) => void`. 3) Em CertificadoCard.tsx (prop `onVisualizar`, linha 26) manter a prévia, e ADICIONAR um segundo botão "Baixar PDF"/"Abrir arquivo" ligado ao novo `onVer`; o rótulo e o ícone seguem a main: ExternalLink quando `certificado.arquivo_url` existe, Link (download) quando não (main:531-535). 4) Reescrever o bloco de texto de CertificadoDetalheDialog.tsx linhas 18-19 e 166-170: a afirmação de que não há PDF está OBSOLETA e não pode ir para a main. 5) Na página (G1), passar `onVer={abrirCertificado}` com a função copiada de main:123-137 inteira, incluindo a regex `/^https?:\/\//i` e a chamada registrarAcessoPII — não reescrever, copiar. 6) Verificar com um certificado sem arquivo_url (precisa baixar certificado-<codigo>.pdf) e com um certificado cujo arquivo_url seja http (precisa abrir em nova aba com noopener). Depende de G0 e entra junto com G1 e G3 (inscricoesDerivacoes importa certificadosDerivacoes).

<details><summary>Arquivos (9)</summary>

- `src/components/treinamentos/CertificadosPainel.tsx`
- `src/components/treinamentos/CertificadoCard.tsx`
- `src/components/treinamentos/CertificadoDetalheDialog.tsx`
- `src/components/treinamentos/CertificadoStatusBadge.tsx`
- `src/components/treinamentos/CertificadosFiltros.tsx`
- `src/components/treinamentos/CertificadosSegmentos.tsx`
- `src/components/treinamentos/certificadosDerivacoes.ts`
- `src/components/treinamentos/__tests__/CertificadoCard.test.tsx`
- `src/components/treinamentos/__tests__/certificadosDerivacoes.test.ts`

</details>

## G5 — Aba Trilhas + TrilhaCursosSection (único arquivo da pasta que existe nas duas pontas)

`RECUPERAR_COM_MERGE` · esforço medio · 9 arquivos

**Valor para o negócio.** Trilhas passam de tabela a grade de jornadas com banner, filtros e a sequência numerada de cursos; o erro ao desvincular curso deixa de ser silencioso.

**Risco de regressão.** Dois pontos. (1) Tipagem: reintroduz `any` num arquivo que a main limpou em #165 — não é bug de runtime, mas sobe a dívida medida pelo ratchet (scripts/ratchet-any.mjs, citado em eslint.config.js:41-45). (2) Dependência de mock: o import de `@/mocks/treinamentosMock` não compila na main sem o G8. A edição de trilha não é perdida porque nunca existiu: o PR #492 registra que ficou de fora por o serviço não ter método de atualizar.

**Evidência.** `git diff --name-status origin/main origin/muri -- src/components/treinamentos` mostra TrilhaCursosSection.tsx como o ÚNICO 'M' da pasta (os outros 66 são 'A'). O diff do arquivo tira a tipagem que a main ganhou em 02/10 (#165, "-154 any"): a assinatura sai de `cursos: Tables<'catalogo_cursos'>[]` para `cursos: { id: string; nome?: string \| null; carga_horaria?: number \| string \| null }[]`, e o corpo passa a usar `ordenarVinculos(vinculados as any[])` e `vinculados.some((v: any) => ...)`. A versão da muri também importa `bloquearEscritaTreinamentos` de `@/mocks/treinamentosMock`, que não existe na main. Ganho real da muri sobre a main no mesmo arquivo: `onError: () => toast.error('Erro ao desvincular curso')` (a main desvincula em silêncio no erro) e a timeline numerada com estado `isLoading`.

**Plano.** 1) Copiar os 8 arquivos novos de origin/muri. 2) Para TrilhaCursosSection.tsx, partir da versão da MURI (o layout é o ganho) e reaplicar a tipagem da main: assinatura `cursos: Tables<'catalogo_cursos'>[]` com `import type { Tables } from '@/integrations/supabase/database.types'`, e trocar `ordenarVinculos(vinculados as any[])` por `ordenarVinculos(vinculados)` e `(v: any)` por `(v)` — `catalogoCursoService.listarTrilhasCursos` já devolve `TrilhaCursoComCurso[]` tipado na main (origin/main:src/services/catalogoCursoService.ts:143), então os `as any` são desnecessários e o typecheck passa sem eles. Se `ordenarVinculos` reclamar, ajustar a assinatura dela em trilhasDerivacoes.ts para aceitar `TrilhaCursoComCurso[]`. 3) Manter o `onError` da muri e o guard `bloquearEscritaTreinamentos` (vem do G8). 4) Verificar: `npm run typecheck` e vincular/desvincular um curso de uma trilha na tela. Depende de G0 e G8; entra junto com G1.

<details><summary>Arquivos (9)</summary>

- `src/components/treinamentos/TrilhaCard.tsx`
- `src/components/treinamentos/TrilhaBanner.tsx`
- `src/components/treinamentos/TrilhaSequencia.tsx`
- `src/components/treinamentos/TrilhasFiltros.tsx`
- `src/components/treinamentos/TrilhaDetalheDialog.tsx`
- `src/components/treinamentos/trilhasDerivacoes.ts`
- `src/components/treinamentos/TrilhaCursosSection.tsx`
- `src/components/treinamentos/__tests__/TrilhaSequencia.test.tsx`
- `src/components/treinamentos/__tests__/trilhasDerivacoes.test.ts`

</details>

## G6 — Aba Turmas / Instâncias completa (agenda, calendário, criar turma) — ganho puro, sem nada a reenxertar

`RECUPERAR` · esforço medio · 20 arquivos

**Valor para o negócio.** Hoje é impossível cadastrar uma turma pela interface — a tabela só mostra o que já estiver no banco. Este grupo entrega o cadastro de turma, a agenda semanal, o calendário mensal com as turmas do dia e o detalhe da turma. É a maior funcionalidade nova da área inteira e não tira nada da main.

**Risco de regressão.** Nenhuma perda: a main não tem nada nesta aba além da tabela, que é substituída por um painel com os mesmos dados mais filtros. Único cuidado: `criarInstancia` nunca foi exercitado em produção (nunca teve chamador), então o primeiro cadastro real precisa ser verificado contra as policies de RLS de treinamento_instancias antes de anunciar pronto.

**Evidência.** A aba turmas da main é uma tabela de 5 colunas somente leitura, sem botão de criar e sem estado vazio: origin/main:src/pages/TreinamentosPage.tsx:902-930 (`instancias.map` direto em TableRow, nenhum Dialog, nenhum onClick). A muri tem `const criarTurma = useMutation({ mutationFn: (dados: NovaTurmaPayload) => catalogoCursoService.criarInstancia(dados) })` em origin/muri:src/pages/TreinamentosPage.tsx:515-517, ligado ao NovaTurmaDialog em :1111-1125. E o serviço já existe na main sem chamador: `git grep -n criarInstancia origin/main -- src` devolve APENAS origin/main:src/services/catalogoCursoService.ts:194 (a definição). NovaTurmaDialog.test.tsx importa só `@/utils/dateLocal`, que existe na main.

**Plano.** 1) Copiar os 20 arquivos de origin/muri sem edição. 2) Na página (G1), manter a mutation `criarTurma` da muri e o bloco `<NovaTurmaDialog ...>` de muri:1111-1125, incluindo o guard `if (!empresaAtual?.id) { toast.error('Selecione uma empresa antes de criar a turma'); return; }`. 3) Trocar `podeCriarTurma={podeCriarTurma}` — que vem do hook `usePermissions`, inexistente na main (`git ls-tree origin/main -- src/hooks \| grep -i perm` = vazio) — por `podeCriarTurma={true}` OU trazer src/hooks/usePermissions.ts da muri; a segunda opção é de outra área (permissões) e não deve atrasar esta: use `true` e registre em Próximos passos. 4) Rodar `npx vitest run src/components/treinamentos` (7 testes deste grupo). 5) Após o merge, criar UMA turma real em produção e confirmar a linha no banco com SELECT em treinamento_instancias — sem isso não é "pronto". Depende de G0 e entra junto com G1.

<details><summary>Arquivos (20)</summary>

- `src/components/treinamentos/TurmasPainel.tsx`
- `src/components/treinamentos/TurmaCard.tsx`
- `src/components/treinamentos/TurmaDetalheDialog.tsx`
- `src/components/treinamentos/TurmasFiltros.tsx`
- `src/components/treinamentos/TurmasDoDiaPopover.tsx`
- `src/components/treinamentos/AgendaSemanal.tsx`
- `src/components/treinamentos/CabecalhoColunaTurma.tsx`
- `src/components/treinamentos/CalendarioTurmasDialog.tsx`
- `src/components/treinamentos/MaisTurmasCard.tsx`
- `src/components/treinamentos/NovaTurmaDialog.tsx`
- `src/components/treinamentos/statusTurmaVisual.ts`
- `src/components/treinamentos/turmasDerivacoes.ts`
- `src/components/treinamentos/__tests__/TurmasPainel.test.tsx`
- `src/components/treinamentos/__tests__/TurmaCard.test.tsx`
- `src/components/treinamentos/__tests__/AgendaSemanal.test.tsx`
- `src/components/treinamentos/__tests__/CalendarioTurmasDialog.test.tsx`
- `src/components/treinamentos/__tests__/CabecalhoColunaTurma.test.tsx`
- `src/components/treinamentos/__tests__/MaisTurmasCard.test.tsx`
- `src/components/treinamentos/__tests__/NovaTurmaDialog.test.tsx`
- `src/components/treinamentos/__tests__/turmasDerivacoes.test.ts`

</details>

## G7 — TrainingCover (capa dos cards) — acoplamento com trainingImages é só de tipo

`RECUPERAR_COM_MERGE` · esforço baixo · 2 arquivos

**Valor para o negócio.** Dá identidade visual aos cards de curso, turma, trilha e certificado mesmo sem nenhuma imagem gerada, usando a família cromática da categoria — não finge ser foto de IA.

**Risco de regressão.** Nenhuma perda para a main (arquivo novo). O risco é de acoplamento: se alguém trouxer TrainingCover importando `@/services/trainingImages` sem trazer a área toda, o typecheck quebra.

**Evidência.** 4 componentes importam TrainingCover (CertificadoCard, TreinamentoCursoCard, TrilhaBanner, TurmaCard — saída de `git grep -ln TrainingCover origin/muri -- src`), então sem ele os grupos G2, G4, G5 e G6 não compilam. Mas o acoplamento com a área trainingImages é mínimo: `origin/muri:src/components/treinamentos/TrainingCover.tsx:4` é a ÚNICA linha que toca a área e é `import type { TrainingContentType, TrainingCoverFormat } from '@/services/trainingImages'` — import de tipo, nada de runtime. A página também degrada sozinha: `origin/muri:src/pages/TreinamentosPage.tsx:203-205` — `if (imagensTreinamento.size === 0) return cursos;`, ou seja, sem o pipeline de imagens os registros passam intactos e o TrainingCover cai na composição SVG/CSS da categoria (documentada no próprio arquivo, linhas 15-18).

**Plano.** 1) Copiar TrainingCover.tsx e TrainingCover.test.tsx de origin/muri. 2) Decidir a linha 4: se a área trainingImages NÃO entrar nesta onda, declarar os dois tipos localmente no topo de TrainingCover.tsx — `export type TrainingContentType = 'course' \| 'learning_path' \| 'class' \| 'certificate'` e `export type TrainingCoverFormat = ...` copiados de `git show origin/muri:src/services/trainingImages/types.ts` — e remover o import. Se a área entrar, manter o import como está. 3) Na página (G1), se trainingImages não vier: apagar os imports de `@/services/trainingImages` e `@/hooks/useTrainingImages` e substituir `const imagensTreinamento = useTrainingImages(empresaAtual?.id)` por `const imagensTreinamento = useMemo(() => new Map<string, string>(), [])` — os useMemo de cursosComImagem/trilhasComImagem já curto-circuitam com size 0 e devolvem as listas originais. 4) TrainingCover.test.tsx também cobre TurmaCard, CertificadoCard, TreinamentoCursoCard e TrilhaBanner (linhas 5-9), então ele valida G2, G4, G5 e G6 de uma vez; ajustar o mock de `@/integrations/supabase/client` se a área trainingImages não vier. Depende de G0 e entra junto com G1.

<details><summary>Arquivos (2)</summary>

- `src/components/treinamentos/TrainingCover.tsx`
- `src/components/treinamentos/__tests__/TrainingCover.test.tsx`

</details>

## G8 — Mock de demonstração + override de lint (habilitadores, sem os quais o G1 e o G5 não compilam nem passam no CI)

`RECUPERAR_COM_MERGE` · esforço baixo · 2 arquivos

**Valor para o negócio.** Permite ao dono validar o layout das 6 abas sem dado real (`VITE_TREINAMENTOS_MOCK=true` no .env.local) e, sobretudo, é o que faz o CI passar. Sem isto, nada desta área entra na main.

**Risco de regressão.** O mock NÃO chega a produção: exige import.meta.env.DEV, e o guard `MODE !== 'test'` impede que o Vitest leia o .env.local e receba dados fictícios. Risco real está no override de lint: ele mede a dívida em vez de proibi-la; o `scripts/ratchet-any.mjs` continua vigente para o resto de components/ e pages/. Alternativa mais limpa, se houver fôlego: tipar a página da muri e dispensar o override — mas são 21 `any` concentrados em casts `as any[]` de props de painel, trabalho que pode ser feito depois em PR própria.

**Evidência.** `src/mocks/treinamentosMock.ts` só existe na muri (`git ls-tree origin/main -- src/mocks` = apenas colaboradoresMock.ts e desempenhoMock.ts) e é importado em 9 pontos da página da muri (linhas 358, 406, 616, 710, 802, 976, 1057, 1121 via `bloquearEscritaTreinamentos`, mais os getMock* nas queries 146-185) e em TrilhaCursosSection.tsx. O gate é dev-only e opt-in: origin/muri:src/mocks/treinamentosMock.ts:38 — `import.meta.env.DEV && import.meta.env.MODE !== 'test' && import.meta.env.VITE_TREINAMENTOS_MOCK === 'true'`. Suas dependências (MOCK_COLABORADORES, MOCK_EMPRESA) já existem na main em src/mocks/colaboradoresMock.ts:42 e :101. Quanto ao lint: a main roda `lint:ci` com `--max-warnings=1` (package.json:40) e `@typescript-eslint/no-explicit-any: 'warn'` (eslint.config.js:45); a página da muri tem 21 ocorrências de `any` e TrilhaCursosSection 2 (contagem por arquivo). JÁ EXISTE PRECEDENTE na main para exatamente este caso: eslint.config.js:110-126 é um bloco que desliga a regra para `src/components/avaliacao/**`, `src/pages/AvaliacaoPage.tsx`, `src/services/avaliacaoService.ts` e `src/mocks/colaboradoresMock.ts`, com o comentário "Área Avaliação/NineBox portada da branch `muri` (W1). O código original da muri era escrito sem o ratchet `no-explicit-any`".

**Plano.** 1) Copiar src/mocks/treinamentosMock.ts de origin/muri; conferir que os nomes importados de ./colaboradoresMock (MOCK_COLABORADORES, MOCK_EMPRESA) batem com a versão da main. 2) Em eslint.config.js, no bloco que começa na linha 110 ("Área Avaliação/NineBox portada da branch `muri` (W1)"), acrescentar à lista `files` as entradas `'src/components/treinamentos/**/*.{ts,tsx}'`, `'src/pages/TreinamentosPage.tsx'` e `'src/mocks/treinamentosMock.ts'`, e atualizar o comentário citando esta onda. 3) ATENÇÃO regra 8 do Fluxo Git: eslint.config.js está em caminho de CI — conferir .github/CODEOWNERS antes de mergear; se exigir code owner, a PR fica aberta aguardando o dono. 4) Verificar com `npm run lint:ci` e `npm run ci:verify`. Habilitador de G1 e G5; vai na mesma PR.

<details><summary>Arquivos (2)</summary>

- `src/mocks/treinamentosMock.ts`
- `eslint.config.js`

</details>

## G10 — TreinamentosCard do detalhe do colaborador (não pertence a esta área; morto sozinho)

`RECUPERAR` · esforço baixo · 1 arquivos

**Valor para o negócio.** Mostra os treinamentos do colaborador dentro da ficha dele, com inscrição rápida — valor real, mas de outra tela.

**Risco de regressão.** Nenhuma perda para a main. O risco é o oposto: trazê-lo agora produziria código morto que não compila.

**Evidência.** Na muri este arquivo é importado por um único consumidor, `origin/muri:src/components/colaborador-detalhes/DesenvolvimentoResumoTab.tsx`, que NÃO existe na main (`git cat-file -e origin/main:src/components/colaborador-detalhes/DesenvolvimentoResumoTab.tsx` falha). A pasta inteira `src/components/colaborador-detalhes/desenvolvimento/` (4 arquivos) está ausente da main. Além disso o componente importa `useTreinamentosColaborador` de @/hooks, hook que não existe na main (`git grep -ln useTreinamentosColaborador origin/main -- src` = vazio), logo nem compila. Suas outras dependências estão satisfeitas: mockOr e getMockCursos existem em origin/main:src/mocks/colaboradoresMock.ts:85 e :1482.

**Plano.** NÃO trazer com a área de treinamentos. Este arquivo só faz sentido junto com o grupo colaborador-detalhes/desenvolvimento (DesenvolvimentoProfissionalCard, FormacaoQualificacoesCard, JornadaInternaCard, DesenvolvimentoResumoTab) e com o hook useTreinamentosColaborador, que é de outra área. Passar o arquivo para o agente responsável por colaborador-detalhes e registrar a dependência do hook. Se for necessário trazê-lo nesta onda: trazer também DesenvolvimentoResumoTab.tsx, os outros 3 cards da pasta, o hook useTreinamentosColaborador e o export dele em src/hooks/index.ts — isto é, assumir a outra área, o que foge do escopo.

<details><summary>Arquivos (1)</summary>

- `src/components/colaborador-detalhes/desenvolvimento/TreinamentosCard.tsx`

</details>

## Descartado nesta área

- **G9 — catalogoCursoService da muri** (`OBSOLETO`) — O diff (157 inserções / 147 deleções) mostra que a versão da muri é a ANTERIOR ao hardening da main: ela remove `import { validateInput, validateTablePayload } from '@/schemas/validate'` e `import { cursoSchema, trilhaSchema, inscricaoCursoSchema, trilhaCursoSchema } from '@/schemas/cursos'`; troca `criarCurso(d: Insertable<'catalogo_cursos'>): Promise<Tables<'catalogo_cursos'>>` por `criarCurso(d: any)`; e apaga as chamadas `validateInput(cursoSchema, d, 'catalogo.criarCurso')` e `.insert(validateTablePayload('catalogo_cursos', d, ...))`, deixando `.insert(d)` cru. Também apaga os tipos exportados InscricaoComJoins, CertificadoComJoins, TrilhaCursoComCurso e InstanciaComJoins — que a própria página da main importa (origin/main:src/pages/TreinamentosPage.tsx:18). O único conteúdo exclusivo da muri é o curto-circuito `getMockTrilhasCursos(trilhaId)` em listarTrilhasCursos (linhas 125-129). O suposto ganho de `order('nome')` em listarTrilhas NÃO é ganho: a main já ordena por nome (origin/main:src/services/catalogoCursoService.ts:82).

## Perda se a área for descartada inteira

Perde-se a única versão existente de: 4 KPIs de negócio calculados (participação ativa, conclusão no período, pendências obrigatórias, certificados emitidos) em vez de 6 contagens cruas; filtros, busca, ordenação e paginação nas 6 abas (hoje a main renderiza a tabela inteira sem filtro nenhum); estados de erro com botão "tentar novamente" em Inscrições e Certificados (a main não trata isError em nenhuma query — `git show origin/main:src/pages/TreinamentosPage.tsx \| grep isError` = 0 ocorrências); confirmação explícita antes de excluir treinamento/curso/trilha (a main exclui no clique seco, `main-TreinamentosPage.tsx:462-469`); e a aba Turmas de verdade — criar turma, agenda semanal, calendário mensal e detalhe da turma. Esse último item é o maior: `catalogoCursoService.criarInstancia` existe na main desde sempre e NÃO tem um único chamador (`git grep -n criarInstancia origin/main -- src` retorna só a definição em catalogoCursoService.ts:194), ou seja, hoje é impossível cadastrar uma turma pela interface; a muri é a única ponta que liga esse serviço a um botão. Também se perdem ~139 KB de testes unitários de derivações e componentes que não têm equivalente na main.
