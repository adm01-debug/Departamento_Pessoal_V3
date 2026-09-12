import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  hasValidReportDispatchSecret,
  requestMatchesStoredReportSchedule,
} from "./internalDispatch.ts";

const request = {
  agendamentoId: "schedule-1",
  tipoRelatorio: "folha_resumo",
  formato: "csv",
  emailDestinatario: "rh@example.invalid",
  empresaId: "empresa-1",
};

const schedule = {
  id: "schedule-1",
  created_by: "user-1",
  empresa_id: "empresa-1",
  tipo_relatorio: "folha_resumo",
  formato: "csv",
  email_destinatario: "rh@example.invalid",
};

Deno.test("segredo interno é fail-closed e não aceita aproximações", async () => {
  assert(
    await hasValidReportDispatchSecret("secret-correto", "secret-correto"),
  );
  assertEquals(
    await hasValidReportDispatchSecret("secret-incorreto", "secret-correto"),
    false,
  );
  assertEquals(await hasValidReportDispatchSecret("", "secret-correto"), false);
  assertEquals(await hasValidReportDispatchSecret("secret-correto", ""), false);
});

Deno.test("chamada agendada fica vinculada ao registro e à autoria persistidos", () => {
  assert(requestMatchesStoredReportSchedule(request, schedule));
  assertEquals(
    requestMatchesStoredReportSchedule(
      { ...request, emailDestinatario: "externo@example.invalid" },
      schedule,
    ),
    false,
  );
  assertEquals(
    requestMatchesStoredReportSchedule(request, {
      ...schedule,
      created_by: null,
    }),
    false,
  );
});
