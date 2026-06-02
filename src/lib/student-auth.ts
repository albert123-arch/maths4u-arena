import jwt, { type JwtPayload } from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { verifyPassword } from "./password";

export const STUDENT_SESSION_COOKIE_NAME = "student_session";
const STUDENT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export type StudentSessionUser = {
  id: string;
  username: string;
  displayName: string;
  groupName: string | null;
  status: "ACTIVE" | "DISABLED";
};

type StudentSessionPayload = JwtPayload & {
  sub: string;
  username: string;
  type: "student";
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 24) {
    throw new Error("JWT_SECRET must be set to a long random value.");
  }

  return secret;
}

function signStudentSession(student: StudentSessionUser) {
  return jwt.sign(
    {
      username: student.username,
      type: "student",
    },
    getJwtSecret(),
    {
      expiresIn: STUDENT_SESSION_MAX_AGE_SECONDS,
      subject: student.id,
    },
  );
}

function verifyStudentSessionToken(token: string): StudentSessionPayload | null {
  try {
    const payload = jwt.verify(token, getJwtSecret());

    if (
      typeof payload === "object" &&
      typeof payload.sub === "string" &&
      typeof payload.username === "string" &&
      payload.type === "student"
    ) {
      return payload as StudentSessionPayload;
    }
  } catch {
    return null;
  }

  return null;
}

async function getPrisma() {
  const { prisma } = await import("./prisma");

  return prisma;
}

export async function authenticateStudent(username: string, password: string) {
  const prisma = await getPrisma();
  const student = await prisma.studentAccount.findUnique({
    where: { username: username.trim().toLowerCase() },
    select: {
      id: true,
      username: true,
      displayName: true,
      groupName: true,
      status: true,
      passwordHash: true,
    },
  });

  if (!student || student.status !== "ACTIVE") {
    return null;
  }

  const passwordMatches = await verifyPassword(password, student.passwordHash);

  if (!passwordMatches) {
    return null;
  }

  return {
    id: student.id,
    username: student.username,
    displayName: student.displayName,
    groupName: student.groupName,
    status: student.status,
  } satisfies StudentSessionUser;
}

export async function createStudentSession(student: StudentSessionUser) {
  const cookieStore = await cookies();

  cookieStore.set({
    name: STUDENT_SESSION_COOKIE_NAME,
    value: signStudentSession(student),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STUDENT_SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearStudentSession() {
  const cookieStore = await cookies();

  cookieStore.set({
    name: STUDENT_SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getCurrentStudentAccount(): Promise<StudentSessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STUDENT_SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = verifyStudentSessionToken(token);

  if (!payload) {
    return null;
  }

  const prisma = await getPrisma();
  const student = await prisma.studentAccount.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      username: true,
      displayName: true,
      groupName: true,
      status: true,
    },
  });

  if (!student) {
    return null;
  }

  return student;
}

export async function getCurrentStudent(): Promise<StudentSessionUser | null> {
  const student = await getCurrentStudentAccount();

  if (!student || student.status !== "ACTIVE") {
    return null;
  }

  return student;
}

export async function requireStudent() {
  const student = await getCurrentStudent();

  if (!student) {
    redirect("/login?next=/student");
  }

  return student;
}
