import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { renderResumeDocx } from "@/lib/resume/renderResumeDocx";
import { renderResumePdf } from "@/lib/resume/renderResume";
import { getResumeVersion, getUserBySession } from "@/lib/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const versionId = searchParams.get("versionId");
  const format = searchParams.get("format") ?? "pdf";

  if (!versionId) {
    return NextResponse.json({ error: "versionId is required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const sessionId = cookieStore.get("tp_session")?.value;
  const user = await getUserBySession(sessionId);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await getResumeVersion(user.id, versionId);
  if (!workspace) {
    return NextResponse.json({ error: "Resume version not found" }, { status: 404 });
  }

  const filenameBase = workspace.version.title.replace(/\s+/g, "-").toLowerCase();

  if (format === "docx") {
    const bytes = await renderResumeDocx(workspace.version.resume);
    const body = Buffer.from(bytes);

    return new NextResponse(body, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filenameBase}.docx"`,
      },
    });
  }

  const bytes = await renderResumePdf(workspace.version.resume);
  const body = Buffer.from(bytes);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filenameBase}.pdf"`,
    },
  });
}
