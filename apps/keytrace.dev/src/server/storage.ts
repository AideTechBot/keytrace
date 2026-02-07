import fs from "node:fs"
import path from "node:path"
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3"
import type {
  NodeSavedSession,
  NodeSavedSessionStore,
  NodeSavedState,
  NodeSavedStateStore,
} from "@atproto/oauth-client-node"

// Use S3 storage if configured, otherwise fall back to file storage
const useS3 = Boolean(process.env.S3_BUCKET)

// Scaleway Object Storage is S3-compatible
// Endpoint: https://s3.{region}.scw.cloud
const s3Client = useS3
  ? new S3Client({
      region: process.env.S3_REGION || "fr-par",
      endpoint:
        process.env.S3_ENDPOINT ||
        `https://s3.${process.env.S3_REGION || "fr-par"}.scw.cloud`,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true, // Required for Scaleway S3
    })
  : null

const S3_BUCKET = process.env.S3_BUCKET || ""

// S3-based storage for production
class S3SessionStore implements NodeSavedSessionStore {
  private prefix = "sessions/"

  async get(key: string): Promise<NodeSavedSession | undefined> {
    try {
      const response = await s3Client!.send(
        new GetObjectCommand({
          Bucket: S3_BUCKET,
          Key: `${this.prefix}${key}.json`,
        })
      )
      const body = await response.Body?.transformToString()
      return body ? JSON.parse(body) : undefined
    } catch (e: any) {
      if (e.name === "NoSuchKey") return undefined
      throw e
    }
  }

  async set(key: string, value: NodeSavedSession): Promise<void> {
    await s3Client!.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: `${this.prefix}${key}.json`,
        Body: JSON.stringify(value),
        ContentType: "application/json",
      })
    )
  }

  async del(key: string): Promise<void> {
    await s3Client!.send(
      new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: `${this.prefix}${key}.json`,
      })
    )
  }
}

class S3StateStore implements NodeSavedStateStore {
  private prefix = "states/"

  async get(key: string): Promise<NodeSavedState | undefined> {
    try {
      const response = await s3Client!.send(
        new GetObjectCommand({
          Bucket: S3_BUCKET,
          Key: `${this.prefix}${key}.json`,
        })
      )
      const body = await response.Body?.transformToString()
      return body ? JSON.parse(body) : undefined
    } catch (e: any) {
      if (e.name === "NoSuchKey") return undefined
      throw e
    }
  }

  async set(key: string, value: NodeSavedState): Promise<void> {
    await s3Client!.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: `${this.prefix}${key}.json`,
        Body: JSON.stringify(value),
        ContentType: "application/json",
      })
    )
  }

  async del(key: string): Promise<void> {
    await s3Client!.send(
      new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: `${this.prefix}${key}.json`,
      })
    )
  }
}

// File-based storage for local development
const DATA_DIR = path.join(process.cwd(), ".data")

if (!useS3 && !fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

class FileSessionStore implements NodeSavedSessionStore {
  private file = path.join(DATA_DIR, "sessions.json")

  private read(): Record<string, NodeSavedSession> {
    try {
      return JSON.parse(fs.readFileSync(this.file, "utf-8"))
    } catch {
      return {}
    }
  }

  private write(data: Record<string, NodeSavedSession>): void {
    fs.writeFileSync(this.file, JSON.stringify(data, null, 2))
  }

  async get(key: string): Promise<NodeSavedSession | undefined> {
    return this.read()[key]
  }

  async set(key: string, value: NodeSavedSession): Promise<void> {
    const data = this.read()
    data[key] = value
    this.write(data)
  }

  async del(key: string): Promise<void> {
    const data = this.read()
    delete data[key]
    this.write(data)
  }
}

class FileStateStore implements NodeSavedStateStore {
  private file = path.join(DATA_DIR, "states.json")

  private read(): Record<string, NodeSavedState> {
    try {
      return JSON.parse(fs.readFileSync(this.file, "utf-8"))
    } catch {
      return {}
    }
  }

  private write(data: Record<string, NodeSavedState>): void {
    fs.writeFileSync(this.file, JSON.stringify(data, null, 2))
  }

  async get(key: string): Promise<NodeSavedState | undefined> {
    return this.read()[key]
  }

  async set(key: string, value: NodeSavedState): Promise<void> {
    const data = this.read()
    data[key] = value
    this.write(data)
  }

  async del(key: string): Promise<void> {
    const data = this.read()
    delete data[key]
    this.write(data)
  }
}

// Log which storage mode is active
console.log(
  useS3
    ? `Session storage: S3 (${S3_BUCKET})`
    : "Session storage: File (.data/)"
)

// Export the appropriate stores based on environment
export const SessionStore = useS3 ? S3SessionStore : FileSessionStore
export const StateStore = useS3 ? S3StateStore : FileStateStore
