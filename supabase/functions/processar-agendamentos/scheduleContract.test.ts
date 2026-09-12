import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { nextScheduleOccurrence, shouldRunSchedule, summarizeScheduleResults } from "./scheduleContract.ts";

Deno.test("agenda aceita atraso de 10 minutos que cruza a hora, mas nunca antecipa", () => {
  const schedule = { frequencia: "diario" as const, hora_envio: "09:50" };
  assertEquals(shouldRunSchedule(schedule, new Date("2026-01-31T13:00:00Z")), true); // 10:00 BRT
  assertEquals(shouldRunSchedule(schedule, new Date("2026-01-31T12:40:00Z")), false); // 09:40 BRT
});

Deno.test("agenda mensal no dia 31 avança para o último dia de fevereiro", () => {
  const next = nextScheduleOccurrence({ frequencia: "mensal", hora_envio: "09:00", dia_mes: 31 }, new Date("2026-01-31T12:00:00Z"));
  assertEquals(next.toISOString(), "2026-02-28T12:00:00.000Z");
});

Deno.test("resumo não declara sucesso quando qualquer agenda falha", () => {
  assertEquals(summarizeScheduleResults([{ status: "processado" }, { status: "erro" }, { status: "skipped" }]), {
    success: false, processados: 1, falhas: 1, pulados: 1,
  });
});
