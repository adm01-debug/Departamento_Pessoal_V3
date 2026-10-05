import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mesma convenção de `OnboardingPageContent.test.tsx`: o componente reaproveita
// `cardVariants` de `MetricCard` (que avalia `motion.create(Card)` já na CARGA)
// — sem o `create` aqui o import quebra.
vi.mock('framer-motion', () => {
  // Props de ANIMAÇÃO do Framer Motion (não existem no DOM) — descartadas no
  // mock; todo o resto (className, data-*, onClick) passa adiante.
  const MOTION_PROPS = new Set([
    'custom',
    'variants',
    'initial',
    'animate',
    'exit',
    'whileHover',
    'whileTap',
    'transition',
  ]);
  const semMotion = (props: any) => {
    const out: any = {};
    for (const [k, v] of Object.entries(props)) if (!MOTION_PROPS.has(k)) out[k] = v;
    return out;
  };
  return {
    motion: {
      create:
        (Component: any) =>
        ({ children, ...rest }: any) => <Component {...rest}>{children}</Component>,
      div: ({ children }: any) => <div>{children}</div>,
      span: ({ children }: any) => <span>{children}</span>,
      // As linhas da trilha são `motion.tr` (cascata de entrada).
      tr: ({ children, ...rest }: any) => <tr {...semMotion(rest)}>{children}</tr>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
    useInView: () => true,
    useReducedMotion: () => false,
  };
});

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// `useNavigate` só é usado nos atalhos para os logs globais.
const { navigateMock, getMockAuditoriaMock, MOCK_EVENTOS } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  getMockAuditoriaMock: vi.fn(),
  MOCK_EVENTOS: [
    {
      id: 'aud-1',
      data_hora: '2026-12-31T12:00:00.000Z',
      candidato: 'Ana Silva Santos',
      cargo: 'Analista de Marketing',
      departamento: 'Marketing',
      acao: 'Transmissão do evento S-2200',
      etapa: 'esocial',
      evento_esocial: 'S-2200',
      protocolo: '1.2.345.678',
      status: 'sucesso',
      responsavel: 'Renata Alves',
      responsavel_cargo: 'Especialista em eSocial',
      detalhe: 'Admissão transmitida ao eSocial com recibo de protocolo.',
    },
    {
      id: 'aud-2',
      data_hora: '2026-12-30T12:00:00.000Z',
      candidato: 'Pedro Almeida Souza',
      cargo: 'Analista de TI',
      departamento: 'TI',
      acao: 'Admissão cancelada',
      etapa: 'cancelada',
      evento_esocial: null,
      protocolo: null,
      status: 'falha',
      responsavel: 'Bruno Cardoso',
      responsavel_cargo: 'Gestor de RH',
      detalhe: 'Processo encerrado sem contratação — vaga reaberta.',
    },
    {
      id: 'aud-3',
      data_hora: '2026-08-03T12:00:00.000Z',
      candidato: 'Aline Cristina Duarte',
      cargo: 'Analista Contábil',
      departamento: 'Contabilidade',
      acao: 'Pendência documental identificada',
      etapa: 'pendente',
      evento_esocial: null,
      protocolo: null,
      status: 'pendente',
      responsavel: 'Renata Alves',
      responsavel_cargo: 'Especialista em eSocial',
      detalhe: 'Aguardando comprovante de residência atualizado',
    },
    {
      id: 'aud-4',
      data_hora: '2026-07-01T12:00:00.000Z',
      candidato: 'Sabrina Correia Melo',
      cargo: 'Analista de Treinamento',
      departamento: 'RH',
      acao: 'Documentos validados pelo RH',
      etapa: 'validacao',
      evento_esocial: null,
      protocolo: null,
      status: 'sucesso',
      responsavel: 'Elaine Prado',
      responsavel_cargo: 'Gestora de Departamento Pessoal',
      detalhe: 'Documentos pessoais e comprovante de endereço conferidos.',
    },
  ] as any[],
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }));

vi.mock('@/mocks/admissoesMock', () => ({
  isAdmissoesMockEnabled: () => true,
  getMockAuditoria: getMockAuditoriaMock,
}));

// Selects viram `<select>` nativos: dá para disparar o filtro como o usuário
// faria (o Radix só monta as opções quando abre, o que em jsdom não ajuda).
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <select value={value} onChange={(e) => onValueChange?.(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ type, ...rest }: any) => <input type={type} {...rest} />,
}));

