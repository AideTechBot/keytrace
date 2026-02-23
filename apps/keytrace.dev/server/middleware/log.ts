/**
 * Request logging middleware.
 *
 * Logs method, path, status code, and response time for every request.
 * Skips noisy asset paths (/_nuxt/, __og-image__ dev UI, favicon).
 */

const SKIP_PREFIXES = ["/_nuxt/", "/__nuxt_devtools__", "/__og-image__/", "/favicon.ico"];

export default defineEventHandler((event) => {
  const start = Date.now();
  const method = event.method;
  const path = event.path;

  // Skip static asset noise
  if (SKIP_PREFIXES.some((p) => path.startsWith(p))) return;

  event.node.res.on("finish", () => {
    const status = event.node.res.statusCode;
    const ms = Date.now() - start;
    const line = `${method} ${path} ${status} ${ms}ms`;

    if (status >= 500) {
      console.error(`[http] ${line}`);
    } else if (status >= 400) {
      console.warn(`[http] ${line}`);
    } else {
      console.log(`[http] ${line}`);
    }
  });
});
