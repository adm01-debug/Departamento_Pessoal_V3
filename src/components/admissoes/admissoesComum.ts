/**
 * Constantes compartilhadas da área de Admissões.
 *
 * Fonte ÚNICA para o Dashboard (`OnboardingDashboard.tsx`) e para os modais de
 * detalhe dos widgets (`admissoesDashboardModais.tsx`): tons da paleta, rótulos
 * e selos de etapa, a ordem real do fluxo e o checklist obrigatório.
 *
 * Antes deste arquivo esses mapas viviam dentro do dashboard (e só ele os
 * enxergava). Foram movidos SEM nenhuma mudança de valor — o objetivo é que o
 * modal mostre exatamente o mesmo rótulo e a mesma cor que o card, sem uma
 * segunda cópia que possa divergir com o tempo.
 *
 * Vermelho desta área: os estados críticos (atraso, cancelamento, falha,
 * documento rejeitado) usam a variante `destructive-vivid` — e não o
 * `--destructive` do tema. Motivo, medido: no dark o `--destructive` é um vinho
 * de ~2:1 de contraste sobre o navy e o alerta some no fundo; a variante mantém
 * o MESMO significado, legível (~4,5:1 no card), sem glow e com o fundo dos
 * selos/ícones ainda escuro e translúcido (`/10`, `/15`). O token está em
 * `src/index.css` e nenhuma outra área do sistema o consome.
 */

/** Tons semânticos da paleta usados pelos indicadores desta área. */
export type Tone = 'primary' | 'info' | 'success' | 'warning' | 'destructive';

/** Chip de ícone colorido e tinta de texto por tom semântico. */
export const TONE_CHIP: Record<Tone, string> = {
  primary: 'bg-primary/10 text-primary',
  info: 'bg-info/10 text-info',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive-vivid/10 text-destructive-vivid',
};

export const TONE_TEXT: Record<Tone, string> = {
  primary: 'text-primary',
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive-vivid',
};

/** Tons que viram selo (badge) nos modais desta área. */
export type ToneSelo = 'success' | 'warning' | 'destructive';

/**
 * Selo do tom: fundo escuro e translúcido + tinta vibrante. Repete os valores
 * que os selos nativos do `Badge` (`success`/`warning`) já têm e troca o
 * vermelho pela variante da área — por isso os selos dos modais usam
 * `variant="outline"` + `border-0` + este mapa, e NÃO `variant="destructive"`
 * (que é de fundo cheio, fora do padrão translúcido desta tela).
 */
export const TONE_BADGE: Record<ToneSelo, string> = {
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  destructive: 'bg-destructive-vivid/15 text-destructive-vivid',
};

/** Rótulos de etapa — mesma nomenclatura usada nas demais abas do módulo. */
export const ETAPA_LABELS: Record<string, string> = {
  solicitacao: 'Solicitação',
  documentos: 'Docs Pendentes',
  validacao: 'Em Validação',
  pendente: 'Pendente',
  exame: 'Exame',
  contrato: 'Contrato',
  assinatura: 'Assinatura',
  esocial: 'eSocial',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

/** Badge de etapa (ações prioritárias / próximas admissões). */
export const ETAPA_BADGE: Record<string, string> = {
  solicitacao: 'bg-muted/60 text-muted-foreground',
  documentos: 'bg-warning/15 text-warning',
  validacao: 'bg-info/15 text-info',
  pendente: 'bg-warning/15 text-warning',
  exame: 'bg-warning/15 text-warning',
  contrato: 'bg-info/15 text-info',
  assinatura: 'bg-primary/15 text-primary',
  esocial: 'bg-primary/15 text-primary',
  concluida: 'bg-success/15 text-success',
  cancelada: 'bg-destructive-vivid/15 text-destructive-vivid',
};

/**
 * Ordem REAL do fluxo operacional da admissão: as oito etapas que ainda exigem
 * trabalho (as colunas do Kanban, na mesma sequência). `concluida` e `cancelada`
 * ficam fora porque são estados terminais.
 *
 * É a régua do "progresso por etapa" exibido nos modais quando o checklist de
 * documentos não está preenchido na base (ver `progressoDaAdmissao` no
 * dashboard): a admissão na 1ª etapa está em 1/8 do caminho, na 5ª em 5/8 etc.
 */
export const ETAPA_FLUXO = [
  'solicitacao',
  'documentos',
  'validacao',
  'pendente',
  'exame',
  'contrato',
  'assinatura',
  'esocial',
] as const;

/** Colunas booleanas do checklist de admissão (colunas reais de `public.admissoes`). */
export type CampoChecklist =
  | 'checklist_documentos_pessoais'
  | 'checklist_comprovante_endereco'
  | 'checklist_foto'
  | 'checklist_ctps'
  | 'checklist_exame_admissional'
  | 'checklist_contrato_assinado'
  | 'checklist_esocial_enviado';

/**
 * Checklist obrigatório da admissão, na ordem do fluxo. Os rótulos seguem
 * exatamente os nomes usados no detalhe da admissão
 * (`admissoes/DetalhesAdmissaoDialog.tsx`), para que a pendência citada no modal
 * seja a mesma que o RH vê na tela onde vai resolver.
 */
export const CHECKLIST_ADMISSAO: readonly { campo: CampoChecklist; label: string }[] = [
  { campo: 'checklist_documentos_pessoais', label: 'Documentos pessoais (RG/CPF)' },
  { campo: 'checklist_comprovante_endereco', label: 'Comprovante de endereço' },
  { campo: 'checklist_foto', label: 'Foto 3x4' },
  { campo: 'checklist_ctps', label: 'CTPS / PIS' },
  { campo: 'checklist_exame_admissional', label: 'Exame admissional (ASO)' },
  { campo: 'checklist_contrato_assinado', label: 'Contrato assinado' },
  { campo: 'checklist_esocial_enviado', label: 'eSocial (S-2200) enviado' },
];
