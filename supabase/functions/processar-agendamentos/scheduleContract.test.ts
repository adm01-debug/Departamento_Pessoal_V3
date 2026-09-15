import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  claimedScheduleOccurrence,
  nextScheduleOccurrence,
  shouldRunSchedule,
  summarizeScheduleResults,
} from "./scheduleContract.ts";

Deno.test("agenda aceita atraso de 10 minutos que cruza a hora, mas nunca antecipa", () => {
  const schedule = { frequencia: "diario" as const, hora_envio: "09:50" };
  assertEquals(shouldRunSchedule(schedule, new Date("2026-01-31T13:00:00Z")), true); // 10:00 BRT
  assertEquals(shouldRunSchedule(schedule, new Date("2026-01-31T12:40:00Z")), false); // 09:40 BRT
});

Deno.test("agenda mensal no dia 31 avança para o último dia de fevereiro", () => {
  const next = nextScheduleOccurrence({ frequencia: "mensal", hora_envio: "09:00", dia_mes: 31 }, new Date("2026-01-31T12:00:00Z"));
  assertEquals(next.toISOString(), "2026-02-28T12:00:00.000Z");
});

Deno.test("próxima ocorrência não pula o dia atual após processar na janela de D-1", () => {
  const next = nextScheduleOccurrence(
    { frequencia: "diario", hora_envio: "23:50" },
    new Date("2026-02-01T03:00:00Z"),
  );
  assertEquals(next.toISOString(), "2026-02-02T02:50:00.000Z"); // 01/02 23:50 BRT
});

Deno.test("agenda diária mantém a janela quando ela cruza a meia-noite", () => {
  const schedule = { frequencia: "diario" as const, hora_envio: "23:50" };
  assertEquals(shouldRunSchedule(schedule, new Date("2026-02-01T03:00:00Z")), true); // 00:00 BRT
  assertEquals(shouldRunSchedule(schedule, new Date("2026-02-01T03:20:00Z")), false); // limite exclusivo
});

Deno.test("agenda semanal e mensal respeitam o dia anterior ao cruzar meia-noite", () => {
  const now = new Date("2026-02-01T03:00:00Z"); // domingo 00:00 BRT
  assertEquals(shouldRunSchedule({ frequencia: "semanal", hora_envio: "23:50", dia_semana: 6 }, now), true);
  assertEquals(shouldRunSchedule({ frequencia: "mensal", hora_envio: "23:50", dia_mes: 31 }, now), true);
  assertEquals(shouldRunSchedule({ frequencia: "semanal", hora_envio: "23:50", dia_semana: 0 }, now), false);
});

Deno.test("resumo não declara sucesso quando qualquer agenda falha", () => {
  assertEquals(summarizeScheduleResults([{ status: "processado" }, { status: "erro" }, { status: "skipped" }]), {
    success: false, processados: 1, falhas: 1, pulados: 1,
  });
});

Deno.test("cursor persistido recupera indisponibilidade curta com chave determinística", () => {
  const occurrence = claimedScheduleOccurrence({
    frequencia: "diario",
    hora_envio: "09:00",
    proximo_envio: "2026-01-31T12:00:00.000Z",
  }, new Date("2026-01-31T18:00:00.000Z"));
  assertEquals(occurrence?.toISOString(), "2026-01-31T12:00:00.000Z");
});

Deno.test("cursor futuro, inválido ou atrasado mais de 24h não é despachado", () => {
  const base = { frequencia: "diario" as const, hora_envio: "09:00" };
  const now = new Date("2026-02-02T15:00:00.000Z");
  assertEquals(claimedScheduleOccurrence({ ...base, proximo_envio: "2026-02-03T12:00:00.000Z" }, now), null);
  assertEquals(claimedScheduleOccurrence({ ...base, proximo_envio: "inválido" }, now), null);
  assertEquals(claimedScheduleOccurrence({ ...base, proximo_envio: "2026-01-31T12:00:00.000Z" }, now), null);
});
