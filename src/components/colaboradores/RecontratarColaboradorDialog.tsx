import { useState } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { DatePicker } from '@/components/ui/date-picker';
import { CurrencyInput } from '@/components/ui/currency-input';
import { FormSelect } from '@/components/forms';
import { useCargos } from '@/hooks/useCargos';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { useRecontratarColaborador, useVinculosResumo } from '@/hooks/useVinculos';
import { usePiiMask } from '@/hooks/usePiiMask';
import type { Colaborador } from '@/types/entities';
import { parseDateLocalISO, todayLocalISO } from '@/utils/dateLocal';

interface RecontratarColaboradorDialogProps {
  colaborador: Colaborador;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** `YYYY-MM-DD` → `dd/MM/yyyy` sempre pelo parser local: `new Date(iso)` é
 * interpretado como UTC e em UTC-3 devolve o dia anterior. */
function formatarDataLocal(iso: string | null | undefined): string {
  const data = parseDateLocalISO(iso);
  return data ? format(data, 'dd/MM/yyyy') : '—';
}

/**
 * `cargos` NAO tem UNIQUE em (empresa_id, nome) — conferido no banco canonico:
 * so PK, as duas FKs e os NOT NULL. Procurar o cargo pelo NOME, portanto, pode
 * casar com um homonimo e repontar `cargo_id` para outro cargo sem mudar o
 * texto na tela. Por isso o seletor guarda o ID, como a promocao em
 * MovimentacoesPage: o nome e so rotulo.
 *
 * Cadastro legado sem `cargo_id`: usa o texto para achar o cargo, mas apenas se
 * houver UM com aquele nome. Ambiguo ou inexistente, fica sem selecao — e o
 * confirmar nao manda cargo nenhum, deixando o texto atual intocado, em vez de
 * chutar um id.
 */
function cargoInicial(colaborador: Colaborador, cargos: { id: string; nome: string }[]): string {
  if (colaborador.cargo_id) return colaborador.cargo_id;
  const homonimos = cargos.filter((c) => c.nome === colaborador.cargo);
  return homonimos.length === 1 ? homonimos[0].id : '';
}

type RecontratarDados = {
  data_admissao: string;
  cargo?: string;
  cargo_id?: string;
  departamento?: string;
  salario_base?: number;
};

/**
 * Fluxo dedicado de recontratação de ex-colaborador. Sem ele a única saída do
 * DP é cadastrar um colaborador novo, o que bate no índice único
 * `colaboradores_empresa_cpf_key` (mesmo CPF na mesma empresa) e, quando passa,
 * perde o histórico da passagem anterior.
 *
 * Reativa o MESMO registro (`colaboradorService.recontratar`: status volta a
 * `ativo`, `data_desligamento` zera) e abre uma nova linha em `vinculos` como
 * "Readmissão" — nunca sobrescreve nem apaga os vínculos anteriores.
 *
 * Só a nova data de admissão é obrigatória (é o que a mutation exige); cargo,
 * departamento e salário vêm pré-preenchidos com os dados da última passagem e
 * só entram no payload se realmente preenchidos.
 */
export function RecontratarColaboradorDialog({ colaborador, open, onOpenChange }: RecontratarColaboradorDialogProps) {
  const pii = usePiiMask();
  const recontratar = useRecontratarColaborador();
  const { cargos, isLoading: cargosCarregando } = useCargos({ pageSize: 100 });
  const { departamentos, isLoading: departamentosCarregando } = useDepartamentos({ pageSize: 100 });

  // O resumo só é consultado com o diálogo aberto — `useVinculosResumo`
  // desabilita a query com lista vazia.
  const resumoQuery = useVinculosResumo(open ? [colaborador.id] : []);
  const resumo = resumoQuery.data?.[colaborador.id];

  const [dataAdmissao, setDataAdmissao] = useState(todayLocalISO());
  const [cargoId, setCargoId] = useState(() => cargoInicial(colaborador, cargos));
  const [departamento, setDepartamento] = useState(colaborador.departamento ?? '');
  const [salarioBase, setSalarioBase] = useState(colaborador.salario_base ?? 0);

  // Reabrir o diálogo (ou abrir para outro colaborador) recomeça do zero, sem
  // useEffect/setState-in-effect — mesmo padrão do CurrencyInput.
  const [sessao, setSessao] = useState({ aberto: open, id: colaborador.id });
  if (sessao.aberto !== open || sessao.id !== colaborador.id) {
    setSessao({ aberto: open, id: colaborador.id });
    if (open) {
      setDataAdmissao(todayLocalISO());
      setCargoId(cargoInicial(colaborador, cargos));
      setDepartamento(colaborador.departamento ?? '');
      setSalarioBase(colaborador.salario_base ?? 0);
    }
  }

  const desligado = colaborador.status === 'desligado';
  // `isPlaceholderData`: ao trocar de colaborador a query devolve o resumo do
  // anterior enquanto busca o novo — aí `resumo` é undefined sem ser "vazio".
  const resumoPendente = resumoQuery.isLoading || resumoQuery.isPlaceholderData;
  // Sem resumo carregado não se sabe a data da última passagem: confirmar aqui
  // criaria vínculo sobreposto justo quando o histórico não pôde ser lido.
  const resumoIndisponivel = resumoPendente || resumoQuery.isError;
  // A nova admissão não pode começar antes do FIM da última passagem: comparar
  // só com a admissão anterior aceitava data anterior ao desligamento (admitido
  // em 2022, desligado em 2026, readmitido em 2025) e as duas passagens ficavam
  // sobrepostas em `vinculos`. `colaboradorService.recontratar` repete a mesma
  // regra — o formulário sozinho não protege o dado gravado.
  // As datas do próprio cadastro entram na conta porque o resumo vem VAZIO no
  // cadastro legado (nenhuma linha em `vinculos`) — e é justo nesse caso que a
  // passagem antiga só existe em `colaboradores`. Sem elas o formulário
  // liberava qualquer data quando a consulta de apoio voltava vazia.
  const legado = colaborador as Colaborador & { data_desligamento?: string | null };
  const marcoAnterior = [
    resumo?.admissaoAtual,
    resumo?.ultimoEncerramento,
    legado.data_admissao,
    legado.data_desligamento,
  ]
    .filter((d): d is string => !!d)
    .reduce<string | null>((maior, d) => (maior && maior > d ? maior : d), null);
  const dataInvalida = !!dataAdmissao && !!marcoAnterior && dataAdmissao <= marcoAnterior;
  const podeConfirmar = !!dataAdmissao && !dataInvalida && !resumoIndisponivel && !recontratar.isPending;

  const handleConfirmar = async () => {
    if (!podeConfirmar) return;
    const dados: RecontratarDados = { data_admissao: dataAdmissao };
    // Grava o PAR: só o texto deixaria `cargo_id` no cargo ANTIGO, e o dossiê
    // prioriza o nome que vem dessa referência (TrabalhoHierarquiaTab:
    // `cargoDetalhe?.nome ?? colaborador?.cargo`) — a tela mostraria o cargo de
    // antes da recontratação. O trigger do banco sincroniza `cargo_id` ->
    // `cargo`, nunca o contrário.
    const cargoSelecionado = cargos.find((c) => c.id === cargoId);
    if (cargoSelecionado) {
      dados.cargo = cargoSelecionado.nome;
      dados.cargo_id = cargoSelecionado.id;
    }
    if (departamento) dados.departamento = departamento;
    if (salarioBase > 0) dados.salario_base = salarioBase;

    try {
      await recontratar.mutateAsync({ id: colaborador.id, dados });
      onOpenChange(false);
    } catch {
      // `useRecontratarColaborador` já notifica no onError; o diálogo fica
      // aberto com os dados preenchidos para o RH tentar de novo.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recontratar {colaborador.nome_completo}</DialogTitle>
          <DialogDescription>
            {desligado
              ? `CPF ${pii.cpf(colaborador.cpf)} — reativa este cadastro e registra uma nova passagem, preservando todo o histórico de vínculos anterior.`
              : 'Somente colaboradores desligados podem ser recontratados.'}
          </DialogDescription>
        </DialogHeader>

        {!desligado ? (
          <>
            <p className="text-sm text-muted-foreground">
              O status atual deste colaborador é <span className="font-medium">{colaborador.status}</span>. Para
              recontratar, registre antes o desligamento da passagem em aberto.
            </p>
            <DialogFooter>
              {/* "Entendi" e nao "Fechar": o X do DialogContent ja tem o nome
                  acessivel "Fechar". */}
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Entendi
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <section
              aria-label="Resumo de vínculos anteriores"
              className="rounded-lg border border-border/60 bg-muted/30 p-3"
            >
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Passagens anteriores
              </h3>
              {resumoPendente ? (
                <div className="space-y-2" data-testid="recontratar-resumo-skeleton">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : resumoQuery.isError ? (
                // Sem o resumo não há como afirmar quantas passagens existem —
                // mostrar "0 passagens" faria o RH recontratar achando que é a
                // primeira admissão.
                <p className="text-sm text-destructive">
                  Não foi possível carregar o histórico de vínculos. Tente novamente.
                </p>
              ) : !resumo ? (
                <p className="text-sm text-muted-foreground">Nenhum vínculo anterior registrado.</p>
              ) : (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Passagens</dt>
                    <dd className="font-medium">{resumo.quantidadePassagens}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Recontratações</dt>
                    <dd className="font-medium">{resumo.quantidadeRecontratacoes}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Primeira admissão</dt>
                    <dd className="font-medium">{formatarDataLocal(resumo.primeiraAdmissao)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Última admissão</dt>
                    <dd className="font-medium">{formatarDataLocal(resumo.admissaoAtual)}</dd>
                  </div>
                </dl>
              )}
            </section>

            <div className="grid gap-4 py-1">
              <div className="space-y-2">
                <Label htmlFor="recontratar-data-admissao">Nova data de admissão</Label>
                <DatePicker
                  id="recontratar-data-admissao"
                  value={dataAdmissao}
                  onChange={setDataAdmissao}
                  min={marcoAnterior ?? undefined}
                  disabled={recontratar.isPending}
                  placeholder="Selecionar data"
                />
                {!dataAdmissao && <p className="text-sm text-destructive">Informe a nova data de admissão.</p>}
                {dataInvalida && (
                  <p className="text-sm text-destructive">
                    A nova admissão precisa ser posterior a {formatarDataLocal(marcoAnterior)}.
                  </p>
                )}
              </div>

              <FormSelect
                label="Cargo"
                value={cargoId}
                onChange={setCargoId}
                options={cargos.map((c) => ({ value: c.id, label: c.nome }))}
                placeholder={
                  cargosCarregando
                    ? 'Carregando cargos...'
                    : cargos.length
                      ? 'Selecione o cargo'
                      : 'Nenhum cargo cadastrado'
                }
                disabled={recontratar.isPending}
              />

              <FormSelect
                label="Departamento"
                value={departamento}
                onChange={setDepartamento}
                options={departamentos.map((d) => ({ value: d.nome, label: d.nome }))}
                placeholder={
                  departamentosCarregando
                    ? 'Carregando departamentos...'
                    : departamentos.length
                      ? 'Selecione o departamento'
                      : 'Nenhum departamento cadastrado'
                }
                disabled={recontratar.isPending}
              />

              <div className="space-y-2">
                {/* `CurrencyInput` não aceita `id`, então o Label não tem `htmlFor`. */}
                <Label>Salário base</Label>
                <CurrencyInput
                  value={salarioBase}
                  onChange={setSalarioBase}
                  disabled={recontratar.isPending}
                  className="h-9"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={recontratar.isPending}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmar} disabled={!podeConfirmar}>
                {recontratar.isPending ? 'Recontratando...' : 'Confirmar recontratação'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
