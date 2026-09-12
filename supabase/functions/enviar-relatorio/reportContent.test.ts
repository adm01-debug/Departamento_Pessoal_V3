import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { requireCompleteReportRows, toCsv } from "./reportContent.ts";

Deno.test("CSV neutraliza fórmulas antes de exportar", () => {
  assertEquals(toCsv([{ nome: "=1+1", nota: " texto" }]), "nome,nota\n'=1+1, texto");
  assertEquals(toCsv([{ nome: " \t@SUM(A1:A2)" }]), "nome\n' \t@SUM(A1:A2)");
});

Deno.test("relatório falha explicitamente em vez de truncar a página excedente", () => {
  assertEquals(requireCompleteReportRows([1, 2], 2), [1, 2]);
  let message = "";
  try {
    requireCompleteReportRows([1, 2, 3], 2);
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  assertEquals(message, "Relatório excede o limite explícito de 2 registros");
});
