// Linha de public.certificados_digitais a partir do payload da edge.
// Colunas reais (20260508201201 + 20260512171536): empresa_id, subject,
// issuer, valid_from, valid_to, thumbprint, ativo, arquivo_base64,
// senha_encriptada, cnpj_cpf. NÃO existem nome/cnpj/tipo — gravar essas
// chaves fazia o INSERT falhar (PGRST204) e todo upload dava 500.
export interface CertPayload {
  empresaId: string;
  nome: string;
  cnpj?: string;
  issuer: string;
  validFrom: string;
  validTo: string;
}

export function linhaCertificado(body: CertPayload, senhaEnc: string, arquivoEnc: string) {
  const cnpj = body.cnpj?.replace(/\D/g, '') || null;
  return {
    empresa_id: body.empresaId,
    subject: body.nome,
    cnpj_cpf: cnpj,
    issuer: body.issuer,
    valid_from: body.validFrom,
    valid_to: body.validTo,
    senha_encriptada: senhaEnc,
    arquivo_base64: arquivoEnc,
    ativo: true,
  };
}
