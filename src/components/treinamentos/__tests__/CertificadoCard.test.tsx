import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CertificadoCard } from '../CertificadoCard';
import {
  montarCertificados,
  type CertificadoRegistro,
  type ColaboradorCertificado,
  type CursoCertificado,
} from '../certificadosDerivacoes';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const writeText = vi.fn();

beforeEach(() => {
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
});

/** Referência fixa: 20/04/2026. */
const REFERENCIA = new Date(2026, 3, 20);

const CURSOS: CursoCertificado[] = [
  {
    id: 'curso-1',
    nome: 'Comunicação Assertiva',
    categoria: 'Desenvolvimento Pessoal',
    carga_horaria: 6,
  },
];

const COLABORADORES: ColaboradorCertificado[] = [
  { id: 'col-1', nome_completo: 'Fernanda Costa Ribeiro', cargo: 'Coordenadora Financeira' },
];

function certificado(override: Partial<CertificadoRegistro> = {}) {
  return montarCertificados(
    [
      {
        id: 'cert-1',
        colaborador_id: 'col-1',
        curso_id: 'curso-1',
        data_emissao: '2026-04-20',
        data_validade: '2026-11-20',
        codigo_autenticacao: '11223344',
        ...override,
      },
    ],
    CURSOS,
    COLABORADORES,
    REFERENCIA
  )[0];
}

function renderizar(certificadoMontado = certificado()) {
  const { container } = render(<CertificadoCard certificado={certificadoMontado} onVisualizar={vi.fn()} />);
  const metadados = container.querySelector('[data-certificado-metadados]') as HTMLElement;
  return { container, metadados };
}

describe('CertificadoCard — bloco Emissão / Validade / Código', () => {
  it('usa três colunas proporcionais com labels, valores e complemento alinhados', () => {
    const { metadados } = renderizar();

    expect(metadados).toHaveClass(
      'grid',
      'grid-cols-[minmax(0,0.87fr)_minmax(0,1.12fr)_minmax(0,1.11fr)]',
      'items-start',
      'gap-x-2.5',
      'px-3',
      'py-3'
    );

    const colunas = metadados.querySelectorAll('[data-meta]');
    expect(colunas).toHaveLength(3);
    expect(Array.from(colunas).map((coluna) => coluna.getAttribute('data-meta'))).toEqual([
      'emissao',
      'validade',
      'codigo',
    ]);

    for (const coluna of colunas) {
      expect(coluna.querySelector('dt')).toHaveClass('text-[10px]', 'uppercase', 'text-muted-foreground');
    }

    expect(metadados.querySelector('[data-meta="emissao"] dd')).toHaveClass('mt-1.5', 'text-[12px]', 'tabular-nums');
    expect(metadados.querySelector('[data-meta="validade"] dd')).toHaveClass('mt-1.5', 'text-[12px]');
    expect(metadados.querySelector('[data-meta="codigo"] dd')).toHaveClass('mt-1.5', 'gap-2');
  });

  it('exibe emissão e validade reais no formato dd/MM/yyyy', () => {
    const { metadados } = renderizar();
    const emissao = metadados.querySelector('[data-meta="emissao"]') as HTMLElement;
    const validade = metadados.querySelector('[data-meta="validade"]') as HTMLElement;

    expect(within(emissao).getByText('20/04/2026')).toBeInTheDocument();
    expect(within(validade).getByText('20/11/2026')).toBeInTheDocument();
  });

  it('mostra o aviso âmbar de certificado a vencer', () => {
    const { metadados } = renderizar(certificado({ data_validade: '2026-05-18' }));
    const detalhe = metadados.querySelector('[data-validade-detalhe]') as HTMLElement;

    expect(detalhe).toHaveTextContent('Vence em 28 dias');
    expect(detalhe).toHaveClass('text-warning', 'min-h-[14px]', 'text-[10px]');
    expect(detalhe).toHaveAttribute('aria-hidden', 'false');
  });

  it('mostra o aviso vermelho de certificado vencido', () => {
    const { metadados } = renderizar(certificado({ data_validade: '2026-03-08' }));
    const detalhe = metadados.querySelector('[data-validade-detalhe]') as HTMLElement;

    expect(detalhe).toHaveTextContent('Vencido há 43 dias');
    expect(detalhe).toHaveClass('text-[hsl(var(--destructive-vivid))]', 'min-h-[14px]');
    expect(detalhe).toHaveAttribute('aria-hidden', 'false');
  });

  it('exibe “Vitalício” e reserva a área complementar sem inventar data', () => {
    const { metadados } = renderizar(certificado({ data_validade: null }));
    const validade = metadados.querySelector('[data-meta="validade"]') as HTMLElement;
    const detalhe = validade.querySelector('[data-validade-detalhe]') as HTMLElement;

    expect(within(validade).getByText('Vitalício')).toBeInTheDocument();
    expect(detalhe).toHaveClass('min-h-[14px]');
    expect(detalhe).toBeEmptyDOMElement();
    expect(detalhe).toHaveAttribute('aria-hidden', 'true');
  });

  it('reserva a mesma altura complementar para válido, a vencer, vencido e vitalício', () => {
    for (const validade of ['2026-11-20', '2026-05-18', '2026-03-08', null]) {
      const { container, unmount } = render(
        <CertificadoCard certificado={certificado({ data_validade: validade })} onVisualizar={vi.fn()} />
      );
      const detalhe = container.querySelector('[data-validade-detalhe]');
      expect(detalhe).toHaveClass('min-h-[14px]');
      unmount();
    }
  });

  it('mantém data e código ausentes com placeholders, sem criar botão de copiar', () => {
    const { metadados } = renderizar(certificado({ data_emissao: null, codigo_autenticacao: null }));

    expect(metadados.querySelector('[data-meta="emissao"] dd')).toHaveTextContent('—');
    expect(metadados.querySelector('[data-meta="codigo"] dd')).toHaveTextContent('—');
    expect(screen.queryByRole('button', { name: /copiar código/i })).not.toBeInTheDocument();
  });

  it('preserva código longo em uma linha e mantém o botão de copiar ao lado', () => {
    const codigoLongo = 'ABCDEF1234567890XYZ';
    const { metadados } = renderizar(certificado({ codigo_autenticacao: codigoLongo }));
    const codigo = metadados.querySelector('[data-meta="codigo"] dd span') as HTMLElement;

    expect(codigo).toHaveTextContent(codigoLongo);
    expect(codigo).toHaveAttribute('title', codigoLongo);
    expect(codigo).toHaveClass('truncate', 'whitespace-nowrap', 'text-[12px]', 'font-mono');
    expect(screen.getByRole('button', { name: /copiar código de autenticação/i })).toHaveClass(
      'h-[22px]',
      'w-[22px]',
      'shrink-0'
    );
  });

  it('copia o código real e confirma com tooltip de sucesso', async () => {
    renderizar(certificado({ codigo_autenticacao: '11223344' }));
    const botao = screen.getByRole('button', { name: /copiar código de autenticação/i });

    await userEvent.click(botao);

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('11223344'));
    await waitFor(() => expect(botao).toHaveAttribute('title', 'Código copiado'));
  });

  it('mantém o rodapé preso ao fundo do card para alinhar os botões', () => {
    const { container } = renderizar();
    const rodape = container.querySelector('.mt-auto.flex.items-center.pt-2\\.5');
    expect(rodape).not.toBeNull();
    expect(within(rodape as HTMLElement).getByRole('button', { name: /visualizar certificado/i })).toBeInTheDocument();
  });
});
