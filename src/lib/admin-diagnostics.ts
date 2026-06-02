import { NextResponse } from "next/server";

import { requireAdminApi } from "./auth";
import { messages } from "./messages";
import { safeErrorMessage } from "./runtime-diagnostics";

export const noStoreHeaders = {
  "Cache-Control": "no-store",
};

export async function requireAdminForDiagnostics() {
  try {
    const user = await requireAdminApi();

    if (user) {
      return null;
    }
  } catch (error) {
    console.error("Diagnostic auth check failed", {
      message: safeErrorMessage(error),
    });
  }

  return NextResponse.json(
    {
      ok: false,
      error: messages.api.unauthorized,
    },
    {
      status: 401,
      headers: noStoreHeaders,
    },
  );
}
