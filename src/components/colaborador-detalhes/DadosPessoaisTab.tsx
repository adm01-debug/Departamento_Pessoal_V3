import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  IdCard, MapPin, Users, Phone, Accessibility, Globe, FileText,
  Edit,
} from 'lucide-react';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { useEmpresas } from '@/hooks/useEmpresas';
import {
  useDependentes, useContatosEmergencia, useDeficiencia,
  useDadosEstrangeiro, useCamposCustomizados,
} from '@/hooks/useColaboradorDetalhes';
import { formatCPF } from '@/utils/format';
import { CampoInfo } from './CampoInfo';
import { DependentesTab } from './DependentesTab';
import { EmergenciaTab } from './EmergenciaTab';
import { PCDTab } from './PCDTab';
import { EstrangeiroTab } from './EstrangeiroTab';
import { CamposCustomizadosTab } from './CamposCustomizadosTab';

const MotionCard = motion.create(Card);

const ESTADO_CIVIL_LABEL: Record<string, string> = {
  solteiro: 'Solteiro(a)',
  casado: 'Casado(a)',
  divorciado: 'Divorciado(a)',
  viuvo: 'Viúvo(a)',
  separado: 'Separado(a)',
  uniao_estavel: 'União Estável',
};

function formatarData(dataISO?: string | null): string | undefined {
  if (!dataISO) return undefined;
  const data = new Date(`${dataISO}T00:00:00`);
  if (Number.isNaN(data.getTime())) return undefined;
  return data.toLocaleDateString('pt-BR');
}

function plural(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}

const MotionButton = motion.create('button');

/** Card de resumo no topo do dashboard — ícone à esquerda (verde success,
 * mesmo tom do badge "Ativo"), título/subtítulo à esquerda (sem cortar com
 * "..."), tudo centralizado verticalmente. Clicável, rola até o bloco
 * correspondente na grade. Mesma animação de ENTRADA (fade+slide, staggered
 * por `index`) dos KPIs do dashboard — ver `cardVariants` em MetricCard.tsx.
 * Sem animação de hover (só a entrada). */
function CardResumo({
  icon: Icon, titulo, subtitulo, onClick, index,
}: {
  icon: React.ComponentType<{ className?: string }>;
  titulo: string;
  subtitulo: string;
  onClick: () => void;
  index: number;
}) {
  return (
    <MotionButton
      type="button"
      onClick={onClick}
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="flex items-center justify-between gap-2 rounded-2xl border border-border/30 bg-card shadow-card px-4 py-3 hover:border-primary/30 hover:bg-muted/10 transition-colors text-left w-full"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-9 w-9 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold leading-tight break-words">{titulo}</p>
          <p className="text-[11px] text-muted-foreground leading-tight break-words">{subtitulo}</p>
        </div>
      </div>
    </MotionButton>
  );
}

/** Cabeçalho padrão dos cards de informação somente-leitura (Identificação
 * Pessoal / Contato e Endereço) — ícone + título à esquerda, "Editar"
 * outline (sem fundo sólido) à direita levando pro formulário completo do
 * colaborador. 24px de respiro abaixo, antes da grade de campos. */
function CabecalhoCard({
  icon: Icon, titulo, colaboradorId,
}: {
  icon: React.ComponentType<{ className?: string }>;
  titulo: string;
  colaboradorId: string;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2 font-display font-medium text-sm">
        <Icon className="h-4.5 w-4.5 text-primary" /> {titulo}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-7 px-3 text-[11px] rounded-xl border-primary/40 bg-transparent text-primary hover:bg-primary/5 hover:text-primary"
        onClick={() => navigate(`/colaboradores/editar/${colaboradorId}`)}
      >
        <Edit className="h-3 w-3 mr-1" /> Editar
      </Button>
    </div>
  );
}

/**
 * Dashboard de "Dados Pessoais" — substitui a antiga navegação em abas
 * (Dependentes / Contatos de Emergência / PCD / Estrangeiro / Campos
 * Customizados) por uma grade de cards, com uma linha de resumo no topo.
 *
 * Os 6 cards da grade principal são filhos DIRETOS de um único
 * `grid-cols-2` (sem wrapper de coluna por fora) — é o que garante que a
 * altura de cada linha se ajuste ao próprio conteúdo e os cards fiquem
 * perfeitamente alinhados lado a lado, mesmo quando "Identificação
 * Pessoal" e "Contato e Endereço" têm alturas diferentes.
 *
 * `colaborador` é o registro cru (tipado `any` na página de detalhes),
 * já que os campos de identificação/endereço não fazem parte da interface
 * `Colaborador` enxuta em `types/entities.ts`.
 */
