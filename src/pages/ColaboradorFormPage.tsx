import { PageTitle } from '@/components/PageTitle';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState, type ComponentProps } from 'react';
import { PageLayout } from '@/components/layout';
import { FormField, FormSelect } from '@/components/forms';
import { CPFInput } from '@/components/ui/cpf-input';
import { PhoneInput } from '@/components/ui/phone-input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { CEPInput, type Address } from '@/components/ui/cep-input';
import { Button, buttonVariants } from '@/components/ui/button';
import { FlowHoverButton } from '@/components/ui/flow-hover-button';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
// Mesmo mecanismo de highlight deslizante (spring físico via
// getBoundingClientRect, `mode="parent"`) já usado na tablist master do
// Dossiê (`AnimatedDossieTabs.tsx`/`ColaboradorDetalhesPage`) — aqui aplicado
// direto (sem componente wrapper à parte) porque o conteúdo de cada trigger
// do stepper (círculo numerado + label + sublabel + underline) é específico
// deste formulário, sem equivalente reutilizável. Contexto de tabs 100%
// isolado do `Tabs`/`TabsContent` do Radix logo abaixo — sincronizado só via
// o mesmo par `activeTab`/`setActiveTab`, exatamente como no Dossiê.
import {
  Tabs as StepperTabs,
  TabsList as StepperTabsList,
  TabsTrigger as StepperTabsTrigger,
  TabsHighlight as StepperTabsHighlight,
  TabsHighlightItem as StepperTabsHighlightItem,
} from '@/components/animate-ui/primitives/animate/tabs';
import { colaboradorService } from '@/services';
import { colaboradorLotacaoService } from '@/services/colaboradorLotacaoService';
import { useNotification } from '@/contexts';
import {
  User, MapPin, Landmark, Briefcase,
  FileText, Save, Loader2, Camera,
  IdCard, Phone, Users, Sparkles, Upload, ShieldCheck,
  ArrowRight, ArrowLeft, X, Info, Link2, Building2, DollarSign,
  Search, Hash, Route, Map as MapIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { useCargos } from '@/hooks/useCargos';
import { useLocaisTrabalho, useTimes, useCentrosCusto, useLotacoesCatalogo, useLotacaoPrincipal } from '@/hooks';
import { useFormGuard } from '@/hooks/useFormGuard';
import { useServerValidation } from '@/hooks/useServerValidation';
import { useEmpresas } from '@/hooks/useEmpresas';
import { ContasBancariasTab } from '@/components/colaborador-detalhes/ContasBancariasTab';

/** Glifo oficial do WhatsApp (Simple Icons, MIT) — nenhum ícone do lucide-react
 * reproduz a marca; embutido como `currentColor` para herdar a mesma cor
 * neutra (`text-muted-foreground`) já usada nos outros ícones inline de input. */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.511-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.304-1.654a11.888 11.888 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.474-8.413" />
    </svg>
  );
}

// Opções de UF para os selects de "UF de emissão" (RG) e "CTPS UF" — não há
// hoje nenhuma lista de UFs compartilhada no projeto (o campo "UF" do
// endereço, mais abaixo, é texto livre); mantida local a este form.
const UFS_BRASIL = [
  { value: 'AC', label: 'Acre' }, { value: 'AL', label: 'Alagoas' }, { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' }, { value: 'BA', label: 'Bahia' }, { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' }, { value: 'ES', label: 'Espírito Santo' }, { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' }, { value: 'MT', label: 'Mato Grosso' }, { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' }, { value: 'PA', label: 'Pará' }, { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' }, { value: 'PE', label: 'Pernambuco' }, { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' }, { value: 'RN', label: 'Rio Grande do Norte' }, { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' }, { value: 'RR', label: 'Roraima' }, { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' }, { value: 'SE', label: 'Sergipe' }, { value: 'TO', label: 'Tocantins' },
];

// Exportado apenas para testes (validação direta dos enums corrigidos na
// Parte 3A) — continua sendo o único schema efetivamente usado pelo formulário.
// eslint-disable-next-line react-refresh/only-export-components
export const schema = z.object({
  // Geral
  nome_completo: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  nome_social: z.string().optional(),
  cpf: z.string().length(11, 'CPF inválido'),
  email: z.string().min(1, 'E-mail obrigatório').email('Email inválido'),
  telefone: z.string().optional(),
  celular: z.string().min(1, 'Celular obrigatório'),
  data_nascimento: z.string().min(1, 'Data de nascimento obrigatória'),
  // DECISÃO DE NEGÓCIO NECESSÁRIA — SEXO "OUTRO": o enum `sexo` no banco só
  // aceita 'masculino' | 'feminino' (ver src/integrations/supabase/types.ts).
  // A opção 'outro' abaixo diverge do banco e falha ao salvar. Não alterada
  // nesta etapa por ser uma decisão de produto, não técnica — ver auditoria
  // da Parte 3 (será tratada separadamente).
  sexo: z.enum(['masculino', 'feminino', 'outro']).default('masculino'),
  // Enum real do banco (estado_civil) inclui 'separado'.
  estado_civil: z.enum(['solteiro', 'casado', 'divorciado', 'viuvo', 'uniao_estavel', 'separado']).default('solteiro'),
  nome_mae: z.string().min(1, 'Nome da mãe obrigatório'),
  nome_pai: z.string().optional(),

  // Endereço
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().optional(),

  // Profissional
  data_admissao: z.string().min(1, 'Data obrigatória'),
  salario_base: z.number().positive('Salário deve ser positivo'),
  cargo: z.string().min(1, 'Cargo obrigatório'),
  // PARTE C: passa a gravar também o FK real (cargos.id) além do nome em
  // texto — permite exibir CBO via join com `cargos` no Dossiê sem duplicar
  // dado. Opcional para não quebrar fluxos que ainda não selecionam via combobox.
  cargo_id: z.string().optional(),
  departamento: z.string().min(1, 'Departamento obrigatório'),
  // Valores exatos do enum `tipo_contrato` do banco — 'autonomo' não existe.
  tipo_contrato: z.enum(['clt', 'pj', 'estagiario', 'temporario', 'intermitente', 'aprendiz']).default('clt'),
  // Valores exatos do enum `status_colaborador` do banco — 'inativo' não existe.
  status: z.enum(['ativo', 'pendente', 'desligado', 'ferias', 'afastado']).default('ativo'),
  matricula: z.string().optional(),
  // Aba Profissional — bloco "Estrutura Interna"/"Alocação": mesmo padrão
  // ID+texto já usado em cargo/cargo_id acima (grava o FK real + o nome em
  // texto, que é o que o card "Vínculo & Alocação" usa como fallback quando
  // não consegue resolver o join — ver TrabalhoHierarquiaTab.tsx).
  time_id: z.string().optional(),
  centro_custo_id: z.string().optional(),
  centro_custo: z.string().optional(),
  local_trabalho_id: z.string().optional(),
  local_trabalho: z.string().optional(),
  // Não é coluna de `colaboradores` — persistida à parte em
  // `colaborador_lotacoes` (ver onSubmit) depois que o colaborador existe.
  // Campo só de UI: nunca é enviado dentro do payload de
  // criar/atualizar colaborador (normalizarPayloadColaborador não o inclui).
  lotacao_principal_id: z.string().optional(),

  // PARTE 4E: dados bancários deixaram de ser coletados por este formulário.
  // colaboradores.banco_codigo/banco_nome/agencia/conta/tipo_conta/pix_chave/
  // pix_tipo continuam existindo no banco (usados temporariamente pelo
  // holerite legado — Parte 4D) e no tipo `Colaborador`, mas este formulário
  // não os lê nem os grava mais. A única interface para dados bancários
  // passa a ser `contas_bancarias`, via `ContasBancariasTab` (aba
  // "Financeiro" abaixo, para colaboradores já existentes).

  // Documentos
  rg: z.string().optional(),
  rg_orgao_emissor: z.string().optional(),
  rg_uf: z.string().optional(),
  rg_data_emissao: z.string().optional(),
  rg_data_validade: z.string().optional(),
  pis_pasep: z.string().optional(),
  ctps_numero: z.string().optional(),
  ctps_serie: z.string().optional(),
  ctps_uf: z.string().optional()});

