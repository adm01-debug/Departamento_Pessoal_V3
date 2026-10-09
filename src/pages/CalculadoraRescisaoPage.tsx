/**
 * ============================================================================
 * Calculadora de Rescisão (`/calculadora-rescisao`).
 *
 * REDESIGN: a tela deixou de ser "formulário à esquerda + card vazio à
 * direita" e passou a ser um painel de duas colunas — entrada de dados em
 * quatro seções numeradas (`FormularioRescisao`) e o resultado completo
 * (`ResultadoRescisao`: KPIs, abas internas, demonstrativo, resumo e ações).
 *
 * Este arquivo continua sendo o DONO do estado e do fluxo: consulta de
 * colaboradores, montagem do payload, cálculo local (`utils/rescisaoCalc`) ou
 * no servidor (edge function), gravação do histórico e geração do TRCT. Nada
 * disso mudou de regra no redesign — os dois componentes de apresentação
 * recebem tudo por props.
 * ============================================================================
 */
import { PageTitle } from '@/components/PageTitle';
import { useCallback, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { MOTION_REDUCED_MODE } from '@/lib/motionMode';
import { EntradaPresenca } from '@/components/ui/entrada-cards';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Calculator, Clock, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { calcularRescisao, type RescisaoResult } from '@/utils/rescisaoCalc';
import { gerarPDFRescisao } from '@/utils/rescisaoPDF';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresas } from '@/hooks/useEmpresas';
import { edgeFunctionsService } from '@/services/edgeFunctionsService';
import { useQuery } from '@tanstack/react-query';
import { useDataAccessLog } from '@/hooks/useDataAccessLog';
import { FormularioRescisao } from '@/components/calculadoraRescisao/FormularioRescisao';
import { ResultadoRescisao } from '@/components/calculadoraRescisao/ResultadoRescisao';
import type {
  ColaboradorOpcao,
  ColaboradorResumo,
  HistoricoCalculo,
  MecanismoCalculo,
  RescisaoFormState,
} from '@/components/calculadoraRescisao/rescisaoView';
// MOCK VISUAL — ver src/mocks/calculadoraRescisaoMock.ts.
import {
  bloquearEscritaCalculadora,
  ehColaboradorFicticio,
  getMockColaboradorParaRescisao,
  getMockColaboradoresParaRescisao,
  isCalculadoraMockEnabled,
} from '@/mocks/calculadoraRescisaoMock';

const FORM_INICIAL: RescisaoFormState = {
  nomeColaborador: '',
  cpf: '',
  cargo: '',
  departamento: '',
  salario: '',
  dataAdmissao: '',
  dataDesligamento: '',
  tipo: 'sem_justa_causa',
  avisoTrabalhado: false,
  feriasVencidas: false,
  saldoFGTS: '',
  motivoDesligamento: '',
  observacoes: '',
};

