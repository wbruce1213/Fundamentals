import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const USER_COOKIE = "fundamentals_user";
const SESSION_COOKIE = "fundamentals_session";

export async function POST() {
  const cookieStore = await cookies();

  let userId = cookieStore.get(USER_COOKIE)?.value;
  let user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;

  if (!user) {
    user = await prisma.user.create({ data: {} });
    userId = user.id;
  }

  const session = await prisma.session.create({ data: { userId: user.id } });

  const response = NextResponse.json({ userId: user.id, sessionId: session.id });
  response.cookies.set(USER_COOKIE, user.id, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  response.cookies.set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return response;
}
