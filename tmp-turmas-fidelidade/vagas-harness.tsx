/**
 * TEMPORÁRIO — harness isolado da área Vagas (apenas VALIDAÇÃO VISUAL).
 * Renderiza o `VagasPainel` real com fixtures locais, sem auth/Supabase, para
 * comparar os três filtros pill com a referência do Hub de Premiações.
 * A rota /recrutamento está indisponível nesta árvore por um arquivo local
 * incompleto FORA deste escopo (PipelineBoard.tsx).
 */
import ReactDOM from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import { EntradaPresenca } from '@/components/ui/entrada-cards';
import { VagasPainel } from '@/components/recrutamento/VagasPainel';
import type { CandidaturaComRelacoes, VagaRow } from '@/types/recrutamento';
import '@/index.css';

const BASE: VagaRow = {
  id: 'vaga-1',
  empresa_id: 'empresa-1',
  titulo: 'Vaga',
  cargo: 'Cargo',
  departamento: 'Tecnologia',
  modalidade: 'Remoto',
  tipo_contrato: 'CLT',
  descricao: null,
  requisitos: null,
  status: 'aberta',
  quantidade: 1,
  faixa_salarial_min: null,
  faixa_salarial_max: null,
  data_abertura: '2026-09-01',
  data_encerramento: null,
  beneficios_oferecidos: null,
  responsavel_id: null,
  created_at: '2026-09-01T12:00:00Z',
  updated_at: '2026-09-01T12:00:00Z',
};

const VAGAS: VagaRow[] = [
  {
    ...BASE,
    id: 'v1',
    titulo: 'Analista de Dados',
    cargo: 'Analista de Dados',
    departamento: 'Tecnologia',
    requisitos: 'SQL, Power BI, Python, Estatística',
  },
  {
    ...BASE,
    id: 'v2',
    titulo: 'Analista de RH Pleno',
    cargo: 'Analista de RH',
    departamento: 'Recursos Humanos',
    requisitos: 'Recrutamento, People Analytics, Excel avançado, Cultura',
  },
  {
    ...BASE,
    id: 'v3',
    titulo: 'Desenvolvedor(a) Full Stack Sênior',
    cargo: 'Desenvolvedor Full Stack',
    departamento: 'Tecnologia',
    modalidade: 'Híbrido',
    requisitos: 'React, TypeScript, Node.js, GraphQL, AWS',
  },
  {
    ...BASE,
    id: 'v4',
    titulo: 'Assistente Administrativo',
    cargo: 'Assistente',
    departamento: 'Administrativo',
    requisitos: 'SQL, Excel, Organização, Comunicação, Rotinas',
  },
  {
    ...BASE,
    id: 'v5',
    titulo: 'Vaga encerrada',
    status: 'fechada',
    data_encerramento: '2026-09-10',
    departamento: 'Comercial',
    requisitos: 'CRM, Negociação, Metas, Prospecção',
  },
];

const CANDIDATURAS: CandidaturaComRelacoes[] = [];

ReactDOM.createRoot(document.getElementById('root')!).render(
  <MotionConfig reducedMotion="never">
    <div className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto max-w-[1600px]">
        <EntradaPresenca>
          <VagasPainel
            vagas={VAGAS}
            candidaturas={CANDIDATURAS}
            onGerenciar={() => undefined}
            onVerAnalises={() => undefined}
            onExcluir={() => undefined}
          />
        </EntradaPresenca>
      </div>
    </div>
  </MotionConfig>
);
