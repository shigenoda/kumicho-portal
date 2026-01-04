import "dotenv/config";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import type { Request, Response } from "express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

// Vercel Serverless Function用のハンドラー
export default async function handler(req: Request, res: Response) {
  // CORSヘッダーを設定
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // tRPC APIハンドラー
  const trpcHandler = createExpressMiddleware({
    router: appRouter,
    createContext,
  });

  return trpcHandler(req, res);
}
