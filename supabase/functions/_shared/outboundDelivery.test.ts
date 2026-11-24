import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  emailEntregavel,
  emailsEntregaveis,
  normalizarTelefone,
  remetenteEmail,
  sanitizarErro,
} from "./outboundDelivery.ts";

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

Deno.test("remetenteEmail: explícito > EMAIL_FROM > sandbox da Resend", () => {
  const prev = Deno.env.get("EMAIL_FROM");
  try {
    Deno.env.set("EMAIL_FROM", "Sistema DP <nao-responda@exemplo.com.br>");
    assertEquals(remetenteEmail(), "Sistema DP <nao-responda@exemplo.com.br>");
    assertEquals(remetenteEmail("Outro <o@x.com>"), "Outro <o@x.com>");
    Deno.env.set("EMAIL_FROM", "");
    assertEquals(remetenteEmail(), "Sistema DP <onboarding@resend.dev>");
    Deno.env.delete("EMAIL_FROM");
    assertEquals(remetenteEmail(), "Sistema DP <onboarding@resend.dev>");
  } finally {
    prev === undefined ? Deno.env.delete("EMAIL_FROM") : Deno.env.set("EMAIL_FROM", prev);
  }
});

Deno.test("emailEntregavel recusa domínios reservados (RFC 2606/6761)", () => {
  // Endereço de teste num lote faz a Resend rejeitar TODOS os destinatários.
  assertEquals(emailEntregavel("qa.dreno.1898876129@example.com"), false);
  assertEquals(emailEntregavel("a@example.net"), false);
  assertEquals(emailEntregavel("a@example.org"), false);
  assertEquals(emailEntregavel("a@exemplo.test"), false);
  assertEquals(emailEntregavel("a@host.invalid"), false);
  assertEquals(emailEntregavel("a@localhost"), false);
  assertEquals(emailEntregavel("a@sub.example"), false);
  assertEquals(emailEntregavel("sem-arroba"), false);
  assertEquals(emailEntregavel("a@semtld"), false);
  assertEquals(emailEntregavel("a@exemplo.com"), true);
  assertEquals(emailEntregavel("notexample@exemplo.com.br"), true);
  assertEquals(emailEntregavel("  ti@promobrindes.com.br  "), true);
});

Deno.test("emailsEntregaveis remove não-entregáveis e preserva os válidos", () => {
  assertEquals(
    emailsEntregaveis([
      "adm01+dpv3-e2e-admin@promobrindes.com.br",
      "qa.dreno.1898876129@example.com",
      "rh.ninebox.teste@promobrindes.com.br",
      "",
      "ti@promobrindes.com.br",
    ]),
    [
      "adm01+dpv3-e2e-admin@promobrindes.com.br",
      "rh.ninebox.teste@promobrindes.com.br",
      "ti@promobrindes.com.br",
    ],
  );
});
