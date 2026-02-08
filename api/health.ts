// Minimal health check endpoint for Vercel - no external imports
export default function handler(
  _req: { method: string },
  res: { status: (code: number) => { json: (body: unknown) => void } }
) {
  res.status(200).json({
    ok: true,
    timestamp: Date.now(),
    env: {
      hasPostgresUrl: !!process.env.POSTGRES_URL,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      nodeEnv: process.env.NODE_ENV,
    },
  });
}
