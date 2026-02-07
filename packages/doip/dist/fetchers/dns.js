import { DEFAULT_TIMEOUT } from "../constants.js";
/**
 * Fetch DNS TXT records for a domain
 * Note: This only works in Node.js environments
 */
export async function fetch(domain, options = {}) {
  // Browser environment check
  if (typeof window !== "undefined") {
    console.warn("DNS fetching is not available in browser environments");
    return null;
  }
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  try {
    // Dynamic import to avoid bundler issues in browser
    const dns = await import("dns");
    const dnsPromises = dns.promises;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("DNS timeout")), timeout);
    });
    const fetchPromise = dnsPromises.resolveTxt(domain).then((records) => ({
      domain,
      records: {
        txt: records.flat(),
      },
    }));
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (error) {
    if (error instanceof Error && error.message === "DNS timeout") {
      throw error;
    }
    // DNS lookup failed (NXDOMAIN, etc.)
    return null;
  }
}
//# sourceMappingURL=dns.js.map
