import { PageTitle } from '@/components/PageTitle';
import { PageLayout } from '@/components/layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserCircle, DollarSign, FileText, Edit, ShieldCheck } from 'lucide-react';
import { PortalRegimentoCard } from '@/components/portal/PortalRegimentoCard';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { registrarAcessoPII } from '@/services/piiAccessLogService';
import { format } from 'date-fns';
import { useState } from 'react';
import { PortalOverviewTab } from '@/components/portal/PortalOverviewTab';
import { PortalFinanceiroTab } from '@/components/portal/PortalFinanceiroTab';
import { PortalDocumentosTab } from '@/components/portal/PortalDocumentosTab';
import { PortalMeusDadosTab } from '@/components/portal/PortalMeusDadosTab';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useColaboradorVinculo } from '@/hooks/useColaboradorVinculo';

/**
 * Carrega o painel do colaborador SEMPRE ancorado em três eixos:
 * `auth.uid()` (o que é do login), `colaboradores.id` (o que é do cadastro
 * trabalhista) e `empresa_id` (o tenant ativo).
 *
 * Por que isso importa: a versão anterior lia `folhas_pagamento` — que é o
 * agregado da FOLHA DA EMPRESA, não o contracheque da pessoa — e listava
 * férias/ponto/benefícios sem nenhum predicado de colaborador. O resultado era
 * exibir totais de terceiros para quem abrisse o portal, dependendo apenas do
 * RLS para não vazar. Holerite individual vive em `holerites`, com a
 * competência vindo da folha pai via FK canônica.
 */
function usePortalCompleto(userId: string | undefined, colaboradorId: string | null, empresaId: string | undefined) {
  return useQuery({
    queryKey: ['portal-completo', userId, colaboradorId, empresaId],
    enabled: !!userId,
    staleTime: 3 * 60 * 1000,
    queryFn: async () => {
      const hoje = format(new Date(), 'yyyy-MM-dd');
      const db = supabase as any;

      // Consultas que dependem apenas do login.
      const basePromises = [
        db.from('profiles').select('*').eq('user_id', userId!).maybeSingle(),
        db
          .from('notificacoes')
          .select('id, titulo, mensagem, lida, created_at, tipo')
          .eq('user_id', userId!)
          .eq('lida', false)
          .order('created_at', { ascending: false })
          .limit(8),
      ] as const;

      // Consultas que exigem o cadastro trabalhista resolvido. Sem ele, a
      // resposta correta é vazio — nunca "os dados de alguém da empresa".
      const colabPromises = colaboradorId
        ? [
            db
              .from('registros_ponto')
              .select('entrada_1, saida_1, entrada_2, saida_2, horas_trabalhadas, horas_extras, atraso_minutos')
              .eq('colaborador_id', colaboradorId)
              .eq('data', hoje)
              .limit(1)
              .maybeSingle(),
            db
              .from('ferias')
              .select('data_inicio, data_fim, status, dias_total')
              .eq('colaborador_id', colaboradorId)
              .in('status', ['pendente', 'aprovada'])
              .order('data_inicio', { ascending: true })
              .limit(5),
            db
              .from('holerites')
              .select(
                'liquido, total_proventos, created_at, folha:folhas_pagamento!holerites_folha_id_fkey(competencia)'
              )
              .eq('colaborador_id', colaboradorId)
              .order('created_at', { ascending: false })
              .limit(3),
            db
              .from('beneficios')
              .select('nome, tipo, valor, status')
              .eq('colaborador_id', colaboradorId)
              .eq('ativo', true)
              .limit(6),
          ]
        : [];

      const comunicadosPromise = empresaId
        ? db
            .from('comunicados')
            .select('id, titulo, tipo, created_at')
            .eq('empresa_id', empresaId)
            .eq('ativo', true)
            .order('created_at', { ascending: false })
            .limit(5)
        : Promise.resolve({ data: [] });

      const [base, colab, comunicadosRes] = await Promise.all([
        Promise.all(basePromises),
        Promise.all(colabPromises),
        comunicadosPromise,
      ]);

      const [{ data: profile }, { data: notificacoes }] = base;
      const [pontoRes, feriasRes, holeritesRes, beneficiosRes] = colab as any[];

      // E-036 (LGPD art.37): trilha de leitura do próprio holerite
      if (Array.isArray(holeritesRes?.data) && holeritesRes.data.length > 0) {
        void registrarAcessoPII('holerites', 'select', {
          empresaId,
          registroId: colaboradorId,
          registroCount: holeritesRes.data.length,
        });
      }

      // Normaliza o holerite para o formato consumido pela aba financeira,
      // que espera `competencia`/`total_liquido`.
      const holerites = ((holeritesRes?.data as any[]) || []).map((h) => ({
        competencia: h.folha?.competencia ?? '—',
        total_liquido: h.liquido,
        total_proventos: h.total_proventos,
      }));

      return {
        profile,
        notificacoes: notificacoes || [],
        pontoHoje: pontoRes?.data ?? null,
        feriasPendentes: feriasRes?.data || [],
        holerites,
        beneficios: beneficiosRes?.data || [],
        comunicados: comunicadosRes?.data || [],
      };
    },
  });
}

