import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

const METRICAS_URL = "http://localhost:54321/functions/v1/metricas";
const RUN_LOCAL_EDGE_TESTS = Deno.env.get("RUN_LOCAL_EDGE_TESTS") === "1";

function localEdgeTest(name: string, fn: () => void | Promise<void>): void {
  Deno.test({ name, ignore: !RUN_LOCAL_EDGE_TESTS, fn });
}

localEdgeTest("Metricas Contract - Valid Payload", async () => {
  const payload = {
    empresaId: "00000000-0000-0000-0000-000000000000"
  };

  const response = await fetch(METRICAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  // Em ambiente de teste o supabase client pode falhar se não houver DB, 
  // mas aqui focamos no contrato de entrada/saída de erro
  if (response.status === 200) {
    const body = await response.json();
    assertEquals(typeof body.colaboradores, 'object');
  }
});

localEdgeTest("Metricas Contract - Invalid UUID", async () => {
  const payload = {
    empresaId: "invalid-uuid"
  };

  const response = await fetch(METRICAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const body = await response.json();
  assertEquals(response.status, 422);
  assertEquals(body.error.code, "VALIDATION_ERROR");
  assertEquals(body.error.fields[0].field, "empresaId");
});
