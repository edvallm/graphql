const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      const target = 'https://platform.zone01.gr' + url.pathname + url.search;
      const proxied = await fetch(target, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      const response = new Response(proxied.body, proxied);
      Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v));
      return response;
    }

    // Serve static assets for everything else
    return env.ASSETS.fetch(request);
  },
};
