import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { tailorResume } from "@/lib/ai/tailorResume";
import { resolveJobDescriptionInput } from "@/lib/jobs/fetchJobDescription";
import { parseJobDescription } from "@/lib/jobs/parseJobDescription";
import { generateAtsReport } from "@/lib/resume/atsChecks";
import { normalizeResumeContent, tailoredResumeVersionSchema } from "@/lib/resume/schema";
import { getResumeById, getUserBySession, mutateStore, saveTargetJob } from "@/lib/store";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("tp_session")?.value;
  const user = await getUserBySession(sessionId);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    resumeId?: string;
    company?: string;
    role?: string;
    sourceUrl?: string;
    description?: string;
  };

  if (!body.resumeId) {
    return NextResponse.json({ error: "resumeId is required" }, { status: 400 });
  }

  const resume = await getResumeById(user.id, body.resumeId);
  if (!resume) {
    return NextResponse.json({ error: "Resume not found" }, { status: 404 });
  }

  const resolvedJobInput = await resolveJobDescriptionInput({
    sourceUrl: body.sourceUrl ?? "",
    description: body.description ?? "",
  });

  const targetJob = await saveTargetJob(
    user.id,
    parseJobDescription({
      company: body.company ?? "",
      role: body.role ?? "",
      sourceUrl: resolvedJobInput.sourceUrl,
      description: resolvedJobInput.description,
      pageTitle: resolvedJobInput.pageTitle,
      companyHint: resolvedJobInput.companyHint,
    }),
  );

  const tailored = await tailorResume(normalizeResumeContent(resume.content), targetJob);
  const versionId = crypto.randomUUID();
  const reportId = crypto.randomUUID();
  const report = generateAtsReport({
    userId: user.id,
    versionId,
    baseResume: resume.content,
    tailoredResume: tailored.resume,
    targetJob,
  });

  await mutateStore((store) => {
    store.atsReports.push({
      ...report,
      id: reportId,
      createdAt: new Date().toISOString(),
    });
    store.tailoredResumeVersions.push(
      tailoredResumeVersionSchema.parse({
        id: versionId,
        userId: user.id,
        baseResumeId: resume.id,
        targetJobId: targetJob.id,
        title: `${targetJob.role} Tailored Resume`,
        resume: tailored.resume,
        changeSummary: tailored.changeSummary,
        atsReportId: reportId,
        createdAt: new Date().toISOString(),
      }),
    );
  });

  return NextResponse.json({
    versionId,
    reportId,
    redirectTo: `/resumes/${resume.id}/versions/${versionId}`,
  });
}