type FormData = z.infer<typeof schema>;
type FormInput = z.input<typeof schema>;

// PARTE 3B: colunas TEXT opcionais e nullable em `colaboradores` (confirmado
// em src/integrations/supabase/types.ts — todas `?: string | null` nos tipos
// Insert/Update). Strings vazias digitadas nesses campos viram `null` antes
// de enviar ao service, em vez de gravar "" no banco. Não inclui campos
// obrigatórios, enums, números, CPF, dados bancários ou demais documentos —
// esses não são tocados nesta normalização.
// Exceção: `rg_data_emissao`/`rg_data_validade` são colunas `date` (não
// TEXT), mas entram aqui porque o botão "Limpar" do DatePicker
// (`date-picker.tsx`) chama `onChange('')` — sem essa normalização, um ""
// enviado direto a uma coluna `date` do Postgres quebra o insert/update
// (22007) em vez de virar NULL sozinho.
// eslint-disable-next-line react-refresh/only-export-components
export const NULLABLE_TEXT_FIELDS = [
  'nome_social', 'nome_pai', 'telefone',
  'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf',
  'matricula', 'rg_data_emissao', 'rg_data_validade',
  'centro_custo', 'local_trabalho',
] as const satisfies readonly (keyof FormData)[];

// Campos de "Dados Gerais" que bloqueiam avanço/envio quando vazios — usado
// tanto pelo `trigger()` do stepper (ao clicar "Próximo" na 1ª etapa) quanto
// pelo fallback de `handleSubmit(onSubmit, onInvalid)` (garante que o usuário
// seja levado de volta à etapa 1 se tentar salvar com essas etapas escondidas
// por já ter navegado para outra aba).
const CAMPOS_OBRIGATORIOS_GERAL = [
  'nome_completo', 'cpf', 'data_nascimento', 'email', 'celular', 'sexo', 'estado_civil',
] as const satisfies readonly (keyof FormData)[];

// eslint-disable-next-line react-refresh/only-export-components
export function normalizarPayloadColaborador(data: FormData): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...data };
  for (const field of NULLABLE_TEXT_FIELDS) {
    if (payload[field] === '') payload[field] = null;
  }
  // `lotacao_principal_id` não é coluna de `colaboradores` — persistida à
  // parte em `colaborador_lotacoes` (ver onSubmit), nunca no payload de
  // criar/atualizar colaborador.
  delete payload.lotacao_principal_id;
  return payload;
}

/** Rodapé compartilhado por todos os 5 cards de etapa — mensagem de
 * segurança à esquerda + ações de navegação do stepper à direita. Na última
 * etapa, "Próximo" vira a própria ação de salvar (mesma lógica de
 * `handleSubmit(onSubmit)` do botão do header, sem duplicar regra nova). */
