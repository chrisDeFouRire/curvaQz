interface Env {
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
}

const commonHeaders = {
  "x-powered-by": "curvaqz-worker"
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json(
        {
          status: "ok",
          timestamp: Date.now()
        },
        { headers: commonHeaders }
      );
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json(
        { error: "Not Found" },
        {
          status: 404,
          headers: {
            "content-type": "application/json",
            ...commonHeaders
          }
        }
      );
    }

    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }
    }

    return new Response("Not Found", { status: 404, headers: commonHeaders });
  }
};
