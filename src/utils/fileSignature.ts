// Verificação de magic bytes (assinatura real do arquivo) — §6.14.
// O MIME type declarado pelo navegador é auto-referido: um .exe renomeado
// para .pdf passa na checagem de extensão. Aqui comparamos os primeiros
// bytes com as assinaturas conhecidas. Qualquer upload do app deve passar
// por esta validação antes de ir ao storage.
export type SignedFileType = 'application/pdf' | 'image/jpeg' | 'image/png' | 'application/x-pkcs12';

const SIGNATURES: Record<SignedFileType, number[][]> = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'image/jpeg': [[0xff, 0xd8, 0xff]], // JFIF/EXIF
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]], // PNG
  // PKCS#12 (certificados .pfx/.p12): ASN.1 SEQUENCE — varia por emissor,
  // então aceitamos apenas o primeiro byte 0x30 como sanity check.
  'application/x-pkcs12': [[0x30]],
};

export async function hasValidSignature(file: File, declaredType: SignedFileType): Promise<boolean> {
  const buffer = await file.slice(0, 8).arrayBuffer();
  const header = new Uint8Array(buffer);
  const sigs = SIGNATURES[declaredType];
  if (!sigs) return false;
  return sigs.some((sig) => sig.every((b, i) => header[i] === b));
}
