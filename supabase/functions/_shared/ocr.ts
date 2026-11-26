/**
 * OCR de documentos do fluxo de admissao.
 *
 * Extraido de `process-document-ocr/index.ts` para ser reusado por
 * `admissao-publica/index.ts`. O portal publico /contratacao e anonimo: o
 * upload direto no Storage pelo cliente e negado por RLS (nenhuma policy
 * concede INSERT a `anon`), entao upload e OCR do candidato precisam acontecer
 * na mesma chamada de servidor, com service_role. Aquela funcao ja sobe o
 * arquivo — aqui so falta ler o texto dele.
 */
import { safeFetchWithRetry } from './safe-fetch.ts';
import { AI_CHAT_URL, AI_NO_THINKING, aiApiKey, aiModel } from './aiProvider.ts';

// `identidade` aceita RG **ou** CNH: o campo da UI é único ("RG ou CNH") e o
// candidato não informa qual dos dois anexou. Mandar `rg` fazia o provedor
// reprovar uma CNH legível por "tipo errado".
export const OCR_DOC_TYPES = ['cpf', 'rg', 'cnh', 'identidade', 'comprovante_residencia', 'generic'] as const;
export type OcrDocType = (typeof OCR_DOC_TYPES)[number];

const OCR_DOC_TYPE_LABEL: Record<OcrDocType, string> = {
  rg: 'RG (cédula de identidade)',
  cnh: 'CNH (carteira nacional de habilitação)',
  identidade: 'documento de identidade brasileiro — aceite RG ou CNH',
  cpf: 'CPF',
  comprovante_residencia: 'comprovante de residência',
  generic: 'documento',
};

export const OCR_FALLBACK_ERROR = 'Nao foi possivel processar o documento automaticamente.';

export type OcrResult = {
  valid: boolean;
  confidence: number;
  extractedData?: Record<string, unknown>;
  error?: string;
};

export function isOcrDocType(value: string): value is OcrDocType {
  return (OCR_DOC_TYPES as readonly string[]).includes(value);
}

/**
 * So aceita URL de arquivo do proprio projeto: o provedor de IA baixa a URL
 * recebida, entao qualquer host externo seria um vetor de SSRF.
 */
export function isAllowedFileUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    const h = url.hostname;
    if (h === 'localhost' || h === '127.0.0.1' || h.startsWith('192.168.') ||
        h.startsWith('10.') || h.startsWith('172.16.') || h === '0.0.0.0' ||
        h === '169.254.169.254' || h.endsWith('.internal') || h.endsWith('.local')) {
      return false;
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    if (!supabaseUrl) return false;
    const supabaseHost = new URL(supabaseUrl).hostname;
    return url.hostname === supabaseHost && url.pathname.includes('/storage/v1/');
  } catch {
    return false;
  }
}

export type OcrRun =
  | { ok: true; result: unknown }
  | { ok: false; status: number; error: string };

export async function runDocumentOcr(fileUrl: string, docType: OcrDocType): Promise<OcrRun> {
  if (!isAllowedFileUrl(fileUrl)) {
    return { ok: false, status: 422, error: 'URL de arquivo nao permitida' };
  }

  const aiKey = aiApiKey();
  if (!aiKey) {
    return { ok: false, status: 503, error: 'Servico OCR nao configurado' };
  }

  const systemPrompt = `Voce e um especialista em OCR de documentos brasileiros (RG, CPF, CNH, Comprovante de Residencia).
    Sua tarefa e extrair os dados do documento fornecido e retornar APENAS um objeto JSON estruturado.
    Nao inclua explicacoes ou texto fora do JSON.
    O tipo declarado pelo usuario e o que se espera do arquivo; se o arquivo for
    um documento de identidade valido de outro formato aceito (RG ou CNH), trate
    como valido e informe o que encontrou.

    Campos esperados no JSON:
    - valid: boolean (indica se o documento e legivel e do tipo correto)
    - confidence: number (0-1)
    - extractedData: {
        nome?: string,
        cpf?: string (formatado),
        data_nascimento?: string (YYYY-MM-DD),
        rg?: string,
        logradouro?: string,
        bairro?: string,
        cidade?: string,
        uf?: string,
        cep?: string
      }
    - error?: string (se valid for false)`;

  const userPrompt = `Analise este documento do tipo: ${OCR_DOC_TYPE_LABEL[docType]}.`;

  const aiResponse = await safeFetchWithRetry(
    AI_CHAT_URL,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiKey}`,
      },
      body: JSON.stringify({
        model: aiModel(),
        ...AI_NO_THINKING,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: [{ type: 'text', text: userPrompt }, { type: 'image_url', image_url: { url: fileUrl } }] },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 1000,
      }),
      timeoutMs: 30_000,
      tag: 'openai',
    },
    { maxAttempts: 3, baseDelayMs: 2_000, tag: 'openai' }
  );

  if (!aiResponse.ok) {
    return { ok: false, status: 502, error: 'Erro no servico de OCR' };
  }

  const aiData = await aiResponse.json();
  const content = aiData.choices?.[0]?.message?.content || '{}';

  try {
    return { ok: true, result: JSON.parse(content) };
  } catch {
    return { ok: true, result: { valid: false, confidence: 0, error: 'Resposta invalida do OCR' } };
  }
}