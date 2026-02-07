// Cloudflare Pages Functions middleware to serve index.html for all routes
export async function onRequest(context) {
  const url = new URL(context.request.url);

  // If requesting root, serve index.html
  if (url.pathname === '/') {
    return context.env.ASSETS.fetch(new Request(new URL('/index.html', url.origin)));
  }

  // Otherwise try the requested asset
  const response = await context.next();

  // If 404, serve index.html (for client-side routing)
  if (response.status === 404) {
    return context.env.ASSETS.fetch(new Request(new URL('/index.html', url.origin)));
  }

  return response;
}
