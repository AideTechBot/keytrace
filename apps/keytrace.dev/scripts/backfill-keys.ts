/**
 * Backfill public keys to keytrace's ATProto repository.
 *
 * Reads existing keys from S3 storage and publishes them to ATProto
 * as dev.keytrace.key records.
 *
 * Usage:
 *   node --env-file=.env scripts/backfill-keys.ts [date...]
 *
 * Examples:
 *   node --env-file=.env scripts/backfill-keys.ts                       # backfill today's key
 *   node --env-file=.env scripts/backfill-keys.ts 2026-02-09            # backfill specific date
 *   node --env-file=.env scripts/backfill-keys.ts 2026-02-08 2026-02-09 # backfill multiple dates
 */

import crypto from "node:crypto";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { AtpAgent } from "@atproto/api";

const env = {
  s3Bucket: process.env.S3_BUCKET!,
  s3Region: process.env.S3_REGION || "fr-par",
  s3Endpoint: process.env.S3_ENDPOINT,
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID!,
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  keytraceDid: process.env.NUXT_KEYTRACE_DID!,
  keytracePassword: process.env.NUXT_KEYTRACE_PASSWORD!,
};

function getS3Client(): S3Client {
  const config: ConstructorParameters<typeof S3Client>[0] = {
    region: env.s3Region,
    credentials: {
      accessKeyId: env.s3AccessKeyId,
      secretAccessKey: env.s3SecretAccessKey,
    },
  };
  if (env.s3Endpoint) {
    config.endpoint = env.s3Endpoint;
    config.forcePathStyle = true;
  }
  return new S3Client(config);
}

async function loadKeyFromS3(key: string): Promise<JsonWebKey | null> {
  try {
    const response = await getS3Client().send(
      new GetObjectCommand({
        Bucket: env.s3Bucket,
        Key: key,
      }),
    );
    const body = await response.Body?.transformToString();
    return body ? JSON.parse(body) : null;
  } catch (e: any) {
    if (e.name === "NoSuchKey") return null;
    throw e;
  }
}

function jwkToPublicJwk(privateJwk: JsonWebKey): JsonWebKey {
  const privateKey = crypto.createPrivateKey({ key: privateJwk as any, format: "jwk" });
  const publicKey = crypto.createPublicKey(privateKey);
  return publicKey.export({ format: "jwk" });
}

async function getAtpAgent(): Promise<AtpAgent> {
  const agent = new AtpAgent({ service: "https://bsky.social" });
  await agent.login({
    identifier: env.keytraceDid,
    password: env.keytracePassword,
  });
  return agent;
}

async function keyExistsInATProto(agent: AtpAgent, date: string): Promise<boolean> {
  try {
    await agent.com.atproto.repo.getRecord({
      repo: env.keytraceDid,
      collection: "dev.keytrace.key",
      rkey: date,
    });
    return true;
  } catch {
    return false;
  }
}

async function publishKeyToATProto(agent: AtpAgent, date: string, publicJwk: JsonWebKey): Promise<void> {
  await agent.com.atproto.repo.putRecord({
    repo: env.keytraceDid,
    collection: "dev.keytrace.key",
    rkey: date,
    record: {
      $type: "dev.keytrace.key",
      publicJwk: JSON.stringify(publicJwk),
      validFrom: `${date}T00:00:00.000Z`,
      validUntil: `${date}T23:59:59.999Z`,
    },
  });
}

async function backfillKey(agent: AtpAgent, date: string): Promise<boolean> {
  console.log(`[${date}] Loading key from S3...`);

  const privateJwk = await loadKeyFromS3(`keys/${date}.jwk`);
  if (!privateJwk) {
    console.log(`[${date}] Key not found in S3, skipping`);
    return false;
  }

  const exists = await keyExistsInATProto(agent, date);
  if (exists) {
    console.log(`[${date}] Key already exists in ATProto, skipping`);
    return false;
  }

  const publicJwk = jwkToPublicJwk(privateJwk);
  console.log(`[${date}] Publishing to ATProto...`);

  await publishKeyToATProto(agent, date, publicJwk);
  console.log(`[${date}] Published successfully`);
  return true;
}

async function main() {
  // Validate required env vars
  const missing = [];
  if (!env.s3Bucket) missing.push("S3_BUCKET");
  if (!env.s3AccessKeyId) missing.push("S3_ACCESS_KEY_ID");
  if (!env.s3SecretAccessKey) missing.push("S3_SECRET_ACCESS_KEY");
  if (!env.keytraceDid) missing.push("NUXT_KEYTRACE_DID");
  if (!env.keytracePassword) missing.push("NUXT_KEYTRACE_PASSWORD");

  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }

  console.log(`Storage: S3 (${env.s3Bucket})`);

  const args = process.argv.slice(2);
  const agent = await getAtpAgent();
  console.log(`Authenticated as ${env.keytraceDid}\n`);

  let dates: string[];

  if (args.length > 0) {
    dates = args.filter((arg) => /^\d{4}-\d{2}-\d{2}$/.test(arg));
    if (dates.length === 0) {
      console.error("Invalid date format. Use YYYY-MM-DD");
      process.exit(1);
    }
  } else {
    // Default to today
    dates = [new Date().toISOString().split("T")[0]];
  }

  console.log(`Keys to backfill: ${dates.join(", ")}\n`);

  let published = 0;
  let skipped = 0;

  for (const date of dates) {
    const wasPublished = await backfillKey(agent, date);
    if (wasPublished) published++;
    else skipped++;
  }

  console.log(`\nDone. Published: ${published}, Skipped: ${skipped}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
