import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cookieSession from "cookie-session";
import type { ViteDevServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === "production";
const port = process.env.PORT || 3000;
const publicUrl = process.env.PUBLIC_URL || `http://127.0.0.1:${port}`;

async function createServer() {
  const app = express();

  // Trust proxy for ngrok/reverse proxies
  app.set("trust proxy", 1);

  // Session middleware
  app.use(
    cookieSession({
      name: "session",
      keys: [process.env.SESSION_SECRET || "dev-secret-change-in-production"],
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: publicUrl.startsWith("https"),
      httpOnly: true,
      sameSite: "lax",
    }),
  );

  // Auth routes (must be before Vite middleware to avoid being caught by SSR)
  const { authRouter } = await import("./src/server/auth-routes");
  app.use(authRouter);

  let vite: ViteDevServer | undefined;

  if (!isProduction) {
    const { createServer } = await import("vite");
    vite = await createServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);
  } else {
    const compression = (await import("compression")).default;
    const sirv = (await import("sirv")).default;
    app.use(compression());
    app.use(sirv(path.join(__dirname, "dist/client"), { extensions: [] }));
  }

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      let template: string;
      let render: (url: string) => Promise<string>;

      if (!isProduction && vite) {
        template = fs.readFileSync(path.join(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        const mod = await vite.ssrLoadModule("/src/entry-server.tsx");
        render = mod.render;
      } else {
        template = fs.readFileSync(
          path.join(__dirname, "dist/client/index.html"),
          "utf-8",
        );
        const mod = await import("./dist/server/entry-server.js");
        render = mod.render;
      }

      const appHtml = await render(url);
      const html = template.replace("<!--ssr-outlet-->", appHtml);

      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      if (vite) {
        vite.ssrFixStacktrace(e as Error);
      }
      next(e);
    }
  });

  app.listen(port, () => {
    console.log(`Server running at http://127.0.0.1:${port}`);
    console.log(`OAuth configured for: ${publicUrl}`);
  });
}

createServer();
