import { headers, cookies } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { ACTIVE_ORG_COOKIE_NAME } from "@/lib/organization/cookies";

export async function createTRPCContext() {
  const reqHeaders = await headers();
  const cookieStore = await cookies();
  const session = await auth.api.getSession({
    headers: reqHeaders,
  });
  const activeOrgCookie =
    cookieStore.get(ACTIVE_ORG_COOKIE_NAME)?.value ?? null;

  return {
    db,
    session: session?.session ?? null,
    user: session?.user ?? null,
    headers: reqHeaders,
    activeOrgCookie,
  };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
