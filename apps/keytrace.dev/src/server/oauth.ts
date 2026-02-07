import { NodeOAuthClient } from "@atproto/oauth-client-node"
import { SessionStore, StateStore } from "./storage"

// For local dev, use 127.0.0.1 (RFC 8252 requires loopback IP, not "localhost")
// For production or ngrok, set PUBLIC_URL env var (e.g., https://xyz.ngrok-free.app)
const PUBLIC_URL = (process.env.PUBLIC_URL || "http://127.0.0.1:3000").replace(/\/$/, "")

// Client metadata that will be served at /.well-known/oauth-client-metadata.json
export const clientMetadata = {
  client_id: `${PUBLIC_URL}/.well-known/oauth-client-metadata.json`,
  client_name: "keytrace.dev",
  client_uri: PUBLIC_URL,
  redirect_uris: [`${PUBLIC_URL}/oauth/callback`] as [string],
  grant_types: ["authorization_code", "refresh_token"] as ["authorization_code", "refresh_token"],
  response_types: ["code"] as ["code"],
  scope: "atproto transition:generic",
  token_endpoint_auth_method: "none" as const,
  application_type: "web" as const,
  dpop_bound_access_tokens: true,
}

let oauthClient: NodeOAuthClient | null = null

export function getOAuthClient(): NodeOAuthClient {
  if (!oauthClient) {
    oauthClient = new NodeOAuthClient({
      clientMetadata,
      stateStore: new StateStore(),
      sessionStore: new SessionStore(),
    })
  }
  return oauthClient
}
