// Load test do external-db-bridge (PGBouncer path) com k6.
//
// Pré-requisitos:
//   brew install k6 (ou https://k6.io/docs/getting-started/installation)
//   export BRIDGE_URL=https://<projeto>.supabase.co/functions/v1/external-db-bridge
//   export BRIDGE_TOKEN=<token de sessão admin>
//
// Uso:
//   k6 run scripts/load/bridge-load.k6.js
//   k6 run --vus 20 --duration 2m scripts/load/bridge-load.k6.js
//
// NÃO apontar para produção sem autorização — use ambiente/staging.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('bridge_errors');
const latency = new Trend('bridge_latency', true);

export const options = {
  scenarios: {
    read_queries: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },   // warm-up
        { duration: '1m', target: 10 },   // carga nominal
        { duration: '30s', target: 20 },  // pico curto
        { duration: '30s', target: 0 },   // cool-down
      ],
    },
  },
  thresholds: {
    // Alinhado aos SLOs em docs/SLO.md
    'bridge_latency': ['p(95)<2000'],
    'bridge_errors': ['rate<0.02'],
    'http_req_failed': ['rate<0.02'],
  },
};

const BASE = __ENV.BRIDGE_URL;
const TOKEN = __ENV.BRIDGE_TOKEN;

export default function () {
  const res = http.post(
    BASE,
    JSON.stringify({
      query: 'SELECT id, nome FROM public.colaboradores LIMIT $1',
      params: [25],
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      timeout: '10s',
    },
  );

  const ok = check(res, {
    'status 200': (r) => r.status === 200,
    'sem erro de bridge': (r) => !r.json('error'),
  });
  errorRate.add(!ok);
  latency.add(res.timings.duration);

  sleep(0.5);
}