function StepFooter({
  activeIndex, isLastStep, isEditing, isSubmitting, onVoltar, onRascunho, onProximo,
}: {
  activeIndex: number;
  isLastStep: boolean;
  isEditing: boolean;
  isSubmitting: boolean;
  onVoltar: () => void;
  onRascunho: () => void;
  onProximo: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-t border-border/20 bg-muted/20">
      <div className="flex items-start gap-2.5">
        <div className="h-7 w-7 rounded-full bg-success/10 flex items-center justify-center shrink-0">
          <ShieldCheck className="h-3.5 w-3.5 text-success" />
        </div>
        <div>
          <p className="text-xs font-medium leading-tight">Seus dados estão seguros</p>
          <p className="text-[11px] text-muted-foreground leading-tight">Todas as informações são protegidas e usadas apenas para fins administrativos.</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {activeIndex > 0 && (
          <Button type="button" size="sm" className="h-8 rounded-lg gap-1.5 text-xs px-4" onClick={onVoltar}>
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg gap-1.5 text-xs px-3 hover:bg-background hover:text-foreground hover:shadow-glow" onClick={onRascunho}>
          <Save className="h-3.5 w-3.5" /> Salvar rascunho
        </Button>
        <Button type="button" size="sm" className="h-8 rounded-lg gap-1.5 text-xs px-4" onClick={onProximo} disabled={isSubmitting}>
          {isLastStep ? (
            <>
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {isEditing ? 'Salvar Alterações' : 'Cadastrar agora'}
            </>
          ) : (
            <>Próximo <ArrowRight className="h-3.5 w-3.5" /></>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function ColaboradorFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error: notifyError } = useNotification();
  const { handleServerError } = useServerValidation<FormInput>();
  const [activeTab, setActiveTab] = useState('geral');
  const [showTip, setShowTip] = useState(true);
  const isEditing = !!id;
  const { empresaAtual } = useEmpresas();

  // pageSize alto (limite do BaseService) para listar todos os departamentos/
  // cargos da empresa nos selects deste formulário — mesma técnica já
  // aplicada aos dropdowns de filtro da listagem de Colaboradores.
  const { departamentos } = useDepartamentos({ pageSize: 100 });
  const { cargos } = useCargos({ pageSize: 100 });

  const { data: colaborador, isLoading } = useQuery({
    queryKey: ['colaborador', id],
    queryFn: () => (colaboradorService as any).buscarPorId(id!),
    enabled: isEditing});

  // Mesma empresa que o card "Vínculo & Alocação" usa para resolver Time/
  // Centro de custo (ver TrabalhoHierarquiaTab.tsx): a do próprio registro em
  // edição, não a selecionada no contexto — evita listar opções de outra
  // empresa se o usuário tiver trocado de empresa no meio da edição.
  const empresaIdEfetivo = isEditing ? colaborador?.empresa_id : empresaAtual?.id;
  const { data: centrosCusto } = useCentrosCusto(empresaIdEfetivo);
  const { data: times } = useTimes(empresaIdEfetivo);
  const { locais } = useLocaisTrabalho({ pageSize: 100 });
  // Unidade/Lotação principal — agora editável: catálogo (/lotacoes, só
  // ativas) alimenta o Select; `lotacaoPrincipalAtual` pré-preenche o valor
  // em edição a partir de `colaborador_lotacoes.principal = true` (mesma
  // fonte que o card "Vínculo & Alocação" passou a usar — nada de heurística
  // "primeira ativa" aqui).
  const { data: lotacoesCatalogo } = useLotacoesCatalogo(empresaIdEfetivo);
  const { data: lotacaoPrincipalAtual } = useLotacaoPrincipal(id, empresaIdEfetivo);

  const { register, handleSubmit, formState: { errors, isDirty }, setValue, getValues, reset, watch, setError, trigger } = useForm<FormInput, unknown, FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: 'ativo',
      estado_civil: 'solteiro',
      tipo_contrato: 'clt',
      sexo: 'masculino',
      // Campos controlados via watch()/setValue() (não register()) — sem um
      // default de string vazia, o valor inicial é `undefined` e o Zod
      // reporta a mensagem genérica de tipo ("expected string, received
      // undefined") em vez da mensagem customizada de obrigatoriedade.
      cpf: '',
      data_nascimento: '',
      celular: '',
      telefone: '',
    }});

  // Proteção contra perda de dados
  useFormGuard(isDirty);

  useEffect(() => {
    if (colaborador) {
      reset(colaborador as any);
    }
  }, [colaborador, reset]);

  // Compatibilidade com colaboradores antigos: registros gravados antes do
  // FK existir podem ter só o texto preenchido (`centro_custo`/
  // `local_trabalho`) com o `*_id` nulo — sem isso, o Select ficaria vazio
  // mesmo já havendo um valor salvo. Resolve o FK pelo nome só para exibição
  // (setValue sem shouldDirty não marca o form como alterado); nada é
  // persistido no banco até o usuário efetivamente salvar. Roda de novo
  // quando os cadastros mestres terminam de carregar (podem chegar depois do
  // colaborador), mas nunca sobrescreve uma seleção já feita (própria ou já
  // resolvida) — verificado via getValues, não via `watch` (que criaria
  // dependência circular de re-render neste efeito).
  useEffect(() => {
    if (!colaborador) return;
    if (!colaborador.centro_custo_id && colaborador.centro_custo && !getValues('centro_custo_id')) {
      const match = (centrosCusto as any[] | undefined)?.find((c) => c.nome === colaborador.centro_custo);
      if (match) setValue('centro_custo_id', match.id);
    }
    if (!colaborador.local_trabalho_id && colaborador.local_trabalho && !getValues('local_trabalho_id')) {
      const match = (locais as any[] | undefined)?.find((l) => l.nome === colaborador.local_trabalho);
      if (match) setValue('local_trabalho_id', match.id);
    }
  }, [colaborador, centrosCusto, locais, setValue, getValues]);

  // Pré-preenche o Select "Unidade / Lotação principal" com o vínculo já
  // salvo em `colaborador_lotacoes` — não vem no objeto `colaborador` (não é
  // coluna de `colaboradores`), então não é coberto pelo `reset()` acima; ao
  // contrário, o PRÓPRIO `reset(colaborador as any)` (efeito anterior) apaga
  // este campo (fica fora do objeto resetado) sempre que `colaborador` muda
  // — por isso `colaborador` também entra nas deps aqui, pra este efeito
  // reaplicar o valor depois de cada reset, não só quando `lotacaoPrincipalAtual`
  // muda. Guarda por `getValues` pelo mesmo motivo do efeito de
  // compatibilidade acima: nunca sobrescreve uma escolha que o usuário já
  // fez nesta sessão.
  useEffect(() => {
    if (lotacaoPrincipalAtual?.id && !getValues('lotacao_principal_id')) {
      setValue('lotacao_principal_id', lotacaoPrincipalAtual.id);
    }
  }, [lotacaoPrincipalAtual, colaborador, setValue, getValues]);

  const mutation = useMutation({
    // PARTE 3A: empresa_id nunca é lido do formulário/usuário.
    // - Criação: sempre usa a empresa atual do contexto (useEmpresas) —
    //   `onSubmit` abaixo já garante que empresaAtual existe antes de chegar
    //   aqui.
    // - Edição: usa o empresa_id do próprio registro carregado (nunca o da
    //   empresa atual do contexto), via o wrapper `update()` que preserva a
    //   validação de tenant já existente em BaseService.atualizar.
    mutationFn: async (data: FormData) => {
      // PARTE 3B: normaliza "" -> null nos campos TEXT opcionais/nullable
      // antes de enviar — não mexe em obrigatórios, enums, números, datas,
      // CPF, bancário ou documentos (ver NULLABLE_TEXT_FIELDS).
      const payload = normalizarPayloadColaborador(data);
      const saved = isEditing
        ? await (colaboradorService as any).update(id!, payload, colaborador?.empresa_id)
        : await (colaboradorService as any).create({ ...payload, empresa_id: empresaAtual!.id });

      // Lotação principal não é coluna de `colaboradores` — só pode ser
      // persistida DEPOIS que o colaborador existe (em criação, `saved.id`
      // só existe neste ponto), e só quando algo foi selecionado (o campo
      // continua opcional).
      const empresaIdParaLotacao = isEditing ? colaborador?.empresa_id : empresaAtual?.id;
      if (data.lotacao_principal_id && saved?.id && empresaIdParaLotacao) {
        await colaboradorLotacaoService.definirPrincipal(saved.id, data.lotacao_principal_id, empresaIdParaLotacao);
      }

      return saved;
    },

    onSuccess: (saved: any) => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      // O card "Vínculo & Alocação" (TrabalhoHierarquiaTab) resolve
      // cargo/local/time/centro de custo/lotação principal via queries
      // próprias, separadas de ['colaborador', id] — sem invalidar essas
      // aqui, o card continuaria mostrando o valor antigo até essas queries
      // expirarem sozinhas.
      if (isEditing) {
        queryClient.invalidateQueries({ queryKey: ['colaborador', id] });
      }
      queryClient.invalidateQueries({ queryKey: ['cargo-resumo'] });
      queryClient.invalidateQueries({ queryKey: ['local-trabalho-resumo'] });
      queryClient.invalidateQueries({ queryKey: ['times'] });
      queryClient.invalidateQueries({ queryKey: ['centros-custo'] });
      queryClient.invalidateQueries({ queryKey: ['lotacao-principal', saved?.id ?? id] });
      success(isEditing ? 'Colaborador atualizado!' : 'Colaborador criado!');
      navigate('/colaboradores');
    },
    onError: (err: any) => handleServerError(err, setError)});

  const onSubmit = (data: FormData) => {
    if (!isEditing) {
      if (!empresaAtual?.id) {
        notifyError('Nenhuma empresa selecionada', 'Selecione uma empresa antes de cadastrar um colaborador.');
        return;
      }
    } else {
      const colaboradorEmpresaId = colaborador?.empresa_id;
      if (!colaboradorEmpresaId) {
        notifyError('Empresa não identificada', 'Não foi possível identificar a empresa deste colaborador. Recarregue a página e tente novamente.');
        return;
      }
      if (empresaAtual?.id && empresaAtual.id !== colaboradorEmpresaId) {
        notifyError('Empresa divergente', 'Este colaborador pertence a outra empresa. Troque de empresa para editá-lo.');
        return;
      }
    }
    mutation.mutate(data);
  };

  // Se o envio falhar na validação (ex.: e-mail/celular obrigatórios vazios)
  // enquanto o usuário já navegou para outra etapa, os campos com erro ficam
  // desmontados (TabsContent só renderiza a etapa ativa) — sem isso o usuário
  // veria o clique em "Salvar" não fazer nada, sem entender por quê.
  const onInvalid = (formErrors: Record<string, unknown>) => {
    if (CAMPOS_OBRIGATORIOS_GERAL.some((field) => formErrors[field])) {
      setActiveTab('geral');
    }
  };

  const handleAddressFound = (addr: Address) => {
    setValue('logradouro', addr.logradouro);
    setValue('bairro', addr.bairro);
    setValue('cidade', addr.cidade);
    setValue('uf', addr.uf);
    setValue('cep', addr.cep);
  };

  // Rascunho local (client-side apenas) — não existe endpoint/coluna de
  // rascunho no backend, então "Salvar rascunho" persiste um snapshot do
  // formulário no localStorage deste navegador, sem tocar em `colaboradores`.
  const handleSalvarRascunho = () => {
    try {
      // eslint-disable-next-line react-hooks/incompatible-library
      localStorage.setItem(`colaborador-rascunho-${id ?? 'novo'}`, JSON.stringify(watch()));
      success('Rascunho salvo', 'Os dados preenchidos foram salvos neste navegador.');
    } catch {
      notifyError('Erro ao salvar rascunho', 'Não foi possível salvar o rascunho localmente.');
    }
  };

  if (isLoading) return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;

  const tabs = [
    { id: 'geral', label: 'Dados Gerais', sublabel: 'Informações básicas', icon: User },
    { id: 'profissional', label: 'Profissional', sublabel: 'Dados da carreira', icon: Briefcase },
    { id: 'endereco', label: 'Endereço', sublabel: 'Localização', icon: MapPin },
    { id: 'bancario', label: 'Financeiro', sublabel: 'Dados de pagamento', icon: Landmark },
    { id: 'documentos', label: 'Documentação', sublabel: 'Anexos e documentos', icon: FileText },
  ];
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.id === activeTab));
  const progressPct = Math.round(((activeIndex + 1) / tabs.length) * 100);
  const isLastStep = activeIndex === tabs.length - 1;
  const goToStep = (index: number) => setActiveTab(tabs[index].id);
  const handleVoltarEtapa = () => { if (activeIndex > 0) goToStep(activeIndex - 1); };
  const handleProximaEtapa = async () => {
    // Bloqueia o avanço da 1ª etapa ("Dados Gerais") enquanto os campos
    // obrigatórios (Nome/CPF/Data Nascimento/E-mail/Celular/Sexo/Estado
    // Civil) não estiverem preenchidos — mesma trava exigida no envio final,
    // só que já na navegação do stepper para dar feedback mais cedo.
    if (activeTab === 'geral') {
      const valido = await trigger(CAMPOS_OBRIGATORIOS_GERAL);
      if (!valido) return;
    }
    if (isLastStep) {
      handleSubmit(onSubmit, onInvalid)();
    } else {
      goToStep(activeIndex + 1);
    }
  };

  return (
    <>
      <PageTitle title={isEditing ? colaborador?.nome_completo || 'Editar Colaborador' : 'Novo Colaborador'} />
      <PageLayout
        title={isEditing ? colaborador?.nome_completo : 'Novo Colaborador'}
        description={isEditing ? `Perfil profissional · Matrícula ${colaborador?.matricula || 'N/A'}` : 'Cadastre as informações essenciais para a integração do novo talento'}
        icon={<User className="h-5 w-5 text-primary-foreground" />}
        backTo="/colaboradores"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-xl shadow-xs bg-card/50 hover:bg-background hover:text-foreground hover:shadow-glow" onClick={() => navigate('/colaboradores')}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="rounded-xl gap-1.5 bg-primary text-primary-foreground shadow-glow hover:shadow-glow-lg transition-all"
              onClick={handleSubmit(onSubmit, onInvalid)}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span>{isEditing ? 'Salvar Alterações' : 'Cadastrar agora'}</span>
            </Button>
          </div>
        }
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Stepper — substitui a tablist antiga por uma barra de progresso
              de cadastro (5 etapas numeradas + "Etapa X de 5"/%). Continua
              controlando o mesmo `activeTab`/`onValueChange` do Radix Tabs
              abaixo, então a navegação livre entre etapas (clicar em
              qualquer uma) é preservada, igual à tablist anterior. */}
          <div className="rounded-2xl border border-border/30 bg-card/50 shadow-elevated p-3">
            <div className="flex items-center gap-4">
              <StepperTabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-w-0">
                {/* `Omit<HighlightProps, ...>` num tipo união colapsa pras props
                    comuns a TODAS as variantes (`keyof` de união = interseção),
                    perdendo `containerClassName` (só existe na variante
                    `mode="parent"`) — mesmo cast usado em `AnimatedDossieTabsList`
                    pra contornar essa limitação de tipo da lib vendorizada. */}
                <StepperTabsHighlight
                  {...({
                    mode: 'parent' as const,
                    className: 'rounded-xl bg-primary/10',
                    containerClassName: 'h-auto',
                    transition: { type: 'spring' as const, stiffness: 220, damping: 24, mass: 0.7 },
                  } as unknown as ComponentProps<typeof StepperTabsHighlight>)}
                >
                  <StepperTabsList className="flex justify-between gap-2">
                    {tabs.map((tab, index) => {
                      const isActive = tab.id === activeTab;
                      const isDone = index < activeIndex;
                      return (
                        <StepperTabsHighlightItem key={tab.id} value={tab.id} asChild>
                          <StepperTabsTrigger
                            value={tab.id}
                            className="relative z-10 flex items-center gap-2.5 px-3 py-1.5 rounded-xl shrink-0 text-left justify-start hover:bg-muted/50 transition-colors"
                          >
                            <span
                              className={cn(
                                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold shrink-0 transition-colors',
                                isActive
                                  ? 'bg-primary text-primary-foreground'
                                  : isDone
                                    ? 'bg-primary/15 text-primary'
                                    : 'bg-muted text-muted-foreground'
                              )}
                            >
                              {index + 1}
                            </span>
                            <span className="hidden sm:block">
                              <span className={cn('block text-sm font-medium leading-tight whitespace-nowrap', !isActive && 'text-muted-foreground')}>
                                {tab.label}
                              </span>
                              <span className="block text-xs text-muted-foreground leading-tight whitespace-nowrap">{tab.sublabel}</span>
                              {isActive && <span className="block h-0.5 w-8 bg-primary rounded-full mt-1" />}
                            </span>
                          </StepperTabsTrigger>
                        </StepperTabsHighlightItem>
                      );
                    })}
                  </StepperTabsList>
                </StepperTabsHighlight>
              </StepperTabs>
              <div className="flex flex-col gap-1.5 shrink-0 w-56">
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Etapa {activeIndex + 1} de {tabs.length}</span>
                <div className="flex items-center gap-2">
                  <Progress value={progressPct} className="h-2 flex-1" />
                  <span className="text-xs font-medium text-muted-foreground shrink-0">{progressPct}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* TAB GERAL */}
          <TabsContent value="geral">
            <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
                <CardContent className="p-6 space-y-5">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0 * 0.15, duration: 0.5 }}
                    className="flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-4.5 w-4.5 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-display font-medium text-base leading-tight">Informações Pessoais</h2>
                        <p className="text-sm text-muted-foreground leading-tight">
                          {isEditing ? 'Dados básicos de identificação e contato' : 'Dados básicos de identificação e contato do novo colaborador'}
                        </p>
                      </div>
                    </div>

                    {showTip && (
                      <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 max-w-sm shrink-0">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium leading-tight">Um bom começo faz toda a diferença!</p>
                          <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                            Preencha as informações com atenção para uma integração tranquila.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowTip(false)}
                          className="text-muted-foreground hover:text-foreground shrink-0"
                          aria-label="Fechar dica"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </motion.div>

                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Coluna da foto — não compartilha o grid dos campos. Altura
                        aproxima da seção "Identificação" à direita (Nome +
                        CPF/Data/Matrícula), terminando um pouco antes de "Contato". */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1 * 0.15, duration: 0.5 }}
                      className="flex sm:flex-col items-center gap-3 lg:w-44 shrink-0"
                    >
                      <div className="h-40 w-40 sm:h-44 sm:w-44 rounded-2xl bg-muted flex items-center justify-center border border-border/40 relative group cursor-pointer hover:bg-muted/80 transition-colors shrink-0">
                        <Camera className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity flex items-center justify-center">
                          <span className="text-xs font-medium uppercase text-primary">Alterar</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-1.5 text-center">
                        <FlowHoverButton
                          type="button"
                          icon={<Upload className="h-3.5 w-3.5" />}
                          className={cn(
                            buttonVariants({ variant: 'outline' }),
                            'h-8 rounded-lg gap-1.5 text-xs px-3 border-border/50 hover:border-primary/30 hover:bg-primary/5 hover:text-primary-foreground before:bg-primary transition-colors',
                          )}
                        >
                          Adicionar foto
                        </FlowHoverButton>
                        <p className="text-[10px] text-muted-foreground leading-tight">JPG, PNG ou WEBP<br />Máx. 5MB</p>
                      </div>
                    </motion.div>

                    {/* Formulário — ocupa o restante da largura. */}
                    <div className="flex-1 min-w-0 space-y-5">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 2 * 0.15, duration: 0.5 }}
                        className="space-y-3"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          <IdCard className="h-3.5 w-3.5" /> Identificação
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                          <div className="sm:col-span-3">
                            <FormField label="Nome Completo" required {...register('nome_completo')} error={errors.nome_completo?.message} placeholder="Ex: João da Silva Santos" />
                          </div>
                          <div className="sm:col-span-2">
                            <FormField label="Nome Social / Apelido" {...register('nome_social')} error={errors.nome_social?.message} placeholder="Como o colaborador prefere ser chamado" />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium leading-none">CPF <span className="text-destructive" aria-hidden="true">*</span></label>
                            <CPFInput value={watch('cpf')} onChange={(v) => setValue('cpf', v)} />
                            {errors.cpf && <p className="text-xs text-destructive">{errors.cpf.message}</p>}
                          </div>

                          {/* `type="date"` vira o `DatePicker` do Design System (ver
                              src/components/ui/input.tsx) — controlado, não pode usar
                              `register()` (uncontrolled/baseado em ref); mesmo padrão
                              watch/setValue já usado acima para CPFInput/PhoneInput. */}
                          <FormField
                            label="Data Nascimento"
                            required
                            type="date"
                            name="data_nascimento"
                            value={watch('data_nascimento')}
                            onChange={(e) => setValue('data_nascimento', e.target.value)}
                            error={errors.data_nascimento?.message}
                          />
                          {/* Matrícula Interna deixou de ser editável aqui — fonte
                              única de edição passa a ser a aba "Profissional"
                              (bloco Remuneração e Identificação), evitando o mesmo
                              input editável duplicado em duas abas. */}
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 3 * 0.15, duration: 0.5 }}
                        className="space-y-3 pt-4 border-t border-border/20"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          <Phone className="h-3.5 w-3.5" /> Contato
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {/* PARTE 3B: rótulo neutro — `email` é usado de forma
                              genérica em todo o sistema (inclusive vínculo de
                              usuário/portal), não é exclusivamente "pessoal". */}
                          <FormField label="E-mail" required type="email" {...register('email')} error={errors.email?.message} placeholder="joao@exemplo.com" />

                          {/* PARTE 3B: telefone e celular são colunas independentes
                              no banco — cada uma com seu próprio campo, sem cópia
                              automática entre elas (evita perder o telefone fixo
                              já cadastrado ao editar só o celular, e vice-versa). */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium leading-none">Telefone</label>
                            <PhoneInput value={watch('telefone')} onChange={(v) => setValue('telefone', v)} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium leading-none">Celular / WhatsApp <span className="text-destructive" aria-hidden="true">*</span></label>
                            <PhoneInput
                              value={watch('celular')}
                              onChange={(v) => setValue('celular', v)}
                              icon={<WhatsAppIcon className="h-4 w-4" />}
                            />
                            {errors.celular
                              ? <p className="text-xs text-destructive">{errors.celular.message}</p>
                              : <p className="text-xs text-muted-foreground">Usado para comunicados importantes</p>}
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  {/* "Dados Pessoais"/"Filiação" ficam FORA da linha foto+formulário
                      e ocupam a largura inteira do card — a coluna da foto já
                      termina bem antes (logo após "Contato"), então manter esses
                      dois campos indentados atrás dela deixava um vazio embaixo
                      da foto sem necessidade. */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-border/20">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 4 * 0.15, duration: 0.5 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        <User className="h-3.5 w-3.5" /> Dados Pessoais
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {/* DECISÃO DE NEGÓCIO NECESSÁRIA — SEXO "OUTRO": opção mantida
                            por ora (não é uma decisão técnica); ver comentário no
                            schema acima e a auditoria da Parte 3. */}
                        <FormSelect
                          label="Sexo"
                          required
                          value={watch('sexo')}
                          options={[{ value: 'masculino', label: 'Masculino' }, { value: 'feminino', label: 'Feminino' }, { value: 'outro', label: 'Outro' }]}
                          onChange={(v) => setValue('sexo', v as any)}
                        />
                        <FormSelect
                          label="Estado Civil"
                          required
                          value={watch('estado_civil')}
                          options={[
                            { value: 'solteiro', label: 'Solteiro(a)' }, { value: 'casado', label: 'Casado(a)' },
                            { value: 'divorciado', label: 'Divorciado(a)' }, { value: 'viuvo', label: 'Viúvo(a)' },
                            { value: 'separado', label: 'Separado(a)' },
                            { value: 'uniao_estavel', label: 'União Estável' },
                          ]}
                          onChange={(v) => setValue('estado_civil', v as any)}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Essas informações são utilizadas para fins cadastrais e em benefícios.</p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 5 * 0.15, duration: 0.5 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        <Users className="h-3.5 w-3.5" /> Filiação
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label="Nome da Mãe" {...register('nome_mae')} error={errors.nome_mae?.message} />
                        <FormField label="Nome do Pai (Opcional)" {...register('nome_pai')} />
                      </div>
                    </motion.div>
                  </div>
                </CardContent>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 6 * 0.15, duration: 0.5 }}>
                  <StepFooter
                    activeIndex={activeIndex}
                    isLastStep={isLastStep}
                    isEditing={isEditing}
                    isSubmitting={mutation.isPending}
                    onVoltar={handleVoltarEtapa}
                    onRascunho={handleSalvarRascunho}
                    onProximo={handleProximaEtapa}
                  />
                </motion.div>
            </Card>
          </TabsContent>

          {/* TAB PROFISSIONAL */}
          <TabsContent value="profissional">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
                <CardContent className="p-6 space-y-5">
                  {/* Header principal — mantém o mesmo ícone/tratamento circular
                      já usado no header da aba "Geral" (h-9 w-9 rounded-xl
                      bg-primary/10). Aviso informativo à direita reaproveita o
                      mesmo padrão do "showTip" da aba Geral (border-primary/20
                      bg-primary/5), só que discreto e sempre visível — agora
                      deixando explícito que estes dados alimentam o card
                      "Vínculo & Alocação" do Dossiê (TrabalhoHierarquiaTab),
                      que não é tocado por este formulário. */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0 * 0.15, duration: 0.5 }}
                    className="flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Briefcase className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-display font-medium text-base leading-tight">Dados Profissionais</h2>
                        <p className="text-sm text-muted-foreground leading-tight">Informações sobre o vínculo, estrutura organizacional, alocação e remuneração do colaborador.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 sm:w-[30%] shrink-0">
                      <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        Os dados desta etapa alimentam o card &quot;Vínculo &amp; Alocação&quot; na visão geral do colaborador.
                      </p>
                    </div>
                  </motion.div>

                  {/* Bloco 1 — Vínculo */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 * 0.15, duration: 0.5 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Link2 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium leading-tight">Vínculo</h3>
                        <p className="text-xs text-muted-foreground leading-tight">Dados sobre o tipo de contratação e status atual do colaborador.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        label="Data de admissão"
                        type="date"
                        name="data_admissao"
                        value={watch('data_admissao')}
                        onChange={(e) => setValue('data_admissao', e.target.value)}
                        error={errors.data_admissao?.message}
                      />
                      <FormSelect
                        label="Tipo de contrato"
                        value={watch('tipo_contrato')}
                        options={[
                          { value: 'clt', label: 'CLT (Efetivo)' }, { value: 'pj', label: 'PJ (Prestador)' },
                          { value: 'estagiario', label: 'Estágio' }, { value: 'temporario', label: 'Temporário' },
                          { value: 'intermitente', label: 'Intermitente' }, { value: 'aprendiz', label: 'Aprendiz' },
                        ]}
                        onChange={(v) => setValue('tipo_contrato', v as any)}
                      />
                      <FormSelect
                        label="Status atual"
                        value={watch('status')}
                        options={[
                          // Reativar um colaborador desligado por aqui apagaria o
                          // histórico de vínculos (sobrescreve data_admissao no
                          // mesmo registro). Trava a transição desligado→ativo
                          // neste form — o fluxo correto é "Recontratar
                          // Colaborador" no Dossiê (cria vínculo novo, preserva
                          // o anterior). Ver colaboradorService.recontratar.
                          { value: 'ativo', label: 'Ativo', disabled: isEditing && colaborador?.status === 'desligado' },
                          { value: 'pendente', label: 'Pendente' },
                          { value: 'desligado', label: 'Desligado' },
                          { value: 'ferias', label: 'Em Férias' },
                          { value: 'afastado', label: 'Afastado' },
                        ]}
                        onChange={(v) => setValue('status', v as any)}
                        description={
                          isEditing && colaborador?.status === 'desligado'
                            ? 'Para reativar este colaborador, use "Recontratar Colaborador" no Dossiê — isso preserva o histórico de vínculos.'
                            : undefined
                        }
                      />
                    </div>
                  </motion.div>

                  {/* Bloco 2 — Estrutura Interna. Time/Centro de custo gravam
                      apenas o FK (*_id) — não existe coluna de texto para
                      "time" e o card já resolve os nomes via join (ver
                      TrabalhoHierarquiaTab.tsx); Centro de custo grava FK +
                      nome em texto, mesmo padrão ID+texto do Cargo abaixo. */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2 * 0.15, duration: 0.5 }}
                    className="space-y-3 pt-4 border-t border-border/20"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium leading-tight">Estrutura Interna</h3>
                        <p className="text-xs text-muted-foreground leading-tight">Cargo, departamento, time e centro de custo onde o colaborador está alocado.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormSelect
                        label="Cargo"
                        value={watch('cargo')}
                        placeholder={cargos.length ? 'Selecione...' : 'Nenhum cargo cadastrado'}
                        options={cargos.map(c => ({ value: c.nome, label: c.ativo === false ? `${c.nome} (inativo)` : c.nome }))}
                        onChange={(v) => {
                          setValue('cargo', v);
                          setValue('cargo_id', cargos.find(c => c.nome === v)?.id);
                        }}
                        error={errors.cargo?.message}
                        // Fica no meio do card: sem isso, o Radix detecta
                        // pouco espaço abaixo do trigger em viewports mais
                        // curtas e abre o menu pra cima, cobrindo o cabeçalho
                        // da página (breadcrumbs/busca) em vez do próprio
                        // formulário.
                        avoidCollisions={false}
                      />
                      <FormSelect
                        label="Departamento"
                        value={watch('departamento')}
                        placeholder={departamentos.length ? 'Selecione...' : 'Nenhum departamento cadastrado'}
                        options={departamentos.map(d => ({ value: d.nome, label: d.ativo === false ? `${d.nome} (inativo)` : d.nome }))}
                        onChange={(v) => setValue('departamento', v)}
                        error={errors.departamento?.message}
                        avoidCollisions={false}
                      />
                      <FormSelect
                        label="Time"
                        value={watch('time_id') ?? ''}
                        placeholder={times?.length ? 'Selecione...' : 'Nenhum time cadastrado'}
                        options={(times as any[] | undefined ?? []).map(t => ({ value: t.id, label: t.ativo === false ? `${t.nome} (inativo)` : t.nome }))}
                        onChange={(v) => setValue('time_id', v)}
                        avoidCollisions={false}
                      />
                      <FormSelect
                        label="Centro de custo"
                        value={watch('centro_custo_id') ?? ''}
                        placeholder={centrosCusto?.length ? 'Selecione...' : 'Nenhum centro de custo cadastrado'}
                        options={(centrosCusto as any[] | undefined ?? []).map(c => ({
                          value: c.id,
                          label: `${c.codigo ? `${c.codigo} ` : ''}${c.nome}${c.ativo === false ? ' (inativo)' : ''}`,
                        }))}
                        onChange={(v) => {
                          setValue('centro_custo_id', v);
                          setValue('centro_custo', (centrosCusto as any[] | undefined)?.find(c => c.id === v)?.nome);
                        }}
                        avoidCollisions={false}
                      />
                    </div>
                  </motion.div>

                  {/* Bloco 3 — Alocação. "Local de trabalho" grava FK + nome em
                      texto (mesmo padrão ID+texto de Cargo/Centro de custo).
                      "Unidade / Lotação principal" agora é um Select real:
                      opções vêm do catálogo /lotacoes (só ativas) e, ao
                      salvar, o vínculo é gravado em `colaborador_lotacoes`
                      (tabela de associação — nunca cria lotação nova aqui,
                      só referencia uma já cadastrada em Estrutura). */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 3 * 0.15, duration: 0.5 }}
                    className="space-y-3 pt-4 border-t border-border/20"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <MapPin className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium leading-tight">Alocação</h3>
                        <p className="text-xs text-muted-foreground leading-tight">Local físico e unidade de lotação principal do colaborador.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormSelect
                        label="Local de trabalho"
                        value={watch('local_trabalho_id') ?? ''}
                        placeholder={locais?.length ? 'Selecione...' : 'Nenhum local de trabalho cadastrado'}
                        options={(locais as any[] | undefined ?? []).map(l => ({
                          value: l.id,
                          label: l.ativo === false ? `${l.nome} (inativo)` : l.nome,
                        }))}
                        onChange={(v) => {
                          setValue('local_trabalho_id', v);
                          setValue('local_trabalho', (locais as any[] | undefined)?.find(l => l.id === v)?.nome);
                        }}
                        avoidCollisions={false}
                      />
                      <FormSelect
                        label="Unidade / Lotação principal"
                        value={watch('lotacao_principal_id') ?? ''}
                        placeholder={lotacoesCatalogo?.length ? 'Selecione...' : 'Nenhuma lotação cadastrada'}
                        options={(lotacoesCatalogo ?? []).map((l) => ({
                          value: l.id,
                          label: l.codigo ? `${l.codigo} ${l.nome}` : l.nome,
                        }))}
                        onChange={(v) => setValue('lotacao_principal_id', v)}
                        avoidCollisions={false}
                      />
                    </div>
                  </motion.div>

                  {/* Bloco 4 — Remuneração e Identificação. Matrícula Interna
                      passou a ser editada só aqui — a "Dados Gerais" mostra o
                      mesmo valor, mas sem input editável duplicado. */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 4 * 0.15, duration: 0.5 }}
                    className="space-y-3 pt-4 border-t border-border/20"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <DollarSign className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium leading-tight">Remuneração e Identificação</h3>
                        <p className="text-xs text-muted-foreground leading-tight">Informações salariais e identificadores internos da empresa.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium leading-none">Salário Base</label>
                        <CurrencyInput value={watch('salario_base')} onChange={(v) => setValue('salario_base', v)} showPrefix />
                        {errors.salario_base && <p className="text-xs text-destructive">{errors.salario_base.message}</p>}
                      </div>
                      <FormField
                        label="Matrícula Interna"
                        name="matricula"
                        value={watch('matricula')}
                        onChange={(e) => setValue('matricula', e.target.value)}
                        placeholder="Ex: 0001"
                      />
                    </div>
                  </motion.div>
                </CardContent>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 5 * 0.15, duration: 0.5 }}>
                  <StepFooter
                    activeIndex={activeIndex}
                    isLastStep={isLastStep}
                    isEditing={isEditing}
                    isSubmitting={mutation.isPending}
                    onVoltar={handleVoltarEtapa}
                    onRascunho={handleSalvarRascunho}
                    onProximo={handleProximaEtapa}
                  />
                </motion.div>
              </Card>
            </motion.div>
          </TabsContent>

          {/* TAB ENDEREÇO */}
          <TabsContent value="endereco">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
                <CardContent className="p-6 space-y-5">
                  {/* Header principal — mesmo tratamento das abas "Geral" e
                      "Profissional" (ícone circular + título/subtítulo à
                      esquerda, aviso informativo discreto à direita). */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0 * 0.15, duration: 0.5 }}
                    className="flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <MapPin className="h-4.5 w-4.5 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-display font-medium text-base leading-tight">Endereço Residencial</h2>
                        <p className="text-sm text-muted-foreground leading-tight">Local de moradia do colaborador para fins de benefícios e transporte</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 sm:w-[30%] shrink-0">
                      <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        Mantenha o endereço atualizado para garantir seus benefícios e facilitar o transporte.
                      </p>
                    </div>
                  </motion.div>

                  {/* Bloco de instrução do CEP */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 * 0.15, duration: 0.5 }}
                    className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3"
                  >
                    <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <Search className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight">Preencha o CEP para buscar automaticamente o endereço.</p>
                      <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                        Ao informar o CEP, os campos de logradouro, bairro, cidade e UF serão preenchidos automaticamente.
                      </p>
                    </div>
                  </motion.div>

                  {/* Linha do CEP */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2 * 0.15, duration: 0.5 }}
                    className="flex flex-col sm:flex-row sm:items-start gap-4"
                  >
                    <div className="w-full sm:w-64 space-y-2 shrink-0">
                      <label className="flex items-center gap-1.5 text-sm font-medium leading-none">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        CEP
                      </label>
                      <CEPInput value={watch('cep')} onAddressFound={handleAddressFound} buttonLabel="Buscar CEP" />
                    </div>

                    <div className="hidden sm:block w-px self-stretch bg-border/60 mt-6" />

                    <div className="pt-0 sm:pt-6">
                      <p className="text-xs text-muted-foreground leading-tight">Não sabe o CEP?</p>
                      <p className="text-xs leading-tight mt-0.5">
                        Consulte no{' '}
                        <a
                          href="https://buscacepinter.correios.com.br/app/endereco/index.php"
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary font-medium hover:underline"
                        >
                          site dos Correios
                        </a>
                        .
                      </p>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 3 * 0.15, duration: 0.5 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                  >
                    <div className="md:col-span-2">
                      <FormField
                        label={<span className="flex items-center gap-1.5"><Route className="h-3.5 w-3.5 text-muted-foreground" />Logradouro</span>}
                        {...register('logradouro')}
                        placeholder="Rua, Avenida, etc"
                      />
                    </div>
                    <FormField
                      label={<span className="flex items-center gap-1.5"><Hash className="h-3.5 w-3.5 text-muted-foreground" />Número</span>}
                      {...register('numero')}
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 4 * 0.15, duration: 0.5 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    <FormField
                      label={<span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-muted-foreground" />Bairro</span>}
                      {...register('bairro')}
                    />
                    <FormField
                      label={<span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-muted-foreground" />Complemento</span>}
                      {...register('complemento')}
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 5 * 0.15, duration: 0.5 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                  >
                    <div className="md:col-span-2">
                      <FormField
                        label={<span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />Cidade</span>}
                        {...register('cidade')}
                      />
                    </div>
                    <FormField
                      label={<span className="flex items-center gap-1.5"><MapIcon className="h-3.5 w-3.5 text-muted-foreground" />UF</span>}
                      {...register('uf')}
                    />
                  </motion.div>
                </CardContent>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 6 * 0.15, duration: 0.5 }}>
                  <StepFooter
                    activeIndex={activeIndex}
                    isLastStep={isLastStep}
                    isEditing={isEditing}
                    isSubmitting={mutation.isPending}
                    onVoltar={handleVoltarEtapa}
                    onRascunho={handleSalvarRascunho}
                    onProximo={handleProximaEtapa}
                  />
                </motion.div>
              </Card>
            </motion.div>
          </TabsContent>

          {/* TAB FINANCEIRO — PARTE 4E: única interface para dados bancários
              passou a ser `contas_bancarias` (aba reutilizada do Dossiê).
              Colaborador novo ainda não tem `id`, então não há como criar uma
              conta bancária ainda (contas_bancarias.colaborador_id é NOT
              NULL) — o cadastro bancário só fica disponível depois de salvar.

              PREVIEW TEMPORÁRIO (remover antes de commitar): com colaborador
              novo, renderiza ContasBancariasTab com colaboradorId="mock-1"
              (dados fictícios via VITE_COLABORADORES_MOCK, já habilitado no
              .env.local) só para visualizar o layout da tabela preenchida
              nesta mesma tela. O placeholder original ("Salve o colaborador
              primeiro...") fica comentado logo abaixo para restaurar depois. */}
          <TabsContent value="bancario">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              {isEditing ? (
                <ContasBancariasTab colaboradorId={id!} />
              ) : (
                <ContasBancariasTab colaboradorId="mock-1" />
                /* Estado real de "colaborador novo" (sem id ainda):
                <Card className="border border-dashed border-border/50 rounded-2xl overflow-hidden">
                  <CardHeader>
                    <CardTitle className="font-display flex items-center gap-2">
                      <Landmark className="h-5 w-5 text-muted-foreground" />
                      Dados Bancários para Pagamento
                    </CardTitle>
                    <CardDescription>
                      Salve o colaborador primeiro — a conta bancária poderá ser cadastrada logo em seguida, nesta mesma aba.
                    </CardDescription>
                  </CardHeader>
                </Card>
                */
              )}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 5 * 0.15, duration: 0.5 }}>
                <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
                  <StepFooter
                    activeIndex={activeIndex}
                    isLastStep={isLastStep}
                    isEditing={isEditing}
                    isSubmitting={mutation.isPending}
                    onVoltar={handleVoltarEtapa}
                    onRascunho={handleSalvarRascunho}
                    onProximo={handleProximaEtapa}
                  />
                </Card>
              </motion.div>
            </motion.div>
          </TabsContent>

          {/* TAB DOCUMENTOS */}
          <TabsContent value="documentos">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
                <CardContent className="p-6 space-y-5">
                  {/* Header — ícone + título/subtítulo à esquerda, status eSocial à direita */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0 * 0.15, duration: 0.5 }}
                    className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-5 border-b border-border/20"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="h-4.5 w-4.5 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-display font-medium text-base leading-tight">Documentação</h2>
                        <p className="text-sm text-muted-foreground leading-tight">Dados cadastrais e trabalhistas do colaborador</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
                        <FileText className="h-3 w-3" /> eSocial
                      </Badge>
                      <Badge variant="warning" size="sm" className="gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-warning shrink-0" /> Documentação obrigatória
                      </Badge>
                    </div>
                  </motion.div>

                  {/* Seção 1 — Identificação civil */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 * 0.15, duration: 0.5 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <IdCard className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <h3 className="text-sm font-medium leading-tight">Identificação civil</h3>
                        <p className="text-xs text-muted-foreground leading-tight">Dados do documento de identificação do colaborador.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <FormField label="RG / Identidade" {...register('rg')} />
                      <FormField label="Órgão Emissor" {...register('rg_orgao_emissor')} placeholder="Ex: SSP/SP" />
                      <FormSelect
                        label="UF de emissão"
                        value={watch('rg_uf')}
                        options={UFS_BRASIL}
                        onChange={(v) => setValue('rg_uf', v)}
                      />
                      <FormField
                        label="Data de emissão"
                        type="date"
                        name="rg_data_emissao"
                        value={watch('rg_data_emissao')}
                        onChange={(e) => setValue('rg_data_emissao', e.target.value)}
                        error={errors.rg_data_emissao?.message}
                      />
                      <FormField
                        label="Data de validade"
                        type="date"
                        name="rg_data_validade"
                        value={watch('rg_data_validade')}
                        onChange={(e) => setValue('rg_data_validade', e.target.value)}
                        error={errors.rg_data_validade?.message}
                        description="Opcional"
                      />
                    </div>
                  </motion.div>

                  {/* Seção 2 — Dados trabalhistas */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2 * 0.15, duration: 0.5 }}
                    className="space-y-3 pt-4 border-t border-border/20"
                  >
                    <div className="flex items-center gap-2.5">
                      <Briefcase className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <h3 className="text-sm font-medium leading-tight">Dados trabalhistas</h3>
                        <p className="text-xs text-muted-foreground leading-tight">Informações para registro trabalhista e previdenciário.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <FormField label="PIS/PASEP" {...register('pis_pasep')} />
                      <FormField label="CTPS Número" {...register('ctps_numero')} />
                      <FormField label="CTPS Série" {...register('ctps_serie')} />
                      <FormSelect
                        label="CTPS UF"
                        value={watch('ctps_uf')}
                        options={UFS_BRASIL}
                        onChange={(v) => setValue('ctps_uf', v)}
                      />
                    </div>
                  </motion.div>

                  {/* Banner — arquivos digitalizados ficam no dossiê (Gestão de
                      Documentos Digitais), não neste formulário de cadastro.
                      Só aparece em edição: cadastro novo ainda não tem
                      colaborador_id para o dossiê existir. */}
                  {isEditing && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 3 * 0.15, duration: 0.5 }}
                      className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5"
                    >
                      <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                      <p className="text-xs text-muted-foreground flex-1">
                        Os arquivos digitalizados são gerenciados na área Gestão de Documentos Digitais.
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate(`/colaboradores/${id}?tab=documentos`)}
                        className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1 shrink-0"
                      >
                        Ver documentos digitais <ArrowRight className="h-3 w-3" />
                      </button>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </PageLayout>
    </>
  );
}
