import jwt, { type JwtPayload } from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "./prisma";
import { verifyPassword } from "./password";

export const SESSION_COOKIE_NAME = "maths4u_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "TEACHER";
};

type SessionPayload = JwtPayload & {
  sub: string;
  email: string;
  role: "ADMIN" | "TEACHER";
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 24) {
    throw new Error("JWT_SECRET must be set to a long random value.");
  }

  return secret;
}

function signSession(user: AuthUser) {
  return jwt.sign(
    {
      email: user.email,
      role: user.role,
    },
    getJwtSecret(),
    {
      expiresIn: SESSION_MAX_AGE_SECONDS,
      subject: user.id,
    },
  );
}

function verifySessionToken(token: string): SessionPayload | null {
  try {
    const payload = jwt.verify(token, getJwtSecret());

    if (
      typeof payload === "object" &&
      typeof payload.sub === "string" &&
      typeof payload.email === "string" &&
      (payload.role === "ADMIN" || payload.role === "TEACHER")
    ) {
      return payload as SessionPayload;
    }

    return null;
  } catch {
    return null;
  }
}

export async function authenticateAdmin(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      passwordHash: true,
    },
  });

  if (!user || user.role !== "ADMIN") {
    return null;
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);

  if (!passwordMatches) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  } satisfies AuthUser;
}

export async function createAdminSession(user: AuthUser) {
  const cookieStore = await cookies();

  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: signSession(user),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();

  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = verifySessionToken(token);

  if (!payload) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  if (!user) {
    return null;
  }

  return user;
}

export async function requireAdminUser() {
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    redirect("/admin/login");
  }

  return user;
}

export async function requireAdminApi() {
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    return null;
  }

  return user;
}
