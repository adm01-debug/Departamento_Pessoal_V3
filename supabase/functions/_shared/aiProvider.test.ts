import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { AI_CHAT_URL, AI_NO_THINKING, aiApiKey, aiModel } from "./aiProvider.ts";

Deno.test("aiProvider: DeepSeek, chave e modelo vêm das secrets", () => {
  const prevKey = Deno.env.get("DEEPSEEK_API_KEY");
  const prevModel = Deno.env.get("DEEPSEEK_MODEL");
  try {
    assertEquals(AI_CHAT_URL, "https://api.deepseek.com/chat/completions");
    Deno.env.delete("DEEPSEEK_API_KEY");
    Deno.env.delete("DEEPSEEK_MODEL");
    assertEquals(aiApiKey(), undefined);
    assertEquals(aiModel(), "deepseek-flash");
    Deno.env.set("DEEPSEEK_API_KEY", "");
    assertEquals(aiApiKey(), undefined);
    Deno.env.set("DEEPSEEK_API_KEY", "sk-teste");
    Deno.env.set("DEEPSEEK_MODEL", "deepseek-pro");
    assertEquals(aiApiKey(), "sk-teste");
    assertEquals(aiModel(), "deepseek-pro");
  } finally {
    prevKey === undefined ? Deno.env.delete("DEEPSEEK_API_KEY") : Deno.env.set("DEEPSEEK_API_KEY", prevKey);
    prevModel === undefined ? Deno.env.delete("DEEPSEEK_MODEL") : Deno.env.set("DEEPSEEK_MODEL", prevModel);
  }
});

Deno.test("aiProvider: chamadas à DeepSeek desligam o modo thinking", () => {
  assertEquals(AI_NO_THINKING, { thinking: { type: "disabled" } });
});
