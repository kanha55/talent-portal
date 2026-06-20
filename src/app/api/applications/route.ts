import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createApplication, getApplications, getUserBySession } from "@/lib/store";

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("tp_session")?.value;
  const user = await getUserBySession(sessionId);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getApplications(user.id);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("tp_session")?.value;
  const user = await getUserBySession(sessionId);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    resumeVersionId?: string;
    targetJobId?: string;
    company?: string;
    role?: string;
    source?: string;
    notes?: string;
  };

  if (!body.resumeVersionId || !body.targetJobId || !body.company || !body.role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const application = await createApplication(user.id, {
    resumeVersionId: body.resumeVersionId,
    targetJobId: body.targetJobId,
    company: body.company,
    role: body.role,
    source: body.source ?? "",
    notes: body.notes ?? "",
  });

  return NextResponse.json(application, { status: 201 });
}
