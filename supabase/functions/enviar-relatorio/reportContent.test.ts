import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { toCsv } from "./reportContent.ts";

Deno.test("CSV neutraliza fórmulas antes de exportar", () => {
  assertEquals(toCsv([{ nome: "=1+1", nota: " texto" }]), "nome,nota\n'=1+1, texto");
  assertEquals(toCsv([{ nome: " \t@SUM(A1:A2)" }]), "nome\n' \t@SUM(A1:A2)");
});