export function DadosPessoaisTab({ colaboradorId, colaborador }: { colaboradorId: string; colaborador: any }) {
  const { empresaAtual } = useEmpresas();

  const { data: dependentes } = useDependentes(colaboradorId);
  const { data: contatos } = useContatosEmergencia(colaboradorId);
  const { data: pcd } = useDeficiencia(colaboradorId);
  const { data: estrangeiro } = useDadosEstrangeiro(colaboradorId);
  const { data: campos = [] } = useCamposCustomizados(empresaAtual?.id) as { data: unknown[] };

  const refDependentes = useRef<HTMLDivElement>(null);
  const refEmergencia = useRef<HTMLDivElement>(null);
  const refPcdEstrangeiro = useRef<HTMLDivElement>(null);
  const refCustomizados = useRef<HTMLDivElement>(null);

  // Estado de edição compartilhado entre PCDTab e EstrangeiroTab (bare) —
  // um único botão "Editar" no cabeçalho do card combinado abre os dois
  // formulários juntos, em vez de cada seção ter seu próprio botão.
  const [pcdEstrangeiroEditing, setPcdEstrangeiroEditing] = useState(false);

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const nDependentes = dependentes?.length ?? 0;
  const nContatos = contatos?.length ?? 0;
  const nCampos = campos.length;

  return (
    <div>
      {/* Cards de resumo — 5 por linha no desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        <CardResumo
          icon={Users}
          titulo="Dependentes"
          subtitulo={nDependentes ? `${nDependentes} ${plural(nDependentes, 'cadastrado', 'cadastrados')}` : 'Nenhum cadastrado'}
          onClick={() => scrollTo(refDependentes)}
          index={0}
        />
        <CardResumo
          icon={Phone}
          titulo="Contatos de emergência"
          subtitulo={nContatos ? `${nContatos} ${plural(nContatos, 'cadastrado', 'cadastrados')}` : 'Nenhum cadastrado'}
          onClick={() => scrollTo(refEmergencia)}
          index={1}
        />
        <CardResumo
          icon={Accessibility}
          titulo="PCD"
          subtitulo={pcd ? 'Cadastrado' : 'Não se aplica'}
          onClick={() => scrollTo(refPcdEstrangeiro)}
          index={2}
        />
        <CardResumo
          icon={Globe}
          titulo="Estrangeiro"
          subtitulo={estrangeiro ? 'Cadastrado' : 'Não se aplica'}
          onClick={() => scrollTo(refPcdEstrangeiro)}
          index={3}
        />
        <CardResumo
          icon={FileText}
          titulo="Campos customizados"
          subtitulo={nCampos ? `${nCampos} ${plural(nCampos, 'campo', 'campos')}` : 'Nenhum configurado'}
          onClick={() => scrollTo(refCustomizados)}
          index={4}
        />
      </div>

      {/* Grade principal — 2 colunas (1 no mobile). Os 4 cards são filhos
          diretos, sem wrapper de coluna, para o grid alinhar cada linha
          pela própria altura (items-start). `min-w-0` em cada filho direto
          é essencial: sem ele, o `white-space: nowrap` usado nos valores
          (CampoInfo, células de tabela) infla o min-content do item e faz
          uma coluna do grid ficar mais larga que a outra (grid blowout). */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <MotionCard custom={5} initial="hidden" animate="visible" variants={cardVariants} className="w-full min-w-0 self-start flex flex-col border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
          <CardContent className="flex flex-col justify-start pt-4 px-5 pb-5">
            <CabecalhoCard icon={IdCard} titulo="Identificação Pessoal" colaboradorId={colaboradorId} />
            <div className="grid grid-cols-3 gap-x-5 gap-y-2">
              <CampoInfo compact label="Nome completo" valor={colaborador?.nome_completo} />
              <CampoInfo compact label="Nome social" valor={colaborador?.nome_social} />
              <CampoInfo compact label="CPF" valor={colaborador?.cpf ? formatCPF(colaborador.cpf) : undefined} />
            </div>
            <div className="grid grid-cols-3 gap-x-5 gap-y-2 mt-3 pt-3 border-t-2 border-border/40">
              <CampoInfo compact label="RG" valor={colaborador?.rg} />
              <CampoInfo compact label="Data de nascimento" valor={formatarData(colaborador?.data_nascimento)} />
              <CampoInfo compact label="Estado civil" valor={colaborador?.estado_civil ? (ESTADO_CIVIL_LABEL[colaborador.estado_civil] ?? colaborador.estado_civil) : undefined} />
            </div>
          </CardContent>
        </MotionCard>

        <MotionCard custom={6} initial="hidden" animate="visible" variants={cardVariants} className="w-full min-w-0 self-start flex flex-col border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
          <CardContent className="flex flex-col justify-start pt-4 px-5 pb-5">
            <CabecalhoCard icon={MapPin} titulo="Contato e Endereço" colaboradorId={colaboradorId} />
            <div className="grid grid-cols-3 gap-x-5 gap-y-2">
              <CampoInfo compact label="E-mail pessoal" valor={colaborador?.email_pessoal} />
              <CampoInfo compact label="Telefone" valor={colaborador?.telefone} />
              <CampoInfo compact label="Celular" valor={colaborador?.celular} />
            </div>
            <div className="grid grid-cols-4 gap-x-5 gap-y-2 mt-3 pt-3 border-t-2 border-border/40">
              <CampoInfo compact label="CEP" valor={colaborador?.cep} />
              <CampoInfo compact label="Endereço" valor={colaborador?.logradouro} />
              <CampoInfo compact label="Número" valor={colaborador?.numero} />
              <CampoInfo compact label="Complemento" valor={colaborador?.complemento} />
            </div>
          </CardContent>
        </MotionCard>

        <div ref={refDependentes} className="w-full min-w-0 self-stretch">
          <DependentesTab colaboradorId={colaboradorId} index={7} />
        </div>

        <div ref={refEmergencia} className="w-full min-w-0 self-stretch">
          <EmergenciaTab colaboradorId={colaboradorId} index={8} />
        </div>
      </div>

      {/* Segunda grade — proporção 7fr/3fr (em vez de 1fr/1fr): "PCD e
          Estrangeiro" precisa de mais largura pra caber as duas seções
          lado a lado, "Campos Customizados" fica bem mais estreito.
          `items-stretch` (em vez de `items-start`) + `h-full` nos dois
          wrappers e nos dois `Card` faz as duas caixas terminarem na mesma
          altura, a maior das duas — igual às demais linhas da página. */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] gap-5 items-stretch mt-5">
        <div ref={refPcdEstrangeiro} className="w-full min-w-0 h-full">
          <MotionCard variant="elevated" custom={9} initial="hidden" animate="visible" variants={cardVariants} className="w-full h-full flex flex-col">
            <CardContent className="flex flex-col justify-start pt-4 px-5 pb-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 font-display font-medium text-sm">
                  <Accessibility className="h-4.5 w-4.5 text-primary" /> PCD e Estrangeiro
                </div>
                {!pcdEstrangeiroEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-3 text-[11px] rounded-xl border-primary/40 bg-transparent text-primary hover:bg-primary/5 hover:text-primary"
                    onClick={() => setPcdEstrangeiroEditing(true)}
                  >
                    <Edit className="h-3 w-3 mr-1" /> Editar
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="min-w-0 rounded-xl border border-border/20 bg-background/40 p-3">
                  <PCDTab colaboradorId={colaboradorId} bare editing={pcdEstrangeiroEditing} onEditingChange={setPcdEstrangeiroEditing} />
                </div>
                <div className="min-w-0 rounded-xl border border-border/20 bg-background/40 p-3">
                  <EstrangeiroTab colaboradorId={colaboradorId} bare editing={pcdEstrangeiroEditing} onEditingChange={setPcdEstrangeiroEditing} />
                </div>
              </div>
            </CardContent>
          </MotionCard>
        </div>

        <div ref={refCustomizados} className="w-full min-w-0 h-full">
          <CamposCustomizadosTab colaboradorId={colaboradorId} index={10} />
        </div>
      </div>
    </div>
  );
}
