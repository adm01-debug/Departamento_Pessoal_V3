import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { parseJsonBody } from "./contract.ts";

Deno.test("parseJsonBody limita bytes UTF-8 mesmo sem Content-Length", async () => {
  const request = new Request("https://example.invalid", {
    method: "POST",
    body: JSON.stringify({ texto: "á".repeat(140_000) }),
  });

  const { errorResponse } = await parseJsonBody(request);
  assertEquals(errorResponse?.status, 413);
});

Deno.test("parseJsonBody aceita JSON dentro do limite", async () => {
  const request = new Request("https://example.invalid", {
    method: "POST",
    body: JSON.stringify({ ok: true }),
  });

  const { body, errorResponse } = await parseJsonBody(request);
  assertEquals(errorResponse, undefined);
  assertEquals(body, { ok: true });
});
