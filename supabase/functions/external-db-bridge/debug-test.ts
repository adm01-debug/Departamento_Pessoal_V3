// DEBUG TEST - Remove after diagnosis
Deno.serve(async (req) => {
  const body = await req.text().catch(() => 'PARSE_ERROR');
  console.log('[DEBUG] Origin:', req.headers.get('origin'));
  console.log('[DEBUG] Authorization:', req.headers.get('authorization')?.slice(0, 50));
  console.log('[DEBUG] apikey:', req.headers.get('apikey')?.slice(0, 50));
  console.log('[DEBUG] Content-Type:', req.headers.get('content-type'));
  console.log('[DEBUG] Body preview:', body?.slice(0, 100));
  return new Response(JSON.stringify({
    debug: true,
    origin: req.headers.get('origin'),
    hasAuth: !!req.headers.get('authorization'),
    body: body?.slice(0, 100)
  }), {
    headers: {
      'Access-Control-Allow-Origin': req.headers.get('origin') || 'http://localhost:8081',
      'Content-Type': 'application/json'
    }
  });
});
