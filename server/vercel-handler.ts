import { createExpressMiddleware } from "@trpc/server/adapters/express";
import type { Request, Response } from "express";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";

// Vercel Serverless Function handler for tRPC API
export default async function handler(req: Request, res: Response) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    // Vercel provides Node.js IncomingMessage, not Express Request.
    // The tRPC Express adapter reads req.path to determine the procedure name.
    // In Express, app.use('/api/trpc', middleware) sets req.path relative to the mount.
    // In Vercel, we must strip the prefix manually.
    const urlPath = (req.url || "/").split("?")[0];
    (req as any).path = urlPath.replace(/^\/api\/trpc\/?/, "/");

    const trpcHandler = createExpressMiddleware({
      router: appRouter,
      createContext,
    });

    // Provide a next() function in case the middleware calls it on error
    await new Promise<void>((resolve, reject) => {
      trpcHandler(req, res, (err?: unknown) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });

      // Also resolve when the response finishes
      res.on("finish", resolve);
    });
  } catch (error) {
    console.error("[API] tRPC handler error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal server error",
        message: String(error),
      });
    }
  }
}
