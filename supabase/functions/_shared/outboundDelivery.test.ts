import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { normalizarTelefone, sanitizarErro } from "./outboundDelivery.ts";

Deno.test("normalizarTelefone prefixa DDI 55 em número BR sem país", () => {
  assertEquals(normalizarTelefone("11987654321"), "5511987654321");
  assertEquals(normalizarTelefone("(11) 98765-4321"), "5511987654321");
  assertEquals(normalizarTelefone("1134567890"), "551134567890");
  assertEquals(normalizarTelefone("5511987654321"), "5511987654321");
  assertEquals(normalizarTelefone("+55 11 98765-4321"), "5511987654321");
});

Deno.test("sanitizarErro remove URLs (possíveis credenciais em query param)", () => {
  const err = "falha em https://evo.exemplo.com/message/sendText/x?apikey=segredo ao enviar";
  assertEquals(sanitizarErro(err).includes("segredo"), false);
  assertEquals(sanitizarErro(err).includes("[url]"), true);
  assertEquals(sanitizarErro("x".repeat(400), 10), "xxxxxxxxxx");
});
