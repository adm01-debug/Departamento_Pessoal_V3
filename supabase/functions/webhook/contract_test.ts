import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

const WEBHOOK_URL = "http://localhost:54321/functions/v1/webhook";
const RUN_LOCAL_EDGE_TESTS = Deno.env.get("RUN_LOCAL_EDGE_TESTS") === "1";

function localEdgeTest(name: string, fn: () => void | Promise<void>): void {
  Deno.test({ name, ignore: !RUN_LOCAL_EDGE_TESTS, fn });
}

localEdgeTest("Webhook Contract - Valid Payload V1", async () => {
  const payload = {
    event: "user.created",
    data: { id: "123", name: "John Doe" },
    version: "v1"
  };

  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const body = await response.json();
  assertEquals(response.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.version, "v1");
});

localEdgeTest("Webhook Contract - Valid Payload V2", async () => {
  const payload = {
    event: "user.updated",
    data: { id: "123", status: "active" },
    version: "v2"
  };

  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const body = await response.json();
  assertEquals(response.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.version, "v2");
});

localEdgeTest("Webhook Contract - Error 422: Missing event", async () => {
  const payload = {
    data: { id: "123" }
  };

  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const body = await response.json();
  assertEquals(response.status, 422);
  assertEquals(body.error.code, "VALIDATION_ERROR");
  assertEquals(body.error.fields[0].field, "event");
  assertEquals(body.error.fields[0].message, "Evento é obrigatório");
});

localEdgeTest("Webhook Contract - Error 422: Wrong type for data", async () => {
  const payload = {
    event: "test",
    data: "should-be-object"
  };

  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const body = await response.json();
  assertEquals(response.status, 422);
  assertEquals(body.error.code, "VALIDATION_ERROR");
  assertEquals(body.error.fields[0].field, "data");
});

localEdgeTest("Webhook Contract - Error 422: Invalid timestamp format", async () => {
  const payload = {
    event: "test",
    data: {},
    timestamp: "not-a-date"
  };

  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const body = await response.json();
  assertEquals(response.status, 422);
  assertEquals(body.error.code, "VALIDATION_ERROR");
  assertEquals(body.error.fields[0].field, "timestamp");
});

localEdgeTest("Webhook Contract - Error 400: Invalid JSON", async () => {
  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: "{ invalid: json "
  });

  const body = await response.json();
  assertEquals(response.status, 400);
  assertEquals(body.error.code, "INVALID_JSON");
});