// Tooltips e dropdowns fechados: só o gatilho existe (o conteúdo é portal).
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
  TooltipContent: () => null,
  TooltipProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <>{children}</>,
  DropdownMenuTrigger: ({ children }: any) => <>{children}</>,
  DropdownMenuContent: () => null,
  DropdownMenuItem: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSeparator: () => null,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h3>{children}</h3>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

import AuditoriaAdmissoesContent from '../admissoes/AuditoriaAdmissoesContent';
import { formatarDataHora } from '../admissoes/auditoriaDerivacoes';

/** Título do bloco principal (o mesmo da referência aprovada). */
const TITULO_BLOCO = 'Histórico de Auditoria – Admissões';

/** Localiza um `<select>` pela opção-sentinela que ele contém. */
function selectPorOpcao(textoOpcao: string): HTMLSelectElement {
  const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
  const alvo = selects.find((s) => Array.from(s.options).some((o) => o.textContent === textoOpcao));
  if (!alvo) throw new Error(`select com a opção "${textoOpcao}" não encontrado`);
  return alvo;
}

/** Nomes acessíveis dos 8 chips rápidos, na ordem da faixa (com a contagem). */
const NOMES_DOS_CHIPS = [
  'Todos(4)',
  'Sucesso(2)',
  'Pendente(1)',
  'Falha(1)',
  'eSocial(1)',
  'Docs Pendentes(0)',
  'Contrato(0)',
  'Em Validação(1)',
];

/** O chip está com o destaque lime? (a mesma classe dos botões primários) */
function chipAtivo(nome: string): boolean {
  return screen.getByRole('button', { name: nome }).className.includes('bg-primary');
}

/** Nomes dos chips ACESOS agora — é o que prova a exclusividade mútua. */
function chipsAcesos(): string[] {
  return NOMES_DOS_CHIPS.filter((nome) => chipAtivo(nome));
}

