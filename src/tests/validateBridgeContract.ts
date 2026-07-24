// Bridge contract validator (P0-008: zero hardcoded secrets).
// Lê credenciais exclusivamente de variáveis de ambiente.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    '[validateBridgeContract] Defina SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY ' +
      '(ou SUPABASE_ANON_KEY) no ambiente antes de executar.',
  );
}

const bridgeUrl = `${SUPABASE_URL}/functions/v1/external-db-bridge`;

async function validateBridge() {
  console.log('🚀 Iniciando validação de contrato do external-db-bridge...');

  const tests = [
    {
      name: 'SELECT Simples (Empresas)',
      payload: { action: 'select', table: 'empresas', limit: 1 }
    },
    {
      name: 'SELECT com Filtros (Colaboradores)',
      payload: { 
        action: 'select', 
        table: 'colaboradores', 
        filters: [{ column: 'status', op: 'eq', value: 'ativo' }],
        limit: 1 
      }
    }
  ];

  for (const test of tests) {
    process.stdout.write(`Testing ${test.name}... `);
    try {
      const res = await fetch(bridgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify(test.payload)
      });

      const json: any = await res.json();

      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }

      if (!('data' in json)) {
        throw new Error('Resposta não contém campo "data"');
      }

      console.log('✅ PASS');
    } catch (err: any) {
      console.log(`❌ FAIL: ${err.message || 'Erro desconhecido'}`);
      process.exit(1);
    }
  }

  console.log('\n✨ Todos os contratos fundamentais (SELECT) validados com sucesso!');
}

validateBridge();
