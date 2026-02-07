import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3"

const s3 = new S3Client({
  region: "fr-par",
  endpoint: "https://s3.fr-par.scw.cloud",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: true,
})

async function main() {
  const stateKey = process.argv[2]

  if (stateKey) {
    // Check specific state
    const { GetObjectCommand } = await import("@aws-sdk/client-s3")
    try {
      const result = await s3.send(
        new GetObjectCommand({ Bucket: "keytrace-storage", Key: `states/${stateKey}.json` })
      )
      const body = await result.Body?.transformToString()
      console.log("State found:", body)
    } catch (e: any) {
      console.log("State not found:", e.name)
    }
    return
  }

  const states = await s3.send(
    new ListObjectsV2Command({ Bucket: "keytrace-storage", Prefix: "states/" })
  )
  console.log("States:", states.Contents?.map((c) => c.Key) || "none")

  const sessions = await s3.send(
    new ListObjectsV2Command({ Bucket: "keytrace-storage", Prefix: "sessions/" })
  )
  console.log("Sessions:", sessions.Contents?.map((c) => c.Key) || "none")
}

main().catch(console.error)
