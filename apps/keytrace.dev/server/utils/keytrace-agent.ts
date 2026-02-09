import { AtpAgent } from "@atproto/api";

let _agent: AtpAgent | null = null;

/**
 * Get a singleton ATProto agent authenticated as the keytrace service account.
 * Uses app password credentials from runtime config.
 */
export async function getKeytraceAgent(): Promise<AtpAgent> {
  if (!_agent) {
    const config = useRuntimeConfig();
    if (!config.keytraceDid || !config.keytracePassword) {
      throw new Error("Missing NUXT_KEYTRACE_DID or NUXT_KEYTRACE_PASSWORD environment variables");
    }

    _agent = new AtpAgent({ service: "https://bsky.social" });
    await _agent.login({ identifier: config.keytraceDid, password: config.keytracePassword });
  }
  return _agent;
}
