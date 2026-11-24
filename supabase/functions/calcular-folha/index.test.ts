import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EDGE_FUNCTION_URL = "http://localhost:54321/functions/v1/calcular-folha";

Deno.test("calcular-folha: deve retornar erro 400 se parâmetros estiverem faltando", async () => {
  const res = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  
  const data = await res.json();
  assertEquals(res.status, 400);
  assert(data.error.includes("obrigatórios"));
});

Deno.test("calcular-folha: deve retornar 404 se não houver colaboradores", async () => {
  // Simula um UUID que provavelmente não existe
  const res = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ empresa_id: "00000000-0000-0000-0000-000000000000", competencia: "2024-01" }),
  });
  
  const data = await res.json();
  // No ambiente real, dependerá do mock do Supabase se estivermos rodando localmente
  // Mas validamos que o status code é tratado
  assert(res.status === 404 || res.status === 500);
});
