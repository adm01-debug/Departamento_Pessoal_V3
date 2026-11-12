// Provedor de IA das Edge Functions: DeepSeek (API compatível com OpenAI).
// `deepseek-flash` aceita texto e imagem (image_url com data URL base64), então
// atende chat, OCR e biometria com um só modelo. Trocar o modelo: secret
// DEEPSEEK_MODEL; sem DEEPSEEK_API_KEY as funções respondem "não configurado".
export const AI_CHAT_URL = 'https://api.deepseek.com/chat/completions';

export function aiApiKey(): string | undefined {
  return Deno.env.get('DEEPSEEK_API_KEY') || undefined;
}

// deepseek-flash liga o modo thinking por padrão; o raciocínio consome o
// max_tokens das chamadas curtas (biometria 256, OCR 1000) e pode deixar
// message.content vazio. Todas as chamadas à DeepSeek desligam o thinking.
export const AI_NO_THINKING = { thinking: { type: 'disabled' } } as const;

export function aiModel(): string {
  return Deno.env.get('DEEPSEEK_MODEL') || 'deepseek-flash';
}
