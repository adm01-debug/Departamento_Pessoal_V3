// Provedor de IA das Edge Functions: DeepSeek (API compatível com OpenAI).
// `deepseek-flash` aceita texto e imagem (image_url com data URL base64), então
// atende chat, OCR e biometria com um só modelo. Trocar o modelo: secret
// DEEPSEEK_MODEL; sem DEEPSEEK_API_KEY as funções respondem "não configurado".
export const AI_CHAT_URL = 'https://api.deepseek.com/chat/completions';

export function aiApiKey(): string | undefined {
  return Deno.env.get('DEEPSEEK_API_KEY') || undefined;
}

export function aiModel(): string {
  return Deno.env.get('DEEPSEEK_MODEL') || 'deepseek-flash';
}
