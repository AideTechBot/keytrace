import fs from "node:fs"
import path from "node:path"
import express from "express"
import cookieSession from "cookie-session"
import serverless from "serverless-http"
import compression from "compression"
import { renderToString } from "react-dom/server"
import { createElement } from "react"
import { authRouter } from "./src/server/auth-routes"
import { App } from "./src/App"

// Get directory of this file (works in CJS bundle)
const baseDir = typeof __dirname !== "undefined" ? __dirname : path.dirname(new URL(import.meta.url).pathname)
const publicUrl = process.env.PUBLIC_URL || "http://127.0.0.1:8080"

// S3 bucket URL for static assets
const assetsUrl = process.env.ASSETS_URL || "/assets"

const app = express()

// Trust proxy for serverless
app.set("trust proxy", 1)

// Redirect /assets requests to S3 if ASSETS_URL is set
if (process.env.ASSETS_URL) {
  app.get("/assets/*", (req, res) => {
    const assetPath = req.path.replace("/assets", "")
    res.redirect(301, `${process.env.ASSETS_URL}${assetPath}`)
  })
}

// Compression
app.use(compression())

// Session middleware
const isProduction = publicUrl.startsWith("https")
app.use(
  cookieSession({
    name: "session",
    keys: [process.env.SESSION_SECRET || "dev-secret-change-in-production"],
    maxAge: 24 * 60 * 60 * 1000,
    secure: isProduction,
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax", // "none" required for cross-site OAuth redirects
  })
)

// Read template at startup
let template = ""
try {
  const templatePath = path.join(baseDir, "client/index.html")
  template = fs.readFileSync(templatePath, "utf-8")
  console.log("Loaded template from:", templatePath)
} catch (e) {
  console.log("Template not found, using fallback. Error:", e)
  template = `<!DOCTYPE html><html><head><title>keytrace.dev</title></head><body><div id="app"><!--ssr-outlet--></div></body></html>`
}

// Auth routes
app.use(authRouter)

// SSR handler - catch-all for pages (not API routes)
app.get("*", (req, res, next) => {
  // API routes should already be handled by authRouter above
  if (req.path.startsWith("/oauth") || req.path.startsWith("/.well-known")) {
    res.status(404).json({ error: "Not found" })
    return
  }

  try {
    const appHtml = renderToString(createElement(App))
    const html = template.replace("<!--ssr-outlet-->", appHtml)
    res.status(200).set({ "Content-Type": "text/html" }).end(html)
  } catch (e) {
    console.error("SSR Error:", e)
    next(e)
  }
})

// Export handler for Scaleway Functions
// Configure serverless-http to handle binary responses
export const handle = serverless(app, {
  binary: ["application/javascript", "text/javascript", "text/css", "application/json", "image/*"],
})
