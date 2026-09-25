import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileUploadField } from '../FileUploadField';

function makeFile(name: string, type: string, sizeBytes = 1024): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

describe('FileUploadField', () => {
  it('mostra a dropzone quando nenhum arquivo está selecionado', () => {
    render(<FileUploadField file={null} onFileChange={vi.fn()} />);
    expect(screen.getByText('Arraste um arquivo aqui')).toBeInTheDocument();
    expect(screen.getByText('ou selecione do computador')).toBeInTheDocument();
    expect(screen.getByText(/até 10MB/)).toBeInTheDocument();
  });

  it('aceita um arquivo válido selecionado pelo input e chama onFileChange', () => {
    const onFileChange = vi.fn();
    const { container } = render(<FileUploadField file={null} onFileChange={onFileChange} />);
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    const file = makeFile('contrato.pdf', 'application/pdf');

    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileChange).toHaveBeenCalledWith(file);
  });

  it('rejeita arquivo maior que o limite e não chama onFileChange', () => {
    const onFileChange = vi.fn();
    const { container } = render(<FileUploadField file={null} onFileChange={onFileChange} maxSizeMB={1} />);
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    const file = makeFile('grande.pdf', 'application/pdf', 2 * 1024 * 1024);

    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileChange).not.toHaveBeenCalled();
    expect(screen.getByText(/excede o limite de 1MB/)).toBeInTheDocument();
  });

  it('rejeita extensão perigosa com mensagem amigável', () => {
    const onFileChange = vi.fn();
    const { container } = render(<FileUploadField file={null} onFileChange={onFileChange} />);
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    const file = makeFile('malware.exe', 'application/octet-stream');

    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileChange).not.toHaveBeenCalled();
    expect(screen.getByText(/não permitido: \.exe/)).toBeInTheDocument();
  });

  it('mostra o arquivo selecionado com nome, tamanho e botão Remover', () => {
    const file = makeFile('contrato.pdf', 'application/pdf', 2048);
    render(<FileUploadField file={file} onFileChange={vi.fn()} />);

    expect(screen.getByText('contrato.pdf')).toBeInTheDocument();
    expect(screen.getByText('2.0 KB')).toBeInTheDocument();
    expect(screen.getByText('Remover')).toBeInTheDocument();
  });

  it('clicar em Remover chama onFileChange(null)', () => {
    const file = makeFile('contrato.pdf', 'application/pdf');
    const onFileChange = vi.fn();
    render(<FileUploadField file={file} onFileChange={onFileChange} />);

    fireEvent.click(screen.getByText('Remover'));

    expect(onFileChange).toHaveBeenCalledWith(null);
  });

  it('estado uploading esconde o botão Remover e mostra "Enviando arquivo..."', () => {
    const file = makeFile('contrato.pdf', 'application/pdf');
    render(<FileUploadField file={file} onFileChange={vi.fn()} uploading />);

    expect(screen.getByText('Enviando arquivo...')).toBeInTheDocument();
    expect(screen.queryByText('Remover')).not.toBeInTheDocument();
  });

  it('disabled impede abrir o seletor de arquivo pela dropzone', () => {
    const { container } = render(<FileUploadField file={null} onFileChange={vi.fn()} disabled />);
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    expect(input).toBeDisabled();
  });
});
