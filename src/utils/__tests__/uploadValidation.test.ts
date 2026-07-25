import { describe, it, expect } from 'vitest';
import { validateUploadFile, sanitizeFileName } from '../uploadValidation';

function makeFile(name: string, type: string, size: number): File {
  const content = new Uint8Array(size);
  return new File([content], name, { type });
}

describe('validateUploadFile', () => {
  it('accepts a valid PDF file', () => {
    const file = makeFile('documento.pdf', 'application/pdf', 1024);
    expect(() => validateUploadFile(file)).not.toThrow();
  });

  it('accepts a valid JPEG image', () => {
    const file = makeFile('foto.jpg', 'image/jpeg', 500);
    expect(() => validateUploadFile(file)).not.toThrow();
  });

  it('throws when file exceeds size limit', () => {
    const file = makeFile('big.pdf', 'application/pdf', 11 * 1024 * 1024);
    expect(() => validateUploadFile(file)).toThrow('10MB');
  });

  it('respects custom maxSizeMB option', () => {
    const file = makeFile('medium.pdf', 'application/pdf', 3 * 1024 * 1024);
    expect(() => validateUploadFile(file, { maxSizeMB: 2 })).toThrow('2MB');
  });

  it('throws for empty files', () => {
    const file = makeFile('empty.pdf', 'application/pdf', 0);
    expect(() => validateUploadFile(file)).toThrow('vazio');
  });

  it('throws for .exe extension', () => {
    const file = makeFile('malware.exe', 'application/octet-stream', 100);
    expect(() => validateUploadFile(file)).toThrow('.exe');
  });

  it('throws for double-extension attack (file.pdf.exe)', () => {
    const file = makeFile('legit.pdf.exe', 'application/pdf', 100);
    expect(() => validateUploadFile(file)).toThrow('.exe');
  });

  it('throws for .js extension', () => {
    const file = makeFile('script.js', 'text/javascript', 100);
    expect(() => validateUploadFile(file)).toThrow('.js');
  });

  it('throws for disallowed MIME type', () => {
    const file = makeFile('archive.zip', 'application/zip', 100);
    expect(() => validateUploadFile(file)).toThrow('MIME');
  });

  it('throws for null byte in filename', () => {
    const file = new File([new Uint8Array(100)], 'file\x00.pdf', { type: 'application/pdf' });
    expect(() => validateUploadFile(file)).toThrow('inválido');
  });

  it('accepts xlsx spreadsheets', () => {
    const file = makeFile('planilha.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 2048);
    expect(() => validateUploadFile(file)).not.toThrow();
  });

  it('accepts text/csv files', () => {
    const file = makeFile('dados.csv', 'text/csv', 512);
    expect(() => validateUploadFile(file)).not.toThrow();
  });
});

describe('sanitizeFileName', () => {
  it('replaces spaces with underscores', () => {
    expect(sanitizeFileName('my file.pdf')).toBe('my_file.pdf');
  });

  it('replaces special chars with underscore', () => {
    expect(sanitizeFileName('file (1).pdf')).toContain('_');
  });

  it('preserves dots and hyphens', () => {
    const result = sanitizeFileName('my-file.pdf');
    expect(result).toBe('my-file.pdf');
  });

  it('truncates to 200 chars', () => {
    const long = 'a'.repeat(250) + '.pdf';
    expect(sanitizeFileName(long).length).toBeLessThanOrEqual(200);
  });
});
