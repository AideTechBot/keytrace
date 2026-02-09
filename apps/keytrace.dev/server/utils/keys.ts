import crypto from "node:crypto";
import { getKeytraceAgent } from "./keytrace-agent";
import { useS3, loadJson, saveJson } from "./storage";

export interface KeyPair {
  privateKey: crypto.KeyObject;
  publicKey: crypto.KeyObject;
  publicJwk: JsonWebKey;
  privateJwk: JsonWebKey;
}

/** In-memory cache for the current day's key to avoid repeated S3 lookups. */
let _cachedKey: { date: string; keyPair: KeyPair } | null = null;

/**
 * Get or create today's signing key.
 * Keys are lazily generated on first use each day, stored in S3 (or .data/ in dev),
 * and the public key is published to keytrace's ATProto repo.
 */
export async function getOrCreateTodaysKey(): Promise<KeyPair> {
  const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

  // Fast path: in-memory cache
  if (_cachedKey && _cachedKey.date === today) {
    return _cachedKey.keyPair;
  }

  // Try loading from storage
  const stored = await loadKeyFromStorage(`keys/${today}.jwk`);
  if (stored) {
    const keyPair = jwkToKeyPair(stored);
    _cachedKey = { date: today, keyPair };
    return keyPair;
  }

  // Generate new key pair for today
  const keyPair = generateES256KeyPair();

  // Save private key to storage
  await saveKeyToStorage(`keys/${today}.jwk`, keyPair.privateJwk);

  // Publish public key to ATProto
  await publishKeyToATProto(today, keyPair.publicJwk);

  _cachedKey = { date: today, keyPair };
  return keyPair;
}

/**
 * Generate an ECDSA P-256 key pair (ES256).
 */
export function generateES256KeyPair(): KeyPair {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", {
    namedCurve: "P-256",
  });

  const privateJwk = privateKey.export({ format: "jwk" });
  const publicJwk = publicKey.export({ format: "jwk" });

  return { privateKey, publicKey, publicJwk, privateJwk };
}

/**
 * Convert a stored JWK (private key with d parameter) back into a KeyPair.
 */
function jwkToKeyPair(jwk: JsonWebKey): KeyPair {
  const privateKey = crypto.createPrivateKey({ key: jwk as any, format: "jwk" });
  const publicKey = crypto.createPublicKey(privateKey);
  const publicJwk = publicKey.export({ format: "jwk" });

  return { privateKey, publicKey, publicJwk, privateJwk: jwk };
}

/**
 * Publish a public key to keytrace's ATProto repo as a dev.keytrace.key record.
 * Record key = date (YYYY-MM-DD).
 * Skipped in local dev mode (when not using S3).
 */
async function publishKeyToATProto(date: string, publicJwk: JsonWebKey): Promise<void> {
  if (!useS3()) {
    console.log(`[keys] Skipping ATProto publish in local dev mode (date=${date})`);
    return;
  }

  try {
    const agent = await getKeytraceAgent();
    const config = useRuntimeConfig();

    await agent.com.atproto.repo.putRecord({
      repo: config.keytraceDid,
      collection: "dev.keytrace.key",
      rkey: date,
      record: {
        $type: "dev.keytrace.key",
        publicJwk: JSON.stringify(publicJwk),
        validFrom: `${date}T00:00:00.000Z`,
        validUntil: `${date}T23:59:59.999Z`,
      },
    });

    console.log(`[keys] Published signing key for ${date} to ATProto`);
  } catch (error) {
    console.error(`[keys] Failed to publish key to ATProto:`, error);
    // Don't throw - key is still usable locally even if ATProto publish fails
  }
}

/**
 * Get the strong ref (URI + CID) for today's key record.
 * Returns a local placeholder in dev mode (when not using S3).
 * Ensures the key is published to ATProto if it doesn't exist yet.
 */
export async function getTodaysKeyRef(): Promise<{
  uri: string;
  cid: string;
}> {
  const today = new Date().toISOString().split("T")[0];
  const config = useRuntimeConfig();

  if (!useS3()) {
    // Return a local placeholder in dev mode
    return {
      uri: `at://${config.keytraceDid}/dev.keytrace.key/${today}`,
      cid: "local-dev-key",
    };
  }

  const agent = await getKeytraceAgent();

  // Try to get existing record
  try {
    const response = await agent.com.atproto.repo.getRecord({
      repo: config.keytraceDid,
      collection: "dev.keytrace.key",
      rkey: today,
    });

    return {
      uri: response.data.uri,
      cid: response.data.cid!,
    };
  } catch (e: any) {
    // If record not found, ensure key exists and publish it
    if (e.error === "RecordNotFound") {
      const keyPair = await getOrCreateTodaysKey();
      await publishKeyToATProto(today, keyPair.publicJwk);

      // Fetch the newly published record to get its CID
      const response = await agent.com.atproto.repo.getRecord({
        repo: config.keytraceDid,
        collection: "dev.keytrace.key",
        rkey: today,
      });

      return {
        uri: response.data.uri,
        cid: response.data.cid!,
      };
    }
    throw e;
  }
}

// --- Storage helpers (using shared storage utilities) ---

async function loadKeyFromStorage(key: string): Promise<JsonWebKey | null> {
  return loadJson<JsonWebKey>(key);
}

async function saveKeyToStorage(key: string, jwk: JsonWebKey): Promise<void> {
  return saveJson(key, jwk);
}
