import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { parseJsonBody, validateRequest } from "./contract.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

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

Deno.test("parseJsonBody devolve 413 sem deadlock quando Request.clone mantém o tee aberto", async () => {
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;
      controller.enqueue(new TextEncoder().encode('{"texto":"' + 'x'.repeat(512)));
      // Deliberadamente não fecha: reproduz upload/stream lento com clone não lido.
    },
  });
  const request = new Request("https://example.invalid", { method: "POST", body: stream });
  const unreadClone = request.clone();

  const result = await Promise.race([
    parseJsonBody(request, 64),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("parseJsonBody bloqueou ao cancelar stream tee'd")), 250)
    ),
  ]);

  assertEquals(result.errorResponse?.status, 413);
  controllerRef?.close();
  await unreadClone.body?.cancel();
});

Deno.test("validateRequest ecoa a origem permitida também no erro Zod", async () => {
  const allowedOrigin = "https://departamento-pessoal-v3.vercel.app";
  const request = new Request("https://example.invalid", {
    method: "POST",
    headers: { origin: allowedOrigin, "content-type": "application/json" },
    body: JSON.stringify({ quantidade: "inválida" }),
  });

  const { errorResponse } = await validateRequest(request, z.object({ quantidade: z.number() }));
  assertEquals(errorResponse?.status, 422);
  assertEquals(errorResponse?.headers.get("Access-Control-Allow-Origin"), allowedOrigin);
});
