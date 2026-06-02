import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { messages } from "./messages";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(
    {
      ok: true,
      data,
    },
    { status },
  );
}

export function fail(error: string, status = 400) {
  return NextResponse.json(
    {
      ok: false,
      error,
    },
    { status },
  );
}

export function errorResponse(error: unknown, fallback: string = messages.api.unknownError) {
  if (error instanceof ZodError) {
    return fail(messages.api.invalidInput, 422);
  }

  if (error instanceof Error) {
    return fail(error.message, 400);
  }

  return fail(fallback, 400);
}
