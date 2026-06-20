import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { checkLlmConnection } from "@/lib/ai/llmClient";
import { getUserBySession } from "@/lib/store";

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("tp_session")?.value;
  const user = await getUserBySession(sessionId);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await checkLlmConnection();
  return NextResponse.json(status);
}
