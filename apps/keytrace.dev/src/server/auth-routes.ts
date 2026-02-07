import { Router } from "express"
import { getOAuthClient, clientMetadata } from "./oauth"

export const authRouter = Router()

// Serve client metadata for OAuth discovery
authRouter.get("/.well-known/oauth-client-metadata.json", (_req, res) => {
  res.json(clientMetadata)
})

// Initiate OAuth login
authRouter.get("/oauth/login", async (req, res) => {
  try {
    const handle = req.query.handle as string
    if (!handle) {
      res.status(400).json({ error: "Missing handle parameter" })
      return
    }

    const client = getOAuthClient()
    const url = await client.authorize(handle, {
      scope: "atproto transition:generic",
    })

    res.redirect(url.toString())
  } catch (error) {
    console.error("OAuth login error:", error)
    res.status(500).json({
      error: "Failed to initiate OAuth",
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
  }
})

// OAuth callback
authRouter.get("/oauth/callback", async (req, res) => {
  try {
    const params = new URLSearchParams(req.url.split("?")[1])
    const client = getOAuthClient()

    console.log("OAuth callback params:", Object.fromEntries(params))

    const { session } = await client.callback(params)
    const did = session.did

    console.log("OAuth session created for DID:", did)

    // Store DID in session cookie
    req.session!.did = did

    res.redirect("/")
  } catch (error) {
    console.error("OAuth callback error:", error)
    res.status(500).json({ error: "OAuth callback failed", details: String(error) })
  }
})

// Get current session
authRouter.get("/oauth/session", async (req, res) => {
  const did = req.session?.did
  console.log("Session check - DID from cookie:", did)
  console.log("Full session:", req.session)

  if (!did) {
    res.json({ authenticated: false })
    return
  }

  try {
    // Use public API to get profile (doesn't need OAuth)
    const response = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`
    )
    const profile = await response.json()

    res.json({
      authenticated: true,
      did,
      handle: profile.handle,
      displayName: profile.displayName,
      avatar: profile.avatar,
    })
  } catch (error) {
    console.error("Profile fetch error:", error)
    res.json({
      authenticated: true,
      did,
    })
  }
})

// Logout
authRouter.post("/oauth/logout", async (req, res) => {
  const did = req.session?.did
  if (did) {
    try {
      const client = getOAuthClient()
      await client.revoke(did)
    } catch {
      // Ignore revocation errors
    }
  }

  req.session = null
  res.json({ success: true })
})
