import { createRoot } from 'react-dom/client';
import '../src/index.css';
import { AgendaSemanal } from '../src/components/treinamentos/AgendaSemanal';
import { CalendarioTurmasDialog } from '../src/components/treinamentos/CalendarioTurmasDialog';
import { montarTurmas, type CursoTurma } from '../src/components/treinamentos/turmasDerivacoes';

/** Harness TEMPORÁRIO de auditoria — não faz parte do produto. */
const CURSOS: CursoTurma[] = [
  { id: 'c1', nome: 'NR-17 Ergonomia', categoria: 'Segurança do Trabalho', modalidade: 'presencial', carga_horaria: 4 },
  { id: 'c2', nome: 'Liderança e Gestão de Equipes', categoria: 'Liderança', modalidade: 'hibrido', carga_horaria: 12 },
  {
    id: 'c3',
    nome: 'Treinamento de Segurança do Trabalho para Operações de Alta Complexidade',
    categoria: 'Segurança do Trabalho',
    modalidade: 'presencial',
    carga_horaria: 8,
  },
  { id: 'c4', nome: 'Comunicação Assertiva', categoria: 'Desenvolvimento Pessoal', modalidade: 'online', carga_horaria: 6 },
  { id: 'c5', nome: 'Integração e Cultura Organizacional', categoria: 'Onboarding', modalidade: 'online', carga_horaria: 8 },
];

const TURMAS = montarTurmas(
  [
    { id: 'a', curso_id: 'c1', data_inicio: '2026-09-15T09:00:00Z', local_link: 'Sala 01', status: 'planejado' },
    { id: 'b', curso_id: 'c2', data_inicio: '2026-09-15T11:00:00Z', local_link: 'Sala 02', status: 'em_curso' },
    { id: 'c', curso_id: 'c3', data_inicio: '2026-09-15T11:00:00Z', local_link: 'Sala 03', status: 'planejado' },
    { id: 'd', curso_id: 'c4', data_inicio: '2026-09-15T13:00:00Z', local_link: 'Microsoft Teams', status: 'concluido' },
    { id: 'e', curso_id: 'c5', data_inicio: '2026-09-15T15:00:00Z', local_link: 'Microsoft Teams', status: 'planejado' },
  ],
  CURSOS,
  [],
  new Date(2026, 8, 20)
);

const modo = new URLSearchParams(window.location.search).get('modo') ?? 'agenda';
const raiz = createRoot(document.getElementById('root')!);

if (modo === 'calendario') {
  raiz.render(
    <CalendarioTurmasDialog
      open
      onOpenChange={() => undefined}
      mesInicial={new Date(2026, 8, 14)}
      turmas={TURMAS}
      onAbrirTurma={() => undefined}
    />
  );
} else {
  raiz.render(
    <div className="flex min-h-screen items-start justify-center bg-background p-6">
      <div className="flex h-[560px] w-[300px]">
        <AgendaSemanal
          turmas={TURMAS}
          semanaInicial={new Date(2026, 8, 14)}
          onAbrir={() => undefined}
          onVerCalendarioCompleto={() => undefined}
        />
      </div>
    </div>
  );
}