describe('AuditoriaAdmissoesContent', () => {
  beforeEach(() => {
    getMockAuditoriaMock.mockReturnValue(MOCK_EVENTOS);
    navigateMock.mockClear();
  });

  it('renderiza os 4 KPI Cards no MESMO padrão do Dashboard de Admissões', () => {
    render(<AuditoriaAdmissoesContent />);

    // Composição do `MetricCard` compartilhado: título em caixa de frase, valor
    // e frase de apoio. (O título do KPI pode coincidir com o texto de uma
    // <option> dos selects, por isso o `getAllByText`.)
    [
      ['Eventos', 'Total de eventos registrados'],
      ['Sucesso', 'Eventos concluídos com sucesso'],
      ['Pendentes', 'Aguardando processo ou validação'],
      ['Falhas', 'Eventos com erro ou bloqueio'],
    ].forEach(([titulo, apoio]) => {
      expect(screen.getAllByText(titulo).length).toBeGreaterThan(0);
      expect(screen.getByText(apoio)).toBeInTheDocument();
    });

    // Valores reais da trilha: 4 eventos (2 sucesso, 1 pendente, 1 falha)
    expect(screen.getAllByText('4').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });

  it('coloca o tom semântico no ÍCONE e mantém o valor principal neutro', () => {
    render(<AuditoriaAdmissoesContent />);

    // O tom vive no chip do ícone (o mesmo mapa do `MetricCard`)
    ['bg-info/10', 'bg-success/10', 'bg-warning/10', 'bg-destructive-vivid/10'].forEach((classe) => {
      expect(document.querySelector(`[class*="${classe}"]`)).toBeTruthy();
    });

    // ...e NÃO no número: o valor usa o token `text-data` e herda a cor clara.
    const valor = screen.getAllByText('4').find((el) => el.className.includes('text-data'));
    expect(valor).toBeDefined();
    expect(valor?.className).not.toMatch(/text-(info|success|warning|destructive)/);
  });

  it('renderiza os 8 chips rápidos com a contagem real', () => {
    render(<AuditoriaAdmissoesContent />);

    // Ordem fixa da referência; a contagem é sempre a REAL da trilha (por isso
    // etapa sem evento aparece com 0 em vez de sumir da faixa).
    NOMES_DOS_CHIPS.forEach((nome) => {
      expect(screen.getByRole('button', { name: nome })).toBeInTheDocument();
    });
    // "cancelada" é terminal e fica FORA do recorte de chips rápidos.
    expect(screen.queryByRole('button', { name: 'Cancelada(1)' })).not.toBeInTheDocument();
  });

  it('filtra a trilha ao clicar no chip de status', () => {
    render(<AuditoriaAdmissoesContent />);

    fireEvent.click(screen.getByRole('button', { name: 'Falha(1)' }));

    expect(screen.getByText('Admissão cancelada')).toBeInTheDocument();
    expect(screen.queryByText('Transmissão do evento S-2200')).not.toBeInTheDocument();
  });

  it('filtra pela busca (protocolo) e volta tudo em "Limpar filtros"', () => {
    render(<AuditoriaAdmissoesContent />);

    fireEvent.change(screen.getByLabelText('Buscar na trilha de auditoria'), { target: { value: '1.2.345.678' } });
    expect(screen.getByText('Transmissão do evento S-2200')).toBeInTheDocument();
    expect(screen.queryByText('Admissão cancelada')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Limpar filtros/ }));
    expect(screen.getByText('Admissão cancelada')).toBeInTheDocument();
  });

  it('filtra pelo select de status', () => {
    render(<AuditoriaAdmissoesContent />);

    fireEvent.change(selectPorOpcao('Todos os status'), { target: { value: 'pendente' } });

    expect(screen.getByText('Pendência documental identificada')).toBeInTheDocument();
    expect(screen.queryByText('Admissão cancelada')).not.toBeInTheDocument();
  });

  it('renderiza as 7 colunas da tabela e o conteúdo rico de cada linha', () => {
    render(<AuditoriaAdmissoesContent />);

    ['Data/Hora', 'Evento', 'Candidato', 'Etapa', 'Status', 'Responsável', 'Ações'].forEach((coluna) => {
      expect(screen.getByRole('columnheader', { name: coluna })).toBeInTheDocument();
    });

    // Data/Hora formatada pelo próprio derivador (independe do fuso do CI)
    expect(screen.getAllByText(formatarDataHora(MOCK_EVENTOS[0].data_hora).data).length).toBeGreaterThan(0);

    // Evento: título + descrição complementar
    expect(screen.getByText('Transmissão do evento S-2200')).toBeInTheDocument();
    expect(screen.getByText('Admissão transmitida ao eSocial com recibo de protocolo.')).toBeInTheDocument();

    // Candidato: nome + cargo • departamento
    expect(screen.getByText('Ana Silva Santos')).toBeInTheDocument();
    expect(screen.getByText('Analista de Marketing • Marketing')).toBeInTheDocument();

    // Etapa (badge) e Status (badge)
    expect(screen.getAllByText('eSocial').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Falha').length).toBeGreaterThan(0);

    // Responsável: nome + função (Renata é responsável por dois eventos)
    expect(screen.getAllByText('Renata Alves').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Especialista em eSocial').length).toBeGreaterThan(0);
  });

  it('abre o detalhe completo do evento na ação "Ver detalhes"', () => {
    render(<AuditoriaAdmissoesContent />);

    expect(screen.queryByText('Recibo 1.2.345.678')).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Ver detalhes' })[0]);

    expect(screen.getByText('Recibo 1.2.345.678')).toBeInTheDocument();
    expect(screen.getByText('Função')).toBeInTheDocument();
  });

  it('ordena a trilha pelo select "Ordenar por"', () => {
    render(<AuditoriaAdmissoesContent />);

    // "Mais recentes" (padrão): o evento de 31/12 vem antes
    expect(screen.getAllByRole('row')[1].textContent).toContain('Ana Silva Santos');

    fireEvent.change(selectPorOpcao('Mais recentes'), { target: { value: 'candidato' } });
    expect(screen.getAllByRole('row')[1].textContent).toContain('Aline Cristina Duarte');
  });

  it('mostra o cabeçalho refinado do bloco principal', () => {
    render(<AuditoriaAdmissoesContent />);

    expect(screen.getByText(TITULO_BLOCO)).toBeInTheDocument();
    expect(
      screen.getByText('Rastreie e acompanhe todas as ações realizadas no processo de admissão')
    ).toBeInTheDocument();
    expect(screen.getByText('Ordenar por')).toBeInTheDocument();
    expect(screen.getByText(/Exibindo/)).toBeInTheDocument();
  });

  it('mostra o estado vazio quando não há trilha de auditoria', () => {
    getMockAuditoriaMock.mockReturnValue([]);
    render(<AuditoriaAdmissoesContent />);

    expect(screen.getByText(TITULO_BLOCO)).toBeInTheDocument();
    expect(screen.getByText(/Nenhum evento foi registrado ainda/)).toBeInTheDocument();
    expect(screen.queryByRole('columnheader')).not.toBeInTheDocument();
  });

  it('"Limpar filtros" fica neutro sem filtro e vira destaque LIME com filtro ativo', () => {
    render(<AuditoriaAdmissoesContent />);
    const limpar = () => screen.getByRole('button', { name: /Limpar filtros/ });

    // Estado padrão: ação secundária neutra (fundo escuro, borda sutil, texto
    // discreto) e indisponível — nada a limpar.
    expect(limpar()).toBeDisabled();
    expect(limpar().className).toContain('border-border/40');
    expect(limpar().className).toContain('text-muted-foreground');
    expect(limpar().className).not.toContain('bg-primary');

    // Um chip aplica filtro → o botão passa a comunicar que há o que limpar, com
    // o destaque primário LIME do sistema (tinta cheia + texto escuro).
    fireEvent.click(screen.getByRole('button', { name: 'Falha(1)' }));
    expect(limpar()).not.toBeDisabled();
    expect(limpar().className).toContain('bg-primary');
    expect(limpar().className).toContain('text-primary-foreground');
    expect(limpar().className).toContain('border-transparent');
    expect(limpar().className).toContain('cursor-pointer');

    // Limpar volta tudo ao padrão → o botão volta ao estado neutro
    fireEvent.click(limpar());
    expect(limpar()).toBeDisabled();
    expect(limpar().className).not.toContain('bg-primary');
    expect(limpar().className).toContain('border-border/40');
  });

  it('o destaque de "Limpar filtros" também reage à busca e aos selects', () => {
    render(<AuditoriaAdmissoesContent />);
    // O botão da barra é o primeiro "Limpar filtros" na ordem do DOM
    const limpar = () => screen.getAllByRole('button', { name: /Limpar filtros/ })[0];
    const estaLime = () => limpar().className.includes('bg-primary');

    expect(estaLime()).toBe(false);

    fireEvent.change(screen.getByLabelText('Buscar na trilha de auditoria'), { target: { value: 'ana' } });
    expect(estaLime()).toBe(true);

    fireEvent.click(limpar());
    expect(estaLime()).toBe(false);

    // Select de Etapa (primeira linha)
    fireEvent.change(selectPorOpcao('Todas as etapas'), { target: { value: 'esocial' } });
    expect(estaLime()).toBe(true);

    fireEvent.click(limpar());

    // Select de Período (o padrão é "todos")
    fireEvent.change(selectPorOpcao('Todo o período'), { target: { value: '7d' } });
    expect(estaLime()).toBe(true);
  });

  /* ─── Régua dos chips rápidos: MUTUAMENTE EXCLUSIVOS + sincronizados ─────── */

  describe('chips rápidos (mutuamente exclusivos)', () => {
    it('1. "Todos" → "Falha": somente Falha aceso', () => {
      render(<AuditoriaAdmissoesContent />);
      expect(chipsAcesos()).toEqual(['Todos(4)']);

      fireEvent.click(screen.getByRole('button', { name: 'Falha(1)' }));

      expect(chipsAcesos()).toEqual(['Falha(1)']);
      expect(screen.getByText('Admissão cancelada')).toBeInTheDocument();
    });

    it('2. "Falha" → "eSocial": Falha apaga, só eSocial aceso (nada fica preso)', () => {
      render(<AuditoriaAdmissoesContent />);
      fireEvent.click(screen.getByRole('button', { name: 'Falha(1)' }));
      fireEvent.click(screen.getByRole('button', { name: 'eSocial(1)' }));

      expect(chipsAcesos()).toEqual(['eSocial(1)']);
      // O status do chip anterior foi limpo: sobrou SÓ a etapa esocial.
      expect(screen.getByText('Transmissão do evento S-2200')).toBeInTheDocument();
      expect(screen.queryByText('Admissão cancelada')).not.toBeInTheDocument();
    });

    it('3. "eSocial" → "Contrato": somente Contrato aceso', () => {
      render(<AuditoriaAdmissoesContent />);
      fireEvent.click(screen.getByRole('button', { name: 'eSocial(1)' }));
      fireEvent.click(screen.getByRole('button', { name: 'Contrato(0)' }));

      expect(chipsAcesos()).toEqual(['Contrato(0)']);
    });

    it('4. "Contrato" → "Todos": volta ao estado inicial', () => {
      render(<AuditoriaAdmissoesContent />);
      fireEvent.click(screen.getByRole('button', { name: 'Contrato(0)' }));
      fireEvent.click(screen.getByRole('button', { name: 'Todos(4)' }));

      expect(chipsAcesos()).toEqual(['Todos(4)']);
      // Nenhum filtro ficou preso: a trilha inteira volta.
      expect(screen.getByText('Admissão cancelada')).toBeInTheDocument();
      expect(screen.getByText('Pendência documental identificada')).toBeInTheDocument();
    });

    it('5. select de Status manual funciona (e solta o chip rápido)', () => {
      render(<AuditoriaAdmissoesContent />);
      fireEvent.change(selectPorOpcao('Todos os status'), { target: { value: 'pendente' } });

      expect(screen.getByText('Pendência documental identificada')).toBeInTheDocument();
      // O destaque dos chips vem do `quickFilter`, nunca de `status`/`etapa`.
      expect(chipsAcesos()).toEqual(['Todos(4)']);
    });

    it('6. Status + Etapa manuais combinam normalmente', () => {
      render(<AuditoriaAdmissoesContent />);
      fireEvent.change(selectPorOpcao('Todos os status'), { target: { value: 'sucesso' } });
      fireEvent.change(selectPorOpcao('Todas as etapas'), { target: { value: 'esocial' } });

      expect(screen.getByText('Transmissão do evento S-2200')).toBeInTheDocument();
      expect(screen.queryByText('Documentos validados pelo RH')).not.toBeInTheDocument();
      expect(chipsAcesos()).toEqual(['Todos(4)']);
    });

    it('7. "Limpar filtros" zera tudo, inclusive o chip rápido', () => {
      render(<AuditoriaAdmissoesContent />);
      fireEvent.click(screen.getByRole('button', { name: 'Falha(1)' }));
      fireEvent.change(screen.getByLabelText('Buscar na trilha de auditoria'), { target: { value: 'pedro' } });
      expect(chipsAcesos()).toEqual(['Falha(1)']);

      fireEvent.click(screen.getAllByRole('button', { name: /Limpar filtros/ })[0]);

      expect(chipsAcesos()).toEqual(['Todos(4)']);
      expect((screen.getByLabelText('Buscar na trilha de auditoria') as HTMLInputElement).value).toBe('');
      expect(screen.getByText('Admissão cancelada')).toBeInTheDocument();
      expect(screen.getByText('Pendência documental identificada')).toBeInTheDocument();
    });
  });

  /* ─── Atalho "Ver logs globais": destino REAL (a tela de auditoria global) ── */

  it('"Ver logs globais" navega para a rota real de auditoria global, não para a 404', () => {
    render(<AuditoriaAdmissoesContent />);

    fireEvent.click(screen.getByRole('button', { name: /Ver logs globais/ }));

    // `/auditoria` é a rota registrada no App.tsx (item "Auditoria" da sidebar).
    expect(navigateMock).toHaveBeenCalledWith('/auditoria');
    // A antiga `/configuracoes/logs` não existe em nenhum lugar do router: era
    // ela que caía no `path="*"` e mostrava "Página não encontrada".
    expect(navigateMock).not.toHaveBeenCalledWith('/configuracoes/logs');
  });

  it('o atalho "Ver Logs Globais" do estado vazio leva para a mesma rota', () => {
    getMockAuditoriaMock.mockReturnValue([]);
    render(<AuditoriaAdmissoesContent />);

    fireEvent.click(screen.getByRole('button', { name: 'Ver Logs Globais' }));

    expect(navigateMock).toHaveBeenCalledWith('/auditoria');
  });

  /* ─── PONTO DE NAVEGAÇÃO: sempre visível, NÃO acoplado à permissão ─────────── */

  it('"Ver logs globais" aparece e navega SEM depender de `auditoria.read`', () => {
    render(<AuditoriaAdmissoesContent />);

    // A tela de Admissões NÃO consulta a matriz de permissões: o atalho é navegação
    // pura. Quem autoriza `/auditoria` é o guard da rota (`PermissionRoute`).
    const botao = screen.getByRole('button', { name: /Ver logs globais/ });
    expect(botao).toBeInTheDocument();

    fireEvent.click(botao);
    expect(navigateMock).toHaveBeenCalledWith('/auditoria');
  });

  it('o atalho do ESTADO VAZIO também aparece sem depender de permissão', () => {
    getMockAuditoriaMock.mockReturnValue([]);
    render(<AuditoriaAdmissoesContent />);

    const botao = screen.getByRole('button', { name: 'Ver Logs Globais' });
    expect(botao).toBeInTheDocument();
    // A trilha local de Admissões continua acessível junto do atalho global.
    expect(screen.getByText(TITULO_BLOCO)).toBeInTheDocument();

    fireEvent.click(botao);
    expect(navigateMock).toHaveBeenCalledWith('/auditoria');
  });
});
