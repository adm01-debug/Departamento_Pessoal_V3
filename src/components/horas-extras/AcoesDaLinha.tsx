/**
 * ============================================================================
 * AÇÕES DA LINHA — [ 👁 ] [ 🗑 ] e NADA MAIS. Coluna AÇÕES padronizada.
 *
 * PROBLEMA QUE ISTO RESOLVE
 *  - A coluna oscilava: a linha PENDENTE exibia um terceiro controle (menu de
 *    três pontos, com a decisão) e as linhas já decididas não. O par de ícones
 *    mudava de posição de uma linha para outra e a coluna inteira mudava de
 *    largura — a tabela ficava desalinhada.
 *  - A regra agora é ÚNICA para toda linha, em qualquer status:
 *
 *        [ 👁 ]  [ 🗑 ]        (29 × 29 cada, raio 7, gap 6 = par de 64 px)
 *
 * O que NÃO mudou (a poda é de APRESENTAÇÃO, não de negócio):
 *  - As ações continuam existindo, nos controles próprios do fluxo:
 *      • "Aprovar" e "Rejeitar" saíram da LINHA e seguem em dois lugares — nos
 *        cartões de aprovação (`AprovacoesPendentes`) e no diálogo
 *        "Ver detalhes" (`SolicitacaoDetalhesDialog`), que recebe
 *        `onAprovar`/`onRejeitar` da página e só os mostra enquanto a
 *        solicitação está PENDENTE (é o que o serviço aceita: depois de
 *        decidida não há nova decisão pela tela). O OLHO desta coluna abre
 *        exatamente esse diálogo — a decisão ficou a um clique, sem competir
 *        com o par de ícones;
 *      • "Excluir" é a LIXEIRA e mantém a CONFIRMAÇÃO: o mesmo `AlertDialog`,
 *        a mesma função `onExcluir` e as mesmas permissões — não existe segunda
 *        lógica de exclusão;
 *      • "Ver detalhes" é o OLHO e chama `onVerDetalhes` (nada é escrito).
 *  - Nenhuma escrita mora aqui: todo `onClick` chama o handler recebido.
 *  - Duplo envio: enquanto a exclusão está em voo, a lixeira fica desabilitada
 *    (o `finally` devolve o estado).
 *  - Os rótulos acessíveis são a interface ESTÁVEL desta ação (leitores de tela
 *    e testes localizam por eles): "Ver detalhes da solicitação" e "Excluir
 *    solicitação"; o `title` curto dá o tooltip de mouse.
 *
 * GEOMETRIA — por que a coluna não treme mais
 *  - A largura do par mora no CONTÊINER (`CLASSE_PAR`, 64 px), não no conteúdo:
 *    a caixa tem sempre o mesmo tamanho, inclusive quando só um botão é
 *    renderizado (perfil sem permissão de exclusão), e `justify-end` garante
 *    que o botão da direita nunca saia do lugar.
 *  - `items-center` centraliza os dois verticalmente na linha (a célula já é
 *    `align-middle` do Design System) e os dois usam a MESMA base de medida.
 *  - Aparência simétrica: olho azul-ciano (`info`) e lixeira vermelha
 *    (`danger`) com o mesmo par de alfas — borda `/25` e fundo `/12` — para os
 *    dois botões lerem como um conjunto único.
 * ============================================================================
 */
import { useState } from 'react';
import { Eye, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { nomeDoColaborador, type SolicitacaoHoraExtra } from './horasExtrasComum';

type Acao = (s: SolicitacaoHoraExtra) => void | Promise<void>;

export interface AcoesDaLinhaProps {
  solicitacao: SolicitacaoHoraExtra;
  onVerDetalhes: (s: SolicitacaoHoraExtra) => void;
  /** Sem handler não há permissão de exclusão — e o par continua no lugar. */
  onExcluir?: Acao;
  className?: string;
}

/** Base comum dos DOIS botões: 29 × 29, raio 7 — mesmas dimensões, sempre. */
const CLASSE_BOTAO_ICONE = 'h-[29px] w-[29px] shrink-0 rounded-[7px] border';

/**
 * Largura do PAR fixada no CONTÊINER: 29 + 6 (gap) + 29 = 64 px. Fixar aqui (e
 * não no conteúdo) é o que mantém a coluna AÇÕES com a mesma largura em toda
 * linha — inclusive quando só um botão é renderizado.
 */
const CLASSE_PAR = 'flex w-[64px] shrink-0 items-center justify-end gap-[6px]';

export function AcoesDaLinha({ solicitacao: s, onVerDetalhes, onExcluir, className }: AcoesDaLinhaProps) {
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [processando, setProcessando] = useState(false);

  /** Executa a ação recebida mantendo a lixeira travada até a escrita terminar. */
  const executar = (acao: Acao) => {
    if (processando) return;
    setProcessando(true);
    Promise.resolve(acao(s)).finally(() => setProcessando(false));
  };

  return (
    <div className={cn(CLASSE_PAR, className)}>
      {/* 1) Visualizar — olho azul-ciano: fundo translúcido + borda sutil. */}
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="Ver detalhes da solicitação"
        title="Ver detalhes"
        onClick={() => onVerDetalhes(s)}
        className={cn(CLASSE_BOTAO_ICONE, 'border-info/25 bg-info/12 text-info hover:bg-info/20 hover:text-info')}
      >
        <Eye className="h-[14px] w-[14px]" aria-hidden />
      </Button>

      {/* 2) Excluir — lixeira vermelha: MESMA medida, MESMO par de alfas e a
          MESMA confirmação (`AlertDialog`) de antes. */}
      {onExcluir && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Excluir solicitação"
          title="Excluir"
          disabled={processando}
          onClick={() => setConfirmandoExclusao(true)}
          className={cn(
            CLASSE_BOTAO_ICONE,
            'border-danger/25 bg-danger/12 text-danger hover:bg-danger/20 hover:text-danger-hover'
          )}
        >
          <Trash2 className="h-[14px] w-[14px]" aria-hidden />
        </Button>
      )}

      {/* Confirmação de exclusão — a mesma salvaguarda da tabela anterior. */}
      {onExcluir && (
        <AlertDialog open={confirmandoExclusao} onOpenChange={setConfirmandoExclusao}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir solicitação</AlertDialogTitle>
              <AlertDialogDescription>
                Excluir a solicitação de horas extras de {nomeDoColaborador(s)}? Esta ação não poderá ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="border border-danger/45 bg-danger/10 text-danger hover:bg-danger/20 hover:text-danger-hover"
                onClick={() => {
                  setConfirmandoExclusao(false);
                  executar(onExcluir);
                }}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
