import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";

export async function createTRPCContext() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({
    headers: reqHeaders,
  });

  return {
    db,
    session: session?.session ?? null,
    user: session?.user ?? null,
    headers: reqHeaders,
  };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