export default function CalculadoraRescisaoPage() {
  const { user } = useAuth();
  const { empresaAtual } = useEmpresas();
  const [loadingColab, setLoadingColab] = useState(false);
  const [selectedColabId, setSelectedColabId] = useState<string | undefined>(undefined);
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState<ColaboradorResumo | null>(null);

  // MOCK VISUAL — ver src/mocks/calculadoraRescisaoMock.ts. O RPC de auditoria
  // GRAVA de verdade: um id fictício não pode virar registro em `audit_log`.
  useDataAccessLog(
    'colaboradores',
    ehColaboradorFicticio(selectedColabId) ? undefined : selectedColabId,
    empresaAtual?.id
  );

  const [form, setForm] = useState<RescisaoFormState>(FORM_INICIAL);
  const [result, setResult] = useState<RescisaoResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [calcServidor, setCalcServidor] = useState(false);
  const [calcLocal, setCalcLocal] = useState(false);
  /** Motor escolhido no card "4. Mecanismo de cálculo". */
  const [mecanismo, setMecanismo] = useState<MecanismoCalculo>('local');
  /** Simulações desta sessão (aba "Histórico" do painel de resultado). */
  const [historico, setHistorico] = useState<HistoricoCalculo[]>([]);

  const calculando = calcLocal || calcServidor;

  /** Guarda no histórico da sessão o cálculo que acabou de sair. */
  const registrarHistorico = useCallback((novo: RescisaoResult, nomeColaborador: string, tipo: string) => {
    if (typeof novo?.totalLiquido !== 'number') return;
    setHistorico((atual) =>
      [
        { id: novo.timestamp, timestamp: novo.timestamp, nome: nomeColaborador, tipo, totalLiquido: novo.totalLiquido },
        ...atual,
      ].slice(0, 6)
    );
  }, []);

  const handleSelectColaborador = async (id: string) => {
    if (!id) return;
    setLoadingColab(true);
    setSelectedColabId(id);
    try {
      // MOCK VISUAL — ver src/mocks/calculadoraRescisaoMock.ts. Sem isto, escolher
      // um colaborador fictício falharia no Supabase (o id não existe no banco).
      let dados: Record<string, any> | null = getMockColaboradorParaRescisao(id) ?? null;
      if (!dados) {
        const { data, error } = await supabase.from('colaboradores').select('*').eq('id', id).single();
        if (error) throw error;
        dados = data as Record<string, any>;
      }

      setForm((p) => ({
        ...p,
        nomeColaborador: dados.nome_completo,
        cpf: dados.cpf || '',
        cargo: dados.cargo || '',
        departamento: dados.departamento || '',
        salario: dados.salario_base?.toString() || '',
        dataAdmissao: dados.data_admissao || '',
        saldoFGTS: dados.saldo_fgts_estimado?.toString() || '',
      }));
      setColaboradorSelecionado({
        nome: dados.nome_completo,
        cargo: dados.cargo || '',
        departamento: dados.departamento || '',
        matricula: dados.matricula || '',
        fotoUrl: dados.foto_url ?? null,
      });
      toast.success('Dados do colaborador importados!');
    } catch {
      toast.error('Erro ao buscar colaborador');
    } finally {
      setLoadingColab(false);
    }
  };

  /** Remove só o vínculo com o colaborador importado — os campos ficam como estão. */
  const handleLimparColaborador = () => {
    setSelectedColabId(undefined);
    setColaboradorSelecionado(null);
    toast.info('Colaborador removido da simulação.');
  };

  /** "Limpar dados" do cabeçalho: volta a tela ao estado inicial. */
  const handleLimparDados = () => {
    setForm(FORM_INICIAL);
    setResult(null);
    setSelectedColabId(undefined);
    setColaboradorSelecionado(null);
    toast.success('Simulação limpa.');
  };

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores-select', empresaAtual?.id],
    queryFn: async (): Promise<ColaboradorOpcao[]> => {
      // MOCK VISUAL — ver src/mocks/calculadoraRescisaoMock.ts.
      const ficticios = getMockColaboradoresParaRescisao();
      if (ficticios) return ficticios;

      if (!empresaAtual?.id) return [];
      const { data, error } = await supabase
        .from('colaboradores')
        .select('id, nome_completo')
        .eq('empresa_id', empresaAtual.id)
        .eq('status', 'ativo')
        .order('nome_completo');
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id || isCalculadoraMockEnabled(),
  });

  /** Cálculo no servidor (edge function `calcular-rescisao`). */
  const handleCalcServidor = async () => {
    if (!form.salario || !form.dataAdmissao || !form.dataDesligamento) {
      toast.error('Preencha salário, data de admissão e desligamento');
      return;
    }
    setCalcServidor(true);
    try {
      const resposta = await edgeFunctionsService.calcularRescisao({
        salario_base: Number(form.salario),
        data_admissao: form.dataAdmissao,
        data_desligamento: form.dataDesligamento,
        tipo_rescisao: form.tipo,
        aviso_previo: form.avisoTrabalhado ? 'trabalhado' : 'indenizado',
        saldo_fgts: Number(form.saldoFGTS || 0),
        ferias_vencidas: form.feriasVencidas,
        dependentes_irrf: 0,
      });

      const data = resposta as any;
      if (data?.resultado) {
        setResult(data.resultado);
        registrarHistorico(data.resultado, form.nomeColaborador, form.tipo);
        toast.success('Rescisão calculada no servidor!');
      } else {
        toast.error('Servidor não retornou um resultado válido');
      }
    } catch (err) {
      toast.error(safeErrorMessage(err, 'Erro ao calcular rescisão.'));
    } finally {
      setCalcServidor(false);
    }
  };

  /** Cálculo local (motor canônico `utils/rescisaoCalc`) — não depende de rede. */
  const handleCalcLocal = useCallback(async () => {
    if (!form.salario || !form.dataAdmissao || !form.dataDesligamento) {
      toast.error('Preencha salário, data de admissão e desligamento');
      return;
    }

    setCalcLocal(true);
    try {
      const novo = await calcularRescisao({
        salario: Number(form.salario),
        dataAdmissao: form.dataAdmissao,
        dataDesligamento: form.dataDesligamento,
        tipo: form.tipo,
        avisoTrabalhado: form.avisoTrabalhado,
        feriasVencidas: form.feriasVencidas,
        saldoFGTS: Number(form.saldoFGTS || 0),
      });

      setResult(novo);
      registrarHistorico(novo, form.nomeColaborador, form.tipo);
      toast.success('Rescisão calculada com sucesso!');
    } catch (err) {
      toast.error(safeErrorMessage(err, 'Erro ao calcular rescisão.'));
    } finally {
      setCalcLocal(false);
    }
  }, [form, registrarHistorico]);

  /** O botão único "Calcular rescisão" despacha para o motor escolhido. */
  const handleCalcular = () => {
    if (mecanismo === 'servidor') return handleCalcServidor();
    return handleCalcLocal();
  };

  const salvarHistorico = useCallback(async () => {
    if (!result || !user || !empresaAtual) return;

    // MOCK VISUAL — ver src/mocks/calculadoraRescisaoMock.ts. Sem esta guarda o
    // clique gravaria em `historico_rescisoes` E em `desligamentos` na empresa
    // ativa, deixando histórico órfão de um colaborador que não existe no banco.
    if (bloquearEscritaCalculadora('Salvar o cálculo')) return;

    setSaving(true);
    try {
      // 1. Save to History
      const { data: historicoSalvo, error: histError } = await supabase
        .from('historico_rescisoes')
        .insert({
          empresa_id: empresaAtual.id,
          created_by: user.id,
          nome_colaborador: form.nomeColaborador || null,
          cargo: form.cargo || null,
          salario: Number(form.salario),
          data_admissao: form.dataAdmissao,
          data_desligamento: form.dataDesligamento,
          tipo_rescisao: form.tipo,
          aviso_trabalhado: form.avisoTrabalhado,
          ferias_vencidas: form.feriasVencidas,
          saldo_fgts: Number(form.saldoFGTS || 0),
          total_proventos: result.totalProventos,
          total_descontos: result.totalDescontos,
          total_liquido: result.totalLiquido,
          resultado: result as any,
        })
        .select()
        .single();

      if (histError) throw histError;

      // 2. Integration with Desligamentos Table
      if (form.dataDesligamento) {
        const { error: deslError } = await supabase.from('desligamentos').insert({
          empresa_id: empresaAtual.id,
          colaborador_id: colaboradores.find((c) => c.nome_completo === form.nomeColaborador)?.id,
          data_desligamento: form.dataDesligamento,
          motivo: form.tipo.replace(/_/g, ' '),
          valor_rescisao: result.totalLiquido,
          status: 'pendente',
          created_by: user.id,
        } as any);

        if (!deslError) {
          toast.success('Desligamento registrado no módulo de Pessoas!');
        }
      }

      toast.success('Cálculo salvo no histórico!');
      // `historicoSalvo` é o registro criado — mantido só para o `select().single()`
      // devolver a linha (mesmo comportamento de antes do redesign).
      void historicoSalvo;
    } catch (err) {
      toast.error(safeErrorMessage(err, 'Erro ao salvar cálculo.'));
    } finally {
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, form, user]);

  const set = (campo: keyof RescisaoFormState, valor: string | boolean) => setForm((p) => ({ ...p, [campo]: valor }));

  // Props do formulário de ENTRADA — compartilhadas pelos DOIS regimes de layout
  // (estado inicial, com `painelTopo`, e visão COM resultado). Num único objeto
  // para os dois ramos não divergirem.
  const propsFormulario = {
    form,
    onChange: set,
    colaboradores,
    colaborador: colaboradorSelecionado,
    loadingColab,
    onSelectColaborador: handleSelectColaborador,
    onLimparColaborador: handleLimparColaborador,
    mecanismo,
    onMecanismoChange: setMecanismo,
    onCalcular: handleCalcular,
    calculando,
  };

  return (
    <MotionConfig reducedMotion={MOTION_REDUCED_MODE}>
      <>
        <PageTitle title="Calculadora de Rescisão" description="Cálculo rescisório trabalhista" />
        <PageLayout
          title="Calculadora de Rescisão"
          description="Simule as verbas rescisórias e gere o TRCT de forma rápida e segura."
          icon={<Calculator className="h-5 w-5 text-primary-foreground" />}
          gradient="from-warning to-destructive"
          actions={
            <>
              {/* Bloco informativo do cabeçalho: estado + hora do último cálculo. */}
              <div className="hidden items-center gap-2.5 rounded-xl border border-border/40 bg-card/60 px-3 py-1.5 sm:flex">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Clock className="h-3.5 w-3.5" />
                </span>
                <div className="leading-tight">
                  <p className="text-[11px] font-body font-medium">
                    {result ? 'Cálculo atualizado' : 'Aguardando cálculo'}
                  </p>
                  <p className="text-[10px] font-body text-muted-foreground">
                    {result
                      ? `Hoje às ${format(new Date(result.timestamp), 'HH:mm', { locale: ptBR })}`
                      : 'Preencha os dados ao lado'}
                  </p>
                </div>
              </div>
              {/* CTA secundário com destaque: mesmo verde-lima dos CTAs principais
                do sistema (`bg-primary` + `text-primary-foreground` + glow), no
                lugar do antigo `outline` escuro. O `h-[42px]` casa EXATAMENTE
                com a altura renderizada do bloco "Aguardando cálculo" ao lado
                (42px = ícone de 28px + `py-1.5` + 1px de borda em cada lado),
                deixando os dois na mesma régua dentro do `flex items-center` do
                PageLayout. O ícone herda `currentColor` (escuro, junto do texto)
                — texto, posição e a ação de limpar seguem intactos. */}
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleLimparDados}
                className="h-[42px] rounded-xl bg-primary font-body text-primary-foreground shadow-glow transition-all hover:bg-primary/90 hover:shadow-glow"
              >
                <RotateCcw className="mr-1.5 h-4 w-4" />
                Limpar dados
              </Button>
            </>
          }
        >
          {/* Cascata de entrada das duas colunas: `EntradaPresenca` (mecanismo
            compartilhado de `ui/entrada-cards.tsx`) cria o contexto de presença
            que o `initial={false}` do `PageTransition` bloqueia — sem ela, as
            seções do formulário e o painel de resultado nasceriam prontos, na
            posição final, sem nenhuma cascata. Não renderiza DOM: o grid segue
            sendo o filho direto do `PageLayout`.

            ORDEM (mesma régua do Dashboard Executivo — `cardVariants`):
            coluna esquerda 0–4 (seções 1–4 + ação principal) e coluna direita
            4–8 (painel de resultado, KPIs e blocos das abas); dentro de cada
            aba, a cascata recomeça do 0 na ordem de leitura daquela
            apresentação. `MotionConfig reducedMotion="user"` mantém o fade e
            desliga o deslocamento quando o sistema pede movimento reduzido. */}
          <EntradaPresenca>
            {result ? (
              /* VISÃO COM RESULTADO — layout histórico PRESERVADO: as duas colunas
               no MESMO grid, `items-stretch`. As colunas compartilham a mesma
               linha e terminam na MESMA régua vertical (composição de referência).
               A coluna de resultado é esticada até a altura da coluna de entrada, e
               TODO o espaço excedente é ABSORVIDO por dentro do painel: a região do
               demonstrativo (aba ativa) cresce e distribui o excedente entre os seus
               blocos (`justify-between`), em vez de jogá-lo num único vão. Nada de
               `mt-auto` prendendo o líquido no rodapé — era isso que abria o vão
               entre o FGTS e o "Valor líquido estimado". Larguras preservadas. */
              <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                {/* COLUNA ESQUERDA — entrada de dados */}
                <FormularioRescisao {...propsFormulario} />

                {/* COLUNA DIREITA — resultado */}
                <ResultadoRescisao
                  result={result}
                  form={form}
                  mecanismo={mecanismo}
                  historico={historico}
                  saving={saving}
                  onGerarPDF={() => result && gerarPDFRescisao(form, result)}
                  onSalvar={salvarHistorico}
                />
              </div>
            ) : (
              /* ESTADO INICIAL — o painel de aguardo entra como `painelTopo`. Ele
               divide a LINHA da seção "1. Colaborador" e as duas bordas ficam na
               mesma régua por `items-stretch` do grid que o formulário monta; as
               seções 2–4 permanecem na coluna 1, abaixo da seção 1. Assim o painel
               acompanha SÓ a seção 1 — nunca a altura total das quatro. As larguras
               de coluna são as mesmas do grid acima. */
              <FormularioRescisao
                {...propsFormulario}
                painelTopo={
                  <ResultadoRescisao
                    result={result}
                    form={form}
                    mecanismo={mecanismo}
                    historico={historico}
                    saving={saving}
                    onGerarPDF={() => result && gerarPDFRescisao(form, result)}
                    onSalvar={salvarHistorico}
                  />
                }
              />
            )}
          </EntradaPresenca>
        </PageLayout>
      </>
    </MotionConfig>
  );
}
