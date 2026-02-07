import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import fs from "node:fs"
import path from "node:path"

const S3_ENDPOINT = process.env.S3_ENDPOINT || "https://s3.fr-par.scw.cloud"
const S3_REGION = process.env.S3_REGION || "fr-par"
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY
const S3_BUCKET = process.env.S3_BUCKET || "keytrace-storage"

if (!S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
  console.error("Missing S3_ACCESS_KEY_ID or S3_SECRET_ACCESS_KEY")
  process.exit(1)
}

const s3 = new S3Client({
  endpoint: S3_ENDPOINT,
  region: S3_REGION,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
})

const mimeTypes: Record<string, string> = {
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".map": "application/json",
  ".json": "application/json",
  ".html": "text/html; charset=utf-8",
}

async function uploadFile(filePath: string, key: string) {
  const content = fs.readFileSync(filePath)
  const ext = path.extname(filePath).toLowerCase()
  const contentType = mimeTypes[ext] || "application/octet-stream"

  console.log(`Uploading ${key} (${contentType})...`)

  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: content,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
    ACL: "public-read",
  }))

  console.log(`Uploaded: ${key}`)
}

async function uploadDirectory(dir: string, prefix: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    const key = prefix ? `${prefix}/${entry.name}` : entry.name

    if (entry.isDirectory()) {
      await uploadDirectory(fullPath, key)
    } else {
      await uploadFile(fullPath, key)
    }
  }
}

async function main() {
  const assetsDir = path.join(import.meta.dirname, "dist/client/assets")

  if (!fs.existsSync(assetsDir)) {
    console.error(`Assets directory not found: ${assetsDir}`)
    process.exit(1)
  }

  console.log(`Uploading assets from ${assetsDir} to ${S3_BUCKET}/assets/...`)
  await uploadDirectory(assetsDir, "assets")
  console.log("Done!")
  console.log(`\nAssets URL: ${S3_ENDPOINT}/${S3_BUCKET}/assets`)
}

main().catch(console.error)