export default function PortalPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { empresaAtual } = useEmpresas();
  // id do CADASTRO trabalhista — não confundir com profiles.id (FK aponta para colaboradores).
  const { colaboradorId } = useColaboradorVinculo();
  const { data } = usePortalCompleto(user?.id, colaboradorId, empresaAtual?.id);
  const [tab, setTab] = useState('visao-geral');

  const nome = data?.profile?.nome || user?.name || user?.email?.split('@')[0] || 'Colaborador';
  const hoje = new Date();
  const saudacao = hoje.getHours() < 12 ? 'Bom dia' : hoje.getHours() < 18 ? 'Boa tarde' : 'Boa noite';

  const completude = (() => {
    if (!data?.profile) return 0;
    const campos = ['nome', 'telefone', 'cargo', 'departamento'];
    return Math.round((campos.filter((c) => (data.profile as any)?.[c]).length / campos.length) * 100);
  })();

  return (
    <>
      <PageTitle title="Portal" description="Portal do colaborador" />
      <PageLayout
        title="Meu Portal"
        description={`${saudacao}, ${nome}!`}
        icon={<UserCircle className="h-5 w-5 text-primary-foreground" />}
        gradient="from-success to-primary"
      >
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="visao-geral">
              <UserCircle className="mr-1 h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="financeiro">
              <DollarSign className="mr-1 h-4 w-4" />
              Financeiro
            </TabsTrigger>
            <TabsTrigger value="documentos">
              <FileText className="mr-1 h-4 w-4" />
              Documentos
            </TabsTrigger>
            <TabsTrigger value="meus-dados">
              <Edit className="mr-1 h-4 w-4" />
              Meus Dados
            </TabsTrigger>
            <TabsTrigger value="regimento">
              <ShieldCheck className="mr-1 h-4 w-4" />
              Regimento SST
            </TabsTrigger>
          </TabsList>
          <TabsContent value="visao-geral">
            <PortalOverviewTab nome={nome} data={data} completude={completude} navigate={navigate} />
          </TabsContent>
          <TabsContent value="financeiro">
            <PortalFinanceiroTab holerites={data?.holerites || []} beneficios={data?.beneficios || []} />
          </TabsContent>
          <TabsContent value="documentos">
            <PortalDocumentosTab
              navigate={navigate}
              colaboradorId={colaboradorId ?? undefined}
              empresaId={empresaAtual?.id}
            />
          </TabsContent>
          <TabsContent value="meus-dados">
            <PortalMeusDadosTab
              nome={nome}
              email={user?.email || ''}
              profile={data?.profile}
              userId={user?.id || ''}
              navigate={navigate}
            />
          </TabsContent>
          <TabsContent value="regimento">
            <PortalRegimentoCard />
          </TabsContent>
        </Tabs>
      </PageLayout>
    </>
  );
}
