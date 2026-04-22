import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "fundamentals_session";
const USER_COOKIE = "fundamentals_user";

export async function getOrCreateUser() {
  const cookieStore = await cookies();
  const existingUserId = cookieStore.get(USER_COOKIE)?.value;

  if (existingUserId) {
    const user = await prisma.user.findUnique({ where: { id: existingUserId } });
    if (user) return user;
  }

  const user = await prisma.user.create({ data: {} });
  return user;
}

export async function getOrCreateSession(userId: string) {
  const cookieStore = await cookies();
  const existingSessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (existingSessionId) {
    const session = await prisma.session.findFirst({
      where: { id: existingSessionId, userId, endedAt: null },
    });
    if (session) return session;
  }

  const session = await prisma.session.create({ data: { userId } });
  return session;
}
