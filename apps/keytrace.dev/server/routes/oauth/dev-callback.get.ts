/**
 * GET /oauth/dev-callback
 *
 * Forwards OAuth callback params to localhost for local development.
 * Production serves this route so that dev clients using the production
 * client_id can receive OAuth redirects back to their local server.
 */
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  const localUrl = new URL("/oauth/callback" + url.search, "http://127.0.0.1:3000");
  return sendRedirect(event, localUrl.toString());
});
